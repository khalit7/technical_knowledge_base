// ---- Diffusion lab: the trajectory animation (section 4), steps against quality and the strips (section 5) ----
(function(){
  const {D,F,$}=DF;if(!$('df-traj'))return;
  const TR=D.traj,AB=DF.AB.linear;
  const nseg=$('df-traj-n'),vseg=$('df-traj-v');
    function cur(){const m=DF.segVal(nseg);return {m,d:TR[m]}}
  const K=TR.k;
  function frames(){return cur().d.frames.length+1}
  function drawF(i){const {m,d}=cur();const v=DF.segVal(vseg)==='x0'&&d.x0?'x0':'xt';const el=$('df-traj');
    if(i===0){DF.tiles(el,TR.noise,0,K,K)}else{DF.tiles(el,d[v],(i-1)*K,K,K)}
    const n=d.t.length,s=i===0?0:d.frames[i-1],t=i===0?999:d.t[s-1];const isD=m==='d20';
    let cap;
    if(i===0)cap='Start: '+K+' images of pure Gaussian noise, one per requested class. Nothing about the class is in them yet.';
    else{const nxt=s<n?d.t[s]:-1;
      cap='Step '+s+' of '+n+': the network sees the image at t = '+t+' and predicts its noise; '+(isD?'DDPM moves to the posterior mean and adds fresh noise':'DDIM jumps')+' to '+(nxt>=0?'t = '+nxt:'the clean image')+'.'+(v==='x0'?' Shown: the model\'s guess of the clean image at this step.':'')+(s===n?' Done: '+n+' network evaluation'+(n>1?'s':'')+' per image.':'')+(d.frames.length<n?' (Every '+(n/d.frames.length)+(n/d.frames.length===2?'nd':'th')+' step is shown.)':'');
      if(n===1)cap+=' One step lands on the model\'s single guess: for this noise-predicting model, the noise estimate divided by &radic;&#257; = '+F.sqrtab_lin_999+', mostly amplified error (section 5).'}
    $('df-traj-cap').innerHTML=cap;
    $('df-traj-stats').innerHTML=DF.stat('timestep',i===0?'999 (start)':t,'')+DF.stat('signal kept',i===0?'0':'&radic;&#257; = '+Math.sqrt(AB[t]).toFixed(3),'at the step\'s input')+DF.stat('network evaluations',s+' of '+n,'per image')}
  const an=DF.anim({card:'df-traj-card',ctl:'df-traj-ctl',n:frames(),draw:drawF,label:'Sampling step',ms:i=>Math.max(250,2400/frames())+300});
  DF.seg(nseg,m=>{const x0b=vseg.querySelector('[data-m="x0"]');x0b.disabled=m==='d20';if(m==='d20'&&DF.segVal(vseg)==='x0'){vseg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='xt'))}an.reset(frames());an.play()});
  DF.seg(vseg,()=>an.redraw());
  // steps against quality
  const S=D.samp,SC={ddpm:'var(--c2)',ddim:'var(--c1)',dpm:'var(--c3)',euler:'var(--c4)'},SN={ddpm:'DDPM',ddim:'DDIM',dpm:'DPM-Solver++ 2M',euler:'Euler'};
  DF.leg($('df-steps-leg'),Object.keys(SC).map(k=>[SN[k],SC[k]]));
  const mseg=$('df-steps-m');
  function stepsDraw(){const m=DF.segVal(mseg);
    const ser=Object.keys(SC).map(k=>({color:SC[k],pts:S.filter(r=>r.s===k).map(r=>[r.n,m==='acc'?r.acc*100:r[m]])}));
    const hl=m==='fd'?{y:+F.floor_fd,label:'real images'}:m==='div'?{y:+F.real_div,label:'real images'}:m==='acc'?{y:+F.real_acc*100,label:'real images'}:null;
    DF.chart($('df-steps'),ser,{logx:true,logy:m==='fd',xticks:[1,4,10,20,50,250,1000],xlab:'sampling steps (log scale)',ylab:m==='fd'?'FD (log scale)':m==='acc'?'class accuracy %':'diversity',hline:hl,label:'sample quality against steps'});
    $('df-steps-cap').innerHTML=m==='fd'?'Lower is better; dashed: 1,000 real validation images. The deterministic samplers level off: DPM-Solver++ reaches FD '+F.fd_dpm_20+' at 20 steps, DDIM is within 10% of its best from '+F.plateau_steps+' steps. Euler and DDIM give the same scores to within 0.2 because, for a noise-predicting model, DDIM is Euler\'s method on the probability-flow ODE in rescaled variables (Karras et al. 2022). DDPM keeps improving to FD '+F.fd_ddpm_1000+' at 1,000 steps (the predict-then-reveal above says why).':
      m==='acc'?'How often the classifier recognises the requested class. Real validation images: '+(F.real_acc*100).toFixed(1)+'%.':'Mean distance between same-class samples in classifier feature space; below the real-image line means samples look more alike than real ones do. Euler\'s line lies on DDIM\'s.'}
  DF.seg(mseg,stepsDraw);DF.onRender(stepsDraw);stepsDraw();
  DF.clsRow($('df-st-cls'));
  const ss=$('df-st-s'),sn=$('df-st-n');
  function stDraw(){const k=ss.value;let n=sn.value;
    [...sn.options].forEach(o=>o.disabled=!D.st[k+'_'+o.value]);if(!D.st[k+'_'+n]){n=sn.value='50'}
    DF.tiles($('df-st'),D.st[k+'_'+n],0,10,10,DF.CLS);
    const r=S.find(x=>x.s===k&&x.n===+n);
    $('df-st-cap').innerHTML=SN[k]+', '+n+' step'+(n>1?'s':'')+': FD <b>'+r.fd+'</b>, class accuracy <b>'+(r.acc*100).toFixed(1)+'%</b>, diversity '+r.div+'; '+r.sec+' s for all 1,000 samples <span class="meas">measured</span>.'}
  ss.addEventListener('change',stDraw);sn.addEventListener('change',stDraw);stDraw();
  // eps against v at one step, and the mismatch
  const ev=$('df-ev');const rows=[['&epsilon;-model, DDIM 1 step','ddim_1'],['v-model, DDIM 1 step','v_ddim_1'],['v-model, DDIM 50 steps','v_ddim_50'],['v-model sampled as if it predicted &epsilon; (50 steps)','mm_50']];
  ev.innerHTML='<div class="df-cls" style="margin-left:calc(7em + 4px)"></div>'+rows.map((r,i)=>'<div class="df-row" style="grid-template-columns:minmax(0,7em) minmax(0,1fr)"><div class="lb">'+r[0]+'</div><div class="df-strip" id="df-ev'+i+'"></div></div>').join('');
  DF.clsRow(ev.querySelector('.df-cls'));
  rows.forEach((r,i)=>DF.tiles($('df-ev'+i),D.st[r[1]],0,10,10,DF.CLS));
  $('df-ev-cap').innerHTML='Scores over 1,000 samples <span class="meas">measured</span>: &epsilon;-model at 1 step FD <b>'+F.fd_ddim_1+'</b> (accuracy '+F.acc_ddim_1+'); v-model at 1 step FD <b>'+F.v_fd_ddim_1+'</b> (accuracy '+F.v_acc_ddim_1+'); v-model at 50 steps FD '+F.v_fd_ddim_50+' (the &epsilon;-model: '+F.fd_ddim_50+'); the mismatched sampler FD '+F.mm_fd_50+'. The last row is the bug of section 8: nothing in the code fails, the images are just wrong.';
})();
