import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('public/',import.meta.url));
const port=Number(process.env.MONIX_PREVIEW_PORT||5194);
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf','.webmanifest':'application/manifest+json','.txt':'text/plain'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:5194');if(req.method!=='GET'||url.pathname.startsWith('/api/')){res.writeHead(404);res.end('No API in this sample preview');return;}const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname))),relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(p=>p.startsWith('.')))throw Error('Not a public asset');const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}catch{res.writeHead(404);res.end('Preview asset not found');}}).listen(port,'127.0.0.1',()=>console.log('Monix phone preview: http://127.0.0.1:'+port+'/'));
