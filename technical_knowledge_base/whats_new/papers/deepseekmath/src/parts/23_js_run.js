// ---- Train all six methods: the live toy (engine in 22_js_toy.js; sweep numbers in _gen_toydata.js) ----
(function(){const T=TOY,TD=TOYDATA,MS=Object.keys(T.METHODS);
  const MC={sft:'var(--c5)',rft:'var(--c6)',onrft:'var(--c3)',dpo:'var(--c4)',ppo:'var(--c2)',grpo:'var(--c1)',grpops:'#c2417a',drgrpo:'var(--mute)'};
  const MN={sft:'SFT',rft:'RFT',onrft:'Online RFT',dpo:'DPO',ppo:'PPO',grpo:'GRPO',grpops:'GRPO+PS',drgrpo:'Dr. GRPO'};
  const NETS={sft:'1 / 0',rft:'1 / 0',onrft:'1 / 0',dpo:'1 / 1',ppo:'2 / 1',grpo:'1 / 1',grpops:'1 / 1',drgrpo:'1 / 1'};
  $('npTxt').textContent=fmt(T.NP);$('sftSteps').textContent=fmt(TD.sft.steps);
  const B=TD.base;$('baseAcc').textContent=(100*B.acc).toFixed(1)+'%';$('baseForget').textContent=(100*B.forget).toFixed(1)+'%';$('baseMaj').textContent=(100*B.maj[5]).toFixed(1)+'%';$('basePass').textContent=(100*B.pass[5]).toFixed(1)+'%';
  const sel=new Set(MS);
  $('runMeth').innerHTML=MS.map(m=>'<label><input type="checkbox" id="runM_'+m+'" data-m="'+m+'" checked> <span style="color:'+MC[m]+'">■</span> '+MN[m]+'</label>').join('');
  $('runMeth').querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{c.checked?sel.add(c.dataset.m):sel.delete(c.dataset.m)}));
  const DEF={steps:400,lr:'0.003',G:'8',beta:'0.04',lam:'0.95',db:'0.1',seed:'5'};
  const rd=()=>({steps:+$('runSteps').value,lr:+$('runLr').value,G:+$('runG').value,beta:+$('runBeta').value,lam:+$('runLamS').value,db:+$('runDB').value,seed:+$('runSeed').value});
  const isDef=c=>c.steps===400&&c.lr===0.003&&c.G===8&&c.beta===0.04&&c.lam===0.95&&c.db===0.1&&c.seed===5;
  $('runSteps').addEventListener('input',()=>{$('runStepsV').textContent=$('runSteps').value});$('runStepsV').textContent='400';
  let res={},xm='step',job=null,heatSel='base',pkSel='grpo';
  function chart(){fit($('runSvg'),w=>{const H=w<520?250:290,ms=Object.keys(res);const lg=legendW(ms.map(m=>[MN[m],MC[m]]),46,12,w-52);
    let xmax=1;ms.forEach(m=>{const h=res[m].hist;if(h.length)xmax=Math.max(xmax,xm==='step'?h[h.length-1].step:h[h.length-1].samples)});if(!ms.length)xmax=400;
    let ymin=0.7,below=[];ms.forEach(m=>res[m].hist.forEach(h=>{if(m!=='dpo')ymin=Math.min(ymin,h.acc)}));ymin=Math.max(0,Math.floor(ymin*20)/20);
    ms.forEach(m=>{const lo=Math.min(...res[m].hist.map(h=>h.acc));if(lo<ymin)below.push(MN[m]+' (down to '+(100*lo).toFixed(1)+'%)')});
    const f=linFrame({W:w,H:H+lg.h,pl:44,pr:10,pt:10+lg.h,pb:32,x:[0,xmax],y:[ymin,1],xl:xm==='step'?'training steps':'samples drawn from the policy',yl:'P(right answer), exact',fy:v=>(100*v).toFixed(0)+'%',fx:v=>fmt(v)});
    let s=f.s+lg.s+ln2(f.X(0),f.Y(B.acc),f.X(xmax),f.Y(B.acc),'var(--mute)',{sw:1,da:'3 3'})+tx(f.X(xmax)-2,f.Y(B.acc)-4,'base '+(100*B.acc).toFixed(1)+'%',{fs:11,a:'end',c:'var(--mute)'});
    s+='<clipPath id="runClip"><rect x="44" y="'+(10+lg.h)+'" width="'+(w-54)+'" height="'+(H-42)+'"/></clipPath><g clip-path="url(#runClip)">';
    ms.forEach(m=>{const pts=res[m].hist.map(h=>[xm==='step'?h.step:h.samples,h.acc]);s+=lineS(pts,f.X,f.Y,MC[m],{sw:2})});s+='</g>';
    $('runSvg').innerHTML=svgW(w,H+lg.h,s,'Training curves')+(below.length||xm!=='step'?'<p class="small mute" style="margin:2px 0 0">'+(below.length?'Below the frame: '+below.join(', ')+'. ':'')+(xm!=='step'?'SFT draws no samples, and RFT and DPO draw all theirs from the base model before training (800), so they stand as vertical lines.':'')+'</p>':'')})}
  function table(){const ms=Object.keys(res);if(!ms.length){$('runTab').innerHTML='';return}
    let h='<tr><th>method</th><th class="num">P(right)</th><th class="num">vs base</th><th class="num">forgets carry</th><th class="num">KL to π_ref</th><th class="num">samples</th><th class="num">networks trained / frozen</th><th class="num">Maj@64</th><th class="num">Pass@64</th></tr>';
    ms.forEach(m=>{const r=res[m],e=r.hist[r.hist.length-1];h+='<tr><td><span style="color:'+MC[m]+'">■</span> '+MN[m]+(r.done?'':' …')+'</td><td class="num">'+(100*e.acc).toFixed(1)+'%</td><td class="num">'+(e.acc>=B.acc?'+':'')+(100*(e.acc-B.acc)).toFixed(1)+'</td><td class="num">'+(100*e.forget).toFixed(1)+'%</td><td class="num">'+e.kl.toFixed(3)+'</td><td class="num">'+fmt(e.samples)+'</td><td class="num">'+NETS[m]+'</td><td class="num">'+(r.maj?(100*r.maj[5]).toFixed(1)+'%':'')+'</td><td class="num">'+(r.pass?(100*r.pass[5]).toFixed(1)+'%':'')+'</td></tr>'});
    $('runTab').innerHTML=h}
  function heat(){const opts=[['base','base model']].concat(Object.keys(res).filter(m=>res[m].done).map(m=>[m,MN[m]]));if(!opts.some(o=>o[0]===heatSel))heatSel='base';
    segFill('runHeatM',opts,heatSel,m=>{heatSel=m;heat()});
    const P=heatSel==='base'?TOY.BASE:res[heatSel].ctx.p;const pq=T.ALLQ.map(q=>T.answerDist(P,q)[q[0]+q[1]]);
    fit($('runHeatSvg'),w=>{const n=10,cs=Math.min(34,(w-30)/n);let s='';
      for(let a=0;a<10;a++){s+=tx(14,24+a*cs+cs/2+4,String(a),{fs:11,a:'middle',c:'var(--mute)'});for(let b=0;b<10;b++){const v=pq[a*10+b];
        s+=rc(26+b*cs,20+a*cs,cs-2,cs-2,v>0.5?'var(--good)':'var(--bad)',{r:2,op:(0.15+0.85*Math.abs(v-0.5)*2).toFixed(2)})+'<title>'+a+' + '+b+': '+(100*v).toFixed(1)+'%</title>';
        if(cs>=26)s+=tx(26+b*cs+(cs-2)/2,20+a*cs+cs/2+3,(100*v).toFixed(0),{fs:11,a:'middle',c:'var(--ink)'})}}
      for(let b=0;b<10;b++)s+=tx(26+b*cs+cs/2,14,String(b),{fs:11,a:'middle',c:'var(--mute)'});
      $('runHeatSvg').innerHTML=svgW(Math.min(w,26+10*cs+4),24+10*cs,s,'P(right) by question')})}
  function pk(){const opts=Object.keys(res).filter(m=>res[m].done&&res[m].maj).map(m=>[m,MN[m]]);const src=opts.length?null:TD.runs;
    if(!opts.length){segFill('runPKM',MS.map(m=>[m,MN[m]+' (sweep)']),pkSel,m=>{pkSel=m;pk()})}else{if(!opts.some(o=>o[0]===pkSel))pkSel=opts[0][0];segFill('runPKM',opts,pkSel,m=>{pkSel=m;pk()})}
    const R=src?{maj:src[pkSel].final.maj,pass:src[pkSel].final.pass}:res[pkSel];
    fit($('runPKSvg'),w=>{const H=230,KS=T.KS,lg=legendW([['Maj@K base','var(--c4)'],['Maj@K '+MN[pkSel],'var(--c1)'],['Pass@K base','var(--c4)','da'],['Pass@K '+MN[pkSel],'var(--c1)','da']],44,12,w-50);
      const f=linFrame({W:w,H:H+lg.h,pl:40,pr:10,pt:10+lg.h,pb:32,x:[-0.2,5.2],y:[0.7,1],xt:[0,1,2,3,4,5],fx:i=>String(KS[i]),xl:'K, number of samples',fy:v=>(100*v).toFixed(0)+'%'});
      let s=f.s+lg.s;[[B.maj,'var(--c4)',null],[R.maj,'var(--c1)',null],[B.pass,'var(--c4)','5 3'],[R.pass,'var(--c1)','5 3']].forEach(([a,c,da])=>{s+=lineS(a.map((v,i)=>[i,v]),f.X,f.Y,c,{sw:2,da});a.forEach((v,i)=>{s+=dotS(f.X(i),f.Y(v),3,c,{t:(100*v).toFixed(1)+'%'})})});
      $('runPKSvg').innerHTML=svgW(w,H+lg.h,s,'Maj@K and Pass@K')});
    $('runPKTxt').innerHTML=(src?'From the sweep (seed 5). ':'From your run. ')+'Base: Maj@64 '+(100*B.maj[5]).toFixed(1)+'%, Pass@64 '+(100*B.pass[5]).toFixed(1)+'%. '+MN[pkSel]+': Maj@64 '+(100*R.maj[5]).toFixed(1)+'%, Pass@64 '+(100*R.pass[5]).toFixed(1)+'%. The paper\'s Figure 7 has Maj@K up and Pass@K flat or slightly down; in the toy Pass@64 also rises a little, because the three questions the demonstrations never answered right share their skill, carrying, with the 42 others that RL fixes.'}
  function stop(){if(job){clearTimeout(job.t);job=null}$('runGo').disabled=false;$('runStatus').textContent=''}
  function start(){stop();const c=rd(),todo=MS.filter(m=>sel.has(m));res={};chart();table();if(!todo.length)return;$('runGo').disabled=true;let mi=0,ctx=null,t0=0;
    job={t:0};const card=$('runCard');
    const tick=()=>{if(!job)return;const tEnd=performance.now()+28;
      while(performance.now()<tEnd){if(!ctx){const m=todo[mi];ctx=T.makeCtx(TOY.BASE,T.ALLQ,m,{lr:c.lr,batch:64/c.G,G:c.G,beta:m==='dpo'?c.db:c.beta,lam:c.lam,seed:c.seed});t0=performance.now();
          const e=T.evaluate(ctx.p,T.ALLQ);res[m]={ctx,hist:[{step:0,samples:ctx.samples,acc:e.acc,forget:e.forget,kl:0}],done:false}}
        const m=todo[mi];const info=T.grad(ctx);if(info.cg)T.step(ctx.critic,info.cg,ctx.copt);T.step(ctx.p,info.g,ctx.opt);ctx.steps++;
        if(ctx.steps%20===0){const e=T.evaluate(ctx.p,T.ALLQ);res[m].hist.push({step:ctx.steps,samples:ctx.samples,acc:e.acc,forget:e.forget,kl:T.klRef(ctx)});chart();table()}
        if(ctx.steps>=c.steps){const e=T.evaluate(ctx.p,T.ALLQ);res[m].maj=T.KS.map(k=>T.majK(e.per,k,400,99));res[m].pass=T.KS.map(k=>T.passK(e.per,k));res[m].done=true;res[m].ms=performance.now()-t0;
          card.dataset.done=(card.dataset.done||'')+m+',';ctx=null;mi++;table();heat();pk();if(mi>=todo.length){finish(c);return}break}}
      $('runStatus').textContent='training '+MN[todo[mi]]+' · step '+(ctx?ctx.steps:0)+' of '+c.steps;job.t=setTimeout(tick,0)};
    tick()}
  function finish(c){job=null;$('runGo').disabled=false;$('runStatus').textContent='done';
    if(isDef(c)){let worst=0,n=0;Object.keys(res).forEach(m=>{const a=res[m].hist.map(h=>h.acc),b=TD.runs[m].seeds['5'].acc;a.forEach((v,i)=>{if(b[i]!=null){worst=Math.max(worst,Math.abs(v-b[i]));n++}})});
      $('runRepro').innerHTML='Defaults reproduce toy_sweep.mjs (seed 5) independently: '+n+' checkpoints compared, largest difference '+worst.toExponential(1)+' (the sweep stores 4 decimals).';$('runCard').dataset.repro=String(worst)}
    else $('runRepro').textContent='Non-default settings: compare with the three-seed sweep below.'}
  $('runGo').addEventListener('click',start);$('runStop').addEventListener('click',stop);
  $('runReset').addEventListener('click',()=>{$('runSteps').value=DEF.steps;$('runStepsV').textContent=DEF.steps;$('runLr').value=DEF.lr;$('runG').value=DEF.G;$('runBeta').value=DEF.beta;$('runLamS').value=DEF.lam;$('runDB').value=DEF.db;$('runSeed').value=DEF.seed;
    $('runMeth').querySelectorAll('input').forEach(c=>{c.checked=true;sel.add(c.dataset.m)})});
  segOn('runX',m=>{xm=m;chart()});
  // the sweep's tables
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,sd=a=>{const m=mean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)*(y-m),0)/(a.length-1))};
  function sweep(){let h='<table class="lt"><tr><th>method</th><th class="num">P(right), 3 seeds</th><th class="num">seed spread (sd)</th><th class="num">lr 0.0003</th><th class="num">0.001</th><th class="num">0.003</th><th class="num">0.01</th><th class="num">groups with no signal</th></tr>';
    MS.forEach(m=>{const r=TD.runs[m],L=TD.lr[m];h+='<tr><td><span style="color:'+MC[m]+'">■</span> '+MN[m]+'</td><td class="num">'+(100*mean(r.finals)).toFixed(1)+'%</td><td class="num">'+(100*sd(r.finals)).toFixed(1)+'</td>'+['0.0003','0.001','0.003','0.01'].map(k=>'<td class="num">'+(100*L[k]).toFixed(1)+'%</td>').join('')+'<td class="num">'+(r.seeds['5'].zero!=null?(100*r.seeds['5'].zero).toFixed(0)+'%':'')+'</td></tr>'});
    $('runSweepTab').innerHTML=h+'</table>';
    const g=TD.G,b0=TD.beta0,lg=TD.long;
    $('runSweepTxt').innerHTML='Base '+(100*B.acc).toFixed(1)+'%; 400 steps of 64 samples (8 questions × G = 8), learning rate 0.003 unless stated. <b>Online RFT is ahead</b> ('+(100*mean(TD.runs.onrft.finals)).toFixed(1)+'%), then offline RFT ('+(100*mean(TD.runs.rft.finals)).toFixed(1)+'%, from 800 samples drawn once), then GRPO and PPO, indistinguishable ('+(100*mean(TD.runs.grpo.finals)).toFixed(1)+'% and '+(100*mean(TD.runs.ppo.finals)).toFixed(1)+'%). Removing the KL term changes little (β = 0: GRPO '+(100*mean(b0.grpo)).toFixed(1)+'%, PPO '+(100*mean(b0.ppo)).toFixed(1)+'%). Run for 1,200 steps, RFT, Online RFT and GRPO end at '+[lg.rft,lg.onrft,lg.grpo].map(v=>(100*v[v.length-1]).toFixed(1)+'%').join(', ')+': the online methods catch up with each other and stay ahead of offline RFT, the paper\'s Figure 5 ordering for online against offline. <b>DPO collapses</b> at every learning rate: from offline pairs it pushes the rejected answers down and the mass goes to answers nobody wrote (P(right) '+(100*mean(TD.runs.dpo.finals)).toFixed(1)+'% at 0.003; '+(100*TD.lr.dpo['0.0003']).toFixed(1)+'% at 0.0003 after an early rise), the likelihood displacement the '+A('https://app.notion.com/p/3c65c17b0d0d818bb1d8cafd30e20f9e','DPO page')+' measures. With G samples per question and 64 samples per step: G = 2, 4, 8, 16 give '+['2','4','8','16'].map(k=>(100*mean(g[k].final)).toFixed(1)+'%').join(', ')+', while the share of GRPO groups with no signal falls from '+(100*mean(g['2'].zero)).toFixed(0)+'% to '+(100*mean(g['16'].zero)).toFixed(0)+'%.';
    let t='<table class="lt" id="runLamT"><tr><th>PPO, GAE λ</th>'+['0','0.5','0.95','1'].map(k=>'<th class="num">'+k+'</th>').join('')+'</tr><tr><td>P(right) after 400 steps</td>'+['0','0.5','0.95','1'].map(k=>'<td class="num">'+(100*TD.lam[k][TD.lam[k].length-1]).toFixed(1)+'%</td>').join('')+'</tr></table>';
    $('runLamTab').innerHTML=t+'<p class="small">λ = 0.95 and λ = 1 are identical here: at three tokens λ² = 0.90, so the final reward reaches every token either way. Only λ = 0, an advantage from the critic alone, is worse. DeepSeek-R1\'s finding (λ = 0.95 well below GRPO) is about long outputs, where λ<sup>L</sup> vanishes (<a href="#" data-tab="t-read" data-to="gaeCard">the GAE widget</a>).</p>'}
  sweep();
  const CK=TD.check;$('runCheckTxt').innerHTML=CK?('<b>Gradients against PyTorch: '+CK.verdict+'.</b> For each of the eight methods, one recorded batch (after 5 training steps, so π ≠ π<sub>ref</sub>) is pushed through the paper\'s objectives as written (Eq. 3 with the clip and the k3 estimator, Eq. 1 and GAE for PPO with its value loss, Eq. 12 for DPO, Eq. 6, 8 and 11) and differentiated by autograd; the JS engine instead applies the gradient coefficients of Appendix A.1 (Eq. 7, 10, 14, 18, 21). Largest difference over all parameters and methods: '+CK.worst.toExponential(1)+'. This also confirms the paper\'s derivation of the coefficients, with Eq. 12 read with o⁻<sub>t</sub> in the numerator (<a href="#" data-tab="t-tables" data-to="tbChecks">check_engine.py</a>).'):'';
  onTab('t-run',()=>{chart();heat();pk()});
})();
