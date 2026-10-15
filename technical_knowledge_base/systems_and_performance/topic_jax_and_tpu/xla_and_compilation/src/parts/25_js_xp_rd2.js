// ---- Reading sections 4 to 6: fusion decisions, the softmax three ways, the step with and without fusion, layouts, memory over the step ----
(function(){
  const D=XP.D, esc=XP.esc, f=XP.f, B=D.fuse.breakers, byKey=k=>B.find(b=>b.key===k);
  // 4. predict: duplication
  const mu=byKey('mul_two_users').s.default, ex=byKey('exp_two_users').s.default;
  document.getElementById('xp-dup-mul').textContent=mu.k;document.getElementById('xp-dup-exp').textContent=ex.k;
  document.getElementById('xp-dup-bytes').textContent=XP.mb(mu.b)+' against '+XP.mb(ex.b);
  // 4. decision counts
  const dec=Object.entries(D.fuse.dec).sort((a,b)=>b[1]-a[1]);const mx=dec[0][1];
  document.getElementById('xp-dec-bars').innerHTML=XP.bars(dec.map(([k,v])=>({n:k,v,c:k.startsWith('accept')?'var(--good)':k.startsWith('refuse')?'var(--c2)':'var(--dim)'})),mx);
  // 4. softmax three ways (before/after on the same input)
  const SM=byKey('softmax');let mode='default';
  const kh=document.getElementById('xp-sm-k'), cap=document.getElementById('xp-sm-cap'), cnt=document.getElementById('xp-sm-cnt');
  function kname(k){if(k[0]!=='fusion')return k[0];return k[1]==='kCustom'?'library fusion (kCustom)':'loop fusion (kLoop)'}
  function draw(i){
    const S=SM.s[mode], L=S.l, n=L.length;
    kh.innerHTML=L.map((k,j)=>'<div class="xp-k'+(k[1]==='kCustom'?' lib':'')+(j===i?' on':j<i?' done':'')+'"><span class="h">kernel '+(j+1)+': '+esc(kname(k))+'</span>'+(k[2]?k[2].split(' ').filter(o=>o!=='constant').map(o=>'<span class="o">'+esc(o)+'</span>').join(''):'<span class="o">'+esc(k[0])+'</span>')+(j<=i?'<div class="xp-mem" title="result written to memory"></div>':'')+'</div>').join('');
    const last=i>=n-1;
    cnt.innerHTML=RD.stat('Kernels launched',(Math.min(i,n-1)+1)+' of '+n)+RD.stat('Results written to memory',String(Math.min(i,n-1)+1),'one per kernel')+RD.stat('Bytes moved (whole program)',last?XP.mb(S.b):'...',last?'XLA cost_analysis':'shown at the end');
    const k=L[Math.min(i,n-1)], ops=(k[2]||k[0]).split(' ').filter(o=>o!=='constant');
    cap.innerHTML='<div class="t">Kernel '+(Math.min(i,n-1)+1)+': '+esc(kname(k))+'</div><p>Computes '+esc(ops.join(', '))+' in one pass over its data, then writes its result to memory for the next kernel to read back.'+(last?' Done: '+n+' kernels. Default: '+SM.s.default.k+'; library fusions off: '+SM.s.no_library.k+'; fusion pass off: '+SM.s.no_fusion.k+'.':'')+'</p>';
  }
  const an=RD.anim({card:'xp-sm-card',ctl:'xp-sm-ctl',n:SM.s.default.l.length,draw,ms:1300,label:'Kernel'});
  RD.seg(document.getElementById('xp-sm-seg'),m=>{mode=m;an.reset(SM.s[m].l.length)});
  // 4. step with and without fusion
  const runs={};D.flags.runs.forEach(r=>runs[r.key]=r);
  const lab={default:'Default',no_library:'Library fusions off',no_fusion:'Fusion pass off'};
  document.getElementById('xp-fuse-step').innerHTML='<thead><tr><th>Setting</th><th class="num">Kernels</th><th class="num">of which fusions</th><th class="num">Bytes moved</th><th class="num">Temp memory</th><th class="num">Step, CPU s</th><th class="num">Compile, CPU s</th></tr></thead><tbody>'+
    ['default','no_library','no_fusion'].map(s=>{const st=D.fuse.steps[s], r=runs[s];return '<tr><td>'+lab[s]+'</td><td class="num">'+f(st.kernels)+'</td><td class="num">'+f(st.fusions)+'</td><td class="num">'+XP.gb(st.bytes_accessed)+'</td><td class="num">'+XP.mb(st.temp_bytes)+'</td><td class="num">'+r.step_cpu_s.toFixed(2)+'</td><td class="num">'+r.compile_cpu_s.toFixed(2)+'</td></tr>'}).join('')+'</tbody>';
  // 5. layouts
  document.getElementById('xp-lay').innerHTML=D.buf.layouts.map(l=>'<pre class="xp-code">'+esc(l.code)+'\n# optimised HLO, entry:\n'+esc(l.entry.join('\n'))+'</pre>').join('');
  // 6. memory over the step
  const T=D.buf.timeline, bands=D.buf.bands, mh=document.getElementById('xp-mem-svg'), mc=document.getElementById('xp-mem-cnt'), mcap=document.getElementById('xp-mem-cap');
  const pc={input:'var(--dim)',forward:'var(--c1)',backward:'var(--c2)',optimiser:'var(--c3)',other:'var(--c5)'};
  const NS=48, step=Math.ceil(T.length/NS), maxT=Math.max(...T);
  const phaseAt=b=>{for(const x of bands)if(b>=x[0]&&b<=x[1])return x[2];return 'other'};
  function mdraw(i){
    const W=RD.width(mh), H=200, pl=48, pb=24, pt=8, n=T.length, bw=(W-pl-6)/n;
    const y=v=>H-pb-(H-pb-pt)*v/maxT;
    let s='';
    bands.forEach(b=>{s+='<rect x="'+(pl+b[0]*bw)+'" y="'+pt+'" width="'+((b[1]-b[0]+1)*bw)+'" height="'+(H-pb-pt)+'" fill="'+pc[b[2]]+'" opacity=".12"/>'});
    for(let t=0;t<=4;t++){const v=maxT*t/4;s+='<line x1="'+pl+'" x2="'+(W-4)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,y(v)+3,(v/1e6).toFixed(0)+' MB',{a:'end',fs:10})}
    const cur=Math.min(n-1,i*step);
    let d='M'+pl+','+y(0);T.forEach((v,k)=>{d+='L'+(pl+k*bw).toFixed(1)+','+y(v).toFixed(1)});d+='L'+(pl+(n-1)*bw).toFixed(1)+','+y(0)+'Z';
    s+='<path d="'+d+'" fill="var(--acc)" opacity=".25" stroke="var(--acc)" stroke-width="1"/>';
    s+='<line x1="'+(pl+cur*bw)+'" x2="'+(pl+cur*bw)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    const pk=Math.floor(D.buf.peak.xla_pos/D.buf.timeline_step);s+='<circle cx="'+(pl+pk*bw)+'" cy="'+y(T[pk])+'" r="3.5" fill="var(--bad)"/>';
    let lx=pl;['forward','backward','optimiser'].forEach(p=>{s+='<rect x="'+lx+'" y="'+(H-12)+'" width="9" height="9" fill="'+pc[p]+'" opacity=".5"/>'+RD.t(lx+12,H-4,p,{fs:10});lx+=78});
    mh.innerHTML=RD.svg(W,H,s,'Live bytes over the schedule');
    const ph=phaseAt(cur);
    mc.innerHTML=RD.stat('Schedule position',f(cur*D.buf.timeline_step)+' of '+f(D.buf.schedule_len))+RD.stat('Live now',XP.mb(T[cur]))+RD.stat('Phase',ph)+RD.stat('Peak',XP.mb(D.buf.peak.bytes),'reconstructed; XLA: '+XP.mb(D.buf.peak.xla_bytes));
    const txt={input:'The step\'s inputs (parameters, both Adam moments, the batch) are live for the whole step.',forward:'The forward pass: each layer adds the activations the backward pass will need, so live bytes climb.',backward:'The backward pass consumes the saved activations layer by layer, last layer first, and frees them.',optimiser:'Gradient norm, clipping and the AdamW update: small, elementwise, one chain per parameter array.',other:'Bookkeeping instructions between phases.'}[ph];
    mcap.innerHTML='<div class="t">'+esc(ph)+'</div><p>'+esc(txt)+(Math.abs(cur-pk)<=step?' The red dot is the peak, where XLA attributes the bytes listed below.':'')+'</p>';
  }
  const man=RD.anim({card:'xp-mem-card',ctl:'xp-mem-ctl',n:Math.ceil(T.length/step),draw:mdraw,ms:420,label:'Schedule position'});
  RD.onResize(()=>{an.redraw();man.redraw()});
  // 6. peak attribution
  const pr=D.buf.peak.rows.slice(0,10);
  document.getElementById('xp-peak-bars').innerHTML=XP.bars(pr.map(r=>({n:r.op_name.replace('jit(train_step)/',''),v:r.bytes,t:r.pct+'%',c:r.op_name.includes('transpose(')?'var(--c2)':r.op_name.includes('jvp')?'var(--c1)':'var(--c3)'})),pr[0].bytes);
  // 6. in-place check
  document.getElementById('xp-inplace').innerHTML='<thead><tr><th>Case</th><th>Entry instructions</th><th class="num">Alias</th><th>Copy?</th></tr></thead><tbody>'+
    D.inp.cases.map(c=>'<tr><td data-h="">'+esc(c.case)+'</td><td data-h="Entry"><code>'+esc(c.entry_ops.join(', '))+'</code></td><td data-h="Alias" class="num">'+(c.alias?XP.mb(c.alias):'0')+'</td><td data-h="Copy">'+(c.entry_ops.includes('copy')?'<b>yes, '+D.n.inplace_mib+' MiB</b>':'no')+'</td></tr>').join('')+'</tbody>';
})();
