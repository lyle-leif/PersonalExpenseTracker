import {createSnapshot,enqueue,reconcile,resolveConflict} from './sync-core.mjs';
const DB_NAME='peso-offline-v1';
let connection;
export function openDeviceDB(){
 if(!globalThis.indexedDB)return Promise.reject(Error('This browser cannot save offline records. Use a supported browser with site storage enabled.'));
 if(!connection)connection=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore('workspaces',{keyPath:'ownerId'});r.result.createObjectStore('meta');};r.onerror=()=>{connection=null;reject(r.error);};r.onblocked=()=>{connection=null;reject(Error('Close older Peso tabs, then retry.'));};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};});
 return connection;
}
function storageError(e){return Error(e?.name==='QuotaExceededError'?'Device storage is full. This change was not saved. Export a backup and free storage before retrying.':'Could not save on this device. This change was not saved. Keep the form open and retry.');}
export async function readDevice(ownerId){const db=await openDeviceDB();return new Promise((resolve,reject)=>{const tx=db.transaction(['workspaces','meta'],'readonly');let row;const owner=ownerId?null:tx.objectStore('meta').get('activeOwner');const get=(id)=>{if(!id){row=null;return;}const r=tx.objectStore('workspaces').get(id);r.onsuccess=()=>{row=r.result||null;};};if(owner)owner.onsuccess=()=>get(owner.result);else get(ownerId);tx.oncomplete=()=>resolve(row);tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};});}
export async function mutateDevice(ownerId,mutator,activate=false){
 const db=await openDeviceDB();return new Promise((resolve,reject)=>{const tx=db.transaction(['workspaces','meta'],'readwrite'),store=tx.objectStore('workspaces');let next,error;
 const r=store.get(ownerId);r.onsuccess=()=>{try{next=mutator(r.result||null);if(next){if(next.ownerId!==ownerId)throw Error('Workspace identity mismatch.');store.put(next);if(activate)tx.objectStore('meta').put(ownerId,'activeOwner');}}catch(e){error=e?.name==='QuotaExceededError'?storageError(e):e;tx.abort();}};
 tx.oncomplete=()=>{signalChange(ownerId);resolve(next);};tx.onabort=()=>reject(error||storageError(tx.error));tx.onerror=()=>{};
 });
}
export const acceptRemote=(remote,name)=>mutateDevice(remote.ownerId,row=>row?reconcile({...row,name:name||row.name},remote):createSnapshot(remote.ownerId,name||remote.name||'My workspace',remote.data,remote.version),true);
export const saveOnDevice=(ownerId,type,value,id,baseData)=>mutateDevice(ownerId,row=>{if(!row)throw Error('Sign in online once to prepare this device.');return enqueue(row,type,value,id,baseData);});
export const mergeRemote=(ownerId,remote)=>mutateDevice(ownerId,row=>{if(!row)throw Error('Device workspace is unavailable.');return reconcile(row,remote);});
export const resolveOnDevice=(ownerId,choice)=>mutateDevice(ownerId,row=>resolveConflict(row,choice));
export async function clearDevice(discard=false){
 const db=await openDeviceDB();return new Promise((resolve,reject)=>{const tx=db.transaction(['workspaces','meta'],'readwrite'),store=tx.objectStore('workspaces');let error;const r=store.getAll();r.onsuccess=()=>{if(!discard&&r.result.some(s=>s.queue.length)){error=Error('Pending changes remain. Sync them, or explicitly discard them before signing out.');tx.abort();return;}store.clear();tx.objectStore('meta').clear();tx.objectStore('meta').put(true,'pendingSignOut');};tx.oncomplete=()=>{signalChange(null);resolve();};tx.onabort=()=>reject(error||storageError(tx.error));tx.onerror=()=>{};});
}
export async function pendingSignOut(clear=false){const db=await openDeviceDB();return new Promise((resolve,reject)=>{const tx=db.transaction('meta',clear?'readwrite':'readonly');let value;const r=tx.objectStore('meta').get('pendingSignOut');r.onsuccess=()=>{value=!!r.result;if(clear)tx.objectStore('meta').delete('pendingSignOut');};tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error);});}
export function signalChange(ownerId){try{if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('peso-device');channel.postMessage({ownerId});channel.close();}}catch{/* Notifications are best effort; the IndexedDB commit is already durable. */}}
export async function withSyncLeader(ownerId,fn,ifAvailable=true){
 // Web Locks is available on the supported current Chrome, Edge and Safari.
 // Without it, leave durable writes queued instead of risking two sync leaders.
 if(!globalThis.navigator?.locks)throw Error('Automatic sync needs a browser with Web Locks support. Your changes remain saved on this device.');
 return navigator.locks.request('peso-device-sync',{mode:'exclusive',...(ifAvailable?{ifAvailable:true}:{})},async lock=>lock?fn():null);
}
