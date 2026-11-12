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
  // 4. softmax three ways: a static before/after on the same input, the three settings side by side (it replaced a kernel-by-kernel stepper, 2026-11)
  const SM=byKey('softmax');
  function kname(k){if(k[0]!=='fusion')return k[0];return k[1]==='kCustom'?'library (kCustom)':'loop (kLoop)'}
  document.getElementById('xp-sm-k').innerHTML=[['no_fusion','Fusion pass off'],['no_library','Library fusions off'],['default','Default']].map(([m,t])=>{const S=SM.s[m];
    return '<div class="xp-col'+(m==='default'?' on':'')+'"><div class="h"><b>'+t+'</b><span>'+S.k+' kernels, '+XP.mb(S.b)+' moved</span></div>'+S.l.map((k,j)=>'<div class="xp-k on'+(k[1]==='kCustom'?' lib':'')+'"><span class="h">'+(j+1)+'. '+esc(kname(k))+'</span>'+(k[2]?k[2].split(' ').filter(o=>o!=='constant').map(o=>'<span class="o">'+esc(o)+'</span>').join(''):'<span class="o">'+esc(k[0])+'</span>')+'</div>').join('')+'</div>'}).join('');
  // 4. step with and without fusion
  const runs={};D.flags.runs.forEach(r=>runs[r.key]=r);
  const lab={default:'Default',no_library:'Library fusions off',no_fusion:'Fusion pass off'};
  document.getElementById('xp-fuse-step').innerHTML='<thead><tr><th>Setting</th><th class="num">Kernels</th><th class="num">of which fusions</th><th class="num">Bytes moved</th><th class="num">Temp memory</th><th class="num">Step, CPU s</th><th class="num">Compile, CPU s</th></tr></thead><tbody>'+
    ['default','no_library','no_fusion'].map(s=>{const st=D.fuse.steps[s], r=runs[s];return '<tr><td>'+lab[s]+'</td><td class="num">'+f(st.kernels)+'</td><td class="num">'+f(st.fusions)+'</td><td class="num">'+XP.gb(st.bytes_accessed)+'</td><td class="num">'+XP.mb(st.temp_bytes)+'</td><td class="num">'+r.step_cpu_s.toFixed(2)+'</td><td class="num">'+r.compile_cpu_s.toFixed(2)+'</td></tr>'}).join('')+'</tbody>';
  // 5. layouts
  document.getElementById('xp-lay').innerHTML=D.buf.layouts.map(l=>'<pre class="xp-code">'+esc(l.code)+'\n# optimised HLO, entry:\n'+esc(l.entry.join('\n'))+'</pre>').join('');
  // 6. memory over the step: the schedule in five explained stretches (#sx-mem), never one step per position (the long-replay rule)
  const T=D.buf.timeline, bands=D.buf.bands, mh=document.getElementById('xp-mem-svg'), mc=document.getElementById('xp-mem-cnt');
  const pc={input:'var(--dim)',forward:'var(--c1)',backward:'var(--c2)',optimiser:'var(--c3)',other:'var(--c5)'};
  const maxT=Math.max(...T), pk=Math.floor(D.buf.peak.xla_pos/D.buf.timeline_step);
  const lastB=bands.filter(b=>b[2]==='backward').pop()[1];
  // stretches in timeline units: before the forward pass, the forward pass up to the peak, the peak, the backward pass (a few optimiser updates interleave), the optimiser
  const G=[[0,bands[0][1]],[bands[0][1]+1,pk-1],[pk-1,pk+1],[pk+1,lastB],[lastB+1,T.length-1]];
  function mdraw(g){
    const W=RD.width(mh), H=200, pl=48, pb=24, pt=8, n=T.length, bw=(W-pl-6)/n, lo=G[g][0], hi=G[g][1];
    const y=v=>H-pb-(H-pb-pt)*v/maxT;
    let s='';
    bands.forEach(b=>{s+='<rect x="'+(pl+b[0]*bw)+'" y="'+pt+'" width="'+((b[1]-b[0]+1)*bw)+'" height="'+(H-pb-pt)+'" fill="'+pc[b[2]]+'" opacity=".12"/>'});
    for(let t=0;t<=4;t++){const v=maxT*t/4;s+='<line x1="'+pl+'" x2="'+(W-4)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,y(v)+3,(v/1e6).toFixed(0)+' MB',{a:'end',fs:11})}
    // the whole curve faintly (so the shape is there from the first step), the curve so far, and the current stretch highlighted
    let da='M'+pl+','+y(0);T.forEach((v,k)=>{da+='L'+(pl+k*bw).toFixed(1)+','+y(v).toFixed(1)});da+='L'+(pl+(n-1)*bw).toFixed(1)+','+y(0)+'Z';
    s+='<path d="'+da+'" fill="var(--acc)" opacity=".08" stroke="var(--acc)" stroke-opacity=".35" stroke-dasharray="3 3" stroke-width="1"/>';
    let d='M'+pl+','+y(0);for(let k=0;k<=hi;k++)d+='L'+(pl+k*bw).toFixed(1)+','+y(T[k]).toFixed(1);d+='L'+(pl+hi*bw).toFixed(1)+','+y(0)+'Z';
    s+='<path d="'+d+'" fill="var(--acc)" opacity=".25" stroke="var(--acc)" stroke-width="1"/>';
    let dn='M'+(pl+lo*bw).toFixed(1)+','+y(T[lo]).toFixed(1);for(let k=lo+1;k<=hi;k++)dn+='L'+(pl+k*bw).toFixed(1)+','+y(T[k]).toFixed(1);
    s+='<path class="rd-new" d="'+dn+'" fill="none" stroke="var(--c2)" stroke-width="2.4"/>';
    s+='<rect x="'+(pl+lo*bw)+'" y="'+pt+'" width="'+Math.max(2,(hi-lo+1)*bw)+'" height="'+(H-pb-pt)+'" fill="none" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    if(hi>=pk)s+='<circle cx="'+(pl+pk*bw)+'" cy="'+y(T[pk])+'" r="3.5" fill="var(--bad)"/>';
    let lx=pl;['forward','backward','optimiser'].forEach(p=>{s+='<rect x="'+lx+'" y="'+(H-12)+'" width="9" height="9" fill="'+pc[p]+'" opacity=".5"/>'+RD.t(lx+12,H-4,p,{fs:11});lx+=78});
    mh.innerHTML=RD.svg(W,H,s,'Live bytes over the schedule');
    const mxs=Math.max(...T.slice(lo,hi+1));
    mc.innerHTML=RD.stat('Schedule positions',f(lo*D.buf.timeline_step)+' to '+f(Math.min(D.buf.schedule_len,(hi+1)*D.buf.timeline_step)),'of '+f(D.buf.schedule_len))+RD.stat('Live at the end',XP.mb(T[hi]),'most in it: '+XP.mb(mxs))+RD.stat('Peak',XP.mb(D.buf.peak.bytes),'reconstructed; XLA: '+XP.mb(D.buf.peak.xla_bytes));
  }
  const man=RD.anim({card:'xp-mem-card',ctl:'xp-mem-ctl',n:G.length,draw:mdraw,ms:4200,label:'Stretch',list:'sx-mem'});
  RD.onResize(()=>man.redraw());
  // 6. peak attribution
  const pr=D.buf.peak.rows.slice(0,10);
  document.getElementById('xp-peak-bars').innerHTML=XP.bars(pr.map(r=>({n:r.op_name.replace('jit(train_step)/',''),v:r.bytes,t:r.pct+'%',c:r.op_name.includes('transpose(')?'var(--c2)':r.op_name.includes('jvp')?'var(--c1)':'var(--c3)'})),pr[0].bytes);
  // 6. in-place check
  document.getElementById('xp-inplace').innerHTML='<thead><tr><th>Case</th><th>Entry instructions</th><th class="num">Alias</th><th>Copy?</th></tr></thead><tbody>'+
    D.inp.cases.map(c=>'<tr><td data-h="">'+esc(c.case)+'</td><td data-h="Entry"><code>'+esc(c.entry_ops.join(', '))+'</code></td><td data-h="Alias" class="num">'+(c.alias?XP.mb(c.alias):'0')+'</td><td data-h="Copy">'+(c.entry_ops.includes('copy')?'<b>yes, '+D.n.inplace_mib+' MiB</b>':'no')+'</td></tr>').join('')+'</tbody>';
})();
