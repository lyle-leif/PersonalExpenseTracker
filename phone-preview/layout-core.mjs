// Pure helpers shared by the preview and its regression checks.
export function migrateMotionPreferences(value){
 const saved=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 if(saved.motionVersion===2)return {...saved};
 return {...saved,paused:false,reduced:false,motionVersion:2};
}
export function viewportLayout({layoutHeight,visualHeight=layoutHeight,offsetTop=0,scale=1,editing=false,dynamicHeight=layoutHeight}){
 const zoomed=Math.abs(scale-1)>.05;
 const keyboard=!zoomed&&editing&&layoutHeight-visualHeight>100;
 const height=!zoomed&&!keyboard?Math.max(1,Math.min(layoutHeight,visualHeight+offsetTop)):layoutHeight;
 return {keyboard,height,fallback:Math.abs(dynamicHeight-height)>2,keyboardHeight:keyboard?visualHeight:null,keyboardTop:keyboard?offsetTop:null};
}
