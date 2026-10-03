// ---- Run the three steps: the live pipeline, the PPO trainer, and the offline sweeps ----
(function(){
const STG=[['1','Pretrain','3,000 steps on internet text'],['2','SFT','600 demonstrations, 16 epochs'],['3','Reward model','800 prompts, 6 ranked answers each'],['4','PPO and PPO-ptx','500 iterations each, β = 0.3']];
function stages(st){const R1=TM.st.runs[TM.key(TOY_PPO)],R2=TM.st.runs[TM.key(TOY_PTX)],ppoDone=R1&&R1.done&&R2&&R2.done;
  $('stgBox').innerHTML=STG.map((s,i)=>{const done=i<3?st.stage>i:ppoDone,run=i<3?(st.busy&&st.stage===i):(st.stage>=3&&!ppoDone&&((R1&&R1.running)||(R2&&R2.running)));
    return '<div class="st'+(done?' done':run?' run':'')+'"><b>Step '+s[0]+': '+s[1]+'</b>'+s[2]+'<br><span class="mute">'+(done?(i<3&&st.ms[i]!=null?'done in '+st.ms[i]+' ms':'done'):run?'training...':'waiting')+'</span></div>'}).join('');
  $('stgMsg').textContent=st.stage>=3?'The base, SFT and reward models are trained; PPO runs below reuse them.':'';
  $('stgRun').disabled=st.stage>=3&&ppoDone;
  if(st.stage>=3){rmCard();if(ppoDone&&!smpDone){smpDone=1;samples()}}}
let smpDone=0,smpSeed=0,started=0;
function startAll(){if(started)return;started=1;TM.start();TM.need(()=>{TM.train(TOY_PPO,null,()=>{TM.train(TOY_PTX,null,()=>{stages(TM.st)})});stages(TM.st)})}
$('stgRun').addEventListener('click',startAll);
TM.on(stages);
onTab('t-run',()=>{startAll();drawSweeps()});
// ---- what each model says ----
function samples(){const S=TM.st.S,R1=TM.st.runs[TM.key(TOY_PPO)],R2=TM.st.runs[TM.key(TOY_PTX)];if(!S||!R1||!R1.done||!R2||!R2.done)return;
  const r=TOY.rng(31+smpSeed),M=[['Pretrained',S.base],['SFT',S.sft],['PPO',R1.pol],['PPO-ptx',R2.pol]];
  let h='<div class="samp"><div class="hd tn">model</div><div class="hd">answer</div><div class="hd sc">true</div>';
  for(let t=0;t<TOY.NT;t++){h+='<div class="tn" style="grid-column:1 / -1;margin-top:6px">'+chips(words(TOY.promptSeq(t)),'p')+'</div>';
    M.forEach(([n,m])=>{const y=TOY.sample(m,t,r).y,u=TOY.utility(t,y);h+='<div class="tn small" style="color:'+MCOL[n]+'">'+n+'</div><div>'+chips(words(y))+'</div><div class="sc '+uCls(u)+'">'+fmtU(u)+'</div>'})}
  $('smpOut').innerHTML=h+'</div>'}
$('smpNew').addEventListener('click',()=>{smpSeed++;samples()});
// ---- what the reward model learned ----
let rmDone=0;
function rmCard(){if(rmDone)return;rmDone=1;const S=TM.st.S,a=S.rmAcc;
  $('rmcOut').innerHTML='<p class="small" style="margin:0 0 6px">On '+fmt(a.n)+' fresh pairs of SFT answers the RM picks the same answer as a new labeler '+(100*a.rm).toFixed(1)+'% of the time; two labelers agree with each other '+(100*a.labelers).toFixed(1)+'% of the time. The paper: RMs predict held-out labelers 69.6 ± 0.9% and their own groups 72.4 ± 0.4% (<<§E.2>>), labelers agree 72.6 ± 1.5%. The toy RM does better than a second labeler because it learns the average preference without the noise. Its largest weights:</p>'.replace('<<§E.2>>','<a href="'+window.PAPER.meta.ax+'#A5.SS2" target="_blank" rel="noopener noreferrer">§E.2</a>');
  const F=[];for(let i=0;i<TOY.NF;i++){const v=S.rm.w[i];if(Math.abs(v)<1e-9)continue;const g=i<TOY.V,w=TOY.WORDS[i%TOY.V];F.push({n:g?'"'+w+'" (any prompt)':TOY.TASKS[Math.floor((i-TOY.V)/TOY.V)].k+': "'+w+'"',v,c:w==='sure'?'var(--c2)':v>0?'var(--c3)':'var(--mute)'})}
  F.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
  fit($('rmcSvg'),W=>{const top=F.slice(0,14),mn=Math.min(...top.map(f=>f.v)),mx=Math.max(...top.map(f=>f.v));$('rmcSvg').innerHTML=hbars(W,top,{fmt:v=>v.toFixed(2),dom:[mn-(mx-mn)*.25,mx*1.05],title:'Reward per occurrence of a word (largest 14 of '+F.length+' non-zero weights)'})+'<p class="small mute" style="margin:2px 0 0">Linear in counts: every extra "sure" adds the same reward again. The labelers give +0.5 for the first and -0.8 for each one after, but SFT almost never says it twice, so the RM never sees the difference. That is the hole PPO can find.</p>'})}
// ---- the PPO trainer ----
const PRE={ppo:[.3,0,'The default: PPO with the KL penalty against the SFT model (the toy\'s β; the paper uses 0.02 in its own units).'],
  ptx:[.3,.1,'PPO-ptx, the paper\'s InstructGPT: the same, plus γ times the pretraining gradient. Watch the pretraining loss.'],
  nokl:[0,0,'β = 0: nothing ties the policy to SFT. Watch the RM score climb while the true score collapses (seeds 21 and 23 find the exploit; seed 22 happens not to within 500 iterations).'],
  bigkl:[3,0,'A very strong KL penalty: the policy barely moves, so it keeps more of its pretraining but gains less. This is the fix the paper tried and rejected (Figure 34).'],
  bigptx:[.3,1,'Too much pretraining gradient: the pretraining loss falls below even SFT\'s, but the policy forgets how to answer.']};
let cur=null,prev=null,busy=false;
function setPreset(m){const p=PRE[m];$('trnB').value=String(p[0]);$('trnG').value=String(p[1]);$('trnQ').textContent=p[2]}
segBind('trnP',setPreset);setPreset('ppo');
const cfg=()=>({beta:+$('trnB').value,gamma:+$('trnG').value,seed:+$('trnS').value});
const MET=[['trnU','u','labelers\' true score',[-9,4],[-8,-4,0,3.5]],['trnR','rm','reward model score',[-3,12],[0,4,8,12]],['trnK','kl','KL from SFT (nats per answer)',[0,120],[0,40,80,120]],['trnC','ce','pretraining loss (nats per word)',[0,7.5],[0,2,4,6]]];
function curves(){MET.forEach(([id,k,t,yd,yt])=>fit($(id),W=>{const H=W<300?150:170,ser=[];
  const all=[cur,prev].filter(Boolean).map(R=>R.st.hist.map(h=>h[k]));let lo=yd[0],hi=yd[1];
  const vs=[].concat(...all);if(vs.length){const mn=Math.min(...vs),mx=Math.max(...vs);if(k==='kl'){hi=Math.max(2,mx*1.1);lo=0}else{lo=Math.min(lo,mn);hi=Math.max(hi,mx)}if(k==='u'){lo=Math.max(-9,Math.min(-1,mn-.5));hi=4}if(k==='rm'){lo=Math.min(-1,mn-.3);hi=Math.max(2,mx+.3)}if(k==='ce'){lo=0;hi=Math.max(2,mx*1.1)}}
  if(prev)ser.push({n:'previous run',c:'var(--dim)',pts:prev.st.hist.map(h=>[h.it,h[k]]),nodot:1,nolg:1});
  if(cur)ser.push({n:'this run',c:'var(--acc)',pts:cur.st.hist.map(h=>[h.it,h[k]]),nodot:1,nolg:1});
  const refs=k==='u'?[ [SW.sft.u,'SFT','var(--c3)']]:k==='ce'?[ [SW.sft.ce,'SFT','var(--c3)'],[SW.base.ce,'pretrained','var(--c6)','start']]:k==='kl'?[[0,'SFT','var(--c3)']]:[];
  const raw=(hi-lo)/3,mag=Math.pow(10,Math.floor(Math.log10(raw))),st2=[1,2,2.5,5,10].map(m=>m*mag).find(m=>m>=raw)||raw;lo=Math.floor(lo/st2)*st2;hi=Math.ceil(hi/st2)*st2;
  const yt2=[];for(let v=lo;v<=hi+1e-9;v+=st2)yt2.push([v,+v.toFixed(2)]);
  $(id).innerHTML=lineChart({W,H,x:[0,500],y:[lo,hi],xt:[0,250,500].map(v=>[v,v]),yt:yt2,xl:'iteration',series:ser.length?ser:[{n:'',c:'none',pts:[[0,lo]],nodot:1,nolg:1}],refs,title:t,pl:40})}))}
function counters(R){const h=R.st.hist[R.st.hist.length-1];
  $('trnCnt').innerHTML=stat('iteration',R.st.it+' of 500','64 episodes each')+stat('true score',h.u.toFixed(2),'SFT '+SW.sft.u.toFixed(2)+', best 3.5')+stat('RM score',h.rm.toFixed(2),'SFT '+(R.st.hist[0].rm).toFixed(2))+stat('"sure" per answer',h.sure.toFixed(2),'one is polite')+stat('pretraining loss',h.ce.toFixed(2),'SFT '+SW.sft.ce.toFixed(2)+', pretrained '+SW.base.ce.toFixed(2))}
const R4=v=>Math.round(v*1e4)/1e4;
const match=(R,sw)=>{const h=R.st.hist[R.st.hist.length-1];return ['u','rm','kl','ce','sure'].every(k=>Math.abs(R4(h[k])-sw[k])<1e-9)&&Math.abs(R4(R.win)-sw.win)<1e-9};
function finish(R){const S=TM.st.S,r=TOY.rng(55),c=R.c;
  if(R.win==null)R.win=TOY.winRate(R.pol,S.sft,600,3,S.o.tau);
  const sw=SW.runs.find(x=>x.beta===c.beta&&x.gamma===c.gamma&&x.seed===c.seed);
  let h='<p class="small" style="margin:8px 0 4px"><b>Win rate against the SFT model</b> (600 comparisons by simulated labelers, as Figure 1 measures against 175B SFT): <b>'+(100*R.win).toFixed(1)+'%</b>'+(sw?' · the offline sweep gives '+(100*sw.win).toFixed(1)+'% for this setting'+(match(R,sw)?' (identical in every stored metric, to 4 decimals)':' (differs from the sweep)'):'')+'. Pretrained model: '+(100*SW.base.win).toFixed(1)+'%.</p><div class="samp">';
  for(let t=0;t<TOY.NT;t++){const y=TOY.sample(R.pol,t,r).y,u=TOY.utility(t,y);h+='<div class="tn small">'+TOY.TASKS[t].k+'</div><div>'+chips(words(y))+'</div><div class="sc '+uCls(u)+'">'+fmtU(u)+'</div>'}
  $('trnOut').innerHTML=h+'</div>'}
$('trnRun').addEventListener('click',()=>{if(busy)return;const c=cfg();busy=true;$('trnRun').disabled=true;if(cur&&TM.key(cur.c)!==TM.key(c))prev=cur;$('trnOut').innerHTML='';
  $('trnStep').textContent='training the pipeline first...';
  TM.train(c,R=>{cur=R;$('trnStep').textContent='iteration '+R.st.it+' of 500';counters(R);curves()},R=>{cur=R;busy=false;$('trnRun').disabled=false;$('trnStep').textContent='done: '+R.st.it+' iterations';counters(R);curves();finish(R)})});
curves();
// ---- the offline sweeps ----
let swDone=0;
const agg=(b,g,k)=>{const rs=SW.runs.filter(r=>r.beta===b&&r.gamma===g).map(r=>r[k]);return [rs.reduce((a,v)=>a+v,0)/rs.length,Math.min(...rs),Math.max(...rs)]};
const BETAS=[0,.01,.03,.1,.3,1,3],GAMS=[0,.01,.03,.1,.3,1];
function drawSweeps(){if(swDone)return;swDone=1;
  // the trade-off: capability kept (pretraining loss) against preference won
  fit($('swf'),W=>{const TT=titleSvg('The trade the paper describes: preference won against capability kept',W,12),HH=264+TT.h;const f=frame({W,H:HH,x:[0,7],y:[0,.8],pl:46,pr:12,pt:TT.h+10,pb:38,xt:[0,1,2,3,4,5,6,7].map(v=>[v,v]),yt:[0,.2,.4,.6,.8].map(v=>[v,(100*v)+'%']),xl:'pretraining loss after training (lower keeps more capability)',yl:'win rate against SFT'});let s=f.s+TT.s;
    const pts=[];BETAS.forEach(b=>{const c=agg(b,0,'ce'),w=agg(b,0,'win');pts.push({x:f.sx(c[0]),y:f.sy(w[0]),t:'β '+b,c:'var(--c5)',e:[c,w]})});
    GAMS.slice(1).forEach(g=>{const c=agg(.3,g,'ce'),w=agg(.3,g,'win');pts.push({x:f.sx(c[0]),y:f.sy(w[0]),t:'γ '+g,c:'var(--c2)',e:[c,w]})});
    pts.push({x:f.sx(SW.sft.ce),y:f.sy(.5),t:'SFT',c:'var(--c3)'},{x:f.sx(SW.base.ce),y:f.sy(SW.base.win),t:'pretrained',c:'var(--c6)'});
    const lineOf=a=>path(a.map(p=>[p.x,p.y]),a[0].c,{sw:1.4,op:.6});s+=lineOf(pts.slice(0,7))+lineOf([pts[4]].concat(pts.slice(7,12)));
    pts.forEach(p=>{if(p.e){s+=ln2(f.sx(p.e[0][1]),p.y,f.sx(p.e[0][2]),p.y,p.c,{sw:1,op:.7})+ln2(p.x,f.sy(p.e[1][1]),p.x,f.sy(p.e[1][2]),p.c,{sw:1,op:.7})}s+=dot(p.x,p.y,4,p.c)});
    placeLabels(pts,W,HH).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:p.c})});
    const lg=legend([['PPO, raising β (no mix)','var(--c5)'],['PPO-ptx at β = 0.3, raising γ','var(--c2)']],46,HH+14,W-46);
    $('swf').innerHTML=svgW(W,HH+14+lg.h,s+lg.s,'Trade-off')+'<p class="small mute" style="margin:2px 0 0">Means of 3 seeds, bars from lowest to highest seed. Small β loses everything to RM over-optimisation; as β grows the policy stays near SFT, keeping some capability but winning less. Adding γ at β = 0.3 moves almost straight left: most of the capability back for almost no preference, which is <<Figure 33>> against <<Figure 34>> at toy scale.</p>'.replace('<<Figure 33>>','<a href="'+window.PAPER.meta.ax+'#A5.F33" target="_blank" rel="noopener noreferrer">Figure 33</a>').replace('<<Figure 34>>','<a href="'+window.PAPER.meta.ax+'#A5.F34" target="_blank" rel="noopener noreferrer">Figure 34</a>')});
  // beta: toy true score and RM score; paper Figure 36
  fit($('swb'),W=>{const xi=BETAS.map((b,i)=>i);const ser=[['true score','u','var(--c1)'],['RM score','rm','var(--c2)']].map(([n,k,c])=>({n:'toy: '+n,c,da:k==='rm'?'5 3':null,pts:BETAS.map((b,i)=>{const a=agg(b,0,k);return [i,a[0],a[1],a[2]]})}));
    const a=lineChart({W,H:210,x:[-.3,6.3],y:[-9,12],xt:BETAS.map((b,i)=>[i,String(b)]),yt:[-8,-4,0,4,8,12].map(v=>[v,v]),xl:'toy KL coefficient β (no pretraining mix)',yl:'score',series:ser,refs:[ [SW.sft.u,'SFT true score','var(--c3)']],title:'The toy: score against β (3 seeds)'});
    const F=FG.fig36,b=lineChart({W,H:190,x:[4e-4,3],xlog:1,y:[1.5,4.5],xt:[[1e-3,'0.001'],[.01,'0.01'],[.1,'0.1'],[1,'1']],yt:[2,3,4].map(v=>[v,v]),xl:'KL reward coefficient β (log)',yl:'Likert',series:[{n:'paper: Likert, PPO-ptx 1.3B',c:'var(--c2)',pts:F.points.map(r=>[r.x,r.v,r.lo,r.hi])}],refs:[[F.zero_line[0],'β = 0','var(--c1)']],title:'The paper: Figure 36, Likert against β'});
    $('swb').innerHTML=a+b+'<p class="small mute" style="margin:2px 0 0">Same shape: poor at no KL penalty, best in the middle, worse again when the penalty is so strong the policy cannot move. The toy\'s best β is 0.3 in its units; the paper\'s is 0.01 to 0.02 in its own (<<§E.7>>).</p>'.replace('<<§E.7>>','<a href="'+window.PAPER.meta.ax+'#A5.SS7" target="_blank" rel="noopener noreferrer">§E.7</a>')});
  // gamma: toy pretraining loss and win; paper Figure 33
  fit($('swg'),W=>{const ser=[{n:'toy: pretraining loss',c:'var(--c2)',pts:GAMS.map((g,i)=>{const a=agg(.3,g,'ce');return [i,a[0],a[1],a[2]]})},{n:'toy: win rate against SFT x 5',c:'var(--c1)',pts:GAMS.map((g,i)=>{const a=agg(.3,g,'win');return [i,5*a[0],5*a[1],5*a[2]]}),da:'5 3'}];
    const a=lineChart({W,H:210,x:[-.3,5.3],y:[0,5],xt:GAMS.map((g,i)=>[i,String(g)]),yt:[0,1,2,3,4,5].map(v=>[v,v]),xl:'toy pretraining coefficient γ (β = 0.3)',yl:'nats per word',series:ser,refs:[ [SW.sft.ce,'SFT loss','var(--c3)']],title:'The toy: pretraining loss and preference against γ (3 seeds)'});
    $('swg').innerHTML=a+taxChart(W,'g')+'<p class="small mute" style="margin:2px 0 0">The win-rate line is scaled by 5 to share the axis (2.5 = 50%). In the toy, γ = 0.1 gives back most of the pretraining loss PPO costs for a win rate within two points of PPO; γ = 1 overshoots and the policy forgets the task. The paper\'s validation reward falls the same way as γ grows, more gently.</p>'});
  // reproduces / does not
  const p=k=>agg(.3,0,k)[0],x=k=>agg(.3,.1,k)[0],kb=k=>agg(3,0,k)[0];
  const rows=[['The RM can be over-optimised: without a KL penalty, RM score rises while true quality falls (the reason for the penalty, §3.5)','reproduces','β = 0: RM score '+agg(0,0,'rm')[0].toFixed(1)+', true score '+agg(0,0,'u')[0].toFixed(1)+' (2 of 3 seeds collapse); all 3 collapse at β = 0.01 and 0.03'],
    ['Human ratings are best at a middle KL coefficient, poor at 0 and at the largest (Figure 36)','reproduces in shape','toy true score '+agg(0,0,'u')[0].toFixed(2)+' at 0, '+p('u').toFixed(2)+' at 0.3, '+kb('u').toFixed(2)+' at 3 (units differ)'],
    ['PPO costs capability: the alignment tax (Figures 28, 29)','reproduces','pretraining loss '+SW.sft.ce.toFixed(2)+' after SFT, '+p('ce').toFixed(2)+' after PPO'],
    ['PPO-ptx repairs most of it with little loss in preference (Figure 33, Figure 1)','reproduces','γ = 0.1: loss '+x('ce').toFixed(2)+', win '+(100*x('win')).toFixed(0)+'% against PPO\'s '+(100*p('win')).toFixed(0)+'%'],
    ['Raising the KL coefficient does not fix the tax and costs reward (Figure 34)','reproduces','β = 3: loss '+kb('ce').toFixed(2)+', win '+(100*kb('win')).toFixed(0)+'%'],
    ['PPO and PPO-ptx are preferred about equally, both far above SFT and the base model (Figure 1)','reproduces','win against SFT: PPO '+(100*p('win')).toFixed(0)+'%, PPO-ptx '+(100*x('win')).toFixed(0)+'%, pretrained '+(100*SW.base.win).toFixed(0)+'%'],
    ['SFT overfits validation loss after 1 epoch, yet later epochs score better (§3.5)','does not reproduce','validation loss falls until epoch 4 and then barely moves; the demonstrations are an unlimited draw from one simple distribution, so there is nothing to overfit'],
    ['The RM predicts held-out labelers about as well as labelers agree (§E.2, §3.4)','does not reproduce','toy RM '+(100*SW.rmAcc.rm).toFixed(1)+'% against labeler agreement '+(100*SW.rmAcc.labelers).toFixed(1)+'%: a noise-free average beats one noisy labeler; the paper\'s RM (72.4%) only matches its labelers (72.6%)'],
    ['Model size, held-out labelers, prompted GPT-3, 175B RM instability','not tested','one toy size, one labeler model, a 3-word context']];
  $('swTab').innerHTML='<table class="ck"><thead><tr><th>The paper says</th><th>At toy scale</th><th>Measured</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td><span class="vt '+(r[1].startsWith('repro')?'r':r[1]==='not tested'?'d':'n')+'">'+r[1]+'</span></td><td>'+r[2]+'</td></tr>').join('')+'</tbody></table>';
  fit($('sfte'),W=>{const E=SW.sftEpochs.filter(e=>e.e>=1);
    $('sfte').innerHTML=lineChart({W,H:190,x:[1,16],y:[0,3.5],xt:[1,4,8,12,16].map(v=>[v,v]),yt:[0,1,2,3].map(v=>[v,v]),xl:'SFT epoch',series:[{n:'validation loss on demonstrations (nats per word)',c:'var(--c2)',pts:E.map(e=>[e.e,e.val])},{n:'true score of samples',c:'var(--c1)',pts:E.map(e=>[e.e,e.u])}],title:'The toy\'s SFT, epoch by epoch'})+'<p class="small mute" style="margin:2px 0 0">The paper\'s SFT overfits validation loss after one epoch while RM score and preference keep improving; the toy\'s does not overfit at all. Shown so the claim is not mistaken for something the toy confirms.</p>'})}
})();
