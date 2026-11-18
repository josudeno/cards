# Rebuilding `assets/paul.glb`

1. Clone https://github.com/microsoft/Microsoft-Rocketbox and copy into a work folder:
   - `assets/Male_Adult_21.fbx` and the avatar's `Textures/*.tga`, converted to 1024 px JPEG (`m251_*.jpg`);
   - `anims/<clip>.max.fbx` for the clips listed in `build.html` (walk/run come from `all_animations_max_motextr_xy`, the rest from `all_animations_max_motextr_static`);
   - three.js r170 as `three/` (`three.module.js` plus `addons/` FBXLoader, GLTFExporter and their dependencies).
2. `python3 retex.py <folder with m251_*.jpg> <work>/paul` — repaints the robe, footwear and head-cloth.
3. Serve the work folder on port 8790 and run `node build.cjs paul.glb` (uses Playwright's Chromium).

For hosts that will not serve `.glb` files, run `node tools/hero/pack-js.mjs` to write `assets/paul-glb.js` (git-ignored); the game loads it automatically when `paul.glb` is unavailable.
