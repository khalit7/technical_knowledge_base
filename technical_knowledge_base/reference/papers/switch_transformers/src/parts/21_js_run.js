// ---- Train tab: two toy Switch layers trained side by side, plus the measured sweeps ----
(function(){const BASE=Object.assign({},SWEEP.base),STEPS=SWEEP.steps,LOG=25;
  const PRE={bal:{A:{alpha:0},B:{alpha:0.01},q:'Turn the balancing loss off (A) and on at the paper\'s α = 10<sup>-2</sup> (B). Watch the load bars: without it, which experts end up with the tokens?'},
    exp:{A:{N:1},B:{N:16},q:'A is the dense FFN; B has 16 experts of the same size, one per token, so the same FLOPs per token (Figure 4\'s comparison). How much does holding 16 times the parameters buy?'},
    k:{A:{k:2},B:{k:1},q:'A routes each token to its two best experts (the MoE Transformer), B to one (Switch), both at capacity factor 1.25. A costs twice the expert FLOPs; does it learn more per step?'},
    cf:{A:{cf:1},B:{cf:2},q:'Capacity factor 1.0 (A) against 2.0 (B): the drop rate against the padding (slots per batch).'},
    init:{A:{initScale:1},B:{initScale:0.1},q:'T5\'s default initialisation scale s = 1.0 (A) against the paper\'s 0.1 (B), Table 3\'s comparison. A single layer gives the instability little to act on.'},
    jit:{A:{jitter:0},B:{jitter:0.01},q:'Argmax routing (A) against multiplicative jitter of ±1% on the router\'s input (B), Table 11\'s comparison.'}};
  const OPT={N:[1,2,4,8,16,32],k:[1,2],cf:[0.5,1,1.25,2],alpha:[0,1e-5,1e-4,1e-3,1e-2,1e-1,1],initScale:[1,0.1],jitter:[0,0.01],seed:[1,2,3,4,5,6,7,8,9]};
  const LAB={N:'experts',k:'experts per token',cf:'capacity factor',alpha:'α',initScale:'init scale s',jitter:'router jitter',seed:'seed'};
  const showV=(k,v)=>k==='alpha'?(v===0?'0':v>=0.01?String(v):'10'+sup(Math.round(Math.log10(v)))):k==='jitter'?(v?'±'+v:'none'):String(v);
  let preset='bal',cfg={A:null,B:null},run={A:null,B:null},playing=false,raf=0;
  const COL={A:'var(--c2)',B:'var(--c1)'};
  function setPreset(p){preset=p;cfg.A=Object.assign({},BASE,{seed:1},PRE[p].A);cfg.B=Object.assign({},BASE,{seed:1},PRE[p].B);$('trnQ').innerHTML=PRE[p].q;ui();reset()}
  function ui(){$('trnCfg').innerHTML=['A','B'].map(r=>'<div><div class="small" style="font-weight:600;color:'+COL[r]+'">Run '+r+'</div>'+Object.keys(OPT).map(k=>'<label class="small" style="display:inline-block;margin:2px 8px 2px 0">'+LAB[k]+' <select data-r="'+r+'" data-k="'+k+'">'+OPT[k].map(v=>'<option value="'+v+'"'+(v===cfg[r][k]?' selected':'')+'>'+showV(k,v)+'</option>').join('')+'</select></label>').join('')+'</div>').join('');
    $('trnCfg').querySelectorAll('select').forEach(s=>s.onchange=()=>{cfg[s.dataset.r][s.dataset.k]=+s.value;reset()})}
  function reset(){playing=false;if(raf){cancelAnimationFrame(raf);raf=0}run.A=SW.run(Object.assign({},cfg.A,{logEvery:LOG}));run.B=SW.run(Object.assign({},cfg.B,{logEvery:LOG}));
    ['A','B'].forEach(r=>{const st=run[r];st.idm=SW.identityMSE(st);const ev=SW.evaluate(st);st.log.push({s:0,tr:NaN,te:ev.mse,drop:NaN,edrop:ev.drop,maxf:Math.max(...ev.f)*st.cfg.N,f:Array.from(ev.f)});st.ev=ev});draw()}
  const live=()=>!document.hidden&&$('t-run').offsetParent!==null&&!$('t-run').hidden;
  function tick(){raf=0;if(!playing)return;if(!live()){return}const t0=performance.now();
    while(performance.now()-t0<28&&run.B.step<STEPS){['A','B'].forEach(r=>{if(run[r].step<STEPS)SW.trainSteps(run[r],LOG)})}
    ['A','B'].forEach(r=>{run[r].ev=null});$('trn').dataset.frames=(+$('trn').dataset.frames||0)+1;
    if(run.A.step>=STEPS&&run.B.step>=STEPS){playing=false;['A','B'].forEach(r=>{run[r].ev=SW.evaluate(run[r])})}
    draw();if(playing)raf=requestAnimationFrame(tick)}
  function play(){if(run.B.step>=STEPS&&run.A.step>=STEPS)reset();playing=!playing;draw();if(playing&&!raf)raf=requestAnimationFrame(tick)}
  document.addEventListener('visibilitychange',()=>{if(playing&&!raf&&live())raf=requestAnimationFrame(tick)});
  onTab('t-run',()=>{if(playing&&!raf)raf=requestAnimationFrame(tick);refit($('trnCurve'));refit($('trnDrop'));refit($('trnLoad'));refit($('trnMap'));drawSweeps()});
  const last=st=>st.log[st.log.length-1];
  function draw(){const done=run.A.step>=STEPS&&run.B.step>=STEPS;$('trnRun').innerHTML=playing?'❚❚ Pause':done?'↻ Train again':run.B.step?'▶ Resume':'▶ Train';
    $('trnStep').textContent='step '+run.B.step+' of '+STEPS;
    refit($('trnCurve'));refit($('trnDrop'));refit($('trnLoad'));refit($('trnMap'));
    $('trnCnt').innerHTML=['A','B'].map(r=>{const st=run[r],L=last(st),C=Math.ceil(st.cfg.T/st.cfg.N*st.cfg.cf*st.cfg.k-1e-9);
      return stat('<span style="color:'+COL[r]+'">Run '+r+'</span>: held-out MSE',L.te.toFixed(4),'input unchanged: '+st.idm.toFixed(3))+stat('Run '+r+': dropped in training',isNaN(L.drop)?'…':(L.drop*100).toFixed(1)+'%','busiest expert: '+L.maxf.toFixed(2)+'× its share')+stat('Run '+r+': cost',st.cfg.k+' expert FFN'+(st.cfg.k>1?'s':'')+' per token',st.cfg.N*C+' slots per 512-token batch')}).join('');
    const note=[];['A','B'].forEach(r=>{const m=sweepMatch(run[r].cfg);if(m&&run[r].step>=STEPS)note.push('Run '+r+' is in the measured sweep below: seed '+run[r].cfg.seed+' gave '+m.toFixed(4)+', this run '+last(run[r]).te.toFixed(4)+(Math.abs(m-last(run[r]).te)<5e-5?' (identical).':'.'))});
    $('trnNote').innerHTML=note.join(' ')}
  function sweepMatch(c){for(const g in SWEEP.groups)for(const row of SWEEP.groups[g]){const o=Object.assign({},BASE,row.o);if(['N','k','cf','alpha','initScale','jitter'].every(k=>o[k]===c[k])){const i=SWEEP.seeds.indexOf(c.seed);if(i>=0)return row.te[i]}}return null}
  // curves
  fit($('trnCurve'),W=>{const H=W<560?190:210,all=[run.A,run.B].flatMap(st=>st.log.map(l=>l.te)).concat([run.A.idm]);const lo=Math.max(1e-3,Math.min(...all)*0.8),hi=Math.max(...all)*1.15;
    const yt=[0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1].filter(v=>v>=lo&&v<=hi).map(v=>[v,String(v)]);
    const fr=frame({W,H,x:[0,STEPS],y:[lo,hi],ylog:true,xt:[[0,'0'],[500,'500'],[1000,'1,000'],[1500,'1,500']],yt,xl:'training step',yl:'held-out MSE (log)',pl:50});let s=fr.s;
    s+=ln2(50,fr.sy(run.A.idm),W-14,fr.sy(run.A.idm),'var(--mute)',{da:'4 3'})+tx(W-16,fr.sy(run.A.idm)+13,'input unchanged',{fs:11,a:'end',c:'var(--mute)'});
    ['A','B'].forEach(r=>{const p=run[r].log.map(l=>[fr.sx(l.s),fr.sy(Math.max(lo,l.te))]);if(p.length>1)s+=path(p,COL[r]);const q=p[p.length-1];if(q)s+=dot(q[0],q[1],3.5,COL[r])});
    const lg=legend([['Run A',COL.A],['Run B',COL.B]],56,14,W-70);s+=lg.s;$('trnCurve').innerHTML=svgW(W,H,s,'Held-out error during training')});
  fit($('trnDrop'),W=>{const H=W<560?130:140;const fr=frame({W,H,x:[0,STEPS],y:[0,0.6],xt:[[0,'0'],[500,'500'],[1000,'1,000'],[1500,'1,500']],yt:[[0,'0%'],[0.2,'20%'],[0.4,'40%'],[0.6,'60%']],yl:'tokens dropped',pl:50,pb:22});let s=fr.s;
    ['A','B'].forEach(r=>{const p=run[r].log.filter(l=>!isNaN(l.drop)).map(l=>[fr.sx(l.s),fr.sy(Math.min(0.6,l.drop))]);if(p.length>1)s+=path(p,COL[r],{sw:1.4})});
    $('trnDrop').innerHTML=svgW(W,H,s,'Share of tokens dropped in training batches')});
  fit($('trnLoad'),W=>{const narrow=W<560,pw=narrow?W:(W-16)/2,H=110;let s='';
    ['A','B'].forEach((r,i)=>{const st=run[r],f=last(st).f,N=f.length,x0=narrow?0:i*(pw+16),y0=narrow?i*(H+6):0,bw=Math.max(2,(pw-40)/N-2),mx=Math.max(4,Math.ceil(Math.max(...f)*N));
      s+=tx(x0,y0+12,'Run '+r+': tokens per expert, as a multiple of a fair share',{fs:11,c:COL[r],w:600});
      const yb=v=>y0+H-16-(H-36)*v/mx;for(let e=0;e<N;e++){const v=f[e]*N;s+=rc(x0+34+e*(bw+2),yb(v),bw,yb(0)-yb(v),COL[r],{r:1,op:.85})}
      s+=ln2(x0+32,yb(1),x0+pw,yb(1),'var(--ink)',{da:'3 2'})+tx(x0+28,yb(1)+4,'1×',{fs:11,a:'end'})+tx(x0+28,yb(mx)+8,mx+'×',{fs:11,a:'end',c:'var(--mute)'})+tx(x0+34,y0+H-3,N+' expert'+(N>1?'s':'')+', held-out tokens',{fs:11,c:'var(--mute)'})});
    $('trnLoad').innerHTML=svgW(W,narrow?2*H+6:H,s,'Expert load')});
  fit($('trnMap'),W=>{const st=run.B,ev=st.ev||SW.evaluate(st),N=st.cfg.N,K=st.task.K;if(N<2){$('trnMap').innerHTML='<p class="small mute">Routing map: run B has one expert, nothing to route.</p>';return}
    const lw=58,cw=Math.min(18,(W-lw-6)/N),ch=W<560?5:6,H=24+K*ch+18;let s=tx(0,12,'Run B, step '+st.step+': where each token type goes',{fs:11,w:600});
    for(let k=0;k<K;k++){const row=ev.byType[k],tot=row.reduce((a,b)=>a+b,0)||1;for(let e=0;e<N;e++){const v=row[e]/tot;if(v>0.02)s+=rc(lw+e*cw,22+k*ch,cw-1,ch-1,'var(--c1)',{r:0,op:(0.15+0.85*v).toFixed(2)})}}
    s+=tx(lw-4,22+ch,'type 1',{fs:11,a:'end',c:'var(--mute)'})+tx(lw-4,22+K*ch,'type '+K,{fs:11,a:'end',c:'var(--mute)'})+tx(lw,H-3,'experts 1 to '+N+' (darker: more of the type)',{fs:11,c:'var(--mute)'});
    $('trnMap').innerHTML=svgW(W,H,s,'Routing map by token type')});
  segBind('trnP',setPreset);$('trnRun').onclick=play;$('trnReset').onclick=reset;setPreset('bal');
  // ---- the measured sweeps ----
  const SG=SWEEP.groups;let drawn=false;
  function seedChart(el,rows,xs,xlab,xt,title,ann){fit(el,W=>{const H=W<560?210:230,all=rows.flatMap(r=>r.te);const lo=Math.min(...all)*0.85,hi=Math.max(...all)*1.12;
      const fr=frame({W,H,x:[xs[0]-0.5,xs[xs.length-1]+0.5],y:[lo,hi],ylog:true,xt,yt:[0.05,0.07,0.1,0.15,0.2,0.3].filter(v=>v>=lo&&v<=hi).map(v=>[v,String(v)]),xl:xlab,yl:'held-out MSE (log)',pl:50,pt:24});let s=fr.s+tx(0,13,title,{fs:12,w:600});
      const p=rows.map((r,i)=>[fr.sx(xs[i]),fr.sy(r.mean)]);s+=path(p,'var(--c1)');rows.forEach((r,i)=>{r.te.forEach(v=>{s+=dot(fr.sx(xs[i]),fr.sy(v),2.6,'var(--c1)',{s:'var(--bg)'})});
        s+=tx(fr.sx(xs[i]),fr.sy(Math.max(...r.te))-8,ann(r),{fs:11,a:'middle',c:'var(--mute)'})});
      el.innerHTML=svgW(W,H,s,title)})}
  function drawSweeps(){if(drawn)return;drawn=true;const E=SG.experts;
    seedChart($('swExp'),E,E.map((r,i)=>i),'experts (same size, one per token)',E.map((r,i)=>[i,String(r.o.N)]),'Experts at equal FLOPs (labels: drops)',r=>(r.drop*100).toFixed(0)+'%');
    $('swExp').insertAdjacentHTML('beforeend','<p class="small mute" style="margin:2px 0 0">Dots are the three seeds, the line their mean, labels the share of tokens dropped in training. Paper (Figure 4): quality improves with every doubling from 2 to 256 experts at fixed FLOPs. Toy: '+E.map(r=>r.o.N+': '+r.mean.toFixed(3)).join(', ')+'. It improves with every doubling up to 8 experts, 8 and 16 are level within the seed spread, and it falls back at 32, where 16 tokens per expert per batch make the load noisy and 20% of tokens are dropped at α = 10<sup>-2</sup>.</p>');
    const A=SG.alpha;seedChart($('swAlpha'),A,A.map((r,i)=>i),'balancing coefficient α',A.map((r,i)=>[i,r.o.alpha===0?'0':r.o.alpha>=0.01?String(r.o.alpha):'1e'+Math.round(Math.log10(r.o.alpha))]),'Balancing coefficient α (labels: top load)',r=>r.maxf.toFixed(1)+'×');
    $('swAlpha').insertAdjacentHTML('beforeend','<p class="small mute" style="margin:2px 0 0">Labels: the busiest expert\'s load as a multiple of a fair share. Paper (§2.2): swept 10<sup>-1</sup> to 10<sup>-5</sup>; 10<sup>-2</sup> "balanced load quickly without interfering with training loss" (no numbers given). Toy: the same shape. Up to 10<sup>-4</sup> the busiest expert takes 4.6 times its share and 37% of tokens are dropped; 10<sup>-2</sup> and 10<sup>-1</sup> are equally good within the seed spread; at 1 the loss starts to fight the task. The toy\'s best α is a step higher than the paper\'s, which is unsurprising: its task loss has a different scale.</p>');
    const C=SG.cf,xs=[0,1,2,3];fit($('swCf'),W=>{const H=W<560?210:230,all=C.flatMap(r=>r.te),lo=Math.min(...all)*0.85,hi=Math.max(...all)*1.12;
      const fr=frame({W,H,x:[-0.5,3.5],y:[lo,hi],ylog:true,xt:[0.5,1,1.25,2].map((v,i)=>[i,String(v)]),yt:[0.05,0.07,0.1,0.15,0.2,0.3].filter(v=>v>=lo&&v<=hi).map(v=>[v,String(v)]),xl:'capacity factor in training',yl:'held-out MSE (log)',pl:50,pt:24});let s=fr.s+tx(0,13,'Top-1 against top-2 at each capacity factor',{fs:12,w:600});
      [[1,'var(--c1)','top-1 (Switch)'],[2,'var(--c2)','top-2 (MoE)']].forEach(([k,c])=>{const rows=C.filter(r=>r.o.k===k);s+=path(rows.map((r,i)=>[fr.sx(xs[i]+(k-1.5)*0.08),fr.sy(r.mean)]),c);rows.forEach((r,i)=>r.te.forEach(v=>{s+=dot(fr.sx(xs[i]+(k-1.5)*0.08),fr.sy(v),2.6,c,{s:'var(--bg)'})}))});
      const lg=legend([['top-1 (Switch), 1 expert FFN per token','var(--c1)'],['top-2 (MoE), 2 per token','var(--c2)']],56,30,W-70);s+=lg.s;
      $('swCf').innerHTML=svgW(W,H,s,'Capacity factor sweep')+'<p class="small mute" style="margin:2px 0 0">Paper (Table 1): per step, top-2 ahead at capacity factor 2.0, Switch ahead at 1.25 and 1.0, all within 0.011 nats. Toy: top-2 is ahead per step at every capacity factor from 1.0 up, by more than the seed spread, at twice the expert FLOPs; top-1 at 1.0 varies most between seeds (0.09 to 0.19). At toy scale the per-step result goes the way ST-MoE later found, not the way Table 1 reads.</p>'});
    const I=SG.init,J=SG.router,m4=r=>r.mean.toFixed(4)+' ± '+r.sd.toFixed(4);
    const rows=[['More experts at equal FLOPs (Figure 4)','monotonic gains, 2 to 256 experts','gains to 8 experts ('+SG.experts[0].mean.toFixed(3)+' dense, '+SG.experts[3].mean.toFixed(3)+' at 8, '+SG.experts[4].mean.toFixed(3)+' at 16), then worse at 32 (drops)','reproduces up to 8 to 16'],
      ['Balancing loss needed (§2.2)','α = 10<sup>-2</sup> balances without hurting','α ≤ 10<sup>-4</sup>: 4.6× load, 37% drops; 10<sup>-2</sup> to 10<sup>-1</sup> best; 1 worse','reproduces the shape'],
      ['Top-1 quality per step against top-2 (Table 1)','within 0.011 nats; Switch ahead at CF 1.0, 1.25','top-2 better at every CF ≥ 1.0','does not reproduce (as ST-MoE later found)'],
      ['Lower capacity factor hurts less for Switch (Table 1)','Switch better at CF 1.0 and 1.25','top-1 at CF 1.0 is the least stable setting','does not reproduce'],
      ['Initialisation scale 0.1 (Table 3)','−2.72 ± 0.01 against −3.60 ± 0.68','s = 0.1: '+m4(I[1])+'; s = 1: '+m4(I[0]),'no effect in one layer (not testable here)'],
      ['Input jitter (Table 11)','−1.468 against argmax −1.471','jitter '+m4(J[1])+'; argmax '+m4(J[0]),'jitter slightly worse here']];
    $('swTab').innerHTML='<div style="overflow-x:auto"><table class="lt"><thead><tr><th>Knob</th><th>Paper</th><th>Toy, mean ± spread of 3 seeds</th><th>Verdict</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td class="small">'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
})();
