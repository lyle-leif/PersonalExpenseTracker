import {applyCommand,validateData,paidAmount,backup} from './model.mjs';
export function deviceBackup(snapshot){return {...backup(snapshot.data),deviceRecovery:{pendingActions:structuredClone(snapshot.queue),cloudData:structuredClone(snapshot.cloudData),cloudVersion:snapshot.cloudVersion,conflict:structuredClone(snapshot.blocked)}};}
export function canonical(v){if(v===undefined)return 'null';if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';}
export function recordValue(data,collection,key){
 if(collection==='settings')return {businessName:data.businessName};
 if(collection==='workspace')return data;
 if(collection==='billPaid'){const b=data.bills.find(b=>b.id===key);return b?paidAmount(b,data.transactions):null;}
 if(collection==='refunds')return data.transactions.filter(t=>t.type==='refund'&&t.originalId===key).sort((a,b)=>a.id.localeCompare(b.id));
 if(collection==='budgets')return data.budgets.find(b=>[b.month,b.space,b.categoryId].join('|')===key)||null;
 if(!['accounts','categories','transactions','bills'].includes(collection))throw Error('Invalid record precondition.');
 return data[collection].find(r=>r.id===key)||null;
}
const budgetKey=b=>[b.month,b.space,b.categoryId].join('|');
export function requiredRecords(data,command){
 const {type,value}=command,records=[];const add=(collection,key)=>{if(typeof key==='string'&&key&&!records.some(p=>p.collection===collection&&p.key===key))records.push({collection,key});};
 if(type==='restore')add('workspace','all');
 else if(type==='settings')add('settings','businessName');
 else if(type==='putBudget'||type==='deleteBudget'){add('budgets',budgetKey(value));if(value.previous)add('budgets',budgetKey(value.previous));add('categories',value.categoryId);}
 else if(type==='putAccount')add('accounts',value.id||command.id);
 else if(type==='putCategory')add('categories',value.id||command.id);
 else if(type==='putBill'||type==='deleteBill'){add('bills',value.id||command.id);add('billPaid',value.id||command.id);if(type==='putBill')add('categories',value.categoryId);}
 else if(type==='putTransaction'||type==='deleteTransaction'){
  const old=data.transactions.find(t=>t.id===(value.id||command.id));add('transactions',value.id||command.id);
  for(const t of [old,type==='putTransaction'?value:null].filter(Boolean)){
   add('accounts',t.accountId);add('accounts',t.toAccountId);for(const a of t.allocations||[])add('categories',a.categoryId);
   if(t.billId){add('bills',t.billId);add('billPaid',t.billId);}
   if(t.type==='refund'){add('transactions',t.originalId);add('refunds',t.originalId);const orig=data.transactions.find(o=>o.id===t.originalId);if(orig?.billId){add('bills',orig.billId);add('billPaid',orig.billId);}}
   if(t.type==='expense')add('refunds',t.id||command.id);
  }
 }else throw Error('Unknown action.');
 return records;
}
export function prepareCommand(data,type,value,id){
 const row=structuredClone(value);
 if(['putTransaction','putAccount','putCategory','putBill'].includes(type)&&!row.id)row.id=id;
 const command={type,value:row,id};
 command.preconditions=requiredRecords(data,command).map(p=>({...p,expected:structuredClone(recordValue(data,p.collection,p.key))}));
 applyCommand(data,command);return command;
}
export function checkPreconditions(data,command){
 if(!Array.isArray(command.preconditions)||command.preconditions.length>200)return {ok:false,error:'Missing record preconditions.'};
 const required=requiredRecords(data,command),seen=new Set();
 for(const p of command.preconditions){if(!p||typeof p.collection!=='string'||typeof p.key!=='string')return {ok:false,error:'Invalid record precondition.'};const k=p.collection+':'+p.key;if(seen.has(k))return {ok:false,error:'Duplicate record precondition.'};seen.add(k);}
 for(const r of required){const p=command.preconditions.find(p=>p.collection===r.collection&&p.key===r.key);if(!p)return {ok:false,error:'Missing expected value for a dependent record.'};}
 const differences=command.preconditions.filter(p=>canonical(recordValue(data,p.collection,p.key))!==canonical(p.expected)).map(p=>({collection:p.collection,key:p.key,mineBase:p.expected,cloud:recordValue(data,p.collection,p.key)}));
 return differences.length?{ok:false,error:'This change affects records that changed on another device.',differences}:{ok:true};
}
export function createSnapshot(ownerId,name,data,version){return {ownerId,name,cloudData:validateData(structuredClone(data)),cloudVersion:version,data:structuredClone(data),queue:[],revision:0,lastSync:new Date().toISOString(),blocked:null};}
export function enqueue(snapshot,type,value,id,baseData){
 if(type==='restore'&&snapshot.queue.length)throw Error('Sync or resolve pending changes before restoring a backup.');
 const s=structuredClone(snapshot),command=prepareCommand(baseData||s.data,type,value,id);s.data=applyCommand(s.data,command);s.queue.push({command,createdAt:new Date().toISOString()});s.revision++;return s;
}
// Never discard the user's optimistic view if a remote change blocks replay.
export function reconcile(snapshot,remote){
 if(remote.ownerId!==snapshot.ownerId)throw Error('Sign in with the account that owns this device workspace.');
 if(remote.version<snapshot.cloudVersion)return structuredClone(snapshot);
 const s=structuredClone(snapshot),ack=new Set(remote.appliedIds||[]);s.cloudData=validateData(structuredClone(remote.data));s.cloudVersion=remote.version;s.queue=s.queue.filter(q=>!ack.has(q.command.id));s.blocked=null;
 let view=structuredClone(s.cloudData);
 for(const q of s.queue){try{const check=checkPreconditions(view,q.command);if(!check.ok){s.blocked={id:q.command.id,error:check.error,differences:check.differences||[]};break;}view=applyCommand(view,q.command);}catch(e){s.blocked={id:q.command.id,error:e.message,differences:[]};break;}}
 if(!s.blocked)s.data=view;
 s.revision++;s.lastSync=new Date().toISOString();return s;
}
export function resolveConflict(snapshot,choice){
 const s=structuredClone(snapshot),index=s.queue.findIndex(q=>q.command.id===s.blocked?.id);if(index<0)throw Error('No change needs review.');
 let base=structuredClone(s.cloudData);for(const q of s.queue.slice(0,index))base=applyCommand(base,q.command);
 if(choice==='cloud')s.queue.splice(index,1);
 else if(choice==='mine'){const q=s.queue[index];q.command=prepareCommand(base,q.command.type,q.command.value,q.command.id);}
 else throw Error('Choose which version to keep.');
 // Rebuild the display without a discarded action, even if a dependent action
 // still needs review. Its complete value remains in the durable queue.
 let display=structuredClone(s.cloudData);for(const q of s.queue){try{display=applyCommand(display,q.command);}catch{break;}}s.data=display;
 // Rebuild local view after the decision. Further conflicts remain explicit.
 const updated=reconcile(s,{ownerId:s.ownerId,data:s.cloudData,version:s.cloudVersion,appliedIds:[]});
 return updated;
}
