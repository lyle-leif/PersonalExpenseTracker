import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {CARD_DESIGNS} from '../app/card-designs.mjs';
const root=new URL('../',import.meta.url),preview=new URL('design/proposal-06/',root);
await build({entryPoints:[fileURLToPath(new URL('app/account-providers.mjs',root))],bundle:true,format:'iife',globalName:'MonixAccounts',footer:{js:'window.MonixAccounts=MonixAccounts;'},outfile:fileURLToPath(new URL('account-provider-browser.js',preview))});
await writeFile(new URL('card-design-references.json',preview),JSON.stringify(CARD_DESIGNS.filter(d=>d.referenceKind==='product'),null,2)+'\n');
for(const script of ['package-preview.mjs','check-package.mjs','audit-assets.mjs','build-review-sw.mjs'])execFileSync(process.execPath,[fileURLToPath(new URL(script,preview))],{stdio:'inherit'});
