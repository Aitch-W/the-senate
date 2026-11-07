import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {packs} from '../public/council.js';
import {seatPositions, previewPositions} from '../public/seat-layout.js';

const proposal={product:'学习耳机',price:800,cash:6000,reason:'每天学习使用'};
for(const size of [3,5,7]){
  test(`${size} seats have exactly one centre and mirrored pairs in both views`,()=>{
    for(const layout of [seatPositions,previewPositions]){
      const points=layout(size);
      assert.equal(points.length,size);
      assert.equal(points.filter(([x])=>x===50).length,1);
      points.forEach(([x,y],i)=>{
        const opposite=points[size-1-i];
        assert.ok(Math.abs(x+opposite[0]-100)<0.01);
        assert.equal(y,opposite[1]);
      });
    }
  });
  for(const pack of ['roman','chinese']){
    test(`${pack} ${size} seats work without dragging any friend`,()=>{
      const r=e.createRoom({...proposal,pack,size});
      e.start(r);
      assert.equal(r.friends.length,0);
      for(let i=0;i<size;i++){
        assert.ok(r.questions[i].question);
        assert.ok(packs[pack].members.some(m=>m.id===r.questions[i].roleId));
        e.answer(r,{index:i,answer:'每天学习使用，预算充足。'});
      }
      e.deliberate(r);
      assert.equal(r.state,'VOTE_FINISHED');
      assert.equal(e.ownerView(r).ballots.length,size);
      e.decide(r,{vote:'不买'});
      e.rooms.delete(r.id);
    });
  }
}
test('multiple friends can ask early, but no question or answer may be bypassed',()=>{
  const r=e.createRoom({...proposal,pack:'chinese',size:3,seats:['friend','kongzi','friend']});
  e.start(r);
  const [first,last]=r.friends;
  const ballot={name:'朋友',opinion:'建议等等',vote:'暂缓'};
  assert.throws(()=>e.friendVote(r,first.token,ballot),/等待质询结束/);
  e.friendAsk(r,last.token,{name:'后席好友',question:'如果下个月再买呢？'});
  assert.equal(r.questions[0].question,null);
  assert.throws(()=>e.answer(r,{index:0,answer:'不能跳过'}),/等待好友/);
  assert.throws(()=>e.deliberate(r),/全部质询/);
  e.friendAsk(r,first.token,{name:'前席好友',question:'已经有替代品了吗？'});
  assert.throws(()=>e.deliberate(r),/全部质询/);
  for(let i=0;i<3;i++)e.answer(r,{index:i,answer:'我会认真考虑。'});
  e.deliberate(r);
  assert.deepEqual(e.ownerView(r).ballots,[]);
  e.friendVote(r,first.token,ballot);
  assert.equal(r.state,'WAIT_FRIEND_SUBMIT');
  assert.deepEqual(e.ownerView(r).ballots,[]);
  e.friendVote(r,last.token,ballot);
  assert.equal(r.state,'VOTE_FINISHED');
  assert.equal(r.answers[2].question,'如果下个月再买呢？');
  e.rooms.delete(r.id);
});
