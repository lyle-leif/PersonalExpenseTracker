import test from 'node:test';
import assert from 'node:assert/strict';
import { CardFlipController } from '../app/card-flip.mjs';

const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
test('a face changes only at the edge and repeated taps are ignored', async () => {
  const controller = new CardFlipController(), edge = deferred(), order = [];
  const pending = controller.flip({ id:'card', allowed:()=>true, exit:()=>{order.push('exit');return edge.promise;}, swap:()=>order.push('swap'), enter:async()=>order.push('enter') });
  assert.equal(await controller.flip({id:'card',allowed:()=>true,swap:()=>assert.fail('double flip')}),false);
  assert.deepEqual(order,['exit']); edge.resolve(); assert.equal(await pending,true);
  assert.deepEqual(order,['exit','swap','enter']); assert.equal(controller.isBusy('card'),false);
});
test('relocking during exit prevents financial face insertion', async () => {
  const controller=new CardFlipController(), edge=deferred();let visible=true,inserted=false;
  const pending=controller.flip({id:'card',allowed:()=>visible,exit:()=>edge.promise,swap:()=>inserted=true,enter:async()=>{}});
  visible=false;controller.cancelAll();edge.resolve();assert.equal(await pending,false);assert.equal(inserted,false);
});
test('permission is rechecked at the midpoint even without an explicit cancel', async () => {
  const controller=new CardFlipController(),edge=deferred();let visible=true;
  const pending=controller.flip({id:'card',allowed:()=>visible,exit:()=>edge.promise,swap:()=>assert.fail('expired details'),enter:async()=>{}});
  visible=false;edge.resolve();assert.equal(await pending,false);
});
test('reduced motion swaps immediately without either rotation', async () => {
  const controller=new CardFlipController();let count=0;
  assert.equal(await controller.flip({id:'card',reduced:true,allowed:()=>true,exit:()=>assert.fail('motion'),swap:()=>count++,enter:()=>assert.fail('motion')}),true);
  assert.equal(count,1);
});
test('an interrupted entrance releases busy state and allows a fresh flip', async () => {
  const controller=new CardFlipController(),entered=deferred();let count=0;
  const pending=controller.flip({id:'card',allowed:()=>true,exit:async()=>{},swap:()=>count++,enter:signal=>new Promise((resolve,reject)=>{entered.resolve();signal.addEventListener('abort',()=>reject(Error('cancel')),{once:true});})});
  await entered.promise;controller.cancelAll();assert.equal(await pending,false);assert.equal(controller.isBusy('card'),false);
  assert.equal(await controller.flip({id:'card',allowed:()=>true,reduced:true,swap:()=>count++}),true);assert.equal(count,2);
});
