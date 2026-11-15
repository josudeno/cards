// Checks that every line the game presents as Scripture is a verbatim excerpt of the
// World English Bible at the reference shown beside it.   npm install && npm run verify
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const webDir = join(dirname(require.resolve('world-english-bible/package.json')), 'json');
const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s+([”’])/g, '$1').trim();
const books = {};
function book(name) {
  const key = name.toLowerCase().replace(/\s+/g, '');
  if (!books[key]) { const m = {}; for (const x of JSON.parse(readFileSync(join(webDir, key + '.json'), 'utf8'))) { if (x.value == null || !x.chapterNumber) continue; const k = x.chapterNumber + ':' + x.verseNumber; m[k] = (m[k] || '') + x.value; } books[key] = m; }
  return books[key];
}
function passage(ref) {
  const m = ref.match(/^((?:\d )?[A-Za-z]+) (\d+):(\d+)(?:-(\d+))?$/); if (!m) throw new Error('unparsable reference: ' + ref);
  const b = book(m[1]), out = []; for (let v = +m[3]; v <= +(m[4] || m[3]); v++) { const t = b[m[2] + ':' + v]; if (!t) throw new Error('no such verse: ' + ref); out.push(t); }
  return norm(out.join(' '));
}
const found = [];
for (const f of readdirSync(join(here, '../js')).filter(f => /^(chapters|game|tasks|i18n\.js)/.test(f)).concat('../index.html')) {
  const src = readFileSync(join(here, '../js', f), 'utf8'); let m;
  const S = `'((?:[^'\\\\]|\\\\.)*)'`;
  for (const re of [new RegExp(`\\[\\s*${S},\\s*${S},\\s*${S}\\s*\\]`, 'g'), new RegExp(`G\\.bark\\(${S},\\s*${S},\\s*${S}`, 'g')]) while ((m = re.exec(src))) found.push({ f, text: m[2], ref: m[3] });
  const re2 = new RegExp(`\\[${S},\\s*${S}\\]`, 'g'); while ((m = re2.exec(src))) found.push({ f, text: m[1], ref: m[2] });
  const reN = /'…?([^'…]+?)[.…]* — ((?:\d )?[A-Z][a-z]+ \d+:\d+(?:-\d+)?)'/g; while ((m = reN.exec(src))) found.push({ f, text: m[1], ref: m[2] });
  const reQ = new RegExp(`\\bq\\(${S},\\s*${S}\\)`, 'g'); while ((m = reQ.exec(src))) found.push({ f, text: m[1], ref: m[2] });
  const reL = new RegExp(`ref:\\s*${S},\\s*from:\\s*${S},\\s*text:\\s*${S}`, 'g'); while ((m = reL.exec(src))) found.push({ f, text: m[3], ref: m[1] });
  const reH = /<q>([^<]+)<\/q>[^<]*(?:<span>|ref: ')([^<']+)/g; while ((m = reH.exec(src))) found.push({ f, text: m[1].replace(/^…|…$/g, ''), ref: m[2] });
}
let bad = 0;
const quotes = found.filter(x => /^(\d )?[A-Z][a-z]+ \d+:\d+/.test(x.ref));
for (const { f, text, ref } of quotes) {
  let ok = false, why = '';
  try { ok = passage(ref).includes(norm(text)); if (!ok) why = '\n    WEB: ' + passage(ref); } catch (e) { why = ' (' + e.message + ')'; }
  if (!ok) { bad++; console.log(`✗ ${f} — ${ref}\n    game: ${text}${why}`); }
}
console.log(`${quotes.length - bad}/${quotes.length} Scripture quotations match the World English Bible verbatim.`);

// ---- Spanish: every excerpt must be a verbatim part of the Reina-Valera (1909) verse(s) it cites,
// and every English quotation that cites only part of a verse must have an excerpt.
const { RV } = await import('../js/i18n/es-scripture.js');
const { QUOTES } = await import('../js/i18n/es-quotes.js');
const low = (x) => norm(x).toLowerCase();
const rvText = (ref) => { const m = ref.match(/^((?:\d )?[A-Za-z]+) (\d+):(\d+)(?:-(\d+))?$/); const o = []; for (let v = +m[3]; v <= +(m[4] || m[3]); v++) { const t = RV[`${m[1]} ${m[2]}:${v}`]; if (t === undefined) throw new Error('verse missing in es-scripture.js: ' + ref); o.push(t); } return low(o.join(' ')); };
let esBad = 0;
for (const [key, es] of Object.entries(QUOTES)) {
  const ref = key.slice(0, key.indexOf('|'));
  try { const full = rvText(ref); if (es !== '@full') for (const seg of es.split(' … ')) if (!full.includes(low(seg))) { esBad++; console.log(`✗ ES ${ref}: not in Reina-Valera 1909: ${seg}`); } } catch (e) { esBad++; console.log('✗ ES', key, e.message); }
}
let esMissing = 0;
for (const { ref, text } of quotes) {
  const k = ref + '|' + text.replace(/^“|”$/g, '').trim(); if (QUOTES[k] !== undefined) continue;
  try { const en = passage(ref); if (en !== norm(text.replace(/^“|”$/g, ''))) { esMissing++; console.log(`✗ ES excerpt missing for partial quotation: ${ref} — ${text.slice(0, 60)}`); } } catch (_) { /* reported above */ }
}
console.log(`${Object.keys(QUOTES).length - esBad}/${Object.keys(QUOTES).length} Spanish excerpts match the Reina-Valera (1909); ${esMissing} partial quotations lack a Spanish excerpt.`);
process.exit(bad || esBad || esMissing ? 1 : 0);
