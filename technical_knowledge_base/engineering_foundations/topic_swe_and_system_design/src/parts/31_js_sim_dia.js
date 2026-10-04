// ---- Scale simulator: the system diagram. Boxes coloured by utilisation, queues drawn from Little's law, dots for requests in flight.
(function(){
const NS='http://www.w3.org/2000/svg';
const host=document.getElementById('sm-svg');if(!host)return;
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
let W=0,Hh=0,narrow=false,svg=null,nodes={},edges=[],dots=[],last=null,playing=!RM,vis=false,raf=0,t0=0,tt=0;
const POS={
 wide:{users:[.065,.5],lb:[.2,.5],app:[.37,.5],cache:[.62,.12],prim:[.62,.37],rep:[.87,.37],queue:[.62,.62],work:[.87,.62],gpu:[.62,.87]},
 narrow:{users:[.5,.055],lb:[.5,.18],app:[.5,.32],cache:[.26,.5],gpu:[.74,.5],prim:[.26,.68],rep:[.74,.68],queue:[.26,.86],work:[.74,.86]}};
const EDGES=[['users','lb'],['lb','app'],['app','cache'],['app','prim'],['app','rep'],['prim','rep'],['app','queue'],['queue','work'],['app','gpu']];
const el=(n,a,p)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
function layout(){
  const w=Math.round(host.getBoundingClientRect().width||host.parentNode.clientWidth||600);
  if(w===W&&svg)return false;W=w;narrow=W<720;Hh=narrow?600:340;
  host.innerHTML='';svg=el('svg',{viewBox:`0 0 ${W} ${Hh}`,width:W,height:Hh,role:'img','aria-label':'System diagram: users, load balancer, app servers, cache, database, queue, workers and GPU pool, coloured by how busy each is'},host);
  const P=narrow?POS.narrow:POS.wide;const bw=narrow?Math.min(160,W*0.44):Math.min(134,W*0.15),bh=narrow?50:54;
  const gE=el('g',{},svg),gD=el('g',{},svg),gN=el('g',{},svg);
  const bwOf=k=>k==='users'&&!narrow?Math.min(bw,W*0.11):bw;
  // edges as polylines: straight within a row, an elbow through the gap between columns otherwise
  edges=EDGES.map(([a,b])=>{const A=P[a],B=P[b];const ax=A[0]*W,ay=A[1]*Hh,bx=B[0]*W,by=B[1]*Hh;let pts;
    if(Math.abs(ay-by)<1||Math.abs(ax-bx)<1&&!(a==='app'&&narrow))pts=[[ax,ay],[bx,by]];
    else if(narrow){const sx=W/2;pts=[[ax,ay+bh/2],[sx,ay+bh/2+14],[sx,by],[bx+(bx<sx?bwOf(b)/2:-bwOf(b)/2),by]];if(Math.abs(bx-sx)<1)pts=[[ax,ay],[bx,by]]}
    else{const mx=(ax+bwOf(a)/2+(B[0]*W-bwOf(b)/2))/2;pts=[[ax,ay],[mx,ay],[mx,by],[bx,by]]}
    const ln=el('polyline',{points:pts.map(q=>q.join(',')).join(' '),fill:'none',stroke:'var(--dim)','stroke-width':1.5,'stroke-linejoin':'round'},gE);
    const seg=[];let L=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);L+=d}
    return{a,b,pts,seg,L,ln,n:0,col:'var(--acc)',rate:0}});
  nodes={};
  Object.keys(P).forEach(k=>{const cx=P[k][0]*W,cy=P[k][1]*Hh;const w=k==='users'&&!narrow?Math.min(bw,W*0.11):bw;
    const g=el('g',{},gN);
    const r=el('rect',{x:cx-w/2,y:cy-bh/2,width:w,height:bh,rx:8,class:'bx'},g);
    const t1=el('text',{x:cx,y:cy-bh/2+16,'text-anchor':'middle','font-weight':600},g);
    const t2=el('text',{x:cx,y:cy-bh/2+31,'text-anchor':'middle',fill:'var(--mute)'},g);
    const tr=el('rect',{x:cx-w/2+8,y:cy+bh/2-13,width:w-16,height:6,rx:3,fill:'var(--soft)'},g);
    const fl=el('rect',{x:cx-w/2+8,y:cy+bh/2-13,width:0,height:6,rx:3},g);
    const q=el('g',{},g);
    nodes[k]={cx,cy,w,h:bh,r,t1,t2,tr,fl,q,g};
  });
  dots=[];for(let i=0;i<EDGES.length*9;i++){dots.push(el('circle',{r:2.6,fill:'var(--acc)',opacity:0},gD))}
  return true;
}
function setNode(k,title,sub,rho,lq,on){
  const n=nodes[k];n.t1.textContent=title;n.t2.textContent=sub;
  n.g.setAttribute('opacity',on?1:0.4);
  const SU=window.SM_UI;
  if(rho===null||rho===undefined){n.fl.setAttribute('width',0);n.tr.setAttribute('opacity',0);n.r.setAttribute('stroke','var(--line)')}
  else{n.tr.setAttribute('opacity',1);n.fl.setAttribute('width',Math.max(0,(n.w-16)*Math.min(1,rho)));n.fl.setAttribute('fill',SU.col(rho));n.r.setAttribute('stroke',rho>=SM.HOT?SU.col(rho):'var(--line)');n.r.setAttribute('stroke-width',rho>=SM.HOT?2:1.2)}
  while(n.q.firstChild)n.q.removeChild(n.q.firstChild);
  if(lq!==null&&lq!==undefined&&(lq>=0.05||!isFinite(lq))){
    const m=!isFinite(lq)?8:Math.min(8,1+Math.floor(Math.log2(1+lq)));
    const y=n.cy+n.h/2+4;const x0=n.cx-n.w/2;
    for(let i=0;i<m;i++)el('rect',{x:x0+i*9,y,width:7,height:7,rx:1.5,fill:isFinite(lq)?'var(--c5)':'var(--bad)'},n.q);
    el('text',{x:x0+m*9+3,y:y+7,'font-size':10.5,fill:'var(--mute)'},n.q).textContent=isFinite(lq)?SU.fmtN(lq)+' waiting':'grows';
  }
}
function update(st,o){
  last=[st,o];layout();
  const SU=window.SM_UI,fN=SU.fmtN,sz=SM.D.db.sizes[st.db_size][0];
  const rh=x=>x?x.rho:null,lq=x=>x?x.Lq:null;
  setNode('users','Users',fN(st.users)+' daily',null,null,true);
  setNode('lb','Load balancer',st.app_n>1?'spreads requests':'none yet',null,null,st.app_n>1);
  setNode('app','App servers',st.app_n.toLocaleString('en-US')+' × 4 vCPU',rh(o.app),lq(o.app),true);
  setNode('cache','Cache',st.cache_n?st.cache_n+' node'+(st.cache_n>1?'s':'')+', '+Math.round(st.hit*100)+'% hits':'none',rh(o.cache),lq(o.cache),!!st.cache_n);
  setNode('prim','DB primary',(st.shards>1?st.shards+' shards, ':'')+'r7g.'+sz+(st.idx?'':', no index'),rh(o.prim),lq(o.prim),true);
  setNode('rep','Read replicas',st.replicas?st.replicas+' per shard':'none',rh(o.rep),lq(o.rep),!!st.replicas);
  setNode('queue','Queue',st.async?'jobs wait here':'jobs run inline',null,null,!!st.async);
  setNode('work','Workers',st.async?st.workers_n.toLocaleString('en-US')+' × 4 vCPU':'none',o.work?o.work.rho:null,o.work?o.work.Lq:null,!!st.async);
  setNode('gpu','GPU pool',st.gpu_r.toLocaleString('en-US')+' × 2 H100',rh(o.gpu),lq(o.gpu),true);
  const r=o.rates,h=st.cache_n?st.hit:0;
  const rate={'users-lb':r.req,'lb-app':r.req,'app-cache':st.cache_n?r.reads:0,'app-prim':(st.replicas?0:r.reads*(1-h))+r.writes,'app-rep':st.replicas?r.reads*(1-h):0,'prim-rep':st.replicas?r.writes:0,'app-queue':st.async?r.jobs:0,'queue-work':st.async?r.jobs:0,'app-gpu':r.msg};
  const tgt={'users-lb':null,'lb-app':o.app,'app-cache':o.cache,'app-prim':o.prim,'app-rep':o.rep,'prim-rep':o.rep,'app-queue':null,'queue-work':o.work,'app-gpu':o.gpu};
  edges.forEach(e=>{const k=e.a+'-'+e.b;const lam=rate[k]||0;e.rate=lam;
    e.n=lam<=0?0:Math.max(1,Math.min(9,1+Math.floor(1.3*Math.log10(1+lam))));
    const t=tgt[k];e.col=t?SU.col(t.rho):'var(--acc)';
    e.ln.setAttribute('stroke',lam>0?'var(--dim)':'var(--line)');e.ln.setAttribute('stroke-dasharray',k==='prim-rep'?'4 3':lam>0?'':'3 4')});
  draw();
}
function at(e,f){let d=f*e.L;for(let i=0;i<e.seg.length;i++){if(d<=e.seg[i]||i===e.seg.length-1){const u=e.seg[i]?Math.min(1,d/e.seg[i]):0;const p=e.pts[i],q=e.pts[i+1];return[p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u]}d-=e.seg[i]}return e.pts[0]}
function draw(){
  let i=0;
  edges.forEach((e,ei)=>{for(let j=0;j<9;j++){const d=dots[ei*9+j];if(j>=e.n){d.setAttribute('opacity',0);continue}
    const f=((j/e.n)+tt*0.28)%1;const xy=at(e,f);d.setAttribute('cx',xy[0]);d.setAttribute('cy',xy[1]);d.setAttribute('fill',e.col);d.setAttribute('opacity',0.9)}});
}
function loop(ts){raf=0;if(!playing||!vis)return;if(t0)tt+=Math.min(0.05,(ts-t0)/1000);t0=ts;draw();raf=requestAnimationFrame(loop)}
function kick(){if(!raf&&playing&&vis){t0=0;raf=requestAnimationFrame(loop)}}
const btn=document.getElementById('sm-anim');
function setBtn(){if(btn)btn.textContent=playing?'Pause':'Play'}
if(btn)btn.addEventListener('click',()=>{playing=!playing;setBtn();kick()});setBtn();
const box=document.getElementById('sm-dia');
if('IntersectionObserver' in window&&box){new IntersectionObserver(es=>{vis=es[es.length-1].isIntersecting&&!document.getElementById('t-sim').hidden;kick()}).observe(box)}else vis=true;
document.addEventListener('visibilitychange',()=>{if(document.hidden)vis=false;});
let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{const t=document.getElementById('t-sim');if(t&&!t.hidden&&last){W=0;update(last[0],last[1]);vis=true;kick()}},120)});
window.SM_DIA={update:(st,o)=>{update(st,o);const t=document.getElementById('t-sim');if(t&&!t.hidden){vis=true;kick()}}};
})();
