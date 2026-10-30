// Local-only mock of Cloudflare Worker + D1, for visual QA. Never connects to Cloudflare.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {fileURLToPath} from 'node:url';
import handler from '../src/index.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const db=new DatabaseSync(':memory:');
for(const m of fs.readdirSync(path.join(root,'migrations')).filter(x=>/^\d{4}_.*\.sql$/.test(x)).sort())db.exec(fs.readFileSync(path.join(root,'migrations',m),'utf8'));
const DB={prepare:(sql)=>({
 bind(...params){return {
  first(){return db.prepare(sql).get(...params)||null},
  all(){return {results:db.prepare(sql).all(...params)}},
  run(){const result=db.prepare(sql).run(...params);return {success:true,meta:{changes:result.changes}}}
 }},
 first(){return db.prepare(sql).get()||null},all(){return {results:db.prepare(sql).all()}},run(){db.prepare(sql).run();return {success:true}}
})};
const mime={'.css':'text/css','.js':'text/javascript','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
const ASSETS={fetch:async req=>{const pathname=new URL(req.url).pathname;const resource=pathname==='/'?'index.html':pathname==='/encyclopedia'?'encyclopedia.html':pathname==='/tibb'?'tibb.html':pathname==='/guidance'?'guidance.html':pathname.slice(1);
 const file=path.resolve(root,'public',resource);if(!file.startsWith(path.join(root,'public')+path.sep))return new Response('Denied',{status:403});try{const body=fs.readFileSync(file);return new Response(body,{headers:{'content-type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'}})}catch(e){return new Response('Not found',{status:404})}}};
const server=http.createServer(async(req,res)=>{let body=[];for await(const chunk of req)body.push(chunk);const r=new Request('http://localhost:8799'+req.url,{method:req.method,headers:{...req.headers,origin:'http://localhost:8799'},...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(body)})});try{const response=await handler.fetch(r,{DB,ASSETS,ACCESS_AUD:'',ACCESS_TEAM_DOMAIN:'',ADMIN_EMAIL:''});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end('Internal error')}});
server.listen(8799,()=>console.log('Local preview only: http://localhost:8799 (no Cloudflare calls)'));
