"""Course Factory backend API."""
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os as _os

# CORS — configurable via env, defaults to localhost dev
ALLOWED_ORIGINS = _os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3005,http://127.0.0.1:3005,http://localhost:3001,http://127.0.0.1:3001"
).split(",")

# Simple in-memory rate limiter (per IP, per path)
_rate_buckets = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 30     # requests per window per IP

def _rate_limited(client_ip: str, path: str) -> bool:
    """Return True if this request should be blocked."""
    import time
    now = time.time()
    key = f"{client_ip}:{path}"
    bucket = _rate_buckets.get(key, [])
    bucket = [t for t in bucket if now - t < RATE_LIMIT_WINDOW]
    if len(bucket) >= RATE_LIMIT_MAX:
        _rate_buckets[key] = bucket
        return True
    bucket.append(now)
    _rate_buckets[key] = bucket
    return False
from sqlalchemy.orm import Session
from uuid import uuid4
import json

import logging
import sys
import time
import uuid
from backend.db import Course, get_session, init_db

# ---- Logging setup ----
logger = logging.getLogger("course_factory")
logger.setLevel(logging.INFO)
if not logger.handlers:
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(logging.Formatter(
        "[%(asctime)s] %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    logger.addHandler(h)
from backend.schemas import CourseIn, CourseMeta, CourseOut


app = FastAPI(
    title="Course Factory Backend",
    version="0.1.0",
    description="Backend for the Course Factory AI eLearning engine.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ---- Request ID middleware ----
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        # Rate limiting (skip health checks)
        if request.url.path != "/health":
            client_ip = request.client.host if request.client else "unknown"
            if _rate_limited(client_ip, request.url.path):
                logger.warning(f"Rate limited {client_ip} on {request.url.path} | rid={request_id}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limited",
                        "message": f"Too many requests. Max {RATE_LIMIT_MAX} per {RATE_LIMIT_WINDOW}s.",
                        "request_id": request_id,
                    },
                )

        # Payload size limit
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > 5_000_000:  # 5 MB
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": "payload_too_large",
                            "message": "Request body exceeds 5 MB.",
                            "request_id": request_id,
                        },
                    )
            except ValueError:
                pass

        start = time.time()
        response = await call_next(request)
        elapsed = (time.time() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        logger.info(f"{request.method} {request.url.path} | {response.status_code} | {elapsed:.0f}ms | rid={request_id}")
        return response

app.add_middleware(RequestIDMiddleware)


# ---- Global exception handler ----
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception(f"Unhandled error on {request.method} {request.url.path} | rid={request_id}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred. Please try again.",
            "request_id": request_id,
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(f"Validation error on {request.method} {request.url.path} | rid={request_id} | {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "The request data is invalid.",
            "details": exc.errors(),
            "request_id": request_id,
        },
    )


@app.on_event("startup")
def on_start():
    try:
        init_db()
        # Verify DB connection
        from backend.db import SessionLocal
        db = SessionLocal()
        try:
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            logger.info("Startup: Database connection OK")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Startup: Database check FAILED: {type(e).__name__}: {e}")
        raise


@app.get("/health")
def health(db: Session = Depends(get_session)):
    """Health check that includes DB connectivity."""
    try:
        from sqlalchemy import text
        n = db.execute(text("SELECT COUNT(*) FROM courses")).scalar()
        return {
            "status": "ok",
            "service": "course-factory-backend",
            "db": "connected",
            "course_count": n,
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "course-factory-backend",
            "db": "error",
            "error": str(e),
        }


def _course_to_meta(c: Course) -> dict:
    try:
        obj = json.loads(c.raw_json)
    except Exception:
        obj = {}
    return {
        "id": c.id,
        "title": c.title,
        "description": c.description or "",
        "savedAt": c.created_at.isoformat() if c.created_at else "",
        "module_count": len(obj.get("modules", [])),
        "published": bool(c.published),
    }


def _course_to_out(c: Course) -> dict:
    return {
        "id": c.id,
        "course": json.loads(c.raw_json),
        "savedAt": c.created_at.isoformat() if c.created_at else "",
    }


@app.get("/api/v1/courses")
def list_courses(q: str = None, published_only: bool = False,
                 db: Session = Depends(get_session)):
    """List courses. Optional `q` filters by title substring (case-insensitive).
    Optional `published_only` filters to published courses."""
    query = db.query(Course)
    if q:
        query = query.filter(Course.title.ilike(f"%{q}%"))
    if published_only:
        query = query.filter(Course.published == True)
    rows = query.order_by(Course.created_at.desc()).all()
    return [_course_to_meta(c) for c in rows]


@app.post("/api/v1/courses/{course_id}/publish")
def publish_course(course_id: str, published: bool = True,
                   db: Session = Depends(get_session)):
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    c.published = published
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return {"id": c.id, "published": c.published}


@app.post("/api/v1/courses/bulk_delete")
def bulk_delete(payload: dict, db: Session = Depends(get_session)):
    """Delete multiple courses by ID. Body: {"ids": ["...", "..."]}"""
    ids = payload.get("ids") or []
    if not isinstance(ids, list):
        raise HTTPException(status_code=400, detail="ids must be a list")
    deleted = []
    not_found = []
    for cid in ids:
        c = db.query(Course).filter(Course.id == cid).first()
        if c:
            db.delete(c)
            deleted.append(cid)
        else:
            not_found.append(cid)
    db.commit()
    return {"deleted": deleted, "not_found": not_found}


@app.post("/api/v1/courses")
def create_course(payload: CourseIn, request: Request, db: Session = Depends(get_session)):
    request_id = getattr(request.state, "request_id", "unknown")

    # ---- Validation ----
    title = (payload.title or "").strip()
    if not title:
        logger.warning(f"Rejected course with empty title | rid={request_id}")
        raise HTTPException(status_code=400, detail={
            "error": "validation_error",
            "message": "Course title cannot be empty.",
            "field": "title",
            "request_id": request_id,
        })

    if len(title) > 500:
        raise HTTPException(status_code=400, detail={
            "error": "validation_error",
            "message": "Course title is too long (max 500 characters).",
            "field": "title",
            "request_id": request_id,
        })

    modules = payload.modules or []
    if not isinstance(modules, list):
        raise HTTPException(status_code=400, detail={
            "error": "validation_error",
            "message": "Modules must be a list.",
            "field": "modules",
            "request_id": request_id,
        })

    if len(modules) == 0:
        raise HTTPException(status_code=400, detail={
            "error": "validation_error",
            "message": "A course must have at least one module.",
            "field": "modules",
            "request_id": request_id,
        })

    if len(modules) > 100:
        raise HTTPException(status_code=400, detail={
            "error": "validation_error",
            "message": "Course has too many modules (max 100).",
            "field": "modules",
            "request_id": request_id,
        })

    # Reject oversized payloads (1 MB raw JSON)
    raw_json_str = json.dumps(payload.model_dump(exclude={"sourceText"}))
    if len(raw_json_str) > 1_000_000:
        raise HTTPException(status_code=413, detail={
            "error": "payload_too_large",
            "message": "Course payload exceeds 1 MB. Split it into smaller courses.",
            "request_id": request_id,
        })

    # ---- Create ----
    try:
        course_id = str(uuid4())
        raw = payload.model_dump(exclude={"sourceText"})
        c = Course(
            id=course_id,
            title=title,
            description=payload.description or "",
            source_text=payload.sourceText or "",
            raw_json=json.dumps(raw),
            generated_at=payload.generatedAt or "",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            published=True,
        )
        db.add(c)
        db.commit()
        db.refresh(c)
        logger.info(f"Created course {course_id} '{title[:50]}' ({len(modules)} modules) | rid={request_id}")
        return _course_to_out(c)
    except Exception as e:
        db.rollback()
        logger.exception(f"Failed to create course | rid={request_id}")
        raise HTTPException(status_code=500, detail={
            "error": "create_failed",
            "message": "Could not save the course to the database.",
            "request_id": request_id,
        })


@app.get("/api/v1/courses/{course_id}")
def get_course(course_id: str, db: Session = Depends(get_session)):
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    return _course_to_out(c)


@app.put("/api/v1/courses/{course_id}")
def update_course(course_id: str, payload: CourseIn, db: Session = Depends(get_session)):
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    raw = payload.model_dump(exclude={"sourceText"})
    c.title = payload.title
    c.description = payload.description
    c.raw_json = json.dumps(raw)
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return _course_to_out(c)


@app.delete("/api/v1/courses/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_session)):
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(c)
    db.commit()
    return {"deleted": course_id}
