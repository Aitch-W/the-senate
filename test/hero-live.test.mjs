import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/hero-live.js',import.meta.url),'utf8')
  .replace('export function initHeroLive','function initHeroLive');

function environment({fine=true,reduce=false,brokenPlate=false}={}) {
  class Element {
    constructor(){this.dataset={};this.children=[];this.events={};this.hidden=false;this.values={};this.classes=new Set();
      this.style={setProperty:(key,value)=>this.values[key]=value};
      this.classList={add:key=>this.classes.add(key),remove:key=>this.classes.delete(key),contains:key=>this.classes.has(key),
        toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};
    }
    setAttribute(){} appendChild(node){this.children.push(node)}
    querySelector(selector){return this.children.find(node=>node.className===selector.slice(1))||null}
    querySelectorAll(){return this.layers||[]}
    addEventListener(type,fn){this.events[type]=fn}
    getBoundingClientRect(){return{left:0,top:0,width:1000,height:600}}
  }
  const hero=new Element(),home=new Element(),pager=new Element(),root=new Element();pager.dataset.page='0';
  hero.layers=Array.from({length:3},()=>({decode:()=>brokenPlate?Promise.reject(Error('missing image')):Promise.resolve()}));
  const media=[{matches:reduce,addEventListener(type,fn){this.change=fn}},
    {matches:fine,addEventListener(type,fn){this.change=fn}}];
  const frames=new Map();let nextFrame=0,observer;
  const document={hidden:false,dialogOpen:false,documentElement:root,events:{},createElement:()=>new Element(),
    querySelector:selector=>selector==='.hero'?hero:document.dialogOpen?{}:null,
    querySelectorAll:()=>[],getElementById:id=>id==='home-view'?home:pager,
    addEventListener(type,fn){this.events[type]=fn}};
  const context=vm.createContext({document,matchMedia:query=>query.includes('reduced')?media[0]:media[1],
    MutationObserver:class{constructor(callback){observer=callback}observe(){}},
    requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame},cancelAnimationFrame:id=>frames.delete(id)});
  vm.runInContext(source,context);context.initHeroLive();
  return{hero,home,pager,root,document,frames,media,context,sync:()=>observer(),
    move:()=>hero.events.pointermove({pointerType:'mouse',clientX:900,clientY:500}),
    frame:()=>{const [id,callback]=frames.entries().next().value;frames.delete(id);callback(16)}};
}

test('ambient effects run only on the visible home screen, with no idle animation frame loop',()=>{
  const e=environment();assert(e.hero.classList.contains('ambient-running'));assert.equal(e.frames.size,0);
  e.pager.dataset.page='1';e.sync();assert(!e.hero.classList.contains('ambient-running'));
  e.pager.dataset.page='0';e.sync();assert(e.hero.classList.contains('ambient-running'));
  e.document.hidden=true;e.document.events.visibilitychange();assert(!e.hero.classList.contains('ambient-running'));
  e.document.hidden=false;e.document.events.visibilitychange();assert(e.hero.classList.contains('ambient-running'));
  e.home.hidden=true;e.sync();assert(!e.hero.classList.contains('ambient-running'));
});
test('opening a dialog or disabling motion cancels movement and resets the scene',()=>{
  const e=environment();e.move();assert.equal(e.frames.size,1);e.frame();assert.notEqual(e.hero.values['--mx'],'0.0000');
  e.document.dialogOpen=true;e.sync();assert.equal(e.frames.size,0);assert.equal(e.hero.values['--mx'],'0.0000');
  assert(!e.hero.classList.contains('ambient-running'));
  e.document.dialogOpen=false;e.sync();assert(e.hero.classList.contains('ambient-running'));
  e.root.classList.add('no-motion');e.sync();e.move();assert.equal(e.frames.size,0);assert(!e.hero.classList.contains('ambient-running'));
  e.root.classList.remove('no-motion');e.media[0].matches=true;e.media[0].change();assert(!e.hero.classList.contains('ambient-running'));
});
test('touch devices retain gentle atmosphere without mouse parallax, and initialization stays idempotent',()=>{
  const e=environment({fine:false});assert(e.hero.classList.contains('ambient-running'));e.move();assert.equal(e.frames.size,0);
  e.context.initHeroLive();assert.equal(e.hero.children.filter(node=>node.className==='hero-atmosphere').length,1);
});
test('a failed layer leaves the complete original painting fallback intact',async()=>{
  const e=environment({brokenPlate:true});await new Promise(setImmediate);
  assert(!e.hero.classList.contains('layers-ready'));
  const valid=environment();await new Promise(setImmediate);assert(valid.hero.classList.contains('layers-ready'));
});
