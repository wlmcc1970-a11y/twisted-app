/* DigiRune Studios: keep the screen awake while the app is in use. Version 1.0.1 (2026-10-14)
   Forge App Standard item 20 (F-230). Same behaviour as Card Night, Faker Night, Stitch Scroll and Road Pins:
   - asks for the Screen Wake Lock once the person starts using the app (first tap or key press),
   - asks again whenever the app comes back to the front,
   - lets it go when the app is hidden,
   - tells a native iOS wrapper that has a "keepAwake" message handler, if there is one,
   - does nothing at all where the browser has no support (fails silently). */
(function () {
  'use strict';
  if (window.DigiRuneKeepAwake) return;
  var want = false, lock = null, pending = false;
  function supported() { return typeof navigator !== 'undefined' && 'wakeLock' in navigator; }
  function tellNative(on) {
    try {
      var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.keepAwake;
      if (h) h.postMessage(!!on);
    } catch (e) {}
  }
  function request() {
    if (!want || lock || pending || !supported() || document.visibilityState !== 'visible') return;
    pending = true;
    try {
      navigator.wakeLock.request('screen').then(function (l) {
        pending = false;
        if (!want || document.visibilityState !== 'visible') { try { l.release().catch(function () {}); } catch (e) {} return; }
        lock = l;
        try { l.addEventListener('release', function () { if (lock === l) lock = null; }); } catch (e) {}
      }, function () { pending = false; lock = null; });
    } catch (e) { pending = false; lock = null; }
  }
  function release() {
    var l = lock; lock = null;
    if (l) { try { l.release().catch(function () {}); } catch (e) {} }
  }
  function start() {
    if (want) return;
    want = true; tellNative(true); request();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') request(); else release();
  });
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (t) {
    document.addEventListener(t, start, { capture: true, passive: true, once: true });
  });
  window.DigiRuneKeepAwake = {
    version: '1.0.1',
    active: function () { return !!lock; },
    stop: function () { want = false; tellNative(false); release(); }
  };
})();
