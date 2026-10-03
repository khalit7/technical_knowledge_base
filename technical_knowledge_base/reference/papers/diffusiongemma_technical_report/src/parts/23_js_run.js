// ---- Run the toy tab, the Reading tab's toy animation and the predict question that runs the toy ----
(function(){
const BV=[0,0.01,0.02,0.03,0.05,0.1,0.15,0.2,0.3,0.4,0.5,0.7,1,1.5,2,3,4,5,6,8,100],EV=[0,0.0005,0.001,0.005,0.01,0.05,0.1,0.2,0.5];
const T=window.TOY||{},R=(T.results||{}).runs||[],held=TD.testRules;
const ruleTxt=r=>TD.ruleBits(r).map((b,i)=>['000','001','010','011','100','101','110','111'][i]+'→'+b).join(' ');
const randBits=(rng,n)=>Array.from({length:n},()=>rng()<0.5?1:0);
// a fixed problem for the Reading tab's animation (chosen by mk_toydata.py: a held-out rule the toy solves, with revisions)
const DEMO=T.demo||{task:'seq',rule:held[3],bits:[0,1,1]};
const paperOpts=()=>({N:48,b:0.1,estop:0.005,tmax:0.8,tmin:0.4,sc:true,seed:1});
if($('dgx')){const pb=TD.problem(DEMO.task,DEMO.rule,DEMO.bits);
  $('dgxProb').innerHTML='Task <b>'+DEMO.task+'</b>, held-out rule '+DEMO.rule+' ('+ruleTxt(DEMO.rule)+'), '+(DEMO.task==='seq'?'start '+DEMO.bits.join(' '):'input '+DEMO.bits.join(''));
  onTab('t-read',()=>{});TOYV('dgx',{problem:()=>pb,opts:paperOpts})}

if($('toyNote')&&T.nums){const n=T.nums,p=x=>(100*x).toFixed(0)+'%';
  $('toyNote').innerHTML='<b>What the toy finds</b> (512 held-out problems, measured offline): only multinomial noise produces revisions (<b>'+n.ms.revisions.toFixed(2)+'</b> per answer against the masked twin\'s '+n.ks.revisions.toFixed(2)+'), as Section 3.2 argues; but they buy no accuracy here: exact answers '+p(n.ms.acc)+' / '+p(n.mc.acc)+' for multinomial against '+p(n.ks.acc)+' / '+p(n.kc.acc)+' for masked (seq / conv), and masked settles in fewer passes, since a [mask] marks exactly what is unknown (one training seed each; the paper never makes this comparison). The rest is on the <a href="#" data-tab="t-run">Run the toy</a> tab.'}
// predict: steps per canvas, seq against conv, run live
function testSet(nPer,seed){const rng=mulberry32(seed),out=[];for(const task of ['seq','conv'])for(let i=0;i<nPer;i++){const r=held[i%held.length];out.push(TD.problem(task,r,randBits(rng,task==='seq'?3:TD.NB)))}return out}
function runBatch(probs,o,models,done,progress){const res={};models.forEach(m=>res[m]={seq:{n:0,ok:0,steps:0,canv:0,fwd:0,rev:0},conv:{n:0,ok:0,steps:0,canv:0,fwd:0,rev:0}});
  let i=0;const M={multinomial:TD.load('multinomial'),masked:TD.load('masked')};
  function chunk(){const t0=performance.now();while(i<probs.length&&performance.now()-t0<40){const pb=probs[i++];
      models.forEach(m=>{const a=res[m][pb.task];let r;if(m==='ar'){r=TD.autoregress(M.multinomial,pb.prompt);a.fwd+=r.fwd;a.canv+=TD.K;a.steps+=TD.NB}else{r=TD.diffuse(M[m],pb.prompt,o);a.fwd+=r.fwd;a.steps+=r.steps.reduce((x,y)=>x+y,0);a.canv+=TD.K;a.rev+=r.revisions}
        a.n++;if(r.ans.every((b,j)=>b===pb.ref[j]))a.ok++})}
    if(progress)progress(i,probs.length);if(i<probs.length)setTimeout(chunk,0);else done(res)}
  chunk()}
PRED_REVEAL['pr-steps']=function(){const host=$('prStepsC');$('prStepsO').textContent='Running 96 problems in your browser...';
  runBatch(testSet(48,77),paperOpts(),['multinomial'],res=>{const r=res.multinomial,s=r.seq,c=r.conv;const ps=s.steps/s.canv,pc=c.steps/c.canv;
    $('prStepsO').innerHTML='Passes per canvas: <b>seq '+ps.toFixed(1)+'</b> against <b>conv '+pc.toFixed(1)+'</b> ('+(ps/pc).toFixed(1)+'x); exact answers '+s.ok+' / '+s.n+' and '+c.ok+' / '+c.n+'. TPF '+(24*s.n/s.fwd).toFixed(2)+' and '+(24*c.n/c.fwd).toFixed(2)+'. The paper\'s single prompts: 7 against 4 steps.';
    const draw=()=>{const w=host.clientWidth;if(!w)return;const rows=[['toy seq (mean)',ps,'var(--c2)'],['toy conv (mean)',pc,'var(--c1)'],['paper, Figure 24 (sequential)',7,'var(--c2)'],['paper, Figure 25 (parallel)',4,'var(--c1)']];
      const pl=Math.min(200,w*0.45),sx=v=>pl+(w-pl-50)*v/Math.max(8,ps*1.1,pc*1.1);let sv='';rows.forEach((r,i)=>{const y=6+i*26;sv+=tx(pl-8,y+13,r[0],{fs:12,a:'end'})+rc(pl,y,sx(r[1])-pl,17,r[2],{r:3,op:i<2?1:.5})+tx(sx(r[1])+6,y+13,r[1].toFixed(i<2?1:0),{fs:12,w:600})});
      host.innerHTML=svgW(w,112,sv,'Passes per canvas')};fit(host,draw)})};

// ---- Run tab ----
if(!$('run'))return;
const sel=$('runRule');let h='';held.forEach(r=>h+='<option value="'+r+'">'+r+' (held out)</option>');h+='<option disabled>──────</option>';for(let r=0;r<256;r++)if(held.indexOf(r)<0)h+='<option value="'+r+'">'+r+' (seen in training)</option>';sel.innerHTML=h;sel.value=String(DEMO.rule);
$('runTask').value=DEMO.task;
let bseed=11,bits=DEMO.task==='seq'?DEMO.bits.slice():randBits(mulberry32(bseed),TD.NB);
const opts=()=>{const tm=+$('runT').value/10;return {N:+$('runN').value,b:BV[+$('runB').value],estop:EV[+$('runE').value],tmax:tm,tmin:tm/2,sc:$('runSC').checked,seed:+$('runS').value}};
function labels(){const o=opts();$('runBv').textContent=o.b>=100?'∞ (accept all)':o.b;$('runNv').textContent=o.N;$('runEv').textContent=o.estop;$('runTv').textContent=o.tmax.toFixed(1)+' → '+o.tmin.toFixed(2);$('runSv').textContent=o.seed}
function problem(){const task=$('runTask').value,r=+sel.value;if(task==='seq'&&bits.length!==3)bits=randBits(mulberry32(bseed),3);if(task==='conv'&&bits.length!==TD.NB)bits=randBits(mulberry32(bseed),TD.NB);
  const pb=TD.problem(task,r,bits);$('runProb').innerHTML='<b>Prompt</b>: '+task+' · rule '+ruleTxt(r)+' · '+(task==='seq'?'start <b>'+bits.join(' ')+'</b>':'input <b>'+bits.join('')+'</b>')+'<br><b>Reference answer</b> (from the rule): <span class="mono">'+pb.ref.join('').replace(/(.{8})/g,'$1 ')+'</span>';return pb}
const view=TOYV('run',{problem,opts,after:(runs,pb)=>{labels();const row=(n,r)=>n+': '+r.fwd+' passes, TPF '+(24/r.fwd).toFixed(2)+', '+r.ans.filter((b,i)=>b===pb.ref[i]).length+'/24 bits';
  $('runCmp').innerHTML='Same problem, three decoders. '+row('<b>Multinomial</b>',runs.multinomial)+' (passes per canvas '+runs.multinomial.steps.join(', ')+', revisions '+runs.multinomial.revisions+'); '+row('<b>masked</b>',runs.masked)+' (revisions '+runs.masked.revisions+'); '+row('<b>AR</b>',runs.ar)+'.'}});
let tm=0;const later=()=>{labels();clearTimeout(tm);tm=setTimeout(view.rerun,60)};
['runB','runN','runE','runT','runS'].forEach(id=>$(id).addEventListener('input',later));
['runTask','runRule','runSC'].forEach(id=>$(id).addEventListener('change',later));
$('runNew').addEventListener('click',()=>{bseed=(bseed*31+7)%100003;bits=randBits(mulberry32(bseed),$('runTask').value==='seq'?3:TD.NB);later()});
$('runDef').addEventListener('click',()=>{$('runB').value=5;$('runN').value=48;$('runE').value=3;$('runT').value=8;$('runS').value=1;$('runSC').checked=true;later()});
labels();

// test
const mine=[];
$('tstGo').addEventListener('click',()=>{const b=$('tstGo');b.disabled=true;const o=opts();
  runBatch(testSet(32,4242),o,['multinomial','masked','ar'],res=>{let t='<thead><tr><th>Decoder</th><th>Task</th><th class="num">Exact</th><th class="num">Passes per canvas</th><th class="num">TPF</th><th class="num">Revisions per answer</th></tr></thead><tbody>';
    for(const m of ['multinomial','masked','ar'])for(const task of ['seq','conv']){const a=res[m][task];const tpf=24*a.n/a.fwd;
      t+='<tr><td>'+(m==='ar'?'AR mode':m)+'</td><td>'+task+'</td><td class="num">'+(100*a.ok/a.n).toFixed(0)+'%</td><td class="num">'+(a.steps/a.canv).toFixed(1)+'</td><td class="num">'+tpf.toFixed(2)+'</td><td class="num">'+(m==='ar'?'n/a':(a.rev/a.n).toFixed(2))+'</td></tr>';
      if(m!=='ar')mine.push({variant:m,task,tpf,acc:a.ok/a.n})}
    $('tstOut').innerHTML=t+'</tbody>';$('tstOut').insertAdjacentHTML('beforeend','<caption class="small mute" style="caption-side:bottom;text-align:left">Settings: b = '+o.b+', N = '+o.N+', stop at '+o.estop+', τ '+o.tmax+' → '+o.tmin+', self-conditioning '+(o.sc?'on':'off')+', seed '+o.seed+'. 32 problems per task (one per held-out rule), measured in your browser.</caption>');
    b.disabled=false;refit($('frSvg'))},(i,n)=>{b.textContent='Running... '+i+' / '+n});
  setTimeout(()=>{},0)});
const tb=$('tstGo');new MutationObserver(()=>{if(!tb.disabled)tb.textContent='Run the test again'}).observe(tb,{attributes:true});

// frontier chart from the offline sweep
let ftask='all';
function frontier(w){const host=$('frSvg');const pts=[];const agg=(v,b,N,sc)=>{const rs=R.filter(r=>r.variant===v&&r.b===b&&r.N===N&&r.selfcond===sc&&(ftask==='all'||r.task===ftask));if(!rs.length)return null;
    return {tpf:rs.reduce((a,r)=>a+r.tpf,0)/rs.length,acc:rs.reduce((a,r)=>a+r.acc,0)/rs.length}};
  const Ns=[...new Set(R.map(r=>r.N))].sort((a,b)=>a-b);const H=260,pl=44,pr=10,pt=10,pb=40;
  const xs=v=>pl+(w-pl-pr)*Math.log(v)/Math.log(30),ys=v=>pt+(H-pt-pb)*(1-v);let s='';
  [0,.25,.5,.75,1].forEach(v=>{s+=ln2(pl,ys(v),w-pr,ys(v),'var(--line)')+tx(pl-6,ys(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
  [1,2,4,8,16,24].forEach(v=>{s+=ln2(xs(v),H-pb,xs(v),H-pb+4,'var(--mute)')+tx(xs(v),H-pb+16,v,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+w-pr)/2,H-6,'tokens per forward pass (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  const ser=[['multinomial',0.1,'var(--c1)',''],['multinomial',1,'var(--c1)','5 4'],['masked',0.1,'var(--c2)',''],['masked',1,'var(--c2)','5 4']];
  const lab=[];ser.forEach(([v,b,c,da])=>{const P=Ns.map(N=>({N,p:agg(v,b,N,true)})).filter(x=>x.p);if(!P.length)return;
    s+='<polyline fill="none" stroke="'+c+'" stroke-width="1.8"'+(da?' stroke-dasharray="'+da+'"':'')+' points="'+P.map(x=>xs(x.p.tpf).toFixed(1)+','+ys(x.p.acc).toFixed(1)).join(' ')+'"/>';
    P.forEach(x=>{s+='<circle cx="'+xs(x.p.tpf).toFixed(1)+'" cy="'+ys(x.p.acc).toFixed(1)+'" r="3.5" fill="'+c+'"><title>'+v+', b = '+b+', N = '+x.N+': TPF '+x.p.tpf.toFixed(2)+', exact '+(100*x.p.acc).toFixed(1)+'%</title></circle>'});
    const e=P[0];if(b===0.1)lab.push({x:xs(e.p.tpf),y:ys(e.p.acc),t:'N = '+e.N})});
  mine.filter(m=>ftask==='all'||m.task===ftask).forEach(m=>{s+='<circle cx="'+xs(m.tpf).toFixed(1)+'" cy="'+ys(m.acc).toFixed(1)+'" r="5" fill="none" stroke="'+(m.variant==='masked'?'var(--c2)':'var(--c1)')+'" stroke-width="1.6"><title>your run: '+m.variant+' '+m.task+'</title></circle>'});
  placeLabels(lab,w,H).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--mute)'})});
  const L=legend([['multinomial, b = 0.1','var(--c1)'],['multinomial, b = 1','var(--c1)','5 4'],['masked, b = 0.1','var(--c2)'],['masked, b = 1','var(--c2)','5 4']],8,H+14,w-16);
  host.innerHTML=svgW(w,H+L.h+6,s+L.s,'Toy speed-quality frontier');
  const best=agg('multinomial',0.1,48,true),mk=agg('masked',0.1,48,true),nosc=R.filter(r=>r.variant==='multinomial'&&r.N===48&&r.b===0.1&&!r.selfcond&&(ftask==='all'||r.task===ftask));
  if(best)$('frO').innerHTML='At the paper\'s settings (b = 0.1, N = 48): multinomial <b>'+(100*best.acc).toFixed(1)+'%</b> exact at TPF '+best.tpf.toFixed(2)+'; masked <b>'+(100*mk.acc).toFixed(1)+'%</b> at TPF '+mk.tpf.toFixed(2)+(nosc.length?'; multinomial without self-conditioning '+(100*nosc.reduce((a,r)=>a+r.acc,0)/nosc.length).toFixed(1)+'%':'')+'. Held-out rule tables, '+(ftask==='all'?'both tasks':ftask)+'.'}
onTab('t-run',()=>{fit($('frSvg'),frontier);refit($('frSvg'))});
segBind('frM',m=>{ftask=m;refit($('frSvg'))});
// training curves
let lcm='dec';
function curves(w){const L=T.logs||{};const H=230,pl=46,pr=10,pt=10,pb=38;let s='';const all=[];
  const ser=[];[['multinomial','var(--c1)'],['masked','var(--c2)']].forEach(([v,c])=>{const g=L[v];if(!g)return;[['seq',''],['conv','5 4']].forEach(([tk,da])=>{const k=(lcm==='dec'?'d_':'a_')+tk;ser.push({n:v+', '+tk,c,da,p:g.step.map((st,i)=>[st,g[k][i]])});g[k].forEach(y=>all.push(y))})});
  if(!ser.length){$('lcSvg').innerHTML='';return}
  const xmax=Math.max(...ser.map(s=>s.p[s.p.length-1][0])),ymin=Math.max(1e-4,Math.min(...all)),ymax=Math.max(...all);
  const lo=Math.floor(Math.log10(ymin)),hi=Math.ceil(Math.log10(ymax));const xs=v=>pl+(w-pl-pr)*v/xmax,ys=v=>pt+(H-pt-pb)*(1-(Math.log10(Math.max(v,1e-6))-lo)/(hi-lo));
  for(let e=lo;e<=hi;e++){s+=ln2(pl,ys(10**e),w-pr,ys(10**e),'var(--line)')+tx(pl-6,ys(10**e)+4,(10**e).toString(),{fs:11,a:'end',c:'var(--mute)'})}
  for(let x=0;x<=xmax;x+=xmax>4000?2000:1000)s+=tx(xs(x),H-pb+16,fmt(x),{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx((pl+w-pr)/2,H-6,'training step',{fs:11,a:'middle',c:'var(--mute)'});
  ser.forEach(q=>{s+='<polyline fill="none" stroke="'+q.c+'" stroke-width="1.6"'+(q.da?' stroke-dasharray="'+q.da+'"':'')+' points="'+q.p.map(p=>xs(p[0]).toFixed(1)+','+ys(p[1]).toFixed(1)).join(' ')+'"/>'});
  const Lg=legend(ser.map(q=>[q.n,q.c,q.da]),8,H+12,w-16);$('lcSvg').innerHTML=svgW(w,H+Lg.h+6,s+Lg.s,'Training curves')}
onTab('t-run',()=>{fit($('lcSvg'),curves);refit($('lcSvg'))});segBind('lcM',m=>{lcm=m;refit($('lcSvg'))});
if(T.findings)$('runFind').innerHTML=T.findings;if(T.how)$('runHow').innerHTML=T.how;if(T.facts)$('runFacts').innerHTML=T.facts;
})();
