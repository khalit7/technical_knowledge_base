// ---- Reading tab: measured bars, compiled excerpts, predict-then-reveal, the decode chart ----
(function(){
  const D=window.WKD, M=D.m1, esc=RD.esc;
  const SHORT={ // labels for bars where the recorded name is long
    'attn:full_s0@1024':'FA-1 grid, N = 1,024','attn:full_s1@1024':'FA-2 grid, N = 1,024','attn:full_s0@4096':'FA-1 grid, N = 4,096',
    'attn:full_s1@4096':'FA-2 grid, N = 4,096','attn:full_s0@8192':'FA-1 grid, N = 8,192','attn:full_s1@8192':'FA-2 grid, N = 8,192',
    'fuse:MM@1024':'matmul alone (ours)','fuse:U@1024':'matmul, then bias + GELU (ours)','fuse:F0@1024':'fused 1: 16 KB staging tile',
    'fuse:Fp@1024':'fused 2: registers, precise tanh','fuse:F@1024':'fused 3: registers, fast tanh','fuse:E@1024':'MLX eager',
    'fuse:EC@1024':'MLX under mx.compile',
    'gemv:Q1':'4-bit fused, thread per row','gemv:D':'dequantise, then GEMV','gemv:H_lib':'float16, MLX','gemv:H_ours':'float16, ours',
    'gemv:Q_lib':'4-bit, MLX library','gemv:Q2':'4-bit fused, SIMD-group per row','gemv:Q3':'4-bit fused, 16-byte loads','gemv:read_q':'read the 4-bit codes only',
    'scan:C1':'Hillis-Steele, 24 launches','scan:C2':'reduce, then scan (3 launches)','scan:L':'MLX mx.cumsum','scan:copy':'plain copy, for scale',
    'reduce:L':'MLX mx.sum','reduce:A1':'A1 one launch, atomics'};
  const nameOf=(g,k)=>SHORT[g+':'+k]||M[g][k].name.replace(/\s*\([^)]*\)\s*$/,'');
  window.WK_nameOf=nameOf;
  function bars(el){
    const [g,list]=el.dataset.wkbars.split(':'), keys=list.split(','), log=el.dataset.log==='1';
    const rows=keys.map(k=>({k,c:M[g][k]})).filter(r=>r.c);
    // scale to the medians (a single slow trial would otherwise squash every bar); whiskers are clipped at the edge
    const mx=Math.max(...rows.map(r=>r.c.ms))*(log?1.6:1.3), mn=Math.min(...rows.map(r=>r.c.lo));
    const pos=v=>Math.min(1,log?(Math.log(v)-Math.log(mn*0.4))/(Math.log(mx)-Math.log(mn*0.4)):v/mx);
    el.innerHTML=rows.map(r=>{const c=r.c,w=100*pos(c.ms),a=100*pos(c.lo),b=100*pos(c.hi);
      const col=/MLX|library|copy|read the/.test(nameOf(g,r.k))?'var(--c4)':'var(--c1)';
      return '<div class="row"><span class="nm" title="'+esc(c.name)+'">'+esc(nameOf(g,r.k))+'</span><span class="track"><span class="fill" style="width:'+w.toFixed(1)+'%;background:'+col+'"></span><span class="whisk" style="left:'+a.toFixed(1)+'%;width:'+Math.max(0.5,b-a).toFixed(1)+'%"></span></span><span class="val">'+c.ms.toFixed(2)+' ms</span></div>'}).join('')+
      '<div class="wk-leg"><span style="--sw:var(--c1)">ours</span><span style="--sw:var(--c4)">library or reference</span>'+(log?'<span style="--sw:transparent">log scale</span>':'')+'</div>';
  }
  window.WK_bars=bars;
  document.querySelectorAll('#t-read [data-wkbars]').forEach(bars);
  // compiled SASS excerpts
  document.querySelectorAll('pre[data-excerpt]').forEach(p=>{const ex=D.excerpts[p.dataset.excerpt]||[];
    p.textContent=ex.join('\n')+'\n';p.insertAdjacentHTML('beforeend','<span class="c">// cuobjdump -sass, CUDA 13.4.2, sm_90a; '+ex.length+' consecutive instructions</span>')});
  // predict, then reveal
  document.querySelectorAll('[data-pr]').forEach(box=>{const ans=box.querySelector('.ans');
    box.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      box.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.a==='1');x.classList.toggle('wrong',x===b&&x.dataset.a!=='1')});
      ans.hidden=false}))});
  // decode: time against number of splits, three cache lengths
  const host=document.getElementById('wk-dec');
  function dec(){
    const W=Math.min(700,RD.width(host)),H=230,L=46,R=12,T=14,B=40;
    const Ls=[4096,16384,65536],Ss=[1,2,4,8,16,32,64],cols=['var(--c3)','var(--c1)','var(--c2)'];
    let ymax=0;Ls.forEach(l=>Ss.forEach(s=>ymax=Math.max(ymax,M.decode['S'+s+'@'+l].ms)));ymax=Math.ceil(ymax);
    const x=i=>L+(W-L-R)*i/(Ss.length-1),y=v=>T+(H-T-B)*(1-v/ymax);
    let s='';
    for(let v=0;v<=ymax;v+=1){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-6,y(v)+4,v,{a:'end'})}
    Ss.forEach((S,i)=>{s+=RD.t(x(i),H-B+16,S,{a:'middle'})});
    s+=RD.t((L+W-R)/2,H-6,'splits S (threadgroups per head)',{a:'middle'})+RD.t(4,10,'ms',{});
    Ls.forEach((l,j)=>{const pts=Ss.map((S,i)=>[x(i),y(M.decode['S'+S+'@'+l].ms)]);
      s+='<polyline fill="none" stroke="'+cols[j]+'" stroke-width="2" points="'+pts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')+'"/>';
      pts.forEach(p=>s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="'+cols[j]+'"/>');
      const lib=M.decode['lib@'+l].ms;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(lib).toFixed(1)+'" y2="'+y(lib).toFixed(1)+'" stroke="'+cols[j]+'" stroke-dasharray="4 4" opacity=".7"/>'});
    host.innerHTML=RD.svg(W,H,s,'Decode attention time against number of key splits')+
      '<div class="rd-leg">'+Ls.map((l,j)=>'<span style="--sw:'+cols[j]+'">'+l.toLocaleString('en-US')+' keys</span>').join('')+'<span style="--sw:transparent">dashed: MLX fused attention at the same length</span></div>'+
      '<p class="small mute">8 heads, d = 128, float16 K and V, one query per head; median of 3 runs, measured on Apple M1 Pro GPU.</p>';
  }
  if(host){dec();RD.onRender(dec);RD.onResize(dec)}
})();
// Boehm's published table (section 4)
(function(){const t=document.getElementById('wk-boehm');if(!t)return;const B=window.WKD.pub.boehm;
  t.innerHTML='<tr><th>Kernel</th><th>Step</th><th class="num">GFLOP/s</th><th class="num">% of cuBLAS</th></tr>'+B.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2].toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'</td><td class="num">'+r[3].toFixed(1)+'%</td></tr>').join('')+
  '<tr><td></td><td>cuBLAS</td><td class="num">'+B.cublas.toLocaleString('en-US',{minimumFractionDigits:1})+'</td><td class="num">100%</td></tr>';
  t.insertAdjacentHTML('afterend','<p class="small mute">'+B.gpu+', '+B.n.toLocaleString('en-US')+' &times; '+B.n.toLocaleString('en-US')+', float32, from the worklog\'s summary table (kernels 7 and 8, two bank-conflict experiments, are not in it).</p>')})();
