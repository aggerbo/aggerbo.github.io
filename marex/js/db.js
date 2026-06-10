/* Storage: app state in localStorage, photos as blobs in IndexedDB. */

const STORE_KEY = "marex370.v1";

// structuredClone needs iOS 15.4+; state is JSON-safe so this fallback is equivalent
if (typeof structuredClone !== "function") {
  window.structuredClone = o => JSON.parse(JSON.stringify(o));
}

const DEFAULT_STATE = {
  v: 1,
  settings: {
    boatName: "Marex 370 ACC",
    engine: "Volvo Penta D6-435",
    hours: null,          // current engine hours
    hoursDate: null,      // ISO date hours were last updated
    season: "water",      // "water" | "land"
  },
  serviceLog: {},         // serviceId -> [{ts, date, hours, note, photos:[]}], newest first
  customServices: [],     // user-added service items
  checklists: {},         // listId -> { checked: {sectionIdx.itemId: true}, completions: [{ts}] }
  todos: [],              // {id, title, note, created, due, done, doneAt, photos:[]}
  log: [],                // {id, ts, type, title, detail, photos:[]}, newest first
  guidePhotos: {},        // guideId -> [photoId]
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const s = JSON.parse(raw);
    // merge so new fields appear after app updates
    return Object.assign(structuredClone(DEFAULT_STATE), s, {
      settings: Object.assign(structuredClone(DEFAULT_STATE.settings), s.settings || {}),
    });
  } catch (e) {
    console.error("loadState failed", e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    alert("Could not save data (storage full?). Export a backup from Settings.");
  }
}

/* ---------- IndexedDB photo store ---------- */

let _dbPromise = null;
function photoDB() {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("marex370-photos", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return _dbPromise;
}

async function savePhoto(blob) {
  const id = "p" + Date.now() + Math.random().toString(36).slice(2, 7);
  const db = await photoDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put({ id, blob, ts: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

async function getPhoto(id) {
  const db = await photoDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("photos").objectStore("photos").get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
    req.onerror = () => reject(req.error);
  });
}

async function deletePhoto(id) {
  const db = await photoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* Downscale a camera image so storage stays sane (max 1600px, JPEG). */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      let { width: w, height: h } = img;
      if (w > max || h > max) {
        const k = max / Math.max(w, h);
        w = Math.round(w * k); h = Math.round(h * k);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

async function addPhotoFromFile(file) {
  const blob = await compressImage(file).catch(() => file); // fall back to original
  return savePhoto(blob);
}

/* Object-URL cache for rendering thumbnails. */
const _urlCache = new Map();
async function photoURL(id) {
  if (_urlCache.has(id)) return _urlCache.get(id);
  const blob = await getPhoto(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  _urlCache.set(id, url);
  return url;
}
