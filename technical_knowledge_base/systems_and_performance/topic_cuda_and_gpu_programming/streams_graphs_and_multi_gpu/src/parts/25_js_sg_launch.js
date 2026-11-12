// ---- Launch overhead with and without a CUDA graph: 20 kernels, values fitted to NVIDIA's 2019 post ----
window.SGL=(function(){
  // returns events [lane, start, end, label] in microseconds for n kernels
  function model(mode,B){const n=B.n,K=B.kernel,L=B.launch_cpu,Sy=B.sync_cost,G=B.graph_gap,ev=[];let t=0;
    if(mode==='sync'){for(let k=0;k<n;k++){ev.push(['cpu',t,t+L,'launch']);ev.push(['gpu',t+L,t+L+K,'k'+(k+1)]);ev.push(['wait',t+L,t+L+K+Sy,'wait']);t=t+L+K+Sy}}
    else if(mode==='stream'){let g=0;for(let k=0;k<n;k++){ev.push(['cpu',k*L,(k+1)*L,'launch']);const s=Math.max((k+1)*L,g);g=s+K;ev.push(['gpu',s,g,'k'+(k+1)])}ev.push(['wait',n*L,g,'wait']);t=g}
    else{ev.push(['cpu',0,L,'graph launch']);let g=L;for(let k=0;k<n;k++){const s=g+(k?G:0);g=s+K;ev.push(['gpu',s,g,'k'+(k+1)])}ev.push(['wait',L,g,'wait']);t=g}
    return {ev,total:t};
  }
  // steady state over many steps: what NVIDIA's per-kernel figures measure
  function steady(mode,B){return mode==='sync'?B.launch_cpu+B.kernel+B.sync_cost:mode==='stream'?Math.max(B.launch_cpu,B.kernel):B.kernel+B.graph_gap}
  return {model,steady};
})();
// The animation that drew this model moved to the 3D stage Fig. 2 (41_js_sc_launch.js) on 2026-11-12.
