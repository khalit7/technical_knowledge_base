// ---- Visuals absorbed from the root Diffusion lab on 2026-10-24 (this page now owns diffusion from zero):
// the hero, the forward-process slider (section 1), error by timestep and the one-step strips (section 3),
// and the recorded sampling trajectories (section 5). Data: window.DZ.test (Fashion-MNIST test images) and
// window.DZX (the lab's recordings, runs/make_data_more.py). Nothing plays before the reader acts.
(function(){
  const D=window.DZ,X=window.DZX;if(!D||!X)return;
  const $=id=>document.getElementById(id);
  const AB=DZC.sched('linear');
  const TEST=DZC.b64u8(D.test);   // 10 images x 784, first test image of each class
  const CLS=['T-shirt','Trouser','Pullover','Dress','Coat','Sandal','Shirt','Sneaker','Bag','Ankle boot'];
  const R=DZC.rng(5),EPS=new Float64Array(10*784);for(let i=0;i<EPS.length;i++)EPS[i]=R.g();
  const noisy=(img,t,out,off,stride)=>{const a=Math.sqrt(AB[t]),b=Math.sqrt(1-AB[t]);
    for(let y=0;y<28;y++)for(let x=0;x<28;x++){const j=y*28+x,v=a*(TEST[img*784+j]/127.5-1)+b*EPS[img*784+j];out[y*stride+off+x]=(Math.max(-1,Math.min(1,v))+1)*127.5}};
  const sheets={};
  function sheet(uri){if(!sheets[uri]){const im=new Image();im.src=uri;sheets[uri]=im}return sheets[uri]}
  // draw tile j of a sprite sheet with `cols` tiles per row into a canvas
  function tile(cv,uri,j,cols){const im=sheet(uri);cv.width=28;cv.height=28;const req=uri+'|'+j;cv._req=req;
    const go=()=>{if(cv._req!==req)return;const c=cv.getContext('2d');c.clearRect(0,0,28,28);c.drawImage(im,(j%cols)*28,Math.floor(j/cols)*28,28,28,0,0,28,28)};
    if(im.complete&&im.naturalWidth)go();else im.addEventListener('load',go,{once:true})}
  function stripImg(cv,uri){const im=sheet(uri);const go=()=>{cv.width=im.width;cv.height=im.height;cv.getContext('2d').drawImage(im,0,0)};
    if(im.complete&&im.naturalWidth)go();else im.addEventListener('load',go,{once:true})}
  const fx=v=>v>=100?v.toFixed(0):v>=0.01?v.toPrecision(2):v.toExponential(1);

  // ---------- hero ----------
  if($('dz-hero-f')){
    const TS=[0,250,500,750,999],DRESS=3;
    $('dz-hero-f').innerHTML=TS.map(t=>'<div><canvas aria-label="dress at t = '+t+'"></canvas><div class="cap">'+(t?'t = '+t+'<br>&radic;&#257; '+Math.sqrt(AB[t]).toFixed(t===999?4:2):'x<sub>0</sub>, clean<br>t = 0')+'</div></div>').join('');
    [...$('dz-hero-f').querySelectorAll('canvas')].forEach((cv,i)=>{const v=new Float64Array(784);
      if(TS[i]===0){for(let j=0;j<784;j++)v[j]=TEST[DRESS*784+j]}else noisy(DRESS,TS[i],v,0,28);DZC.drawGrey(cv,v,28,28)});
    const T20=X.traj['20'],K=X.traj.k,ROWS=[[-1,'pure noise<br>start'],[0,'guess after<br>2 calls'],[1,'after 4'],[3,'after 8'],[9,'after 20 calls:<br>the sample']];
    $('dz-hero-r').innerHTML=ROWS.map(r=>'<div><canvas aria-label="sample '+r[1].replace(/<br>/g,' ')+'"></canvas><div class="cap">'+r[1]+'</div></div>').join('');
    [...$('dz-hero-r').querySelectorAll('canvas')].forEach((cv,i)=>{const r=ROWS[i][0];if(r<0)tile(cv,X.traj.noise,0,K);else tile(cv,r===9?T20.xt:T20.x0,r*K,K)});
  }

  // ---------- section 1: forward process slider ----------
  if($('dz-fwd-t')){
    const W=280,buf=new Float64Array(W*28);
    function draw(){const t=+$('dz-fwd-t').value;$('dz-fwd-to').textContent=t;
      for(let i=0;i<10;i++)noisy(i,t,buf,i*28,W);DZC.drawGrey($('dz-fwd-cv'),buf,W,28);
      const a=AB[t],snr=a/(1-a);
      $('dz-fwd-cnt').innerHTML=RD.stat('Signal kept','&radic;&#257; = '+Math.sqrt(a).toFixed(t>900?4:3),'amplitude of x<sub>0</sub> left')+
        RD.stat('Noise','&radic;(1 &minus; &#257;) = '+Math.sqrt(1-a).toFixed(3),'standard deviation of the added noise')+
        RD.stat('SNR',fx(snr),snr<1?'noise dominates (below 1 from t = 259)':'signal dominates')}
    $('dz-fwd-t').addEventListener('input',draw);draw();
  }

  // ---------- section 3: error by timestep ----------
  if($('dz-err-chart')){
    let col=2;const COL={eps:'#2f6fb5',v:'#c2703a'};
    function render(){const ser=[['eps','ε-model'],['v','v-model']].map(([k,n])=>({name:n,color:COL[k],pts:X.per_t[k].map(r=>[Math.max(r[0],1),r[col]])}));
      DZC.chart({el:$('dz-err-chart'),series:ser,xlog:true,ylog:true,x0:1,x1:999,xlab:'timestep t (log scale; t = 0 drawn at 1)',ylab:col===2?'noise MSE (log)':'clean-image MSE (log)',label:'Validation error by timestep'});
      DZC.legend($('dz-err-leg'),ser)}
    RD.seg($('dz-err-m'),m=>{col=+m;render()});RD.onRender(render);RD.onResize(render);
  }

  // ---------- section 3: one step, epsilon against v ----------
  if($('dz-ev-rows')){
    const rows=[['&epsilon;-model, DDIM 1 step','ddim_1'],['v-model, DDIM 1 step','v_ddim_1'],['v-model, DDIM 50 steps','v_ddim_50'],['v-model sampled as &epsilon; (bug), 50 steps','mm_50']];
    $('dz-ev-rows').innerHTML=rows.map((r,i)=>'<div class="r"><div class="l">'+r[0]+'</div><canvas class="dz-strip" id="dz-ev'+i+'" aria-label="'+r[1]+'"></canvas></div>').join('');
    rows.forEach((r,i)=>stripImg($('dz-ev'+i),X.st[r[1]]));
  }

  // ---------- section 5: the recorded trajectories, a stepper ----------
  if($('dz-traj-card')){
    const TR=X.traj,K=TR.k,cv=[...$('dz-traj').querySelectorAll('canvas')];
    let mode='20',view='xt';
    const frames=()=>TR[mode].frames.length+1;
    function draw(i){const d=TR[mode],v=view==='x0'&&d.x0?'x0':'xt';
      for(let k=0;k<K;k++){if(i===0)tile(cv[k],TR.noise,k,K);else tile(cv[k],d[v],(i-1)*K+k,K)}
      const n=d.t.length,s=i===0?0:d.frames[i-1],t=i===0?999:d.t[s-1],isD=mode==='d20';let cap,title;
      if(i===0){title='Start: pure Gaussian noise';cap=K+' images of pure noise, one per requested class. Nothing about the class is in them yet.'}
      else{const nxt=s<n?d.t[s]:-1;title='Step '+s+' of '+n;
        cap='The network sees the image at t = '+t+' and predicts its noise; '+(isD?'DDPM moves to the posterior mean and adds fresh noise':'DDIM jumps')+' to '+(nxt>=0?'t = '+nxt:'the clean image')+'.'+(v==='x0'?' Shown: the model\'s guess of the clean image at this step.':'')+(s===n?' Done: '+n+' network evaluation'+(n>1?'s':'')+' per image.':'')+(d.frames.length<n?' (Every '+(n/d.frames.length)+(n/d.frames.length===2?'nd':'th')+' step is shown.)':'');
        if(n===1)cap+=' One step lands on the model\'s single guess: for this noise-predicting model the noise estimate is divided by &radic;&#257; = '+X.lab.sqrtab_lin_999+', mostly amplified error (section 3).'}
      $('dz-traj-cap').innerHTML='<div class="t">'+title+'</div><p>'+cap+'</p>';
      $('dz-traj-cnt').innerHTML=RD.stat('Timestep',i===0?'999 (start)':String(t),'at the step\'s input')+RD.stat('Signal kept',i===0?'0':'&radic;&#257; = '+Math.sqrt(AB[t]).toFixed(3),'')+RD.stat('Network calls',s+' of '+n,'per image')}
    const an=RD.anim({card:'dz-traj-card',ctl:'dz-traj-ctl',n:frames(),ms:700,label:'Sampling step',draw});
    const vb=$('dz-traj-v').querySelector('[data-m="x0"]');
    RD.seg($('dz-traj-n'),m=>{mode=m;vb.disabled=m==='d20';if(m==='d20'&&view==='x0'){view='xt';$('dz-traj-v').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='xt'))}an.reset(frames())});
    RD.seg($('dz-traj-v'),m=>{if(m==='x0'&&mode==='d20')return;view=m;an.redraw()});
  }
})();
