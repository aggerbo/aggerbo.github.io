/* Marex 370 Boat Care — UI. Vanilla JS, no dependencies. */

/* ---------- helpers ---------- */

const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function uid() { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDate(iso) {
  if (!iso) return "–";
  const d = new Date(iso + (iso.length === 10 ? "T12:00" : ""));
  return d.toLocaleDateString(LANG === "da" ? "da-DK" : undefined, { day: "numeric", month: "short", year: "numeric" });
}
function addMonths(iso, m) {
  const d = new Date(iso + "T12:00");
  d.setMonth(d.getMonth() + m);
  return d;
}
function daysUntil(date) { return Math.floor((date - new Date()) / 86400000); }

function allServices() { return SERVICES.concat(state.customServices || []); }
function findService(id) { return allServices().find(s => s.id === id); }

/* ---------- one-time data patches ---------- */

/* Volvo service per Autohuset Vestergaard invoice 6339900:
   full engine service 2026-04-28 at 973 h. */
function applyPatches() {
  state.patches = state.patches || {};
  if (!state.patches.volvoService202604) {
    const date = "2026-04-28", hours = 973;
    const note = LANG === "da"
      ? "Volvo-service (Autohuset Vestergaard, faktura 6339900)"
      : "Volvo service (Autohuset Vestergaard, invoice 6339900)";
    const done = {
      oil: note, fuelfilter: note, airfilter: note, impeller: note,
      belts: note + (LANG === "da" ? " — 2 nye remme" : " — 2 new belts"),
      heatex: note, coolant: note, enginezinc: note + " — 2 stk.",
    };
    for (const [id, n] of Object.entries(done)) {
      const log = (state.serviceLog[id] = state.serviceLog[id] || []);
      if (!log.some(en => en.date === date)) {
        log.unshift({ ts: Date.now(), date, hours, note: n, photos: [] });
        log.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      }
    }
    if (state.settings.hours == null || state.settings.hours < hours) {
      state.settings.hours = hours;
      state.settings.hoursDate = date;
    }
    state.patches.volvoService202604 = true;
    saveState();
  }
}

/* ---------- service status ---------- */

function serviceStatus(svc) {
  const entries = state.serviceLog[svc.id] || [];
  const last = entries[0];
  if (!last) return { code: "unknown", label: STR.st_unknown, detail: STR.log_first };

  const parts = [];
  let overdue = false, soon = false;

  if (svc.intervalMonths && last.date) {
    const due = addMonths(last.date, svc.intervalMonths);
    const d = daysUntil(due);
    if (d < 0) { overdue = true; parts.push(T("d_overdue", { n: -d })); }
    else { if (d <= 30) soon = true; parts.push(T("d_due", { date: fmtDate(due.toISOString().slice(0, 10)) })); }
  }
  if (svc.intervalHours && last.hours != null && state.settings.hours != null) {
    const left = (last.hours + svc.intervalHours) - state.settings.hours;
    if (left < 0) { overdue = true; parts.push(T("h_overdue", { n: -left })); }
    else { if (left <= 25) soon = true; parts.push(T("h_left", { n: left })); }
  }

  const code = overdue ? "overdue" : soon ? "soon" : "ok";
  const label = overdue ? STR.st_overdue : soon ? STR.st_soon : STR.st_ok;
  return { code, label, detail: parts.join(" · ") || STR.no_interval, last };
}

function intervalText(svc) {
  const bits = [];
  if (svc.intervalHours) bits.push(`${svc.intervalHours} ${STR.hr}`);
  if (svc.intervalMonths) bits.push(svc.intervalMonths % 12 === 0 ? `${svc.intervalMonths / 12} ${STR.yr}` : `${svc.intervalMonths} ${STR.mo}`);
  return bits.length ? STR.every + " " + bits.join(" / ") : STR.as_needed;
}

function expiryStatus(x) {
  const d = daysUntil(new Date(x.date + "T12:00"));
  if (d < 0)  return { code: "overdue", label: STR.st_overdue, detail: T("expired_ago", { n: -d }) };
  if (d <= 60) return { code: "soon", label: STR.st_soon, detail: T("expires_on", { date: fmtDate(x.date) }) };
  return { code: "ok", label: STR.st_ok, detail: T("expires_on", { date: fmtDate(x.date) }) };
}

function addLog(type, title, detail, photos = [], extra = null) {
  const entry = { id: uid(), ts: Date.now(), type, title, detail, photos };
  if (extra) Object.assign(entry, extra);
  state.log.unshift(entry);
  if (state.log.length > 500) state.log.length = 500;
}

/* ---------- navigation ---------- */

let nav = { tab: "home", page: null, arg: null }; // page: checklist|guide-item|log

function go(tab, page = null, arg = null) {
  nav = { tab, page, arg };
  render();
}

function render() {
  const view = $("#view");
  $$("#tabbar button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === nav.tab);
    b.querySelector(".tlabel").textContent = STR["tab_" + b.dataset.tab];
  });
  const back = $("#backbtn");
  back.classList.toggle("hidden", !nav.page);
  $("#gearbtn").classList.toggle("hidden", !!nav.page);

  let html = "", title = STR.app_title;
  if (nav.page === "checklist")  { const l = CHECKLISTS.find(c => c.id === nav.arg); title = l.name; html = checklistView(l); }
  else if (nav.page === "guide-item") { const g = GUIDE.find(x => x.id === nav.arg); title = g.name; html = guideItemView(g); }
  else if (nav.page === "log")   { title = STR.title_log; html = logView(); }
  else if (nav.tab === "home")    { title = state.settings.boatName || STR.app_title; html = homeView(); }
  else if (nav.tab === "service") { title = STR.title_service; html = serviceView(); }
  else if (nav.tab === "lists")   { title = STR.title_lists; html = listsView(); }
  else if (nav.tab === "todos")   { title = STR.title_todos; html = todosView(); }
  else if (nav.tab === "guide")   { title = STR.title_guide; html = guideView(); }

  $("#title").textContent = title;
  $('[data-action="viewer-delete"]').innerHTML = icon("trash-2",{size:16}) + STR.viewer_delete;
  $('[data-action="viewer-close"]').innerHTML = icon("x",{size:16}) + STR.viewer_close;
  view.innerHTML = html;
  view.scrollTop = 0;
  hydratePhotos(view);
}

/* ---------- views ---------- */

function homeView() {
  const s = state.settings;
  const onWater = s.season === "water";

  const showInstall = !navigator.standalone &&
    /iPhone|iPad/.test(navigator.userAgent) &&
    !localStorage.getItem("marex370.installHint");

  const due = allServices()
    .map(svc => ({ kind: "svc", id: svc.id, name: svc.name, st: serviceStatus(svc) }))
    .concat((state.expiries || []).map(x => ({ kind: "exp", id: x.id, name: x.name, st: expiryStatus(x) })))
    .filter(x => x.st.code === "overdue" || x.st.code === "soon")
    .sort((a, b) => (a.st.code === "overdue" ? 0 : 1) - (b.st.code === "overdue" ? 0 : 1));

  const notLogged = allServices().filter(svc => serviceStatus(svc).code === "unknown").length;
  const recent = state.log.slice(0, 4);

  return `
  ${showInstall ? `
  <section class="card alert">
    <span class="alert-ic">${icon("info", { size: 18 })}</span>
    <div class="alert-body">${STR.install_hint}
      <div><button class="btn small outline" data-action="dismiss-install">${STR.got_it}</button></div>
    </div>
  </section>` : ""}
  <section class="card hero">
    <div class="hero-photo">
      <img class="hero-img" src="img/marex-370.jpg?v=1" alt="${esc(state.settings.boatName)}">
      <span class="hero-badge ${onWater ? "water" : "land"}">${icon(onWater ? "waves" : "warehouse", { size: 14 })}${onWater ? STR.in_water : STR.on_land}</span>
      <button class="hero-season-btn" data-action="toggle-season">${onWater ? STR.btn_haulout : STR.btn_launch}</button>
      <div class="hero-scrim"></div>
      <div class="hero-info">
        <div class="hero-name">${esc(state.settings.boatName || "Marex 370")}</div>
        <div class="hero-statline">
          <div>
            <div class="hero-cap">${STR.engine_hours}</div>
            <div class="hero-hours">${s.hours != null ? esc(s.hours) + " " + STR.hr : STR.not_set}</div>
            ${s.hoursDate ? `<div class="hero-updated">${T("updated_on", { date: fmtDate(s.hoursDate) })}</div>` : ""}
          </div>
          <button class="btn small hero-update" data-action="edit-hours">${STR.btn_update}</button>
        </div>
      </div>
    </div>
  </section>

  ${s.hours == null ? `
  <section class="card alert">
    <span class="alert-ic">${icon("info", { size: 18 })}</span>
    <div class="alert-body">${STR.start_here}</div>
  </section>` : ""}

  ${due.length ? `
  <section class="card">
    <div class="card-head"><h2>${icon("triangle-alert", { size: 16, cls: "head-ic warn" })}${STR.needs_attention}</h2><a data-action="goto-service">${STR.service_link}</a></div>
    ${due.slice(0, 6).map(x => `
      <div class="row" data-action="${x.kind === "svc" ? "open-service" : "open-expiry"}" data-id="${x.id}">
        <span class="row-ic ${x.st.code}">${icon(x.kind === "svc" ? "wrench" : "hourglass", { size: 17 })}</span>
        <div class="row-main">
          <div class="row-title">${esc(x.name)}</div>
          <div class="row-sub">${esc(x.st.detail)}</div>
        </div>
        <span class="pill ${x.st.code}">${x.st.label}</span>
      </div>`).join("")}
  </section>` : ""}

  <section class="card">
    <div class="card-head"><h2>${icon("list-checks", { size: 16, cls: "head-ic" })}${STR.quick_lists}</h2></div>
    <div class="chip-row">
      <button class="chip" data-action="open-list" data-id="pretrip">${icon("compass", { size: 15 })}${STR.chip_pretrip}</button>
      <button class="chip" data-action="open-list" data-id="posttrip">${icon("flag", { size: 15 })}${STR.chip_posttrip}</button>
      <button class="chip" data-action="open-list" data-id="monthly">${icon("calendar-days", { size: 15 })}${STR.chip_monthly}</button>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h2>${icon("book-open", { size: 16, cls: "head-ic" })}${STR.logbook}</h2><a data-action="open-log">${STR.all_link}</a></div>
    ${recent.length === 0 ? emptyState("book-open", STR.log_empty) : recent.map(logRow).join("")}
    <div class="btn-row">
      <button class="btn outline" data-action="add-trip">${icon("compass", { size: 16 })}${STR.add_trip_btn}</button>
      <button class="btn outline" data-action="add-note">${icon("pencil", { size: 16 })}${STR.add_note_btn}</button>
    </div>
  </section>`;
}

/* log entry type -> lucide icon */
const LOG_ICON = { service: "wrench", checklist: "clipboard-check", hours: "timer", note: "pencil", season: "anchor", todo: "circle-check", fuel: "fuel", trip: "compass" };

/* shadcn-style empty state: centered icon tile + message */
function emptyState(iconName, text) {
  return `<div class="empty-state"><span class="empty-ic">${icon(iconName, { size: 22 })}</span><span>${text}</span></div>`;
}

function logRow(e) {
  return `
  <div class="row" data-action="open-logentry" data-id="${e.id}">
    <span class="row-ic">${icon(LOG_ICON[e.type] || "circle-check", { size: 17 })}</span>
    <div class="row-main">
      <div class="row-title">${esc(e.title)}</div>
      <div class="row-sub">${fmtDate(new Date(e.ts).toISOString().slice(0, 10))}${e.detail ? " · " + esc(e.detail) : ""}${e.photos?.length ? ` · ${icon("camera", { size: 12, cls: "inline-ic" })}${e.photos.length}` : ""}</div>
    </div>
  </div>`;
}

function serviceView() {
  const baseline = state.settings.hours == null
    ? `<section class="card alert"><span class="alert-ic">${icon("info", { size: 18 })}</span><div class="alert-body">${STR.baseline_notice}</div></section>` : "";

  const expiries = (state.expiries || []).slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return baseline + SERVICE_GROUPS.map(g => {
    const items = allServices().filter(s => s.group === g.id);
    if (!items.length) return "";
    return `
    <section class="card">
      <div class="card-head"><h2>${icon(g.icon, { size: 16, cls: "head-ic" })}${esc(g.name)}</h2></div>
      ${items.map(svc => {
        const st = serviceStatus(svc);
        return `
        <div class="row" data-action="open-service" data-id="${svc.id}">
          <span class="row-ic ${st.code}">${icon(GUIDE_ICON[svc.id] || g.icon, { size: 17 })}</span>
          <div class="row-main">
            <div class="row-title">${esc(svc.name)}${svc.pro ? ` <span class="tag">${STR.workshop}</span>` : ""}</div>
            <div class="row-sub">${intervalText(svc)}${st.last ? ` · ${STR.last_lbl} ${fmtDate(st.last.date)}${st.last.hours != null ? " @ " + st.last.hours + " " + STR.hr : ""}` : ""}</div>
          </div>
          <span class="pill ${st.code}">${st.label}</span>
        </div>`;
      }).join("")}
    </section>`;
  }).join("") + `
  <section class="card">
    <div class="card-head"><h2>${icon("hourglass", { size: 16, cls: "head-ic" })}${STR.expiry_card}</h2></div>
    ${expiries.length === 0 ? `<div class="empty">${STR.expiry_hint}</div>`
      : expiries.map(x => {
        const st = expiryStatus(x);
        return `
        <div class="row" data-action="open-expiry" data-id="${x.id}">
          <span class="row-ic ${st.code}">${icon("hourglass", { size: 17 })}</span>
          <div class="row-main">
            <div class="row-title">${esc(x.name)}</div>
            <div class="row-sub">${esc(st.detail)}</div>
          </div>
          <span class="pill ${st.code}">${st.label}</span>
        </div>`;
      }).join("")}
    <button class="btn outline wide" data-action="add-expiry">${icon("plus", { size: 16 })}${STR.add_expiry_btn}</button>
  </section>
  <button class="btn outline wide" data-action="add-service">${icon("plus", { size: 16 })}${STR.add_service_btn}</button>
  <div class="footnote">${STR.svc_footnote}</div>`;
}

/* service/guide id -> lucide icon (service rows borrow the guide iconography where it exists) */
const GUIDE_ICON = {
  oil: "gauge", fuelfilter: "fuel", impeller: "fan", belts: "rotate-cw", airfilter: "filter",
  coolant: "droplet", valves: "cog", heatex: "flame", enginezinc: "magnet",
  anodes: "magnet", antifoul: "paintbrush", propshaft: "fan", shaftseal: "droplet",
  seacocks: "toggle-right", hoses: "waves", thruster: "move-horizontal", rudder: "ship-wheel",
  batteries: "battery-charging", freshwater: "droplets", toilet: "droplet", heater: "flame",
  gas: "flame", windlass: "anchor", trimtabs: "ruler", canvas: "warehouse",
  extinguisher: "flame", lifejackets: "life-buoy", flares: "flag", firstaid: "plus", alarms: "bell",
};

function listsView() {
  return CHECKLISTS.map(l => {
    const st = state.checklists[l.id] || {};
    const total = l.sections.reduce((n, s) => n + s.items.length, 0);
    const done = Object.values(st.checked || {}).filter(Boolean).length;
    const lastDone = (st.completions || [])[0];
    return `
    <section class="card tappable" data-action="open-list" data-id="${l.id}">
      <div class="list-card">
        <span class="list-icon">${icon(l.icon, { size: 20 })}</span>
        <div class="row-main">
          <div class="row-title">${esc(l.name)}</div>
          <div class="row-sub">${esc(l.desc)}</div>
          <div class="progress"><div style="width:${total ? Math.round(done / total * 100) : 0}%"></div></div>
          <div class="muted tiny">${T("checked_lbl", { a: done, b: total })}${lastDone ? ` · ${T("last_completed", { date: fmtDate(new Date(lastDone.ts).toISOString().slice(0, 10)) })}` : ""}</div>
        </div>
        <span class="chev">${icon("chevron-right", { size: 18 })}</span>
      </div>
    </section>`;
  }).join("");
}

function checklistView(l) {
  const st = state.checklists[l.id] || { checked: {} };
  const total = l.sections.reduce((n, s) => n + s.items.length, 0);
  const done = Object.values(st.checked || {}).filter(Boolean).length;
  const allDone = done === total && total > 0;

  return `
  <section class="card">
    <p class="muted">${esc(l.desc)}</p>
    <div class="progress big"><div id="cl-bar" style="width:${Math.round(done / total * 100)}%"></div></div>
    <div class="muted tiny" id="cl-count">${T("of_lbl", { a: done, b: total })}</div>
  </section>
  ${l.sections.map((sec, si) => `
  <section class="card">
    <div class="card-head"><h2>${esc(sec.name)}</h2></div>
    ${sec.items.map(it => {
      const key = si + "." + it.id;
      const checked = !!(st.checked || {})[key];
      return `
      <label class="check-row ${checked ? "done" : ""}">
        <input type="checkbox" data-action="check-item" data-list="${l.id}" data-key="${key}" ${checked ? "checked" : ""}>
        <div>
          <div class="check-text">${esc(it.text)}</div>
          ${it.sub ? `<div class="row-sub">${esc(it.sub)}</div>` : ""}
        </div>
      </label>`;
    }).join("")}
  </section>`).join("")}
  <button id="cl-complete" class="btn primary wide ${allDone ? "" : "disabled"}" data-action="complete-list" data-id="${l.id}">
    ${allDone ? icon("check",{size:16}) + STR.log_completed_btn : T("check_all_btn", { n: total })}
  </button>
  <button class="btn ghost wide" data-action="reset-list" data-id="${l.id}">${STR.reset_boxes}</button>`;
}

function todosView() {
  const open = state.todos.filter(t => !t.done);
  const closed = state.todos.filter(t => t.done).slice(0, 20);
  return `
  <section class="card">
    <form class="add-row" data-action-submit="add-todo">
      <input type="text" id="new-todo" placeholder="${STR.todo_ph}" maxlength="120">
      <button class="btn primary" type="submit">${STR.add_btn}</button>
    </form>
  </section>
  <section class="card">
    <div class="card-head"><h2>${icon("list-todo", { size: 16, cls: "head-ic" })}${T("todo_head", { n: open.length })}</h2></div>
    ${open.length === 0 ? emptyState("list-todo", STR.todos_empty) : open.map(todoRow).join("")}
  </section>
  ${closed.length ? `
  <section class="card">
    <div class="card-head"><h2>${icon("check", { size: 16, cls: "head-ic" })}${STR.done_head}</h2></div>
    ${closed.map(todoRow).join("")}
  </section>` : ""}`;
}

function todoRow(t) {
  return `
  <div class="row todo ${t.done ? "done" : ""}">
    <input type="checkbox" data-action="toggle-todo" data-id="${t.id}" ${t.done ? "checked" : ""}>
    <div class="row-main" data-action="open-todo" data-id="${t.id}">
      <div class="row-title">${esc(t.title)}</div>
      <div class="row-sub">${fmtDate(new Date(t.created).toISOString().slice(0, 10))}${t.note ? " · " + esc(t.note.slice(0, 60)) : ""}${t.photos?.length ? ` · ${icon("camera", { size: 12, cls: "inline-ic" })}${t.photos.length}` : ""}</div>
    </div>
    <span class="chev">${icon("chevron-right", { size: 18 })}</span>
  </div>`;
}

function guideView() {
  return `
  <section class="card alert">
    <span class="alert-ic">${icon("circle-help", { size: 18 })}</span>
    <div class="alert-body">${STR.guide_intro}</div>
  </section>
  ${GUIDE.map(g => `
  <div class="card tappable" data-action="open-guide" data-id="${g.id}">
    <div class="list-card">
      <span class="list-icon">${icon(g.icon, { size: 20 })}</span>
      <div class="row-main">
        <div class="row-title">${esc(g.name)}</div>
        <div class="row-sub">${esc(g.what.slice(0, 90))}…</div>
      </div>
      <span class="chev">${icon("chevron-right", { size: 18 })}</span>
    </div>
  </div>`).join("")}`;
}

function guideItemView(g) {
  const photos = state.guidePhotos[g.id] || [];
  return `
  <section class="card illus-card">${guideSVG(g.id)}</section>
  <section class="card">
    <h3>${STR.what_is}</h3><p>${esc(g.what)}</p>
    <h3>${STR.where_find}</h3><p>${esc(g.where)}</p>
    <h3>${STR.what_look}</h3><p>${esc(g.look)}</p>
    <h3>${STR.how_often}</h3><p>${esc(g.when)}</p>
  </section>
  <section class="card">
    <div class="card-head"><h2>${icon("camera", { size: 16, cls: "head-ic" })}${STR.yours}</h2></div>
    <p class="muted tiny">${STR.yours_tip}</p>
    ${photoStrip(photos, { kind: "guide", id: g.id })}
  </section>`;
}

function fuelSummary() {
  const fills = state.log.filter(e => e.type === "fuel" && e.fuel);
  if (!fills.length) return "";
  const year = new Date().getFullYear();
  const thisYear = fills.filter(e => new Date(e.ts).getFullYear() === year);
  const liters = thisYear.reduce((n, e) => n + (e.fuel.liters || 0), 0);
  const cost = thisYear.reduce((n, e) => n + (e.fuel.price || 0), 0);

  // average L/h between the oldest and newest fill that recorded hours
  const withHours = fills.filter(e => e.fuel.hours != null).sort((a, b) => a.fuel.hours - b.fuel.hours);
  let rate = "";
  if (withHours.length >= 2) {
    const dh = withHours[withHours.length - 1].fuel.hours - withHours[0].fuel.hours;
    const dl = withHours.slice(1).reduce((n, e) => n + (e.fuel.liters || 0), 0);
    if (dh > 0 && dl > 0) rate = T("fuel_rate", { r: (dl / dh).toFixed(1) });
  }
  return `
  <section class="card">
    <div class="card-head"><h2>${icon("fuel", { size: 16, cls: "head-ic" })}${STR.fuel_card}</h2></div>
    <div class="stat">${T("fuel_total", { l: Math.round(liters) })}${cost ? T("fuel_cost", { p: Math.round(cost) }) : ""}</div>
    ${rate ? `<div class="muted tiny">${rate}</div>` : ""}
  </section>`;
}

function logView() {
  return `
  <div class="btn-row">
    <button class="btn outline" data-action="add-trip">${icon("compass", { size: 16 })}${STR.add_trip_btn}</button>
    <button class="btn outline" data-action="add-fuel">${icon("fuel", { size: 16 })}${STR.add_fuel_btn}</button>
    <button class="btn outline" data-action="add-note">${icon("pencil", { size: 16 })}${STR.add_note_btn}</button>
  </div>
  ${fuelSummary()}
  <section class="card">
    ${state.log.length === 0 ? emptyState("book-open", STR.log_empty) : state.log.map(logRow).join("")}
  </section>`;
}

/* ---------- photos ---------- */

function photoStrip(ids, ctx) {
  return `
  <div class="photo-strip">
    ${ids.map(id => `<img class="thumb" data-photo-id="${id}" data-action="view-photo" data-id="${id}" data-ctx='${esc(JSON.stringify(ctx))}' alt="">`).join("")}
    <button class="thumb add" data-action="add-photo" data-ctx='${esc(JSON.stringify(ctx))}'>${icon("camera", { size: 20 })}<span>${STR.add_photo_lbl}</span></button>
  </div>`;
}

async function hydratePhotos(root) {
  for (const img of $$("img[data-photo-id]", root)) {
    const url = await photoURL(img.dataset.photoId);
    if (url) img.src = url;
  }
}

function photoOwnerArray(ctx) {
  if (ctx.kind === "guide") return state.guidePhotos[ctx.id] || (state.guidePhotos[ctx.id] = []);
  if (ctx.kind === "todo") { const t = state.todos.find(x => x.id === ctx.id); return t ? (t.photos || (t.photos = [])) : null; }
  if (ctx.kind === "log") { const e = state.log.find(x => x.id === ctx.id); return e ? (e.photos || (e.photos = [])) : null; }
  if (ctx.kind === "pending") return pendingPhotos;
  return null;
}

let pendingPhotos = [];   // photos attached in an open form sheet
let photoCtx = null;      // context for the file input
let viewerInfo = null;    // {id, ctx}

function requestPhoto(ctx) {
  photoCtx = ctx;
  const input = $("#photo-input");
  input.value = "";
  input.click();
}

$("#photo-input").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file || !photoCtx) return;
  try {
    const id = await addPhotoFromFile(file);
    const arr = photoOwnerArray(photoCtx);
    if (arr) { arr.push(id); saveState(); }
    refreshPhotoUI();
  } catch (err) {
    alert(T("photo_failed", { e: err.message }));
  }
});

function refreshPhotoUI() {
  if (!$("#sheet").classList.contains("hidden") && sheetRefresh) sheetRefresh();
  else render();
}

/* ---------- bottom sheet ---------- */

let sheetRefresh = null; // re-render fn for the open sheet
function openSheet(html, refresh = null) {
  sheetRefresh = refresh;
  $("#sheet").innerHTML = `<div class="sheet-grip"></div>` + html;
  $("#sheet").classList.remove("hidden");
  $("#sheet-backdrop").classList.remove("hidden");
  hydratePhotos($("#sheet"));
}
function closeSheet(discardPending = true) {
  if (discardPending && pendingPhotos.length) {
    pendingPhotos.forEach(id => deletePhoto(id));
  }
  pendingPhotos = [];
  sheetRefresh = null;
  $("#sheet").classList.add("hidden");
  $("#sheet-backdrop").classList.add("hidden");
}

/* ---------- sheets: service detail / mark done ---------- */

function openServiceSheet(id) {
  const svc = findService(id);
  if (!svc) return;
  const st = serviceStatus(svc);
  const entries = state.serviceLog[id] || [];
  openSheet(`
    <h2>${esc(svc.name)} <span class="pill ${st.code}">${st.label}</span></h2>
    <p class="muted">${intervalText(svc)}${svc.pro ? " · " + STR.usually_workshop : ""}</p>
    <p>${esc(svc.why || "")}</p>
    <button class="btn primary wide" data-action="mark-done-form" data-id="${id}">${icon("check",{size:16})}${STR.mark_done_btn}</button>
    ${entries.length ? `<h3>${STR.history}</h3>` + entries.map(en => `
      <div class="hist">
        <div class="row-title">${fmtDate(en.date)}${en.hours != null ? ` · ${en.hours} ${STR.hr}` : ""}</div>
        ${en.note ? `<div class="row-sub">${esc(en.note)}</div>` : ""}
        ${en.photos?.length ? `<div class="photo-strip">${en.photos.map(p =>
          `<img class="thumb" data-photo-id="${p}" data-action="view-photo" data-id="${p}" alt="">`).join("")}</div>` : ""}
      </div>`).join("") : `<p class="muted tiny">${STR.no_history_tip}</p>`}
    ${svc.custom ? `<button class="btn danger ghost wide" data-action="delete-service" data-id="${id}">${icon("trash-2",{size:16})}${STR.delete_item_btn}</button>` : ""}
  `, () => openServiceSheet(id));
}

function openMarkDoneSheet(id) {
  const svc = findService(id);
  pendingPhotos = [];
  const renderIt = () => openSheet(`
    <h2>${T("done_prefix", { name: esc(svc.name) })}</h2>
    <label class="field">${STR.date_lbl}
      <input type="date" id="md-date" value="${$("#md-date")?.value || todayISO()}" max="${todayISO()}">
    </label>
    <label class="field">${STR.hours_at_lbl}
      <input type="number" id="md-hours" inputmode="numeric" placeholder="${STR.optional_ph}" value="${$("#md-hours")?.value ?? (state.settings.hours ?? "")}">
    </label>
    <label class="field">${STR.notes_lbl}
      <textarea id="md-note" rows="2" placeholder="${STR.md_note_ph}">${esc($("#md-note")?.value || "")}</textarea>
    </label>
    <div class="field"><span>${STR.photos_lbl}</span>${photoStrip(pendingPhotos, { kind: "pending" })}</div>
    <button class="btn primary wide" data-action="save-done" data-id="${id}">${STR.save}</button>
    <button class="btn ghost wide" data-action="close-sheet">${STR.cancel}</button>
  `, renderIt);
  renderIt();
}

function saveDone(id) {
  const svc = findService(id);
  const date = $("#md-date").value || todayISO();
  const hoursRaw = $("#md-hours").value.trim();
  const hours = hoursRaw === "" ? null : Number(hoursRaw);
  if (hours != null && (!isFinite(hours) || hours < 0)) { alert(STR.invalid_number); return; }
  const note = $("#md-note").value.trim();

  const entry = { ts: Date.now(), date, hours, note, photos: pendingPhotos.slice() };
  (state.serviceLog[id] = state.serviceLog[id] || []).unshift(entry);
  state.serviceLog[id].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (hours != null && (state.settings.hours == null || hours > state.settings.hours)) {
    state.settings.hours = hours;
    state.settings.hoursDate = date;
  }
  addLog("service", svc.name, `${fmtDate(date)}${hours != null ? " @ " + hours + " " + STR.hr : ""}`, pendingPhotos.slice());
  pendingPhotos = [];
  saveState();
  closeSheet(false);
  render();
}

/* ---------- sheets: hours / note / trip / fuel / todo / expiry / settings ---------- */

function openHoursSheet() {
  openSheet(`
    <h2>${STR.hours_title}</h2>
    <p class="muted tiny">${STR.hours_tip}</p>
    <label class="field">${STR.current_hours_lbl}
      <input type="number" id="hrs" inputmode="numeric" value="${state.settings.hours ?? ""}" placeholder="${STR.hours_eg_ph}">
    </label>
    <button class="btn primary wide" data-action="save-hours">${STR.save}</button>
  `);
  setTimeout(() => $("#hrs")?.focus(), 50);
}

function openNoteSheet() {
  pendingPhotos = [];
  const renderIt = () => openSheet(`
    <h2>${STR.note_title}</h2>
    <label class="field">${STR.notes_lbl}
      <textarea id="note-text" rows="3" placeholder="${STR.note_ph}">${esc($("#note-text")?.value || "")}</textarea>
    </label>
    <div class="field"><span>${STR.photos_lbl}</span>${photoStrip(pendingPhotos, { kind: "pending" })}</div>
    <button class="btn primary wide" data-action="save-note">${STR.save}</button>
    <button class="btn ghost wide" data-action="close-sheet">${STR.cancel}</button>
  `, renderIt);
  renderIt();
}

function openTripSheet() {
  pendingPhotos = [];
  const renderIt = () => openSheet(`
    <h2>${STR.trip_title}</h2>
    <label class="field">${STR.trip_where_lbl}
      <input type="text" id="trip-where" maxlength="80" placeholder="${STR.trip_where_ph}" value="${esc($("#trip-where")?.value || "")}">
    </label>
    <label class="field">${STR.hours_after_lbl}
      <input type="number" id="trip-hours" inputmode="decimal" step="0.1" placeholder="${STR.optional_ph}" value="${$("#trip-hours")?.value ?? (state.settings.hours ?? "")}">
    </label>
    <label class="field">${STR.notes_lbl}
      <textarea id="trip-note" rows="2">${esc($("#trip-note")?.value || "")}</textarea>
    </label>
    <div class="field"><span>${STR.photos_lbl}</span>${photoStrip(pendingPhotos, { kind: "pending" })}</div>
    <button class="btn primary wide" data-action="save-trip">${STR.save}</button>
    <button class="btn ghost wide" data-action="close-sheet">${STR.cancel}</button>
  `, renderIt);
  renderIt();
}

function openFuelSheet() {
  openSheet(`
    <h2>${STR.fuel_title}</h2>
    <label class="field">${STR.date_lbl}
      <input type="date" id="fuel-date" value="${todayISO()}" max="${todayISO()}">
    </label>
    <label class="field">${STR.liters_lbl}
      <input type="number" id="fuel-liters" inputmode="decimal" step="0.1" placeholder="${STR.liters_lbl}">
    </label>
    <label class="field">${STR.price_lbl}
      <input type="number" id="fuel-price" inputmode="decimal" step="1" placeholder="${STR.optional_ph}">
    </label>
    <label class="field">${STR.hours_at_lbl}
      <input type="number" id="fuel-hours" inputmode="decimal" step="0.1" placeholder="${STR.optional_ph}" value="${state.settings.hours ?? ""}">
    </label>
    <button class="btn primary wide" data-action="save-fuel">${STR.save}</button>
    <button class="btn ghost wide" data-action="close-sheet">${STR.cancel}</button>
  `);
}

function openTodoSheet(id) {
  const t = state.todos.find(x => x.id === id);
  if (!t) return;
  const renderIt = () => openSheet(`
    <h2>${esc(t.title)}</h2>
    <p class="muted tiny">${STR.added_lbl} ${fmtDate(new Date(t.created).toISOString().slice(0, 10))}${t.done ? " · " + STR.done_lbl : ""}</p>
    <label class="field">${STR.notes_lbl}
      <textarea id="todo-note" rows="3" data-action-input="todo-note" data-id="${t.id}" placeholder="${STR.todo_note_ph}">${esc(t.note || "")}</textarea>
    </label>
    <div class="field"><span>${STR.photos_lbl}</span>${photoStrip(t.photos || [], { kind: "todo", id: t.id })}</div>
    <button class="btn primary wide" data-action="toggle-todo-sheet" data-id="${t.id}">${t.done ? STR.mark_undone_btn : icon("check",{size:16}) + STR.mark_done_btn}</button>
    <button class="btn danger ghost wide" data-action="delete-todo" data-id="${t.id}">${icon("trash-2",{size:16})}${STR.delete_btn}</button>
  `, renderIt);
  renderIt();
}

function openExpirySheet(id) {
  const x = id ? (state.expiries || []).find(e => e.id === id) : null;
  openSheet(`
    <h2>${STR.expiry_new_title}</h2>
    <label class="field">${STR.name_lbl}
      <input type="text" id="exp-name" maxlength="60" placeholder="${STR.expiry_name_ph}" value="${esc(x?.name || "")}">
    </label>
    <label class="field">${STR.expiry_date_lbl}
      <input type="date" id="exp-date" value="${x?.date || ""}">
    </label>
    <button class="btn primary wide" data-action="save-expiry" data-id="${x?.id || ""}">${STR.save}</button>
    ${x ? `<button class="btn danger ghost wide" data-action="delete-expiry" data-id="${x.id}">${icon("trash-2",{size:16})}${STR.delete_btn}</button>` : ""}
  `);
}

function openLogEntrySheet(id) {
  const e = state.log.find(x => x.id === id);
  if (!e) return;
  openSheet(`
    <h2>${esc(e.title)}</h2>
    <p class="muted tiny">${new Date(e.ts).toLocaleString(LANG === "da" ? "da-DK" : undefined)}</p>
    ${e.detail ? `<p>${esc(e.detail)}</p>` : ""}
    ${e.photos?.length ? `<div class="photo-strip">${e.photos.map(p =>
      `<img class="thumb" data-photo-id="${p}" data-action="view-photo" data-id="${p}" alt="">`).join("")}</div>` : ""}
    <button class="btn danger ghost wide" data-action="delete-logentry" data-id="${e.id}">${icon("trash-2",{size:16})}${STR.delete_entry_btn}</button>
  `, () => openLogEntrySheet(id));
}

function openSettingsSheet() {
  openSheet(`
    <h2>${STR.settings}</h2>
    <label class="field">${STR.boat_name_lbl}
      <input type="text" id="set-name" value="${esc(state.settings.boatName)}" maxlength="40">
    </label>
    <label class="field">${STR.engine_lbl}
      <input type="text" id="set-engine" value="${esc(state.settings.engine)}" maxlength="40">
    </label>
    <label class="field">${STR.language_lbl}
      <select id="set-lang">
        <option value="da" ${LANG === "da" ? "selected" : ""}>Dansk</option>
        <option value="en" ${LANG === "en" ? "selected" : ""}>English</option>
      </select>
    </label>
    <button class="btn primary wide" data-action="save-settings">${STR.save}</button>
    <h3>${STR.backup_head}</h3>
    <p class="muted tiny">${STR.backup_tip}</p>
    <button class="btn outline wide" data-action="export-data">${icon("download",{size:16})}${STR.export_btn}</button>
    <button class="btn outline wide" data-action="import-data">${icon("upload",{size:16})}${STR.import_btn}</button>
    <input type="file" id="import-input" accept="application/json" class="hidden-input">
    <h3>${STR.danger_head}</h3>
    <button class="btn danger ghost wide" data-action="wipe-data">${icon("trash-2",{size:16})}${STR.erase_btn}</button>
  `);
}

function openAddServiceSheet() {
  openSheet(`
    <h2>${STR.ns_title}</h2>
    <label class="field">${STR.name_lbl}
      <input type="text" id="ns-name" placeholder="${STR.ns_name_ph}" maxlength="60">
    </label>
    <label class="field">${STR.group_lbl}
      <select id="ns-group">${SERVICE_GROUPS.map(g => `<option value="${g.id}">${g.icon} ${esc(g.name)}</option>`).join("")}</select>
    </label>
    <label class="field">${STR.ns_hours_lbl}
      <input type="number" id="ns-hours" inputmode="numeric" placeholder="200">
    </label>
    <label class="field">${STR.ns_months_lbl}
      <input type="number" id="ns-months" inputmode="numeric" placeholder="12">
    </label>
    <label class="field">${STR.ns_why_lbl}
      <textarea id="ns-why" rows="2" placeholder="${STR.ns_why_ph}"></textarea>
    </label>
    <button class="btn primary wide" data-action="save-service">${STR.add_item_btn}</button>
  `);
}

/* ---------- actions ---------- */

document.addEventListener("click", async e => {
  const el = e.target.closest("[data-action]");
  if (!el) {
    const tab = e.target.closest("#tabbar button");
    if (tab) go(tab.dataset.tab);
    return;
  }
  const a = el.dataset.action;
  const id = el.dataset.id;

  switch (a) {
    case "back": go(nav.tab); break;
    case "dismiss-install": localStorage.setItem("marex370.installHint", "1"); render(); break;
    case "settings": openSettingsSheet(); break;
    case "close-sheet": closeSheet(); break;

    case "toggle-season": {
      const toWater = state.settings.season !== "water";
      const list = toWater ? "launch" : "haulout";
      state.settings.season = toWater ? "water" : "land";
      addLog("season", toWater ? STR.season_water_log : STR.season_land_log, "");
      saveState(); render();
      setTimeout(() => {
        if (confirm(toWater ? STR.launch_prompt : STR.haulout_prompt)) go("lists", "checklist", list);
      }, 100);
      break;
    }

    case "edit-hours": openHoursSheet(); break;
    case "save-hours": {
      const v = Number($("#hrs").value);
      if (!isFinite(v) || v < 0) { alert(STR.invalid_number); break; }
      if (state.settings.hours != null && v < state.settings.hours &&
          !confirm(T("lower_confirm", { n: state.settings.hours }))) break;
      const prev = state.settings.hours;
      state.settings.hours = v;
      state.settings.hoursDate = todayISO();
      const delta = prev != null && v > prev ? ` (+${Math.round((v - prev) * 10) / 10} ${STR.hr})` : "";
      addLog("hours", STR.hours_updated, v + " " + STR.hr + delta);
      saveState(); closeSheet(); render();
      break;
    }

    case "goto-service": go("service"); break;
    case "open-service": openServiceSheet(id); break;
    case "mark-done-form": openMarkDoneSheet(id); break;
    case "save-done": saveDone(id); break;
    case "delete-service": {
      if (!confirm(STR.delete_item_confirm)) break;
      state.customServices = state.customServices.filter(s => s.id !== id);
      delete state.serviceLog[id];
      saveState(); closeSheet(); render();
      break;
    }
    case "add-service": openAddServiceSheet(); break;
    case "save-service": {
      const name = $("#ns-name").value.trim();
      if (!name) { alert(STR.give_name); break; }
      const h = Number($("#ns-hours").value) || null;
      const m = Number($("#ns-months").value) || null;
      state.customServices.push({
        id: uid(), custom: true, name, group: $("#ns-group").value,
        intervalHours: h, intervalMonths: m, why: $("#ns-why").value.trim(),
      });
      saveState(); closeSheet(); render();
      break;
    }

    case "add-expiry": openExpirySheet(null); break;
    case "open-expiry": openExpirySheet(id); break;
    case "save-expiry": {
      const name = $("#exp-name").value.trim();
      const date = $("#exp-date").value;
      if (!name || !date) { alert(STR.give_name); break; }
      state.expiries = state.expiries || [];
      const x = state.expiries.find(e2 => e2.id === id);
      if (x) { x.name = name; x.date = date; }
      else state.expiries.push({ id: uid(), name, date });
      saveState(); closeSheet(); render();
      break;
    }
    case "delete-expiry": {
      if (!confirm(STR.delete_expiry_confirm)) break;
      state.expiries = (state.expiries || []).filter(e2 => e2.id !== id);
      saveState(); closeSheet(); render();
      break;
    }

    case "open-list": go("lists", "checklist", id); break;
    case "complete-list": {
      const l = CHECKLISTS.find(c => c.id === id);
      const st = state.checklists[id] || { checked: {} };
      const total = l.sections.reduce((n, s) => n + s.items.length, 0);
      if (Object.values(st.checked || {}).filter(Boolean).length < total) break;
      (st.completions = st.completions || []).unshift({ ts: Date.now() });
      st.checked = {};
      state.checklists[id] = st;
      addLog("checklist", T("list_completed_log", { name: l.name }), T("items_lbl", { n: total }));
      saveState();
      alert(STR.completed_alert);
      go("lists");
      break;
    }
    case "reset-list": {
      if (!confirm(STR.reset_confirm)) break;
      (state.checklists[id] = state.checklists[id] || {}).checked = {};
      saveState(); render();
      break;
    }

    case "toggle-todo": case "toggle-todo-sheet": {
      const t = state.todos.find(x => x.id === id);
      if (!t) break;
      t.done = !t.done;
      t.doneAt = t.done ? Date.now() : null;
      if (t.done) addLog("todo", T("todo_done_log", { t: t.title }), "");
      saveState();
      if (a === "toggle-todo-sheet") closeSheet();
      render();
      break;
    }
    case "open-todo": openTodoSheet(id); break;
    case "delete-todo": {
      if (!confirm(STR.delete_todo_confirm)) break;
      const t = state.todos.find(x => x.id === id);
      (t?.photos || []).forEach(p => deletePhoto(p));
      state.todos = state.todos.filter(x => x.id !== id);
      saveState(); closeSheet(); render();
      break;
    }

    case "open-guide": go("guide", "guide-item", id); break;
    case "open-log": go(nav.tab, "log"); break;
    case "open-logentry": openLogEntrySheet(id); break;
    case "delete-logentry": {
      if (!confirm(STR.delete_log_confirm)) break;
      const en = state.log.find(x => x.id === id);
      (en?.photos || []).forEach(p => deletePhoto(p));
      state.log = state.log.filter(x => x.id !== id);
      saveState(); closeSheet(); render();
      break;
    }

    case "add-note": openNoteSheet(); break;
    case "save-note": {
      const txt = $("#note-text").value.trim();
      if (!txt && pendingPhotos.length === 0) { alert(STR.note_empty_alert); break; }
      addLog("note", txt || STR.photo_word, "", pendingPhotos.slice());
      pendingPhotos = [];
      saveState(); closeSheet(false); render();
      break;
    }

    case "add-trip": openTripSheet(); break;
    case "save-trip": {
      const where = $("#trip-where").value.trim();
      const hoursRaw = $("#trip-hours").value.trim();
      const hours = hoursRaw === "" ? null : Number(hoursRaw);
      if (hours != null && (!isFinite(hours) || hours < 0)) { alert(STR.invalid_number); break; }
      if (!where && hours == null) { alert(STR.note_empty_alert); break; }
      const note = $("#trip-note").value.trim();
      let detail = "";
      if (hours != null) {
        const prev = state.settings.hours;
        if (prev != null && hours > prev) detail = `+${Math.round((hours - prev) * 10) / 10} ${STR.hr}`;
        if (prev == null || hours > prev) {
          state.settings.hours = hours;
          state.settings.hoursDate = todayISO();
        }
      }
      if (note) detail = detail ? detail + " · " + note : note;
      addLog("trip", where || STR.trip_word, detail, pendingPhotos.slice());
      pendingPhotos = [];
      saveState(); closeSheet(false); render();
      break;
    }

    case "add-fuel": openFuelSheet(); break;
    case "save-fuel": {
      const liters = Number($("#fuel-liters").value);
      if (!isFinite(liters) || liters <= 0) { alert(STR.liters_invalid); break; }
      const price = Number($("#fuel-price").value) || null;
      const hoursRaw = $("#fuel-hours").value.trim();
      const hours = hoursRaw === "" ? null : Number(hoursRaw);
      const date = $("#fuel-date").value || todayISO();
      if (hours != null && (state.settings.hours == null || hours > state.settings.hours)) {
        state.settings.hours = hours;
        state.settings.hoursDate = date;
      }
      addLog("fuel", STR.fuel_word, `${liters} L${price ? " · " + price + " kr" : ""}`, [],
        { fuel: { liters, price, hours, date } });
      saveState(); closeSheet(); render();
      break;
    }

    case "add-photo": requestPhoto(JSON.parse(el.dataset.ctx)); break;
    case "view-photo": {
      viewerInfo = { id, ctx: el.dataset.ctx ? JSON.parse(el.dataset.ctx) : null };
      const url = await photoURL(id);
      if (!url) break;
      $("#viewer-img").src = url;
      $("#viewer").classList.remove("hidden");
      break;
    }
    case "viewer-close": $("#viewer").classList.add("hidden"); break;
    case "viewer-delete": {
      if (!viewerInfo || !confirm(STR.delete_photo_confirm)) break;
      const { id: pid } = viewerInfo;
      const owners = [
        ...Object.values(state.guidePhotos),
        ...state.todos.map(t => t.photos || []),
        ...state.log.map(l => l.photos || []),
        ...Object.values(state.serviceLog).flat().map(en => en.photos || []),
        pendingPhotos,
      ];
      owners.forEach(arr => {
        const i = arr.indexOf(pid);
        if (i >= 0) arr.splice(i, 1);
      });
      await deletePhoto(pid);
      saveState();
      $("#viewer").classList.add("hidden");
      refreshPhotoUI();
      break;
    }

    case "save-settings": {
      state.settings.boatName = $("#set-name").value.trim() || "Marex 370";
      state.settings.engine = $("#set-engine").value.trim();
      const lang = $("#set-lang").value;
      if (lang !== state.settings.lang) {
        state.settings.lang = lang;
        applyLang(lang);
      }
      saveState(); closeSheet(); render();
      break;
    }
    case "export-data": {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const aEl = document.createElement("a");
      aEl.href = URL.createObjectURL(blob);
      aEl.download = `marex370-backup-${todayISO()}.json`;
      aEl.click();
      setTimeout(() => URL.revokeObjectURL(aEl.href), 5000);
      break;
    }
    case "import-data": {
      const input = $("#import-input");
      input.onchange = () => {
        const f = input.files[0];
        if (!f) return;
        f.text().then(txt => {
          const data = JSON.parse(txt);
          if (!data || data.v !== 1) throw new Error(STR.not_backup);
          if (!confirm(STR.import_confirm)) return;
          state = Object.assign(structuredClone(DEFAULT_STATE), data);
          applyLang(state.settings.lang || "da");
          saveState(); closeSheet(); render();
        }).catch(err => alert(T("import_failed", { e: err.message })));
      };
      input.click();
      break;
    }
    case "wipe-data": {
      if (!confirm(STR.erase_c1)) break;
      if (!confirm(STR.erase_c2)) break;
      localStorage.removeItem(STORE_KEY);
      indexedDB.deleteDatabase("marex370-photos");
      location.reload();
      break;
    }
  }
});

document.addEventListener("change", e => {
  const el = e.target.closest("[data-action]");
  if (el?.dataset.action === "check-item") {
    const { list, key } = el.dataset;
    const st = (state.checklists[list] = state.checklists[list] || { checked: {} });
    st.checked = st.checked || {};
    st.checked[key] = el.checked;
    saveState();
    // update in place — a full render would reset the scroll position
    el.closest(".check-row").classList.toggle("done", el.checked);
    const l = CHECKLISTS.find(c => c.id === list);
    const total = l.sections.reduce((n, s) => n + s.items.length, 0);
    const done = Object.values(st.checked).filter(Boolean).length;
    const bar = $("#cl-bar"), count = $("#cl-count"), btn = $("#cl-complete");
    if (bar) bar.style.width = Math.round(done / total * 100) + "%";
    if (count) count.textContent = T("of_lbl", { a: done, b: total });
    if (btn) {
      btn.classList.toggle("disabled", done < total);
      btn.textContent = done < total ? T("check_all_btn", { n: total }) : STR.log_completed_btn;
    }
  }
});

document.addEventListener("input", e => {
  const el = e.target.closest("[data-action-input]");
  if (el?.dataset.actionInput === "todo-note") {
    const t = state.todos.find(x => x.id === el.dataset.id);
    if (t) { t.note = el.value; saveState(); }
  }
});

document.addEventListener("submit", e => {
  const form = e.target.closest("[data-action-submit]");
  if (!form) return;
  e.preventDefault();
  if (form.dataset.actionSubmit === "add-todo") {
    const input = $("#new-todo");
    const title = input.value.trim();
    if (!title) return;
    state.todos.unshift({ id: uid(), title, note: "", created: Date.now(), done: false, photos: [] });
    saveState(); render();
    setTimeout(() => $("#new-todo")?.focus(), 50);
  }
});

/* ---------- touch gestures: pull-to-refresh + edge-swipe back ---------- */
(function setupGestures() {
  const view = $("#view");
  const app = $("#app");
  const ptr = document.createElement("div");
  ptr.id = "ptr";
  ptr.innerHTML = '<div class="ptr-spin"></div>';
  app.insertBefore(ptr, view);

  const PULL_MAX = 72, PULL_TRIGGER = 52, BACK_EDGE = 30, BACK_TRIGGER = 0.33;
  let mode = null;           // pending | scroll | ptr | back
  let startX = 0, startY = 0;

  const overlayOpen = () =>
    !$("#sheet").classList.contains("hidden") || !$("#viewer").classList.contains("hidden");

  const resetView = () => {
    view.style.transition = "none";
    view.style.transform = "";
    view.style.opacity = "";
  };

  view.addEventListener("touchstart", e => {
    if (e.touches.length !== 1 || overlayOpen()) { mode = null; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    mode = "pending";
  }, { passive: true });

  view.addEventListener("touchmove", e => {
    if (!mode || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (mode === "pending") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (nav.page && startX <= BACK_EDGE && dx > Math.abs(dy)) mode = "back";
      else if (view.scrollTop <= 0 && dy > Math.abs(dx)) mode = "ptr";
      else mode = "scroll";
    }

    if (mode === "back") {
      e.preventDefault();
      const t = Math.max(0, Math.min(dx, view.clientWidth));
      view.style.transition = "none";
      view.style.transform = `translateX(${t}px)`;
      view.style.opacity = String(1 - Math.min(t / view.clientWidth, .4));
    } else if (mode === "ptr") {
      if (view.scrollTop > 0 || dy <= 0) { ptr.style.height = "0"; ptr.classList.remove("ready"); return; }
      e.preventDefault();
      const pull = Math.min(dy * 0.5, PULL_MAX);
      ptr.style.height = pull + "px";
      ptr.classList.toggle("ready", pull >= PULL_TRIGGER);
    }
  }, { passive: false });

  view.addEventListener("touchend", e => {
    const dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : startX) - startX;
    if (mode === "back") {
      view.style.transition = "transform .2s ease, opacity .2s ease";
      if (dx > view.clientWidth * BACK_TRIGGER) {
        view.style.transform = "translateX(100%)";
        view.style.opacity = "0";
        setTimeout(() => { go(nav.tab); resetView(); }, 170);
      } else {
        view.style.transform = ""; view.style.opacity = "";
      }
    } else if (mode === "ptr") {
      if (ptr.classList.contains("ready")) {
        ptr.classList.add("spinning");
        ptr.style.height = PULL_TRIGGER + "px";
        setTimeout(() => location.reload(), 400);
      } else {
        ptr.style.height = "0";
      }
    }
    mode = null;
  });
})();

/* ---------- chrome icons ---------- */
const TAB_ICON = { home: "anchor", service: "wrench", lists: "clipboard-check", todos: "list-todo", guide: "book-open" };
function initChrome() {
  $("#backbtn").innerHTML = icon("arrow-left", { size: 24 });
  $("#gearbtn").innerHTML = icon("settings", { size: 21 });
  $$("#tabbar button").forEach(b => {
    b.querySelector(".ticon").innerHTML = icon(TAB_ICON[b.dataset.tab], { size: 22 });
  });
}

/* ---------- go ---------- */
applyLang(state.settings.lang || "da");
applyPatches();
initChrome();
render();
