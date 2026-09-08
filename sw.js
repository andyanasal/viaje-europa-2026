const CACHE='bio2026-shell-v4';
const SHELL=['./','./index.html','./manifest.webmanifest','./app-icon.png','./nested-recs.js'];
const EXTRA='<script src="./nested-recs.js"></script>';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function inject(r){
  const text=await r.text();
  const body=text.includes('nested-recs.js')?text:text.replace('</body>',EXTRA+'</body>');
  const headers=new Headers(r.headers);headers.delete('content-length');
  return new Response(body,{status:r.status,statusText:r.statusText,headers});
}
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(async r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return inject(r)}).catch(()=>caches.match('./index.html').then(r=>r?inject(r):caches.match('./').then(x=>x?inject(x):x))));
    return;
  }
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));return r})));
});
