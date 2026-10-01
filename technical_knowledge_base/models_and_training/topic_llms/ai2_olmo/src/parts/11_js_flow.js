// ---- Model flow animation: Olmo 3 32B Think, fully open against the same run released as open weights ----
// Durations: Olmo 3 report section 2.4; Olmo 3.1 extension: Olmo 3 blog. Checkpoints: Hugging Face branches, 1 Oct 2026.
(function(){
  const card=$('fa');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // d0,d1 in days from the first pretraining step; data prep sits before day 0 and is not on the clock
  const S=[
    {n:'Data',s:'Data',d0:-6,d1:0,tok:0,ck:0,ds:'Dolma 3 pool and mix',lg:0,c:'var(--c6)'},
    {n:'Stage 1: pretraining',s:'Pretrain',d0:0,d1:44.5,tok:5.5,ck:655,lg:41,c:'var(--c1)'},
    {n:'Stage 2: midtraining',s:'Mid',d0:44.5,d1:46,tok:0.2,ck:49,ds:'Dolmino Mix',lg:2,c:'var(--c3)'},
    {n:'Stage 3: long context',s:'LC',d0:46,d1:47,tok:0.1,ck:14,ds:'Longmino Mix',lg:1,c:'var(--c5)'},
    {n:'SFT',s:'SFT',d0:47,d1:49,tok:0,ck:1,ds:'Dolci-Think-SFT',lg:0,c:'var(--c4)'},
    {n:'DPO',s:'DPO',d0:49,d1:51,tok:0,ck:1,ds:'Dolci-Think-DPO',lg:0,c:'var(--c2)'},
    {n:'RLVR',s:'RL',d0:51,d1:56,tok:0,ck:1,ds:'Dolci-Think-RL',lg:0,c:'var(--bad)'},
    {n:'Olmo 3.1: RL extended',s:'3.1 RL',d0:56,d1:77,tok:0,ck:1,lg:0,c:'var(--bad)'}];
  const N=S.length,DUR=2400,TOT_CK=S.reduce((a,s)=>a+s.ck,0);
  const CAP={open:[
    'Before training starts, Ai2 builds the corpus: 104 Common Crawl dumps plus science PDFs, code, papers and maths, filtered and deduplicated into a 9.31T-token pool, from which the 5.93T-token Dolma 3 Mix is drawn. The pool, the mix and the tooling are released, so the first public artefacts exist before the first gradient step.',
    'Stage 1, pretraining: 5.5T tokens in about 44.5 days, first on 512 GPUs, then on 1,024. Checkpoints are saved and published along the way, 655 of them, and so is the log of every launch: 41 segments, because the run was relaunched 40 times (the logs do not say why each time).',
    'Stage 2, midtraining: two parallel 100B-token runs on the Dolmino mix with different data orders, then their weights are averaged. 49 checkpoints, both runs\' logs and the mix are public. About 1.5 days.',
    'Stage 3, long-context extension: 100B tokens of Longmino take the context from 8,192 to 65,536 tokens, and the last three checkpoints are averaged into Olmo 3 Base 32B. 14 checkpoints public. About 1 day.',
    'Post-training begins. SFT on Dolci-Think-SFT: four learning rates swept in parallel on 256 GPUs each for 36 hours, then about 12 hours of evaluation and merging. The SFT model and its data are released.',
    'DPO with delta learning on Dolci-Think-DPO: about 18 hours per learning-rate sweep, stretched over days by cluster instability. The DPO model and the preference data are released.',
    'RLVR with OlmoRL on Dolci-Think-RL: about 5 days, at least one of them lost to instability. Day 56: Olmo 3 Think 32B, released with its RL data and code. In the public lane: every stage\'s data, 721 checkpoints and the training logs.',
    'After the release, Ai2 resumes the same RL run for 21 days on 224 GPUs: Olmo 3.1 Think 32B. The RL data and code were already public, so the run could be reproduced from the release.'],
  ow:[
    'The same corpus is built, but it stays inside the lab. Outside, no one can see what the model will read or check it for benchmark questions.',
    'The same 44.5 days of pretraining. Checkpoints are still saved (a run relaunched 40 times needs them), but none leaves the lab. The loss curve, its spikes and the restarts stay internal.',
    'Midtraining and souping happen as before. This mix is the one that most shapes the base model\'s maths and code, and the part labs guard hardest.',
    'Long-context extension. Still nothing public, and there is no base checkpoint for anyone to fork.',
    'SFT: the data and the sweep stay internal.',
    'DPO: the preference pairs and how they were made stay internal.',
    'Day 56: the release. One artefact leaves the lab: the final weights, with a model card and a table of scores. All the data, checkpoints and logs the fully open run published are missing.',
    'A better model can follow, but only as another set of final weights. Without the RL data and the RL checkpoint, an outsider can fine-tune the weights but cannot reproduce or continue the lab\'s run.']};
  const st={m:'open',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v;
  function tally(k,t,m){let ck=0,ds=0,lg=0,tok=0;
    for(let i=0;i<N;i++){const f=i<k?1:i===k?t:0;tok+=S[i].tok*f;if(m==='open'){ck+=Math.floor(S[i].ck*f+1e-9);lg+=Math.floor(S[i].lg*f+1e-9);if(S[i].ds&&f>=0.5)ds++}}
    if(m==='ow'){const rel=k>6||(k===6&&t>=1);ck=rel?(k===7&&t>=1?2:1):0}
    const day=Math.max(0,S[k].d0+(S[k].d1-S[k].d0)*t);const gh=(Math.min(day,56)*1024+Math.max(0,day-56)*224)*24;
    return {ck,ds,lg,tok,day,gh}}
  function draw(){
    const m=st.m,k=st.k,t=cl(st.t),narrow=card.clientWidth<560,W=narrow?360:820,x0=narrow?40:56,x1=W-12,H=narrow?250:236;
    const dx=d=>x0+(x1-x0)*d/77,dataW=narrow?30:44;const X=d=>d<0?x0-dataW+dataW*(d+6)/6:dx(d);
    const curDay=S[k].d0+(S[k].d1-S[k].d0)*t;let s='';
    const yb=58,bh=26,yl=yb+bh+44; // bar and public lane
    s+='<text x="'+(x0-dataW)+'" y="16" font-size="11" fill="var(--mute)">'+(narrow?'Days from the first training step, to scale':'Olmo 3 32B Think, days from the first pretraining step, drawn to scale')+'</text>';
    [0,10,20,30,40,50,60,70].forEach(d=>{s+='<line x1="'+dx(d)+'" x2="'+dx(d)+'" y1="'+(yb-6)+'" y2="'+(yb-2)+'" stroke="var(--mute)"/><text x="'+dx(d)+'" y="'+(yb-9)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+d+'</text>'});
    // lab boundary
    if(m==='ow')s+='<rect x="'+(x0-dataW-6)+'" y="'+(yb-30)+'" width="'+(x1-x0+dataW+12)+'" height="'+(bh+46)+'" rx="8" fill="var(--closed2)" stroke="var(--closed)" stroke-dasharray="5 4"/><text x="'+(x1-4)+'" y="'+(yb+bh+12)+'" font-size="10.5" text-anchor="end" fill="var(--closed)">inside the lab</text>';
    S.forEach((g,i)=>{const a=X(g.d0),b=X(g.d1),w=Math.max(1.5,b-a),done=i<k?1:i===k?t:0;
      s+='<rect x="'+a+'" y="'+yb+'" width="'+w+'" height="'+bh+'" fill="var(--soft)" stroke="var(--line)"/>';
      if(done>0)s+='<rect x="'+a+'" y="'+yb+'" width="'+(w*done)+'" height="'+bh+'" fill="'+g.c+'" fill-opacity="'+(i===k?0.9:0.6)+'"/>';
      const lab=narrow?g.s:(w>34?g.s:'');if(lab&&w>18)s+='<text x="'+(a+w/2)+'" y="'+(yb+bh/2+4)+'" font-size="10.5" text-anchor="middle" fill="var(--ink)">'+lab+'</text>'});
    // labels for the narrow post-training stages
    if(!narrow){const lx=dx(52),ly=yb+bh+12;s+='<text x="'+dx(48)+'" y="'+ly+'" font-size="10" text-anchor="middle" fill="var(--mute)">mid, LC, SFT, DPO, RL</text>'}
    // playhead
    const px=X(curDay);s+='<line x1="'+px+'" x2="'+px+'" y1="'+(yb-4)+'" y2="'+(yb+bh+4)+'" stroke="var(--ink)" stroke-width="2"/>';
    // public lane
    s+='<line x1="'+(x0-dataW)+'" x2="'+x1+'" y1="'+yl+'" y2="'+yl+'" stroke="var(--line)"/><text x="'+(x0-dataW)+'" y="'+(yl-6)+'" font-size="10.5" fill="var(--open)">'+(m==='open'?'public: released as it is made':'public')+'</text>';
    const T=tally(k,t,m);
    if(m==='open'){
      // checkpoints as ticks below the lane, placed at the time they were made
      let p='';S.forEach((g,i)=>{const done=i<k?1:i===k?t:0;const n=Math.floor(g.ck*done+1e-9);const step=g.ck>60?5:1;
        for(let j=0;j<n;j+=step){const d=g.d0+(g.d1-g.d0)*(j+0.5)/g.ck;const x=X(d);p+='M'+x.toFixed(1)+' '+(yl+4)+'v10'}});
      s+='<path d="'+p+'" stroke="var(--open)" stroke-width="1" fill="none"/>';
      // log segments as small bars
      let q='';S.forEach((g,i)=>{const done=i<k?1:i===k?t:0;const n=Math.floor(g.lg*done+1e-9);for(let j=0;j<n;j++){const d=g.d0+(g.d1-g.d0)*(j+0.5)/g.lg;q+='M'+X(d).toFixed(1)+' '+(yl+20)+'h2v6h-2z'}});
      s+='<path d="'+q+'" fill="var(--c2)"/>';
      // datasets as labelled chips
      let row=0;S.forEach((g,i)=>{if(!g.ds)return;const done=i<k?1:i===k?t:0;if(done<0.5)return;const x=Math.min(X(g.d0),x1-(narrow?70:100));const y=yl+34+row*16;row=(row+1)%(narrow?6:5);
        s+='<rect x="'+x+'" y="'+(y-10)+'" width="'+(narrow?70:100)+'" height="13" rx="3" fill="var(--open2)" stroke="var(--open)"/><text x="'+(x+4)+'" y="'+y+'" font-size="9.5" fill="var(--ink)">'+(narrow?g.ds.replace('Dolci-Think-','Dolci ').replace(' Mix','').replace('Dolma 3 pool and mix','Dolma 3'):g.ds)+'</text>'});
      s+='<text x="'+x1+'" y="'+(yl-6)+'" font-size="9.5" text-anchor="end" fill="var(--mute)">'+(narrow?'ticks: checkpoints; bars: logs':'green ticks: checkpoints (1 per 5 in stage 1); orange bars: log segments')+'</text>';
    }else{
      if(T.ck>0){const x=Math.min(dx(56),x1-150);s+='<rect x="'+x+'" y="'+(yl+8)+'" width="150" height="34" rx="5" fill="var(--closed2)" stroke="var(--closed)"/><text x="'+(x+75)+'" y="'+(yl+22)+'" font-size="10.5" text-anchor="middle">final weights'+(T.ck>1?' (x2)':'')+'</text><text x="'+(x+75)+'" y="'+(yl+35)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">model card, score table</text>'}
      else s+='<text x="'+((x0+x1)/2)+'" y="'+(yl+26)+'" font-size="11" text-anchor="middle" fill="var(--mute)">nothing yet</text>';
    }
    $('faSvg').innerHTML=svgEl(W,H,s,'Model flow at '+S[k].n);
    if(st.lk!==k||st.lm!==m){$('faStep').textContent=(k+1)+' of '+N+': '+S[k].n+(m==='ow'?' (open-weights release)':'');$('faCap').textContent=CAP[m][k];st.lk=k;st.lm=m}
    $('faCnt').innerHTML=stat('Day',k===0?'before 0':fmt(T.day,1),'of 56 to Olmo 3 Think, 77 to 3.1')+
      stat('Cluster GPU-hours',fmt(T.gh),'about '+usd(T.gh*2/1e6,2)+'M at $2 per hour')+
      stat('Pretraining tokens',fmt(T.tok,2)+'T','stages 1 to 3')+
      stat('Public checkpoints',fmt(T.ck),m==='open'?'of '+TOT_CK+' by the end':'the final weights only')+
      stat('Public datasets',T.ds,m==='open'?'one per stage, 6 in all':'none')+
      stat('Public log segments',T.lg,m==='open'?'pretraining 41, midtraining 2, long context 1':'none');
    const sc=$('faScrub');sc.max=N*100;sc.value=Math.round((k+t)*100);
    const pb=$('faPlay'),end=k===N-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<N-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('faPlay').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===N-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<N-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('faFwd').addEventListener('click',()=>{pause();st.k=Math.min(N-1,st.k+1);st.t=1;draw()});
  $('faBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('faScrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(N-1,Math.floor(v/100));st.t=v>=N*100?1:cl(v/100-st.k);draw()});
  $('faSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('faM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
