import assert from 'node:assert/strict';
import {SECTORS,fresh,advance,forecast,cut,next,restore,profile,available,unlocked,merge,stars,receiver,anchors,ANCHOR,DECK} from './core.mjs';
import {TetherHost} from './sdk.mjs';
let checks=0;
const ok=(x,label)=>{assert(x,label);checks++};
const step=1/120, gold=profile();
function findWindow(s){
 if(s.cables.length===2){
  const possible=s.cables.map(id=>{
   const trial=structuredClone(s);cut(trial,id);
   for(let i=0;i<900;i++){
    if(forecast(trial).center)return {id,steps:i};
    advance(trial,step);
   }
   return {id,steps:Infinity};
  }).sort((a,b)=>a.steps-b.steps);
  ok(possible[0].steps<900,'genuine double-tether route');
  ok(cut(s,possible[0].id)&&s.cables.length===1&&s.phase==='swing','first cut changes the pendulum');
 }
 for(let i=0;i<900;i++){
  if(forecast(s).center)return true;
  advance(s,step);
 }
 return false;
}
for(const [i,sector] of SECTORS.entries()){
 ok(unlocked(gold)===i,'only earned sector available');
 const s=fresh(i);
 for(let n=0;n<sector.pods.length;n++){
  ok(s.index===n&&s.phase==='swing','new capsule loaded');
  ok(!!restore(JSON.parse(JSON.stringify(s)),gold),'between-capsule checkpoint restorable');
  ok(!cut(s,9)&&findWindow(s),'finite clean release window');
  const target=forecast(s);
  const [x,y]=[s.x,s.y],id=s.cables[0];
  ok(cut(s,id)&&s.phase==='flight'&&!cut(s,id),'a cut changes the actual state once');
  ok(s.x===x&&s.y===y,'no launch teleport');
  for(let k=0;k<40;k++)advance(s,step);
  const mid=restore(JSON.parse(JSON.stringify(s)),gold);
  assert.deepEqual(mid,s);checks++;
  while(s.phase==='flight')advance(s,step);
  while(mid.phase==='flight')advance(mid,step);
  assert.deepEqual(mid,s);checks++;
  ok(s.outcome==='center'&&Math.abs(s.x-target.x)<1e-9&&s.y===DECK,'preview matches actual physical landing');
  ok(next(s)&&!next(s),'only one advance per touchdown');
 }
 ok(s.won&&stars(s)===3,'gold route '+sector.name);
 gold.stars[i]=stars(s);
}
ok(unlocked(gold)===7&&available(gold,'jade'),'campaign and jade unlocked');
const lost=fresh(1);
for(let i=0;i<SECTORS[1].misses;i++){
 while(forecast(lost).hit)advance(lost,step);
 ok(cut(lost,0),'can cut outside receiver window');
 while(lost.phase==='flight')advance(lost,step);
 ok(lost.outcome==='miss'&&lost.miss===i+1,'actual misses use spares');
 next(lost);
}
ok(lost.phase==='end'&&!lost.won&&!stars(lost),'failure reached by actual missed landings');
ok(!restore({...lost,cables:[0]},gold)&&!restore({...lost,index:NaN},gold),'bad checkpoints rejected');
const double=fresh(2),initial=[double.x,double.y];
advance(double,step);ok(initial[0]===double.x&&initial[1]===double.y,'two intact cables hold the pod');
cut(double,1);advance(double,step);ok(Math.abs(double.x-anchors(double)[0])>1&&double.y<ANCHOR,'single cable has valid anchor and length');
const moving=fresh(3);ok(receiver(moving,1).x!==receiver(moving,0).x,'later receiver moves along the rail');
ok(merge(gold,profile({rose:true})).rose,'cloud merge keeps own unlocks');
const tick=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};
function env(neonlib){
 const timers=new Map();let seq=0;
 return {neonlib,timers,setTimeout(fn){timers.set(++seq,fn);return seq},clearTimeout(id){timers.delete(id)}};
}
let start=0,end=0,off=0,l,c,support={},rewards=0,stored=[];
const p=profile(),e=env();
const make=()=>new TetherHost(e,{
 status:v=>support=v,
 reward:k=>{if(!p[k]){p[k]=true;rewards++}}
});
const h=make(),r=fresh(0);
h.connect();ok(!start,'absent SDK does not start idle station');
cut(r,0);h.start();
e.neonlib={};h.connect();
Object.assign(e.neonlib,{
 gameStart(){start++},gameOver(){end++},
 onLike:async fn=>{l=fn;return {code:0,data:{unsubscribe(){off++}}}},
 onComment:async fn=>{c=fn;return {code:0,data:{unsubscribe(){off++}}}},
 loadUserGameState:async()=>({}),
 saveUserGameState:async v=>stored.push(v)
});
h.connect();await tick();
ok(start===1&&support.copper&&support.rose,'same-object late SDK starts only active round and enables both callbacks');
l({project_id:'0042',status:false,count:9});c({project_id:42,content:'invalid'});c({project_id:'0042'});
ok(rewards===0,'unlike and invalid comment rejected');
l({project_id:'00000000000000000000042',status:true,count:0});c({project_id:'0042',content:'',count:0});
l({project_id:'0042',status:true});c({project_id:'0042',content:'again'});
ok(rewards===2&&profile(JSON.parse(JSON.stringify(p))).rose,'direct callbacks, image-only content, string ID, durable reward guard');
while(r.phase==='flight')advance(r,step);
next(r);
h.save({game:'moon-tether',v:1,profile:p,run:r});await tick();
ok(stored.at(-1).run.index===1&&stored.at(-1).game==='moon-tether','actual per-game checkpoint passed directly');
h.stop();ok(off===2,'unsubscribe on exit');
const resumed=make(),after=restore(stored.at(-1).run,p);resumed.connect();await tick();
ok(start===1&&after.phase==='swing'&&after.used>0,'saved progress reload waits for a real cut');
findWindow(after);if(cut(after,0))resumed.start();resumed.start();
while(after.phase==='flight')advance(after,step);
next(after);if(after.phase==='end')resumed.end();resumed.end();
ok(after.won&&start===2&&end===1,'resumed cut opens one session and final catch ends once');
resumed.stop();ok(off===4,'both renewed subscriptions released');
let resolve,unsub=0;
const late=new TetherHost(env({onLike:()=>new Promise(r=>resolve=r)}));late.connect();late.stop();
resolve({code:0,data:{unsubscribe(){unsub++}}});await tick();
ok(unsub===1,'registration that completes after close unsubscribes');
let overwritten=0;
const hanging=env({loadUserGameState:()=>new Promise(()=>{}),saveUserGameState(){overwritten++},onComment:()=>new Promise(r=>resolve=r)});
const timeout=new TetherHost(hanging);
timeout.connect();timeout.save({game:'moon-tether'});
for(const fn of [...hanging.timers.values()])fn();
resolve({code:0,data:{unsubscribe(){unsub++}}});await tick();timeout.stop();
ok(unsub===2&&!overwritten,'timeout does not retain subscription or overwrite unknown cloud');
const bad=new TetherHost(env({
 gameStart(){throw Error('unsupported')},gameOver(){return Promise.reject(Error('unsupported'))},
 onLike:()=>Promise.reject(Error('unsupported')),onComment:async()=>({code:-6}),
 loadUserGameState:async()=>({game:'foreign'}),saveUserGameState(){overwritten++}
}));
bad.connect();bad.start();bad.end();bad.save({game:'moon-tether'});await tick();bad.stop();
ok(!overwritten,'throw/rejection and foreign save isolated');
console.log('PASS '+checks+' gameplay, reload, and GameWave mock checks');
