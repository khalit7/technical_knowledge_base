// ---- Reading section 5: the crossover cost model and the measured server runs (was the Batch crossover lab tab until 2026-10-23) ----
(function(){
  const D=SD.D,X=D.xover;if(!document.getElementById('sdx-svg')||!D.cost||!D.cost.q4b)return;
  const $=id=>document.getElementById(id);
  const CTX=[256,512,1024,2048,4096,8192,16384,32768];
  let hw='m1',pre=X?'d3':null;
  const t11=()=>SD.m1t(1,'q4b');
  function tT(B,n){return hw==='m1'?SD.m1t(B*n,'q4b'):SD.h100t(B,n,CTX[+$('sdx-ctx').value])}
  function tD(B,c){return hw==='m1'?c*t11()*SD.m1t(B,'q06')/SD.m1t(1,'q06'):c*SD.h100t(B,1,CTX[+$('sdx-ctx').value])}
  function sp(B,a,k,c,L){const e=L||SD.etok(a,k);return e*tT(B,1)/(k*tD(B,c)+tT(B,k+1))}
  const solveA=(L,k)=>{let lo=0,hi=0.9999;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(SD.etok(m,k)<L)lo=m;else hi=m}return (lo+hi)/2};
  const presets=X?X.presets:{};
  function setPre(m){pre=m;const p=presets[m];if(!p)return;$('sdx-k').value=p.k;$('sdx-a').value=Math.min(0.95,solveA(p.L,p.k)).toFixed(2);if(hw==='m1')$('sdx-c').value=D.facts.cDraft;draw()}
  function draw(){const a=+$('sdx-a').value,k=+$('sdx-k').value,c=+$('sdx-c').value;
    $('sdx-av').textContent=SD.fmt(a,2)+' ('+SD.fmt(SD.etok(a,k),2)+' tokens per step)';$('sdx-kv').textContent=k;$('sdx-cv').textContent=SD.fmt(c,2);$('sdx-ctxv').textContent=CTX[+$('sdx-ctx').value].toLocaleString('en-GB');
    $('sdx-ctxl').style.display=hw==='h100'?'':'none';
    const Bs=hw==='m1'?[1,2,3,4,6,8,12,16,24,32]:[1,2,4,8,16,32,64,128,256,512];
    const pts=Bs.map(B=>[B,sp(B,a,k,c)]);
    const series=[{pts,color:'var(--c1)',label:'model with the settings above',w:2.4}];
    if(hw==='m1'&&X&&pre&&X.ratio[pre])series.push({pts:X.Bs.map(B=>[B,X.ratio[pre][B].mean]),err:X.Bs.map(B=>[B,X.ratio[pre][B].lo,X.ratio[pre][B].hi]),color:'var(--c2)',dots:true,nolines:false,dash:'2 3',label:'measured: '+presets[pre].label});
    SD.chart($('sdx-svg'),{series,xlog:true,xticks:Bs,xmin:Bs[0],xmax:Bs[Bs.length-1],ymin:0,ymax:Math.max(1.5,...series.flatMap(s=>s.pts.map(p=>p[1])))*1.05,hline:{y:1,label:'no gain'},xlab:'sequences in the batch (B)',ylab:'speed-up over no speculation',legend:true,aria:'speed-up against batch size'});
    let cross=null;for(let B=1;B<=(hw==='m1'?64:1024);B++){if(sp(B,a,k,c)<1){cross=B;break}}
    $('sdx-stats').innerHTML=RD.stat('Speed-up at B = 1',SD.fmt(sp(1,a,k,c),2)+'x')+RD.stat('At B = '+(hw==='m1'?8:64),SD.fmt(sp(hw==='m1'?8:64,a,k,c),2)+'x')+RD.stat('Crossover (first B below 1x)',cross?String(cross):'none up to '+(hw==='m1'?64:1024))+RD.stat('Verify cost t(1, k+1) / t(1, 1)',SD.fmt(tT(1,k+1)/tT(1,1),2)+'x');
    $('sdx-note').innerHTML=hw==='m1'?'<span class="meas">measured inputs</span> t(B, n) is the measured Qwen3-4B Q4_K_M pass time over B &times; n tokens (llama-bench, depth 512; attention over each sequence\'s own short context is not modelled separately); the draft\'s pass time grows with B along the measured Qwen3-0.6B curve, scaled by the draft-cost slider (measured c = '+D.facts.cDraft+'). The dots are real server runs. '+((X&&pre&&X.ratio[pre])?('<b>Does not reproduce them:</b> with this preset the model gives '+SD.fmt(sp(1,+$('sdx-a').value,+$('sdx-k').value,+$('sdx-c').value),2)+'x at 1 user and '+SD.fmt(sp(16,+$('sdx-a').value,+$('sdx-k').value,+$('sdx-c').value),2)+'x at 16, the server measured '+SD.fmt(X.ratio[pre][1].mean,2)+'x and '+SD.fmt(X.ratio[pre][16].mean,2)+'x. A pass-time curve of one sequence leaves out what llama-server adds to each speculative step (drafting each slot on the host side, per-slot acceptance and rollback, checkpoints) and how a batch of several sequences is laid out, so read the model for shape, not for the laptop\'s absolute numbers.'):'')
      :'<span class="der">derived</span> t(B, n) = max((weights + B &times; context &times; KV bytes per token) / (0.8 &times; 3.35 TB/s), B &times; n &times; FLOPs per token / (0.345 &times; 1,979 TFLOP/s)) + 2.5 ms for Llama 3.1 8B FP8 weights and a BF16 KV cache on one H100 (the parent\'s Capacity planner constants); the draft costs the slider fraction of a one-token target pass at the same B. Not run here. Move the context length: at long context the KV read keeps large batches memory-bound, so the crossover moves out (the MagicDec argument).';
  }
  SD.segs($('sdx-hw'),[['m1','M1 Pro, Qwen3-4B (measured curve)'],['h100','H100, Llama 3.1 8B FP8 (derived)']],'m1',m=>{hw=m;if(m==='h100'){$('sdx-c').value=0.05}else if(pre)setPre(pre);draw()});
  if(X)SD.segs($('sdx-pre'),Object.keys(presets).map(p=>[p,'Preset: '+presets[p].label]),pre,setPre);
  ['sdx-a','sdx-k','sdx-c','sdx-ctx'].forEach(id=>$(id).addEventListener('input',draw));
  // measured runs: aggregate and per-user throughput
  let mm='agg';
  function mdraw(){if(!X)return;const cf=X.cfgs,Bs=X.Bs;
    const col={base:'var(--ink)',d3:'var(--c1)',d6:'var(--c4)',s15:'var(--bad)',s25:'var(--c3)',s35:'var(--c6)',s45:'var(--c2)'};
    SD.chart($('sdx-msvg'),{series:cf.filter(k=>X.abs[k]).map(k=>({pts:Bs.map(B=>[B,X.abs[k][B][mm]]),color:col[k]||'var(--mute)',dots:true,label:X.label[k],dash:k[0]==='s'?'5 3':''})),
      xlog:true,xticks:Bs,xmin:Bs[0],xmax:Bs[Bs.length-1],ymin:0,xlab:'concurrent users',ylab:mm==='agg'?'total tokens/s':'tokens/s per user',legend:true,aria:'measured throughput'});
    $('sdx-tbl').innerHTML='<thead><tr><th>Configuration</th>'+Bs.map(B=>'<th class="num">B = '+B+'</th>').join('')+'</tr></thead><tbody>'+cf.filter(k=>X.abs[k]).map(k=>'<tr><td>'+X.label[k]+'</td>'+Bs.map(B=>{const r=X.abs[k][B];return '<td class="num">'+SD.fmt(r.agg,0)+(k==='base'?'':' <span class="mute">('+SD.fmt(X.ratio[k][B].mean,2)+'x)</span>')+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
    $('sdx-mnote').innerHTML='<span class="meas">measured here</span> Table: total tokens per second (mean of 2 repetitions) and, in brackets, the ratio to no draft at the same B. '+D.facts.xLoad;
  }
  if(X)SD.segs($('sdx-mm'),[['agg','Total tokens/s'],['user','Tokens/s per user']],'agg',m=>{mm=m;mdraw()});
  RD.onRender(()=>{draw();mdraw()});RD.onResize(()=>{draw();mdraw()});
  const det=$('sdx-msvg').closest('details');if(det)det.addEventListener('toggle',()=>{if(det.open)mdraw()});
  if(X&&pre)setPre(pre);else draw();mdraw();
})();
