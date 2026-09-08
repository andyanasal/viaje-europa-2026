const CACHE='bio2026-shell-v5';
const SHELL=['./','./index.html','./manifest.webmanifest','./app-icon.png','./nested-recs.js'];
const EXTRA='<script src="./nested-recs.js"></script>';

function transformHtml(text){
  let body=text
    .replace('<details><summary>Pendientes</summary>','<details><summary>Vuelos</summary>')
    .replace('<details><summary>Restricciones / recordatorios</summary>','<details><summary>Recordatorios</summary>')
    .replace('<details><summary>Recomendaciones por ciudad</summary>','<details><summary>Recomendaciones</summary>');
  if(!body.includes('nested-recs.js'))body=body.replace('</body>',EXTRA+'</body>');
  return body;
}

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function inject(r){
  const text=await r.text();
  const body=transformHtml(text);
  const headers=new Headers(r.headers);headers.delete('content-length');
  return new Response(body,{status:r.status,statusText:r.statusText,headers});
}
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(async r=>{const transformed=await inject(r);const copy=transformed.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return transformed}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));return r})));
});
