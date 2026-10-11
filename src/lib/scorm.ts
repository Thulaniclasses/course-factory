import { type Branding, DEFAULT_BRANDING, onBrandText, resolvePalette, safeColor, websiteHref } from "./branding";
import { loadLogo } from "./logo";
import type { GeneratedCourse } from "./ai";

const MASTERY_SCORE = 70;

function safeWebsite(url: string | undefined): string {
  return websiteHref(url);
}

// ============================================================
// XML + HTML escaping helpers (XSS-safe)
// ============================================================
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// SCORM 1.2 MANIFEST
// ============================================================
function buildManifest(course: GeneratedCourse, branding?: Branding, logoFile?: string | null): string {
  const b = branding ?? DEFAULT_BRANDING;
  const displayTitle = `${b.clientName} — ${course.title}`;
  const courseId = `course_${Date.now()}`;
  const safeTitle = escapeXml(displayTitle);

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${courseId}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <adlcp:location>index.html</adlcp:location>
  </metadata>
  <organizations default="org_${courseId}">
    <organization identifier="org_${courseId}">
      <title>${safeTitle}</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>${safeTitle}</title>
        <adlcp:masteryscore>${MASTERY_SCORE}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="course-data.json"/>
      <file href="scorm-api.js"/>
      <file href="styles.css"/>
      ${logoFile ? `<file href="${escapeXml(logoFile)}"/>` : ""}
    </resource>
  </resources>
</manifest>`;
}

// ============================================================
// SCORM 1.2 RUNTIME API
// ============================================================
function buildScormApi(): string {
  return `(function () {
  var API = null;
  var startTime = new Date();

  function findAPI(win) {
    var depth = 0;
    while (win && !win.API && win.parent && win.parent != win && depth < 10) {
      depth++;
      win = win.parent;
    }
    return win.API || null;
  }

  function getAPI() {
    if (API) return API;
    if (window.parent && window.parent !== window) API = findAPI(window.parent);
    if (!API && window.opener) API = findAPI(window.opener);
    if (!API && window.top) API = findAPI(window.top);
    return API;
  }

  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + ".0";
  }

  window.SCORM = {
    init: function () {
      var api = getAPI();
      if (!api) return false;
      var ok = api.LMSInitialize("");
      if (ok !== "true") return false;
      var saved = api.LMSGetValue("cmi.suspend_data");
      var loc = api.LMSGetValue("cmi.core.lesson_location");
      return { suspend: saved, location: loc };
    },
    setStatus: function (status) {
      var api = getAPI();
      if (!api) return;
      api.LMSSetValue("cmi.core.lesson_status", status);
      api.LMSCommit("");
    },
    setScore: function (score) {
      var api = getAPI();
      if (!api) return;
      api.LMSSetValue("cmi.core.score.raw", String(score));
      api.LMSSetValue("cmi.core.score.min", "0");
      api.LMSSetValue("cmi.core.score.max", "100");
      api.LMSCommit("");
    },
    setLocation: function (loc) {
      var api = getAPI();
      if (!api) return;
      api.LMSSetValue("cmi.core.lesson_location", loc);
      api.LMSCommit("");
    },
    setSuspendData: function (data) {
      var api = getAPI();
      if (!api) return;
      api.LMSSetValue("cmi.suspend_data", data);
      api.LMSCommit("");
    },
    finish: function () {
      var api = getAPI();
      if (!api) return;
      api.LMSSetValue("cmi.core.session_time", formatTime(new Date() - startTime));
      api.LMSCommit("");
      api.LMSFinish("");
    },
  };
})();`;
}

// ============================================================
// LEARNER-FACING PLAYER
// ============================================================
function buildPlayer(course: GeneratedCourse, branding?: Branding, logoFile?: string | null): string {
  const b = branding ?? DEFAULT_BRANDING;
  const safeTitle = escapeHtml(course.title);
  const safeClient = escapeHtml(b.clientName || "");
  const website = safeWebsite(b.websiteUrl);
  const safeSite = escapeHtml(website);
  const footer = escapeHtml(b.footerText || "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeClient ? safeClient + " — " : ""}${safeTitle}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="brandbar">
  ${logoFile ? `<img src="${escapeHtml(logoFile)}" alt="">` : ""}
  <div>
    <strong>${safeClient}</strong>
    ${website ? `<a href="${safeSite}">${safeSite}</a>` : ""}
  </div>
</header>
<div class="accentbar"></div>
<div id="app" role="main" aria-live="polite">Loading course...</div>
<footer class="brandfoot">${footer}${website && footer ? " — " : ""}${website ? `<a href="${safeSite}">${safeSite}</a>` : ""}</footer>
<script src="scorm-api.js"></script>
<script>
(async function () {
  var session = window.SCORM.init();
  var course;
  try {
    course = await fetch("course-data.json").then(function(r) { return r.json(); });
  } catch (e) {
    document.getElementById("app").innerHTML = "<p>Failed to load course.</p>";
    return;
  }

  var totalQuestions = course.modules.reduce(function(s, m) { return s + m.quiz.length; }, 0);
  var state = { moduleIdx: 0, cardIdx: 0, quizIdx: 0, score: 0, answered: {} };

  // Resume from suspend data if available
  if (session && session.suspend) {
    try {
      var parsed = JSON.parse(session.suspend);
      if (parsed && typeof parsed === "object") state = Object.assign(state, parsed);
    } catch (e) {}
  }

  function persist() {
    window.SCORM.setSuspendData(JSON.stringify(state));
    window.SCORM.setLocation("m" + state.moduleIdx + "_c" + state.cardIdx + "_q" + state.quizIdx);
  }

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render() {
    var m = course.modules[state.moduleIdx];
    var app = document.getElementById("app");

    if (state.cardIdx < m.content.length) {
      app.innerHTML =
        '<div class="player">' +
          '<div class="progress">Module ' + (state.moduleIdx + 1) + ' of ' + course.modules.length + ' · Card ' + (state.cardIdx + 1) + ' of ' + m.content.length + '</div>' +
          '<h1>' + esc(m.title) + '</h1>' +
          '<div class="card">' + esc(m.content[state.cardIdx]) + '</div>' +
          '<button onclick="next()" aria-label="Continue to next card">Continue →</button>' +
        '</div>';
    } else if (!state.answered["scenario_" + state.moduleIdx]) {
      var optionsHtml = m.scenario.options.map(function(o) {
        return '<button class="option" onclick="answerScenario(\\'' + o.id + '\\', ' + o.isCorrect + ', \\'' + esc(o.feedback).replace(/'/g, "\\\\'") + '\\')">' + esc(o.text) + '</button>';
      }).join("");
      app.innerHTML =
        '<div class="player">' +
          '<div class="progress">Module ' + (state.moduleIdx + 1) + ' · Scenario</div>' +
          '<h1>Scenario</h1>' +
          '<div class="card">' + esc(m.scenario.prompt) + '</div>' +
          optionsHtml +
          '<div id="feedback"></div>' +
        '</div>';
    } else if (state.quizIdx < m.quiz.length) {
      var q = m.quiz[state.quizIdx];
      var quizHtml = q.options.map(function(opt, i) {
        return '<button class="option" onclick="answerQuiz(' + i + ', ' + q.correctIndex + ')">' + esc(opt) + '</button>';
      }).join("");
      app.innerHTML =
        '<div class="player">' +
          '<div class="progress">Module ' + (state.moduleIdx + 1) + ' · Quiz ' + (state.quizIdx + 1) + ' of ' + m.quiz.length + '</div>' +
          '<h1>Knowledge Check</h1>' +
          '<div class="card">' + esc(q.question) + '</div>' +
          quizHtml +
        '</div>';
    } else if (state.moduleIdx < course.modules.length - 1) {
      app.innerHTML =
        '<div class="player">' +
          '<h1>Module Complete ✓</h1>' +
          '<p>You\\'ve finished Module ' + (state.moduleIdx + 1) + ' of ' + course.modules.length + '.</p>' +
          '<button onclick="nextModule()">Continue to Next Module →</button>' +
        '</div>';
    } else {
      var pct = totalQuestions > 0 ? Math.round((state.score / totalQuestions) * 100) : 0;
      window.SCORM.setScore(pct);
      window.SCORM.setStatus(pct >= ${MASTERY_SCORE} ? "passed" : "completed");
      app.innerHTML =
        '<div class="player">' +
          '<h1>🎉 Course Complete</h1>' +
          '<p>You scored ' + state.score + ' / ' + totalQuestions + ' (' + pct + '%)</p>' +
          '<p>' + (pct >= ${MASTERY_SCORE} ? "Congratulations — you passed!" : "Review the material and try again.") + '</p>' +
        '</div>';
    }
    persist();
  }

  window.next = function () { state.cardIdx++; render(); };
  window.answerScenario = function (id, isCorrect, feedback) {
    if (state.answered["scenario_" + state.moduleIdx]) return;
    state.answered["scenario_" + state.moduleIdx] = true;
    document.querySelectorAll(".option").forEach(function(b) { b.disabled = true; });
    var box = document.getElementById("feedback");
    if (box) {
      box.innerHTML = (isCorrect
        ? '<div class="feedback correct" role="alert">✓ ' + esc(feedback) + '</div>'
        : '<div class="feedback incorrect" role="alert">✗ ' + esc(feedback) + '</div>')
        + '<button onclick="continueScenario()">Continue →</button>';
    }
    persist();
  };
  window.answerQuiz = function (chosen, correct) {
    var key = "quiz_" + state.moduleIdx + "_" + state.quizIdx;
    if (state.answered[key]) return;
    state.answered[key] = true;
    if (chosen === correct) state.score++;
    var q = course.modules[state.moduleIdx].quiz[state.quizIdx];
    document.querySelectorAll(".option").forEach(function(b, i) {
      b.disabled = true;
      if (i === correct) b.classList.add("picked");
    });
    var player = document.querySelector(".player");
    if (player) {
      var note = document.createElement("div");
      var right = q.options[correct] || "";
      note.innerHTML = '<div class="feedback ' + (chosen === correct ? "correct" : "incorrect") + '" role="alert">'
        + (chosen === correct ? "✓ Correct. " : "✗ The professional answer is: " + esc(right) + " ")
        + esc(q.rationale || "")
        + '</div><button onclick="advanceQuiz()">Continue →</button>';
      player.appendChild(note);
    }
    persist();
  };
  window.continueScenario = function () { render(); };
  window.advanceQuiz = function () {
    state.quizIdx++;
    render();
  };
  window.nextModule = function () {
    state.moduleIdx++;
    state.cardIdx = 0;
    state.quizIdx = 0;
    render();
  };

  window.addEventListener("beforeunload", function () {
    window.SCORM.finish();
  });

  render();
})();
</script>
</body>
</html>`;
}

// ============================================================
// STYLES
// ============================================================
function buildStyles(branding?: Branding): string {
  const b = branding ?? DEFAULT_BRANDING;
  const palette = resolvePalette(b);
  const primary = safeColor(palette.primary);
  const accent = safeColor(palette.accent);
  const dark = safeColor(palette.dark);
  const paper = safeColor(palette.paper);
  const ink = safeColor(palette.ink);
  const onPrimary = onBrandText(primary) === "FFFFFF" ? "#ffffff" : "#111827";
  const onDark = onBrandText(dark) === "FFFFFF" ? "#ffffff" : "#111827";
  return `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: "Segoe UI", Inter, system-ui, sans-serif; background: ${paper}; color: ${ink}; min-height: 100vh; display: flex; flex-direction: column; }
.brandbar { background: #ffffff; color: ${primary}; display: flex; align-items: center; gap: 16px; padding: 16px 28px; }
.brandbar img { height: 84px; width: auto; max-width: 220px; object-fit: contain; background: #fff; }
.brandbar strong { display: block; font-size: 1.05rem; letter-spacing: 0.01em; }
.brandbar a { color: ${primary}; font-size: 0.95rem; text-decoration: underline; }
.accentbar { height: 6px; background: ${accent}; }
.brandfoot { background: ${dark}; color: ${onDark}; padding: 16px 28px 22px; text-align: center; font-size: 0.8rem; }
.brandfoot a { color: ${accent}; font-size: 0.9rem; text-decoration: underline; }
#app { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2.5rem 1.5rem 3rem; }
.player { max-width: 760px; width: 100%; }
.progress { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: ${primary}; margin-bottom: 0.8rem; font-weight: 700; }
h1 { font-size: 1.7rem; font-weight: 650; margin-bottom: 1.1rem; color: ${dark}; line-height: 1.25; }
.card { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-top: 4px solid ${accent}; border-radius: 10px; padding: 1.35rem 1.4rem; margin-bottom: 1.25rem; line-height: 1.65; font-size: 1.02rem; }
button { background: ${primary}; color: ${onPrimary}; border: none; padding: 0.8rem 1.4rem; border-radius: 8px; font-size: 0.95rem; font-weight: 650; cursor: pointer; }
button:hover { filter: brightness(1.08); }
button:focus { outline: 3px solid ${accent}; outline-offset: 2px; }
.option { display: block; width: 100%; text-align: left; background: #ffffff; color: ${ink}; border: 1px solid rgba(0,0,0,0.12); padding: 0.95rem 1rem; margin-bottom: 0.55rem; border-radius: 8px; font-weight: 500; }
.option:hover { border-color: ${primary}; }
.option:disabled { cursor: default; }
.option.picked { border-color: ${primary}; box-shadow: inset 3px 0 0 ${accent}; }
.feedback { padding: 1rem 1.1rem; border-radius: 8px; margin: 0.4rem 0 1rem; line-height: 1.55; }
.feedback.correct { background: #f0fdf4; border: 1px solid #166534; color: #14532d; }
.feedback.incorrect { background: #fef2f2; border: 1px solid #991b1b; color: #7f1d1d; }`;
}

// ============================================================
// PACKAGE BUILDER
// ============================================================
export async function buildScormPackage(course: GeneratedCourse, branding?: Branding): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const b = branding ?? DEFAULT_BRANDING;
  const logo = await loadLogo(b.logoUrl);
  const logoFile = logo ? `logo.${logo.type === "jpg" ? "jpg" : logo.type}` : null;
  if (logo && logoFile) zip.file(logoFile, logo.data);
  zip.file("imsmanifest.xml", buildManifest(course, branding, logoFile));
  zip.file("index.html", buildPlayer(course, branding, logoFile));
  zip.file("scorm-api.js", buildScormApi());
  zip.file("styles.css", buildStyles(branding));
  zip.file("course-data.json", JSON.stringify(course, null, 2));
  return await zip.generateAsync({ type: "blob" });
}

export function downloadScormPackage(blob: Blob, courseTitle: string, clientName?: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = `${clientName ? clientName + "-" : ""}${courseTitle}`
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  a.download = `${safeTitle}-scorm.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
