import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {packs, votes} from '../public/council.js';
import {createServer} from '../server.mjs';
const data={product:'降噪耳机',price:1200,cash:6000,reason:'每天学习使用'};
const packSeats=(pack,size)=>packs[pack].members.slice(0,size).map(c=>c.id);
const complete=(r)=>{e.start(r);r.friends.forEach((f,i)=>e.friendAsk(r,f.token,{name:'好友'+(i+1),question:'这笔支出会改变你接下来的生活安排吗？'}));for(let i=0;i<r.questions.length;i++)e.answer(r,{index:i,answer:'每天学习使用，预算充足，比较过替代方案。'});e.deliberate(r)};
test('council sizes 3/5/7 draw unique sages and run the full serial flow',()=>{
  for(const size of [3,5,7]){
    const r=e.createRoom({...data,pack:'roman',size});
    assert.equal(r.size,size);
    assert.equal(r.seats.length,size);
    assert.equal(new Set(r.seats).size,size);
    assert.equal(r.state,'CREATED');
    assert.throws(()=>e.deliberate(r));
    e.start(r);
    assert.equal(r.questions.length,size);
    assert.throws(()=>e.start(r));
    assert.throws(()=>e.changeSeats(r,r.seats));
    for(let i=0;i<size;i++){
      e.answer(r,{index:i,answer:'每天学习使用'});
      assert.throws(()=>e.answer(r,{index:i,answer:'重复回答'}));
    }
    assert.equal(r.state,'QUESTION_DONE');
    e.deliberate(r);
    assert.equal(r.state,'VOTE_FINISHED');
    assert.equal(e.ownerView(r).ballots.length,size);
    assert.ok(r.ballots.every(b=>votes.includes(b.vote)));
    e.decide(r,{vote:'暂缓',days:3});
    assert.throws(()=>e.decide(r,{vote:'买'}));
  }
});
test('random draw never repeats a sage and defaults to five seats',()=>{
  const r=e.createRoom(data);
  assert.equal(r.size,5);
  assert.equal(r.seats.length,5);
  for(let n=0;n<20;n++){
    const room=e.createRoom({...data,pack:'chinese',size:3});
    assert.equal(new Set(room.seats).size,3);
    assert.ok(room.seats.every(id=>packs.chinese.members.some(c=>c.id===id)));
  }
});
test('role packs drive questions, names and ballots',()=>{
  const r=e.createRoom({...data,pack:'chinese',size:7});
  assert.equal(r.packName,'华夏诸子先贤包');
  assert.ok(r.seats.every(id=>packs.chinese.members.some(c=>c.id===id)));
  e.start(r);
  assert.ok(r.questions.every(q=>packs.chinese.members.some(c=>c.name===q.name)));
  for(let i=0;i<7;i++)e.answer(r,{index:i,answer:'每天使用，预算充足'});
  e.deliberate(r);
  assert.ok(r.ballots.every(b=>packs.chinese.members.some(c=>c.name===b.name)));
  assert.equal(r.ballots.length,7);
});
test('invalid pack, size, duplicate or foreign seats are rejected',()=>{
  assert.throws(()=>e.createRoom({...data,pack:'unknown'}));
  assert.throws(()=>e.createRoom({...data,size:4}));
  assert.throws(()=>e.createRoom({...data,pack:'chinese',size:5,seats:packSeats('roman',5)}));
  assert.throws(()=>e.createRoom({...data,size:3,seats:Array(3).fill('solon')}));
  assert.throws(()=>e.createRoom({...data,size:5,seats:packSeats('roman',3)}));
});
test('friend seats must ask their own question before the host can answer',()=>{
  const seats=packSeats('chinese',5);seats[1]='friend';
  const r=e.createRoom({...data,pack:'chinese',size:5,seats});
  e.start(r);
  const f=r.friends[0];
  assert.equal(r.questions[1].question,null);
  assert.equal(e.friendView(r,f.token).questionAsked,false);
  assert.throws(()=>e.friendAsk(r,f.token,{name:'',question:'有效问题'}),/有效内容/);
  e.answer(r,{index:0,answer:'先回答第一位先贤。'});
  assert.throws(()=>e.answer(r,{index:1,answer:'不能替好友提问'}),/等待好友/);
  e.friendAsk(r,f.token,{name:'阿青',question:'三个月后回看，你还会买吗？'});
  assert.equal(r.questions[1].question,'三个月后回看，你还会买吗？');
  assert.equal(r.questions[1].name,'阿青');
  assert.equal(e.friendView(r,f.token).questionAsked,true);
  assert.throws(()=>e.friendAsk(r,f.token,{name:'阿青',question:'改问题'}),/不可修改/);
  e.answer(r,{index:1,answer:'我想还是会买。'});
  for(let i=2;i<5;i++)e.answer(r,{index:i,answer:'每天使用，预算充足。'});
  assert.equal(r.answers[1].question,'三个月后回看，你还会买吗？');
  e.deliberate(r);
  assert.equal(r.state,'WAIT_FRIEND_SUBMIT');
  e.friendVote(r,f.token,{name:'阿青',opinion:'建议等一等',vote:'暂缓'});
  assert.equal(r.state,'VOTE_FINISHED');
  assert.equal(r.ballots.length,5);
});
test('mixed mode hides sealed ballots and waits for friends',()=>{
  const seats=packSeats('roman',5);seats[0]='friend';seats[4]='friend';
  const r=e.createRoom({...data,pack:'roman',size:5,seats});complete(r);
  assert.equal(r.state,'WAIT_FRIEND_SUBMIT');
  assert.deepEqual(e.ownerView(r).ballots,[]);
  const a=r.friends[0],b=r.friends[1];
  const view=e.friendView(r,a.token);
  assert.equal(view.answers.length,5);
  assert.equal(view.size,5);
  assert.equal(view.packName,'古罗马元老院包');
  assert.ok(!('ballots'in view));
  assert.ok(!('ownerToken'in view));
  assert.ok(!('friends'in view));
  assert.throws(()=>e.friendView(r,'invalid'));
  assert.throws(()=>e.requireOwner(r,a.token));
  e.friendVote(r,a.token,{name:'朋友甲',opinion:'建议等一周',vote:'暂缓'});
  assert.throws(()=>e.friendVote(r,a.token,{name:'朋友甲',opinion:'改票',vote:'买'}));
  assert.equal(r.state,'WAIT_FRIEND_SUBMIT');
  assert.deepEqual(e.ownerView(r).ballots,[]);
  e.friendVote(r,b.token,{name:'朋友乙',opinion:'每天使用有价值',vote:'买'});
  assert.equal(r.state,'VOTE_FINISHED');
  assert.equal(r.ballots.length,5);
});
test('all seats may be friends without accidental result unlock',()=>{
  const size=3;
  const r=e.createRoom({...data,size,seats:Array(size).fill('friend')});complete(r);
  assert.equal(r.state,'WAIT_FRIEND_SUBMIT');
  r.friends.forEach((f,i)=>{e.friendVote(r,f.token,{name:'朋友'+i,opinion:'独立意见',vote:'暂缓'});assert.equal(r.state,i===size-1?'VOTE_FINISHED':'WAIT_FRIEND_SUBMIT')});
  assert.equal(r.ballots.length,size);
});
test('invalid prices, votes and freeze days rejected',()=>{
  assert.throws(()=>e.createRoom({...data,price:-1}));
  assert.throws(()=>e.createRoom({...data,cash:'NaN'}));
  const r=e.createRoom({...data,size:3});complete(r);
  assert.throws(()=>e.decide(r,{vote:'暂缓',days:5}));
  assert.throws(()=>e.decide(r,{vote:'yes'}));
  assert.equal(e.parseVote('推荐买，但先等等【暂缓】'),'暂缓');
  assert.equal(e.parseVote('【买】不是末尾'),'暂缓');
});
test('HTTP friend question route accepts only the friend token',async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const created=await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,pack:'chinese',size:3,seats:['mozi','friend','kongzi']})});
    assert.equal(created.status,201);
    const {room,ownerToken}=await created.json();
    const started=await fetch(base+'/api/rooms/'+room.id+'/start',{method:'POST',headers:{Authorization:'Bearer '+ownerToken}});
    assert.equal(started.status,200);
    const startedRoom=await started.json();
    const token=startedRoom.friends[0].token;
    const denied=await fetch(base+'/api/rooms/'+room.id+'/ask',{method:'POST',headers:{'Content-Type':'application/json','X-Friend-Token':'bad'},body:JSON.stringify({name:'朋友',question:'值得吗？'})});
    assert.equal(denied.status,403);
    const asked=await fetch(base+'/api/rooms/'+room.id+'/ask',{method:'POST',headers:{'Content-Type':'application/json','X-Friend-Token':token},body:JSON.stringify({name:'朋友',question:'三个月后你还会用吗？'})});
    assert.equal(asked.status,200);
    const view=await asked.json();
    assert.equal(view.questionAsked,true);
    assert.equal(view.question,'三个月后你还会用吗？');
    const ownerAfter=await fetch(base+'/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+ownerToken}});
    const ownerRoom=await ownerAfter.json();
    assert.equal(ownerRoom.questions[1].question,'三个月后你还会用吗？');
    assert.equal(ownerRoom.questions[1].name,'朋友');
  }finally{await new Promise(resolve=>server.close(resolve))}
});
test('HTTP owner authorization and friend response privacy',async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const created=await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,pack:'chinese',size:5})});
    assert.equal(created.status,201);
    const {room,ownerToken}=await created.json();
    assert.equal(room.pack,'chinese');
    assert.equal(room.seats.length,5);
    assert.equal((await fetch(base+'/api/rooms/'+room.id)).status,403);
    const result=await fetch(base+'/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+ownerToken}});
    assert.equal(result.status,200);
    assert.equal((await result.json()).ownerToken,undefined);
    assert.equal((await fetch(base+'/.env')).status,404);
    assert.equal((await fetch(base+'/api/unknown')).status,404);
  }finally{await new Promise(resolve=>server.close(resolve))}
});
