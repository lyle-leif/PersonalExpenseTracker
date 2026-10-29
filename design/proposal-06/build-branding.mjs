import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('./',import.meta.url);await mkdir(new URL('assets/logos/',root),{recursive:true});
const font=(await readFile(new URL('assets/fonts/outfit.ttf',root))).toString('base64');
const shapes={
 diamond:'<path d="M12 45V21q0-5 4-2l16 15 16-15q4-3 4 2v24" stroke="currentColor" stroke-width="8" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="m32 34 7 7-7 7-7-7Z" fill="#3fd6a9"/><path d="m32 37 4 4-4 4-4-4Z" fill="#b5f3de"/>',
 sprout:'<path d="M32 20c-1-9 5-14 13-13-1 7-6 11-13 13Zm-1-4c-5-6-11-7-16-4 3 6 9 8 16 4Z" fill="#3fd6a9"/><rect x="11" y="21" width="42" height="36" rx="17" fill="#f5fff9" stroke="#1f3b46" stroke-width="2.5"/><ellipse cx="24" cy="36" rx="2.5" ry="4" fill="#1f3b46"/><ellipse cx="40" cy="36" rx="2.5" ry="4" fill="#1f3b46"/><path d="M27 45q5 5 10 0" stroke="#1f3b46" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
 orbit:'<ellipse cx="32" cy="32" rx="29" ry="18" transform="rotate(-29 32 32)" stroke="#3fd6a9" stroke-width="2.5" fill="none"/><path d="M18 44V23l14 13 14-13v21" stroke="currentColor" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="54" cy="17" r="4" fill="#3fd6a9"/>'
};
for(const [id,shape] of Object.entries(shapes)){
 for(const theme of ['light','dark']){const ink=theme==='dark'?'#edf7f1':'#1f3b46';const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 76" width="600" height="152" role="img" aria-label="Monix ${id} wordmark"><defs><style>@font-face{font-family:Outfit;src:url(data:font/ttf;base64,${font}) format('truetype');font-weight:700}text{font-family:Outfit,sans-serif;font-weight:700}</style></defs><g transform="translate(0 5)" color="${ink}">${shape}</g><text x="81" y="58" font-size="58" fill="${ink}" textLength="177" lengthAdjust="spacingAndGlyphs">monix</text><path d="m242 37 5 5-5 5-5-5Z" fill="#3fd6a9"/></svg>`;await writeFile(new URL(`assets/logos/${id}-${theme}.svg`,root),svg);}
 const app=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="512" height="512" role="img" aria-label="Monix ${id} app icon"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#234d3c"/><stop offset="1" stop-color="#101f19"/></linearGradient></defs><rect width="128" height="128" rx="30" fill="url(#bg)"/><path d="M25 2h76" stroke="#77e0b0" opacity=".2"/><g transform="translate(17 17) scale(1.47)" color="#eafff4">${shape}</g></svg>`;await writeFile(new URL(`assets/logos/${id}-icon.svg`,root),app);
}
const bpi=await readFile(new URL('assets/brands/bpi-official.svg',root),'utf8');if(/<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?!#|data:image\/)/i.test(bpi))throw Error('Unexpected external/active BPI asset');
const mari=await readFile(new URL('assets/brands/maribank-official.png',root));
await writeFile(new URL('brand-assets.js',root),`window.MONIX_BPI_LOGO='data:image/svg+xml;base64,${Buffer.from(bpi).toString('base64')}';window.MONIX_MARI_LOGO='data:image/png;base64,${mari.toString('base64')}';`);
console.log('Built 3 logo concepts × light/dark wordmark and app icon. Bundled official provider marks.');
