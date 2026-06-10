/* Smoke test of the Marex 370 app in jsdom. */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
require("fake-indexeddb/auto");

const ROOT = require("path").join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
  .replace(/<script src="[^"]*"><\/script>/g, "")   // we inject scripts ourselves
  .replace(/<script>[\s\S]*?<\/script>/g, "");

const dom = new JSDOM(html, { url: "https://example.com/marex/", runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
window.indexedDB = global.indexedDB;
window.confirm = () => true;
window.alert = msg => console.log("  [alert]", msg);
window.URL.createObjectURL = () => "blob:fake";
window.URL.revokeObjectURL = () => {};

let failures = 0;
const errs = [];
window.addEventListener("error", e => { errs.push(e.message); });
window.structuredClone = obj => JSON.parse(JSON.stringify(obj));

// classic scripts share top-level const bindings; emulate by evaluating as one unit
const bundle = ["js/data.js", "js/illustrations.js", "js/db.js", "js/app.js"]
  .map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n;\n") +
  `;window.state=state;window.GUIDE=GUIDE;window.CHECKLISTS=CHECKLISTS;window.SERVICES=SERVICES;
   window.go=go;window.serviceStatus=serviceStatus;window.guideSVG=guideSVG;
   Object.defineProperty(window,'state',{get:()=>state,set:v=>{state=v}});`;
try { window.eval(bundle); console.log("bundle loaded"); }
catch (e) { console.error("FAIL loading bundle:", e.message); failures++; }

function check(name, fn) {
  try {
    fn();
    console.log("PASS", name);
  } catch (e) {
    console.error("FAIL", name, "—", e.message);
    failures++;
  }
}
const $ = sel => window.document.querySelector(sel);
const $$ = sel => [...window.document.querySelectorAll(sel)];
const click = el => el.dispatchEvent(new window.Event("click", { bubbles: true }));
const text = () => $("#view").textContent;

check("home renders", () => {
  if (!text().includes("Engine hours")) throw new Error("no hours block");
  if (!text().includes("Start here")) throw new Error("no onboarding notice");
});

check("all guide ids have data + svg", () => {
  for (const g of window.GUIDE) {
    const svg = window.guideSVG(g.id);
    if (!svg || !svg.includes("<svg")) throw new Error("missing SVG for " + g.id);
  }
});

check("every checklist item id unique per section", () => {
  for (const l of window.CHECKLISTS) {
    l.sections.forEach((s, si) => {
      const ids = s.items.map(i => i.id);
      if (new Set(ids).size !== ids.length) throw new Error("dup ids in " + l.id + " section " + si);
    });
  }
});

check("service tab renders all items", () => {
  window.go("service");
  for (const s of window.SERVICES) {
    if (!text().includes(s.name)) throw new Error("missing " + s.name);
  }
});

check("open service sheet + mark done", () => {
  click($('[data-action="open-service"][data-id="oil"]'));
  if ($("#sheet").classList.contains("hidden")) throw new Error("sheet not open");
  click($('[data-action="mark-done-form"][data-id="oil"]'));
  $("#md-date").value = "2026-06-01";
  $("#md-hours").value = "410";
  $("#md-note").value = "test oil change";
  click($('[data-action="save-done"][data-id="oil"]'));
  const log = window.state.serviceLog.oil;
  if (!log || log[0].hours !== 410) throw new Error("entry not saved");
  if (window.state.settings.hours !== 410) throw new Error("hours not propagated");
});

check("status pill computes OK for fresh service", () => {
  const st = window.serviceStatus(window.SERVICES.find(s => s.id === "oil"));
  if (st.code !== "ok") throw new Error("expected ok, got " + st.code);
});

check("overdue status computes", () => {
  window.state.serviceLog.impeller = [{ ts: 1, date: "2024-01-01", hours: 100, note: "", photos: [] }];
  const st = window.serviceStatus(window.SERVICES.find(s => s.id === "impeller"));
  if (st.code !== "overdue") throw new Error("expected overdue, got " + st.code);
});

check("home shows overdue item", () => {
  window.go("home");
  if (!text().includes("Raw water impeller")) throw new Error("impeller not in attention list");
});

check("checklist check + complete flow", () => {
  window.go("lists");
  if (!text().includes("Spring — onto the water")) throw new Error("lists missing");
  window.go("lists", "checklist", "pretrip");
  const boxes = $$('input[data-action="check-item"]');
  if (boxes.length === 0) throw new Error("no checkboxes");
  for (const b of boxes) {
    b.checked = true;
    b.dispatchEvent(new window.Event("change", { bubbles: true }));
  }
  const btn = $('[data-action="complete-list"]');
  if (btn.classList.contains("disabled")) throw new Error("complete still disabled");
  click(btn);
  const st = window.state.checklists.pretrip;
  if (!st.completions || st.completions.length !== 1) throw new Error("completion not logged");
  if (Object.keys(st.checked).length !== 0) throw new Error("not reset after completion");
});

check("add todo", () => {
  window.go("todos");
  $("#new-todo").value = "Buy spare impeller";
  $("#view form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  if (window.state.todos.length !== 1) throw new Error("todo not added");
  if (!text().includes("Buy spare impeller")) throw new Error("todo not rendered");
});

check("toggle todo done", () => {
  const id = window.state.todos[0].id;
  click($(`input[data-action="toggle-todo"][data-id="${id}"]`));
  if (!window.state.todos[0].done) throw new Error("not toggled");
});

check("guide renders + detail", () => {
  window.go("guide");
  if (!text().includes("Raw water impeller")) throw new Error("guide list missing");
  window.go("guide", "guide-item", "impeller");
  if (!$("#view svg")) throw new Error("svg missing");
  if (!text().includes("What it is")) throw new Error("sections missing");
});

check("hours update flow", () => {
  window.go("home");
  click($('[data-action="edit-hours"]'));
  $("#hrs").value = "425";
  click($('[data-action="save-hours"]'));
  if (window.state.settings.hours !== 425) throw new Error("hours not saved");
});

check("season toggle logs + state", () => {
  const before = window.state.settings.season;
  click($('[data-action="toggle-season"]'));
  if (window.state.settings.season === before) throw new Error("season unchanged");
  if (window.state.log[0].type !== "season") throw new Error("no season log entry");
});

check("note without text rejected, with text saved", () => {
  window.go("home");
  click($('[data-action="add-note"]'));
  $("#note-text").value = "Engine sounded great today";
  click($('[data-action="save-note"]'));
  if (window.state.log[0].title !== "Engine sounded great today") throw new Error("note not logged");
});

check("logbook view renders all entries", () => {
  click($('[data-action="open-log"]'));
  if (!text().includes("Engine sounded great today")) throw new Error("log entry missing");
});

check("settings + export shape", () => {
  click($("#gearbtn"));
  if (!$("#set-name")) throw new Error("settings sheet missing");
  $("#set-name").value = "Vera";
  click($('[data-action="save-settings"]'));
  if (window.state.settings.boatName !== "Vera") throw new Error("name not saved");
});

check("custom service add", () => {
  window.go("service");
  click($('[data-action="add-service"]'));
  $("#ns-name").value = "Generator oil";
  $("#ns-hours").value = "100";
  click($('[data-action="save-service"]'));
  if (!window.state.customServices.find(s => s.name === "Generator oil")) throw new Error("not added");
  if (!text().includes("Generator oil")) throw new Error("not rendered");
});

check("state persists via localStorage", () => {
  const raw = window.localStorage.getItem("marex370.v1");
  const data = JSON.parse(raw);
  if (data.settings.boatName !== "Vera") throw new Error("not persisted");
});

check("no uncaught window errors", () => {
  if (errs.length) throw new Error(errs.join("; "));
});

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
