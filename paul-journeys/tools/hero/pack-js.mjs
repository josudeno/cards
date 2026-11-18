// Writes assets/paul-glb.js (the model as a base64 JavaScript module) for hosts that will not serve .glb files.
// usage: node tools/hero/pack-js.mjs [out.js]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = process.argv[2] || join(root, 'assets/paul-glb.js');
writeFileSync(out, `// assets/paul.glb packed as base64 (Microsoft Rocketbox, MIT — see CREDITS.md). Generated; do not edit.\nexport default "${readFileSync(join(root, 'assets/paul.glb')).toString('base64')}";\n`);
console.log('wrote', out);
