import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createFxService,d1FxStore,fxResponse} from './shared/fx-service.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
await mkdir(new URL('.review-state/',import.meta.url),{recursive:true});
const sql=new DatabaseSync(fileURLToPath(new URL('.review-state/reference.sqlite',import.meta.url)));
sql.exec((await readFile(new URL('shared/reference-schema.sql',import.meta.url),'utf8')).replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS '));
const db={prepare(query){const stmt=sql.prepare(query);return {bind(...args){return {async first(){return stmt.get(...args)||null;},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};}};}};}};
const service=createFxService({store:d1FxStore(db)});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{try{
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 const url=new URL(req.url,'http://127.0.0.1:5192');
 if(url.pathname==='/api/fx/cad-php'){
  // Loopback-only review; this process has no accounts or financial API.
  const result=await fxResponse(new Request(url),{authorize:async()=>true,service});
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
 }
 const pathname=decodeURIComponent(url.pathname),target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname)),relative=path.relative(root,target);
 if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(part=>part.startsWith('.'))||url.pathname.startsWith('/api/')){res.writeHead(403);res.end();return;}
 const content=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch{res.writeHead(503);res.end('Local review unavailable.');}
}).listen(5192,'127.0.0.1',()=>console.log('Monix converter review: http://127.0.0.1:5192/Monix-Proposal-07-Review.html'));
