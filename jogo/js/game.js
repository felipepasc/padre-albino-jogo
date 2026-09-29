/* =====================================================================
   A MISSÃO DE PADRE ALBINO — Construindo Catanduva
   Jogo de coleta 2D, mobile-first, offline, pronto para Capacitor.
   ===================================================================== */
'use strict';

/* ================= Helpers ================= */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

function roundRectPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ================= Paleta ================= */
const C = {
  paper: '#f6ead8', ink: '#2b2018', blue: '#22304f',
  terracotta: '#c4502c', gold: '#e0a430', goldDeep: '#b07d1a',
  red: '#c0392b', edu: '#2e6db4', green: '#5a7d4a',
  grass: '#a9bc74', dirt: '#dcc69b', wall: '#f4ead6',
  skin: '#e9b98b', win: '#bcd6ea'
};

/* ================= Dados das fases ================= */
const PHASES = [
  {
    name: 'Hospital Padre Albino',
    need: { health: 15, education: 5, funds: 15 }, time: 90, clouds: 1,
    tip: 'Dica: comece pelos corações — saúde em primeiro lugar!',
    blurb: 'Fundado para cuidar de quem mais precisava, o hospital que leva o nome do padre tornou-se referência em saúde para toda a região.'
  },
  {
    name: 'Hospital Emílio Carlos',
    need: { health: 20, education: 5, funds: 18 }, time: 90, clouds: 1,
    tip: 'Dica: a Estrela da Caridade vale +3 de tudo. Não deixe passar!',
    blurb: 'O segundo grande hospital da obra ampliou o atendimento a Catanduva e a dezenas de cidades da região.'
  },
  {
    name: 'Faculdades · UNIFIPA',
    need: { health: 8, education: 28, funds: 18 }, time: 90, clouds: 2,
    tip: 'Dica: agora a educação manda — cace os livros azuis!',
    blurb: 'Das escolas fundadas pelo padre nasceu o Centro Universitário Padre Albino, que forma médicos, enfermeiros e professores até hoje.'
  },
  {
    name: 'Lar Monsenhor Albino',
    need: { health: 18, education: 12, funds: 18 }, time: 85, clouds: 2,
    tip: 'Dica: as tempestades estão mais bravas por aqui. Olho aberto!',
    blurb: 'Um lar para acolher os idosos com dignidade e carinho — um dos sonhos mais queridos do padre.'
  },
  {
    name: 'Museu Padre Albino',
    need: { health: 10, education: 22, funds: 14 }, time: 80, clouds: 3,
    tip: 'Última obra! Guarde essa história com capricho.',
    blurb: 'O museu guarda a memória do homem que dedicou a vida inteira a Catanduva — e cujas obras seguem vivas.'
  }
];

const NEED_ICONS = {
  health: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.8-9.8-9C.6 8.9 2.1 5 5.6 4.3 7.8 3.9 10 5 12 7.2 14 5 16.2 3.9 18.4 4.3 21.9 5 23.4 8.9 21.8 12c-2.3 4.2-9.8 9-9.8 9z" fill="#c0392b"/></svg>',
  education: '<svg viewBox="0 0 24 24"><path d="M3 5.5C5.5 4 8.5 4 11 5.8V20c-2.5-1.8-5.5-1.8-8-.3V5.5z" fill="#2e6db4"/><path d="M21 5.5C18.5 4 15.5 4 13 5.8V20c2.5-1.8 5.5-1.8 8-.3V5.5z" fill="#3f83c9"/></svg>',
  funds: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#e0a430"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#b07d1a" stroke-width="1.6"/><text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="bold" fill="#7a5510" font-family="Georgia,serif">$</text></svg>'
};

/* ================= Canvas / DOM ================= */
const canvas = $('game');
const ctx = canvas.getContext('2d');
const hud = $('hud');

const ui = {
  phaseLabel: $('phaseLabel'), phaseName: $('phaseName'), timer: $('timer'),
  vHealth: $('vHealth'), vEdu: $('vEdu'), vFunds: $('vFunds'),
  bHealth: $('bHealth'), bEdu: $('bEdu'), bFunds: $('bFunds'),
  pillHealth: $('pillHealth'), pillEdu: $('pillEdu'), pillFunds: $('pillFunds')
};

const SCREENS = {
  title: $('screenTitle'), how: $('screenHow'), phase: $('screenPhase'),
  done: $('screenDone'), pause: $('screenPause'), end: $('screenEnd')
};

/* ================= Estado ================= */
let W = 0, H = 0, dpr = 1, hudH = 96, SPEED = 260;
let state = 'title'; // title | how | intro | play | pause | celebrate | done | end
let phaseIdx = 0;
let builtMask = [false, false, false, false, false];
let score = { health: 0, education: 0, funds: 0 };
let timeLeft = 90, lastTickSec = 99;
let progressSmooth = 0;
let celebrateT = 0, celebrateNext = null;
let endIsWin = false;
let shake = 0, flash = 0, tGlobal = 0;
let sparkleAcc = 0, dustAcc = 0;
let starTimer = 10;

const player = { x: 100, y: 300, r: 17, dir: 1, bob: 0, moving: false, inv: 0 };
let resources = [];
let clouds = [];
let particles = [];
let floaters = [];
const keys = {};
const joy = { active: false, dx: 0, dy: 0 };

let siteRect = { x: 0, y: 0, w: 200, h: 130 };
let bgCanvas = null;

/* ================= Persistência ================= */
function loadBest() { return parseInt(localStorage.getItem('mpa_best') || '0', 10); }
function saveBest(n) { if (n > loadBest()) localStorage.setItem('mpa_best', String(n)); }
function loadSound() { return localStorage.getItem('mpa_sound') !== 'off'; }
function saveSound(on) { localStorage.setItem('mpa_sound', on ? 'on' : 'off'); }

/* ================= Resize / fundo ================= */
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  // tamanho CSS explícito: sem isso, em telas com dpr > 1 o canvas
  // seria exibido no tamanho físico (2-3x maior que a tela)
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  hudH = hud.offsetHeight || 96;
  SPEED = clamp(Math.min(W, H) * 0.62, 230, 340);

  const sw = clamp(W * 0.52, 160, 250);
  siteRect = {
    w: sw, h: sw * 0.62,
    x: W / 2 - sw / 2,
    y: hudH + (H - hudH) * 0.13
  };

  player.x = clamp(player.x, 20, W - 20);
  player.y = clamp(player.y, hudH + 30, H - 24);
  for (const r of resources) {
    r.x = clamp(r.x, 20, W - 20);
    r.y = clamp(r.y, hudH + 36, H - 20);
  }
  for (const cl of clouds) {
    cl.x = clamp(cl.x, -50, W + 50);
    cl.y = clamp(cl.y, hudH + 50, H - 40);
  }

  bakeBackground();
}

function bakeBackground() {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;
  const c = bgCanvas.getContext('2d');
  c.scale(dpr, dpr);

  // grama base
  c.fillStyle = C.grass;
  c.fillRect(0, 0, W, H);

  // mosqueado orgânico
  for (let i = 0; i < 260; i++) {
    c.fillStyle = Math.random() < 0.5 ? 'rgba(43,32,24,0.045)' : 'rgba(246,234,216,0.06)';
    const r = rand(3, 14);
    c.beginPath();
    c.ellipse(rand(0, W), rand(0, H), r, r * 0.6, rand(0, TAU), 0, TAU);
    c.fill();
  }

  // praça de terra sob a obra + caminho até a parte de baixo
  const s = siteRect;
  const pcx = s.x + s.w / 2, pcy = s.y + s.h * 0.7;
  c.fillStyle = C.dirt;
  c.strokeStyle = 'rgba(43,32,24,0.25)';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(pcx, pcy, s.w * 0.85, s.h * 0.95, 0, 0, TAU);
  c.fill(); c.stroke();
  // caminho
  c.save();
  c.strokeStyle = C.dirt;
  c.lineWidth = 46;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(pcx, pcy + s.h * 0.4);
  c.quadraticCurveTo(pcx + W * 0.06, (pcy + H) / 2, pcx - W * 0.04, H + 30);
  c.stroke();
  c.restore();
  // pedrinhas do caminho
  c.fillStyle = 'rgba(43,32,24,0.08)';
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const px = pcx + (W * 0.06) * Math.sin(t * 3) + rand(-16, 16);
    const py = pcy + s.h * 0.4 + t * (H - pcy - s.h * 0.4) + rand(-8, 8);
    c.beginPath();
    c.ellipse(px, py, rand(2, 4.5), rand(1.5, 3), rand(0, TAU), 0, TAU);
    c.fill();
  }

  // árvores e pés de café nas bordas
  const decorN = Math.round((W * H) / 42000);
  for (let i = 0; i < decorN; i++) {
    let x, y, tries = 0;
    do {
      const side = Math.floor(rand(0, 4));
      if (side === 0) { x = rand(14, 52); y = rand(hudH + 40, H - 30); }
      else if (side === 1) { x = rand(W - 52, W - 14); y = rand(hudH + 40, H - 30); }
      else if (side === 2) { x = rand(20, W - 20); y = rand(hudH + 26, hudH + 60); }
      else { x = rand(20, W - 20); y = rand(H - 60, H - 22); }
      tries++;
    } while (tries < 8 && x > s.x - 50 && x < s.x + s.w + 50 && y > s.y - 40 && y < s.y + s.h + 80);

    if (Math.random() < 0.55) drawTree(c, x, y);
    else drawCoffeeBush(c, x, y);
  }

  // florzinhas
  for (let i = 0; i < 16; i++) {
    const x = rand(16, W - 16), y = rand(hudH + 36, H - 24);
    if (x > s.x - 36 && x < s.x + s.w + 36 && y > s.y - 30 && y < s.y + s.h + 50) continue;
    const col = Math.random() < 0.5 ? '#e8d56b' : '#e0e6ef';
    c.fillStyle = col;
    for (let p = 0; p < 4; p++) {
      c.beginPath();
      c.arc(x + Math.cos(p / 4 * TAU) * 2.4, y + Math.sin(p / 4 * TAU) * 2.4, 1.8, 0, TAU);
      c.fill();
    }
    c.fillStyle = C.gold;
    c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill();
  }

  // vinheta
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(43,32,24,0)');
  vg.addColorStop(1, 'rgba(43,32,24,0.20)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
}

function drawTree(c, x, y) {
  c.fillStyle = 'rgba(43,32,24,0.16)';
  c.beginPath(); c.ellipse(x, y + 4, 16, 5, 0, 0, TAU); c.fill();
  c.fillStyle = '#7a5a37';
  c.fillRect(x - 2.5, y - 14, 5, 16);
  const g1 = '#5a7d4a', g2 = '#6b8f55';
  c.fillStyle = g1;
  c.beginPath(); c.arc(x, y - 26, 13, 0, TAU); c.fill();
  c.fillStyle = g2;
  c.beginPath(); c.arc(x - 9, y - 19, 9, 0, TAU); c.fill();
  c.beginPath(); c.arc(x + 9, y - 19, 9, 0, TAU); c.fill();
}

function drawCoffeeBush(c, x, y) {
  c.fillStyle = 'rgba(43,32,24,0.14)';
  c.beginPath(); c.ellipse(x, y + 3, 12, 4, 0, 0, TAU); c.fill();
  c.fillStyle = '#46603a';
  c.beginPath(); c.arc(x, y - 7, 10, 0, TAU); c.fill();
  c.fillStyle = '#b3402e';
  for (let i = 0; i < 5; i++) {
    const a = rand(0, TAU), r = rand(2, 7);
    c.beginPath(); c.arc(x + Math.cos(a) * r, y - 7 + Math.sin(a) * r, 1.7, 0, TAU); c.fill();
  }
}

/* ================= Entidades ================= */
function pickType() {
  const need = PHASES[phaseIdx].need;
  const rem = {
    health: Math.max(0, need.health - score.health),
    education: Math.max(0, need.education - score.education),
    funds: Math.max(0, need.funds - score.funds)
  };
  const tot = rem.health + rem.education + rem.funds;
  if (tot > 0 && Math.random() < 0.65) {
    let r = Math.random() * tot;
    if ((r -= rem.health) < 0) return 'health';
    if ((r -= rem.education) < 0) return 'education';
    return 'funds';
  }
  return ['health', 'education', 'funds'][Math.floor(rand(0, 3))];
}

function randomSpawnPos(minPlayerDist) {
  const m = 26;
  for (let t = 0; t < 30; t++) {
    const x = rand(m, W - m);
    const y = rand(hudH + 40, H - m);
    const s = siteRect;
    if (x > s.x - 30 && x < s.x + s.w + 30 && y > s.y - 26 && y < s.y + s.h + 30) continue;
    if (minPlayerDist && Math.hypot(x - player.x, y - player.y) < minPlayerDist) continue;
    return { x, y };
  }
  return { x: rand(m, W - m), y: rand(hudH + 40, H - m) };
}

function spawnResource() {
  const p = randomSpawnPos(60);
  resources.push({
    x: p.x, y: p.y, type: pickType(), star: false,
    r: 13, phase: rand(0, TAU), born: tGlobal, life: Infinity
  });
}

function spawnStar() {
  const p = randomSpawnPos(90);
  resources.push({
    x: p.x, y: p.y, type: null, star: true,
    r: 16, phase: rand(0, TAU), born: tGlobal, life: 9
  });
  floaters.push({ x: p.x, y: p.y - 26, txt: 'Estrela da Caridade!', color: C.goldDeep, t: 0, life: 1.6 });
}

function spawnCloud() {
  const fromLeft = Math.random() < 0.5;
  clouds.push({
    x: fromLeft ? -40 : W + 40,
    y: rand(hudH + 60, H - 60),
    tx: rand(60, W - 60), ty: rand(hudH + 60, H - 60),
    r: 24, retarget: rand(2, 4), wob: rand(0, TAU)
  });
}

/* ================= Partículas / floaters ================= */
function burst(x, y, color, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(40, opts.speed || 150);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 40),
      g: opts.g !== undefined ? opts.g : 260,
      t: 0, life: rand(0.4, opts.life || 0.8),
      color, size: rand(2, opts.size || 5),
      rect: !!opts.rect, rot: rand(0, TAU), vr: rand(-7, 7)
    });
  }
}

function confetti() {
  const s = siteRect;
  const cols = [C.gold, C.terracotta, C.blue, C.green, '#fff'];
  for (let i = 0; i < 130; i++) {
    particles.push({
      x: rand(s.x, s.x + s.w), y: rand(s.y - 20, s.y + 20),
      vx: rand(-130, 130), vy: rand(-340, -90),
      g: 380, t: 0, life: rand(1, 2.1),
      color: cols[i % cols.length], size: rand(3, 6),
      rect: true, rot: rand(0, TAU), vr: rand(-12, 12)
    });
  }
}

/* ================= Coleta ================= */
function bumpPill(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function collect(res) {
  const need = PHASES[phaseIdx].need;
  if (res.star) {
    score.health += 3; score.education += 3; score.funds += 3;
    burst(res.x, res.y, C.gold, 26, { speed: 220, size: 6, life: 1 });
    floaters.push({ x: res.x, y: res.y - 14, txt: '+3 em tudo!', color: C.goldDeep, t: 0, life: 1.2 });
    AudioMan.star();
    bumpPill(ui.pillHealth); bumpPill(ui.pillEdu); bumpPill(ui.pillFunds);
  } else {
    const colMap = { health: C.red, education: C.edu, funds: C.gold };
    if (score[res.type] >= need[res.type]) {
      timeLeft = Math.min(timeLeft + 1, 99);
      floaters.push({ x: res.x, y: res.y - 12, txt: '+1s', color: C.goldDeep, t: 0, life: 0.9 });
      AudioMan.bonus();
    } else {
      score[res.type]++;
      floaters.push({ x: res.x, y: res.y - 12, txt: '+1', color: colMap[res.type], t: 0, life: 0.8 });
      AudioMan.collect(res.type);
    }
    burst(res.x, res.y, colMap[res.type], 12, {});
    bumpPill(res.type === 'health' ? ui.pillHealth : res.type === 'education' ? ui.pillEdu : ui.pillFunds);
    spawnResource();
  }
  syncHUD();
  checkComplete();
}

function checkComplete() {
  const need = PHASES[phaseIdx].need;
  if (score.health >= need.health && score.education >= need.education && score.funds >= need.funds) {
    phaseComplete();
  }
}

/* ================= Fluxo de fases ================= */
function showScreen(name) {
  for (const k in SCREENS) SCREENS[k].classList.toggle('show', k === name);
}
function hideScreens() {
  for (const k in SCREENS) SCREENS[k].classList.remove('show');
}

function toTitle() {
  state = 'title';
  hud.classList.add('hidden');
  AudioMan.stopMusic();
  const best = loadBest();
  $('bestLine').textContent = best > 0 ? `★ Seu recorde: ${best} de 5 obras construídas` : '';
  showScreen('title');
}

function startRun() {
  builtMask = [false, false, false, false, false];
  showPhaseIntro(0);
}

function showPhaseIntro(i) {
  phaseIdx = i;
  const ph = PHASES[i];
  state = 'intro';
  score = { health: 0, education: 0, funds: 0 };
  timeLeft = ph.time;
  lastTickSec = 99;
  progressSmooth = 0;
  resources = []; clouds = []; particles = []; floaters = [];
  starTimer = rand(8, 12);
  player.x = W / 2;
  player.y = clamp(siteRect.y + siteRect.h + (H - siteRect.y - siteRect.h) * 0.55, hudH + 60, H - 60);
  player.inv = 0;
  joy.active = false;

  const fieldRes = clamp(Math.round((W * H) / 26000), 10, 16);
  for (let k = 0; k < fieldRes; k++) spawnResource();
  for (let k = 0; k < ph.clouds; k++) spawnCloud();

  $('introLabel').textContent = `OBRA ${i + 1} DE 5`;
  $('introName').textContent = ph.name;
  $('introTip').textContent = ph.tip;
  $('introNeeds').innerHTML = ['health', 'education', 'funds'].map(t =>
    `<div class="need">${NEED_ICONS[t]}<b>${ph.need[t]}</b></div>`
  ).join('');

  ui.phaseLabel.textContent = `OBRA ${i + 1}/5`;
  ui.phaseName.textContent = ph.name;
  syncHUD();
  syncTimer();
  hud.classList.remove('hidden');
  showScreen('phase');
}

function beginPlay() {
  state = 'play';
  hideScreens();
  AudioMan.resume();
  AudioMan.startMusic();
}

function phaseComplete() {
  builtMask[phaseIdx] = true;
  saveBest(builtMask.filter(Boolean).length);
  state = 'celebrate';
  celebrateT = 1.5;
  confetti();
  shake = 0.35;
  AudioMan.fanfare(phaseIdx === PHASES.length - 1);

  if (phaseIdx === PHASES.length - 1) {
    celebrateNext = () => showEnd(true);
  } else {
    celebrateNext = () => {
      const ph = PHASES[phaseIdx];
      $('doneName').textContent = ph.name;
      $('doneBlurb').textContent = ph.blurb;
      $('doneDots').innerHTML = PHASES.map((_, k) =>
        `<span class="dot${builtMask[k] ? ' on' : ''}"></span>`
      ).join('');
      state = 'done';
      showScreen('done');
    };
  }
}

function showEnd(win) {
  endIsWin = win;
  state = 'end';
  hud.classList.add('hidden');
  AudioMan.stopMusic();
  saveBest(builtMask.filter(Boolean).length);

  const card = $('endCard');
  card.classList.toggle('win', win);
  card.classList.toggle('lose', !win);
  $('endKicker').textContent = win ? '✦ ✦ ✦' : '⏱';
  $('endTitle').textContent = win ? 'Missão Cumprida!' : 'O tempo acabou…';
  $('endMsg').textContent = win
    ? 'Padre Albino ergueu todas as suas grandes obras! Monsenhor Albino dedicou a vida a Catanduva — e o seu legado segue vivo até hoje.'
    : 'A obra ficou pela metade, mas um bom construtor nunca desiste. Tente outra vez!';
  $('endRecap').innerHTML = PHASES.map((ph, k) =>
    `<div class="recap-row${builtMask[k] ? ' built' : ''}">
       <span class="recap-mark">${builtMask[k] ? '✓' : k + 1}</span>${ph.name}
     </div>`
  ).join('');
  $('btnRetry').textContent = win ? '↺  Jogar de novo' : '↺  Tentar de novo';
  showScreen('end');
}

function defeat() {
  shake = 0.4; flash = 0.5;
  AudioMan.hurt();
  showEnd(false);
}

/* ================= HUD ================= */
function syncHUD() {
  const need = PHASES[phaseIdx].need;
  const set = (vEl, bEl, pillEl, cur, max) => {
    vEl.textContent = `${Math.min(cur, max)}/${max}`;
    bEl.style.width = `${clamp(cur / max * 100, 0, 100)}%`;
    pillEl.classList.toggle('complete', cur >= max);
  };
  set(ui.vHealth, ui.bHealth, ui.pillHealth, score.health, need.health);
  set(ui.vEdu, ui.bEdu, ui.pillEdu, score.education, need.education);
  set(ui.vFunds, ui.bFunds, ui.pillFunds, score.funds, need.funds);
}

function syncTimer() {
  const s = Math.max(0, Math.ceil(timeLeft));
  ui.timer.textContent = s;
  ui.timer.classList.toggle('low', s <= 10 && state === 'play');
}

/* ================= Update ================= */
function update(dt) {
  tGlobal += dt;

  // partículas e floaters rodam em qualquer estado ativo
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) { particles.splice(i, 1); continue; }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    f.y -= 26 * dt;
    if (f.t >= f.life) floaters.splice(i, 1);
  }

  shake = Math.max(0, shake - dt * 1.4);
  flash = Math.max(0, flash - dt * 1.8);

  // progresso visual da construção
  const need = PHASES[phaseIdx].need;
  const target = (Math.min(1, score.health / need.health) +
                  Math.min(1, score.education / need.education) +
                  Math.min(1, score.funds / need.funds)) / 3;
  progressSmooth += (target - progressSmooth) * Math.min(1, dt * 4);

  if (state === 'celebrate') {
    celebrateT -= dt;
    if (celebrateT <= 0 && celebrateNext) {
      const fn = celebrateNext;
      celebrateNext = null;
      fn();
    }
    return;
  }

  if (state !== 'play') return;

  // ---- tempo
  timeLeft -= dt;
  const sec = Math.ceil(timeLeft);
  if (sec <= 10 && sec >= 0 && sec !== lastTickSec) {
    lastTickSec = sec;
    AudioMan.tick();
  }
  syncTimer();
  if (timeLeft <= 0) { defeat(); return; }

  // ---- input
  let ix = 0, iy = 0;
  if (keys.ArrowLeft || keys.a) ix -= 1;
  if (keys.ArrowRight || keys.d) ix += 1;
  if (keys.ArrowUp || keys.w) iy -= 1;
  if (keys.ArrowDown || keys.s) iy += 1;
  if (joy.active) { ix += joy.dx; iy += joy.dy; }
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }

  player.moving = len > 0.08;
  if (player.moving) {
    player.x += ix * SPEED * dt;
    player.y += iy * SPEED * dt;
    if (Math.abs(ix) > 0.12) player.dir = ix > 0 ? 1 : -1;
    player.bob += dt * 11;
    // poeira dos passos
    dustAcc += dt;
    if (dustAcc > 0.12) {
      dustAcc = 0;
      particles.push({
        x: player.x + rand(-6, 6), y: player.y + player.r - 2,
        vx: rand(-12, 12), vy: rand(-22, -6), g: 30,
        t: 0, life: 0.5, color: 'rgba(140,115,80,0.5)', size: rand(2, 3.5),
        rect: false, rot: 0, vr: 0
      });
    }
  } else {
    player.bob += dt * 2.4;
  }
  player.x = clamp(player.x, 16, W - 16);
  player.y = clamp(player.y, hudH + 28, H - 18);
  player.inv = Math.max(0, player.inv - dt);

  // colisão com o canteiro de obra
  {
    const r = siteRect;
    const cx = clamp(player.x, r.x, r.x + r.w);
    const cy = clamp(player.y, r.y, r.y + r.h);
    const dx = player.x - cx, dy = player.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < player.r * player.r) {
      if (d2 === 0) {
        player.y = r.y + r.h + player.r;
      } else {
        const d = Math.sqrt(d2);
        const push = (player.r - d) / d;
        player.x += dx * push;
        player.y += dy * push;
      }
    }
  }

  // ---- recursos
  starTimer -= dt;
  if (starTimer <= 0) {
    spawnStar();
    starTimer = rand(13, 19);
  }
  for (let i = resources.length - 1; i >= 0; i--) {
    const res = resources[i];
    if (res.star) {
      res.life -= dt;
      if (res.life <= 0) { resources.splice(i, 1); continue; }
    }
    const d = Math.hypot(player.x - res.x, player.y - res.y);
    if (d < player.r + res.r) {
      resources.splice(i, 1);
      collect(res);
      if (state !== 'play') return; // fase pode ter terminado
    }
  }

  // ---- tempestades
  for (const cl of clouds) {
    cl.retarget -= dt;
    cl.wob += dt * 3;
    if (cl.retarget <= 0) {
      cl.retarget = rand(2.2, 4.5);
      // 40% de chance de mirar perto do jogador (mais esperta nas fases finais)
      if (Math.random() < 0.25 + phaseIdx * 0.06) {
        cl.tx = clamp(player.x + rand(-60, 60), 40, W - 40);
        cl.ty = clamp(player.y + rand(-60, 60), hudH + 50, H - 40);
      } else {
        cl.tx = rand(40, W - 40);
        cl.ty = rand(hudH + 50, H - 40);
      }
    }
    const dx = cl.tx - cl.x, dy = cl.ty - cl.y;
    const d = Math.hypot(dx, dy);
    const sp = 52 + phaseIdx * 7;
    if (d > 4) {
      cl.x += dx / d * sp * dt;
      cl.y += dy / d * sp * dt;
    }
    // colisão com jogador
    if (player.inv <= 0 && Math.hypot(player.x - cl.x, player.y - cl.y) < player.r + cl.r * 0.78) {
      timeLeft = Math.max(0, timeLeft - 5);
      player.inv = 2.4;
      shake = 0.3; flash = 0.4;
      AudioMan.hurt();
      floaters.push({ x: player.x, y: player.y - 26, txt: '-5s', color: C.red, t: 0, life: 1 });
      burst(player.x, player.y, '#8a93a6', 14, {});
      // empurrão
      const kx = player.x - cl.x, ky = player.y - cl.y;
      const kd = Math.hypot(kx, ky) || 1;
      player.x = clamp(player.x + kx / kd * 56, 16, W - 16);
      player.y = clamp(player.y + ky / kd * 56, hudH + 28, H - 18);
      syncTimer();
      if (timeLeft <= 0) { defeat(); return; }
    }
  }

  // brilhos quando a obra está quase pronta
  if (progressSmooth > 0.96) {
    sparkleAcc += dt;
    if (sparkleAcc > 0.3) {
      sparkleAcc = 0;
      const s = siteRect;
      particles.push({
        x: rand(s.x, s.x + s.w), y: rand(s.y - 10, s.y + s.h * 0.4),
        vx: rand(-8, 8), vy: rand(-30, -12), g: -10,
        t: 0, life: 0.8, color: C.gold, size: rand(2, 4), rect: false, rot: 0, vr: 0
      });
    }
  }
}

/* ================= Desenho: construções ================= */
function drawWindows(c, x0, y0, cols, rows, cw, ch, gapx, gapy) {
  c.fillStyle = C.win;
  c.strokeStyle = C.ink;
  c.lineWidth = 1.4;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const wx = x0 + k * (cw + gapx), wy = y0 + r * (ch + gapy);
      c.fillRect(wx, wy, cw, ch);
      c.strokeRect(wx, wy, cw, ch);
    }
  }
}

function drawCrossBadge(c, x, y, r) {
  c.fillStyle = '#fff';
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = C.red;
  const a = r * 0.62, b = r * 0.24;
  c.fillRect(x - b / 2, y - a / 2, b, a);
  c.fillRect(x - a / 2, y - b / 2, a, b);
}

// Cada função desenha o prédio completo num retângulo local (0,0,w,h)
const BUILDINGS = [
  // 0 — Hospital Padre Albino
  (c, w, h) => {
    c.fillStyle = C.wall; c.strokeStyle = C.ink; c.lineWidth = 2.4;
    c.fillRect(0, h * 0.22, w, h * 0.78);
    c.strokeRect(0, h * 0.22, w, h * 0.78);
    // telhado
    c.fillStyle = C.terracotta;
    c.beginPath();
    c.moveTo(-w * 0.05, h * 0.24);
    c.lineTo(w * 0.12, 0);
    c.lineTo(w * 0.88, 0);
    c.lineTo(w * 1.05, h * 0.24);
    c.closePath();
    c.fill(); c.stroke();
    drawCrossBadge(c, w / 2, h * 0.42, h * 0.13);
    drawWindows(c, w * 0.10, h * 0.62, 2, 1, w * 0.14, h * 0.16, w * 0.06, 0);
    drawWindows(c, w * 0.62, h * 0.62, 2, 1, w * 0.14, h * 0.16, w * 0.06, 0);
    // porta em arco
    c.fillStyle = '#8a5a32';
    c.beginPath();
    c.moveTo(w * 0.44, h);
    c.lineTo(w * 0.44, h * 0.78);
    c.arc(w / 2, h * 0.78, w * 0.06, Math.PI, 0);
    c.lineTo(w * 0.56, h);
    c.closePath();
    c.fill(); c.stroke();
  },
  // 1 — Hospital Emílio Carlos (alas laterais)
  (c, w, h) => {
    c.strokeStyle = C.ink; c.lineWidth = 2.4;
    // alas
    c.fillStyle = '#ece0c8';
    c.fillRect(0, h * 0.38, w * 0.28, h * 0.62);
    c.strokeRect(0, h * 0.38, w * 0.28, h * 0.62);
    c.fillRect(w * 0.72, h * 0.38, w * 0.28, h * 0.62);
    c.strokeRect(w * 0.72, h * 0.38, w * 0.28, h * 0.62);
    // bloco central
    c.fillStyle = C.wall;
    c.fillRect(w * 0.26, h * 0.12, w * 0.48, h * 0.88);
    c.strokeRect(w * 0.26, h * 0.12, w * 0.48, h * 0.88);
    // faixa azul
    c.fillStyle = C.edu;
    c.fillRect(w * 0.26, h * 0.12, w * 0.48, h * 0.09);
    c.strokeRect(w * 0.26, h * 0.12, w * 0.48, h * 0.09);
    drawCrossBadge(c, w / 2, h * 0.38, h * 0.115);
    drawWindows(c, w * 0.045, h * 0.5, 1, 2, w * 0.19, h * 0.13, 0, h * 0.08);
    drawWindows(c, w * 0.765, h * 0.5, 1, 2, w * 0.19, h * 0.13, 0, h * 0.08);
    // porta
    c.fillStyle = '#8a5a32';
    c.fillRect(w * 0.43, h * 0.74, w * 0.14, h * 0.26);
    c.strokeRect(w * 0.43, h * 0.74, w * 0.14, h * 0.26);
  },
  // 2 — UNIFIPA (frontão e colunas)
  (c, w, h) => {
    c.strokeStyle = C.ink; c.lineWidth = 2.4;
    // parede de fundo
    c.fillStyle = '#efe2c8';
    c.fillRect(w * 0.06, h * 0.3, w * 0.88, h * 0.6);
    c.strokeRect(w * 0.06, h * 0.3, w * 0.88, h * 0.6);
    // escadaria
    c.fillStyle = '#d9c8a8';
    c.fillRect(0, h * 0.9, w, h * 0.1);
    c.strokeRect(0, h * 0.9, w, h * 0.1);
    c.fillRect(w * 0.04, h * 0.82, w * 0.92, h * 0.08);
    c.strokeRect(w * 0.04, h * 0.82, w * 0.92, h * 0.08);
    // colunas
    c.fillStyle = '#f8f0de';
    for (let i = 0; i < 4; i++) {
      const cxk = w * (0.16 + i * 0.226);
      c.fillRect(cxk, h * 0.34, w * 0.075, h * 0.48);
      c.strokeRect(cxk, h * 0.34, w * 0.075, h * 0.48);
    }
    // frontão
    c.fillStyle = C.gold;
    c.beginPath();
    c.moveTo(w * 0.02, h * 0.32);
    c.lineTo(w / 2, 0);
    c.lineTo(w * 0.98, h * 0.32);
    c.closePath();
    c.fill(); c.stroke();
    // livro no frontão
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(w / 2, h * 0.13);
    c.lineTo(w * 0.42, h * 0.10);
    c.lineTo(w * 0.42, h * 0.22);
    c.lineTo(w / 2, h * 0.25);
    c.lineTo(w * 0.58, h * 0.22);
    c.lineTo(w * 0.58, h * 0.10);
    c.closePath();
    c.fill();
    c.lineWidth = 1.6;
    c.stroke();
    c.beginPath(); c.moveTo(w / 2, h * 0.13); c.lineTo(w / 2, h * 0.25); c.stroke();
  },
  // 3 — Lar Monsenhor Albino (casa acolhedora)
  (c, w, h) => {
    c.strokeStyle = C.ink; c.lineWidth = 2.4;
    // paredes
    c.fillStyle = '#ecd9a8';
    c.fillRect(w * 0.06, h * 0.34, w * 0.88, h * 0.66);
    c.strokeRect(w * 0.06, h * 0.34, w * 0.88, h * 0.66);
    // telhado de duas águas
    c.fillStyle = C.terracotta;
    c.beginPath();
    c.moveTo(-w * 0.02, h * 0.38);
    c.lineTo(w / 2, 0);
    c.lineTo(w * 1.02, h * 0.38);
    c.closePath();
    c.fill(); c.stroke();
    // varanda
    c.fillStyle = '#c89b62';
    c.fillRect(w * 0.3, h * 0.55, w * 0.4, h * 0.06);
    c.strokeRect(w * 0.3, h * 0.55, w * 0.4, h * 0.06);
    c.fillStyle = '#a87c48';
    c.fillRect(w * 0.315, h * 0.61, w * 0.035, h * 0.39);
    c.strokeRect(w * 0.315, h * 0.61, w * 0.035, h * 0.39);
    c.fillRect(w * 0.65, h * 0.61, w * 0.035, h * 0.39);
    c.strokeRect(w * 0.65, h * 0.61, w * 0.035, h * 0.39);
    // porta
    c.fillStyle = '#8a5a32';
    c.fillRect(w * 0.43, h * 0.7, w * 0.14, h * 0.3);
    c.strokeRect(w * 0.43, h * 0.7, w * 0.14, h * 0.3);
    // janelas
    drawWindows(c, w * 0.11, h * 0.66, 1, 1, w * 0.15, h * 0.17, 0, 0);
    drawWindows(c, w * 0.74, h * 0.66, 1, 1, w * 0.15, h * 0.17, 0, 0);
    // coração sobre a porta
    c.fillStyle = C.red;
    const hx = w / 2, hy = h * 0.46, hr = h * 0.06;
    c.beginPath();
    c.moveTo(hx, hy + hr);
    c.bezierCurveTo(hx - hr * 1.6, hy - hr * 0.4, hx - hr * 0.7, hy - hr * 1.5, hx, hy - hr * 0.4);
    c.bezierCurveTo(hx + hr * 0.7, hy - hr * 1.5, hx + hr * 1.6, hy - hr * 0.4, hx, hy + hr);
    c.fill();
  },
  // 4 — Museu Padre Albino (cúpula dourada)
  (c, w, h) => {
    c.strokeStyle = C.ink; c.lineWidth = 2.4;
    // corpo
    c.fillStyle = C.wall;
    c.fillRect(w * 0.04, h * 0.46, w * 0.92, h * 0.54);
    c.strokeRect(w * 0.04, h * 0.46, w * 0.92, h * 0.54);
    // tambor da cúpula
    c.fillStyle = '#efe2c8';
    c.fillRect(w * 0.32, h * 0.34, w * 0.36, h * 0.12);
    c.strokeRect(w * 0.32, h * 0.34, w * 0.36, h * 0.12);
    // cúpula
    c.fillStyle = C.gold;
    c.beginPath();
    c.arc(w / 2, h * 0.34, w * 0.18, Math.PI, 0);
    c.closePath();
    c.fill(); c.stroke();
    // pináculo
    c.beginPath();
    c.moveTo(w / 2, h * 0.34 - w * 0.18);
    c.lineTo(w / 2, h * 0.07);
    c.stroke();
    c.fillStyle = C.gold;
    c.beginPath(); c.arc(w / 2, h * 0.07, 3, 0, TAU); c.fill(); c.stroke();
    // colunas da entrada
    c.fillStyle = '#f8f0de';
    for (let i = 0; i < 3; i++) {
      const cxk = w * (0.3 + i * 0.17);
      c.fillRect(cxk, h * 0.6, w * 0.06, h * 0.4);
      c.strokeRect(cxk, h * 0.6, w * 0.06, h * 0.4);
    }
    // friso
    c.fillStyle = C.blue;
    c.fillRect(w * 0.04, h * 0.46, w * 0.92, h * 0.07);
    c.strokeRect(w * 0.04, h * 0.46, w * 0.92, h * 0.07);
    drawWindows(c, w * 0.1, h * 0.62, 1, 1, w * 0.12, h * 0.16, 0, 0);
    drawWindows(c, w * 0.78, h * 0.62, 1, 1, w * 0.12, h * 0.16, 0, 0);
  }
];

function drawSite() {
  const s = siteRect;
  const p = clamp(progressSmooth, 0, 1);
  const done = p >= 0.999;

  ctx.save();
  ctx.translate(s.x, s.y);

  // sombra
  ctx.fillStyle = 'rgba(43,32,24,0.18)';
  ctx.beginPath();
  ctx.ellipse(s.w / 2, s.h + 5, s.w * 0.58, 9, 0, 0, TAU);
  ctx.fill();

  // gabarito (planta) quando incompleto
  if (!done) {
    ctx.save();
    ctx.strokeStyle = 'rgba(43,32,24,0.35)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(0, 0, s.w, s.h);
    ctx.restore();
  }

  // prédio revelado de baixo para cima
  if (p > 0.005) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-s.w * 0.08, s.h * (1 - p) - 1, s.w * 1.16, s.h * p + 2);
    ctx.clip();
    BUILDINGS[phaseIdx](ctx, s.w, s.h);
    ctx.restore();
  }

  // andaime sobre a parte não construída
  if (!done) {
    ctx.strokeStyle = '#8a6b43';
    ctx.lineWidth = 3;
    const top = 0, bot = s.h * (1 - p);
    ctx.beginPath();
    ctx.moveTo(-8, s.h); ctx.lineTo(-8, top - 8);
    ctx.moveTo(s.w + 8, s.h); ctx.lineTo(s.w + 8, top - 8);
    ctx.stroke();
    ctx.lineWidth = 2;
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = (s.h / steps) * i;
      if (y > bot + 4) continue;
      ctx.beginPath();
      ctx.moveTo(-8, y); ctx.lineTo(s.w + 8, y);
      ctx.stroke();
    }
    // linha do progresso (plataforma de trabalho)
    if (p > 0.01) {
      ctx.fillStyle = '#8a6b43';
      ctx.fillRect(-12, bot - 2, s.w + 24, 4);
    }
  }

  // bandeira quando pronto
  if (done) {
    const fx = s.w * 0.84, fy = -26;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, fy + 26); ctx.lineTo(fx, fy);
    ctx.stroke();
    const wave = Math.sin(tGlobal * 5) * 3;
    ctx.fillStyle = C.terracotta;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx + 12, fy + 3 + wave, fx + 24, fy + 1 + wave);
    ctx.lineTo(fx + 24, fy + 11 + wave);
    ctx.quadraticCurveTo(fx + 12, fy + 13 + wave, fx, fy + 12);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/* ================= Desenho: entidades ================= */
function drawResourceIcon(c, res) {
  const bobY = Math.sin(res.phase + tGlobal * 2.4) * 3;
  const x = res.x, y = res.y + bobY;

  // sombra
  c.fillStyle = 'rgba(43,32,24,0.16)';
  c.beginPath();
  c.ellipse(res.x, res.y + res.r + 3, res.r * 0.7, 3, 0, 0, TAU);
  c.fill();

  if (res.star) {
    // pisca antes de sumir
    if (res.life < 2.2 && Math.floor(res.life * 6) % 2 === 0) return;
    const tw = 1 + Math.sin(tGlobal * 6 + res.phase) * 0.12;
    c.save();
    c.translate(x, y);
    c.scale(tw, tw);
    c.rotate(Math.sin(tGlobal * 2 + res.phase) * 0.15);
    c.fillStyle = C.gold;
    c.strokeStyle = C.goldDeep;
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 15 : 6.5;
      const a = -Math.PI / 2 + (i / 10) * TAU;
      i === 0 ? c.moveTo(Math.cos(a) * r, Math.sin(a) * r) : c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill(); c.stroke();
    c.restore();
    return;
  }

  c.save();
  c.translate(x, y);
  if (res.type === 'health') {
    const r = 10;
    c.fillStyle = C.red;
    c.strokeStyle = C.ink;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(0, r);
    c.bezierCurveTo(-r * 1.7, -r * 0.35, -r * 0.75, -r * 1.5, 0, -r * 0.35);
    c.bezierCurveTo(r * 0.75, -r * 1.5, r * 1.7, -r * 0.35, 0, r);
    c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.arc(-3.4, -3.6, 2.1, 0, TAU); c.fill();
  } else if (res.type === 'education') {
    c.strokeStyle = C.ink;
    c.lineWidth = 1.8;
    c.fillStyle = C.edu;
    c.beginPath();
    c.moveTo(0, -7); c.quadraticCurveTo(-7, -10.5, -12, -8);
    c.lineTo(-12, 7); c.quadraticCurveTo(-7, 4.5, 0, 8);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#3f83c9';
    c.beginPath();
    c.moveTo(0, -7); c.quadraticCurveTo(7, -10.5, 12, -8);
    c.lineTo(12, 7); c.quadraticCurveTo(7, 4.5, 0, 8);
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-8.5, -3.5); c.lineTo(-3.5, -2.2); c.stroke();
    c.beginPath(); c.moveTo(3.5, -2.2); c.lineTo(8.5, -3.5); c.stroke();
  } else {
    c.fillStyle = C.gold;
    c.strokeStyle = C.ink;
    c.lineWidth = 1.8;
    c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = C.goldDeep;
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, 7.4, 0, TAU); c.stroke();
    c.fillStyle = '#7a5510';
    c.font = 'bold 11px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('$', 0, 1);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.arc(-4, -4.5, 2, 0, TAU); c.fill();
  }
  c.restore();
}

function drawCloud(c, cl) {
  const w = Math.sin(cl.wob) * 2;
  c.save();
  c.translate(cl.x, cl.y + w);
  // sombra no chão
  c.fillStyle = 'rgba(43,32,24,0.12)';
  c.beginPath();
  c.ellipse(0, 34, 24, 6, 0, 0, TAU);
  c.fill();
  // raio
  c.fillStyle = '#f4c542';
  c.strokeStyle = C.goldDeep;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-2, 10); c.lineTo(5, 10); c.lineTo(0, 21); c.lineTo(8, 21);
  c.lineTo(-4, 38); c.lineTo(0, 25); c.lineTo(-7, 25);
  c.closePath();
  c.fill(); c.stroke();
  // nuvem
  c.fillStyle = '#6e7787';
  c.strokeStyle = '#454d5c';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(-13, 2, 12, 0, TAU);
  c.arc(0, -6, 15, 0, TAU);
  c.arc(14, 2, 12, 0, TAU);
  c.arc(0, 5, 13, 0, TAU);
  c.fill();
  // carinha brava
  c.fillStyle = '#2b2f3a';
  c.beginPath(); c.arc(-6, -2, 2, 0, TAU); c.fill();
  c.beginPath(); c.arc(6, -2, 2, 0, TAU); c.fill();
  c.strokeStyle = '#2b2f3a';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-9, -7); c.lineTo(-3, -5); c.stroke();
  c.beginPath(); c.moveTo(9, -7); c.lineTo(3, -5); c.stroke();
  c.restore();
}

function drawPlayer(c) {
  const p = player;
  const hop = p.moving ? Math.abs(Math.sin(p.bob)) * 3.2 : Math.sin(p.bob) * 1.2;
  const blink = p.inv > 0 && Math.floor(p.inv * 10) % 2 === 0;

  c.save();
  c.translate(p.x, p.y - hop);
  if (blink) c.globalAlpha = 0.35;

  // sombra
  c.save();
  c.globalAlpha *= 0.9;
  c.fillStyle = 'rgba(43,32,24,0.22)';
  c.beginPath();
  c.ellipse(0, p.r + hop - 1, 13, 4.5, 0, 0, TAU);
  c.fill();
  c.restore();

  c.scale(p.dir, 1);

  // pés (alternam quando anda)
  if (p.moving) {
    const ft = Math.sin(p.bob) * 4;
    c.fillStyle = '#1c1610';
    c.beginPath(); c.ellipse(-4 + ft, p.r - 1, 3.4, 2.2, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(4 - ft, p.r - 1, 3.4, 2.2, 0, 0, TAU); c.fill();
  }

  // batina
  c.fillStyle = C.blue;
  c.strokeStyle = C.ink;
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(0, -8);
  c.bezierCurveTo(-9, -8, -11, 2, -11.5, p.r - 2);
  c.lineTo(11.5, p.r - 2);
  c.bezierCurveTo(11, 2, 9, -8, 0, -8);
  c.closePath();
  c.fill(); c.stroke();

  // colarinho
  c.fillStyle = C.paper;
  c.fillRect(-4, -9.5, 8, 4.5);

  // crucifixo
  c.strokeStyle = C.gold;
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(0, -3); c.lineTo(0, 5);
  c.moveTo(-3, 0); c.lineTo(3, 0);
  c.stroke();

  // cabeça
  c.fillStyle = C.skin;
  c.strokeStyle = C.ink;
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(0, -16, 8.5, 0, TAU); c.fill();

  // sorriso e óculos
  c.strokeStyle = '#7a4b2a';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(0.5, -13); c.quadraticCurveTo(3, -11.5, 5.5, -13); c.stroke();
  c.strokeStyle = C.ink;
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(1, -17, 2.6, 0, TAU); c.stroke();
  c.beginPath(); c.arc(7, -17, 2.6, 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(3.6, -17); c.lineTo(4.4, -17); c.stroke();
  c.fillStyle = C.ink;
  c.beginPath(); c.arc(1.3, -17, 1, 0, TAU); c.fill();
  c.beginPath(); c.arc(6.7, -17, 1, 0, TAU); c.fill();

  // chapéu saturno
  c.fillStyle = '#1c1610';
  c.beginPath();
  c.ellipse(0, -23.5, 12.5, 3, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.arc(0, -23.5, 6, Math.PI, 0);
  c.closePath();
  c.fill();

  c.restore();
}

/* ================= Desenho: frame ================= */
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  if (shake > 0) {
    ctx.translate(rand(-1, 1) * shake * 9, rand(-1, 1) * shake * 9);
  }

  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);

  drawSite();

  for (const res of resources) drawResourceIcon(ctx, res);
  drawPlayer(ctx);
  for (const cl of clouds) drawCloud(ctx, cl);

  // partículas
  for (const p of particles) {
    const a = 1 - p.t / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.rect) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // textos flutuantes
  for (const f of floaters) {
    const a = 1 - Math.max(0, (f.t / f.life) - 0.4) / 0.6;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = '900 16px Fraunces, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.paper;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // flash de dano
  if (flash > 0) {
    ctx.fillStyle = `rgba(192,57,43,${flash * 0.3})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ================= Loop ================= */
let lastT = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  joyZone.classList.toggle('on', state === 'play');
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

/* ================= Input ================= */
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
    if (state === 'play') pauseGame();
    else if (state === 'pause') resumeGame();
  }
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// joystick virtual (nipplejs): aparece onde o dedo tocar, só durante o jogo
const joyZone = $('joyZone');
const nippleMgr = nipplejs.create({
  zone: joyZone,
  mode: 'dynamic',
  size: 110,
  color: '#2b2018',
  threshold: 0.06,
  fadeTime: 150,
  maxNumberOfNipples: 1,
  dynamicPage: true
});
nippleMgr.on('start', () => {
  AudioMan.resume();
  joy.active = true;
  joy.dx = 0; joy.dy = 0;
});
nippleMgr.on('move', (evt, data) => {
  if (!data || !data.vector) return;
  joy.active = true;
  joy.dx = data.vector.x;
  joy.dy = -data.vector.y; // nipplejs usa y para cima; o canvas, para baixo
});
nippleMgr.on('end', () => {
  joy.active = false;
  joy.dx = 0; joy.dy = 0;
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

/* ================= Pausa ================= */
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause';
  joy.active = false; joy.dx = 0; joy.dy = 0;
  showScreen('pause');
}
function resumeGame() {
  if (state !== 'pause') return;
  state = 'play';
  hideScreens();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play') pauseGame();
});

/* ================= Botões ================= */
function syncSoundBtn() {
  $('btnSound').textContent = AudioMan.isEnabled() ? '🔊  Som: ligado' : '🔇  Som: desligado';
}

function wire(id, fn) {
  $(id).addEventListener('click', () => {
    AudioMan.resume();
    AudioMan.click();
    fn();
  });
}

wire('pauseBtn', pauseGame);
wire('btnPlay', startRun);
wire('btnHow', () => { state = 'how'; showScreen('how'); });
wire('btnHowBack', toTitle);
wire('btnStart', beginPlay);
wire('btnNext', () => showPhaseIntro(phaseIdx + 1));
wire('btnResume', resumeGame);
wire('btnRetryPause', () => showPhaseIntro(phaseIdx));
wire('btnQuit', toTitle);
wire('btnRetry', () => { endIsWin ? startRun() : showPhaseIntro(phaseIdx); });
wire('btnMenu', toTitle);
wire('btnSound', () => {
  AudioMan.setEnabled(!AudioMan.isEnabled());
  saveSound(AudioMan.isEnabled());
  syncSoundBtn();
});

/* ================= Init ================= */
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

AudioMan.setEnabled(loadSound());
syncSoundBtn();
resize();
toTitle();

// atalhos para testes: index.html?debug=play|intro|almost&fase=N
const _qs = new URLSearchParams(location.search);
const _dbg = _qs.get('debug');
if (_dbg) {
  const fase = clamp(parseInt(_qs.get('fase') || '1', 10) - 1, 0, 4);
  if (_dbg === 'intro') {
    builtMask = [false, false, false, false, false];
    showPhaseIntro(fase);
  } else if (_dbg === 'play' || _dbg === 'almost') {
    builtMask = [false, false, false, false, false];
    showPhaseIntro(fase);
    beginPlay();
    if (_dbg === 'almost') {
      const n = PHASES[fase].need;
      score = { health: n.health - 1, education: n.education - 1, funds: n.funds - 1 };
      syncHUD();
    }
  }
}

requestAnimationFrame(frame);
