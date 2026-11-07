import * as e from './engine.mjs';
import * as ai from './deepseek.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const fail=(message,status=400)=>json({error:message},status);

async function bodyOf(request){
  const text=await request.text();
  if(text.length>32000)throw Object.assign(Error('请求过大'),{status:413});
  try{return JSON.parse(text||'{}')}catch{throw Object.assign(Error('请求格式错误'),{status:400})}
}
async function readRoom(env,id){
  const row=await env.DB.prepare('SELECT json FROM rooms WHERE id = ?').bind(id).first();
  if(!row)return null;
  try{return JSON.parse(row.json)}catch{return null}
}
async function writeRoom(env,room){
  await env.DB.prepare('INSERT INTO rooms (id,json,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at')
    .bind(room.id,JSON.stringify(room),Date.now()).run();
}
function devConfig(body){
  const dev=body?.dev;
  if(!dev||dev.enabled!==true||typeof dev.key!=='string'||!dev.key.trim())return null;
  return {key:dev.key.trim(),model:dev.model==='deepseek-reasoner'?'deepseek-reasoner':'deepseek-chat',base:ai.normalizeBase(dev.base)};
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
async function api(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/health')return json({ok:true,mode:'worker'});
  if(url.pathname==='/api/dev/test'){
    if(request.method!=='POST')return fail('方法不支持',405);
    try{return json(await ai.testKey(await bodyOf(request)))}
    catch(error){return fail(ai.redact(error),502)}
  }
  if(url.pathname==='/api/rooms'){
    if(request.method!=='POST')return fail('方法不支持',405);
    const room=e.createRoom(await bodyOf(request));
    e.rooms.delete(room.id);
    await writeRoom(env,room);
    return json({room:e.ownerView(room),ownerToken:room.ownerToken},201);
  }
  const match=url.pathname.match(/^\/api\/rooms\/([a-f0-9]+)(?:\/(seats|start|answer|deliberate|decision|friend|ask))?$/);
  if(!match)return fail('接口不存在',404);
  const room=await readRoom(env,match[1]);
  if(!room)return fail('会场不存在或已结束，请重新召集',404);
  const action=match[2];
  room.updatedAt=Date.now();
  if(action==='friend'){
    const token=request.headers.get('x-friend-token');
    if(request.method==='GET')return json(e.friendView(room,token));
    if(request.method!=='POST')return fail('方法不支持',405);
    e.friendVote(room,token,await bodyOf(request));
    await writeRoom(env,room);
    return json(e.friendView(room,token));
  }
  if(action==='ask'){
    if(request.method!=='POST')return fail('方法不支持',405);
    const token=request.headers.get('x-friend-token');
    e.friendAsk(room,token,await bodyOf(request));
    await writeRoom(env,room);
    return json(e.friendView(room,token));
  }
  e.requireOwner(room,(request.headers.get('authorization')||'').replace(/^Bearer /,''));
  if(request.method==='GET'&&!action)return json(e.ownerView(room));
  if(request.method!=='POST')return fail('方法不支持',405);
  const body=await bodyOf(request);
  if(action==='start'){await startRoom(room,body);await writeRoom(env,room);return json(e.ownerView(room))}
  if(action==='deliberate'){await deliberateRoom(room,body);await writeRoom(env,room);return json(e.ownerView(room))}
  if(action==='seats')e.changeSeats(room,body.seats);
  else if(action==='answer')e.answer(room,body);
  else if(action==='decision')e.decide(room,body);
  else return fail('接口不存在',404);
  await writeRoom(env,room);
  return json(e.ownerView(room));
}
export default {
  async fetch(request,env){
    try{
      const url=new URL(request.url);
      if(url.pathname.startsWith('/api/'))return await api(request,env);
      return env.ASSETS.fetch(request);
    }catch(error){
      return fail(error?.message||'服务暂不可用',error?.status||500);
    }
  },
  async scheduled(event,env,ctx){
    ctx.waitUntil(env.DB.prepare('DELETE FROM rooms WHERE updated_at < ?').bind(Date.now()-86400000).run());
  }
};
