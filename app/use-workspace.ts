'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {initialData} from './model.mjs';
import {readDevice,acceptRemote,saveOnDevice,mergeRemote,mutateDevice,resolveOnDevice,clearDevice,withSyncLeader,pendingSignOut} from './offline-db.mjs';
type Row=Record<string,any>;
async function api(method='GET',body?:Row):Promise<Row>{
 const res=await fetch('/api/workspace',{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000),redirect:'error'});
 let result:Row;try{result=await res.json() as Row;}catch{throw Object.assign(Error('Cloud sign-in is needed. Your device records are still available.'),{auth:true});}
 if(res.status===401||res.status===403)throw Object.assign(Error(result.error||'Sign in again to sync.'),{auth:true});
 if(!res.ok)throw Object.assign(Error(result.error||'Could not sync. Your changes remain saved on this device.'),{result,status:res.status});return result;
}
export function useWorkspace(initialOwner?:string,initialName='My workspace'){
 const [snapshot,setSnapshot]=useState<Row|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[syncing,setSyncing]=useState(false),[online,setOnline]=useState(true),[authNeeded,setAuthNeeded]=useState(false),[offlineReady,setOfflineReady]=useState(false),[install,setInstall]=useState<any>(null),[lastAccount,setLastAccount]=useState('cash');
 const ownerRef=useRef(initialOwner),snapshotRef=useRef<Row|null>(null),syncRef=useRef(false),saveRef=useRef(false),alive=useRef(true);
 const show=useCallback((s:any)=>{if(!alive.current)return;snapshotRef.current=s;ownerRef.current=s?.ownerId;setSnapshot(s);},[]);
 const prepareOffline=useCallback(async()=>{
  if(!('serviceWorker'in navigator)||!('caches'in window))return;
  try{
   let registered=await navigator.serviceWorker.getRegistration('/');if(!registered)registered=await navigator.serviceWorker.register('/sw.js');else if(navigator.onLine)void registered.update().catch(()=>{});
   const reg=registered.active?registered:await Promise.race([navigator.serviceWorker.ready,new Promise<null>(resolve=>setTimeout(()=>resolve(null),6000))]);if(!reg?.active)return;
   const channel=new MessageChannel();
   const ready=await new Promise<boolean>(resolve=>{const timeout=setTimeout(()=>{channel.port1.close();resolve(false);},6000);channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data?.ready===true);};reg.active?.postMessage({type:'CHECK_OFFLINE_READY'},[channel.port2]);});
   if(alive.current)setOfflineReady(ready);
  }catch{if(alive.current)setOfflineReady(false);}
 },[]);
 const sync=useCallback(async()=>{
  const ownerId=ownerRef.current;if(!ownerId||syncRef.current||!navigator.onLine)return;
  syncRef.current=true;if(alive.current)setSyncing(true);
  try{await withSyncLeader(ownerId,async()=>{
   if(await pendingSignOut()){if(navigator.onLine)window.location.assign('/signout-with-chatgpt?return_to=%2F%3Fsigned_out%3D1');return;}
   let remote=await api();if(remote.ownerId!==ownerId){setAuthNeeded(true);throw Error('A different account is signed in. Sign in as the owner of these device records to sync.');}
   setAuthNeeded(false);let s:any=await mergeRemote(ownerId,remote);show(s);
   for(let i=0;i<500;i++){
    s=await readDevice(ownerId);if(!s||!s.queue.length||s.blocked)break;
    const command=s.queue[0].command;
    try{remote=await api('PUT',{ownerId,version:s.cloudVersion,command});s=await mergeRemote(ownerId,remote);show(s);}
    catch(e:any){
     if(e.status===409){remote=await api();s=await mergeRemote(ownerId,remote);show(s);if(s.blocked)break;continue;}
     if(e.status===400||e.status===413){s=await mutateDevice(ownerId,(current:any)=>({...current,blocked:{id:command.id,error:e.message,differences:[]},revision:current.revision+1}));show(s);break;}
     throw e;
    }
   }
  });if(alive.current){setError('');void prepareOffline();}}
  catch(e:any){if(alive.current){if(e.auth)setAuthNeeded(true);setError(e instanceof TypeError||e.name==='TimeoutError'?'Cloud unavailable. Your changes remain saved on this device.':e.message||'Could not sync. Your changes remain on this device.');}}
  finally{syncRef.current=false;if(alive.current)setSyncing(false);}
 },[show,prepareOffline]);
 useEffect(()=>{
  alive.current=true;setOnline(navigator.onLine);try{setLastAccount(localStorage.getItem('peso-last-account')||'cash');}catch{}
  let channel:BroadcastChannel|undefined;
  const boot=async()=>{
   try{
    if(await pendingSignOut()){
     if(new URLSearchParams(location.search).get('signed_out')==='1'){await pendingSignOut(true);history.replaceState(null,'','/');}
     else{if(navigator.onLine)location.assign('/signout-with-chatgpt?return_to=%2F%3Fsigned_out%3D1');setError('Device records cleared. Go online to finish signing out of the cloud session.');return;}
    }
    if(initialOwner){const local:any=await readDevice(initialOwner);if(local)show(local);}
    if(navigator.onLine){try{const remote=await api();if(initialOwner&&remote.ownerId!==initialOwner)throw Error('Workspace identity changed. Reload after signing in.');const local:any=await acceptRemote(remote,remote.name||initialName);show(local);setAuthNeeded(false);await prepareOffline();void sync();return;}catch(e:any){if(e.auth)setAuthNeeded(true);const local:any=await readDevice(initialOwner);if(local){show(local);await prepareOffline();if(!e.auth&&navigator.onLine)setError('Cloud unavailable. You can keep working on this device.');return;}throw e;}}
    const local:any=await readDevice(initialOwner);if(!local)throw Error('Go online and sign in once to prepare this device for offline use.');show(local);await prepareOffline();
   }catch(e:any){setError(e.message||'Could not open device records.');}
  };void boot();
  const refresh=async()=>{try{if(navigator.onLine){if(await pendingSignOut())location.assign('/signout-with-chatgpt?return_to=%2F%3Fsigned_out%3D1');else void sync();}}catch{setError('Device storage is unavailable. Keep your current form open and retry.');}};const connection=()=>{setOnline(navigator.onLine);void refresh();};
  const visibility=()=>{if(document.visibilityState==='visible')refresh();};
  window.addEventListener('online',connection);window.addEventListener('offline',connection);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visibility);const timer=setInterval(refresh,30000);
  if(typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel('peso-device');channel.onmessage=async e=>{const s:any=await readDevice(ownerRef.current);if(e.data.ownerId===null){show(null);setError('Device records were cleared in another tab. Sign in again.');return;}if(s&&e.data.ownerId===ownerRef.current)show(s);};}
  const prompt=(e:Event)=>{e.preventDefault();setInstall(e);};window.addEventListener('beforeinstallprompt',prompt);
  const controller=()=>void prepareOffline();navigator.serviceWorker?.addEventListener('controllerchange',controller);
  return()=>{alive.current=false;window.removeEventListener('online',connection);window.removeEventListener('offline',connection);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeinstallprompt',prompt);navigator.serviceWorker?.removeEventListener('controllerchange',controller);clearInterval(timer);channel?.close();};
 },[initialOwner,initialName,show,sync,prepareOffline]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
 const save=async(type:string,value:Row,baseData?:Row)=>{
  if(saveRef.current)return false;const ownerId=ownerRef.current;if(!ownerId){setError('Sign in online once before saving.');return false;}
  if(type==='restore'&&(!navigator.onLine||snapshotRef.current?.queue.length)){setError('Connect and sync or resolve all pending changes before restoring a backup.');return false;}
  saveRef.current=true;setBusy(true);setError('');
  try{
   if(type==='restore'){await sync();await api();if(snapshotRef.current?.queue.length)throw Error('Resolve all pending changes before restoring a backup.');}
   const s:any=await saveOnDevice(ownerId,type,value,crypto.randomUUID(),baseData);show(s);
   if(type==='putTransaction'){setLastAccount(value.accountId);try{localStorage.setItem('peso-last-account',value.accountId);}catch{}}
   setNotice('Saved on this device.');if(navigator.onLine)void sync();return true;
  }catch(e:any){setError(e.message||'This change could not be saved on this device. Please retry.');return false;}
  finally{saveRef.current=false;setBusy(false);}
 };
 const resolve=async(choice:string)=>{if(!ownerRef.current)return false;setError('');setBusy(true);try{await withSyncLeader(ownerRef.current,async()=>{if(navigator.onLine){const remote=await api();const current:any=await mergeRemote(ownerRef.current!,remote);show(current);}const s:any=await resolveOnDevice(ownerRef.current!,choice);show(s);},false);void sync();return true;}catch(e:any){setError(e.message);return false;}finally{setBusy(false);}};
 const signOut=async(discard=false)=>{setBusy(true);setError('');try{await withSyncLeader(ownerRef.current||'device',async()=>{await clearDevice(discard);show(null);},false);try{localStorage.removeItem('peso-last-account');}catch{}if(navigator.onLine)window.location.assign('/signout-with-chatgpt?return_to=%2F%3Fsigned_out%3D1');else window.location.assign('/');}catch(e:any){setError(e.message);setBusy(false);}};
 const requestPersistence=async()=>{try{const granted=await navigator.storage?.persist?.();setNotice(granted?'Persistent device storage enabled.':'Storage protection was not granted. Keep regular backups.');}catch{setNotice('Keep regular backups; storage protection is unavailable.');}};
 const pending=snapshot?.queue.length||0;
 const status=snapshot?.blocked?'Needs review':syncing?'Syncing':pending?`Waiting to sync · ${pending} ${pending===1?'change':'changes'}`:authNeeded?'Sign in to sync':snapshot?'Up to date':'Preparing device…';
 return {snapshot,data:snapshot?.data||initialData(),name:snapshot?.name||initialName,loaded:!!snapshot,error,setError,notice,setNotice,busy,online,syncing,pending,status,authNeeded,offlineReady,install,setInstall,lastAccount,lastSync:snapshot?.lastSync?new Date(snapshot.lastSync).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}):'',save,sync,resolve,signOut,requestPersistence};
}
