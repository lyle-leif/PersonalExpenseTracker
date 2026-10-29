// Screen privacy only. Financial records remain in the existing owner-scoped workspace.
export const PIN_ITERATIONS=600000,UNLOCK_IDLE_MS=60000;
const encoder=new TextEncoder(),decoder=new TextDecoder();
export const toBase64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export function fromBase64url(text){if(typeof text!=='string'||text.length>16384||!/^[\w-]*$/.test(text))throw Error('Invalid verification data.');return Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
export function equalBytes(a,b){a=new Uint8Array(a);b=new Uint8Array(b);if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a[i]^b[i];return result===0;}
export function validatePin(pin){if(typeof pin!=='string'||!/^\d{6}$/.test(pin))throw Error('Use exactly six digits for your Monix PIN.');return pin;}
export async function derivePin(pin,salt,cryptoApi=globalThis.crypto){validatePin(pin);if(!cryptoApi?.subtle)throw Error('Secure PIN setup is unavailable in this browser.');const material=await cryptoApi.subtle.importKey('raw',encoder.encode(pin),'PBKDF2',false,['deriveBits']);return new Uint8Array(await cryptoApi.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromBase64url(salt),iterations:PIN_ITERATIONS},material,256));}
export async function createPinVerifier(pin,cryptoApi=globalThis.crypto){const salt=toBase64url(cryptoApi.getRandomValues(new Uint8Array(16)));return {version:1,algorithm:'PBKDF2-SHA256',iterations:PIN_ITERATIONS,salt,verifier:toBase64url(await derivePin(pin,salt,cryptoApi))};}
export function validVerifier(pin){return !!pin&&pin.version===1&&pin.algorithm==='PBKDF2-SHA256'&&pin.iterations===PIN_ITERATIONS&&fromBase64url(pin.salt).length===16&&fromBase64url(pin.verifier).length===32;}
export function pinAttempt(record,correct,now=Date.now()){
 if(record.blockedUntil>now)return {record,result:{ok:false,blockedUntil:record.blockedUntil,remaining:0}};
 const next={...record};if(correct){next.failures=0;next.groups=0;next.blockedUntil=0;return {record:next,result:{ok:true,remaining:5,blockedUntil:0}};}
 next.failures=(record.failures||0)+1;if(next.failures>=5){next.failures=0;next.groups=Math.min((record.groups||0)+1,5);next.blockedUntil=now+Math.min(300000,30000*2**(next.groups-1));}
 return {record:next,result:{ok:false,remaining:next.blockedUntil>now?0:5-next.failures,blockedUntil:next.blockedUntil||0}};
}
export function balanceVisible(account,unlocked=false){return account.balanceLocked!==true||unlocked;}
export function canRevealTotal(accounts,unlocked=false){return accounts.every(a=>balanceVisible(a,unlocked));}
export function publicAccountView(account,unlocked=false){if(balanceVisible(account,unlocked))return structuredClone(account);const {opening,limit,closingDay,dueDay,...safe}=account;return {...safe,balanceHidden:true};}
export function assertBalanceAccess(accounts,unlocked=false){if(!canRevealTotal(accounts,unlocked))throw Error('Unlock protected balances before continuing.');}
export class PrivacySession{
 constructor({ownerId,now=Date.now,visible=()=>true,onChange=()=>{}}){this.ownerId=ownerId;this.now=now;this.visible=visible;this.onChange=onChange;this.epoch=0;this.until=0;this.timer=null;}
 isUnlocked(){return !!this.ownerId&&this.visible()&&this.until>this.now();}
 begin(){return {ownerId:this.ownerId,epoch:this.epoch};}
 grant(ticket){if(!ticket||ticket.ownerId!==this.ownerId||ticket.epoch!==this.epoch||!this.visible())return false;this.until=this.now()+UNLOCK_IDLE_MS;this.schedule();this.onChange();return true;}
 touch(){if(this.isUnlocked()){this.until=this.now()+UNLOCK_IDLE_MS;this.schedule();}}
 schedule(){clearTimeout(this.timer);if(this.until)this.timer=setTimeout(()=>this.lock(),Math.max(1,this.until-this.now()+1));this.timer?.unref?.();}
 lock(){clearTimeout(this.timer);this.timer=null;this.until=0;this.epoch++;this.onChange();}
 switchOwner(ownerId){this.lock();this.ownerId=ownerId;}
 destroy(){clearTimeout(this.timer);this.until=0;this.epoch++;}
}
function derSignature(raw){const bytes=new Uint8Array(raw);if(bytes.length<8||bytes[0]!==0x30||bytes[1]!==bytes.length-2)throw Error('Invalid device signature.');let position=2;const output=new Uint8Array(64);for(let i=0;i<2;i++){if(bytes[position++]!==2)throw Error('Invalid device signature.');const length=bytes[position++];if(length<1||length>33||position+length>bytes.length||bytes[position]&128)throw Error('Invalid device signature.');let part=bytes.slice(position,position+length);position+=length;if(part[0]===0&&part.length>1)part=part.slice(1);if(part.length>32)throw Error('Invalid device signature.');output.set(part,32*i+32-part.length);}if(position!==bytes.length)throw Error('Invalid device signature.');return output;}
export function newDeviceChallenge({ownerId,origin,rpId,now=Date.now(),cryptoApi=globalThis.crypto}){if(!ownerId||new URL(origin).hostname!==rpId)throw Error('Invalid device-verification scope.');return {ownerId,origin,rpId,challenge:toBase64url(cryptoApi.getRandomValues(new Uint8Array(32))),expiresAt:now+60000,used:false};}
async function checkAuthenticator(clientDataJSON,authenticatorData,request,cryptoApi,expectedType){
 if(clientDataJSON.byteLength>4096||authenticatorData.byteLength<37||authenticatorData.byteLength>4096)throw Error('Invalid device response.');
 const client=JSON.parse(decoder.decode(clientDataJSON)),auth=new Uint8Array(authenticatorData);
 if(client.type!==expectedType||client.challenge!==request.challenge||client.origin!==request.origin||client.crossOrigin===true)throw Error('Device response did not match this request.');
 if((auth[32]&5)!==5)throw Error('Device user verification is required.');
 const rpHash=await cryptoApi.subtle.digest('SHA-256',encoder.encode(request.rpId));if(!equalBytes(auth.slice(0,32),rpHash))throw Error('Device response belongs to a different app.');
 return auth;
}
export async function verifyDeviceAssertion({request,enrollment,assertion,ownerId,now=Date.now(),cryptoApi=globalThis.crypto}){
 if(request.used||request.expiresAt<=now||request.ownerId!==ownerId)throw Error('Device request expired or was cancelled.');request.used=true;
 if(enrollment.ownerId!==ownerId||enrollment.origin!==request.origin||enrollment.rpId!==request.rpId||enrollment.algorithm!==-7||toBase64url(assertion.rawId)!==enrollment.credentialId)throw Error('Device enrollment did not match this account.');
 const response=assertion.response;if(response.userHandle&&!equalBytes(response.userHandle,fromBase64url(enrollment.userHandle)))throw Error('Device response belongs to another account.');
 await checkAuthenticator(response.clientDataJSON,response.authenticatorData,request,cryptoApi,'webauthn.get');
 const hash=new Uint8Array(await cryptoApi.subtle.digest('SHA-256',response.clientDataJSON)),data=new Uint8Array(response.authenticatorData.byteLength+hash.length);data.set(new Uint8Array(response.authenticatorData));data.set(hash,response.authenticatorData.byteLength);
 const key=await cryptoApi.subtle.importKey('spki',fromBase64url(enrollment.spki),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await cryptoApi.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,derSignature(response.signature),data))throw Error('Device signature could not be verified.');return true;
}
export async function enrollDevice({ownerId,origin=location.origin,rpId=location.hostname,credentials=navigator.credentials,cryptoApi=globalThis.crypto,signal}){
 if(!origin.startsWith('https://'))throw Error('Device setup requires the final HTTPS app address.');
 const request=newDeviceChallenge({ownerId,origin,rpId,cryptoApi}),userHandle=cryptoApi.getRandomValues(new Uint8Array(32));
 const credential=await credentials.create({signal,publicKey:{challenge:fromBase64url(request.challenge),rp:{name:'Monix balance privacy',id:rpId},user:{id:userHandle,name:'Monix '+toBase64url(userHandle).slice(0,8),displayName:'Monix balance privacy'},pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'required',userVerification:'required'},attestation:'none',timeout:60000}});
 if(!credential||signal?.aborted||Date.now()>=request.expiresAt)throw Error('Device setup was cancelled.');
 const response=credential.response,spki=response.getPublicKey?.();if(!spki||response.getPublicKeyAlgorithm?.()!==-7||!response.getAuthenticatorData)throw Error('This browser cannot complete device setup. Use your Monix PIN.');
 await checkAuthenticator(response.clientDataJSON,response.getAuthenticatorData(),request,cryptoApi,'webauthn.create');
 return {version:1,ownerId,origin,rpId,algorithm:-7,credentialId:toBase64url(credential.rawId),spki:toBase64url(spki),userHandle:toBase64url(userHandle),createdAt:new Date().toISOString()};
}
export async function unlockDevice({ownerId,enrollment,credentials=navigator.credentials,cryptoApi=globalThis.crypto,signal}){
 const request=newDeviceChallenge({ownerId,origin:enrollment.origin,rpId:enrollment.rpId,cryptoApi});
 const assertion=await credentials.get({signal,publicKey:{challenge:fromBase64url(request.challenge),rpId:request.rpId,allowCredentials:[{id:fromBase64url(enrollment.credentialId),type:'public-key',transports:['internal']}],userVerification:'required',timeout:60000}});
 if(!assertion||signal?.aborted)throw Error('Device unlock was cancelled.');const verified=await verifyDeviceAssertion({request,enrollment,assertion,ownerId,cryptoApi});if(signal?.aborted)throw Error('Device unlock was cancelled.');return verified;
}
