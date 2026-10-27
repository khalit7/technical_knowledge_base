// ---- The paper tab, part 2: Eq. 2 widget, gains chart, error bars, predict reveals, OPD maths ----
const TC=['var(--t0)','var(--t1)','var(--t2)','var(--t3)'];
const tierCol=s=>TC[Math.max(0,Math.min(3,Math.round(s)))];
// colour on a continuous 0..3 scale: blend the two nearest tier colours by opacity layering is not possible in SVG fill,
// so the soft score is drawn in the colour of its nearest tier and its exact value is printed.

// Eq. 2: four tier scores -> hard tier (assigned) and soft score
(function(){
  const v=[0.05,0.55,0.35,0.05];
  $('scCtl').innerHTML=[0,1,2,3].map(k=>'<label>π for C'+k+': <b id="scV'+k+'"></b><input type="range" id="sc'+k+'" min="0" max="100" value="'+Math.round(v[k]*100)+'" step="1" aria-label="score for C'+k+'"></label>').join('');
  function draw(w){const raw=[0,1,2,3].map(k=>+$('sc'+k).value),S=raw.reduce((a,b)=>a+b,0)||1,pi=raw.map(x=>x/S);
    const hard=pi.indexOf(Math.max(...pi)),soft=pi.reduce((a,p,k)=>a+k*p,0);
    [0,1,2,3].forEach(k=>$('scV'+k).textContent=pi[k].toFixed(2));
    const pl=34,pr=16,X=s=>pl+(w-pl-pr)*s/3;let s='';
    // bars of pi above each tier position
    [0,1,2,3].forEach(k=>{const h=pi[k]*70;s+=rc(X(k)-16,82-h,32,h,TC[k],{r:3})+tx(X(k),96,'C'+k,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=ln2(pl,104,w-pr,104,'var(--line)');
    [0,1,2,3].forEach(k=>{s+=ln2(X(k),100,X(k),108,'var(--mute)')});
    s+='<circle cx="'+X(hard).toFixed(1)+'" cy="104" r="6" fill="none" stroke="var(--bad)" stroke-width="2"/>'+tx(X(hard),124,'hard '+hard,{fs:11,a:'middle',c:'var(--bad)'});
    s+='<path d="M'+X(soft).toFixed(1)+',96 l-6,-10 h12z" fill="var(--acc)"/>'+tx(X(soft),140,'soft '+soft.toFixed(2),{fs:11,a:'middle',c:'var(--acc)',w:600});
    $('scSvg').innerHTML=svgW(w,148,s,'Hard and soft routing scores');
    $('scOut').innerHTML='Assigned tier <b>C'+hard+'</b> (hard score '+hard+'); score-weighted mean tier <b>'+soft.toFixed(2)+'</b> = '+pi.map((p,k)=>k+' × '+p.toFixed(2)).join(' + ')+'. Two examples both assigned C1 can sit at 0.9 and 1.6 on the soft scale, so the soft ordering can split a tier across stages. The paper defines both and does not say which trained the released models.'}
  fit($('scSvg'),draw);[0,1,2,3].forEach(k=>$('sc'+k).addEventListener('input',()=>refit($('scSvg'))));
})();

// Per-benchmark gains with binomial whiskers where the item count is known
const BN=TB.bench.map(b=>b.n),CATC={harness:'var(--c1)',tool:'var(--c4)',code:'var(--c2)',if:'var(--c3)'};
const rowOf=(t,m)=>TB[t].rows.find(r=>r.m===m);
(function(){
  let mode='4';
  function draw(w){const b4=rowOf('t1','Qwen3.5-4B'),n4=rowOf('t1','NeoHorse-1-4B'),b9=rowOf('t2','Qwen3.5-9B'),n9=rowOf('t2','NeoHorse-1-9B');
    const A=mode==='4'?b4:mode==='9'?b9:b9,B=mode==='4'?n4:mode==='9'?n9:n4;
    const d=B.v.map((v,i)=>+(v-A.v[i]).toFixed(2));
    const sek=i=>{const x=RCD.se[TB.bench[i].k+(mode==='9'?'9':'4')];return x&&mode!=='x'?x.se:0};
    const lw=Math.min(128,w*.34),pl=lw+8,pr=52,lo=Math.min(-6,Math.floor(Math.min(...d.map((v,i)=>v-sek(i))))-1),hi=Math.max(12,Math.ceil(Math.max(...d.map((v,i)=>v+sek(i))))+1);
    const X=v=>pl+(w-pl-pr)*(v-lo)/(hi-lo),rh=24;let s='';
    for(let g=Math.ceil(lo/4)*4;g<=hi;g+=4){s+=ln2(X(g),14,X(g),14+rh*10,g===0?'var(--mute)':'var(--line)',{sw:g===0?1.4:1})+tx(X(g),10,(g>0?'+':'')+g,{fs:11,a:'middle',c:'var(--mute)'})}
    d.forEach((v,i)=>{const y=14+i*rh,k=TB.bench[i].k,se=RCD.se[k+(mode==='9'?'9':'4')];
      s+=tx(pl-8,y+rh/2+4,BN[i],{fs:11,a:'end'});
      s+=rc(Math.min(X(0),X(v)),y+5,Math.abs(X(v)-X(0)),rh-10,CATC[TB.bench[i].cat],{r:2});
      if(se&&mode!=='x'){const s1=se.se;s+=ln2(X(v-s1),y+rh/2,X(v+s1),y+rh/2,'var(--ink)',{sw:1.3,op:.7})+ln2(X(v-s1),y+rh/2-4,X(v-s1),y+rh/2+4,'var(--ink)',{op:.7})+ln2(X(v+s1),y+rh/2-4,X(v+s1),y+rh/2+4,'var(--ink)',{op:.7})}
      s+=tx(Math.max(X(v),X(0))+4+(se&&mode!=='x'?Math.abs(X(se.se)-X(0)):0),y+rh/2+4,(v>0?'+':'')+v.toFixed(2),{fs:11,c:v<0?'var(--bad)':'var(--ink)'})});
    const lg=legend([['harness agents',CATC.harness],['tool use',CATC.tool],['code',CATC.code],['instructions',CATC.if]],pl,14+rh*10+18,w-pl);
    $('gnSvg').innerHTML=svgW(w,14+rh*10+lg.h+10,s+lg.s,'Per-benchmark gains');
    const up=d.filter(x=>x>0).length,eq=d.filter(x=>x===0).length;
    $('gnCap').innerHTML=mode==='4'?'Up on all ten; macro-average +'+RCD.gain4.toFixed(2)+' (58.94 to 64.87). Whiskers: ±1 standard error, only where the item count is known.':
      mode==='9'?'Up on '+up+', identical on '+eq+', down on '+(10-up-eq)+'; macro-average +'+RCD.gain9.toFixed(2)+' (65.60 to 69.04).':
      'Post-trained 4B minus base 9B: ahead on '+up+' of 10 ('+RCD.beats9.join(', ')+'), behind on the rest; macro-average −0.73 (64.87 against 65.60), so it closes '+RCD.gap_closed+'% of the 6.66-point macro gap between the two bases.'}
  fit($('gnSvg'),draw);segBind('gnM',m=>{mode=m;refit($('gnSvg'))});
})();
// small fills from the recompute results and release data
$('agv').textContent='from '+RCD.ag4[0].toFixed(2)+' to '+RCD.ag4[1].toFixed(2)+' at 4B and '+RCD.ag9[0].toFixed(2)+' to '+RCD.ag9[1].toFixed(2)+' at 9B';
$('rsv').textContent='from '+RCD.rest4[0].toFixed(2)+' to '+RCD.rest4[1].toFixed(2)+' and '+RCD.rest9[0].toFixed(2)+' to '+RCD.rest9[1].toFixed(2);
$('trk').textContent='4B: 64.87 against Nanbeige-4.2-3B 62.31 and Spark-X2.5-4B 62.22; 9B: 69.04 against Muse-Glimmer-30B 67.86';
$('ptv').textContent=TB.pinch_trace.requests+'%, '+TB.pinch_trace.time+'% and '+TB.pinch_trace.tokens+'%';
$('miss').textContent=RCD.f7_share_missing+'%';
(function(){const R=PAPER.release;$('hfUp').textContent=R.hf_paper.upvotes+' on '+R.date+' by the Hugging Face API, so the earlier count could not be reproduced';
  $('relM').innerHTML=R.hf.map(m=>A('https://huggingface.co/'+m.id,m.id.split('/')[1])+' ('+(m.params/1e9).toFixed(2)+'B parameters, '+fmt(m.downloads)+' downloads)').join(' and ')+' on Hugging Face as of '+R.date+', Apache 2.0, fine-tuned from Qwen3.5-4B and Qwen3.5-9B.'})();

// error-bar table
(function(){const rows=[['he','HumanEval'],['lcb','LiveCodeBench v6'],['ifb','IFBench'],['ife','IFEval'],['vita','VitaBench (1 run)']];
  let h='<thead><tr><th>Benchmark (items)</th><th>4B gain, items</th><th>SE</th><th>z</th><th>9B gain, items</th><th>SE</th><th>z</th></tr></thead><tbody>';
  rows.forEach(([k,n])=>{const a=RCD.se[k+'4'],b=RCD.se[k+'9'];const g=x=>{const d=x.items[1]-x.items[0];return (d>0?'+':'')+d};
    h+='<tr><td>'+n+' ('+a.n+')</td><td>'+g(a)+'</td><td>'+a.se.toFixed(2)+'</td><td>'+a.z.toFixed(1)+'</td><td>'+g(b)+'</td><td>'+b.se.toFixed(2)+'</td><td>'+b.z.toFixed(1)+'</td></tr>'});
  $('seT').innerHTML=h+'</tbody>'})();

// predict 3: how many benchmarks the post-trained 4B wins against the base 9B
PRED_REVEAL.pr3=()=>{$('pr3Out').innerHTML='Five: '+RCD.beats9.join(', ')+'. It trails the base 9B on BFCL v4, WorkBuddy Bench, LiveCodeBench, IFBench and IFEval. The 89% is a statement about averages, which a few large agentic gains (VitaBench +0.75, PinchBench +2.78, HumanEval +4.27 over the 9B) can carry. Switch the chart above to "post-trained 4B vs base 9B" to see each benchmark.'};

// predict 1: where the base sits among the data-experiment runs
PRED_REVEAL.pr1=()=>{const el=$('dxSvg');fit(el,w=>{
  const f=TB.fig7,pts=f.points,base=RCD.base5,fin=RCD.fin5,tou=64.32;
  const pl=40,pr=12,pt=14,pb=34,H=230,lx0=Math.log(1.2),lx1=Math.log(14);
  const X=v=>pl+(w-pl-pr)*(Math.log(v)-lx0)/(lx1-lx0),Y=v=>pt+(H-pt-pb)*(1-(v-63)/(76-63));let s='';
  [64,66,68,70,72,74,76].forEach(g=>{s+=ln2(pl,Y(g),w-pr,Y(g),'var(--line)')+tx(pl-5,Y(g)+4,g,{fs:11,a:'end',c:'var(--mute)'})});
  [2,4,8].forEach(g=>{s+=tx(X(g),H-pb+15,g+'M',{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+w-pr)/2,H-4,'unique supervised tokens (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  s+=ln2(pl,Y(base),w-pr,Y(base),'var(--ink)',{da:'4 3'})+tx(w-pr,Y(base)+14,'untrained base 69.31',{fs:11,a:'end'});
  s+=ln2(pl,Y(fin),w-pr,Y(fin),'var(--good)',{da:'4 3'})+tx(w-pr,Y(fin)-5,'released NeoHorse-1-4B 74.39',{fs:11,a:'end',c:'var(--good)'});
  let d='';pts.forEach((p,i)=>{d+=(i?'L':'M')+X(p.tokens_M).toFixed(1)+','+Y(p.avg).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
  pts.forEach(p=>{s+='<circle cx="'+X(p.tokens_M).toFixed(1)+'" cy="'+Y(p.avg).toFixed(1)+'" r="3.5" fill="var(--acc)"/>'});
  const p2=pts[1];s+='<circle cx="'+X(p2.tokens_M).toFixed(1)+'" cy="'+Y(p2.avg).toFixed(1)+'" r="7" fill="none" stroke="var(--acc)" stroke-width="1.5"/>'+tx(X(p2.tokens_M)-4,Y(p2.avg)-12,'Table 3 harness run 70.57',{fs:11,a:'middle',c:'var(--acc)'});
  s+='<circle cx="'+X(p2.tokens_M).toFixed(1)+'" cy="'+Y(tou).toFixed(1)+'" r="5" fill="var(--bad)"/>'+tx(X(p2.tokens_M)+9,Y(tou)+4,'Table 3 Toucan run 64.32',{fs:11,c:'var(--bad)'});
  el.innerHTML=svgW(w,H,s,'Data experiments against the base');
  $('dxCap').innerHTML='Between them: the base (69.31) is above the Toucan run by '+(-RCD.tou_vs_base).toFixed(2)+' and below the harness run by '+RCD.har_vs_base.toFixed(2)+'. Blue: Figure 7\'s six runs, decoded from its vector markers (x is not printed in the paper; the Toucan run is placed at the harness run\'s budget, "closely matched"). Green: the released model on the same five benchmarks, from Table 1.'})};

// ---- OPD maths shared by the predict reveal and the curriculum tab ----
const softmax=l=>{const m=Math.max(...l),e=l.map(x=>Math.exp(x-m)),s=e.reduce((a,b)=>a+b,0);return e.map(x=>x/s)};
const klDiv=(p,q)=>p.reduce((a,x,i)=>x>0?a+x*Math.log(x/q[i]):a,0);
function coarsen(p,q,K){const idx=p.map((x,i)=>i).sort((a,b)=>p[b]-p[a]).slice(0,K);const P=idx.map(i=>p[i]),Q=idx.map(i=>q[i]);
  P.push(Math.max(0,1-P.reduce((a,b)=>a+b,0)));Q.push(Math.max(1e-300,1-Q.reduce((a,b)=>a+b,0)));return {idx,P,Q}}
const OPDV=16,STU=[4,3.2,2.6,2.1,1.7,1.3,1,.7,.4,.2,0,-.2,-.4,-.6,-.8,-1];
const OPDPRESET={agree:STU.map(x=>x*0.9),second:STU.map((x,i)=>i===1?x+1.6:x*0.9),tail:STU.map((x,i)=>i===8?x+3.4:i===11?x+2.2:x*0.8)};
function opdChart(w,p,q,K){const c=coarsen(p,q,K),pl=8,pr=8,H=150,bw=(w-pl-pr)/(K+1),Y=v=>18+(H-48)*(1-v);let s='';
  const mx=1;for(let i=0;i<=K;i++){const x=pl+i*bw,pp=c.P[i],qq=c.Q[i],b=Math.max(3,bw*.36);
    s+=rc(x+bw/2-b-1,Y(pp/mx),b,(H-48)*pp/mx,'var(--acc)',{r:2})+rc(x+bw/2+1,Y(qq/mx),b,(H-48)*qq/mx,'var(--c2)',{r:2});
    const lab=i<K?'t'+(c.idx[i]+1):'rest';if(bw>=22||i===K)s+=tx(x+bw/2,H-14,lab,{fs:11,a:'middle',c:'var(--mute)'})}
  const lg=legend([['student P',"var(--acc)"],['teacher Q','var(--c2)']],pl,12,w-pl);
  return {svg:svgW(w,H,s+lg.s,'Coarsened distributions'),full:klDiv(p,q),coarse:klDiv(c.P,c.Q),fwdFull:klDiv(q,p),fwdCoarse:klDiv(c.Q,c.P)}}
PRED_REVEAL.pr2=()=>{const go=()=>{const K=+$('p2k').value;$('p2kV').textContent=K;fit($('p2Svg'),w=>{const p=softmax(STU),q=softmax(OPDPRESET.tail),r=opdChart(w,p,q,K);$('p2Svg').innerHTML=r.svg;
  $('p2Out').innerHTML='Full reverse KL(P ‖ Q) = <b>'+r.full.toFixed(3)+'</b> nats; over the '+(K+1)+' bins = <b>'+r.coarse.toFixed(3)+'</b> ('+(100*r.coarse/r.full).toFixed(0)+'% of it). Never more: at K = 15 the bins are the vocabulary and the two agree.'});refit($('p2Svg'))};
  $('p2k').addEventListener('input',go);go()};
