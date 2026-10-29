import test from 'node:test';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import {ACCOUNT_PROVIDERS,searchAccountProviders,withProviderAppearance,accountCardPresentation,accountTypeLabel,validateAccountAppearance} from '../app/account-providers.mjs';
import {initialData,validateData,backup,parseBackup,exportCSV,applyCommand,accountBalance,summary} from '../app/model.mjs';
import {acceptRemote,saveOnDevice,readDevice,clearDevice} from '../app/offline-db.mjs';
import {reconcile} from '../app/sync-core.mjs';
import {CARD_DESIGNS,cardDesign,designsForAccount,referenceDesign,withCardDesign} from '../app/card-designs.mjs';
test('Canadian library leads with five banks and searches aliases across regions',()=>{
 assert.deepEqual(ACCOUNT_PROVIDERS.slice(0,5).map(p=>p.id),['cibc','td','scotiabank','rbc','bmo']);
 assert.equal(new Set(ACCOUNT_PROVIDERS.map(p=>p.id)).size,ACCOUNT_PROVIDERS.length);
 assert.equal(searchAccountProviders('CA').length,14);
 assert.equal(searchAccountProviders('PH','bpi')[0].id,'bpi');
 assert.equal(searchAccountProviders('CA','Royal Bank')[0].id,'rbc');
 assert.equal(searchAccountProviders('CA','Président')[0].id,'pcfinancial');
 assert.equal(searchAccountProviders('CA','BPI').length,0);
 assert.equal(searchAccountProviders('ALL','BPI')[0].id,'bpi');
 assert.throws(()=>searchAccountProviders('US'));
});
test('Every style preserves identity, currency, debt, payment dates and all financial fields',()=>{
 const account={id:'card-id',name:'CIBC Credit',kind:'credit',opening:-84235,limit:500000,dueDay:5,closingDay:20,currency:'CAD'};
 for(const provider of ACCOUNT_PROVIDERS){const styled=withProviderAppearance(account,provider.id);const {providerId,cardStyleId,...financial}=styled;assert.deepEqual(financial,account);assert.equal(providerId,provider.id);assert.equal(cardStyleId,provider.id+'-credit');assert.equal(accountTypeLabel(styled),'Credit card');}
});
test('Bank subtype cannot turn a credit card into savings and unknown metadata stays neutral',()=>{
 assert.throws(()=>validateAccountAppearance({kind:'credit',bankSubtype:'savings'}));
 assert.throws(()=>validateAccountAppearance({kind:'bank',providerId:'<script>'}));
 assert.throws(()=>validateAccountAppearance({kind:'bank',cardStyleId:'url(bad)'}));
 assert.equal(accountCardPresentation({kind:'bank'}).styleId,'neutral');
 assert.equal(accountCardPresentation({kind:'bank',providerId:'future-bank',cardStyleId:'future-style'}).styleId,'neutral');
 assert.equal(accountTypeLabel({kind:'bank',bankSubtype:'chequing'}),'Chequing');
 assert.equal(accountTypeLabel({kind:'bank',bankSubtype:'savings'}),'Savings');
});
test('Legacy backups remain valid; optional provider metadata survives restore and account commands',()=>{
 const original=initialData();assert.deepEqual(parseBackup(JSON.stringify(backup(original))),original);
 const a={...original.accounts.find(a=>a.kind==='bank'),bankSubtype:'savings'};
 const styled=withProviderAppearance(a,'cibc');
 const changed=applyCommand(original,{id:'style-update',type:'putAccount',value:styled});
 assert.deepEqual(changed.transactions,original.transactions);
 assert.equal(changed.accounts.find(a=>a.id===styled.id).opening,styled.opening);
 assert.deepEqual(parseBackup(JSON.stringify(backup(changed))),changed);
 assert.deepEqual(validateData(structuredClone(changed)),changed);
 const second={...styled,id:'another-account',name:'CIBC Everyday'};
 assert.equal(applyCommand(changed,{id:'second-account',type:'putAccount',value:second}).accounts.filter(a=>a.providerId==='cibc').length,2);
});
test('CSV includes provider metadata without changing currency or amounts',()=>{
 const data=initialData(),a=withProviderAppearance(data.accounts[0],'td');data.accounts[0]=a;
 const row={id:'tx',date:'2026-10-29',type:'income',accountId:a.id,amount:12345,notes:'Sample',allocations:[]};
 const csv=exportCSV([row],data);
 assert.match(csv,/"Amount \(PHP\)"/);assert.match(csv,/"123.45"/);assert.match(csv,/"Account provider"/);assert.match(csv,/"td","td-balance"/);
});
test('Provider edits persist with the offline action, rebase, and acknowledge without changing balances',async()=>{
 const data=initialData();data.accounts[1].opening=99999999;
 data.transactions=[{id:'expense',date:'2026-10-29',type:'expense',amount:12345,accountId:'bank',notes:'Sample',allocations:[{space:'personal',categoryId:'cat0',amount:12345}]}];
 const ownerId='provider-test-owner';await acceptRemote({ownerId,data,version:0,appliedIds:[]},'Test');
 const changed=withProviderAppearance({...data.accounts[1],bankSubtype:'savings'},'cibc');
 await saveOnDevice(ownerId,'putAccount',changed,'appearance-action');
 const saved=await readDevice(ownerId);assert.deepEqual(saved.data.accounts[1],changed);assert.deepEqual(saved.queue[0].command.value,changed);
 assert.equal(accountBalance(saved.data.accounts[1],saved.data.transactions),accountBalance(data.accounts[1],data.transactions));
 assert.deepEqual(summary(saved.data,'2026-10'),summary(data,'2026-10'));
 const cloud=structuredClone(data);cloud.businessName='Unrelated cloud edit';const rebased=reconcile(saved,{ownerId,data:cloud,version:1,appliedIds:[]});
 assert.equal(rebased.data.accounts[1].providerId,'cibc');assert.equal(rebased.queue.length,1);
 const acknowledged=reconcile(rebased,{ownerId,data:rebased.data,version:2,appliedIds:['appearance-action']});
 assert.equal(acknowledged.queue.length,0);assert.equal(acknowledged.data.accounts[1].cardStyleId,'cibc-balance');
 assert.deepEqual(parseBackup(JSON.stringify(backup(saved.data))).accounts[1],changed);await clearDevice(ownerId);
});
test('Every provider and account role has deliberate artwork, stable IDs and labeled references',()=>{
 assert.equal(new Set(CARD_DESIGNS.map(d=>d.id)).size,CARD_DESIGNS.length);
 for(const p of ACCOUNT_PROVIDERS)for(const kind of ['bank','credit','ewallet','cash']){
  const choices=designsForAccount(p.id,kind);assert(choices.length);assert(choices.some(d=>d.referenceKind==='original'));
  for(const d of choices){assert.match(d.id,/^[a-z][a-z0-9-]{0,79}$/);assert(d.pattern&&d.background&&d.accent);assert.equal(d.reviewedAt,'2026-10-29');if(d.referenceKind==='product')assert.match(d.sourceUrl,/^https:\/\//);else assert.equal(d.sourceUrl,null);}
 }
 assert.equal(referenceDesign('amexcanada','bank').referenceKind,'original');
 assert.equal(referenceDesign('eqbank','credit').referenceKind,'original');
 assert.equal(referenceDesign('maribank','credit').referenceKind,'product');
});
test('All design selections preserve financial data and round-trip through model, backup and CSV',()=>{
 for(const d of CARD_DESIGNS){const kind=d.role==='credit'?'credit':'bank';const account={id:'bank',name:'Unchanged account',kind,opening:kind==='credit'?-58235:-98235,limit:900000,closingDay:20,dueDay:5,currency:'CAD',providerId:d.providerId};
  const styled=withCardDesign(account,d.id);const {cardStyleId,...rest}=styled;assert.deepEqual(rest,account);assert.equal(cardStyleId,d.id);
  const data=initialData();data.accounts[1]=account;const result=applyCommand(data,{id:'design-update',type:'putAccount',value:styled});
  assert.deepEqual(summary(data,'2026-10'),summary(result,'2026-10'));assert.equal(accountBalance(account,[]),accountBalance(styled,[]));
  assert.equal(parseBackup(JSON.stringify(backup(result))).accounts[1].cardStyleId,d.id);
  assert.equal(accountCardPresentation(styled).design.id,d.id);
  assert.match(exportCSV([{date:'2026-10-29',type:'transfer',accountId:'cash',toAccountId:'bank',amount:12345,notes:'',allocations:[]}],result),new RegExp(d.id));
 }
});
test('Mismatched designs are rejected; provider rereads and future safe styles are preserved',()=>{
 const a=withProviderAppearance({id:'one',kind:'credit',opening:-12345,name:'Same',currency:'CAD'},'cibc'),styled=withCardDesign(a,referenceDesign('cibc','credit').id);
 assert.deepEqual(withProviderAppearance(styled,'cibc'),styled);
 assert.throws(()=>withCardDesign(styled,referenceDesign('td','credit').id),/compatible/);
 assert.throws(()=>withCardDesign(styled,referenceDesign('cibc','bank').id),/compatible/);
 assert.throws(()=>withCardDesign(styled,'nonexistent'),/compatible/);
 const future={...a,cardStyleId:'future-safe-design'};assert.deepEqual(withProviderAppearance(future,'cibc'),future);assert.equal(accountCardPresentation(future).styleId,'neutral');
 assert.equal(cardDesign('nonexistent'),null);
});
test('Detailed style persists through offline queue, cloud acknowledgement and independent owners',async()=>{
 const ownerId='artwork-owner',data=initialData();data.accounts[1]=withProviderAppearance({...data.accounts[1],opening:345678},'bmo');
 await acceptRemote({ownerId,data,version:0,appliedIds:[]},'Test');
 const styled=withCardDesign(data.accounts[1],referenceDesign('bmo','bank').id);await saveOnDevice(ownerId,'putAccount',styled,'artwork-action');
 const s=await readDevice(ownerId);assert.equal(s.queue[0].command.value.cardStyleId,styled.cardStyleId);assert.equal(s.data.accounts[1].opening,345678);
 const done=reconcile(s,{ownerId,data:s.data,version:1,appliedIds:['artwork-action']});assert.equal(done.queue.length,0);assert.deepEqual(done.data.accounts[1],styled);
 assert.throws(()=>reconcile(s,{ownerId:'other-owner',data:s.data,version:1,appliedIds:[]}),/account/);await clearDevice(ownerId);
});
