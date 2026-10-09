// ---- Reading section 4: reload a cached prefix from a slower tier, or recompute it? ----
(function(){
  const sel=document.getElementById('bk-rl-m');if(!sel)return;
  // prefill seconds per token and KV bytes per token; sources in the note line
  const M=[
    {k:'l70',nm:'Llama 3.1 70B on one H200',pf:0.4235/2000,kv:327680,src:'FP8 weights, BF16 cache; prefill 2,000 tokens in 423.5 ms: the parent\'s Capacity planner (derived, calibrated on MLPerf)'},
    {k:'l8',nm:'Llama 3.1 8B on one H100',pf:2*7504658432/(989.5e12*0.5),kv:131072,src:'BF16 weights and cache; prefill = 2 x 7.50 billion matmul parameters / (989.5 TFLOP/s x 0.50), the Serving simulator\'s fitted compute efficiency (derived)'},
    {k:'q17',nm:'Qwen3-1.7B on the M1 Pro',pf:1/1182,kv:114688,src:'Q4_K_M weights, F16 cache; prefill 1,182 tokens/s, llama-bench pp512 on the parent\'s Engine bench (measured here)'}];
  const L=[['PCIe Gen4 x16, host memory',32e9],['PCIe Gen5 x16, host memory',64e9],['GH200 NVLink-C2C, host memory',450e9],['400 Gb/s network card, remote memory',50e9],['SSD at 5.76 GB/s (the M1\'s, measured)',5.76e9]];
  M.forEach(m=>{const o=document.createElement('option');o.value=m.k;o.textContent=m.nm;sel.appendChild(o)});
  const nSel=document.getElementById('bk-rl-n'),bars=document.getElementById('bk-rl-bars');
  const fmt=s=>s>=1?s.toFixed(2)+' s':s>=1e-3?(s*1e3).toFixed(s>=0.1?0:1)+' ms':(s*1e6).toFixed(0)+' us';
  function draw(){
    const m=M.find(x=>x.k===sel.value),n=+nSel.value,rec=m.pf*n;
    const rows=[['Recompute (prefill)',rec,'var(--c2)']].concat(L.map(l=>[l[0],m.kv*n/l[1],'var(--good)']));
    const mx=Math.max(...rows.map(r=>r[1]));
    bars.innerHTML=rows.map(r=>'<div class="row"><div class="nm">'+r[0]+'</div><div class="track"><div class="fill" style="width:'+Math.max(0.5,100*r[1]/mx).toFixed(2)+'%;background:'+r[2]+'"></div></div><div class="val">'+fmt(r[1])+(r[0].startsWith('Re')?'':'<span class="ml">'+(rec/r[1]).toFixed(rec/r[1]>=10?0:1)+'x faster</span>')+'</div></div>').join('');
    document.getElementById('bk-rl-note').innerHTML='<span class="der">derived</span>: reload = '+(m.kv).toLocaleString('en-US')+' bytes per token x '+n.toLocaleString('en-US')+' tokens / link bandwidth (one direction, no overlap, no per-transfer overhead); recompute = '+(m.pf*1e3).toFixed(3)+' ms per token x tokens, ignoring the extra attention cost of long prefixes (which favours reloading further). Prefill source: '+m.src+'. Links, one direction: PCIe Gen4 x16 32 GB/s and Gen5 x16 64 GB/s (half the 64 and 128 GB/s two-way figures vendors print), NVLink-C2C 450 GB/s (half of NVIDIA\'s 900 GB/s), a 400 Gb/s card 50 GB/s; SSD measured on <a href="https://app.notion.com/p/3f05c17b0d0d818ab063e327e3d7009f" target="_blank" rel="noopener noreferrer">Memory technology</a>.';
  }
  sel.addEventListener('change',draw);nSel.addEventListener('change',draw);draw();
})();
