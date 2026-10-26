// ---- Sections 3 and 4: free-threading lanes, scaling, lost updates, wheels; subinterpreters (data: PB from src/pb/out).
// Adapted from the language page's 42_js_pb_read_d.js and the Runtime lab's 44_js_pb_lab.js (parts 1, 2, 4 and 5) ----
(function(){
  const $=id=>document.getElementById(id);if(!window.PB||!window.CGU||!$('cg-ft-card'))return;
  const E=CGU.esc,F=PB.ft,fmt=CGU.fmt;
  const LAB={PY314:'3.14.8, GIL',PY314T:'3.14.8t, no GIL',PY315:'3.15.0rc3, GIL',PY315T:'3.15.0rc3t, no GIL'};
  const KEYS=['PY314','PY314T','PY315','PY315T'];
  const endOf=k=>Math.max(...F[k].trace4.map(l=>l[l.length-1][1]));
  const MAXT=Math.max(...KEYS.map(endOf));
  const meanChunk=k=>{let s=0,n=0;F[k].trace4.forEach(l=>l.forEach(c=>{s+=c[1]-c[0];n++}));return s/n};
  const NSTEP=22;let mode='PY314',A=null;
  function draw(i){
    const tr=F[mode].trace4,end=endOf(mode),t=i>=NSTEP?end:end*i/NSTEP;
    const w=RD.width($('cg-ft-plot')),L0=62,R=8,lane=24,H=4*lane+34,X=v=>L0+(w-L0-R)*v/MAXT;
    let s='';const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
    tr.forEach((l,k)=>{const y=6+k*lane;s+='<text x="0" y="'+(y+15)+'" font-size="11" fill="var(--mute)">thread '+(k+1)+'</text>';
      s+='<rect x="'+L0+'" y="'+(y+2)+'" width="'+(w-L0-R)+'" height="'+(lane-6)+'" fill="var(--soft)"></rect>';
      l.forEach(c=>{if(c[0]>=t)return;const x0=X(c[0]),x1=X(Math.min(c[1],t));s+='<rect x="'+x0.toFixed(1)+'" y="'+(y+2)+'" width="'+Math.max(0.6,x1-x0-0.6).toFixed(1)+'" height="'+(lane-6)+'" fill="'+cols[k]+'" opacity="'+(c[1]<=t?0.85:0.45)+'"></rect>'})});
    const yA=6+4*lane;const stepv=w<520?200:100;
    for(let v=0;v<=MAXT;v+=stepv){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+yA+'" y2="'+(yA+4)+'" stroke="var(--mute)"></line><text x="'+x+'" y="'+(yA+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+' ms</text>'}
    s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="2" y2="'+yA+'" stroke="var(--ink)" stroke-width="1.5"></line>';
    $('cg-ft-plot').innerHTML=RD.svg(w,H,s,'Four threads processing blocks of 1,000 lines over time');
    const done=tr.reduce((a,l)=>a+l.filter(c=>c[1]<=t).length,0)*1000;
    $('cg-ft-cnt').innerHTML='<span>elapsed <b>'+fmt(t,0)+' ms</b></span><span>lines counted <b>'+done.toLocaleString('en-US')+'</b> of '+F[mode].lines.toLocaleString('en-US')+'</span><span>average block <b>'+fmt(meanChunk(mode),1)+' ms</b></span>';
    const gil=!F[mode].free_threaded,one=F[mode].scale['1'].median_s*1000;
    let c;
    if(i===0)c='<b>'+LAB[mode]+'.</b> Four threads start together; each will count 25 blocks of 1,000 lines. A darker block is finished, a pale one is in progress. Press play or step.';
    else if(i<NSTEP)c=gil?'All four threads make progress, but each block takes about '+fmt(meanChunk(mode)/(one/F[mode].lines*1000),1)+' times as long as one thread alone needs for it: they take turns holding the GIL, switching every '+(F[mode].switch_interval_s*1000)+' ms. Four lanes, one core\'s worth of work.':
      'The four threads run at the same moment on different cores. Each block takes '+fmt(meanChunk(mode)/(one/F[mode].lines*1000),1)+' times as long as one thread alone needs for it: close to 1 would be perfect parallelism; the excess is the busy machine and contention.';
    else c='<b>Finished in '+fmt(end,0)+' ms.</b> One thread alone took '+fmt(one,0)+' ms on this interpreter (median of the scaling runs), so four threads were '+fmt(one/end,1)+'x faster here. Switch the build above to compare, on the same time axis.';
    $('cg-ft-cap').innerHTML=c;
  }
  A=RD.anim({card:'cg-ft-card',ctl:'cg-ft-ctl',n:NSTEP+1,draw:draw,ms:600,label:'Time step'});
  RD.seg($('cg-ft-seg'),m=>{mode=m;A.reset(NSTEP+1)});
  $('cg-ft-src').innerHTML='Real per-block timestamps from one run on each interpreter (<code>ft_bench.py</code>, <code>trace(4)</code>); the time axis is the same for all four builds. Load average during the runs: '+KEYS.map(k=>LAB[k]+' '+CGU.la(F[k].loadavg_start)).join('; ')+'.';
  RD.onResize(()=>A.redraw());

  // scaling summary and bars
  const sp=(k,n)=>F[k].scale['1'].median_s/F[k].scale[n].median_s;
  $('cg-ft-scale-p').innerHTML='The same comparison as speed-ups. With the GIL, 2, 4 or 8 threads were no faster than one ('+fmt(sp('PY314','4'),2)+'x with 4 on 3.14). Without it, 4 threads were '+fmt(sp('PY314T','4'),1)+'x faster and 8 threads '+fmt(sp('PY314T','8'),1)+'x on 3.14t ('+fmt(sp('PY315T','4'),1)+'x and '+fmt(sp('PY315T','8'),1)+'x on 3.15rc3t). Not 4x and 8x: other programs were using the CPU, two of the ten cores are slower efficiency cores, and part of the job (splitting, merging) is serial.';
  const rows=[];KEYS.forEach(k=>['4','8'].forEach(n=>rows.push({name:LAB[k]+', '+n+' threads',v:sp(k,n),label:fmt(sp(k,n),2)+'x',col:F[k].free_threaded?'var(--acc)':'var(--c2)'})));
  CGU.bars($('cg-ft-bars'),rows);
  const ov=(f,g)=>(F[f].scale['1'].median_s/F[g].scale['1'].median_s-1)*100;
  const sg=x=>(x>=0?'+':'')+fmt(x,0)+'%';
  const ovt='3.14t '+sg(ov('PY314T','PY314'))+' and 3.15rc3t '+sg(ov('PY315T','PY315'))+' single-thread time against the GIL build of the same version (one workload, five runs, busy machine)';
  $('cg-ft-ovh').textContent=ovt;$('cg-ft-fix1').textContent=ovt;
  $('cg-ft-cmp4').textContent=fmt(sp('PY314T','4'),1)+'x';
  $('cg-ft-fix4').textContent=fmt(sp('PY314T','4'),1)+'x';

  // every scaling run (closed block): chart with a time / speed-up toggle, and the table
  const COL={PY314:'var(--c2)',PY314T:'var(--acc)',PY315:'var(--c4)',PY315T:'var(--c3)'},NS=['1','2','4','8'];let smode='t';
  function plot(){
    const el=$('cg-sc-plot');if(!el)return;const w=RD.width(el),H=230,L0=46,R=12,T0=10,B=30;
    const val=(k,n)=>smode==='t'?F[k].scale[n].median_s:F[k].scale['1'].median_s/F[k].scale[n].median_s;
    const max=smode==='t'?Math.max(...KEYS.flatMap(k=>NS.map(n=>val(k,n))))*1.1:8.4;
    const X=i=>L0+(w-L0-R)*i/3,Y=v=>T0+(H-T0-B)*(1-v/max);let s='';
    const ticks=smode==='t'?[0,0.2,0.4,0.6,0.8,1.0].filter(v=>v<=max):[0,1,2,4,6,8];
    ticks.forEach(v=>{s+='<line x1="'+L0+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"></line><text x="'+(L0-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(smode==='t'?v.toFixed(1)+' s':v+'x')+'</text>'});
    if(smode==='s'){s+='<polyline points="'+NS.map((n,i)=>X(i)+','+Y(+n)).join(' ')+'" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"></polyline><text x="'+(X(3)-4)+'" y="'+(Y(8)+12)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">perfect scaling</text>'}
    NS.forEach((n,i)=>{s+='<text x="'+X(i)+'" y="'+(H-10)+'" font-size="11" text-anchor="'+(i===0?'start':i===3?'end':'middle')+'" fill="var(--mute)">'+n+' thread'+(n==='1'?'':'s')+'</text>'});
    KEYS.forEach(k=>{s+='<polyline points="'+NS.map((n,i)=>X(i)+','+Y(val(k,n)).toFixed(1)).join(' ')+'" fill="none" stroke="'+COL[k]+'" stroke-width="2"></polyline>'+NS.map((n,i)=>'<circle cx="'+X(i)+'" cy="'+Y(val(k,n)).toFixed(1)+'" r="3.5" fill="'+COL[k]+'"><title>'+LAB[k]+', '+n+': '+(smode==='t'?fmt(val(k,n),3)+' s':fmt(val(k,n),2)+'x')+'</title></circle>').join('')});
    el.innerHTML=RD.svg(w,H,s,'Thread scaling of the token count on four interpreters');
  }
  $('cg-sc-leg').innerHTML=KEYS.map(k=>'<span><i style="background:'+COL[k]+'"></i>'+LAB[k]+'</span>').join('');
  RD.seg($('cg-sc-mode'),m=>{smode=m;plot()});
  $('cg-sc-tbl').innerHTML='<thead><tr><th>Interpreter</th>'+NS.map(n=>'<th class="n">'+n+' thr. median (s)</th>').join('')+'<th>All runs (s), 1 / 2 / 4 / 8 threads</th><th class="n">Load avg</th></tr></thead><tbody>'+
    KEYS.map(k=>'<tr><td>'+LAB[k]+'</td>'+NS.map(n=>'<td class="n">'+fmt(F[k].scale[n].median_s,3)+'</td>').join('')+'<td class="small">'+NS.map(n=>F[k].scale[n].all_s.join(', ')).join(' / ')+'</td><td class="n">'+CGU.la(F[k].loadavg_start)+'</td></tr>').join('')+'</tbody>';
  $('cg-sc-ovh').innerHTML='Single-thread overhead of the free-threaded build on this workload (1-thread median against the GIL build of the same version): 3.14t <b>'+(ov('PY314T','PY314')>=0?'+':'')+fmt(ov('PY314T','PY314'),1)+'%</b>, 3.15rc3t <b>'+(ov('PY315T','PY315')>=0?'+':'')+fmt(ov('PY315T','PY315'),1)+'%</b>. One workload on a busy machine is not a benchmark suite: read differences of a few percent as noise.';
  plot();CGU.onOpen($('cg-sc-plot'),plot);RD.onResize(plot);

  // lost updates
  const lost=k=>F[k].race_nolock.map(x=>F[k].expected_tokens-x);
  const l14=lost('PY314'),l14t=lost('PY314T');
  CGU.drill($('cg-pr-race'),'Predict: four threads, one shared dict, no lock, on the <b>normal 3.14 build with the GIL</b>. Out of '+F.PY314.expected_tokens.toLocaleString('en-US')+' tokens, how many are lost per run?',
    [{t:'None: the GIL makes it safe',right:Math.max(...l14)===0},{t:'Some runs lose a few hundred or thousand',right:Math.max(...l14)>0&&Math.max(...l14)<20000},{t:'Tens of thousands every run',right:Math.min(...l14)>=10000}],
    ()=>'<div class="cg-tbl"><table><thead><tr><th>Build</th><th class="n">Expected tokens</th><th>Tokens lost in each of 5 runs, no lock</th><th>With a lock (3 runs)</th></tr></thead><tbody>'+
      KEYS.map(k=>'<tr><td>'+LAB[k]+'</td><td class="n">'+F[k].expected_tokens.toLocaleString('en-US')+'</td><td class="n">'+lost(k).map(x=>x.toLocaleString('en-US')).join(', ')+'</td><td class="n">'+F[k].race_lock.map(x=>(F[k].expected_tokens-x).toLocaleString('en-US')).join(', ')+'</td></tr>').join('')+'</tbody></table></div>'+
      'With the GIL: '+l14.filter(x=>x>0).length+' of 5 runs lost updates (up to '+Math.max(...l14).toLocaleString('en-US')+' tokens). Without it: every run, '+Math.min(...l14t).toLocaleString('en-US')+' to '+Math.max(...l14t).toLocaleString('en-US')+' tokens.');

  // transcripts
  $('cg-orjson').innerHTML=PB.orjson.map(l=>CGU.line(l)).join('\n');
  CGU.fillTerms($('t-read'));

  // wheels: sentence and survey table
  const W=PB.wheels.pkgs,ks=Object.keys(W),n14=ks.filter(k=>W[k].cp314t).length,n15=ks.filter(k=>W[k].cp315t).length,miss=ks.filter(k=>!W[k].cp314t);
  $('cg-ft-wheels').innerHTML='How common is support? Of '+ks.length+' popular compiled packages on PyPI (latest releases, '+E(PB.wheels.fetched.slice(0,10))+'), <b>'+n14+'</b> ship a free-threaded 3.14 wheel and '+n15+' already ship one for 3.15; without a cp314t wheel: '+miss.map(k=>E(k)).join(', ')+'. The survey is in the closed block below.';
  $('cg-ws-note').innerHTML='PyPI JSON API, latest release of each package, fetched '+E(PB.wheels.fetched)+'. A tick means at least one wheel with that tag exists for the release.';
  const yes=b=>b?'<td class="y">&#10003;</td>':'<td class="no">&#183;</td>';let filt='all';
  function ws(){
    const kk=ks.filter(k=>filt==='all'||(filt==='no314t'&&!W[k].cp314t)||(filt==='abi3'&&W[k].abi3));
    $('cg-ws-tbl').innerHTML='<thead><tr><th>Package</th><th>Version (uploaded)</th><th>cp314t</th><th>cp315</th><th>cp315t</th><th>abi3</th><th>abi3t</th><th class="n">Wheels</th><th>Example file</th></tr></thead><tbody>'+
      kk.map(k=>{const p=W[k];return '<tr><td>'+E(k)+'</td><td class="small">'+E(p.version)+' ('+E(p.uploaded)+')</td>'+yes(p.cp314t)+yes(p.cp315)+yes(p.cp315t)+yes(p.abi3)+yes(p.abi3t)+'<td class="n">'+p.wheels+'</td><td class="fn">'+E(p.abi3t_file||p.example)+'</td></tr>'}).join('')+'</tbody>';
  }
  $('cg-ws-filter').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;filt=b.dataset.m;$('cg-ws-filter').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));ws()});
  ws();

  // subinterpreters
  const IN=PB.interp,IK=['PY314','PY315'];
  const row=(name,f)=>'<tr><td>'+name+'</td>'+IK.map(k=>'<td class="n">'+f(IN[k])+'</td>').join('')+'</tr>';
  $('cg-int-tbl').innerHTML='<thead><tr><th></th><th class="n">3.14.8</th><th class="n">3.15.0rc3</th></tr></thead><tbody>'+
    row('Start one thread and run a call',d=>fmt(d.startup_ms.thread,3)+' ms')+row('Start one subinterpreter and run a call',d=>fmt(d.startup_ms.subinterpreter,2)+' ms')+row('Spawn one process and run a call',d=>fmt(d.startup_ms.process_spawn,1)+' ms')+'</tbody>';
  const J=IN.PY314.job_s,jr=[['1 thread (serial)','serial','var(--dim)'],['4 threads','threads','var(--c2)'],['4 processes','processes','var(--acc)'],['4 subinterpreters','subinterpreters','var(--c4)']];
  CGU.bars($('cg-int-bars'),jr.map(([n,k,c])=>({name:n,v:J[k].median_s,label:fmt(J[k].median_s,3)+' s',col:c})),null,'The 100,000-line count split 4 ways on CPython 3.14.8 (GIL build), median of 5; shorter is better. Start-up costs below.');
  $('cg-int-note').textContent='Normal (GIL) builds. Load average '+IK.map(k=>CGU.la(IN[k].loadavg_start)).join(' and ')+' at the start of the runs.';
  $('cg-int-all').innerHTML='<thead><tr><th></th>'+IK.map(k=>'<th class="n">'+E(IN[k].python)+'</th>').join('')+'</tr></thead><tbody>'+
    row('Start-up, thread (ms)',d=>fmt(d.startup_ms.thread,3))+row('Start-up, subinterpreter (ms)',d=>fmt(d.startup_ms.subinterpreter,2))+row('Start-up, spawned process (ms)',d=>fmt(d.startup_ms.process_spawn,1))+
    ['serial','threads','processes','subinterpreters'].map(j=>row('Job, '+j+' (s, median; all runs)',d=>fmt(d.job_s[j].median_s,3)+'<span class="small mute" style="display:block">'+d.job_s[j].all_s.join(', ')+'</span>')).join('')+
    row('Load average at start',d=>CGU.la(d.loadavg_start))+row('multiprocessing start method',d=>E(d.mp_start_method))+'</tbody>';
})();
