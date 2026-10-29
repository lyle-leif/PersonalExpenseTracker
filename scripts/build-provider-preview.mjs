import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),preview=new URL('design/proposal-05/',root);
await build({entryPoints:[fileURLToPath(new URL('app/account-providers.mjs',root))],bundle:true,format:'iife',globalName:'MonixAccounts',footer:{js:'window.MonixAccounts=MonixAccounts;'},outfile:fileURLToPath(new URL('account-provider-browser.js',preview))});
for(const script of ['package-preview.mjs','check-package.mjs','audit-assets.mjs','build-review-sw.mjs'])execFileSync(process.execPath,[fileURLToPath(new URL(script,preview))],{stdio:'inherit'});
