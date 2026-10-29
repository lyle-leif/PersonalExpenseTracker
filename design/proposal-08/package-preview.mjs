import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url),read=name=>readFile(new URL(name,root),'utf8');
const mime=name=>name.endsWith('.svg')?'image/svg+xml':name.endsWith('.ttf')?'font/ttf':name.endsWith('.woff2')?'font/woff2':'image/png';
const data=async name=>`data:${mime(name)};base64,${(await readFile(new URL(name,root))).toString('base64')}`;
async function cssInline(css){for(const name of [...new Set([...css.matchAll(/url\(['"]?(assets\/[\w./-]+)['"]?\)/g)].map(m=>m[1]))])css=css.replaceAll(name,await data(name));return css;}
const logoAssets={};for(const id of ['diamond','sprout','orbit'])for(const type of ['light','dark','icon'])logoAssets[id+'-'+type]=await data(`assets/logos/${id}-${type}.svg`);
let js=(await Promise.all(['mascot-art.js','brand-assets.js','app.js','mint-night.js','proposal-03.js','fx-browser.js','converter.js','account-provider-browser.js','canadian-marks.js','canadian-cards.js','detailed-cards.js','privacy-browser.js','privacy-preview.js'].map(read))).join('\n');
js=js.replace(/^const mascot=.*$/m,()=>`const mascot=(pose='idle',cls='',alt='')=>\`<img class="mascot \${cls}" data-monix-pose="\${pose}" src="data:image/svg+xml,\${encodeURIComponent(window.MONIX_ART[poses.find(p=>p[0]===pose)?.[1]||'02-idle'])}" alt="\${alt}" draggable="false">\`;`);
js=js.replace('event.source!==parent||event.origin!==location.origin','event.source!==parent');
let app=await read('app.html');for(const css of ['app.css','mint-night.css','proposal-03.css','converter.css','canadian-cards.css','detailed-cards.css','privacy-preview.css']){const style=await cssInline(await read(css));app=app.replace(`<link rel="stylesheet" href="${css}">`,()=>`<style>${style}</style>`);}
const verifiedSeed=JSON.parse(await read('verified-rate.json'));
app=app.replace('</head>',()=>`<script>window.MONIX_VERIFIED_RATE_SEED=${JSON.stringify(verifiedSeed)};</script></head>`);
app=app.replace(/\s*<script src="[^"]+" defer><\/script>/g,'').replace('assets/logos/sprout-icon.svg',logoAssets['sprout-icon']);
app=app.replace('</body>',()=>`<script>document.addEventListener('DOMContentLoaded',()=>{${js.replaceAll('</script','<\\/script')}\n});</script></body>`);
const escapeAttr=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let review=await read('index.html');review=review.replace('<link rel="stylesheet" href="studio.css">',`<style>${await cssInline(await read('studio.css'))}</style>`);
for(const [id,type] of [['light','light'],['dark','dark']]){const child=app.replace('<html lang="en">',`<html lang="en" data-review-theme="${type}" data-review-logo="sprout">`);review=review.replace(`src="app.html?theme=${type}"`,()=>`srcdoc="${escapeAttr(child)}"`);}
for(const id of ['diamond','sprout','orbit'])for(const type of ['light','dark','icon'])review=review.replaceAll(`assets/logos/${id}-${type}.svg`,logoAssets[id+'-'+type]);
const studio=await read('studio.js');review=review.replace('<script src="studio.js" defer></script>','').replace('</body>',()=>`<script>window.MONIX_LOGO_ASSETS=${JSON.stringify(logoAssets)};document.addEventListener('DOMContentLoaded',()=>{${studio.replaceAll('</script','<\\/script')}\n});</script></body>`);
await writeFile(new URL('Monix-Proposal-08-Review.html',root),review);
console.log('Saved portable Monix-Proposal-08-Review.html with embedded artwork, fonts, logos, and both interactive phone previews.');

if(!review.includes('srcdoc='))throw Error('Portable phones were not embedded.');
