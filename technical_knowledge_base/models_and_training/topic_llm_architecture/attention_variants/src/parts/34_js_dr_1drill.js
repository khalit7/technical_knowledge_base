// Design drill: seven questions; reveals computed with the Cache ladder's arithmetic (AVLC) or read from recorded data (AVR, AVK).
(function(){
  if(!window.AVL||!window.AVLC||!document.getElementById('dr-list'))return;
  const $=id=>document.getElementById(id),C=window.AVLC,A=window.AVR||{},K=window.AVK||{};
  const GiB=b=>(b/1024**3).toFixed(1)+' GiB',KiB=b=>(b/1024).toFixed(1)+' KiB';
  const attn=(n,nq,nkv,hd,win)=>({name:'',groups:[{n,kind:'attn',nq,nkv,hd,win:win||0}]});
  const rung=id=>window.AVL.rungs.find(r=>r.id===id);
  const run=n=>A.runs&&A.runs[n];
  const Q=[
   {t:'Fit 128K-token requests on one node',q:'A dense model at Llama 3.1 70B\'s shape (80 layers, 64 query heads of 128, weights 141 GB in bf16) must serve 16 concurrent requests of 128K tokens on 8 x 80 GB GPUs. Which attention fits?',
    o:[['MHA (64 KV heads), bf16 cache',0],['GQA-8, bf16 cache',0],['GQA-8 with an FP8 cache, or an MLA-style 576-number latent',1]],
    a:()=>{const L=131072,B=16,w=141e9,cap=640e9;const r=[['MHA',attn(80,64,64,128),2],['GQA-8 bf16',attn(80,64,8,128),2],['GQA-8 FP8',attn(80,64,8,128),1],['MLA 512+64',{groups:[{n:80,kind:'mla',nq:64,dc:512,dr:64,idx_dim:0,topk:0}]},2]];
      return '<div class="tw"><table><thead><tr><th>Design</th><th class="num">per token</th><th class="num">x 128K x 16</th><th>fits beside 141 GB of weights in 640 GB?</th></tr></thead><tbody>'+r.map(([n,s,b])=>{const x=C.rung(s,L,b);const tot=x.storeBytes*B;return '<tr><td>'+n+'</td><td class="num">'+KiB(x.perToken)+'</td><td class="num">'+GiB(tot)+'</td><td>'+(tot+w<cap?'yes, '+((cap-w-tot)/1e9).toFixed(0)+' GB spare':'no')+'</td></tr>'}).join('')+'</tbody></table></div><p>GQA-8 alone needs exactly the whole node for the cache. Halving the bytes (FP8) or storing a latent fits; activations and fragmentation need some of the spare (see Batching, KV cache and scheduling).</p>'}},
   {t:'Is DSA worth it for a chat product?',q:'Conversations are 2K to 8K tokens. A colleague proposes adding a DSA-style indexer (128-number keys, top 2,048) to your MLA model. What happens to memory and reads per decoded token at 4,096 tokens?',
    o:[['Memory and reads both fall a lot',0],['Memory rises; reads fall by about a quarter',1],['Nothing changes at all',0]],
    a:()=>{const L=4096,a=C.rung(rung('dsv3'),L,2),b=C.rung(rung('dsv32'),L,2),L2=131072,a2=C.rung(rung('dsv3'),L2,2),b2=C.rung(rung('dsv32'),L2,2);
      return '<p>At 4,096 tokens (DeepSeek-V3 against V3.2 shapes, bf16): held '+C.fmtB(a.storeBytes)+' to '+C.fmtB(b.storeBytes)+' (+'+Math.round(100*(b.storeBytes/a.storeBytes-1))+'%), read per decoded token '+(a.readBytes/2**20).toFixed(0)+' to '+(b.readBytes/2**20).toFixed(0)+' MiB ('+Math.round(100*b.readBytes/a.readBytes)+'%). At 128K the read falls to '+Math.round(100*b2.readBytes/a2.readBytes)+'%. Below 2,048 tokens it reads everything. For short conversations the indexer is cost without benefit; it pays at long context.</p>'}},
   {t:'Stream an existing model with a fixed cache',q:'You must run a pretrained full-attention model (SmolLM2-135M) on endless input with a fixed cache of 64 recent tokens per layer, no retraining. What do you keep?',
    o:[['The last 64 tokens only',0],['The last 64 and the first token (a sink)',1],['A random 64',0]],
    a:()=>'<p>Measured by the root\'s Inside lab, mean loss past token 64 on 1,024 TinyStories tokens: full cache 1.62, last 64 only 3.36, last 64 plus the first token 1.81 (plus the first four: 1.81). The first token is the model\'s attention sink; StreamingLLM keeps four. It stays fluent but forgets anything older than the window; for recall, see eviction by score on Long context.</p>'},
   {t:'Make an MHA model cheaper to serve, this month',q:'You own a trained MHA model and need a 4x smaller cache. Training budget: a few percent of the original run. Which plan?',
    o:[['Average KV heads into GQA-2 and ship',0],['Average into GQA-2, then uptrain about 5%',1],['Train GQA-2 from scratch',0]],
    a:()=>{const U=A.uptrain;const kr=A.kv_rank;if(!U||!kr)return '<p>pending</p>';const g2=U.rows.find(r=>r.kv_heads===2);const u=s=>g2.uptrain.find(x=>x.steps===s);
      return '<p>The tiny GPT (held-out 2.137): averaged GQA-2 '+g2.converted_no_training.toFixed(3)+'; after 75 uptraining steps (5%) '+u(75).held_out_20win.toFixed(3)+(u(150)?'; 150 steps '+u(150).held_out_20win.toFixed(3):'')+'; trained from scratch for 1,500 steps '+(run('at_gqa2')?run('at_gqa2').val_loss_20win.toFixed(3):'')+'. <span class="meas">measured</span> Uptraining recovers most of the loss for a twentieth of the cost of training again, but here not all of it; the GQA paper, at T5-XXL scale with 5%, came within 0.1 of MHA\'s average. Plan for a quality check, and for FP8 KV quantisation as the no-training alternative.</p>'}},
   {t:'Pick the window for local layers',q:'Your small model will use all-local layers to bound memory. Training context 256, 6 layers. The tiny GPT\'s sweep: which window is the smallest that stays within seed noise (0.016) of full attention?',
    o:[['16',0],['32',0],['64',1],['128',0]],
    a:()=>{const S=A.window_sweep;if(!S)return '<p>pending</p>';const tr=S.filter(r=>r.served==='as trained'&&!r.global_every);const full=tr.find(r=>!r.trained_window);
      return '<p>Held-out loss on 192 windows: '+tr.map(r=>(r.trained_window?'W '+r.trained_window:'full')+' '+r.loss_all.toFixed(3)).join(', ')+'. <span class="meas">measured</span> A window a quarter of the training length is enough here because TinyStories is mostly local; real models keep global layers for long-range recall.</p>'}},
   {t:'1M-token context: what to store',q:'You design a model for 1M-token contexts. Per sequence, at 1M tokens in bf16, which of these holds the smallest cache?',
    o:[['Gemma 3 27B style: 5 local (1,024) : 1 global',0],['DeepSeek-V3.2 style: MLA + DSA',0],['DeepSeek-V4-Pro style: compressed entries',1]],
    a:()=>{const L=1048576;const xs=['gemma3','dsv3','dsv32','dsv4','qwen3next'].map(id=>[rung(id).name,C.rung(rung(id),L,2)]);
      return '<div class="tw"><table><thead><tr><th>At 1,048,576 tokens</th><th class="num">held</th><th class="num">read per decoded token</th></tr></thead><tbody>'+xs.map(([n,x])=>'<tr><td>'+n+'</td><td class="num">'+C.fmtB(x.storeBytes)+'</td><td class="num">'+C.fmtB(x.readBytes)+'</td></tr>').join('')+'</tbody></table></div><p>Without sparsity a decoded token reads the whole cache, tens of GiB per token at 1M; compression stores least; DSA stores everything and reads a fifth as much as V3; the interleave holds its global layers in full. Memory is not quality: what each can recall at 1M is the question of Long context (effective context).</p>'}},
   {t:'Instability and outliers',q:'Training diverges at high learning rates and int4 quantisation breaks on a few huge activations. Which attention change is reported to help both?',
    o:[['More KV heads',0],['A sigmoid gate on each head\'s output',1],['A smaller sliding window',0]],
    a:()=>{const g=run('av_gate'),m=run('at_mha'),g1=run('av_gate_s1'),m1=run('at_mha_s1');
      return '<p>Qiu et al. (Qwen team): the output gate cut the largest hidden activation from 1,053 to 94 and trained a 48-layer model at a learning rate where the baseline diverged; Qwen3-Next and Qwen3.5 ship it. <span class="vend">authors</span>'+(g&&m?' On the tiny GPT the gate also lowered held-out loss: '+g.val_loss_100win.toFixed(3)+' against '+m.val_loss_100win.toFixed(3)+(g1&&m1?' (seed 1: '+g1.val_loss_100win.toFixed(3)+' against '+m1.val_loss_100win.toFixed(3)+')':'')+'. <span class="meas">measured</span>':'')+'</p>'}}
  ];
  let right=0,answered=0;
  function init(){if($('dr-list').dataset.on)return;$('dr-list').dataset.on=1;
    $('dr-list').innerHTML=Q.map((x,i)=>'<div class="dr" id="dr-'+i+'"><h3>'+(i+1)+'. '+x.t+'</h3><div class="q">'+x.q+'</div><div class="opts">'+x.o.map(([t,ok])=>'<button data-ok="'+ok+'">'+t+'</button>').join('')+'<button data-ok="skip">Skip: show me</button></div><div class="ans" hidden></div></div>').join('');
    Q.forEach((x,i)=>{const el=$('dr-'+i);el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      const first=el.querySelector('.ans').hidden;
      el.querySelectorAll('.opts button').forEach(y=>{if(y.dataset.ok!=='skip')y.classList.add(y.dataset.ok==='1'?'right':'wrong')});
      const a=el.querySelector('.ans');a.hidden=false;a.innerHTML=x.a();
      if(first){answered++;if(b.dataset.ok==='1')right++;$('dr-score').textContent=right+' of '+answered+' answered right so far.'}})});
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-drill']=window.TAB_RENDER['t-drill']||[]).push(init);
})();
