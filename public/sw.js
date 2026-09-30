// Cache only public application assets, never journal files or Google responses.
const CACHE='monthly-shell-v3';
const ASSETS=['./','./index.html','./styles.css','./app.js','./core.js','./payroll.js','./payroll-ui.js','./storage.js','./favicon.svg','./timecard-template.csv'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('monthly-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||!ASSETS.some(a=>new URL(a,self.registration.scope).href===url.href))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request)));
});
