import {ANCHOR,DECK,SECTORS,anchors,forecast,receiver} from './core.mjs';

const T=window.THREE;
const SKINS={amber:0xefaa54,jade:0x65e4bf,copper:0xe98b67,rose:0xf489be};
const SITES=[
 {sky:0x29495c,rock:0x506270,soil:0x6a777d,crust:0xa8aa9e,beam:0x327e79,light:0xffd29b,far:0x364b60,star:0x97b8d1},
 {sky:0x33274c,rock:0x665885,soil:0x625c7f,crust:0xa5a0b8,beam:0x586c9b,light:0xf6bdad,far:0x4c4069,star:0xcfabd1},
 {sky:0x4c2b32,rock:0x6b484b,soil:0x7b5950,crust:0xb88e75,beam:0x844f3b,light:0xffc388,far:0x6f4449,star:0xe6ad92}
];
const UP=new T.Vector3(0,1,0);
const SHARED=new T.Vector3();
const mix=(a,b,u)=>a+(b-a)*u;
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function art(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'));return c}
function panel(w,h,d,r=.09){
 r=Math.min(r,w*.19,h*.19,d*.19);
 const x=w/2-r,y=h/2-r,shape=new T.Shape();
 shape.moveTo(-x,-y);shape.lineTo(x,-y);shape.lineTo(x,y);shape.lineTo(-x,y);shape.closePath();
 const geom=new T.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1});
 geom.translate(0,0,-(d-2*r)/2);return geom;
}
function soil(){
 return art(512,512,c=>{
  const n=rng(172);
  c.fillStyle='#a2a29b';c.fillRect(0,0,512,512);
  for(let i=0;i<4500;i++){
   const x=n()*512,y=n()*512,r=1+n()*4;
   c.fillStyle=i%3?'#323c4360':'#faf2d375';c.fillRect(x,y,r,.7+n()*2);
  }
  for(let i=0;i<16;i++){
   const x=n()*512,y=n()*512,r=8+n()*39;
   const grd=c.createRadialGradient(x-2,y-1,1,x,y,r);
   grd.addColorStop(0,'#27374288');grd.addColorStop(.7,'#3d444950');grd.addColorStop(.88,'#d8d8c07a');grd.addColorStop(1,'#99978e00');
   c.fillStyle=grd;c.fillRect(x-r,y-r,r*2,r*2);
  }
 });
}
function orbTexture(){
 return art(768,384,c=>{
  const n=rng(56),g=c.createLinearGradient(0,0,0,384);
  g.addColorStop(0,'#bdd7d5');g.addColorStop(.4,'#8ab4ba');g.addColorStop(1,'#466b90');
  c.fillStyle=g;c.fillRect(0,0,768,384);
  for(let i=0;i<40;i++){
   c.fillStyle=i%4?'#bfdcce22':'#4877824d';c.beginPath();c.ellipse(n()*768,n()*384,33+n()*78,3+n()*20,n()*.4,0,7);c.fill();
  }
  for(let i=0;i<1300;i++){c.fillStyle='#c3e2dd35';c.fillRect(n()*768,n()*384,n()*8,1)}
 });
}
export class Station{
 constructor(canvas){
  this.canvas=canvas;
  this.r=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  this.r.outputEncoding=T.sRGBEncoding;this.r.toneMapping=T.ACESFilmicToneMapping;this.r.toneMappingExposure=.85;
  this.s=new T.Scene();
  this.cam=new T.OrthographicCamera();this.cam.position.set(.32,4.42,12);this.cam.lookAt(0,2.52,0);
  this.hemi=new T.HemisphereLight(0xd7eeff,0x535f78,.67);this.s.add(this.hemi);
  this.key=new T.DirectionalLight(0xffd29b,1.12);this.key.position.set(-4,8,6);this.s.add(this.key);
  const rim=new T.DirectionalLight(0x8bcfe9,.54);rim.position.set(4,5,-7);this.s.add(rim);
  this.g=new Map();this.m={};
  const m=(n,c,rough=.68,metal=0)=>this.m[n]=new T.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
  m('slate',0x263840,.62,.25);m('iron',0x33454e,.47,.39);m('steel',0x9caaa8,.38,.35);m('gold',0xd4a568,.42,.34);
  m('ivory',0xdbcbb3,.48,.06);m('beam',0x327e79,.47,.19);m('hazard',0xdb9541,.55,.17);m('rubber',0x171e25);
  m('cloth',0xc07c51,.97);m('glass',0x20414b,.22,.32);m('reflect',0x72989c,.37,.24);
  m('skin',SKINS.amber,.43,.23);m('rock',0x506270);m('crust',0xa8aa9e);m('far',0x364b60);
  m('soil',0x6a777d,.96);this.m.soil.map=this.tex(soil());
  this.m.green=new T.MeshBasicMaterial({color:0xa6ffcd});this.m.red=new T.MeshBasicMaterial({color:0xff8351});
  this.m.rope=new T.MeshStandardMaterial({color:0xd5c6ad,roughness:.8});
  this.m.stripe=new T.MeshStandardMaterial({color:0x65513c,roughness:.85});
  this.m.marker=new T.MeshBasicMaterial({color:0xffba73,transparent:true,opacity:.75,depthWrite:false});
  this.m.trail=new T.MeshBasicMaterial({color:0xb3e0e2,transparent:true,opacity:.70,depthWrite:false});
  this.m.trim=new T.MeshBasicMaterial({color:0xaefad2});
  this.makeHorizon();
  this.makeDiorama();
  this.makeGantry();
  this.makeReceiver();
  this.makePod();
  this.makeRover();
  this.makeRelay();
  this.bakeStation();
  this.ropes=Array.from({length:2},()=>Array.from({length:12},(_,i)=>this.cyl(this.s,.031,.031,1,i%3?'rope':'stripe',0,0,0,6)));
  this.cutAt=[null,null];
  this.guides=Array.from({length:12},()=>this.sphere(this.s,.035,'trail',0,0,0,8));
  this.land=this.ring(this.s,.20,.23,'marker',0,.52,.46);this.land.rotation.x=-Math.PI/2;
  const geo=new T.BufferGeometry(),a=new Float32Array(90*3);geo.setAttribute('position',new T.BufferAttribute(a,3));
  this.fx=new T.Points(geo,new T.PointsMaterial({color:0xffc267,transparent:true,opacity:0,size:.095,depthWrite:false}));
  this.fx.frustumCulled=false;this.s.add(this.fx);this.bursts=[];
  this.lastSkin=null;this.lastSite=-1;this.resize();
 }
 tex(c){const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=Math.min(4,this.r.capabilities.getMaxAnisotropy());return t}
 mesh(parent,geo,m,x,y,z){const o=new T.Mesh(geo,typeof m==='string'?this.m[m]:m);o.position.set(x,y,z);parent.add(o);return o}
 group(parent,x,y,z){const a=new T.Group();a.position.set(x,y,z);parent.add(a);return a}
 box(g,w,h,d,m,x,y,z){
  const key=['b',w,h,d].join();if(!this.g.has(key))this.g.set(key,panel(w,h,d));
  return this.mesh(g,this.g.get(key),m,x,y,z);
 }
 cyl(g,a,b,h,m,x,y,z,n=16){
  const key=['c',a,b,h,n].join();if(!this.g.has(key))this.g.set(key,new T.CylinderGeometry(a,b,h,n));
  return this.mesh(g,this.g.get(key),m,x,y,z);
 }
 sphere(g,r,m,x,y,z,n=16){
  const key=['s',r,n].join();if(!this.g.has(key))this.g.set(key,new T.SphereGeometry(r,n,Math.max(6,n/2)));
  return this.mesh(g,this.g.get(key),m,x,y,z);
 }
 ring(g,a,b,m,x,y,z){return this.mesh(g,new T.RingGeometry(a,b,36),m,x,y,z)}
 bar(g,a,b,thick,m,z){
  const o=this.box(g,thick,Math.hypot(b[0]-a[0],b[1]-a[1]),thick,m,(a[0]+b[0])/2,(a[1]+b[1])/2,z);
  o.rotation.z=-Math.atan2(b[0]-a[0],b[1]-a[1]);return o;
 }
 decal(g,c,w,h,x,y,z,rotate=0){
  const m=new T.MeshBasicMaterial({map:this.tex(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const o=this.mesh(g,new T.PlaneGeometry(w,h),m,x,y,z);o.rotation.x=rotate;return o;
 }
 makeHorizon(){
  const n=rng(48);
  const coords=new Float32Array(160*3);
  for(let i=0;i<160;i++){coords[i*3]=(n()-.5)*27;coords[i*3+1]=n()*10-1;coords[i*3+2]=-17-n()*6}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(coords,3));
  this.stars=new T.Points(geo,new T.PointsMaterial({color:0xcee7e3,size:.065,opacity:.7,transparent:true}));
  this.s.add(this.stars);
  const mat=new T.MeshStandardMaterial({map:this.tex(orbTexture()),roughness:1});
  this.planet=this.sphere(this.s,1.82,mat,-3.25,6.1,-7,32);this.planet.rotation.z=.34;
  const halo=this.ring(this.s,1.85,1.91,new T.MeshBasicMaterial({color:0x7eaaa9,transparent:true,opacity:.38}),-3.25,6.1,-7.1);halo.rotation.y=.04;
  const mountains=new T.Group();this.s.add(mountains);
  for(let row=0;row<3;row++){
   const vertices=[],z=-12+row*2.0;
   let left=[-12,1.31+row*.25,z];
   for(let i=1;i<=27;i++){
    const right=[-12+i*.9,.44+n()*(1.75-row*.28),z+(n()-.5)*.85];
    vertices.push(...left,left[0],-.95,left[2],...right,...right,left[0],-.95,left[2],right[0],-.95,right[2]);
    left=right;
   }
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
   const mat=this.m.far.clone();mat.color.multiplyScalar(.18+row*.28);mat.side=T.DoubleSide;
   this.mesh(mountains,geo,mat,0,0,0);
  }
  const cometGeo=new T.BufferGeometry();cometGeo.setAttribute('position',new T.Float32BufferAttribute([2.22,6.73,-8,3.49,7.40,-8],3));
  const comet=new T.Line(cometGeo,new T.LineBasicMaterial({color:0x9bbfc3,transparent:true,opacity:.36}));this.s.add(comet);
 }
 makeDiorama(){
  const g=this.s,n=rng(75);
  this.box(g,7.65,.38,3.60,'rock',0,-.50,0);this.box(g,7.76,.15,3.53,'crust',0,-.27,0);
  this.box(g,7.80,.28,3.45,'rock',0,-.11,0);
  const land=this.mesh(g,new T.PlaneGeometry(7.70,3.36),'soil',0,.036,0);land.rotation.x=-Math.PI/2;
  this.box(g,7.28,.10,.05,'iron',0,-.42,1.81);
  for(let i=0;i<30;i++){
   const x=(n()-.5)*7.38,z=(n()-.5)*3.15,r=.055+n()*.19;
   if(Math.abs(x)<2.8&&Math.abs(z)<.79)continue;
   const p=this.mesh(g,new T.DodecahedronGeometry(r,0),i%3?'rock':'crust',x,r*.48,z);
   p.scale.y=.45+n()*.37;p.rotation.set(n(),n()*4,n());
  }
  const sign=art(400,112,c=>{
   c.fillStyle='#253c44';c.fillRect(0,0,400,112);c.strokeStyle='#c9ad79';c.lineWidth=4;c.strokeRect(7,7,386,98);
   c.font='bold 36px monospace';c.textAlign='center';c.fillStyle='#f8db9f';c.fillText('LUNAR SALVAGE',200,55);
   c.font='16px monospace';c.fillText('RECOVERY UNIT  /  M-08',200,84);
  });
  this.decal(g,sign,1.82,.51,0,-.20,1.845);
  for(const x of [-2.74,2.74])for(const z of [-1.1,1.1]){
   this.box(g,.55,.10,.42,'iron',x,.106,z);
   this.box(g,.42,.06,.34,'hazard',x,.17,z);
   for(const s of [-1,1])this.cyl(g,.036,.037,.02,'steel',x+s*.16,.21,z,8);
  }
 }
 makeGantry(){
  const g=this.s;
  const plate=art(256,64,c=>{c.fillStyle='#263b42';c.fillRect(0,0,256,64);c.strokeStyle='#b19367';c.lineWidth=2;c.strokeRect(3,3,250,58);c.fillStyle='#e2cc99';c.font='bold 25px monospace';c.textAlign='center';c.fillText('TETHER RIG',128,42)});
  for(const side of [-1,1]){
   const x=side*2.96;
   this.box(g,.66,.24,.90,'slate',x,.19,-.38);this.box(g,.53,.13,.81,'steel',x,.36,-.38);
   this.box(g,.31,4.99,.53,'beam',x,2.88,-.50);
   this.box(g,.12,4.67,.055,'steel',x-.07,2.89,-.204);
   for(const y of [.60,1.08,2.25,3.60,5.22]){
    this.box(g,.45,.17,.65,'iron',x,y,-.49);
    this.cyl(g,.052,.052,.046,'gold',x,y,-.139,8).rotation.x=Math.PI/2;
   }
   this.bar(g,[x,4.40],[x-side*.80,5.33],.17,'iron',-.46);
   this.bar(g,[x,1.33],[x-side*.48,.43],.17,'iron',-.46);
   this.box(g,.54,.25,.65,'gold',x,5.39,-.46);
   this.box(g,.20,.11,.17,'red',x,5.74,-.43);
  }
  this.box(g,6.37,.30,.54,'iron',0,5.67,-.44);
  this.box(g,6.29,.12,.67,'beam',0,5.88,-.44);
  this.box(g,6.17,.095,.47,'gold',0,5.46,-.43);
  for(let i=-9;i<=9;i++){
   this.box(g,.14,.15,.07,i%3?'slate':'steel',i*.31,5.67,-.126).rotation.z=-.20;
  }
  this.box(g,1.40,.32,.14,'slate',0,5.70,.01);this.decal(g,plate,1.24,.31,0,5.71,.091);
  this.pulleys=[];
  for(let i=0;i<2;i++){
   const p=this.group(g,0,ANCHOR,0);
   this.box(p,.38,.26,.32,'slate',0,.02,-.05);
   this.cyl(p,.121,.121,.075,'gold',0,.02,.15,16).rotation.x=Math.PI/2;
   this.cyl(p,.048,.049,.09,'iron',0,.02,.173,10).rotation.x=Math.PI/2;
   this.box(p,.23,.048,.07,'hazard',0,-.14,.064);
   this.pulleys.push(p);
  }
  const ladder=this.group(g,-3.35,0,-.44);
  for(const x of [-.10,.10])this.box(ladder,.04,4.3,.04,'iron',x,2.33,0);
  for(let i=0;i<14;i++)this.box(ladder,.22,.036,.047,'steel',0,.32+i*.30,0);
 }
 makeReceiver(){
  const g=this.s;
  this.box(g,5.50,.10,.76,'slate',0,.117,.03);
  for(const z of [-.22,.25])this.box(g,5.43,.055,.062,'steel',0,.186,z);
  for(let i=-11;i<=11;i++)this.box(g,.044,.037,.36,'iron',i*.23,.163,.014);
  this.bin=this.group(g,0,0,0);
  this.box(this.bin,1.77,.17,.81,'beam',0,.29,.01);
  this.box(this.bin,1.63,.11,.75,'rubber',0,.405,.01);
  this.box(this.bin,1.50,.047,.63,'glass',0,.474,.01);
  for(const x of [-.79,.79]){
   this.box(this.bin,.17,.28,.78,'gold',x,.44,.01);
   this.box(this.bin,.095,.033,.64,'green',x,.596,.01);
  }
  this.box(this.bin,1.53,.075,.14,'iron',0,.54,-.29);
  this.box(this.bin,1.48,.069,.14,'iron',0,.51,.35);
  for(let i=-4;i<=4;i++){
   const o=this.box(this.bin,.085,.031,.075,i%2?'rubber':'hazard',i*.145,.554,.35);o.rotation.y=.32;
  }
  this.lamps=Array.from({length:3},(_,i)=>this.box(this.bin,.075,.038,.034,'red',(i-1)*.12,.43,.428));
  this.flash=this.ring(this.bin,.46,.50,this.m.marker,0,.60,.02);this.flash.rotation.x=-Math.PI/2;this.flash.scale.x=1.6;
 }
 makePod(){
  const p=this.group(this.s,0,2.5,0);this.pod=p;
  this.cyl(p,.28,.31,.43,'skin',0,0,0,12);
  this.cyl(p,.16,.28,.20,'ivory',0,.28,0,12);
  this.cyl(p,.10,.16,.083,'steel',0,.408,0,12);
  this.cyl(p,.055,.055,.058,'gold',0,.464,0,12);
  this.cyl(p,.315,.302,.082,'slate',0,-.15,0,12);
  this.cyl(p,.302,.235,.125,'ivory',0,-.247,0,12);
  this.cyl(p,.19,.19,.052,'rubber',0,-.335,0,12);
  for(const x of [-.26,.26]){
   this.box(p,.11,.265,.16,'slate',x,-.047,.16);
   this.box(p,.048,.17,.040,'hazard',x,-.040,.256);
   this.cyl(p,.026,.026,.034,'steel',x,.085,.249,8).rotation.x=Math.PI/2;
  }
  this.box(p,.31,.20,.08,'iron',0,.046,.281);
  this.box(p,.253,.142,.04,'glass',0,.049,.328);
  this.box(p,.165,.026,.013,'reflect',-.019,.079,.354).rotation.z=.16;
  this.box(p,.035,.039,.013,'green',.071,.021,.354);
  const serial=art(128,48,c=>{c.fillStyle='#1c2b31';c.fillRect(0,0,128,48);c.fillStyle='#e0c895';c.font='bold 26px monospace';c.textAlign='center';c.fillText('M.08',64,32)});
  this.decal(p,serial,.157,.06,0,-.102,.311);
 }
 makeRover(){
  const g=this.group(this.s,3.21,.11,1.06);g.rotation.y=-.38;this.rover=g;
  for(const x of [-.27,.27])for(const z of [-.23,.23]){
   const wheel=this.cyl(g,.16,.16,.122,'rubber',x,.14,z,12);wheel.rotation.z=Math.PI/2;
   this.cyl(g,.08,.08,.135,'gold',x,.14,z,12).rotation.z=Math.PI/2;
  }
  this.box(g,.52,.19,.66,'iron',0,.29,0);
  this.box(g,.49,.36,.52,'ivory',0,.52,.02);
  this.box(g,.38,.20,.08,'glass',0,.56,.29);
  this.box(g,.28,.038,.03,'reflect',-.025,.61,.35);
  for(const x of [-.09,.09])this.box(g,.042,.047,.018,'green',x,.54,.35);
  this.box(g,.49,.10,.52,'beam',0,.74,.025);
  this.cyl(g,.018,.028,.29,'steel',.17,.93,-.08,8);
  this.sphere(g,.048,'red',.17,1.085,-.08,8);
  this.arm=this.group(g,-.285,.46,.08);
  this.box(this.arm,.11,.28,.12,'gold',0,-.1,0);
  this.box(this.arm,.145,.10,.18,'ivory',0,-.26,.027);
  this.box(this.arm,.085,.045,.10,'iron',0,-.31,.05);
  const tank=this.group(this.s,-3.20,.09,1.02);
  for(const x of [-.17,.17]){
   this.cyl(tank,.129,.147,.55,'beam',x,.31,0,12);
   this.cyl(tank,.075,.118,.125,'gold',x,.64,0,12);
   this.box(tank,.19,.12,.035,'hazard',x,.33,.131);
   this.cyl(tank,.07,.07,.022,'iron',x,.72,0,10);
  }
  this.box(tank,.72,.10,.43,'iron',0,.065,0);
 }
 makeRelay(){
  const g=this.group(this.s,3.58,0,-1.39);
  this.box(g,.62,.13,.53,'iron',0,.02,0);
  this.box(g,.17,.62,.19,'steel',0,.36,0);
  this.box(g,.34,.17,.25,'slate',0,.68,0);
  const panel=this.group(g,0,.79,0);panel.rotation.x=-.27;panel.rotation.y=-.38;
  this.box(panel,.93,.49,.06,'steel',0,0,0);
  for(let i=0;i<6;i++)for(let j=0;j<3;j++){
   const x=(i-2.5)*.133,y=(j-1)*.139;
   this.box(panel,.121,.123,.014,i%2?'glass':'reflect',x,y,.039);
  }
  const pipe=this.cyl(g,.022,.027,.32,'gold',.24,.25,.04,8);pipe.rotation.z=-.24;
 }
 bakeStation(){
  this.s.updateMatrixWorld(true);
  const fixed=new Set([this.planet,this.bin,this.pod,this.rover,...this.pulleys]);
  const buckets=new Map();
  const read=o=>{
   if(fixed.has(o))return;
   if(o.isMesh&&!o.material.transparent){
    const list=buckets.get(o.material)||[];
    list.push(o);buckets.set(o.material,list);return;
   }
   o.children.forEach(read);
  };
  this.s.children.forEach(read);
  for(const [mat,items] of buckets){
   if(items.length<2)continue;
   const pos=[],normal=[],uv=[],p=new T.Vector3(),n=new T.Vector3(),nm=new T.Matrix3();
   for(const item of items){
    const g=item.geometry,a=g.attributes,ids=g.index,nVert=ids?ids.count:a.position.count;
    nm.getNormalMatrix(item.matrixWorld);
    for(let i=0;i<nVert;i++){
     const j=ids?ids.getX(i):i;
     p.fromBufferAttribute(a.position,j).applyMatrix4(item.matrixWorld);
     n.fromBufferAttribute(a.normal,j).applyNormalMatrix(nm);
     pos.push(p.x,p.y,p.z);normal.push(n.x,n.y,n.z);uv.push(a.uv.getX(j),a.uv.getY(j));
    }
    item.removeFromParent();
   }
   const geom=new T.BufferGeometry();
   geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));
   geom.setAttribute('normal',new T.Float32BufferAttribute(normal,3));
   geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.computeBoundingSphere();
   this.mesh(this.s,geom,mat,0,0,0);
  }
 }
 resize(){
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
  this.r.setPixelRatio(Math.min(devicePixelRatio||1,1.55));this.r.setSize(w,h,false);
  const aspect=w/h,width=Math.max(8.08,7.04*aspect);
  this.cam.left=-width/2;this.cam.right=width/2;this.cam.top=width/aspect/2;this.cam.bottom=-width/aspect/2;this.cam.near=.1;this.cam.far=70;
  this.cam.updateProjectionMatrix();this.cam.updateMatrixWorld();
 }
 screen(x,y,z=0){
  SHARED.set(x,y,z).project(this.cam);
  return [(SHARED.x/2+.5)*this.canvas.clientWidth,(.5-SHARED.y/2)*this.canvas.clientHeight];
 }
 color(n,skin){
  if(n!==this.lastSite){
   const site=SITES[n];
   for(const key of ['rock','soil','crust','beam','far'])this.m[key].color.setHex(site[key]);
   this.m.far.color.multiplyScalar(.25);this.m.beam.color.convertSRGBToLinear();
   this.key.color.setHex(site.light);this.stars.material.color.setHex(site.star);
   this.canvas.parentElement.style.setProperty('--sky','#'+site.sky.toString(16).padStart(6,'0'));
   this.lastSite=n;
  }
  if(skin!==this.lastSkin){this.m.skin.color.setHex(SKINS[skin]||SKINS.amber).convertSRGBToLinear();this.lastSkin=skin}
 }
 emit(x,y,kind){
  this.bursts.push({x,y,kind,at:performance.now()});
  if(kind!=='cut')this.landingAt=performance.now();
  if(this.bursts.length>3)this.bursts.shift();
 }
 snap(id,x,y){this.cutAt[id]={x,y,at:performance.now()}}
 effects(now){
  this.bursts=this.bursts.filter(b=>now-b.at<720);
  const a=this.fx.geometry.attributes.position;
  for(let j=0;j<3;j++){
   const b=this.bursts[j];
   for(let i=0;i<30;i++){
    const k=j*30+i,q=i*2.399,t=b?(now-b.at)/1000:0;
    const v=(.41+i%6*.31)*t;
    if(b)a.setXYZ(k,b.x+Math.cos(q)*v,b.y+Math.sin(q)*v+.65*t-1.9*t*t,.33+Math.sin(q*3)*v*.48);
    else a.setXYZ(k,0,-100,0);
   }
  }
  a.needsUpdate=true;
  const b=this.bursts.at(-1);this.fx.material.opacity=b?1-(now-b.at)/720:0;
  this.fx.material.color.setHex(b?.kind==='miss'?0xfb8a59:b?.kind==='cut'?0xffd197:0xaff4cc);
 }
 draw(s,p,now){
  this.color(SECTORS[s.stage].site,p.skin);
  const t=now/1000,b=receiver(s),f=forecast(s),l=anchors(s);
  this.planet.rotation.y=t*.035;
  this.bin.position.x=b.x;
  this.flash.visible=!!f?.hit||s.outcome==='center'||s.outcome==='catch';
  this.m.marker.color.setHex(f?.hit||s.outcome==='center'||s.outcome==='catch'?0x9affe0:0xecc497);
  this.m.marker.opacity=.67+Math.sin(t*8)*.16;
  this.lamps.forEach(o=>o.material=f?.hit||s.outcome&&s.outcome!=='miss'?this.m.green:this.m.red);
  this.rover.rotation.z=Math.sin(t*2.3)*.035;
  this.arm.rotation.z=s.outcome&&s.outcome!=='miss'?-1.55+Math.sin(t*12)*.24:-.23;
  this.pod.visible=true;
  const missDrop=s.outcome==='miss'?Math.min(1,Math.max(0,(now-(this.landingAt??now-600))/475)):0;
  this.pod.position.set(s.x,s.y-.50*missDrop+(s.phase==='swing'?.025:0),0);
  this.pod.rotation.z=s.phase==='swing'?s.angle*.60:s.phase==='flight'?Math.atan(s.vx*.095)*-.81:s.outcome==='miss'?.73:0;
  for(let j=0;j<2;j++){
   this.pulleys[j].visible=j<l.length;this.pulleys[j].position.x=l[j]||0;
   const live=s.cables.includes(j),snap=this.cutAt[j],age=snap?(now-snap.at)/390:1;
   const retract=Math.max(0,1-age),visible=live||!!snap&&age<1;
   const dx=live?s.x-l[j]:(snap?.x-(l[j]||0))*retract*.70,dy=live?s.y+.44-ANCHOR:(snap?.y+.44-ANCHOR)*retract*.67,n=Math.hypot(dx,dy);
   this.ropes[j].forEach((o,i)=>{
    o.visible=visible;
    if(!visible)return;
    const u=(i+.5)/12;o.position.set((l[j]||0)+dx*u,ANCHOR+dy*u,.045);
    o.scale.y=n/12+.012;o.quaternion.setFromUnitVectors(UP,SHARED.set(dx,dy,0).normalize());
   });
  }
  this.land.visible=!!f;this.m.trail.color.setHex(f?.hit?0xa7f3d5:0xc9d5db);
  if(f)this.land.position.x=f.x;
  this.guides.forEach((o,i)=>{
   o.visible=!!f&&Math.abs(f.x)<7;
   if(!f)return;
   const d=f.dt*(i+1)/13;o.position.set(s.x+s.vx*d,s.y+s.vy*d-4.9*d*d,.078);o.scale.setScalar(1-.032*i);
  });
  this.effects(now);this.r.render(this.s,this.cam);
 }
}



