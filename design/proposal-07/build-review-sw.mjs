import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('./', import.meta.url);
const files = ['index.html','app.html','app.css','mint-night.css','proposal-03.css','converter.css','canadian-cards.css','detailed-cards.css','privacy-preview.css','privacy-preview.js','privacy-browser.js','detailed-cards.js','canadian-cards.js','canadian-marks.js','account-provider-browser.js','studio.css','app.js','mint-night.js','proposal-03.js','converter.js','fx-browser.js','studio.js','mascot-art.js','brand-assets.js','Monix-Proposal-07-Review.html'];
async function walk(relative) { for (const entry of await readdir(new URL(relative, root), { withFileTypes: true })) { const name = relative + entry.name; if (entry.isDirectory()) await walk(name + '/'); else if (/\.(svg|png|woff2|ttf)$/.test(name)) files.push(name); } }
await walk('assets/');
const hash = createHash('sha256'); for (const name of files) hash.update(await readFile(new URL(name, root)));
const cache = 'monix-privacy-review-' + hash.digest('hex').slice(0, 12);
await writeFile(new URL('review-sw.js', root), `// Design review shell only. No financial records or API responses are cached.
const CACHE=${JSON.stringify(cache)},FILES=${JSON.stringify(files.map(name => '/' + name))};
self.addEventListener('install',event=>event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);await Promise.all(FILES.map(async path=>{const result=await fetch(path,{cache:'reload'});if(!result.ok||result.redirected)throw Error('Review asset missing');await cache.put(path,result);}));await self.skipWaiting();}catch(error){await caches.delete(CACHE);throw error;}})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('auth')||url.pathname.includes('signin'))return;const path=url.pathname==='/'?'/index.html':url.pathname;if(!FILES.includes(path))return;event.respondWith((async()=>{const cached=await (await caches.open(CACHE)).match(path);if(path.endsWith('.html')){try{const response=await fetch(event.request,{cache:'no-store'});if(response.ok&&!response.redirected)return response;}catch{}}return cached||fetch(event.request);})());});
`);
console.log('Prepared offline review shell: ' + files.length + ' local assets.');
