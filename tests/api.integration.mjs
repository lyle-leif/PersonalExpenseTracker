import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialData} from '../app/model.mjs';
// Only the disposable loopback development database is touched by this test.
const base='http://127.0.0.1:5173';
const auth=await fetch(base+'/signin-with-chatgpt?return_to=%2F',{redirect:'manual'});
assert.equal(auth.status,302);const cookie=auth.headers.get('set-cookie').split(';')[0];
const read=async(headers={cookie})=>{const r=await fetch(base+'/api/workspace',{headers});return {status:r.status,body:await r.text().then(s=>{try{return JSON.parse(s);}catch{return {error:s};}})};};
const write=async(version,command,headers={cookie,origin:base})=>{const r=await fetch(base+'/api/workspace',{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({version,command})});return {status:r.status,body:await r.text().then(s=>{try{return JSON.parse(s);}catch{return {error:s};}})};};
const anon=await read({});assert.equal(anon.status,401);
const spoof=await read({'oai-authenticated-user-id':'someone-else','oai-authenticated-user-email':'fake@example.test'});assert.equal(spoof.status,401);
let current=await read();assert.equal(current.status,200);const original=current.body.data;
try{
 let res=await write(current.body.version,{type:'restore',value:initialData(),id:randomUUID()});assert.equal(res.status,200);current=res;
 const version=current.body.version;
 const action={type:'putTransaction',id:randomUUID(),value:{type:'expense',amount:12345,date:'2026-10-28',accountId:'cash',notes:'Local integration test',allocations:[{space:'personal',categoryId:'cat0',amount:12345}]}};
 res=await write(version,action);assert.equal(res.status,200);assert.equal(res.body.data.transactions.length,1);
 const repeated=await write(version,action);assert.equal(repeated.status,200);assert.equal(repeated.body.data.transactions.length,1);assert.equal(repeated.body.version,res.body.version);
 const stale=await write(version,{...action,id:randomUUID()});assert.equal(stale.status,409);
 const crossOrigin=await write(res.body.version,{...action,id:randomUUID()},{cookie,origin:'https://unrelated.example'});assert.equal(crossOrigin.status,403);
 const unauthWrite=await write(res.body.version,{...action,id:randomUUID()},{origin:base});assert.equal(unauthWrite.status,401);
 const badSplit=await write(res.body.version,{...action,id:randomUUID(),value:{...action.value,amount:1}});assert.equal(badSplit.status,400);
 const invalidRef=await write(res.body.version,{...action,id:randomUUID(),value:{...action.value,accountId:'not-owned'}});assert.equal(invalidRef.status,400);
 // Two simultaneous saves from one revision: exactly one succeeds.
 const parallel=await Promise.all([write(res.body.version,{type:'settings',id:randomUUID(),value:{businessName:'A'}}),write(res.body.version,{type:'settings',id:randomUUID(),value:{businessName:'B'}})]);
 assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
 const final=await read();assert.equal(final.body.data.transactions.length,1);
 console.log('PASS: authentication, spoofed headers, CSRF origin, invalid references, split validation, duplicate retries, stale versions, concurrent saves, and persistence.');
}finally{const latest=await read();const restored=await write(latest.body.version,{type:'restore',value:original,id:randomUUID()});assert.equal(restored.status,200);}

