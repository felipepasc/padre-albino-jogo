/* ===== Áudio sintetizado (WebAudio) — sem arquivos, 100% offline ===== */
'use strict';

const AudioMan = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let enabled = true;
  let musicTimer = null;
  let step = 0;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 1 : 0;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // nota tipo "caixinha de música": pluck triangular com decay rápido
  function pluck(freq, time, dur, gain, dest) {
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o2.type = 'sine';
    o.frequency.value = freq;
    o2.frequency.value = freq * 2.001; // brilho de oitava levemente desafinada
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g); o2.connect(g);
    g.connect(dest);
    o.start(time); o2.start(time);
    o.stop(time + dur + 0.05); o2.stop(time + dur + 0.05);
  }

  function blip(freq, dur = 0.14, gain = 0.5, type = 'triangle') {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur * 0.6);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const api = {
    resume,

    collect(type) {
      if (!ctx || !enabled) return;
      const freqs = { health: 660, education: 555, funds: 760 };
      blip(freqs[type] || 600, 0.13, 0.45);
    },

    star() {
      if (!ctx || !enabled) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => pluck(f, t + i * 0.07, 0.35, 0.4, sfxGain));
    },

    bonus() { // +1s de tempo
      if (!ctx || !enabled) return;
      blip(990, 0.1, 0.3, 'sine');
    },

    hurt() {
      if (!ctx || !enabled) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.28);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.35);
    },

    tick() {
      if (!ctx || !enabled) return;
      blip(1100, 0.05, 0.18, 'square');
    },

    click() {
      if (!ctx || !enabled) return;
      blip(420, 0.06, 0.22, 'sine');
    },

    fanfare(big = false) {
      if (!ctx || !enabled) return;
      const t = ctx.currentTime;
      const seq = big
        ? [392, 523, 659, 784, 1047, 784, 1047]
        : [523, 659, 784, 1047];
      seq.forEach((f, i) => pluck(f, t + i * 0.13, 0.55, 0.5, sfxGain));
    },

    // música ambiente: padrão pentatônico de caixinha de música
    startMusic() {
      if (!ctx || musicTimer) return;
      const scale = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      // padrão de 16 passos, esparso e suave
      const pattern = [0, -1, 2, -1, 4, -1, -1, 3, 1, -1, -1, 5, 2, -1, 0, -1];
      step = 0;
      musicTimer = setInterval(() => {
        if (!ctx || ctx.state !== 'running') return;
        const idx = pattern[step % pattern.length];
        if (idx >= 0) {
          const oct = (step % 32 >= 16) ? 0.5 : 1; // alterna oitava a cada volta
          pluck(scale[idx] * oct, ctx.currentTime + 0.02, 1.4, 0.35, musicGain);
        }
        step++;
      }, 340);
    },

    stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },

    setEnabled(on) {
      enabled = on;
      init();
      if (master) master.gain.value = on ? 1 : 0;
    },

    isEnabled() { return enabled; }
  };

  return api;
})();
