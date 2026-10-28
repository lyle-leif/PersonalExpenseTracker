const CACHE=__CACHE_VERSION__;
const FILES=__PRECACHE_FILES__;
const APP='/offline-app/index.html';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 // A failed update must not replace the working offline shell.
 try{const cache=await caches.open(CACHE);await Promise.all(FILES.map(async url=>{const request=new Request(url,{cache:'reload',credentials:'same-origin'}),response=await fetch(request);const type=response.headers.get('Content-Type')||'';if(!response.ok||response.redirected||(url.endsWith('.js')&&!/javascript/.test(type))||(url.endsWith('.css')&&!/text\/css/.test(type))||(url.endsWith('.png')&&!/image\/png/.test(type))||(url.endsWith('.woff2')&&!/font\/woff2|application\/octet-stream/.test(type))||(url.endsWith('.webmanifest')&&!/json/.test(type)))throw Error('Offline asset unavailable: '+url);if(url===APP&&!(await response.clone().text()).includes('peso-offline-shell'))throw Error('Offline shell unavailable.');await cache.put(request,response);}));await self.skipWaiting();}
 catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Keep older immutable assets for any open tab. This avoids broken old tabs
 // while an update activates; cache generations never contain financial data.
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_OFFLINE_READY')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const matches=await Promise.all(FILES.map(file=>cache.match(file,{ignoreVary:true})));event.ports[0]?.postMessage({ready:matches.every(Boolean),version:CACHE});})());});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('chatgpt')||url.pathname==='/callback')return;
 if(req.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/offline-app/index.html')){event.respondWith((async()=>{const shell=await (await caches.open(CACHE)).match(APP,{ignoreVary:true});return shell||fetch(req);})());return;}
 if(FILES.includes(url.pathname)||url.pathname.startsWith('/offline-app/'))event.respondWith((async()=>{
  const current=await (await caches.open(CACHE)).match(req,{ignoreVary:true});if(current)return current;
  // An old, already-running shell may ask for its versioned chunk.
  const previous=await caches.match(req,{ignoreVary:true});return previous||fetch(req);
 })());
});
