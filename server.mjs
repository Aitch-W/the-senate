import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as e from './engine.mjs';
import * as ai from './deepseek.mjs';
const root=path.resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
async function jsonBody(req){let bytes=0,buf=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>32000)throw Object.assign(new Error('请求过大'),{status:413});buf.push(chunk)}try{return JSON.parse(Buffer.concat(buf).toString()||'{}')}catch{throw Object.assign(new Error('请求格式错误'),{status:400})}}
function devConfig(body){
  const dev=body?.dev;
  if(!dev||dev.enabled!==true||typeof dev.key!=='string'||!dev.key.trim())return null;
  return {
    key:dev.key.trim(),
    model:dev.model==='deepseek-reasoner'?'deepseek-reasoner':'deepseek-chat',
    base:ai.normalizeBase(dev.base),
  };
}
function warning(error){return `DeepSeek 暂不可用，已回退本地规则：${ai.redact(error)}`}
async function startRoom(r,body){
  const dev=devConfig(body);
  if(!dev){e.start(r);r.questionEngine='local';r.devWarning=null;return}
  if(r.state!=='CREATED'){e.start(r);return}
  try{
    const draft=await ai.generateQuestions({...dev,room:r});
    e.start(r,draft);
    r.questionEngine='deepseek';
    r.devModel=dev.model;
    r.devWarning=null;
  }catch(error){
    e.start(r);
    r.questionEngine='local';
    r.devWarning=warning(error);
  }
}
async function deliberateRoom(r,body){
  const dev=devConfig(body);
  if(!dev){e.deliberate(r);r.ballotEngine='local';return}
  if(r.state!=='QUESTION_DONE'||r.answers.length!==r.seats.length||r.friends.some(f=>!f.question)){e.deliberate(r);return}
  try{
    const draft=await ai.generateBallots({...dev,room:r});
    e.deliberate(r,draft);
    r.ballotEngine='deepseek';
    r.devWarning=null;
  }catch(error){
    e.deliberate(r);
    r.ballotEngine='local';
    r.devWarning=warning(error);
  }
}
export function createServer(){return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/health')return send({ok:true,mode:'demo'});
 if(url.pathname==='/api/dev/test'&&req.method==='POST'){
   try{return send(await ai.testKey(await jsonBody(req)))}
   catch(error){return send({error:ai.redact(error)},502)}
 }
 if(url.pathname==='/api/rooms'&&req.method==='POST'){const room=e.createRoom(await jsonBody(req));return send({room:e.ownerView(room),ownerToken:room.ownerToken},201)}
 const m=url.pathname.match(/^\/api\/rooms\/([a-f0-9]+)(?:\/(seats|start|answer|deliberate|decision|friend|ask))?$/);
 if(m){const r=e.getRoom(m[1]),action=m[2];r.updatedAt=Date.now();
 if(action==='friend'){const token=req.headers['x-friend-token'];if(req.method==='GET')return send(e.friendView(r,token));if(req.method==='POST'){e.friendVote(r,token,await jsonBody(req));return send(e.friendView(r,token));}}
 if(action==='ask'){if(req.method!=='POST')return send({error:'方法不支持'},405);const token=req.headers['x-friend-token'];e.friendAsk(r,token,await jsonBody(req));return send(e.friendView(r,token));}
 e.requireOwner(r,(req.headers.authorization||'').replace(/^Bearer /,''));
 if(req.method==='GET'&&!action)return send(e.ownerView(r));
 if(req.method!=='POST')return send({error:'方法不支持'},405);
 const b=await jsonBody(req);
 if(action==='start'){await startRoom(r,b);return send(e.ownerView(r))}
 if(action==='deliberate'){await deliberateRoom(r,b);return send(e.ownerView(r))}
 const operations={seats:()=>e.changeSeats(r,b.seats),answer:()=>e.answer(r,b),decision:()=>e.decide(r,b)};
 if(!operations[action])return send({error:'接口不存在'},404);operations[action]();return send(e.ownerView(r));
 }
 if(url.pathname.startsWith('/api/'))return send({error:'接口不存在'},404);
 if(req.method!=='GET'&&req.method!=='HEAD')return send({error:'方法不支持'},405);
 const requested=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+requested);
 if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html'))return send({error:'无权访问'},403);
 try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data)}catch{return send({error:'文件不存在'},404)}
 }catch(err){send({error:err.message||'服务暂不可用'},err.status||500)}
 });}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.argv[2]||process.env.PORT)||4180;createServer().listen(port,'0.0.0.0',()=>console.log(`The Senate · Local: http://127.0.0.1:${port}`));setInterval(()=>{for(const[id,r]of e.rooms)if(Date.now()-r.updatedAt>86400000)e.rooms.delete(id)},3600000).unref();}
