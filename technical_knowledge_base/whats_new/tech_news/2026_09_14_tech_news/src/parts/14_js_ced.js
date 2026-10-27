// ---- One agent turn through DeepSeek V4-Flash (decoder-only) and V4.1-Flash (causal encoder-decoder) ----
(function(){
  const card=$('v-ced');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NWIN=128,PC=32,DC=4,DURT=1500; // sliding window (config), prompt drawn as 32 columns, 4 generated tokens shown
  // Cache bytes per prompt token written by each layer (config.json + entry sizes, see src/recompute.py)
  // V4-Flash: layers 0-1 SWA; even layers 2..42 CSA (ratio 4, 584 B main + 68 B indexer); odd layers 3..41 HCA (ratio 128, 584 B)
  const v4row=r=>r<2?0:(r%2===0?(584+68)/4:584/128);
  // V4.1-Flash: Full layers 2, 8, 14 (encoder, ratio 2, 288 B FP4 main + 68 B indexer) and 20 (decoder, ratio 1)
  const v41row=r=>[2,8,14].includes(r)?(288+68)/2:r===20?(288+68):0;
  const M={
    v4:{name:'V4-Flash',L:43,act:13e9,steps:[
      {t:'A tool result arrives',c:'The agent called a tool and the result has to be read before the next reply: N new tokens with no cached prefix for them. Nothing has been computed yet.',ph:'start'},
      {t:'Layers 0 and 1: sliding window only',c:'All prompt tokens go through each layer together (prefill is parallel across tokens), one layer after another. The first two layers attend only to the last 128 positions and keep no global cache.',ph:'swa'},
      {t:'Layers 2 to 42: every layer keeps its own cache',c:'Each of the 41 remaining layers computes attention over the whole context and stores its own compressed cache: 21 CSA layers (one entry per 4 tokens, plus indexer keys) and 20 HCA layers (one entry per 128 tokens). Nothing is shared between layers.',ph:'enc'},
      {t:'Prefill done: every token ran all 43 layers',c:'The prompt cost N x 43 layer passes, and 3,514 bytes of global cache per token now sit in HBM for as long as the session lives.',ph:'done'},
      {t:'Persisted for reuse',c:'For the next turn, the global cache and the sliding-window cache are both written to the SSD cache; the report says the sliding-window part is nearly half of that store.',ph:'persist'},
      {t:'Decode: each new token runs all 43 layers',c:'Every generated token passes through all 43 layers with 13B active parameters and reads 41 separate caches. Now switch to V4.1-Flash and run the same turn.',ph:'dec'}]},
    v41:{name:'V4.1-Flash',L:40,act:8e9,steps:[
      {t:'The same tool result arrives',c:'Same turn, same N tokens, cache miss. V4.1-Flash is the bigger model (552B against 284B total parameters), but it is cut into a 20-layer causal encoder (layers 0 to 19) and a 20-layer decoder (20 to 39).',ph:'start'},
      {t:'Encoder layers 0 and 1: sliding window, plus Engram',c:'As before, the first two layers attend only locally; layer 1 also injects Engram, a hashed n-gram memory.',ph:'swa'},
      {t:'Encoder layers 2 to 19: three write a cache, fifteen reuse it',c:'Layers 2, 8 and 14 each compute and store one cache copy (two adjacent tokens merged into one FP4 entry); the five layers after each one reuse it with their own queries instead of storing their own. Only 8B parameters are active per prompt token.',ph:'enc'},
      {t:'The decoder\'s cache is projected from the encoder\'s output',c:'The decoder never runs on most of the prompt. Its single global cache (layer 20, one entry per token) is a projection of the encoder\'s final hidden state, so it is written without running layers 20 to 39 on those tokens: the dashed row. The decoder\'s other layers reuse or re-index it.',ph:'proj'},
      {t:'Bounded replay: only the last 128 tokens run through the decoder',c:'Decoder layers still keep a sliding-window cache, which needs real decoder activations, so only the last 128 prompt tokens are replayed through layers 20 to 39 (the thin sliver, drawn to scale). The report finds the effective receptive field of the window is small enough that this costs only negligible quality.',ph:'replay'},
      {t:'Prefill done: about half the layer passes',c:'The prompt cost N x 20 + 128 x 20 layer passes, the report\'s O(NL/2 + n_win L/2), and 890 bytes of global cache per token sit in HBM, about a quarter of V4-Flash.',ph:'done'},
      {t:'Persisted: the global cache only',c:'The sliding-window cache is no longer written to SSD; it lives for minutes in a pool of host memory, and a miss is repaired by replaying 128 tokens. The persistent store shrinks to about 1/8 of V4-Flash\'s.',ph:'persist'},
      {t:'Decode: each new token runs all 40 layers',c:'Generation is unchanged in shape: every new token runs all 40 layers, with 16B active parameters (more than V4-Flash\'s 13B), reading 4 cache copies instead of 41. The saving is in the prompt and the cache, which is where long agent loops spend.',ph:'dec'}]}};
  const st={m:'v4',k:0,t:RM?1:0,play:false,spd:1,vis:false,raf:0,last:0,N:32768};
  const cl=x=>Math.max(0,Math.min(1,x));
  const order=['start','swa','enc','proj','replay','done','persist','dec'];
  const after=(ph,cur)=>order.indexOf(cur)>order.indexOf(ph);
  function state(){ // what is computed at (k, t)
    const mode=M[st.m],S=mode.steps,ph=S[st.k].ph,t=st.t,L=mode.L;
    const rows=new Array(L).fill(0); // 0 none, 1 computed (fraction for animation)
    let proj=0,replay=0,persist=0,dec=0;
    const prog=(p,a,b)=>{if(ph===p)return t;return after(p,ph)?1:0};
    const fS=prog('swa'),fE=prog('enc');
    for(let r=0;r<L;r++){
      if(r<2)rows[r]=cl(fS*2-r);
      else if(st.m==='v4')rows[r]=cl(fE*41-(r-2));
      else if(r<20)rows[r]=cl(fE*18-(r-2))}
    if(st.m==='v41'){proj=prog('proj');replay=prog('replay')}
    persist=prog('persist');dec=prog('dec');
    if(ph==='done'||after('done',ph)){for(let r=0;r<(st.m==='v4'?L:20);r++)rows[r]=1;if(st.m==='v41'){proj=1;replay=1}}
    return {rows,proj,replay,persist,dec,ph,L}}
  const kind=(r)=>st.m==='v4'?(r<2?'swa':'cache'):(r<2?'swa':[2,8,14].includes(r)?'cache':'reuse');
  const KC={swa:'var(--dim)',cache:'var(--c2)',reuse:'var(--acc)'};
  const dB=b=>b>=1e9?(b/1e9).toFixed(b>=1e10?1:2)+' GB':b>=1e6?(b/1e6).toFixed(b>=1e8?0:1)+' MB':b>=1e3?(b/1e3).toFixed(1)+' kB':fmt(b)+' B';
  const dF=f=>f>=1e15?(f/1e15).toFixed(2)+' PFLOP':(f/1e12).toFixed(f>=1e14?0:1)+' TFLOP';
  function counters(S){
    const N=st.N,rep=Math.min(N,NWIN),m=st.m,L=S.L;
    let passes=0,hbm=0;
    for(let r=0;r<L;r++){passes+=S.rows[r]*N;hbm+=S.rows[r]*N*(m==='v4'?v4row(r):v41row(r))}
    if(m==='v41'){hbm+=S.proj*N*v41row(20);passes+=S.replay*rep*20}
    const perLayer=m==='v4'?13e9/43:8e9/20;
    let flops=2*perLayer*passes; // parameter FLOPs only
    const fullP=m==='v4'?N*43:N*20+rep*20,fullKV=N*(m==='v4'?3514.25:890);
    return {passes,hbm,flops,fullP,fullKV}}
  function draw(){
    const mode=M[st.m],S=mode.steps,s0=state(),c=counters(s0);
    $('cedNv').textContent=fmt(st.N);
    const box=$('cedSvg'),narrow=(box.clientWidth||340)<560;
    const W=narrow?Math.max(300,Math.round(box.clientWidth||340)):760,lw=narrow?50:64,gap=narrow?8:14,dw=narrow?11:16;
    const pw=W-lw-gap-DC*(dw+2)-6,rh=narrow?3.4:4,egap=st.m==='v41'?6:0,top=18;
    const L=s0.L,yr=r=>top+(L-1-r)*rh+(st.m==='v41'&&r<20?egap:0); // layer 0 at the bottom
    const gridH=L*rh+egap;
    let s='';
    s+='<text x="'+lw+'" y="12" font-size="11" fill="var(--mute)">prompt: '+fmt(st.N)+' tokens'+(narrow?'':', all processed together')+'</text>';
    s+='<text x="'+(W-4)+'" y="12" font-size="11" text-anchor="end" fill="var(--mute)">reply</text>';
    // layer labels
    const labs=st.m==='v4'?[[0,'0'],[21,'21'],[42,'42']]:[[0,'0'],[10,'enc'],[30,'dec'],[39,'39']];
    labs.forEach(([r,l])=>{s+='<text x="'+(lw-6)+'" y="'+(yr(r)+rh+3)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="10" y="'+(top+gridH/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 10 '+(top+gridH/2)+')">layer</text>';
    // empty frame
    s+='<rect x="'+lw+'" y="'+top+'" width="'+pw+'" height="'+gridH+'" fill="var(--soft)" stroke="var(--line)"/>';
    // rows across the prompt
    for(let r=0;r<L;r++){const f=s0.rows[r];if(f<=0)continue;s+='<rect x="'+lw+'" y="'+yr(r)+'" width="'+(pw*f).toFixed(1)+'" height="'+(rh-0.6)+'" fill="'+KC[kind(r)]+'"/>'}
    if(st.m==='v41'){
      // decoder region label
      s+='<text x="'+(lw+pw/2)+'" y="'+(yr(30)+rh)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(narrow?'decoder: not run on the prompt':'decoder layers 20 to 39: not run on these tokens')+'</text>';
      if(s0.proj>0){const y=yr(20);s+='<rect x="'+lw+'" y="'+(y-0.3)+'" width="'+(pw*s0.proj).toFixed(1)+'" height="'+rh+'" fill="var(--soft)" stroke="var(--c2)" stroke-width="1.4" stroke-dasharray="3 2"/>';}
      if(s0.replay>0){const rw=Math.max(1.6,pw*Math.min(1,NWIN/st.N)),x=lw+pw-rw;for(let r=20;r<40;r++){const f=cl(s0.replay*20-(r-20));if(f>0)s+='<rect x="'+x+'" y="'+yr(r)+'" width="'+rw+'" height="'+(rh-0.6)+'" fill="var(--acc)" opacity="'+f+'"/>'}
        s+='<text x="'+(x-4)+'" y="'+(yr(36)+rh)+'" font-size="11" text-anchor="end" fill="var(--ink)">last 128 tokens replayed</text>'}
      s+='<line x1="'+lw+'" x2="'+(lw+pw)+'" y1="'+(yr(19)-egap/2)+'" y2="'+(yr(19)-egap/2)+'" stroke="var(--bg)" stroke-width="'+egap+'"/>';
    }
    // reply columns
    const dx0=lw+pw+gap;
    for(let j=0;j<DC;j++){const x=dx0+j*(dw+2),f=cl(s0.dec*DC-j);s+='<rect x="'+x+'" y="'+top+'" width="'+dw+'" height="'+gridH+'" fill="var(--soft)" stroke="var(--line)"/>';if(f>0)s+='<rect x="'+x+'" y="'+(top+gridH*(1-f))+'" width="'+dw+'" height="'+(gridH*f)+'" fill="var(--c1)"/>'}
    let y=top+gridH+22;
    // cache bars, both models on the scale of V4-Flash at this prompt length
    const ref=st.N*3514.25,bw=W-lw-90;
    const bar=(lab,v,refv,note)=>{const bw=W-lw-(narrow?78:90);let o='<text x="'+(lw-6)+'" y="'+(y+10)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+lab+'</text>';
      o+='<rect x="'+lw+'" y="'+y+'" width="'+bw+'" height="13" fill="none" stroke="var(--dim)" stroke-dasharray="3 2"/>';
      o+='<rect x="'+lw+'" y="'+y+'" width="'+(bw*Math.min(1,v/refv)).toFixed(1)+'" height="13" fill="var(--c2)"/>';
      o+='<text x="'+(lw+bw+6)+'" y="'+(y+10)+'" font-size="11">'+note+'</text>';y+=22;return o};
    s+='<text x="'+lw+'" y="'+(y-6)+'" font-size="11" fill="var(--mute)">'+(narrow?'dashed: V4-Flash, full prompt':'dashed outline: V4-Flash after the full prompt, the scale for both models')+'</text>';
    s+=bar('HBM',c.hbm,ref,dB(c.hbm));
    const pv=st.m==='v4'?1:1/8;s+=bar('SSD',s0.persist*pv,1,s0.persist?(st.m==='v4'?'1 (reference)':'about 1/8'):'not yet');
    const H=y+2;
    box.innerHTML=svgEl(W,H,s,'One agent turn through '+mode.name);
    if(st.lk!==st.k||st.lm!==st.m){$('cedStep').textContent=mode.name+', step '+(st.k+1)+' of '+S.length+': '+S[st.k].t;$('cedCap').innerHTML=S[st.k].c;st.lk=st.k;st.lm=st.m}
    $('cedCnt').innerHTML=stat('Layer passes for the prompt',sci(c.passes,2).replace(/^0$/,'0'),'of '+sci(c.fullP,2)+' when done ('+(st.m==='v4'?'N x 43':'N x 20 + 128 x 20')+')')+
      stat('Parameter compute for the prompt',c.flops?dF(c.flops):'0','2 x active parameters per token, derived')+
      stat('Global cache in HBM',dB(c.hbm),fmt(st.m==='v4'?3514:890)+' bytes per prompt token')+
      stat('Caches kept per token',st.m==='v4'?'41 layers':'4 copies','layers 2 to 42 / layers 2, 8, 14, 20')+
      stat('Per generated token',st.m==='v4'?'43 layers, 13B':'40 layers, 16B','layers run and active parameters');
    const sc=$('cedScrub');sc.max=S.length*100;sc.value=Math.round((st.k+st.t)*100);
    const end=st.k===S.length-1&&st.t>=1;const pb=$('cedPlay');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    const S=M[st.m].steps;st.t+=dt*st.spd/DURT;if(st.t>=1){if(st.k<S.length-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('cedPlay').addEventListener('click',()=>{const S=M[st.m].steps;if(st.play){pause()}else{if(st.k===S.length-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<S.length-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('cedFwd').addEventListener('click',()=>{pause();const S=M[st.m].steps;if(st.t>=1&&st.k<S.length-1)st.k++;st.t=1;draw()});
  $('cedBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('cedScrub').addEventListener('input',e=>{pause();const v=+e.target.value,S=M[st.m].steps;st.k=Math.min(S.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=S.length*100)st.t=1;draw()});
  $('cedSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('cedN').addEventListener('change',e=>{st.N=+e.target.value;draw()});
  const seg=$('cedM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw();drawFall()}});
  // ---- where the factor of four comes from (bytes of global cache per token) ----
  const FALL=[
    ['V4-Flash','41 layers each keep a cache: 21 CSA x (584 + 68) / 4 + 20 HCA x 584 / 128',21*(584+68)/4+20*584/128],
    ['+ cross-layer reuse','only 4 layers keep one, still the V4 entry format and 1 entry per 4 tokens: 4 x 652 / 4',4*652/4],
    ['+ finer sequence compression','encoder copies 1 entry per 2 tokens, decoder copy 1 per token: 3 x 652 / 2 + 652',3*652/2+652],
    ['+ FP4 main cache (V4.1-Flash)','main entry 584 to 288 bytes: 3 x (288 + 68) / 2 + (288 + 68)',3*(288+68)/2+(288+68)]];
  function drawFall(){const el=$('cedFall'),max=FALL[0][2];
    el.innerHTML='<div class="bars ced-bars">'+FALL.map((f,i)=>'<div class="row'+(i===0||i===3?' hl':'')+'"><div class="nm" title="'+f[1]+'">'+f[0]+'</div><div class="track"><div class="fill" style="width:'+(100*f[2]/max).toFixed(1)+'%;background:'+(i===3?'var(--c2)':i===0?'var(--dim)':'var(--acc)')+'"></div></div><div class="val">'+fmt(Math.round(f[2]))+' B</div></div><div class="small mute" style="margin:-2px 0 6px">'+f[1]+'</div>').join('')+'</div>'+
      '<p class="small" style="margin:4px 0 0">3,514 / 890 = '+(max/FALL[3][2]).toFixed(2)+'x smaller. Relaxing the compression goes the other way (652 to 1,630 bytes): DeepSeek spent part of the saving from sharing caches on keeping more of the sequence. Against DeepSeek LLM 67B, the first generation (95 layers x 8 key-value heads x 128 dimensions x 2 for keys and values x 2 bytes = 389,120 bytes per token), 890 bytes is '+(389120/890).toFixed(0)+'x smaller: the report\'s 437x.</p>'}
  onTab(card.closest('.tab').id,()=>{draw();drawFall();kick()});
  draw();drawFall();
})();
