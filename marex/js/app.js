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
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function addMonths(iso, m) {
  const d = new Date(iso + "T12:00");
  d.setMonth(d.getMonth() + m);
  return d;
}
function daysUntil(date) { return Math.floor((date - new Date()) / 86400000); }

function allServices() { return SERVICES.concat(state.customServices || []); }
function findService(id) { return allServices().find(s => s.id === id); }

/* ---------- service status ---------- */

function serviceStatus(svc) {
  const entries = state.serviceLog[svc.id] || [];
  const last = entries[0];
  if (!last) return { code: "unknown", label: "Not logged", detail: "Log when this was last done to start tracking." };

  const parts = [];
  let overdue = false, soon = false;

  if (svc.intervalMonths && last.date) {
    const due = addMonths(last.date, svc.intervalMonths);
    const d = daysUntil(due);
    if (d < 0) { overdue = true; parts.push(`${-d} days overdue`); }
    else { if (d <= 30) soon = true; parts.push(`due ${fmtDate(due.toISOString().slice(0, 10))}`); }
  }
  if (svc.intervalHours && last.hours != null && state.settings.hours != null) {
    const left = (last.hours + svc.intervalHours) - state.settings.hours;
    if (left < 0) { overdue = true; parts.push(`${-left} h overdue`); }
    else { if (left <= 25) soon = true; parts.push(`${left} h left`); }
  }

  const code = overdue ? "overdue" : soon ? "soon" : "ok";
  const label = overdue ? "Overdue" : soon ? "Due soon" : "OK";
  return { code, label, detail: parts.join(" · ") || "No interval tracked", last };
}

function intervalText(svc) {
  const bits = [];
  if (svc.intervalHours) bits.push(`${svc.intervalHours} h`);
  if (svc.intervalMonths) bits.push(svc.intervalMonths % 12 === 0 ? `${svc.intervalMonths / 12} yr` : `${svc.intervalMonths} mo`);
  return bits.length ? "Every " + bits.join(" / ") : "As needed";
}

function addLog(type, title, detail, photos = []) {
  state.log.unshift({ id: uid(), ts: Date.now(), type, title, detail, photos });
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
  $$("#tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === nav.tab));
  const back = $("#backbtn");
  back.classList.toggle("hidden", !nav.page);
  $("#gearbtn").classList.toggle("hidden", !!nav.page);

  let html = "", title = "Marex 370";
  if (nav.page === "checklist")  { const l = CHECKLISTS.find(c => c.id === nav.arg); title = l.name; html = checklistView(l); }
  else if (nav.page === "guide-item") { const g = GUIDE.find(x => x.id === nav.arg); title = g.name; html = guideItemView(g); }
  else if (nav.page === "log")   { title = "Logbook"; html = logView(); }
  else if (nav.tab === "home")    { title = state.settings.boatName || "Marex 370"; html = homeView(); }
  else if (nav.tab === "service") { title = "Service"; html = serviceView(); }
  else if (nav.tab === "lists")   { title = "Checklists"; html = listsView(); }
  else if (nav.tab === "todos")   { title = "Todos"; html = todosView(); }
  else if (nav.tab === "guide")   { title = "Know your boat"; html = guideView(); }

  $("#title").textContent = title;
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
    .map(svc => ({ svc, st: serviceStatus(svc) }))
    .filter(x => x.st.code === "overdue" || x.st.code === "soon")
    .sort((a, b) => (a.st.code === "overdue" ? 0 : 1) - (b.st.code === "overdue" ? 0 : 1));

  const notLogged = allServices().filter(svc => serviceStatus(svc).code === "unknown").length;

  const recent = state.log.slice(0, 4);

  return `
  ${showInstall ? `
  <section class="card notice">
    <strong>📲 Make it an app:</strong> tap the Share button below, then
    <strong>Add to Home Screen</strong>. You get a real app icon, full screen,
    and it works offline at sea.
    <button class="btn small ghost" data-action="dismiss-install" style="margin-top:6px">Got it</button>
  </section>` : ""}
  <section class="card hero">
    <div class="hero-row">
      <div>
        <div class="hero-label">Status</div>
        <div class="hero-season">${onWater ? "🌊 In the water" : "🛠️ On land"}</div>
      </div>
      <button class="btn small" data-action="toggle-season">${onWater ? "Haul out" : "Launch"}</button>
    </div>
    <div class="hero-row">
      <div>
        <div class="hero-label">Engine hours</div>
        <div class="hero-hours">${s.hours != null ? esc(s.hours) + " h" : "— not set —"}</div>
        ${s.hoursDate ? `<div class="muted tiny">updated ${fmtDate(s.hoursDate)}</div>` : ""}
      </div>
      <button class="btn small" data-action="edit-hours">Update</button>
    </div>
  </section>

  ${s.hours == null ? `
  <section class="card notice">
    <strong>Start here 👋</strong> Set your current engine hours (read them off the dash display),
    then go through the Service tab and log roughly when each item was last done — a guess is fine.
    From then on the app tells you what's due.
  </section>` : ""}

  <section class="card">
    <div class="card-head"><h2>Needs attention</h2><a data-action="goto-service">Service ›</a></div>
    ${due.length === 0
      ? `<div class="empty">Nothing due. ${notLogged ? `${notLogged} items have no history yet — log them in Service.` : "She's all shipshape ✨"}</div>`
      : due.slice(0, 6).map(({ svc, st }) => `
        <div class="row" data-action="open-service" data-id="${svc.id}">
          <div class="row-main">
            <div class="row-title">${esc(svc.name)}</div>
            <div class="row-sub">${esc(st.detail)}</div>
          </div>
          <span class="pill ${st.code}">${st.label}</span>
        </div>`).join("")}
  </section>

  <section class="card">
    <div class="card-head"><h2>Quick checklists</h2></div>
    <div class="chip-row">
      <button class="chip" data-action="open-list" data-id="pretrip">🧭 Before trip</button>
      <button class="chip" data-action="open-list" data-id="posttrip">🏁 After trip</button>
      <button class="chip" data-action="open-list" data-id="monthly">📅 Monthly</button>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h2>Logbook</h2><a data-action="open-log">All ›</a></div>
    ${recent.length === 0 ? `<div class="empty">Everything you do gets logged here.</div>`
      : recent.map(logRow).join("")}
    <button class="btn ghost wide" data-action="add-note">＋ Add note / photo</button>
  </section>`;
}

function logRow(e) {
  const icons = { service: "🔧", checklist: "✅", hours: "⏱", note: "📝", season: "⚓️", todo: "☑️" };
  return `
  <div class="row" data-action="open-logentry" data-id="${e.id}">
    <div class="row-main">
      <div class="row-title">${icons[e.type] || "•"} ${esc(e.title)}</div>
      <div class="row-sub">${fmtDate(new Date(e.ts).toISOString().slice(0, 10))}${e.detail ? " · " + esc(e.detail) : ""}${e.photos?.length ? " · 📷" + e.photos.length : ""}</div>
    </div>
  </div>`;
}

function serviceView() {
  const baseline = state.settings.hours == null
    ? `<section class="card notice">Set your engine hours on the Home tab first — hour-based intervals can't be tracked without it.</section>` : "";

  return baseline + SERVICE_GROUPS.map(g => {
    const items = allServices().filter(s => s.group === g.id);
    if (!items.length) return "";
    return `
    <section class="card">
      <div class="card-head"><h2>${g.icon} ${esc(g.name)}</h2></div>
      ${items.map(svc => {
        const st = serviceStatus(svc);
        return `
        <div class="row" data-action="open-service" data-id="${svc.id}">
          <div class="row-main">
            <div class="row-title">${esc(svc.name)}${svc.pro ? ' <span class="tag">workshop</span>' : ""}</div>
            <div class="row-sub">${intervalText(svc)}${st.last ? ` · last ${fmtDate(st.last.date)}${st.last.hours != null ? " @ " + st.last.hours + " h" : ""}` : ""}</div>
          </div>
          <span class="pill ${st.code}">${st.label}</span>
        </div>`;
      }).join("")}
    </section>`;
  }).join("") + `
  <button class="btn ghost wide" data-action="add-service">＋ Add your own service item</button>
  <div class="footnote">Intervals follow the Volvo Penta D-series schedule (whichever comes first: hours or calendar time). Adjust to your engine's manual if it differs.</div>`;
}

function listsView() {
  return CHECKLISTS.map(l => {
    const st = state.checklists[l.id] || {};
    const total = l.sections.reduce((n, s) => n + s.items.length, 0);
    const done = Object.values(st.checked || {}).filter(Boolean).length;
    const lastDone = (st.completions || [])[0];
    return `
    <section class="card tappable" data-action="open-list" data-id="${l.id}">
      <div class="list-card">
        <div class="list-icon">${l.icon}</div>
        <div class="row-main">
          <div class="row-title">${esc(l.name)}</div>
          <div class="row-sub">${esc(l.desc)}</div>
          <div class="progress"><div style="width:${total ? Math.round(done / total * 100) : 0}%"></div></div>
          <div class="muted tiny">${done}/${total} checked${lastDone ? ` · last completed ${fmtDate(new Date(lastDone.ts).toISOString().slice(0, 10))}` : ""}</div>
        </div>
        <div class="chev">›</div>
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
    <div class="muted tiny" id="cl-count">${done} of ${total}</div>
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
    ${allDone ? "✓ Log as completed" : `Check all ${total} items to complete`}
  </button>
  <button class="btn ghost wide" data-action="reset-list" data-id="${l.id}">Reset checkboxes</button>`;
}

function todosView() {
  const open = state.todos.filter(t => !t.done);
  const closed = state.todos.filter(t => t.done).slice(0, 20);
  return `
  <section class="card">
    <form class="add-row" data-action-submit="add-todo">
      <input type="text" id="new-todo" placeholder="New todo… e.g. Buy spare impeller" maxlength="120">
      <button class="btn primary" type="submit">Add</button>
    </form>
  </section>
  <section class="card">
    <div class="card-head"><h2>To do (${open.length})</h2></div>
    ${open.length === 0 ? `<div class="empty">Nothing on the list. Add things the moment you spot them aboard — with a photo.</div>` : open.map(todoRow).join("")}
  </section>
  ${closed.length ? `
  <section class="card">
    <div class="card-head"><h2>Done</h2></div>
    ${closed.map(todoRow).join("")}
  </section>` : ""}`;
}

function todoRow(t) {
  return `
  <div class="row todo ${t.done ? "done" : ""}">
    <input type="checkbox" data-action="toggle-todo" data-id="${t.id}" ${t.done ? "checked" : ""}>
    <div class="row-main" data-action="open-todo" data-id="${t.id}">
      <div class="row-title">${esc(t.title)}</div>
      <div class="row-sub">${fmtDate(new Date(t.created).toISOString().slice(0, 10))}${t.note ? " · " + esc(t.note.slice(0, 60)) : ""}${t.photos?.length ? " · 📷" + t.photos.length : ""}</div>
    </div>
    <div class="chev">›</div>
  </div>`;
}

function guideView() {
  return `
  <section class="card notice">
    <strong>What am I looking at?</strong> Plain-language explanations of the parts you'll meet on your
    Marex 370. Open each one and snap a photo of <em>your</em> boat's version — next season you'll thank yourself.
  </section>
  ${GUIDE.map(g => `
  <div class="card tappable" data-action="open-guide" data-id="${g.id}">
    <div class="list-card">
      <div class="list-icon">${g.icon}</div>
      <div class="row-main">
        <div class="row-title">${esc(g.name)}</div>
        <div class="row-sub">${esc(g.what.slice(0, 90))}…</div>
      </div>
      <div class="chev">›</div>
    </div>
  </div>`).join("")}`;
}

function guideItemView(g) {
  const photos = state.guidePhotos[g.id] || [];
  return `
  <section class="card illus-card">${guideSVG(g.id)}</section>
  <section class="card">
    <h3>What it is</h3><p>${esc(g.what)}</p>
    <h3>Where to find it</h3><p>${esc(g.where)}</p>
    <h3>What to look for</h3><p>${esc(g.look)}</p>
    <h3>How often</h3><p>${esc(g.when)}</p>
  </section>
  <section class="card">
    <div class="card-head"><h2>📷 Yours</h2></div>
    <p class="muted tiny">Take a photo of this part on your boat so you always know what it looks like (and how it looked when healthy).</p>
    ${photoStrip(photos, { kind: "guide", id: g.id })}
  </section>`;
}

function logView() {
  return `
  <button class="btn ghost wide" data-action="add-note">＋ Add note / photo</button>
  <section class="card">
    ${state.log.length === 0 ? `<div class="empty">No entries yet.</div>` : state.log.map(logRow).join("")}
  </section>`;
}

/* ---------- photos ---------- */

function photoStrip(ids, ctx) {
  return `
  <div class="photo-strip">
    ${ids.map(id => `<img class="thumb" data-photo-id="${id}" data-action="view-photo" data-id="${id}" data-ctx='${esc(JSON.stringify(ctx))}' alt="">`).join("")}
    <button class="thumb add" data-action="add-photo" data-ctx='${esc(JSON.stringify(ctx))}'>📷<br>Add</button>
  </div>`;
}

async function hydratePhotos(root) {
  for (const img of $$("img[data-photo-id]", root)) {
    const url = await photoURL(img.dataset.photoId);
    if (url) img.src = url;
  }
}

function photoOwnerArray(ctx) {
  // returns the array that holds photo ids for a context
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
    alert("Could not save the photo: " + err.message);
  }
});

function refreshPhotoUI() {
  // re-render whichever surface is showing the strip
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
    <p class="muted">${intervalText(svc)}${svc.pro ? " · usually a workshop job" : ""}</p>
    <p>${esc(svc.why || "")}</p>
    <button class="btn primary wide" data-action="mark-done-form" data-id="${id}">✓ Mark as done</button>
    ${entries.length ? `<h3>History</h3>` + entries.map(en => `
      <div class="hist">
        <div class="row-title">${fmtDate(en.date)}${en.hours != null ? ` · ${en.hours} h` : ""}</div>
        ${en.note ? `<div class="row-sub">${esc(en.note)}</div>` : ""}
        ${en.photos?.length ? `<div class="photo-strip">${en.photos.map(p =>
          `<img class="thumb" data-photo-id="${p}" data-action="view-photo" data-id="${p}" alt="">`).join("")}</div>` : ""}
      </div>`).join("") : `<p class="muted tiny">No history yet. If you're not sure when it was last done, log your best guess — or log it as done at the next service.</p>`}
    ${svc.custom ? `<button class="btn danger ghost wide" data-action="delete-service" data-id="${id}">Delete this item</button>` : ""}
  `, () => openServiceSheet(id));
}

function openMarkDoneSheet(id) {
  const svc = findService(id);
  pendingPhotos = [];
  const renderIt = () => openSheet(`
    <h2>Done: ${esc(svc.name)}</h2>
    <label class="field">Date
      <input type="date" id="md-date" value="${$("#md-date")?.value || todayISO()}" max="${todayISO()}">
    </label>
    <label class="field">Engine hours at the time
      <input type="number" id="md-hours" inputmode="numeric" placeholder="optional" value="${$("#md-hours")?.value ?? (state.settings.hours ?? "")}">
    </label>
    <label class="field">Notes
      <textarea id="md-note" rows="2" placeholder="What was done, parts used, who did it…">${esc($("#md-note")?.value || "")}</textarea>
    </label>
    <div class="field"><span>Photos</span>${photoStrip(pendingPhotos, { kind: "pending" })}</div>
    <button class="btn primary wide" data-action="save-done" data-id="${id}">Save</button>
    <button class="btn ghost wide" data-action="close-sheet">Cancel</button>
  `, renderIt);
  renderIt();
}

function saveDone(id) {
  const svc = findService(id);
  const date = $("#md-date").value || todayISO();
  const hoursRaw = $("#md-hours").value.trim();
  const hours = hoursRaw === "" ? null : Number(hoursRaw);
  if (hours != null && (!isFinite(hours) || hours < 0)) { alert("Engine hours must be a positive number."); return; }
  const note = $("#md-note").value.trim();

  const entry = { ts: Date.now(), date, hours, note, photos: pendingPhotos.slice() };
  (state.serviceLog[id] = state.serviceLog[id] || []).unshift(entry);
  state.serviceLog[id].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (hours != null && (state.settings.hours == null || hours > state.settings.hours)) {
    state.settings.hours = hours;
    state.settings.hoursDate = date;
  }
  addLog("service", svc.name, `done ${fmtDate(date)}${hours != null ? " @ " + hours + " h" : ""}`, pendingPhotos.slice());
  pendingPhotos = [];
  saveState();
  closeSheet(false);
  render();
}

/* ---------- sheets: hours / note / todo / settings / add service ---------- */

function openHoursSheet() {
  openSheet(`
    <h2>Engine hours</h2>
    <p class="muted tiny">Read them off the engine display at the helm. Update after every trip — all hour-based service reminders build on this number.</p>
    <label class="field">Current hours
      <input type="number" id="hrs" inputmode="numeric" value="${state.settings.hours ?? ""}" placeholder="e.g. 412">
    </label>
    <button class="btn primary wide" data-action="save-hours">Save</button>
  `);
  setTimeout(() => $("#hrs")?.focus(), 50);
}

function openNoteSheet() {
  pendingPhotos = [];
  const renderIt = () => openSheet(`
    <h2>Logbook note</h2>
    <label class="field">Note
      <textarea id="note-text" rows="3" placeholder="e.g. Odd vibration at 2500 rpm · checked prop, found rope">${esc($("#note-text")?.value || "")}</textarea>
    </label>
    <div class="field"><span>Photos</span>${photoStrip(pendingPhotos, { kind: "pending" })}</div>
    <button class="btn primary wide" data-action="save-note">Save</button>
    <button class="btn ghost wide" data-action="close-sheet">Cancel</button>
  `, renderIt);
  renderIt();
}

function openTodoSheet(id) {
  const t = state.todos.find(x => x.id === id);
  if (!t) return;
  const renderIt = () => openSheet(`
    <h2>${esc(t.title)}</h2>
    <p class="muted tiny">Added ${fmtDate(new Date(t.created).toISOString().slice(0, 10))}${t.done ? " · done" : ""}</p>
    <label class="field">Notes
      <textarea id="todo-note" rows="3" data-action-input="todo-note" data-id="${t.id}" placeholder="Details, measurements, part numbers…">${esc(t.note || "")}</textarea>
    </label>
    <div class="field"><span>Photos</span>${photoStrip(t.photos || [], { kind: "todo", id: t.id })}</div>
    <button class="btn primary wide" data-action="toggle-todo-sheet" data-id="${t.id}">${t.done ? "Mark as not done" : "✓ Mark as done"}</button>
    <button class="btn danger ghost wide" data-action="delete-todo" data-id="${t.id}">Delete</button>
  `, renderIt);
  renderIt();
}

function openLogEntrySheet(id) {
  const e = state.log.find(x => x.id === id);
  if (!e) return;
  openSheet(`
    <h2>${esc(e.title)}</h2>
    <p class="muted tiny">${new Date(e.ts).toLocaleString()}</p>
    ${e.detail ? `<p>${esc(e.detail)}</p>` : ""}
    ${e.photos?.length ? `<div class="photo-strip">${e.photos.map(p =>
      `<img class="thumb" data-photo-id="${p}" data-action="view-photo" data-id="${p}" alt="">`).join("")}</div>` : ""}
    <button class="btn danger ghost wide" data-action="delete-logentry" data-id="${e.id}">Delete entry</button>
  `, () => openLogEntrySheet(id));
}

function openSettingsSheet() {
  openSheet(`
    <h2>Settings</h2>
    <label class="field">Boat name
      <input type="text" id="set-name" value="${esc(state.settings.boatName)}" maxlength="40">
    </label>
    <label class="field">Engine
      <input type="text" id="set-engine" value="${esc(state.settings.engine)}" maxlength="40">
    </label>
    <button class="btn primary wide" data-action="save-settings">Save</button>
    <h3>Backup</h3>
    <p class="muted tiny">Data lives only on this phone. Export a backup now and then (photos are not included in the file — they stay on the device).</p>
    <button class="btn wide" data-action="export-data">⬇️ Export backup</button>
    <button class="btn wide" data-action="import-data">⬆️ Import backup</button>
    <input type="file" id="import-input" accept="application/json" class="hidden-input">
    <h3>Danger zone</h3>
    <button class="btn danger ghost wide" data-action="wipe-data">Erase all data</button>
  `);
}

function openAddServiceSheet() {
  openSheet(`
    <h2>New service item</h2>
    <label class="field">Name
      <input type="text" id="ns-name" placeholder="e.g. Generator oil change" maxlength="60">
    </label>
    <label class="field">Group
      <select id="ns-group">${SERVICE_GROUPS.map(g => `<option value="${g.id}">${g.icon} ${esc(g.name)}</option>`).join("")}</select>
    </label>
    <label class="field">Interval — engine hours (blank = none)
      <input type="number" id="ns-hours" inputmode="numeric" placeholder="e.g. 200">
    </label>
    <label class="field">Interval — months (blank = none)
      <input type="number" id="ns-months" inputmode="numeric" placeholder="e.g. 12">
    </label>
    <label class="field">Notes
      <textarea id="ns-why" rows="2" placeholder="Why / how"></textarea>
    </label>
    <button class="btn primary wide" data-action="save-service">Add item</button>
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
      addLog("season", toWater ? "Launched — in the water 🌊" : "Hauled out — on land 🛠️", "");
      saveState(); render();
      setTimeout(() => {
        if (confirm(toWater
          ? "She's in the water! Open the spring launch checklist?"
          : "Hauled out. Open the haul-out & winterization checklist?")) go("lists", "checklist", list);
      }, 100);
      break;
    }

    case "edit-hours": openHoursSheet(); break;
    case "save-hours": {
      const v = Number($("#hrs").value);
      if (!isFinite(v) || v < 0) { alert("Enter a valid number."); break; }
      if (state.settings.hours != null && v < state.settings.hours &&
          !confirm(`That's lower than the current ${state.settings.hours} h. Save anyway?`)) break;
      state.settings.hours = v;
      state.settings.hoursDate = todayISO();
      addLog("hours", "Engine hours updated", v + " h");
      saveState(); closeSheet(); render();
      break;
    }

    case "goto-service": go("service"); break;
    case "open-service": openServiceSheet(id); break;
    case "mark-done-form": openMarkDoneSheet(id); break;
    case "save-done": saveDone(id); break;
    case "delete-service": {
      if (!confirm("Delete this service item and its history?")) break;
      state.customServices = state.customServices.filter(s => s.id !== id);
      delete state.serviceLog[id];
      saveState(); closeSheet(); render();
      break;
    }
    case "add-service": openAddServiceSheet(); break;
    case "save-service": {
      const name = $("#ns-name").value.trim();
      if (!name) { alert("Give it a name."); break; }
      const h = Number($("#ns-hours").value) || null;
      const m = Number($("#ns-months").value) || null;
      state.customServices.push({
        id: uid(), custom: true, name, group: $("#ns-group").value,
        intervalHours: h, intervalMonths: m, why: $("#ns-why").value.trim(),
      });
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
      addLog("checklist", l.name + " completed", `${total} items`);
      saveState();
      alert("Logged! ✓ The checklist has been reset for next time.");
      go("lists");
      break;
    }
    case "reset-list": {
      if (!confirm("Uncheck everything?")) break;
      (state.checklists[id] = state.checklists[id] || {}).checked = {};
      saveState(); render();
      break;
    }

    case "toggle-todo": case "toggle-todo-sheet": {
      const t = state.todos.find(x => x.id === id);
      if (!t) break;
      t.done = !t.done;
      t.doneAt = t.done ? Date.now() : null;
      if (t.done) addLog("todo", "Todo done: " + t.title, "");
      saveState();
      if (a === "toggle-todo-sheet") closeSheet();
      render();
      break;
    }
    case "open-todo": openTodoSheet(id); break;
    case "delete-todo": {
      if (!confirm("Delete this todo?")) break;
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
      if (!confirm("Delete this log entry?")) break;
      const en = state.log.find(x => x.id === id);
      (en?.photos || []).forEach(p => deletePhoto(p));
      state.log = state.log.filter(x => x.id !== id);
      saveState(); closeSheet(); render();
      break;
    }

    case "add-note": openNoteSheet(); break;
    case "save-note": {
      const txt = $("#note-text").value.trim();
      if (!txt && pendingPhotos.length === 0) { alert("Write something or add a photo."); break; }
      addLog("note", txt || "Photo", "", pendingPhotos.slice());
      pendingPhotos = [];
      saveState(); closeSheet(false); render();
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
      if (!viewerInfo || !confirm("Delete this photo?")) break;
      const { id: pid } = viewerInfo;
      // remove from any owner that contains it
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
          if (!data || data.v !== 1) throw new Error("Not a valid backup file");
          if (!confirm("Replace all current data with this backup?")) return;
          state = Object.assign(structuredClone(DEFAULT_STATE), data);
          saveState(); closeSheet(); render();
        }).catch(err => alert("Import failed: " + err.message));
      };
      input.click();
      break;
    }
    case "wipe-data": {
      if (!confirm("Erase ALL data? This cannot be undone.")) break;
      if (!confirm("Really sure? Service history, todos and photos will be gone.")) break;
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
    if (count) count.textContent = `${done} of ${total}`;
    if (btn) {
      btn.classList.toggle("disabled", done < total);
      btn.textContent = done < total ? `Check all ${total} items to complete` : "✓ Log as completed";
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

/* ---------- go ---------- */
render();
