// ---- Reading, Machinery: bytes per parameter for training, fine-tuning and serving (derived; see src/read/recompute.py) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-mm'))return;
  const ROWS=[
    {n:'Full fine-tune or pretrain',s:'bf16 weights and grads, fp32 Adam state',b:16,c:'var(--c2)'},
    {n:'LoRA on a bf16 base',s:'frozen base; adapters left out',b:2,c:'var(--c5)'},
    {n:'QLoRA',s:'NF4 base, double-quantised scales',b:(4+0.127)/8,c:'var(--c3)'},
    {n:'Serve in bf16',s:'weights only',b:2,c:'var(--c1)'},
    {n:'Serve in FP8',s:'weights only',b:1,c:'var(--c1)'},
    {n:'Serve at 4.89 bits',s:'llama.cpp Q4_K_M',b:4.89/8,c:'var(--c1)'}
  ];
  const fmt=g=>g>=1000?(g/1000).toFixed(2)+' TB':g>=100?Math.round(g)+' GB':g.toFixed(1)+' GB';
  function draw(){const N=+$('rd-mmN').value,G=+$('rd-mmG').value,mx=16*N;
    $('rd-mmB').innerHTML=ROWS.map(r=>{const gb=r.b*N,cards=Math.ceil(gb/G);
      const line=G<mx?'<span class="mm-line" style="left:'+(100*G/mx).toFixed(2)+'%" title="'+G+' GB"></span>':'';
      return '<div class="mm-row"><span class="nm">'+r.n+'<small>'+r.s+' · '+(+r.b.toFixed(3))+' B/param</small></span><span class="track"><span class="fill" style="width:'+Math.max(.6,100*gb/mx).toFixed(2)+'%;background:'+r.c+'"></span>'+line+'</span><span class="val">'+fmt(gb)+'<br><span class="mute" style="font-size:11px;white-space:nowrap">'+cards+' × '+G+' GB</span></span></div>'}).join('');
    $('rd-mmNote').innerHTML='<i class="nl d">derived</i> memory = bytes per parameter × '+N+'B, before activations, KV cache and the LoRA adapters; the dashed red line is one '+G+' GB accelerator. '+
      (N===65?'At 65B this reproduces QLoRA\'s arithmetic, not its measurement: 0.516 bytes per parameter (4-bit NF4 plus 0.127 bits of quantised constants) gives 33.5 GB, and the paper measured 45.0 GB at batch 1 once adapters, optimiser and activations are added. Its "more than 780 GB" for 16-bit fine-tuning is 780 / 65 = 12 bytes per parameter, which fits 16-bit weights and gradients with fp32 Adam moments but no fp32 master copy (our reading; the paper does not itemise it); the 16 bytes used here give 1,040 GB ({{QLoRA|n:3c65c17b0d0d815a8f4edc33f9583671}}).':
       'Bytes per parameter: {{ZeRO|n:3c65c17b0d0d81879a7ed90bca007699}} (16), {{QLoRA|n:3c65c17b0d0d815a8f4edc33f9583671}} (NF4 with double quantisation), <a href="https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md" target="_blank" rel="noopener noreferrer">llama.cpp</a> (Q4_K_M, measured on Llama-3.1-8B).')}
  $('rd-mmN').addEventListener('change',draw);$('rd-mmG').addEventListener('change',draw);
  RD.onRender(draw);draw();
})();
