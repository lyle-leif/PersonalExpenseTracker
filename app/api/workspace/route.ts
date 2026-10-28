import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { readWorkspace, writeWorkspace } from '../../workspace-store.mjs';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export async function GET(){const user=await getChatGPTUser();if(!user)return reply({error:'Please sign in again.'},401);try{const {data,version,requests}=await readWorkspace(env.DB,user.userId);return reply({data,version,appliedIds:requests,ownerId:user.userId,name:user.displayName});}catch{return reply({error:'Unable to load your workspace. Please retry.'},503);}}
export async function PUT(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'Please sign in again.'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid request origin.'},403);
 const raw=await req.text();if(raw.length>12000000)return reply({error:'This change exceeds the request size limit. Export a backup before continuing.'},413);
 let input;try{input=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
 try{const result=await writeWorkspace(env.DB,user.userId,input);return reply(result,result.status);}catch{return reply({error:'Could not save. Your form is still open; please retry.'},503);}
}
