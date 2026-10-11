// ---- Reading section 1: time of one forward pass against tokens in it (M1 measured; H100 derived) ----
(function(){
  const D=SD.D,H=D.h100;
  // derived step time on one H100 for B sequences, n tokens each, context ctx (the parent's Capacity planner constants)
  SD.h100t=function(B,n,ctx){
    const bytes=H.wbytes+B*ctx*H.kvtok, flops=B*n*(2*H.params+2*H.nh*(H.dqk+H.dv)*H.L*ctx);
    const tm=bytes/(H.bw*1e9*H.eff_m), tc=flops/(H.peak*1e12*H.eff_c);
    return 1000*(Math.max(tm,tc))+H.tovh;
  };
  // measured M1 pass time (ms) for n tokens, interpolated on the llama-bench grid
  SD.m1t=function(n,which){const c=D.cost[which||'q4b'];if(n<=c[0][0])return c[0][1];
    for(let i=1;i<c.length;i++)if(n<=c[i][0]){const a=c[i-1],b=c[i];return a[1]+(b[1]-a[1])*(n-a[0])/(b[0]-a[0])}
    const a=c[c.length-1];return a[1]*n/a[0]};
  const el=document.getElementById('sd-cost-svg'),note=document.getElementById('sd-cost-note');if(!el||!D.cost||!D.cost.q4b)return;
  let mode='m1';
  function draw(){
    if(mode!=='h100'){const c=D.cost[mode==='m1'?'q4b':'q17'],nm=mode==='m1'?'Qwen3-4B Q4_K_M':'Qwen3-1.7B Q8_0';
      SD.chart(el,{series:[{pts:c.map(r=>[r[0],r[1]]),color:'var(--c1)',dots:true,label:nm+', one pass over n tokens'},
        {pts:c.map(r=>[r[0],c[0][1]*r[0]]),color:'var(--mute)',dash:'4 4',w:1.2,label:'n separate one-token passes'}],
        xlog:true,ylog:true,xmin:1,xmax:512,ymin:Math.min(...c.map(r=>r[1]))*0.8,ymax:c[0][1]*600,xticks:[1,2,4,8,16,32,64,128,256,512],
        xlab:'tokens in the pass (n)',ylab:'ms per pass',legend:true,aria:'pass time against tokens, M1, '+nm});
      note.innerHTML='<span class="meas">measured here</span> llama-bench (llama.cpp b11146, Metal, flash attention on) prompt processing of n tokens at a depth of 512 tokens, 5 repetitions each; M1 Pro 16-core GPU. '+(mode==='m1'?D.facts.costNote:D.facts.costNote17);
    }else{const ns=[1,2,3,4,5,6,8,12,16,24,32,48,64,96,128,192,256,384,512];
      SD.chart(el,{series:[{pts:ns.map(n=>[n,SD.h100t(1,n,1024)]),color:'var(--c2)',label:'Llama 3.1 8B FP8 on one H100, context 1,024 (derived)'},
        {pts:ns.map(n=>[n,SD.h100t(1,1,1024)*n]),color:'var(--mute)',dash:'4 4',w:1.2,label:'n separate one-token passes'}],
        xlog:true,ylog:true,xmin:1,xmax:512,ymin:3,ymax:4000,xticks:[1,2,4,8,16,32,64,128,256,512],xlab:'tokens in the pass (n)',ylab:'ms per pass',legend:true,aria:'pass time against tokens, H100 derived'});
      note.innerHTML='<span class="der">derived</span> step = max(bytes / (0.8 &times; 3.35 TB/s), FLOPs / (0.345 &times; 1,979 TFLOP/s)) + 2.5 ms, the parent\'s @@CAPP@@ constants calibrated on MLPerf vLLM runs on H100 (weights '+SD.fmt(H.wbytes/1e9,2)+' GB, KV '+SD.fmt(H.kvtok/1024)+' KiB per token). Not run here.';
      note.innerHTML=note.innerHTML.replace('@@CAPP@@','<a href="https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13" target="_blank" rel="noopener noreferrer">Capacity planner</a>');
    }
  }
  SD.segs(document.getElementById('sd-cost-mode'),[['m1','M1 Pro, Qwen3-4B Q4_K_M (measured)'],['m17','M1 Pro, Qwen3-1.7B Q8_0 (measured)'],['h100','H100, Llama 3.1 8B FP8 (derived)']],'m1',m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
