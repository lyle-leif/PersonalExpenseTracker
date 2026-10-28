import {initialData,validateData,applyCommand} from './model.mjs';
import {checkPreconditions} from './sync-core.mjs';
export async function readWorkspace(db,ownerId){
 if(typeof ownerId!=='string'||!ownerId)throw Error('Authentication required.');
 const row=await db.prepare('SELECT data, version FROM workspaces WHERE owner_id = ?').bind(ownerId).first();
 if(!row)return {data:initialData(),version:-1,requests:[]};
 const stored=JSON.parse(row.data);return {data:validateData(stored.data),version:row.version,requests:stored.requests};
}
export async function writeWorkspace(db,ownerId,input){
 if(!input?.command||typeof input.command.id!=='string'||!input.command.id||input.command.id.length>100||!Number.isInteger(input.version))return {status:400,error:'Invalid action.'};
 const current=await readWorkspace(db,ownerId);
 if(input.ownerId!==undefined&&input.ownerId!==ownerId)return {status:403,error:'Sign in with the account that owns these pending changes.'};
 if(current.requests.includes(input.command.id))return {status:200,data:current.data,version:current.version,appliedIds:current.requests,ownerId};
 if(input.command.preconditions!==undefined){
  let check;try{check=checkPreconditions(current.data,input.command);}catch{return {status:400,error:'Invalid record preconditions.'};}
  if(!check.ok)return {status:409,code:'record_conflict',error:check.error,conflict:true,differences:check.differences||[],data:current.data,version:current.version,appliedIds:current.requests,ownerId};
 }else if(input.version!==current.version)return {status:409,code:'revision_conflict',error:'Your records changed on another device. Load the latest data, then retry your change.',conflict:true};
 let data;try{data=applyCommand(current.data,input.command);}catch(e){return {status:400,error:e instanceof Error?e.message:'Invalid change.'};}
 if(current.requests.length>=50000)return {status:413,error:'Workspace action limit reached. Export a backup before continuing.'};
 const stored=JSON.stringify({data,requests:[...current.requests,input.command.id]});
 if(stored.length>5000000)return {status:413,error:'Workspace size limit reached. Export a backup before continuing.'};
 const result=current.version===-1?await db.prepare('INSERT OR IGNORE INTO workspaces (owner_id,data,version) VALUES (?,?,0)').bind(ownerId,stored).run():await db.prepare('UPDATE workspaces SET data = ?, version = version + 1 WHERE owner_id = ? AND version = ?').bind(stored,ownerId,current.version).run();
 if(!result.meta.changes)return {status:409,error:'Another device saved first. Load the latest data and retry.',conflict:true};
 return {status:200,data,version:current.version+1,appliedIds:[...current.requests,input.command.id],ownerId};
}
