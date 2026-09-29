// Twisted Companion — Service Worker
// Caches the app shell for offline use, plus Google Fonts and the Firebase SDK so they survive network loss.
// NETWORK-FIRST for app navigations: always fetch the latest code online, fall back to the cached
// shell only when offline. Static assets/fonts/Firebase SDK stay cache-first for speed + offline.
// Bump CACHE when deploying updates (keep it in lockstep with the on-screen version stamp).

const CACHE='twisted-v1021';   // 1.1.1 (banner framing fix 2026-09-28); bump together with APP_VERSION in index.html
const FONT_CACHE='twisted-fonts-v1';
const LIB_CACHE='twisted-libs-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon-180.png','./icons/twisted-logo.png'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==CACHE&&k!==FONT_CACHE&&k!==LIB_CACHE&&k!==ART_CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  // Only handle GET requests — ignore POST/PUT/etc.
  if(e.request.method!=='GET')return;
  if(pkArtResponse(e))return;   // Polish Kit art folder (art/): precached, cache-first

  const url=new URL(e.request.url);

  // App navigations (the HTML shell): NETWORK-FIRST so users always get the latest deployed code.
  // Cache the fresh copy for offline, and fall back to the cached shell when the network is unavailable.
  const isNav = e.request.mode==='navigate' ||
                (e.request.headers.get('accept')||'').indexOf('text/html')!==-1;
  if(isNav){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res&&res.status===200&&res.type==='basic'){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',clone));
        }
        return res;
      }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  // Google Fonts: cache-first, fall back to empty stylesheet if network fails
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONT_CACHE).then(c=>c.match(e.request).then(r=>{
      if(r)return r;
      return fetch(e.request).then(res=>{
        if(res&&res.status===200)c.put(e.request,res.clone());
        return res;
      }).catch(()=>new Response('',{status:200,headers:{'Content-Type':'text/css'}}));
    })));
    return;
  }

  // Firebase SDK (loaded on demand for optional sign-in/sync): cache-first so offline
  // launches still load the modules; network calls inside them simply fail gracefully offline.
  if(url.hostname==='www.gstatic.com'&&url.pathname.indexOf('/firebasejs/')!==-1){
    e.respondWith(caches.open(LIB_CACHE).then(c=>c.match(e.request).then(r=>{
      if(r)return r;
      return fetch(e.request).then(res=>{
        if(res&&res.status===200)c.put(e.request,res.clone());
        return res;
      });
    })));
    return;
  }

  // Everything else (icons/static same-origin assets): cache-first, refresh in background on success.
  // NOTE: a failed sub-resource must NOT fall back to the HTML shell — handing index.html back for a
  // missing script or image is worse than an honest failure. Navigations are handled above.
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res&&res.status===200&&res.type==='basic'){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return res;
    }).catch(()=>new Response('',{status:504,statusText:'Offline'})))
  );
});

/* DigiRune Polish Kit v1.0.1 - pk-sw-art.js
   The art folder rule (Will, 2026-09-26): an app may keep a small art/ folder beside its single
   HTML file. Every file in it is precached at install so the app still works fully offline.
   Paste into the app's current service worker, sw-v[N].js (never importScripts: the manifest tool writes into
   that file). Create the new sw-v[N+1].js first, then run tools/pk-art-manifest.py, which writes ART_FILES and a
   content hash for ART_VERSION into the highest-numbered sw-v[N].js it finds.

   Rules:
   - The app's own activate handler deletes every cache except app-shell-v[N] AND the current ART_CACHE
     (chassis Gate 2.4 as amended by F-190): keep both, or the art is thrown away on every deploy.
   - ART_VERSION changes whenever any art file changes, so old art is dropped cleanly.
   - Art is cache-first (instant, offline); a missing file fails honestly, never returns HTML.
   - Precache bypasses the HTTP cache (cache:'reload'), so a changed file is never stored stale.
   - Keep the folder small: WebP/AVIF only, at most 400 KB a file, heroes about 1400px wide. */

const ART_VERSION = 'art-e962e9aa9b';          // replaced by the build script
const ART_FILES = ["./art/chars/agatha.webp", "./art/chars/avatar_of_set.webp", "./art/chars/bill_psyches.webp", "./art/chars/blacksmith.webp", "./art/chars/carter.webp", "./art/chars/dodger.webp", "./art/chars/feygin.webp", "./art/chars/flower_seller.webp", "./art/chars/gamekeeper.webp", "./art/chars/gretel_and_hansel.webp", "./art/chars/guardian_dervish.webp", "./art/chars/guardian_hunter.webp", "./art/chars/hercule.webp", "./art/chars/highwaywoman.webp", "./art/chars/horace_de_havilland.webp", "./art/chars/hound_of_set.webp", "./art/chars/indigo_ford.webp", "./art/chars/lancer.webp", "./art/chars/launcelot.webp", "./art/chars/m_dusa.webp", "./art/chars/miner.webp", "./art/chars/nancy.webp", "./art/chars/nightingale.webp", "./art/chars/nouveau.webp", "./art/chars/ollyver.webp", "./art/chars/overseer_of_hounds.webp", "./art/chars/ratcatcha.webp", "./art/chars/rotten_mummy.webp", "./art/chars/sailor.webp", "./art/chars/scarab_mummy.webp", "./art/chars/shrike.webp", "./art/chars/sowerberry.webp", "./art/chars/teacher.webp", "./art/chars/tesla.webp", "./art/hero/abilities.webp", "./art/hero/alchemancy.webp", "./art/hero/campaign.webp", "./art/hero/canopic.webp", "./art/hero/characters.webp", "./art/hero/company.webp", "./art/hero/delights.webp", "./art/hero/dice.webp", "./art/hero/eye.webp", "./art/hero/features.webp", "./art/hero/home.webp", "./art/hero/lore.webp", "./art/hero/missions.webp", "./art/hero/rules.webp"];                   // e.g. ['./art/hero-rules.webp', './art/unit-sniper.webp']
const ART_CACHE = 'pk-' + ART_VERSION;

self.addEventListener('install', function(e){
  if (!ART_FILES.length) return;
  /* one file at a time, never addAll (MERCS release rule, 2026-09-28): a single missing or slow art file can never
     block this update from installing; a file that misses here is fetched and cached the first time it is shown. */
  e.waitUntil(caches.open(ART_CACHE).then(function(c){
    return Promise.allSettled(ART_FILES.map(function(u){ return c.add(new Request(u, {cache:'reload'})); }));
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf('pk-art-') === 0 && k !== ART_CACHE; })
      .map(function(k){ return caches.delete(k); }));
  }));
});

/* Call from the app's own fetch handler BEFORE its generic rule:
     if (pkArtResponse(e)) return;                                      */
function pkArtResponse(e){
  if (e.request.method !== 'GET') return false;
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin || !/\/art\//.test(u.pathname)) return false;
  e.respondWith(caches.open(ART_CACHE).then(function(c){
    return c.match(e.request, {ignoreSearch:true}).then(function(hit){
      return hit || fetch(e.request).then(function(res){
        if (res && res.status === 200) c.put(e.request, res.clone());
        return res;
      }).catch(function(){ return new Response('', {status:504, statusText:'Offline'}); });
    });
  }));
  return true;
}
