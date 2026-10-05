// ---- Part 2, Runtime lab tab (t-pb-lab): all free-threading, JIT and subinterpreter runs, and the wheel survey ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc,F=PB.ft,KEYS=['PY314','PY314T','PY315','PY315T'];
  const LAB={PY314:'3.14.8 (GIL)',PY314T:'3.14.8t (free-threaded)',PY315:'3.15.0rc3 (GIL)',PY315T:'3.15.0rc3t (free-threaded)'};
  const COL={PY314:'var(--c2)',PY314T:'var(--c3)',PY315:'var(--c4)',PY315T:'var(--c1)'};
  const NS=['1','2','4','8'];let mode='t';
  function plot(){
    const el=$('lb-ft-plot'),w=PBU.width(el),H=230,L0=46,R=12,T0=10,B=30;
    const val=(k,n)=>mode==='t'?F[k].scale[n].median_s:F[k].scale['1'].median_s/F[k].scale[n].median_s;
    const max=mode==='t'?Math.max(...KEYS.flatMap(k=>NS.map(n=>val(k,n))))*1.1:8.4;
    const X=i=>L0+(w-L0-R)*i/3,Y=v=>T0+(H-T0-B)*(1-v/max);let s='';
    const ticks=mode==='t'?[0,0.2,0.4,0.6,0.8,1.0].filter(v=>v<=max):[0,1,2,4,6,8];
    ticks.forEach(v=>{s+='<line x1="'+L0+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"></line><text x="'+(L0-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(mode==='t'?v.toFixed(1)+' s':v+'x')+'</text>'});
    if(mode==='s'){s+='<polyline points="'+NS.map((n,i)=>X(i)+','+Y(+n)).join(' ')+'" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"></polyline><text x="'+(X(3)-4)+'" y="'+(Y(8)+12)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">perfect scaling</text>'}
    NS.forEach((n,i)=>{s+='<text x="'+X(i)+'" y="'+(H-10)+'" font-size="11" text-anchor="'+(i===0?'start':i===3?'end':'middle')+'" fill="var(--mute)">'+n+' thread'+(n==='1'?'':'s')+'</text>'});
    KEYS.forEach(k=>{s+='<polyline points="'+NS.map((n,i)=>X(i)+','+Y(val(k,n)).toFixed(1)).join(' ')+'" fill="none" stroke="'+COL[k]+'" stroke-width="2"></polyline>'+NS.map((n,i)=>'<circle cx="'+X(i)+'" cy="'+Y(val(k,n)).toFixed(1)+'" r="3.5" fill="'+COL[k]+'"><title>'+LAB[k]+', '+n+': '+(mode==='t'?PBU.fmt(val(k,n),3)+' s':PBU.fmt(val(k,n),2)+'x')+'</title></circle>').join('')});
    el.innerHTML=RD.svg(w,H,s,'Thread scaling of the token count on four interpreters');
  }
  $('lb-ft-leg').innerHTML=KEYS.map(k=>'<span><i style="background:'+COL[k]+'"></i>'+LAB[k]+'</span>').join('');
  RD.seg($('lb-ft-mode'),m=>{mode=m;plot()});
  $('lb-ft-tbl').innerHTML='<thead><tr><th>Interpreter</th>'+NS.map(n=>'<th class="n">'+n+' thr. median</th>').join('')+'<th>All runs (s), 1 / 2 / 4 / 8 threads</th><th class="n">Load avg</th></tr></thead><tbody>'+
    KEYS.map(k=>'<tr><td>'+LAB[k]+'</td>'+NS.map(n=>'<td class="n">'+PBU.fmt(F[k].scale[n].median_s,3)+'</td>').join('')+'<td class="small">'+NS.map(n=>F[k].scale[n].all_s.join(', ')).join(' / ')+'</td><td class="n">'+PBU.la(F[k].loadavg_start)+'</td></tr>').join('')+'</tbody>';
  const ov=(f,g)=>(F[f].scale['1'].median_s/F[g].scale['1'].median_s-1)*100;
  $('lb-ft-ovh').innerHTML='Single-thread overhead of the free-threaded build on this workload (1-thread median against the GIL build of the same version): 3.14t <b>'+(ov('PY314T','PY314')>=0?'+':'')+PBU.fmt(ov('PY314T','PY314'),1)+'%</b>, 3.15rc3t <b>'+(ov('PY315T','PY315')>=0?'+':'')+PBU.fmt(ov('PY315T','PY315'),1)+'%</b>. Official figures for 3.14 (pyperformance): "roughly 5-10%" in What\'s New, "about 1% on macOS aarch64 to 8% on x86-64 Linux" in the HOWTO. One workload on a busy machine is not a benchmark suite: read differences of a few percent as noise.';
  $('lb-race-tbl').innerHTML='<thead><tr><th>Interpreter</th><th class="n">Expected tokens</th><th>Lost, no lock (5 runs)</th><th>Lost, with Lock (3 runs)</th></tr></thead><tbody>'+
    KEYS.map(k=>'<tr><td>'+LAB[k]+'</td><td class="n">'+F[k].expected_tokens.toLocaleString('en-US')+'</td><td class="n">'+F[k].race_nolock.map(x=>(F[k].expected_tokens-x).toLocaleString('en-US')).join(', ')+'</td><td class="n">'+F[k].race_lock.map(x=>(F[k].expected_tokens-x).toLocaleString('en-US')).join(', ')+'</td></tr>').join('')+'</tbody>';
  // JIT
  const J=PB.jit.runs,V=['3.13','3.14','3.15'],C=['char_loop','float_loop','objects','gen_pipeline','json_count'];
  $('lb-jit-tbl').innerHTML='<thead><tr><th>Workload</th>'+V.map(v=>'<th class="n">'+v+' off</th><th class="n">'+v+' on</th><th class="n">ratio</th>').join('')+'</tr></thead><tbody>'+
    C.map(c=>'<tr><td><code>'+c+'</code></td>'+V.map(v=>{const a=J[v+'|'+c+'|0'],b=J[v+'|'+c+'|1'],x=a.median_s/b.median_s;
      return '<td class="n" title="runs: '+a.all_s.join(', ')+'">'+PBU.fmt(a.median_s*1000,0)+' ms</td><td class="n" title="runs: '+b.all_s.join(', ')+(b.jit_enabled_reported===true?'; sys._jit.is_enabled() True':'')+'">'+PBU.fmt(b.median_s*1000,0)+' ms</td><td class="n" style="color:'+(x>=1.1?'var(--good)':x<=0.91?'var(--bad)':'var(--mute)')+'">'+PBU.fmt(x,2)+'x</td>'}).join('')+'</tr>').join('')+'</tbody>';
  const jon=Object.entries(J).filter(([k,r])=>k.endsWith('|1')&&!k.startsWith('3.13')).every(([k,r])=>r.jit_enabled_reported===true);
  $('lb-jit-load').textContent='Load average '+PBU.la(PB.jit.loadavg_start)+' at the start, '+PBU.la(PB.jit.loadavg_end)+' at the end. sys._jit.is_enabled() reported True in every 3.14 and 3.15 "on" run: '+(jon?'yes':'no')+'. Hover a time for the three process medians.';
  // interpreters
  const IN=PB.interp,ks=['PY314','PY315'];
  const r=(n,f)=>'<tr><td>'+n+'</td>'+ks.map(k=>'<td class="n">'+f(IN[k])+'</td>').join('')+'</tr>';
  $('lb-int-tbl').innerHTML='<thead><tr><th></th>'+ks.map(k=>'<th class="n">'+IN[k].python+'</th>').join('')+'</tr></thead><tbody>'+
    r('Start-up, thread (ms)',d=>PBU.fmt(d.startup_ms.thread,3))+r('Start-up, subinterpreter (ms)',d=>PBU.fmt(d.startup_ms.subinterpreter,2))+r('Start-up, spawned process (ms)',d=>PBU.fmt(d.startup_ms.process_spawn,1))+
    ['serial','threads','processes','subinterpreters'].map(j=>r('Job, '+j+' (s, median; all runs)',d=>PBU.fmt(d.job_s[j].median_s,3)+'<span class="vx-cell small mute" style="display:block">'+d.job_s[j].all_s.join(', ')+'</span>')).join('')+
    r('Load average at start',d=>PBU.la(d.loadavg_start))+r('multiprocessing start method',d=>E(d.mp_start_method))+'</tbody>';
  // wheel survey
  const W=PB.wheels.pkgs,keys=Object.keys(W);let filt='all';
  $('lb-ws-note').innerHTML='PyPI JSON API, latest release of each package, fetched '+E(PB.wheels.fetched)+'. A tick means at least one wheel with that tag exists for the release.';
  const yes=b=>b?'<td class="y">&#10003;</td>':'<td class="no">&#183;</td>';
  function ws(){
    const ks=keys.filter(k=>filt==='all'||(filt==='no314t'&&!W[k].cp314t)||(filt==='abi3'&&W[k].abi3));
    $('lb-ws-tbl').innerHTML='<thead><tr><th>Package</th><th>Version (uploaded)</th><th>cp314t</th><th>cp315</th><th>cp315t</th><th>abi3</th><th>abi3t</th><th class="n">Wheels</th><th>Example file</th></tr></thead><tbody>'+
      ks.map(k=>{const p=W[k];return '<tr><td>'+E(k)+'</td><td class="small">'+E(p.version)+' ('+E(p.uploaded)+')</td>'+yes(p.cp314t)+yes(p.cp315)+yes(p.cp315t)+yes(p.abi3)+yes(p.abi3t)+'<td class="n">'+p.wheels+'</td><td class="fn">'+E(p.abi3t_file||p.example)+'</td></tr>'}).join('')+'</tbody>';
  }
  $('lb-ws-filter').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;filt=b.dataset.m;$('lb-ws-filter').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));ws()});
  ws();
  PBU.onTab('t-pb-lab',plot);
  let rz=0;addEventListener('resize',()=>{const t=$('t-pb-lab');if(!t||t.hidden)return;clearTimeout(rz);rz=setTimeout(plot,60)});
  plot();
})();
