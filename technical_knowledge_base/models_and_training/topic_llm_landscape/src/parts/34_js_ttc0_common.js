// ---- Deeper: test-time compute. Shared helpers, sampling maths and the step-animation engine, namespaced under window.TTC ----
(function(){
const TAB='t-ttc';
window.TAB_RENDER=window.TAB_RENDER||{};
const DRAWS=[];
// register a draw for when the tab opens; it is also re-run when the width crosses the phone breakpoint
const onTab=f=>{(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f);DRAWS.push(f)};
// ---- Shared helpers ----
const $=id=>document.getElementById(id);
const fmt=(v,d)=>v.toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const GiB=2**30, MiB=2**20, KiB=1024;
function fmtBytes(b){if(b>=GiB)return (b/GiB).toFixed(b/GiB>=100?0:(b/GiB>=10?1:2))+' GiB';if(b>=MiB)return (b/MiB).toFixed(b/MiB>=100?0:1)+' MiB';if(b>=KiB)return (b/KiB).toFixed(1)+' KiB';return fmt(b,b%1?1:0)+' B'}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function segBind(id,cb){const el=$(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset.m)}))}
const svgEl=(w,h,inner,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="'+(label||'')+'"><defs><marker id="ttcah'+w+h+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+inner.replace(/MARK/g,'url(#ttcah'+w+h+')')+'</svg>';
const bx=(x,y,w,h,cls,lines,fs)=>{let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" class="'+cls+'"/>';const n=lines.length,lh=(fs||12)+3;lines.forEach((t,i)=>{s+='<text x="'+(x+w/2)+'" y="'+(y+h/2+(i-(n-1)/2)*lh+4)+'" text-anchor="middle" font-size="'+(fs||12)+'"'+(i>0?' fill="var(--mute)"':'')+'>'+t+'</text>'});return s};
const ar=(x1,y1,x2,y2,dash)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="MARK"'+(dash?' stroke-dasharray="4 3"':'')+'/>';
const sup=n=>String(n).replace(/[-0-9]/g,c=>'⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
const sci=(v,d)=>{if(!v)return '0';const e=Math.floor(Math.log10(Math.abs(v))+1e-9);return (v/10**e).toFixed(d==null?2:d)+' × 10'+sup(e)};
const usd=(v,d)=>'$'+fmt(v,d==null?(v<0.1?3:v<100?2:0):d);
const flp=v=>v>=1e12?(v/1e12).toFixed(2)+' TFLOP':(v/1e9).toFixed(v<1e10?2:v<1e11?1:0)+' GFLOP';
const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
// log-log (or log-y) frame: returns the SVG so far and the two scale functions
function logFrame(o){const {W,H,pl,pr,pt,pb}=o,lg=Math.log10;
  const lx=o.xlin?(v=>pl+(W-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0])):(v=>pl+(W-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0])));
  const ly=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(o.y[0]))/(lg(o.y[1])-lg(o.y[0])));
  let s='';o.yt.forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
  o.xt.forEach(([v,l])=>{s+='<line x1="'+lx(v)+'" x2="'+lx(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+lx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
  if(o.xl)s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
  if(o.yl)s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  return {s,lx,ly}}
// end labels for lines, pushed apart so they do not overlap
function endLabels(ends,x,gap){ends.sort((a,b)=>a.y-b.y);let last=-99,s='';ends.forEach(e=>{e.ly=Math.max(e.y,last+(gap||14));last=e.ly});ends.forEach(e=>{s+='<text x="'+x+'" y="'+(e.ly+4)+'" font-size="11" fill="'+e.c+'" style="cursor:help"><title>'+e.how+'</title>'+e.n+'</text>'});return s}

// ---- Sampling maths shared by the Reading widgets and the Sampling lab ----
const TM=(function(){
  const F=[1];for(let i=1;i<=400;i++)F[i]=F[i-1]*i;
  const lnF=[0];for(let i=1;i<=4000;i++)lnF[i]=lnF[i-1]+Math.log(i);
  const comb=(n,k)=>k<0||k>n?0:Math.exp(lnF[n]-lnF[k]-lnF[n-k]);
  const passk=(p,k)=>1-Math.pow(1-p,k);
  // unbiased estimator of Chen et al. (2021): 1 - C(n-c,k)/C(n,k)
  const chen=(n,c,k)=>n-c<k?1:1-Math.exp(lnF[n-c]-lnF[k]-lnF[n-c-k]-(lnF[n]-lnF[k]-lnF[n-k]));
  // plurality vote: correct answer with probability p, m wrong answers each (1-p)/m, ties broken uniformly. Exact.
  const memo=new Map();
  function plurality(p,n,m){const key=p.toFixed(4)+'|'+n+'|'+m;if(memo.has(key))return memo.get(key);let tot=0;
    for(let c=1;c<=n;c++){const pc=comb(n,c)*Math.pow(p,c)*Math.pow(1-p,n-c);if(pc<1e-13)continue;const r=n-c;
      // f[s][t] = sum over fillings of the first j wrong answers with s samples (each at most c), t of them exactly c, of prod 1/k!
      let f=[];for(let s=0;s<=r;s++){f[s]=new Float64Array(m+1)}f[0][0]=1;
      for(let j=0;j<m;j++){const g=[];for(let s=0;s<=r;s++)g[s]=new Float64Array(m+1);
        for(let s=0;s<=r;s++)for(let t=0;t<=j;t++){const v=f[s][t];if(!v)continue;for(let k=0;k<=Math.min(c,r-s);k++)g[s+k][t+(k===c?1:0)]+=v/F[k]}f=g}
      let s2=0;for(let t=0;t<=m;t++)s2+=f[r][t]*F[r]/Math.pow(m,r)/(1+t);tot+=pc*s2}
    memo.set(key,tot);return tot}
  const klBon=n=>Math.log(n)-(n-1)/n;
  const rBon=(n,a,b)=>{const d=Math.sqrt(klBon(n));return d*(a-b*d)};
  return {comb,passk,chen,plurality,klBon,rBon};
})();

// Minimal SVG line chart. o: {W,H,x:[min,max],y:[min,max],logx,series:[{name,pts:[[x,y]],c,dash,dots}],xt:[[v,l]],yt:[[v,l]],xl,yl,marks:[{x,l}],pts:[{x,y,c,l}]}
function lineChart(o){const W=o.W||640,H=o.H||260,pl=o.pl||44,pr=o.pr||12,pt=o.pt||14,pb=o.pb||38,lg=Math.log10;
  const sx=o.logx?(v=>pl+(W-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0]))):(v=>pl+(W-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0]));
  const sy=v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));
  let s='';(o.yt||[]).forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(v)+'" y2="'+sy(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(sy(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
  (o.xt||[]).forEach(([v,l])=>{s+='<line x1="'+sx(v)+'" x2="'+sx(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+sx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
  s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(H-pb)+'" y2="'+(H-pb)+'" stroke="var(--mute)"/>';
  if(o.xl)s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
  if(o.yl)s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  (o.marks||[]).forEach(m=>{const x=sx(m.x);s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(x+4)+'" y="'+(pt+10)+'" font-size="10.5" fill="var(--mute)">'+m.l+'</text>'});
  o.series.forEach(se=>{const d=se.pts.filter(p=>isFinite(p[1])).map((p,i)=>(i?'L':'M')+sx(p[0]).toFixed(1)+' '+sy(Math.max(o.y[0],Math.min(o.y[1],p[1]))).toFixed(1)).join('');
    s+='<path d="'+d+'" fill="none" stroke="'+se.c+'" stroke-width="2"'+(se.dash?' stroke-dasharray="5 4"':'')+'><title>'+se.name+'</title></path>';
    if(se.dots)se.pts.forEach(p=>{s+='<circle cx="'+sx(p[0])+'" cy="'+sy(p[1])+'" r="2.6" fill="'+se.c+'"/>'})});
  (o.pts||[]).forEach(p=>{s+='<circle cx="'+sx(p.x)+'" cy="'+sy(p.y)+'" r="4" fill="var(--bg)" stroke="'+p.c+'" stroke-width="2"><title>'+(p.l||'')+'</title></circle>'});
  return svgEl(W,H,s,o.label||'chart')}
const legend=ser=>'<div class="leg">'+ser.map(s=>'<span><i style="background:'+s.c+(s.dash?';background:repeating-linear-gradient(90deg,'+s.c+' 0 5px,transparent 5px 8px)':'')+'"></i>'+s.name+'</span>').join('')+'</div>';
const n3=(v,d)=>(+v).toFixed(d==null?3:d);
const pc1=v=>(100*v).toFixed(1)+'%';
// ---- Shared step-animation engine: play, pause, step, scrub, speed; animates only on screen and in the visible tab ----
// cfg: {card, pre (id prefix), n(mode) -> number of steps, draw(mode,k,e) where e in [0,1] is progress through step k, dur(mode,k) -> ms at 1x}
function makeAnim(cfg){
  const card=$(cfg.card);if(!card)return null;
  const P=cfg.pre,RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const st={m:cfg.mode,k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0};
  const cl=v=>v<0?0:v>1?1:v;
  const N=()=>cfg.n(st.m);
  function draw(){const e=RM?1:cl(st.t);cfg.draw(st.m,st.k,e);
    const sc=$(P+'Scrub');sc.max=N()*100;sc.value=Math.round((st.k+cl(st.t))*100);
    const pb=$(P+'Play'),end=st.k===N()-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play')}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/cfg.dur(st.m,st.k);if(st.t>=1){if(st.k<N()-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $(P+'Play').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===N()-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<N()-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $(P+'Fwd').addEventListener('click',()=>{pause();if(st.t<1)st.t=1;else st.k=Math.min(N()-1,st.k+1),st.t=1;draw()});
  $(P+'Back').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(P+'Scrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(N()-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=N()*100)st.t=1;draw()});
  $(P+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$(P+'M');if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab(()=>{draw();kick()});
  draw();
  return {st,draw,narrow:()=>card.clientWidth<560};
}


// redraw width-sensitive charts when the visible tab crosses the 560 px breakpoint
let bucket=null;addEventListener('resize',()=>{const t=document.getElementById(TAB);if(!t||t.hidden)return;const b=t.clientWidth<560;if(b===bucket)return;bucket=b;DRAWS.forEach(f=>{try{f()}catch(e){}})});
// highlight the sub-nav entry for the section in view
(function(){const nav=document.getElementById('ttcNav');if(!nav)return;const links=[...nav.querySelectorAll('a')];
  function on(){const t=document.getElementById(TAB);if(!t||t.hidden)return;let cur=links[0];for(const a of links){const s=document.querySelector(a.getAttribute('href'));if(s&&s.getBoundingClientRect().top<120)cur=a}links.forEach(a=>a.classList.toggle('cur',a===cur))}
  addEventListener('scroll',on,{passive:true});onTab(on)})();
window.TTC={$,fmt,fmtBytes,mulberry32,segBind,svgEl,stat,sci,A,logFrame,lineChart,legend,n3,pc1,TM,makeAnim,onTab};
})();
