// ---- Reading: one sparkline per schedule in the shapes table (T = 100 steps, LR as a share of the peak) ----
// The torch.optim.lr_scheduler ones are checked against PyTorch by checks/sched_check.py.
(function(G){
  const T=100;
  const SH={
    constant:t=>t<5?(t+1)/5:1,
    step:t=>t<50?1:t<75?0.1:0.01,                                  // MultiStepLR(milestones=[50,75], gamma=0.1)
    exp:t=>Math.pow(0.97,t),                                        // ExponentialLR(gamma=0.97)
    invsqrt:t=>{const s=t+1,w=10;return Math.min(Math.pow(s,-0.5),s*Math.pow(w,-1.5))*Math.sqrt(w)}, // Transformer Eq. 3, warmup 10, peak scaled to 1
    linear:t=>1-t/T,                                                // LinearLR(start_factor=1, end_factor=0, total_iters=100)
    cosine:t=>0.5*(1+Math.cos(Math.PI*t/T)),                        // CosineAnnealingLR(T_max=100, eta_min=0)
    warmcos:t=>t<5?(t+1)/5:0.1+0.9*0.5*(1+Math.cos(Math.PI*(t-5)/(T-5))), // warmup 5, cosine to 10%
    sgdr:t=>0.5*(1+Math.cos(Math.PI*(t%25)/25)),                    // CosineAnnealingWarmRestarts(T_0=25)
    onecycle:t=>{const up=0.3*T-1,mx=1,init=mx/25,fin=init/1e4;const ca=(a,b,p)=>b+(a-b)/2*(Math.cos(Math.PI*p)+1);
      return t<=up?ca(init,mx,t/up):ca(mx,fin,(t-up)/(T-1-up))},     // OneCycleLR(max_lr=1, total_steps=100), cosine anneal
    plateau:t=>t<40?1:t<70?0.5:0.25,                                 // illustrative: halves when a metric stalls at 40 and 70
    wsd:t=>t<5?(t+1)/5:t<80?1:1-Math.sqrt((t-80)/20),                // warmup 5, stable, 1-sqrt cooldown over the last 20%
    sf:t=>t<5?(t+1)/5:1,                                             // schedule-free: warmup then constant (averaging does the rest)
    wsm:t=>t<5?(t+1)/5:1                                             // WSM: constant forever; the decay is emulated by merging
  };
  G.SCHED_SHAPES=SH;
  if(typeof document==='undefined')return;
  document.querySelectorAll('svg.spark[data-s]').forEach(svg=>{const f=SH[svg.dataset.s];if(!f)return;const W=96,H=30;let mx=0;const v=[];for(let t=0;t<T;t++){v.push(f(t));mx=Math.max(mx,f(t))}
    const d=v.map((y,t)=>(t?'L':'M')+(2+t/(T-1)*(W-4)).toFixed(1)+','+(H-3-(y/mx)*(H-6)).toFixed(1)).join('');
    svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.innerHTML='<line class="ax" x1="2" x2="'+(W-2)+'" y1="'+(H-3)+'" y2="'+(H-3)+'"/><path d="'+d+'"/>'});
})(typeof window!=='undefined'?window:globalThis);
