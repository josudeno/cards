const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 500)));
  await p.goto('http://localhost:8790/build.html'); await p.waitForFunction('window.__ready', null, { timeout: 180000 });
  const info = await p.evaluate('window.__info'); console.log(JSON.stringify({ ...info, bones: (info.bones || []).length, boneNames: (info.bones || []).slice(0, 81).join(',') }).slice(0, 4000));
  if (!info.err) fs.writeFileSync(process.argv[2], Buffer.from(await p.evaluate('window.__glb')));
  await b.close();
})();
