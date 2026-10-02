// ---- Sample tab: live Algorithm 2 for the four variants, score field, measured results, logs ----
(function(){const V=TOY.variants,NAMES={eps_simple:'ε, L<sub>simple</sub>',eps_true:'ε, true bound',mu_true:'μ̃, true bound',mu_mse:'μ̃, plain MSE'},
  T2={eps_simple:['9.46 ± 0.11','3.17'],eps_true:['7.67 ± 0.13','13.51'],mu_true:['8.06 ± 0.09','13.22'],mu_mse:['–','–']},COL={eps_simple:'--c3',eps_true:'--c1',mu_true:'--c4',mu_mse:'--c2'};
  let kind='eps_simple',J=null,t0=0,ms=0;const W=window.DDPM_W.variants.eps_simple;
  let np=0;for(const k in W){np+=W[k].shape.reduce((a,b)=>a*b,1)}setT('runP',fmt(np));
  setT('runSec',Object.keys(V).map(k=>NAMES[k]+' '+(V[k].secs/60).toFixed(0)+' min').join(', ')+' on two CPU threads, the last three partly in parallel');
  setT('runReal',pct(TOY.real.on_roll));
  const job=()=>SAMP.get(kind,+$('runN').value,+$('runSeed').value||1,$('runSig').value,10);
  function show(){const c=$('runCv');const t=+$('runT').value;$('runTv').textContent=t;if(!J){scatter(c,new Float64Array(0),{r:2.6,unit:true});return}
    const xh=$('runShow').value==='xh';let pts,have;
    if(xh){const k=Math.max(1,t);pts=J.xh[k]||null;if(!pts){for(let s=k;s<=DM.T;s++)if(J.xh[s]){pts=J.xh[s];have=s;break}}else have=k;if(!pts){pts=J.snaps[DM.T];have=DM.T}}
    else{const s=snapAt(J,t);pts=s.x;have=s.t}
    scatter(c,pts,{r:xh?1.3:zoomR(have),unit:true,rad:J.S.n>600?1.4:1.8,c:css(COL[kind]),ar:0.75});
    const done=J.S.t<1,R=done&&have===t?DM.onRoll(pts):null;
    $('runO').innerHTML=stat('timestep shown',have,J.S.t>=1?'chain now at t = '+J.S.t:'chain finished')+stat('network evaluations',fmt(J.S.nfe),J.S.n+' points × '+(DM.T-J.S.t)+' steps')+
      stat('on the roll',R?pct(R.share,1):'…',R?'mean distance '+R.mean.toFixed(3):(done?'move to a stored step':'when finished'))+stat('time',(ms/1000).toFixed(1)+' s',J.S.nfe?fmt(J.S.nfe/Math.max(ms,1)*1000)+' evaluations a second':'')}
  function cb(jj){if(jj!==J)return;ms=performance.now()-t0;$('runProg').firstChild.style.width=pct(1-jj.S.t/DM.T);
    if(jj.S.t>=1){$('runT').value=Math.ceil(jj.S.t/10)*10;$('runSt').textContent='sampling… t = '+jj.S.t;$('runGo').innerHTML='❚❚ Pause'}else{$('runSt').textContent='done: '+fmt(jj.S.n)+' samples';$('runGo').innerHTML='▶ Sample again';$('runT').value=0}show()}
  function start(){const nj=job();if(nj===J&&J.S.t>=1&&!J.stop){J.stop=true;$('runGo').innerHTML='▶ Resume';$('runSt').textContent='paused at t = '+J.S.t;return}
    if(nj===J&&J.S.t<1){$('runSeed').value=(+$('runSeed').value||1)+1;return start()}
    J=nj;t0=performance.now()-ms*(J.S.t<DM.T?1:0);if(J.S.t===DM.T)ms=0;SAMP.run(J,cb);cb(J)}
  $('runGo').addEventListener('click',start);
  $('runNew').addEventListener('click',()=>{$('runSeed').value=1+Math.floor(Math.random()*99998);reset()});
  function reset(){if(J)J.stop=true;J=null;ms=0;$('runT').value=1000;$('runProg').firstChild.style.width='0';$('runSt').textContent='';$('runGo').innerHTML='▶ Sample';show()}
  segBind('runV',m=>{kind=m;$('runV').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));reset();start()});
  ['runSig','runN','runSeed'].forEach(id=>$(id).addEventListener('change',()=>{reset()}));
  $('runShow').addEventListener('change',show);$('runT').addEventListener('input',show);
  fit($('runCv'),()=>show());
  let started=false;onTab('t-run',()=>{refit($('runCv'));if(!started){started=true;start()}drawSc();drawTc()});

  // measured table
  {let h='<table class="dt"><thead><tr><th>Variant</th><th>Paper IS / FID</th><th>Bound, test (train)</th><th>Rate + distortion</th><th>σ² = β: precision / recall / on roll</th><th>σ² = β̃: on roll, bound</th></tr></thead><tbody>';
    Object.keys(V).forEach(k=>{const v=V[k];h+='<tr'+(k==='eps_simple'?' class="ours"':'')+'><td>'+NAMES[k]+'</td><td class="n">'+T2[k].join(' / ')+'</td><td class="n">'+v.test_bpd.toFixed(3)+' ('+v.train_bpd.toFixed(3)+')</td><td class="n">'+v.rate_bpd.toFixed(2)+' + '+v.dist_bpd.toFixed(2)+'</td><td class="n">'+pct(v.beta.precision)+' / '+pct(v.beta.recall)+' / '+pct(v.beta.on_roll)+'</td><td class="n">'+pct(v.btilde.on_roll)+', '+v.test_bpd_btilde.toFixed(2)+'</td></tr>'});
    h+='<tr class="toy"><td>real data (2,000 fresh points)</td><td></td><td></td><td></td><td class="n">'+pct(TOY.real.precision)+' / '+pct(TOY.real.recall)+' / '+pct(TOY.real.on_roll)+'</td><td></td></tr></tbody></table>';$('runTab').innerHTML=h;
    setT('runHon','Held-out data: the 2,000 test points come from a different seed, but the data lives on an 8-bit grid in 2-D, so '+pct(TOY.overlap_test_in_train,0)+' of test points coincide exactly with some training point; the train and test bounds agree to within '+Math.max(...Object.values(V).map(v=>Math.abs(v.test_bpd-v.train_bpd))).toFixed(3)+' bits per dimension, so there is no sign of memorisation, but "held out" is weaker than it sounds. Bound columns use σ² = β; one ε draw per (point, t). The paper\'s IS and FID are for CIFAR10 and are not comparable with toy numbers; only the ranking is.');
    const es=V.eps_simple,et=V.eps_true,mt=V.mu_true,mm=V.mu_mse;
    setT('runRep','<b>Reproduces:</b> ε + L<sub>simple</sub> gives the best samples ('+pct(es.beta.on_roll)+' on the roll) and μ̃ + plain MSE fails ('+pct(mm.beta.on_roll)+'), the blank row of Table 2. <b>Does not reproduce:</b> μ̃ + true bound works in the paper (FID 13.22, about as good as ε + true bound) but fails here ('+pct(mt.beta.on_roll)+'); ε + true bound is nearly as good as L<sub>simple</sub> here ('+pct(et.beta.on_roll)+'), where the paper has a gap of 13.51 against 3.17; and the true bound does not give the better codelength here ('+et.test_bpd.toFixed(3)+' against '+es.test_bpd.toFixed(3)+' bits per dimension; the paper has 3.70 against 3.75). The task was not tuned to make these match. Distortion is '+pct(es.dist_bpd/es.test_bpd,0)+' of the toy\'s codelength, not "more than half" as for CIFAR10 images.')}
  // JS against PyTorch
  {const c=Object.values(V).map(v=>v.js),mx=f=>Math.max(...c.map(f));const q=V.eps_simple.quant,qm=V.mu_mse.quant;
    setT('runChk','Yes, to rounding. The weights are '+TOY.bits+'-bit, one scale per row (export.py). On 400 random inputs per variant, the network\'s output in this JavaScript matches a float64 NumPy implementation to '+sci(mx(v=>v.max_abs_js_vs_numpy_output),0)+' and the dequantised PyTorch model to '+sci(mx(v=>v.max_abs_numpy_vs_torch_output),0)+' (float32 rounding). A full 1,000-step sampling run with the page\'s random stream (mulberry32 and Box-Muller, identical in Python, maximum difference '+TOY.gauss_max_abs+') ends within '+sci(mx(v=>Math.max(v.samples.beta.max_abs_final_sample_diff,v.samples.btilde.max_abs_final_sample_diff)),0)+' of NumPy for 40 points, every variant and both σ² (check_forward.py, check_forward.mjs). '+
      '<b>What quantisation cost:</b> for ε + L<sub>simple</sub> the bound moves from '+q.bound_bpd_float.toFixed(3)+' to '+q.bound_bpd_quant.toFixed(3)+' bits per dimension and on-roll from '+pct(q.samples_float.on_roll)+' to '+pct(q.samples_quant.on_roll)+'; the μ̃ models are more sensitive (μ̃ + MSE bound '+qm.bound_bpd_float.toFixed(2)+' to '+qm.bound_bpd_quant.toFixed(2)+'), since their output must reproduce the input almost exactly. At 6 bits the μ̃ models broke down entirely, so the page uses 8.')}

  // score field
  const scX=DM.roll(500,5),scE=DM.gauss(77),scEP=new Float64Array(1000);for(let i=0;i<1000;i++)scEP[i]=scE();
  function drawSc(){const k=$('scV').value,t=+$('scT').value;$('scTv').textContent=t;const host=$('scCv'),w=host.clientWidth;if(!w)return;
    const N=DM.net(k),ab=DM.abar[t],a=Math.sqrt(ab),b=Math.sqrt(1-ab),pts=new Float64Array(1000);for(let i=0;i<1000;i++)pts[i]=a*scX[i]+b*scEP[i];
    const h=Math.min(320,Math.round(w*0.75)),r=Math.max(1.2,Math.min(2.6,0.95+1.7*b)),nx=Math.max(9,Math.round(w/34)),ny=Math.max(7,Math.round(h/34)),s=h/(2*r),res=[0,0,0,0],arr=[];
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const x=(i+.5-nx/2)*(w/nx)/s,y=(j+.5-ny/2)*(h/ny)/s;DM.meanEps(N,x,y,t,res);const ex=-res[2],ey=-res[3],m=Math.hypot(ex,ey),L=Math.min(m,2.2)*(14/s),f=m>0?L/m:0;arr.push([x,y,ex*f,ey*f])}
    scatter(host,pts,{r,unit:true,rad:1.5,c:css('--dim'),arrows:arr,ac:css(COL[k]),h})}
  $('scV').addEventListener('change',drawSc);$('scT').addEventListener('input',drawSc);fit($('scCv'),drawSc);

  // training curves
  function drawTc(){fit($('tcA'),w=>{const m=$('tcK').value,S=[];
    if(m==='test'){Object.keys(V).forEach(k=>S.push({pts:V[k].test_curve,c:'var('+COL[k]+')',n:NAMES[k].replace(/<[^>]+>/g,'')}));
      $('tcA').innerHTML=lineChart(w,{x:[0,300000],y:[5,50000],logy:true,h:230,xt:[[0,'0'],[100000,'100k'],[200000,'200k'],[300000,'300k']],yt:[[5,'5'],[10,'10'],[100,'100'],[1000,'1,000'],[10000,'10,000']],xl:'training step',yl:'test bound, bits/dim',series:S,label:'Test bound during training'});
      setT('tcN','Measured on 500 test points with the EMA weights every 10,000 steps (train.py), log scale. The EMA (decay 0.9999, an average over roughly the last 10,000 steps) still carries the untrained weights early on, which is why the first points are so high, worst for the μ̃ models. The ε models pass 6.6 bits per dimension by 150,000 to 200,000 steps and end at '+V.eps_simple.test_curve.slice(-1)[0][1].toFixed(2)+' and '+V.eps_true.test_curve.slice(-1)[0][1].toFixed(2)+'; the μ̃ models flatten near 7.8 after 100,000 steps.')}
    else{let lo=1e9,hi=0;Object.keys(V).forEach(k=>{const L=V[k].loss;L.forEach(v=>{if(v>0){lo=Math.min(lo,v);hi=Math.max(hi,v)}});S.push({pts:L.map((v,i)=>[(i+1)*1000,v]),c:'var('+COL[k]+')',n:NAMES[k].replace(/<[^>]+>/g,''),sw:1.3})});
      const e0=Math.floor(Math.log10(lo)),e1=Math.ceil(Math.log10(hi)),yt=[];for(let e=e0;e<=e1;e++)yt.push([10**e,exp10(e)]);
      $('tcA').innerHTML=lineChart(w,{x:[0,300000],y:[10**e0,10**e1],logy:true,h:240,xt:[[0,'0'],[100000,'100k'],[200000,'200k'],[300000,'300k']],yt,xl:'training step',yl:'mean training loss',series:S,label:'Training loss'});
      setT('tcN','Mean loss over each 1,000 steps, unsmoothed beyond that. Units differ: L<sub>simple</sub> is the ε MSE per coordinate; the true-bound variants report one sampled bound term in nats per point; μ̃ + MSE is a squared distance between means, tiny because consecutive means differ by about β. Compare shapes, not heights.')}})}
  $('tcK').addEventListener('change',()=>{refit($('tcA'))});
})();
