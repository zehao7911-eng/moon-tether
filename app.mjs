import {SECTORS,ANCHOR,DECK,profile,merge,unlocked,available,restore,fresh,spec,anchors,receiver,forecast,cut,advance,next,stars} from './core.mjs';
import {Station} from './view.mjs';
import {TetherHost} from './sdk.mjs';

const $=id=>document.getElementById(id),key='moon-tether-v1',stage=$('stage'),dialog=$('modal'),content=$('content');
let saved;
try{saved=JSON.parse(localStorage.getItem(key))}catch{}
let p=profile(saved?.profile);
let restored=restore(saved?.run,p),s=restored||fresh(unlocked(p)),hasLocal=!!restored;
let audio,slow=saved?.slow===true,view,flat,active=$('scene'),host,status={},pause=false,suspended=false,modalKind='',landDelay=0;
let previous=0,pointer=null,recent=false,acc=0,raf=0,lastHud='';
try{view=new Station(active)}catch{
 active.hidden=true;active=$('flat');active.hidden=false;flat=active.getContext('2d');
}
function packet(){return {game:'moon-tether',v:1,profile:p,run:s,slow}}
function save(){
 hasLocal=true;
 try{localStorage.setItem(key,JSON.stringify(packet()))}catch{}
 host?.save(packet());
}
function tone(kind){
 if(p.mute)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audio??=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
  const notes={cut:[525,305],miss:[145,101],catch:[370,550,737],center:[387,580,772,1160],win:[440,554,660,880],toggle:[330]}[kind];
  notes.forEach((f,i)=>{
   const t=audio.currentTime+.052*i,g=audio.createGain(),o=audio.createOscillator();
   o.type=kind==='miss'||kind==='cut'?'triangle':'sine';
   o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.79,t+.19);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.1,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
   o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.23);
  });
 }catch{}
}
function resize(){
 if(view)view.resize();
 else{active.width=Math.max(1,active.clientWidth);active.height=Math.max(1,active.clientHeight)}
 paint(performance.now());
}
function flatScale(){return Math.min(active.width/8.1,active.height/7)}
function point(x,y,z=0){
 if(view)return view.screen(x,y,z);
 const scale=flatScale();return [active.width/2+x*scale,active.height/2+(2.5-y)*scale]
}
function flatPaint(){
 const c=flat,r=receiver(s),f=forecast(s);
 const part=(x,y,w,h,color)=>{
  const [a,b]=point(x-w/2,y+h/2),k=flatScale();
  c.fillStyle=color;c.fillRect(a,b,w*k,h*k);
 };
 c.clearRect(0,0,active.width,active.height);
 const a=point(0,6.3);c.fillStyle='#e9d4a6';c.beginPath();c.arc(a[0]-70,a[1],25,0,7);c.fill();
 part(0,-.33,7.8,.58,'#455766');part(0,5.65,6.3,.24,'#b39871');
 for(const side of [-1,1])part(side*3,2.88,.23,5.35,'#548881');
 part(0,.16,5.65,.13,'#5e6e76');part(r.x,.32,1.55,.30,f?.hit?'#7bcc9b':'#b08852');
 c.lineWidth=3;c.strokeStyle='#e1ca9a';
 for(const id of s.cables){
  const a=point(anchors(s)[id],ANCHOR),b=point(s.x,s.y+.44);
  c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();
 }
 if(f)for(let i=1;i<=12;i++){
  const d=f.dt*i/13;part(s.x+s.vx*d,s.y+s.vy*d-4.9*d*d,.055,.055,f.hit?'#a7f3d5':'#a4bac3');
 }
 if(s.phase!=='end'){
  part(s.x,s.y,.54,.62,p.skin==='jade'?'#65e4bf':p.skin==='rose'?'#f489be':p.skin==='copper'?'#e98b67':'#d6a660');
  part(s.x,s.y+.07,.32,.16,'#344c56');
 }
}
function paint(now){
 if(view)view.draw(s,p,now);
 else if(flat)flatPaint();
}
function hud(){
 const level=SECTORS[s.stage], f=forecast(s), two=spec(s).dual, cutting=s.phase==='swing'&&!pause&&!dialog.open;
 const signature=[s.stage,s.index,s.miss,s.phase,s.outcome,s.cables.join(''),!!f?.hit,cutting,slow,p.mute,p.stars.join('')].join('|');
 if(signature===lastHud)return;lastHud=signature;
 $('chapter').textContent=['TRANQUILITY BASIN','AURORA RIDGE','EMBER CRATER'][level.site]+'  /  '+String(s.stage+1).padStart(2,'0');
 $('sector').textContent=level.name;
 const count=s.index+Number(s.outcome==='center'||s.outcome==='catch');
 $('pods').textContent=count+' / '+level.pods.length;
 $('spares').textContent=String(level.misses-s.miss);
 $('stars').textContent='★ '+p.stars.reduce((a,b)=>a+b,0)+' / '+SECTORS.length*3;
 $('right').hidden=!two;
 $('leftText').textContent=two?'Cut left':'Cut cable';
 for(const id of [0,1]){
  const el=$(id?'right':'left');el.disabled=!cutting||!s.cables.includes(id);
  el.classList.toggle('ready',!!f?.hit&&!el.disabled);
 }
 $('focus').setAttribute('aria-pressed',String(slow));
 $('sound').textContent=p.mute?'×':'♪';$('sound').setAttribute('aria-label',p.mute?'Unmute sound':'Mute sound');
 $('cue').dataset.hot=String(!!f?.hit);
 $('cue').textContent=s.phase==='end'?'Sector closed':s.phase==='flight'?'Capsule in flight':s.phase==='landed'?'Receiver check':s.cables.length===2?'Cut one cable to start the swing':f?.hit?'IN RANGE  ·  CUT NOW':'Wait for the trail to turn mint';
}
function cutCable(id){
 if(pause||dialog.open||!cut(s,id))return false;
 host.start();recent=true;view?.snap(id,s.x,s.y);
 view?.emit(s.x*.45+(anchors(s)[id]||0)*.55,(s.y+ANCHOR)/2,'cut');
 $('impact').textContent='';
 tone('cut');navigator.vibrate?.(9);save();hud();return true;
}
function segmentDistance(p,a,b){
 const x=b[0]-a[0],y=b[1]-a[1],den=x*x+y*y;
 const u=den?Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/den)):0;
 return Math.hypot(p[0]-a[0]-u*x,p[1]-a[1]-u*y);
}
function intersects(a,b,c,d){
 const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
}
function spot(e){const rect=active.getBoundingClientRect();return [e.clientX-rect.left,e.clientY-rect.top]}
function probe(a,b){
 if(!pointer||pointer.cut||s.phase!=='swing')return;
 let nearest=null,dist=Infinity;
 for(const id of s.cables){
  const top=point(anchors(s)[id],ANCHOR,.04),bottom=point(s.x,s.y+.44,.04);
  const d=intersects(a,b,top,bottom)?0:Math.min(segmentDistance(b,top,bottom),segmentDistance(a,top,bottom),segmentDistance(top,a,b),segmentDistance(bottom,a,b));
  if(d<dist){dist=d;nearest=id}
 }
 if(nearest!==null&&dist<16)pointer.cut=cutCable(nearest);
}
active.addEventListener('pointerdown',e=>{
 if(!e.isPrimary||e.button!==0||pause||dialog.open)return;
 pointer={id:e.pointerId,last:spot(e),cut:false};active.setPointerCapture(e.pointerId);
});
active.addEventListener('pointermove',e=>{
 if(pointer?.id!==e.pointerId)return;
 const now=spot(e);probe(pointer.last,now);pointer.last=now;
});
active.addEventListener('pointerup',e=>{if(pointer?.id===e.pointerId){probe(pointer.last,spot(e));pointer=null}});
active.addEventListener('pointercancel',()=>pointer=null);
active.addEventListener('lostpointercapture',()=>pointer=null);
$('left').onclick=()=>cutCable(0);$('right').onclick=()=>cutCable(1);
$('focus').onclick=()=>{slow=!slow;save();hud();tone('toggle')};
$('sound').onclick=()=>{p.mute=!p.mute;save();hud();if(!p.mute)tone('toggle')};
function open(kind,title,body){
 modalKind=kind;pointer=null;pause=true;hud();
 content.replaceChildren();
 const head=document.createElement('div');head.className='dialog-head';
 const h=document.createElement('h2');h.textContent=title;
 const close=document.createElement('button');close.textContent='Close';close.onclick=()=>dialog.close();
 head.append(h,close);content.append(head,body);
 if(!dialog.open)dialog.showModal();
}
function actions(items){
 const row=document.createElement('div');row.className='actions';
 for(const [name,fn,primary] of items){
  const b=document.createElement('button');b.textContent=name;b.onclick=fn;if(primary)b.className='primary';row.append(b);
 }
 return row;
}
function restart(i){
 host.end();s=fresh(i);recent=false;landDelay=0;suspended=false;acc=0;
 $('impact').textContent='';if(dialog.open)dialog.close();
 pause=false;save();hud();
}
function choose(i){
 if(i>unlocked(p))return;
 if(s.phase!=='end'&&s.used){
  const wrap=document.createElement('div');wrap.textContent='Switch sectors and leave this recovery?';
  wrap.append(actions([['Keep current sector',()=>dialog.close()],['Switch sector',()=>restart(i),true]]));
  open('confirm','Change sector',wrap);return;
 }
 restart(i);
}
function chart(){
 const wrap=document.createElement('div'),grid=document.createElement('div');grid.className='chartgrid';
 SECTORS.forEach((k,i)=>{
  const b=document.createElement('button'),n=document.createElement('span'),l=document.createElement('span'),sub=document.createElement('small');
  n.textContent=String(i+1).padStart(2,'0');l.textContent=k.name;
  b.disabled=i>unlocked(p);sub.textContent=p.stars[i]?'★'.repeat(p.stars[i]):b.disabled?'Locked':'Ready';
  l.append(sub);b.append(n,l);b.onclick=()=>i===s.stage&&s.phase!=='end'?dialog.close():choose(i);grid.append(b);
 });
 wrap.append(grid);
 const skins=document.createElement('div');skins.className='skins';
 for(const [id,name] of [['amber','Amber'],['jade','Jade · 7★'],['copper','Copper'],['rose','Rose']]){
  const b=document.createElement('button');b.textContent=name;b.disabled=!available(p,id);b.setAttribute('aria-pressed',String(p.skin===id));
  b.onclick=()=>{p.skin=id;save();paint(performance.now());chart()};skins.append(b);
 }
 wrap.append(skins);
 const tips=[];
 if(!p.copper&&status.copper)tips.push('Like on GameWave to unlock Copper.');
 if(!p.rose&&status.rose)tips.push('Leave a direct comment on GameWave to unlock Rose.');
 if(tips.length){const t=document.createElement('p');t.className='gifts';t.textContent=tips.join(' ');wrap.append(t)}
 open('chart','Sector chart',wrap);
}
function paused(){
 if(s.phase==='end'){result();return}
 const wrap=document.createElement('div');wrap.textContent='The station is paused. Your recovery is saved.';
 wrap.append(actions([['Sector chart',chart],['Resume',()=>dialog.close(),true]]));save();open('pause','Hold position',wrap);
}
function result(){
 const wrap=document.createElement('div'),receipt=document.createElement('div'),medals=document.createElement('div'),stats=document.createElement('p');
 receipt.className='receipt';medals.className='medals';
 const score=stars(s),recover=s.index+Number(s.won);
 medals.textContent='★'.repeat(score)+'☆'.repeat(3-score);
 stats.textContent=recover+' / '+SECTORS[s.stage].pods.length+' recovered  ·  '+s.center+(s.center===1?' clean catch':' clean catches');
 receipt.append(medals,stats);wrap.append(receipt);
 const options=[['Sector chart',chart],['Retry',()=>restart(s.stage),!s.won]];
 if(s.won&&s.stage<SECTORS.length-1)options.push(['Next sector →',()=>restart(s.stage+1),true]);
 wrap.append(actions(options));
 open('result',s.won?(s.stage===SECTORS.length-1?'Station restored':'Sector secured'):'Out of spares',wrap);
}
$('chart').onclick=chart;$('pause').onclick=paused;
dialog.addEventListener('close',()=>{
 modalKind='';pause=false;pointer=null;acc=0;
 if(suspended){suspended=false;if(s.phase==='flight')host.start()}
 hud();
});
function onLanding(outcome){
 tone(outcome);navigator.vibrate?.(outcome==='miss'?24:[12,23,14]);
 view?.emit(s.x,DECK,outcome);
 $('impact').textContent=outcome==='center'?'CLEAN CATCH':outcome==='catch'?'RECOVERED':'MISSED';
 $('impact').classList.toggle('miss',outcome==='miss');
 const terminal=outcome==='miss'?s.miss>=SECTORS[s.stage].misses:s.index+1===SECTORS[s.stage].pods.length;
 if(terminal){
  next(s);
  if(s.won)p.stars[s.stage]=Math.max(p.stars[s.stage],stars(s));
  host.end();
 }
 landDelay=.75;save();hud();
}
function afterLanding(){
 $('impact').textContent='';
 if(s.phase==='end'){if(s.won)tone('win');result();return}
 next(s);save();hud();
}
function frame(now){
 raf=requestAnimationFrame(frame);
 const dt=Math.min(.09,(now-previous)/1000);
 if(dt<1/32)return;
 previous=now;
 if(document.hidden)return;
 if(!pause&&!dialog.open){
  if(landDelay){landDelay=Math.max(0,landDelay-dt);if(!landDelay)afterLanding()}
  else{
   acc+=dt*(slow?.53:1);
   while(acc>=1/120){
    acc-=1/120;const event=advance(s,1/120);
    if(event){onLanding(event);acc=0;break}
   }
  }
  hud();
 }
 if(!dialog.open||raf%5===0)paint(now);
}
host=new TetherHost(window,{
 reward:k=>{
  if(!['copper','rose'].includes(k)||p[k])return;
  p[k]=true;save();tone('toggle');if(modalKind==='chart')chart();
 },
 status:v=>{status=v;if(modalKind==='chart')chart()},
 load:v=>{
  p=merge(p,profile(v.profile));
  if(!hasLocal&&!recent){
   const cloud=restore(v.run,p);
   s=cloud||fresh(unlocked(p));
   if(s.phase==='flight'||s.phase==='landed'){suspended=true;if(s.phase==='landed')landDelay=.32;paused()}
   if(s.phase==='end')result();
  }
  save();hud();paint(performance.now());
 }
});
if(!available(p,p.skin))p.skin='amber';
host.poll();
window.addEventListener('pagehide',()=>{save();host.stop()});
window.addEventListener('pageshow',e=>{if(e.persisted){host.alive=true;host.sdk=null;host.loadSeen=new WeakSet();host.poll()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=null;if(!dialog.open&&s.phase!=='end')paused()}});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!dialog.open){e.preventDefault();paused();return}
 if(dialog.open||e.repeat||e.target instanceof HTMLButtonElement)return;
 if(e.key==='1'||e.key===' '){e.preventDefault();cutCable(0)}
 if(e.key==='2'){e.preventDefault();cutCable(1)}
});
new ResizeObserver(resize).observe(stage);
resize();hud();requestAnimationFrame(frame);
if(s.phase==='end')result();
else if(s.phase==='flight'||s.phase==='landed'){suspended=true;if(s.phase==='landed')landDelay=.32;paused()}


