// ---- Performance calculator (t-calc): training calculator UI ----
(function(){
  const X=window.CALCX,$=id=>document.getElementById(id);
  const PRE={
    old8:{lab:'8B on 1T tokens, 8 H100s at 40% MFU (the old page\'s example)',o:{model:'l8',chip:'h100',recipe:'adam16',gpus:8,tp:1,pp:1,zero:3,seq:8192,mb:1,ckpt:'flash',tokens:1e12,mfu:0.4,attn:false}},
    ft1:{lab:'Full fine-tune of 8B on one H100: does it fit?',o:{model:'l8',chip:'h100',recipe:'adam16',gpus:1,tp:1,pp:1,zero:0,seq:4096,mb:1,ckpt:'full',tokens:1e9,mfu:0.4,attn:false}},
    qlora:{lab:'QLoRA fine-tune of 8B on one RTX 5090',o:{model:'l8',chip:'rtx5090',recipe:'qlora',gpus:1,tp:1,pp:1,zero:0,seq:4096,mb:1,ckpt:'full',tokens:1e8,mfu:0.3,attn:false}},
    chin:{lab:'Chinchilla-sized: 70B on 1.4T tokens, 512 H100s',o:{model:'l70',chip:'h100',recipe:'adam16',gpus:512,tp:8,pp:1,zero:1,seq:8192,mb:1,ckpt:'full',tokens:1.4e12,mfu:0.4,attn:false}},
    l405:{lab:'Llama 3 405B as published: 15.6T tokens, 16,384 H100s, TP 8, PP 16, 41% MFU',o:{model:'l405',chip:'h100',recipe:'adam16',gpus:16384,tp:8,pp:16,zero:1,seq:8192,mb:1,ckpt:'full',tokens:15.6e12,mfu:0.41,attn:false}},
    b200:{lab:'The same 70B run on 512 B200s',o:{model:'l70',chip:'b200',recipe:'adam16',gpus:512,tp:8,pp:1,zero:1,seq:8192,mb:1,ckpt:'full',tokens:1.4e12,mfu:0.4,attn:false}},
    tpu:{lab:'gpt-oss-120b-sized MoE on 256 TPU7x (Ironwood) chips',o:{model:'oss120',chip:'v7',recipe:'adam16',gpus:256,tp:1,pp:1,zero:3,seq:8192,mb:1,ckpt:'flash',tokens:1e12,mfu:0.35,attn:false}}};
  const OPT={tgpus:[1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,24576],ttp:[1,2,4,8],tpp:[1,2,4,8,16],tseq:[2048,4096,8192,16384,32768,131072],tmb:[1,2,4,8],
    ttok:[1e8,1e9,1e10,1e11,5e11,1e12,1.4e12,2e12,5e12,1e13,1.5e13,1.56e13,3e13]};
  const tokLab=v=>v>=1e12?X.sig(v/1e12)+'T':v>=1e9?X.sig(v/1e9)+'B':X.sig(v/1e6)+'M';
  function fill(id,vals,lab){$(id).innerHTML=vals.map(v=>'<option value="'+v+'">'+(lab?lab(v):Number(v).toLocaleString('en-US'))+'</option>').join('')}
  function init(){
    $('calc-tpre').innerHTML=Object.keys(PRE).map(k=>'<option value="'+k+'">'+X.esc(PRE[k].lab)+'</option>').join('')+'<option value="custom">Custom</option>';
    $('calc-tmodel').innerHTML=Object.keys(X.M).map(k=>'<option value="'+k+'">'+X.esc(X.M[k].name)+'</option>').join('');
    $('calc-tchip').innerHTML=Object.keys(X.C).map(k=>'<option value="'+k+'">'+X.esc(X.C[k].name)+'</option>').join('');
    $('calc-trec').innerHTML=Object.keys(X.R).map(k=>'<option value="'+k+'">'+X.esc(X.R[k].name)+'</option>').join('');
    fill('calc-tgpus',OPT.tgpus);fill('calc-ttp',OPT.ttp);fill('calc-tpp',OPT.tpp);fill('calc-tseq',OPT.tseq);fill('calc-tmb',OPT.tmb);fill('calc-ttok',OPT.ttok,tokLab);
    setPre('old8');
    $('calc-tpre').addEventListener('change',e=>{if(e.target.value!=='custom')setPre(e.target.value)});
    ['calc-tmodel','calc-tchip','calc-trec','calc-tgpus','calc-ttp','calc-tpp','calc-tz','calc-tseq','calc-tmb','calc-tck','calc-ttok','calc-tmfu','calc-tatt'].forEach(id=>{
      $(id).addEventListener(id==='calc-tmfu'?'input':'change',()=>{$('calc-tpre').value='custom';render()})});
    X.onRender(render);addEventListener('resize',()=>{if(!$('t-calc').hidden)render()});
  }
  function setPre(k){const o=PRE[k].o;$('calc-tpre').value=k;
    $('calc-tmodel').value=o.model;$('calc-tchip').value=o.chip;$('calc-trec').value=o.recipe;$('calc-tgpus').value=o.gpus;$('calc-ttp').value=o.tp;$('calc-tpp').value=o.pp;
    $('calc-tz').value=o.zero;$('calc-tseq').value=o.seq;$('calc-tmb').value=o.mb;$('calc-tck').value=o.ckpt;$('calc-ttok').value=o.tokens;$('calc-tmfu').value=o.mfu;$('calc-tatt').checked=o.attn;render()}
  function read(){return {model:$('calc-tmodel').value,chip:$('calc-tchip').value,recipe:$('calc-trec').value,gpus:+$('calc-tgpus').value,tp:+$('calc-ttp').value,pp:+$('calc-tpp').value,
    zero:+$('calc-tz').value,seq:+$('calc-tseq').value,mb:+$('calc-tmb').value,ckpt:$('calc-tck').value,tokens:+$('calc-ttok').value,mfu:+$('calc-tmfu').value,attn:$('calc-tatt').checked}}
  const COLS=[['w','weights','var(--c1)'],['g','gradients','var(--c2)'],['opt','optimizer state','var(--c4)'],['act','activations','var(--c3)']];
  function bar(r,el){
    const W=Math.max(260,el.clientWidth),H=58,scale=Math.max(r.total,r.mem)*1.04,x=v=>v/scale*(W-2);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Memory per GPU against capacity">',x0=1;
    COLS.forEach(c=>{const w=x(r[c[0]]);if(w>0.3)s+='<rect x="'+x0+'" y="14" width="'+w+'" height="24" style="fill:'+c[2]+'"><title>'+c[1]+': '+X.fGB(r[c[0]])+'</title></rect>';x0+=w});
    const xm=1+x(r.mem);
    s+='<line x1="'+xm+'" x2="'+xm+'" y1="6" y2="46" style="stroke:var(--ink);stroke-width:2"/>';
    const lab=X.esc(X.C[$('calc-tchip').value].name)+' capacity '+X.sig(r.mem)+' GB',right=xm>W*0.55;
    s+='<text x="'+(xm+(right?-4:4))+'" y="56" font-size="11" text-anchor="'+(right?'end':'start')+'">'+lab+'</text>';
    s+='<text x="2" y="10" font-size="11" style="fill:var(--mute)">one GPU, to scale</text></svg>';
    el.innerHTML=s;
  }
  function render(){
    if($('t-calc').hidden)return;
    const o=read(),r=X.train(o),m=X.M[o.model],ch=X.C[o.chip];
    $('calc-tmfuv').textContent=Math.round(o.mfu*100)+'%';
    bar(r,$('calc-tbar'));
    $('calc-tleg').innerHTML=COLS.map(c=>'<span><i style="background:'+c[2]+'"></i>'+c[1]+' '+X.fGB(r[c[0]])+'</span>').join('');
    const bad=o.tp*o.pp>o.gpus;
    let out=X.stat('Memory per GPU',X.fGB(r.total),r.fits?'<span class="calc-ok">fits</span> in '+X.sig(r.mem)+' GB':'<span class="calc-no">does not fit</span>: '+X.sig(r.total/r.mem,2)+'x the '+X.sig(r.mem)+' GB');
    out+=X.stat('Training compute',X.fE(r.flops)+' FLOPs',X.fE(r.fl_tok)+' FLOPs per token');
    out+=X.stat('Wall-clock on '+o.gpus.toLocaleString('en-US')+' GPUs',X.fT(r.days*86400),'at '+Math.round(o.mfu*100)+'% MFU');
    out+=X.stat('GPU-hours',X.sig(r.gpuh,3)+' h',ch.price?'cost '+X.fUSD(r.cost)+' at $'+ch.price.toFixed(2)+'/h':'no on-demand price fetched for this chip');
    $('calc-tout').innerHTML=out;
    const dp=r.dp,P=m.P,Pa=m.Pact,rec=X.R[o.recipe],lora=o.recipe==='lora'||o.recipe==='qlora';
    let fx='';
    if(bad)fx+='<p class="calc-no">TP x PP = '+(o.tp*o.pp)+' is more than the '+o.gpus+' GPUs: lower TP or PP.</p>';
    fx+='<b>Memory per GPU.</b> ';
    if(lora)fx+='Frozen base '+X.sig(P/1e9,3)+'B x '+rec.w+' B plus '+X.sig(m.lora/1e6,3)+'M adapter parameters (rank 16 on every attention and MLP projection'+(m.E?'; routed experts left frozen':'')+') at 2 B weight, 2 B gradient and 12 B Adam state each';
    else fx+=X.sig(P/1e9,3)+'B parameters x ('+rec.w+' weights + '+rec.g+' gradients + '+rec.o+' optimizer) = '+(rec.w+rec.g+rec.o)+' B each';
    fx+=', divided by TP x PP = '+(o.tp*o.pp)+(o.zero?' and by the '+dp+' data-parallel copies for every state ZeRO stage '+o.zero+' shards':'')+'. ';
    fx+='Activations: Korthikanti et al. (2022), '+(o.ckpt==='none'?'s b h (34 + 5 a s / h) bytes per layer':o.ckpt==='flash'?'34 s b h bytes per layer (FlashAttention never stores the s x s scores)':'2 s b h per layer (only layer inputs kept) plus one layer\'s 34 s b h while it is recomputed')+', divided by TP (sequence parallelism). This is the GPT-3 approximation (a GPT block with a 4h MLP). Llama-style blocks store more: Llama 3.1\'s reference code, counted on the <a href="https://app.notion.com/p/3c65c17b0d0d81faad1ef390b0e54d08" target="_blank" rel="noopener noreferrer">Performance math</a> page, keeps 49 h bytes per token per layer with FlashAttention plus FP32 logits (4 V bytes per token): 57.1 GB for the 8B at 8,192 tokens, against 36.5 GB from 34 s b h. Treat this figure as a lower estimate for Llama-style models.';
    if(m.E)fx+=' <span class="calc-no">MoE:</span> experts are not split by expert parallelism here, so memory is pessimistic; the <a href="https://app.notion.com/p/3c65c17b0d0d8103a916c4824abbd82e" target="_blank" rel="noopener noreferrer">Distributed Training</a> Layout calculator handles EP.';
    fx+='<br><b>Compute.</b> C = '+(lora?'4':'6')+' x N'+(m.E?'<sub>active</sub>':'')+' x D'+(o.attn&&!lora?' + 12 L H Q T x D':'')+' = '+X.fE(r.flops)+' FLOPs'+(m.E?' (active '+X.sig(Pa/1e9,3)+'B of '+X.sig(P/1e9,3)+'B)':'')+'. ';
    fx+='Time = C / (GPUs x peak x MFU) = '+X.fE(r.flops)+' / ('+o.gpus+' x '+X.sig(ch.peak.bf16,4)+' TFLOP/s x '+o.mfu.toFixed(2)+') = '+X.fT(r.days*86400)+'.';
    if(o.ckpt==='full')fx+=' Full recompute makes the hardware do '+X.sig(r.hfu_ratio,3)+'x these FLOPs: at '+Math.round(o.mfu*100)+'% MFU the hardware FLOPs utilisation is '+Math.round(o.mfu*r.hfu_ratio*100)+'%.';
    if(ch.price)fx+=' Price: '+X.esc(ch.price_src)+', fetched 2026-10-05 (list price; reserved and negotiated prices are far lower).';
    $('calc-tfx').innerHTML=fx;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
