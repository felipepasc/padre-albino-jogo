/* PWA: registro do service worker + botao de instalar.
   Nao faz nada dentro do app Android (Capacitor ja roda offline por natureza). */
(function () {
  'use strict';

  // Capacitor serve a partir de https://localhost sem porta.
  // Um servidor local de desenvolvimento e http://localhost:PORTA, e ai queremos testar o SW.
  var inNativeApp = !!window.Capacitor ||
    (location.protocol === 'https:' && location.hostname === 'localhost');

  if ('serviceWorker' in navigator && !inNativeApp) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('[pwa] service worker nao registrado:', err);
      });
    });
  }

  /* ---------- Botao "Instalar" ---------- */

  var btn = document.getElementById('btnInstall');
  var hint = document.getElementById('installHint');
  if (!btn && !hint) return;

  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    navigator.standalone === true;
  if (standalone || inNativeApp) return;

  var deferred = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (btn) btn.hidden = false;
  });

  if (btn) {
    btn.addEventListener('click', function () {
      if (!deferred) return;
      var prompt = deferred;
      deferred = null;
      btn.hidden = true;
      prompt.prompt();
      prompt.userChoice.catch(function () {});
    });
  }

  window.addEventListener('appinstalled', function () {
    deferred = null;
    if (btn) btn.hidden = true;
    if (hint) hint.hidden = true;
  });

  // iOS nao tem beforeinstallprompt — so resta explicar o caminho manual.
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && hint) hint.hidden = false;
})();
