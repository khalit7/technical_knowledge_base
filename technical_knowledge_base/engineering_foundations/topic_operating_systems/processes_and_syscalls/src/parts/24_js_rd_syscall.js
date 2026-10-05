// ---- Reading 2: one os.read() call, step by step (open fd, closed fd, under strace) and the cost ladder ----
(function(){
  if(!document.getElementById('rd-sc-card'))return;
  const L=['Python: your line','CPython: os.read','glibc: read()','CPU: svc / eret','kernel: entry (el0_svc)','kernel: sys_read','strace (another process)'];
  // each step: layer index, register changes, caption title, text, counters delta {x: crossings, s: tracer stops, t: tracer syscalls}
  const common0=[
    {l:0,r:{},t:'Python asks for up to 4,096 bytes',p:'<code>data = os.read(fd, 4096)</code> with <code>fd</code> = 3, an open 27-byte file. The bytecode loop calls the C function behind <code>os.read</code>.'},
    {l:1,r:{},t:'CPython prepares a buffer and lets go of the GIL',p:'<code>os_read_impl</code> allocates a 4,096-byte <code>bytes</code> object and releases the GIL, so other Python threads can run while this one waits in the kernel.'},
    {l:2,r:{x0:'3',x1:'buf',x2:'4096'},t:'The C calling convention fills x0 to x2',p:'glibc\'s <code>read(3, buf, 4096)</code> receives its arguments in x0, x1, x2, exactly where the system-call ABI wants them, so there is nothing to move.'},
    {l:2,r:{},t:'More than one thread: take the cancellable path',p:'<code>__libc_single_threaded</code> is 0 because torch started threads, so glibc marks this call as a cancellation point before entering the kernel.'},
    {l:2,r:{x8:'63'},t:'mov x8, #63',p:'The call number goes in x8. 63 is <code>read</code> in the generic table arm64 uses.'},
    {l:3,r:{},t:'svc #0: user mode ends here',p:'The CPU raises a synchronous exception: it saves the return address in ELR_EL1 and the status in SPSR_EL1, switches to EL1 (kernel mode) and its stack, and jumps to the kernel\'s vector. Your program cannot choose where it lands.',d:{x:1}},
    {l:4,r:{},t:'Kernel entry: what kind of exception?',p:'All registers are saved into <code>struct pt_regs</code> on the kernel stack. <code>el0t_64_sync_handler</code> reads the exception class: SVC64, a system call. <code>el0_svc</code> calls <code>do_el0_svc</code> with regs[8] = 63.'}
  ];
  const traceEntry=[
    {l:4,r:{},t:'A tracer is attached: stop at entry',p:'<code>el0_svc_common</code> sees the syscall-trace flag that ptrace set, and <code>ptrace_report_syscall_entry</code> stops this thread (state "t, tracing stop"). The scheduler switches to something else.',d:{s:1}},
    {l:6,r:{},t:'strace wakes up and reads your registers',p:'strace was blocked in <code>wait4</code>; it returns with "stopped at syscall entry". It asks for the registers with <code>ptrace</code>, decodes call 63 with x0 = 3, prints <code>read(3, </code>, and resumes you with <code>ptrace(PTRACE_SYSCALL)</code>. Measured: 4 wait4, 4 ptrace and 2 write calls per traced call, entry and exit together.',d:{t:5}}
  ];
  const lookupOk={l:5,r:{},t:'sys_read: find the file, copy the bytes',p:'<code>invoke_syscall</code> indexes <code>sys_call_table[63]</code> (bounds-checked with <code>array_index_nospec</code>) and calls <code>sys_read</code>. It looks up fd 3 in this process\'s descriptor table (section 7), gets the <code>struct file</code>, and <code>vfs_read</code> copies 27 bytes from the page cache into <code>buf</code>.'};
  const lookupErr={l:5,r:{},t:'sys_read: fd 3 is not open',p:'The descriptor table has no file at index 3 (it was closed earlier). <code>sys_read</code> returns <code>-EBADF</code>, which is -9. No data moves.'};
  const retOk={l:3,r:{x0:'27'},t:'Result in x0, eret back to user mode',p:'The kernel writes 27 into the saved x0 and executes <code>eret</code>: EL0 again, at the instruction after <code>svc</code>.',d:{x:1}};
  const retErr={l:3,r:{x0:'-9'},t:'Result in x0, eret back to user mode',p:'The kernel writes -9 into the saved x0. The kernel never touches <code>errno</code>: that is a C-library idea.',d:{x:1}};
  const traceExit=[
    {l:4,r:{},t:'Stop again at exit',p:'On the way out, <code>ptrace_report_syscall_exit</code> stops the thread a second time so strace can see the result.',d:{s:1}},
    {l:6,r:{},t:'strace prints the result',p:'strace reads x0 (27) and the 27 bytes of the buffer from your memory (<code>process_vm_readv</code> or <code>PTRACE_PEEKDATA</code>), prints <code>"hello..."..., 4096) = 27</code>, and resumes you.',d:{t:5}}
  ];
  const tailOk=[
    {l:2,r:{},t:'glibc: is it an error?',p:'<code>cmn x0, #0x1, lsl #12</code> compares 27 with -4096. Not in -4095..-1, so it is a byte count. glibc returns 27.'},
    {l:1,r:{},t:'CPython: GIL back, shrink the buffer',p:'Reacquire the GIL, resize the <code>bytes</code> object from 4,096 to 27 bytes.'},
    {l:0,r:{},t:'data is 27 bytes',p:'Two mode switches in total. Without a tracer the whole trip costs a few hundred nanoseconds (269 ns for <code>getppid</code>, measured).'}
  ];
  const tailErr=[
    {l:2,r:{x0:'-1'},t:'glibc: -9 is an error: set errno',p:'-9 is in -4095..-1, so glibc jumps to its error path: it finds this thread\'s <code>errno</code> through <code>tpidr_el0</code>, stores 9 (EBADF) there, and returns -1.'},
    {l:1,r:{},t:'CPython: -1 means "look at errno"',p:'<code>os_read_impl</code> sees -1, reads <code>errno</code> = 9 and builds the exception with <code>PyErr_SetFromErrno</code>.'},
    {l:0,r:{},t:'OSError: [Errno 9] Bad file descriptor',p:'The exception surfaces at your line. The same path gives <code>FileNotFoundError</code> (errno 2), <code>PermissionError</code> (13), <code>BlockingIOError</code> (11).'}
  ];
  const seqs={
    ok:common0.concat([lookupOk,retOk],tailOk),
    err:common0.concat([lookupErr,retErr],tailErr),
    trace:common0.concat(traceEntry,[lookupOk],traceExit,[retOk],tailOk)
  };
  let mode='ok';
  const lyr=document.getElementById('rd-sc-lyr'),reg=document.getElementById('rd-sc-reg'),cap=document.getElementById('rd-sc-cap'),cnt=document.getElementById('rd-sc-cnt');
  function draw(i){
    const s=seqs[mode],st=s[i];
    lyr.innerHTML=L.map((n,k)=>(k===6&&mode!=='trace')?'':'<div class="'+(k>=4&&k<=5?'k':(k===6?'':'u'))+(k===st.l?' on':'')+'">'+n+'</div>').join('');
    const R={x0:'?',x1:'?',x2:'?',x8:'?'};let changed={};
    for(let k=0;k<=i;k++){Object.assign(R,s[k].r);if(k===i)changed=s[k].r}
    reg.innerHTML=Object.keys(R).map(k=>'<div class="'+(k in changed?'ch':'')+'"><b>'+k+'</b>'+R[k]+'</div>').join('');
    const c={x:0,s:0,t:0};for(let k=0;k<=i;k++){const d=s[k].d||{};c.x+=d.x||0;c.s+=d.s||0;c.t+=d.t||0}
    cnt.innerHTML=RD.stat('Mode switches',c.x,'user to kernel and back')+(mode==='trace'?RD.stat('Tracer stops',c.s,'thread stopped for strace')+RD.stat('strace\'s own calls',c.t,'measured per traced call'):'');
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+s.length+': '+st.t+'</div><p>'+st.p+'</p>';
  }
  const A=RD.anim({card:'rd-sc-card',ctl:'rd-sc-ctl',n:seqs.ok.length,draw,ms:2200,label:'Step of the system call'});
  RD.seg(document.getElementById('rd-sc-mode'),m=>{mode=m;A.reset(seqs[m].length);A.play()});

  // cost ladder (log scale): root's measurements plus this page's
  const el=document.getElementById('rd-sc-chart');
  const rows=[['function call (root)',1.30,'c3'],['clock_gettime via vDSO (root)',23.57,'c3'],['getppid() via syscall() (here)',PD.sysc.plain_ns,'c1'],['getppid (root)',280.9,'c1'],['os.getppid() from Python (here)',PD.sysc.py_ns,'c1'],['read 1 byte /dev/zero (root)',316.4,'c1'],['pread 4 KiB from page cache (root)',607.3,'c1'],['getppid under strace (here)',PD.sysc.strace_ns,'c2']];
  function chart(){
    const W=RD.width(el),lw=Math.min(230,W*0.45),pw=W-lw-70,h=rows.length*22+30;
    const lg=v=>Math.log10(v),x=v=>lw+pw*(lg(v)-0)/(lg(2e5)-0);
    let b='';[1,10,100,1e3,1e4,1e5].forEach(t=>{b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="4" y2="'+(h-22)+'" stroke="var(--line)"/>'+RD.t(x(t),h-8,t>=1e3?(t/1e3)+' µs':t+' ns',{a:'middle',fs:10,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=8+i*22;b+=RD.t(lw-6,y+11,r[0],{a:'end',fs:11})+'<rect x="'+lw+'" y="'+y+'" width="'+Math.max(1,x(r[1])-lw)+'" height="14" rx="2" fill="var(--'+r[2]+')"/>'+RD.t(x(r[1])+4,y+11,r[1]>=1000?(r[1]/1000).toFixed(0)+' µs':r[1].toFixed(r[1]<10?1:0)+' ns',{fs:11})});
    el.innerHTML=RD.svg(W,h,b,'Cost of a function call, a vDSO call and system calls, log scale')+'<div class="small mute">Nanoseconds per call, log scale. "root" figures are medians of 7 repeats from the root page\'s <code>syscall_cost.c</code>; "here" figures from this page\'s <code>sysc.c</code> (median of 5) and Python\'s <code>timeit</code> (best of 5).</div>';
  }
  chart();RD.onRender(chart);RD.onResize(chart);
})();
