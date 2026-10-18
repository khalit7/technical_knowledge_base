// ---- Architecture map: "which design for which constraint" picker, and predict-then-reveal drills ----
(function(){
  const A=window.AM;if(!A||!A.$('am-pk'))return;
  const {$,esc,rows,fmtB,fmtP,num}=A;
  const pnum=s=>{const m=String(s||'').match(/([\d.]+)\s*([MBT])/);return m?parseFloat(m[1])*{M:1e6,B:1e9,T:1e12}[m[2]]:null};
  const act=r=>pnum(r.act)||pnum(r.tot);
  const seqAt=(r,T)=>{if(!r.kv)return null;let b=0;const per=r.kv/r.mix.split('').filter(c=>/[GSMDH]/.test(c)).length;
    // per-layer bytes are equal across attention layers except Gemma 4 (handled through kvw at 131,072); use kvw scaling for windows
    if(r.kvw<r.kv&&r.W){const nS=r.mix.split('').filter(c=>c==='S').length;const perS=(r.kv-r.kvw)*131072/(nS*(131072-Math.min(131072,r.W)));
      b=(r.kv-nS*perS)*T+nS*perS*Math.min(T,r.W)}else b=r.kv*T;
    return b+(r.st?r.mix.split('').filter(c=>c==='L').length*r.st*2:0)};
  const N=n=>'n:'+n;
  const L=(t,u)=>A.link(t,u);
  const SC=[
   {id:'long',t:'Long context (128K and more) in limited GPU memory',
    ax:[['Attention','MLA, or GQA with few KV heads','The cache per token is the term that grows with context. DeepSeek-V3 stores 576 numbers per layer per token with MLA; Llama 3.1 405B stores 2,048 with 8 KV heads of 128.'],
        ['Layer mix','Mostly sliding-window or linear layers, a few global','Windowed layers stop growing at W tokens: Gemma 3 27B needs 10.4 GiB at 131,072 tokens instead of 62 GiB.'],
        ['Position','RoPE with a large base, scaled (YaRN or llama3) on global layers, or NoPE on global layers','OLMo 3 applies YaRN to its global layers only; Llama 4 drops RoPE on every fourth layer. See '+L('Positional Encodings',N('3c65c17b0d0d81a5b7c9e578fcdfac00'))+'.'],
        ['Cost','Recall across the whole context rests on few layers','Measure it with long-context tests rather than trusting the context field: '+L('Long-context and multimodal benchmarks',N('3ef5c17b0d0d810bb4dfc98919c9be8a'))+'.']],
    filt:r=>r.kv&&(r.ctxc||0)>=131072,key:r=>seqAt(r,131072),show:r=>fmtB(seqAt(r,131072))+' for one 131,072-token sequence',lab:'smallest cache at 131,072 tokens'},
   {id:'train',t:'Most quality per training FLOP',
    ax:[['FFN','Fine-grained mixture of experts with a shared expert','Compute per token follows active parameters while capacity follows total: DeepSeek-V3 runs 37B of 671B per token.'],
        ['Balancing','Auxiliary-loss-free router bias (DeepSeek-V3) or a global-batch balance loss (Qwen3)','Per-batch auxiliary losses fight specialisation; both alternatives are in the papers linked from the table.'],
        ['Norm','Pre-norm RMSNorm with QK-norm','Lets the run use a higher learning rate without logit blow-ups.'],
        ['Cost','Memory and communication','Every expert sits in memory and tokens cross devices in all-to-all exchanges. See '+L('Mixture of experts',N('3fd5c17b0d0d81fda06bf955af7c2b58'))+' and '+L('Distributed Training',N('3c65c17b0d0d8103a916c4824abbd82e'))+'.']],
    filt:r=>r.E&&pnum(r.act)&&pnum(r.tot),key:r=>pnum(r.act)/pnum(r.tot),show:r=>(100*pnum(r.act)/pnum(r.tot)).toFixed(1)+'% of parameters active ('+esc(r.act)+' of '+esc(r.tot)+')',lab:'lowest active share'},
   {id:'device',t:'Run on a laptop or phone',
    ax:[['Size','A small dense model','Every parameter is read for every token, and the whole model must fit in a few GB.'],
        ['Attention','GQA or MQA, sliding windows for long prompts','SmolLM2-135M keeps 3 KV heads for 9 query heads; Gemma 3 uses 5 windowed layers per global layer even at 270M.'],
        ['Embeddings','Tied input and output embeddings','At small width the vocabulary matrix is a large share of all parameters; tying stores it once.'],
        ['Cost','Less capacity','Quantisation matters as much as architecture here: '+L('Quantization and Precision',N('3c65c17b0d0d817b8f41ff66fba4cd0e'))+'.']],
    filt:r=>r.kv&&pnum(r.tot)&&pnum(r.tot)<=8.6e9&&r.lk!=='closed',key:r=>r.kv,show:r=>fmtB(r.kv)+' KV per token, '+esc(r.tot)+' parameters',lab:'smallest KV per token among models of 8B or less'},
   {id:'million',t:'A million-token context',
    ax:[['Mixer','A linear-attention or SSM hybrid','Linear layers keep a fixed state; only the attention layers grow (Qwen3-Next: 12 of 48 layers).'],
        ['Or','Trained sparse attention','Each query reads a selected subset of the cache (DeepSeek-V3.2: 2,048 tokens), which cuts compute but not cache size.'],
        ['Position','NoPE or partial RoPE in the few global layers','Kimi Linear and Kimi K3 drop RoPE in their MLA layers.'],
        ['Cost','Recall and maturity','Fixed states forget; kernels for delta rules and scans are newer. See '+L('Beyond attention',N('3fd5c17b0d0d8142bc9ecac1fc366966'))+' and '+L('Long context',N('3fd5c17b0d0d81059ee1ce20c0326dc5'))+'.']],
    filt:r=>r.kv&&/1M|1,0[0-9]{2},[0-9]{3}/.test(r.cx||''),key:r=>seqAt(r,1048576),show:r=>fmtB(seqAt(r,1048576))+' at 1,048,576 tokens'+(r.st?' (includes fixed state)':''),lab:'smallest cache at 1,048,576 tokens, among models published with a 1M context'},
   {id:'stable',t:'Stable training at scale',
    ax:[['Norm placement','Pre-norm RMSNorm, or norms on sub-layer outputs (OLMo 2), or both (Gemma)','Keeps the residual path clean and the activations bounded.'],
        ['Logits','QK-norm (or QK-clip, as Kimi K2 does with Muon)','Stops attention logits from growing until the softmax saturates.'],
        ['Other','No biases, z-loss, careful initialisation','OLMo 2 adds a z-loss on the output logits.'],
        ['Cost','Small','A few vectors of parameters. Depth: '+L('Normalisation, residuals and stability',N('3fd5c17b0d0d8163b50dc5e9d9240e89'))+'.']],
    filt:r=>r.qk||r.nk==='post'||r.nk==='sandwich',key:r=>r.dt,show:r=>esc(({pre:'pre-norm',post:'post-norm on outputs',sandwich:'pre- and post-norm',parallel:'parallel'}[r.nk]))+(r.qk?', QK-norm':''),lab:'models with QK-norm or non-standard norm placement, by date',desc:false},
   {id:'port',t:'Easiest to fine-tune, serve and port',
    ax:[['Block','The dense Llama block: pre-norm RMSNorm, RoPE, SwiGLU, GQA','Every inference engine and fine-tuning library supports it without special kernels.'],
        ['Avoid','MoE, hybrids, custom attention','Expert parallelism, scan kernels and sparse indexers each need support in the serving stack.'],
        ['Cost','Less efficient at scale','Dense FLOPs per token equal the parameter count; see the '+'<a href="#" data-tab="t-calc">Config calculator</a>.'],
        ['Check','Read the config','model_type llama, mistral or qwen3 with no expert or layer_types fields.']],
    filt:r=>r.attk==='GQA'&&r.ffk==='Dense'&&r.mix.indexOf('S')<0&&r.pos.indexOf('N')<0,key:r=>r.dt,show:r=>esc(r.att)+', '+esc(r.tot),lab:'plain dense GQA models, newest first',desc:true},
   {id:'decode',t:'Fast decoding at large batch',
    ax:[['Why','Decoding is memory-bound','Each step reads the active weights once for the whole batch, and every sequence\'s KV cache.'],
        ['Attention','Small cache per token (MLA, few KV heads, windows)','The cache term grows with batch and context; weights do not.'],
        ['FFN','Mixture of experts with few active parameters','Fewer weight bytes per token; at large batch more experts are touched, so the real number lies between active and total.'],
        ['Workload','Illustrative: batch 32, 32,768 tokens each','Ranking by active weights (bf16) plus 32 caches. Hardware side: '+L('Performance math',N('3c65c17b0d0d81faad1ef390b0e54d08'))+'.']],
    filt:r=>r.kv&&act(r)&&(r.ctxc||0)>=32768,key:r=>act(r)*2+32*seqAt(r,32768),show:r=>fmtB(act(r)*2+32*seqAt(r,32768))+' per step: '+fmtB(act(r)*2)+' weights + '+fmtB(32*seqAt(r,32768))+' cache',lab:'fewest bytes read per decode step (illustrative workload; models trained to at least 32,768 tokens)'}
  ];
  let cur=SC[0].id;
  $('am-pk').innerHTML=SC.map(s=>'<button data-s="'+s.id+'"'+(s.id===cur?' class="on"':'')+'>'+esc(s.t)+'</button>').join('');
  function render(){
    const s=SC.find(x=>x.id===cur);
    let v=rows.filter(s.filt).sort((a,b)=>{const x=s.key(a),y=s.key(b);return (x<y?-1:x>y?1:0)*(s.desc?-1:1)});
    const top=v.slice(0,6);
    let h='<div class="am-rec">'+s.ax.map(a=>'<div><b class="ax">'+esc(a[0])+'</b><b>'+esc(a[1])+'</b><div>'+a[2]+'</div></div>').join('')+'</div>';
    h+='<p class="small"><b>In this map</b> ('+esc(s.lab)+', '+v.length+' qualify):</p><ol class="small">'+top.map(r=>'<li><a href="#" data-am="'+r.id+'">'+esc(r.n)+'</a> ('+esc(r.dt.slice(0,4))+'): '+s.show(r)+'</li>').join('')+'</ol>';
    $('am-pk-out').innerHTML=h;
  }
  $('am-pk').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.s;$('am-pk').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});
  $('am-pk-out').addEventListener('click',e=>{const a=e.target.closest('a[data-am]');if(!a)return;e.preventDefault();
    const d=$('am-det');if(d){d.innerHTML=A.detail(A.byId[a.dataset.am]);d.scrollIntoView({block:'nearest'})}});
  A.tabLinks($('am-pk-out'));
  render();
  // ---- drills ----
  const B=A.byId;
  const DR=[
    {q:'Per token, which model keeps the larger KV cache: Llama 3.1 405B or DeepSeek-V3 (671B)?',o:['Llama 3.1 405B','DeepSeek-V3','About the same'],
     a:()=>{const x=B.llama31.kv,y=B.dsv3.kv;return [x>y*1.2?0:y>x*1.2?1:2,'Llama 3.1 405B: '+fmtB(x)+' per token (126 layers x 8 KV heads x 128 x 2 x 2 bytes). DeepSeek-V3: '+fmtB(y)+' (61 layers x 576 numbers x 2 bytes), '+(x/y).toFixed(1)+' times less, from the larger model. MLA is why.']}},
    {q:'Gemma 3 27B, one 131,072-token sequence in bf16: how much KV memory?',o:['About 62 GiB','About 31 GiB','About 10 GiB','Under 1 GiB'],
     a:()=>{const g=B.gemma3,b=g.kvw*131072;const gi=b/2**30;const i=[62,31,10,1].reduce((bi,v,k,arr)=>Math.abs(gi-v)<Math.abs(gi-arr[bi])?k:bi,0);
       return [i,fmtB(b)+'. Counting every layer at full cost gives '+fmtB(g.kv*131072)+', but 52 of its 62 layers keep only the last '+num(g.W)+' tokens.']}},
    {q:'Of the seven 2026 models in this map, how many use a mixture of experts (hybrids included)?',o:['3','4','5','6'],
     a:()=>{const v=rows.filter(r=>r.dt>='2026');const n=v.filter(r=>r.ffn.indexOf('e')>=0).length;return [['3','4','5','6'].indexOf(String(n)),n+' of '+v.length+'. The exception is '+v.filter(r=>r.ffn.indexOf('e')<0).map(r=>r.n).join(', ')+', a dense model.']}},
    {q:'Which keeps the smallest KV cache per token?',o:['Jamba v0.1','Kimi Linear 48B-A3B','Nemotron 3 Super','Qwen3.5 397B-A17B'],
     a:()=>{const ids=['jamba','kimilin','nemo3s','qwen35'];const kv=ids.map(i=>B[i].kv);const m=kv.indexOf(Math.min(...kv));
       return [m,ids.map((i,k)=>B[i].n+' '+fmtB(kv[k])).join('; ')+'. All four are hybrids: only their few attention layers grow a cache, and Kimi Linear\'s are MLA layers.']}}
  ];
  $('am-drills').innerHTML=DR.map((d,i)=>'<div class="am-q" data-q="'+i+'"><b>'+esc(d.q)+'</b><div class="opts">'+d.o.map((o,k)=>'<button data-k="'+k+'">'+esc(o)+'</button>').join('')+'<button data-k="-1" class="small">Skip, show the answer</button></div><div class="ans"></div></div>').join('');
  $('am-drills').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const box=b.closest('.am-q'),d=DR[+box.dataset.q],k=+b.dataset.k;
    const r=d.a();box.querySelectorAll('.opts button').forEach(x=>{const kk=+x.dataset.k;x.classList.toggle('right',kk===r[0]);x.classList.toggle('wrong',kk===k&&k!==r[0]&&k>=0)});
    box.querySelector('.ans').innerHTML=(k<0?'':k===r[0]?'<b style="color:var(--good)">Right.</b> ':'<b style="color:var(--bad)">Not quite.</b> ')+esc(r[1])});
})();
