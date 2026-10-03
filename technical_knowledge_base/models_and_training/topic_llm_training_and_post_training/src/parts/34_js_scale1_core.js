// ---- Scaling calculator: formulas (the same as scale/recompute.py), state and shared helpers, namespaced under window.SC ----
(function(){
const TAB='t-scale',D0=window.SC_DATA;if(!D0)return;
window.TAB_RENDER=window.TAB_RENDER||{};
const DRAWS=[];
const onTab=f=>{(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f);DRAWS.push(f)};
const {PFD,FITS,KAP,ACC}=D0;
// ---- formulas ----
const chinLoss=(f,N,D)=>f.E+f.A/Math.pow(N,f.al)+f.B/Math.pow(D,f.be);
function chinOpt(f,C){const G=Math.pow(f.al*f.A/(f.be*f.B),1/(f.al+f.be)),a=f.be/(f.al+f.be),N=G*Math.pow(C/6,a);return [N,C/6/N]}
const kapLoss=(N,D)=>Math.pow(Math.pow(KAP.Nc/N,KAP.aN/KAP.aD)+KAP.Dc/D,KAP.aD);
const kapN=C=>KAP.Ne*Math.pow(C/2/PFD,KAP.pN);
const attnPerToken=(L,dattn,ctx)=>6*L*ctx*dattn;
function isoD(f,l,N){const r=l-f.E-f.A/Math.pow(N,f.al);return r>0?Math.pow(f.B/r,1/f.be):Infinity}
// minimise 6ND + 2N Dinf along L(N, D) = l: a ternary search in log N, 200 steps, as in recompute.py
function sardana(f,l,Dinf,Nhint){
  const Nlo=Math.pow(f.A/(l-f.E),1/f.al);let lo=Math.log(Nlo*1.0001),hi=Math.log(Math.max(Nlo,Nhint)*1e4);
  const tot=ln=>{const N=Math.exp(ln),D=isoD(f,l,N);return 6*N*D+2*N*Dinf};
  for(let i=0;i<200;i++){const m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;if(tot(m1)<tot(m2))hi=m2;else lo=m1}
  const N=Math.exp((lo+hi)/2),D=isoD(f,l,N);return [N,D,6*N*D+2*N*Dinf]}
const peak=(acc,prec)=>{const a=ACC[acc];return prec==='fp8'&&a.fp8?a.fp8:a.bf16};
function compute(s){
  const f=FITS[s.fit],N=s.N,D=s.D,C6=6*N*D,Ca=attnPerToken(s.L,s.dattn,s.ctx)*D,C=C6+(s.attn?Ca:0),pk=peak(s.acc,s.prec);
  const hours=C/(pk*s.mfu)/3600,[n3,d3]=chinOpt(f,C),n20=Math.sqrt(C/120),d20=20*n20,loss=chinLoss(f,N,D),nk=kapN(C);
  const o={C6,Cattn:Ca,C,attn_share:Ca/C6,tpp:D/N,tpp_tot:D/s.Ntot,pfd:C/PFD,peak:pk,hours,gpu_days:hours/24,wall_days:hours/s.gpus/24,usd:hours*s.usd,
    n3,d3,tpp3:d3/n3,loss3:chinLoss(f,n3,d3),n20,d20,loss20:chinLoss(f,n20,d20),loss,loss_kap:kapLoss(N,D),nk,dk:C/6/nk,size_vs3:N/n3,Cinf:2*N*s.Dinf};
  o.Clife=C+o.Cinf;o.inf_share=o.Cinf/o.Clife;
  const [sN,sD,sTot]=sardana(f,loss,s.Dinf,N);Object.assign(o,{sN,sD,sTot,cur_tot:C6+o.Cinf,s_saving:1-sTot/(C6+o.Cinf)});
  const [cN,cD,cC]=sardana(f,loss,0,N);Object.assign(o,{cN,cD,cC});
  return o}
function animMode(f,C,m){
  const N=m==='kap'?kapN(C):m==='chin'?chinOpt(f,C)[0]:Math.sqrt(C/(6*D0.LL3_8B_TPP)),D=C/6/N,l=chinLoss(f,N,D);
  const [cN,,cC]=sardana(f,l,0,N),be=cN>N*1.0001?(C-cC)/(2*(cN-N)):null;
  return {N,D,tpp:D/N,loss:l,mterm:f.A/Math.pow(N,f.al),dterm:f.B/Math.pow(D,f.be),inf:2*N,cN,cC,extra:C/cC-1,breakeven:be}}
// ---- state ----
const S=Object.assign({},D0.DEF,{preset:null,kind:'dense'});
function statePreset(p){return Object.assign({},D0.DEF,{N:p.N,Ntot:p.Ntot,D:p.D,L:p.L,dattn:p.dattn,ctx:p.ctx,acc:p.acc,mfu:p.mfu||D0.DEF.mfu,gpus:p.gpus||D0.DEF.gpus})}
// ---- helpers ----
const $=id=>document.getElementById(id);
const fmt=(v,d)=>v.toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const supd=n=>String(n).replace(/[-0-9]/g,c=>'⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
const sci=(v,d)=>{if(!isFinite(v))return '∞';if(!v)return '0';const e=Math.floor(Math.log10(Math.abs(v))+1e-9);return (v/10**e).toFixed(d==null?2:d)+' × 10'+supd(e)};
// counts: 405.9B, 15.6T, 1.46M
function cnt(v,d){const a=Math.abs(v);const u=a>=1e12?[1e12,'T']:a>=1e9?[1e9,'B']:a>=1e6?[1e6,'M']:a>=1e3?[1e3,'K']:[1,''];const x=v/u[0];
  return x.toFixed(d!=null?d:(x>=100?0:x>=10?1:2))+u[1]}
const usd=v=>v>=1e9?'$'+(v/1e9).toFixed(2)+'B':v>=1e6?'$'+(v/1e6).toFixed(v>=1e8?0:v>=1e7?1:2)+'M':v>=1e3?'$'+(v/1e3).toFixed(v>=1e5?0:1)+'K':'$'+v.toFixed(0);
const pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
const spct=(v,d)=>(v>=0?'+':'−')+Math.abs(100*v).toFixed(d!=null?d:Math.abs(v)<0.001?2:1)+'%';
const tpp=v=>v>=100?fmt(v,0):v>=10?v.toFixed(1):v.toFixed(2);
const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
// a stat tile; data-k and data-v carry the raw number for the check script
const stat=(k,v,d,key,raw,cls)=>'<div class="stat'+(cls?' '+cls:'')+'"'+(key?' data-k="'+key+'" data-v="'+raw+'"':'')+'><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
const svgEl=(w,h,inner,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+(label||'')+'">'+inner+'</svg>';
const lg=Math.log10;
// log-log frame: grid, ticks and labels; returns the SVG so far and the scale functions
function frame(o){const {W,H,pl,pr,pt,pb}=o;
  const sx=v=>pl+(W-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0]));
  const sy=o.ylin?(v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]))):(v=>pt+(H-pt-pb)*(1-(lg(v)-lg(o.y[0]))/(lg(o.y[1])-lg(o.y[0]))));
  let s='';o.yt.forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(v).toFixed(1)+'" y2="'+sy(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(sy(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
  o.xt.forEach(([v,l])=>{s+='<line x1="'+sx(v).toFixed(1)+'" x2="'+sx(v).toFixed(1)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+sx(v).toFixed(1)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
  s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(H-pb)+'" y2="'+(H-pb)+'" stroke="var(--mute)"/>';
  if(o.xl)s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
  if(o.yl)s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  return {s,sx,sy}}
const decTicks=(a,b,step)=>{const t=[];for(let e=Math.ceil(lg(a)-1e-9);e<=Math.floor(lg(b)+1e-9);e+=step||1)t.push([10**e,'10'+supd(e)]);return t};
const segBind=(id,cb)=>{const el=$(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{segSet(id,b.dataset.m);cb(b.dataset.m)}))};
const segSet=(id,m)=>$(id).querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x.dataset.m===m);x.setAttribute('aria-pressed',x.dataset.m===m?'true':'false')});
// redraw width-sensitive charts when the visible tab changes width
let lastW=0;addEventListener('resize',()=>{const t=$(TAB);if(!t||t.hidden)return;const w=t.clientWidth;if(Math.abs(w-lastW)<8)return;lastW=w;DRAWS.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr('t-scale: '+e.message)}})});
// highlight the sub-nav entry for the section in view
(function(){const nav=$('sc-nav');if(!nav)return;const links=[...nav.querySelectorAll('a')];
  function on(){const t=$(TAB);if(!t||t.hidden)return;let cur=links[0];for(const a of links){const s=document.querySelector(a.getAttribute('href'));if(s&&s.getBoundingClientRect().top<120)cur=a}links.forEach(a=>a.classList.toggle('cur',a===cur))}
  addEventListener('scroll',on,{passive:true});onTab(on)})();
const listeners=[];
window.SC={D0,S,compute,animMode,chinLoss,chinOpt,kapN,isoD,sardana,statePreset,$,fmt,sci,cnt,usd,pct,spct,tpp,A,stat,svgEl,frame,decTicks,segBind,segSet,onTab,lg,supd,
  onChange:f=>listeners.push(f),changed:()=>listeners.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr('t-scale: '+e.message)}})};
})();
