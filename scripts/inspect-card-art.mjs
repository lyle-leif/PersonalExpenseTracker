import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../../outputs/monix-card-references/',import.meta.url);
for(const [file,host,needle] of [['cibc-cibc-dividend-visa-credit','https://www.cibc.com','alt="Dividend Visa Card'],['rbc-rbc-cash-back-mastercard-credit','https://www.rbcroyalbank.com','rbc-cash-back-mastercard'],['bpi-bpi-rewards-card-credit','https://www.bpi.com.ph','blue'],['bmo-bmo-cashback-mastercard-credit','https://www.bmo.com','cashback']]){
 const tags=JSON.parse(await readFile(new URL(file+'.json',root),'utf8')),tag=tags.find(t=>t.toLowerCase().includes(needle.toLowerCase())&&/\bsrc="/.test(t));
 const src=tag?.match(/\bsrc="([^"]+)/)?.[1];if(!src){console.log(file,'no reference image found');continue;}
 const url=new URL(src,host),r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)continue;
 const extension=r.headers.get('content-type')?.includes('png')?'png':'jpg';const output=new URL(file+'.'+extension,root);await writeFile(output,Buffer.from(await r.arrayBuffer()));console.log(output.pathname);
}
