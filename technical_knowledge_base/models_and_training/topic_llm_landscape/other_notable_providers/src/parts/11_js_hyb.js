// ---- Cache animation: one sequence growing through a transformer (Qwen3-30B-A3B) and a hybrid (Nemotron 3 Nano) ----
(function(){
  const card=$('hy');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR=3000,MOVE=0.7;
  // from config.json: Qwen3-30B-A3B 48 layers x 4 KV heads x 128; Nemotron 3 Nano pattern below, 2 KV heads x 128,
  // Mamba-2 64 heads x 64 x 128 state in float32 plus a (4096 + 2*8*128) x 3 convolution buffer in BF16
  const PAT='MEMEM*EMEMEM*EMEMEM*EMEMEM*EMEMEM*EMEMEMEM*EMEMEMEME';
  const KVQ=2*4*128*2, KVN=2*2*128*2, MS=64*64*128*4+(4096+2*8*128)*3*2; // bytes per layer per token; Mamba state per layer
  const M={tr:{n:'Qwen3-30B-A3B',L:48,w:30.53e9*2,lay:i=>'A',kv:KVQ},hy:{n:'Nemotron 3 Nano',L:52,w:31.58e9*2,lay:i=>PAT[i],kv:KVN}};
  const NS=[1,512,4096,32768,131072,262144,1048576];
  const per=(m,n)=>m==='tr'?48*KVQ*n:(n>0?23*MS:0)+6*KVN*n;
  const free=(m,g)=>g*80e9-M[m].w;
  const fits=(m,n,g)=>{const f=free(m,g),p=per(m,n);return p>0?Math.max(0,Math.floor(f/p)):0};
  const st={m:'tr',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:'',g:1};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v);
  const nAt=(k,u)=>{const a=k?NS[k-1]:0,b=NS[k];if(u>=1)return b;if(a<1)return u>.02?Math.max(1,Math.round(b*u)):0;return Math.round(Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*u))};
  const B=fmtBytes,X=v=>(v>=10?Math.round(v):v.toFixed(1))+'×';
  function cap(m,k){const n=NS[k],a=per('tr',n),h=per('hy',n),g=st.g,gl=g===1?'one H100':'eight H100s';
    const ft=fits('tr',n,g),fh=fits('hy',n,g),fr=(m==='tr'?free('tr',g):free('hy',g))/1e9;
    if(m==='tr'){
      if(k===0)return ['Token 1','Qwen3-30B-A3B has 48 layers, each an attention block followed by a mixture-of-experts block. Every attention layer stores a key and a value for every token it has seen: 4 key-value heads × 128 numbers × 2 (key and value) × 2 bytes = 2 KiB per layer, '+B(a)+' per token across the 48 layers. Nothing is held before the first token arrives.'];
      if(k===1)return ['512 tokens',B(a)+'. The cache grows by the same 96 KiB with every token, in every layer at once, and all of it is read again for each token decoded.'];
      if(k===2)return ['4,096 tokens',B(a)+' for one sequence.'];
      if(k===3)return ['32,768 tokens, the native context',B(a)+' per sequence. With BF16 weights (61 GB) '+gl+' leave about '+Math.round(fr)+' GB for caches: room for '+ft+' sequences this long.'];
      if(k===4)return ['131,072 tokens, the longest Qwen validates (with YaRN)',B(a)+' per sequence; '+ft+' fit on '+gl+'.'];
      if(k===5)return ['262,144 tokens','Beyond what this model is validated for, so from here this is arithmetic only: '+B(a)+' per sequence, '+(ft?ft+' on '+gl:'more than the free memory of '+gl)+'.'];
      return ['1,048,576 tokens',B(a)+' for one sequence, more than an entire 80 GB H100. Switch to the hybrid to watch the same context.']}
    if(k===0)return ['Token 1','Nemotron 3 Nano has 52 layers: 23 Mamba-2 (green), 23 mixture-of-experts (grey, which cache nothing) and only 6 attention layers (blue). With 2 key-value heads an attention layer costs 2 × 2 × 128 × 2 bytes = 1 KiB per token, 6 KiB across the six. Each Mamba-2 layer instead holds a fixed state of 64 heads × 64 × 128 numbers in float32, 2 MiB, plus a 36 KiB convolution buffer, set up at the first token: '+B(23*MS)+' per sequence.'];
    if(k===1)return ['512 tokens','The hybrid holds '+B(h)+' against the transformer\'s '+B(a)+': for a short prompt the fixed state is the larger cost. The two are level at about '+fmt(Math.round(23*MS/(48*KVQ-6*KVN)))+' tokens (the 47 MiB state divided by the 90 KiB per-token difference).'];
    if(k===2)return ['4,096 tokens',B(h)+' against '+B(a)+'. The Mamba columns have not moved; only the six attention layers grow.'];
    if(k===3)return ['32,768 tokens',B(h)+', '+X(a/h)+' less than the transformer. With 63 GB of BF16 weights '+gl+' leave about '+Math.round(fr)+' GB: room for '+fmt(fh)+' sequences this long, against '+ft+' for the transformer.'];
    if(k===4)return ['131,072 tokens',B(h)+', '+X(a/h)+' less; '+fmt(fh)+' sequences fit on '+gl+'.'];
    if(k===5)return ['262,144 tokens, the default in the Hugging Face config',B(h)+' per sequence, '+fmt(fh)+' on '+gl+'.'];
    return ['1,048,576 tokens, the supported maximum',B(h)+' against '+B(a)+'. The ratio approaches 96 ÷ 6 = 16, the per-token ratio, because the fixed state stops mattering at long context: what decides it is how few layers keep a cache at all.']}
  function draw(){
    const narrow=card.clientWidth<560,W=narrow?360:720,m=st.m,k=st.k,u=RM?1:ease(cl(st.t/MOVE)),n=nAt(k,u),mod=M[m];
    const pl=narrow?40:52,pr=8,top=26,ch=narrow?150:190,base=top+ch,H=base+(narrow?150:128);
    const pit=(W-pl-pr)/52,cw=Math.max(2,pit-(narrow?1:2));
    const mx=Math.max(KVQ*n,MS,1)*1.12; // tallest possible column at this n: a Qwen layer (2 KiB x n) or a Mamba state
    const yv=v=>base-ch*Math.min(1,v/mx);
    let s='';
    // axis
    const tk=[0,.25,.5,.75,1].map(f=>f*mx/1.12);
    tk.forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yv(v)+'" y2="'+yv(v)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(yv(v)+3.5)+'" font-size="9.5" text-anchor="end" fill="var(--mute)">'+(v?B(v):'0')+'</text>'});
    s+='<text x="'+pl+'" y="14" font-size="11" fill="var(--mute)">'+(narrow?'Held per layer, same scale for both':'Bytes each layer holds for this one sequence, same scale for both models')+'</text>';
    for(let i=0;i<mod.L;i++){const t=mod.lay(i),x=pl+i*pit;let v=0,c='var(--dim)';
      if(t==='A'){v=KVQ*n;c='var(--c1)'}else if(t==='*'){v=KVN*n;c='var(--c1)'}else if(t==='M'){v=n>0?MS:0;c='var(--good)'}
      const y=yv(v);if(v>0)s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+cw.toFixed(1)+'" height="'+Math.max(.8,base-y).toFixed(1)+'" fill="'+c+'" rx="1"/>';
      s+='<rect x="'+x.toFixed(1)+'" y="'+(base+4)+'" width="'+cw.toFixed(1)+'" height="8" fill="'+c+'" opacity="'+(t==='E'?.6:1)+'"/>'}
    s+='<text x="'+pl+'" y="'+(base+24)+'" font-size="10.5" fill="var(--mute)">'+mod.n+': '+mod.L+' layers'+(m==='tr'?', each attention + MoE':', 23 Mamba-2, 23 MoE, 6 attention')+'</text>';
    // totals, both models to one scale
    const a=per('tr',n),h=per('hy',n),tm=Math.max(a,h,1),bw=W-pl-pr-(narrow?0:150),by=base+(narrow?44:42);
    [['tr',a],['hy',h]].forEach(([mm,v],j)=>{const y=by+j*(narrow?46:36),wv=bw*v/tm;
      s+='<text x="'+pl+'" y="'+(y-3)+'" font-size="11"'+(mm===m?' font-weight="600"':' fill="var(--mute)"')+'>'+M[mm].n+': '+B(v)+(narrow?'':'')+'</text>';
      s+='<rect x="'+pl+'" y="'+(y+1)+'" width="'+bw+'" height="13" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
      if(v>0)s+='<rect x="'+pl+'" y="'+(y+1)+'" width="'+Math.max(1,wv).toFixed(1)+'" height="13" rx="3" fill="'+(mm==='tr'?'var(--c2)':'var(--good)')+'" opacity="'+(mm===m?1:.55)+'"/>'});
    if(!narrow)s+='<text x="'+(W-pr)+'" y="'+(by+10)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">whole cache, one sequence</text>';
    $('hySvg').innerHTML=svgEl(W,H,s,'Cache held per layer at '+fmt(n)+' tokens');
    if(st.lk!==k||st.lm!==m+st.g){const c=cap(m,k);$('hyStep').textContent='Step '+(k+1)+' of '+NS.length+': '+c[0]+(m==='tr'?', transformer':', hybrid');$('hyCap').innerHTML=c[1];st.lk=k;st.lm=m+st.g}
    const g=st.g,gl=g===1?'1 H100':'8 H100s';
    $('hyCnt').innerHTML=stat('Context',fmt(n)+' tokens',k===NS.length-1&&u>=1?'end':'step '+(k+1)+' of '+NS.length)+
      stat('Cache, '+mod.n,B(per(m,n)),m==='tr'?'96 KiB per token':'47 MiB fixed + 6 KiB per token')+
      stat('Transformer ÷ hybrid',n?X(a/h):'·',n<533?'hybrid larger below ~533 tokens':'same context')+
      stat('Sequences that fit, '+gl,n?fmt(fits(m,n,g)):'·','free after BF16 weights: '+Math.round(free(m,g)/1e9)+' GB; other model '+(n?fmt(fits(m==='tr'?'hy':'tr',n,g)):'·'));
    const sc=$('hyScrub');sc.max=NS.length*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('hyPlay'),end=k===NS.length-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<NS.length-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('hyPlay').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===NS.length-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<NS.length-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('hyFwd').addEventListener('click',()=>{pause();if(st.t<1)st.t=1;else st.k=Math.min(NS.length-1,st.k+1);st.t=1;draw()});
  $('hyBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('hyScrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(NS.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('hySpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('hyG').addEventListener('change',e=>{st.g=+e.target.value;st.lk=-1;draw()});
  const seg=$('hyM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
