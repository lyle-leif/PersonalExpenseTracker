import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {migrateMotionPreferences,viewportLayout} from '../phone-preview/layout-core.mjs';

test('legacy pause migrates once while keeping unrelated and future preferences',()=>{
 const before={paused:true,theme:'dark',words:false,energy:'calm',future:{enabled:true}};
 const next=migrateMotionPreferences(before);
 assert.equal(before.paused,true);assert.equal(next.paused,false);assert.equal(next.reduced,false);assert.equal(next.motionVersion,2);assert.equal(next.theme,'dark');assert.equal(next.words,false);assert.deepEqual(next.future,before.future);
 const explicit={...next,paused:true,reduced:true};assert.deepEqual(migrateMotionPreferences(explicit),explicit);
 assert.deepEqual(migrateMotionPreferences(null),{paused:false,reduced:false,motionVersion:2});
});
test('standalone viewport uses dynamic sizing and corrects a stale oversized viewport',()=>{
 assert.equal(viewportLayout({layoutHeight:852,visualHeight:852,dynamicHeight:852}).fallback,false);
 const stale=viewportLayout({layoutHeight:852,visualHeight:852,dynamicHeight:920});assert.equal(stale.height,852);assert.equal(stale.fallback,true);
 const landscape=viewportLayout({layoutHeight:393,visualHeight:393,dynamicHeight:852});assert.equal(landscape.height,393);assert.equal(landscape.fallback,true);
});
test('keyboard sheets follow the visible viewport without retaining keyboard dimensions after close',()=>{
 const keyboard=viewportLayout({layoutHeight:852,visualHeight:470,offsetTop:28,editing:true,dynamicHeight:852});assert.equal(keyboard.keyboard,true);assert.equal(keyboard.keyboardHeight,470);assert.equal(keyboard.keyboardTop,28);assert.equal(keyboard.height,852);
 const closed=viewportLayout({layoutHeight:852,visualHeight:852,editing:false,dynamicHeight:852});assert.equal(closed.keyboard,false);assert.equal(closed.keyboardHeight,null);assert.equal(closed.fallback,false);
 const zoom=viewportLayout({layoutHeight:852,visualHeight:420,scale:2,editing:true,dynamicHeight:852});assert.equal(zoom.keyboard,false);assert.equal(zoom.height,852);
});
test('diagnostics copy only layout metadata even when elements contain private text',()=>{
 const source=readFileSync(new URL('../phone-preview/phone.js',import.meta.url),'utf8'),start=source.indexOf('function phoneLayoutDiagnostics()'),end=source.indexOf("document.addEventListener('click'",start);
 const secret='SECRET_RECORD_NAME_123456',el={textContent:secret,value:secret,getClientRects:()=>[1],getBoundingClientRect:()=>({x:0,y:0,width:393,height:852})};
 const context={phoneBuild:'test-build',phoneOfflineBuild:'test-build',phoneRegistration:{waiting:{}},phoneStandalone:()=>true,phoneProbe:{},window:{innerWidth:393,innerHeight:852,visualViewport:{width:393,height:852,offsetTop:0,offsetLeft:0,scale:1}},document:{documentElement:{clientWidth:393,clientHeight:852},querySelector:()=>el},getComputedStyle:()=>({paddingTop:'59px',paddingBottom:'34px',paddingRight:'0px',paddingLeft:'0px'})};
 vm.createContext(context);const result=vm.runInContext(source.slice(start,end)+';phoneLayoutDiagnostics()',context),json=JSON.stringify(result);
 assert.equal(result.launch,'standalone');assert.equal(result.build,'test-build');assert.equal(result.safeArea.top,59);assert.equal(result.bounds.navigation.height,852);assert(!json.includes(secret));assert(!/account|balance|pin|photo|name/i.test(json));
});
test('phone build owns layout and exposes no pause controls or duplicate character faces',()=>{
 const read=name=>readFileSync(new URL('../phone-preview/public/'+name,import.meta.url),'utf8');
 for(const name of ['app.css','mint-night.css','proposal-03.css','privacy-preview.css'])assert(!/(?:^|})\s*\.content-wrap\s*\{/.test(read(name)),name);
 const match=read('mint-night.js').match(/function pauseButton\(\)\{[^\n]*\}/);assert(match);assert.equal(vm.runInNewContext(match[0]+';pauseButton()'),'');assert(!read('mint-night.js').includes('class="greeting-tools"'));
 assert(!read('companion.js').includes('data-buddy-layer'));assert(read('index.html').includes('window.MONIX_PREVIEW_BUILD='));
});
