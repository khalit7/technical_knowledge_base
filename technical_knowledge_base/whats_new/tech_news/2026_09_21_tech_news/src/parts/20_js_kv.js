// ---- DeepSeek V4-Flash to V4.1-Flash: KV bytes per token, step by step, then one session at a context length ----
(function(){
  const box=$('kvPlot');if(!box)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // each step: list of [label, count of layers, bytes per entry, compression m]
  const S=[
    {t:'V4-Flash: every layer keeps its own cache',segs:[['CSA layer, main + indexer',21,584+68,4],['HCA layer, main only',20,584,128]],
     c:'21 CSA layers each store one 584-byte entry (448 FP8 channels + 64 BF16 RoPE channels + scales) plus a 68-byte indexer key for every 4 tokens; 20 HCA layers store one entry for every 128 tokens. Total 21 x 652 / 4 + 20 x 584 / 128 = 3,514 bytes per token, 97% of it in the CSA layers.'},
    {t:'+ Cross-layer reuse: 4 layers store, the rest read theirs',segs:[['source layer (V4 format, m = 4)',4,584+68,4]],
     c:'V4.1 drops HCA and lets later layers reuse the cache and the top-k index of four source layers (2, 8, 14 and 20). Still in the V4 format at m = 4: 4 x 652 / 4 = 652 bytes per token, 5.4 times smaller.'},
    {t:'Relax the sequence compression (the cache grows)',segs:[['encoder source, m = 2',3,584+68,2],['decoder source, m = 1',1,584+68,1]],
     c:'Merging 4 tokens into one entry loses detail, so the three encoder sources now merge only 2 and the decoder source keeps every token: 3 x 652 / 2 + 652 = 1,630 bytes per token. The cache is 2.5 times bigger than the step before, spent on quality.'},
    {t:'+ FP4 main entries: 584 to 288 bytes',segs:[['encoder source, m = 2',3,288+68,2],['decoder source, m = 1',1,288+68,1]],
     c:'The main entry is stored as 512 FP4 channels (256 bytes) with one E4M3 scale per 16 channels (32 bytes): 288 bytes instead of 584. Total 3 x 356 / 2 + 356 = 534 + 356 = 890 bytes per token: 3.95 times smaller than V4-Flash, and the encoder-decoder split is what lets V4.1 relax the compression and still end lower.'}];
  const tot=s=>s.segs.reduce((a,[_,n,b,m])=>a+n*b/m,0);
  const st={k:0,play:!RM,t:0,raf:0,last:0,vis:false};
  const LS=[[8192,'8K'],[32768,'32K'],[131072,'128K'],[1048576,'1M'],[4194304,'4M']];
  const FAM=[['DeepSeek-V1 67B (2023)','V1 67B',389120],['DeepSeek-V3 MLA, BF16 (derived)','V3 (derived)',70272],['DeepSeek-V3.2 (2025)','V3.2',48068],['DeepSeek-V4-Flash (Apr 2026)','V4-Flash',3514.25],['DeepSeek-V4.1-Flash (Sep 2026)','V4.1-Flash',890]];
  function draw(){
    const W=Math.max(300,box.clientWidth||340),narrow=W<560,pl=8,pr=8,mx=3514.25,sc=(W-pl-pr)/mx;
    let s='',y=8;
    S.forEach((q,i)=>{const on=i<=st.k,cur=i===st.k,T=tot(q);
      s+='<text x="'+pl+'" y="'+(y+11)+'" font-size="12" fill="'+(cur?'var(--ink)':'var(--mute)')+'"'+(cur?' font-weight="600"':'')+'>'+(i+1)+'. '+(narrow&&q.t.length>34?q.t.slice(0,34)+'...':q.t)+'</text>';y+=16;
      let x=pl;q.segs.forEach(([l,n,b,m],j)=>{for(let k=0;k<n;k++){const w=b/m*sc;s+='<rect x="'+x.toFixed(2)+'" y="'+y+'" width="'+Math.max(.6,w-(w>3?1:0)).toFixed(2)+'" height="16" fill="'+(j?'var(--c4)':'var(--c3)')+'" opacity="'+(on?(cur?1:.5):.12)+'"><title>'+l+': '+(b/m).toFixed(1)+' B/token</title></rect>';x+=w}});
      s+='<text x="'+(W-pr)+'" y="'+(y-5)+'" font-size="12" text-anchor="end" font-weight="600" fill="'+(on?'var(--ink)':'var(--mute)')+'">'+fmt(Math.round(T))+' B</text>';y+=26});
    box.innerHTML=svgEl(W,y,s,'KV bytes per token by step');
    $('kvStep').textContent='Step '+(st.k+1)+' of 4: '+S[st.k].t;$('kvCap').textContent=S[st.k].c;$('kvScrub').value=st.k;
    const pb=$('kvPlay');pb.innerHTML=st.play?'❚❚ Pause':st.k>=3?'↻ Replay':'▶ Play';
    fam();
  }
  function fam(){
    const fb=$('kvFam'),W=Math.max(300,fb.clientWidth||340),narrow=W<560,L=LS[+$('kvL').value];$('kvLv').textContent=L[1]+' tokens';
    const lw=narrow?82:220,pr=70,a=Math.log10(500),b=Math.log10(400000),X=v=>lw+(W-lw-pr)*(Math.log10(v)-a)/(b-a);
    let s='<text x="8" y="12" font-size="12" font-weight="600">'+(narrow?'One '+L[1]+'-token session (bytes/token, log)':'Bytes per token (log scale) and one '+L[1]+'-token session')+'</text>',y=24;
    FAM.forEach(([n0,n1,v],i)=>{const n=narrow?n1:n0;s+='<text x="'+(lw-6)+'" y="'+(y+11)+'" font-size="11" text-anchor="end">'+n+'</text><rect x="'+lw+'" y="'+(y+2)+'" width="'+(X(v)-lw)+'" height="12" rx="2" fill="'+(i===4?'var(--c3)':'var(--dim)')+'"/>';
      const gb=v*L[0]/1e9;s+='<text x="'+(X(v)+5)+'" y="'+(y+12)+'" font-size="11">'+(gb>=100?fmt(gb,0):gb>=10?gb.toFixed(1):gb.toFixed(2))+' GB</text>';y+=20});
    fb.innerHTML=svgEl(W,y+6,s,'KV cache per session')+'<p class="small mute">V1 needs '+(389120/890).toFixed(0)+'x the cache of V4.1-Flash (the card\'s 437x); V3 needs '+(70272/890).toFixed(0)+'x. GB = bytes per token x tokens / 10⁹, one sequence, one copy.</p>';
  }
  const live=()=>st.vis&&!document.hidden&&box.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;if(!st.last)st.last=now;if(now-st.last>2600){st.last=now;if(st.k<3){st.k++;draw()}if(st.k>=3){st.play=false;draw();return}}
    $('v-kv').dataset.frames=(+$('v-kv').dataset.frames||0)+1;st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('kvPlay').addEventListener('click',()=>{if(st.play)pause();else{if(st.k>=3)st.k=0;st.play=true;kick()}draw()});
  $('kvFwd').addEventListener('click',()=>{pause();st.k=Math.min(3,st.k+1);draw()});
  $('kvBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);draw()});
  $('kvScrub').addEventListener('input',e=>{pause();st.k=+e.target.value;draw()});
  $('kvL').addEventListener('input',fam);
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe($('v-kv'))}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,()=>{draw();kick()});
})();
