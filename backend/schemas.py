"""Pydantic schemas for Course Factory backend."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CourseIn(BaseModel):
    """The shape of a GeneratedCourse sent from the frontend."""
    title: str
    description: Optional[str] = ""
    generatedAt: Optional[str] = ""
    modules: List[Dict[str, Any]] = Field(default_factory=list)
    sourceText: Optional[str] = ""


class CourseMeta(BaseModel):
    """Lightweight course info for listing."""
    id: str
    title: str
    description: Optional[str] = ""
    savedAt: str
    module_count: int


class CourseOut(BaseModel):
    """Full course payload."""
    id: str
    course: Dict[str, Any]
    savedAt: str
