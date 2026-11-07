import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAchievements,achievementDefinitions} from '../public/achievements.js';

const answer = {answer:'我会认真考虑实际需要。'};
const council = (id,vote='买',extra={}) => ({id,decision:{vote},seats:['socrates','plato','aristotle'],answers:[answer,answer,answer],...extra});
const get = (ledger,id) => evaluateAchievements(ledger).find(item => item.id===id);

test('seven distinct medals start locked with bounded progress for a new citizen',()=>{
  const medals=evaluateAchievements();
  assert.equal(medals.length,7);
  assert.equal(new Set(medals.map(item=>item.icon)).size,7);
  assert.equal(new Set(achievementDefinitions.map(item=>item.symbol)).size,7);
  assert.ok(medals.every(item=>!item.unlocked&&item.progress===0));
  assert.deepEqual(evaluateAchievements({history:null,entries:null}),medals);
});
test('a room without a final decision grants no council, inquiry or friend achievement',()=>{
  const ledger={history:[{id:'draft',seats:['friend'],answers:Array(7).fill(answer)}]};
  assert.ok(evaluateAchievements(ledger).every(item=>!item.unlocked));
});
test('existing completed records count; seven answers accumulate across 3/5/7-seat councils',()=>{
  const ledger={history:[council('a'),council('b')]};
  assert.equal(get(ledger,'first-council').unlocked,true);
  assert.equal(get(ledger,'inquiry').progress,6);
  assert.equal(get(ledger,'inquiry').unlocked,false);
  ledger.history.push(council('c','买',{answers:[answer,{answer:'   '},null]}));
  assert.equal(get(ledger,'inquiry').total,7);
  assert.equal(get(ledger,'inquiry').unlocked,true);
});
test('a completed friend council uses preserved seats or a sealed friend ballot',()=>{
  assert.equal(get({history:[council('a','买',{seats:['socrates','friend','plato']})]},'fellowship').unlocked,true);
  assert.equal(get({history:[council('b','买',{ballots:[{source:'friend'}]})]},'fellowship').unlocked,true);
  assert.equal(get({history:[council('c')]},'fellowship').unlocked,false);
});
test('cooling-off survives confirmation of purchase or refusal',()=>{
  for(const vote of ['买','不买']){
    assert.equal(get({history:[council('a',vote,{originalDecision:{vote:'暂缓'}})]},'patience').unlocked,true);
  }
  assert.equal(get({history:[council('b','暂缓')]},'patience').unlocked,true);
  assert.equal(get({history:[council('c','不买')]},'restraint').unlocked,true);
});
test('bookkeeping counts three real income/expense entries, including automatic records',()=>{
  const entries=[{id:'a',kind:'income',amount:1000},{id:'b',kind:'expense',amount:50}];
  assert.equal(get({entries},'bookkeeper').unlocked,false);
  assert.equal(get({entries:[...entries,{kind:'other',amount:4},{kind:'income',amount:0}]},'bookkeeper').progress,2);
  entries.push({id:'c',kind:'expense',amount:25});
  assert.equal(get({entries},'bookkeeper').unlocked,true);
});
test('seven completed councils unlock the final medal without duplicate records inflating progress',()=>{
  const history=Array.from({length:6},(_,i)=>council(String(i)));
  assert.equal(get({history:[...history,history[0]]},'sevenfold').unlocked,false);
  history.push(council('six'));
  assert.equal(get({history},'sevenfold').unlocked,true);
  history.push(council('seven'));
  assert.equal(get({history},'sevenfold').progress,7);
  assert.equal(get({history},'sevenfold').total,8);
});
