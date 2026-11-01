'use strict';
/*__DATA__*/

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = t => { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4.2v16H6zM13.8 4H18v16h-4.2z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2.5v14H6zM20 5v14L9 12z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 5H18v14h-2.5zM4 5v14l11-7z"/></svg>'
};

/* ------------------------------------------------------------------ hero */
function initHero() {
  const grid = $('#hero');
  for (const h of DATA.hero) {
    const fig = document.createElement('figure');
    fig.className = 'vcard';
    fig.innerHTML = `<div class="vframe"><video src="${h.src}" poster="${h.poster}" muted loop playsinline autoplay preload="metadata" controls></video><span class="badge">${h.duration}</span></div><figcaption>${h.title}</figcaption>`;
    grid.append(fig);
  }
}

/* ------------------------------------------------------------ comparison */
const CMP = { index: 0, videos: [], playing: true, dragging: false, rate: 1, started: false };
const SAMPLE_TIMES = { '60 s': [0, 12, 24, 36, 48, 59], '240 s': [0, 48, 96, 144, 192, 238] };

function initComparison() {
  const tabs = $('#cmp-tabs');
  DATA.prompts.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'tab'; b.setAttribute('role', 'tab');
    b.innerHTML = `${p.title}<span class="dur">${p.duration}</span>`;
    b.addEventListener('click', () => selectPrompt(i));
    tabs.append(b);
  });
  $('#cmp-play').addEventListener('click', () => setPlaying(!CMP.playing));
  const r = $('#cmp-range');
  r.addEventListener('input', () => { CMP.dragging = true; const t = +r.value; CMP.videos.forEach(v => { v.currentTime = t; }); paintScrub(t); });
  r.addEventListener('change', () => { CMP.dragging = false; });
  $$('#cmp-speed button').forEach(b => b.addEventListener('click', () => {
    CMP.rate = +b.dataset.rate; CMP.videos.forEach(v => { v.playbackRate = CMP.rate; });
    $$('#cmp-speed button').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !CMP.started) { CMP.started = true; selectPrompt(0); } }, { rootMargin: '300px' });
  io.observe($('#compare'));
  requestAnimationFrame(syncLoop);
}

function selectPrompt(i) {
  CMP.index = i;
  const p = DATA.prompts[i];
  $$('#cmp-tabs .tab').forEach((b, j) => b.setAttribute('aria-selected', j === i));
  $('#cmp-prompt-text').textContent = p.prompt;
  const grid = $('#cmp-grid'); grid.replaceChildren(); CMP.videos = [];
  for (const [id, label, sub] of DATA.models) {
    const d = document.createElement('div');
    d.className = 'cmp-item' + (id === 'ours' ? ' ours' : '');
    d.innerHTML = `<div class="cmp-label"><span>${label}</span><small>${sub}</small></div><div class="vframe"><video muted playsinline preload="auto" poster="${p.videos[id].poster}" src="${p.videos[id].src}"></video></div>`;
    grid.append(d);
    const v = d.querySelector('video'); v.playbackRate = CMP.rate; CMP.videos.push(v);
  }
  const master = CMP.videos[CMP.videos.length - 1];
  const dur = p.duration === '60 s' ? 60.06 : 240.56;
  const r = $('#cmp-range'); r.max = dur; r.value = 0;
  const ticks = $('#cmp-ticks'); ticks.replaceChildren();
  for (const s of SAMPLE_TIMES[p.duration]) {
    const t = document.createElement('span'); t.className = 'tick';
    t.style.left = (100 * s / dur) + '%'; t.textContent = s + ' s'; t.title = 'frame shown in the paper';
    ticks.append(t);
  }
  master.addEventListener('ended', () => { CMP.videos.forEach(v => { v.currentTime = 0; }); if (CMP.playing) CMP.videos.forEach(v => v.play().catch(() => {})); });
  let ready = 0;
  CMP.videos.forEach(v => v.addEventListener('canplay', () => { ready++; if (ready === CMP.videos.length && CMP.playing) CMP.videos.forEach(x => x.play().catch(() => {})); }, { once: true }));
  paintScrub(0);
}

function setPlaying(on) {
  CMP.playing = on;
  $('#cmp-play').innerHTML = on ? ICON.pause : ICON.play;
  $('#cmp-play').setAttribute('aria-label', on ? 'Pause' : 'Play');
  CMP.videos.forEach(v => on ? v.play().catch(() => {}) : v.pause());
}

function paintScrub(t) {
  const r = $('#cmp-range'); const max = +r.max || 1;
  if (!CMP.dragging) r.value = t;
  r.style.setProperty('--p', (100 * t / max) + '%');
  $('#cmp-time').textContent = fmt(t) + ' / ' + fmt(max);
}

function syncLoop() {
  const vs = CMP.videos;
  if (vs.length) {
    const m = vs[vs.length - 1];
    if (!CMP.dragging) {
      for (const v of vs) if (v !== m && Math.abs(v.currentTime - m.currentTime) > 0.25) v.currentTime = m.currentTime;
      paintScrub(m.currentTime);
    }
  }
  requestAnimationFrame(syncLoop);
}

/* ---------------------------------------------------------- code panel */
function highlightPy(line) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const re = /(#.*$)|("[^"]*"|'[^']*')|(@\w+)|\b(def|class|return|for|in|if|else|elif|with|not|and|or|is|None|True|False|lambda|import|from|as|pass|yield|while|break|continue|try|except|finally|raise|assert|del)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\()/g;
  let out = '', last = 0, m;
  while ((m = re.exec(line))) {
    out += esc(line.slice(last, m.index));
    const [tok] = m;
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'd' : m[4] ? 'k' : m[5] ? 'n' : 'f';
    out += `<span class="tk-${cls}">${esc(tok)}</span>`;
    last = m.index + tok.length;
  }
  return out + esc(line.slice(last));
}

function showCode(key, hl, fromLabel) {
  const c = DATA.code[key];
  $('#code-title').textContent = c.title;
  $('#code-src').textContent = c.src;
  const marks = hl || [];
  const lines = c.text.split('\n');
  let first = -1;
  $('#code-pre').innerHTML = lines.map((l, i) => {
    const on = marks.some(m => l.includes(m));
    if (on && first < 0) first = i;
    return `<span class="ln${on ? ' hl' : ''}" data-n="${i + 1}">${highlightPy(l) || ' '}</span>`;
  }).join('');
  const pre = $('#code-pre');
  if (first >= 0) { const el = pre.children[first]; pre.scrollTop = Math.max(0, el.offsetTop - 40); } else pre.scrollTop = 0;
  const from = $('#code-from');
  if (fromLabel) { from.classList.add('on'); $('#code-from-label').textContent = 'Clicked: ' + fromLabel; } else from.classList.remove('on');
}

/* ------------------------------------------------------- walkthrough */
const NS = 'http://www.w3.org/2000/svg';
const C = {
  ink: '#0f172a', muted: '#64748b', line: '#d6dde6', faint: '#eef2f6', white: '#ffffff',
  gen: '#c8955a', genF: '#f8eee3', wri: '#2a8c7f', wriF: '#e3f2ee', page: '#5fa99d',
  grad: '#7d57b5', gradF: '#e7defa', red: '#c2412d', redF: '#f6d8d1', gold: '#d4a373',
  grey: '#b8c2d0', greyF: '#f1f4f8', accent: '#1f5fae'
};
const X0 = 190, DX = 36.4, CW = 27, NF = 21;
const XL = X0 - 14, XR = X0 + NF * DX + 10, XM = (XL + XR) / 2, LX = XL - 8;
const cx = i => X0 + DX * i + DX / 2;

function E(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function rich(t, s, fs) {
  const re = /_\{([^}]*)\}|\^\{([^}]*)\}|([^_^]+|[_^])/g; let m, cur = 0;
  while ((m = re.exec(s))) {
    let txt, want;
    if (m[1] !== undefined) { txt = m[1]; want = fs * 0.32; } else if (m[2] !== undefined) { txt = m[2]; want = -fs * 0.42; } else { txt = m[3]; want = 0; }
    const ts = E('tspan', {}, t);
    if (want !== cur) ts.setAttribute('dy', want - cur);
    if (want) ts.setAttribute('font-size', Math.round(fs * 0.72));
    ts.textContent = txt; cur = want;
  }
}
function T(parent, x, y, s, attrs = {}) {
  const fs = attrs['font-size'] || 13;
  const t = E('text', Object.assign({ x, y, 'font-size': fs, fill: C.ink }, attrs), parent);
  rich(t, s, fs); return t;
}
function set(el, attrs) { for (const k in attrs) el.setAttribute(k, attrs[k]); }
function show(el, on, op = 1) { el.style.opacity = on ? op : 0; el.style.pointerEvents = on ? '' : 'none'; }
function flow(el, on) { el.classList.toggle('flowing', !!on); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function arrowDefs(svg) {
  const defs = E('defs', {}, svg);
  for (const [id, col] of [['ink', C.muted], ['teal', C.wri], ['purple', C.grad], ['red', C.red], ['grey', C.grey]]) {
    const m = E('marker', { id: 'ar-' + id, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, defs);
    E('path', { d: 'M0,0 L10,5 L0,10 z', fill: col }, m);
  }
}

/* common skeleton: frame numbers, loss bar, row labels */
function skeleton(svg, rows, opts = {}) {
  arrowDefs(svg);
  const g = E('g', {}, svg);
  for (let i = 0; i < NF; i++) {
    E('line', { x1: cx(i), x2: cx(i), y1: 13, y2: 17, stroke: C.grey }, g);
    if (i % 5 === 0 || i === NF - 1) T(g, cx(i), 11, String(i), { 'font-size': 10.5, fill: C.muted, 'text-anchor': 'middle' });
  }
  T(g, LX, 12, 'latent frame', { 'font-size': 10.5, fill: C.muted, 'text-anchor': 'end' });
  const loss = E('rect', { x: XL + 4, y: 24, width: XR - XL - 8, height: 22, rx: 5, fill: '#f4f0fa', stroke: '#cdbbe6' }, g);
  T(g, LX, 39, 'loss L_{DMD}', { 'font-size': 12.5, 'text-anchor': 'end', fill: C.ink, 'font-weight': 600 });
  for (const [y, s, sub] of rows) {
    T(g, LX, y, s, { 'font-size': 12.5, 'text-anchor': 'end', 'font-weight': 600 });
    if (sub) T(g, LX, y + 14, sub, { 'font-size': 10.5, 'text-anchor': 'end', fill: C.muted });
  }
  return { loss };
}

function lossMarks(svg, R) {
  R.lossMark = [];
  for (let i = 0; i < NF; i++) R.lossMark.push(E('rect', { x: cx(i) - 11, y: 28, width: 22, height: 14, rx: 3, fill: C.genF, stroke: C.gen, opacity: 0 }, svg));
}
function cells(svg, y, h, n, attrs) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(E('rect', Object.assign({ x: cx(i) - CW / 2, y, width: CW, height: h, rx: 4 }, attrs), svg));
  return out;
}
function vline(svg, x, y1, y2, attrs) { return E('line', Object.assign({ x1: x, x2: x, y1, y2 }, attrs), svg); }
function curve(svg, x1, y1, x2, y2, attrs, bend = 0.5) {
  const my = y1 + (y2 - y1) * bend;
  return E('path', Object.assign({ d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, fill: 'none' }, attrs), svg);
}
function clickable(el, key) { el.classList.add('clk'); el.dataset.info = key; return el; }
function fanPool(svg, color, marker, dashed) {
  const a = [];
  for (let j = 0; j < NF - 1; j++) a.push(E('path', Object.assign({ fill: 'none', stroke: color, 'stroke-width': 1.1, opacity: 0 }, marker ? { 'marker-end': `url(#${marker})` } : {}, dashed ? { 'stroke-dasharray': '4 3' } : {}), svg));
  return a;
}
function xPool(svg) { const a = []; for (let j = 0; j < NF - 1; j++) { const t = E('text', { 'font-size': 10, fill: C.grad, 'text-anchor': 'middle', opacity: 0 }, svg); t.textContent = '✕'; a.push(t); } return a; }
function fanTo(pool, k, pathFn, flowing) { pool.forEach((p, j) => { const on = j < k; if (on) p.setAttribute('d', pathFn(j)); show(p, on); flow(p, on && flowing); }); }
function selFor(id) { return WT.pinned && WT.sel && WT.sel.scheme === id ? WT.sel : null; }
const readPath = (ys, x, y) => j => `M${cx(j)},${ys} C${cx(j)},${(ys + y) / 2 + 10} ${x},${(ys + y) / 2 + 10} ${x},${y + 1}`;
const gradPath = (x, y, yd) => j => `M${x},${y} C${x},${(y + yd) / 2} ${cx(j)},${(y + yd) / 2} ${cx(j)},${yd}`;

/* ---------- scheme: dKV Forcing (pages) */
const PAGES = {
  id: 'pages', label: 'dKV Forcing', sub: 'persistent pages',
  trace: 'pages',
  build(svg) {
    const R = {};
    skeleton(svg, [[88, 'generate G_{θ}'], [138, 'write 𝒦_{θ,φ}'], [180, 'handles'], [207, 'gradients'], [264, 'page table']]);
    R.frame = clickable(E('rect', { x: XL, y: 58, width: XR - XL, height: 166, rx: 10, fill: 'none', stroke: C.grad, 'stroke-dasharray': '6 5', 'stroke-width': 1.3 }, svg), 'graph');
    T(svg, XR - 6, 218, 'autograd graph', { 'font-size': 11.5, fill: C.grad, 'text-anchor': 'end' });
    lossMarks(svg, R);
    R.pred = []; R.gl = []; R.sg = []; R.toH = []; R.commit = []; R.link = []; R.handle = []; R.buf = []; R.ckG = []; R.ckW = []; R.hfire = [];
    const tb = E('rect', { x: XL, y: 238, width: XR - XL, height: 44, rx: 8, fill: '#fbfcfd', stroke: C.line }, svg); clickable(tb, 'table');
    for (let i = 0; i < NF; i++) {
      R.pred.push(vline(svg, cx(i), 70, 47, { stroke: C.gen, 'stroke-width': 1.4, opacity: 0 }));
      R.gl.push(vline(svg, cx(i) + 5, 47, 70, { stroke: C.grad, 'stroke-width': 2, 'marker-end': 'url(#ar-purple)', opacity: 0 }));
      if (i < NF - 1) {
        const g = E('g', { opacity: 0 }, svg);
        vline(g, cx(i), 98, 120, { stroke: C.grey, 'stroke-width': 1.2 });
        E('line', { x1: cx(i) - 5, x2: cx(i) + 5, y1: 109, y2: 109, stroke: C.muted, 'stroke-width': 1.6 }, g);
        R.sg.push(g);
        R.toH.push(vline(svg, cx(i) - 5, 148, 169, { stroke: C.grad, 'stroke-width': 1, opacity: 0 }));
        R.commit.push(E('path', { d: `M${cx(i) + 7},148 L${cx(i) + 7},243`, stroke: C.wri, 'stroke-width': 1.6, fill: 'none', 'marker-end': 'url(#ar-teal)', opacity: 0 }, svg));
        R.link.push(vline(svg, cx(i) - 5, 183, 243, { stroke: C.grey, 'stroke-dasharray': '2 3', opacity: 0 }));
        R.handle.push(clickable(E('circle', { cx: cx(i) - 5, cy: 176, r: 6.5, fill: '#fff', stroke: C.grad, 'stroke-width': 1.4, opacity: 0 }, svg), 'handle'));
        R.buf.push(clickable(E('rect', { x: cx(i) - 12, y: 197, width: 24, height: 12, rx: 2.5, fill: C.gradF, stroke: C.grad, opacity: 0 }, svg), 'buffer'));
        R.hfire.push(E('path', { d: `M${cx(i)},197 L${cx(i)},149`, stroke: C.grad, 'stroke-width': 2, fill: 'none', 'marker-end': 'url(#ar-purple)', opacity: 0 }, svg));
      }
    }
    R.G = cells(svg, 70, 28, NF, { fill: '#fff', stroke: C.line }); R.G.forEach((e, i) => { clickable(e, 'G'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'G'); });
    R.W = cells(svg, 120, 28, NF - 1, { fill: '#fff', stroke: C.line }); R.W.forEach((e, i) => { clickable(e, 'W'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'W'); });
    R.noW = E('g', { opacity: 0 }, svg);
    E('rect', { x: cx(20) - CW / 2, y: 120, width: CW, height: 28, rx: 4, fill: 'none', stroke: C.grey, 'stroke-dasharray': '3 3' }, R.noW);
    for (let i = 0; i < NF; i++) {
      const gG = E('g', { opacity: 0 }, svg), gW = E('g', { opacity: 0 }, svg);
      for (let k = 0; k < 3; k++) { E('rect', { x: cx(i) - 9 + 7 * k, y: 99.5, width: 4, height: 3, fill: C.gold }, gG); E('rect', { x: cx(i) - 9 + 7 * k, y: 149.5, width: 4, height: 3, fill: C.gold }, gW); }
      R.ckG.push(clickable(gG, 'ck')); if (i < NF - 1) R.ckW.push(clickable(gW, 'ck'));
    }
    R.P = cells(svg, 243, 34, NF - 1, { fill: '#fff', stroke: C.line }); R.P.forEach(e => clickable(e, 'page'));
    R.rf = fanPool(svg, C.wri, 'ar-teal', true); R.bf = fanPool(svg, C.grad, 'ar-purple', false);
    R.br = E('path', { fill: 'none', stroke: C.wri, 'stroke-width': 1.4, opacity: 0 }, svg); clickable(R.br, 'snapshot');
    R.brT = T(svg, 0, 300, '', { 'font-size': 11, fill: C.wri, 'text-anchor': 'middle' });
    R.spanB = E('rect', { y: 194, height: 18, rx: 4, fill: 'none', stroke: C.grad, 'stroke-width': 1.4, opacity: 0 }, svg);
    R.params = E('g', { opacity: 0 }, svg);
    R.released = E('g', { opacity: 0 }, svg);
    return R;
  },
  segments(tr) {
    const S = [];
    for (let i = 0; i < NF; i++) S.push({ kind: 'F', i, dur: 1, t0: tr.frames[i], t1: tr.frames[i + 1] });
    S.push({ kind: 'S', dur: 2, t0: tr.score[0], t1: tr.score[1] });
    for (const [typ, k, t0, t1] of tr.bwd) S.push({ kind: 'B' + typ, i: k, dur: 0.55, t0, t1 });
    S.push({ kind: 'E', dur: 1, t0: tr.bwd[tr.bwd.length - 1][3], t1: tr.tend });
    return S;
  },
  render(R, S, si, u) {
    const s = S[si];
    const fwdIdx = s.kind === 'F' ? s.i : NF;            // frames before this are fully done
    const inFwd = s.kind === 'F';
    const done = { G: i => i < fwdIdx || (inFwd && i === s.i && u >= 0.8), W: i => i < NF - 1 && (i < fwdIdx || (inFwd && i === s.i && u >= 0.8)), P: i => i < NF - 1 && (i < fwdIdx || (inFwd && i === s.i && u >= 0.92)) };
    // backward bookkeeping
    const bwdStart = S.findIndex(x => x.kind[0] === 'B');
    const processed = []; let cur = null;
    if (si >= bwdStart) for (let j = bwdStart; j < S.length && S[j].kind[0] === 'B'; j++) { if (j < si || s.kind === 'E') processed.push(S[j]); else if (j === si) cur = S[j]; }
    const cnt = Array(NF - 1).fill(0), consumed = Array(NF - 1).fill(false), Gb = Array(NF).fill(false), Wb = Array(NF - 1).fill(false);
    const apply = x => { for (let j = 0; j < x.i && j < NF - 1; j++) cnt[j]++; if (x.kind === 'BW') { consumed[x.i] = true; Wb[x.i] = true; } else Gb[x.i] = true; };
    processed.forEach(apply);
    if (cur && u > 0.45) apply(cur);
    const ended = s.kind === 'E', fade = ended ? 1 - u : 1;
    for (let i = 0; i < NF; i++) {
      const gOn = done.G(i), gNow = inFwd && i === s.i && u < 0.8;
      set(R.G[i], { fill: gOn || gNow ? C.genF : '#fff', stroke: Gb[i] || (cur && cur.kind === 'BG' && cur.i === i) ? C.grad : gOn || gNow ? C.gen : C.line, 'stroke-width': (cur && cur.i === i && cur.kind === 'BG') || gNow ? 2.4 : 1.2 });
      R.G[i].style.opacity = gNow ? 0.55 + 0.45 * clamp(u / 0.8, 0, 1) : 1;
      show(R.pred[i], gOn); show(R.lossMark[i], gOn);
      show(R.gl[i], !!(Gb[i] || (cur && cur.kind === 'BG' && cur.i === i))); flow(R.gl[i], cur && cur.kind === 'BG' && cur.i === i);
      show(R.ckG[i], gOn && !Gb[i], fade);
      if (i < NF - 1) {
        const wOn = done.W(i), wNow = inFwd && i === s.i && u >= 0.8 && u < 0.92;
        set(R.W[i], { fill: wOn ? C.wriF : '#fff', stroke: Wb[i] || (cur && cur.kind === 'BW' && cur.i === i) ? C.grad : wOn ? C.wri : C.line, 'stroke-width': wNow || (cur && cur.kind === 'BW' && cur.i === i) ? 2.4 : 1.2 });
        show(R.sg[i], wOn);
        const pOn = done.P(i);
        set(R.P[i], { fill: pOn ? C.page : '#fff', stroke: pOn ? C.wri : C.line, 'fill-opacity': ended ? 1 - u : 1 });
        show(R.commit[i], pOn && !(si > bwdStart + 2)); flow(R.commit[i], inFwd && i === s.i && u >= 0.92);
        show(R.handle[i], pOn, fade); show(R.toH[i], pOn, fade); show(R.link[i], pOn, fade * 0.8);
        show(R.ckW[i], wOn && !Wb[i], fade);
        const bufOn = cnt[i] > 0 && !consumed[i];
        show(R.buf[i], bufOn || (cur && cur.kind === 'BW' && cur.i === i));
        set(R.buf[i], { 'fill-opacity': clamp(0.25 + cnt[i] / 39, 0.25, 1) });
        const fire = cur && cur.kind === 'BW' && cur.i === i;
        show(R.hfire[i], fire); flow(R.hfire[i], fire);
      }
    }
    show(R.noW, fwdIdx >= NF - 1 && (fwdIdx > NF - 1 || u >= 0.8));
    // every read of the prefix and every gradient back to it
    const sel = selFor('pages');
    let rd = null, gd = null;
    if (sel) { rd = sel; gd = sel; }
    else {
      if (inFwd && u < 0.8) rd = { role: 'G', k: s.i };
      else if (inFwd && u < 0.92 && s.i < NF - 1) rd = { role: 'W', k: s.i };
      if (cur && u <= 0.95) gd = { role: cur.kind === 'BG' ? 'G' : 'W', k: cur.i };
    }
    const ry = r => r === 'G' ? 98 : 148;
    fanTo(R.rf, rd ? rd.k : 0, rd ? readPath(243, cx(rd.k) - 6, ry(rd.role)) : null, !sel);
    fanTo(R.bf, gd ? gd.k : 0, gd ? gradPath(cx(gd.k) + 6, ry(gd.role) + 1, 196) : null, !sel);
    if (rd && rd.k > 0) { const xa = cx(0) - 14, xb = cx(rd.k - 1) + 14; set(R.br, { d: `M${xa},284 L${xa},289 L${xb},289 L${xb},284` }); show(R.br, true); } else show(R.br, false);
    show(R.brT, false);
    if (gd && gd.k > 0) { const xa = cx(0) - 14, xb = cx(gd.k - 1) + 14; set(R.spanB, { x: xa - 2, width: xb - xa + 4 }); show(R.spanB, true); } else show(R.spanB, false);
    const zr = sel ? sel : inFwd ? { role: u < 0.8 ? 'G' : 'W', k: s.i } : cur ? { role: cur.kind === 'BG' ? 'G' : 'W', k: cur.i } : null;
    WT.zs = {
      committed: Array.from({ length: NF - 1 }, (_, j) => done.P(j)), cnt, consumed,
      reader: inFwd && s.i === NF - 1 && u >= 0.8 ? null : zr,
      reading: !!sel || (inFwd && u < 0.92), replay: !sel && !!cur, split: !sel && !!cur && u <= 0.95,
      commitTo: !sel && inFwd && u >= 0.92 && s.i < NF - 1 ? s.i : -1,
      toW: !sel && cur && cur.kind === 'BW' ? cur.i : -1, fade: ended ? 1 - u : 1, flowing: !sel
    };
    show(R.params, !!(cur && cur.kind === 'BW'));
    show(R.released, ended, u);
  },
  now(S, si, u) {
    const s = S[si];
    if (s.kind === 'F') {
      const i = s.i;
      if (u < 0.15) return ['F', `Forward · frame ${i} of 20`, i === 0 ? 'Frame 0 has no history yet: its attention reads only its own K and V.' : i === 1 ? 'Frame 1 reads page P₀ through its handle. _PageCat reads it in place, so attention sees the bytes the inference cache would hold.' : `Frame ${i} reads pages P₀ … P${sub(i - 1)} through their handles. _PageCat reads them in place, so attention sees the bytes the inference cache would hold.`, 'snapshot'];
      if (u < 0.8) return ['F', `Forward · frame ${i} of 20`, `Gθ denoises frame ${i} in four sampling steps. The forward at the sampled exit step keeps its graph, and its prediction enters the video loss.`, 'G'];
      if (i === NF - 1) return ['F', 'Forward · frame 20 of 20', 'The last frame is never read by a later frame, so its write is omitted. The rollout is complete.', 'W'];
      if (u < 0.92) return ['F', `Forward · frame ${i} of 20`, `The memory write 𝒦θ,φ reads the same pages and turns the detached prediction of frame ${i} into its K/V. The writer residual φ is active only here.`, 'W'];
      return ['F', `Forward · frame ${i} of 20`, `The K/V of frame ${i} are committed once to slot P${sub(i)}, outside the graph and outside any replay region. Handle h${sub(i)} keeps the gradient connection without a second copy of the data.`, 'page'];
    }
    if (s.kind === 'S') return ['S', 'Teacher and critic scoring', 'The teacher and the critic score the 21 predictions for the DMD loss. Until backward, only the pages, the group entry states and the predictions are kept.', 'ck'];
    if (s.kind === 'BG') return ['B', `Backward · exit forward of frame ${s.i}`, `The loss gradient enters the exit forward of frame ${s.i}, which is recomputed group by group. ${s.i ? `_PageCat splits its history gradient page by page into the buffers of P₀ … P${sub(s.i - 1)}.` : 'Frame 0 read no pages.'}`, 'buffer'];
    if (s.kind === 'BW') return ['B', `Backward · write of frame ${s.i}`, `Page P${sub(s.i)} has received the gradient of every later read. Handle h${sub(s.i)} passes it to the writer of frame ${s.i}; θ and the writer residual φ receive their gradient, and the writer's own reads send it on to P₀ … P${sub(Math.max(0, s.i - 1))}.`, 'handle'];
    return ['B', 'Backward complete', 'Every write has received the gradient of its future reads in one temporal traversal. The page table and the page gradients are released.', 'table'];
  },
  info: {
    G: ['Generation forward Gθ', 'Each frame runs four sampling forwards. The forward at the sampled exit step keeps its graph and its prediction enters the video loss; the other steps run without gradient.', 'traversal', ['if s == exit_step', 'out = noisy(x_t, t, hist)', 'outputs.append(out)', 'x0 = x0_exit = out.detach()']],
    W: ['Memory write 𝒦θ,φ', 'The write forward runs on the detached exit prediction. The writer residual φ, a rank-64 LoRA on the K and V projections, is added only here; the K/V it returns become the frame\'s pages.', 'attention', ['if self.memory_lora and write_page', 'k = k + self.k_memory_lora(x)', 'v = v + self.v_memory_lora(x)', 'return (y, k, v) if write_page else y']],
    handle: ['Data-free handle h_j', 'An expanded zero scalar with the page\'s shape. The graph records the writer output as its parent but keeps no copy of the K/V; in backward the handle passes the page gradient unchanged to the writer.', 'handle', ['def forward(ctx, page)', 'new_zeros(()).expand', 'def backward(ctx, grad)', 'return grad']],
    page: ['Write-once page slot P_j', 'The commit copies the writer output into its slot under no_grad, outside any checkpoint region. A committed slot is never written again, so a recomputed forward reads exactly the history it saw.', 'commit', ['with torch.no_grad():', 'self.tables[l].put(self.length, k, v)', 'kh.append(_PageHandle.apply(k))', 'self.k[:, rows].copy_(k)']],
    table: ['Page table', 'One contiguous table per layer, allocated at full size on first use and released after backward. It lives outside the autograd graph; only handles enter the graph.', 'commit', ['class _PageTable', 'shape = (k.shape[0], self.max_frames * L', 'self.k = k.new_empty(shape)']],
    snapshot: ['Snapshot and _PageCat', 'Each forward receives the table, the visible length and the handles. _PageCat concatenates a view of the visible slots with the frame\'s own K/V inside the rematerialized region.', 'attention', ['else:  # with graph: read via handles', 'k_attn = _PageCat.apply', 'v_attn = _PageCat.apply', 'flash_attention']],
    buffer: ['Page gradient buffer', 'The backward of _PageCat splits the history gradient page by page and clones each slice into its own contiguous buffer, so a retained page gradient does not pin the gradient of the whole history.', 'pagecat', ['def backward(ctx, grad)', 'def owned(g)', 'g.clone(memory_format=fmt)', 'split(ctx.sizes, 1)', '*(owned(g) for g in pages))']],
    ck: ['Checkpoint group entry states', 'Both forwards run their 30 blocks in non-reentrant checkpoint groups of five. Between forward and backward only the group entry states are kept; activations inside a group are recomputed when backward reaches it.', 'groups', ['torch.utils.checkpoint.checkpoint', 'use_reentrant=False', 'preserve_rng_state=False']],
    graph: ['What the autograd graph holds', 'Predictions, handles, checkpoint group entry states and, in backward, the page gradients. The K/V data stay in the page table outside the graph.', 'traversal', ['hist = store.snapshot_all_layers()', 'store.append_all_layers(pages)', 'loss = video_loss']]
  }
};

/* ---------- scheme: Self Forcing, write kept in the graph (mutable cache) */
const MUTABLE = {
  id: 'mutable', label: 'Self Forcing, gradient opened', sub: 'mutable cache',
  trace: 'mutable',
  build(svg) {
    const R = {};
    skeleton(svg, [[88, 'generate G_{θ}'], [138, 'write, in place'], [190, 'cache tensor'], [232, 'replays']]);
    R.frame = clickable(E('rect', { x: XL, y: 58, width: XR - XL, height: 230, rx: 10, fill: 'none', stroke: C.grad, 'stroke-dasharray': '6 5', 'stroke-width': 1.3 }, svg), 'graph');
    T(svg, XR - 6, 282, 'autograd graph', { 'font-size': 11.5, fill: C.grad, 'text-anchor': 'end' });
    lossMarks(svg, R);
    R.pred = []; R.gl = []; R.wr = []; R.saved = []; R.cs = [];
    const cb = E('rect', { x: XL + 4, y: 170, width: XR - XL - 8, height: 32, rx: 6, fill: '#fff', stroke: C.red, 'stroke-opacity': 0.5 }, svg); clickable(cb, 'cache');
    for (let i = 0; i < NF; i++) {
      R.pred.push(vline(svg, cx(i), 70, 47, { stroke: C.gen, 'stroke-width': 1.4, opacity: 0 }));
      R.gl.push(vline(svg, cx(i) + 5, 47, 70, { stroke: C.grad, 'stroke-width': 2, 'marker-end': 'url(#ar-purple)', opacity: 0 }));
      R.wr.push(vline(svg, cx(i), 148, 172, { stroke: C.red, 'stroke-width': 1.8, 'marker-end': 'url(#ar-red)', opacity: 0 }));
      R.cs.push(clickable(E('rect', { x: cx(i) - 15, y: 173, width: 30, height: 26, rx: 3, fill: C.redF, stroke: C.red, opacity: 0 }, svg), 'cache'));
      const g = E('g', { opacity: 0 }, svg);
      E('rect', { x: cx(i) + 6, y: 100, width: 9, height: 7, rx: 1.5, fill: C.redF, stroke: C.red, 'stroke-width': 0.9 }, g);
      E('rect', { x: cx(i) + 8, y: 102.5, width: 9, height: 7, rx: 1.5, fill: C.redF, stroke: C.red, 'stroke-width': 0.9 }, g);
      R.saved.push(clickable(g, 'saved'));
    }
    R.G = cells(svg, 70, 28, NF, { fill: '#fff', stroke: C.line }); R.G.forEach((e, i) => { clickable(e, 'G'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'G'); });
    R.W = cells(svg, 120, 28, NF, { fill: '#fff', stroke: C.line }); R.W.forEach((e, i) => { clickable(e, 'W'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'W'); });
    R.rf = fanPool(svg, C.wri, 'ar-teal', true); R.bf = fanPool(svg, C.grad, 'ar-purple', false);
    R.rep = [];
    for (let r = 0; r < 3; r++) R.rep.push(clickable(E('rect', { x: XL + 6 + 5 * r, y: 210 + 14 * r, width: XR - XL - 22, height: 12, rx: 4, fill: 'none', stroke: C.red, 'stroke-dasharray': '5 4', 'stroke-width': 1.4, opacity: 0 }, svg), 'replay'));
    R.oom = E('g', { opacity: 0 }, svg); clickable(R.oom, 'oom');
    E('rect', { x: XM - 80, y: 300, width: 160, height: 30, rx: 8, fill: C.red }, R.oom);
    T(R.oom, XM, 320, 'Out of memory', { 'font-size': 13, fill: '#fff', 'text-anchor': 'middle', 'font-weight': 700 });
    return R;
  },
  segments(tr) {
    const S = [];
    for (let i = 0; i < NF; i++) S.push({ kind: 'F', i, dur: 1, t0: tr.frames[i], t1: tr.frames[i + 1] });
    S.push({ kind: 'S', dur: 2, t0: tr.score[0], t1: tr.score[1] });
    for (const [typ, k, t0, t1] of tr.bwd) S.push({ kind: 'B' + typ, i: k, dur: 1.2, t0, t1 });
    S.push({ kind: 'O', dur: 2.5, t0: tr.tend, t1: tr.tend });
    return S;
  },
  render(R, S, si, u) {
    const s = S[si], inFwd = s.kind === 'F', fwdIdx = inFwd ? s.i : NF;
    const bwdStart = S.findIndex(x => x.kind[0] === 'B');
    const nb = si < bwdStart ? 0 : s.kind === 'O' ? 3 : si - bwdStart + (u > 0.5 ? 1 : 0);
    for (let i = 0; i < NF; i++) {
      const gOn = i < fwdIdx || (inFwd && i === s.i && u >= 0.8), gNow = inFwd && i === s.i && u < 0.8;
      const curB = s.kind === 'BG' && s.i === i;
      set(R.G[i], { fill: gOn || gNow ? C.genF : '#fff', stroke: curB ? C.grad : gOn || gNow ? C.gen : C.line, 'stroke-width': gNow || curB ? 2.4 : 1.2 });
      show(R.pred[i], gOn); show(R.lossMark[i], gOn);
      const gb = (s.kind[0] === 'B' || s.kind === 'O') && ((i === 20) || (i === 19 && (si > bwdStart + 1 || s.kind === 'O')));
      show(R.gl[i], gb || curB); flow(R.gl[i], curB);
      show(R.saved[i], i < fwdIdx || (inFwd && i === s.i && u >= 0.15));
      const wOn = i < fwdIdx || (inFwd && i === s.i && u >= 0.92), wNow = inFwd && i === s.i && u >= 0.8 && u < 0.92;
      const curW = s.kind === 'BW' && s.i === i;
      set(R.W[i], { fill: wOn || wNow ? C.wriF : '#fff', stroke: curW ? C.grad : wOn || wNow ? C.wri : C.line, 'stroke-width': wNow || curW ? 2.4 : 1.2 });
      show(R.wr[i], wOn || wNow); flow(R.wr[i], wNow || curW);
      show(R.cs[i], wOn || wNow);
    }
    const sel = selFor('mutable'), cur = s.kind === 'BG' || s.kind === 'BW' ? s : null;
    let rd = sel, gd = sel;
    if (!sel) { rd = inFwd && u < 0.8 ? { role: 'G', k: s.i } : inFwd && u < 0.92 ? { role: 'W', k: s.i } : null; gd = cur ? { role: cur.kind === 'BG' ? 'G' : 'W', k: cur.i } : null; }
    const ry = r => r === 'G' ? 98 : 148;
    fanTo(R.rf, rd ? rd.k : 0, rd ? readPath(172, cx(rd.k) - 6, ry(rd.role)) : null, !sel);
    fanTo(R.bf, gd ? gd.k : 0, gd ? gradPath(cx(gd.k) + 6, ry(gd.role) + 1, 171) : null, !sel);
    R.rep.forEach((r, k) => { show(r, k < nb); flow(r, k === nb - 1 && s.kind !== 'O'); });
    show(R.oom, s.kind === 'O', clamp(u * 3, 0, 1));
  },
  now(S, si, u) {
    const s = S[si];
    if (s.kind === 'F') {
      const i = s.i;
      if (u < 0.8) return ['F', `Forward · frame ${i} of 20`, `Each block runs inside a checkpoint region and attends to one shared K/V buffer per layer. Frame ${i} reads the buffer up to its own slot and saves the buffer it read for its backward.`, 'G'];
      return ['F', `Forward · frame ${i} of 20`, `The write assigns the K/V of frame ${i} into the buffer in place, inside the checkpoint region. With gradient enabled, the assignment makes the buffer a node of the frame's graph.`, 'W'];
    }
    if (s.kind === 'S') return ['S', 'Teacher and critic scoring', 'The graph now references the shared buffer from every reader and every write, in addition to the activations kept at the checkpoint boundaries of both forwards.', 'saved'];
    if (s.kind === 'BG' || s.kind === 'BW') return ['B', `Backward · ${s.kind === 'BG' ? 'exit forward' : 'write'} of frame ${s.i}`, 'Backward recomputes the checkpoint region. The replay re-executes the in-place assignment on the same tensor and attaches another graph to it, while the readers\' saved buffers stay alive.', 'replay'];
    return ['B', 'Out of memory', 'Replayed graphs and saved references accumulate on the external buffer. In the measured run the first backward runs out of memory before the third of its 41 forwards has been back-propagated. Self Forcing and CF++ therefore detach the cache after every segment (next tab).', 'oom'];
  },
  info: {
    G: ['Generation forward, ordinary path', 'Each block runs inside its checkpoint region and attends to the shared cache tensor up to the current slot. The reader saves that buffer for its backward.', 'mutable', ['for i, block in enumerate(self.blocks)', 'x = checkpoint(block, x, kv_cache=kv_cache[i], ...)', 'k_attn = kv_cache["k"][:, :hi]']],
    W: ['In-place write with graph', 'The write assigns K and V into the shared buffer in place. With gradient enabled, the buffer becomes a node of the segment\'s graph.', 'mutable', ['kv_cache["k"][:, lo:hi] = k', 'kv_cache["v"][:, lo:hi] = v']],
    cache: ['One shared buffer per layer', 'Every write modifies the same storage and every reader saves it, so all frames\' graphs reference one tensor whose version changes with every write.', 'mutable', ['kv_cache["k"][:, lo:hi] = k', 'k_attn = kv_cache["k"][:, :hi]']],
    saved: ['Saved buffer references', 'Each reader saves the buffer it attended to for its backward. These references keep the shared tensor and its graph alive until backward.', 'mutable', ['k_attn = kv_cache["k"][:, :hi]', 'v_attn = kv_cache["v"][:, :hi]', 'flash_attention']],
    replay: ['Replay attaches new graphs', 'Recomputing a checkpoint region in backward runs the in-place assignment again on the same tensor. Each replay attaches a second graph (including CopySlices) to the externally retained buffer, and these graphs outlive their use.', 'mutable', ['kv_cache["k"][:, lo:hi] = k', 'x = checkpoint(block']],
    oom: ['Out of memory', 'In the production setting (4 H100, batch 2 per GPU) the first generator backward runs out of memory. The measured run (curve below) stops after back-propagating fewer than three of its 41 forwards.', 'mutable', ['kv_cache["k"][:, lo:hi] = k']],
    graph: ['What the autograd graph holds', 'With the write kept in the graph, the shared cache tensor itself is part of every frame\'s graph, together with the saved buffers of all readers.', 'mutable', ['kv_cache["k"][:, lo:hi] = k']]
  }
};

/* ---------- scheme: Self Forcing / CF++, detached writes */
const DETACHED = {
  id: 'detached', label: 'Self Forcing / CF++', sub: 'detached writes',
  trace: 'detached',
  build(svg) {
    const R = {};
    skeleton(svg, [[88, 'generate G_{θ}'], [138, 'write, detached'], [264, 'cache']]);
    R.frame = clickable(E('rect', { x: XL, y: 58, width: XR - XL, height: 100, rx: 10, fill: 'none', stroke: C.grad, 'stroke-dasharray': '6 5', 'stroke-width': 1.3 }, svg), 'graph');
    T(svg, XR - 6, 172, 'autograd graph', { 'font-size': 11.5, fill: C.grad, 'text-anchor': 'end' });
    lossMarks(svg, R);
    R.pred = []; R.gl = []; R.wr = []; R.cut = []; R.cs = []; R.stop = [];
    E('rect', { x: XL + 4, y: 243, width: XR - XL - 8, height: 34, rx: 6, fill: '#fff', stroke: C.line }, svg);
    for (let i = 0; i < NF; i++) {
      R.pred.push(vline(svg, cx(i), 70, 47, { stroke: C.gen, 'stroke-width': 1.4, opacity: 0 }));
      R.gl.push(vline(svg, cx(i) + 5, 47, 70, { stroke: C.grad, 'stroke-width': 2, 'marker-end': 'url(#ar-purple)', opacity: 0 }));
      R.wr.push(vline(svg, cx(i), 148, 245, { stroke: C.grey, 'stroke-width': 1.5, 'marker-end': 'url(#ar-grey)', opacity: 0 }));
      const g = E('g', { opacity: 0 }, svg);
      E('line', { x1: cx(i) - 6, x2: cx(i) + 6, y1: 196, y2: 196, stroke: C.muted, 'stroke-width': 2.4 }, g);
      R.cut.push(clickable(g, 'detach'));
      R.cs.push(clickable(E('rect', { x: cx(i) - 15, y: 246, width: 30, height: 28, rx: 3, fill: C.greyF, stroke: C.grey, opacity: 0 }, svg), 'cache'));
      R.stop.push(E('text', { x: cx(i) - 9, y: 112, 'font-size': 11, fill: C.grad, opacity: 0 }, svg));
      R.stop[i].textContent = '✕';
    }
    R.G = cells(svg, 70, 28, NF, { fill: '#fff', stroke: C.line }); R.G.forEach((e, i) => { clickable(e, 'G'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'G'); });
    R.W = cells(svg, 120, 28, NF, { fill: '#fff', stroke: C.line }); R.W.forEach((e, i) => { clickable(e, 'W'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'W'); });
    R.rf = fanPool(svg, C.grey, 'ar-grey', true); R.bf = fanPool(svg, C.grad, null, false); R.bx = xPool(svg);
    return R;
  },
  segments(tr) {
    const S = [];
    for (let i = 0; i < NF; i++) S.push({ kind: 'F', i, dur: 1, t0: tr.frames[i], t1: tr.frames[i + 1] });
    S.push({ kind: 'S', dur: 2, t0: tr.score[0], t1: tr.score[1] });
    for (const [typ, k, t0, t1] of tr.bwd) S.push({ kind: 'BG', i: k, dur: 0.55, t0, t1 });
    S.push({ kind: 'E', dur: 1, t0: tr.bwd[tr.bwd.length - 1][3], t1: tr.tend });
    return S;
  },
  render(R, S, si, u) {
    const s = S[si], inFwd = s.kind === 'F', fwdIdx = inFwd ? s.i : NF;
    const bwdStart = S.findIndex(x => x.kind === 'BG');
    for (let i = 0; i < NF; i++) {
      const gOn = i < fwdIdx || (inFwd && i === s.i && u >= 0.8), gNow = inFwd && i === s.i && u < 0.8;
      const bDone = (si > bwdStart && S.slice(bwdStart, si).some(x => x.i === i)) || s.kind === 'E';
      const curB = s.kind === 'BG' && s.i === i;
      set(R.G[i], { fill: gOn || gNow ? C.genF : '#fff', stroke: curB || bDone ? C.grad : gOn || gNow ? C.gen : C.line, 'stroke-width': gNow || curB ? 2.4 : 1.2 });
      show(R.pred[i], gOn); show(R.lossMark[i], gOn);
      show(R.gl[i], curB || bDone); flow(R.gl[i], curB);
      show(R.stop[i], false);
      const wOn = i < fwdIdx || (inFwd && i === s.i && u >= 0.8);
      set(R.W[i], { fill: wOn ? C.greyF : '#fff', stroke: wOn ? C.grey : C.line, 'stroke-width': 1.2 });
      show(R.wr[i], wOn); show(R.cut[i], wOn); show(R.cs[i], wOn);
    }
    const sel = selFor('detached'), cur = s.kind === 'BG' ? s : null;
    let rd = sel, gd = sel && sel.role === 'G' ? sel : null;
    if (!sel) { rd = inFwd && u < 0.8 ? { role: 'G', k: s.i } : inFwd && u < 0.92 ? { role: 'W', k: s.i } : null; gd = cur && u <= 0.95 ? { role: 'G', k: cur.i } : null; }
    const ry = r => r === 'G' ? 98 : 148;
    fanTo(R.rf, rd ? rd.k : 0, rd ? readPath(246, cx(rd.k) - 6, ry(rd.role)) : null, !sel);
    fanTo(R.bf, gd ? gd.k : 0, gd ? gradPath(cx(gd.k) + 6, ry(gd.role) + 1, 204) : null, !sel);
    R.bx.forEach((x, j) => { const on = !!gd && j < gd.k; if (on) set(x, { x: cx(j), y: 215 }); show(x, on); });
  },
  now(S, si, u) {
    const s = S[si];
    if (s.kind === 'F') return ['F', `Forward · frame ${s.i} of 20`, u < 0.8 ? `Frame ${s.i} attends to the cache, which holds data only. Its exit prediction keeps its graph and enters the loss.` : `The write of frame ${s.i} is detached: the cache is cut after every segment, so nothing connects a later read to this write.`, u < 0.8 ? 'G' : 'detach'];
    if (s.kind === 'S') return ['S', 'Teacher and critic scoring', 'Only the exit forwards carry a graph. The cache is data only, so training fits comfortably in memory.', 'graph'];
    if (s.kind === 'BG') return ['B', `Backward · exit forward of frame ${s.i}`, `The loss gradient reaches the exit forward of frame ${s.i} and stops at the cache. No write receives a gradient, so the memory is never trained for what later frames need.`, 'detach'];
    return ['B', 'Backward complete', 'The generator learned from its predictions, but the K/V it writes were never trained by their future use. This is the gradient dKV Forcing restores.', 'detach'];
  },
  info: {
    G: ['Generation forward', 'The exit forward keeps its graph and its prediction enters the loss. It reads the cache as data.', 'mutable', ['x = checkpoint(block, x, kv_cache=kv_cache[i], ...)', 'k_attn = kv_cache["k"][:, :hi]']],
    W: ['Detached write', 'The write still fills the cache, but the cache is detached after every segment, so the write is outside any graph.', 'sfcut', ['entry["k"] = entry["k"].detach()', 'entry["v"] = entry["v"].detach()']],
    detach: ['The cut', 'Self Forcing and Causal Forcing++ detach the cache after every segment. Memory stays bounded, and the gradient of a future read never reaches the write that produced it.', 'sfcut', ['for entry in kv_cache:', 'entry["k"] = entry["k"].detach()', 'entry["v"] = entry["v"].detach()']],
    cache: ['Cache, data only', 'The cache is a mutable buffer without graph connections. Later frames read its values, but no gradient flows back into it.', 'sfcut', ['entry["k"] = entry["k"].detach()']],
    graph: ['What the autograd graph holds', 'Only the exit forwards of the 21 frames and their checkpoint boundaries.', 'mutable', ['x = checkpoint(block']]
  }
};

/* ---------- scheme: SGF two-pass reconstruction */
const TWOPASS = {
  id: 'twopass', label: 'SGF', sub: 'two-pass reconstruction',
  trace: 'twopass',
  build(svg) {
    const R = {};
    skeleton(svg, [[88, 'pass 1: generate'], [138, 'pass 1: write'], [179, 'cache'], [206, 'recorded'], [268, 'pass 2']]);
    lossMarks(svg, R);
    R.G = cells(svg, 70, 28, NF, { fill: '#fff', stroke: C.line }); R.G.forEach((e, i) => { clickable(e, 'G'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'G'); });
    R.W = cells(svg, 120, 28, NF, { fill: '#fff', stroke: C.line }); R.W.forEach((e, i) => { clickable(e, 'W'); e.setAttribute('data-frame', i); e.setAttribute('data-role', 'W'); });
    E('rect', { x: XL + 4, y: 164, width: XR - XL - 8, height: 22, rx: 5, fill: '#fff', stroke: C.line }, svg);
    R.cs = cells(svg, 166, 18, NF, { fill: C.greyF, stroke: C.grey, opacity: 0 }); R.cs.forEach(e => clickable(e, 'cache'));
    R.rec = cells(svg, 195, 14, NF, { fill: '#e8eef6', stroke: '#9fb3cc', opacity: 0 }); R.rec.forEach(e => clickable(e, 'rec'));
    R.frame = clickable(E('rect', { x: XL, y: 222, width: XR - XL, height: 92, rx: 10, fill: 'none', stroke: C.grad, 'stroke-dasharray': '6 5', 'stroke-width': 1.3, opacity: 0 }, svg), 'graph');
    R.frameT = T(svg, XR - 6, 308, 'autograd graph', { 'font-size': 11.5, fill: C.grad, 'text-anchor': 'end', opacity: 0 });
    R.layers = [];
    for (let r = 0; r < 6; r++) {
      const g = E('g', { opacity: 0 }, svg);
      const rect = E('rect', { x: XL + 6, y: 228 + 12 * r, width: XR - XL - 12, height: 9, rx: 3, fill: '#efeaf8', stroke: '#c9b8e6' }, g);
      R.layers.push({ g, rect }); clickable(g, 'pass2');
    }
    R.lyr = T(svg, LX, 300, '', { 'font-size': 10.5, fill: C.muted, 'text-anchor': 'end' });
    R.p2loss = E('path', { d: `M${XR},250 H${XR + 16} V35 H${XR - 6}`, fill: 'none', stroke: C.gen, 'stroke-width': 1.6, 'marker-end': 'url(#ar-ink)', opacity: 0 }, svg);
    R.gl2 = E('path', { d: `M${XR - 2},35 H${XR + 24} V260 H${XR + 2}`, fill: 'none', stroke: C.grad, 'stroke-width': 2, 'marker-end': 'url(#ar-purple)', opacity: 0 }, svg);
    R.toP2 = E('g', { opacity: 0 }, svg);
    for (let i = 0; i < NF; i++) vline(R.toP2, cx(i), 210, 226, { stroke: '#9fb3cc', 'stroke-width': 1.2 });
    R.rf = fanPool(svg, C.grey, 'ar-grey', true); R.bf = fanPool(svg, C.grad, null, false); R.bx = xPool(svg);
    return R;
  },
  segments(tr) {
    const S = [];
    for (let i = 0; i < NF; i++) S.push({ kind: 'F', i, dur: 1, t0: tr.frames[i], t1: tr.frames[i + 1] });
    S.push({ kind: 'P2', dur: 4, t0: tr.pass2[0], t1: tr.pass2[1] });
    S.push({ kind: 'S', dur: 2, t0: tr.score[0], t1: tr.score[1] });
    S.push({ kind: 'BL', dur: 8, t0: tr.bwd[0], t1: tr.bwd[1] });
    S.push({ kind: 'E', dur: 1, t0: tr.bwd[1], t1: tr.tend });
    return S;
  },
  render(R, S, si, u) {
    const s = S[si], inFwd = s.kind === 'F', fwdIdx = inFwd ? s.i : NF;
    const p2 = S.findIndex(x => x.kind === 'P2');
    for (let i = 0; i < NF; i++) {
      const gOn = i < fwdIdx || (inFwd && i === s.i && u >= 0.8), gNow = inFwd && i === s.i && u < 0.8;
      set(R.G[i], { fill: gOn || gNow ? C.greyF : '#fff', stroke: gNow ? C.muted : gOn ? C.grey : C.line, 'stroke-width': gNow ? 2.2 : 1.2 });
      const wOn = i < fwdIdx || (inFwd && i === s.i && u >= 0.92), wNow = inFwd && i === s.i && u >= 0.8 && u < 0.92;
      set(R.W[i], { fill: wOn || wNow ? C.greyF : '#fff', stroke: wNow ? C.muted : wOn ? C.grey : C.line, 'stroke-width': wNow ? 2.2 : 1.2 });
      show(R.cs[i], wOn); show(R.rec[i], i < fwdIdx || (inFwd && i === s.i && u >= 0.8));
      const lossOn = si > p2 || (si === p2 && u > 0.9);
      show(R.lossMark[i], lossOn);
    }
    const afterP1 = si >= p2;
    show(R.frame, afterP1); show(R.frameT, afterP1); show(R.toP2, si === p2, 1);
    const nf = si < p2 ? 0 : si === p2 ? Math.floor(u * 6.999) + 1 : 6;
    const bl = S.findIndex(x => x.kind === 'BL');
    const nb = si < bl ? 0 : si === bl ? Math.floor(u * 6.999) + 1 : 6;
    R.layers.forEach((L, r) => {
      show(L.g, r < nf);
      const back = r >= 6 - nb;
      set(L.rect, { fill: back ? C.gradF : '#efeaf8', stroke: back ? C.grad : '#c9b8e6', 'stroke-width': back && r === 6 - nb ? 2 : 1 });
    });
    R.lyr.textContent = '';
    show(R.p2loss, si > p2 || (si === p2 && u > 0.9));
    show(R.gl2, si >= bl); flow(R.gl2, si === bl);
    const sel = selFor('twopass');
    const rd = sel || (inFwd && u < 0.8 ? { role: 'G', k: s.i } : inFwd && u < 0.92 ? { role: 'W', k: s.i } : null);
    fanTo(R.rf, rd ? rd.k : 0, rd ? readPath(165, cx(rd.k) - 6, rd.role === 'G' ? 98 : 148) : null, !sel);
  },
  now(S, si, u) {
    const s = S[si];
    if (s.kind === 'F') return ['F', `Pass 1 · frame ${s.i} of 20`, `Pass 1 rolls out without gradient, exactly as at inference. Frame ${s.i} is generated and written into the cache, and its exit-step noisy input and write input are recorded for pass 2.`, 'rec'];
    if (s.kind === 'P2') return ['F', 'Pass 2 · one forward over all 2T frames', 'One teacher-forced forward over the whole clip with gradient: the recorded write inputs give the context K/V and the recorded noisy inputs the predictions. The graph of the entire sequence is held at once.', 'pass2'];
    if (s.kind === 'S') return ['S', 'Teacher and critic scoring', 'The whole-sequence graph of pass 2 and the T-frame cache stay allocated while the predictions are scored.', 'pass2'];
    if (s.kind === 'BL') return ['B', 'Backward · layer by layer', 'Backward replays pass 2 layer by layer, each layer over all 2T frames. Every write receives the gradient of its future reads.', 'pass2'];
    return ['B', 'Backward complete', 'The gradient equals the single-traversal one (Proposition 1). The cost is the second pass, the whole-sequence graph and the cache kept allocated between steps.', 'pass2'];
  },
  info: {
    G: ['Pass 1: generation without graph', 'The rollout runs under no_grad, exactly as at inference, and records the noisy input of each frame at the exit step.', 'twopass', ['with torch.no_grad():', 'noisy_at_t[:, i] = x_t', 'x0 = model(x_t, t, kv_cache)']],
    W: ['Pass 1: write without graph', 'The write fills the mutable cache without gradient; its input is recorded for pass 2.', 'twopass', ['x_ctx_hat[:, i] = x_ctx', 'model(x_ctx, context_t, kv_cache)  # the write']],
    cache: ['Cache, data only', 'Pass 1 fills the T-frame cache with data. It stays allocated, also between training steps.', 'twopass', ['model(x_ctx, context_t, kv_cache)  # the write']],
    rec: ['Recorded inputs', 'The exit-step noisy input and the write input of every frame are kept for pass 2.', 'twopass', ['noisy_at_t[:, i] = x_t', 'x_ctx_hat[:, i] = x_ctx']],
    pass2: ['Pass 2: whole-sequence forward', 'One teacher-forced forward over all 2T frames with gradient. Its graph and attention working set are retained until backward, which replays it layer by layer.', 'twopass', ['# pass 2: one teacher-forced forward', 'output = model(noisy_at_t, t_exit,', 'clean_x=x_ctx_hat.detach(), aug_t=context_t)', 'loss = video_loss(output)']],
    graph: ['What the autograd graph holds', 'The whole pass-2 forward over 2T frames: its checkpoint boundaries and attention working set for every layer.', 'twopass', ['output = model(noisy_at_t, t_exit,']]
  }
};

function sub(n) { return String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[+d]).join(''); }

/* ---------- zoom: inside one transformer layer (Figure 5 of the paper, animated) */
const ZX = j => 198 + 35.6 * j;
function setRich(t, str) { t.replaceChildren(); rich(t, str, +t.getAttribute('font-size')); }
const ZOOM = {
  build(svg) {
    svg.replaceChildren(); arrowDefs(svg);
    const Z = {}, L = ZX(0) - 24, Rr = ZX(20) + 24;
    T(svg, 164, 26, 'one layer', { 'font-size': 12.5, fill: C.accent, 'text-anchor': 'end', 'font-weight': 700 });
    for (const [y, t] of [[82, 'attention K/V'], [122, 'gradients'], [155, 'handles'], [235, 'page table']]) T(svg, 164, y, t, { 'font-size': 12.5, 'text-anchor': 'end', 'font-weight': 600 });
    Z.frame = clickable(E('rect', { x: L, y: 54, width: Rr - L, height: 132, rx: 10, fill: 'none', stroke: C.grad, 'stroke-dasharray': '6 5', 'stroke-width': 1.3 }, svg), 'graph');
    T(svg, Rr - 6, 181, 'autograd graph', { 'font-size': 11.5, fill: C.grad, 'text-anchor': 'end' });
    Z.tb = clickable(E('rect', { x: L, y: 207, width: Rr - L, height: 44, rx: 8, fill: '#fbfcfd', stroke: C.line }, svg), 'table');
    Z.row = clickable(E('rect', { y: 63, height: 28, rx: 6, fill: '#fff', stroke: C.muted, 'stroke-width': 1.1, opacity: 0 }, svg), 'snapshot');
    Z.read = []; Z.cc = []; Z.split = []; Z.buf = []; Z.down = []; Z.h = []; Z.hl = []; Z.slot = []; Z.slotT = [];
    for (let j = 0; j < NF - 1; j++) {
      Z.read.push(vline(svg, ZX(j) - 9, 212, 93, { stroke: C.wri, 'stroke-width': 1.3, 'stroke-dasharray': '4 3', 'marker-end': 'url(#ar-teal)', opacity: 0 }));
      Z.cc.push(E('rect', { x: ZX(j) - 14, y: 67, width: 28, height: 20, rx: 3, fill: C.wriF, stroke: C.wri, 'stroke-width': 0.8, opacity: 0 }, svg));
      Z.split.push(vline(svg, ZX(j) + 6, 91, 110, { stroke: C.grad, 'stroke-width': 1.5, 'marker-end': 'url(#ar-purple)', opacity: 0 }));
      Z.buf.push(clickable(E('rect', { x: ZX(j) - 2, y: 112, width: 16, height: 12, rx: 2, fill: C.gradF, stroke: C.grad, opacity: 0 }, svg), 'buffer'));
      Z.down.push(vline(svg, ZX(j) + 6, 124, 142, { stroke: C.grad, 'stroke-width': 1.8, 'marker-end': 'url(#ar-purple)', opacity: 0 }));
      Z.hl.push(vline(svg, ZX(j) + 6, 157, 213, { stroke: C.grey, 'stroke-dasharray': '1.5 3', opacity: 0 }));
      Z.h.push(clickable(E('circle', { cx: ZX(j) + 6, cy: 150, r: 6.5, fill: '#fff', stroke: C.grad, 'stroke-width': 1.3, opacity: 0 }, svg), 'handle'));
      Z.slot.push(clickable(E('rect', { x: ZX(j) - 15, y: 214, width: 30, height: 32, rx: 4, fill: '#fff', stroke: C.line }, svg), 'page'));
      Z.slotT.push(T(svg, ZX(j), 234, 'P_{' + j + '}', { 'font-size': 10.5, 'text-anchor': 'middle', fill: '#fff', opacity: 0 }));
    }
    Z.own = E('rect', { y: 67, width: 28, height: 20, rx: 3, opacity: 0 }, svg);
    Z.ownT = T(svg, 0, 81, 'K,V', { 'font-size': 9.5, 'text-anchor': 'middle', opacity: 0 });
    Z.up = E('line', { stroke: C.muted, 'stroke-width': 1.2, 'marker-end': 'url(#ar-ink)', opacity: 0 }, svg);
    Z.box = E('rect', { y: 10, width: 128, height: 30, rx: 6, 'stroke-width': 1.6, opacity: 0 }, svg);
    Z.boxT = T(svg, 0, 30, '', { 'font-size': 12.5, 'text-anchor': 'middle', opacity: 0 });
    Z.boxG = E('g', {}, svg); Z.boxG.append(Z.box, Z.boxT); clickable(Z.boxG, 'G');
    Z.commit = E('path', { fill: 'none', stroke: C.wri, 'stroke-width': 2, 'marker-end': 'url(#ar-teal)', opacity: 0 }, svg);
    Z.toW = E('path', { fill: 'none', stroke: C.grad, 'stroke-width': 2, 'marker-end': 'url(#ar-purple)', opacity: 0 }, svg);
    Z.br = E('path', { fill: 'none', stroke: C.wri, 'stroke-width': 1.3, opacity: 0 }, svg);
    return Z;
  },
  render(Z, st) {
    const r = st.reader, k = r ? r.k : 0, nRead = r ? k : 0;
    for (let j = 0; j < NF - 1; j++) {
      const c = st.committed[j], bufOn = (st.cnt[j] > 0 && !st.consumed[j]) || st.toW === j;
      set(Z.slot[j], { fill: c ? C.page : '#fff', stroke: c ? C.wri : C.line, 'fill-opacity': st.fade });
      show(Z.slotT[j], c, st.fade);
      show(Z.h[j], c, st.fade); show(Z.hl[j], c, 0.9 * st.fade);
      set(Z.h[j], { 'stroke-width': st.toW === j ? 2.6 : 1.3, fill: st.toW === j ? C.gradF : '#fff' });
      show(Z.buf[j], bufOn); set(Z.buf[j], { 'fill-opacity': clamp(0.25 + st.cnt[j] / 39, 0.25, 1) });
      show(Z.down[j], st.toW === j); flow(Z.down[j], st.toW === j);
      const rd = j < nRead;
      show(Z.cc[j], rd); show(Z.read[j], rd && (st.reading || st.replay), st.reading ? 1 : 0.45); flow(Z.read[j], rd && st.reading && st.flowing);
      show(Z.split[j], rd && st.split); flow(Z.split[j], rd && st.split);
    }
    if (r) {
      const xa = ZX(0) - 18, xb = ZX(k) + 18;
      set(Z.row, { x: xa, width: xb - xa }); show(Z.row, true);
      const col = r.role === 'G' ? [C.genF, C.gen] : [C.wriF, C.wri];
      set(Z.own, { x: ZX(k) - 14, fill: col[0], stroke: col[1] }); show(Z.own, true);
      set(Z.ownT, { x: ZX(k) }); show(Z.ownT, true);
      const bx = clamp(ZX(k) - 64, ZX(0) - 24, ZX(20) + 24 - 128);
      set(Z.box, { x: bx, fill: col[0], stroke: st.replay ? C.grad : col[1] }); show(Z.box, true);
      set(Z.boxT, { x: bx + 64 }); setRich(Z.boxT, (r.role === 'G' ? 'G_{θ}' : '𝒦_{θ,φ}') + ' · frame ' + k); show(Z.boxT, true);
      Z.boxG.dataset.info = r.role; Z.boxG.setAttribute('data-frame', k); Z.boxG.setAttribute('data-role', r.role);
      set(Z.up, { x1: ZX(k), x2: ZX(k), y1: 62, y2: 42 }); show(Z.up, true);
      if (k > 0 && st.reading) { const a = ZX(0) - 15, b = ZX(k - 1) + 15; set(Z.br, { d: `M${a},250 L${a},256 L${b},256 L${b},250` }); show(Z.br, true); } else show(Z.br, false);
      if (st.commitTo >= 0) { const x = ZX(st.commitTo); set(Z.commit, { d: `M${bx + 128},25 C${bx + 190},25 ${x + 44},196 ${x + 4},212` }); show(Z.commit, true); flow(Z.commit, true); } else show(Z.commit, false);
      if (st.toW >= 0) { const x = ZX(st.toW) + 13; set(Z.toW, { d: `M${x},150 C${x + 70},150 ${bx + 190},25 ${bx + 130},25` }); show(Z.toW, true); flow(Z.toW, true); } else show(Z.toW, false);
    } else { [Z.row, Z.own, Z.ownT, Z.box, Z.boxT, Z.up, Z.commit, Z.toW, Z.br].forEach(e => show(e, false)); }
  }
};

const SCHEMES = [PAGES, MUTABLE, DETACHED, TWOPASS];
const WT = { scheme: null, R: null, S: null, total: 0, t: 0, playing: false, speed: 1, last: 0, pinned: false };

function initWalkthrough() {
  const tabs = $('#wt-tabs');
  SCHEMES.forEach((sc, i) => {
    const b = document.createElement('button'); b.className = 'tab'; b.setAttribute('role', 'tab');
    b.innerHTML = `${sc.label}<span class="dur">${sc.sub}</span>`;
    b.addEventListener('click', () => selectScheme(i));
    tabs.append(b);
  });
  $('#wt-play').addEventListener('click', () => wtPlay(!WT.playing));
  $('#wt-prev').addEventListener('click', () => wtJump(-1));
  $('#wt-next').addEventListener('click', () => wtJump(1));
  const r = $('#wt-range');
  r.addEventListener('input', () => { WT.t = +r.value * WT.total / 1000; unpin(); draw(); });
  $$('#wt-speed button').forEach(b => b.addEventListener('click', () => {
    WT.speed = +b.dataset.rate; $$('#wt-speed button').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));
  $('#code-back').addEventListener('click', () => { unpin(); draw(); });
  const onPick = e => {
    const el = e.target.closest('.clk'); if (!el) return;
    const inf = WT.scheme.info[el.dataset.info]; if (!inf) return;
    wtPlay(false); WT.pinned = true;
    const fr = el.getAttribute('data-frame');
    WT.sel = fr !== null ? { scheme: WT.scheme.id, role: el.getAttribute('data-role'), k: +fr } : null;
    let title = inf[0], text = inf[1];
    if (WT.sel) {
      const k = WT.sel.k; title += ' · frame ' + k;
      text += k === 0 ? ' Frame 0 reads no earlier frame.' : ` It reads ${k === 1 ? 'frame 0' : 'frames 0 … ' + (k - 1)}` + ({ pages: ' through their pages and handles, and in backward returns a gradient to each of them.', mutable: ' from the shared buffer, which keeps every reader in the graph.', detached: ' from the detached cache, so no gradient returns to those writes.', twopass: ' from the cache without a graph; pass 2 recomputes these reads with gradient.' })[WT.scheme.id];
    }
    $('#wt-phase').className = 'phase I'; $('#wt-phase').textContent = 'Element';
    $('#wt-title').textContent = title; $('#wt-text').textContent = text;
    showCode(inf[2], inf[3], title);
    draw();
  };
  $('#wt-svg').addEventListener('click', onPick); $('#wt-zoom').addEventListener('click', onPick);
  $('#wt-chart').addEventListener('click', e => {
    const box = $('#wt-chart').getBoundingClientRect(); const x = (e.clientX - box.left) / box.width * 1000;
    const tr = DATA.traces[WT.scheme.trace]; const tt = (x - 60) / 920 * tr.tend;
    WT.t = traceToUnits(tt); unpin(); draw();
  });
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !WT.started) { WT.started = true; wtPlay(true); } }, { threshold: 0.35 });
  io.observe($('#wt-svg'));
  selectScheme(0);
  requestAnimationFrame(tick);
}

function selectScheme(k) {
  const sc = SCHEMES[k]; WT.scheme = sc; unpin();
  $$('#wt-tabs .tab').forEach((b, j) => b.setAttribute('aria-selected', j === k));
  const svg = $('#wt-svg'); svg.replaceChildren();
  WT.R = sc.build(svg);
  const zs = $('#wt-zoom'); WT.zs = null;
  if (sc.id === 'pages') { zs.style.display = ''; WT.Z = ZOOM.build(zs); } else { zs.style.display = 'none'; WT.Z = null; }
  const tr = DATA.traces[sc.trace];
  WT.S = sc.segments(tr); WT.total = WT.S.reduce((a, s) => a + s.dur, 0); WT.t = 0;
  buildBands(); buildChart(tr); draw();
}

function locate(t) {
  let acc = 0;
  for (let i = 0; i < WT.S.length; i++) { const d = WT.S[i].dur; if (t < acc + d || i === WT.S.length - 1) return [i, clamp((t - acc) / d, 0, 1), acc]; acc += d; }
}
function unitsToTrace(t) { const [i, u] = locate(t); const s = WT.S[i]; return s.t0 + (s.t1 - s.t0) * u; }
function traceToUnits(tt) {
  let acc = 0;
  for (const s of WT.S) { if (tt <= s.t1 || s === WT.S[WT.S.length - 1]) return acc + s.dur * clamp((tt - s.t0) / Math.max(1e-6, s.t1 - s.t0), 0, 1); acc += s.dur; }
  return WT.total;
}

function buildBands() {
  const b = $('#wt-bands'); b.replaceChildren();
  const groups = [];
  for (const s of WT.S) {
    const k = s.kind === 'F' ? (WT.scheme.id === 'twopass' ? 'P1' : 'F') : s.kind === 'P2' ? 'P2' : s.kind === 'S' ? 'S' : s.kind === 'O' ? 'O' : s.kind === 'E' ? 'E' : 'B';
    if (groups.length && groups[groups.length - 1].k === k) groups[groups.length - 1].d += s.dur; else groups.push({ k, d: s.dur });
  }
  const names = { F: 'forward', P1: 'pass 1', P2: 'pass 2', S: 'scoring', B: 'backward', O: 'OOM', E: '' };
  for (const g of groups) {
    const d = document.createElement('div'); d.className = 'band b-' + g.k; d.style.flex = g.d; d.textContent = g.d / WT.total > 0.06 ? names[g.k] : '';
    b.append(d);
  }
}

function buildChart(tr) {
  const svg = $('#wt-chart'); svg.replaceChildren();
  const W0 = 60, W1 = 980, H0 = 18, H1 = 118, Y = g => H1 - (H1 - H0) * g / 95, X = t => W0 + (W1 - W0) * t / tr.tend;
  for (const [name, a, b] of tr.phases) {
    E('rect', { x: X(a), y: H0, width: Math.max(0, X(b) - X(a)), height: H1 - H0, fill: name === 'backward' ? '#f5f1fb' : name === 'scoring' ? '#f6f7f9' : name === 'pass 2' ? '#f3eefb' : '#f1f7f5' }, svg);
    T(svg, (X(a) + X(b)) / 2, H0 + 11, name, { 'font-size': 10.5, fill: C.muted, 'text-anchor': 'middle' });
  }
  for (const g of [0, 20, 40, 60, 80]) { E('line', { x1: W0, x2: W1, y1: Y(g), y2: Y(g), stroke: '#e8edf3' }, svg); T(svg, W0 - 6, Y(g) + 3.5, String(g), { 'font-size': 10, fill: C.muted, 'text-anchor': 'end' }); }
  T(svg, 14, 70, 'GiB', { 'font-size': 10.5, fill: C.muted });
  const lim = 80e9 / 2 ** 30;
  E('line', { x1: W0, x2: W1, y1: Y(lim), y2: Y(lim), stroke: C.red, 'stroke-dasharray': '3 3' }, svg);
  T(svg, W1 - 4, Y(lim) + 12, '80 GB', { 'font-size': 10, fill: C.red, 'text-anchor': 'end' });
  const d = 'M' + X(tr.pts[0][0]) + ',' + H1 + ' ' + tr.pts.map(p => 'L' + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ') + ' L' + X(tr.pts[tr.pts.length - 1][0]) + ',' + H1 + ' Z';
  E('path', { d, fill: 'rgba(31,95,174,.13)', stroke: C.accent, 'stroke-width': 1.4 }, svg);
  E('line', { x1: W0, x2: W1, y1: Y(tr.peak), y2: Y(tr.peak), stroke: C.ink, 'stroke-dasharray': '4 3', 'stroke-width': 0.9 }, svg);
  T(svg, W0 + 6, Y(tr.peak) + 12, `peak ${tr.peak} GiB`, { 'font-size': 10.5, fill: C.ink });
  for (const s of [0, 10, 20, 30]) if (s <= tr.tend) T(svg, X(s), H1 + 13, s + ' s', { 'font-size': 10, fill: C.muted, 'text-anchor': 'middle' });
  WT.cursor = E('line', { y1: H0, y2: H1, stroke: C.ink, 'stroke-width': 1.2 }, svg);
  WT.dot = E('circle', { r: 3.5, fill: C.accent, stroke: '#fff', 'stroke-width': 1.5 }, svg);
  WT.readout = T(svg, 0, H0 - 5, '', { 'font-size': 10.5, fill: C.ink, 'font-weight': 600 });
  WT.chartMap = { X, Y, tr };
}

function memAt(tr, tt) {
  const p = tr.pts; let lo = 0, hi = p.length - 1;
  if (tt <= p[0][0]) return p[0][1]; if (tt >= p[hi][0]) return p[hi][1];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= tt) lo = m; else hi = m; }
  const a = p[lo], b = p[hi]; return a[1] + (b[1] - a[1]) * (tt - a[0]) / (b[0] - a[0]);
}

function draw() {
  const [si, u] = locate(WT.t);
  WT.scheme.render(WT.R, WT.S, si, u);
  if (WT.Z && WT.zs) ZOOM.render(WT.Z, WT.zs);
  const r = $('#wt-range'); r.value = 1000 * WT.t / WT.total; r.style.setProperty('--p', (100 * WT.t / WT.total) + '%');
  const tt = unitsToTrace(WT.t), { X, Y, tr } = WT.chartMap, m = memAt(tr, tt);
  set(WT.cursor, { x1: X(tt), x2: X(tt) }); set(WT.dot, { cx: X(tt), cy: Y(m) });
  WT.readout.textContent = `${tt.toFixed(1)} s · ${m.toFixed(1)} GiB`;
  set(WT.readout, { x: clamp(X(tt), 140, 860), 'text-anchor': 'middle' });
  if (!WT.pinned) {
    const [ph, title, text, key] = WT.scheme.now(WT.S, si, u);
    const pe = $('#wt-phase'); pe.className = 'phase ' + (ph === 'S' ? 'S' : ph); pe.textContent = ph === 'F' ? 'Forward' : ph === 'B' ? 'Backward' : 'Scoring';
    $('#wt-title').textContent = title; $('#wt-text').textContent = text;
    const inf = WT.scheme.info[key] || WT.scheme.info.graph;
    if (WT.codeKey !== key + WT.scheme.id) { WT.codeKey = key + WT.scheme.id; showCode(inf[2], inf[3], null); }
  }
}

function unpin() { WT.pinned = false; WT.codeKey = null; WT.sel = null; }
function wtPlay(on) {
  WT.playing = on; if (on) { unpin(); if (WT.t >= WT.total - 1e-3) WT.t = 0; }
  $('#wt-play').innerHTML = on ? ICON.pause : ICON.play; $('#wt-play').setAttribute('aria-label', on ? 'Pause' : 'Play');
}
function wtJump(dir) {
  const [si] = locate(WT.t); let acc = 0; const starts = WT.S.map(s => { const a = acc; acc += s.dur; return a; });
  const target = dir > 0 ? (starts[si + 1] ?? WT.total) : (WT.t - starts[si] > 0.15 ? starts[si] : (starts[si - 1] ?? 0));
  WT.t = clamp(target + 0.001, 0, WT.total); unpin(); wtPlay(false); draw();
}
function tick(ts) {
  const dt = WT.last ? Math.min(0.1, (ts - WT.last) / 1000) : 0; WT.last = ts;
  if (WT.playing && !document.hidden) {
    WT.t += dt * WT.speed / 0.62;
    if (WT.t >= WT.total) { WT.t = WT.total; wtPlay(false); }
    draw();
  }
  requestAnimationFrame(tick);
}

/* --------------------------------------------------------------- bibtex */
function initBib() {
  $('#copy-bib').addEventListener('click', async () => {
    const txt = $('#bib').innerText;
    try { await navigator.clipboard.writeText(txt); $('#copy-bib').textContent = 'Copied'; }
    catch { const r = document.createRange(); r.selectNodeContents($('#bib')); getSelection().removeAllRanges(); getSelection().addRange(r); $('#copy-bib').textContent = 'Selected'; }
    setTimeout(() => { $('#copy-bib').textContent = 'Copy'; }, 1600);
  });
}

document.addEventListener('DOMContentLoaded', () => { initHero(); initComparison(); initWalkthrough(); initBib(); });
