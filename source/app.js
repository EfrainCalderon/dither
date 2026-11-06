/*
  Dither 1.3.4
  ------------------------------------------------------------
  A pomodoro timer that lives in a small halftone aquarium.
  - Each finished 25-minute focus session adds one koi (they reset at midnight)
    and moves the tank one "pom" further along: moss creeps, carpet fills in, stems
    reach out of the water, water slowly evaporates. "rescape" plants a fresh tank.
  - The sky behind follows the real sun and moon for your area.

  Rendering, in plain terms:
  1. three.js draws the 3D scene into a tiny image: one pixel per halftone dot.
     Each pixel stores brightness, material, how deep underwater it is, and line direction.
  2. A second pass draws the screen: one dot (or character) per cell, colored by material.
*/
(function () {
  'use strict';
  const T = window.THREE;

  // ================================================================ config
  const TANK = { w: 90, h: 26, d: 40 };            // long, low and shallow
  const MAX_POMS = 10;
  const FOCUS_MIN = 25, REST_MIN = 5;
  const STORE_KEY = 'dither.v15';
  const APP = 'Dither';
  const FONT_MONO = '"Menlo", "SF Mono", "DejaVu Sans Mono", "Consolas", monospace';
  const FONT_UI = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

  const M = {
    none: 0, water: 1, surface: 2, substrate: 3, sand: 4, rock: 5, wood: 6, moss: 7,
    stem: 8, stemRed: 9, grass: 10, bubble: 11, glass: 13, leaf: 14, mote: 15, crypt: 17, waterline: 18,
    shell: 22, sanddollar: 23, brass: 24, ipod: 25, ipodWheel: 26, ipodScreen: 27, duck: 28, beak: 29,
    beadA: 30, beadB: 31, ticket: 32, usb: 33, usbMetal: 34, pebble: 35, cowrie: 36,
    fishOrange: 40, fishRed: 41, fishWhite: 42, fishBlack: 43, fishGold: 44, fishBlue: 45, fishBronze: 46,
    base: 47, glow: 48, digit: 49, diverSuit: 50, glassDark: 51, paper: 52, shellPink: 53, floppy: 54,
    masonBrass: 55, cdFace: 56, cdInk: 57, cdA: 58, cdB: 59, cdC: 60, drop: 61, haze: 62, shade: 63,
  };
  const ROWS = 64;

  // [glyph ramp, direction glyphs, palette (dark -> bright), ascii cell fill, 1 = glyph in hybrid / 2 = dot in hybrid]
  const MATS = {
    [M.water]:      [' ..,,::;;=', '',      ['#0b2229', '#0f3540', '#17525c', '#2a7a80'], 0, 0],
    [M.surface]:    [' .-~~~~==*', '',      ['#2c7f86', '#4fb3b2', '#8fe0d6', '#d6fff6'], 0, 0],
    [M.substrate]:  [' ..,,::;;=', '',      ['#1f1712', '#3a2b20', '#5c4430', '#816146'], 0.55, 0],
    [M.sand]:       [' ..,,:;;-=', '',      ['#4a4236', '#776a55', '#a8977a', '#d8c9a6'], 0.5, 0],
    [M.rock]:       [' .:-=+*#%@', '',      ['#2e333b', '#566070', '#8c97a8', '#ccd6e2'], 0.65, 0],
    [M.wood]:       [' .:;=+%#&@', '=/|\\', ['#2b1f17', '#5c4433', '#94704f', '#d4ae86'], 0.6, 0],
    [M.moss]:       [' .,,\'\';;**', '',     ['#1a3312', '#356a1f', '#62a336', '#aae35f'], 0.35, 0],
    [M.stem]:       [' .,:;!|lI|', '~/|\\', ['#143826', '#2a7342', '#4fb252', '#a0e870'], 0.22, 0],
    [M.stemRed]:    [' .,:;!|lI|', '~/|\\', ['#3c1520', '#8a2c3a', '#d9584a', '#ffa47c'], 0.22, 0],
    [M.grass]:      [' .,;:!|ll|', '-/|\\', ['#183f26', '#2f7e3d', '#5fc052', '#b8f47e'], 0.25, 2],
    [M.bubble]:     [' ..°°ooOOO', '',      ['#3d8d92', '#7fd6cf', '#c9fff4', '#ffffff'], 0, 0],
    [M.glass]:      [' .:|||||||', '-/|\\', ['#4a6670', '#6d8f99', '#9cc0c8', '#d2eef2'], 0, 0],
    [M.leaf]:       [' .,:;oO0@#', '',      ['#14301c', '#245a2f', '#3f8a45', '#86c770'], 0.3, 0],
    [M.mote]:       [' ..\'\'··:*+', '',     ['#2d5a5e', '#4f8a88', '#8cc2b8', '#d0efe4'], 0, 0],
    [M.crypt]:      [' .,~(oO0@#', '~/)\\', ['#20331b', '#456530', '#789a44', '#c0d474'], 0.3, 0],
    [M.waterline]:  ['~~~~~~~~~~', '',      ['#4fb3b2', '#8fe0d6', '#c4f5ee', '#effffb'], 0, 1],
    [M.shell]:      [' .:-=+*%@#', '',      ['#5a4a42', '#a08478', '#e0b8a8', '#fff0e6'], 0.5, 0],
    [M.sanddollar]: [' .:;=+*#%@', '',      ['#6a6252', '#a89c84', '#d8ccb0', '#fff8e6'], 0.5, 0],
    [M.brass]:      [' .:-=+*#%@', '',      ['#4a3410', '#8a6420', '#d0a040', '#ffe090'], 0.5, 0],
    [M.ipod]:       [' .:-=+*#%@', '',      ['#7a7a7a', '#bdbdbd', '#e6e6e6', '#ffffff'], 0.55, 0],
    [M.ipodWheel]:  [' .:-=oO0@@', '',      ['#4a4a4a', '#7a7a7a', '#adadad', '#dadada'], 0.5, 0],
    [M.ipodScreen]: [' .:-=====#', '',      ['#1e2a22', '#3a4a3e', '#6a7a68', '#9fb09a'], 0.6, 0],
    [M.duck]:       [' .:-=+*o0@', '',      ['#7a5a00', '#c89a10', '#ffd23a', '#fff3a0'], 0.5, 0],
    [M.beak]:       [' .:-=+*>>>', '',      ['#7a3000', '#c85a10', '#ff8a2a', '#ffc080'], 0.5, 0],
    [M.beadA]:      [' .ooooOOO0', '',      ['#103a4a', '#1a6a8a', '#3aa8c8', '#9ae8ff'], 0.4, 0],
    [M.beadB]:      [' .ooooOOO0', '',      ['#5a1a30', '#a03050', '#e0607a', '#ffb0c0'], 0.4, 0],
    [M.ticket]:     [' .:-=+*#%@', '',      ['#861a46', '#d2306c', '#ff5f92', '#ff9abb'], 0.5, 0],     // (slot reused) the brain
    [M.usb]:        [' .:-=+*#%@', '',      ['#101a3a', '#203a7a', '#3a6ad0', '#9ab8ff'], 0.55, 0],
    [M.usbMetal]:   [' .:-=+*#%@', '',      ['#4a4a50', '#80808a', '#b8b8c4', '#f0f0f8'], 0.5, 0],
    [M.pebble]:     [' .:-=+*#%@', '',      ['#2a2a30', '#4a4a58', '#7a7a8a', '#b0b0c0'], 0.55, 0],
    [M.cowrie]:     [' .:-=+*o0@', '',      ['#3a2a1a', '#7a5a3a', '#c09a6a', '#f4dcb8'], 0.5, 0],
    [M.fishOrange]: [' .:=+*o0@#', '',      ['#5a2008', '#b84a12', '#f47a28', '#ffb26a'], 0.45, 0],
    [M.fishRed]:    [' .:=+*o0@#', '',      ['#4a0c0c', '#9a1c1c', '#e0402e', '#ff8a6a'], 0.45, 0],
    [M.fishWhite]:  [' .:=+*o0@#', '',      ['#6a6a66', '#b4b4ae', '#ebe9e1', '#ffffff'], 0.45, 0],
    [M.fishBlack]:  [' .:=+*o0@#', '',      ['#0c0c10', '#22222a', '#3c3c48', '#62626e'], 0.45, 0],
    [M.fishGold]:   [' .:=+*o0@#', '',      ['#5a4208', '#a8800e', '#efc02a', '#fff09a'], 0.45, 0],
    [M.fishBlue]:   [' .:=+*o0@#', '',      ['#1e2a3a', '#3e5470', '#7a92ae', '#bccde0'], 0.45, 0],
    [M.fishBronze]: [' .:=+*o0@#', '',      ['#3a2410', '#6e4824', '#a87a48', '#dcb488'], 0.45, 0],
    [M.base]:       [' .-_====##', '',      ['#6f7276', '#a2a5a9', '#d0d2d2', '#f4f4ef'], 0.5, 0],
    [M.glow]:       [' ..::--==#', '',      ['#3a3c44', '#7a7c84', '#d4d0c4', '#fffaf0'], 0, 0],
    [M.digit]:      [' .:-=+*#%@', '',      ['#7cc4bc', '#bfeae2', '#effbf6', '#ffffff'], 0, 0],
    [M.diverSuit]:  [' .:-=+*#%@', '',      ['#262b27', '#4b5449', '#7c8778', '#b6c0b0'], 0.5, 0],
    [M.glassDark]:  [' .:-=+*#%@', '',      ['#081214', '#14262a', '#2a484e', '#5d8b93'], 0.5, 0],
    [M.paper]:      [' .:-=+*#%@', '',      ['#77776f', '#b8b8ae', '#e9e8df', '#ffffff'], 0.5, 0],
    [M.shellPink]:  [' .:-=+*#%@', '',      ['#6a3836', '#b26a62', '#ee9e90', '#ffd6cb'], 0.5, 0],
    [M.floppy]:     [' .:-=+*#%@', '',      ['#3e0c22', '#7c2240', '#b23e62', '#de6a8a'], 0.5, 0],     // (slot reused) the brain's folds
    [M.masonBrass]: [' .:-=+*#%@', '',      ['#5a400e', '#a47c1c', '#ecbd3c', '#fff2b0'], 0.5, 0],
    [M.cdFace]:     [' .:-=+*#%@', '',      ['#7b8088', '#b8bdc6', '#e6e9ee', '#ffffff'], 0.5, 0],
    [M.cdInk]:      [' .:-=+*#%@', '',      ['#0e1a2e', '#1d3152', '#2c4a78', '#46689e'], 0.5, 0],
    [M.cdA]:        [' .:-=+*#%@', '',      ['#5a3a6a', '#9a6ab8', '#d2a2f2', '#f6e0ff'], 0.5, 0],
    [M.cdB]:        [' .:-=+*#%@', '',      ['#2a5a6a', '#4a9ab0', '#8ae0f0', '#dafbff'], 0.5, 0],
    [M.cdC]:        [' .:-=+*#%@', '',      ['#5a5a2a', '#9aa04a', '#d8e07a', '#f8ffd0'], 0.5, 0],
    [M.drop]:       [' .:-=+*#%@', '',      ['#174a63', '#2878a0', '#56b4d8', '#d6f6ff'], 0.5, 0],
  };

  const TONES = [
    { name: 'aqua soil',  soil: ['#1f1712', '#3a2b20', '#5c4430', '#816146'], sand: ['#4a4236', '#776a55', '#a8977a', '#d8c9a6'] },
    { name: 'white sand', soil: ['#26282a', '#474945', '#73726c', '#a6a39a'], sand: ['#5f5c55', '#9a958a', '#cfc9bb', '#f2ede0'] },
    { name: 'river gold', soil: ['#2a2015', '#4d3a24', '#7d6040', '#a88a5e'], sand: ['#5a4a32', '#8c7550', '#bba071', '#e2cc98'] },
    { name: 'volcanic',   soil: ['#1c1414', '#3a2422', '#5c3632', '#86504a'], sand: ['#3e3836', '#6a605a', '#998c82', '#c8bbb0'] },
  ];
  const LAYOUTS = ['island', 'bank', 'valley', 'flat'];
  const WOODS = ['fallen log', 'spiderwood', 'fallen log + spiderwood', 'none'];
  const SHAPES = { box: { n: 14, wob: 0 }, oval: { n: 2, wob: 0 } };
  const LOOKS = [
    { name: 'halftone', cw: 6, ch: 6 },
    { name: 'hybrid',   cw: 7, ch: 10 },
    { name: 'ascii',    cw: 7, ch: 12 },
  ];
  const DENSITY = 0.72;     // smallest dots
  const FPS = 24;

  // goldfish + koi varieties, roughly in proportion to how common they are. gold: a goldfish (left out when koi only)
  const FISH = [
    { name: 'comet',     w: 3,   gold: 1, base: M.fishOrange, body: [1.55, 0.7, 0.5], tail: 1.3, size: [0.8, 1.15], speed: 3.4 },
    { name: 'sarasa',    w: 2,   gold: 1, base: M.fishWhite, spot: M.fishRed, freq: 0.9, thr: 0.5, body: [1.55, 0.7, 0.5], tail: 1.3, size: [0.85, 1.15], speed: 3.3 },
    { name: 'shubunkin', w: 1.5, gold: 1, base: M.fishBlue, spot: M.fishOrange, spot2: M.fishBlack, freq: 2.6, thr: 0.6, body: [1.5, 0.72, 0.5], tail: 1.4, size: [0.8, 1.1], speed: 3.2 },
    { name: 'kohaku',    w: 2,   base: M.fishWhite, spot: M.fishRed, freq: 0.75, thr: 0.52, body: [2.0, 0.72, 0.6], tail: 0.9, size: [1.2, 1.65], speed: 2.4, fin: M.fishWhite },
    { name: 'sanke',     w: 1.4, base: M.fishWhite, spot: M.fishRed, spot2: M.fishBlack, freq: 0.75, thr: 0.52, freq2: 1.8, thr2: 0.68, body: [2.0, 0.72, 0.6], tail: 0.9, size: [1.2, 1.65], speed: 2.4, fin: M.fishWhite },
    { name: 'showa',     w: 1,   base: M.fishBlack, spot: M.fishRed, spot2: M.fishWhite, freq: 0.85, thr: 0.55, body: [2.0, 0.72, 0.6], tail: 0.9, size: [1.2, 1.6], speed: 2.3 },
    { name: 'tancho',    w: 0.8, base: M.fishWhite, cap: M.fishRed, body: [2.0, 0.72, 0.6], tail: 0.9, size: [1.2, 1.6], speed: 2.3, fin: M.fishWhite },
    { name: 'ogon',      w: 1,   base: M.fishGold, body: [2.0, 0.72, 0.6], tail: 0.9, size: [1.2, 1.6], speed: 2.4 },
    { name: 'asagi',     w: 0.7, base: M.fishBlue, belly: M.fishRed, body: [2.0, 0.72, 0.6], tail: 0.9, size: [1.2, 1.6], speed: 2.3 },
    { name: 'chagoi',    w: 0.6, base: M.fishBronze, body: [2.05, 0.75, 0.62], tail: 0.9, size: [1.3, 1.75], speed: 2.1 },
    { name: 'platinum',  w: 0.6, base: M.fishWhite, body: [2.0, 0.72, 0.6], tail: 0.9, size: [1.2, 1.6], speed: 2.3 },
  ];

  // found objects: one may turn up in a fresh tank. Tiers keep the funny ones rare.
  const FOUND = {
    common: ['sanddollar', 'cowrie', 'pebbles'],          // conch retired: too blobby at this dot size
    rare: ['duck', 'ipod', 'key', 'bracelet', 'usb', 'boat', 'cd'],   // ticket stub + floppy retired
    kitsch: ['diver', 'chest'],
    ultra: ['mason'],
  };
  const FOUND_NAMES = {
    conch: 'conch shell', sanddollar: 'sand dollar', cowrie: 'cowrie shell', pebbles: 'river pebbles',
    duck: 'rubber duck', ipod: 'first-gen iPod', key: 'brass key', bracelet: 'bead bracelet', ticket: 'ticket stub', usb: 'USB stick',
    floppy: 'floppy disk', boat: 'paper boat', cd: 'efrain.fm CD', diver: 'deep-sea diver', chest: 'treasure chest', mason: 'square and compasses',
  };
  const FLOAT_DRAFT = { duck: 0.35, boat: 0.4 };          // how deep each floater sits
  const UPRIGHT_LEAN = { floppy: -0.36, mason: -0.1, diver: 0, chest: 0, cd: -0.32 };
  const ITEM_SCALE = { conch: 1.35, diver: 1.5, chest: 1.5, floppy: 1.35, boat: 1.5, mason: 1.6, cd: 1.45 };
  const ITEM_HEIGHT = { diver: 8, mason: 6.4, floppy: 4.7, chest: 4.4, conch: 4.5, cd: 4.6 };   // local height, to keep things underwater

  // ================================================================ state + persistence
  const today = () => new Date().toDateString();
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || localStorage.getItem('dither.v13') || localStorage.getItem('dither.v12') || localStorage.getItem('dither.v11') || localStorage.getItem('dither.v09') || localStorage.getItem('dither.v08') || localStorage.getItem('dither.v07') || localStorage.getItem('shoal.v06') || localStorage.getItem('shoal.v05') || localStorage.getItem('shoal.v04') || localStorage.getItem('shoal.v03') || 'null'); } catch (e) { return null; } })() || {};
  const state = {
    seed: saved.seed || '',
    shape: SHAPES[saved.shape] ? saved.shape : 'box',
    look: 0,                 // halftone, full density
    digitsIn: false,         // timer floats above the tank
    underlit: false,
    name: 'Dither',          // fixed now; no renaming
    wordsStyle: ['dots', 'geist', 'doto'].includes(saved.wordsStyle) ? saved.wordsStyle : 'dots',
    baseOn: saved.baseOn === true,
    brain: saved.brain === true,              // 'done with work' leaves a brain floating until the next focus
    musicVol: typeof saved.musicVol === 'number' ? saved.musicVol : 0.6,
    musicMuted: saved.musicMuted === true,             // off by default; a click on the base turns it on
    sound: saved.sound ?? true,
    growth: saved.growth ?? 0,
    evap: saved.evap ?? 0,
    fish: saved.fishDay === today() ? (saved.fish || []) : [],
    pendingFish: saved.fishDay === today() ? (saved.pendingFish || 0) : 0,   // earned, waiting for the reveal
    fishDay: today(),
    timer: saved.timer || { mode: 'idle', endsAt: 0, remaining: FOCUS_MIN * 60 },
    view: 0, az: 0, zoom: 1, zoomTarget: 1, driftPhase: 0, driftAmp: 30,
    growthPreview: null, skyPreview: null,
  };
  let saveTimer = 0;
  function writeSave() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        seed: state.seed, shape: state.shape, name: state.name, sound: state.sound,
        growth: state.growth, evap: state.evap, fish: state.fish, pendingFish: state.pendingFish, fishDay: state.fishDay, timer: state.timer,
        wordsStyle: state.wordsStyle, baseOn: state.baseOn, brain: state.brain, musicVol: state.musicVol, musicMuted: state.musicMuted,
      }));
    } catch (e) { /* storage blocked: still works, just won't remember */ }
  }
  // saves are bunched up for a moment, but written right away if the page is hidden or closed, so a quick pause-and-close sticks
  function save() {
    setEndAlarm();          // every timer change is saved, so this keeps the end-of-session alarm in step
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeSave, 300);
  }
  const flushSave = () => { if (saveTimer) writeSave(); };
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
  const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } };

  // ================================================================ helpers
  function randomSeed() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }
  function seedToInt(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function makeNoise(rand) {
    const N = 256, v = new Float32Array(N * N);
    for (let i = 0; i < v.length; i++) v[i] = rand();
    const s = (t) => t * t * (3 - 2 * t);
    const g = (a, b) => v[((a & 255) * N) + (b & 255)];
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), u = s(x - xi), w = s(y - yi);
      const a = g(xi, yi) + (g(xi + 1, yi) - g(xi, yi)) * u, b = g(xi, yi + 1) + (g(xi + 1, yi + 1) - g(xi, yi + 1)) * u;
      return a + (b - a) * w;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const growthU = (poms) => clamp((poms + 0.6) / (MAX_POMS + 0.6), 0, 1);   // a fresh tank starts with a few sprouts
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const UP = new T.Vector3(0, 1, 0);
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const vec3 = (hex) => { const c = parseInt(hex.slice(1), 16); return new T.Vector3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255); };

  // ================================================================ tank footprint (shape)
  // A superellipse: n=2 is an oval, n≈4 a soft rounded rectangle, n≈14 almost a box.
  // "wob" adds a gentle asymmetric lumpiness (pebble).
  const shape = { a: TANK.w / 2, b: TANK.d / 2, n: 4, wob: 0, ph: [0, 0, 0] };
  function setShape(name, rand) {
    const s = SHAPES[name];
    shape.n = s.n; shape.wob = s.wob;
    shape.a = TANK.w / 2 / (1 + s.wob); shape.b = TANK.d / 2 / (1 + s.wob);
    shape.ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  }
  const wobble = (th) => 1 + shape.wob * (0.45 * Math.sin(th + shape.ph[0]) + 0.35 * Math.sin(2 * th + shape.ph[1]) + 0.2 * Math.sin(3 * th + shape.ph[2]));
  function shapeNorm(x, z) {     // < 1 inside
    const u = Math.abs(x / shape.a), v = Math.abs(z / shape.b);
    const r = Math.pow(Math.pow(u, shape.n) + Math.pow(v, shape.n), 1 / shape.n);
    return r / wobble(Math.atan2(z / shape.b, x / shape.a));
  }
  function boundary(th, s = 1) {
    let c = Math.cos(th), sn = Math.sin(th);
    if (Math.abs(c) < 1e-9) c = 0; if (Math.abs(sn) < 1e-9) sn = 0;     // cos(2π) etc. aren't exactly 0/1; the power below magnifies that into a visible gap
    const e = 2 / shape.n;
    const x = shape.a * Math.sign(c) * Math.pow(Math.abs(c), e), z = shape.b * Math.sign(sn) * Math.pow(Math.abs(sn), e);
    const k = wobble(Math.atan2(z / shape.b, x / shape.a)) * s;
    return V(x * k, 0, z * k);
  }
  const inside = (x, z, margin = 0) => shapeNorm(x, z) < 1 - margin / Math.min(shape.a, shape.b);
  function pullInside(p, s = 0.985) { const n = shapeNorm(p.x, p.z); if (n > s) { p.x *= s / n; p.z *= s / n; } return p; }

  // ================================================================ shaders
  const COMMON = /* glsl */`
    #define TAU 6.28318530718
    float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vnoise(vec3 x) {
      vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float caustic(vec2 xz, float time) {
      vec2 uv = xz * 0.03;
      vec2 p = mod(uv * TAU, TAU) - 250.0;
      vec2 i = p; float c = 1.0; float inten = 0.005;
      for (int n = 0; n < 4; n++) {
        float t = time * 0.45 * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
      }
      c /= 4.0; c = 1.17 - pow(c, 1.4);
      return clamp(pow(abs(c), 8.0), 0.0, 1.0);
    }
    uniform vec4 uRip[8];
    float waveH(vec2 p, float t) {
      float h = sin(p.x * 0.31 + t * 0.7) * 0.07 + sin(p.y * 0.47 - t * 0.55 + p.x * 0.11) * 0.06 + sin((p.x - p.y) * 0.9 + t * 1.3) * 0.025
              + sin(p.x * 0.12 - p.y * 0.2 + t * 0.35) * 0.08;
      for (int k = 0; k < 8; k++) {
        vec4 r = uRip[k];
        float age = t - r.z;
        if (age < 0.0 || age > 8.0 || r.w <= 0.0) continue;
        float d = length(p - r.xy);
        float x = d - age * 6.0;
        h += r.w * 0.6 * sin(x * 1.3) * exp(-x * x * 0.05) * exp(-age * 0.55) / (1.0 + d * 0.12);
      }
      return h;
    }
    uniform vec4 uShape; uniform vec3 uShapePh;
    float shapeNorm(vec2 p) {
      vec2 q = abs(p / uShape.xy);
      float r = pow(pow(q.x, uShape.z) + pow(q.y, uShape.z), 1.0 / uShape.z);
      float th = atan(p.y / uShape.y, p.x / uShape.x);
      return r / (1.0 + uShape.w * (0.45 * sin(th + uShapePh.x) + 0.35 * sin(2.0 * th + uShapePh.y) + 0.2 * sin(3.0 * th + uShapePh.z)));
    }
    float bayer4(vec2 p) {
      ivec2 q = ivec2(mod(p, 4.0)); int idx = q.x + q.y * 4;
      float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
      return (m[idx] + 0.5) / 16.0;
    }
  `;

  // uTrans: x = style (1 static dissolve, 2 dither, 3 dither + static), y = how much is gone (0..1)
  const TRANS_GLSL = /* glsl */`
    uniform vec3 uTrans;
    float bayer8(vec2 p) {
      vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0), c = mod(floor(p / 4.0), 2.0);
      float v = mod(2.0 * a.x + 3.0 * a.y, 4.0) * 16.0 + mod(2.0 * b.x + 3.0 * b.y, 4.0) * 4.0 + mod(2.0 * c.x + 3.0 * c.y, 4.0);
      return (v + 0.5) / 64.0;
    }
    float th(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    // 0: draw normally, 1: gone, 2: draw as static
    int transState(vec3 w) {
      int st = int(uTrans.x + 0.5); float v = uTrans.y;
      if (st == 0 || v <= 0.001) return 0;
      vec2 c = floor(gl_FragCoord.xy); float fr = floor(uTime * 24.0);
      if (st == 1) {
        float band = 0.6 + 0.4 * sin(c.y * 0.7 + uTime * 30.0) * sin(c.y * 0.11 - uTime * 7.0);
        return th(c + fr * 17.31) < v * 1.02 * band ? 2 : 0;
      }
      float yN = clamp((w.y + 3.0) / (${TANK.h}.0 + 16.0), 0.0, 1.0);
      float t = 0.6 * bayer8(c) + 0.4 * (1.0 - yN);        // tops go first; bottoms come back first
      if (st == 3 && t < v + 0.06 && t > v - 0.09 && th(c + fr * 5.7) < 0.75) return 2;   // a band of static at the edge
      return t < v ? 1 : 0;
    }
  `;
  const TRANS_HAZE = /* glsl */`{ int ts_ = transState(vW); if (ts_ == 1) discard; if (ts_ == 2) { gl_FragColor = vec4(th(floor(gl_FragCoord.xy) * 1.7 + floor(uTime * 24.0)), ${M.haze}.0 / 63.0, 0.0, 0.0); return; } }`;

  const SCENE_VERT = /* glsl */`
    attribute float aMat; attribute float aSway; attribute float aPhase; attribute vec3 aTan; attribute float aLum; attribute float aBirth;
    uniform float uTime, uWater, uPointSize;
    uniform vec2 uViewPx;
    uniform vec3 uFlow;
    varying vec3 vW; varying vec3 vN; varying float vMat; varying vec2 vDir; varying float vOrient;
    varying float vPhase; varying float vLum; varying float vViewZ; varying float vBirth;
    vec3 swayOff(vec3 p, float w, float ph) {
      float under = smoothstep(uWater + 2.0, uWater - 0.5, p.y);
      float amp = w * mix(0.12, 1.0, under);
      float x = sin(uTime * 0.5 + ph + p.y * 0.12) * 0.9 + sin(uTime * 1.1 + ph * 1.7 + p.x * 0.05) * 0.35;
      float z = sin(uTime * 0.4 + ph * 2.3 + p.y * 0.09) * 0.55;
      vec3 flow = vec3(uFlow.x, 0.0, uFlow.y) * uFlow.z * (0.7 + 0.3 * sin(uTime * 0.6 + ph));
      return (vec3(x, 0.0, z) + flow * under) * amp;
    }
    void main() {
      vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
      if (abs(aMat - ${M.mote}.0) < 0.5) {
        float h = max(uWater - 1.5, 1.0);
        p.y = 1.0 + mod(p.y + uTime * 0.18 * (0.5 + fract(aPhase * 7.13)), h);
        p.x += sin(uTime * 0.11 + aPhase) * 2.5;
        p.z += cos(uTime * 0.09 + aPhase * 1.3) * 1.5;
      }
      vec3 pw = p + swayOff(p, aSway, aPhase);
      vW = pw; vN = mat3(modelMatrix) * normal; vMat = aMat; vPhase = aPhase; vLum = aLum; vBirth = aBirth;
      vec4 viewP = viewMatrix * vec4(pw, 1.0);
      vViewZ = -viewP.z;
      vec4 c0 = projectionMatrix * viewP;
      gl_Position = c0;
      gl_PointSize = uPointSize;
      vOrient = 0.0; vDir = vec2(1.0, 0.0);
      if (dot(aTan, aTan) > 1e-4) {
        vec3 p2 = p + normalize(mat3(modelMatrix) * aTan) * 0.6;
        vec3 pw2 = p2 + swayOff(p2, aSway, aPhase);
        vec4 c1 = projectionMatrix * viewMatrix * vec4(pw2, 1.0);
        vDir = (c1.xy / c1.w - c0.xy / c0.w) * uViewPx;
        vOrient = 1.0;
      }
    }
  `;

  const SCENE_FRAG = /* glsl */`
    uniform float uTime, uWater, uLight, uCamDist, uGrowth, uGlow, uFlash, uMGlow, uBaseHover, uShade;
    uniform vec3 uLightDir; uniform vec2 uShadeOff;
    varying vec3 vW; varying vec3 vN; varying float vMat; varying vec2 vDir; varying float vOrient;
    varying float vPhase; varying float vLum; varying float vViewZ; varying float vBirth;
    ${COMMON}
    ${TRANS_GLSL}
    void main() {
      if (vBirth > uGrowth + 0.0001) discard;
      int m = int(vMat + 0.5);
      if (m == ${M.shade}) {
        // the tank's shadow on the ground: its footprint, dragged away from the sun or moon
        float sh = 0.0;
        for (int i = 0; i < 9; i++) {
          float t = float(i) / 8.0;
          float d = shapeNorm(vW.xz - uShadeOff * t);
          sh = max(sh, (1.0 - smoothstep(0.96, 1.12 + 0.35 * t, d)) * (1.0 - 0.55 * t));
        }
        sh *= uShade * (1.0 - clamp(uTrans.y * 1.5, 0.0, 1.0));   // the shadow just fades during a swap; the base light's effect is dithered in the halftone pass
        if (sh < 0.04) discard;
        gl_FragColor = vec4(sh, ${M.shade}.0 / 63.0, 0.0, 0.0);
        return;
      }
      ${TRANS_HAZE}
      vec3 N = normalize(vN + vec3(0.0, 1e-4, 0.0)); if (!gl_FrontFacing) N = -N;
      vec3 L = normalize(uLightDir);
      float diff = max(dot(N, L), 0.0);
      float lum = 0.24 + 0.8 * diff;
      float n1 = vnoise(vW * 0.9);
      bool lit = true; float addGlow = 0.0;
      if (m == ${M.rock}) {
        lum = 0.24 + 0.86 * diff + (n1 - 0.5) * 0.3 + sin(vW.y * 1.6 + n1 * 5.0) * 0.06;
      } else if (m == ${M.substrate} || m == ${M.sand}) {
        float n2 = vnoise(vW * 2.2);
        if (abs(N.y) < 0.5) lum = 0.26 + 0.2 * sin(vW.y * 3.2 + n2 * 2.5) + (n2 - 0.5) * 0.3;
        else lum = 0.3 + 0.55 * diff + (n2 - 0.5) * 0.45;
        if (m == ${M.sand}) lum += 0.1;
      } else if (m == ${M.wood}) {
        lum = 0.22 + 0.78 * diff + (vnoise(vW * vec3(0.7, 2.2, 0.7)) - 0.5) * 0.3;
      } else if (m == ${M.moss}) {
        lum = 0.3 + 0.5 * hash13(floor(vW * 2.0) + vPhase) + diff * 0.25;
      } else if (m == ${M.stem} || m == ${M.stemRed} || m == ${M.grass} || m == ${M.crypt} || m == ${M.leaf}) {
        lum = 0.42 + 0.28 * hash13(vec3(vPhase * 13.1, 1.0, 2.0)) + 0.3 * smoothstep(0.0, uWater, vW.y);
        if (m == ${M.leaf}) lum = 0.3 + 0.6 * diff + 0.15 * hash13(floor(vW * 3.0));
      } else if (m == ${M.ipodScreen}) {
        lum = mix(0.3 + 0.5 * diff, 1.0, uFlash);
      } else if (m == ${M.masonBrass}) {
        lum = mix(0.22 + 0.6 * diff, 1.0, uMGlow);
      } else if (m == ${M.glass}) {
        lum = 0.55; lit = false;
      } else if (m == ${M.glow}) {
        lit = false;           // the light pool sits on the floor, never 'underwater', so it fades into the sky
      } else if (m == ${M.base}) {
        lum = 0.35 + 0.55 * diff + uBaseHover * 0.12; lit = false;
        if (abs(N.y) < 0.5) { lum = 0.38 + 0.2 * diff; addGlow = uGlow * 0.62 * smoothstep(-0.3, -2.4, vW.y); }
      } else if (m >= ${M.fishOrange} && m <= ${M.fishBronze}) {
        lum = 0.4 + 0.6 * diff;
        if (vLum < 0.0) lum *= -vLum;          // fins: smaller dots, so they read as see-through
      }
      bool under = vW.y < uWater && lit;
      float depthN = clamp((uWater - vW.y) / max(uWater, 1.0), 0.0, 1.0);
      if (lit) {
        if (under) {
          float c = caustic(vW.xz, uTime);
          lum += c * 0.5 * clamp(N.y * 0.7 + 0.3, 0.0, 1.0) * (1.0 - depthN * 0.6);
          lum *= 1.0 - depthN * 0.15;
        }
        lum *= uLight;
        float fog = smoothstep(uCamDist - 14.0, uCamDist + 26.0, vViewZ);
        lum *= 1.0 - fog * 0.28;
      } else {
        lum *= 0.55 + 0.45 * uLight;
      }
      lum += addGlow;          // the base's own light ignores the night dimming
      if (vLum > 0.0) lum = vLum * (0.5 + 0.5 * uLight);
      if (m == ${M.glow}) lum = vLum * uGlow;
      float oc = 0.0;
      if (vOrient > 0.5) {
        float a = atan(vDir.y, vDir.x); if (a < 0.0) a += 3.14159265;
        int b = int(floor(a / 0.78539816 + 0.5)) % 4;
        oc = (float(b) + 1.0) / 10.0;
        #ifdef IS_LINE
        oc += 0.5;
        #endif
      }
      gl_FragColor = vec4(clamp(lum, 0.0, 1.0), float(m) / 63.0, under ? 0.1 + 0.9 * depthN : 0.0, oc);
    }
  `;

  const WATER_VERT = /* glsl */`
    varying vec3 vW; varying vec3 vNw;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vNw = normal; gl_Position = projectionMatrix * viewMatrix * w; }
  `;
  const WATER_FRAG = /* glsl */`
    uniform float uTime, uWater, uLight;
    varying vec3 vW; varying vec3 vNw;
    ${COMMON}
    ${TRANS_GLSL}
    void main() {
      if (vW.y > uWater) discard;
      ${TRANS_HAZE}
      if (dot(vNw, cameraPosition - vW) > 0.0) discard;   // only the far walls
      float depthN = clamp((uWater - vW.y) / max(uWater, 1.0), 0.0, 1.0);
      float lum = 0.06 + 0.16 * (1.0 - depthN);
      float sx = vW.x + vW.z * 0.6 + (uWater - vW.y) * 0.42;
      float shaft = pow(0.5 + 0.5 * sin(sx * 0.26 + sin(sx * 0.061 + uTime * 0.09) * 2.2 + uTime * 0.04), 7.0);
      lum += shaft * 0.45 * (1.0 - depthN * 0.6);
      lum += caustic(vW.xy + vec2(vW.z, 0.0), uTime * 0.8) * 0.12 * (1.0 - depthN);
      lum *= uLight;
      gl_FragColor = vec4(clamp(lum, 0.0, 1.0), ${M.water}.0 / 63.0, 0.1 + 0.9 * depthN, 0.0);
    }
  `;

  const SURFACE_VERT = /* glsl */`
    uniform float uTime, uWater;
    varying vec3 vW; varying float vH;
    ${COMMON}
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      float h = waveH(w.xz, uTime);
      w.y = uWater + h; vH = h; vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `;
  const SURFACE_FRAG = /* glsl */`
    uniform float uTime, uLight;
    uniform vec3 uLightDir;
    varying vec3 vW; varying float vH;
    ${COMMON}
    ${TRANS_GLSL}
    void main() {
      if (shapeNorm(vW.xz) > 0.995) discard;
      ${TRANS_HAZE}
      float e = 0.6;
      float hx = waveH(vW.xz + vec2(e, 0.0), uTime) - waveH(vW.xz - vec2(e, 0.0), uTime);
      float hz = waveH(vW.xz + vec2(0.0, e), uTime) - waveH(vW.xz - vec2(0.0, e), uTime);
      vec3 N = normalize(vec3(-hx, 2.0 * e, -hz));
      float glint = pow(max(dot(N, normalize(uLightDir + vec3(0.0, 0.0, 0.5))), 0.0), 50.0);
      float cover = 0.62 + clamp(abs(vH) * 3.0, 0.0, 0.3) + glint * 0.5;
      if (bayer4(gl_FragCoord.xy) > cover) discard;
      float lum = (0.42 + vH * 1.6 + glint * 0.6) * (0.45 + 0.55 * uLight);
      gl_FragColor = vec4(clamp(lum, 0.0, 1.0), ${M.surface}.0 / 63.0, 0.12, 0.0);
    }
  `;

  const LINE_VERT = /* glsl */`
    uniform float uTime, uWater;
    varying float vH; varying vec3 vW;
    ${COMMON}
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      float h = waveH(w.xz, uTime); vH = h;
      w.y = uWater + h * 1.2; vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `;
  const LINE_FRAG = /* glsl */`
    uniform float uLight, uTime;
    varying float vH; varying vec3 vW;
    ${TRANS_GLSL}
    void main() {
      ${TRANS_HAZE}
      float lum = (0.55 + vH * 1.5) * (0.55 + 0.45 * uLight);
      gl_FragColor = vec4(clamp(lum, 0.0, 1.0), ${M.waterline}.0 / 63.0, 0.0, 0.0);
    }
  `;

  // the timer, drawn on a plane that sits in the water
  const DIGIT_VERT = /* glsl */`
    varying vec2 vUv; varying vec3 vW;
    void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
  `;
  const DIGIT_FRAG = /* glsl */`
    uniform sampler2D uDigits;
    uniform float uTime, uWater, uLight, uDim;
    varying vec2 vUv; varying vec3 vW;
    ${COMMON}
    void main() {
      vec2 uv = vUv;
      uv.x += sin(uv.y * 16.0 + uTime * 1.2) * 0.0035;
      uv.y += sin(uv.x * 10.0 + uTime * 0.8) * 0.006;
      vec4 c = texture2D(uDigits, uv);
      float fill = c.r, halo = c.g;
      if ((fill < 0.3 && halo < 0.3) || vW.y > uWater - 0.4) discard;
      float depthN = clamp((uWater - vW.y) / max(uWater, 1.0), 0.0, 1.0);
      if (fill < 0.3) { gl_FragColor = vec4(0.04, ${M.water}.0 / 63.0, 0.6 + 0.4 * depthN, 0.0); return; }   // dark ring of water
      if (uDim < 0.99 && bayer4(gl_FragCoord.xy) > 0.6) { gl_FragColor = vec4(0.04, ${M.water}.0 / 63.0, 0.6, 0.0); return; }   // paused: thinned out
      float lum = (0.72 + 0.22 * fill + caustic(vW.xy * 1.5, uTime) * 0.16) * (0.75 + 0.25 * uLight);
      gl_FragColor = vec4(clamp(lum, 0.0, 1.0), ${M.digit}.0 / 63.0, 0.08 + 0.3 * depthN, 0.0);
    }
  `;

  const ASCII_VERT = /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const ASCII_FRAG = /* glsl */`
    uniform sampler2D uScene, uAtlas, uPal, uOverlay, uLbl;
    uniform float uTimerDither;
    float bay8(vec2 p) { vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0), c = mod(floor(p / 4.0), 2.0); return (mod(2.0 * a.x + 3.0 * a.y, 4.0) * 16.0 + mod(2.0 * b.x + 3.0 * b.y, 4.0) * 4.0 + mod(2.0 * c.x + 3.0 * c.y, 4.0) + 0.5) / 64.0; }
    uniform vec4 uLblRect; uniform float uLblF;
    uniform vec2 uCellPx, uOffset, uGrid, uRes;
    uniform float uLook, uTime, uStars, uAurora, uOverlayOn, uOverlayDim, uOverlayGlow;
    uniform vec3 uGlowCol, uOutlineCol;
    uniform float uShadeLit, uShadeAmt;
    uniform vec4 uOvRect;
    uniform vec3 uTint, uDeep, uSky0, uSky1, uSky2, uSkyTint, uSunCol, uMoonCol, uOverlayCol;
    uniform vec2 uSunPos, uMoonPos;
    ${COMMON}
    vec3 sky(vec2 fc) {
      vec2 uv = fc / uRes;
      vec3 c = uv.y > 0.45 ? mix(uSky1, uSky0, smoothstep(0.45, 1.0, uv.y)) : mix(uSky2, uSky1, smoothstep(0.0, 0.45, uv.y));
      float asp = uRes.x / uRes.y;
      vec2 ds = (uv - uSunPos) * vec2(asp, 1.0), dm = (uv - uMoonPos) * vec2(asp, 1.0);
      c += uSunCol * exp(-dot(ds, ds) * 1.6) + uSunCol * 0.35 * exp(-dot(ds, ds) * 0.25);
      c += uMoonCol * exp(-dot(dm, dm) * 6.0) + uMoonCol * 0.25 * exp(-dot(dm, dm) * 0.8);
      return c + (bayer4(fc) - 0.5) / 255.0 * 3.0;
    }
    float aurora(vec2 uv, float t) {
      float x = uv.x;
      float y0 = 0.68 + 0.07 * sin(x * 2.6 + t * 0.03) + 0.04 * sin(x * 6.3 - t * 0.05) + 0.02 * sin(x * 13.0 + t * 0.07);
      float d = uv.y - y0;
      float band = d > 0.0 ? exp(-d * 18.0) : exp(-d * d * 1400.0);
      float rays = 0.7 + 0.3 * sin(x * 60.0 + sin(x * 9.0 + t * 0.04) * 5.0 + t * 0.08);
      float wave = 0.6 + 0.4 * sin(x * 3.0 - t * 0.04);
      return band * rays * wave * smoothstep(0.55, 0.72, uv.y);
    }
    void main() {
      vec2 fc = gl_FragCoord.xy - uOffset;
      vec2 cell = floor(fc / uCellPx);
      vec3 bg = sky(gl_FragCoord.xy);
      if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uGrid.x || cell.y >= uGrid.y) { gl_FragColor = vec4(bg, 1.0); return; }
      vec2 inC = fc - cell * uCellPx;
      vec2 q = inC - uCellPx * 0.5;
      float rMax = 0.5 * min(uCellPx.x, uCellPx.y);
      vec4 s = texelFetch(uScene, ivec2(cell), 0);
      int id = int(s.g * 63.0 + 0.5);

      // timer floating above the tank (when it isn't in the water)
      if (uOverlayOn > 0.5) {
        // small words under the digits: each cell splits into F×F little dots so letters stay readable
        vec2 lc = cell - uLblRect.xy;
        if (uLblRect.z > 0.0 && lc.x >= 0.0 && lc.y >= 0.0 && lc.x < uLblRect.z && lc.y < uLblRect.w) {
          vec2 sp = uCellPx / uLblF;
          vec2 sub = min(floor(inC / sp), vec2(uLblF - 1.0));
          vec4 lo = texelFetch(uLbl, ivec2(lc * uLblF + sub), 0);
          float lf = lo.r * lo.a, lg = lo.g * lo.a;
          vec2 sq = inC - (sub + 0.5) * sp;
          float sr = 0.5 * min(sp.x, sp.y);
          if (lf > 0.3 && !(uOverlayDim < 0.99 && bayer4(cell * uLblF + sub) > 0.6) && !(uTimerDither > 0.001 && bay8(cell * uLblF + sub) < uTimerDither)) {
            float r = sr * (0.62 + 0.45 * lf) * (1.0 + 0.08 * uOverlayGlow);
            float m = 1.0 - smoothstep(r - 0.6, r + 0.6, length(sq));
            gl_FragColor = vec4(mix(bg, uOverlayCol, m), 1.0); return;
          }
          // a contrasting outline around the letters, so they read over the tank up close
          if (lf <= 0.3 && !(uTimerDither > 0.001 && bay8(cell * uLblF + sub) < uTimerDither)) {
            float nb = 0.0;
            for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) { vec4 n = texelFetch(uLbl, ivec2(lc * uLblF + sub) + ivec2(dx, dy), 0); nb = max(nb, n.r * n.a); }
            if (nb > 0.3) {
              float r = sr * 0.95, m = 1.0 - smoothstep(r - 0.6, r + 0.6, length(sq));
              gl_FragColor = vec4(mix(bg, uOutlineCol, m * (uOverlayDim < 0.99 ? 0.55 : 0.9)), 1.0); return;
            }
          }
          if (lf <= 0.3 && lg > 0.03 && uOverlayGlow > 0.01) {
            float gg = clamp(lg * uOverlayGlow * 1.6, 0.0, 1.0);
            float r = sr * pow(gg, 0.7) * 0.95;
            float m = 1.0 - smoothstep(r - 0.6, r + 0.6, length(sq));
            bg = mix(bg, uGlowCol, m * 0.75 * gg + 0.08 * gg);
          }
        }
        vec4 o = texelFetch(uOverlay, ivec2(cell), 0);
        float fill = o.r * o.a, glow = o.g * o.a;
        if (fill > 0.35 && !(uOverlayDim < 0.99 && bayer4(cell) > 0.6) && !(uTimerDither > 0.001 && bay8(cell) < uTimerDither)) {
          float r = rMax * (0.55 + 0.45 * fill) * (1.05 + 0.1 * uOverlayGlow);
          float m = 1.0 - smoothstep(r - 0.9, r + 0.9, length(q));
          gl_FragColor = vec4(mix(bg, uOverlayCol, m), 1.0); return;
        }
        // the digits' outline: a ring of dots in a contrasting color, one cell wide
        if (fill <= 0.35 && cell.x >= uOvRect.x && cell.y >= uOvRect.y && cell.x <= uOvRect.z && cell.y <= uOvRect.w && !(uTimerDither > 0.001 && bay8(cell) < uTimerDither)) {
          float nb = 0.0;
          for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) { vec4 n = texelFetch(uOverlay, ivec2(cell) + ivec2(dx, dy), 0); nb = max(nb, n.r * n.a); }
          if (nb > 0.35) {
            float r = rMax * 0.98, m = 1.0 - smoothstep(r - 0.9, r + 0.9, length(q));
            gl_FragColor = vec4(mix(bg, uOutlineCol, m * (uOverlayDim < 0.99 ? 0.55 : 0.9)), 1.0); return;
          }
        }
        if (fill <= 0.35 && glow > 0.03 && uOverlayGlow > 0.01) {
          float gg = clamp(glow * uOverlayGlow * 1.6, 0.0, 1.0);
          float r = rMax * pow(gg, 0.7) * 0.9;
          float m = 1.0 - smoothstep(r - 0.8, r + 0.8, length(q));
          bg = mix(bg, uGlowCol, m * 0.75 * gg + 0.08 * gg);
        }
      }
      // ground shadow: darker dots over the sky, bigger where the shadow is deeper
      if (id == ${M.shade}) {
        // the base light washes the shadow out; turning it on or off dithers cell by cell instead of fading all at once
        float sv = s.r * (1.0 - 0.9 * uShadeAmt * (bay8(cell) < uShadeLit ? 1.0 : 0.0));
        float r = rMax * (0.3 + 0.7 * sqrt(sv));
        float m = 1.0 - smoothstep(r - 0.8, r + 0.8, length(q));
        float lb = dot(bg, vec3(0.2126, 0.7152, 0.0722));
        vec3 c = bg * (0.5 + 0.18 * (1.0 - lb));
        gl_FragColor = vec4(mix(bg, c, m * clamp(sv * 1.8, 0.0, 1.0)), 1.0); return;
      }
      // haze: a dot in the sky's own color, a little lighter or darker, so the tank dissolves into its surroundings
      if (id == ${M.haze}) {
        float hv = s.r;
        float r = rMax * (0.45 + 0.55 * hv);
        float m = 1.0 - smoothstep(r - 0.8, r + 0.8, length(q));
        float lb = dot(bg, vec3(0.2126, 0.7152, 0.0722));
        vec3 c = hv > 0.5 ? mix(bg, vec3(1.0), 0.22 + 0.25 * (1.0 - lb)) : bg * (0.62 + 0.2 * lb);
        // at night, sky-tinted fuzz reads as gray: use the water's cool blue-green instead, like the top of the tank
        float night = 1.0 - smoothstep(0.08, 0.3, lb);
        vec3 water = hv > 0.75 ? vec3(0.50, 0.80, 0.80) : hv > 0.5 ? vec3(0.27, 0.58, 0.62) : vec3(0.11, 0.32, 0.38);
        c = mix(c, water, night);
        gl_FragColor = vec4(mix(bg, c, m), 1.0); return;
      }
      if (id == 0) {
        vec2 uv = (cell + 0.5) / uGrid;
        vec3 col = bg;
        // stars, late at night
        float h = hash12(cell);
        if (uStars > 0.0 && h > 0.985 && uv.y > 0.3) {
          float tw = 0.72 + 0.28 * sin(uTime * (0.12 + h * 0.3) + h * 40.0);
          float r = rMax * (0.25 + 0.3 * fract(h * 91.0)) * tw;
          float m = 1.0 - smoothstep(r - 0.7, r + 0.7, length(q));
          col = mix(col, vec3(0.92, 0.95, 1.0), m * uStars * smoothstep(0.3, 0.55, uv.y));
        }
        // aurora, in the deepest part of the night
        if (uAurora > 0.0) {
          float a = aurora(uv, uTime) * uAurora;
          if (a > 0.04) {
            vec3 ac = mix(vec3(0.33, 0.95, 0.66), vec3(0.55, 0.45, 0.95), smoothstep(0.75, 0.95, uv.y));
            float r = rMax * clamp(pow(a, 0.6), 0.0, 1.0);
            float m = 1.0 - smoothstep(r - 0.8, r + 0.8, length(q));
            col = mix(col, ac * 0.75, m * 0.7);
          }
        }
        gl_FragColor = vec4(col, 1.0); return;
      }
      float lum = s.r; float under = s.b;
      int oCode = int(s.a * 10.0 + 0.5);
      bool isLine = oCode >= 6;
      int ob = oCode == 0 ? -1 : (isLine ? oCode - 6 : oCode - 1);
      float bd = bayer4(cell) - 0.5;
      float lumD = clamp(lum + bd * 0.09, 0.0, 0.999);
      int look = int(uLook + 0.5);   // 0 halftone, 1 hybrid, 2 ascii
      int ps = int(clamp(lum * 1.12 + (look == 2 ? 0.14 : 0.06) + (look == 1 && isLine ? 0.12 : 0.0) + bd * 0.14, 0.0, 0.999) * 4.0);
      vec3 col = texelFetch(uPal, ivec2(ps, id), 0).rgb;
      vec4 flags = texelFetch(uPal, ivec2(4, id), 0);
      bool hasO = flags.r > 0.5;
      bool glyphMat = flags.b > 0.75;
      bool dotInHybrid = flags.b > 0.25 && flags.b < 0.75;
      vec3 dark = texelFetch(uPal, ivec2(0, id), 0).rgb;
      if (under > 0.0) col = mix(col, uTint, 0.04 + 0.16 * under);
      col *= uSkyTint;
      vec3 bgc = bg;
      if (under > 0.0) bgc = mix(bg * 0.45, uDeep, 0.85 - 0.25 * under);
      if (id == ${M.surface}) bgc = mix(bg, uDeep * 1.4, 0.4);
      if (look == 2) bgc = mix(bgc, dark * (0.55 + 0.45 * lum), flags.g);
      bool useGlyph = (look == 2 || (look == 1 && ((hasO && isLine && !dotInHybrid) || glyphMat))) && id != ${M.digit};
      float m = 0.0;
      if (useGlyph) {
        int g = (hasO && ob >= 0) ? 10 + ob : int(lumD * 10.0);
        int cw = int(uCellPx.x), ch = int(uCellPx.y);
        ivec2 tc = ivec2(g * cw + int(inC.x), id * ch + ch - 1 - int(inC.y));
        m = texelFetch(uAtlas, tc, 0).a;
      } else {
        float r = rMax * pow(lumD, 0.6) * 1.12;
        if (id == ${M.water}) r *= 0.6;
        if (id == ${M.glow}) r = rMax * lumD;
        m = 1.0 - smoothstep(r - 0.9, r + 0.9, length(q));
      }
      gl_FragColor = vec4(mix(bgc, col, m), 1.0);
    }
  `;

  // ================================================================ renderer + uniforms
  const canvas = document.getElementById('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  const U = {
    uTime: { value: 0 }, uWater: { value: TANK.h * 0.95 }, uLight: { value: 1 }, uGrowth: { value: 0.06 }, uGlow: { value: 0 },
    uPointSize: { value: 1 }, uViewPx: { value: new T.Vector2(1, 1) }, uCamDist: { value: 100 },
    uRip: { value: Array.from({ length: 8 }, () => new T.Vector4(0, 0, -99, 0)) },
    uFlash: { value: 0 }, uMGlow: { value: 0 }, uBaseHover: { value: 0 }, uStatic: { value: 0 },
    uShade: { value: 0 }, uShadeOff: { value: new T.Vector2(0, 6) }, uTrans: { value: new T.Vector3(0, 0, 0) },
    uFlow: { value: new T.Vector3(1, 0.2, 0.12) }, uLightDir: { value: new T.Vector3(-0.3, 1, 0.35) },
    uShape: { value: new T.Vector4(45, 20, 4, 0) }, uShapePh: { value: new T.Vector3() },
  };
  const sceneMat = new T.ShaderMaterial({ uniforms: U, vertexShader: SCENE_VERT, fragmentShader: SCENE_FRAG, side: T.DoubleSide });
  const sceneLineMat = new T.ShaderMaterial({ uniforms: U, vertexShader: SCENE_VERT, fragmentShader: SCENE_FRAG, defines: { IS_LINE: 1 } });
  const waterMat = new T.ShaderMaterial({ uniforms: U, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, side: T.DoubleSide });
  const surfaceMat = new T.ShaderMaterial({ uniforms: U, vertexShader: SURFACE_VERT, fragmentShader: SURFACE_FRAG, side: T.DoubleSide });
  const lineMat = new T.ShaderMaterial({ uniforms: U, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG });

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(26, 1, 1, 900);
  const target = new T.Vector3(0, 19, 0);   // sits the tank a little low, leaving sky for the timer
  const HOME_TARGET = target.clone();
  // ---- follow camera: click a fish, or watch a new koi drop in, and the camera moves in close and follows it
  const CLOSE_DIST = 38;                 // how near the close-up sits (scene units); also the closest you can zoom
  let follow = null, camEl = 13, zoomRate = 2.2, homeRate = 0.15;
  let rt = null;

  // ---- the timer: one canvas, used either as a texture in the water or as an overlay grid
  const digitCanvas = document.createElement('canvas');
  digitCanvas.width = 1024; digitCanvas.height = 384;
  const digitTex = new T.CanvasTexture(digitCanvas);
  const digitU = { uDigits: { value: digitTex }, uTime: U.uTime, uWater: U.uWater, uLight: U.uLight, uDim: { value: 1 }, uRip: U.uRip, uShape: U.uShape, uShapePh: U.uShapePh };
  const digitMat = new T.ShaderMaterial({ uniforms: digitU, vertexShader: DIGIT_VERT, fragmentShader: DIGIT_FRAG, side: T.DoubleSide, depthTest: false, depthWrite: false });
  const DIGIT_W = 40, DIGIT_H = DIGIT_W * 384 / 1024;
  const digitMesh = new T.Mesh(new T.PlaneGeometry(DIGIT_W, DIGIT_H), digitMat);
  digitMesh.renderOrder = 10; digitMesh.frustumCulled = false;
  let overlayCanvas = document.createElement('canvas');
  let overlayTex = null;
  const lblCanvas = document.createElement('canvas');
  let lblTex = null, band = null;

  const asciiU = {
    uScene: { value: null }, uAtlas: { value: null }, uPal: { value: null }, uOverlay: { value: null },
    uLbl: { value: null }, uLblRect: { value: new T.Vector4(0, 0, 0, 0) }, uLblF: { value: 3 }, uTimerDither: { value: 0 },
    uCellPx: { value: new T.Vector2() }, uOffset: { value: new T.Vector2() }, uGrid: { value: new T.Vector2() }, uRes: { value: new T.Vector2() },
    uLook: { value: 0 }, uTime: U.uTime, uStars: { value: 0 }, uAurora: { value: 0 }, uOverlayOn: { value: 1 }, uOverlayDim: { value: 1 }, uOverlayGlow: { value: 0 }, uGlowCol: { value: vec3('#ffffff') }, uOutlineCol: { value: vec3('#eef7f8') }, uShadeLit: { value: 0 }, uShadeAmt: { value: 0 }, uOvRect: { value: new T.Vector4(0, 0, -1, -1) },
    uRip: U.uRip, uShape: U.uShape, uShapePh: U.uShapePh,
    uTint: { value: vec3('#1f6f78') }, uDeep: { value: vec3('#185160') },
    uSky0: { value: vec3('#1b4c84') }, uSky1: { value: vec3('#3b7cb2') }, uSky2: { value: vec3('#8fbfe2') }, uSkyTint: { value: new T.Vector3(1, 1, 1) },
    uSunCol: { value: new T.Vector3() }, uMoonCol: { value: new T.Vector3() }, uSunPos: { value: new T.Vector2(0.5, 1) }, uMoonPos: { value: new T.Vector2(0.5, -1) },
    uOverlayCol: { value: vec3('#f2fbf6') },
  };
  const asciiMat = new T.ShaderMaterial({ uniforms: asciiU, vertexShader: ASCII_VERT, fragmentShader: ASCII_FRAG, depthTest: false, depthWrite: false });
  const quadScene = new T.Scene();
  quadScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), asciiMat));
  const quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const palData = new Uint8Array(5 * ROWS * 4);
  const palTex = new T.DataTexture(palData, 5, ROWS, T.RGBAFormat, T.UnsignedByteType);
  palTex.minFilter = palTex.magFilter = T.NearestFilter;
  asciiU.uPal.value = palTex;
  function writePalette(tone) {
    for (const id in MATS) {
      const [, orient, pal0, fill, glyph] = MATS[id];
      let pal = pal0;
      if (+id === M.substrate) pal = tone.soil;
      if (+id === M.sand) pal = tone.sand;
      pal.forEach((hex, i) => {
        const c = parseInt(hex.slice(1), 16), o = (id * 5 + i) * 4;
        palData[o] = (c >> 16) & 255; palData[o + 1] = (c >> 8) & 255; palData[o + 2] = c & 255; palData[o + 3] = 255;
      });
      const f = (id * 5 + 4) * 4;
      palData[f] = orient ? 255 : 0; palData[f + 1] = Math.round((fill || 0) * 255); palData[f + 2] = glyph === 1 ? 255 : glyph === 2 ? 128 : 0; palData[f + 3] = 255;
    }
    palTex.needsUpdate = true;
  }

  let atlasTex = null;
  function buildAtlas(cw, ch) {
    const cvs = document.createElement('canvas');
    cvs.width = 14 * cw; cvs.height = ROWS * ch;
    const ctx = cvs.getContext('2d');
    const fs = Math.max(6, Math.floor(Math.min(ch * 0.86, cw / 0.6)));
    ctx.font = `bold ${fs}px ${FONT_MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    for (const id in MATS) {
      const [ramp, orient] = MATS[id];
      ramp.split('').concat(orient ? orient.split('') : []).forEach((chr, i) => ctx.fillText(chr, i * cw + cw / 2, id * ch + ch / 2 + ch * 0.04));
    }
    if (atlasTex) atlasTex.dispose();
    atlasTex = new T.CanvasTexture(cvs);
    atlasTex.flipY = false;
    atlasTex.minFilter = atlasTex.magFilter = T.NearestFilter;
    atlasTex.generateMipmaps = false;
    asciiU.uAtlas.value = atlasTex;
  }

  let grid = { cols: 1, rows: 1, cwCss: 6, chCss: 6 };
  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    const look = LOOKS[state.look];
    const cwDev = Math.max(3, Math.round(look.cw * DENSITY * dpr)), chDev = Math.max(3, Math.round(look.ch * DENSITY * dpr));
    const devW = Math.floor(W * dpr), devH = Math.floor(H * dpr);
    const cols = Math.max(20, Math.floor(devW / cwDev)), rows = Math.max(10, Math.floor(devH / chDev));
    grid = { cols, rows, cwCss: cwDev / dpr, chCss: chDev / dpr, cw: cwDev, ch: chDev };
    asciiU.uCellPx.value.set(cwDev, chDev);
    asciiU.uGrid.value.set(cols, rows);
    asciiU.uRes.value.set(devW, devH);
    asciiU.uOffset.value.set(Math.floor((devW - cols * cwDev) / 2), Math.floor((devH - rows * chDev) / 2));
    asciiU.uLook.value = state.look;
    if (rt) rt.dispose();
    rt = new T.WebGLRenderTarget(cols, rows, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, type: T.UnsignedByteType, format: T.RGBAFormat, depthBuffer: true });
    asciiU.uScene.value = rt.texture;
    buildAtlas(cwDev, chDev);
    overlayCanvas.width = cols; overlayCanvas.height = rows;
    if (overlayTex) overlayTex.dispose();
    overlayTex = new T.CanvasTexture(overlayCanvas);
    overlayTex.minFilter = overlayTex.magFilter = T.NearestFilter; overlayTex.generateMipmaps = false;
    asciiU.uOverlay.value = overlayTex;
    // where the timer sits (in cells), and a finer dot screen for the words under it
    {
      const aspectV = (cols * cwDev) / (rows * chDev);
      const bandW = Math.round(cols * (aspectV < 0.8 ? 0.92 : aspectV < 1.25 ? 0.72 : 0.5));     // phones get most of the width
      // sizes in cells; GAP is 24 css px between the digits, the word under them, and any button below that
      const pxc = chDev / dpr, GAP = 24 / pxc, sxr = chDev / cwDev;
      const digit = Math.min(rows * 0.145, (bandW / sxr) * 0.94 / 2.8);          // "25:00" fits the band
      const lab = Math.max(digit * 0.34, 15 / pxc);
      const digitBase = 0.6 + 0.73 * digit, labBase = digitBase + GAP + 0.73 * lab;
      const bandH = Math.min(rows - 2, Math.ceil(labBase + 0.3 * lab + 1)), bandX = Math.round((cols - bandW) / 2), bandTop = Math.round(rows * (aspectV < 0.8 ? 0.05 : 0.03));
      const lTop = bandTop + Math.max(0, Math.floor(labBase - lab * 1.05)), lH = Math.min(rows - lTop, Math.ceil(lab * 1.45) + 2);
      var tl = { digit, lab, digitBase, labBase, actTop: labBase + 0.25 * lab + GAP };
      const F = clamp(Math.round(cwDev / 3), 2, 4);
      band = { bandH, bandW, bandX, bandTop, lTop, lH, F, ...tl };
      asciiU.uOvRect.value.set(bandX - 1, rows - (bandTop + bandH) - 1, bandX + bandW + 1, rows);      // where the timer's outline can be (cells, from the bottom)
      lblCanvas.width = bandW * F; lblCanvas.height = lH * F;
      if (lblTex) lblTex.dispose();
      lblTex = new T.CanvasTexture(lblCanvas);
      lblTex.minFilter = lblTex.magFilter = T.NearestFilter; lblTex.generateMipmaps = false;
      asciiU.uLbl.value = lblTex; asciiU.uLblRect.value.set(bandX, rows - (lTop + lH), bandW, lH); asciiU.uLblF.value = F;
    }
    camera.aspect = (cols * cwDev) / (rows * chDev);
    U.uViewPx.value.set(cols * cwDev, rows * chDev);
    camera.updateProjectionMatrix();
    lastTimerText = '';
    // bottom controls follow the window size like everything else, with a floor so they stay readable
    document.documentElement.style.setProperty('--ui', clamp(Math.min(window.innerWidth / 1440, window.innerHeight / 900), 0.78, 1.15).toFixed(3));
  }
  function baseDistance() {
    const t = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    return Math.max(62 / (2 * t), (camera.aspect < 0.8 ? 106 : 142) / (2 * t * camera.aspect));     // phones: frame the tank closer
  }
  function placeCamera() {
    const dist = baseDistance() * state.zoom;
    const el = T.MathUtils.degToRad(camEl), az = T.MathUtils.degToRad(state.az);
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(target);
    U.uCamDist.value = dist;
  }

  // ================================================================ geometry builder
  class Builder {
    constructor() { this.P = []; this.N = []; this.Mt = []; this.S = []; this.Ph = []; this.Tn = []; this.Lm = []; this.B = []; }
    v(p, n, mat, sway = 0, phase = 0, tan = null, lum = 0, birth = 0) {
      this.P.push(p.x, p.y, p.z); this.N.push(n.x, n.y, n.z); this.Mt.push(mat); this.S.push(sway); this.Ph.push(phase);
      if (tan) this.Tn.push(tan.x, tan.y, tan.z); else this.Tn.push(0, 0, 0);
      this.Lm.push(lum); this.B.push(birth);
    }
    line(a, b, mat, swayA, swayB, phase, birthA = 0, birthB = birthA) {
      const t = new T.Vector3().subVectors(b, a).normalize();
      this.v(a, UP, mat, swayA, phase, t, 0, birthA); this.v(b, UP, mat, swayB, phase, t, 0, birthB);
    }
    mesh(geo, mat, o = {}) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position, Nn = g.attributes.normal, UV = g.attributes.uv;
      const p = new T.Vector3(), n = new T.Vector3();
      for (let i = 0; i < P.count; i++) {
        p.fromBufferAttribute(P, i); n.fromBufferAttribute(Nn, i);
        this.v(p, n, o.matFn ? o.matFn(p, n) : mat, o.sway || 0, o.phase || 0, o.tanFn ? o.tanFn(i, UV) : null, 0, o.birthFn ? o.birthFn(p) : (o.birth || 0));
      }
    }
    build() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.P, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(this.N, 3));
      g.setAttribute('aMat', new T.Float32BufferAttribute(this.Mt, 1));
      g.setAttribute('aSway', new T.Float32BufferAttribute(this.S, 1));
      g.setAttribute('aPhase', new T.Float32BufferAttribute(this.Ph, 1));
      g.setAttribute('aTan', new T.Float32BufferAttribute(this.Tn, 3));
      g.setAttribute('aLum', new T.Float32BufferAttribute(this.Lm, 1));
      g.setAttribute('aBirth', new T.Float32BufferAttribute(this.B, 1));
      return g;
    }
  }
  function part(b, geo, mat, pos, rot = [0, 0, 0], scl = [1, 1, 1], matFn = null) {
    const m = new T.Matrix4().compose(pos, new T.Quaternion().setFromEuler(new T.Euler(...rot)), V(...scl));
    b.mesh(geo.clone().applyMatrix4(m), mat, matFn ? { matFn } : {});
  }

  // ================================================================ the aquascape
  let world = null, terrain = null, leafPoints = [], glowMesh = null;
  const tankBox = { min: new T.Vector2(), max: new T.Vector2() };

  function tubeAlong(tri, lin, curve, r0, r1) {
    const g = new T.TubeGeometry(curve, Math.max(8, Math.round(curve.getLength() / 1.2)), 1, 7, false);
    const P = g.attributes.position, UV = g.attributes.uv, p = new T.Vector3();
    for (let i = 0; i < P.count; i++) {
      const u = UV.getX(i), c = curve.getPointAt(u), r = r0 + (r1 - r0) * u;
      p.fromBufferAttribute(P, i).sub(c).multiplyScalar(r).add(c);
      P.setXYZ(i, p.x, p.y, p.z);
    }
    g.computeVertexNormals();
    tri.mesh(g, M.wood, { tanFn: (i, uv) => curve.getTangentAt(uv.getX(i)) });
    if (r1 < 0.45) {
      const pts = curve.getPoints(Math.max(6, Math.round(curve.getLength())));
      for (let i = 0; i < pts.length - 1; i++) lin.line(pts[i], pts[i + 1], M.wood, 0, 0, 0);
    }
    return g;
  }

  function generate(seedStr) {
    if (world) {
      world.remove(dynPoints); world.remove(fishGroup); world.remove(digitMesh); world.remove(itemGroup);
      world.traverse((o) => { if (o.geometry && o !== digitMesh) o.geometry.dispose(); });
      scene.remove(world);
    }
    world = new T.Group(); scene.add(world);
    leafPoints = [];
    const rand = mulberry32(seedToInt(seedStr));
    const noise = makeNoise(rand);
    const R = (a, b) => a + rand() * (b - a);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
    setShape(state.shape, rand);
    U.uShape.value.set(shape.a, shape.b, shape.n, shape.wob); U.uShapePh.value.set(...shape.ph);
    const { w: W, h: H, d: D } = TANK;
    const A = shape.a * (1 + shape.wob), B = shape.b * (1 + shape.wob);   // outer extents
    const flip = rand() < 0.5 ? -1 : 1;
    const layout = pick(LAYOUTS), tone = pick(TONES);
    let woodStyle = pick(WOODS);
    writePalette(tone);
    const waterRef = H * 0.95;

    // ---------- substrate: some layouts rise out of the water
    const peakX = flip * W * R(0.12, 0.26), peakZ = R(-8, 3);
    const bankX = flip * W * R(0.3, 0.42), bankZ = -D * R(0.18, 0.32);
    const pathOff = flip * W * R(0.0, 0.1);
    const pathX = (z) => pathOff + Math.sin(z * 0.09) * 4;
    const baseH = (x, z) => {
      const back = clamp((B - z) / (2 * B), 0, 1);
      if (layout === 'island') return 2.2 + 1.2 * back + (H * 1.05) * Math.exp(-(((x - peakX) / (W * 0.15)) ** 2) - (((z - peakZ) / (D * 0.3)) ** 2));
      if (layout === 'bank') return 2.2 + 1.4 * back + (H * 1.08) * Math.exp(-(((x - bankX) / (W * 0.2)) ** 2) - (((z - bankZ) / (D * 0.38)) ** 2));
      if (layout === 'valley') return 2.0 + 1.4 * back + 9 * smooth(5, W * 0.42, Math.abs(x - pathX(z))) * (0.6 + 0.4 * back);
      return 2.6 + 2.2 * back;
    };
    const sandAt = (x, z) => {
      if (layout === 'valley') return smooth(7, 4, Math.abs(x - pathX(z)));
      const low = smooth(4.4, 2.9, baseH(x, z));
      return low * smooth(0.36, 0.52, noise(x * 0.05 + 3, z * 0.1 + 7)) * smooth(-6, B - 6, z);
    };
    const height = (x, z) => Math.max(1.2, baseH(x, z) + (noise(x * 0.08, z * 0.08) - 0.5) * 1.8 - sandAt(x, z) * 0.6);

    // ---------- stones: the main one often stands out of the water
    const rocks = [];
    const anchorX = layout === 'island' ? peakX : layout === 'bank' ? bankX * 0.6 : flip * W * R(-0.25, 0.05);
    const anchorZ = layout === 'island' ? peakZ + 4 : layout === 'bank' ? bankZ + 6 : R(-6, 2);
    const tallMain = (layout === 'valley' || layout === 'flat') ? rand() < 0.75 : rand() < 0.2;
    rocks.push({ x: anchorX, z: anchorZ, s: [R(5, 7), tallMain ? R(20, 27) : R(11, 15), R(4, 5.5)], tilt: flip * R(0.08, 0.22) });
    rocks.push({ x: anchorX + flip * R(8, 12), z: anchorZ + R(2, 6), s: [R(3.5, 5), R(9, 15), R(3, 4.2)], tilt: flip * R(0.1, 0.3) });
    rocks.push({ x: anchorX - flip * R(7, 10), z: anchorZ + R(-1, 4), s: [R(2.6, 3.6), R(5, 9), R(2.5, 3.2)], tilt: -flip * R(0.05, 0.25) });
    for (let i = 0; i < 6; i++) { const sc = R(0.8, 2.0); rocks.push({ x: R(-A + 6, A - 6), z: R(-6, B - 5), s: [sc * R(1, 1.5), sc * R(1, 1.6), sc * R(0.9, 1.3)], tilt: R(-0.4, 0.4) }); }
    rocks.forEach((r) => { const p = pullInside(V(r.x, 0, r.z), 0.8); r.x = p.x; r.z = p.z; });
    const inRock = (x, z, pad = 0) => rocks.some((r) => ((x - r.x) / (r.s[0] * 0.85 + pad)) ** 2 + ((z - r.z) / (r.s[2] * 0.85 + pad)) ** 2 < 1);
    terrain = { height, inRock, layout, tone, woodStyle };

    const tri = new Builder(), lin = new Builder(), pts = new Builder();

    // ---------- substrate mesh, clipped to the tank's shape, + soil seen through the glass
    {
      const nx = 120, nz = 54, x0 = -A, z0 = -B, sx = (2 * A) / nx, sz = (2 * B) / nz;
      const Pt = (i, j) => { const p = pullInside(V(x0 + i * sx, 0, z0 + j * sz)); p.y = height(p.x, p.z); return p; };
      const Nrm = (p) => { const e = 0.5; return V(height(p.x - e, p.z) - height(p.x + e, p.z), 2 * e, height(p.x, p.z - e) - height(p.x, p.z + e)).normalize(); };
      const mat = (p) => (sandAt(p.x, p.z) > 0.5 ? M.sand : M.substrate);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const cx = x0 + (i + 0.5) * sx, cz = z0 + (j + 0.5) * sz;
        if (shapeNorm(cx, cz) > 1.03) continue;
        const a = Pt(i, j), b = Pt(i + 1, j), c = Pt(i, j + 1), d = Pt(i + 1, j + 1);
        [a, c, b, b, c, d].forEach((p) => tri.v(p, Nrm(p), mat(p)));
      }
      const N = 200;
      for (let k = 0; k < N; k++) {
        const a = boundary((k / N) * Math.PI * 2, 0.985), b = boundary(((k + 1) / N) * Math.PI * 2, 0.985);
        const n = V((a.x + b.x) / 2, 0, (a.z + b.z) / 2).normalize();
        const q = [V(a.x, 0, a.z), V(b.x, 0, b.z), V(a.x, height(a.x, a.z), a.z), V(b.x, height(b.x, b.z), b.z)];
        [q[0], q[1], q[2], q[2], q[1], q[3]].forEach((p) => tri.v(p, n, M.substrate));
      }
    }

    // ---------- stones
    const rockGeos = [];
    rocks.forEach((r, idx) => {
      const g = new T.IcosahedronGeometry(1, 2);
      const P = g.attributes.position, p = new T.Vector3(), off = idx * 13.7;
      for (let i = 0; i < P.count; i++) {
        p.fromBufferAttribute(P, i);
        const n = (noise(p.x * 1.3 + off, p.y * 1.3) + noise(p.y * 1.7 + off, p.z * 1.7) + noise(p.z * 1.1 + off, p.x * 1.1)) / 3;
        p.multiplyScalar(0.8 + n * 0.45);
        if (p.y < -0.25) p.y = -0.25 + (p.y + 0.25) * 0.3;
        P.setXYZ(i, p.x, p.y, p.z);
      }
      g.applyMatrix4(new T.Matrix4().compose(V(r.x, height(r.x, r.z) + r.s[1] * 0.1, r.z),
        new T.Quaternion().setFromEuler(new T.Euler(R(-0.1, 0.1), R(0, Math.PI * 2), r.tilt)), V(r.s[0], r.s[1] * 0.75, r.s[2])));
      g.computeVertexNormals();
      rockGeos.push(g);
      tri.mesh(g, M.rock);
    });

    // ---------- driftwood (found pieces)
    const woodGeos = [];
    const placeLog = () => {
      const s0 = pullInside(V(-flip * W * R(0.36, 0.44), 0, R(-10, -3)), 0.9);
      const x1 = flip * W * R(0.12, 0.3), z1 = R(-2, 8);
      const y0 = height(s0.x, s0.z) - 0.8, y1 = H + R(6, 12);
      const pts3 = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6, sag = Math.sin(u * Math.PI) * R(-1.5, 2.0);
        pts3.push(V(s0.x + (x1 - s0.x) * u + R(-0.8, 0.8), y0 + (y1 - y0) * Math.pow(u, 1.5) + sag, s0.z + (z1 - s0.z) * u + R(-1, 1)));
      }
      const main = new T.CatmullRomCurve3(pts3);
      woodGeos.push(tubeAlong(tri, lin, main, R(1.6, 2.1), R(0.55, 0.8)));
      const stubs = 3 + Math.floor(rand() * 3);
      for (let k = 0; k < stubs; k++) {
        const t = R(0.2, 0.9), p0 = main.getPointAt(t), tan = main.getTangentAt(t);
        const side = V(R(-1, 1), R(0.3, 1), R(-1, 1)).normalize();
        const dir = side.sub(tan.clone().multiplyScalar(side.dot(tan))).normalize();
        const long = k < 2 && rand() < 0.7, len = long ? R(7, 14) : R(2.5, 5);
        const mid = p0.clone().addScaledVector(dir, len * 0.5).add(V(R(-1, 1), R(-0.5, 1.5), R(-1, 1)));
        const end = p0.clone().addScaledVector(dir, len).add(V(R(-1.5, 1.5), long ? R(0, 4) : 0, R(-1.5, 1.5)));
        woodGeos.push(tubeAlong(tri, lin, new T.CatmullRomCurve3([p0, mid, end]), (1.8 - 1.1 * t) * R(0.35, 0.5), long ? 0.2 : R(0.35, 0.5)));
      }
      for (let k = 0; k < 3; k++) {
        const a = R(0, Math.PI * 2), p0 = main.getPointAt(0.02);
        const end = pullInside(V(p0.x + Math.cos(a) * R(3, 5), 0, p0.z + Math.sin(a) * R(2, 4))); end.y = height(end.x, end.z) - 1.2;
        woodGeos.push(tubeAlong(tri, lin, new T.CatmullRomCurve3([p0, p0.clone().lerp(end, 0.5).add(V(0, 0.8, 0)), end]), 0.9, 0.35));
      }
    };
    const placeSpider = (count, side) => {
      const k0 = pullInside(V(side * W * R(0.18, 0.32), 0, R(-8, 0)), 0.85);
      const knot = V(k0.x, height(k0.x, k0.z) + 0.5, k0.z);
      for (let k = 0; k < 4; k++) {
        const a = R(0, Math.PI * 2);
        const end = pullInside(V(knot.x + Math.cos(a) * R(2.5, 4.5), 0, knot.z + Math.sin(a) * R(2, 3.5))); end.y = height(end.x, end.z) - 0.6;
        woodGeos.push(tubeAlong(tri, lin, new T.CatmullRomCurve3([knot, knot.clone().lerp(end, 0.5).add(V(0, 0.6, 0)), end]), 1.2, 0.5));
      }
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + R(-0.3, 0.3);
        const out = V(Math.cos(a), 0, Math.sin(a) * 0.6);
        const h = H * R(0.6, 1.6);
        const p0 = knot.clone().add(V(R(-0.6, 0.6), R(0, 0.6), R(-0.6, 0.6)));
        const p1 = p0.clone().addScaledVector(out, R(2, 6)).add(V(0, h * R(0.15, 0.3), 0));
        const p2 = p1.clone().addScaledVector(out, R(4, 12)).add(V(R(-2, 2), h * R(0.25, 0.4), R(-2, 2)));
        const p3 = p2.clone().addScaledVector(out, R(2, 9)).add(V(R(-2, 2), h * R(0.15, 0.35) - (rand() < 0.25 ? 5 : 0), R(-2, 2)));
        [p1, p2].forEach((p) => pullInside(p, 0.95));
        woodGeos.push(tubeAlong(tri, lin, new T.CubicBezierCurve3(p0, p1, p2, p3), R(0.45, 0.7), 0.12));
      }
    };
    if (woodStyle === 'fallen log') placeLog();
    else if (woodStyle === 'spiderwood') placeSpider(Math.floor(R(12, 17)), flip);
    else if (woodStyle !== 'none') { placeLog(); placeSpider(Math.floor(R(7, 10)), -flip); }

    // ---------- moss
    const mossCands = [];
    const sampleMoss = (geos, perArea, upBias, delay) => {
      geos.forEach((g) => {
        g.computeBoundingSphere();
        const count = Math.round(perArea * g.boundingSphere.radius ** 1.4);
        const sampler = new T.MeshSurfaceSampler(new T.Mesh(g)).setRandomGenerator(rand).build();
        const p = new T.Vector3(), n = new T.Vector3();
        for (let placed = 0, tries = 0; placed < count && tries < count * 6; tries++) {
          sampler.sample(p, n);
          if (n.y < upBias && rand() > 0.04) continue;
          mossCands.push({ p: p.clone().addScaledVector(n, R(0.05, 0.3)), n: n.clone(), delay });
          placed++;
        }
      });
    };
    sampleMoss(rockGeos, 26, 0.45, 0);
    sampleMoss(woodGeos, 24, 0.15, 0.12);
    // moss also creeps over any ground that rises out of the water
    for (let i = 0; i < 2600; i++) {
      const x = R(-A, A), z = R(-B, B);
      if (!inside(x, z, 0.8)) continue;
      const hgt = height(x, z);
      if (hgt < waterRef - 3) continue;
      mossCands.push({ p: V(x, hgt + R(0.05, 0.4), z), n: UP, delay: 0.05 });
    }
    rocks.slice(0, 2).forEach((r) => {
      for (let i = 0; i < 140; i++) {
        const a = R(0, Math.PI * 2), rr = Math.pow(rand(), 0.7) * (Math.max(r.s[0], r.s[2]) + 4);
        const x = r.x + Math.cos(a) * rr, z = r.z + Math.sin(a) * rr;
        if (inRock(x, z, -0.3) || !inside(x, z, 0.5)) continue;
        mossCands.push({ p: V(x, height(x, z) + R(0.05, 0.4), z), n: UP, delay: 0.25 });
      }
    });
    const mossSeeds = [];
    for (let i = 0; i < 8 && mossCands.length; i++) mossSeeds.push(mossCands[Math.floor(rand() * mossCands.length)].p);
    mossCands.forEach((c) => {
      let d = Infinity; mossSeeds.forEach((s) => { d = Math.min(d, s.distanceTo(c.p)); });
      const b = clamp(d / 22 + c.delay + R(-0.04, 0.06), 0, 0.98);
      pts.v(c.p, c.n, M.moss, c.p.y > waterRef ? 0.02 : R(0.03, 0.1), R(0, 6.28), null, 0, b);
    });

    // ---------- epiphytes on wood and on emerged ground
    woodGeos.forEach((g) => {
      const sampler = new T.MeshSurfaceSampler(new T.Mesh(g)).setRandomGenerator(rand).build();
      const p = new T.Vector3(), n = new T.Vector3();
      const clusters = Math.round(R(1, 3));
      for (let c = 0; c < clusters; c++) {
        sampler.sample(p, n);
        if (n.y < 0.2) continue;
        addLeafCluster(p.clone(), p.y > waterRef - 1 ? R(0.35, 0.7) : R(0.15, 0.5));
      }
    });
    function addLeafCluster(base, b0) {
      const above = base.y > waterRef - 1, leaves = Math.floor(R(3, 7));
      for (let k = 0; k < leaves; k++) {
        const a = R(0, Math.PI * 2), len = R(1.2, 2.4), wid = len * 0.42;
        const dir = V(Math.cos(a), R(0.3, 0.9), Math.sin(a)).normalize();
        const tip = base.clone().addScaledVector(dir, len);
        const sideV = new T.Vector3().crossVectors(dir, UP).normalize().multiplyScalar(wid * 0.5);
        const mid = base.clone().addScaledVector(dir, len * 0.45);
        const quad = [base, mid.clone().add(sideV), tip, base, tip, mid.clone().sub(sideV)];
        const nrm = new T.Vector3().crossVectors(sideV, dir).normalize();
        const bk = clamp(b0 + k * 0.05, 0, 0.99);
        quad.forEach((q) => tri.v(q, nrm, M.leaf, above ? 0.03 : 0.12, a, null, 0, bk));
        leafPoints.push({ p: tip.clone(), b: bk });
      }
    }
    for (let i = 0; i < 40; i++) {
      const x = R(-A, A), z = R(-B, B);
      if (!inside(x, z, 1.5)) continue;
      const hgt = height(x, z);
      if (hgt > waterRef - 0.5 && rand() < 0.5) addLeafCluster(V(x, hgt, z), R(0.25, 0.8));
    }

    // ---------- stem plants: they reach the surface fast in a shallow tank, then arch over
    const groups = 4 + Math.floor(rand() * 2), redGroup = Math.floor(rand() * groups);
    for (let gi = 0; gi < groups; gi++) {
      const g0 = pullInside(V(-A + 7 + (gi + R(-0.3, 0.3)) * ((2 * A - 14) / (groups - 1)), 0, R(-B + 3, -B + 11)), 0.88);
      const gx = g0.x, gz = g0.z;
      const isRed = gi === redGroup, edge = Math.abs(gx) / A;
      const tall = (16 + 16 * (0.3 + 0.7 * edge)) * R(0.85, 1.1);
      const count = Math.floor(R(9, 15)), groupPhase = R(0, 6.28);
      const leafLen = isRed ? R(0.6, 0.9) : R(0.9, 1.5);
      for (let s = 0; s < count; s++) {
        const b0 = pullInside(V(gx + gauss() * 2.8, 0, gz + gauss() * 1.8), 0.93);
        const hgt = tall * R(0.65, 1.05), segs = 14;
        const lean = V(R(-0.12, 0.12) + (b0.x - gx) * 0.02, 1, R(-0.05, 0.12)).normalize();
        const phase = groupPhase + R(0, 0.7);
        const stemPts = [];
        let cur = V(b0.x, height(b0.x, b0.z) - 0.3, b0.z);
        for (let i = 0; i <= segs; i++) {
          stemPts.push(cur.clone());
          const d = lean.clone().add(V(R(-0.06, 0.06), 0, R(-0.06, 0.06)));
          if (cur.y > waterRef + 0.5) d.add(V(lean.x * 2.5 + Math.sign(gx || 1) * 0.3, -0.35, 0.25));
          cur = cur.clone().addScaledVector(d.normalize(), hgt / segs);
        }
        const birthAt = (i) => clamp(0.02 + 0.93 * Math.pow(i / segs, 1.2) * (hgt / 32), 0, 0.97);
        const swayW = (i) => Math.pow(i / segs, 1.4) * 1.1;
        const matAt = (i) => (isRed && i / segs > 0.5 ? M.stemRed : M.stem);
        for (let i = 0; i < segs; i++) lin.line(stemPts[i], stemPts[i + 1], matAt(i), swayW(i), swayW(i + 1), phase, birthAt(i), birthAt(i + 1));
        for (let i = 2; i <= segs; i++) {
          const node = stemPts[i], rot = i * Math.PI / 2 + R(-0.3, 0.3);
          const emersed = node.y > waterRef;
          const ll = leafLen * (1 - 0.3 * (i / segs)) * (emersed ? 0.75 : 1);
          const bl = clamp(birthAt(i) + 0.025, 0, 0.99);
          for (const sgn of [1, -1]) {
            const dir = V(Math.cos(rot) * sgn, emersed ? R(0, 0.3) : R(-0.35, 0.1), Math.sin(rot) * sgn).normalize();
            lin.line(node, node.clone().addScaledVector(dir, ll), matAt(i), swayW(i), swayW(i) + 0.05, phase, bl, bl + 0.01);
          }
          if (i % 3 === 0) leafPoints.push({ p: node.clone(), b: bl });
        }
      }
    }

    // ---------- crypt rosettes against the stones
    const spots = [V(rocks[0].x + flip * (rocks[0].s[0] * 0.9), 0, rocks[0].z + R(1, 3)), V(rocks[1].x - flip * 3, 0, rocks[1].z + R(1, 3))];
    spots.forEach((c, si) => {
      pullInside(c, 0.9);
      const base = V(c.x, height(c.x, c.z) - 0.2, c.z);
      const leaves = Math.floor(R(8, 13)), phase = R(0, 6.28);
      for (let k = 0; k < leaves; k++) {
        const a = (k / leaves) * Math.PI * 2 + R(-0.3, 0.3), L = R(3, 6);
        const b0 = clamp(0.03 + (k / leaves) * 0.55 + si * 0.05, 0, 0.9);
        const lp = [];
        for (let s = 0; s <= 5; s++) { const u = s / 5; lp.push(V(base.x + Math.cos(a) * u * L * 0.55, base.y + Math.sin(u * Math.PI * 0.75) * L * 0.6, base.z + Math.sin(a) * u * L * 0.45)); }
        for (let s = 0; s < 5; s++) lin.line(lp[s], lp[s + 1], M.crypt, (s / 5) * 0.55, ((s + 1) / 5) * 0.55, phase + k * 0.2, b0 + s * 0.02, b0 + (s + 1) * 0.02);
        leafPoints.push({ p: lp[4].clone(), b: b0 + 0.08 });
      }
    });

    // ---------- carpet: fills in from dense clumps outward (also on emerged ground)
    for (let i = 0; i < 15000; i++) {
      const x = R(-A, A), z = R(-B * 0.2, B);
      if (!inside(x, z, 0.6)) continue;
      const clump = noise(x * 0.15 + 11, z * 0.22 + 5);
      if (clump < 0.3 || inRock(x, z, 0.2)) continue;
      if (sandAt(x, z) > 0.5 && rand() > 0.12) continue;
      const birth = clamp((0.66 - clump) / 0.36, 0, 1) * 0.88 + R(0, 0.08);
      const base = V(x, height(x, z) - 0.1, z);
      const hgt = R(0.45, 1.0) + (clump - 0.3) * 1.4;
      const bend = V(R(-0.35, 0.35), 1, R(-0.35, 0.35)).normalize();
      const mid = base.clone().addScaledVector(bend, hgt * 0.55);
      const tip = mid.clone().addScaledVector(bend.add(V(R(-0.25, 0.25), 0, R(-0.25, 0.25))).normalize(), hgt * 0.45);
      const ph = clump * 9 + R(0, 0.6);
      lin.line(base, mid, M.grass, 0, 0.12, ph, birth, birth + 0.02);
      lin.line(mid, tip, M.grass, 0.12, 0.3, ph, birth + 0.02, birth + 0.05);
    }
    rocks.slice(0, 3).forEach((r, ri) => {
      const ang = R(0, Math.PI * 2);
      const cx = r.x + Math.cos(ang) * (r.s[0] * 0.9 + 1), cz = r.z + Math.abs(Math.sin(ang)) * (r.s[2] * 0.9 + 1);
      const ph = R(0, 6.28);
      for (let b = 0; b < 22; b++) {
        const x = cx + gauss() * 1.6, z = cz + gauss() * 1.1;
        if (inRock(x, z) || !inside(x, z, 0.6)) continue;
        const base = V(x, height(x, z) - 0.1, z), hgt = R(2.5, 5), b0 = clamp(0.05 + ri * 0.12 + b * 0.012, 0, 0.9);
        const dir = V(R(-0.25, 0.25), 1, R(-0.25, 0.25)).normalize();
        const mid = base.clone().addScaledVector(dir, hgt * 0.5);
        const tip = mid.clone().addScaledVector(dir.add(V(R(-0.3, 0.3), 0, R(-0.2, 0.2))).normalize(), hgt * 0.5);
        lin.line(base, mid, M.grass, 0, 0.2, ph + R(0, 0.5), b0, b0 + 0.05);
        lin.line(mid, tip, M.grass, 0.2, 0.5, ph + R(0, 0.5), b0 + 0.05, b0 + 0.12);
      }
    });

    // ---------- motes
    for (let i = 0; i < 120; i++) {
      const p = pullInside(V(R(-A, A), R(0, H), R(-B, B)), 0.9);
      pts.v(p, UP, M.mote, 0, R(0, 100), null, R(0.25, 0.65));
    }

    // ---------- maybe a found object: ~1 in 13 for each common one, ~1 in 70 rare, ~1 in 130 kitsch, ~1 in 570 ultra
    let foundType = null;
    if (rand() < 0.35) {
      const r = rand();
      foundType = pick(FOUND[r < 0.005 ? 'ultra' : r < 0.05 ? 'kitsch' : r < 0.38 ? 'rare' : 'common']);
    }
    const foundSeed = Math.floor(rand() * 1e9);

    // ---------- glass: rim + base outline, verticals at the corners or sides
    {
      const N = 160;
      for (let k = 0; k < N; k++) {
        const a = boundary((k / N) * Math.PI * 2), b = boundary(((k + 1) / N) * Math.PI * 2);
        lin.line(V(a.x, 0, a.z), V(b.x, 0, b.z), M.glass, 0, 0, 0);
        lin.line(V(a.x, H, a.z), V(b.x, H, b.z), M.glass, 0, 0, 0);
      }
      const verts = shape.n > 3 ? [0.25, 0.75, 1.25, 1.75].map((k) => k * Math.PI) : [0, Math.PI];
      verts.forEach((th) => { const p = boundary(th); lin.line(V(p.x, 0, p.z), V(p.x, H, p.z), M.glass, 0, 0, 0); });
    }

    // ---------- base: a mellow light slab following the tank's shape
    {
      const N = 160, top = -0.05, bot = -2.6, s = 1.07;
      for (let k = 0; k < N; k++) {
        const a = boundary((k / N) * Math.PI * 2, s), b = boundary(((k + 1) / N) * Math.PI * 2, s);
        [V(0, top, 0), V(a.x, top, a.z), V(b.x, top, b.z)].forEach((p) => tri.v(p, UP, M.base));
        const n = V((a.x + b.x) / 2, 0, (a.z + b.z) / 2).normalize();
        const q = [V(a.x, bot, a.z), V(b.x, bot, b.z), V(a.x, top, a.z), V(b.x, top, b.z)];
        [q[0], q[1], q[2], q[2], q[1], q[3]].forEach((p) => tri.v(p, n, M.base));
      }
      // underglow pool
      const gb = new Builder();
      const rings = 10;
      for (let r = 0; r < rings; r++) for (let k = 0; k < N; k++) {
        const s0 = 1.0 + r * 0.09, s1 = 1.0 + (r + 1) * 0.09;
        const a0 = boundary((k / N) * Math.PI * 2, s0), b0 = boundary(((k + 1) / N) * Math.PI * 2, s0);
        const a1 = boundary((k / N) * Math.PI * 2, s1), b1 = boundary(((k + 1) / N) * Math.PI * 2, s1);
        const l0 = Math.pow(1 - r / rings, 1.6) * 0.95, l1 = Math.pow(1 - (r + 1) / rings, 1.6) * 0.95;
        const y = bot - 0.05;
        [[a0, l0], [a1, l1], [b0, l0], [b0, l0], [a1, l1], [b1, l1]].forEach(([p, l]) => gb.v(V(p.x, y, p.z), UP, M.glow, 0, 0, null, Math.max(0.001, l)));
      }
      // the ground shadow's canvas: a wide flat disc just under the light pool
      {
        const sb = new Builder(), R0 = 3.2, y = bot - 0.12;
        for (let k = 0; k < N; k++) {
          const a = boundary((k / N) * Math.PI * 2, R0), b = boundary(((k + 1) % N / N) * Math.PI * 2, R0);
          [V(0, y, 0), V(a.x, y, a.z), V(b.x, y, b.z)].forEach((p) => sb.v(p, UP, M.shade, 0, 0, null, 0.5));
        }
        const shadeMesh = new T.Mesh(sb.build(), sceneMat); shadeMesh.frustumCulled = false; world.add(shadeMesh);
      }
      // the base light: off unless you click the base
      glowMesh = new T.Mesh(gb.build(), sceneMat);
      glowMesh.frustumCulled = false; glowMesh.visible = false;
      world.add(glowMesh);
    }

    const triMesh = new T.Mesh(tri.build(), sceneMat);
    const linMesh = new T.LineSegments(lin.build(), sceneLineMat);
    const ptsMesh = new T.Points(pts.build(), sceneMat);
    [triMesh, linMesh, ptsMesh].forEach((o) => { o.frustumCulled = false; world.add(o); });

    // water volume: walls following the shape (only the far walls render)
    {
      const N = 200, P = [], Nn = [];
      for (let k = 0; k < N; k++) {
        const a = boundary((k / N) * Math.PI * 2, 0.995), b = boundary(((k + 1) / N) * Math.PI * 2, 0.995);
        const n = V(b.z - a.z, 0, -(b.x - a.x)).normalize();
        if (n.dot(V(a.x + b.x, 0, a.z + b.z)) < 0) n.negate();
        P.push(a.x, 0, a.z, a.x, H, a.z, b.x, 0, b.z, b.x, 0, b.z, a.x, H, a.z, b.x, H, b.z);
        for (let q = 0; q < 6; q++) Nn.push(n.x, 0, n.z);
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3));
      const wm = new T.Mesh(g, waterMat); wm.frustumCulled = false;
      world.add(wm);
    }
    const surf = new T.Mesh(new T.PlaneGeometry(2 * A, 2 * B, 120, 54).rotateX(-Math.PI / 2), surfaceMat);
    surf.frustumCulled = false; world.add(surf);
    {
      const lp = [], N = 200;
      for (let k = 0; k < N; k++) { const a = boundary((k / N) * Math.PI * 2, 0.995), b = boundary(((k + 1) / N) * Math.PI * 2, 0.995); lp.push(a, b); }
      const wl = new T.LineSegments(new T.BufferGeometry().setFromPoints(lp), lineMat);
      wl.frustumCulled = false; world.add(wl);
    }
    world.add(dynPoints); world.add(fishGroup); world.add(itemGroup);
    world.add(makeHaze());
    world.add(propGroup);
    placeFound(foundType, mulberry32(foundSeed));
    bubbles.length = 0;
    // tank bounds for edge taps
    tankBox.A = A; tankBox.B = B;
    syncFish();
  }

  // ================================================================ found objects (geometry)
  const itemGeoCache = {};
  function itemGeometry(type) {
    if (itemGeoCache[type]) return itemGeoCache[type];
    const b = new Builder();
    const sph = (r, d = 2) => new T.IcosahedronGeometry(r, d);
    if (type === 'conch') {
      // a queen conch lying on its side: pointed spire with spiral ridges, knobbed shoulder, flared pink lip
      const prof = [[0.02, -4.4], [0.3, -3.8], [0.75, -2.8], [1.4, -1.6], [2.0, -0.4], [2.35, 0.6], [2.2, 1.15], [1.5, 1.6], [1.1, 2.1], [0.75, 2.7], [0.45, 3.3], [0.2, 3.9], [0.02, 4.3]]
        .map(([r, y]) => new T.Vector2(r, y));
      const lathe = new T.LatheGeometry(prof, 28);
      const P = lathe.attributes.position, q = new T.Vector3();
      for (let i = 0; i < P.count; i++) {
        q.fromBufferAttribute(P, i);
        const th = Math.atan2(q.z, q.x), k = q.y > 1.2 ? 1 + 0.09 * Math.sin(q.y * 7.0 - th) : 1;
        P.setXYZ(i, q.x * k, q.y, q.z * k);
      }
      lathe.computeVertexNormals();
      const nz = makeNoise(mulberry32(7));
      part(b, lathe, M.shell, V(0, 2.0, 0), [0, 0, Math.PI / 2], [1, 1, 1], (p) => (nz(p.x * 0.9 + 3, p.y * 0.9 + p.z * 0.5) > 0.62 ? M.cowrie : M.shell));
      for (let k = 0; k < 7; k++) {
        const a = -0.9 + (k / 6) * 2.6;
        part(b, new T.ConeGeometry(0.34, 1.1, 6), M.shell, V(-0.9, 2.0 + 2.4 * Math.cos(a), 2.4 * Math.sin(a)), [a, 0, 0.35]);
      }
      part(b, sph(1, 2), M.shellPink, V(0.7, 2.3, 1.95), [-0.5, 0, 0.15], [3.3, 2.2, 0.35]);
    } else if (type === 'diver') {
      // the classic bubbling deep-sea diver ornament
      [-0.55, 0.55].forEach((x) => {
        part(b, new T.BoxGeometry(0.9, 0.6, 1.3), M.floppy, V(x, 0.3, 0.15));
        part(b, new T.CylinderGeometry(0.42, 0.38, 2.2, 10), M.diverSuit, V(x, 1.7, 0));
      });
      part(b, sph(1, 2), M.diverSuit, V(0, 3.7, 0), [0, 0, 0], [1.25, 1.55, 0.95]);
      part(b, new T.CylinderGeometry(1.22, 1.22, 0.35, 16), M.glassDark, V(0, 2.75, 0));
      [-1, 1].forEach((sgn) => {
        part(b, new T.CylinderGeometry(0.32, 0.3, 2.0, 8), M.diverSuit, V(sgn * 1.45, 3.55, 0.2), [0, 0, sgn * 0.35]);
        part(b, sph(0.38, 1), M.glassDark, V(sgn * 1.78, 2.55, 0.35));
        part(b, new T.CylinderGeometry(0.38, 0.38, 0.22, 14), M.glassDark, V(sgn * 1.18, 6.2, 0), [0, 0, Math.PI / 2]);
      });
      part(b, sph(1, 2), M.brass, V(0, 5.0, 0), [0, 0, 0], [1.35, 0.55, 1.05]);
      part(b, sph(1.25, 2), M.brass, V(0, 6.2, 0));
      part(b, new T.CylinderGeometry(0.58, 0.58, 0.3, 18), M.glassDark, V(0, 6.12, 1.14), [Math.PI / 2, 0, 0]);
      part(b, new T.TorusGeometry(0.6, 0.12, 6, 18), M.brass, V(0, 6.12, 1.28));
      part(b, new T.CylinderGeometry(0.18, 0.18, 0.55, 8), M.brass, V(0, 7.6, 0));
    } else if (type === 'chest') {
      // a treasure chest, lid propped open, a heap of coins
      part(b, new T.BoxGeometry(4.4, 2.2, 2.8), M.wood, V(0, 1.1, 0));
      [-1.6, 1.6].forEach((x) => part(b, new T.BoxGeometry(0.3, 2.3, 2.9), M.brass, V(x, 1.12, 0)));
      part(b, new T.BoxGeometry(0.6, 0.7, 0.2), M.brass, V(0, 1.75, 1.45));
      part(b, sph(1, 2), M.brass, V(0, 2.25, 0.1), [0, 0, 0], [1.8, 0.45, 1.1]);
      for (let k = 0; k < 6; k++) part(b, new T.CylinderGeometry(0.34, 0.34, 0.08, 10), M.brass, V(-1.2 + k * 0.5, 2.55 + (k % 2) * 0.12, 0.3 + (k % 3) * 0.2), [0.3 * (k % 2), 0, 0.2]);
    } else if (type === 'chestLid') {
      // built around the hinge (back top edge of the chest), closed
      part(b, new T.CylinderGeometry(1.4, 1.4, 4.4, 14, 1, false, 0, Math.PI), M.wood, V(0, 0, 1.4), [0, 0, Math.PI / 2], [0.7, 1, 1]);
      [-1.6, 1.6].forEach((x) => part(b, new T.CylinderGeometry(1.45, 1.45, 0.3, 14, 1, false, 0, Math.PI), M.brass, V(x, 0, 1.4), [0, 0, Math.PI / 2], [0.72, 1, 1]));
      part(b, new T.BoxGeometry(0.6, 0.5, 0.2), M.brass, V(0, 0.15, 2.82));
    } else if (type === 'floppy') {
      // a 3.5" floppy disk, leaning back in the sand
      part(b, new T.BoxGeometry(4.6, 4.6, 0.28), M.floppy, V(0, 2.3, 0));
      part(b, new T.BoxGeometry(2.6, 1.6, 0.32), M.usbMetal, V(0.25, 3.8, 0));
      part(b, new T.BoxGeometry(3.6, 2.3, 0.32), M.paper, V(0, 1.35, 0));
    } else if (type === 'boat') {
      // a folded paper boat
      const L = 2.8, l = 1.6, h = 1.3, w = 0.9, top = h + 2.4;
      const tri3 = (a, c, d) => { const n = new T.Vector3().crossVectors(c.clone().sub(a), d.clone().sub(a)).normalize(); [a, c, d].forEach((p) => b.v(p, n, M.paper)); };
      for (const z of [w, -w]) { const A = V(-l, 0, 0), B2 = V(l, 0, 0), C = V(L, h, z), D = V(-L, h, z); tri3(A, B2, C); tri3(A, C, D); }
      tri3(V(-l, 0, 0), V(-L, h, w), V(-L, h, -w)); tri3(V(l, 0, 0), V(L, h, -w), V(L, h, w));
      tri3(V(-1.5, h, 0.05), V(1.5, h, 0.05), V(0, top, 0.05)); tri3(V(-1.5, h, -0.05), V(0, top, -0.05), V(1.5, h, -0.05));
    } else if (type === 'mason') {
      // square and compasses with a G, in brass, standing in the sand
      const bar = (x0, y0, x1, y1, wd) => { const dx = x1 - x0, dy = y1 - y0; part(b, new T.BoxGeometry(Math.hypot(dx, dy), wd, 0.3), M.masonBrass, V((x0 + x1) / 2, (y0 + y1) / 2, 0), [0, 0, Math.atan2(dy, dx)]); };
      bar(0, 5.6, -2.9, 0.6, 0.55); bar(0, 5.6, 2.9, 0.6, 0.55);
      part(b, new T.CylinderGeometry(0.55, 0.55, 0.34, 18), M.masonBrass, V(0, 5.7, 0), [Math.PI / 2, 0, 0]);
      bar(0, 0.9, -3.1, 4.0, 0.7); bar(0, 0.9, 3.1, 4.0, 0.7);
      part(b, new T.TorusGeometry(0.85, 0.28, 6, 22, Math.PI * 1.6), M.masonBrass, V(0, 3.05, 0.05), [0, 0, Math.PI * 0.2]);
      bar(0.2, 2.95, 0.95, 2.95, 0.4);
    } else if (type === 'duck') {
      part(b, sph(1, 2), M.duck, V(0, 1.1, 0), [0, 0, 0], [2.1, 1.3, 1.5]);
      part(b, sph(1, 2), M.duck, V(1.3, 2.6, 0), [0, 0, 0], [0.95, 0.95, 0.95]);
      part(b, sph(1, 1), M.duck, V(-1.9, 1.9, 0), [0, 0, 0.6], [0.6, 0.35, 0.6]);
      part(b, sph(1, 1), M.beak, V(2.25, 2.45, 0), [0, 0, 0], [0.55, 0.22, 0.45]);
    } else if (type === 'ipod') {
      part(b, new T.BoxGeometry(3.8, 0.9, 6.1), M.ipod, V(0, 0.45, 0));
      part(b, new T.BoxGeometry(2.8, 0.1, 2.0), M.ipodScreen, V(0, 0.92, -1.6));
      part(b, new T.CylinderGeometry(1.3, 1.3, 0.12, 20), M.ipodWheel, V(0, 0.93, 1.15));
      part(b, new T.CylinderGeometry(0.45, 0.45, 0.16, 14), M.ipod, V(0, 0.96, 1.15));
    } else if (type === 'sanddollar') {
      part(b, new T.CylinderGeometry(1.7, 1.8, 0.35, 22), M.sanddollar, V(0, 0.18, 0));
    } else if (type === 'cowrie') {
      part(b, sph(1, 2), M.cowrie, V(0, 0.45, 0), [0, 0, 0], [1.1, 0.55, 0.75]);
    } else if (type === 'pebbles') {
      part(b, sph(0.7, 1), M.pebble, V(-0.9, 0.35, 0.2), [0, 0, 0], [1.2, 0.6, 1]);
      part(b, sph(0.55, 1), M.pebble, V(0.5, 0.3, -0.4), [0, 0, 0], [1.1, 0.7, 1]);
      part(b, sph(0.5, 1), M.pebble, V(0.4, 0.28, 0.8), [0, 0, 0], [1, 0.6, 1.2]);
    } else if (type === 'key') {
      part(b, new T.TorusGeometry(0.75, 0.2, 6, 16), M.brass, V(-1.6, 0.2, 0), [Math.PI / 2, 0, 0]);
      part(b, new T.BoxGeometry(2.6, 0.22, 0.3), M.brass, V(0.35, 0.15, 0));
      part(b, new T.BoxGeometry(0.25, 0.22, 0.6), M.brass, V(1.2, 0.15, 0.35));
      part(b, new T.BoxGeometry(0.25, 0.22, 0.45), M.brass, V(1.55, 0.15, 0.28));
    } else if (type === 'bracelet') {
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; part(b, sph(0.36, 1), i % 2 ? M.beadA : M.beadB, V(Math.cos(a) * 1.7, 0.36, Math.sin(a) * 1.7)); }
    } else if (type === 'ticket') {
      part(b, new T.BoxGeometry(3.4, 0.08, 1.7), M.ticket, V(0, 0.05, 0), [0.05, 0, 0.04]);
    } else if (type === 'usb') {
      part(b, new T.BoxGeometry(2.6, 0.55, 1.0), M.usb, V(0, 0.28, 0));
      part(b, new T.BoxGeometry(1.0, 0.4, 0.8), M.usbMetal, V(1.75, 0.25, 0));
    }
    return (itemGeoCache[type] = b.build());
  }

  const itemGroup = new T.Group();
  let found = null;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const lerp = (a, b, u) => a + (b - a) * u;

  // ---- the efrain.fm CD: a disc with a printed face and a rainbow data side
  const CD_VERT = /* glsl */`
    varying vec2 vUv; varying vec3 vW; varying vec3 vN;
    void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }
  `;
  const CD_FRAG = /* glsl */`
    uniform sampler2D uLabel; uniform float uTime, uWater, uLight; uniform vec3 uLightDir;
    varying vec2 vUv; varying vec3 vW; varying vec3 vN;
    ${COMMON}
    ${TRANS_GLSL}
    void main() {
      ${TRANS_HAZE}
      vec2 c = vUv - 0.5; float r = length(c) * 2.0;
      if (r > 1.0 || r < 0.15) discard;
      vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
      float diff = max(dot(N, normalize(uLightDir)), 0.0);
      float m; float lum = 0.5 + 0.45 * diff;
      if (gl_FrontFacing) {
        float a = texture2D(uLabel, vUv).a;
        if (a > 0.45) { m = ${M.cdInk}.0; lum = 0.6; }
        else if (r > 0.93) m = ${M.cdA}.0;
        else if (r < 0.3) m = ${M.cdB}.0;
        else m = ${M.cdFace}.0;
      } else {
        float h = fract(atan(c.y, c.x) / 6.2832 * 2.0 + r * 0.8 + dot(N, vec3(0.4, 0.3, 0.6)) * 0.5);
        m = h < 0.33 ? ${M.cdA}.0 : h < 0.66 ? ${M.cdB}.0 : ${M.cdC}.0;
        lum += 0.12;
      }
      bool under = vW.y < uWater;
      float depthN = clamp((uWater - vW.y) / max(uWater, 1.0), 0.0, 1.0);
      if (under) lum *= 1.0 - depthN * 0.15;
      lum *= uLight;
      gl_FragColor = vec4(clamp(lum, 0.0, 1.0), m / 63.0, under ? 0.1 + 0.9 * depthN : 0.0, 0.0);
    }
  `;
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = labelCanvas.height = 512;
  const labelTex = new T.CanvasTexture(labelCanvas);
  function drawCdLabel() {
    const c = labelCanvas.getContext('2d');
    c.clearRect(0, 0, 512, 512); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 76px ${FONT_UI}`; c.fillText('efrain.fm', 256, 170);
    labelTex.needsUpdate = true;
  }
  const cdMat = new T.ShaderMaterial({
    uniforms: { uLabel: { value: labelTex }, uTrans: U.uTrans, uTime: U.uTime, uWater: U.uWater, uLight: U.uLight, uLightDir: U.uLightDir, uRip: U.uRip, uShape: U.uShape, uShapePh: U.uShapePh },
    vertexShader: CD_VERT, fragmentShader: CD_FRAG, side: T.DoubleSide,
  });

  function placeFound(type, rnd = Math.random) {
    if (found) { itemGroup.remove(found.root); found = null; }
    if (terrain) terrain.item = type || null;
    updateFindLabel();
    if (!type || !terrain) return;
    const root = new T.Group(), sc = ITEM_SCALE[type] || 1.5;
    let lid = null;
    if (type === 'cd') { const disc = new T.Mesh(new T.CircleGeometry(2.4, 48), cdMat); disc.position.y = 2.4 * 0.78; root.add(disc); }
    else root.add(new T.Mesh(itemGeometry(type), sceneMat));
    if (type === 'chest') { lid = new T.Group(); lid.position.set(0, 2.2, -1.4); lid.rotation.x = -0.6; lid.add(new T.Mesh(itemGeometry('chestLid'), sceneMat)); root.add(lid); }
    root.traverse((o) => { o.frustumCulled = false; });
    root.rotation.order = 'YXZ';
    root.scale.setScalar(sc);
    const floats = type in FLOAT_DRAFT, upright = type in UPRIGHT_LEAN;
    let x = 0, z = shape.b * 0.3;
    for (let i = 0; i < 60; i++) {
      const cx = (rnd() - 0.5) * 2 * shape.a * 0.62, cz = rnd() * shape.b * 0.55;
      if (!inside(cx, cz, 6) || terrain.inRock(cx, cz, 2.2)) continue;
      if (!floats && terrain.height(cx, cz) > U.uWater.value - 1.5 - (ITEM_HEIGHT[type] || 2) * sc) continue;
      x = cx; z = cz; break;
    }
    const ry = upright ? (rnd() - 0.5) * 0.6 : rnd() * 6.28;
    root.rotation.set(upright ? UPRIGHT_LEAN[type] : 0, ry, 0);
    const sink = type === 'mason' || type === 'floppy' ? 0.55 : type === 'cd' ? 0.5 : 0.15;
    root.position.set(x, floats ? U.uWater.value - FLOAT_DRAFT[type] : terrain.height(x, z) - sink, z);
    itemGroup.add(root);
    found = { type, root, lid, x, z, floats, ry, sc, vx: 0, vz: 0, bob: rnd() * 6, next: 1 + rnd() * 2, anim: null,
              rest: { pos: root.position.clone(), rot: root.rotation.clone() } };
  }

  // lift an item, turn it toward the viewer, hold, then put it back exactly where it was
  function presentPose(o, a, { lift, tiltX, rise = 0.7, hold, back = 0.8 }) {
    const az = T.MathUtils.degToRad(state.az), rr = o.rest.rot;
    let dy = Math.atan2(Math.sin(az - rr.y), Math.cos(az - rr.y));
    let u;
    if (a.t < rise) u = ease(a.t / rise);
    else if (a.t < rise + hold) u = 1;
    else if (a.t < rise + hold + back) u = 1 - ease((a.t - rise - hold) / back);
    else { o.root.position.copy(o.rest.pos); o.root.rotation.copy(rr); o.anim = null; return -1; }
    o.root.position.copy(o.rest.pos); o.root.position.y += lift * u + (u === 1 ? Math.sin((a.t - rise) * 2.2) * 0.25 : 0);
    o.root.rotation.set(lerp(rr.x, tiltX, u), rr.y + dy * u, 0);
    return a.t < rise ? 0 : a.t < rise + hold ? 1 : 2;
  }
  // the CD rises out of the water, turns to face you so you can read it, then sinks back
  function presentCd(o, a, t, water) {
    const T1 = 1.3, T2 = T1 + 3.8, T3 = T2 + 1.6, big = 4.4;
    const az = T.MathUtils.degToRad(state.az), d = shape.b + 9;
    const up = V(Math.sin(az) * d, TANK.h * 0.55, Math.cos(az) * d);
    const rp = o.rest.pos, rr = o.rest.rot;
    let pos, sc, rx, ry;
    if (a.t < T1) {
      const u = ease(a.t / T1);
      pos = rp.clone().lerp(up, u); pos.y += Math.sin(u * Math.PI) * 4;
      sc = lerp(o.sc, big, u); rx = lerp(rr.x, 0, u); ry = lerp(rr.y, az, u) + (1 - u) * Math.PI * 2;
      if (!a.out && pos.y > water) { a.out = true; addRipple(pos.x, pos.z, 1.0, t); splash(pos.x, water, pos.z, 16); }
    } else if (a.t < T2) {
      pos = up.clone(); pos.y += Math.sin((a.t - T1) * 1.6) * 0.4;
      sc = big; rx = 0; ry = az + Math.sin((a.t - T1) * 1.2) * 0.1;
      if (Math.random() < 0.3) sparkle(pos.x, pos.y + 2.4 * big * 0.78, pos.z, 1, 2.4 * big);
    } else if (a.t < T3) {
      const u = ease((a.t - T2) / (T3 - T2));
      pos = up.clone().lerp(rp, u); pos.y += Math.sin(u * Math.PI) * 3;
      sc = lerp(big, o.sc, u); rx = lerp(0, rr.x, u); ry = lerp(az, rr.y, u) - u * Math.PI * 2;
      if (!a.inn && pos.y < water) { a.inn = true; addRipple(pos.x, pos.z, 1.2, t); splash(pos.x, water, pos.z, 18); }
    } else { pos = rp.clone(); sc = o.sc; rx = rr.x; ry = rr.y; o.anim = null; }
    o.root.position.copy(pos); o.root.scale.setScalar(sc); o.root.rotation.set(rx, ry, 0);
  }

  // floaters ride the real water level and drift; the diver and chest breathe bubbles; everything reacts to a click
  function updateFound(dt, t) {
    U.uFlash.value *= Math.exp(-dt * 3);
    U.uMGlow.value = Math.max(0, U.uMGlow.value - dt * 0.4);
    if (!found) return;
    const o = found, water = U.uWater.value, a = o.anim;
    if (a) a.t += dt;
    if (o.floats) {
      const f = U.uFlow.value;
      o.vx += ((Math.random() - 0.5) * 0.8 + f.x * f.z * 1.2 - o.vx * 0.35) * dt;
      o.vz += ((Math.random() - 0.5) * 0.8 + f.y * f.z * 1.2 - o.vz * 0.35) * dt;
      o.x += o.vx * dt; o.z += o.vz * dt;
      if (!inside(o.x, o.z, 5)) { o.vx *= -0.6; o.vz *= -0.6; const p = pullInside(V(o.x, 0, o.z), 0.85); o.x = p.x; o.z = p.z; }
      let hop = 0, spin = 0;
      if (a) {
        const u = Math.min(1, a.t / 1.3);
        hop = Math.sin(u * Math.PI) * (o.type === 'duck' ? 2.6 : 1.2);
        spin = ease(u) * Math.PI * 2;
        if (!a.start) { a.start = true; addRipple(o.x, o.z, 0.7, t); splash(o.x, water, o.z, 8); }
        if (u >= 1) { addRipple(o.x, o.z, 0.9, t); splash(o.x, water, o.z, 12); o.ry += Math.PI * 2; o.anim = null; }
      }
      o.root.position.set(o.x, water - FLOAT_DRAFT[o.type] + Math.sin(t * 1.2 + o.bob) * 0.1 + hop, o.z);
      o.root.rotation.set(Math.sin(t * 0.7 + o.bob) * 0.04, o.ry + Math.sin(t * 0.04 + o.bob) * 0.9 + spin, Math.sin(t * 0.9 + o.bob) * 0.05 + (a ? Math.sin(a.t * 9) * 0.1 : 0));
      return;
    }
    o.next -= dt;
    if (o.type === 'diver' && o.next <= 0) {
      const p = o.root.localToWorld(V(0, 7.9, 0));
      bubbles.push({ x: p.x, z: p.z, y: p.y, vy: 1.6, size: 0.35, ph: Math.random() * 6 });
      if (Math.random() < 0.35) bubbles.push({ x: p.x + 0.2, z: p.z, y: p.y - 0.4, vy: 1.6, size: 0.2, ph: Math.random() * 6 });
      o.next = 0.5 + Math.random() * 0.45;
    }
    if (o.type === 'chest' && o.next <= 0 && !a) {
      const p = o.root.localToWorld(V(0, 2.8, 0.4));
      for (let k = 0; k < 7; k++) bubbles.push({ x: p.x + (Math.random() - 0.5) * 2, z: p.z + (Math.random() - 0.5), y: p.y, vy: 1.2 + Math.random(), size: 0.25 + Math.random() * 0.4, ph: Math.random() * 6 });
      o.next = 7 + Math.random() * 8;
    }
    if (!a) return;
    const k = o.type;
    if (k === 'ipod') {                     // it sits up, turns to you and the screen blinks awake
      const ph = presentPose(o, a, { lift: 3.5, tiltX: Math.PI / 2 - 0.15, hold: 2.0 });
      if (ph === 1) { const k2 = a.t - 0.7; if (k2 < 1.6 && Math.floor(k2 * 5) % 2 === 0) U.uFlash.value = 1; if (Math.random() < 0.25) { const c = o.root.localToWorld(V(0, 1, -1.6)); sparkle(c.x, c.y, c.z, 1, 3); } }
    } else if (k === 'mason') {             // it rises, faces you and glows gold
      const ph = presentPose(o, a, { lift: 2.2, tiltX: 0, rise: 0.9, hold: 2.2, back: 1.0 });
      if (ph >= 0) U.uMGlow.value = Math.max(U.uMGlow.value, ph === 0 ? a.t / 0.9 : ph === 1 ? 1 : 0);
      if (ph >= 0 && ph < 2 && Math.random() < 0.8) { const c = o.root.localToWorld(V(0, 3.2, 0.3)), r = 4 + Math.random() * 2, an = Math.random() * 6.28; sparkle(c.x + Math.cos(an) * r, c.y + Math.sin(an) * r, c.z, 1, 0.6, M.masonBrass); }
    } else if (k === 'chest') {             // a rattle, the lid flies open, coins glint, it shuts, then props open again
      const tl = Math.max(0, a.t - 0.35); let ang;
      o.root.rotation.z = a.t < 0.35 ? Math.sin(a.t * 60) * 0.06 : 0;
      if (tl < 0.5) ang = lerp(-0.6, -2.15, easeOutBack(tl / 0.5));
      else if (tl < 1.6) ang = -2.15 + Math.sin((tl - 0.5) * 14) * 0.04;
      else if (tl < 2.05) ang = lerp(-2.15, 0, ease((tl - 1.6) / 0.45));
      else if (tl < 2.6) ang = 0;
      else if (tl < 3.2) ang = lerp(0, -0.6, ease((tl - 2.6) / 0.6));
      else { ang = -0.6; o.anim = null; }
      o.lid.rotation.x = ang;
      if (tl > 0.45 && !a.burst) {
        a.burst = true;
        const p = o.root.localToWorld(V(0, 2.6, 0.2));
        for (let n = 0; n < 16; n++) bubbles.push({ x: p.x + (Math.random() - 0.5) * 3, z: p.z + (Math.random() - 0.5) * 1.5, y: p.y, vy: 1.4 + Math.random() * 1.5, size: 0.3 + Math.random() * 0.5, ph: Math.random() * 6 });
        sparkle(p.x, p.y + 1, p.z, 14, 3.5);
        for (let n = 0; n < 22; n++) sparkle(p.x + (Math.random() - 0.5) * 3, p.y + 0.5 + Math.random() * 4, p.z, 1, 1, M.masonBrass);
      }
    } else if (k === 'diver') {             // a big exhale and a little wobble
      if (!a.burst) { a.burst = true; const p = o.root.localToWorld(V(0, 7.9, 0)); for (let n = 0; n < 16; n++) bubbles.push({ x: p.x + (Math.random() - 0.5), z: p.z + (Math.random() - 0.5), y: p.y - Math.random() * 2, vy: 1.6 + Math.random() * 2, size: 0.3 + Math.random() * 0.5, ph: Math.random() * 6 }); }
      o.root.rotation.z = Math.sin(a.t * 8) * 0.12 * Math.max(0, 1 - a.t / 1.4);
      if (a.t > 1.4) { o.root.rotation.z = 0; o.anim = null; }
    } else if (k === 'cd') {
      presentCd(o, a, t, water);
    } else {                                // everything else: a hop and a wiggle
      const u = a.t / 0.9;
      if (!a.burst) { a.burst = true; const p = o.root.localToWorld(V(0, 0.5, 0)); for (let n = 0; n < 6; n++) bubbles.push({ x: p.x + (Math.random() - 0.5) * 2, z: p.z, y: p.y, vy: 1.4, size: 0.3, ph: Math.random() * 6 }); }
      if (u >= 1) { o.root.position.copy(o.rest.pos); o.root.rotation.copy(o.rest.rot); o.anim = null; }
      else { o.root.position.y = o.rest.pos.y + Math.sin(u * Math.PI) * 1.8; o.root.rotation.y = o.rest.rot.y + Math.sin(u * Math.PI * 3) * 0.45; }
    }
  }
  function placeItem(b, type, pos, ry, scale) {
    const g = itemGeometry(type), mats = g.userData.mats;
    const m = new T.Matrix4().compose(pos, new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), V(scale, scale, scale));
    const nm = new T.Matrix3().getNormalMatrix(m);
    const P = g.attributes.position, Nn = g.attributes.normal, p = new T.Vector3(), n = new T.Vector3();
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i).applyMatrix4(m); n.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize();
      b.v(p, n, mats[i]);
    }
  }

  // ================================================================ goldfish + koi (one per finished pom, reset at midnight): the v1.2 fish
  const fishGroup = new T.Group();
  let fishObjs = [];
  function fishGeometryClassic(f) {
    const v = FISH.find((x) => x.name === f.v) || FISH[0];
    const rand = mulberry32(f.s);
    const noise = makeNoise(rand);
    const n3 = (p) => (noise(p.x + p.z * 0.7 + 3, p.y + 1) + noise(p.y + 11, p.z + p.x * 0.3 + 5)) / 2;
    const sz = f.size;
    const b = new Builder();
    const patch = (p) => {
      if (!v.spot) return v.base;
      const q = p.clone().multiplyScalar(v.freq);
      const a = n3(q);
      if (a > v.thr) return v.spot;
      if (v.spot2 && n3(q.clone().addScalar(7.3)) > v.thr + 0.06) return v.spot2;
      return v.base;
    };
    const body = new T.IcosahedronGeometry(1, 2);
    part(b, body, v.base, V(0, 0, 0), [0, 0, 0], [v.body[0] * sz, v.body[1] * sz, v.body[2] * sz], (p) => patch(p));
    const finMat = v.fin || v.base;
    const tl = v.tail * sz;
    part(b, new T.IcosahedronGeometry(1, 1), finMat, V(-v.body[0] * sz - tl * 0.45, 0.12 * sz, 0), [0, 0, 0.45], [tl * 0.6, 0.45 * sz, 0.07 * sz]);
    part(b, new T.IcosahedronGeometry(1, 1), finMat, V(-v.body[0] * sz - tl * 0.45, -0.12 * sz, 0), [0, 0, -0.45], [tl * 0.6, 0.45 * sz, 0.07 * sz]);
    part(b, new T.IcosahedronGeometry(1, 1), finMat, V(0.1 * sz, v.body[1] * sz * 0.85, 0), [0, 0, -0.2], [0.7 * sz, 0.32 * sz, 0.06 * sz]);
    [-1, 1].forEach((sd) => part(b, new T.IcosahedronGeometry(1, 1), M.fishBlack, V(v.body[0] * sz * 0.62, v.body[1] * sz * 0.18, sd * v.body[2] * sz * 0.72), [0, 0, 0], [0.16 * sz, 0.16 * sz, 0.1 * sz]));
    return b.build();
  }
  // the earned fish appears big above the tank, spins, dives in with a splash, then does a happy lap
  function revealFish() {
    if (!(state.pendingFish > 0)) return;
    state.pendingFish -= 1; save();
    const i = state.fish.length - 1 - state.pendingFish;
    const o = makeFishObj(i);
    o.mode = 'intro'; o.mt = -0.2;
    startFollow(o, true);           // the camera meets it in the sky and rides the dive down
    o.mesh.visible = false;
    fishObjs.push(o);
    updateFishLabel();
    $('live').textContent = `A ${o.v.name} joined the tank.`;
  }
  // camera-relative directions, so the show always plays toward the viewer
  function viewAxes() { const az = T.MathUtils.degToRad(state.az); return { front: V(Math.sin(az), 0, Math.cos(az)), right: V(Math.cos(az), 0, -Math.sin(az)) }; }
  // the newcomer drops in from above the top of the screen, at its normal size, spinning slowly on the way down
  const INTRO = { fall: 2.8, under: 1.3 };
  function introStepClassic(o, dt, t, water) {
    o.mt += dt;
    const m = o.mesh;
    if (o.mt < 0) return;
    if (!o.intro) {
      const { front, right } = viewAxes();
      const side = Math.random() < 0.5 ? -1 : 1;
      const entry = right.clone().multiplyScalar(side * (4 + Math.random() * 14)).addScaledVector(front, shape.b * 0.3);
      pullInside(entry, 0.7); entry.y = water;
      const start = entry.clone().addScaledVector(right, -side * 9);
      camera.updateMatrixWorld();
      for (start.y = water + 8; start.y < 400; start.y += 2) if (toScreen(start)[1] < -70) break;   // just past the top edge
      const heading = -Math.atan2(entry.z - start.z, entry.x - start.x);
      const exit = entry.clone().addScaledVector(right, side * 5); exit.y = water - 4.5;
      o.intro = { start, entry, exit, heading };
      m.visible = true; m.scale.setScalar(1);
    }
    const I = o.intro, tt = o.mt, wag = Math.sin(t * 12) * 0.25;
    if (tt < INTRO.fall) {                          // the slow fall, with a little sparkle trail
      const u = tt / INTRO.fall, sY = 0.65 * u + 0.35 * u * u, sX = Math.sin(u * Math.PI / 2);
      o.p.set(lerp(I.start.x, I.entry.x, sX), lerp(I.start.y, I.entry.y, sY), lerp(I.start.z, I.entry.z, sX));
      m.rotation.set(Math.sin(u * Math.PI * 3) * 0.3, I.heading + (1 - ease(u)) * Math.PI * 3 + wag, lerp(-1.25, -0.6, u));
      if (Math.random() < 0.7) sparkle(o.p.x, o.p.y + 0.5, o.p.z, 1, 0.8);
    } else {
      if (!o.splashed) {
        o.splashed = true;
        addRipple(I.entry.x, I.entry.z, 2.0, t); addRipple(I.entry.x, I.entry.z, 1.0, t + 0.35);
        splash(I.entry.x, water, I.entry.z, 90, 1.2);
        for (let k = 0; k < 22; k++) bubbles.push({ x: I.entry.x + (Math.random() - 0.5) * 2.5, z: I.entry.z + (Math.random() - 0.5) * 2.5, y: water - 0.6 - Math.random() * 3, vy: 1 + Math.random() * 2, size: 0.3 + Math.random() * 0.5, ph: Math.random() * 6 });
      }
      const u = Math.min(1, (tt - INTRO.fall) / INTRO.under), e = 1 - Math.pow(1 - u, 2);   // glide out of the dive
      o.p.copy(I.entry).lerp(I.exit, e);
      m.rotation.set(0, I.heading + wag * 0.6, lerp(-0.6, 0, e));
      if (u >= 1) { o.vel.copy(I.exit).sub(I.entry).normalize().multiplyScalar(5); startCelebration(o, water); }
    }
    m.position.copy(o.p);
  }
  function startCelebration(o, water) {
    o.mode = 'celebrate'; o.mt = 0; o.lapA = Math.atan2(o.p.z / shape.b, o.p.x / shape.a); o.lap = 0;
    const q = boundary(o.lapA + 1.2, 0.6); o.t = V(q.x, clamp(water * 0.55, 4, water - 3), q.z);
  }
  // click a fish: it rushes up, leaps out with a flip, and splashes back in
  function pokeFishClassic(o) {
    if (o.mode !== 'swim' && o.mode !== 'celebrate') return;
    let dir = V(-o.p.x, 0, -o.p.z).normalize();
    if (dir.lengthSq() < 0.1) dir = V(1, 0, 0);
    dir.applyAxisAngle(UP, (Math.random() - 0.5) * 2);
    if (!inside(o.p.x + dir.x * 7, o.p.z + dir.z * 7, 3)) dir.negate();
    o.mode = 'leap'; o.leap = { phase: 0, t: 0, dir, yaw: -Math.atan2(dir.z, dir.x) };
  }
  function leapStep(o, dt, t, water) {
    const L = o.leap, m = o.mesh; L.t += dt;
    if (L.phase === 0) {
      const target = V(o.p.x + L.dir.x * 1.5, water - 0.4, o.p.z + L.dir.z * 1.5);
      const d = target.clone().sub(o.p), len = d.length();
      o.p.addScaledVector(d.normalize(), Math.min(len, 16 * dt));
      m.rotation.set(0, -Math.atan2(d.z, d.x), Math.atan2(d.y, Math.hypot(d.x, d.z)));
      if (o.p.y >= water - 0.7 || L.t > 2) { L.phase = 1; L.t = 0; L.p0 = o.p.clone(); addRipple(o.p.x, o.p.z, 0.8, t); splash(o.p.x, water, o.p.z, 12); }
    } else if (L.phase === 1) {
      const u = Math.min(1, L.t / 1.25);
      o.p.set(L.p0.x + L.dir.x * 6 * u, L.p0.y + 4 * 5.5 * u * (1 - u), L.p0.z + L.dir.z * 6 * u);
      m.rotation.set(0, L.yaw, 1.0 - 2.0 * u - u * Math.PI * 2);
      if (u >= 1) {
        L.phase = 2;
        addRipple(o.p.x, o.p.z, 1.1, t); splash(o.p.x, water, o.p.z, 20);
        for (let k = 0; k < 10; k++) bubbles.push({ x: o.p.x + (Math.random() - 0.5), z: o.p.z + (Math.random() - 0.5), y: water - 0.5, vy: -(2 + Math.random() * 3), size: 0.3, ph: Math.random() * 6, splash: true });
      }
    } else {
      o.mode = 'swim'; o.p.y = water - 1.4; o.vel.set(L.dir.x * 4, -2, L.dir.z * 4); o.t = swimPoint();
    }
    m.position.copy(o.p);
  }
  function swimPoint() {
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 2 * shape.a * 0.85, z = (Math.random() - 0.5) * 2 * shape.b * 0.8;
      if (!inside(x, z, 4)) continue;
      const floor = terrain ? terrain.height(x, z) + 2.2 : 3, top = U.uWater.value - 1.8;
      if (top - floor < 2.5) continue;
      return V(x, floor + Math.random() * (top - floor), z);
    }
    return V(0, U.uWater.value * 0.5, 0);
  }
  // v1.2's fish, one step (used when "classic" is on in the fish lab)
  function updateFishClassic(o, dt, t, water) {
    if (o.mode === 'intro') { introStepClassic(o, dt, t, water); return; }
    if (o.mode === 'leap') { leapStep(o, dt, t, water); return; }
    const celebrating = o.mode === 'celebrate';
    if (celebrating) {
      o.mt += dt;
      if (o.mt > 8) o.mode = 'swim';
      else if (o.p.distanceTo(o.t) < 3.5) { o.lap += 1; const q = boundary(o.lapA + 1.2 + o.lap * 1.1, 0.6); o.t = V(q.x, clamp(water * (0.4 + 0.3 * (o.lap % 2)), 4, water - 2.5), q.z); }
    } else if (o.p.distanceTo(o.t) < 3 || Math.random() < dt * 0.04) {
      o.t = swimPoint();
      o.surfacing = Math.random() < 0.12;
      if (o.surfacing) o.t.y = water - 0.7;
    }
    const sp = o.v.speed * (celebrating ? 2.4 : 0.75 + 0.25 * Math.sin(t * 0.3 + o.wag));
    const want = o.t.clone().sub(o.p).normalize().multiplyScalar(sp);
    want.y *= 0.5;
    o.vel.lerp(want, 1 - Math.exp(-dt * (celebrating ? 1.6 : 0.7)));
    o.p.addScaledVector(o.vel, dt);
    if (!inside(o.p.x, o.p.z, 3)) { pullInside(o.p, 0.9); if (!celebrating) o.t = swimPoint(); }
    const floor = terrain.height(o.p.x, o.p.z) + 1.4;
    if (o.p.y < floor) o.p.y += (floor - o.p.y) * Math.min(1, dt * 4);
    if (o.p.y > water - 0.6) o.p.y = water - 0.6;
    if (o.surfacing && o.p.y > water - 1.0) { addRipple(o.p.x, o.p.z, 0.35, t); o.surfacing = false; o.t = swimPoint(); }
    o.mesh.position.copy(o.p);
    const yaw = -Math.atan2(o.vel.z, o.vel.x);
    const wagRate = o.v.speed * (celebrating ? 4.5 : 2.2);
    o.mesh.rotation.set(celebrating ? Math.sin(o.mt * 3) * 0.25 : 0, yaw + Math.sin(t * wagRate + o.wag) * (celebrating ? 0.22 : 0.14), Math.atan2(o.vel.y, Math.hypot(o.vel.x, o.vel.z)) * 0.5);
  }

  // ================================================================ koi: bending bodies, trailing fins, eyes, play
  // FCFG holds the fish tuning. The fish lab changes it live; "classic" brings back the v1.2 fish exactly.
  const FCFG_DEFAULT = {
    classic: false, koiOnly: true,
    bend: true, softFins: true, eyes: true, glint: true, blink: true, gills: true, mouth: true, leap2: true, dive2: true, play: true,
    pace: 0.5,          // fish move at this fraction of real time (the drop-in fall keeps its own 2.8 s)
    breathHz: 0.8,      // gill and mouth breaths a second
    puffy: 0.2,         // share of new koi with puffy cheeks
    beatAmp: 0.3,       // tail swing (radians at the tail) while kicking
    beatHz: 0.9,        // tail beats a second while cruising
    beatSpeedHz: 0.22,  // extra beats a second for each unit of speed
    wave: 0.85,         // body waves from nose to tail
    finLag: 1.6,        // how far behind the body the fins follow: higher = softer, wispier
    finLen: 1,          // fin length
    longFins: 0.35,     // share of new koi with long butterfly fins
    turn: 1.4,          // fastest turn, radians a second
    glide: 0.45,        // 0 = steady swimmer, 1 = kick then glide
    speed: 1,           // swim speed
    bank: 0.6,          // lean into turns
    pecFlap: 1,         // pectoral fin fanning
    eyeSize: 1,
    playEvery: 55,      // seconds between playful moments, on average
  };
  const FCFG = Object.assign({}, FCFG_DEFAULT);
  const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const fwdOf = (yaw, pitch = 0) => V(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.sin(yaw) * Math.cos(pitch));
  const yawTo = (d) => -Math.atan2(d.z, d.x);

  // ---- the koi body, built head (+x) to tail (-x). Every vertex remembers how far it is from the nose (s),
  // how soft it is (w: 0 = body, 1 = fin tip), and which fin it belongs to, so it can be bent along a spine each frame.
  const KIND = { body: 0, pec: 1, pelvic: 2, dorsal: 3, caudal: 4, anal: 5, gill: 6 };
  function koiGeometry(f, v) {
    const rand = mulberry32(f.s), noise = makeNoise(rand);
    const n3 = (p) => (noise(p.x + p.z * 0.7 + 3, p.y + 1) + noise(p.y + 11, p.z + p.x * 0.3 + 5)) / 2;
    const sz = f.size, long = !!f.lf, FL = FCFG.finLen;
    const Lb = 2 * v.body[0] * sz, R = v.body[1] * sz, ry = R * 0.92, rz = R * 0.74;
    const prof = (u) => (u < 0.3 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.3 - u) / 0.3, 2))) : 1 - 0.8 * Math.pow((u - 0.3) / 0.7, 1.7));
    const finMat = v.fin || v.base;
    const b = new Builder(), meta = { S: [], W: [], K: [], side: [], rx: [], ry: [], rz: [], ox: [], oy: [], oz: [], CK: [] };
    let ckNow = 0;           // cheek weight for the next vertex tagged (puffy cheeks breathe)
    const tag = (p, w, kind, side = 0, root = null) => {
      meta.S.push(Lb / 2 - p.x); meta.W.push(w); meta.K.push(kind); meta.side.push(side); meta.CK.push(ckNow);
      if (root) { meta.rx.push(root.x); meta.ry.push(root.y); meta.rz.push(root.z); meta.ox.push(p.x - root.x); meta.oy.push(p.y - root.y); meta.oz.push(p.z - root.z); }
      else { meta.rx.push(0); meta.ry.push(0); meta.rz.push(0); meta.ox.push(0); meta.oy.push(0); meta.oz.push(0); }
    };
    // a surface from a grid: fn(u, v) -> point; normals from the grid itself
    const surf = (nu, nv, fn, matFn, lumFn, tagFn) => {
      const pts = [];
      for (let i = 0; i <= nu; i++) { pts.push([]); for (let j = 0; j <= nv; j++) pts[i].push(fn(i / nu, j / nv)); }
      const nrm = (i, j) => {
        const a = pts[Math.min(nu, i + 1)][j].clone().sub(pts[Math.max(0, i - 1)][j]);
        const c = pts[i][Math.min(nv, j + 1)].clone().sub(pts[i][Math.max(0, j - 1)]);
        const n = a.cross(c); return n.lengthSq() > 1e-10 ? n.normalize() : V(0, 1, 0);
      };
      const put = (i, j) => { const p = pts[i][j]; b.v(p, nrm(i, j), matFn(p, i / nu, j / nv), 0, 0, null, lumFn ? lumFn(i / nu, j / nv) : 0); tagFn(p, i / nu, j / nv); };
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { put(i, j); put(i + 1, j); put(i + 1, j + 1); put(i, j); put(i + 1, j + 1); put(i, j + 1); }
    };
    // body pattern
    const patch = (p, u) => {
      const up = p.y / ry;
      if (v.cap) { const dx = (u - 0.17) * Lb, d = Math.hypot(dx, p.z * 1.2); if (up > 0.15 && d < R * 0.62) return v.cap; return v.base; }
      if (v.belly) { if (up < -0.1 && u > 0.08) return v.belly; return v.base; }
      if (!v.spot) return v.base;
      if (up < -0.45) return v.base === M.fishBlack ? M.fishWhite : v.base;      // koi bellies are plain
      const q = p.clone().multiplyScalar(v.freq / Math.max(0.7, sz * 0.6));
      if (n3(q) > v.thr) return v.spot;
      if (v.spot2) { const q2 = p.clone().multiplyScalar((v.freq2 || v.freq) / Math.max(0.7, sz * 0.6)).addScalar(7.3); if (n3(q2) > (v.thr2 || v.thr + 0.06)) return v.spot2; }
      return v.base;
    };
    // puffy cheeks: jowls low on the head that swell out and down, so they show in profile as well as from the front
    const cheekW = (u, a) => { const c = Math.cos(a * Math.PI * 2); return Math.exp(-Math.pow((u - 0.2) / 0.09, 2)) * Math.exp(-Math.pow((c + 0.55) / 0.6, 2)); };
    const puff = f.pc ? 1 : 0;
    const bodyPt = (u, ang, lift = 1) => {
      const f0 = prof(u), c = Math.cos(ang), w = puff * cheekW(u, ang / (Math.PI * 2));
      return V(Lb / 2 - u * Lb, ry * f0 * c * (c < 0 ? 0.86 * (1 + 0.32 * w) : 1) * lift, rz * f0 * Math.sin(ang) * (1 + 0.5 * w) * lift);
    };
    surf(28, 16, (u, a) => bodyPt(u, a * Math.PI * 2), (p, u) => patch(p, u), null, (p, u, a) => { ckNow = puff ? cheekW(u, a) : 0; tag(p, 0, KIND.body); ckNow = 0; });
    // gill covers: a crescent flap behind each eye that lifts open as the fish breathes, over a thin red gill line
    const g0 = 0.17, g1 = 0.27, gEnd = (k) => g0 + (g1 - g0) * (0.55 + 0.45 * Math.cos(k * 1.7));
    const onBody = (u, ang, lift) => bodyPt(u, ang, lift);
    [-1, 1].forEach((side) => {
      const mid = side > 0 ? Math.PI / 2 : Math.PI * 1.5;
      surf(6, 8, (u, k) => { const kk = (k - 0.5) * 1.8, ue = gEnd(kk); return onBody(g0 + (ue - g0) * u, mid + kk * side, 1.035); },
        (p, u, k) => patch(p, g0 + 0.05), (u) => -(0.97 - 0.18 * u * u), (p, u) => tag(p, u, KIND.gill, side));
      surf(2, 8, (u, k) => { const kk = (k - 0.5) * 1.6, ue = gEnd(kk); return onBody(ue - 0.012 + 0.016 * u, mid + kk * side, 1.012); },
        () => M.fishRed, () => -0.4, (p) => tag(p, 0, KIND.body));
    });
    // fins are thin sheets drawn with smaller dots, so they read as see-through; rays show as faint lines
    const finLum = (base) => (u, a) => -(base - 0.28 * u) * (0.86 + 0.14 * Math.cos(a * 22));
    // tail
    const tl = Lb * (long ? 0.8 : 0.34) * FL, root = Lb * 0.95, fork = long ? 0.12 : 0.34;
    surf(10, 10, (u, a) => {
      const yy = a * 2 - 1, half = R * (long ? 0.42 + 1.15 * u : 0.32 + 0.95 * u);
      let len = tl * (1 - fork * Math.pow(1 - Math.abs(yy), 1.4));
      if (long) len *= 1 + 0.1 * Math.sin(yy * 9 + f.s % 7);
      return V(Lb / 2 - (root + u * len), yy * half, 0);
    }, () => finMat, finLum(long ? 0.78 : 0.82), (p, u) => tag(p, u, KIND.caudal));
    // dorsal: along the back, swept back; long-finned koi trail it past the tail
    const d0 = 0.32, d1 = long ? 0.9 : 0.72, dh = R * (long ? 0.95 : 0.6) * FL;
    surf(10, 5, (u, a) => {
      const uu = d0 + (d1 - d0) * u, back = ry * prof(uu) * 0.94;
      const h = dh * Math.pow(1 - u, long ? 0.25 : 0.5) * Math.min(1, u * 6 + 0.15);
      return V(Lb / 2 - uu * Lb - a * h * (long ? 1.6 : 0.7), back + a * h, 0);
    }, () => finMat, finLum(0.8), (p, u, a) => tag(p, a * (long ? 1 : 0.55), KIND.dorsal));
    // anal fin: small, under the tail
    surf(5, 3, (u, a) => {
      const uu = 0.74 + 0.12 * u, under = -ry * prof(uu) * 0.84, h = R * 0.36 * FL * (1 - u * 0.6);
      return V(Lb / 2 - uu * Lb - a * h * 0.6, under - a * h, 0);
    }, () => finMat, finLum(0.75), (p, u, a) => tag(p, a * 0.5, KIND.anal));
    // paired fins hang off a root point; they fan, flap and fold back against the body each frame
    const paired = (kind, uRoot, yk, zk, len, wid, down) => {
      [-1, 1].forEach((side) => {
        const f0 = prof(uRoot), rootP = V(Lb / 2 - uRoot * Lb, -ry * f0 * yk, side * rz * f0 * zk);
        const span = V(-0.45, -down, side * 0.87).normalize(), chord = V(-0.87, 0, -side * 0.45).normalize();
        surf(7, 4, (u, a) => {
          const w = wid * Math.sin(Math.PI * (0.18 + 0.82 * Math.min(1, u * 1.15))) * (a - 0.5);
          return rootP.clone().addScaledVector(span, u * len).addScaledVector(chord, w + u * len * 0.15);
        }, () => finMat, finLum(0.8), (p, u) => tag(p, u, kind, side, rootP));
      });
    };
    paired(KIND.pec, 0.25, 0.42, 0.8, R * (long ? 2.0 : 0.95) * FL, R * (long ? 0.9 : 0.6), 0.32);
    paired(KIND.pelvic, 0.5, 0.82, 0.55, R * (long ? 1.25 : 0.6) * FL, R * (long ? 0.55 : 0.36), 0.7);
    const geo = b.build();
    ['position', 'normal'].forEach((k) => geo.attributes[k].setUsage(T.DynamicDrawUsage));
    const rest = { P: geo.attributes.position.array.slice(), N: geo.attributes.normal.array.slice() };
    const Smax = Math.max(...meta.S) + 0.01;
    const eyeU = 0.13, ef = prof(eyeU);
    // the eye sits on the head's real surface (cheeks included), poking about two thirds out
    const eyeR = R * 0.15, eyeAng = Math.acos(0.22), eyeSurfZ = rz * ef * Math.sin(eyeAng) * (1 + 0.5 * puff * cheekW(eyeU, eyeAng / (Math.PI * 2)));
    const eye = { s: eyeU * Lb, y: ry * ef * 0.22, z: eyeSurfZ - eyeR * 0.3, r: eyeR };
    const lidMat = patch(V(Lb / 2 - eyeU * Lb, eye.y, eye.z), eyeU);
    const mouth = { s: Lb * 0.012, y: -ry * 0.1, r: R * 0.14 };
    return { geo, rest, meta: Object.fromEntries(Object.entries(meta).map(([k, a]) => [k, Float32Array.from(a)])), Lb, R, ry, Smax, eye, lidMat, mouth, long, puffy: !!f.pc };
  }

  // ---- eyes: an eyeball, a pupil that looks around, and a glint that stays put (that's what makes an eye look wet)
  function sphereGeo(mat, r, lum = 0, detail = 1) {
    const b = new Builder(); b.mesh(new T.IcosahedronGeometry(r, detail), mat);
    const g = b.build(); if (lum) g.attributes.aLum.array.fill(lum); return g;
  }
  function makeEyes(o) {
    const K = o.kd, er = K.eye.r * FCFG.eyeSize, iris = o.v.base === M.fishGold || o.v.base === M.fishBronze ? M.fishBlack : M.fishGold;
    o.eyes = [-1, 1].map((side) => {
      const g = new T.Group();
      const ball = new T.Mesh(sphereGeo(iris, er, 0, 2), sceneMat);
      const pupil = new T.Mesh(sphereGeo(M.fishBlack, er * 0.66, 0, 2), sceneMat);
      const glint = new T.Mesh(sphereGeo(M.fishWhite, er * 0.3, 1, 1), sceneMat);
      const lid = new T.Mesh(sphereGeo(K.lidMat, er * 1.32, 0, 2), sceneMat);        // body-colored, slides down over the eye
      [ball, pupil, glint, lid].forEach((m) => { m.frustumCulled = false; g.add(m); });
      lid.visible = false;
      o.mesh.add(g);
      return { side, g, ball, pupil, glint, lid, r: er };
    });
    o.mouth = new T.Mesh(sphereGeo(M.fishBlack, K.mouth.r, 0, 2), sceneMat); o.mouth.frustumCulled = false; o.mesh.add(o.mouth);
  }

  // ---- bending: two spines (body and soft fins), each a chain of angles along the fish.
  // The body follows the path the head took (it remembers its recent headings), plus a travelling wave for the tail beat.
  const SPN = 36;
  function headingAt(o, tq) {
    const H = o.hist, n = o.histN; if (!n) return [o.yaw, o.pitch];
    let i = o.histI;
    for (let k = 0; k < n; k++) {
      const j = (i - 1 - k + 64) % 64, tj = H[j * 3];
      if (tj <= tq) {
        const jn = (j + 1) % 64;
        if (k === 0) return [H[j * 3 + 1], H[j * 3 + 2]];
        const tn = H[jn * 3], u = clamp((tq - tj) / Math.max(1e-4, tn - tj), 0, 1);
        return [lerp(H[j * 3 + 1], H[jn * 3 + 1], u), lerp(H[j * 3 + 2], H[jn * 3 + 2], u)];
      }
    }
    const j = (i - n + 64) % 64; return [H[j * 3 + 1], H[j * 3 + 2]];
  }
  function pushHeading(o, t) {
    const H = o.hist, i = o.histI;
    H[i * 3] = t; H[i * 3 + 1] = o.yaw; H[i * 3 + 2] = o.pitch;
    o.histI = (i + 1) % 64; o.histN = Math.min(64, o.histN + 1);
  }
  function computeSpine(o, t, soft, out) {
    const K = o.kd, ds = K.Smax / (SPN - 1), vEff = Math.max(1.6, o.spd), Lb = K.Lb;
    const k = FCFG.wave * Math.PI * 2 / Lb, lag = soft ? FCFG.finLag : 0;
    let X = Lb / 2, Y = 0, Z = 0;
    for (let i = 0; i < SPN; i++) {
      const s = i * ds, past = Math.max(0, s - Lb * 0.85) / Math.max(0.1, K.Smax - Lb * 0.85);
      const delay = Math.min(1.4, (s / vEff) * (1 + lag * past * 1.6) + lag * past * 0.18);
      const [hy, hp] = headingAt(o, t - delay);
      const env = 0.12 + 0.88 * Math.pow(Math.min(s, Lb) / Lb, 1.6) + past * 0.5 * (soft ? 1 : 0.4);
      let th = wrapPi(hy - o.yaw) + o.amp * env * Math.sin(o.phase - k * s - lag * past * 1.7);
      th += o.curl * Math.min(1.2, s / Lb) * 1.4;
      let ph = (hp - o.pitch) * 0.8 + o.arch * Math.min(1, s / Lb);
      if (soft) ph += past * 0.22 * Math.sin(t * 3.1 + s * 0.9 + o.wag) * (0.4 + 0.6 * Math.min(1, o.spd / 3));
      th = clamp(th, -1.5, 1.5); ph = clamp(ph, -1.2, 1.2);
      out.th[i] = th; out.ph[i] = ph; out.X[i] = X; out.Y[i] = Y; out.Z[i] = Z;
      X -= ds * Math.cos(th) * Math.cos(ph); Z += ds * Math.sin(th); Y += ds * Math.sin(ph);
    }
  }
  function newSpine() { return { th: new Float32Array(SPN), ph: new Float32Array(SPN), X: new Float32Array(SPN), Y: new Float32Array(SPN), Z: new Float32Array(SPN) }; }
  function deformKoi(o, t) {
    const K = o.kd, G = K.geo, P = G.attributes.position.array, Nn = G.attributes.normal.array, R0 = K.rest.P, N0 = K.rest.N, m = K.meta;
    const bend = FCFG.bend, soft = FCFG.softFins && bend;
    if (!bend) { P.set(R0); Nn.set(N0); G.attributes.position.needsUpdate = true; G.attributes.normal.needsUpdate = true; placeEyes(o, null, t); return; }
    const A = o.spA || (o.spA = newSpine()), B = o.spB || (o.spB = newSpine());
    computeSpine(o, t, false, A);
    if (soft) computeSpine(o, t, true, B);
    // recoil: the fish pivots about a point a third of the way back, so the head swings a little against the tail
    const ds = K.Smax / (SPN - 1), ip = Math.round(K.Lb * 0.3 / ds), rp = A.th[ip], cx = A.X[ip], cz = A.Z[ip], restX = K.Lb / 2 - ip * ds;
    const cr = Math.cos(-rp), sr = Math.sin(-rp);
    const fix = (S) => { for (let i = 0; i < SPN; i++) { const x = S.X[i] - cx, z = S.Z[i] - cz; S.X[i] = restX + x * cr + z * sr; S.Z[i] = -x * sr + z * cr; S.th[i] -= rp; } };
    fix(A); if (soft) fix(B);
    // paired fins: fan when slow, fold back when fast
    const vn = clamp(o.spd / Math.max(0.5, o.cruise * 1.5), 0, 1);
    const br = o.breath || 0, gillOpen = FCFG.gills ? 0.5 + 0.5 * Math.sin(br) : 0, puffNow = 0.5 + 0.5 * Math.sin(br);
    const jaw = mouthOpen(o) * K.R * 0.09, jawS = K.Lb * 0.09;
    const fold = 0.15 + 0.75 * vn, flapA = FCFG.pecFlap * (0.12 + 0.4 * (1 - vn)) * Math.sin(t * 4.2 + o.wag), flapB = FCFG.pecFlap * 0.15 * Math.sin(t * 3.3 + o.wag + 1);
    const n = P.length / 3;
    for (let i = 0; i < n; i++) {
      let x = R0[i * 3], y = R0[i * 3 + 1], z = R0[i * 3 + 2], nx = N0[i * 3], nz = N0[i * 3 + 2];
      const kind = m.K[i];
      if (kind === KIND.pec || kind === KIND.pelvic) {
        const side = m.side[i], ox = m.ox[i], oy = m.oy[i], oz = m.oz[i];
        const fl = (kind === KIND.pec ? flapA : flapB) * side, fo = -side * (kind === KIND.pec ? fold : fold * 0.6);
        const y1 = oy * Math.cos(fl) - oz * Math.sin(fl), z1 = oy * Math.sin(fl) + oz * Math.cos(fl);
        const x2 = ox * Math.cos(fo) + z1 * Math.sin(fo), z2 = -ox * Math.sin(fo) + z1 * Math.cos(fo);
        x = m.rx[i] + x2; y = m.ry[i] + y1; z = m.rz[i] + z2;
      }
      else if (kind === KIND.gill) z += m.side[i] * gillOpen * Math.pow(m.W[i], 1.6) * K.R * 0.2;
      else if (kind === KIND.body) {
        if (m.CK[i] > 0) { z += Math.sign(z) * m.CK[i] * puffNow * K.R * 0.07; if (y < 0) y -= m.CK[i] * puffNow * K.R * 0.04; }
        if (jaw > 0 && y < -K.ry * 0.04) { const sj = K.Lb / 2 - x; if (sj < jawS) y -= jaw * (1 - sj / jawS); }
      }
      const s = clamp(K.Lb / 2 - x, 0, K.Smax - 1e-3), fi = s / ds, i0 = Math.floor(fi), i1 = Math.min(SPN - 1, i0 + 1), u = fi - i0;
      const w = soft && kind !== KIND.gill ? m.W[i] : 0;
      const sx = lerp(A.X[i0], A.X[i1], u), sy = lerp(A.Y[i0], A.Y[i1], u), sz = lerp(A.Z[i0], A.Z[i1], u);
      let th = lerp(A.th[i0], A.th[i1], u), ph = lerp(A.ph[i0], A.ph[i1], u), X = sx, Y = sy, Z = sz;
      if (w > 0) {
        X = lerp(sx, lerp(B.X[i0], B.X[i1], u), w); Y = lerp(sy, lerp(B.Y[i0], B.Y[i1], u), w); Z = lerp(sz, lerp(B.Z[i0], B.Z[i1], u), w);
        th = lerp(th, lerp(B.th[i0], B.th[i1], u), w); ph = lerp(ph, lerp(B.ph[i0], B.ph[i1], u), w);
      }
      const ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
      P[i * 3] = X + z * st + y * sp; P[i * 3 + 1] = Y + y * cp; P[i * 3 + 2] = Z + z * ct;
      Nn[i * 3] = nx * ct + nz * st; Nn[i * 3 + 1] = N0[i * 3 + 1]; Nn[i * 3 + 2] = -nx * st + nz * ct;
    }
    G.attributes.position.needsUpdate = true; G.attributes.normal.needsUpdate = true;
    placeEyes(o, A, t);
  }
  function placeEyes(o, A, t) {
    if (!o.eyes) return;
    const K = o.kd, e = K.eye;
    let X = K.Lb / 2 - e.s, Y = 0, Z = 0, th = 0;
    if (A) { const ds = K.Smax / (SPN - 1), fi = e.s / ds, i0 = Math.floor(fi), u = fi - i0; X = lerp(A.X[i0], A.X[i0 + 1], u); Y = lerp(A.Y[i0], A.Y[i0 + 1], u); Z = lerp(A.Z[i0], A.Z[i0 + 1], u); th = lerp(A.th[i0], A.th[i0 + 1], u); }
    // blinking: a body-colored lid slides down over the eye and back up (real koi have no eyelids, but it reads as alive)
    let lid = 0;
    if (FCFG.blink) { o.blinkT -= o.lastDt || 0; if (o.blinkT < 0) { o.blinkT = 2.5 + Math.random() * 4.5; o.blinkAt = t; if (Math.random() < 0.2) o.blinkT = 0.32; } const bt = t - (o.blinkAt ?? -9); if (bt < 0.26) lid = Math.sin(Math.PI * bt / 0.26); }
    for (const E of o.eyes) {
      const zz = e.z * E.side;
      E.g.position.set(X + zz * Math.sin(th), Y + e.y, Z + zz * Math.cos(th));
      E.g.rotation.set(0, th, 0);
      E.lid.visible = lid > 0.03 && FCFG.eyes;
      if (E.lid.visible) { const rl = E.r * 1.32; E.lid.scale.set(1, lid, 1); E.lid.position.set(0, rl * (1 - lid), 0); }
      // the pupil looks: outward, turned toward where the fish is looking
      const ly = FCFG.eyes ? o.look.x : 0, lp = FCFG.eyes ? o.look.y : 0;
      const d = V(Math.sin(ly) * 0.9, Math.sin(lp) * 0.8, E.side * Math.cos(ly)).normalize();
      E.pupil.position.copy(d).multiplyScalar(E.r * 0.52);
      E.glint.visible = FCFG.glint && FCFG.eyes;
      E.glint.position.set(E.r * 0.42, E.r * 0.62, E.side * E.r * 0.62);
      E.ball.visible = FCFG.eyes;
    }
    if (o.mouth) {
      const mo = K.mouth, open = mouthOpen(o);
      let mX = K.Lb / 2 - mo.s, mY = 0, mZ = 0;
      if (A) { const ds = K.Smax / (SPN - 1), fi = mo.s / ds, i0 = Math.floor(fi), u = fi - i0; mX = lerp(A.X[i0], A.X[i0 + 1], u); mY = lerp(A.Y[i0], A.Y[i0 + 1], u); mZ = lerp(A.Z[i0], A.Z[i0 + 1], u); }
      o.mouth.visible = FCFG.mouth;
      o.mouth.position.set(mX, mY + mo.y - open * mo.r * 0.35, mZ);
      o.mouth.scale.set(0.45, 0.22 + 0.78 * open, 0.75);
    }
  }
  function mouthOpen(o) {
    if (!FCFG.mouth) return 0;
    const g = o.gulpT > 0 ? Math.sin(Math.PI * o.gulpT / 0.45) : 0;
    return Math.max(g, 0.12 + 0.3 * (0.5 + 0.5 * Math.sin((o.breath || 0) + Math.PI)));     // opens as the gills close
  }

  // ---- fish objects
  function pickVariety() {
    const pool = FCFG.koiOnly ? FISH.filter((f) => !f.gold) : FISH;
    const total = pool.reduce((s, f) => s + f.w, 0);
    let r = Math.random() * total;
    for (const f of pool) { r -= f.w; if (r <= 0) return f; }
    return pool[0];
  }
  function newFish(name, lf, pc) {
    const v = (name && FISH.find((x) => x.name === name)) || pickVariety();
    return { v: v.name, size: +(v.size[0] + Math.random() * (v.size[1] - v.size[0])).toFixed(2), s: Math.floor(Math.random() * 1e9), lf: lf ?? (!v.gold && Math.random() < FCFG.longFins ? 1 : 0), pc: pc ?? (!v.gold && Math.random() < FCFG.puffy ? 1 : 0) };
  }
  function makeFishObj(i) {
    const f = state.fish[i], v = FISH.find((x) => x.name === f.v) || FISH[0];
    const o = { f, v, p: swimPoint(), vel: V(Math.random() - 0.5, 0, Math.random() - 0.5), t: swimPoint(), wag: Math.random() * 6, surfacing: false, mode: 'swim', mt: 0 };
    if (FCFG.classic) {
      o.mesh = new T.Mesh(fishGeometryClassic(f), sceneMat); o.classic = true;
    } else {
      o.kd = koiGeometry(f, v);
      o.mesh = new T.Mesh(o.kd.geo, sceneMat);
      o.yaw = Math.random() * 6.28; o.pitch = 0; o.roll = 0; o.spd = 1; o.yawRate = 0; o.thrust = 0.5; o.amp = 0.1; o.phase = Math.random() * 6;
      o.curl = 0; o.arch = 0; o.cruise = v.speed; o.kg = { kick: true, left: 1 }; o.look = { x: 0, y: 0, tx: 0, ty: 0, next: 1 }; o.blinkT = 2 + Math.random() * 4;
      o.hist = new Float32Array(64 * 3); o.histI = 0; o.histN = 0; o.hover = 0; o.goal = null;
      makeEyes(o);
    }
    o.mesh.frustumCulled = false; o.mesh.rotation.order = 'YZX'; fishGroup.add(o.mesh);
    return o;
  }
  function disposeFish(o) { fishGroup.remove(o.mesh); o.mesh.geometry.dispose(); if (o.eyes) o.eyes.forEach((E) => [E.ball, E.pupil, E.glint, E.lid].forEach((m) => m.geometry.dispose())); if (o.mouth) o.mouth.geometry.dispose(); }
  function syncFish() {
    const shown = Math.max(0, state.fish.length - (state.pendingFish || 0));
    while (fishObjs.length > shown) disposeFish(fishObjs.pop());
    for (let i = fishObjs.length; i < shown; i++) fishObjs.push(makeFishObj(i));
    updateFishLabel();
  }
  function rebuildFish() { while (fishObjs.length) disposeFish(fishObjs.pop()); scene2 = null; syncFish(); }

  // ---- swimming: a heading that turns at a limited rate, a tail that kicks and glides, a lean into turns
  function steer(o, dt, t, water) {
    const g = o.goal, cruise = o.cruise * FCFG.speed;
    let tgt, vDes;
    if (g) { tgt = g.p; vDes = g.v; }
    else {
      if (o.mode === 'swim' && (o.p.distanceTo(o.t) < 3 || Math.random() < dt * 0.04)) {
        o.t = swimPoint(); o.surfacing = Math.random() < 0.12; if (o.surfacing) o.t.y = water - 0.7;
        if (Math.random() < 0.18) o.hover = 1.5 + Math.random() * 2.5;        // now and then it stops and hangs there
      }
      tgt = o.t; vDes = cruise * (0.8 + 0.25 * Math.sin(t * 0.3 + o.wag));
      if (o.hover > 0) { o.hover -= dt; vDes = cruise * 0.08; }
      if (o.mode === 'celebrate') vDes = cruise * 2.2;
    }
    const d = tgt.clone().sub(o.p), dist = d.length(), hold = g && g.hold && dist < 1.1;
    if (hold) vDes = 0;
    else if (g && dist < 2.5) vDes *= 0.4 + 0.6 * dist / 2.5;
    // turning: aim at the target, or face the way the scene asks while holding still
    let want = yawTo(d);
    if (hold && g.face) want = yawTo(g.face);
    // look ahead for the glass
    const ahead = o.p.clone().addScaledVector(fwdOf(o.yaw), 3 + o.spd * 0.6);
    let maxTurn = FCFG.turn * (g && g.fast ? 1.9 : 1) * (o.mode === 'celebrate' ? 1.5 : 1);
    if (!inside(ahead.x, ahead.z, 3)) { want = yawTo(V(-o.p.x, 0, -o.p.z)); maxTurn *= 1.8; if (!g) o.t = swimPoint(); }
    const dy = wrapPi(want - o.yaw);
    o.yawRate += (clamp(dy * (hold ? 1.2 : 2), -maxTurn, maxTurn) - o.yawRate) * (1 - Math.exp(-dt * 4));
    o.yaw += o.yawRate * dt;
    const pitchT = hold && g.pitch != null ? g.pitch : clamp(Math.atan2(d.y, Math.hypot(d.x, d.z) + 0.5), -0.5, 0.5) * (dist > 0.6 ? 1 : 0);
    o.pitch += (pitchT - o.pitch) * (1 - Math.exp(-dt * 2));
    // kick and glide
    const vMax = Math.max(0.3, vDes * 1.55), drag = 1.0;
    if (FCFG.glide > 0.02 && !hold) {
      o.kg.left -= dt;
      if (o.kg.kick && o.kg.left <= 0) { o.kg.kick = false; o.kg.left = (0.4 + Math.random() * 1.2) * FCFG.glide * 2; }
      else if (!o.kg.kick && (o.kg.left <= 0 || o.spd < vDes * 0.6 || Math.abs(o.yawRate) > 0.9)) { o.kg.kick = true; o.kg.left = (1.5 + Math.random() * 1.5) / Math.max(0.3, FCFG.beatHz + FCFG.beatSpeedHz * o.spd); }
      o.thrustT = o.kg.kick ? 1 : 0.06;
    } else o.thrustT = vMax > 0 ? clamp(vDes / vMax, 0, 1) : 0;
    if (g && g.fast) o.thrustT = Math.max(o.thrustT, 1.25);
    o.thrust += (o.thrustT - o.thrust) * (1 - Math.exp(-dt * 5));
    o.spd += (o.thrust * drag * vMax - drag * o.spd) * dt;
    o.spd = Math.max(0, o.spd - Math.abs(o.yawRate) * 0.15 * dt);
    tailBeat(o, dt, 1);
    o.roll += (clamp(-o.yawRate * o.spd * 0.12 * FCFG.bank, -0.55, 0.55) - o.roll) * (1 - Math.exp(-dt * 3));
    o.p.addScaledVector(fwdOf(o.yaw, o.pitch), o.spd * dt);
    if (!inside(o.p.x, o.p.z, 2.5)) pullInside(o.p, 0.92);
    const floor = terrain.height(o.p.x, o.p.z) + 1.4;
    if (o.p.y < floor) o.p.y += (floor - o.p.y) * Math.min(1, dt * 4);
    if (o.p.y > water - 0.6) o.p.y = water - 0.6;
    if (o.surfacing && o.p.y > water - 1.0) { addRipple(o.p.x, o.p.z, 0.35, U.uTime.value); o.surfacing = false; o.t = swimPoint(); }
    // eyes: little jumps to new spots, leading into turns, or watching what the scene points at
    o.look.next -= dt;
    if (o.look.next <= 0) { o.look.next = 0.5 + Math.random() * 2; o.look.tx = (Math.random() - 0.5) * 0.9; o.look.ty = (Math.random() - 0.5) * 0.7; }
    let lx = o.look.tx + clamp(o.yawRate * 0.35, -0.5, 0.5), lyy = o.look.ty;
    if (g && g.look) { const q = g.look.clone().sub(o.p); lx = clamp(wrapPi(yawTo(q) - o.yaw), -0.7, 0.7); lyy = clamp(Math.atan2(q.y, Math.hypot(q.x, q.z)) - o.pitch, -0.6, 0.6); }
    o.look.x += (lx - o.look.x) * Math.min(1, dt * 14); o.look.y += (lyy - o.look.y) * Math.min(1, dt * 14);
  }
  function tailBeat(o, dt, k) {
    const ampT = FCFG.beatAmp * (0.12 + 0.88 * Math.min(1.4, o.thrust)) * k + Math.min(0.2, Math.abs(o.yawRate) * 0.08);
    o.amp += (ampT - o.amp) * (1 - Math.exp(-dt * 4));
    o.phase += Math.PI * 2 * (FCFG.beatHz + FCFG.beatSpeedHz * o.spd) * (0.35 + 0.65 * Math.min(1.5, o.thrust)) * dt;
    o.curl *= Math.exp(-dt * 5); o.arch *= Math.exp(-dt * 3);
    o.breath = (o.breath || Math.random() * 6) + Math.PI * 2 * FCFG.breathHz * (1 + 0.5 * Math.min(1, o.thrust)) * dt;
    if (o.gulpT > 0) o.gulpT -= dt;
  }
  function poseKoi(o, dt, t) {
    o.mesh.position.copy(o.p);
    let yaw = o.yaw;
    if (!FCFG.bend) yaw += Math.sin(o.phase) * o.amp * 0.5;      // no bending: the old stiff wag
    o.mesh.rotation.set(o.roll, yaw, o.pitch);
    pushHeading(o, t);
    o.lastDt = dt;
    deformKoi(o, t);
  }
  function startle(o, awayFrom, k = 1) {
    const d = o.p.clone().sub(awayFrom); d.y = 0; if (d.lengthSq() < 0.01) d.set(1, 0, 0);
    const side = Math.sign(wrapPi(yawTo(d) - o.yaw)) || 1;
    o.curl = -side * 0.85 * k; o.spd += 3 * k; o.thrust = 1.4;
  }

  // ---- the jump: a burst toward the surface, a real arc with the nose following the flight, a head-first landing
  const G_AIR = 34;
  function pokeFish(o) {
    if (o.classic || !FCFG.leap2) return pokeFishClassic(o);
    if (o.mode !== 'swim' && o.mode !== 'celebrate') return;
    if (o.goal && scene2) endScene();
    let dir = V(-o.p.x, 0, -o.p.z).normalize();
    if (dir.lengthSq() < 0.1) dir = V(1, 0, 0);
    dir.applyAxisAngle(UP, (Math.random() - 0.5) * 1.6);
    if (!inside(o.p.x + dir.x * 9, o.p.z + dir.z * 9, 3)) dir.negate();
    o.mode = 'leap2'; o.goal = null;
    o.lp = { ph: 'rush', t: 0, dir, twist: Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0, H: 4.2 + Math.random() * 1.8, D: 6 + Math.random() * 2.5 };
    startle(o, o.p.clone().addScaledVector(dir, -2), 0.8);
  }
  function leap2Step(o, dt, t, water) {
    const L = o.lp; L.t += dt;
    if (L.ph === 'rush') {
      const tgt = o.p.clone().addScaledVector(L.dir, 2.5); tgt.y = water + 0.5;
      o.goal = { p: tgt, v: 11, fast: true, look: tgt }; steer(o, dt, t, water); o.goal = null;
      o.pitch = Math.max(o.pitch, lerp(0, 0.75, Math.min(1, L.t * 2)));
      if (o.p.y >= water - 0.75 || L.t > 2.4) {
        const vy = Math.sqrt(2 * G_AIR * L.H), T_ = 2 * vy / G_AIR;
        let D = L.D; while (D > 2 && !inside(o.p.x + L.dir.x * D, o.p.z + L.dir.z * D, 3)) D -= 0.5;
        L.vel = V(L.dir.x * D / T_, vy, L.dir.z * D / T_); L.ph = 'air'; L.t = 0; L.T = T_;
        o.yaw += wrapPi(yawTo(L.dir) - o.yaw);
        addRipple(o.p.x, o.p.z, 0.9, U.uTime.value); splash(o.p.x, water, o.p.z, 18, 0.7);
      }
    } else if (L.ph === 'air') {
      L.vel.y -= G_AIR * dt; o.p.addScaledVector(L.vel, dt);
      const u = clamp(L.t / L.T, 0, 1), hs = Math.hypot(L.vel.x, L.vel.z);
      o.pitch = Math.atan2(L.vel.y, hs);
      o.arch = -0.32 * Math.sin(Math.PI * u);                         // a bow shape over the top of the arc
      o.roll = L.twist ? L.twist * Math.PI * 0.5 * ease(u) : 0.22 * Math.sin(u * Math.PI * 2);
      o.thrust = 0.9; o.spd = Math.hypot(hs, L.vel.y);
      tailBeat(o, dt, 1.5);
      o.look.x += (0 - o.look.x) * Math.min(1, dt * 10); o.look.y += (-0.5 - o.look.y) * Math.min(1, dt * 10);
      if (Math.random() < 0.6) splashes.push({ x: o.p.x - L.vel.x * 0.05, y: o.p.y, z: o.p.z - L.vel.z * 0.05, vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.5, vy: L.vel.y * 0.2 });
      if (o.p.y < water && L.vel.y < 0) {
        L.ph = 'under'; L.t = 0;
        const big = L.twist ? 1.15 : 0.75;
        addRipple(o.p.x, o.p.z, 1.3 * big, U.uTime.value); addRipple(o.p.x, o.p.z, 0.7, U.uTime.value + 0.3); splash(o.p.x, water, o.p.z, Math.round(26 * big), big);
        L.trail = 0.7;
      }
    } else if (L.ph === 'under') {
      L.vel.multiplyScalar(Math.exp(-dt * 2.6)); L.vel.y += 16 * dt;                    // slows and curves back up, a J under the water
      o.p.addScaledVector(L.vel, dt);
      const hs = Math.hypot(L.vel.x, L.vel.z), floor = terrain.height(o.p.x, o.p.z) + 1.6;
      if (o.p.y < floor) { o.p.y = floor; L.vel.y = Math.max(0, L.vel.y); }
      if (o.p.y > water - 1.2) { o.p.y = water - 1.2; L.vel.y = Math.min(0, L.vel.y); }
      if (!inside(o.p.x, o.p.z, 2.5)) pullInside(o.p, 0.92);
      o.pitch += (Math.atan2(L.vel.y, hs + 0.5) - o.pitch) * Math.min(1, dt * 6);
      o.roll *= Math.exp(-dt * 5); o.spd = L.vel.length();
      if (L.trail > 0) { L.trail -= dt; bubbles.push({ x: o.p.x + (Math.random() - 0.5) * 0.6, z: o.p.z + (Math.random() - 0.5) * 0.6, y: o.p.y + 0.3, vy: 0.8 + Math.random(), size: 0.2 + Math.random() * 0.4, ph: Math.random() * 6 }); }
      o.thrust = 0.5; tailBeat(o, dt, 0.8);
      if (L.t > 1.1) { L.ph = 'shake'; L.t = 0; }
    } else {                                                          // shakes it off, then swims away
      o.p.addScaledVector(L.vel, dt); L.vel.multiplyScalar(Math.exp(-dt * 3));
      o.amp = 0.16; o.phase += Math.PI * 2 * 6.5 * dt; o.pitch *= Math.exp(-dt * 4);
      if (L.t > 0.4) { o.mode = 'swim'; o.spd = Math.max(1.5, L.vel.length()); o.thrust = 1; o.kg = { kick: true, left: 1.2 }; o.t = swimPoint(); o.lp = null; }
    }
  }

  // ---- the first dive: still drops in from above the screen, but it falls nose-first, wriggling, and enters like a diver
  function dive2Step(o, dt, t, water) {
    o.mt += dt;
    const m = o.mesh;
    if (o.mt < 0) return;
    if (!o.intro) {
      const { front, right } = viewAxes();
      const side = Math.random() < 0.5 ? -1 : 1;
      const entry = right.clone().multiplyScalar(side * (4 + Math.random() * 14)).addScaledVector(front, shape.b * 0.3);
      pullInside(entry, 0.7); entry.y = water;
      const start = entry.clone().addScaledVector(right, -side * 9);
      camera.updateMatrixWorld();
      for (start.y = water + 8; start.y < 400; start.y += 2) if (toScreen(start)[1] < -70) break;
      const exitDir = right.clone().multiplyScalar(side);
      const floor = terrain.height(entry.x, entry.z) + 2.2;
      const deep = entry.clone().addScaledVector(exitDir, 2.5); deep.y = Math.max(floor, water - 7.5);
      const exit = entry.clone().addScaledVector(exitDir, 7.5); pullInside(exit, 0.75); exit.y = Math.max(floor + 1, water - 4.5);
      o.intro = { start, entry, deep, exit, prev: start.clone() };
      m.visible = true; m.scale.setScalar(1);
    }
    const I = o.intro, tt = o.mt;
    if (tt < INTRO.fall) {
      const u = tt / INTRO.fall, sY = 0.65 * u + 0.35 * u * u, sX = Math.sin(u * Math.PI / 2);
      o.p.set(lerp(I.start.x, I.entry.x, sX), lerp(I.start.y, I.entry.y, sY), lerp(I.start.z, I.entry.z, sX));
      const vel = o.p.clone().sub(I.prev).divideScalar(Math.max(dt, 1e-3)); I.prev.copy(o.p);
      if (vel.lengthSq() > 0.01) { o.yaw += wrapPi(yawTo(V(I.entry.x - I.start.x, 0, I.entry.z - I.start.z)) - o.yaw); o.pitch = lerp(-0.3, Math.atan2(vel.y, Math.hypot(vel.x, vel.z)), Math.min(1, u * 5)); }
      o.roll = 0.35 * Math.sin(u * Math.PI * 2.5);
      o.spd = 6; o.thrust = 1.1; tailBeat(o, dt, 1.6);
      o.look.y += (-0.6 - o.look.y) * Math.min(1, dt * 8);
      if (Math.random() < 0.35) sparkle(o.p.x, o.p.y + 0.5, o.p.z, 1, 0.8);
    } else {
      if (!o.splashed) {
        o.splashed = true;
        addRipple(I.entry.x, I.entry.z, 2.0, U.uTime.value); addRipple(I.entry.x, I.entry.z, 1.0, U.uTime.value + 0.35);
        splash(I.entry.x, water, I.entry.z, 60, 0.9);
        for (let k = 0; k < 26; k++) bubbles.push({ x: I.entry.x + (Math.random() - 0.5) * 1.6, z: I.entry.z + (Math.random() - 0.5) * 1.6, y: water - 0.6 - Math.random() * 4, vy: 1 + Math.random() * 2, size: 0.3 + Math.random() * 0.5, ph: Math.random() * 6 });
      }
      const u = Math.min(1, (tt - INTRO.fall) / (INTRO.under * 1.3)), e = 1 - Math.pow(1 - u, 2.2);
      // a curve: down from the entry, bottoming out, then level and away
      const a = I.entry, b = I.deep, c = I.exit, q = 1 - e;
      o.p.set(q * q * a.x + 2 * q * e * b.x + e * e * c.x, q * q * a.y + 2 * q * e * b.y + e * e * c.y, q * q * a.z + 2 * q * e * b.z + e * e * c.z);
      const dv = V(2 * q * (b.x - a.x) + 2 * e * (c.x - b.x), 2 * q * (b.y - a.y) + 2 * e * (c.y - b.y), 2 * q * (b.z - a.z) + 2 * e * (c.z - b.z));
      o.yaw += wrapPi(yawTo(dv) - o.yaw); o.pitch = Math.atan2(dv.y, Math.hypot(dv.x, dv.z)); o.roll *= Math.exp(-dt * 4);
      if (u < 0.5 && Math.random() < 0.5) bubbles.push({ x: o.p.x, z: o.p.z, y: o.p.y + 0.4, vy: 1 + Math.random(), size: 0.25, ph: Math.random() * 6 });
      o.spd = 4; o.thrust = 1.2; tailBeat(o, dt, 1.2);
      if (u >= 1) { o.spd = 5; o.thrust = 1; startCelebration(o, water); }
    }
  }

  // ---- playful moments: short scenes that steer a few fish, then let them go
  let scene2 = null, nextPlay = 25;
  const SCENES = ['chase', 'circle', 'follow', 'surface', 'scatter', 'nibble', 'kiss'];
  function freeFish() { return fishObjs.filter((o) => !o.classic && o.mode === 'swim'); }
  function endScene() { if (!scene2) return; scene2.fish.forEach((o) => { o.goal = null; o.hover = 0; }); scene2 = null; }
  function startScene(type) {
    if (FCFG.classic) return false;
    endScene();
    const pool = freeFish().sort(() => Math.random() - 0.5);
    const need = { chase: 2, circle: 2, kiss: 2, follow: 2, surface: 1, scatter: 1, nibble: 1 }[type] || 1;
    if (pool.length < need) return false;
    const water = U.uWater.value;
    const S = { type, t: 0, fish: [], data: {} };
    if (type === 'chase' || type === 'circle' || type === 'kiss') S.fish = pool.slice(0, 2);
    else if (type === 'nibble') S.fish = pool.slice(0, 1);
    else S.fish = pool;
    if (type === 'circle') { const c = S.fish[0].p.clone().add(S.fish[1].p).multiplyScalar(0.5); pullInside(c, 0.55); c.y = clamp(water * 0.5, terrain.height(c.x, c.z) + 3.5, water - 2.5); S.data = { c, R: Math.max(...S.fish.map((o) => o.kd.Lb)) * 0.65, a0: Math.random() * 6.28 }; }
    if (type === 'surface') { const c = swimPoint(); S.data = { c, offs: S.fish.map((o, i) => { const a = i * 2.4 + Math.random(); return V(Math.cos(a) * (1.6 + i * 0.7), 0, Math.sin(a) * (1.6 + i * 0.7)); }) }; }
    if (type === 'scatter') { const c = swimPoint(); S.data = { c }; S.fish.forEach((o) => { startle(o, c, 1.2); const d = o.p.clone().sub(c); d.y = 0; d.normalize(); const p = pullInside(o.p.clone().addScaledVector(d, 14), 0.8); p.y = o.p.y; o.goal = { p, v: o.cruise * 3.2, fast: true }; }); addRipple(c.x, c.z, 0.6, U.uTime.value); }
    if (type === 'nibble') { const o = S.fish[0], q = swimPoint(); q.y = terrain.height(q.x, q.z) + 1.0; S.data = { q, peck: 0 }; }
    if (type === 'kiss') { const [a, b] = S.fish, m = a.p.clone().add(b.p).multiplyScalar(0.5); pullInside(m, 0.65); m.y = clamp(m.y, terrain.height(m.x, m.z) + 3, water - 2); const ax = b.p.clone().sub(a.p); ax.y = 0; if (ax.lengthSq() < 0.01) ax.set(1, 0, 0); ax.normalize(); S.data = { m, ax, held: 0, parted: false }; }
    if (type === 'follow') { S.data = { lead: S.fish[0], trail: [], ang: Math.atan2(S.fish[0].p.z / shape.b, S.fish[0].p.x / shape.a), next: 0 }; }
    if (type === 'chase') S.data = { chaser: S.fish[0], runner: S.fish[1], swapped: false, dart: 0 };
    scene2 = S;
    return true;
  }
  function stepScene(dt, t, water) {
    if (!scene2) {
      if (!FCFG.play || FCFG.classic) return;
      nextPlay -= dt;
      if (nextPlay <= 0) {
        nextPlay = FCFG.playEvery * (0.6 + Math.random() * 0.8);
        const n = freeFish().length, opts = n >= 2 ? SCENES : ['surface', 'nibble'];
        startScene(opts[Math.floor(Math.random() * opts.length)]);
      }
      return;
    }
    const S = scene2, D = S.data; S.t += dt;
    if (S.fish.some((o) => o.mode !== 'swim' || !fishObjs.includes(o))) { endScene(); return; }
    if (S.type === 'chase') {
      const { chaser: a, runner: b } = D;
      a.goal = { p: b.p.clone().addScaledVector(fwdOf(b.yaw), 2), v: a.cruise * 2.0, fast: true, look: b.p };
      D.dart -= dt;
      if (D.dart <= 0 || !b.goal) {
        D.dart = 0.6 + Math.random() * 0.7;
        const away = b.p.clone().sub(a.p); away.y = 0; away.normalize().applyAxisAngle(UP, (Math.random() - 0.5) * 1.8);
        const p = pullInside(b.p.clone().addScaledVector(away, 10), 0.8); p.y = clamp(b.p.y + (Math.random() - 0.5) * 4, terrain.height(p.x, p.z) + 2, water - 1.5);
        b.goal = { p, v: b.cruise * 2.2, fast: true, look: a.p };
      }
      if ((a.p.distanceTo(b.p) < 1.6 || S.t > 4.5) && !D.swapped) { D.swapped = true; D.chaser = b; D.runner = a; startle(a, b.p, 1); D.dart = 0; }
      if (S.t > 9.5) endScene();
    } else if (S.type === 'circle') {
      const w = 0.7, { c, R, a0 } = D;
      S.fish.forEach((o, i) => {
        const ang = a0 + i * Math.PI + S.t * w + 0.55;
        o.goal = { p: V(c.x + Math.cos(ang) * R, c.y, c.z + Math.sin(ang) * R), v: Math.max(o.cruise * 0.9, w * R * 1.25), look: S.fish[1 - i].p };
      });
      if (S.t > 11) endScene();
    } else if (S.type === 'follow') {
      const L = D.lead; D.next -= dt;
      if (D.next <= 0 || !L.goal) { D.ang += 0.9; D.next = 2.2; const q = boundary(D.ang, 0.62); L.goal = { p: V(q.x, clamp(water * (0.45 + 0.2 * Math.sin(D.ang)), 4, water - 2), q.z), v: L.cruise * 1.3 }; }
      D.trail.push({ t: S.t, p: L.p.clone() }); while (D.trail.length > 400) D.trail.shift();
      S.fish.slice(1).forEach((o, i) => {
        const tq = S.t - (i + 1) * 1.1; let q = D.trail[0].p;
        for (let k = D.trail.length - 1; k >= 0; k--) if (D.trail[k].t <= tq) { q = D.trail[k].p; break; }
        o.goal = { p: q.clone(), v: L.cruise * (o.p.distanceTo(q) > 3 ? 1.8 : 1.35), look: L.p };
      });
      if (S.t > 13) endScene();
    } else if (S.type === 'surface') {
      S.fish.forEach((o, i) => {
        const p = D.c.clone().add(D.offs[i]); pullInside(p, 0.85); p.y = water - 0.75;
        o.goal = { p, v: o.cruise * 1.2, hold: true, pitch: 0.4, face: D.c.clone().sub(p).applyAxisAngle(UP, 1.2) };
        if (o.p.distanceTo(p) < 1.3) { o.gulp = (o.gulp || Math.random()) - dt; if (o.gulp <= 0) { o.gulp = 0.5 + Math.random() * 0.6; o.gulpT = 0.45; const nose = o.p.clone().addScaledVector(fwdOf(o.yaw, o.pitch), o.kd.Lb * 0.5); addRipple(nose.x, nose.z, 0.16, U.uTime.value); bubbles.push({ x: nose.x, z: nose.z, y: water - 0.5, vy: 1, size: 0.2, ph: 0 }); } }
      });
      if (S.t > 9) endScene();
    } else if (S.type === 'scatter') {
      if (S.t > 1.5) S.fish.forEach((o) => { o.goal = null; });
      if (S.t > 1.6) endScene();
    } else if (S.type === 'nibble') {
      const o = S.fish[0], q = D.q, near = o.p.distanceTo(q) < 1.6;
      o.goal = { p: q.clone().add(V(0, 0.9, 0)), v: o.cruise * 0.9, hold: true, pitch: -0.55, look: q };
      if (near) { D.peck -= dt; if (D.peck <= 0) { D.peck = 0.55 + Math.random() * 0.4; o.spd += 1.3; o.curl += (Math.random() - 0.5) * 0.2; for (let k = 0; k < 4; k++) bubbles.push({ x: q.x + (Math.random() - 0.5) * 0.8, z: q.z + (Math.random() - 0.5) * 0.8, y: q.y + 0.2, vy: 0.5 + Math.random(), size: 0.12, ph: Math.random() * 6 }); } }
      if (S.t > 8) endScene();
    } else if (S.type === 'kiss') {
      const [a, b] = S.fish, { m, ax } = D;
      if (!D.parted) {
        const pa = m.clone().addScaledVector(ax, -(a.kd.Lb * 0.5 + 0.25)), pb = m.clone().addScaledVector(ax, b.kd.Lb * 0.5 + 0.25);
        a.goal = { p: pa, v: a.cruise, hold: true, face: ax, look: b.p }; b.goal = { p: pb, v: b.cruise, hold: true, face: ax.clone().negate(), look: a.p };
        if (a.p.distanceTo(pa) < 0.9 && b.p.distanceTo(pb) < 0.9) D.held += dt;
        if (D.held > 1.4 || S.t > 10) {
          D.parted = true; S.t2 = S.t;
          [a, b].forEach((o, i) => { const side = ax.clone().applyAxisAngle(UP, i ? 2.2 : -2.2).multiplyScalar(i ? 1 : -1); const p = pullInside(o.p.clone().addScaledVector(side, 9), 0.8); p.y = o.p.y; o.goal = { p, v: o.cruise * 1.6 }; o.curl = (i ? 0.5 : -0.5); });
        }
      } else if (S.t - S.t2 > 2.2) endScene();
    }
  }

  let fishClock = 0;
  function updateFish(dtReal, tReal) {
    const water = U.uWater.value;
    // koi live on their own, slower clock (FCFG.pace); ripples and splashes stay in real time
    const dt = dtReal * FCFG.pace; fishClock += dt; const t = fishClock;
    stepScene(dt, t, water);
    for (const o of fishObjs) {
      if (o.classic) { updateFishClassic(o, dtReal, tReal, water); continue; }
      if (o.mode === 'intro') {
        const k = o.mt < INTRO.fall ? 1 / FCFG.pace : 1;            // the drop from the sky keeps its own 2.8 s
        if (FCFG.dive2) dive2Step(o, dt * k, t, water); else introStepKoi(o, dt * k, t, water);
        poseKoi(o, dt * k, t); continue;
      }
      if (o.mode === 'leap2') { leap2Step(o, dt, t, water); poseKoi(o, dt, t); continue; }
      if (o.mode === 'leap') {          // the classic jump, when the new one is switched off
        leapStep(o, dt, t, water); const r = o.mesh.rotation;
        o.yaw += wrapPi(r.y - o.yaw); o.pitch = r.z; o.roll = r.x; o.amp = 0.2; o.phase += dt * 10;
        pushHeading(o, t); deformKoi(o, t);
        if (o.mode === 'swim') { o.spd = 4; o.pitch = wrapPi(o.pitch); o.roll = 0; }
        continue;
      }
      if (o.mode === 'celebrate') {
        o.mt += dt;
        if (o.mt > 8) o.mode = 'swim';
        else if (o.p.distanceTo(o.t) < 3.5) { o.lap += 1; const q = boundary(o.lapA + 1.2 + o.lap * 1.1, 0.6); o.t = V(q.x, clamp(water * (0.4 + 0.3 * (o.lap % 2)), 4, water - 2.5), q.z); }
      }
      steer(o, dt, t, water);
      poseKoi(o, dt, t);
    }
  }
  // the classic drop-in, used by a koi when the new dive is switched off
  function introStepKoi(o, dt, t, water) {
    introStepClassic(o, dt, t, water);
    const r = o.mesh.rotation; o.yaw += wrapPi(r.y - o.yaw); o.pitch = r.z; o.roll = r.x; o.amp = 0.2; o.phase += dt * 10;
    if (o.mode === 'celebrate') { o.yaw += wrapPi(yawTo(o.vel) - o.yaw); o.spd = 5; o.pitch = 0; o.roll = 0; }
  }

  // ================================================================ bubbles + ambient ripples
  const MAX_DYN = 3200;
  const dynGeo = (() => {
    const b = new Builder();
    for (let i = 0; i < MAX_DYN; i++) b.v(V(0, -999, 0), UP, M.bubble, 0, 0, null, 0.5);
    const g = b.build();
    ['position', 'aMat', 'aLum'].forEach((k) => g.attributes[k].setUsage(T.DynamicDrawUsage));
    return g;
  })();
  const dynPoints = new T.Points(dynGeo, sceneMat);
  dynPoints.frustumCulled = false;
  const bubbles = [], pearlStreams = [], splashes = [], sparkles = [];
  function splash(x, y, z, n, big = 1) { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, sp = (1.5 + Math.random() * 5) * big, r = Math.random() * 0.8 * big; splashes.push({ x: x + Math.cos(a) * r, y: y + 0.2, z: z + Math.sin(a) * r, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (7 + Math.random() * 9) * Math.sqrt(big) }); } }
  function sparkle(x, y, z, n, spread = 3, mat = M.digit) { for (let k = 0; k < n; k++) { const life = 0.8 + Math.random() * 1.2; sparkles.push({ x: x + (Math.random() - 0.5) * spread * 2, y: y + (Math.random() - 0.5) * spread, z: z + (Math.random() - 0.5) * spread, vy: 0.4 + Math.random(), life, max: life, mat }); } }
  let rippleSlot = 0, nextPearl = 1, nextBreath = 4;
  function addRipple(x, z, strength, t) { U.uRip.value[rippleSlot].set(x, z, t, strength); rippleSlot = (rippleSlot + 1) % 8; }

  function simulate(dt, t) {
    updateBrain(dt, t);
    const water = U.uWater.value;
    // the water breathes: soft rings from random spots, no drips
    nextBreath -= dt;
    if (nextBreath <= 0) { const p = swimPoint(); addRipple(p.x, p.z, 0.22 + Math.random() * 0.15, t); nextBreath = 5 + Math.random() * 7; }
    // a slow, wandering current
    U.uFlow.value.set(Math.cos(t * 0.013), Math.sin(t * 0.017) * 0.4, 0.12 + 0.06 * Math.sin(t * 0.05));
    const light = U.uLight.value, growth = U.uGrowth.value;
    nextPearl -= dt * light * light;
    if (nextPearl <= 0 && leafPoints.length) {
      const c = leafPoints.filter((l) => l.b <= growth && l.p.y < water - 1.5);
      if (c.length) pearlStreams.push({ p: c[Math.floor(Math.random() * c.length)].p, left: 4 + Math.floor(Math.random() * 6), next: 0 });
      nextPearl = 0.7 + Math.random() * 1.6;
    }
    for (let i = pearlStreams.length - 1; i >= 0; i--) {
      const s = pearlStreams[i]; s.next -= dt;
      if (s.next <= 0) { bubbles.push({ x: s.p.x, z: s.p.z, y: s.p.y, vy: 1.5, size: 0.1, ph: Math.random() * 6 }); s.left--; s.next = 0.22 + Math.random() * 0.15; if (s.left <= 0) pearlStreams.splice(i, 1); }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.vy += (b.vy < 0 ? 9 : 1.1) * dt; b.y += b.vy * dt;
      b.x += Math.sin(t * 3 + b.ph) * 0.4 * dt;
      b.size = Math.min(1, b.size + dt * 0.12);
      if (b.y >= water - 0.15) { if (!b.splash) addRipple(b.x, b.z, 0.1, t); bubbles.splice(i, 1); }
    }
    while (bubbles.length > 200) bubbles.shift();
    const P = dynGeo.attributes.position, Mt = dynGeo.attributes.aMat, Lm = dynGeo.attributes.aLum;
    let n = 0;
    for (let i = splashes.length - 1; i >= 0; i--) { const q = splashes[i]; q.vy -= 24 * dt; q.x += q.vx * dt; q.z += q.vz * dt; q.y += q.vy * dt; if (q.y < water && q.vy < 0) splashes.splice(i, 1); }
    for (let i = sparkles.length - 1; i >= 0; i--) { const q = sparkles[i]; q.y += q.vy * dt; q.life -= dt; if (q.life <= 0) sparkles.splice(i, 1); }
    for (const b of bubbles) { if (n >= MAX_DYN) break; P.setXYZ(n, b.x, b.y, b.z); Mt.setX(n, M.bubble); Lm.setX(n, 0.25 + b.size * 0.7); n++; }
    for (const q of splashes) {          // each droplet is a short streak so the splash reads against the sky
      if (n + 1 >= MAX_DYN) break;
      P.setXYZ(n, q.x, q.y, q.z); Mt.setX(n, M.drop); Lm.setX(n, 0.62); n++;
      P.setXYZ(n, q.x - q.vx * 0.05, q.y - q.vy * 0.05, q.z - q.vz * 0.05); Mt.setX(n, M.drop); Lm.setX(n, 0.85); n++;
    }
    for (const q of sparkles) { if (n >= MAX_DYN) break; P.setXYZ(n, q.x, q.y, q.z); Mt.setX(n, q.mat); Lm.setX(n, 0.35 + 0.65 * Math.sin(Math.PI * q.life / q.max)); n++; }
    for (; n < MAX_DYN; n++) P.setXYZ(n, 0, -999, 0);
    P.needsUpdate = true; Mt.needsUpdate = true; Lm.needsUpdate = true;
    updateFish(dt, t);
    updateFound(dt, t);
  }

  // ================================================================ sky: sun + moon for your area (from suncalc's formulas)
  const TZ = {
    'America/New_York': [40.71, -74.01], 'America/Detroit': [42.33, -83.05], 'America/Chicago': [41.88, -87.63], 'America/Denver': [39.74, -104.99],
    'America/Phoenix': [33.45, -112.07], 'America/Los_Angeles': [34.05, -118.24], 'America/Anchorage': [61.22, -149.9], 'Pacific/Honolulu': [21.31, -157.86],
    'America/Toronto': [43.65, -79.38], 'America/Vancouver': [49.28, -123.12], 'America/Halifax': [44.65, -63.57], 'America/Mexico_City': [19.43, -99.13],
    'America/Bogota': [4.71, -74.07], 'America/Lima': [-12.05, -77.04], 'America/Sao_Paulo': [-23.55, -46.63], 'America/Argentina/Buenos_Aires': [-34.6, -58.38],
    'America/Santiago': [-33.45, -70.67], 'America/Puerto_Rico': [18.47, -66.11], 'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26],
    'Europe/Lisbon': [38.72, -9.14], 'Europe/Madrid': [40.42, -3.7], 'Europe/Paris': [48.86, 2.35], 'Europe/Berlin': [52.52, 13.4], 'Europe/Amsterdam': [52.37, 4.9],
    'Europe/Rome': [41.9, 12.5], 'Europe/Stockholm': [59.33, 18.07], 'Europe/Oslo': [59.91, 10.75], 'Europe/Helsinki': [60.17, 24.94], 'Europe/Warsaw': [52.23, 21.01],
    'Europe/Athens': [37.98, 23.73], 'Europe/Istanbul': [41.01, 28.98], 'Europe/Moscow': [55.76, 37.62], 'Africa/Cairo': [30.04, 31.24], 'Africa/Lagos': [6.52, 3.38],
    'Africa/Nairobi': [-1.29, 36.82], 'Africa/Johannesburg': [-26.2, 28.05], 'Asia/Dubai': [25.2, 55.27], 'Asia/Kolkata': [28.61, 77.21], 'Asia/Bangkok': [13.76, 100.5],
    'Asia/Singapore': [1.35, 103.82], 'Asia/Hong_Kong': [22.32, 114.17], 'Asia/Shanghai': [31.23, 121.47], 'Asia/Seoul': [37.57, 126.98], 'Asia/Tokyo': [35.68, 139.69],
    'Asia/Manila': [14.6, 120.98], 'Asia/Jakarta': [-6.2, 106.85], 'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96],
    'Australia/Perth': [-31.95, 115.86], 'Pacific/Auckland': [-36.85, 174.76],
  };
  const tzName = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; } })();
  const LOC = TZ[tzName] || [35, -new Date().getTimezoneOffset() / 4];
  const rad = Math.PI / 180, e = rad * 23.4397;
  const toDays = (date) => date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
  const raOf = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const decOf = (l, b) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const sidereal = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  function horiz(H, phi, dec) {
    return { az: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)), alt: Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) };
  }
  function sunCoords(d) {
    const M0 = rad * (357.5291 + 0.98560028 * d);
    const C = rad * (1.9148 * Math.sin(M0) + 0.02 * Math.sin(2 * M0) + 0.0003 * Math.sin(3 * M0));
    const L = M0 + C + rad * 102.9372 + Math.PI;
    return { dec: decOf(L, 0), ra: raOf(L, 0), L };
  }
  function sunPos(date) {
    const lw = rad * -LOC[1], phi = rad * LOC[0], d = toDays(date), c = sunCoords(d);
    return horiz(sidereal(d, lw) - c.ra, phi, c.dec);       // az: from south, west positive
  }
  function moonPos(date) {
    const lw = rad * -LOC[1], phi = rad * LOC[0], d = toDays(date);
    const L = rad * (218.316 + 13.176396 * d), Mm = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.22935 * d);
    const l = L + rad * 6.289 * Math.sin(Mm), b = rad * 5.128 * Math.sin(F);
    const ra = raOf(l, b), dec = decOf(l, b);
    const h = horiz(sidereal(d, lw) - ra, phi, dec);
    // illuminated fraction
    const s = sunCoords(d);
    const phiA = Math.acos(Math.sin(s.dec) * Math.sin(dec) + Math.cos(s.dec) * Math.cos(dec) * Math.cos(s.ra - ra));
    const inc = Math.atan2(149598000 * Math.sin(phiA), (385001 - 20905 * Math.cos(Mm)) - 149598000 * Math.cos(phiA));
    h.frac = (1 + Math.cos(inc)) / 2;
    return h;
  }
  function sunTimes(day) {
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    let rise = null, set = null, prev = sunPos(start).alt / rad;
    for (let m = 5; m <= 1440; m += 5) {
      const t = new Date(start.getTime() + m * 60000), a = sunPos(t).alt / rad;
      if (prev < -0.833 && a >= -0.833 && !rise) rise = t;
      if (prev >= -0.833 && a < -0.833 && !set) set = t;
      prev = a;
    }
    return { rise, set };
  }
  // sky palettes by sun elevation: mornings run cool and peachy, evenings warm and violet
  const DAWN = [
    [-18, '#04060d', '#070b16', '#0b1120'], [-10, '#0b1230', '#1b2148', '#33305a'], [-4, '#1f2f5a', '#4d4a78', '#c48c9e'],
    [1, '#35558a', '#8a8fb4', '#f2bf90'], [8, '#3c6fa8', '#78a6cf', '#cfe2ee'], [22, '#2f6cab', '#5d99cb', '#a8d0ee'], [55, '#2463a6', '#4c8fca', '#9fcdf0'],
  ];
  const DUSK = [
    [-18, '#04060d', '#070b16', '#0b1120'], [-10, '#0d0f2a', '#24183c', '#43223f'], [-4, '#1c2148', '#55325f', '#c4566a'],
    [1, '#2a3c6a', '#8c5a78', '#f0884e'], [8, '#2c5a92', '#6a8cb6', '#ebc193'], [22, '#2b64a4', '#5a93c6', '#b9d2e4'], [55, '#2463a6', '#4c8fca', '#9fcdf0'],
  ];
  function lerpKeys(keys, elev) {
    let i = 0; while (i < keys.length - 2 && elev > keys[i + 1][0]) i++;
    const k0 = keys[i], k1 = keys[i + 1], t = clamp((elev - k0[0]) / (k1[0] - k0[0]), 0, 1);
    return [1, 2, 3].map((j) => vec3(k0[j]).lerp(vec3(k1[j]), t));
  }
  const nightSeed = (d) => { const x = new Date(d); if (x.getHours() < 12) x.setDate(x.getDate() - 1); return seedToInt(x.toDateString()); };
  let skyInfo = { elev: 0, dayF: 1, night: false }, glowTarget = 0;
  function baseLit() { return state.baseOn; }
  function updateBaseLabel() { const el = document.getElementById('baseVal'); if (el) el.textContent = state.baseOn ? 'on' : 'off'; }

  function applySky(date) {
    const sp = sunPos(date), mp = moonPos(date);
    const elev = sp.alt / rad, rising = sunPos(new Date(date.getTime() + 600000)).alt > sp.alt;
    const rows = lerpKeys(rising ? DAWN : DUSK, elev);
    asciiU.uSky0.value.copy(rows[0]); asciiU.uSky1.value.copy(rows[1]); asciiU.uSky2.value.copy(rows[2]);
    const dayF = smooth(-8, 10, elev), gold = Math.exp(-(((elev - 3) / 7) ** 2));
    // sun + moon glows: east on the left, west on the right; never drawn as discs
    const sx = 0.5 + clamp(sp.az / Math.PI, -1.2, 1.2) * 0.62, sy = 0.08 + elev / 70;
    asciiU.uSunPos.value.set(sx, sy);
    const sunWarm = vec3('#ffb070').lerp(vec3('#fff4dc'), smooth(5, 35, elev));
    asciiU.uSunCol.value.copy(sunWarm.multiplyScalar(0.28 * smooth(-10, 2, elev) * (0.6 + 0.4 * gold)));
    const malt = mp.alt / rad;
    asciiU.uMoonPos.value.set(0.5 + clamp(mp.az / Math.PI, -1.2, 1.2) * 0.62, 0.08 + malt / 70);
    asciiU.uMoonCol.value.copy(vec3('#c9d6ff').multiplyScalar(0.16 * mp.frac * smooth(-2, 8, malt) * (1 - dayF)));
    // light on the tank follows whichever is brighter
    const useMoon = dayF < 0.3 && malt > 0;
    const az = useMoon ? mp.az : sp.az, alt = Math.max(useMoon ? mp.alt : sp.alt, 0.35);
    U.uLightDir.value.set(Math.sin(az) * Math.cos(alt) * 0.9, Math.sin(alt), 0.45).normalize();
    {
      const L = U.uLightDir.value, lowness = 1 / Math.max(L.y, 0.22);
      U.uShadeOff.value.set(clamp(-L.x * lowness * TANK.h * 0.55, -38, 38), 4 + 5 * clamp(1 - L.y, 0, 1));
      const sunUp = smooth(-2, 12, elev), moonUp = smooth(-2, 10, malt) * mp.frac;
      U.uShade.value = Math.max(0.62 * sunUp, 0.3 * moonUp * (1 - dayF));
    }
    U.uLight.value = 0.6 + 0.5 * dayF + 0.08 * (useMoon ? mp.frac : 0);
    asciiU.uSkyTint.value.set(1, 1, 1).lerp(new T.Vector3(1.12, 0.95, 0.82), gold * 0.6).lerp(new T.Vector3(0.8, 0.9, 1.15), (1 - dayF) * 0.55);
    asciiU.uDeep.value.copy(vec3('#071820').lerp(vec3('#185160'), 0.15 + 0.85 * dayF));
    // night: stars from astronomical twilight, aurora on some nights in the small hours
    asciiU.uStars.value = smooth(-8, -16, elev) * (1 - 0.6 * mp.frac * smooth(0, 15, malt));
    const auroraNight = (nightSeed(date) % 100) < 30;
    asciiU.uAurora.value = auroraNight ? smooth(-20, -30, elev) * 0.32 : 0;
    skyInfo = { elev, dayF, night: dayF < 0.3 };
    glowTarget = baseLit() ? 0.55 + 0.45 * (1 - dayF) : 0;
    updateBaseLabel();
    const upper = rows[0].clone().lerp(rows[1], 0.5), Lu = 0.2126 * upper.x + 0.7152 * upper.y + 0.0722 * upper.z;
    asciiU.uOverlayCol.value.copy(Lu > 0.32 ? vec3('#143650') : vec3('#f4fbf7').lerp(vec3('#ffe9c8'), gold * 0.5));
    asciiU.uGlowCol.value.copy(Lu > 0.32 ? vec3('#ffffff') : vec3('#a9e4ff'));
    asciiU.uOutlineCol.value.copy(Lu > 0.32 ? vec3('#eef7f8') : vec3('#0a1822'));      // the opposite of the timer's ink
    document.documentElement.style.setProperty('--toutline', Lu > 0.32 ? '#eef7f8' : '#0a1822');
    { const c = asciiU.uOverlayCol.value; document.documentElement.style.setProperty('--tink', `rgb(${Math.round(c.x * 255)}, ${Math.round(c.y * 255)}, ${Math.round(c.z * 255)})`); }
    document.documentElement.style.setProperty('--tglow', Lu > 0.32 ? '#ffffff' : '#a9e4ff');
    // the coffee button follows the sky so it never feels stark
    const bmc = rows[0].clone().multiplyScalar(0.85).lerp(vec3('#0042aa'), 0.35 + 0.35 * dayF).lerp(vec3('#7a3a5a'), gold * 0.35);
    document.documentElement.style.setProperty('--bmc-bg', `rgb(${Math.round(bmc.x * 255)}, ${Math.round(bmc.y * 255)}, ${Math.round(bmc.z * 255)})`);
    // keep text legible against the bottom of the sky
    const bot = rows[2], L = 0.2126 * bot.x + 0.7152 * bot.y + 0.0722 * bot.z;
    const light = L > 0.5, root = document.documentElement.style;
    root.setProperty('--ink', light ? '#0f2a3d' : '#eef5f3');
    root.setProperty('--ink-dim', light ? 'rgba(15, 42, 61, 0.72)' : 'rgba(238, 245, 243, 0.68)');
    root.setProperty('--line', light ? 'rgba(15, 42, 61, 0.22)' : 'rgba(238, 245, 243, 0.22)');
    root.setProperty('--chip', light ? 'rgba(255, 255, 255, 0.38)' : 'rgba(8, 14, 22, 0.42)');
    root.setProperty('--shadow', light ? 'none' : '0 1px 10px rgba(0,0,0,.3)');
    root.setProperty('--glow', light ? '#ffffff' : '#a9e4ff');
    root.setProperty('--scrim', light ? 'rgba(244, 250, 252, 0.7)' : 'rgba(5, 12, 20, 0.6)');      // the backdrop behind the bottom controls
    {
      const card = rows[1].clone().lerp(vec3('#ffffff'), 0.2 * dayF).lerp(vec3('#000000'), 0.3 * (1 - dayF));
      const Lc = 0.2126 * card.x + 0.7152 * card.y + 0.0722 * card.z;
      root.setProperty('--card-bg', `rgb(${Math.round(card.x * 255)}, ${Math.round(card.y * 255)}, ${Math.round(card.z * 255)})`);
      root.setProperty('--card-ink', Lc > 0.3 ? '#143650' : '#eef5f3');
    }
  }

  // ================================================================ sound: a soft synthesized bell
  let audioCtx = null;
  function audio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      audioCtx.onstatechange = () => syncPlayBtn();
    }
    if (audioCtx.state !== 'running' && audioCtx.state !== 'closed') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  // one soft, round tone: a slow swell, a slight shimmer from two close sine waves, a long fade
  function bell(kind = 'focus-done') {
    if (!state.sound) return;
    const ctx = audio(); if (!ctx) return;
    const when = ctx.currentTime + 0.03, base = kind === 'focus-done' ? 432 : 486;
    const out = ctx.createGain(); out.gain.value = kind === 'focus-done' ? 0.16 : 0.11;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; lp.Q.value = 0.2;
    out.connect(lp).connect(ctx.destination);
    [[1, 1, 6.5], [1.004, 0.55, 6.0], [2.0, 0.12, 3.2], [2.99, 0.035, 1.8]].forEach(([r, a, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = base * r;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(a, when + 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, when + d);
      o.connect(g).connect(out); o.start(when); o.stop(when + d + 0.1);
    });
  }

  // ================================================================ timer
  function remaining() { const tm = state.timer; return tm.mode.endsWith('-run') ? Math.max(0, (tm.endsAt - Date.now()) / 1000) : tm.remaining; }
  const fmt = (sec) => { sec = Math.ceil(sec); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
  const fmt2 = (sec) => { sec = Math.ceil(sec); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
  function startPhase(kind) {
    const mins = kind === 'focus' ? FOCUS_MIN : REST_MIN;
    if (kind === 'focus') brainLeave();
    music.fresh[kind] = true;
    state.timer = { mode: `${kind}-run`, endsAt: Date.now() + mins * 60000, remaining: mins * 60 };
  }
  // after "call it a day" the start screen is just the title, so you can wander the tank with no timer asking for anything.
  // Clicking the title brings "start focus" back.
  let dayPeek = false;
  const dayOver = () => !!state.brain && !dayPeek;
  function timerPress() {
    audio();     // unlock sound on the first press
    const tm = state.timer;
    if (tm.mode === 'idle' && dayOver()) {
      if (!timerAnim) withTimerDither(() => { dayPeek = true; renderTimerText(true); announce(); });
      return;
    }
    if (tm.mode === 'idle' || tm.mode === 'rest-done') startPhase('focus');
    else if (tm.mode === 'focus-done') { startPhase('rest'); revealFish(); }
    else if (tm.mode.endsWith('-run')) { tm.remaining = remaining(); tm.mode = tm.mode.replace('-run', '-pause'); }
    else { tm.endsAt = Date.now() + tm.remaining * 1000; tm.mode = tm.mode.replace('-pause', '-run'); }
    save(); renderTimerText(true); announce(); primeMusic();
  }
  function timerReset() { state.timer = { mode: 'idle', endsAt: 0, remaining: FOCUS_MIN * 60 }; while (state.pendingFish > 0) revealFish(); save(); renderTimerText(true); announce(); }
  // paused: a "reset timer" button under the timer. It dithers the timer away to the start screen; undo brings it back
  function updateTimerActions() {
    const box = document.getElementById('timerActions'); if (!box) return;
    // two jobs share this slot: "reset timer" while paused, and "call it a day" once a focus session ends
    const askDone = state.timer.mode === 'focus-done' && !state.brain && undoWhere !== 'timer';
    box.dataset.kind = askDone ? 'done' : 'reset';
    box.hidden = !(state.timer.mode.endsWith('-pause') || undoWhere === 'timer' || askDone) || !!timerAnim;
  }
  function placeTimerActions() {
    const box = document.getElementById('timerActions'); if (!box || box.hidden || !band) return;
    const oy = (window.innerHeight - grid.rows * grid.chCss) / 2;
    const top = Math.round(oy + (band.bandTop + band.actTop) * grid.chCss);
    if (top !== box._top) { box._top = top; box.style.top = `${top}px`; }
  }
  function resetTimerUndoable() {
    if (!state.timer.mode.endsWith('-pause') || timerAnim) return;
    const prev = JSON.parse(JSON.stringify(state.timer));
    const restore = () => {
      // resetting folded the focus turns into the tank's resting angle; take them back out so undo doesn't spin it around
      if (prev.mode === 'focus-pause') { const p = clamp(1 - prev.remaining / (FOCUS_MIN * 60), 0, 1); state.view -= p * TURNS * 360; state.lastProgress = p; }
      state.timer = prev; save(); renderTimerText(true); announce();
    };
    withTimerDither(() => { timerReset(); }, () => showUndo(() => withTimerDither(restore), 'timer'));
    $('live').textContent = 'Timer cleared. Undo is available for a few seconds.';
  }
  // the timer's own dither: the digits dissolve, the swap happens, the new words fill back in
  let timerAnim = null;
  function withTimerDither(swap, after) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || timerAnim) { swap(); if (after) after(); return; }
    timerAnim = { phase: 'out', t: 0, swap, after };
    updateTimerActions();
  }
  function stepTimerDither(dt) {
    const a = timerAnim; if (!a) return;
    a.t += Math.min(dt, 0.06);
    const OUT = 0.55, IN = 0.85;
    if (a.phase === 'out') {
      const u = Math.min(1, a.t / OUT); asciiU.uTimerDither.value = 0.5 - 0.5 * Math.cos(Math.PI * u);
      if (u >= 1) { a.swap(); a.phase = 'in'; a.t = 0; }
    } else {
      const u = Math.min(1, a.t / IN); asciiU.uTimerDither.value = 0.5 + 0.5 * Math.cos(Math.PI * u);
      if (u >= 1) { asciiU.uTimerDither.value = 0; timerAnim = null; updateTimerActions(); if (a.after) a.after(); }
    }
  }
  function completePom(fromTimer) {
    state.growth = Math.min(MAX_POMS, state.growth + 1);
    state.evap = Math.min(MAX_POMS, state.evap + 1);
    state.fish.push(newFish());
    state.pendingFish = (state.pendingFish || 0) + 1;     // revealed when you start your rest
    // face the tank straight on for the rest
    if (fromTimer) { bell('focus-done'); }
    exitGrowthPreview(); save(); updateDrawer();
    $('live').textContent = 'Focus session complete. Start your rest to meet a new fish, or call it a day.';
  }
  function tickTimer() {
    const tm = state.timer;
    if (tm.mode.endsWith('-run') && remaining() <= 0) {
      // with Dither open in two tabs, both reach 0:00: the first one counts the session, the other takes its result
      const other = readSaved();
      if (other && other.timer && other.timer.from === tm.endsAt) { adoptSaved(other); return; }
      if (tm.mode === 'focus-run') { state.timer = { mode: 'focus-done', endsAt: 0, remaining: 0, from: tm.endsAt }; completePom(true); updateTimerActions(); placeTimerActions(); }
      else { state.timer = { mode: 'rest-done', endsAt: 0, remaining: 0, from: tm.endsAt }; bell('rest-done'); $('live').textContent = 'Rest is over. Start focusing when you are ready.'; }
      save(); writeSave();
    }
    renderTimerText();
  }
  // The timer keeps its own clock. Browsers pause drawing in a background tab (good: no wasted work), but the bell,
  // the title and the music fade must still happen on time. A once-a-second beat covers that, and a one-off alarm set
  // for the exact end of each session catches it even when the browser slows the beat down for a quiet tab.
  var lastBeat = performance.now(), endAlarm = 0;     // var: save() can run before this line does
  function heartbeat() {
    const now = performance.now(), dt = Math.min(2, (now - lastBeat) / 1000); lastBeat = now;
    tickTimer();
    if (document.hidden) musicTick(dt);       // when the tab is visible, the render loop does this every frame
    syncPlayBtn(); syncWakeLock();
  }
  function setEndAlarm() {
    clearTimeout(endAlarm);
    const tm = state.timer;
    if (tm.mode.endsWith('-run')) endAlarm = setTimeout(heartbeat, Math.max(0, tm.endsAt - Date.now()) + 50);
  }
  setInterval(heartbeat, 1000);
  document.addEventListener('visibilitychange', heartbeat);

  // keep the screen on while a session runs, so a phone on the desk doesn't dim and lock mid-focus.
  // Paused, idle or in another tab, the lock is let go and the phone sleeps as usual.
  let wakeLock = null;
  function syncWakeLock() {
    if (!navigator.wakeLock) return;
    const want = state.timer.mode.endsWith('-run') && !document.hidden;
    if (want && !wakeLock) {
      wakeLock = 'asking';
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLock = lock;
        lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
      }).catch(() => { wakeLock = null; });
    } else if (!want && wakeLock && wakeLock !== 'asking') { wakeLock.release().catch(() => {}); wakeLock = null; }
  }

  // two tabs: when the other one saves a change, take it on here too (without saving it back)
  function adoptSaved(o) {
    if (!o || !o.timer || o.fishDay !== state.fishDay) return;
    const timerChanged = JSON.stringify(o.timer) !== JSON.stringify(state.timer);
    state.timer = o.timer; state.growth = o.growth ?? state.growth; state.evap = o.evap ?? state.evap;
    const fishChanged = (o.fish || []).length !== state.fish.length || (o.pendingFish || 0) !== state.pendingFish;
    state.fish = o.fish || []; state.pendingFish = o.pendingFish || 0;
    if (fishChanged) syncFish();
    if (o.seed && (o.seed !== state.seed || o.shape !== state.shape)) { state.seed = o.seed; if (SHAPES[o.shape]) state.shape = o.shape; generate(state.seed); updateDrawer(); }
    if (!!o.brain !== !!state.brain) { state.brain = !!o.brain; if (state.brain) makeBrain(false); else brainLeave(); syncBrainUI(); }
    if (typeof o.musicVol === 'number') { state.musicVol = o.musicVol; state.musicMuted = o.musicMuted === true; syncVolUI(); }
    if (timerChanged) { clearTimeout(endAlarm); if (state.timer.mode.endsWith('-run')) endAlarm = setTimeout(heartbeat, Math.max(0, state.timer.endsAt - Date.now()) + 50); renderTimerText(true); }
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key !== STORE_KEY || !ev.newValue) return;
    try { adoptSaved(JSON.parse(ev.newValue)); } catch (e) { /* not ours to read */ }
  });
  function announce() {
    const tm = state.timer, hit = $('timerHit');
    const label = (tm.mode === 'idle' && dayOver()) ? 'Dither. Show the start focus button' : (tm.mode === 'idle' || tm.mode === 'rest-done') ? 'Start a 25 minute focus session' : tm.mode === 'focus-done' ? 'Rest up: start a 5 minute rest' : tm.mode.endsWith('-run') ? `Pause timer, ${fmt(remaining())} left` : `Resume timer, ${fmt(remaining())} left`;
    hit.setAttribute('aria-label', label);
  }
  // draw the timer text: label (small) + big digits or "focus"
  let lastTimerText = '';
  function timerStrings() {
    const tm = state.timer, rem = remaining();
    if (tm.mode === 'idle' && dayOver()) return { label: '', big: 'Dither', dim: 1, title: true };
    if (tm.mode === 'idle') return { label: 'start focus', icon: true, big: 'Dither', dim: 1, title: true };
    if (tm.mode === 'focus-done') return { label: 'rest up', icon: true, big: '0:00', dim: 1, waiting: true };
    if (tm.mode === 'rest-done') return { label: 'focus', icon: true, big: '0:00', dim: 1, waiting: true };
    const isRest = tm.mode.startsWith('rest');
    const paused = tm.mode.endsWith('-pause');
    return { label: paused ? 'paused' : isRest ? 'rest' : '', big: fmt(rem), dim: paused ? 0.6 : 1 };
  }
  // fill is drawn in red; a soft blurred copy in green is the glow the screen shows on hover
  let digitDrop = 0;
  function drawTimer(ctx, w, h, sx, label, big, icon) {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const ink = (fn) => {
      ctx.save(); ctx.shadowColor = '#00ff00'; ctx.shadowBlur = Math.max(2, h * 0.07); ctx.fillStyle = '#00ff00';
      fn((t, x, y) => ctx.fillText(t, x, y)); fn((t, x, y) => ctx.fillText(t, x, y)); ctx.restore();
      ctx.fillStyle = '#ff0000'; fn((t, x, y) => ctx.fillText(t, x, y));
    };
    ctx.save(); ctx.translate(w / 2, 0); ctx.scale(sx, 1);
    if (/\d/.test(big)) {
      let bigSize = band.digit;
      { const units = big.split('').reduce((a, c) => a + (c === ':' ? 0.32 : 0.62), 0), maxW = (w / sx) * 0.94; if (bigSize * units > maxW) bigSize = maxW / units; }   // never wider than the band
      ctx.font = `800 ${bigSize}px ${FONT_UI}`;
      const slot = bigSize * 0.62, colon = bigSize * 0.32;    // fixed-width slots: no jiggle
      const widths = big.split('').map((c) => (c === ':' ? colon : slot));
      let x = -widths.reduce((a, b) => a + b, 0) / 2;
      const xs = widths.map((wd) => { const c = x + wd / 2; x += wd; return c; });
      ink((draw) => big.split('').forEach((c, i) => draw(c, xs[i], band.digitBase)));
    } else {
      // a word in the digits' place (the name on the start screen): as big as fits the band
      let size = band.digit * 1.1;
      ctx.font = `800 ${size}px ${FONT_UI}`;
      const maxW = (w / sx) * 0.96, mw = ctx.measureText(big).width;
      if (mw > maxW) { size *= maxW / mw; ctx.font = `800 ${size}px ${FONT_UI}`; }
      ink((draw) => draw(big, 0, band.digitBase));
    }
    if (label) {
      ctx.font = `800 ${h * 0.24}px ${FONT_UI}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(1, Math.round(h * 0.015))}px`;
      const tw = ctx.measureText(label).width, iw = icon ? h * 0.17 : 0, gap = icon ? h * 0.09 : 0;
      const x0 = -(tw + iw + gap) / 2, base = h * 0.93;
      ctx.textAlign = 'left';
      ink((draw) => {
        draw(label, x0 + iw + gap, base);
        if (icon) {            // a play triangle, drawn with the same ink and glow
          const th = h * 0.19, ty = base - h * 0.175;
          ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x0 + iw, ty + th / 2); ctx.lineTo(x0, ty + th); ctx.closePath(); ctx.fill();
        }
      });
      ctx.textAlign = 'center';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    ctx.restore();
  }
  let waiting = false;
  function renderTimerText(force) {
    const s = timerStrings();
    const key = `${s.label}|${s.icon}|${s.big}|${s.dim}|${grid.cols}|${grid.rows}`;
    asciiU.uOverlayDim.value = s.dim; waiting = !!s.waiting;
    const nm = state.name || 'Dither', mode = state.timer.mode;
    document.title = mode === 'idle' ? nm : mode === 'focus-done' ? `Time to rest · ${nm}` : mode === 'rest-done' ? `Time to focus · ${nm}` : `${s.label === 'rest' ? 'rest ' : ''}${s.big} · ${nm}`;
    if (key === lastTimerText && !force) return;
    lastTimerText = key;
    if (state.digitsIn) {
      drawTimer(digitCanvas.getContext('2d'), digitCanvas.width, digitCanvas.height, 1, s.label, s.big, true);
      digitTex.needsUpdate = true;
    } else {
      const ctx = overlayCanvas.getContext('2d'), B = band;
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      // the digits: a band in the sky above the tank, sized to the grid (words go to real type when that option is on)
      const asType = state.wordsStyle !== 'dots';
      const pad = B.bandTop;      // room above the band, so tall letters (the dot on the i) aren't clipped
      const tmp = document.createElement('canvas'); tmp.width = B.bandW; tmp.height = B.bandH + pad;
      digitDrop = Math.min(B.bandH * 0.09, 16 / grid.chCss);           // about 16px lower
      const tc = tmp.getContext('2d'); tc.translate(0, pad);
      drawTimer(tc, B.bandW, B.bandH, grid.ch / grid.cw, null, asType && !/\d/.test(s.big) ? '' : s.big, false);
      ctx.drawImage(tmp, B.bandX, B.bandTop - pad);      // flipY on the texture means canvas top = screen top
      overlayTex.needsUpdate = true;
      const lc = lblCanvas.getContext('2d');
      lc.clearRect(0, 0, lblCanvas.width, lblCanvas.height);
      if (s.label && !asType) drawLabel(lc, B, s.label, s.icon, grid.ch / grid.cw);
      lblTex.needsUpdate = true;
      updateWords(s);
      updateTimerActions(); placeTimerActions();
    }
    asciiU.uOverlayOn.value = 1;
    announce();
  }
  // the small words, drawn at F× the grid so each cell can hold F×F tiny dots; lighter weight than the digits
  function drawLabel(ctx, B, label, icon, sx) {
    const F = B.F, h = B.bandH * F, offY = (B.lTop - B.bandTop) * F;   // drawn in band coordinates, shifted up into the label strip
    ctx.save(); ctx.translate(ctx.canvas.width / 2, -offY); ctx.scale(sx, 1);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    let size = B.lab * F;
    ctx.font = `600 ${size}px ${FONT_UI}`;
    { const need = ctx.measureText(label).width * 1.1 + (icon ? size : 0), maxW = (ctx.canvas.width / sx) * 0.92; if (need > maxW) { size *= maxW / need; ctx.font = `600 ${size}px ${FONT_UI}`; } }
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.05)}px`;
    const tw = ctx.measureText(label).width, iw = icon ? size * 0.58 : 0, gap = icon ? size * 0.38 : 0;
    const x0 = -(tw + iw + gap) / 2, base = B.labBase * F;
    const shape = () => {
      ctx.fillText(label, x0 + iw + gap, base);
      if (icon) { const th = size * 0.68, ty = base - size * 0.69; ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x0 + iw, ty + th / 2); ctx.lineTo(x0, ty + th); ctx.closePath(); ctx.fill(); }
    };
    ctx.save(); ctx.shadowColor = '#00ff00'; ctx.shadowBlur = Math.max(2, h * 0.05); ctx.fillStyle = '#00ff00'; shape(); shape(); ctx.restore();
    ctx.fillStyle = '#ff0000'; shape();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }
  // prototype option: the words as real type, laid over the same spot
  function updateWords(s) {
    const el = document.getElementById('words'); if (!el || !band) return;
    const style = state.wordsStyle;
    document.body.classList.toggle('words-type', style !== 'dots');
    el.classList.remove('geist', 'doto'); if (style !== 'dots') el.classList.add(style);
    el.classList.toggle('dim', s.dim < 0.99);
    if (style === 'dots') return;
    const B = band, cw = grid.cwCss, ch = grid.chCss;
    const ox = (window.innerWidth - grid.cols * cw) / 2, oy = (window.innerHeight - grid.rows * ch) / 2;
    const H = B.bandH * ch;
    Object.assign(el.style, { left: `${ox + B.bandX * cw}px`, top: `${oy + B.bandTop * ch}px`, width: `${B.bandW * cw}px`, height: `${H}px` });
    const big = el.querySelector('.big'), lab = el.querySelector('.lab');
    const word = !/\d/.test(s.big) ? s.big : '';
    big.textContent = word; big.style.fontSize = `${H * 0.52}px`; big.style.top = `${H * 0.62 - H * 0.52 * 0.76}px`;
    lab.style.display = s.label ? 'flex' : 'none';
    lab.querySelector('.t').textContent = s.label || '';
    lab.querySelector('.play').style.display = s.icon ? 'block' : 'none';
    const fs = Math.max(15, H * 0.2) * (style === 'doto' ? 1.18 : 1);
    lab.style.fontSize = `${fs}px`; lab.style.top = `${H * 0.93 - fs * 0.76}px`;
  }
  // keep the invisible button sitting on the timer
  function placeTimerHit() {
    const hit = $('timerHit');
    let x0, y0, x1, y1;
    if (state.digitsIn) {
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
        const p = V(sx * DIGIT_W / 2, sy * DIGIT_H / 2, 0).applyMatrix4(digitMesh.matrixWorld).project(camera);
        return [(p.x * 0.5 + 0.5), (1 - (p.y * 0.5 + 0.5))];
      });
      x0 = Math.min(...pts.map((p) => p[0])); x1 = Math.max(...pts.map((p) => p[0]));
      y0 = Math.min(...pts.map((p) => p[1])); y1 = Math.max(...pts.map((p) => p[1]));
      const vw = grid.cols * grid.cwCss, vh = grid.rows * grid.chCss, ox = (window.innerWidth - vw) / 2, oy = (window.innerHeight - vh) / 2;
      x0 = ox + x0 * vw; x1 = ox + x1 * vw; y0 = oy + y0 * vh; y1 = oy + y1 * vh;
      // trim to the glyph area (the canvas has some empty space)
      const padX = (x1 - x0) * 0.12, padY = (y1 - y0) * 0.02; x0 += padX; x1 -= padX; y0 += padY; y1 -= padY;
    } else {
      const ox = (window.innerWidth - grid.cols * grid.cwCss) / 2, oy = (window.innerHeight - grid.rows * grid.chCss) / 2;
      x0 = ox + (band.bandX + band.bandW * 0.15) * grid.cwCss; x1 = ox + (band.bandX + band.bandW * 0.85) * grid.cwCss;
      y0 = oy + band.bandTop * grid.chCss; y1 = oy + (band.bandTop + band.bandH) * grid.chCss;
    }
    Object.assign(hit.style, { left: `${x0}px`, top: `${y0}px`, width: `${Math.max(40, x1 - x0)}px`, height: `${Math.max(30, y1 - y0)}px` });
  }

  // ================================================================ UI
  const $ = (id) => document.getElementById(id);
  // ---- dither for page elements: an 8×8 Bayer tile as a CSS mask, stepped from empty to full (or back)
  const D_STEPS = 16, D_CELL = 3;
  const ditherMasks = (() => {
    const B = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
               [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
    const c = document.createElement('canvas'); c.width = c.height = 8 * D_CELL; const x = c.getContext('2d'), out = [];
    for (let k = 0; k <= D_STEPS; k++) {
      x.clearRect(0, 0, c.width, c.height); x.fillStyle = '#000';
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (B[j][i] < (k / D_STEPS) * 64) x.fillRect(i * D_CELL, j * D_CELL, D_CELL, D_CELL);
      out.push(`url(${c.toDataURL()})`);
    }
    return out;
  })();
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setMask(el, k) {
    if (k == null) { el.style.webkitMaskImage = el.style.maskImage = ''; el.classList.remove('dithering'); return; }
    el.classList.add('dithering');
    el.style.webkitMaskSize = el.style.maskSize = `${8 * D_CELL}px ${8 * D_CELL}px`;
    el.style.webkitMaskImage = el.style.maskImage = ditherMasks[k];
  }
  // show: dither in from nothing; hide: dither out to nothing. done() runs at the end.
  function ditherEl(el, show, ms, done) {
    const token = (el._dither = (el._dither || 0) + 1);
    if (reduceMotion()) { setMask(el, null); if (done) done(); return; }
    const t0 = performance.now();
    const step = (now) => {
      if (el._dither !== token) return;              // a newer animation took over
      const u = Math.min(1, (now - t0) / ms);
      if (u >= 1) { setMask(el, show ? null : 0); if (done) done(); return; }
      setMask(el, Math.round((show ? u : 1 - u) * D_STEPS));
      requestAnimationFrame(step);
    };
    setMask(el, show ? 0 : D_STEPS);
    requestAnimationFrame(step);
  }
  const stopDither = (el) => { el._dither = (el._dither || 0) + 1; setMask(el, null); };

  // ---- halftone icons: an SVG used as a mask over a dot pattern; the halo is a blurred copy
  const ICONS = {
    refresh: '<path d="M20.2 12.5a8.2 8.2 0 1 1-2.6-6.4"/><path d="M20.4 3.6v5.2h-5.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.3" r="0.7" fill="#000"/>',
    back: '<path d="M19 12H6"/><path d="M11 6.5 5.5 12l5.5 5.5"/>',
    coffee: '<path d="M4.5 10.5h12v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 12h1.2a2.4 2.4 0 0 1 0 4.8h-1.6"/><path d="M8 2.8c-1 1.1 1 2.2 0 3.6"/><path d="M11 2.8c-1 1.1 1 2.2 0 3.6"/><path d="M14 2.8c-1 1.1 1 2.2 0 3.6"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    play: '<path d="M8 5.2v13.6l10.6-6.8z" fill="#000"/>',
    undo: '<path d="M3.8 12.5a8.2 8.2 0 1 0 2.6-6.4"/><path d="M3.6 3.6v5.2h5.2"/>',
    vol: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    mute: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    brain: '<path d="M12 5.6c-1.1-1.8-4.4-1.8-5.3.4-2 .1-3.1 2.2-2.2 3.9-1.6 1-1.5 3.6.3 4.4-.3 2 1.7 3.5 3.5 2.8.8 1.6 2.9 1.7 3.7.2"/><path d="M12 5.6c1.1-1.8 4.4-1.8 5.3.4 2 .1 3.1 2.2 2.2 3.9 1.6 1 1.5 3.6-.3 4.4.3 2-1.7 3.5-3.5 2.8-.8 1.6-2.9 1.7-3.7.2"/><path d="M12 5.6v11.8"/><path d="M8.2 9.6c1 .2 1.6.9 1.6 1.9M15.8 9.6c-1 .2-1.6.9-1.6 1.9"/>',
    trash: '<path d="M4 7h16"/><path d="M9.5 7V4.6h5V7"/><path d="M6.4 7l1 12.1a1.7 1.7 0 0 0 1.7 1.5h5.8a1.7 1.7 0 0 0 1.7-1.5L17.6 7"/><path d="M10.2 10.6v6.4M13.8 10.6v6.4"/>',
    dice: '<g transform="rotate(-14 7.2 14.6)"><rect x="1.8" y="9.2" width="10.8" height="10.8" rx="2.4"/><circle cx="4.9" cy="12.3" r="1.05" fill="#000" stroke="none"/><circle cx="7.2" cy="14.6" r="1.05" fill="#000" stroke="none"/><circle cx="9.5" cy="16.9" r="1.05" fill="#000" stroke="none"/></g><g transform="rotate(12 16.6 8)"><rect x="11.2" y="2.6" width="10.8" height="10.8" rx="2.4"/><circle cx="14.3" cy="5.7" r="1.05" fill="#000" stroke="none"/><circle cx="18.9" cy="5.7" r="1.05" fill="#000" stroke="none"/><circle cx="14.3" cy="10.3" r="1.05" fill="#000" stroke="none"/><circle cx="18.9" cy="10.3" r="1.05" fill="#000" stroke="none"/></g>',
  };
  const svgURL = (inner, halo) => `url("data:image/svg+xml,${encodeURIComponent(halo
    ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='-6 -6 36 36'><defs><filter id='b' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='2.2'/></filter></defs><g filter='url(#b)' fill='none' stroke='#000' stroke-width='5.5' stroke-linecap='round' stroke-linejoin='round'>${inner}</g></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#000' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`)}")`;
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.style.setProperty('--m', svgURL(ICONS[el.dataset.icon]));
    const halo = el.parentElement.querySelector('.ht-halo');
    if (halo) halo.style.setProperty('--mb', svgURL(ICONS[el.dataset.icon], true));
  });

  // ---- undo: a button that stands in for whatever it undoes
  let undoFn = null, undoTimer = 0;
  const pill = $('undoPill');
  var undoWhere = null;      // "tank" or "timer" while an undo is offered (var: read before this line runs)
  const UNDO_MS = 3000;
  // "reset timer": undo swaps in under the timer right away, and hovering it holds it there
  function showUndo(fn, where) {
    if (fn) {
      if (undoWhere === 'tank') cancelTankUndo();
      undoFn = fn; undoWhere = where || 'timer'; wake();               // undo always arrives with the controls showing
      $('resetBtn').after(pill); $('resetBtn').hidden = true;
      updateTimerActions(); placeTimerActions();
    }
    pill.hidden = false; pill.classList.remove('leaving');
    clearTimeout(undoTimer); clearTimeout(pill._fade);
    pill._fade = setTimeout(() => pill.classList.add('leaving'), UNDO_MS - 280); undoTimer = setTimeout(hideUndo, UNDO_MS);
  }
  function hideUndo() {
    if (undoWhere === 'tank') cancelTankUndo();
    stopDither(pill); pill.hidden = true; pill.classList.remove('leaving'); undoFn = null; clearTimeout(undoTimer); clearTimeout(pill._fade);
    $('resetBtn').hidden = false; undoWhere = null; updateTimerActions();
  }
  const timerHold = () => { if (undoWhere !== 'timer') return; pill.classList.remove('leaving'); clearTimeout(undoTimer); clearTimeout(pill._fade); };
  const timerRelease = () => { if (undoWhere === 'timer' && undoFn) showUndo(); };
  pill.addEventListener('mouseenter', timerHold);
  pill.addEventListener('mouseleave', timerRelease);
  pill.addEventListener('focus', timerHold);
  pill.addEventListener('blur', timerRelease);
  pill.onclick = () => {
    if (!undoFn || staticAnim || timerAnim) return;
    const f = undoFn;
    if (undoWhere === 'tank') endTankUndo(); else hideUndo();
    f();
  };

  // "new tank" and its undo take turns in the dock: the button dithers out and undo dithers in. Undo stays 3 s
  // once the new tank has filled in (hovering doesn't hold it), then dithers out, and "new tank" comes back a
  // second later. That pause keeps quick clicks from bouncing back and forth between two tanks.
  const TANK_GAP_MS = 1000, SWAP_MS = 220;
  let tankStep = 0;       // bumps whenever the cycle moves on, so leftover timers from an earlier step do nothing
  function offerTankUndo(fn) {
    const btn = $('rescapeBtn'), step = ++tankStep, hadFocus = document.activeElement === btn;
    undoFn = fn; undoWhere = 'tank'; wake();
    clearTimeout(undoTimer); clearTimeout(pill._fade); pill.classList.remove('leaving');
    ditherEl(btn, false, SWAP_MS, () => {
      if (step !== tankStep) return;
      btn.hidden = true; setMask(btn, null);
      btn.after(pill); pill.hidden = false; ditherEl(pill, true, SWAP_MS);
      if (hadFocus) pill.focus();
    });
  }
  function startTankUndoClock() {        // runs once the new tank has filled in
    if (undoWhere !== 'tank') return;
    const step = tankStep;
    clearTimeout(undoTimer); undoTimer = setTimeout(() => { if (step === tankStep) endTankUndo(); }, UNDO_MS);
  }
  function endTankUndo() {
    const step = ++tankStep, hadFocus = document.activeElement === pill;
    undoFn = null; undoWhere = null; clearTimeout(undoTimer);
    ditherEl(pill, false, SWAP_MS, () => {
      if (step !== tankStep) return;
      pill.hidden = true; setMask(pill, null);
      setTimeout(() => tankBtnBack(step, hadFocus), TANK_GAP_MS);
    });
  }
  function tankBtnBack(step, focus) {
    if (step !== tankStep) return;
    if (staticAnim) { setTimeout(() => tankBtnBack(step, focus), 100); return; }     // after an undo, wait for the old tank to settle
    const btn = $('rescapeBtn'); btn.hidden = false;
    if (!document.body.classList.contains('idle')) ditherEl(btn, true, SWAP_MS);
    if (focus) btn.focus();
  }
  function cancelTankUndo() {            // something else needs the undo button: put "new tank" straight back
    tankStep++; clearTimeout(undoTimer); undoFn = null; undoWhere = null;
    stopDither(pill); pill.hidden = true;
    const btn = $('rescapeBtn'); stopDither(btn); btn.hidden = false;
  }

  // ---- about: halftone glass with the name, credit and coffee
  const about = $('about');
  function openAbout() { drawAboutEdge(); document.body.classList.add('about-open'); about.classList.add('on'); ditherEl(about, true, 420); $('aboutBtn').setAttribute('aria-expanded', 'true'); setTimeout(() => $('aboutClose').focus(), 50); }
  function closeAbout() { document.body.classList.remove('about-open'); $('aboutBtn').setAttribute('aria-expanded', 'false'); $('aboutBtn').focus(); ditherEl(about, false, 360, () => { about.classList.remove('on'); setMask(about, null); }); }
  // dots around the card, big at the edge and shrinking with distance: a glow made of halftone
  function drawAboutEdge() {
    const cv = $('aboutEdge'), card = cv.parentElement, pad = 48;
    const hw = card.offsetWidth / 2, hh = card.offsetHeight / 2, W = hw * 2 + pad * 2, H = hh * 2 + pad * 2;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() || '#ffffff';
    const pitch = 4.4, rad = 34, cx = W / 2, cy = H / 2;
    for (let y = pitch / 2; y < H; y += pitch) for (let x = pitch / 2; x < W; x += pitch) {
      const qx = Math.abs(x - cx) - (hw - rad), qy = Math.abs(y - cy) - (hh - rad);
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;   // distance from the rounded edge
      if (d < -2) continue;                                     // the black card covers the middle
      const r = pitch * 0.5 * Math.pow(Math.exp(-Math.max(0, d) / 12), 0.6);
      if (r < 0.3) continue;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  window.addEventListener('resize', () => { if (about.classList.contains('on')) drawAboutEdge(); });
  $('aboutBtn').onclick = openAbout;
  $('aboutClose').onclick = closeAbout;
  about.addEventListener('mousedown', (ev) => { if (ev.target === about) closeAbout(); });
  about.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); closeAbout(); } });

  function rescape() {
    if (staticAnim || undoWhere === 'tank' || $('rescapeBtn').hidden) return;     // one tank change at a time
    endFollow(false);
    const prev = { seed: state.seed, growth: state.growth, evap: state.evap, shape: state.shape };
    state.seed = randomSeed(); state.growth = 0; state.evap = 0;
    state.shape = Math.random() < 0.35 ? 'oval' : 'box';       // most tanks are rectangular; about 1 in 3 comes up oval
    exitGrowthPreview();
    offerTankUndo(() => withStatic(() => { Object.assign(state, prev); generate(state.seed); save(); updateDrawer(); syncShapeSeg(); }));
    withStatic(() => { generate(state.seed); save(); updateDrawer(); syncShapeSeg(); }, startTankUndoClock);
  }
  // ================================================================ "done with work": the big brain
  // It falls in from above the screen, plops, then floats and bobs until the next focus session, when it dithers away.
  const propGroup = new T.Group();
  const BRAIN_SCALE = 17;
  let brain = null, brainGeo = null, shake = 0, waterBoost = 0;
  const brainUniforms = Object.assign({}, U, { uTrans: { value: new T.Vector3(0, 0, 0) } });   // its own dither, so it can leave on its own
  const brainMat = new T.ShaderMaterial({ uniforms: brainUniforms, vertexShader: SCENE_VERT, fragmentShader: SCENE_FRAG, side: T.DoubleSide });
  function brainGeometry() {
    const g = new T.IcosahedronGeometry(1, 16);
    const P = g.attributes.position, p = new T.Vector3();
    const noise = makeNoise(mulberry32(41));
    const n3 = (x, y, z) => (noise(x + z * 0.7 + 3, y + 1) + noise(y * 1.1 + 11, z + x * 0.3 + 5) + noise(z * 0.9 + 7, x * 0.8 - y * 0.4 + 2)) / 3;
    const fold = (d) => Math.abs(Math.sin(n3(d.x * 2.3, d.y * 2.3, d.z * 2.3) * 13));
    const fiss = (d) => Math.exp(-Math.pow(d.x / 0.09, 2)) * smooth(-0.45, 0.1, d.y);
    const depth = [];
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i).normalize();
      const groove = 1 - smooth(0.0, 0.5, fold(p));
      const r = 1 - 0.11 * groove - 0.22 * fiss(p);
      const y = p.y < -0.3 ? -0.3 + (p.y + 0.3) * 0.5 : p.y;
      P.setXYZ(i, p.x * r * 0.9, y * r * 0.78, p.z * r * 1.16);
      depth.push(Math.max(groove, fiss(p)));
    }
    g.computeVertexNormals();
    const b = new Builder(), N = g.attributes.normal, n = new T.Vector3(), L = V(0.35, 0.85, 0.4).normalize();
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
      const lit = 0.3 + 0.65 * Math.max(0, n.dot(L));
      b.v(p.clone(), n.clone(), M.ticket, 0, 0, null, Math.max(0.05, lit * (1 - 0.55 * depth[i])), 0);
    }
    const c = new T.IcosahedronGeometry(1, 9), C = c.attributes.position;
    for (let i = 0; i < C.count; i++) {
      p.fromBufferAttribute(C, i).normalize();
      const rib = Math.abs(Math.sin(p.y * 9 + p.z * 1.5));
      const r = 1 - 0.09 * (1 - smooth(0, 0.5, rib));
      C.setXYZ(i, p.x * r * 0.5, -0.42 + p.y * r * 0.27, -0.78 + p.z * r * 0.36);
    }
    c.computeVertexNormals();
    const CN = c.attributes.normal;
    for (let i = 0; i < C.count; i++) {
      p.fromBufferAttribute(C, i); n.fromBufferAttribute(CN, i);
      const rib = Math.abs(Math.sin(((p.y + 0.42) / 0.27) * 9));
      const lit = 0.26 + 0.6 * Math.max(0, n.dot(L));
      b.v(p.clone(), n.clone(), M.ticket, 0, 0, null, Math.max(0.05, lit * (0.55 + 0.45 * smooth(0, 0.5, rib))), 0);
    }
    return b.build();
  }

  function makeBrain(falling) {
    if (!brainGeo) brainGeo = brainGeometry();
    if (brain) propGroup.remove(brain.mesh);
    const mesh = new T.Mesh(brainGeo, brainMat); mesh.frustumCulled = false; mesh.rotation.order = 'YXZ'; mesh.scale.setScalar(BRAIN_SCALE);
    const pos = pullInside(V(0, 0, 0), 0.75);
    const yaw = T.MathUtils.degToRad(state.az) + Math.PI / 2;     // side-on to you: the classic brain silhouette
    if (falling) { camera.updateMatrixWorld(); for (pos.y = U.uWater.value + 6; pos.y < 600; pos.y += 2) if (toScreen(V(pos.x, pos.y - BRAIN_SCALE * 0.9, pos.z))[1] < -40) break; }
    else pos.y = U.uWater.value - BRAIN_SCALE * 0.43;
    brain = { mesh, pos, vel: V(0, falling ? -34 : 0, 0), g: 78,
              rot: falling ? V(Math.random() * 6, Math.random() * 6, Math.random() * 6) : V(0, yaw, 0),
              spin: falling ? V((Math.random() - 0.5) * 1.3, 1.3 * (Math.random() < 0.5 ? -1 : 1), (Math.random() - 0.5) * 1.3) : V(0, 0, 0),
              phase: falling ? 'fall' : 'float', tau: falling ? 0 : 10, leave: 0 };
    if (!falling) waterBoost = 2.0;
    propGroup.add(mesh);
  }
  function updateBrain(dt, t) {
    const water = U.uWater.value;
    if (!brain) { waterBoost += (0 - waterBoost) * (1 - Math.exp(-dt * 1.5)); if (waterBoost < 0.01) waterBoost = 0; return; }
    const b = brain;
    let sx = 1, sy = 1, rockX = 0, rockZ = 0;
    if (b.phase === 'leaving') {
      b.leave = Math.min(1, b.leave + dt / 1.3);
      brainUniforms.uTrans.value.set(2, 0.5 - 0.5 * Math.cos(Math.PI * b.leave), 0);
      waterBoost = 2.0 * (1 - b.leave);
      if (b.leave >= 1) { propGroup.remove(b.mesh); brain = null; brainUniforms.uTrans.value.set(0, 0, 0); state.brain = false; save(); syncBrainUI(); return; }
    } else brainUniforms.uTrans.value.copy(U.uTrans.value);     // otherwise it dithers along with "new tank"
    if (b.phase === 'fall') {
      dt *= FCFG.pace;                                    // falls in slow motion, like a new koi's world
      b.vel.y -= b.g * dt; b.pos.addScaledVector(b.vel, dt); b.rot.addScaledVector(b.spin, dt);
      if (Math.random() < 0.6) sparkle(b.pos.x, b.pos.y + 0.62 * BRAIN_SCALE + 0.5, b.pos.z, 2, 5);
      if (b.pos.y - 0.62 * BRAIN_SCALE <= water) {
        b.phase = 'float'; b.tau = 0;
        const x = b.pos.x, z = b.pos.z;
        addRipple(x, z, 6, t); addRipple(x, z, 4.5, t + 0.25); addRipple(x, z, 3, t + 0.6);
        [[14, 0], [-14, 0], [0, 10], [0, -10]].forEach(([dx, dz], k) => addRipple(x + dx, z + dz, 2.2, t + 0.15 + k * 0.05));
        splash(x, water, z, 820, 4.6);
        const R0 = BRAIN_SCALE * 0.55;
        for (let k = 0; k < 260; k++) { const a = Math.random() * 6.28, sp = 5 + Math.random() * 7; splashes.push({ x: x + Math.cos(a) * R0, y: water + 0.3, z: z + Math.sin(a) * R0 * 0.8, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 18 + Math.random() * 14 }); }
        for (let k = 0; k < 220; k++) bubbles.push({ x: x + (Math.random() - 0.5) * 24, z: z + (Math.random() - 0.5) * 18, y: water - 1 - Math.random() * 14, vy: 1.5 + Math.random() * 3.5, size: 0.3 + Math.random() * 0.8, ph: Math.random() * 6 });
        shake = 1.6;
        for (const o of fishObjs) if (o.mode === 'swim') startCelebration(o, water);
        b.vel.multiplyScalar(0.22);
      }
    } else {
      // floating: it plunges, springs back up past the line, then settles into a slow bob and a gentle rock
      b.tau += dt;
      const eq = water - BRAIN_SCALE * 0.43 + Math.sin(t * 1.15) * 0.4 + Math.sin(t * 0.53 + 1) * 0.25;
      b.vel.y += ((eq - b.pos.y) * 6.5 - b.vel.y * 1.15) * dt;
      b.pos.y += b.vel.y * dt;
      b.spin.multiplyScalar(Math.exp(-dt * 1.6));
      b.rot.y += b.spin.y * dt;
      const want = T.MathUtils.degToRad(state.az) + Math.PI / 2;
      const d = ((want - b.rot.y) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2;
      b.rot.y += d * (1 - Math.exp(-dt * 1.2));
      const settle = 1 - Math.exp(-dt * 2.2);
      b.rot.x += (Math.round(b.rot.x / (Math.PI * 2)) * Math.PI * 2 - b.rot.x) * settle;
      b.rot.z += (Math.round(b.rot.z / (Math.PI * 2)) * Math.PI * 2 - b.rot.z) * settle;
      const wob = Math.exp(-b.tau * 4.5) * Math.cos(b.tau * 15);          // jelly squash on impact
      sx = 1 + 0.12 * wob; sy = 1 - 0.22 * wob;
      rockX = Math.sin(t * 0.9) * 0.05 - b.vel.y * 0.006; rockZ = Math.sin(t * 0.7 + 2) * 0.06;
      if (b.phase === 'float') waterBoost = 2.0 + 1.8 * Math.exp(-b.tau * 1.6) * Math.cos(b.tau * 5.2);   // surge, then a slosh
    }
    b.mesh.position.copy(b.pos); b.mesh.rotation.set(b.rot.x + rockX, b.rot.y, b.rot.z + rockZ);
    b.mesh.scale.set(BRAIN_SCALE * sx, BRAIN_SCALE * sy, BRAIN_SCALE * sx);
  }
  // forget the brain right away (not when the animation ends), so a reload or a background tab can't bring it back
  function brainLeave() { if (brain && brain.phase !== 'leaving') { brain.phase = 'leaving'; brain.leave = 0; } if (state.brain) { state.brain = false; save(); } }
  function pokeBrain() { if (!brain || brain.phase !== 'float') return; brain.vel.y -= 9; addRipple(brain.pos.x, brain.pos.z, 1.6, U.uTime.value); splash(brain.pos.x, U.uWater.value, brain.pos.z, 60, 1.6); }
  function syncBrainUI() { document.body.classList.toggle('has-brain', !!state.brain); }
  function doneWithWork() {
    if (brain) return;
    endFollow(false);
    hideUndo();
    // the brain takes the new koi's place: drop the koi this session earned before the reset would reveal it
    if (state.pendingFish > 0) { state.fish.splice(state.fish.length - state.pendingFish, state.pendingFish); state.pendingFish = 0; syncFish(); }
    if (state.timer.mode !== 'idle') withTimerDither(() => { timerReset(); });
    dayPeek = false;
    makeBrain(true); state.brain = true; save(); syncBrainUI(); updateTimerActions(); renderTimerText(true); announce();
    startFollow(brain, true);                             // ride it down from the sky, then stay with it
    $('live').textContent = 'Called it a day. Enjoy the rest of it.';
  }

  // ================================================================ music: lofi under focus and rest
  // Each loops while its timer runs, fades in when it starts, fades out over the last few seconds and when paused.
  // On the web it's decoded into memory and looped sample-accurately (MP3s gap when an <audio> element loops);
  // opened straight from a file, it falls back to a plain <audio> element.
  const TRACKS = { focus: 'audio/lofi-loop.mp3', rest: 'audio/lofi-relaxing.mp3' };
  const music = { el: {}, gain: {}, buf: {}, loading: {}, src: {}, t0: {}, offset: { focus: 0, rest: 0 }, level: { focus: 0, rest: 0 },
                  startedAt: {}, fresh: {}, last: null, wantGesture: false, playing: { focus: false, rest: false } };
  const useGraph = /^https?:$/.test(location.protocol) && !!(window.AudioContext || window.webkitAudioContext);
  function loadBuffer(k) {
    if (music.buf[k] || music.loading[k]) return;
    const ctx = audio(); if (!ctx) return;
    music.loading[k] = fetch(TRACKS[k]).then((r) => { if (!r.ok) throw new Error(`${TRACKS[k]}: ${r.status}`); return r.arrayBuffer(); }).then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej))).then((buf) => {
      // find where the sound actually starts and ends: MP3 encoders pad both ends with silence, which would click the loop
      const d = buf.getChannelData(0), eps = 1e-4; let a = 0, b = d.length - 1;
      while (a < 8192 && Math.abs(d[a]) < eps) a++;
      while (b > d.length - 8192 && Math.abs(d[b]) < eps) b--;
      music.buf[k] = { buf, start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate };
      if (music.playing[k]) startSource(k);
    }).catch((err) => {
      // couldn't fetch or decode it: say so in the console and try again in a few seconds while it's still wanted
      console.warn('Dither music did not load', err);
      music.loading[k] = null;
      setTimeout(() => { if (music.playing[k]) loadBuffer(k); }, 5000);
    });
  }
  function gainFor(k) {
    const ctx = audio(); if (!ctx) return null;
    if (!music.gain[k]) { const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination); music.gain[k] = g; }
    return music.gain[k];
  }
  function startSource(k) {
    const ctx = audio(), B = music.buf[k]; if (!ctx || !B || music.src[k]) return;
    const src = ctx.createBufferSource(); src.buffer = B.buf; src.loop = true; src.loopStart = B.start; src.loopEnd = B.end;
    src.connect(gainFor(k));
    const off = B.start + (music.offset[k] % (B.end - B.start));
    src.start(0, off); music.src[k] = src; music.t0[k] = ctx.currentTime - (off - B.start);
  }
  function stopSource(k) {
    const ctx = audio(), B = music.buf[k], src = music.src[k]; if (!src) return;
    if (ctx && B) music.offset[k] = (ctx.currentTime - music.t0[k]) % (B.end - B.start);
    // in a background tab the last step of the fade is still gliding down, so let it finish before stopping
    try { src.stop(ctx && document.hidden ? ctx.currentTime + 1 : 0); } catch (e) { /* already stopped */ }
    music.src[k] = null;
  }
  function musicEl(k) { if (!music.el[k]) { const a = new Audio(TRACKS[k]); a.loop = true; a.preload = 'auto'; music.el[k] = a; } return music.el[k]; }
  function playMusic(k) {
    music.playing[k] = true;
    if (useGraph) { if (music.fresh[k]) music.offset[k] = 0; loadBuffer(k); startSource(k); return; }
    const el = musicEl(k); if (music.fresh[k]) el.currentTime = 0;
    if (el.paused) el.play().then(() => { music.wantGesture = false; }).catch(() => { music.wantGesture = true; });
  }
  function pauseMusic(k) { music.playing[k] = false; if (useGraph) stopSource(k); else if (music.el[k] && !music.el[k].paused) music.el[k].pause(); }
  // the audio engine glides to each new level itself, so the fade stays smooth even when a background tab only ticks once a second
  function setLevel(k, v, glide) {
    if (useGraph) { const g = music.gain[k]; if (g) g.gain.setTargetAtTime(v, g.context.currentTime, glide); }
    else if (music.el[k]) music.el[k].volume = clamp(v, 0, 1);
  }
  function primeMusic() {                    // called inside a click, so browsers allow the sound to start
    audio();
    const m = state.timer.mode, k = m === 'focus-run' ? 'focus' : m === 'rest-run' ? 'rest' : null;
    if (k && !music.playing[k]) playMusic(k);
  }
  function musicTick(dt) {
    const m = state.timer.mode, k = m === 'focus-run' ? 'focus' : m === 'rest-run' ? 'rest' : null;
    if (k !== music.last) { if (k) music.startedAt[k] = performance.now(); music.last = k; }
    for (const kk of ['focus', 'rest']) {
      let target = 0;
      if (kk === k && !state.musicMuted) {
        const fin = clamp((performance.now() - (music.startedAt[kk] || 0)) / ((music.fresh[kk] ? 2.5 : 1.0) * 1000), 0, 1);
        target = state.musicVol * fin * clamp(remaining() / 4, 0, 1);      // in over a couple of seconds, gone by 0:00
      }
      if (target > 0.001 && !music.playing[kk] && !music.wantGesture) playMusic(kk);
      music.level[kk] += (target - music.level[kk]) * (1 - Math.exp(-dt * (target > music.level[kk] ? 10 : 6)));
      setLevel(kk, Math.pow(music.level[kk], 1.6), Math.max(0.03, dt * 0.25));   // curved so the slider feels even
      if (target === 0 && music.level[kk] < 0.004 && music.playing[kk]) { pauseMusic(kk); music.level[kk] = 0; }
      if (target > 0 && music.fresh[kk] && music.level[kk] > target * 0.95) music.fresh[kk] = false;
    }
  }
  // Browsers only let sound start from a tap or click. So when you come back to a page with a session running
  // (a reload, or a phone that slept), the music waits: the first tap anywhere starts it, and a play button shows until then.
  function musicKey() { const m = state.timer.mode; return m === 'focus-run' ? 'focus' : m === 'rest-run' ? 'rest' : null; }
  function musicStalled() {
    const k = musicKey();
    if (!k || state.musicMuted || state.musicVol <= 0.001 || remaining() < 4) return false;
    if (useGraph) return !audioCtx || audioCtx.state !== 'running';
    return music.wantGesture || !music.el[k] || music.el[k].paused;
  }
  function resumeMusic() {
    audio();
    const k = musicKey(); if (!k) return;
    music.wantGesture = false; music.playing[k] = false; playMusic(k);     // picks up where it left off
  }
  function syncPlayBtn() {
    const b = document.getElementById('playBtn'); if (!b) return;
    const want = musicStalled();
    if (want === !b.hidden) return;
    b.hidden = !want;
    if (want && !document.body.classList.contains('idle')) ditherEl(b, true, 220);
  }
  window.addEventListener('pointerdown', () => { if (musicStalled()) resumeMusic(); }, true);

  // the haze shell: the tank's own outline, a hair outside the glass, from under the base to above the rim
  const HAZE_VERT = /* glsl */`void main() { gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;
  const HAZE_FRAG = /* glsl */`
    uniform float uStatic, uTime;
    float hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = floor(gl_FragCoord.xy); float fr = floor(uTime * 24.0);
      float band = 0.55 + 0.45 * sin(c.y * 0.7 + uTime * 38.0) * sin(c.y * 0.13 - uTime * 9.0);   // rolling bands, like a dial between stations
      if (hh(c + fr * 17.31) > uStatic * 0.92 * band) discard;
      gl_FragColor = vec4(hh(c * 1.7 + fr), ${M.haze}.0 / 63.0, 0.0, 0.0);
    }
  `;
  const hazeMat = new T.ShaderMaterial({ uniforms: { uStatic: U.uStatic, uTime: U.uTime }, vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG, side: T.DoubleSide, depthWrite: false });
  let hazeMesh = null;
  function makeHaze() {
    const N = 96, y0 = -2.8, y1 = TANK.h + 0.6, sc = 1.03, pos = [];
    for (let k = 0; k < N; k++) {
      const a = boundary((k / N) * Math.PI * 2, sc), b = boundary(((k + 1) % N / N) * Math.PI * 2, sc);
      pos.push(a.x, y0, a.z, b.x, y0, b.z, a.x, y1, a.z, a.x, y1, a.z, b.x, y0, b.z, b.x, y1, b.z);     // a wall panel
      pos.push(0, y1, 0, a.x, y1, a.z, b.x, y1, b.z);                                                 // the lid
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    hazeMesh = new T.Mesh(g, hazeMat); hazeMesh.frustumCulled = false; hazeMesh.renderOrder = 10; hazeMesh.visible = false;
    return hazeMesh;
  }
  // like a radio between stations: the dots break into static, the new tank swaps in underneath, then it tunes in
  let staticAnim = null;
  function withStatic(swap, after) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || staticAnim) { swap(); if (after) after(); return; }
    staticAnim = { phase: 'out', t: 0, swap, after };
    document.body.classList.add('swapping');
  }
  const TRANS = [
    { name: 'shell static', out: 0.6, in: 1.5, waver: true },      // v0.10's: haze on a shell around the glass (slowed down)
    { name: 'static dissolve', out: 0.8, in: 1.7, waver: true },   // every surface breaks into flickering static
    { name: 'dither', out: 1.0, in: 1.85, waver: false, gentle: true },   // ~30% slower than the lab, steady through the middle so every band shows          // ordered-dither fade: tops vanish first, the new tank fills in from the bottom
    { name: 'dither + static', out: 0.8, in: 1.5, waver: false },  // the same, with a band of static riding the edge
  ];
  let transStyle = 2;      // dither: tops dissolve first, the new tank fills in from the bottom
  function setTrans(v) {
    if (transStyle === 0) { U.uStatic.value = v; U.uTrans.value.set(0, 0, 0); }
    else { U.uStatic.value = 0; U.uTrans.value.set(transStyle, v, 0); }
  }
  function stepStatic(dt) {
    const a = staticAnim; if (!a) return;
    a.t += Math.min(dt, 0.06);
    const S = TRANS[transStyle];
    if (a.phase === 'out') {
      const uo = Math.min(1, a.t / S.out);
      setTrans(S.gentle ? 0.5 - 0.5 * Math.cos(Math.PI * uo) : ease(uo));
      if (a.t >= S.out) { a.phase = 'swap'; setTimeout(() => { a.swap(); a.phase = 'in'; a.t = 0; }, 0); }
    } else if (a.phase === 'hold') {
      /* test hook */
    } else if (a.phase === 'swap') {
      setTrans(1);
    } else {
      const u = Math.min(1, a.t / S.in);
      setTrans(u >= 1 ? 0 : S.waver ? Math.pow(1 - u, 1.3) * (0.72 + 0.28 * Math.cos(u * 15)) : S.gentle ? 0.5 + 0.5 * Math.cos(Math.PI * u) : 1 - ease(u));
      if (u >= 1) { staticAnim = null; document.body.classList.remove('swapping'); if (a.after) a.after(); }
    }
  }

  $('rescapeBtn').onclick = rescape;
  $('tune').onclick = () => { const on = !$('drawer').classList.contains('on'); $('drawer').classList.toggle('on', on); $('tune').setAttribute('aria-expanded', on); $('tune').classList.toggle('on', on); };
  $('timerHit').onclick = timerPress;
  let hovering = false;
  ['mouseenter', 'focus'].forEach((ev) => $('timerHit').addEventListener(ev, () => { hovering = true; }));
  ['mouseleave', 'blur'].forEach((ev) => $('timerHit').addEventListener(ev, () => { hovering = false; }));

  $('resetBtn').onclick = resetTimerUndoable;
  const volBtn = $('volBtn'), volSlider = $('volSlider');
  function setIcon(el, name) { el.style.setProperty('--m', svgURL(ICONS[name])); const h = el.parentElement.querySelector('.ht-halo'); if (h) h.style.setProperty('--mb', svgURL(ICONS[name], true)); }
  function syncVolUI() {
    const off = state.musicMuted || state.musicVol <= 0.001;
    setIcon(volBtn.querySelector('.ht-icon'), off ? 'mute' : 'vol');
    volBtn.setAttribute('aria-label', off ? 'Unmute music' : 'Mute music'); volBtn.setAttribute('aria-pressed', String(off));
    volBtn.querySelector('.tip').textContent = off ? 'unmute' : 'mute';
    volSlider.value = String(state.musicMuted ? 0 : state.musicVol);
  }
  volBtn.onclick = () => { if (state.musicMuted || state.musicVol <= 0.001) { state.musicMuted = false; if (state.musicVol <= 0.001) state.musicVol = 0.5; } else state.musicMuted = true; save(); syncVolUI(); primeMusic(); };
  volSlider.oninput = () => { state.musicVol = +volSlider.value; state.musicMuted = state.musicVol <= 0.001; save(); syncVolUI(); primeMusic(); };
  syncVolUI();
  $('playBtn').onclick = () => { resumeMusic(); setTimeout(syncPlayBtn, 200); };
  $('doneBtn').onclick = doneWithWork;
  $('addPom').onclick = () => { completePom(false); revealFish(); };
  // testing: jump to 3 seconds before the end of whichever phase is next
  $('endSoon').onclick = () => {
    audio();
    const tm = state.timer;
    if (tm.mode === 'focus-done') { startPhase('rest'); revealFish(); }
    else if (tm.mode === 'idle' || tm.mode === 'rest-done') startPhase('focus');
    state.timer.mode = state.timer.mode.replace('-pause', '-run');
    state.timer.endsAt = Date.now() + 3000;
    save(); renderTimerText(true);
  };
  // testing: put any found object in the current tank
  (() => {
    const sel = $('findSel');
    const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
    sel.appendChild(opt('', 'none'));
    [['common', 'Common'], ['rare', 'Rare'], ['kitsch', 'Kitsch'], ['ultra', 'Ultra rare']].forEach(([k, label]) => {
      const g = document.createElement('optgroup'); g.label = label;
      FOUND[k].forEach((t) => g.appendChild(opt(t, FOUND_NAMES[t])));
      sel.appendChild(g);
    });
    $('findPlace').onclick = () => placeFound(sel.value || null);
  })();
  $('resetTimer').onclick = timerReset;
  const wordStyles = ['dots', 'geist', 'doto'];
  seg('wordsSeg', ['dots', 'Geist Mono', 'Doto'], wordStyles.indexOf(state.wordsStyle), (i) => { state.wordsStyle = wordStyles[i]; save(); renderTimerText(true); });
  $('baseAuto').onclick = toggleBase;
  $('resetFish').onclick = () => { state.fish = []; state.pendingFish = 0; syncFish(); save(); };
  function exitGrowthPreview() { state.growthPreview = null; $('growthNow').classList.add('on'); }
  $('growth').oninput = (ev) => { state.growthPreview = +ev.target.value; $('growthNow').classList.remove('on'); updateDrawer(); };
  $('growthNow').onclick = () => { exitGrowthPreview(); updateDrawer(); };
  $('sky').oninput = (ev) => { state.skyPreview = +ev.target.value; $('skyNow').classList.remove('on'); applySky(skyDate()); updateSkyLabel(); };
  $('skyNow').onclick = () => { state.skyPreview = null; $('skyNow').classList.add('on'); applySky(skyDate()); updateSkyLabel(); };
  function seg(id, items, current, onPick) {
    const el = $(id); el.innerHTML = '';
    items.forEach((name, i) => {
      const b = document.createElement('button'); b.textContent = name; b.setAttribute('aria-pressed', String(i === current));
      b.onclick = () => { onPick(i); [...el.children].forEach((c, j) => c.setAttribute('aria-pressed', String(j === i))); };
      el.appendChild(b);
    });
  }
  const shapeNames = Object.keys(SHAPES);
  function syncShapeSeg() { const el = document.getElementById('shapeSeg'); if (el) [...el.children].forEach((c, j) => c.setAttribute('aria-pressed', String(shapeNames[j] === state.shape))); }
  seg('shapeSeg', shapeNames, shapeNames.indexOf(state.shape), (i) => { state.shape = shapeNames[i]; generate(state.seed); save(); });
  $('sound').checked = state.sound;
  $('sound').onchange = (ev) => { state.sound = ev.target.checked; save(); if (state.sound) bell('rest-done'); };

  function updateFishLabel() { const el = document.getElementById('fishVal'); if (el) el.textContent = `${state.fish.length}${state.pendingFish ? ` (${state.pendingFish} waiting)` : ''}`; }
  function updateFindLabel() {
    const el = document.getElementById('findVal');
    if (el) el.textContent = terrain && terrain.item ? FOUND_NAMES[terrain.item] : 'none in this tank';
  }
  function updateDrawer() {
    const g = state.growthPreview ?? state.growth;
    $('growth').value = g;
    const gs = Math.abs(g - Math.round(g)) < 0.05 ? String(Math.round(g)) : g.toFixed(1);
    $('growthVal').textContent = `${gs} pom${gs === '1' ? '' : 's'}${state.growthPreview != null ? ' (preview)' : ''}`;
  }
  function skyDate() { if (state.skyPreview == null) return new Date(); const d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getTime() + state.skyPreview * 3600000); }
  let sunCache = { day: '', v: null };
  function updateSkyLabel() {
    const d = skyDate();
    if (sunCache.day !== d.toDateString()) sunCache = { day: d.toDateString(), v: sunTimes(d) };
    const f = (x) => (x ? x.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—');
    $('skyVal').textContent = `${f(d)}${state.skyPreview != null ? ' (preview)' : ''}`;
    $('sky').title = `sunrise ${f(sunCache.v.rise)} · sunset ${f(sunCache.v.set)}`;
    if (state.skyPreview == null) $('sky').value = d.getHours() + d.getMinutes() / 60;
  }

  // tap the left/right edge of the tank: face it straight on again and restart the slow sway
  // tap the left or right edge to turn the tank a quarter turn that way.
  // Landing on the front or back: settle straight on, then the slow sway starts again from there.
  // Landing on a short side: hold still.
  function turn(dir) { state.view += dir * 90; state.driftPhase = 0; state.driftAmp = 0; }
  const facing = () => ((Math.round(state.view / 90) * 90) % 360 + 360) % 360;
  // tap the water for a ripple
  const ray = new T.Raycaster();
  function screenToNdc(cx, cy) {
    const vw = grid.cols * grid.cwCss, vh = grid.rows * grid.chCss, ox = (window.innerWidth - vw) / 2, oy = (window.innerHeight - vh) / 2;
    return new T.Vector2(((cx - ox) / vw) * 2 - 1, 1 - ((cy - oy) / vh) * 2);
  }
  function tankScreenBox() {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let k = 0; k < 24; k++) for (const y of [0, TANK.h]) {
      const p = boundary((k / 24) * Math.PI * 2).setY(y).project(camera);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    return { x0, x1, y0, y1 };
  }
  function zoneAt(cx, cy) {
    const n = screenToNdc(cx, cy), b = tankScreenBox();
    if (n.y < b.y0 || n.y > b.y1 || n.x < b.x0 - 0.04 || n.x > b.x1 + 0.04) return '';
    const w = b.x1 - b.x0;
    if (n.x < b.x0 + w * 0.18) return 'l';
    if (n.x > b.x1 - w * 0.18) return 'r';
    return 'water';
  }
  function toScreen(p) {
    const v = p.clone().project(camera), vw = grid.cols * grid.cwCss, vh = grid.rows * grid.chCss;
    return [(window.innerWidth - vw) / 2 + (v.x * 0.5 + 0.5) * vw, (window.innerHeight - vh) / 2 + (1 - (v.y * 0.5 + 0.5)) * vh];
  }
  function pxPerUnit(p) { const [ax] = toScreen(p), [bx] = toScreen(p.clone().add(V(1, 0, 0).applyQuaternion(camera.quaternion))); return Math.abs(bx - ax); }
  function hitTest(cx, cy) {
    let best = null, bd = Infinity;
    for (const o of fishObjs) {
      if (o.mode === 'intro' || o.mode === 'leap' || o.mode === 'leap2') continue;
      const [sx, sy] = toScreen(o.p), r = Math.max(16, pxPerUnit(o.p) * o.f.size * 2.6), d = Math.hypot(sx - cx, sy - cy);
      if (d < r && d < bd) { bd = d; best = { fish: o }; }
    }
    if (found && !found.anim) {
      const c = found.root.localToWorld(V(0, found.type === 'cd' ? 1.9 : 1.2, 0));
      const [sx, sy] = toScreen(c), r = Math.max(22, pxPerUnit(c) * found.sc * 3.2), d = Math.hypot(sx - cx, sy - cy);
      if (d < r && d < bd) { bd = d; best = { item: found }; }
    }
    return best;
  }
  // the base: the light slab under the tank (front face plus a little slack below it)
  function baseHit(cx, cy) {
    const n = screenToNdc(cx, cy), tb = tankScreenBox();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9;
    for (let k = 0; k < 24; k++) { const p = boundary((k / 24) * Math.PI * 2, 1.07).setY(-2.6).project(camera); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); }
    const slack = (14 / (grid.rows * grid.chCss)) * 2;
    return n.x > x0 && n.x < x1 && n.y > y0 - slack && n.y < tb.y0 + slack * 0.3;
  }
  let baseHover = false;
  function toggleBase() {
    state.baseOn = !state.baseOn;
    glowTarget = state.baseOn ? 0.55 + 0.45 * (1 - skyInfo.dayF) : 0;
    save(); updateBaseLabel();
    $('live').textContent = state.baseOn ? 'Base light on.' : 'Base light off.';
  }

  // drag sideways to turn the tank; let go and it glides, then settles on the nearest side
  const DEG_PER_PX = 0.42;
  let drag = null, suppressClick = false;
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, view0: state.view, active: false, lastX: ev.clientX, lastT: performance.now(), v: 0 };
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.x0;
    if (!drag.active) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(ev.clientY - drag.y0) * 0.8) return;
      drag.active = true; drag.x0 = ev.clientX; drag.lastX = ev.clientX;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* fine without */ }
      document.body.classList.add('dragging'); state.dragging = true; state.driftPhase = 0;
    }
    const now = performance.now(), dtm = Math.max(8, now - drag.lastT);
    drag.v = drag.v * 0.5 + (-(ev.clientX - drag.lastX) * DEG_PER_PX / dtm * 1000) * 0.5;      // degrees per second
    drag.lastX = ev.clientX; drag.lastT = now;
    state.view = drag.view0 - (ev.clientX - drag.x0) * DEG_PER_PX;
  });
  const endDrag = (ev) => {
    if (!drag || (ev && ev.pointerId !== drag.id)) return;
    if (drag.active) {
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
      const v = performance.now() - drag.lastT > 120 ? 0 : drag.v;
      state.view = Math.round((state.view + clamp(v * 0.22, -110, 110)) / 90) * 90;
      state.dragging = false; document.body.classList.remove('dragging');
    }
    drag = null;
  };
  const zoomMin = () => CLOSE_DIST / baseDistance();      // as close as the follow camera's close-up
  // the brain is far bigger than a koi, so its close-up is framed by its size: about half the screen wide (more on a phone)
  function brainZoom() {
    if (!brainGeo) return zoomMin();
    if (!brainGeo.boundingBox) brainGeo.computeBoundingBox();
    const sz = brainGeo.boundingBox.getSize(V(0, 0, 0)).multiplyScalar(BRAIN_SCALE);
    const w = Math.max(sz.x, sz.z), h = sz.y, t2 = 2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const fill = camera.aspect < 0.8 ? 0.8 : 0.5;
    const d = Math.max(w / (fill * t2 * camera.aspect), h / (0.55 * t2));
    return clamp(d / baseDistance(), zoomMin(), 1);
  }
  function startFollow(o, cine) {
    if (!o) return;
    if (!follow) follow = { back: state.zoomTarget };       // where to go back to afterwards
    follow.o = o; follow.cine = !!cine; follow.brain = o === brain;
    state.zoomTarget = follow.brain ? brainZoom() : zoomMin(); zoomRate = cine ? 1.4 : 2.2;
  }
  function endFollow(slow) {
    if (!follow) return;
    state.zoomTarget = clamp(follow.back, zoomMin(), 1.3);
    zoomRate = slow ? 0.55 : 2.2; homeRate = slow ? 0.035 : 0.15;
    follow = null;
  }

  const touchPts = new Map(); let pinch = null;
  const spread = () => { const [a, b] = [...touchPts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  canvas.addEventListener('pointerdown', (ev) => {
    touchPts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (touchPts.size === 2) {
      if (drag && drag.active) { state.view = Math.round(state.view / 90) * 90; state.dragging = false; document.body.classList.remove('dragging'); }
      drag = null; pinch = { d0: spread(), z0: state.zoomTarget }; suppressClick = true;
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!touchPts.has(ev.pointerId)) return;
    touchPts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && touchPts.size >= 2) {
      zoomRate = 2.2; state.zoomTarget = clamp(pinch.z0 * pinch.d0 / spread(), zoomMin(), 1.3);     // fingers apart = closer
      if (follow && state.zoomTarget > (follow.brain ? brainZoom() * 1.6 : zoomMin() * 2.2)) { const z = state.zoomTarget; endFollow(false); state.zoomTarget = z; }
    }
  });
  const endTouch = (ev) => { touchPts.delete(ev.pointerId); if (touchPts.size < 2 && pinch) { pinch = null; setTimeout(() => { suppressClick = false; }, 250); } };
  canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
  ['gesturestart', 'gesturechange'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));     // Safari: don't zoom the page
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('mousemove', (ev) => {
    if (state.dragging) return;
    baseHover = false;
    if (hitTest(ev.clientX, ev.clientY)) { canvas.className = 'water'; return; }
    const z = zoneAt(ev.clientX, ev.clientY);
    if (!z && baseHit(ev.clientX, ev.clientY)) { baseHover = true; canvas.className = 'base'; return; }
    canvas.className = z === 'l' ? 'edge-l' : z === 'r' ? 'edge-r' : z ? 'grab' : '';
  });
  canvas.addEventListener('mouseleave', () => { baseHover = false; });
  function brainHit(cx, cy) {
    if (!brain || brain.phase !== 'float') return false;
    const [sx, sy] = toScreen(brain.pos.clone().setY(brain.pos.y + BRAIN_SCALE * 0.2)), r = pxPerUnit(brain.pos) * BRAIN_SCALE * 0.8;
    return Math.hypot(sx - cx, sy - cy) < r;
  }
  canvas.addEventListener('click', (ev) => {
    if (suppressClick) return;
    if (brainHit(ev.clientX, ev.clientY)) { pokeBrain(); return; }
    const h = hitTest(ev.clientX, ev.clientY);
    if (h && h.fish) { pokeFish(h.fish); startFollow(h.fish, false); return; }
    if (follow) { endFollow(false); return; }                  // a click anywhere else goes back to the whole tank
    if (h && h.item) { h.item.anim = { t: 0 }; return; }
    const z = zoneAt(ev.clientX, ev.clientY);
    if (!z && baseHit(ev.clientX, ev.clientY)) { toggleBase(); return; }
    if (z === 'l') turn(-1);
    else if (z === 'r') turn(1);
    else if (z === 'water') {
      ray.setFromCamera(screenToNdc(ev.clientX, ev.clientY), camera);
      const hit = new T.Vector3();
      if (ray.ray.intersectPlane(new T.Plane(UP, -U.uWater.value), hit) && inside(hit.x, hit.z)) addRipple(hit.x, hit.z, 0.5, U.uTime.value);
    }
  });
  window.addEventListener('wheel', (ev) => {
    if (!(ev.target === canvas || ev.target.id === 'timerHit')) return;
    zoomRate = 2.2;
    state.zoomTarget = clamp(state.zoomTarget * Math.exp(ev.deltaY * 0.0012), zoomMin(), 1.3);
    if (follow && state.zoomTarget > (follow.brain ? brainZoom() * 1.6 : zoomMin() * 2.2)) { const z = state.zoomTarget; endFollow(false); state.zoomTarget = z; }     // zooming well out lets go of the fish
  }, { passive: true });
  window.addEventListener('keydown', (ev) => {
    if ((ev.target.tagName === 'INPUT' && ev.target.type === 'range') || ev.target.isContentEditable) return;
    if (/^[a-z]$/i.test(ev.key) && ev.key.toLowerCase() !== 'i') return;
    if (ev.key === 'Escape' && follow) { endFollow(false); return; }
    if (ev.key === ' ' && !(ev.target.closest && ev.target.closest('button, a, input, select, textarea, [role="button"]'))) { ev.preventDefault(); timerPress(); }
    else if (ev.key === 'ArrowLeft') turn(-1);
    else if (ev.key === 'ArrowRight') turn(1);
    else if (ev.key.toLowerCase() === 'i' && document.body.classList.contains('admin')) document.body.classList.toggle('show-stats');
    else return;
  });
  let idleTimer = 0, overControls = false;
  const IDLE_MS = 6000;
  let keyboardUser = false;      // focus only keeps the controls up for people moving around with the keyboard
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Tab' || ev.key.startsWith('Arrow')) keyboardUser = true; }, true);
  window.addEventListener('pointermove', () => { keyboardUser = false; }, { passive: true });
  const busy = () => overControls || about.classList.contains('on') || $('drawer').classList.contains('on') || state.dragging
    || (keyboardUser && !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.dock, .rdock, .undo-wrap, .drawer')));
  const idleEls = () => [...document.querySelectorAll('.dock, .rdock, .undo-wrap, .tune, .scrim')];
  function goIdle() {
    if (busy()) { idleTimer = setTimeout(goIdle, 1000); return; }
    idleEls().forEach((el) => ditherEl(el, false, 520));
    setTimeout(() => { if (!document.body.classList.contains('idle-pending')) return; document.body.classList.remove('idle-pending'); document.body.classList.add('idle'); idleEls().forEach((el) => setMask(el, null)); }, 540);
    document.body.classList.add('idle-pending');
  }
  function wake(ev) {
    if (ev && ev.type === 'mousemove' && ev.movementX === 0 && ev.movementY === 0) return;      // a page repaint isn't a person moving
    const b = document.body, was = b.classList.contains('idle') || b.classList.contains('idle-pending');
    b.classList.remove('idle', 'idle-pending');
    if (was) idleEls().forEach((el) => ditherEl(el, true, 220));
    clearTimeout(idleTimer); idleTimer = setTimeout(goIdle, IDLE_MS);
  }
  // the controls live in a band along the bottom: they show when the pointer comes near it (or a tap lands there on
  // a phone, or keyboard focus reaches them), and go away a moment after it leaves or stops moving. Turning or
  // tapping the tank never brings them up.
  const ZONE = () => Math.max(120, Math.min(170, window.innerHeight * 0.18));
  const inZone = (y) => y > window.innerHeight - ZONE();
  window.addEventListener('mousemove', (ev) => {
    if (ev.movementX === 0 && ev.movementY === 0) return;            // a repaint isn't a person moving
    if (state.dragging) return;
    if (inZone(ev.clientY) || overControls) wake();
    else if (!busy() && !document.body.classList.contains('idle')) { clearTimeout(idleTimer); idleTimer = setTimeout(goIdle, 900); }
  }, { passive: true });
  window.addEventListener('pointerdown', (ev) => { if (ev.pointerType !== 'mouse' && inZone(ev.clientY)) wake(); }, { passive: true });
  window.addEventListener('focusin', (ev) => { if (ev.target.closest && ev.target.closest('.dock, .rdock, .undo-wrap, .tune, .drawer')) wake(); });
  document.querySelectorAll('.dock, .rdock, .undo-wrap, .tune, .drawer').forEach((el) => { el.addEventListener('mouseenter', () => { overControls = true; wake(); }); el.addEventListener('mouseleave', () => { overControls = false; }); });
  document.documentElement.addEventListener('mouseleave', () => { overControls = false; clearTimeout(idleTimer); idleTimer = setTimeout(goIdle, 1200); });   // pointer left the window
  // admin view: type the word anywhere (not in a field)
  let typed = '';
  const setAdmin = (on) => { document.body.classList.toggle('admin', on); if (!on) { $('drawer').classList.remove('on'); $('tune').classList.remove('on'); } try { localStorage.setItem('dither.admin', on ? '1' : '0'); } catch (e) { /* fine */ } };
  try { setAdmin(localStorage.getItem('dither.admin') === '1'); } catch (e) { /* fine */ }
  $('adminX').onclick = () => { setAdmin(false); $('live').textContent = 'Admin controls off.'; };
  window.addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.metaKey || ev.ctrlKey || ev.altKey || ev.key.length !== 1) return;
    typed = (typed + ev.key.toLowerCase()).slice(-7);
    if (typed === 'pynchon') { typed = ''; const on = !document.body.classList.contains('admin'); setAdmin(on); $('live').textContent = on ? 'Admin controls on.' : 'Admin controls off.'; }
  });

  // ================================================================ loop
  const start = performance.now();
  const TURNS = 6;
  let timeScale = 1, simClock = 0, wordsGlow = false, shadeReady = false;     // timeScale only changes in tests
  let lastRender = -1e9, lastSim = start, statTick = 0, lastCost = 0, lastSlow = 0;
  state.driftAmpTarget = 30;
  function renderFrame(now) {
    const dtReal = Math.min(0.25, (now - lastSim) / 1000) * timeScale; simClock += dtReal;
    const t = simClock, dt = dtReal;
    lastSim = now;
    // the tank turns with the clock: six slow turns over a focus session (one every ~4 minutes), landing face-on at 0:00.
    // Paused, it holds; resting, it faces you; idle, it sways gently.
    const tmode = state.timer.mode, inFocus = tmode === 'focus-run' || tmode === 'focus-pause';
    const progress = inFocus ? clamp(1 - remaining() / (FOCUS_MIN * 60), 0, 1) : 0;
    if (!inFocus && state.lastProgress > 0) {          // fold the turns in so nothing jumps; a finished session lands face-on for the fish
      const v = state.view + state.lastProgress * TURNS * 360;
      state.view = state.lastProgress > 0.995 ? Math.round(v / 360) * 360 : Math.round(v / 90) * 90;
    }
    state.lastProgress = progress;
    const ampT = tmode === 'idle' && !state.dragging ? 24 : 0;
    state.driftAmp += (ampT - state.driftAmp) * (1 - Math.exp(-dt * 0.6));
    if (state.driftAmp < 0.5 && ampT === 0) state.driftPhase = 0;
    else state.driftPhase += dt * (Math.PI * 2 / 60);      // idle: one gentle back-and-forth a minute
    const azT = state.view + progress * TURNS * 360 + state.driftAmp * Math.sin(state.driftPhase);
    state.az += (azT - state.az) * (1 - Math.exp(-dt * (state.dragging ? 14 : 1.6)));
    state.zoom += (state.zoomTarget - state.zoom) * (1 - Math.exp(-dt * zoomRate));
    // growth + water ease toward their targets
    const g = state.growthPreview ?? state.growth, ev = state.growthPreview ?? state.evap;
    U.uGrowth.value += (growthU(g) - U.uGrowth.value) * (1 - Math.exp(-dt * 2.5));
    U.uWater.value += (TANK.h * (0.955 - 0.012 * clamp(ev, 0, MAX_POMS)) + waterBoost - U.uWater.value) * (1 - Math.exp(-dt * (waterBoost > 0 ? 6 : 1.2)));
    const glowT = hovering ? 1 : waiting ? 0.25 + 0.25 * Math.sin(t * 1.1) : 0;
    asciiU.uOverlayGlow.value += (glowT - asciiU.uOverlayGlow.value) * (1 - Math.exp(-dt * 5));
    stepStatic(dtReal); stepTimerDither(dtReal);
    if (hazeMesh) hazeMesh.visible = U.uStatic.value > 0.002;
    U.uGlow.value += (glowTarget - U.uGlow.value) * (1 - Math.exp(-dt * 1.8));
    {
      const lit = glowTarget > 0 ? 1 : 0, sl = asciiU.uShadeLit;
      if (glowTarget > 0) asciiU.uShadeAmt.value = glowTarget;
      if (!shadeReady) { sl.value = lit; shadeReady = true; }
      else sl.value += clamp(lit - sl.value, -dtReal / 0.9, dtReal / 0.9);         // ~0.9 s dither, like the rest of the app
    }
    if (glowMesh) glowMesh.visible = U.uGlow.value > 0.01;
    U.uBaseHover.value += ((baseHover ? 1 : 0) - U.uBaseHover.value) * (1 - Math.exp(-dt * 8));
    if (state.wordsStyle !== 'dots') { const g = hovering || (waiting && Math.sin(t * 1.1) > 0); if (g !== wordsGlow) { wordsGlow = g; document.getElementById('words').classList.toggle('glow', g); } }
    U.uTime.value = t;
    if (now - lastSlow > 1000) {
      lastSlow = now;
      if (state.fishDay !== today()) { state.fishDay = today(); state.fish = []; state.pendingFish = 0; syncFish(); save(); }
      applySky(skyDate()); updateSkyLabel(); tickTimer();
    }
    simulate(dt, t);
    // follow camera: it stays on the fish (a new koi's entrance included) until you tap away, press Esc or zoom out
    if (follow && (follow.brain ? (follow.o !== brain || brain.phase === 'leaving') : !fishObjs.includes(follow.o))) endFollow(false);
    {
      const dist = baseDistance() * state.zoom, k = clamp((dist - CLOSE_DIST * 1.15) / (CLOSE_DIST * 2), 0, 1);
      const elWant = 4 + 9 * k * k * (3 - 2 * k);
      camEl += ((follow && follow.brain ? Math.max(12, elWant) : elWant) - camEl) * 0.12;   // close in, the camera comes down level with the fish (but looks down a little on the brain)
      if (follow && follow.brain) target.lerp(follow.o.pos, follow.cine ? 0.3 : 0.2);
      else if (follow) {
        const o = follow.o;
        if (!(follow.cine && o.mode === 'intro' && !o.intro)) {         // a new koi: wait until it's placed in the sky
          const want = o.p.clone();
          if (want.y < U.uWater.value) want.y = Math.min(want.y, U.uWater.value - 1.2 - Math.sin(T.MathUtils.degToRad(camEl)) * dist);   // stay under the surface
          target.lerp(want, follow.cine ? 0.3 : 0.2);
        }
      } else if (target.distanceToSquared(HOME_TARGET) > 1e-4) target.lerp(HOME_TARGET, homeRate);
      else if (Math.abs(state.zoom - state.zoomTarget) < 0.005) { zoomRate = 2.2; homeRate = 0.15; }
    }
    placeCamera();
    if (shake > 0.001) { const k = shake * 1.5; camera.position.x += Math.sin(t * 53) * k; camera.position.y += Math.sin(t * 41 + 1) * k * 0.8; shake *= Math.exp(-dt * 3.0); }
    musicTick(dtReal);
    const azr = T.MathUtils.degToRad(state.az), dz = (terrain ? shape.b : 20) * 0.28;
    digitMesh.position.x = Math.sin(azr) * dz; digitMesh.position.z = Math.cos(azr) * dz; digitMesh.rotation.y = azr;
    world.updateMatrixWorld();
    placeTimerHit(); placeTimerActions();
    const t0 = performance.now();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
    lastCost = lastCost * 0.9 + (performance.now() - t0) * 0.1;
    if (++statTick % 24 === 0) $('stats').innerHTML = `${grid.cols}×${grid.rows} dots · ${FPS} fps · ${lastCost.toFixed(1)} ms<br>${terrain.layout} · ${terrain.tone.name} · ${terrain.woodStyle}<br>sky ≈ ${tzName || 'unknown'}`;
  }
  let manualMode = false, fakeNow = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (manualMode) return;
    if (now - lastRender < 1000 / FPS - 2) return;
    lastRender = now;
    renderFrame(now);
  }

  // ================================================================ start
  window.addEventListener('resize', () => { layout(); renderTimerText(true); });
  layout();
  if (!state.seed) state.seed = randomSeed();
  if (state.pendingFish && state.timer.mode !== 'focus-done') state.pendingFish = 0;
  U.uGrowth.value = growthU(state.growth);
  U.uWater.value = TANK.h * (0.955 - 0.012 * state.evap);
  applySky(new Date());
  generate(state.seed);
  if (state.brain) makeBrain(false);
  syncBrainUI();
  save(); updateDrawer(); updateSkyLabel();
  const go = () => { renderTimerText(true); drawCdLabel(); requestAnimationFrame(loop); };
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve()).then(go);
  document.fonts && document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => { renderTimerText(true); drawCdLabel(); });
  wake();

  // ---- fish lab hooks: the lab build (npm run lab) adds a panel that drives these
  window.__ditherFishLab = {
    cfg: FCFG, defaults: FCFG_DEFAULT, scenes: SCENES, varieties: FISH.map((f) => ({ name: f.name, gold: !!f.gold })),
    fish: () => fishObjs.map((o, i) => ({ i, name: o.v.name, long: !!o.f.lf, puffy: !!o.f.pc, mode: o.mode })),
    add(name, lf, pc) { state.fish.push(newFish(name || null, lf, pc)); syncFish(); save(); return fishObjs.length - 1; },
    drop(name, lf, pc) { state.fish.push(newFish(name || null, lf, pc)); state.pendingFish = (state.pendingFish || 0) + 1; save(); revealFish(); return fishObjs.length - 1; },
    clear() { endScene(); state.fish = []; state.pendingFish = 0; syncFish(); save(); endFollow(false); },
    rebuild() { rebuildFish(); endFollow(false); },
    jump(i) { const o = fishObjs[i]; if (o) pokeFish(o); },
    scene(type) { return startScene(type); },
    sceneNow: () => (scene2 ? scene2.type : ''),
    follow(i) { if (i == null || i < 0 || !fishObjs[i]) endFollow(false); else { const z = state.zoomTarget; startFollow(fishObjs[i], false); state.zoomTarget = z; } },
    zoom(z) { state.zoom = state.zoomTarget = z; },
    slow(f) { timeScale = f; },
  };
  window.dither = window.shoal = {
    state, completePom, timerPress, rescape, zoneAt, tankScreenBox, turn,
    foundScreen() { if (!found) return null; const p = found.root.position.clone().add(V(0, 2.5, 0)).project(camera); return [(p.x * 0.5 + 0.5) * window.innerWidth, (1 - (p.y * 0.5 + 0.5)) * window.innerHeight]; },
    setZoom(z) { state.zoom = state.zoomTarget = z; },
    slow(f) { timeScale = f; },
    rescape,
    doneWithWork, brainInfo() { return brain ? { phase: brain.phase, y: +brain.pos.y.toFixed(1), water: +U.uWater.value.toFixed(1) } : null; },
    musicInfo() { return ['focus', 'rest'].map((k) => `${k}:${music.playing[k] ? 'playing' : 'stopped'}@${music.level[k].toFixed(2)}${music.buf[k] ? ` loop ${music.buf[k].start.toFixed(3)}-${music.buf[k].end.toFixed(2)}s` : ''}${music.src[k] ? ' (source live)' : ''}`).join(' | '); },
    ditherPeek(sel, k) { const el = document.querySelector(sel); el._dither = (el._dither || 0) + 1; setMask(el, k); },
    manual() { manualMode = true; fakeNow = performance.now(); lastSim = fakeNow; },
    tick(dt) { fakeNow += dt * 1000; renderFrame(fakeNow); },
    setTransStyle(i) { transStyle = i; },
    transNow() { return staticAnim ? staticAnim.phase : 'idle'; },
    staticNow() { return +U.uStatic.value.toFixed(2); },
    freezeStatic(v) { staticAnim = { phase: 'hold', t: 0, swap() {} }; U.uStatic.value = v; },
    baseBox() { let x0 = 1e9, x1 = -1e9, y0 = 1e9; for (let k = 0; k < 24; k++) { const p = boundary((k / 24) * Math.PI * 2, 1.07).setY(-2.6).project(camera); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); } return { x0, x1, y0, tank: tankScreenBox().y0, rows: grid.rows * grid.chCss }; },
    baseState() { return { lit: baseLit(), glow: +U.uGlow.value.toFixed(2), target: +glowTarget.toFixed(2), night: skyInfo.night, on: state.baseOn }; },
    info() { return { fish: fishObjs.map((o) => [o.mode, +(o.mt || 0).toFixed(2), +o.p.x.toFixed(1), +o.p.y.toFixed(1), +o.p.z.toFixed(1), +o.mesh.scale.x.toFixed(2)]), pending: state.pendingFish, total: state.fish.length, found: found && found.type, anim: !!(found && found.anim), animT: found && found.anim ? +found.anim.t.toFixed(2) : -1, zoom: +state.zoom.toFixed(2), timer: state.timer.mode, splashes: splashes.length, sparkles: sparkles.length }; },
    fishRot(i) { const o = fishObjs[i]; if (!o) return null; const r = o.mesh.rotation; o.mesh.updateMatrixWorld(); const n = V(1, 0, 0).transformDirection(o.mesh.matrixWorld); return { r: [r.x, r.y, r.z, r.order].map((v) => (typeof v === 'number' ? +v.toFixed(2) : v)), nose: [n.x, n.y, n.z].map((v) => +v.toFixed(2)), prof: o.intro && +o.intro.profile.toFixed(2) }; },
    fishScreen(i) { const o = fishObjs[i]; return o ? toScreen(o.p) : null; },
    set(o) {
      if ('growth' in o) { state.growthPreview = o.growth; U.uGrowth.value = growthU(o.growth); U.uWater.value = TANK.h * (0.955 - 0.012 * o.growth); updateDrawer(); }
      if ('sky' in o) { state.skyPreview = o.sky; applySky(skyDate()); updateSkyLabel(); }
      if ('look' in o) { state.look = o.look; layout(); renderTimerText(true); }
      if ('shape' in o) { state.shape = o.shape; generate(state.seed); }
      if ('seed' in o) { state.seed = o.seed; generate(o.seed); }
      if ('fish' in o) { for (let i = 0; i < o.fish; i++) state.fish.push(newFish()); syncFish(); }
      if ('hover' in o) hovering = o.hover;
      if ('find' in o) placeFound(o.find);
      if ('poke' in o && found) found.anim = { t: 0 };
      if ('pokeFish' in o && fishObjs[o.pokeFish]) pokeFish(fishObjs[o.pokeFish]);
      if ('reveal' in o) { completePom(false); revealFish(); }
      if ('az' in o) { state.view = o.az; state.az = o.az; state.driftAmp = 0; }
      if ('timer' in o) { state.timer = o.timer; renderTimerText(true); }
    },
  };
})();
