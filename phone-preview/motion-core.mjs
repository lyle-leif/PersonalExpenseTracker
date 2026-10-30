export const REACTIONS=['wave','tilt','wiggle','hug','bounce'];
const duration={wave:1800,tilt:1500,wiggle:1300,hug:2300,bounce:1700};
// One ambient deadline and one active reaction. No backlog of taps or missed gestures.
export class BuddyController {
 constructor({now=Date.now,random=Math.random,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),available=()=>true,motion=()=>true,onGesture=()=>{},onRest=()=>{},onAck=()=>{},onStatic=()=>{},onWords=()=>{}}={}){
  Object.assign(this,{now,random,setTimer,clearTimer,available,motion,onGesture,onRest,onAck,onStatic,onWords});this.timer=null;this.settle=null;this.active=false;this.busy=false;this.last=null;this.lastWord=null;this.lastAction=-Infinity;this.wordsDue=now()+45000+random()*15000;this.energy='playful';
 }
 choose(values,last){const pool=values.filter(v=>v!==last);return pool[Math.min(pool.length-1,Math.floor(this.random()*pool.length))];}
 words(direct=false){if(!direct&&this.now()<this.wordsDue)return;const text=this.choose(direct?['Oh, hi!','You rang?','Hello again.','You found me.']:['Still here.','Oh, hello.','Just checking in.'],this.lastWord);this.lastWord=text;this.wordsDue=this.now()+45000+this.random()*15000;this.onWords(text);}
 reconcile(energy=this.energy){const changed=energy!==this.energy;this.energy=energy;const next=this.available()&&this.motion();if(next===this.active&&!changed)return;this.stop();this.active=next;if(next){this.wordsDue=this.now()+45000+this.random()*15000;this.arm();}}
 interval(){return this.energy==='calm'?18000+this.random()*6000:10000+this.random()*5000;}
 arm(delay=this.interval()){this.clearTimer(this.timer);this.timer=null;if(!this.active)return;this.timer=this.setTimer(()=>{this.timer=null;if(!this.available()||!this.motion()){this.reconcile();return;}this.play(false);},delay);}
 play(direct=false,requested=null){if(!this.available())return false;if(!this.motion()){if(direct){this.onStatic();this.words(true);}return false;}if(this.busy){if(direct){this.ambientDue=this.now()+this.interval();this.wordsDue=this.now()+45000+this.random()*15000;this.onAck();}return false;}this.clearTimer(this.timer);this.timer=null;this.busy=true;this.ambientDue=this.now()+this.interval();const gesture=requested||this.choose(REACTIONS,this.last);this.last=gesture;this.onGesture(gesture,direct);this.words(direct);this.settle=this.setTimer(()=>{this.settle=null;this.busy=false;this.onRest();this.arm(Math.max(0,this.ambientDue-this.now()));},duration[gesture]||1800);return true;}
 tap(requested=null){return this.play(true,requested);}
 action(){if(this.now()-this.lastAction<4000||!this.available()||!this.motion())return false;this.lastAction=this.now();return this.play(false);}
 stop(){this.clearTimer(this.timer);this.clearTimer(this.settle);this.timer=this.settle=null;this.active=false;this.busy=false;this.onRest();}
 destroy(){this.stop();}
}
