// Twisted Companion — Service Worker
// Caches the app shell for offline use, plus Google Fonts and the Firebase SDK so they survive network loss.
// NETWORK-FIRST for app navigations: always fetch the latest code online, fall back to the cached
// shell only when offline. Static assets/fonts/Firebase SDK stay cache-first for speed + offline.
// Bump CACHE when deploying updates (keep it in lockstep with the on-screen version stamp).

const CACHE='twisted-v1015';
const FONT_CACHE='twisted-fonts-v1';
const LIB_CACHE='twisted-libs-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon-180.png','./icons/twisted-logo.png'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==CACHE&&k!==FONT_CACHE&&k!==LIB_CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  // Only handle GET requests — ignore POST/PUT/etc.
  if(e.request.method!=='GET')return;

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

  // Everything else (icons/static same-origin assets): cache-first, refresh in background on success
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res&&res.status===200&&res.type==='basic'){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return res;
    }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))))
  );
});
