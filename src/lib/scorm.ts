import type { GeneratedCourse } from "./ai";

// ============================================================
// CONFIGURATION — tweak per client
// ============================================================
const CLIENT_NAME = "ECOFEL Certification Program";
const CLIENT_BRAND_COLOR = "#10b981";
const MASTERY_SCORE = 70;

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
function buildManifest(course: GeneratedCourse): string {
  const courseId = `course_${Date.now()}`;
  const safeTitle = escapeXml(course.title);

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
function buildPlayer(course: GeneratedCourse): string {
  const safeTitle = escapeHtml(course.title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div id="app" role="main" aria-live="polite">Loading course...</div>
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
    state.answered["scenario_" + state.moduleIdx] = true;
    document.querySelectorAll(".option").forEach(function(b) { b.disabled = true; });
    document.getElementById("feedback").innerHTML = isCorrect
      ? '<div class="feedback correct" role="alert">✓ ' + esc(feedback) + '</div><button onclick="next()">Continue →</button>'
      : '<div class="feedback incorrect" role="alert">✗ ' + esc(feedback) + '</div>';
    render();
  };
  window.answerQuiz = function (chosen, correct) {
    if (chosen === correct) state.score++;
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
function buildStyles(): string {
  return `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.player { max-width: 720px; width: 100%; }
.progress { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: ${CLIENT_BRAND_COLOR}; margin-bottom: 1.5rem; font-weight: 600; }
h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: 1.5rem; color: #fff; }
.card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; line-height: 1.6; }
button { background: ${CLIENT_BRAND_COLOR}; color: #000; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
button:hover { opacity: 0.85; }
button:focus { outline: 3px solid ${CLIENT_BRAND_COLOR}; outline-offset: 2px; }
.option { display: block; width: 100%; text-align: left; background: #171717; color: #e5e5e5; border: 1px solid #262626; padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; }
.option:hover { background: #1f1f1f; border-color: #404040; }
.option:disabled { opacity: 0.6; cursor: default; }
.feedback { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
.feedback.correct { background: #052e16; border: 1px solid #166534; color: #86efac; }
.feedback.incorrect { background: #450a0a; border: 1px solid #991b1b; color: #fca5a5; }`;
}

// ============================================================
// PACKAGE BUILDER
// ============================================================
export async function buildScormPackage(course: GeneratedCourse): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("imsmanifest.xml", buildManifest(course));
  zip.file("index.html", buildPlayer(course));
  zip.file("scorm-api.js", buildScormApi());
  zip.file("styles.css", buildStyles());
  zip.file("course-data.json", JSON.stringify(course, null, 2));
  return await zip.generateAsync({ type: "blob" });
}

export function downloadScormPackage(blob: Blob, courseTitle: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${courseTitle.replace(/\s+/g, "-").toLowerCase()}-scorm.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
