// One model swap, two gates: claude-v1 (champion) against claude-instant-v1 (challenger) on MT-Bench's released GPT-4 grades.
(function(){
const D=window.PE,C=window.PEC;if(!D||!C)return;
const $=id=>document.getElementById(id);if(!$('ga'))return;
const CH='claude-v1',CL='claude-instant-v1',A=C.byName[CH].s,B=C.byName[CL].s;
const O={aggTol:.25,sliceTol:.5,conf:.95,escalate:true,aggSig:false};
const G=C.gate(A,B,O);
const N=7;let step=0,mode=0,playing=false,timer=null,onScreen=true;
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// judge cost at 2023 GPT-4 8K prices, from the released prompts and judgments counted with cl100k_base
const JT=D.judge_tokens,callCost=(JT.prompt*C.PRICE['gpt-4'][0]+JT.completion*C.PRICE['gpt-4'][1])/1e6/JT.calls;
const rows=C.CATS.map(c=>D.order.map((k,i)=>i).filter(i=>C.catOf[i]===c));
const itemAt=i=>D.items[i];// D.items is in the same (question, turn) order as D.order
const sumLen=k=>D.items.reduce((s,it)=>s+it[k],0);
// fill the inline numbers in the prose
const failIdx=B.findIndex(x=>x===null);
const nAll=C.models.reduce((s,m)=>s+m.s.filter(x=>x===null).length,0);
const ciSum=B.filter(x=>x!==null).reduce((s,x)=>s+x,0);
const sl=c=>G.slices.find(r=>r.cat===c);
const V={aggd:C.f(G.agg.mean),wrd:C.n(-sl('writing').mean),wrci:C.n(sl('writing').lo)+' to '+C.n(sl('writing').hi),exd:C.n(-sl('extraction').mean),
  cimean:C.mean(B).toFixed(3),cimean160:((ciSum-1)/160).toFixed(3),failq:D.order[failIdx][0]+' ('+C.catOf[failIdx]+', turn '+D.order[failIdx][1]+')',failall:String(nAll),tokcall:Math.round((JT.prompt+JT.completion)/JT.calls).toLocaleString('en-US')+' ('+Math.round(JT.prompt/JT.calls)+' prompt, '+Math.round(JT.completion/JT.calls)+' completion)',judgecost:'$'+(callCost*JT.calls).toFixed(2)+' for the two models, or $'+callCost.toFixed(3)+' per call'};
document.querySelectorAll('.pe-v').forEach(e=>{if(V[e.dataset.k]!==undefined)e.textContent=V[e.dataset.k]});
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function W(){return Math.max(300,$('ga-grid').clientWidth||600)}
function geom(){const w=W(),lw=w<480?74:96,rw=w<480?54:70;const cell=Math.max(9,Math.min(22,Math.floor((w-lw-rw-4)/20)));return{w,lw,rw,cell,g:cell>12?2:1}}
function cellFill(i){
  const a=A[i],b=B[i];
  if(step===0)return['var(--soft)',1];
  if(step===1)return['var(--acc)',.12+.88*a/10];
  if(step===2)return b===null?['var(--soft)',1]:['var(--acc)',.12+.88*b/10];
  if(b===null)return['var(--soft)',1];
  const d=b-a;if(d===0)return['var(--dim)',.55];
  return[d<0?'var(--bad)':'var(--good)',Math.min(1,.3+Math.abs(d)/6)];
}
function rightText(c,ri){
  const r=sl(c);
  if(step===0)return '20 turns';
  if(step===1)return C.mean(rows[ri].map(i=>A[i])).toFixed(2);
  if(step===2)return C.mean(rows[ri].map(i=>B[i])).toFixed(2);
  return C.f(r.mean);
}
function drawGrid(){
  const g=geom(),h=rows.length*(g.cell+g.g+4)+18;
  let s='<svg viewBox="0 0 '+g.w+' '+h+'" width="'+g.w+'" height="'+h+'" role="img" aria-label="160 graded turns in 8 slices">';
  s+='<text x="'+g.lw+'" y="11" font-size="11" fill="var(--mute)">'+(step===0?'golden set: one square per graded turn':step===1?'champion grade (darker = higher)':step===2?'challenger grade':'challenger minus champion, per turn')+'</text>';
  s+='<text x="'+(g.w-2)+'" y="11" font-size="11" fill="var(--mute)" text-anchor="end">'+(step===0?'':step<3?'mean':'mean Δ')+'</text>';
  C.CATS.forEach((c,ri)=>{
    const y=18+ri*(g.cell+g.g+4),r=sl(c),flag=step>=4&&mode===1?r.v:null;
    s+='<text x="'+(g.lw-6)+'" y="'+(y+g.cell*.75)+'" font-size="'+(g.w<480?11:12.5)+'" text-anchor="end"'+(flag&&flag!=='pass'?' font-weight="600" fill="'+(flag==='fail'?'var(--bad)':'var(--c5)')+'"':'')+'>'+C.CATN[c]+'</text>';
    rows[ri].forEach((i,j)=>{const f=cellFill(i),x=g.lw+j*(g.cell+g.g);
      s+='<rect x="'+x+'" y="'+y+'" width="'+g.cell+'" height="'+g.cell+'" rx="2" fill="'+f[0]+'" fill-opacity="'+f[1].toFixed(2)+'" stroke="var(--line)" stroke-width=".6"><title>Q'+D.order[i][0]+' turn '+D.order[i][1]+': '+C.esc(itemAt(i).p)+' | champion '+A[i]+', challenger '+(B[i]===null?'no grade':B[i])+'</title></rect>';
      if(step>=2&&B[i]===null){s+='<path d="M'+(x+2)+' '+(y+2)+'L'+(x+g.cell-2)+' '+(y+g.cell-2)+'M'+(x+g.cell-2)+' '+(y+2)+'L'+(x+2)+' '+(y+g.cell-2)+'" stroke="var(--bad)" stroke-width="1.6"/>'}
    });
    if(flag&&flag!=='pass')s+='<rect x="'+(g.lw-2)+'" y="'+(y-2)+'" width="'+(20*(g.cell+g.g)+2)+'" height="'+(g.cell+4)+'" rx="3" fill="none" stroke="'+(flag==='fail'?'var(--bad)':'var(--c5)')+'" stroke-width="1.6"'+(flag==='escalate'?' stroke-dasharray="4 3"':'')+'/>';
    const rt=rightText(c,ri),neg=step>=3&&r.mean<0;
    s+='<text x="'+(g.w-2)+'" y="'+(y+g.cell*.75)+'" font-size="12" text-anchor="end"'+(step>=3?' fill="'+(neg?'var(--bad)':r.mean>0?'var(--good)':'var(--mute)')+'"':'')+'>'+rt+'</text>';
  });
  $('ga-grid').innerHTML=s+'</svg>';
}
function axisBars(list,tol,title){
  const g=geom(),w=g.w,lw=g.lw,rw=g.rw+28,x0=lw,x1=w-rw,lo=-3,hi=3,X=v=>x0+(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(x1-x0);
  const rh=22,h=list.length*rh+40;
  let s='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+C.esc(title)+'">';
  s+='<text x="'+x0+'" y="11" font-size="11" fill="var(--mute)">'+title+'</text>';
  s+='<rect x="'+x0+'" y="16" width="'+(X(-tol)-x0)+'" height="'+(list.length*rh+4)+'" fill="var(--bad)" fill-opacity=".08"/>';
  for(let v=lo;v<=hi;v++){s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="16" y2="'+(20+list.length*rh)+'" stroke="var(--line)"'+(v===0?' stroke-width="1.5" stroke="var(--mute)"':'')+'/><text x="'+X(v)+'" y="'+(34+list.length*rh)+'" font-size="10.5" fill="var(--mute)" text-anchor="middle">'+(v>0?'+':v<0?'−':'')+Math.abs(v)+'</text>'}
  s+='<line x1="'+X(-tol)+'" x2="'+X(-tol)+'" y1="16" y2="'+(20+list.length*rh)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>';
  list.forEach((r,k)=>{const y=20+k*rh+rh/2,col=r.v==='fail'?'var(--bad)':r.v==='escalate'?'var(--c5)':'var(--good)';
    s+='<text x="'+(lw-6)+'" y="'+(y+4)+'" font-size="'+(w<480?11:12.5)+'" text-anchor="end">'+r.label+'</text>';
    s+='<line x1="'+X(r.lo)+'" x2="'+X(r.hi)+'" y1="'+y+'" y2="'+y+'" stroke="'+col+'" stroke-width="2"/><circle cx="'+X(r.mean)+'" cy="'+y+'" r="4.5" fill="'+col+'"/>';
    s+='<text x="'+(w-2)+'" y="'+(y+4)+'" font-size="11.5" text-anchor="end" font-weight="600" fill="'+col+'">'+(r.v==='fail'?'FAIL':r.v==='escalate'?'REVIEW':'pass')+'</text>';
  });
  return s+'</svg>';
}
function drawBars(){
  const el=$('ga-bars');
  if(step<4){el.innerHTML='';return}
  if(step===4){
    if(mode===0){const r=Object.assign({},G.agg,{label:'All 159',v:G.aggV});el.innerHTML=axisBars([r],O.aggTol,(geom().w<480?'paired Δ, 95% interval; shaded: fails':'mean paired Δ with 95% interval; shaded: past the 0.25-point threshold'))}
    else el.innerHTML=axisBars(G.slices.map(r=>Object.assign({},r,{label:C.CATN[r.cat]})),O.sliceTol,(geom().w<480?'paired Δ per slice, 95% interval':'mean paired Δ per slice with 95% interval; shaded: past the 0.5-point threshold'));
    return}
  if(step===5){
    const pa=C.PRICE[CH],pb=C.PRICE[CL],la=sumLen('la'),lb=sumLen('lb');
    const g=geom(),w=g.w,x0=g.lw,x1=w-g.rw-10,mx=35,X=v=>x0+v/mx*(x1-x0),rh=20;
    const rws=[['prompt $/M',pa[0],pb[0]],['completion $/M',pa[1],pb[1]]];
    let s='<svg viewBox="0 0 '+w+' 120" width="'+w+'" height="120" role="img" aria-label="Price per million tokens"><text x="'+x0+'" y="11" font-size="11" fill="var(--mute)">'+(w<480?'US$ per million tokens, July 2023':'US$ per million tokens, 2023 list prices (Anthropic sheet, July 2023)')+'</text>';
    rws.forEach((r,k)=>{const y=22+k*2*rh;
      s+='<text x="'+(x0-6)+'" y="'+(y+13)+'" font-size="11.5" text-anchor="end">'+r[0]+'</text>';
      s+='<rect x="'+x0+'" y="'+y+'" width="'+(X(r[1])-x0)+'" height="14" fill="var(--c4)" rx="2"/><text x="'+(X(r[1])+4)+'" y="'+(y+11)+'" font-size="11">'+r[1].toFixed(2)+' champion</text>';
      s+='<rect x="'+x0+'" y="'+(y+rh)+'" width="'+(X(r[2])-x0)+'" height="14" fill="var(--c6)" rx="2"/><text x="'+(X(r[2])+4)+'" y="'+(y+rh+11)+'" font-size="11">'+r[2].toFixed(2)+' challenger</text>'});
    el.innerHTML=s+'<text x="'+x0+'" y="112" font-size="11" fill="var(--mute)">answers: champion '+la.toLocaleString('en-US')+' characters, challenger '+lb.toLocaleString('en-US')+' over the 160 turns</text></svg>';
    return}
  // step 6: decision
  if(mode===0){el.innerHTML='<div class="gdec pass"><b>Promoted to shadow traffic.</b> The aggregate gate passed and the budget gate passed. The writing regression is now on its way to users.</div>';return}
  const big=D.items.map((it,i)=>({it,i,d:B[i]===null?0:B[i]-A[i]})).filter(x=>x.it.c==='writing'&&x.d<0).sort((a,b)=>a.d-b.d).slice(0,3);
  el.innerHTML='<div class="gdec fail"><b>Blocked.</b> Writing fails; extraction goes to review. Error analysis starts from the largest writing drops:</div><ul class="tight gex">'+big.map(x=>'<li><b>Q'+x.it.q+', turn '+x.it.t+'</b> ('+A[x.i]+' → '+B[x.i]+'): "'+C.esc(x.it.p.slice(0,90))+(x.it.p.length>90?'...':'')+'"'+(x.it.jb?'<br><span class="mute">Judge: "'+C.esc(x.it.jb.slice(0,300))+'..."</span>':'')+'</li>').join('')+'</ul><p class="small">All three are second-turn rewrites under an explicit constraint (begin each sentence with the next letter of the alphabet, keep a headline under 10 words, start every sentence with the letter A). That is a failure mode with a name, so it becomes a <b>tag</b> and a set of new items in the next golden-set version (an illustrative next step: MT-Bench itself is frozen). The next swap is then gated on "constrained rewrite" as its own slice.</p>';
}
function caption(){
  const nAgg=G.agg.n;
  const cap=[
   '<b>Step 1. The golden set.</b> 160 graded turns: 80 questions, two turns each, tagged with one of 8 categories. The tags are what make per-slice gating possible; a set without them can only be averaged.',
   '<b>Step 2. Score the champion.</b> GPT-4 grades each of claude-v1\'s 160 turns from 1 to 10 (160 judge calls). Mean '+C.mean(A).toFixed(2)+'. In a real pipeline these grades are cached; only the challenger is re-scored on each change.',
   '<b>Step 3. Score the challenger.</b> Another 160 judge calls. Mean '+C.mean(B).toFixed(2)+' over 159 grades: one judge call (crossed out) never produced a grade, so that question-turn is dropped from <i>both</i> sides, leaving '+nAgg+' pairs.',
   '<b>Step 4. Pair them.</b> Same item, two models: subtract. Red turns got worse, green got better, grey stayed level: '+G.agg.worse+' worse, '+G.agg.same+' level, '+G.agg.better+' better. Pairing removes the item\'s own difficulty from the comparison, the single cheapest gain in a gate\'s sensitivity.',
   mode===0?'<b>Step 5. The aggregate gate.</b> Mean paired change '+C.f(G.agg.mean)+' points (95% interval '+C.n(G.agg.lo)+' to '+C.n(G.agg.hi)+'). Not past the 0.25-point threshold: <b>pass</b>. Look at the grid above: the writing row is mostly red, and nothing in this rule can see it.'
           :'<b>Step 5. The per-slice gate.</b> The same numbers, split by tag. Writing: '+C.f(sl('writing').mean)+' points, interval '+C.n(sl('writing').lo)+' to '+C.n(sl('writing').hi)+', wholly below zero: <b>fail</b>. Extraction: '+C.f(sl('extraction').mean)+', but its interval reaches '+C.f(sl('extraction').hi)+': too few items to tell, so <b>review</b> (more samples or a human), never a silent pass and never "re-run until green". Each slice has only 20 turns, so only large drops can fail it; Eval statistics covers that trade-off.',
   '<b>Step 6. The budget gate.</b> Computed from the same runs, so it costs nothing extra. The challenger\'s list price is '+(C.PRICE[CH][0]/C.PRICE[CL][0]).toFixed(1)+' times lower for prompts and '+(C.PRICE[CH][1]/C.PRICE[CL][1]).toFixed(1)+' times lower for completions, and its answers are '+Math.round(100*(1-sumLen('lb')/sumLen('la')))+'% shorter: <b>pass</b>. (Latency was not recorded in this data, so that half of the gate cannot be shown.)',
   mode===0?'<b>Step 7. Decision.</b> Both gates passed, so the swap goes on to shadow traffic. If users write and edit text in this product, they will be the ones who find the writing regression.'
           :'<b>Step 7. Decision and promotion.</b> The swap is blocked on writing, and the failing turns go to error analysis. What it finds becomes new tagged items: the golden set grows from the failures it just caught.'
  ][step];
  $('ga-cap').innerHTML=cap;
  const calls=step===0?0:step===1?160:320;
  const vd=step<4?'...':(step===4?(mode===0?G.aggV:(G.slices.some(r=>r.v==='fail')?'fail':'pass')):step===5?'pass':(mode===0?'promote':'block'));
  $('ga-count').innerHTML=[['Judge calls',String(calls),'GPT-4, one per graded turn'],['Judge cost','$'+(calls*callCost).toFixed(2),'2023 GPT-4 prices, real token counts'],['Pairs compared',step>=3?String(nAgg):'...',step>=2?'1 grade missing':''],['Worse / level / better',step>=3?G.agg.worse+' / '+G.agg.same+' / '+G.agg.better:'...',''],['Verdict',vd,step>=4?(step===4?'quality gate':step===5?'budget gate':'promotion'):'']]
    .map(k=>'<div class="stat"><div class="k">'+k[0]+'</div><div class="v'+(k[0]==='Verdict'&&/fail|block/.test(k[1])?' bad':k[0]==='Verdict'&&/pass|promote/.test(k[1])?' good':'')+'">'+k[1]+'</div><div class="d">'+k[2]+'</div></div>').join('');
}
function draw(){$('ga-scrub').value=step;drawGrid();drawBars();caption();
  $('ga-m0').classList.toggle('on',mode===0);$('ga-m1').classList.toggle('on',mode===1);$('ga-play').textContent=playing?'Pause':'Play'}
function tick(){if(!playing)return;if(!onScreen||document.hidden){timer=setTimeout(tick,500);return}
  if(step<N-1){step++;draw();timer=setTimeout(tick,3200/(+$('ga-speed').value))}else{playing=false;draw()}}
function play(){if(playing){playing=false;clearTimeout(timer);draw();return}
  if(step>=N-1)step=0;playing=true;draw();timer=setTimeout(tick,(reduce?4000:3200)/(+$('ga-speed').value))}
$('ga-play').onclick=play;
$('ga-prev').onclick=()=>{playing=false;clearTimeout(timer);step=Math.max(0,step-1);draw()};
$('ga-next').onclick=()=>{playing=false;clearTimeout(timer);step=Math.min(N-1,step+1);draw()};
$('ga-scrub').oninput=e=>{playing=false;clearTimeout(timer);step=+e.target.value;draw()};
$('ga-m0').onclick=()=>{mode=0;draw()};$('ga-m1').onclick=()=>{mode=1;draw()};
if('IntersectionObserver' in window)new IntersectionObserver(es=>{onScreen=es[0].isIntersecting},{threshold:.1}).observe($('ga'));
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-read').hidden)draw()},120)});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([draw]);
draw();
})();
