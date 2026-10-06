import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist'),port=Number(process.env.SVG_PORT??0),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.map':'application/json'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url??'/',`http://127.0.0.1:${port}`).pathname),relative=pathname==='/'?'/index.html':pathname,path=resolve(root,'.'+relative);if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}const bytes=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'}).end(bytes);}catch{res.writeHead(404).end();}});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port,pid:process.pid,scope:'own svg-paint-gap/dist'})));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close());
