import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sources=JSON.parse(await readFile(new URL('bank-asset-sources.json',import.meta.url),'utf8'));
for(const item of Object.values(sources)){
 if(!item.file)continue;
 const bytes=await readFile(new URL(item.file,import.meta.url));
 if(item.sha256&&createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Asset hash changed: '+item.file);
 if(item.file.endsWith('.svg')&&/<script|foreignObject|\bon\w+\s*=|(?:href|src)=["']https?:|url\(\s*["']?https?:/i.test(bytes.toString()))throw Error('Active or remote SVG dependency: '+item.file);
}
console.log('Official asset hashes and passive SVG content checked. Bank marks are trademarks of their owners.');
