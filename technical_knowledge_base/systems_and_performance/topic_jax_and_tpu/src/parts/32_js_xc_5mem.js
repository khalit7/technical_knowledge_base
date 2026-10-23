// ---- Compiler lab, sections 4 to 7: donation, the remat slider, scan against unroll, the compile caches ----
(function(){
  const X=window.XC,D=X.D,$=X.$;
  // ---- 4. the memory bars were retired 2026-10-23 (buffer assignment is drawn on XLA and compilation, section 6)
  const S=D.step;
  const dn=D.debug&&D.debug.donate;if(dn&&$('xc-don-code')){$('xc-don-code').textContent=dn.code;$('xc-don-out').textContent=dn.output}

  // ---- 5. remat slider
  const R=D.remat;
  if(R){
    const base=R.rows.find(r=>r.k===0),kEl=$('xc-rm-k'),pEl=$('xc-rm-pol');
    const tm=D.timing&&D.timing.remat;
    function rm(){
      const k=+kEl.value,pol=pEl.value;$('xc-rm-kv').textContent=k;
      const r=k===0?base:R.rows.find(q=>q.k===k&&q.pol===pol);
      const mx=Math.max(...R.rows.map(q=>q.temp)),fx=Math.max(...R.rows.map(q=>q.flops));
      $('xc-rm-bars').innerHTML=X.bars([{n:'Temp memory, no remat',v:base.temp,c:'var(--dim)'},{n:'Temp memory, this setting',v:r.temp,c:'var(--c4)',hl:1}],X.mb,mx)+
        X.bars([{n:'FLOPs, no remat',v:base.flops,c:'var(--dim)'},{n:'FLOPs, this setting',v:r.flops,c:'var(--c2)',hl:1}],X.gf,fx);
      const t=tm&&tm.find(q=>q.k===k&&(k===0||q.pol===pol)),t0=tm&&tm.find(q=>q.k===0);
      $('xc-rm-cnt').innerHTML=[['Temp memory',X.mb(r.temp),(100*(r.temp/base.temp-1)).toFixed(0)+'% against no remat'],['FLOPs per step',X.gf(r.flops),'+'+(100*(r.flops/base.flops-1)).toFixed(1)+'% recomputed'],
        ['Step time, rough',t?X.sec(t.s):'not timed',t&&t0&&k?((t.s/t0.s>=1?'+':'')+(100*(t.s/t0.s-1)).toFixed(0)+'% against no remat'):'timed for 0 and 4 blocks only']].map(c=>'<div class="stat"><div class="k">'+c[0]+'</div><div class="v">'+c[1]+'</div><div class="d">'+c[2]+'</div></div>').join('');
      // scatter: every compiled setting, memory against FLOPs
      const el=$('xc-rm-plot'),W=X.width(el),H=210,L=56,Rr=12,Tp=10,B=34,iw=W-L-Rr,ih=H-Tp-B;
      const f0=Math.min(...R.rows.map(q=>q.flops))*.98,f1=fx*1.01,m0=0,m1=mx*1.05;
      const Xs=v=>L+(v-f0)/(f1-f0)*iw,Ys=v=>Tp+ih-(v-m0)/(m1-m0)*ih;
      const col={none:'var(--ink)',nothing_saveable:'var(--c4)',dots_saveable:'var(--c1)',dots_with_no_batch_dims_saveable:'var(--c3)'};
      let s='';[0,.5,1].forEach(f=>{const v=m1*f;s+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+Ys(v)+'" y2="'+Ys(v)+'" stroke="var(--line)"/>'+X.T(L-5,Ys(v)+4,X.mb(v),{a:'end',fs:10,fill:'var(--mute)'})});
      [f0,(f0+f1)/2,f1].forEach(v=>{s+=X.T(Xs(v),H-B+14,(v/1e9).toFixed(1),{a:'middle',fs:10,fill:'var(--mute)'})});
      s+=X.T(L+iw/2,H-6,'GFLOP per step (x) against temp memory (y)',{a:'middle',fs:10.5,fill:'var(--mute)'});
      ['nothing_saveable','dots_saveable','dots_with_no_batch_dims_saveable'].forEach(p=>{const pts=[base].concat(R.rows.filter(q=>q.pol===p));
        s+='<path d="'+pts.map((q,i)=>(i?'L':'M')+Xs(q.flops).toFixed(1)+' '+Ys(q.temp).toFixed(1)).join('')+'" fill="none" stroke="'+col[p]+'" stroke-width="1.5" opacity=".7"/>';
        pts.forEach(q=>{s+='<circle cx="'+Xs(q.flops).toFixed(1)+'" cy="'+Ys(q.temp).toFixed(1)+'" r="3" fill="'+col[p]+'"><title>'+X.esc(q.pol)+', '+q.k+' blocks: '+X.mb(q.temp)+', '+X.gf(q.flops)+'</title></circle>'})});
      s+='<circle cx="'+Xs(r.flops).toFixed(1)+'" cy="'+Ys(r.temp).toFixed(1)+'" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>';
      el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Memory against FLOPs for every remat setting">'+s+'</svg><div class="xc-leg">'+
        ['nothing_saveable','dots_saveable','dots_with_no_batch_dims_saveable'].map(p=>'<span><i style="background:'+col[p]+'"></i>'+p+'</span>').join('')+'<span>each line: 0 to 4 blocks wrapped</span></div>';
      $('xc-rm-note').innerHTML='Every point is a real compilation of the full train step (donated), its temp memory from <code>memory_analysis()</code> and FLOPs from <code>cost_analysis()</code> (<code>src/xla/remat.py</code>). Remat changes the program, not the maths: with all 4 blocks recomputed the loss is '+R.check.loss_full_remat.toFixed(6)+' (same as without) and the updated parameters differ by '+R.check.max_param_diff+'.'+
        (tm?' Step times: '+D.timing.label+', median of 3 runs of 9 steps; on a loaded CPU they are noisier than the FLOP counts.':'');
    }
    kEl.addEventListener('input',rm);pEl.addEventListener('change',rm);X.onRender(rm);rm();
  }

  // ---- 6. scan against unroll
  const L=D.timing&&D.timing.layers;let lk='compile';
  const lab={compile:'XLA compile, CPU time',opt_hlo_bytes:'optimised HLO text size',jaxpr_eqns:'jaxpr equations',steady_median:'step time'};
  function sc(){const el=$('xc-sc-plot');
    if(!L){el.innerHTML='<p class="xc-small">Timings pending (src/xla/timing.py).</p>';return}
    const fmt=lk==='compile'||lk==='steady_median'?X.sec:(lk==='opt_hlo_bytes'?X.mb:X.n0);
    const ser=[[false,'unrolled Python loop','var(--c2)'],[true,'lax.scan','var(--c1)']].map(([s,n,c])=>({name:n,color:c,pts:L.filter(r=>r.scan===s).map(r=>[r.n_layers,r[lk==='compile'&&r.compile_cpu!=null?'compile_cpu':lk]])}));
    X.lines({el,series:ser,xlog:true,ylog:lk!=='steady_median',fx:String,fy:fmt,xlab:'layers in the model (same width; fresh weights)',aria:'Scan against unroll: '+lab[lk],h:240,ymin:lk==='steady_median'?0:undefined});
    const u=L.filter(r=>!r.scan),s=L.filter(r=>r.scan),last=u[u.length-1],lastS=s[s.length-1];
    $('xc-sc-note').innerHTML='At '+last.n_layers+' layers: compile '+X.sec(last.compile_cpu)+' of CPU time unrolled against '+X.sec(lastS.compile_cpu)+' with scan; optimised HLO '+X.mb(last.opt_hlo_bytes)+' against '+X.mb(lastS.opt_hlo_bytes)+'; step '+X.sec(last.steady_median)+' against '+X.sec(lastS.steady_median)+'. Each point is the median of 3 fresh processes (<code>src/xla/timing.py</code>), '+D.timing.label+'. Sizes and equation counts are deterministic; times are rough. MaxText scans by default (<code>scan_layers: true</code>, <a href="https://github.com/AI-Hypercomputer/maxtext/blob/1a95d1e5371021aab8d0574c53d2cca425474318/src/maxtext/configs/base.yml#L525" target="_blank" rel="noopener noreferrer">configs/base.yml:525</a> at the pinned commit), and recommends turning it off under pipeline parallelism, where the pipeline iterations are scanned instead.';}
  X.seg($('xc-sc-seg'),v=>{lk=v;sc()});X.onRender(sc);sc();

  // ---- 7. compile cache race
  const T=D.timing;
  if(!T||!T.step||!T.cache){$('xc-cc-cap').innerHTML='Timings pending (src/xla/timing.py).';return}
  const st=T.step,c=T.cache;let cpu=true;
  const g=(o,k)=>cpu&&o[k+'_cpu']!=null?o[k+'_cpu']:o[k];
  const mk=()=>[
    {n:'New process, no cache',seg:[['trace',g(st,'trace'),'var(--c1)'],['lower',g(st,'lower'),'var(--c6)'],['compile',g(st,'compile'),'var(--c2)'],['run',st.steady_median,'var(--c3)']]},
    {n:'Same process, 2nd call',seg:[['run',st.second_call,'var(--c3)']]},
    {n:'New process, disk cache',seg:[['trace',g(c.later,'trace'),'var(--c1)'],['lower',g(c.later,'lower'),'var(--c6)'],['load',g(c.later,'compile'),'var(--c5)'],['run',st.steady_median,'var(--c3)']]}];
  let lanes=mk();const tot=l=>l.seg.reduce((a,s)=>a+s[1],0);let mx=Math.max(...lanes.map(tot));
  const caps=['A fresh Python process calls the jitted train step for the first time: trace, lower, compile, then run.','The same process calls it again with the same shapes: the executable comes from jit\'s in-memory cache, only the run remains.','A new process with the persistent cache on: tracing and lowering still happen (they produce the cache key), but XLA\'s compile is replaced by reading the executable from disk.','All three side by side.'];
  function race(i){
    $('xc-cc-race').innerHTML=lanes.map((l,j)=>{const on=i===3||j===i,done=j<i;
      return '<span>'+X.esc(l.n)+'</span><span class="tr">'+l.seg.map(s=>'<span title="'+s[0]+': '+X.sec(s[1])+'" style="background:'+s[2]+';width:'+(on||done?(100*s[1]/mx).toFixed(2):0)+'%"></span>').join('')+'</span><span class="v">'+(on||done?X.sec(tot(l)):'')+'</span>'}).join('');
    $('xc-cc-cap').innerHTML=caps[i];}
  $('xc-cc-leg').innerHTML=[['trace','var(--c1)'],['lower','var(--c6)'],['compile','var(--c2)'],['load from disk','var(--c5)'],['run one step','var(--c3)']].map(q=>'<span><i style="background:'+q[1]+'"></i>'+q[0]+'</span>').join('');
  const RA=X.anim({card:'xc-cc-card',ctl:'xc-cc-ctl',n:4,draw:race,ms:2200,label:'Cache step'});
  X.seg($('xc-cc-seg'),v=>{cpu=v==='cpu';lanes=mk();mx=Math.max(...lanes.map(tot));RA.redraw()});
  $('xc-cc-note').innerHTML='Medians: '+T.stepN+' fresh processes without a cache, '+(c.n-1)+' processes reading the cache written by a first one ('+X.n0(c.first.cache_files)+' files, '+X.mb(c.first.cache_bytes)+'). '+T.label+'; 1-minute load averages during the runs '+T.loads.join(', ')+'. "Run" is the median steady step. The first call through the normal path took '+X.sec(st.first_call)+' in total.';
  if(c.default)$('xc-cc-def').innerHTML='Measured here with the default threshold: the step\'s compile took '+X.sec(c.default.compile)+' of wall time on this busy machine, and the cache directory then held '+c.default.files+' file'+(c.default.files===1?'':'s')+'. The threshold is compared with wall time (<code>compiler.py:844</code>), so whether a borderline program is cached depends on how loaded the machine was when it compiled.';
})();
