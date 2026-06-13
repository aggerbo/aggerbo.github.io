/* Smoke test of the Marex 370 app in jsdom.
   Run: npm install jsdom fake-indexeddb && node test-app.js */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
require("fake-indexeddb/auto");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
  .replace(/<script src="[^"]*"><\/script>/g, "")
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

// classic scripts share top-level const/let bindings; emulate by evaluating as one unit
const bundle = ["js/i18n.js", "js/icons.js", "js/content-en.js", "js/content-da.js", "js/db.js", "js/illustrations.js", "js/app.js"]
  .map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n;\n") +
  `;window.GUIDE=()=>GUIDE;window.CHECKLISTS=()=>CHECKLISTS;window.SERVICES=()=>SERVICES;
   window.CONTENT=CONTENT;window.STRINGS=STRINGS;window.LUCIDE=LUCIDE;window.icon=icon;
   Object.defineProperty(window,'state',{get:()=>state,set:v=>{state=v}});`;
try { window.eval(bundle); console.log("bundle loaded"); }
catch (e) { console.error("FAIL loading bundle:", e.message, e.stack?.split("\n")[1] || ""); failures++; }

// run the suite in English; Danish is tested explicitly at the end
window.state.settings.lang = "en";
window.applyLang("en");
window.go("home");

function check(name, fn) {
  try { fn(); console.log("PASS", name); }
  catch (e) { console.error("FAIL", name, "—", e.message); failures++; }
}
const $ = sel => window.document.querySelector(sel);
const $$ = sel => [...window.document.querySelectorAll(sel)];
const click = el => el.dispatchEvent(new window.Event("click", { bubbles: true }));
const text = () => $("#view").textContent;

check("invoice patch applied (service 2026-04-28 @ 973 h)", () => {
  for (const id of ["oil", "fuelfilter", "airfilter", "impeller", "belts", "heatex", "coolant", "enginezinc"]) {
    const log = window.state.serviceLog[id];
    if (!log || !log.some(e => e.date === "2026-04-28" && e.hours === 973))
      throw new Error("missing patch entry for " + id);
  }
  if (window.state.settings.hours !== 973) throw new Error("hours not set to 973");
  if (!window.state.patches.volvoService202604) throw new Error("patch flag not set");
});

check("home renders with hours", () => {
  if (!text().includes("Engine hours")) throw new Error("no hours block");
  if (!text().includes("973")) throw new Error("973 h not shown");
});

check("en/da content have identical service & guide ids", () => {
  const ids = c => c.services.map(s => s.id).join() + "|" + c.guide.map(g => g.id).join() +
    "|" + c.checklists.map(l => l.id + ":" + l.sections.map(s => s.items.map(i => i.id).join(".")).join("/")).join();
  if (ids(window.CONTENT.en) !== ids(window.CONTENT.da)) throw new Error("id mismatch between languages");
});

check("en/da string tables have identical keys", () => {
  const ken = Object.keys(window.STRINGS.en).sort().join();
  const kda = Object.keys(window.STRINGS.da).sort().join();
  if (ken !== kda) throw new Error("string key mismatch");
});

check("all guide ids have data + svg in both languages", () => {
  for (const lang of ["en", "da"]) {
    window.applyLang(lang);
    for (const g of window.GUIDE()) {
      const svg = window.guideSVG(g.id);
      if (!svg || !svg.includes("<svg")) throw new Error(`missing SVG for ${g.id} (${lang})`);
      if (svg.includes("undefined")) throw new Error(`undefined label in ${g.id} (${lang})`);
    }
  }
  window.applyLang("en");
});

check("service tab renders all items incl. engine zinc", () => {
  window.go("service");
  for (const s of window.SERVICES()) {
    if (!text().includes(s.name)) throw new Error("missing " + s.name);
  }
  if (!text().includes("Engine zinc anodes")) throw new Error("engine zinc missing");
});

check("open service sheet + mark done", () => {
  click($('[data-action="open-service"][data-id="oil"]'));
  if ($("#sheet").classList.contains("hidden")) throw new Error("sheet not open");
  click($('[data-action="mark-done-form"][data-id="oil"]'));
  $("#md-date").value = "2026-06-08";
  $("#md-hours").value = "990";
  $("#md-note").value = "test oil change";
  click($('[data-action="save-done"][data-id="oil"]'));
  const log = window.state.serviceLog.oil;
  if (log[0].hours !== 990) throw new Error("entry not newest");
  if (window.state.settings.hours !== 990) throw new Error("hours not propagated");
});

check("status pill computes OK for fresh service", () => {
  const st = window.serviceStatus(window.SERVICES().find(s => s.id === "oil"));
  if (st.code !== "ok") throw new Error("expected ok, got " + st.code);
});

check("overdue status computes", () => {
  window.state.serviceLog.antifoul = [{ ts: 1, date: "2024-01-01", hours: null, note: "", photos: [] }];
  const st = window.serviceStatus(window.SERVICES().find(s => s.id === "antifoul"));
  if (st.code !== "overdue") throw new Error("expected overdue, got " + st.code);
});

check("home shows overdue item", () => {
  window.go("home");
  if (!text().includes("Antifouling")) throw new Error("antifoul not in attention list");
});

check("expiry add + shows on home", () => {
  window.go("service");
  click($('[data-action="add-expiry"]'));
  $("#exp-name").value = "Flares";
  $("#exp-date").value = "2025-12-31";
  click($('[data-action="save-expiry"]'));
  if (!window.state.expiries.length) throw new Error("expiry not saved");
  window.go("home");
  if (!text().includes("Flares")) throw new Error("expiry not on home");
});

check("checklist check + complete flow", () => {
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

check("add + toggle todo", () => {
  window.go("todos");
  $("#new-todo").value = "Buy spare impeller";
  $("#view form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  if (window.state.todos.length !== 1) throw new Error("todo not added");
  const id = window.state.todos[0].id;
  click($(`input[data-action="toggle-todo"][data-id="${id}"]`));
  if (!window.state.todos[0].done) throw new Error("not toggled");
});

check("guide renders + detail", () => {
  window.go("guide", "guide-item", "impeller");
  if (!$("#view svg")) throw new Error("svg missing");
  if (!text().includes("What it is")) throw new Error("sections missing");
});

check("hours update with delta", () => {
  window.go("home");
  click($('[data-action="edit-hours"]'));
  $("#hrs").value = "995";
  click($('[data-action="save-hours"]'));
  if (window.state.settings.hours !== 995) throw new Error("hours not saved");
  if (!window.state.log[0].detail.includes("+5")) throw new Error("delta not in log: " + window.state.log[0].detail);
});

check("trip log with hour delta", () => {
  click($('[data-action="add-trip"]'));
  $("#trip-where").value = "Marina → Tunø";
  $("#trip-hours").value = "998.5";
  click($('[data-action="save-trip"]'));
  const e = window.state.log[0];
  if (e.type !== "trip" || !e.title.includes("Tunø")) throw new Error("trip not logged");
  if (!e.detail.includes("+3.5")) throw new Error("delta wrong: " + e.detail);
  if (window.state.settings.hours !== 998.5) throw new Error("hours not updated");
});

check("fuel log + summary", () => {
  window.go("home");
  click($('[data-action="open-log"]'));
  click($('[data-action="add-fuel"]'));
  $("#fuel-liters").value = "120";
  $("#fuel-price").value = "1600";
  $("#fuel-hours").value = "998.5";
  click($('[data-action="save-fuel"]'));
  const e = window.state.log[0];
  if (e.type !== "fuel" || e.fuel.liters !== 120) throw new Error("fuel not logged");
  if (!text().includes("120 L")) throw new Error("summary missing");
});

check("season toggle logs + state", () => {
  window.go("home");
  const before = window.state.settings.season;
  click($('[data-action="toggle-season"]'));
  if (window.state.settings.season === before) throw new Error("season unchanged");
  if (window.state.log[0].type !== "season") throw new Error("no season log entry");
});

check("note flow", () => {
  window.go("home");
  click($('[data-action="add-note"]'));
  $("#note-text").value = "Engine sounded great today";
  click($('[data-action="save-note"]'));
  if (window.state.log[0].title !== "Engine sounded great today") throw new Error("note not logged");
});

check("custom service add", () => {
  window.go("service");
  click($('[data-action="add-service"]'));
  $("#ns-name").value = "Generator oil";
  $("#ns-hours").value = "100";
  click($('[data-action="save-service"]'));
  if (!window.state.customServices.find(s => s.name === "Generator oil")) throw new Error("not added");
});

check("language switch to Danish via settings", () => {
  window.go("home");
  click($("#gearbtn"));
  $("#set-lang").value = "da";
  click($('[data-action="save-settings"]'));
  if (window.state.settings.lang !== "da") throw new Error("lang not saved");
  if (!text().includes("Motortimer")) throw new Error("Danish home not rendered");
  window.go("service");
  if (!text().includes("Motorolie & filter")) throw new Error("Danish service names missing");
  if (!text().includes("Motorzink")) throw new Error("Danish engine zinc missing");
});

check("state persists via localStorage", () => {
  const data = JSON.parse(window.localStorage.getItem("marex370.v1"));
  if (data.settings.lang !== "da") throw new Error("not persisted");
  if (!data.patches.volvoService202604) throw new Error("patch flag not persisted");
});

check("pull-to-refresh indicator mounted before #view", () => {
  const ptr = $("#ptr");
  if (!ptr) throw new Error("#ptr not created");
  if (ptr.nextElementSibling?.id !== "view") throw new Error("#ptr not directly before #view");
  if (!$("#ptr .ptr-spin")) throw new Error("spinner missing");
});

check("edge-swipe from left engages back gesture on a sub-page", () => {
  window.go("guide", "guide-item", "impeller");
  const view = $("#view");
  Object.defineProperty(view, "clientWidth", { value: 390, configurable: true });
  Object.defineProperty(view, "scrollTop", { value: 0, configurable: true });
  const fire = (type, x, y) => view.dispatchEvent(Object.assign(
    new window.Event(type, { bubbles: true, cancelable: true }),
    type === "touchend" ? { changedTouches: [{ clientX: x, clientY: y }] } : { touches: [{ clientX: x, clientY: y }] }));
  fire("touchstart", 8, 300);
  fire("touchmove", 120, 305);   // horizontal drag from the left edge
  if (!/translateX/.test(view.style.transform)) throw new Error("swipe-back did not engage (no transform)");
  fire("touchend", 60, 305);     // release short of threshold → snaps back
});

check("pull gesture grows the refresh indicator at scroll top", () => {
  window.go("home");
  const view = $("#view");
  Object.defineProperty(view, "clientWidth", { value: 390, configurable: true });
  Object.defineProperty(view, "scrollTop", { value: 0, configurable: true });
  const fire = (type, x, y) => view.dispatchEvent(Object.assign(
    new window.Event(type, { bubbles: true, cancelable: true }),
    type === "touchend" ? { changedTouches: [{ clientX: x, clientY: y }] } : { touches: [{ clientX: x, clientY: y }] }));
  fire("touchstart", 200, 100);
  fire("touchmove", 200, 250);   // pull straight down 150px
  const h = parseFloat($("#ptr").style.height) || 0;
  if (h <= 0) throw new Error("ptr did not grow on pull");
  fire("touchend", 200, 250);
});

check("all content icon names resolve to a Lucide icon", () => {
  for (const lang of ["en", "da"]) {
    const c = window.CONTENT[lang];
    const names = [...c.groups, ...c.checklists, ...c.guide].map(o => o.icon);
    for (const n of names) if (!window.LUCIDE[n]) throw new Error(`missing icon "${n}" (${lang})`);
  }
});

check("no missing-icon warnings while rendering every screen", () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (...a) => { warnings.push(a.join(" ")); };
  try {
    ["home", "service", "lists", "todos", "guide"].forEach(t => window.go(t));
    window.go("lists", "checklist", "buy");
    window.go("guide", "guide-item", "impeller");
    window.go("home", "log");
  } finally { console.warn = orig; }
  const missing = warnings.filter(w => w.includes("missing icon"));
  if (missing.length) throw new Error(missing.join("; "));
});

check("no uncaught window errors", () => {
  if (errs.length) throw new Error(errs.join("; "));
});

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
