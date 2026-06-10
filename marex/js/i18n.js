/* i18n scaffolding. Each content-<lang>.js file fills in:
   CONTENT[lang]  — services, checklists, guide (same ids across languages,
                    so saved state survives a language switch untouched)
   STRINGS[lang]  — UI strings
   ILLUS_STRINGS[lang] — labels inside the guide diagrams */

const CONTENT = {};
const STRINGS = {};
const ILLUS_STRINGS = {};

let LANG = "da";
let SERVICE_GROUPS, SERVICES, CHECKLISTS, GUIDE, STR, ISTR;

function applyLang(lang) {
  LANG = CONTENT[lang] ? lang : "en";
  const c = CONTENT[LANG];
  SERVICE_GROUPS = c.groups;
  SERVICES = c.services;
  CHECKLISTS = c.checklists;
  GUIDE = c.guide;
  STR = STRINGS[LANG];
  ISTR = ILLUS_STRINGS[LANG];
}

/* T("days_overdue", {n: 4}) — string template lookup */
function T(key, vars) {
  let s = STR[key];
  if (s == null) { console.warn("missing string", key); return key; }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll("{" + k + "}", v);
  return s;
}
