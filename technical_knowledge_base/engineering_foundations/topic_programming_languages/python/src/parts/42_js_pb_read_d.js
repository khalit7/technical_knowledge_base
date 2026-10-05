// ---- Part 2 Reading (t-pb-read), 4 of 4: free-threading lanes, lost updates, the JIT, subinterpreters, section nav ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc,F=PB.ft;
  const LAB={PY314:'3.14.8, GIL',PY314T:'3.14.8t, no GIL',PY315:'3.15.0rc3, GIL',PY315T:'3.15.0rc3t, no GIL'};
  const KEYS=['PY314','PY314T','PY315','PY315T'];
  const endOf=k=>Math.max(...F[k].trace4.map(l=>l[l.length-1][1]));
  const MAXT=Math.max(...KEYS.map(endOf));
  const meanChunk=k=>{let s=0,n=0;F[k].trace4.forEach(l=>l.forEach(c=>{s+=c[1]-c[0];n++}));return s/n};
  const NSTEP=22;let mode='PY314',A=null;
  function draw(i){
    const tr=F[mode].trace4,end=endOf(mode),t=i>=NSTEP?end:end*i/NSTEP;
    const w=PBU.width($('pb-ft-plot')),L0=62,R=8,lane=24,H=4*lane+34,X=v=>L0+(w-L0-R)*v/MAXT;
    let s='';const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
    tr.forEach((l,k)=>{const y=6+k*lane;s+='<text x="0" y="'+(y+15)+'" font-size="11" fill="var(--mute)">thread '+(k+1)+'</text>';
      s+='<rect x="'+L0+'" y="'+(y+2)+'" width="'+(w-L0-R)+'" height="'+(lane-6)+'" fill="var(--soft)"></rect>';
      l.forEach(c=>{if(c[0]>=t)return;const x0=X(c[0]),x1=X(Math.min(c[1],t));s+='<rect x="'+x0.toFixed(1)+'" y="'+(y+2)+'" width="'+Math.max(0.6,x1-x0-0.6).toFixed(1)+'" height="'+(lane-6)+'" fill="'+cols[k]+'" opacity="'+(c[1]<=t?0.85:0.45)+'"></rect>'})});
    const yA=6+4*lane;const stepv=w<520?200:100;
    for(let v=0;v<=MAXT;v+=stepv){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+yA+'" y2="'+(yA+4)+'" stroke="var(--mute)"></line><text x="'+x+'" y="'+(yA+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+' ms</text>'}
    s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="2" y2="'+yA+'" stroke="var(--ink)" stroke-width="1.5"></line>';
    $('pb-ft-plot').innerHTML=RD.svg(w,H,s,'Four threads processing blocks of 1,000 lines over time');
    const done=tr.reduce((a,l)=>a+l.filter(c=>c[1]<=t).length,0)*1000;
    $('pb-ft-cnt').innerHTML='<span>elapsed <b>'+PBU.fmt(t,0)+' ms</b></span><span>lines counted <b>'+done.toLocaleString('en-US')+'</b> of '+F[mode].lines.toLocaleString('en-US')+'</span><span>average block <b>'+PBU.fmt(meanChunk(mode),1)+' ms</b></span>';
    const gil=!F[mode].free_threaded,one=F[mode].scale['1'].median_s*1000;
    let c;
    if(i===0)c='<b>'+LAB[mode]+'.</b> Four threads start together; each will count 25 blocks of 1,000 lines. A darker block is finished, a pale one is in progress.';
    else if(i<NSTEP)c=gil?'All four threads make progress, but each block takes about '+PBU.fmt(meanChunk(mode)/(one/F[mode].lines*1000),1)+' times as long as one thread alone needs for it: they take turns holding the GIL, switching every '+(F[mode].switch_interval_s*1000)+' ms. Four lanes, one core\'s worth of work.':
      'The four threads run at the same moment on different cores. Each block takes '+PBU.fmt(meanChunk(mode)/(one/F[mode].lines*1000),1)+' times as long as one thread alone needs for it: close to 1 would be perfect parallelism; the excess is the busy machine and contention.';
    else c='<b>Finished in '+PBU.fmt(end,0)+' ms.</b> One thread alone took '+PBU.fmt(one,0)+' ms on this interpreter (median of the scaling runs), so four threads were '+PBU.fmt(one/end,1)+'x faster here. Switch the build above to compare, on the same time axis.';
    $('pb-ft-cap').innerHTML=c;
  }
  RD.seg($('pb-ft-seg'),m=>{mode=m;if(A){A.reset(NSTEP+1);A.play()}});
  A=RD.anim({card:'pb-ft-card',ctl:'pb-ft-ctl',n:NSTEP+1,draw:draw,ms:600,label:'Time step'});
  $('pb-ft-src').innerHTML='Real per-block timestamps from one run on each interpreter (<code>ft_bench.py</code>, <code>trace(4)</code>); time axis the same for all four builds. Load average during the runs: '+KEYS.map(k=>LAB[k]+' '+PBU.la(F[k].loadavg_start)).join('; ')+'.';
  let rz=0;addEventListener('resize',()=>{const r=$('t-pb-read');if(!r||r.hidden)return;clearTimeout(rz);rz=setTimeout(()=>A&&A.redraw(),60)});
  PBU.onTab('t-pb-read',()=>A&&A.redraw());

  // scaling summary
  const sp=(k,n)=>F[k].scale['1'].median_s/F[k].scale[n].median_s;
  $('pb-ft-scale-p').innerHTML='The same comparison as speed-ups. With the GIL, 2, 4 or 8 threads were no faster than one ('+PBU.fmt(sp('PY314','4'),2)+'x with 4 on 3.14). Without it, 4 threads were '+PBU.fmt(sp('PY314T','4'),1)+'x faster and 8 threads '+PBU.fmt(sp('PY314T','8'),1)+'x on 3.14t ('+PBU.fmt(sp('PY315T','4'),1)+'x and '+PBU.fmt(sp('PY315T','8'),1)+'x on 3.15rc3t). Not 4x and 8x: other programs were using the CPU, two of the ten cores are slower efficiency cores, and part of the job (splitting, merging) is serial.';
  const rows=[];KEYS.forEach(k=>['4','8'].forEach(n=>rows.push({name:LAB[k]+', '+n+' threads',v:sp(k,n),label:PBU.fmt(sp(k,n),2)+'x',col:F[k].free_threaded?'var(--c3)':'var(--c2)'})));
  PBU.bars($('pb-ft-bars'),rows);
  const ov=(f,g)=>(F[f].scale['1'].median_s/F[g].scale['1'].median_s-1)*100;
  const ovt='3.14t '+(ov('PY314T','PY314')>=0?'+':'')+PBU.fmt(ov('PY314T','PY314'),0)+'% and 3.15rc3t '+(ov('PY315T','PY315')>=0?'+':'')+PBU.fmt(ov('PY315T','PY315'),0)+'% single-thread time against the GIL build of the same version (one workload, five runs, busy machine)';
  $('pb-ft-ovh').textContent=ovt;$('pb-ft-fix1').textContent=ovt;
  $('pb-ft-cmp4').textContent=PBU.fmt(sp('PY314T','4'),1)+'x';
  $('pb-ft-fix4').textContent=PBU.fmt(sp('PY314T','4'),1)+'x';

  // lost updates
  const lost=k=>F[k].race_nolock.map(x=>F[k].expected_tokens-x);
  const l14=lost('PY314'),l14t=lost('PY314T');
  PBU.drill($('pb-drill-race'),'Four threads, one shared dict, no lock, on the <b>normal 3.14 build with the GIL</b>. Out of '+F.PY314.expected_tokens.toLocaleString('en-US')+' tokens, how many are lost per run?',
    [{t:'None: the GIL makes it safe',right:Math.max(...l14)===0},{t:'Some runs lose a few hundred or thousand',right:Math.max(...l14)>0&&Math.max(...l14)<20000},{t:'Tens of thousands every run',right:Math.min(...l14)>=10000}],
    ()=>'<div class="pb-tbl"><table><thead><tr><th>Build</th><th>Tokens lost in each of 5 runs, no lock</th><th>With a lock (3 runs)</th></tr></thead><tbody>'+
      KEYS.map(k=>'<tr><td>'+LAB[k]+'</td><td class="n">'+lost(k).map(x=>x.toLocaleString('en-US')).join(', ')+'</td><td class="n">'+F[k].race_lock.map(x=>(F[k].expected_tokens-x).toLocaleString('en-US')).join(', ')+'</td></tr>').join('')+'</tbody></table></div>'+
      'With the GIL: '+l14.filter(x=>x>0).length+' of 5 runs lost updates (up to '+Math.max(...l14).toLocaleString('en-US')+' tokens). Without it: every run, '+Math.min(...l14t).toLocaleString('en-US')+' to '+Math.max(...l14t).toLocaleString('en-US')+' tokens.');

  $('pb-orjson').innerHTML=PB.orjson.map(l=>PBU.line(l)).join('\n');
  // wheels sentence
  const W=PB.wheels.pkgs,ks=Object.keys(W),n14=ks.filter(k=>W[k].cp314t).length,n15=ks.filter(k=>W[k].cp315t).length,miss=ks.filter(k=>!W[k].cp314t);
  $('pb-ft-wheels').innerHTML='How common is support? Of '+ks.length+' popular compiled packages on PyPI (latest releases, '+PB.wheels.fetched.slice(0,10)+'), <b>'+n14+'</b> ship a free-threaded 3.14 wheel and '+n15+' already ship one for 3.15; without a cp314t wheel: '+miss.map(k=>E(k)).join(', ')+'. The full table is in the {{Runtime lab|#t-pb-lab}}.'.replace('{{Runtime lab|#t-pb-lab}}','<a href="#" data-tab="t-pb-lab">Runtime lab</a>');

  // JIT
  const J=PB.jit.runs,V=['3.13','3.14','3.15'],C=['char_loop','float_loop','objects','gen_pipeline','json_count'];
  const CN={char_loop:'Character loop (the token counter)',float_loop:'Float arithmetic loop',objects:'Small objects and method calls',gen_pipeline:'Generator pipeline',json_count:'json.loads plus token counting'};
  const r=(v,c)=>J[v+'|'+c+'|0'].median_s/J[v+'|'+c+'|1'].median_s;
  const cat=x=>x<0.9?0:x<1.15?1:x<1.8?2:3,cr=cat(r('3.15','char_loop'));
  PBU.drill($('pb-drill-jit'),'Predict: with <code>PYTHON_JIT=1</code> on 3.15.0rc3, how much faster is the token counter\'s character loop?',
    [{t:'Slower',right:cr===0},{t:'About the same (within 10%)',right:cr===1},{t:'1.2x to 1.8x faster',right:cr===2},{t:'1.8x or more',right:cr===3}],
    'Measured: '+PBU.fmt(r('3.15','char_loop'),2)+'x ('+PBU.fmt(J['3.15|char_loop|0'].median_s*1000,0)+' ms off, '+PBU.fmt(J['3.15|char_loop|1'].median_s*1000,0)+' ms on). On 3.14 the same loop: '+PBU.fmt(r('3.14','char_loop'),2)+'x. The table has all five workloads.');
  const cell=x=>'<td class="n" style="color:'+(x>=1.1?'var(--good)':x<=0.91?'var(--bad)':'var(--mute)')+'">'+PBU.fmt(x,2)+'x</td>';
  $('pb-jit-tbl').innerHTML='<thead><tr><th>Workload (JIT on vs off)</th>'+V.map(v=>'<th class="n">'+v+'</th>').join('')+'</tr></thead><tbody>'+C.map(c=>'<tr><td>'+CN[c]+'</td>'+V.map(v=>cell(r(v,c))).join('')+'</tr>').join('')+'</tbody>';
  $('pb-jit-note').textContent='Speed-up = time with PYTHON_JIT=0 divided by time with PYTHON_JIT=1; green 1.1x or better, red 0.91x or worse, grey within noise. Median of 3 processes x 7 timed repeats; load average '+PBU.la(PB.jit.loadavg_start)+' at the start. All times are in the Runtime lab.';

  // subinterpreters
  const IN=PB.interp;
  const row=(name,f)=>'<tr><td>'+name+'</td>'+['PY314','PY315'].map(k=>'<td class="n">'+f(IN[k])+'</td>').join('')+'</tr>';
  $('pb-int-tbl').innerHTML='<thead><tr><th></th><th class="n">3.14.8</th><th class="n">3.15.0rc3</th></tr></thead><tbody>'+
    row('Start one thread and run a call',d=>PBU.fmt(d.startup_ms.thread,3)+' ms')+row('Start one subinterpreter and run a call',d=>PBU.fmt(d.startup_ms.subinterpreter,2)+' ms')+row('Spawn one process and run a call',d=>PBU.fmt(d.startup_ms.process_spawn,1)+' ms')+
    row('Job: 1 thread (serial)',d=>PBU.fmt(d.job_s.serial.median_s,3)+' s')+row('Job: 4 threads',d=>PBU.fmt(d.job_s.threads.median_s,3)+' s')+row('Job: 4 processes',d=>PBU.fmt(d.job_s.processes.median_s,3)+' s')+row('Job: 4 subinterpreters',d=>PBU.fmt(d.job_s.subinterpreters.median_s,3)+' s')+'</tbody>';
  $('pb-int-note').textContent='Normal (GIL) builds. Job: the 100,000-line count, split 4 ways, median of 5, result checked each time. Load average '+['PY314','PY315'].map(k=>PBU.la(IN[k].loadavg_start)).join(' and ')+'.';

  // section nav highlight
  const nav=$('pb-nav');if(nav&&'IntersectionObserver' in window){const links=[...nav.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)})}
  RD.tabLinks($('t-pb-read'));
})();
