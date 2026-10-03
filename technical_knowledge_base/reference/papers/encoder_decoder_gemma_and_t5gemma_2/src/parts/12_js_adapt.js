// ---- The adaptation animation: a decoder-only checkpoint copied, weight group by weight group, into an encoder-decoder ----
// Parameter counts come from recompute.py (configs), so every bar is to scale.
(function(){
  const RCP=PAPER.rc.parts, PR=PAPER.rc.params, M=1e6;
  const g2=RCP['gemma-2-2b'], g9=RCP['gemma-2-9b'], g3=RCP['gemma-3-270m'];
  const COL={emb:'var(--c5)',attn:'var(--c1)',ffn:'var(--c3)',cross:'var(--c4)',rnd:'var(--c2)',vis:'var(--c6)'};
  const NAME={emb:'embedding',attn:'self-attention',ffn:'feed-forward',cross:'cross-attention',vis:'SigLIP vision (frozen)'};
  // a segment: {k, v (params), c (colour), st: 'copy'|'rnd'|'frozen'|'ghost'|'tied'}
  const segs=(p,extra)=>[{k:'emb',v:p.emb,c:COL.emb},{k:'attn',v:p.attn+p.norm,c:COL.attn},{k:'ffn',v:p.ffn,c:COL.ffn}].concat(extra||[]);
  const total=a=>a.filter(s=>s.st!=='ghost'&&s.st!=='tied').reduce((t,s)=>t+s.v,0);
  const F=v=>v>=1e9?(v/1e9).toFixed(2)+'B':(v/M).toFixed(v<1e8?1:0)+'M';
  // modes: rows (srcE, srcD, enc, dec) and per step the visible state
  const MODES={
    bal:{src:[['Gemma 2 2B checkpoint (decoder-only)',g2]],enc:g2,dec:g2,cross:{v:g2.cross_self,st:'copy'},
      steps:[
        {t:'The checkpoint',c:'Gemma 2 2B, a decoder-only model: one causal stack of 26 blocks and an embedding table that is also its softmax. Its 2.61B parameters (2.02B outside the embedding) are all the knowledge the encoder-decoder will start from.'},
        {t:'Encoder: a full copy, with the mask opened',c:'Every encoder weight is copied from the checkpoint, so the encoder adds no new weights. The only change is the attention mask: causal (each token sees the ones before it) becomes bidirectional (every token sees every token). Nothing is retrained yet.'},
        {t:'Decoder: self-attention and feed-forward copied',c:'The decoder is the checkpoint again, layer for layer, still causal. Its embedding stays tied to its softmax, as in Gemma 2; the encoder has its own copy of the table, so the model now holds two.'},
        {t:'Cross-attention: initialised from self-attention',c:'Each decoder block gains a cross-attention with the same heads and head size, reading the whole encoder output. In a balanced model the shapes match, so it starts as a copy of that block\'s self-attention: 368M parameters, 26 × 14.2M. This is the part the paper\'s Table 1 leaves out of its 4.0B.'},
        {t:'Adapt: train everything',c:'All 5.60B parameters are trained on up to 2T tokens of the Gemma 2 mixture, with PrefixLM plus distillation (or UL2), then instruction-tuned with the Gemma 2 recipe. The released 2B-2B has 5,596.9M parameters; the recount gives 5,596.7M.'}]},
    unb:{src:[['Gemma 2 9B checkpoint (for the encoder)',g9],['Gemma 2 2B checkpoint (for the decoder)',g2]],enc:g9,dec:g2,cross:{v:RCP.cross_9b_into_2b,st:'rnd'},warm:true,
      steps:[
        {t:'Two checkpoints',c:'The unbalanced model pairs two decoder-only models of different sizes: Gemma 2 9B (9.24B parameters) will become the encoder, Gemma 2 2B (2.61B) the decoder. The same recipe could pair two families, the paper notes, such as LLaMA with Qwen.'},
        {t:'Encoder: Gemma 2 9B, copied, mask opened',c:'The whole 9B is copied into the encoder and its attention made bidirectional. It will read the input once, in parallel, so its size costs little at generation time (see the latency animation below).'},
        {t:'Decoder: Gemma 2 2B, copied',c:'Self-attention, feed-forward and the tied embedding come from the 2B, layer for layer.'},
        {t:'Cross-attention: random, because the shapes differ',c:'The 2B decoder works in 2,304 dimensions, the 9B encoder in 3,584, so no self-attention weight fits. Cross-attention (436M parameters: 26 layers × 16.8M) starts random.'},
        {t:'Warmup: train only the cross-attention for K = 1,000 steps',c:'Everything copied is frozen while the random cross-attention learns to read the encoder. In the paper\'s preliminary test (UL2, 800B tokens, BoolQ and GSM8K) no warmup scored 61.8 and 5,000 steps 60.2, against 62.5 at 1,000.'},
        {t:'Adapt: unfreeze and train everything',c:'All 12.29B parameters (10.78B outside the embeddings, against the 10.4B the paper prints) train on up to 2T tokens. It converges more slowly than the balanced models, since its cross-attention started from nothing, but keeps climbing past Gemma 2 2B (Figure 2).'}]},
    t2:{src:[['Gemma 3 270M checkpoint (text-only, 32K context)',g3]],enc:g3,dec:g3,cross:{v:g3.cross_self,st:'ghost'},t2:true,
      steps:[
        {t:'The checkpoint',c:'Gemma 3 270M: 268M parameters, most of them (168M) in the embedding table of its 262K-token vocabulary. Text-only, with a 32K context window.'},
        {t:'Encoder: copied, mask opened, an image encoder in front',c:'As before, the encoder is a full copy with bidirectional attention. In front of it sits Gemma 3\'s 400M SigLIP vision encoder (417M with its projection), frozen, turning each image into 256 tokens the encoder reads alongside the text.'},
        {t:'Decoder: copied',c:'Self-attention and feed-forward come from the same checkpoint.'},
        {t:'Merged attention: no cross-attention weights at all',c:'Instead of a separate cross-attention (the dashed outline, 29.5M here), the decoder\'s self-attention reads its own tokens and the encoder output together, with one softmax and the same weights. The decoder is a Gemma 3 decoder again; on the 2B-2B ablation this saved 6.5% of parameters for about 0.3 points.'},
        {t:'Tied embeddings: one table for everything',c:'Encoder input, decoder input and decoder softmax share one embedding (as in T5), instead of the first T5Gemma\'s separate encoder and decoder tables: 168M saved here, almost a third of what the untied text model would weigh (536M). On the 2B-2B ablation it cost 0.1 points.'},
        {t:'Adapt with UL2: about 2T tokens, up to 16K long',c:'The whole model (vision encoder frozen) trains with UL2 on Gemma 3\'s mixture. Total: 786M parameters (417M vision, 168M embedding, 100M encoder, 100M decoder), matching Hugging Face\'s count of the released 270M-270M.'}]}
  };
  // state of each row for a mode at step k: list of segments (with st) and the mask kind
  function rows(m,k){const D=MODES[m],R=[];
    D.src.forEach(([lab,p])=>R.push({lab,seg:segs(p).map(s=>Object.assign({st:'copy'},s)),mask:'causal',src:true}));
    const enc={lab:'Encoder',seg:[],mask:k>=1?'full':'causal',to:k===1};
    const dec={lab:'Decoder',seg:[],mask:'causal',to:k===2};
    if(k>=1){enc.seg=segs(D.enc).map(s=>Object.assign({st:'copy'},s));if(D.t2)enc.seg.unshift({k:'vis',v:PAPER.rc.parts.vision,c:COL.vis,st:'frozen'})}
    if(k>=2){dec.seg=segs(D.dec).map(s=>Object.assign({st:'copy'},s))}
    if(k>=3){if(D.t2){dec.seg.push({k:'cross',v:D.cross.v,c:COL.cross,st:'ghost'});dec.mask='merged'}
      else dec.seg.push({k:'cross',v:D.cross.v,c:D.cross.st==='rnd'?COL.rnd:COL.cross,st:D.cross.st,isNew:k===3})}
    if(D.t2&&k>=4){dec.seg[0]=Object.assign({},dec.seg[0],{st:'tied'})}
    if(D.warm&&k===4){enc.seg.forEach(s=>s.frozen=true);dec.seg.forEach(s=>{if(s.k!=='cross')s.frozen=true})}
    const last=k===D.steps.length-1;if(last){enc.seg.forEach(s=>{if(s.st!=='frozen')s.trained=true});dec.seg.forEach(s=>{if(s.st!=='ghost'&&s.st!=='tied')s.trained=true})}
    R.push(enc,dec);return R}
  function maskSvg(x,y,kind,sz,e,from){let s='';const n=5,c=sz/n;const mr=kind==='merged'?2:1;
    for(let i=0;i<n;i++)for(let j=0;j<n*mr;j++){let on;
      if(kind==='full')on=j<=i?1:(from==='causal'?e:1);else if(kind==='merged')on=j<n?(j<=i?1:0):1;else on=j<=i?1:0;
      const col=kind==='merged'&&j>=n?'var(--c4)':'var(--acc)';s+=rc(x+j*c,y+i*c,c-1,c-1,on>0?col:'var(--line)',{r:1,op:on>0?Math.max(.15,on):1})}
    return s}
  function draw(m,k,e,w){const D=MODES[m],R=rows(m,k),prev=k>0?rows(m,k-1):null;
    const mw=D.t2?64:34,bw=Math.max(120,w-mw-14),rowH=50,top=6;
    const totals=R.map(r=>r.seg.filter(s=>s.st!=='ghost').reduce((t,s)=>t+s.v,0)+(r.seg.some(s=>s.st==='ghost')?r.seg.find(s=>s.st==='ghost').v:0));
    const maxT=Math.max(...Object.values(MODES[m].src).map(x=>segs(x[1]).reduce((t,s)=>t+s.v,0)),...[0,1,2,3,4,5].slice(0,D.steps.length).map(kk=>Math.max(...rows(m,kk).map(r=>r.seg.reduce((t,s)=>t+s.v,0)))));
    const sc=bw/maxT;let s='';
    R.forEach((r,i)=>{const y=top+i*rowH,isEnc=r.lab==='Encoder',isDec=r.lab==='Decoder';
      const tot=r.seg.filter(z=>z.st!=='ghost'&&z.st!=='tied').reduce((t,z)=>t+z.v,0);
      s+=tx(0,y+11,r.lab+(r.seg.length?' · '+F(tot):''),{fs:12,w:r.src?400:600,c:r.src?'var(--mute)':'var(--ink)'});
      if(!r.seg.length){s+=rc(0,y+16,bw,22,'none',{s:'var(--line)',da:'4 3'})+tx(8,y+31,'empty',{fs:11,c:'var(--mute)'});}
      // fly-in for the row being filled this step
      const fly=(isEnc&&k===1)||(isDec&&k===2);const srcY=top+(isDec&&D.src.length>1?1:0)*rowH;
      let x=0;r.seg.forEach(z=>{const wd=z.v*sc,yy=fly?srcY+16+(y-srcY)*e:y+16;const op=fly?.35+.65*e:(z.isNew?.25+.75*e:1);
        if(z.st==='ghost'){s+=G(e>0||k>3?1:0,rc(x,y+16,wd,22,'none',{s:'var(--c4)',da:'4 3',sw:1.4})+(wd>40?tx(x+wd/2,y+31,'saved',{fs:11,a:'middle',c:'var(--mute)'}):''));x+=wd;return}
        if(z.st==='tied'){const op2=k===4?1-e*.75:.25;s+=rc(x,y+16,wd,22,z.c,{op:op2,s:'var(--c5)',da:'4 3'})+(wd>50?tx(x+wd/2,y+31,'tied',{fs:11,a:'middle'}):'');x+=wd;return}
        s+=G(op,rc(x,yy,wd,22,z.c,{op:z.frozen?.3:.85,s:z.trained?'var(--ink)':(z.st==='rnd'?'var(--c2)':'none'),sw:z.trained?1.6:1.2,da:z.st==='rnd'?'3 2':null}));
        if(z.frozen&&wd>44)s+=tx(x+wd/2,yy+15,'frozen',{fs:11,a:'middle',c:'var(--ink)'});
        else if(z.st==='frozen'&&wd>60)s+=tx(x+wd/2,yy+15,'frozen',{fs:11,a:'middle',c:'var(--bg)'});
        x+=wd});
      // mask inset
      const mk=r.mask,mx=w-mw;if(r.seg.length||r.src)s+=maskSvg(mx,y+12,mk,Math.min(28,mw/ (mk==='merged'?2:1)),e,(isEnc&&k===1)?'causal':null);
    });
    // legend
    const ly=top+R.length*rowH+6;const lg=[['embedding',COL.emb],['self-attention',COL.attn],['feed-forward',COL.ffn],[D.cross.st==='rnd'?'cross-attention (random)':'cross-attention',D.cross.st==='rnd'?COL.rnd:COL.cross]].concat(D.t2?[['vision',COL.vis]]:[]);
    let lx=0,lyy=ly;lg.forEach(([n,c])=>{const lw=n.length*6.3+22;if(lx+lw>w){lx=0;lyy+=16}s+=rc(lx,lyy-9,12,10,c,{r:2,op:.85})+tx(lx+16,lyy,n,{fs:11});lx+=lw});
    return svgW(w,lyy+8,s,'Adaptation of a decoder-only checkpoint into an encoder-decoder')}
  function counters(m,k){const D=MODES[m],R=rows(m,k);const ed=R.filter(r=>!r.src);
    const tot=ed.reduce((t,r)=>t+r.seg.filter(z=>z.st!=='ghost'&&z.st!=='tied').reduce((a,z)=>a+z.v,0),0);
    const rnd=ed.reduce((t,r)=>t+r.seg.filter(z=>z.st==='rnd').reduce((a,z)=>a+z.v,0),0);
    const copied=tot-rnd-ed.reduce((t,r)=>t+r.seg.filter(z=>z.st==='frozen').reduce((a,z)=>a+z.v,0),0);
    const training=k===D.steps.length-1?'all except frozen':(D.warm&&k===4?'cross-attention only':'none yet');
    return stat('Encoder-decoder so far',tot?F(tot):'0','parameters, embeddings included')+stat('Copied from the checkpoint',F(copied),'no new knowledge needed')+stat('Starting random',F(rnd),rnd?'needs the warmup':'')+stat('Being trained',training,k===D.steps.length-1?(D.t2?'UL2, about 2T tokens':'up to 2T tokens'):'')}
  const modes={};Object.keys(MODES).forEach(m=>modes[m]=MODES[m].steps);
  window.ADX=makeAnim({id:'adx',modes,mode:'bal',draw,counters,dur:3200});
})();
