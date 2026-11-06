// Each capsule specifies its rest pose, anchor offsets and receiver track.
const pod=(x,angle,bin,span=0,dual=false)=>({x,angle,bin,span,dual});
export const SECTORS=[
 {name:'First Contact',site:0,misses:3,pods:[pod(-.8,0,-.8),pod(.85,-.56,.85)]},
 {name:'Dust Line',site:0,misses:3,pods:[pod(-.8,-.63,-.15),pod(.5,.58,-.14),pod(.2,-.63,1.43)]},
 {name:'Double Hitch',site:0,misses:4,pods:[pod(-.65,0,-1.50,0,true),pod(.6,0,1.50,0,true)]},
 {name:'Aurora Rail',site:1,misses:4,pods:[pod(.1,-.52,.25,.83),pod(-.6,.65,-.35,1.08),pod(.70,-.60,.65,.85)]},
 {name:'Blue Hour',site:1,misses:4,pods:[pod(-.58,0,-1.32,.44,true),pod(.50,0,1.39,.43,true),pod(.05,-.74,1.53)]},
 {name:'Ember Rise',site:2,misses:4,pods:[pod(.58,.78,-.80),pod(-.80,-.70,.88,.52),pod(.15,0,1.64,.32,true)]},
 {name:'Far Side Freight',site:2,misses:4,pods:[pod(.60,0,-1.10,.46,true),pod(-.65,0,1.22,.42,true),pod(.15,.79,-1.46,.41)]},
 {name:'Last Light',site:2,misses:4,pods:[pod(-.85,-.75,1.01,.51),pod(.74,.75,-1.23,.43),pod(-.14,0,1.65,.50,true),pod(.25,0,-1.61,.45,true)]}
];
export const G=9.8,DECK=.84,ANCHOR=5.48,LENGTH=2.86;
export const LIMIT=5.1;
const cap=(n,a,b)=>Math.min(b,Math.max(a,n));
const safeInt=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export const spec=s=>SECTORS[s.stage].pods[s.index];
export function profile(raw){
 return {stars:SECTORS.map((_,i)=>safeInt(raw?.stars?.[i],0,3)?raw.stars[i]:0),skin:['amber','jade','copper','rose'].includes(raw?.skin)?raw.skin:'amber',copper:raw?.copper===true,rose:raw?.rose===true,mute:raw?.mute===true};
}
export function unlocked(p){const i=p.stars.findIndex(x=>!x);return i<0?SECTORS.length-1:i}
export function available(p,skin){return skin==='amber'||(skin==='jade'&&p.stars.reduce((n,k)=>n+k,0)>=7)||(skin==='copper'&&p.copper)||(skin==='rose'&&p.rose)}
export function merge(p,q){
 return {...p,stars:p.stars.map((x,i)=>Math.max(x,q.stars[i])),copper:p.copper||q.copper,rose:p.rose||q.rose};
}
export function fresh(stage){
 const s={stage,index:0,miss:0,center:0,t:0,used:0,cables:[],angle:0,omega:0,x:0,y:0,vx:0,vy:0,phase:'swing',outcome:'',won:false};
 loadPod(s);return s;
}
function loadPod(s){
 const p=spec(s);s.t=0;s.phase='swing';s.outcome='';s.angle=p.angle;s.omega=0;s.vx=0;s.vy=0;
 s.cables=p.dual?[0,1]:[0];
 if(p.dual){s.x=p.x;s.y=ANCHOR-2.62}
 else{s.x=p.x+Math.sin(p.angle)*LENGTH;s.y=ANCHOR-Math.cos(p.angle)*LENGTH}
}
export function anchors(s){
 const p=spec(s);
 return p.dual?[p.x-1.12,p.x+1.12]:[p.x];
}
function length(s){return spec(s).dual?Math.hypot(1.12,2.62):LENGTH}
export function receiver(s,t=s.t){
 const p=spec(s);
 return {x:p.bin+p.span*Math.sin(t*1.30),half:p.span?.74:.77};
}
export function forecast(s){
 if(s.phase!=='swing'||s.cables.length!==1)return null;
 const dt=(s.vy+Math.sqrt(s.vy*s.vy+2*G*(s.y-DECK)))/G;
 const x=s.x+s.vx*dt,b=receiver(s,s.t+dt);
 return {x,dt,hit:Math.abs(x-b.x)<=b.half,center:Math.abs(x-b.x)<=b.half*.45};
}
export function cut(s,id){
 if(s.phase!=='swing'||!s.cables.includes(id))return false;
 s.cables=s.cables.filter(k=>k!==id);s.used++;
 if(!s.cables.length){s.phase='flight';return true}
 const x=anchors(s)[s.cables[0]];
 s.angle=Math.atan2(s.x-x,ANCHOR-s.y);s.omega=0;
 return true;
}
export function advance(s,dt){
 if(s.phase==='end'||s.phase==='landed'||!Number.isFinite(dt)||dt<=0)return '';
 s.t+=dt;
 if(s.phase==='swing'){
  if(s.cables.length!==1)return '';
  const l=length(s);
  s.omega+=(-G/l*Math.sin(s.angle)-.035*s.omega)*dt;
  s.angle+=s.omega*dt;
  s.x=anchors(s)[s.cables[0]]+Math.sin(s.angle)*l;s.y=ANCHOR-Math.cos(s.angle)*l;
  s.vx=Math.cos(s.angle)*l*s.omega;s.vy=Math.sin(s.angle)*l*s.omega;
  return '';
 }
 const endY=s.y+s.vy*dt-G*dt*dt/2;
 if(endY>DECK){
  s.x+=s.vx*dt;s.y=endY;s.vy-=G*dt;return '';
 }
 const d=(s.vy+Math.sqrt(Math.max(0,s.vy*s.vy+2*G*(s.y-DECK))))/G;
 s.x+=s.vx*d;s.y=DECK;s.vy=0;s.t-=dt-d;
 const r=receiver(s),delta=Math.abs(s.x-r.x);
 s.outcome=delta<=r.half*.45?'center':delta<=r.half?'catch':'miss';
 if(s.outcome==='center')s.center++;
 if(s.outcome==='miss')s.miss++;
 s.phase='landed';return s.outcome;
}
export function next(s){
 if(s.phase!=='landed')return false;
 const success=s.outcome!=='miss',sector=SECTORS[s.stage];
 if(success&&s.index+1===sector.pods.length||s.miss>=sector.misses){
  s.won=success;s.phase='end';return true;
 }
 if(success)s.index++;
 loadPod(s);return true;
}
export function stars(s){return s.won?1+Number(!s.miss)+Number(s.center>=Math.ceil(SECTORS[s.stage].pods.length/2)):0}
export function restore(v,p){
 if(!v||!safeInt(v.stage,0,unlocked(p)))return null;
 const sector=SECTORS[v.stage];
 if(!safeInt(v.index,0,sector.pods.length-1)||!safeInt(v.miss,0,sector.misses)||!safeInt(v.center,0,v.index+1)||!safeInt(v.used,0,10000))return null;
 if(!['swing','flight','landed','end'].includes(v.phase)||!Array.isArray(v.cables)||new Set(v.cables).size!==v.cables.length||v.cables.some(n=>!safeInt(n,0,spec(v).dual?1:0)))return null;
 if((v.phase==='swing')!==!!v.cables.length)return null;
 if(![v.t,v.x,v.y,v.vx,v.vy,v.angle,v.omega].every(Number.isFinite)||v.t<0||v.t>1e7||Math.abs(v.x)>30||v.y<DECK||v.y>15||Math.abs(v.vx)>20||Math.abs(v.vy)>30||Math.abs(v.angle)>Math.PI||Math.abs(v.omega)>10)return null;
 if(!['','center','catch','miss'].includes(v.outcome)||(v.phase==='landed'||v.phase==='end')!==!!v.outcome||typeof v.won!=='boolean')return null;
 if(v.won&&(v.phase!=='end'||v.index!==sector.pods.length-1||v.outcome==='miss')||v.phase==='end'&&!v.won&&v.miss!==sector.misses)return null;
 return {...v,cables:[...v.cables],t:cap(v.t,0,1e7)};
}

