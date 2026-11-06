// Fish lab: a tuning panel for the koi. Only the lab build (npm run lab) includes this file.
(() => {
  const L = window.__ditherFishLab; if (!L) return;
  const C = L.cfg, KEY = 'dither.fishlab';
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) Object.assign(C, saved); } catch (e) { /* fine */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) { /* fine */ } };
  L.rebuild();

  const css = document.createElement('style');
  css.textContent = `
    .flab { position: fixed; z-index: 60; top: 12px; right: 12px; width: 300px; max-height: calc(100vh - 110px); overflow: auto;
      background: rgba(8, 18, 22, .86); color: #eef5f3; border: 1px solid rgba(238,245,243,.18); border-radius: 14px;
      font: 12px/1.35 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; padding: 12px 12px 14px; backdrop-filter: blur(6px); }
    .flab.min > :not(.flab-head) { display: none; }
    .flab-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .flab-head b { font-size: 13px; letter-spacing: .02em; }
    .flab h3 { margin: 12px 0 6px; font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: rgba(238,245,243,.6); }
    .flab button { height: 26px; padding: 0 9px; border-radius: 999px; border: 1px solid rgba(238,245,243,.22); background: rgba(255,255,255,.06);
      color: inherit; font: inherit; cursor: pointer; }
    .flab button:hover { background: rgba(255,255,255,.14); }
    .flab button.on { background: rgba(159,227,216,.24); border-color: rgba(159,227,216,.65); }
    .flab .row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .flab select { flex: 1; min-width: 0; height: 26px; border-radius: 8px; background: #12262c; color: inherit; border: 1px solid rgba(238,245,243,.22); font: inherit; }
    .flab label.sw { display: flex; align-items: center; gap: 7px; padding: 2px 0; cursor: pointer; }
    .flab .sl { display: grid; grid-template-columns: 1fr 44px; gap: 0 6px; margin: 4px 0; }
    .flab .sl span { color: rgba(238,245,243,.82); }
    .flab .sl output { text-align: right; font-variant-numeric: tabular-nums; color: rgba(238,245,243,.6); }
    .flab .sl input { grid-column: 1 / -1; width: 100%; accent-color: #9fe3d8; }
    .flab .note { color: rgba(238,245,243,.55); font-size: 11px; margin-top: 4px; }
    .flab .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }`;
  document.head.appendChild(css);

  const el = document.createElement('div'); el.className = 'flab';
  const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  el.innerHTML = `
    <div class="flab-head"><b>Fish lab</b><button data-act="min">hide</button></div>
    <h3>Camera</h3>
    <div class="row"><select id="flFish"></select></div>
    <div class="row" style="margin-top:6px"><button data-act="close" class="on">close-up</button><button data-act="tank">whole tank</button></div>
    <div class="sl"><span>Zoom</span><output id="flZoomV"></output><input id="flZoom" type="range" min="0.1" max="1" step="0.01" value="0.2"></div>
    <div class="row"><span style="margin-right:4px">Speed</span><button data-slow="0.25">¼×</button><button data-slow="0.5">½×</button><button data-slow="1" class="on">1×</button></div>
    <h3>Fish</h3>
    <div class="row"><select id="flVar"></select><select id="flFin" style="flex:0 0 92px"><option value="">fins: mix</option><option value="0">short fins</option><option value="1">long fins</option></select><select id="flCheek" style="flex:0 0 100px"><option value="">cheeks: mix</option><option value="0">slim cheeks</option><option value="1">puffy cheeks</option></select></div>
    <div class="row" style="margin-top:6px"><button data-act="add">add</button><button data-act="drop">drop in (dive)</button><button data-act="jump">jump</button><button data-act="clear">remove all</button></div>
    <h3>Playful moments</h3>
    <div class="row" id="flScenes"></div>
    <div class="note" id="flSceneNow">&nbsp;</div>
    <h3>Switches</h3>
    <div class="grid2" id="flSw"></div>
    <h3>Tuning</h3>
    <div id="flSl"></div>
    <div class="row" style="margin-top:10px"><button data-act="copy">copy settings</button><button data-act="reset">reset tuning</button></div>
    <div class="note">Settings are saved in this browser. "Copy settings" puts them on the clipboard so you can paste them to Claude.</div>`;
  document.body.appendChild(el);
  const $ = (id) => el.querySelector('#' + id);

  // varieties
  const fillVar = () => {
    const v = $('flVar'), cur = v.value;
    v.innerHTML = '<option value="">random koi</option>' + L.varieties.filter((x) => !C.koiOnly || !x.gold).map((x) => `<option>${x.name}</option>`).join('');
    v.value = [...v.options].some((o) => o.value === cur) ? cur : '';
  };
  fillVar();

  // which fish the camera follows
  let follow = 0, close = true;
  const fillFish = () => {
    const s = $('flFish'), list = L.fish();
    const html = list.map((f) => `<option value="${f.i}">${f.i + 1}. ${f.name}${f.long ? ' (long fins)' : ''}${f.puffy ? ' (puffy)' : ''} · ${f.mode}</option>`).join('') || '<option value="-1">no fish yet: add one below</option>';
    if (s._html !== html) { s.innerHTML = html; s._html = html; }
    if (follow >= list.length) follow = list.length - 1;
    s.value = String(follow);
  };
  const applyCam = () => {
    L.follow(close ? follow : null);
    L.zoom(close ? +$('flZoom').value : 1);
    $('flZoomV').textContent = (+$('flZoom').value).toFixed(2);
    el.querySelector('[data-act=close]').classList.toggle('on', close); el.querySelector('[data-act=tank]').classList.toggle('on', !close);
  };
  $('flFish').onchange = () => { follow = +$('flFish').value; applyCam(); };
  $('flZoom').oninput = () => { close = true; applyCam(); };
  setInterval(() => { fillFish(); const n = L.sceneNow(); $('flSceneNow').textContent = n ? `playing: ${n}` : ' '; }, 400);

  // scenes
  const SCN = { chase: 'chase', circle: 'circle each other', follow: 'follow the leader', surface: 'come up to the surface', scatter: 'scatter (tap the glass)', nibble: 'nibble the bottom', kiss: 'nose to nose' };
  L.scenes.forEach((k) => { const b = h(`<button>${SCN[k] || k}</button>`); b.onclick = () => { if (!L.scene(k)) { $('flSceneNow').textContent = k === 'nibble' || k === 'surface' || k === 'scatter' ? 'needs a fish that is swimming' : 'needs two swimming fish'; } }; $('flScenes').appendChild(b); });

  // switches
  const SW = [
    ['classic', 'classic v1.2 fish', true], ['koiOnly', 'koi only', false], ['bend', 'body bends'], ['softFins', 'soft trailing fins'],
    ['eyes', 'eyes look around'], ['glint', 'eye glint'], ['blink', 'blink'], ['gills', 'gills breathe'], ['mouth', 'mouth moves'], ['leap2', 'new jump'], ['dive2', 'new dive'], ['play', 'playful moments'],
  ];
  SW.forEach(([k, label, rebuild]) => {
    const w = h(`<label class="sw"><input type="checkbox"> ${label}</label>`), cb = w.querySelector('input');
    cb.checked = !!C[k];
    cb.onchange = () => { C[k] = cb.checked; persist(); if (k === 'koiOnly') fillVar(); if (rebuild) { L.rebuild(); setTimeout(applyCam, 50); } };
    $('flSw').appendChild(w);
  });

  // sliders
  const SL = [
    ['pace', 'Fish pace (1 = real time)', 0.2, 1.5, 0.05], ['breathHz', 'Breaths a second', 0.2, 2, 0.05], ['puffy', 'Share with puffy cheeks (new fish)', 0, 1, 0.05],
    ['beatAmp', 'Tail swing', 0, 0.8, 0.01], ['beatHz', 'Tail beats a second', 0.2, 3, 0.05], ['beatSpeedHz', 'Beats faster when fast', 0, 0.8, 0.01],
    ['wave', 'Body wave', 0.3, 2, 0.05], ['finLag', 'Fin trail (wispy)', 0, 4, 0.05], ['finLen', 'Fin length', 0.5, 1.8, 0.05, true],
    ['longFins', 'Share with long fins (new fish)', 0, 1, 0.05], ['turn', 'Turn speed', 0.4, 4, 0.05], ['glide', 'Kick and glide', 0, 1, 0.05],
    ['speed', 'Swim speed', 0.3, 2.5, 0.05], ['bank', 'Lean into turns', 0, 2, 0.05], ['pecFlap', 'Side fins fanning', 0, 2.5, 0.05],
    ['eyeSize', 'Eye size', 0.5, 2.5, 0.05, true], ['playEvery', 'Playful moment every (s)', 10, 180, 5],
  ];
  const sliders = [];
  SL.forEach(([k, label, mn, mx, st, rebuild]) => {
    const w = h(`<div class="sl"><span>${label}</span><output></output><input type="range" min="${mn}" max="${mx}" step="${st}"></div>`);
    const inp = w.querySelector('input'), out = w.querySelector('output');
    const show = () => { out.textContent = (+C[k]).toFixed(st < 0.1 ? 2 : st < 1 ? 1 : 0); };
    inp.value = C[k]; show();
    inp.oninput = () => { C[k] = +inp.value; show(); persist(); };
    if (rebuild) inp.onchange = () => { L.rebuild(); setTimeout(applyCam, 50); };
    sliders.push(() => { inp.value = C[k]; show(); });
    $('flSl').appendChild(w);
  });

  // buttons
  const finPick = () => ($('flFin').value === '' ? undefined : +$('flFin').value), cheekPick = () => ($('flCheek').value === '' ? undefined : +$('flCheek').value);
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.slow) { L.slow(+b.dataset.slow); el.querySelectorAll('[data-slow]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    const a = b.dataset.act;
    if (a === 'min') { el.classList.toggle('min'); b.textContent = el.classList.contains('min') ? 'show' : 'hide'; }
    if (a === 'close') { close = true; applyCam(); }
    if (a === 'tank') { close = false; applyCam(); }
    if (a === 'add') { follow = L.add($('flVar').value, finPick(), cheekPick()); fillFish(); applyCam(); }
    if (a === 'drop') { close = false; applyCam(); follow = L.drop($('flVar').value, finPick(), cheekPick()); fillFish(); }
    if (a === 'jump') L.jump(follow);
    if (a === 'clear') { L.clear(); follow = 0; fillFish(); }
    if (a === 'copy') { const txt = JSON.stringify(C, null, 1); navigator.clipboard.writeText(txt).then(() => { b.textContent = 'copied'; setTimeout(() => { b.textContent = 'copy settings'; }, 1400); }, () => { prompt('Copy these settings:', JSON.stringify(C)); }); }
    if (a === 'reset') { const keep = { classic: C.classic, koiOnly: C.koiOnly }; Object.assign(C, L.defaults, keep); persist(); sliders.forEach((f) => f()); el.querySelectorAll('#flSw input').forEach((cb, i) => { cb.checked = !!C[SW[i][0]]; }); L.rebuild(); setTimeout(applyCam, 50); }
  });
  // keep keyboard shortcuts in the app from firing while using the panel
  el.addEventListener('keydown', (ev) => ev.stopPropagation());

  // start with a couple of koi to look at, the camera on the first
  if (!L.fish().length) { L.add('kohaku', 1, 0); L.add('showa', 0, 1); L.add('tancho', 0, 0); }
  fillFish(); applyCam();
})();
