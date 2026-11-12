// ---- Reading tab, section 7: peak memory per rank, DDP against FSDP2, from the Distributed lab's records (Fig. 4) ----
// The DDP against FSDP2 rank stepper that stood here was retired on 2026-11-12: Distributed PyTorch's Figs. 1 to 3 step the same
// recorded collectives; section 7's prose keeps the root's own recorded facts (bucket sizes, 14 collectives, the losses).
(function(){
  const D=window.RDD&&window.RDD.dist;if(!D)return;
  // memory per rank
  const mb=document.getElementById('rd-dst-mem');
  if(mb){const rows=[['DDP, 2 or 4 ranks','ddp_w2'],['FSDP2, 2 ranks','fsdp_w2'],['FSDP2, 4 ranks','fsdp_w4'],['FSDP2, 2 ranks, no reshard','fsdp_w2_nr'],['Bigger model: DDP','ddp_w2_big'],['Bigger model: FSDP2, 2 ranks','fsdp_w2_big'],['Bigger model: FSDP2, 4 ranks','fsdp_w4_big']];
    mb.innerHTML=rows.map(([n,k],j)=>{const m=D.mem[k],mx=j<4?D.mem.ddp_w2.total:D.mem.ddp_w2_big.total;
      return '<div class="row"><div class="nm">'+n+'</div><div class="track"><div class="fill" style="width:'+(100*m.persistent/mx).toFixed(1)+'%;background:var(--c1)"></div><div class="fill" style="left:'+(100*m.persistent/mx).toFixed(1)+'%;width:'+(100*m.peak_delta/mx).toFixed(1)+'%;background:var(--c2)"></div></div><div class="val">'+(m.total/1e6).toFixed(1)+' MB</div></div>'}).join('')+
      '<div class="leg"><span style="--sw:var(--c1)">weights, AdamW state, buckets</span><span style="--sw:var(--c2)">peak of activations and temporaries during the step</span></div>'}
})();
