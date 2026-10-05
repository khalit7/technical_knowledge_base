// ---- Reading: predict-then-reveal drills, the glibc disassembly, small measured charts ----
(function(){
  // Drills: <div class="drill"><div class="q">..</div><div class="opts"><button data-right>..</button>..</div><div class="ans" hidden>..</div></div>
  document.querySelectorAll('#t-read .drill, #t-lab .drill, #t-stop .drill').forEach(d=>{
    const opts=d.querySelectorAll('.opts button'),ans=d.querySelector('.ans');
    opts.forEach(b=>b.addEventListener('click',()=>{
      opts.forEach(o=>{o.disabled=true;if(o.hasAttribute('data-right'))o.classList.add('right')});
      if(!b.hasAttribute('data-right'))b.classList.add('wrong');
      if(ans)ans.hidden=false;
    }));
  });
  // glibc read() disassembly, real gdb output, annotated
  const pre=document.getElementById('rd-disasm');
  if(pre&&window.PD){
    const note={0:'save frame',3:'load __libc_single_threaded',6:'0 means other threads exist: take the cancellable path',8:'x8 = 63, the number of read',9:'the door: trap into the kernel',10:'keep the result',11:'compare with -4096',12:'-4095..-1 means error: go set errno',16:'return the byte count',20:'(multi-threaded path) enable cancellation',25:'same call number',26:'same door',31:'disable cancellation',38:'(error path) offset of errno in thread-local storage',39:'tpidr_el0 = this thread\'s pointer',40:'w2 = -result, the error number',41:'return value will be -1',42:'errno = w2'};
    const hl={8:1,9:1,11:1,12:1,26:1,40:1,42:1};
    const lines=PD.disasm.map((l,i)=>{
      const m=l.match(/^\s*0x0*([0-9a-f]+)\s+<\+(\d+)>:\s*(.*)$/);
      const body=m?('<'+m[2].padStart(3,' ')+'>  '+m[3].replace(/\s+/g,' ').replace(/\s*\/\/.*$/,'')):l;
      const n=note[i]?'  <span class="c">// '+note[i]+'</span>':'';
      const t=RD.esc(body)+n;
      return hl[i]?'<span class="hl">'+t+'</span>':t;
    });
    // keep it readable: first 17 lines (single-threaded path), a gap, the two svc lines of the other path, the error path
    const pick=[...Array(17).keys()].concat([-1,20,25,26,31,-1,37,38,39,40,41,42,43]);
    pre.innerHTML='<span class="c">(gdb) disassemble read      # glibc 2.36, arm64, /lib/aarch64-linux-gnu/libc.so.6</span>\n'+pick.map(i=>i<0?'<span class="c">   ...</span>':lines[i]).join('\n');
  }
})();
