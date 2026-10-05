// ---- Reading section 1: one read() crossing into the kernel and back, against a plain function call ----
(function(){
  const D=window.RD_DATA&&RD_DATA.syscall;const svgEl=document.getElementById('rd-sc-svg');if(!svgEl||!D)return;
  const cap=document.getElementById('rd-sc-cap'),cnt=document.getElementById('rd-sc-cnt'),bars=document.getElementById('rd-sc-bars');
  // boxes: [id, label, lane (0 user, 1 kernel), column]
  const BOX={py:['Your code','f.read(4096)',0,0],io:['CPython _io','BufferedReader',0,1],libc:['glibc','read(fd, buf, n)',0,2],
    entry:['Kernel entry','save registers',1,0],tbl:['Syscall table','read is no. 63',1,1],vfs:['VFS','fd to file',1,2],pc:['Page cache','copy to buf',1,3],
    fn:['A function','f(x) returns x+1',0,1]};
  const SYS=[
    {at:'py',t:'Python asks for 4096 bytes',p:'Your code calls f.read(4096) on an open file. Everything so far is ordinary user-mode code: the CPU is in user mode (EL0 on ARM64).'},
    {at:'io',t:'CPython\'s io layer',p:'The BufferedReader finds its buffer empty and asks the C library to fill it. Still user mode, still a plain function call.'},
    {at:'libc',t:'glibc puts the call number in a register',p:'read() in glibc loads the system-call number (63 for read on ARM64, 0 on x86-64) and the arguments into registers, then runs svc #0 (syscall on x86-64).'},
    {at:'entry',t:'The CPU switches to kernel mode',p:'The instruction traps: the CPU raises its privilege level, switches to the kernel stack and jumps to the entry point the kernel registered at boot. The kernel saves your registers so it can resume you exactly.',cross:1},
    {at:'tbl',t:'Dispatch through the system-call table',p:'The kernel checks the number is in range and calls the handler from its table (ksys_read). Seccomp filters, used by containers, run at this point too (section 8).'},
    {at:'vfs',t:'The virtual file system checks the request',p:'The file descriptor is looked up in your process\'s table of open files; permissions were checked at open(). The VFS hands the read to the file system that owns the file.'},
    {at:'pc',t:'Bytes come from the page cache',p:'If the file\'s pages are already in memory (the page cache, section 7) the kernel copies 4096 bytes into your buffer. If not, it starts device I/O and puts your thread to sleep until the data arrives (section 3).'},
    {at:'libc',t:'Return to user mode',p:'The kernel restores your registers and returns (eret on ARM64, sysret on x86-64) to the instruction after svc. read() returns the number of bytes copied.',cross:1},
    {at:'py',t:'Python has its bytes',p:'Measured here: the cheapest system call costs a few hundred nanoseconds, a function call about one. One read() of 4096 bytes from the page cache, all included, is below a microsecond.'}];
  const FN=[
    {at:'py',t:'Your code calls a function',p:'A call pushes a return address and jumps. No privilege change, no saved state beyond a few registers.'},
    {at:'fn',t:'The function runs',p:'It runs in user mode with the same permissions as its caller: it could not touch a device even if it tried.'},
    {at:'py',t:'It returns',p:'Measured here: about a nanosecond for a call the compiler was not allowed to inline. Hundreds of times cheaper than a system call.'}];
  let mode='sys';const seq=()=>mode==='sys'?SYS:FN;
  const f=(v,d)=>v==null?'n/a':(+v).toFixed(d);
  function draw(i){
    const S=seq(),st=S[i];const W=RD.width(svgEl),H=170;const cwU=(W-10)/3,cwK=(W-10)/4,bw=Math.min(cwK-8,128);
    let b='';
    b+='<rect x="0" y="4" width="'+W+'" height="70" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(8,18,'USER MODE (EL0): your process',{fs:10.5,fill:'var(--mute)'});
    b+='<rect x="0" y="94" width="'+W+'" height="70" rx="8" fill="var(--acc2)" stroke="var(--line)"/>'+RD.t(8,108,'KERNEL MODE (EL1)',{fs:10.5,fill:'var(--mute)'});
    const used=mode==='sys'?['py','io','libc','entry','tbl','vfs','pc']:['py','fn'];
    const pos={};used.forEach(k=>{const B=BOX[k];const cw=B[2]?cwK:cwU;const x=5+B[3]*cw+(cw-bw)/2,y=B[2]?118:26;pos[k]=[x,y];
      const on=k===st.at;b+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="40" rx="6" fill="var(--bg)" stroke="'+(on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2.5:1)+'"/>';
      b+=RD.t(x+bw/2,y+16,B[0],{a:'middle',fs:bw<95?9.5:11,w:on?600:400})+RD.t(x+bw/2,y+31,B[1],{a:'middle',fs:bw<95?8.5:9.5,fill:'var(--mute)'})});
    // path so far
    for(let j=1;j<=i;j++){const a=pos[S[j-1].at],c=pos[S[j].at];if(!a||!c)continue;
      const x1=a[0]+bw/2,y1=a[1]+20,x2=c[0]+bw/2,y2=c[1]+20;
      b+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(S[j].cross?'var(--bad)':'var(--acc)')+'" stroke-width="2" stroke-dasharray="'+(S[j].cross?'5 3':'')+'" opacity="'+(j===i?1:.45)+'"/>'}
    if(mode==='sys'){b+='<line x1="0" y1="84" x2="'+W+'" y2="84" stroke="var(--bad)" stroke-dasharray="3 3"/>'+RD.t(W-6,81,'the only door: svc / syscall',{a:'end',fs:10,fill:'var(--bad)'})}
    svgEl.innerHTML=RD.svg(W,H,b,'User and kernel mode, one call');
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+st.t+'</div><p>'+st.p+'</p>';
    const crossed=S.slice(0,i+1).filter(s=>s.cross).length;
    cnt.innerHTML=RD.stat('Mode now',(BOX[st.at][2]?'kernel':'user'),'')+RD.stat('Boundary crossings',String(crossed),mode==='sys'?'2 per system call':'none for a function call')+
      RD.stat('Measured cost of the whole call',mode==='sys'?f(D.getppid_syscall_ns,0)+' ns':f(D.function_call_ns,1)+' ns',mode==='sys'?'cheapest syscall (getppid), median of 7':'non-inlined call, median of 7');
  }
  function drawBars(){
    const rows=[['Function call (user mode)',D.function_call_ns,'var(--c3)'],['clock_gettime via the vDSO (no kernel entry)',D.clock_gettime_vdso_ns,'var(--c3)'],
      ['getppid(): cheapest system call',D.getppid_syscall_ns,'var(--c1)'],['read() of 1 byte from /dev/zero',D.read_1B_devzero_ns,'var(--c1)'],['pread() of 4 KiB from the page cache',D.pread_4KiB_pagecache_ns,'var(--c2)']];
    const mx=Math.max(...rows.map(r=>r[1]||0));
    bars.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row"><div class="nm" title="'+r[0]+'">'+r[0]+'</div><div class="track"><div class="fill" style="width:'+Math.max(.6,100*r[1]/mx)+'%;background:'+r[2]+'"></div></div><div class="val">'+(r[1]<10?r[1].toFixed(1):Math.round(r[1]))+' ns</div></div>').join('')+'</div>';
    document.getElementById('rd-sc-note').innerHTML='<span class="meas">measured here</span> Median of 7 timed loops each, C compiled with gcc -O2, in kb-os-lab:1 (Linux 5.10.104 in a VM on an Apple M1), 2026-10-05: <code>src/read/code/syscall_cost.c</code>. Ratio getppid / function call: '+Math.round(D.getppid_syscall_ns/D.function_call_ns)+'x. Running inside a virtual machine adds little to a system call (it does not leave the guest kernel), but absolute numbers vary by CPU and by the kernel\'s side-channel mitigations.';
  }
  const A=RD.anim({card:'rd-sc-card',ctl:'rd-sc-ctl',n:SYS.length,draw:draw,ms:1700,label:'Step of the call'});
  RD.seg(document.getElementById('rd-sc-mode'),m=>{mode=m;A.reset(seq().length);A.play()});
  drawBars();RD.onRender(drawBars);RD.onResize(()=>{A.redraw();drawBars()});
})();
