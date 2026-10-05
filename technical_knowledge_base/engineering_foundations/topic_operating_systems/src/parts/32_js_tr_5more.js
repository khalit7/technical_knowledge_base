// ---- Syscall tracer (t-trace): sections 3, 7, 8, 9: import storms, the SIGTERM path, language to kernel, method ----

// Section 3: the import storms of the fork run, plus untraced import timings
(function(){
  const {D,$,esc,fmt,med,KINDS,color,onRender,onResize,width}=TR;
  const r=D.runs.fork,S=r.storms,IT=D.importtime;
  function draw(){
    const el=$('tr-imp');
    const cards=S.map(s=>'<div class="tr-panel"><h4>'+esc(s.label)+'</h4><div class="tr-stats">'+
      st('System calls',fmt(s.n),'under strace, '+(s.t1-s.t0).toFixed(1)+' s traced')+st('Files opened',fmt(s.opened),s.pkgs.slice(0,3).map(p=>esc(p[0])+' '+fmt(p[1])).join(', '))+
      st('Missing-path checks',fmt(s.enoent),'calls that failed with ENOENT')+st('Libraries',String(s.libs.length),s.code_mb+' MB of executable code mapped')+'</div>'+
      '<div class="small">'+bars(s)+'</div></div>').join('');
    const top=IT.top_self.slice(0,8);
    el.innerHTML=cards+
      '<h3>The same import, timed without strace</h3><p><code>import torch</code> took a median of <b>'+Math.round(med(D.import_torch_ms))+' ms</b> over 7 fresh interpreters ('+D.import_torch_ms.map(x=>Math.round(x)).join(', ')+' ms; the first run, '+Math.round(D.import_torch_ms[0])+' ms, read the files from disk, the rest from the page cache). <code>python -X importtime</code> loads '+fmt(IT.n_modules)+' modules for <code>import torch</code>; the ones that spend the most time in their own code:</p>'+
      '<div class="tr-tw"><table class="tr-t"><thead><tr><th>Module</th><th class="num">Own time</th><th class="num">With its imports</th></tr></thead><tbody>'+
      top.map(t=>'<tr><td><code>'+esc(t.mod)+'</code></td><td class="num">'+(t.self_us/1000).toFixed(0)+' ms</td><td class="num">'+(t.cum_us/1000).toFixed(0)+' ms</td></tr>').join('')+'</tbody></table></div>'+
      '<p class="tr-cap">-X importtime adds its own overhead (it reports '+(IT.torch_cum_us/1e6).toFixed(2)+' s for all of torch, cold); read it for shares, not totals. Raw: <code>raw/importtime_torch.txt</code>, <code>raw/import_torch_ms.txt</code>.</p>';
  }
  function st(k,v,d){return '<div class="tr-stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>'}
  function bars(s){const W=Math.min(width($('tr-imp'))-30,860),tot=s.n;let x=0,b='';
    s.names.forEach(([n,c],i)=>{const w=W*c/tot;b+='<rect x="'+x.toFixed(1)+'" y="0" width="'+Math.max(.5,w-1).toFixed(1)+'" height="16" fill="'+color(TR.kindOf(n,''))+'" opacity="'+(1-i*0.07)+'"><title>'+n+' '+c+'</title></rect>'+(w>70?'<text x="'+(x+4)+'" y="12" font-size="10.5" fill="var(--bg)">'+n+' '+fmt(c)+'</text>':'');x+=w});
    return '<svg viewBox="0 0 '+W+' 18" width="'+W+'" height="18" role="img" aria-label="Most frequent calls in this storm">'+b+'</svg><div class="tr-cap">'+s.names.map(([n,c])=>esc(n)+' '+fmt(c)).join(' · ')+'</div>'}
  onRender(draw);onResize(draw);
})();

// Section 7: the SIGTERM path, from the fork run's trace
(function(){
  const {D,$,esc,fmt}=TR;
  const r=D.runs.fork,L=r.lanes,ev=[];
  r.events.split('\n').forEach(line=>{if(!line)return;const a=line.split('|');ev.push({lane:+a[0],t:+a[1]/10000,name:r.names[+a[2]],n:+a[3],txt:a.slice(5).join('|')})});
  const k=ev.findIndex(e=>e.name==='kill'&&/SIGTERM/.test(e.txt));
  const pick=ev.slice(Math.max(0,k)).filter(e=>
    (e.name==='kill')||(e.name==='SIGNAL'&&/SIGTERM|SIGCHLD/.test(e.txt))||e.name==='rt_sigreturn'||(e.name==='faccessat'&&/phase/.test(e.txt))||
    (e.name==='write'&&/got signal|done at/.test(e.txt))||(/ckpt/.test(e.txt)&&/^(openat|fsync|renameat|close)$/.test(e.name))||(e.name==='fsync')||e.name==='wait4'||e.name==='exit_group'||(e.name==='EXIT'&&!L[e.lane].threads)).slice(0,40);
  const sigLane=(ev.find(e=>e.name==='SIGNAL'&&/SIGTERM/.test(e.txt))||{}).lane;
  const untr=D.job_untraced;
  $('tr-sig').innerHTML='<div class="tr-list" style="max-height:none">'+pick.map(e=>'<div class="r'+(e.name==='SIGNAL'&&/SIGTERM/.test(e.txt)?' sel':'')+'"><span class="t">'+(e.t).toFixed(3)+' s</span><span class="n">'+esc(e.name)+'</span><span class="a">'+esc(L[e.lane].label.replace(/ threads.*/,' (a thread)'))+': '+esc(e.txt)+'</span></div>').join('')+'</div>'+
    '<p class="tr-cap">Selected from the fork run (times under strace). The full sequence is in the explorer above (phase "training steps", filter "sig").</p>'+
    '<div class="co warn"><div class="t">What the trace exposed: the signal went to another thread</div>'+
    'The job sent SIGTERM to its own process id, and the kernel delivered it to <b>'+esc(sigLane!=null?L[sigLane].label.replace(/ \([^)]*\)/,''):'?')+'</b>, not to the main thread. That is allowed: "A process-directed signal may be delivered to any one of the threads that does not currently have the signal blocked" (<a href="https://man7.org/linux/man-pages/man7/signal.7.html" target="_blank" rel="noopener noreferrer">signal(7)</a>). Python copes by design: its C-level handler only sets a flag, and "Python signal handlers are always executed in the main Python thread of the main interpreter, even if the signal was received in another thread" (<a href="https://docs.python.org/3.11/library/signal.html#signals-and-threads" target="_blank" rel="noopener noreferrer">signal module docs</a>), at a later point between bytecodes. So the handler ran a little late: under strace the loop finished one more step (its log ends "'+esc(D.job_logs.fork)+'"), while the three untraced runs stopped where asked ('+untr.map(esc).join('; ')+'). Two lessons for training code: keep the handler tiny (set a flag), and check the flag where it is safe to stop, accepting that a step may finish first.</div>'+
    '<div class="co"><div class="t">What the DataLoader workers do with SIGTERM</div>Each worker installs its own handlers for SIGBUS, SIGSEGV, SIGFPE and SIGTERM (visible in the trace as <code>rt_sigaction</code> calls right after the workers start, followed by <code>prctl(PR_SET_NAME, "pt_data_worker")</code>). The SIGTERM handler exits quietly only if the signal came from the parent: <code>if (info-&gt;si_pid == getppid()) _exit(EXIT_SUCCESS);</code> (<a href="https://github.com/pytorch/pytorch/blob/v2.14.1/torch/csrc/DataLoader.cpp#L91-L93" target="_blank" rel="noopener noreferrer">torch/csrc/DataLoader.cpp lines 91 to 93, v2.14.1</a>). A SIGTERM from anyone else (for example <code>pkill</code> hitting every process of the job) restores the default action and kills the worker, and the main process then reports a worker killed by a signal. Workers also poll <code>getppid()</code> to notice a dead parent (<a href="https://github.com/pytorch/pytorch/blob/v2.14.1/torch/utils/data/_utils/worker.py#L64-L71" target="_blank" rel="noopener noreferrer">worker.py lines 64 to 71</a>). The Debug lab reproduces both failures.</div>';
})();

// Section 8: one small file, five languages
(function(){
  const {D,$,esc,fmt,color,KINDS,onRender,onResize,width}=TR;
  const LANG=[['c','C','read.c: open, read, close (libc wrappers)'],['cpp','C++','read.cpp: std::ifstream into a stringstream'],['rust','Rust','read.rs: std::fs::read_to_string'],['python','Python','read.py: open(...).read()'],['node','Node','read.js: fs.readFileSync']];
  const G=D.lang;
  function cls(f){const w=f[1]||'';if(/sysdeps|syscall\.S/.test(w))return 'k';if(/^\/t\/lang\//.test(w)||/read\.(c|cpp|rs)/.test(w))return 'user';
    if(/libio|basic_file|fstream|bits\/(fcntl2|unistd)\.h/.test(w))return 'lib';return 'rt'}
  function stackHTML(b){const fr=b.frames.slice().reverse();return '<ol class="tr-stack">'+fr.map(f=>{const c=cls(f);return '<li class="'+(c==='k'?'k':c==='lib'?'lib':c==='rt'?'rt':'')+'">'+esc(f[0])+(f[1]?' <span class="w">'+esc(f[1].replace(/^\.\.?\//,''))+'</span>':'')+'</li>'}).join('')+'<li class="k">kernel: '+esc(b.call.replace(/\(.*$/,''))+'</li></ol>'}
  function draw(){
    const W=Math.min(width($('tr-lang-stats')),900),max=Math.max(...LANG.map(l=>G[l[0]].total)),narrow=W<560,lw=narrow?0:70,rowH=narrow?34:24,H=LANG.length*rowH+8;
    let s='';LANG.forEach(([k,n],i)=>{const g=G[k],y=4+i*rowH+(narrow?12:0),bw=W-lw-(narrow?120:110);let x=lw+4;
      s+=narrow?'<text x="0" y="'+(y-2)+'" font-size="11.5" fill="var(--ink)">'+n+'</text>':'<text x="'+lw+'" y="'+(y+13)+'" font-size="12" text-anchor="end" fill="var(--ink)">'+n+'</text>';
      ['proc','mem','file','ipc','time'].forEach(kk=>{const c=g.kinds[kk]||0;if(!c)return;const w=bw*c/max;s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(.8,w).toFixed(1)+'" height="16" fill="'+color(kk)+'"><title>'+n+': '+c+' '+kk+'</title></rect>';x+=w});
      s+='<text x="'+(x+4)+'" y="'+(y+13)+'" font-size="11" fill="var(--mute)">'+fmt(g.total)+(g.processes_threads>1?' ('+g.processes_threads+' threads)':'')+'</text>'});
    $('tr-lang-stats').innerHTML='<div class="tr-svg" style="grid-column:1/-1"><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="System calls per language for the whole program">'+s+'</svg><div class="tr-cap">System calls for the whole program run (start-up included), coloured by kind as in the explorer. The file itself needs three or four of them.</div></div>';
    $('tr-lang').innerHTML=LANG.map(([k,n,d])=>{const g=G[k];
      return '<div><h4>'+n+'</h4><div class="small mute">'+esc(d)+'</div><pre class="wrap" style="margin:6px 0">'+g.file.map(esc).join('\n')+'</pre>'+
        g.stacks.filter(b=>/^(openat|read)/.test(b.call)).slice(0,2).map(b=>'<details class="tr-d"><summary>Call stack at <code>'+esc(b.call)+'</code> ('+b.frames.length+' frames)</summary><div>'+stackHTML(b)+'</div></details>').join('')+'</div>'}).join('');
  }
  onRender(draw);onResize(draw);
})();

// Section 9: method, environment, files
(function(){
  const {D,$,esc,fmt,sec,med}=TR;const e=D.env;
  $('tr-how').innerHTML='<ul>'+
    '<li><b>Where:</b> image <code>kb-os-tr:1</code> (the shared <code>kb-os-lab:1</code> plus Rust and Node), Debian 12 on arm64, inside Docker Desktop\'s Linux VM on a laptop: Linux '+esc(e.kernel)+', '+esc(e.nproc)+' CPUs, containers capped at 2 CPUs and 3 GB. Python '+esc(e.python)+', PyTorch '+esc(e.torch)+' (CPU), NumPy '+esc(e.numpy)+', strace '+esc(e.strace.replace('-- version ',''))+', '+esc(e.rustc)+', Node '+esc(e.node)+', '+esc(e['g++']||'')+'. Recorded '+esc(e.date_utc)+'.</li>'+
    '<li><b>How:</b> <code>strace -f -tt -T -y -s 48</code>: follow children and threads, wall-clock time per line, time spent in each call, file paths next to descriptors, 48 bytes of each buffer. Phase markers are <code>faccessat("/phase/&lt;name&gt;")</code> calls the job makes on purpose. Call stacks: gdb catchpoints on the system calls, with symbols from <code>debuginfod.debian.net</code>. ltrace (library-call tracing) has no arm64 package in Debian 12, and this strace build has no stack-trace option (<code>-k</code>), hence gdb.</li>'+
    '<li><b>Honesty:</b> strace slows the job about '+Math.round(D.runs.fork.t_end/med(D.job_untraced.map(l=>+((l.match(/total ([\d.]+)s/)||[])[1]))))+' times, so traced times are only for ordering; costs come from untraced runs. The VM was shared with other experiments while timings ran, so spreads are shown. Paths like <code>/work</code> and <code>/t</code> are inside the container; the container\'s host name is replaced by <code>&lt;host&gt;</code> in the raw files. Collapsed rows (import storms, repeated calls) are summaries of the raw trace, which is kept whole.</li>'+
    '<li><b>Files:</b> everything is in the page\'s source folder, <code>src/trace/</code>: <code>JOB.md</code> (the running job), <code>job/</code> (its code), <code>run_all.sh</code> (re-records everything), <code>scripts/</code> (experiments, parser, redaction, gdb script), <code>raw/</code> (every trace and timing, large traces gzipped: the fork run has '+fmt(D.runs.fork.n_total)+' calls, spawn '+fmt(D.runs.spawn.n_total)+', forkserver '+fmt(D.runs.forkserver.n_total)+'), and <code>data/trace_data.json</code>, which is exactly what this tab embeds.</li>'+
    '</ul>';
})();
