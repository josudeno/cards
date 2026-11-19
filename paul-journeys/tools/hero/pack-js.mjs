// Writes assets/paul-glb.js and assets/animals-glb.js (the models as base64 JavaScript modules) for hosts that will not serve .glb files.
// usage: node tools/hero/pack-js.mjs [outDir]   (writes paul-glb.js and animals-glb.js)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = process.argv[2] || join(root, 'assets');
for (const n of ['paul', 'animals']) {
  const out = join(outDir, `${n}-glb.js`);
  writeFileSync(out, `// assets/${n}.glb packed as base64 (Microsoft Rocketbox, MIT — see CREDITS.md). Generated; do not edit.\nexport default "${readFileSync(join(root, `assets/${n}.glb`)).toString('base64')}";\n`);
  console.log('wrote', out);
}
