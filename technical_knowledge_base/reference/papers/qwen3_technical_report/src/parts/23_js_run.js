// ---- Run a toy Qwen3: the playground, the toy's Figure 2, the cut-answer analysis, distillation against RL, curves ----
(function(){
const R=window.TOYR,V=R.variants,W=window.TQW,VOC=W.vocab;
const pc=v=>(100*v).toFixed(1)+'%',pc0=v=>Math.round(100*v)+'%';
const NM={fused:'Fused',think:'Thinking-only',budget:'Budget-trained'},COL={fused:'var(--c1)',think:'var(--c2)',budget:'var(--c3)'};
const SHIP=Object.keys(W.variants);
// numbers in the text
const fill={params:()=>fmt(V.fused.params)+'',
  check:()=>R.check?('its outputs match PyTorch on the same weights for '+R.check.same_trace+' decoded responses across modes and budgets, every logit within '+R.check.max_abs_logit_diff.toExponential(1)+' ('+R.check.result+')'):'the JavaScript check has not been run',
  overlap:()=>pc0(V.fused.overlap.seen_items/V.fused.overlap.test_total)};
document.querySelectorAll('.tv').forEach(el=>{const f=fill[el.dataset.k];if(f)el.textContent=f()});

// ===== playground =====
let tv='fused',tm='think';
const avail=v=>SHIP.indexOf(v)>=0;
function parse(){let d=($('tqD').value.match(/\d/g)||[]).map(Number).slice(0,W.nmax);if(!d.length)d=[3];return d}
function drawTQ(w){const q=parse(),b=+$('tqB').value,budget=b>=13?null:b;$('tqBv').textContent=budget==null?'none':budget+' tokens';
  if(!avail(tv)){$('tqSvg').innerHTML='<p class="small mute">This variant is measured offline only (its weights are not shipped, to keep the page small); its numbers are in the chart below.</p>';$('tqOut').innerHTML='';return}
  const r=TQ.decode(tv,q,tm,budget),M=TQ.load(tv),keep={};const pos=r.seq.length-2;TQ.forward(M,r.seq.slice(0,pos+1),keep);
  const L=keep.att.length,att=new Float64Array(pos+1);keep.att[L-1].forEach(h=>{const row=h[pos];for(let i=0;i<=pos;i++)att[i]+=row[i]/keep.att[L-1].length});
  const toks=r.seq.map(t=>VOC[t]),forced=new Set();let ri=r.start;r.steps.forEach(s=>{if(s.forced)forced.add(ri);ri++});
  const ps=TQ.psums(q);const n=toks.length,cw=Math.max(18,Math.min(40,(w-8)/Math.min(n,Math.max(12,Math.floor((w-8)/22))))),perRow=Math.max(1,Math.floor((w-8)/cw)),rows=Math.ceil(n/perRow),rh=78;
  let s='';const mx=Math.max(...att);
  let thinkIdx=0;
  toks.forEach((t,i)=>{const row=Math.floor(i/perRow),x=4+(i%perRow)*cw,y=6+row*rh;const resp=i>=r.start;
    const isTh=resp&&t.length===1&&/\d/.test(t)&&i<r.seq.length-1,isAns=i===r.seq.length-1&&r.ans!=null;
    const f=forced.has(i)?'var(--c2)':!resp?'var(--soft)':isAns?'var(--c3)':isTh?'var(--acc2)':'var(--bg)';
    s+=rc(x,y,cw-3,22,f,{r:3,s:'var(--line)'});const lab=t.replace('/no_think','/no').replace('/think','/th').replace('</think>','</t>').replace('<think>','<t>');
    s+=tx(x+(cw-3)/2,y+15,lab.replace(/</g,'&lt;').replace(/>/g,'&gt;'),{fs:11,a:'middle',c:forced.has(i)||isAns?'#fff':'var(--ink)'});
    if(isTh){const want=ps[thinkIdx];s+=tx(x+(cw-3)/2,y+37,want,{fs:11,a:'middle',c:want===+t?'var(--good)':'var(--bad)'});thinkIdx++}
    if(isAns)s+=tx(x+(cw-3)/2,y+37,ps[ps.length-1],{fs:11,a:'middle',c:r.ans===ps[ps.length-1]?'var(--good)':'var(--bad)',w:'600'});
    if(i<=pos){const a=att[i]/mx;s+=rc(x,y+44,cw-3,10,'var(--acc)',{r:1,op:(.08+.92*a).toFixed(3)})}});
  $('tqSvg').innerHTML=svgW(w,rows*rh+8,s,'The toy model\'s response');
  const ok=r.ans===ps[ps.length-1];
  $('tqOut').innerHTML=stat('Answer',r.ans==null?'none':r.ans,'correct: '+ps[ps.length-1])+stat('Result',ok?'right':'wrong',r.cut?'thinking cut at '+budget+' of the '+q.length+' steps it needed':(r.think.length?'thinking finished on its own':'no thinking'))+stat('Thinking tokens',r.think.length,tm==='nothink'&&r.think.length?'it ignored /no_think':'')+(r.cut&&r.think.length?stat('Answer equals last running sum written',r.ans===r.think[r.think.length-1]?'yes':'no','that sum: '+r.think[r.think.length-1]):'')}
const tqRender=()=>fit($('tqSvg'),drawTQ);
onTab('t-run',tqRender);
['tqD','tqB'].forEach(id=>$(id).addEventListener('input',()=>refit($('tqSvg'))));
$('tqR').addEventListener('click',()=>{const rnd=Math.random,n=1+Math.floor(rnd()*W.nmax);$('tqD').value=Array.from({length:n},()=>Math.floor(rnd()*10)).join(' ');refit($('tqSvg'))});
segBind('tqV',m=>{tv=m;$('tqV').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('tqSvg'))});
segBind('tqM',m=>{tm=m;$('tqM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('tqSvg'))});

// ===== toy Figure 2 =====
let bv='fused';
function drawTB2(w){const W2=w,H=260,pl=40,pr=12,pt=14,pb=40,B=R.budgets,X=i=>pl+(W2-pl-pr)*(i+.5)/B.length,bw=Math.max(4,(W2-pl-pr)/B.length*.7),Y=v=>pt+(H-pt-pb)*(1-v);let s='';
  for(let t=0;t<=1;t+=.25)s+=ln2(pl,Y(t),W2-pr,Y(t),'var(--line)')+tx(pl-5,Y(t)+4,pc0(t),{fs:11,a:'end',c:'var(--mute)'});
  B.forEach((b,i)=>{if(i%2===0||W2>520)s+=tx(X(i),H-pb+15,b,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+W2-pr)/2,H-6,'thinking budget (tokens); problems need 1 to 12',{fs:11,a:'middle',c:'var(--mute)'});
  const vs=bv==='all'?['fused','think','budget']:[bv];
  if(bv!=='all'){const S=V[bv].sweep,N=S[0].cut+S[0].finished;S.forEach((r,i)=>{const fin=r.finished/N,cc=r.cut?r.acc_cut*r.cut/N:0;
      s+=rc(X(i)-bw/2,Y(fin),bw,Y(0)-Y(fin),COL[bv],{r:1})+rc(X(i)-bw/2,Y(fin+cc),bw,Y(fin)-Y(fin+cc),'var(--c5)',{r:1})});
    s+=legend([['thinking finished in budget',COL[bv]],['cut off, answer right','var(--c5)']],pl+4,pt+12,W2-pl-pr-90).s;
    if(bv!=='think'){const nt=V[bv].modes.nothink.acc;s+=ln2(pl,Y(nt),W2-pr,Y(nt),'var(--ink)',{da:'5 4',sw:1.4})+tx(W2-pr,Y(nt)-5,'/no_think '+pc(nt),{fs:11,a:'end'})}}
  else{vs.forEach(v=>{let d='';V[v].sweep.forEach((r,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+','+Y(r.acc).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+COL[v]+'" stroke-width="2"/>'});
    const Lg=legend(vs.map(v=>[NM[v],COL[v]]),pl,pt+10,W2-pl-pr);s+=Lg.s}
  $('tb2Svg').innerHTML=svgW(W2,H,s,'Toy accuracy against thinking budget');
  if(bv!=='all'){const S=V[bv].sweep,h=S[Math.min(6,S.length-1)];$('tb2Out').innerHTML=stat('At budget 0',pc(S[0].acc),bv==='think'?'':'vs '+pc(V[bv].modes.nothink.acc)+' with /no_think')+stat('At budget 6',pc(h.acc),h.cut+' of '+(h.cut+h.finished)+' cut off')+stat('Cut-off answers right',pc(h.acc_cut),'at budget 6')+stat('Cut-off answers = last running sum',pc(h.cut_eq_last),'at budget 6')}
  else $('tb2Out').innerHTML=''}
onTab('t-run',()=>fit($('tb2Svg'),drawTB2));
segBind('tb2M',m=>{bv=m;$('tb2M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('tb2Svg'))});
// live check on fresh problems, in slices so the page stays responsive
$('tb2Live').addEventListener('click',()=>{const v=avail(bv)?bv:'fused',rand=mulberry32(Date.now()%100000),jobs=[],res={};const BS=[0,6,12];
  for(let n=1;n<=W.nmax;n++)for(let k=0;k<5;k++){const q=Array.from({length:n},()=>Math.floor(rand()*10));BS.forEach(b=>jobs.push([q,b]))}
  let i=0;const out=$('tb2LiveOut');out.textContent='running '+NM[v]+'…';
  (function step(){const t0=performance.now();while(i<jobs.length&&performance.now()-t0<30){const [q,b]=jobs[i++],r=TQ.decode(v,q,'think',b),ps=TQ.psums(q);res[b]=res[b]||[0,0];res[b][0]+=r.ans===ps[ps.length-1];res[b][1]++}
    if(i<jobs.length){out.textContent='running '+NM[v]+': '+i+' of '+jobs.length;setTimeout(step,0)}
    else out.innerHTML=NM[v]+', 60 fresh problems: '+BS.map(b=>'budget '+b+': <b>'+pc0(res[b][0]/res[b][1])+'</b> (test set '+pc0(V[v].sweep[b].acc)+')').join(' · ')})()});

// ===== the cut-answer analysis (Reading predict reveal and the Run tab text) =====
// references for problems cut at budget b: the model's own /no_think accuracy on the same lengths, and on what is left
// to add after b running sums (a list of n - b + 1 numbers: the last sum written plus the n - b digits not yet added)
function refs(v,b){const pn=V[v].modes.nothink.per_n,ns=[];for(let n=b+1;n<=W.nmax;n++)ns.push(n);
  const avg=f=>ns.reduce((a,n)=>a+f(n),0)/ns.length;return {same:avg(n=>pn[n]),rest:avg(n=>pn[n-b+1])}}
function cutBars(el,w){const b=6,rows=['fused','think','budget'],rh=W2h(),pl=Math.min(150,w*.3),W2=w,x=v=>pl+(W2-pl-8)*v*.72;let s='';
  function W2h(){return 92}
  rows.forEach((v,i)=>{const r=V[v].sweep[b],y=8+i*rh,f=refs(v,b);s+=tx(pl-8,y+16,NM[v],{fs:12,a:'end',w:'600'});
    const items=[['answer = last sum written',r.cut_eq_last,'var(--c2)'],['answer right',r.acc_cut,'var(--good)']];
    if(v!=='think')items.push(['its /no_think on the same problems',f.same,'var(--dim)'],['its /no_think on what was left to add',f.rest,'var(--dim)']);
    items.forEach(([lab,val,c],k)=>{const yy=y+k*20;s+=rc(x(0),yy+4,Math.max(1,x(val)-x(0)),14,c,{r:2})+tx(x(val)+4,yy+15,pc0(val)+' '+lab,{fs:11})})});
  el.innerHTML=svgW(W2,rows.length*rh+10,s,'What the toy answers when its thinking is cut at 6 tokens')}
PRED_REVEAL['pr-emerge']=()=>{fit($('emC'),w=>cutBars($('emC'),w));const f=V.fused.sweep[6],bt=V.budget.sweep[6],rf=refs('fused',6),rb=refs('budget',6);
  $('emTxt').innerHTML='Problems cut at 6 thinking tokens: the '+fmt(f.cut)+' test problems that need 7 to 12. The fused toy answers with the last running sum it wrote in <b>'+pc(f.cut_eq_last)+'</b> of them, and is right in '+pc(f.acc_cut)+', below its own /no_think accuracy on the same problems ('+pc(rf.same)+'). Every complete thinking sample it saw ended with the answer as the last thought, so "repeat the last thought" is the rule its data taught, and fusion with empty-thinking samples did not change it. The thinking-only toy does exactly the same. The toy trained on cut-off thinking does better ('+pc(bt.acc_cut)+' right) but still not well: if it added the remaining digits to the last sum as well as it answers short problems directly, it would reach about '+pc(rb.rest)+'. So in the toy, answering from partial thinking does not come from fusion, and only partly from training on it. The real Qwen3 does better than the fused toy (its 1K-token scores in Figure 2 beat non-thinking); the toy cannot say whether that comes from fusion, from the natural-language stop sentence a real model can read, or from stage 4. <a href="#" data-tab="t-run" class="small">Run the toy yourself</a>';
  $('emTxt').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('.tabs button[data-t="t-run"]').click()}))};

(function(){const f=V.fused,t=V.think,b=V.budget,fs=f.sweep,bs=b.sweep,first=bs.findIndex((r,i)=>i>0&&bs.slice(i).every(x=>x.acc>=b.modes.nothink.acc)),low=bs.reduce((m,r)=>r.acc<m.acc?r:m,bs[0]),rb=refs('budget',6);
  $('tbTxt').innerHTML='<ul>'+
  '<li><b>The curve rises smoothly anyway.</b> The fused toy goes from '+pc(fs[0].acc)+' at budget 0 to '+pc(fs[fs.length-1].acc)+' at 12, a smooth curve like Figure 2, yet almost all of the rise is problems that <i>finished</i> inside the budget (the coloured part of each bar; gold is cut-off answers that were right); its cut-off answers stay near '+pc0(fs[4].acc_cut)+'. A smooth aggregate curve does not show that a model uses partial thinking well; it can come from the mixture of problem lengths alone.</li>'+
  '<li><b>Below the non-thinking line.</b> At small budgets the fused toy is worse than not thinking at all: '+pc(fs[2].acc)+' at budget 2 against '+pc(f.modes.nothink.acc)+' with /no_think. Even budget 0, an empty think block after /think, gives '+pc(fs[0].acc)+': its direct-answer skill is tied to the /no_think flag, not to the empty block. The real model in Figure 2 never drops below its non-thinking line, so it does not have this failure.</li>'+
  '<li><b>Explicit training helps, partly.</b> The budget-trained toy matches its /no_think accuracy at budget 0 ('+pc(bs[0].acc)+' against '+pc(b.modes.nothink.acc)+') and is right on '+pc(bs[6].acc_cut)+' of cut-off answers at budget 6 (fused: '+pc(fs[6].acc_cut)+'). But it dips to '+pc(low.acc)+' at budget '+low.b+' and only stays above its non-thinking line from budget '+first+' on: it learned to answer when cut off, not to continue the sum from where it stopped (that would give about '+pc(rb.rest)+' at budget 6). Full thinking is unharmed ('+pc(b.modes.think.acc)+').</li>'+
  '<li><b>Fusion did build the switch.</b> The fused toy obeys both flags: /think '+pc(f.modes.think.acc)+' (no flag: '+pc(f.modes.default.acc)+'), /no_think '+pc(f.modes.nothink.acc)+' with no thinking tokens. The thinking-only toy ignores /no_think and thinks anyway (mean '+t.modes.nothink.mean_think.toFixed(1)+' thinking tokens).</li></ul>'})();
$('toyConc').innerHTML='<ul><li><b>Shown:</b> one set of weights can learn both modes from fused data and switch on a flag; answering usefully from cut-off thinking does not follow from fusion by itself in a model that has only seen complete and empty thinking; training on cut-off examples helps but, at this scale and mix, does not teach the model to continue from its partial work; and a smooth accuracy-against-budget curve can arise from problem lengths alone.</li>'+
  '<li><b>Not shown:</b> anything about language. The report\'s stop sentence asks, in words, for an answer from the thinking so far; a large model can follow that, the toy has no words. Nor can the toy test stage 4\'s RL on format and mode following, or scale. One seed per variant; a quarter of the budget-trained mix was cut-off samples, and other mixes were not tried.</li>'+
  '<li><b>So:</b> the report\'s "emerges naturally" may be true of Qwen3, and Figure 2 is consistent with it, but it is not a property of fusion as such, and the report offers no ablation to separate the causes.</li></ul>';

// ===== distillation against RL (if measured) =====
function drawDist(el,w){const D=R.distill;if(!D){el.innerHTML='<p class="small mute">Not run.</p>';return}
  const runs=D.runs,met=el.__met||'pass1_greedy',W2=w,H=240,pl=44,pr=14,pt=14,pb=40;
  const xs=r=>r.student_fwd+r.student_bwd+(r.teacher_fwd||0);let xmax=0;runs.forEach(r=>{r.rl.concat(r.od).forEach(c=>{xmax=Math.max(xmax,xs(c))})});
  const X=v=>pl+(W2-pl-pr)*v/xmax,Y=v=>pt+(H-pt-pb)*(1-v);let s='';
  for(let t=0;t<=1;t+=.25)s+=ln2(pl,Y(t),W2-pr,Y(t),'var(--line)')+tx(pl-5,Y(t)+4,pc0(t),{fs:11,a:'end',c:'var(--mute)'});
  s+=tx((pl+W2-pr)/2,H-6,W2<560?'model-token passes (millions)':'compute: model-token passes (millions; student forward + backward + teacher forward)',{fs:11,a:'middle',c:'var(--mute)'});
  for(let k=0;k<=4;k++){const v=xmax*k/4;s+=tx(X(v),H-pb+15,(v/1e6).toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})}
  runs.forEach(r=>{[['rl','var(--c2)'],['od','var(--c4)']].forEach(([m,c])=>{let d='';r[m].forEach((p,i)=>{d+=(i?'L':'M')+X(xs(p)).toFixed(1)+','+Y(p[met]).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="1.8" opacity=".85"/>'})});
  const L=legend([['RL (GRPO-style)','var(--c2)'],['on-policy distillation','var(--c4)']],pl,pt+10,W2-pl-pr);
  el.querySelector('.dsv').innerHTML=svgW(W2,H,s+L.s,'Toy distillation against RL')}
function distBlock(id){const el=$(id);if(!el||!R.distill)return;
  const runs=R.distill.runs,last=(r,m)=>r[m][r[m].length-1],avg=f=>runs.reduce((a,r)=>a+f(r),0)/runs.length;
  const t=r=>({off:r.off,rl:last(r,'rl'),od:last(r,'od')});
  el.innerHTML='<div class="seg" role="group" aria-label="Metric"><button class="on" data-m="pass1_greedy" aria-pressed="true">pass@1</button><button data-m="pass16" aria-pressed="false">pass@16</button><button data-m="trace_pass16" aria-pressed="false">pass@16, whole trace right</button></div><div class="dsv"></div>'+
   '<div class="tw"><table><thead><tr><th>'+runs.length+' seeds, mean</th><th class="num">pass@1</th><th class="num">pass@16</th><th class="num">pass@16, trace</th><th class="num">model-token passes</th><th class="num">CPU seconds</th></tr></thead><tbody>'+
   [['Off-policy checkpoint',r=>r.off,r=>0,r=>r.off_seconds],['+ RL',r=>last(r,'rl'),r=>{const c=last(r,'rl');return c.student_fwd+c.student_bwd},r=>r.rl_seconds],['+ On-policy distillation',r=>last(r,'od'),r=>{const c=last(r,'od');return c.student_fwd+c.student_bwd+c.teacher_fwd},r=>r.od_seconds]].map(([n,f,cst,sec])=>
     '<tr><td>'+n+'</td><td class="num">'+pc(avg(r=>f(r).pass1_greedy))+'</td><td class="num">'+pc(avg(r=>f(r).pass16))+'</td><td class="num">'+pc(avg(r=>f(r).trace_pass16))+'</td><td class="num">'+(n.indexOf('Off')===0?'not counted':(avg(cst)/1e6).toFixed(2)+'M')+'</td><td class="num">'+avg(sec).toFixed(0)+'</td></tr>').join('')+'</tbody></table></div>';
  const o=avg(r=>r.off.pass1_greedy),a=avg(r=>last(r,'rl').pass1_greedy),d=avg(r=>last(r,'od').pass1_greedy),
    cr=avg(r=>{const c=last(r,'rl');return c.student_fwd+c.student_bwd}),cd=avg(r=>{const c=last(r,'od');return c.student_fwd+c.student_bwd+c.teacher_fwd}),
    to=avg(r=>r.off.trace_pass16),ta=avg(r=>last(r,'rl').trace_pass16),td=avg(r=>last(r,'od').trace_pass16),po=avg(r=>r.off.pass16),pa=avg(r=>last(r,'rl').pass16),pd=avg(r=>last(r,'od').pass16);
  const runs1=runs[0];
  el.insertAdjacentHTML('beforeend','<p class="small">'+runs.length+' seeds, each from its own off-policy checkpoint ('+fmt(runs1.student_params)+'-parameter student, '+fmt(runs1.steps.off)+' steps on the teacher\'s greedy responses), then '+runs1.steps.p2+' steps of 256 sampled responses for each method. Greedy pass@1 goes from '+pc(o)+' to '+pc(a)+' with RL and '+pc(d)+' with on-policy distillation, for '+(cd/cr).toFixed(2)+' times the model-token passes (the teacher\'s forward pass is the extra). Pass@16 on the answer '+(pa<po&&pd<po?'falls with both':'moves')+' ('+pc(po)+' to '+pc(pa)+' with RL, '+pc(pd)+' with distillation)'+(pa<po&&pd<po?': both sharpen the policy':'')+', and a 1-in-10 answer is easy to hit by chance in 16 tries. Pass@16 with the whole thinking trace right, which chance cannot reach, '+(ta<to?'falls':'moves')+' with RL ('+pc(to)+' to '+pc(ta)+') and '+(td>to?'rises':'moves')+' with distillation (to '+pc(td)+'). Per seed, distillation minus RL in pass@1: '+runs.map(r=>((last(r,'od').pass1_greedy-last(r,'rl').pass1_greedy)*100).toFixed(1)).join(', ')+' points; '+(runs.some(r=>last(r,'od').pass1_greedy>.9)?'the seeds differ a lot (one student jumps past 90%, as the teacher itself did suddenly during its training)':'the seeds differ')+'. The toy agrees with Table 21 on the direction (dense per-token signal beats one reward per sample at equal samples) and on RL not widening what the model can reach; the size of the gap is the toy\'s, not Qwen3\'s.</p>');
  el.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('.seg button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});el.__met=b.dataset.m;refit(el.querySelector('.dsv'))}));
  onTab(id==='dsC'?'t-read':'t-run',()=>fit(el.querySelector('.dsv'),w=>drawDist(el,w)))}
distBlock('dsC');distBlock('dsRun');

// ===== training curves =====
function drawTC(w){const W2=w,H=220,pl=44,pr=14,pt=14,pb=36,vs=['fused','think','budget'],X=s=>pl+(W2-pl-pr)*s/6000;
  const ly=v=>pt+(H-pt-pb)*(1-(Math.log10(v)+4)/(Math.log10(20)+4));let s='';
  [1e-4,1e-3,1e-2,0.1,1,10].forEach(v=>{s+=ln2(pl,ly(v),W2-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v>=1?v:v.toExponential(0),{fs:11,a:'end',c:'var(--mute)'})});
  for(let k=0;k<=6;k++)s+=tx(X(k*1000),H-pb+15,k+'k',{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx((pl+W2-pr)/2,H-4,'training step; loss (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  vs.forEach(v=>{let d='';V[v].log.forEach((r,i)=>{d+=(i?'L':'M')+X(r.step).toFixed(1)+','+ly(Math.max(1e-4,r.loss)).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+COL[v]+'" stroke-width="1.6"/>'});
  const L=legend(vs.map(v=>[NM[v],COL[v]]),pl,pt+10,W2-pl-pr);
  let tb='<div class="tw"><table><thead><tr><th>Step</th>'+vs.map(v=>'<th class="num">'+NM[v]+' /think</th><th class="num">/no_think</th>').join('')+'</tr></thead><tbody>';
  V.fused.log.filter(r=>r.think!=null).forEach(r=>{tb+='<tr><td>'+fmt(r.step)+'</td>'+vs.map(v=>{const q=V[v].log.find(x=>x.step===r.step&&x.think!=null);return '<td class="num">'+(q?pc0(q.think):'')+'</td><td class="num">'+(q?pc0(q.nothink):'')+'</td>'}).join('')+'</tr>'});
  $('tcC').innerHTML=svgW(W2,H,s+L.s,'Training loss curves')+tb+'</tbody></table></div>'}
onTab('t-run',()=>fit($('tcC'),drawTC));
})();
