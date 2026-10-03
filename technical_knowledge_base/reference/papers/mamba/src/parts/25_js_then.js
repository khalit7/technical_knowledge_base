// ---- Then and now: layer stacks from the configs, KV cache against state ----
(function(){
  const HY=PAPER.rc.hybrids,COLS={A:'var(--c2)',m:'var(--c1)',M:'var(--c3)',F:'var(--dim)',E:'var(--c5)',P:'var(--c2)'};
  const SRC=r=>A('https://huggingface.co/'+r.src+'/blob/main/config.json',r.src);
  const CAP=[
    'The baseline Mamba is measured against, released by the authors with Mamba-2: every layer is attention plus MLP, so the cache grows by 320 KiB with every token and there is no fixed state.',
    'The paper\'s model: 64 identical Mamba blocks, no attention and no MLP. Nothing grows with the sequence; the 11.9 MiB state is all there is.',
    'Mamba-2 («Dao and Gu, May 2024|https://arxiv.org/abs/2405.21060»): <b>A</b> becomes a scalar per head so the scan turns into matrix multiplications (state space duality, 2 to 8 times faster), and the state size <i>N</i> grows eightfold, to 128, which costs memory per sequence.',
    'The authors\' own hybrid from the same release: 6 of 64 layers are attention. The cache is 28% of a Transformer\'s per token; the state stays.',
    'Jamba («AI21, March 2024|https://arxiv.org/abs/2403.19887»): Mamba-1 layers with one attention layer in eight, and a 16-expert MoE (top 2) in every other layer; 52B parameters, 12B active, contexts up to 256K. Its cache per token is a twentieth of the 2.7B Transformer\'s at about 20 times the size.',
    'Nemotron-H 8B («NVIDIA, April 2025|https://arxiv.org/abs/2504.03624»): 24 Mamba-2 layers, 24 MLPs and only 4 attention layers spread evenly, close to the hybrid NVIDIA\'s 8B study chose (24 Mamba-2, 4 attention, 28 MLP; «Waleffe et al., 2024|https://arxiv.org/abs/2406.07887»); reported up to 3 times faster at inference than similar Transformers at similar accuracy.',
    'Granite 4.0-H-Small (IBM, 2025, Apache 2.0): 36 Mamba-2 to 4 attention layers (9 to 1), every mixer followed by a 72-expert MoE (top 10), and no positional encoding at all in its attention layers.',
    'Falcon-H1 7B («TII, July 2025|https://arxiv.org/abs/2507.22448»): a parallel hybrid, attention and Mamba-2 heads side by side in every layer. It keeps a cache in all 44 layers (with only 2 KV heads) and a state in all 44.',
    'Nemotron 3 Nano (NVIDIA, December 2025, as dated in the «LLM Architecture Gallery|https://app.notion.com/p/3c65c17b0d0d81be8a07f2562fa2030a»): 23 Mamba-2 layers, 23 MoE layers (128 experts, 6 active) and 6 attention layers with 2 KV heads: 6 KiB of cache per token, 2% of the 2.7B Transformer\'s.'];
  const steps=HY.map((h,i)=>({t:h.name,c:CAP[i].replace(/«([^|»]+)\|([^»]+)»/g,(m,t,u)=>A(u,t))+' Source: '+SRC(h)+'.'}));
  const ctx128=131072;
  makeAnim({id:'thn',mode:'x',modes:{x:steps},dur:2600,
    draw(m,k,e,W){const h=HY[k],p=h.pattern,prev=k?HY[k-1].pattern:'',per=W<500?26:44,cs=Math.min(16,(W-8)/per),rows=Math.ceil(p.length/per);let s='';
      for(let i=0;i<p.length;i++){const r=Math.floor(i/per),c=i%per,x=4+c*cs,y=6+r*(cs+6),ch=p[i],was=prev[i]===ch;const op=was?1:e;
        if(ch==='P')s+=G(op,rc(x+.5,y,cs-1,cs/2,COLS.A,{r:1})+rc(x+.5,y+cs/2,cs-1,cs/2,COLS.M,{r:1}));else s+=G(op,rc(x+.5,y,cs-1,cs,COLS[ch],{r:2}))}
      const y0=6+rows*(cs+6)+8;const lg=legend([['attention','var(--c2)'],['Mamba (paper)','var(--c1)'],['Mamba-2','var(--c3)'],['MLP','var(--dim)'],['MoE','var(--c5)']],4,y0+12,W-8);
      return svgW(W,y0+lg.h+12,s+lg.s+tx(4,y0+lg.h+8,'half-and-half squares: attention and Mamba-2 in the same layer',{fs:11,c:'var(--mute)'}),'layer stack')},
    counters(m,k){const h=HY[k];return stat('layers drawn',h.pattern.length,h.note.length<40?h.note:'')+stat('attention layers',h.attn)+stat('KV cache per token',h.kv_per_token?fmtBytes(h.kv_per_token):'none')+stat('state per sequence',h.state_bytes?fmtBytes(h.state_bytes):'none','fixed')+stat('both, at 128K tokens',fmtBytes(h.kv_per_token*ctx128+h.state_bytes))}});
  onTab('t-then',()=>fit($('ctxSvg'),draw));$('ctxL').addEventListener('input',()=>refit($('ctxSvg')));
  function draw(W){const C=2**+$('ctxL').value;$('ctxLv').textContent=fmt(C)+' tokens';const vals=HY.map(h=>h.kv_per_token*C+h.state_bytes),lo=1e6,hi=1e11,lg=Math.log10;
    const lab=Math.min(190,W*.42),bw=W-lab-70,rowH=22;let s='';
    HY.forEach((h,i)=>{const v=vals[i],y=4+i*rowH,w=Math.max(2,bw*(lg(v)-lg(lo))/(lg(hi)-lg(lo)));const kvShare=h.kv_per_token*C/v;
      s+=tx(lab-6,y+14,h.name.replace(/ \(.*\)/,''),{fs:11,a:'end'})+rc(lab,y+3,w*(1-kvShare),15,'var(--c3)',{r:2})+rc(lab+w*(1-kvShare),y+3,w*kvShare,15,'var(--c2)',{r:2})+tx(lab+w+5,y+14,fmtBytes(v),{fs:11})});
    const y=4+HY.length*rowH+4;[1e6,1e8,1e10].forEach(v=>{const x=lab+bw*(lg(v)-lg(lo))/(lg(hi)-lg(lo));s+=ln2(x,4,x,y,'var(--line)')+tx(x,y+14,v===1e6?'1 MB':v===1e8?'100 MB':'10 GB',{fs:11,a:'middle',c:'var(--mute)'})});
    const L=legend([['fixed state','var(--c3)'],['KV cache at this length','var(--c2)']],lab,y+32,W-lab);
    $('ctxSvg').innerHTML=svgW(W,y+32+L.h,s+L.s,'memory per sequence by model')}
})();
