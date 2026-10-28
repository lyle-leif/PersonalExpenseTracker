const CACHE='peso-shell-v2';
const SHELL=['/offline.html','/icon-192.png','/icon-512.png','/manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('chatgpt')||url.pathname==='/callback')return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')));return;}
 if(SHELL.includes(url.pathname)){event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));}
});
