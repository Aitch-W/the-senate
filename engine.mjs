import {packs,getPack,votes} from './public/council.js';
export const rooms=new Map();
const SIZES=[3,5,7];
const secret=(bytes=24)=>{const data=new Uint8Array(bytes);crypto.getRandomValues(data);return Array.from(data,byte=>byte.toString(16).padStart(2,'0')).join('')};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function text(value,max=1500){if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail('请填写有效内容');return value.trim();}
function membersOf(packId){return getPack(packId).members;}
function parsePack(value){if(value===undefined||value===null||value==='')return 'roman';if(!packs[value])fail('请选择有效的角色包');return value;}
function parseSize(value){if(value===undefined||value===null||value==='')return 5;const size=Number(value);if(!SIZES.includes(size))fail('议会人数只能选择 3、5 或 7 位');return size;}
function drawSeats(members,size){const ids=members.map(c=>c.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}return ids.slice(0,size)}
function seatsValid(packId,size,seats){
  if(!Array.isArray(seats)||seats.length!==size)fail(`请为本次议会选择 ${size} 个席位`);
  const allowed=new Set(membersOf(packId).map(c=>c.id));
  const ais=seats.filter(x=>x!=='friend');
  if(ais.some(x=>!allowed.has(x))||new Set(ais).size!==ais.length)fail('先贤席位不能重复，且必须来自所选角色包');
}
export function createRoom(data){
  if(rooms.size>=1000)fail('当前会场已满，请稍后再试',503);
  const product=text(data.product,100),reason=text(data.reason,1500);const price=Number(data.price),cash=Number(data.cash);
  if(!Number.isFinite(price)||price<=0||price>1e9||!Number.isFinite(cash)||cash<0||cash>1e12)fail('请输入有效的价格和可用闲钱');
  const pack=parsePack(data.pack),size=parseSize(data.size);
  const members=membersOf(pack);
  const seats=data.seats!==undefined?[...data.seats]:drawSeats(members,size);
  seatsValid(pack,size,seats);
  const room={id:secret(6),ownerToken:secret(),createdAt:new Date().toISOString(),updatedAt:Date.now(),pack,packName:getPack(pack).name,size,product,price:Math.round(price*100)/100,cash:Math.round(cash*100)/100,reason,seats,state:'CREATED',answers:[],ballots:[],friends:[],decision:null};
  rooms.set(room.id,room);return room;
}
export function getRoom(id){const r=rooms.get(id);if(!r)fail('会场不存在或服务重启后已结束，请重新召集',404);return r;}
export function requireOwner(r,token){if(!token||token!==r.ownerToken)fail('缺少会场主持人权限',403);}
export function ownerView(r){return {...r,ownerToken:undefined,ballots:r.state==='VOTE_FINISHED'?r.ballots:[],friends:r.friends.map(f=>({seat:f.seat,token:f.token,name:f.name,questionAsked:!!f.question,submitted:!!f.ballot})),simulation:true};}
export function changeSeats(r,seats){if(r.state!=='CREATED')fail('质询开始后席位已经锁定',409);seatsValid(r.pack,r.size,seats);r.seats=[...seats];}
export function start(r,drafts){
  if(r.state!=='CREATED')fail('议会已经开始',409);
  r.state='QUESTIONING';
  const members=membersOf(r.pack);
  const generated=new Map((Array.isArray(drafts)?drafts:[]).map(item=>[item?.roleId,item]));
  r.questions=r.seats.map((id,i)=>{
    const c=members.find(x=>x.id===id);
    if(c){
      const draft=generated.get(c.id);
      const question=typeof draft?.question==='string'?draft.question.trim().slice(0,300):'';
      return {seat:i,roleId:c.id,name:c.name,en:c.en,mbti:c.mbti,question:question||c.question,ai:!!question};
    }
    return {seat:i,roleId:null,name:'好友席',en:"A FRIEND'S QUESTION",mbti:'',question:null,friendSeat:true};
  });
  r.friends=r.seats.flatMap((id,i)=>id==='friend'?[{seat:i,token:secret(),ballot:null,name:'',question:'',questionAt:null}]:[]);
}
export function answer(r,data){if(r.state!=='QUESTIONING')fail('当前不可提交回答',409);if(data.index!==r.answers.length)fail('问题已提交，请刷新当前会场',409);const current=r.questions[data.index];if(!current?.question)fail('请等待好友先提出质询',409);r.answers.push({...current,answer:text(data.answer)});if(r.answers.length===r.questions.length)r.state='QUESTION_DONE';}
export function parseVote(opinion){return opinion.match(/【(买|暂缓|不买)】\s*$/)?.[1]||'暂缓';}
function simulate(r,id,seat){
  const c=membersOf(r.pack).find(x=>x.id===id);
  if(!c)return null;
  const ratio=r.cash>0?r.price/r.cash:Infinity;
  const positive=r.answers.some(a=>/每天|每周|工作|学习|刚需|坏了|必要|经常/.test(a.answer));
  const willingness=clamp(0.35+(c.bias||0)+(positive?0.1:0),0.12,0.85);
  let vote='买';
  if(!Number.isFinite(ratio)||ratio>1)vote='不买';
  else if(ratio>willingness*1.6)vote='不买';
  else if(ratio>willingness)vote='暂缓';
  const affordability=Number.isFinite(ratio)?`这笔支出约占可用闲钱的 ${Math.round(ratio*100)}%。`:'目前没有可用闲钱，建议先建立预算。';
  const opinion=`${c.voice}${affordability}${positive?'你的回答提到了具体用途。':'可以再明确使用频率和必要性。'}【${vote}】`;
  return {seat,roleId:c.id,name:c.name,opinion,vote:parseVote(opinion),source:'demo'};
}
export function deliberate(r,drafts){if(r.state!=='QUESTION_DONE'||r.answers.length!==r.seats.length||r.friends.some(f=>!f.question))fail('请先完成全部质询',409);const generated=new Map((Array.isArray(drafts)?drafts:[]).map(item=>[item?.roleId,item]));r.ballots=r.seats.flatMap((id,i)=>{if(id==='friend')return[];const c=membersOf(r.pack).find(x=>x.id===id);const draft=generated.get(id);if(c&&draft&&votes.includes(draft.vote)&&typeof draft.opinion==='string'&&draft.opinion.trim()){const opinion=draft.opinion.replace(/【(买|暂缓|不买)】\s*$/g,'').trim();return [{seat:i,roleId:id,name:c.name,opinion:`${opinion}【${draft.vote}】`,vote:draft.vote,source:'deepseek'}]}return simulate(r,id,i)}).filter(Boolean);r.state=r.friends.length?'WAIT_FRIEND_SUBMIT':'VOTE_FINISHED';}
export function friendAsk(r,token,data){
  const f=r.friends.find(f=>f.token===token);
  if(!f)fail('邀请链接无效',403);
  if(r.state!=='QUESTIONING')fail('议会尚未进入质询环节',409);
  if(f.question)fail('你的质询已提交，不可修改',409);
  const name=text(data.name,30),question=text(data.question,500);
  f.name=name;f.question=question;f.questionAt=Date.now();
  const q=r.questions.find(q=>q.seat===f.seat);
  if(q){q.name=name;q.question=question}
}
export function friendView(r,token){const f=r.friends.find(f=>f.token===token);if(!f)fail('邀请链接无效',403);return {id:r.id,product:r.product,price:r.price,reason:r.reason,answers:r.answers,seat:f.seat,size:r.size,pack:r.pack,packName:r.packName,state:r.state,submitted:!!f.ballot,ready:['WAIT_FRIEND_SUBMIT','VOTE_FINISHED'].includes(r.state),name:f.name||'',question:f.question||'',questionAsked:!!f.question};}
export function friendVote(r,token,data){const f=r.friends.find(f=>f.token===token);if(!f)fail('邀请链接无效',403);if(f.ballot)fail('提交已封存，不可修改',409);if(r.state!=='WAIT_FRIEND_SUBMIT')fail('请等待质询结束后提交',409);if(!votes.includes(data.vote))fail('请选择买、暂缓或不买');f.ballot={seat:f.seat,name:text(data.name,30),opinion:text(data.opinion),vote:data.vote,source:'friend'};r.ballots.push(f.ballot);if(r.friends.every(f=>f.ballot))r.state='VOTE_FINISHED';}
export function decide(r,data){if(r.state!=='VOTE_FINISHED')fail('请等待全部投票完成',409);if(r.decision)fail('最终决定已经记录',409);if(!votes.includes(data.vote))fail('请选择有效决定');if(data.vote==='暂缓'&&![3,7].includes(data.days))fail('冷静期请选择3或7天');r.decision={vote:data.vote,days:data.vote==='暂缓'?data.days:0,at:new Date().toISOString()};return r.decision;}
