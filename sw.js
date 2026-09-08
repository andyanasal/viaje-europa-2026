const CACHE='bio2026-shell-v7';
const SHELL=['./','./index.html','./manifest.webmanifest','./app-icon.png','./nested-recs.js'];
const EXTRA='<script src="./nested-recs.js"></script>';
function withFixes(text){let body=text.replace('<details><summary>Vuelos</summary><div class="inside"><div id="pendingList">','<details><summary>Pendientes</summary><div class="inside"><div id="pendingList">');if(!body.includes('nested-recs.js'))body=body.replace('</body>',EXTRA+'</body>');return body}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(async r=>{const text=await r.text();const fixed=new Response(withFixes(text),{status:r.status,statusText:r.statusText,headers:r.headers});const copy=fixed.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return fixed}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));return;
  }
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));return r})));
});
