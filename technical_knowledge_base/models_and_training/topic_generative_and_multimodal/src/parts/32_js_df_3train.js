// ---- Diffusion lab: training curves and error by timestep (section 3), headline stats ----
(function(){
  const {D,F,$}=DF;if(!$('df-loss'))return;
  DF.facts();DF.quiz();DF.nav();
  const C={eps:'var(--c1)',v:'var(--c2)'};
  DF.leg($('df-loss-leg'),[['&epsilon;-prediction model',C.eps],['v-prediction model',C.v]]);
  const seg=$('df-loss-m');
  const at=(c,s)=>{const r=c.find(p=>p[0]===s);return r?r[1]:'n/a'};
  function draw(){const m=DF.segVal(seg),T=D.train;
    if(m==='curve'){DF.chart($('df-loss'),['eps','v'].map(k=>({color:C[k],dots:false,pts:T[k].curve})),{logy:true,xticks:[0,1000,2000,3000,4000],xlab:'training step',ylab:'loss (own target)',label:'training loss'});
      $('df-loss-cap').innerHTML='Training loss (mean over each 50 steps) on each model\'s own target, so the two levels are not comparable: at high noise the v target is close to the clean image, which is hard to guess, while the noise target there is nearly free (the error-by-timestep views). &epsilon;-model: '+at(T.eps.curve,1000)+' at step 1,000 and '+at(T.eps.curve,4000)+' at step 4,000 <span class="meas">measured</span>; the loss is noisy because each batch draws new timesteps, and a falling loss says little about sample quality, which section 5 measures directly.';return}
    const idx=m==='eps'?2:3;
    DF.chart($('df-loss'),['eps','v'].map(k=>({color:C[k],pts:T[k].per_t.map(r=>[Math.max(r[0],1),r[idx]])})),{logx:true,logy:true,xticks:[1,10,100,1000],xfmt:v=>v===1?'0':v,xlab:'timestep t (log scale; 0 drawn at 1)',ylab:m==='eps'?'noise MSE':'clean-image MSE',label:'validation error by timestep'});
    const e=T.eps.per_t,first=e[0],last=e[e.length-1];
    $('df-loss-cap').innerHTML=m==='eps'?'Mean squared error of the predicted noise, converted from each model\'s output. &epsilon;-model: <b>'+first[2]+'</b> at t = 0 against <b>'+last[2]+'</b> at t = 999 <span class="meas">measured</span>: near-pure noise is trivially &quot;predicted&quot; by returning the input.':
      'Mean squared error of the predicted clean image x&#770;<sub>0</sub> (clipped to [&minus;1, 1]). &epsilon;-model: <b>'+first[3]+'</b> at t = 0 against <b>'+last[3]+'</b> at t = 999, where the v-model\'s is <b>'+T.v.per_t[T.v.per_t.length-1][3]+'</b> <span class="meas">measured</span>. With no image left the best guess is a blurred class average, which the v-model outputs; the &epsilon;-model\'s guess goes through a division by &radic;&#257; = '+F.sqrtab_lin_999+' and is mostly amplified noise.'}
  DF.seg(seg,draw);DF.onRender(draw);draw();
  // headline stats
  const top=$('df-top');if(top)top.innerHTML=DF.stat('Training',F.train_min+' min','tiny U-Net, '+F.train_steps+' steps on the M1 Pro GPU')+
    DF.stat('DPM-Solver++, 20 steps','FD '+F.fd_dpm_20,F.sec_dpm_20+' s for 1,000 images; real images FD '+F.floor_fd)+
    DF.stat('DDPM, 1,000 steps','FD '+F.fd_ddpm_1000,F.sec_ddpm_1000+' s for 1,000 images: slow but best without guidance')+
    DF.stat('Guidance s = 2, DDIM 50','FD '+F.fd_cfg_2,'accuracy '+F.acc_cfg_1+' to '+F.acc_cfg_2+'; diversity '+F.div_cfg_1+' to '+F.div_cfg_2)+
    DF.stat('SD v1.5 U-Net pass',F.sd_pass+' s','fp16, 512 &times; 512, batch 1; '+F.sd_img25+' s per guided 25-step image');
})();
