// Language support: English and Spanish.
//  * Scripture is never machine-translated. English quotations come from the World English Bible; the Spanish
//    ones are taken verbatim from the Reina-Valera (1909, public domain) by reference (see i18n/es-quotes.js).
//  * Everything else (interface, narration, objectives) is looked up in i18n/es.js by its English text.
import { RV } from './i18n/es-scripture.js';
import { QUOTES } from './i18n/es-quotes.js';
import { ES, ES_BOOKS, ES_CITIES, ES_REGIONS } from './i18n/es.js';

export const I = { lang: 'en', miss: new Set() };
const KEY = 'paul.lang';
export const TITLE_VERSE = ['he is my chosen vessel to bear my name before the nations and kings, and the children of Israel', 'Acts 9:15'];

export function initialLang() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s === 'en' || s === 'es') return s; } catch (_) { /* storage unavailable */ }
  const n = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^es\b/i.test(n) ? 'es' : 'en';
}
export function setLang(l) { I.lang = l; try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (_) { /* ignore */ } document.documentElement.lang = l; }
export const isEs = () => I.lang === 'es';

const BOOK_RE = new RegExp('\\b(' + Object.keys(ES_BOOKS).map(b => b.replace(/ /g, '\\s')).join('|') + ')(?= \\d)', 'g');
export const refLabel = (s) => (isEs() && s ? s.replace(BOOK_RE, (m) => ES_BOOKS[m.replace(/\s+/g, ' ')] || m) : s);
export const version = () => (isEs() ? 'RV 1909' : 'WEB');
export const versionName = () => (isEs() ? 'Reina-Valera (1909)' : 'World English Bible');

// plain interface / narration text
export function t(s) {
  if (!isEs() || !s) return s;
  let v = ES[s]; if (v === undefined) v = ES[s.trim()];
  if (v !== undefined) return refLabel(v);
  const nums = [], k = s.replace(/\d+/g, (d) => (nums.push(d), '#'));
  if (nums.length && ES[k] !== undefined) { let i = 0; return refLabel(ES[k].replace(/#/g, () => nums[i++])); }
  if (/[A-Za-z]{3}/.test(s)) I.miss.add(s);
  return refLabel(s);
}
const _verses = (ref) => {
  const m = ref.match(/^((?:\d )?[A-Za-z]+) (\d+):(\d+)(?:-(\d+))?$/); if (!m) return null;
  const out = []; for (let v = +m[3]; v <= +(m[4] || m[3]); v++) { const x = RV[`${m[1]} ${m[2]}:${v}`]; if (x === undefined) return null; out.push(x); }
  return out.join(' ');
};
// Scripture: English text + reference -> the text to show in the current language
export function sc(text, ref) {
  if (!isEs() || !ref) return text;
  const key = ref + '|' + text.replace(/^[“"]|[”"]$/g, '').trim(), q = QUOTES[key];
  if (q !== undefined && q !== '@full') return q;
  const full = _verses(ref);
  if (full === null) { I.miss.add(key); return text; }
  return full;
}
// "…text… — Acts 9:8" notes
export function tNote(s) {
  if (!isEs() || !s) return s;
  const m = s.match(/^(…)?(.+?)([.…]*) — ((?:\d )?[A-Z][a-z]+ \d+:\d+(?:-\d+)?)$/);
  if (!m) { const v = t(s); return v; }
  return `${m[1] || ''}${sc(m[2], m[4])}${m[3].includes('…') ? '…' : m[3] ? '.' : ''} — ${refLabel(m[4])}`;
}
// card bodies: prose paragraphs mixed with q() tokens
const TOK = /⟦([^␟]*)␟([^⟧]*)⟧/g;
export function tBody(s) {
  let out = '', last = 0, m; TOK.lastIndex = 0;
  const prose = (chunk) => chunk.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, a, core, b) => a + core.split('\n\n').map(p => t(p)).join('\n\n') + b);
  while ((m = TOK.exec(s))) { out += prose(s.slice(last, m.index)); out += `<q>${sc(m[2], m[1])}</q> <em>${refLabel(m[1])}</em>`; last = m.index + m[0].length; }
  return out + prose(s.slice(last));
}
export const cityName = (n) => (isEs() ? ES_CITIES[n] || n : n);
export const regionName = (n) => (isEs() ? ES_REGIONS[n] || n : n);

// static HTML: elements marked data-i18n keep their English markup in data-en
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { if (el.dataset.en === undefined) el.dataset.en = el.innerHTML; el.innerHTML = isEs() ? (ES[el.dataset.en.trim()] ?? (I.miss.add(el.dataset.en.trim()), el.dataset.en)) : el.dataset.en; });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { if (el.dataset.enAria === undefined) el.dataset.enAria = el.getAttribute('aria-label'); el.setAttribute('aria-label', isEs() ? ES[el.dataset.enAria] || el.dataset.enAria : el.dataset.enAria); });
  const v = document.getElementById('verseText'); if (v) { v.textContent = '“…' + sc(TITLE_VERSE[0], TITLE_VERSE[1]) + '…”'; document.getElementById('verseRef').textContent = refLabel(TITLE_VERSE[1]); }
  document.title = isEs() ? 'Hasta los confines de la tierra — Los viajes de Pablo' : 'To the Ends of the Earth — The Journeys of Paul';
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === I.lang));
}
if (typeof window !== 'undefined') window.__i18n = I;
