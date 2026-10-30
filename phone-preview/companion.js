/* Monix's character layer never rebuilds financial views or opens Home navigation. */
let buddyEnergy='playful';try{const saved=JSON.parse(localStorage.getItem('monix-phone-preview-v1-preferences')||'{}');if(saved.energy==='calm')buddyEnergy='calm';}catch{}
let buddyAckTimer=null,buddyPointer=null,buddyIgnoreUntil=0,buddyStaticIndex=0,buddySavedPending=false;
function buddyAvailable(){return !document.hidden&&!toast&&(!overlay||overlay==='companion')&&!document.activeElement?.matches('input,select,textarea')&&!!document.querySelector('.buddy-scene');}
function buddyMotion(){return !monixPaused&&animate&&!motionPreference.matches&&!reviewReducedMotion;}
function buddyHosts(){return [...document.querySelectorAll(overlay==='companion'?'.screen-overlay .buddy-scene':'.app-layout .buddy-scene')];}
function buddyRest(){document.querySelectorAll('.buddy-scene').forEach(host=>{for(const name of ['wave','tilt','wiggle','hug','bounce'])host.classList.remove('gesture-'+name);host.classList.remove('buddy-notice','buddy-ack');host.removeAttribute('data-static');});}
function buddyWords(text){if(!wordsOn)return;phrase=text;document.querySelectorAll('[data-kind-words]').forEach(node=>{node.textContent=text;node.setAttribute('aria-live','off');});}
const buddy=new MonixMotion.BuddyController({available:buddyAvailable,motion:buddyMotion,onRest:buddyRest,onWords:buddyWords,onGesture:(name,direct)=>{buddyRest();for(const host of buddyHosts()){host.dataset.reaction=name;host.classList.add('gesture-'+name);if(direct)host.classList.add('buddy-notice');}},onAck:()=>{clearTimeout(buddyAckTimer);buddyHosts().forEach(host=>host.classList.add('buddy-ack'));buddyAckTimer=setTimeout(()=>buddyHosts().forEach(host=>host.classList.remove('buddy-ack')),180);},onStatic:()=>{buddyHosts().forEach(host=>host.dataset.static=['welcome','hug','base'][buddyStaticIndex++%3]);}});
function buddyMount(){
 for(const node of document.querySelectorAll('.greeting .mascot-button>.mascot-live,.companion-hero>.mascot-live,.mobile-friend>.mascot-live')){
  const host=document.createElement('span');host.className='buddy-scene';host.setAttribute('role','img');host.setAttribute('aria-label','Monix');const gesture=document.createElement('span');gesture.className='buddy-gesture';host.append(gesture);
  for(const [id,pose] of [['base',selectedPose||'idle'],['welcome','welcome'],['hug','hug']]){const layer=svgForPose(pose);layer.classList.add('buddy-layer');layer.dataset.buddyLayer=id;layer.setAttribute('aria-hidden','true');layer.removeAttribute('aria-label');gesture.append(layer);}if(buddy.busy&&buddy.last)host.classList.add('gesture-'+buddy.last);node.replaceWith(host);
 }
 const dock=document.querySelector('.companion-dock');if(dock){const text=dock.querySelector(':scope>span');if(text){text.dataset.kindWords='';text.setAttribute('aria-live','off');text.textContent=phrase;}}
 document.querySelectorAll('[data-kind-words]').forEach(node=>node.setAttribute('aria-live','off'));
}
function buddySchedule(){buddyMount();buddy.reconcile(buddyEnergy);if(buddySavedPending&&buddyAvailable()){buddySavedPending=false;buddy.action();}}
window.MONIX_BUDDY={mount:buddyMount,schedule:buddySchedule,play:pose=>buddy.tap(({welcome:'wave',hug:'hug',celebrate:'bounce',thinking:'tilt'})[pose]||null)};
const buddyRemember=rememberV2;rememberV2=function(){buddyRemember();try{const key='monix-phone-preview-v1-preferences',saved=JSON.parse(localStorage.getItem(key)||'{}');saved.energy=buddyEnergy;localStorage.setItem(key,JSON.stringify(saved));}catch{}};
const buddySettings=settings;settings=function(){return buddySettings()+`<section class="phone-info buddy-preferences"><h2>Monix's energy</h2><p>Extra playful moves more often. Kind words stay occasional.</p><div class="buddy-energy" role="group" aria-label="Monix energy">${[['calm','Calm'],['playful','Extra playful']].map(([id,label])=>`<button class="button-secondary" data-buddy-energy="${id}" aria-pressed="${buddyEnergy===id}">${label}</button>`).join('')}</div></section>`;};
const buddyRender=render;render=function(){buddyRender();buddySchedule();};
const buddyNavigate=navigate;navigate=function(id){const previous=screen;buddyNavigate(id);if(previous!==id)buddy.action();};
const buddyNotify=notify;notify=function(title,message,pose='saved'){buddySavedPending=/^(Saved on this device|Added to this preview|Picture updated)$/.test(title);buddyNotify(title,message,pose);};
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.buddy==='play'){event.preventDefault();event.stopImmediatePropagation();if(event.detail===0||performance.now()>=buddyIgnoreUntil)buddy.tap();return;}
 if(button.dataset.buddyEnergy){event.preventDefault();event.stopImmediatePropagation();buddyEnergy=button.dataset.buddyEnergy;rememberV2();document.querySelectorAll('[data-buddy-energy]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.buddyEnergy===buddyEnergy)));buddySchedule();}
},true);
document.addEventListener('pointerdown',event=>{if(event.target.closest('[data-buddy="play"]'))buddyPointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};},{passive:true});
document.addEventListener('pointermove',event=>{if(buddyPointer?.id===event.pointerId&&Math.hypot(event.clientX-buddyPointer.x,event.clientY-buddyPointer.y)>10)buddyPointer.moved=true;},{passive:true});
document.addEventListener('pointerup',()=>{if(buddyPointer?.moved)buddyIgnoreUntil=performance.now()+500;buddyPointer=null;},{passive:true});
document.addEventListener('pointercancel',()=>{buddyPointer=null;buddyIgnoreUntil=performance.now()+500;},{passive:true});
document.addEventListener('visibilitychange',buddySchedule);document.addEventListener('focusin',()=>{document.documentElement.classList.toggle('buddy-input-open',!!document.activeElement?.matches('input,select,textarea'));buddySchedule();});
document.addEventListener('focusout',()=>queueMicrotask(()=>{document.documentElement.classList.toggle('buddy-input-open',!!document.activeElement?.matches('input,select,textarea'));buddySchedule();}));
const buddyObserver=new MutationObserver(records=>{if(records.some(record=>[...record.removedNodes,...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.toast,.screen-overlay')||node.querySelector?.('.toast')))))buddySchedule();});buddyObserver.observe(document.querySelector('#app'),{childList:true,subtree:true});
window.addEventListener('pagehide',()=>{buddy.destroy();clearTimeout(buddyAckTimer);});window.addEventListener('pageshow',buddySchedule);
phrase='Tap Monix to say hello.';if(!window.MONIX_PRIVACY_PENDING)render();
