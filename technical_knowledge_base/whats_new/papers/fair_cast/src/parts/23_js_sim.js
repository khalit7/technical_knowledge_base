// ---- Round a weight: the simulator tab (engine in 20_js_sim.js). Static until the reader clicks Play or moves a control. ----
(function(){
const card=$('fcSim');if(!card)return;
const st={r:null,k:300,m:'all',play:false,raf:0,last:0};
const P=()=>({w0:+$('fcW').value,eta:+$('fcEta').value,drift:+$('fcDrift').value,noise:+$('fcNoise').value,T:300,seed:+$('fcSeed').value,reps:256});
const C={n:'var(--c2)',s:'var(--c1)',e:'var(--c3)'},NM={n:'round-to-nearest',s:'stochastic',e:'error feedback'};
function compute(){st.r=FCSIM.run(P())}
function draw(){const host=$('fcSimSvg'),w=host.clientWidth;if(!w||!st.r)return;const r=st.r,k=st.k,u=r.u,w0=r.w0;
  const yv=v=>(v-w0)/u;let ymax=0;for(let t=0;t<=r.T;t++)ymax=Math.max(ymax,yv(r.th[t]),yv(r.qs[t]),yv(r.qe[t]));
  const show=x=>st.m==='all'||st.m===x;
  const items=[['master θ (fp32)','var(--ink)']];if(show('rtn'))items.push(['nearest',C.n]);if(show('sr'))items.push(['stochastic',C.s]);if(show('sr')&&$('fcMean').checked)items.push(['mean of 256','var(--c1)','da']);if(show('ef'))items.push(['error feedback',C.e]);
  const LG=legendW(items,44,14,w-54),pt=LG.h+16,H=(w<480?230:280)+pt,pl=44,pr=10,pb=34,ytop=Math.max(1.5,Math.ceil(ymax+0.6));
  const F=linFrame({W:w,H,pl,pr,pt,pb,x:[0,r.T],y:[-0.7,ytop],xt:w<480?[0,100,200,300]:[0,50,100,150,200,250,300],yt:niceTicks(0,ytop,w<480?4:6).filter(v=>Number.isInteger(v)),fy:v=>v===0?'w₀':'+'+v+'u',xl:'optimizer step'});
  let s=F.s;
  s+=rc(pl,F.Y(0.5),w-pl-pr,F.Y(-0.5)-F.Y(0.5),'var(--hl)',{r:0,op:0.5})+tx(w-pr-4,F.Y(0.5)+13,'dead zone around w₀: ±u/2',{fs:11,a:'end',c:'var(--mute)'});
  if(ytop<=30)for(let g=1;g<=ytop;g++)s+=ln2(pl,F.Y(g),w-pr,F.Y(g),'var(--line)',{sw:1,da:'2 3'});
  const pts=(a,stp)=>{const o=[];for(let t=0;t<=k;t++){if(stp&&t>0)o.push([t,yv(a[t-1])]);o.push([t,yv(a[t])])}return o};
  if(show('sr')&&$('fcMean').checked)s+=lineS(pts(r.qm),F.X,F.Y,C.s,{sw:2.2,da:'2 3'});
  if(show('sr'))s+=lineS(pts(r.qs,1),F.X,F.Y,C.s,{sw:1.1,op:st.m==='all'?0.35:0.9});
  if(show('ef'))s+=lineS(pts(r.qe,1),F.X,F.Y,C.e,{sw:1.4,op:st.m==='all'?0.35:0.9});
  s+=lineS(pts(r.th),F.X,F.Y,'var(--ink)',{sw:2});
  if(show('rtn'))s+=lineS(pts(r.qn,1),F.X,F.Y,C.n,{sw:2.4});
  if(k<r.T)s+=ln2(F.X(k),pt,F.X(k),H-pb,'var(--mute)',{sw:1,da:'3 3'});
  s+=LG.s;
  host.innerHTML=svgW(w,H,s,'Master weight and its bf16 copies over 300 optimizer steps');
  counters();
  const pb2=$('fcPlay');pb2.innerHTML=st.play?'❚❚ Pause':(k>=r.T?'▶ Play the 300 steps':'▶ Resume');pb2.setAttribute('aria-label',st.play?'Pause':'Play');
  $('fcStep').value=k;$('fcStepL').textContent='step '+k+' of '+r.T}
function counters(){const r=st.r,k=st.k,ms=r.meanStep;
  const row=(key,a)=>{let ch=0,first=-1,run=0,best=0,sg=0;for(let t=1;t<=k;t++){if(a[t]!==a[t-1]){ch++;if(first<0)first=t}const d=Math.sign(r.th[t]-a[t]);if(d&&d===sg)run++;else{run=d?1:0;sg=d}best=Math.max(best,run)}const gapU=(r.th[k]-a[k])/r.u;
    return '<tr><td style="color:'+C[key]+';font-weight:600">'+NM[key]+'</td><td class="num">'+(first<0?'not yet':first)+'</td><td class="num">'+ch+(k?' ('+(100*ch/k).toFixed(1)+'%)':'')+'</td><td class="num">'+(gapU<0?'−':'')+Math.abs(gapU).toFixed(2)+' u</td><td class="num">'+best+'</td></tr>'};
  let h='<div class="tw"><table class="fc-cnt"><thead><tr><th>At step '+k+'</th><th class="num">first change</th><th class="num">changes so far</th><th class="num">master minus copy now</th><th class="num">longest stretch on one side (steps)</th></tr></thead><tbody>'+row('n',r.qn)+row('s',r.qs)+row('e',r.qe)+'</tbody></table></div>';
  h+='<p class="small" style="margin:4px 0 0">bf16 gap at this weight <i>u</i> = '+sci(r.u)+'; round-to-nearest needs the master to move <i>u</i>/2 = '+sci(r.u/2)+', <b>'+(r.u/2/ms).toFixed(0)+' steps</b> of the mean update ('+sci(ms)+'). Average of 256 stochastic copies minus master: '+((r.qm[k]-r.th[k])/r.u).toFixed(3)+' u. The last column counts the longest run of consecutive steps in which the copy stayed on the same side of the master: round-to-nearest\'s error keeps its sign for about a hundred steps at a time, the unbiased rules\' error changes sign every few steps, so it averages out instead of accumulating.</p>';
  $('fcSimCnt').innerHTML=h;
  $('fcSimCap').innerHTML='The weight starts on the bf16 grid at w₀ = '+r.w0.toPrecision(6)+'. Each step adds η × (mean update + noise × a standard normal draw), accumulated in fp32. Values are the copy\'s distance from w₀ in gaps <i>u</i>; a step line jumps when the copy moves to a neighbouring bf16 value.'}
function tick(now){st.raf=0;if(!st.play)return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;st.acc=(st.acc||0)+dt*300/6000;const n=Math.floor(st.acc);if(n){st.acc-=n;st.k=Math.min(st.r.T,st.k+n)}
  card.dataset.frames=(+card.dataset.frames||0)+1;if(st.k>=st.r.T){st.play=false}draw();if(st.play)st.raf=requestAnimationFrame(tick)}
const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
$('fcPlay').addEventListener('click',()=>{if(st.play){pause();draw();return}if(st.k>=st.r.T)st.k=0;st.play=true;st.last=0;st.acc=0;st.raf=requestAnimationFrame(tick);draw()});
$('fcStep').addEventListener('input',e=>{pause();st.k=+e.target.value;draw()});
['fcW','fcEta','fcDrift','fcNoise','fcSeed'].forEach(id=>$(id).addEventListener('change',()=>{pause();compute();st.k=st.r.T;draw()}));
$('fcMean').addEventListener('change',draw);
const seg=$('fcSimM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});st.m=b.dataset.m;draw()}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
compute();fit($('fcSimSvg'),draw);onTab('t-sim',()=>refit($('fcSimSvg')));
// the reproduction box quotes the engine's own default run (also in inputs/sim.json, checked by check_page.mjs)
const d=FCSIM.run({w0:0.02,eta:1e-6,drift:0.5,noise:0.5,T:300,seed:1,reps:256}),sd=FCSIM.run({w0:0.02,eta:1e-6,drift:0.5,noise:0,T:300,seed:1,reps:8});
$('fcRepFirst').textContent=d.first.n;$('fcRepSteady').textContent=sd.first.n;$('fcRepPct').textContent=(100*d.ch.n/d.T).toFixed(2)+'%';
window.FCSIMUI=st;
})();
