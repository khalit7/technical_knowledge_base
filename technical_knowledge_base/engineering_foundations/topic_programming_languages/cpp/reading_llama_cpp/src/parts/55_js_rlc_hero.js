// ---- Hero: the path of one decoded token down the layers of llama.cpp, each with its file and what was counted there (all numbers from window.CL) ----
(function(){
  const X=window.CLX,CL=X.CL,esc=X.esc,fmt=X.fmt;
  if(!CL.v||!document.getElementById('rlc-hero'))return;const v=CL.v;
  const ROWS=[
    ['--c5','Your program','examples/simple/simple.cpp','Puts the token in a batch at the next position and calls llama_process.',fmt(v.tg_ms_tok,2)+' ms per token, everything below included'],
    ['--c1','libllama','src/llama-context.cpp','Finds a KV cell; the graph has the same shapes as last time, so only the inputs are written.',fmt(v.nodes,0)+' nodes, built for the prompt and the first token, then reused '+v.graphs_reused+' times'],
    ['--c3','ggml: graph, memory, scheduler','ggml-alloc.c, ggml-backend.cpp','One planned buffer holds every intermediate; the whole graph is one split on the CPU backend.',fmt(v.compute_mib,1)+' MiB compute buffer for '+fmt(v.nodes,0)+' nodes'],
    ['--c2','CPU backend: the thread pool','ggml-cpu/ggml-cpu.c','4 threads walk every node and meet at a barrier after each real operation.',fmt(v.real_ops,0)+' real operations, the rest are free views'],
    ['--c2','Matrix products','ggml-cpu/repack.cpp','Each product quantises its input row to Q8_0 and cuts the weight rows into 16 chunks, taken from an atomic counter.',v.n_mulmat+' products x 16 chunks = '+fmt(v.gemv_tok,0)+' kernel calls'],
    ['--acc','The kernel that runs','arch/arm/repack.cpp: ggml_gemv_q8_0_4x4_q8_0','SDOT instructions over four interleaved rows of weights repacked at load.','every weight read once: about 143 MB per token'],
    ['--c1','Back up in libllama','src/llama-sampler.cpp','49,152 logits are copied out of the graph; the greedy sampler takes the largest.','the first one sampled here was " Paris"']];
  function wrap(t,n){const w=t.split(' '),L=[];let c='';w.forEach(x=>{if((c+' '+x).trim().length>n&&c){L.push(c);c=x}else c=(c+' '+x).trim()});if(c)L.push(c);return L}
  function draw(){const el=document.getElementById('rlc-hero');const W=X.width(el),narrow=W<560;
    const G=26,bx=G,bw=W-G-2,cw=6.3,n=Math.max(24,Math.floor((bw-16)/cw));let y=4,b='';const mids=[];
    ROWS.forEach((r,i)=>{const hot=r[0]==='--acc';const head=narrow?[r[1]]:[r[1]+'   '+r[2]];
      const lines=[].concat(narrow?[r[2]]:[],wrap(r[3],n)),meas=wrap(r[4],n);
      const h=10+16+lines.length*15+meas.length*15+4;
      b+='<rect x="'+bx+'" y="'+y+'" width="'+bw+'" height="'+h+'" rx="7" fill="'+X.css(hot?'--acc2':'--bg')+'" stroke="'+X.css(r[0])+'" stroke-width="'+(hot?2.2:1.2)+'"></rect>';
      let ty=y+19;b+='<text x="'+(bx+8)+'" y="'+ty+'" font-size="12.5" font-weight="700" fill="'+X.css(hot?'--acc':'--ink')+'">'+esc(r[1])+(narrow?'':'<tspan font-weight="400" font-family="ui-monospace,Menlo,monospace" font-size="11.5" fill="'+X.css('--mute')+'">   '+esc(r[2])+'</tspan>')+'</text>';
      lines.forEach((l,k)=>{ty+=15;const mono=narrow&&k===0;b+='<text x="'+(bx+8)+'" y="'+ty+'" font-size="'+(mono?11:12)+'"'+(mono?' font-family="ui-monospace,Menlo,monospace"':'')+' fill="'+X.css(mono?'--mute':'--ink')+'">'+esc(l)+'</text>'});
      meas.forEach(l=>{ty+=15;b+='<text x="'+(bx+8)+'" y="'+ty+'" font-size="12" font-weight="600" fill="'+X.css('--good')+'">'+esc(l)+'</text>'});
      mids.push([y,y+h]);y+=h+(i===ROWS.length-2?16:10)});
    // the token's path: down the spine through the six layers, then back up to the sampler
    const ax=11,top=mids[0][0]+12,bot=mids[5][1]-10;
    b+='<line x1="'+ax+'" x2="'+ax+'" y1="'+top+'" y2="'+bot+'" stroke="'+X.css('--acc')+'" stroke-width="2.4"></line><path d="M'+(ax-5)+' '+(bot-7)+' L'+ax+' '+bot+' L'+(ax+5)+' '+(bot-7)+'" fill="none" stroke="'+X.css('--acc')+'" stroke-width="2.4"></path>';
    const s7=(mids[6][0]+mids[6][1])/2;
    b+='<path d="M'+(bx-2)+' '+(mids[5][1]-6)+' C '+(ax-6)+' '+(mids[5][1]+4)+', '+(ax-6)+' '+(s7-8)+', '+(bx-2)+' '+s7+'" fill="none" stroke="'+X.css('--acc')+'" stroke-width="1.6" stroke-dasharray="4 3"></path>';
    mids.slice(0,6).forEach(m=>{const cy=m[0]+16;b+='<circle cx="'+ax+'" cy="'+cy+'" r="4" fill="'+X.css('--acc')+'"></circle>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+(y+2)+'" width="100%" height="'+(y+2)+'" role="img" aria-label="One token down the layers of llama.cpp">'+b+'</svg>'}
  X.onRender('t-read',draw);X.onResize('t-read',draw);
})();
