/* DigiRune Studios: "Report a problem or suggest an idea" form. Version 1.1.1 (2026-10-14)
   1.1.1: the form owns one history step (Android Back closes the form, not the panel under it) and
   Escape no longer reaches the app's own key handlers.
   Forge App Standard item 21 (F-231). Drop-in, no libraries, works in every DigiRune app and site.

   Use:
     <script src="digirune-feedback.js" defer></script>
     <a href="#" data-feedback>Report a problem or suggest an idea</a>
     <script>
       window.DIGIRUNE_FEEDBACK = {
         app: 'Road Pins', version: '0.3.0',
         endpoint: 'https://digirune-feedback.<account>.workers.dev/report',
         siteKey: '<Turnstile site key>',
         fallbackEmail: 'will@digirunestudios.com'
       };
     </script>
   Optional: platform ('ios' | 'android' | 'web'), and theme colours through CSS variables on
   :root: --fb-accent, --fb-accent-ink, --fb-bg, --fb-ink, --fb-muted, --fb-line, --fb-radius.
   If the endpoint or site key is missing, the link simply opens the email fallback (the old
   mailto stand-in), so an app can ship the link before the endpoint is live.
   Content Security Policy needs: script-src and frame-src https://challenges.cloudflare.com,
   connect-src <the endpoint origin>. */
(function () {
  'use strict';
  if (window.DigiRuneFeedback) return;

  var STYLE_ID = 'drfb-style';
  var CSS = [
    '.drfb-back{position:fixed;inset:0;z-index:2147483000;background:rgba(10,12,16,.55);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s ease}',
    '.drfb-back.on{opacity:1}',
    '.drfb{--a:var(--fb-accent,#2f6fdd);--ai:var(--fb-accent-ink,#fff);--bg:var(--fb-bg,#fff);--ink:var(--fb-ink,#1b1e24);--mu:var(--fb-muted,#5d6470);--ln:var(--fb-line,#d6dae1);--r:var(--fb-radius,14px);',
    'box-sizing:border-box;width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--bg);color:var(--ink);border-radius:var(--r) var(--r) 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));',
    'font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;transform:translateY(24px);transition:transform .22s ease;box-shadow:0 -8px 30px rgba(0,0,0,.25)}',
    '.drfb-back.on .drfb{transform:none}',
    '@media (min-width:600px){.drfb-back{align-items:center}.drfb{border-radius:var(--r)}}',
    '@media (prefers-reduced-motion:reduce){.drfb-back,.drfb{transition:none}.drfb{transform:none}}',
    '.drfb *{box-sizing:border-box}',
    '@media (prefers-color-scheme:dark){.drfb{--bg:var(--fb-bg,#1d2026);--ink:var(--fb-ink,#eef0f3);--mu:var(--fb-muted,#a8afba);--ln:var(--fb-line,#3a404a);--a:var(--fb-accent,#6e9cf0);--ai:var(--fb-accent-ink,#0d1117)}}',
    '.drfb h2{margin:0 0 4px;font-size:20px;line-height:1.25;text-wrap:balance}',
    '.drfb .sub{margin:0 0 14px;color:var(--mu);font-size:14px;text-wrap:pretty}',
    '.drfb .nw{white-space:nowrap}',
    '.drfb p{text-wrap:pretty}',
    '.drfb .lab{display:block;font-weight:600;font-size:14px;margin:12px 0 6px}',
    '.drfb .opt{font-weight:400;color:var(--mu)}',
    '.drfb .kinds{display:flex;gap:8px;flex-wrap:wrap}',
    '.drfb .kind{flex:1 1 0;min-width:96px;min-height:44px;border:1.5px solid var(--ln);background:transparent;color:var(--ink);border-radius:10px;font:inherit;font-size:15px;cursor:pointer;padding:8px 10px}',
    '.drfb .kind[aria-pressed="true"]{border-color:var(--a);background:var(--a);color:var(--ai);font-weight:600}',
    '.drfb .kind:focus-visible,.drfb button:focus-visible,.drfb textarea:focus-visible,.drfb input:focus-visible,.drfb a:focus-visible{outline:3px solid var(--a);outline-offset:2px}',
    '.drfb textarea,.drfb input[type=email]{width:100%;border:1.5px solid var(--ln);border-radius:10px;background:transparent;color:var(--ink);font:inherit;padding:10px 12px}',
    '.drfb textarea{min-height:120px;resize:vertical}',
    '.drfb .count{text-align:right;font-size:12px;color:var(--mu);margin-top:4px}',
    '.drfb .hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}',
    '.drfb .ts{margin-top:12px;min-height:0}',
    '.drfb .row{display:flex;gap:10px;margin-top:16px}',
    '.drfb .send{flex:2;min-height:48px;border:0;border-radius:10px;background:var(--a);color:var(--ai);font:inherit;font-weight:700;font-size:17px;cursor:pointer}',
    '.drfb .send[disabled]{opacity:.5;cursor:not-allowed}',
    '.drfb .cancel{flex:1;min-height:48px;border:1.5px solid var(--ln);border-radius:10px;background:transparent;color:var(--ink);font:inherit;cursor:pointer}',
    '.drfb .msg{margin:12px 0 0;font-size:14px}',
    '.drfb .msg.err{color:#b3261e}',
    '.drfb .msg a{color:var(--a)}',
    '.drfb .fine{margin:12px 0 0;font-size:12px;color:var(--mu)}',
    '.drfb .done{text-align:center;padding:10px 0}',
    '.drfb .done .big{font-size:40px;line-height:1;color:var(--a)}',
    '.drfb .done p{text-wrap:balance;margin:10px 0 18px}',
    '.drfb .done .send{width:100%;max-width:320px}'
  ].join('\n');

  function cfg() { return window.DIGIRUNE_FEEDBACK || {}; }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function deviceId() {
    var id = null;
    try { id = localStorage.getItem('drfb_device'); } catch (e) {}
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a);
      id = 'd' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      try { localStorage.setItem('drfb_device', id); } catch (e) {}
    }
    return id;
  }
  function platform() {
    var p = cfg().platform; if (p) return p;
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'web';
  }
  function mailtoHref(text) {
    var c = cfg();
    var to = c.fallbackEmail || 'will@digirunestudios.com';
    var subj = (c.app || 'DigiRune app') + ': a problem or an idea';
    var body = 'App: ' + (c.app || '') + ' ' + (c.version || '') + '\n\n' + (text || 'What happened or what would help:\n');
    return 'mailto:' + to + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
  }
  function ready() { var c = cfg(); return !!(c.endpoint && c.siteKey && c.app); }

  var tsPromise = null;
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (tsPromise) return tsPromise;
    tsPromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = function () { if (window.turnstile) res(window.turnstile); else { tsPromise = null; rej(new Error('turnstile')); } };
      s.onerror = function () { tsPromise = null; rej(new Error('turnstile')); };
      document.head.appendChild(s);
    });
    return tsPromise;
  }

  var open = null;
  var skipPop = false;
  // Android Back / browser Back: close the form only, never the app panel underneath it.
  window.addEventListener('popstate', function (e) {
    if (skipPop) { skipPop = false; e.stopImmediatePropagation(); return; }
    if (open && open.pushed) { open.pushed = false; close(); e.stopImmediatePropagation(); }
  }, true);
  function close() {
    if (!open) return;
    var o = open; open = null;
    try { if (o.widget != null && window.turnstile) window.turnstile.remove(o.widget); } catch (e) {}
    if (o.pushed) {
      o.pushed = false; skipPop = true;
      try { history.back(); } catch (e) { skipPop = false; }
      setTimeout(function () { skipPop = false; }, 700);
    }
    document.removeEventListener('keydown', o.onKey, true);
    o.back.classList.remove('on');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () { if (o.back.parentNode) o.back.parentNode.removeChild(o.back); }, reduce ? 0 : 220);
    if (o.returnTo && o.returnTo.focus) try { o.returnTo.focus(); } catch (e) {}
  }

  function show(opts) {
    opts = opts || {};
    if (!ready()) { window.location.href = mailtoHref(''); return; }
    if (open) return;
    var old = document.querySelectorAll('.drfb-back');
    for (var i = 0; i < old.length; i++) if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    var c = cfg();
    if (!document.getElementById(STYLE_ID)) document.head.appendChild(el('style', { id: STYLE_ID, text: CSS }));

    var kind = ['problem', 'idea', 'other'].indexOf(opts.kind) >= 0 ? opts.kind : 'problem';
    var kinds = [['problem', 'A problem'], ['idea', 'An idea'], ['other', 'Other']];
    var kindBtns = kinds.map(function (k) {
      var b = el('button', { type: 'button', class: 'kind', 'aria-pressed': String(k[0] === kind), 'data-k': k[0], text: k[1] });
      b.addEventListener('click', function () {
        kind = k[0];
        kindBtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-k') === kind)); });
      });
      return b;
    });
    var ta = el('textarea', { id: 'drfb-text', maxlength: '2000', placeholder: 'What happened, or what would make the app better?' });
    var count = el('div', { class: 'count', 'aria-live': 'polite', text: '0 / 2000' });
    var email = el('input', { type: 'email', id: 'drfb-email', autocomplete: 'email', inputmode: 'email', placeholder: 'you@example.com', maxlength: '120' });
    var hp = el('input', { type: 'text', name: 'drfb_hp_x9', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    var tsBox = el('div', { class: 'ts' });
    var msg = el('p', { class: 'msg', role: 'status', 'aria-live': 'polite' });
    var send = el('button', { type: 'submit', class: 'send', text: 'Send' });
    var cancel = el('button', { type: 'button', class: 'cancel', text: 'Cancel' });
    var title = el('h2', { id: 'drfb-title', text: 'Report a problem or suggest an idea' });
    var form = el('form', { novalidate: 'novalidate' }, [
      el('p', { class: 'sub' }, [document.createTextNode('Goes straight to the DigiRune Studios team. '), el('span', { class: 'nw', text: (c.app || '') + (c.version ? ' ' + c.version : '') }), document.createTextNode(' is filled in for you.')]),
      el('span', { class: 'lab', text: 'This is about' }),
      el('div', { class: 'kinds', role: 'group', 'aria-label': 'This is about' }, kindBtns),
      el('label', { class: 'lab', for: 'drfb-text', text: 'Tell us' }), ta, count,
      el('label', { class: 'lab', for: 'drfb-email' }, [document.createTextNode('Your email '), el('span', { class: 'opt', text: '(optional, only if you want a reply)' })]),
      email,
      el('div', { class: 'hp' }, [hp]),
      tsBox, msg,
      el('div', { class: 'row' }, [cancel, send]),
      el('p', { class: 'fine', text: 'We only use your email to answer this note. No account needed.' })
    ]);
    var sheet = el('div', { class: 'drfb', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'drfb-title' }, [title, form]);
    var back = el('div', { class: 'drfb-back' }, [sheet]);
    document.body.appendChild(back);
    requestAnimationFrame(function () { back.classList.add('on'); });

    var state = { back: back, widget: null, token: '', returnTo: document.activeElement, onKey: null };
    open = state;

    function setErr(text, withMail) {
      msg.className = 'msg err';
      msg.textContent = text + (withMail ? ' ' : '');
      if (withMail) {
        var a = el('a', { href: mailtoHref(ta.value), text: 'Email us instead' });
        msg.appendChild(a);
      }
    }
    function sync() {
      count.textContent = ta.value.length + ' / 2000';
      send.disabled = ta.value.trim().length < 3 || !state.token;
    }
    ta.addEventListener('input', sync);

    state.onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(sheet.querySelectorAll('button:not([disabled]),textarea,input:not([tabindex="-1"]),a[href],iframe'), function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', state.onKey, true);
    try { history.pushState(Object.assign({}, history.state || {}, { drfb: 1 }), ''); state.pushed = true; } catch (e) {}
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    cancel.addEventListener('click', close);
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
    sync();

    if (navigator.onLine === false) {
      setErr('You look offline right now. Try again when you have a signal, or', true);
    }
    // If the spam check never answers (some phone web views block it), offer email after 20 s.
    var tsTimer = setTimeout(function () {
      if (open === state && !state.token) setErr('The spam check is taking too long.', true);
    }, 20000);
    function tsFail() { state.token = ''; sync(); setErr('The spam check could not load.', true); }
    loadTurnstile().then(function (ts) {
      if (open !== state) return;
      state.widget = ts.render(tsBox, {
        sitekey: c.siteKey,
        size: 'flexible',
        appearance: 'interaction-only',
        callback: function (t) { clearTimeout(tsTimer); state.token = t; sync(); if (/spam check/.test(msg.textContent)) { msg.className = 'msg'; msg.textContent = ''; } },
        'expired-callback': function () { state.token = ''; sync(); },
        'timeout-callback': tsFail,
        'unsupported-callback': tsFail,
        'error-callback': tsFail
      });
    }).catch(function () {
      if (open === state) setErr('The spam check could not load.', true);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (send.disabled) return;
      send.disabled = true; send.textContent = 'Sending...';
      msg.className = 'msg'; msg.textContent = '';
      var payload = {
        app: c.app, version: c.version || '', platform: platform(), kind: kind,
        message: ta.value, email: email.value.trim(), device: deviceId(),
        turnstile: state.token, website: hp.value
      };
      var timer = null, ctl = window.AbortController ? new AbortController() : null;
      if (ctl) timer = setTimeout(function () { ctl.abort(); }, 15000);
      fetch(c.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d }; });
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        if (res.status === 200 && res.d.ok) {
          try { if (state.widget != null && window.turnstile) window.turnstile.remove(state.widget); } catch (x) {}
          state.widget = null;
          form.innerHTML = '';
          title.textContent = 'Thank you';
          form.appendChild(el('div', { class: 'done' }, [
            el('div', { class: 'big', 'aria-hidden': 'true', text: '✓' }),
            el('p', { text: email.value.trim() ? 'It reached us. If a reply helps, we will write back to ' + email.value.trim() + '.' : 'It reached us. Every note gets read.' }),
            (function () { var b = el('button', { type: 'button', class: 'send', text: 'Done' }); b.addEventListener('click', close); setTimeout(function () { b.focus(); }, 30); return b; })()
          ]));
          return;
        }
        var err = res.d && res.d.error;
        state.token = '';
        try { if (state.widget != null) window.turnstile.reset(state.widget); } catch (x) {}
        send.textContent = 'Send';
        if (err === 'limit') setErr('Thanks, we already have several notes from you today. Please try again tomorrow, or', true);
        else if (err === 'busy' || err === 'paused') setErr('The note box is resting right now. Please', true);
        else if (err === 'message') setErr('Please write a few words first.', false);
        else if (err === 'email') setErr('That email does not look right. Fix it or leave it empty.', false);
        else if (err === 'check') setErr('The spam check did not pass. Try once more, or', true);
        else setErr('That did not go through. Try again, or', true);
        sync();
      }).catch(function () {
        if (timer) clearTimeout(timer);
        send.textContent = 'Send';
        setErr('No connection reached us. Try again, or', true);
        sync();
      });
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-feedback]') : null;
    if (!t) return;
    e.preventDefault();
    show({ kind: t.getAttribute('data-feedback-kind') || undefined });
  });

  window.DigiRuneFeedback = { open: show, close: close, mailto: mailtoHref, version: '1.1.1' };
})();
