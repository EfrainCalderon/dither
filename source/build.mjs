// Builds ../index.html: one self-contained file (three.js, the app, and two small fonts inlined).
// Run from this folder:  npm install  &&  npm run build
import * as esbuild from 'esbuild';
import fs from 'fs';
const vendor = await esbuild.build({ entryPoints: ['vendor.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' });
const v = vendor.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const LAB = process.argv.includes('--lab');      // npm run lab: the app plus the fish lab panel, written next to the repo (never deployed)
const app = (fs.readFileSync('app.js', 'utf8') + (LAB ? '\n' + fs.readFileSync('fish-lab.js', 'utf8') : '')).replace(/<\/script/gi, '<\\/script');
const b64 = (f) => fs.readFileSync(f).toString('base64');
const fonts = [
  `@font-face { font-family: 'Geist Mono'; font-weight: 500; font-display: block; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2')}) format('woff2'); }`,
  `@font-face { font-family: 'Geist Mono'; font-weight: 700; font-display: block; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff2')}) format('woff2'); }`,
  `@font-face { font-family: 'Doto'; font-weight: 100 900; font-display: block; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/doto/files/doto-latin-full-normal.woff2')}) format('woff2-variations'); }`,
].join('\n  ');
const out = fs.readFileSync('template.html', 'utf8').replace('/*__FONTS__*/', () => fonts).replace('/*__VENDOR__*/', () => v).replace('/*__APP__*/', () => app);
const dest = LAB ? '../../dither-fish-lab.html' : '../index.html';
fs.writeFileSync(dest, LAB ? out.replace(/<title>[^<]*<\/title>/, '<title>Dither fish lab</title>') : out);
console.log('built', dest, (out.length / 1024).toFixed(0) + 'KB');
