// ---- Reading tab: recorded outputs, measured charts and tables, drills ----
(function(){
  const D=window.CD,V=D.v,esc=RD.esc;
  // every <b data-k> shows the recorded value (check_embed.py also checks the written fallback)
  document.querySelectorAll('[data-k]').forEach(el=>{const k=el.dataset.k;if(V[k]!==undefined)el.textContent=V[k]});
  // drills: predict, then reveal
  document.querySelectorAll('.drill').forEach(d=>{
    const opts=d.querySelectorAll('.opts button'),ans=d.querySelector('.ans');
    opts.forEach(b=>b.addEventListener('click',()=>{
      opts.forEach(o=>{o.disabled=true;if(o.hasAttribute('data-right'))o.classList.add('right')});
      if(!b.hasAttribute('data-right'))b.classList.add('wrong');
      if(ans)ans.hidden=false;
    }));
  });
  const put=(id,txt)=>{const el=document.getElementById(id);if(el)el.innerHTML=txt};
  const lines=(s,f)=>s.split('\n').filter(f).join('\n');
  const hl=(s,re)=>esc(s).split('\n').map(l=>re.test(l)?'<span class="hl">'+l+'</span>':l).join('\n');
  // section 1: clone recipe (the last three system calls) and TLS addresses
  const thr=D.raw.threads;
  const tr=thr.split('## strace -f of creating one thread')[1]||'';
  const tl=tr.split('\n').filter(l=>/MAP_STACK|8388608|clone\(|exit\(0\)/.test(l));
  put('rd-clone','<span class="c">$ strace -f -e trace=clone,clone3,mmap,mprotect,munmap,exit ./threads one   (last lines)</span>\n'+hl(tl.join('\n'),/clone\(/));
  put('rd-tls','<span class="c">$ ./threads</span>\n'+esc(lines(thr.split('## strace')[0],l=>/^thread|^default/.test(l))));
  // section 2: Peterson
  put('rd-peterson','<span class="c">$ for r in 1 2 3 4 5; do ./peterson plain 20000000; done; ... seqcst ...</span>\n'+hl(D.raw.peterson.trim(),/plain .* lost [1-9]/));
  put('rd-peterson-note','With plain variables the lock failed in every run: <b>'+V['pt.plain.lost']+'</b> increments lost out of 40 million, so two threads were inside together that many times (the <code>overlaps_seen</code> check catches only the rare cases where the overlap is still visible when the second thread looks). With sequentially consistent atomics: <b>'+V['pt.seqcst.lost']+'</b> lost in '+V['pt.runs']+' runs. Rare, timing-dependent, and real; on a quiet machine it fails more often, on a busy one less.');
  // section 4, 5, 6, 9 recorded outputs
  put('rd-mpfutex','<span class="c">$ strace -f -e trace=futex python3 mp_futex.py</span>\n'+esc(D.raw.mp_futex.trim()));
  put('rd-cv','<span class="c">$ for m in if while onecond; do for r in 1 2 3; do ./condvar $m 200000; done; done</span>\n'+hl(D.raw.condvar.trim(),/HANG|woke_to_empty_slot [1-9]/));
  put('rd-dl','<span class="c">$ sh deadlock.sh   # py-spy and /proc on a running deadlock.py</span>\n'+hl(D.raw.deadlock.trim(),/deadlock\.py:1[3]\)|deadlock\.py:21\)|futex_wait_queue_me/));
  put('rd-el','<span class="c">$ ./edge_level</span>\n'+hl(D.raw.edge_level.trim(),/-&gt; 0 ready/));
  put('rd-ur','<span class="c">$ ./uring x probe; ./uring f.bin pread; ./uring f.bin uring 32; ...   (64 MiB file in the page cache, 4 KiB blocks)</span>\n'+hl(D.raw.uring.trim(),/probe failed|not permitted|io_uring_enter|pread64/));
  // section 4: ping-pong table
  (function(){const P=D.pp,r=(c,m)=>P[c]&&P[c][m];
    const row=(c,lab)=>'<tr><td>'+lab+'</td><td class="num">'+r(c,'futex').toFixed(1)+' µs</td><td class="num">'+r(c,'condvar').toFixed(1)+' µs</td><td class="num">'+(c==='1cpu'?(r(c,'spin')/1000).toFixed(1)+' ms':r(c,'spin').toFixed(2)+' µs')+'</td></tr>';
    put('rd-pp-tbl','<thead><tr><th>Where the two threads run</th><th class="num">futex wait/wake</th><th class="num">mutex + condvar</th><th class="num">spin on an atomic</th></tr></thead><tbody>'+row('1cpu','Both on one CPU')+row('2cpu','On two CPUs')+'</tbody>');})();
  // section 9: connections table
  (function(){const C=D.conns,t=C.threads,a=C.asyncio;if(!t||!a)return;
    const row=(k,x,y,f)=>'<tr><td>'+k+'</td><td class="num">'+f(x)+'</td><td class="num">'+f(y)+'</td></tr>';
    put('rd-conn-tbl','<thead><tr><th>2,000 waiting connections</th><th class="num">a thread each</th><th class="num">one asyncio loop</th></tr></thead><tbody>'+
      row('OS threads',t.threads,a.threads,x=>x.toLocaleString('en-US'))+
      row('Virtual memory (VmSize)',t.vsz,a.vsz,x=>Math.round(x).toLocaleString('en-US')+' MiB')+
      row('Resident memory added',t.rss_added,a.rss_added,x=>Math.round(x)+' MiB')+
      row('Time to start serving',t.setup,a.setup,x=>Math.round(x)+' ms')+
      row('One round: every client sends a byte, waits for the echo',t.round,a.round,x=>x.toFixed(1)+' ms')+'</tbody>');})();
  // section 10: the job, per torch thread count
  (function(){const el=document.getElementById('rd-job');if(!el)return;
    function show(n){const b=D.job[n]||'';el.innerHTML='<span class="c">$ sh job_threads.sh '+n+'</span>\n'+hl(b.trim(),/^calls: futex|^## strace|x OpenMP/)}
    RD.seg(document.getElementById('rd-job-th'),show);show('2');})();
})();

// ---- Section 1: one process, three threads (static picture) ----
(function(){const svg=document.getElementById('rd-thr-svg');if(!svg)return;
  const t=RD.t,box=(x,y,w,h,fill,stroke)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+fill+'" stroke="'+stroke+'"/>';
  let s=box(4,4,632,202,'none','var(--line)')+t(14,22,'one process: one address space',{w:600,fs:12});
  s+=box(14,32,612,44,'var(--soft)','var(--line)')+t(24,50,'shared by every thread: code, global variables, heap (tensors, Python objects),',{fs:11.5})+t(24,66,'open file descriptors, signal handlers, current directory, memory mappings',{fs:11.5});
  ['main thread','thread 1','thread 2'].forEach((n,i)=>{const x=14+i*206;
    s+=box(x,88,196,110,'var(--bg)','var(--c'+(i+1)+')')+t(x+10,106,n,{w:600,fs:12,fill:'var(--c'+(i+1)+')'});
    s+=t(x+10,126,'registers, program counter',{fs:11})+t(x+10,144,'its own stack (8 MiB reserved)',{fs:11})+t(x+10,162,'thread-local storage (errno)',{fs:11})+t(x+10,180,'thread id; scheduled separately',{fs:11});});
  svg.innerHTML=s;})();

// ---- Section 3: seven locks, four situations (measured) ----
(function(){const el=document.getElementById('rd-lk-chart');if(!el)return;const L=window.CD.locks;
  const names={spin:'Spinlock (xchg)',yield:'Spin + sched_yield',sysc:'Wake on every unlock',futex:'Futex, hand-built',mutex:'pthread_mutex_t',adaptive:'Adaptive mutex',atomic:'Atomic add, no lock',spin1:'1 thread alone (baseline)'};
  const cols={spin:'var(--c2)',yield:'var(--c5)',sysc:'var(--c4)',futex:'var(--c3)',mutex:'var(--c1)',adaptive:'var(--c6)',atomic:'var(--mute)',spin1:'var(--dim)'};
  const caps={S1:'One thread, 10 million acquisitions, nothing inside the lock: the pure cost of lock() plus unlock().',
    S2:'Four threads on four CPUs, 500,000 acquisitions each; about 15 ns of work inside the lock and 60 ns outside.',
    S3:'Four threads on four CPUs, nothing inside or outside: maximum contention. Lower is not fairer (see text).',
    S4:'Four threads on ONE CPU, 20,000 acquisitions each; about 600 ns inside the lock, 30 ns outside: the holder is often preempted inside.'};
  let sc='S1',me='wall';
  function draw(){const d=L[sc]||{};const keys=Object.keys(names).filter(k=>d[k]);
    const W=RD.width(el),lw=Math.min(170,W*0.38),bw=W-lw-70,rh=22,H=keys.length*rh+24;
    const mx=Math.max(...keys.map(k=>Math.max(...(me==='wall'?d[k].runs:d[k].cpuruns))));
    let s='';keys.forEach((k,i)=>{const y=6+i*rh,v=d[k][me],runs=me==='wall'?d[k].runs:d[k].cpuruns;
      s+=RD.t(lw-6,y+14,names[k],{a:'end',fs:11.5});
      s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+Math.max(1,v/mx*bw)+'" height="'+(rh-8)+'" rx="2" fill="'+cols[k]+'"/>';
      const lo=Math.min(...runs),hi=Math.max(...runs);s+='<line x1="'+(lw+lo/mx*bw)+'" x2="'+(lw+hi/mx*bw)+'" y1="'+(y+rh/2+1)+'" y2="'+(y+rh/2+1)+'" stroke="var(--ink)" stroke-width="1"/>';
      s+=RD.t(lw+v/mx*bw+6,y+14,v.toFixed(1)+' ns',{fs:11});});
    el.innerHTML=RD.svg(W,H-14,s,'Lock cost by implementation');
    document.getElementById('rd-lk-cap').textContent='Nanoseconds per acquisition ('+(me==='wall'?'wall-clock time':'CPU time of all threads')+'); bar = median of 3 runs, line = range. '+caps[sc]+' Raw: src/runs/out/locks.txt.';}
  RD.seg(document.getElementById('rd-lk-sc'),m=>{sc=m;draw()});RD.seg(document.getElementById('rd-lk-me'),m=>{me=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();})();

// ---- Section 8: GIL latency (measured) ----
(function(){const el=document.getElementById('rd-gil-chart');if(!el)return;const G=window.CD.gil;
  function draw(){const rows=G.slice().sort((a,b)=>b.iv-a.iv||a.n-b.n);const W=RD.width(el),lw=Math.min(210,W*0.45),bw=W-lw-80,rh=24,H=rows.length*rh+24;
    const mx=Math.max(...rows.map(r=>r.p99));let s='';
    rows.forEach((r,i)=>{const y=6+i*rh;s+=RD.t(lw-6,y+14,(r.n===0?'no busy thread':r.n+' busy thread'+(r.n>1?'s':''))+', interval '+r.iv+' ms',{a:'end',fs:11.5});
      s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+Math.max(1,r.med/mx*bw)+'" height="'+(rh-9)+'" rx="2" fill="'+(r.iv<1?'var(--c3)':'var(--c2)')+'"/>';
      s+='<line x1="'+(lw+r.med/mx*bw)+'" x2="'+(lw+r.p99/mx*bw)+'" y1="'+(y+rh/2)+'" y2="'+(y+rh/2)+'" stroke="var(--mute)" stroke-dasharray="2 2"/>';
      s+=RD.t(lw+r.p99/mx*bw+5,y+14,r.med.toFixed(1)+' ms',{fs:11});});
    el.innerHTML=RD.svg(W,H-14,s,'GIL wake-up delay');
    document.getElementById('rd-gil-cap').textContent='How late a 2 ms sleep wakes: bar = median, dashes reach the 99th percentile. Median of three runs of 300 sleeps each; raw: src/runs/out/gil.txt. With no busy thread the delay is the VM\'s own timer and wake-up latency.';}
  RD.onRender(draw);RD.onResize(draw);draw();})();

// ---- Section 9: cost per readiness question (measured, log-log) ----
(function(){const el=document.getElementById('rd-ev-chart');if(!el)return;const E=window.CD.ev;
  function draw(){const W=RD.width(el),H=230,l=52,r=12,t=10,b=34,pw=W-l-r,ph=H-t-b;
    const lx=v=>l+(Math.log10(v))/4*pw,ly=v=>t+ph-(Math.log10(v)-2)/(6-2)*ph;let s='';
    [1,10,100,1000,10000].forEach(v=>{s+='<line x1="'+lx(v)+'" x2="'+lx(v)+'" y1="'+t+'" y2="'+(t+ph)+'" stroke="var(--line)"/>'+RD.t(lx(v),H-18,v.toLocaleString('en-US'),{a:v===10000?'end':'middle',fs:10.5})});
    [[100,'100 ns'],[1000,'1 µs'],[10000,'10 µs'],[100000,'100 µs'],[1000000,'1 ms']].forEach(([v,lab])=>{s+='<line x1="'+l+'" x2="'+(l+pw)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/>'+RD.t(l-4,ly(v)+4,lab,{a:'end',fs:10.5})});
    s+=RD.t(l+pw/2,H-3,'descriptors watched (one of them ready)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    [['select','var(--c2)'],['poll','var(--c4)'],['epoll','var(--c3)']].forEach(([k,c])=>{const pts=E.filter(e=>e[k]!=null);
      s+='<polyline fill="none" stroke="'+c+'" stroke-width="2" points="'+pts.map(e=>lx(e.n)+','+ly(e[k])).join(' ')+'"/>';
      pts.forEach(e=>s+='<circle cx="'+lx(e.n)+'" cy="'+ly(e[k])+'" r="3" fill="'+c+'"/>');
      const last=pts[pts.length-1];s+=RD.t(lx(last.n)-4,ly(last[k])-7,k,{a:'end',fs:11.5,w:600,fill:c});});
    s+='<line x1="'+(lx(512))+'" x2="'+lx(512)+'" y1="'+t+'" y2="'+(t+ph)+'" stroke="var(--c2)" stroke-dasharray="3 3"/>'+RD.t(lx(512)-4,t+12,'select limit',{a:'end',fs:10.5,fill:'var(--c2)'});
    el.innerHTML=RD.svg(W,H,s,'Cost per call against descriptors watched');
    const a=E.find(e=>e.n===10000);document.getElementById('rd-ev-cap').textContent='Best of three batches per point; one CPU; raw: src/runs/out/evloop.txt. At 10,000 descriptors poll takes '+(a.poll/1000).toFixed(0)+' µs per call, epoll '+a.epoll+' ns. The dashed line: select cannot go further, because with N pipes open the descriptor numbers reach 2N and select cannot watch descriptor 1024 or higher (it stopped at 500 pipes, descriptor 1001).';}
  RD.onRender(draw);RD.onResize(draw);draw();})();
