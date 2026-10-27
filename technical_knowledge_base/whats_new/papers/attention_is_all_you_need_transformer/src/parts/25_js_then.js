// ---- Then and now: the 2017 post-LN encoder-decoder block morphing into a 2026 decoder-only block ----
(function(){if(!$('thx'))return;
  const L=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>',N=id=>'https://app.notion.com/p/'+id;
  const C0={enc:1,cross:1,pre:0,rms:0,rope:0,glu:0,kv:8,bias:1};
  const step=(t,c,ch)=>({t,c,cfg:Object.assign({},ch)});let cur=Object.assign({},C0);const mk=(t,c,ch)=>{cur=Object.assign({},cur,ch||{});return step(t,c,cur)};
  const ST=[mk('2017: the Transformer\'s decoder layer','The base model as the paper built it ('+L(PAPER.meta.ax+'#S3.F1','Figure 1')+'): a six-layer encoder whose output feeds every decoder layer\'s cross-attention, three sub-layers per decoder layer each wrapped as LayerNorm(x + Sublayer(x)), sinusoidal positions added to the input, a ReLU feed-forward network with inner size 2,048, biases everywhere.'),
    mk('Drop the encoder: decoder-only','One causal stack reads the prompt and writes the answer as a single sequence, so the encoder and cross-attention go. '+L('https://arxiv.org/abs/1801.10198','Liu et al. 2018')+' introduced it for summarisation ("almost reducing model parameters by half"); GPT and '+L(N('3c65c17b0d0d8193ac92c7648cfaca12'),'GPT-3')+' scaled it. Encoder-decoders survive in '+L(N('3d45c17b0d0d81ec8ebfec02e953a7fd'),'T5')+' and Whisper.',{enc:0,cross:0}),
    mk('Move the norm before each sub-layer (pre-LN)','Each sub-layer now computes x + Sublayer(Norm(x)), and one more norm sits after the last block ('+L('https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf','GPT-2, section 2.3')+'). The residual path is now a clean sum from input to output. '+L('https://arxiv.org/abs/2002.04745','Xiong et al. 2020')+' showed post-LN\'s large gradients near the output at initialisation are why it needs the warmup, and trained pre-LN without one.',{pre:1}),
    mk('LayerNorm becomes RMSNorm','Divide by the root mean square instead of subtracting the mean and dividing by the deviation, and keep only a gain: cheaper, and as good in practice ('+L('https://arxiv.org/abs/1910.07467','Zhang and Sennrich 2019')+'). 512 numbers per norm instead of 1,024.',{rms:1}),
    mk('Positions move inside attention (RoPE)','The sinusoids added once at the input are replaced by rotating each query and key by an angle set by its position, in every attention layer, so the score between two tokens depends on their offset ('+L(N('3c65c17b0d0d81cfa5e9f54459720098'),'RoFormer')+', '+L('https://arxiv.org/abs/2104.09864','Su et al. 2021')+'). No parameters either way; the context can later be stretched by interpolation and YaRN.',{rope:1}),
    mk('ReLU FFN becomes SwiGLU','(Swish(xW) ⊗ xV)W₂: a gated FFN with three matrices. To keep parameters and compute constant the inner size is scaled by 2/3, from 2,048 to 1,365 here ('+L('https://arxiv.org/abs/2002.05202','Shazeer 2020')+'). PaLM and Llama adopted it.',{glu:1}),
    mk('Heads share keys and values (GQA)','The 8 query heads now share 2 key-value heads, 4 queries per group as in Llama 3.1 8B (32 query heads, 8 KV heads, '+L('https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json','config')+'). The KV cache per token falls from 1,024 to 256 numbers per layer, with quality close to full multi-head attention ('+L('https://arxiv.org/abs/2305.13245','Ainslie et al. 2023')+'; MQA, one KV head, is '+L('https://arxiv.org/abs/1911.02150','Shazeer 2019')+').',{kv:2}),
    mk('No biases','"No biases were used in any of the dense kernels or layer norms. We found this to result in increased training stability for large models" ('+L('https://arxiv.org/abs/2204.02311','PaLM, section 2')+'). Llama 3.1 and Qwen3 configs set attention_bias to false.',{bias:0}),
    mk('2026: what survived','Scaled dot-product attention, multi-head projections, a residual connection and a norm around every sub-layer, and an FFN at every position are all still here. What changed is where the norm sits, which norm, how positions enter, the FFN\'s gate, how many key-value heads there are, and that the encoder is gone. Real 2026 models add more on top (MoE FFNs, MLA, sliding or linear attention layers): see the '+L(N('3c65c17b0d0d81be8a07f2562fa2030a'),'LLM Architecture Gallery')+'.')];
  const d=512,dh=64;
  function count(c){const att=kv=>2*d*d+2*d*kv*dh+(c.bias?2*d+2*kv*dh:0),ffn=c.glu?3*d*1365+(c.bias?2*1365+d:0):2*d*2048+(c.bias?2048+d:0),nrm=c.rms?d:2*d;
    const layer=att(c.kv)+ffn+(c.cross?att(8)+nrm:0)+2*nrm;return {layer,enc:c.enc?att(8)+ffn+2*nrm:0,kv:2*c.kv*dh}}
  function items(c,w){const nm=c.rms?'RMSNorm':'LayerNorm',ew=Math.min(120,Math.round(w*.27)),hasE=c.enc,dw=Math.min(310,w-(hasE?ew+30:12)-40),x=hasE?ew+30:(w-dw)/2;
    const att1=(c.cross?'Masked self-attention':'Causal self-attention'),att2=(c.kv<8?'8 query heads, '+c.kv+' KV heads':'8 heads')+(c.rope?', RoPE on q, k':'');
    const ffn1='Feed-forward, '+(c.glu?'SwiGLU':'ReLU'),ffn2=c.glu?'3 matrices, inner 1,365':'2 matrices, inner 2,048';
    let L=[['emb','Token embedding',c.rope?'no positions added':'+ sinusoidal positions','var(--soft)']];
    if(!c.pre){L.push(['attn',att1,att2,'var(--acc2)'],['an1','Add & '+nm,'','var(--soft)']);if(c.cross)L.push(['cross','Cross-attention','keys, values from the encoder','var(--closed2)'],['an2','Add & '+nm,'','var(--soft)']);L.push(['ffn',ffn1,ffn2,'var(--open2)'],['an3','Add & '+nm,'','var(--soft)'])}
    else{L.push(['n1',nm,'','var(--soft)'],['attn',att1,att2,'var(--acc2)'],['n3',nm,'','var(--soft)'],['ffn',ffn1,ffn2,'var(--open2)'],['fn','Final '+nm,'after the last layer','var(--soft)'])}
    L.push(['head','Linear + softmax','','var(--soft)']);
    const pitch=42,bh=32,H=392,o={};L.forEach((it,i)=>{const y=H-22-(i+1)*pitch;o[it[0]]={x,y,w:dw,h:bh,l1:it[1],l2:it[2],f:it[3]}});
    const blk=c.pre?['n1','ffn']:['attn','an3'];o.frame={x:x-6,y:o[blk[1]].y-6,w:dw+12,h:o[blk[0]].y-o[blk[1]].y+bh+12};
    if(hasE)o.enc={x:8,y:o.frame.y,w:ew,h:o.frame.h};
    // residual arcs: [from y, to y, key]
    o.res=c.pre?[['r1',o.n1.y+bh+4,o.attn.y-2],['r3',o.n3.y+bh+4,o.ffn.y-2]]:[['r1',o.attn.y+bh+4,o.an1.y+bh/2],['r3',o.ffn.y+bh+4,o.an3.y+bh/2]].concat(c.cross?[['r2',o.cross.y+bh+4,o.an2.y+bh/2]]:[]);
    o.H=H;return o}
  const lerp=(a,b,u)=>a+(b-a)*u;
  function draw(m,k,e,w){const A=items(ST[Math.max(0,k-1)].cfg,w),B=items(ST[k].cfg,w),u=k===0?1:e;let s='';const keys=['emb','an1','cross','an2','n1','attn','n3','ffn','an3','fn','head'];
    const cfgA=ST[Math.max(0,k-1)].cfg,cfgB=ST[k].cfg;
    // frame and encoder
    const fr=(a,b)=>({x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u),w:lerp(a.w,b.w,u),h:lerp(a.h,b.h,u)});const F=fr(A.frame,B.frame);
    s+=rc(F.x,F.y,F.w,F.h,'none',{s:'var(--mute)',da:'4 3'})+tx(F.x+F.w-4,F.y+F.h+13,'× N layers',{fs:11,a:'end',c:'var(--mute)'});
    if(A.enc||B.enc){const E=A.enc||B.enc,op=B.enc?(A.enc?1:u):1-u;s+=G(op,rc(E.x,E.y,E.w,E.h,'var(--closed2)',{s:'var(--closed)'})+tx(E.x+E.w/2,E.y+E.h/2-6,'Encoder',{fs:12,a:'middle',w:600})+tx(E.x+E.w/2,E.y+E.h/2+10,'× 6 layers',{fs:11,a:'middle',c:'var(--mute)'})+(A.cross?'<path d="M'+(E.x+E.w)+' '+(A.cross.y+16)+' H'+A.cross.x+'" stroke="var(--closed)" stroke-width="1.6" fill="none"/>':''))}
    // residual arcs (right side)
    const ra={},rb={};A.res.forEach(r=>ra[r[0]]=r);B.res.forEach(r=>rb[r[0]]=r);
    ['r1','r2','r3'].forEach(key=>{const a=ra[key],b=rb[key];if(!a&&!b)return;const op=a&&b?1:b?u:1-u,r=a&&b?[0,lerp(a[1],b[1],u),lerp(a[2],b[2],u)]:(a||b);
      const X=lerp(A.attn.x+A.attn.w,B.attn.x+B.attn.w,u)+(key==='r2'?16:22);s+=G(op,'<path d="M'+(X-22)+' '+r[1].toFixed(1)+' H'+X+' V'+r[2].toFixed(1)+' H'+(X-22)+'" fill="none" stroke="var(--mute)" stroke-width="1.3"/>'+(cfgB.pre||(!b&&cfgA.pre)?'<circle cx="'+X+'" cy="'+r[2].toFixed(1)+'" r="5" fill="var(--bg)" stroke="var(--mute)"/>'+tx(X,r[2]+4,'+',{fs:11,a:'middle'}):''))});
    keys.forEach(key=>{const a=A[key],b=B[key];if(!a&&!b)return;const op=a&&b?1:b?u:1-u,g=a&&b?{x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u),w:lerp(a.w,b.w,u),h:b.h}:(a||b);
      const lab=(z,o2)=>tx(g.x+g.w/2,g.y+(z.l2?13:20),z.l1,{fs:12,a:'middle',op:o2})+(z.l2?tx(g.x+g.w/2,g.y+27,z.l2,{fs:11,a:'middle',c:'var(--mute)',op:o2}):'');
      let t='';if(a&&b&&(a.l1!==b.l1||a.l2!==b.l2))t=lab(a,(1-u).toFixed(2))+lab(b,u.toFixed(2));else t=lab(b||a,1);
      const changed=a&&b&&(a.l1!==b.l1||a.l2!==b.l2)&&k>0;
      // bias badge on the projections
      const bi=(key==='attn'||key==='ffn'||key==='cross')?(cfgA.bias&&cfgB.bias?1:cfgB.bias?u:cfgA.bias?1-u:0):0;
      s+=G(op,rc(g.x,g.y,g.w,g.h,(b||a).f,{s:changed?'var(--c2)':'var(--line)',sw:changed?2:1})+t+(bi>0?G(bi,'<circle cx="'+(g.x+g.w-9)+'" cy="'+(g.y+9)+'" r="7" fill="var(--bg)" stroke="var(--mute)"/>'+tx(g.x+g.w-9,g.y+13,'b',{fs:11,a:'middle',c:'var(--mute)'})):''))});
    // arrows up the stack
    return svgW(w,B.H,s,'Decoder layer, step '+(k+1))}
  function counters(m,k,e){const c=ST[k].cfg,p=ST[Math.max(0,k-1)].cfg,cc=count(c),cp=count(p),sh=e>=.5||k===0?cc:cp,dl=cc.layer-cp.layer;
    return stat('Parameters per decoder layer',fmt(sh.layer),k&&e>=.5&&dl?(dl>0?'+':'')+fmt(dl)+' at this step':'d = 512, 8 heads')+stat('Encoder layer',sh.enc?fmt(sh.enc):'none','parameters')+stat('KV cache per token per layer',fmt(sh.kv)+' numbers','2 × KV heads × 64')+stat('Position enters',(e>=.5||k===0?c:p).rope?'inside every attention':'once, at the input',(e>=.5||k===0?c:p).rope?'RoPE rotates q and k':'sinusoids added')}
  makeAnim({id:'thx',modes:{x:ST},mode:'x',draw,counters,dur:3600});
})();
