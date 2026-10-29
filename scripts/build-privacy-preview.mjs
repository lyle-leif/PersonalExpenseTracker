import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),preview=new URL('design/proposal-07/',root);
for(const [entry,name] of [['app/account-providers.mjs','MonixAccounts'],['app/privacy-browser.mjs','MonixPrivacy']])await build({entryPoints:[fileURLToPath(new URL(entry,root))],bundle:true,format:'iife',globalName:name,footer:{js:`window.${name}=${name};`},outfile:fileURLToPath(new URL(name==='MonixAccounts'?'account-provider-browser.js':'privacy-browser.js',preview))});
for(const script of ['package-preview.mjs','check-package.mjs','audit-assets.mjs','build-review-sw.mjs'])execFileSync(process.execPath,[fileURLToPath(new URL(script,preview))],{stdio:'inherit'});
