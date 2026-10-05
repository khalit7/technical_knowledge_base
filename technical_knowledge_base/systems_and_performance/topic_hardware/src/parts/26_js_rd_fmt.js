// ---- Reading 4: dense peak TFLOPS per chip in one format (vendor specs, fetched 2026-10-05) ----
(function(){
  const box=document.getElementById('rd-fmt-bars');if(!box)return;
  // null = the vendor lists no figure for this format (no tensor-core path)
  const C=[
    ['A100 SXM',{fp32:19.5,tf32:156,bf16:312,fp8:null,fp4:null}],
    ['H100 SXM',{fp32:67,tf32:494.5,bf16:989.5,fp8:1979,fp4:null}],
    ['B200 (HGX, per GPU)',{fp32:75,tf32:1125,bf16:2250,fp8:4500,fp4:9000}],
    ['RTX 5090',{fp32:104.8,tf32:104.8,bf16:209.5,fp8:419,fp4:1676}],
    ['MI355X',{fp32:157.3,tf32:null,bf16:2516.6,fp8:5033,fp4:10066}],
    ['TPU v6e',{fp32:null,tf32:null,bf16:918,fp8:null,fp4:null}],
    ['TPU7x Ironwood',{fp32:null,tf32:null,bf16:2307,fp8:4614,fp4:null}],
    ['M1 Pro GPU (measured)',{fp32:5.01,tf32:null,bf16:5.06,fp8:null,fp4:null}]];
  const notes={fp32:'Ordinary fp32 lanes, no tensor cores (MI355X: FP32 vector). TPUs list no fp32 peak.',
    tf32:'TF32 tensor-core mode, dense. AMD lists no TF32 figure for MI355X (MI300X had one).',
    bf16:'Dense BF16 tensor throughput; the RTX 5090 figure is with FP32 accumulation (419 with FP16 accumulation). The M1 Pro has no tensor cores: its fp16 rate equals its fp32 rate (bf16 taken equal, see the Roofline lab).',
    fp8:'Dense FP8. Missing bars: no FP8 path listed (A100, TPU v6e) or no hardware FP8 (M1). RTX 5090 with FP32 accumulation.',
    fp4:'Dense FP4 (NVIDIA NVFP4, AMD MXFP4). Only Blackwell-generation NVIDIA parts and MI355X list it here.'};
  const src='Sources: NVIDIA A100, H100, HGX pages; RTX Blackwell whitepaper; AMD MI355X brochure; Google Cloud TPU docs; Roofline lab (M1). All in the Chip atlas.';
  function draw(f){const mx=Math.max(...C.map(c=>c[1][f]||0));
    box.innerHTML=C.map(c=>{const v=c[1][f];return '<div class="row"><span class="nm" title="'+c[0]+'">'+c[0]+'</span><span class="track">'+(v?'<span class="fill" style="width:'+Math.max(.6,100*v/mx).toFixed(1)+'%;background:'+(c[0].indexOf('M1')===0?'var(--c6)':'var(--c1)')+'"></span>':'')+'</span><span class="val">'+(v?v.toLocaleString('en-US')+' TF':'<span class="mute">none</span>')+'</span></div>'}).join('');
    document.getElementById('rd-fmt-note').textContent=notes[f]+' '+src}
  RD.seg(document.getElementById('rd-fmt-mode'),draw);draw('bf16');
})();
