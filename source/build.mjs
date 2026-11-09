// Builds ../index.html: one self-contained file (three.js, the app, and the fonts inlined).
// Run from this folder:  npm install  &&  npm run build
import * as esbuild from 'esbuild';
import fs from 'fs';
const vendor = await esbuild.build({ entryPoints: ['vendor.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' });
const v = vendor.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const LAB = process.argv.includes('--lab');      // npm run lab: the app plus the fish lab panel, written next to the repo (never deployed)
const app = (fs.readFileSync('app.js', 'utf8') + (LAB ? '\n' + fs.readFileSync('fish-lab.js', 'utf8') : '')).replace(/<\/script/gi, '<\\/script');
// the pixel typeface for the timer, buttons and about card. Pick it here; everything else refers to it as 'Pixel'.
//   npm run build                 → Jersey 25 (the site)
//   node build.mjs --font=vt323   → VT323, written next to the repo as a comparison (never deployed)
const PIXELS = {
  vt323:  { file: 'node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff2' },
  jersey: { file: 'node_modules/@fontsource/jersey-25/files/jersey-25-latin-400-normal.woff2' },
};
const FONT = (process.argv.find((a) => a.startsWith('--font=')) || '--font=jersey').slice(7);
const PIXEL = PIXELS[FONT];
const b64 = (f) => fs.readFileSync(f).toString('base64');
const fonts = [
  `@font-face { font-family: 'Geist Mono'; font-weight: 500; font-display: block; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2')}) format('woff2'); }`,
  `@font-face { font-family: 'Geist Mono'; font-weight: 700; font-display: block; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff2')}) format('woff2'); }`,
  `@font-face { font-family: 'Pixel'; font-weight: 400; font-display: block; src: url(data:font/woff2;base64,${b64(PIXEL.file)}) format('woff2'); }`,
  `@font-face { font-family: 'Doto'; font-weight: 100 900; font-display: block; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/doto/files/doto-latin-full-normal.woff2')}) format('woff2-variations'); }`,
].join('\n  ');
const out = fs.readFileSync('template.html', 'utf8').replace('/*__FONTS__*/', () => fonts).replace('/*__VENDOR__*/', () => v).replace('/*__APP__*/', () => app);
const dest = LAB ? '../../dither-fish-lab.html' : FONT !== 'jersey' ? `../../dither-font-${FONT}.html` : '../index.html';
fs.writeFileSync(dest, LAB ? out.replace(/<title>[^<]*<\/title>/, '<title>Dither fish lab</title>') : out);
console.log('built', dest, (out.length / 1024).toFixed(0) + 'KB');
