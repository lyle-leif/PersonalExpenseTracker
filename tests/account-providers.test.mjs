import test from 'node:test';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import {ACCOUNT_PROVIDERS,searchAccountProviders,withProviderAppearance,accountCardPresentation,accountTypeLabel,validateAccountAppearance} from '../app/account-providers.mjs';
import {initialData,validateData,backup,parseBackup,exportCSV,applyCommand,accountBalance,summary} from '../app/model.mjs';
import {acceptRemote,saveOnDevice,readDevice,clearDevice} from '../app/offline-db.mjs';
import {reconcile} from '../app/sync-core.mjs';
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
