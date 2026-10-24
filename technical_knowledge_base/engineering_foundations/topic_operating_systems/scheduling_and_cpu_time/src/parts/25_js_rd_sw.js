// ---- Section 2: the context switch as a stepper (Linux v5.10 on arm64): what is saved where, one frame per step ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-sw-card'))return;
  const A='var(--c1)',B='var(--c3)';
  // per frame: who owns the CPU registers and the MMU, which boxes are lit, arrows [from,to], caption
  const F=[
    {reg:A,mmu:A,lit:['Au'],ar:[],t:'1 of 6. Thread A runs in user mode',p:'Its registers are in the CPU and the MMU walks A\'s page tables. The kernel is not running at all: it gets the CPU back only through a system call, an interrupt (the 1 ms timer tick here) or a fault.'},
    {reg:A,mmu:A,lit:['Ak'],ar:[['cpu','Ak']],t:'2 of 6. A enters the kernel',p:'A blocks in a read or a lock (voluntary), or the tick finds its slice used up (involuntary). The entry code saves A\'s user registers on A\'s own kernel stack. This happens on every system call, switch or not.'},
    {reg:A,mmu:A,lit:['cpu'],ar:[],t:'3 of 6. Pick the next thread',p:'<code>__schedule()</code> asks each class in order (deadline, real-time, fair, idle). The fair class returns the thread with the least virtual runtime: B.'},
    {reg:A,mmu:B,lit:['mmu'],ar:[],t:'4 of 6. Switch the address space',p:'<code>switch_mm_irqs_off()</code> points the MMU at B\'s page tables. Each address space has an ASID tag in the TLB, so nothing is flushed. If B is a thread of the same process this step is skipped.'},
    {reg:B,mmu:B,lit:['As','Bs'],ar:[['cpu','As'],['Bs','cpu']],t:'5 of 6. Swap registers and stack',p:'<code>cpu_switch_to</code>, about twenty instructions: store A\'s callee-saved registers x19 to x28, frame pointer, stack pointer and return address in A\'s task_struct, load B\'s. Its final <code>ret</code> lands on B\'s kernel stack.'},
    {reg:B,mmu:B,lit:['Bu'],ar:[['Bk','cpu']],t:'6 of 6. B resumes',p:'B finishes the kernel path it slept in and returns to user mode with the registers it saved on its own kernel stack. Measured here: 1.30 to 1.56 us for a switch between processes, sleep and wake path included (chart below).'}];
  function draw(i){const fr=F[i],el=$('sc-sw-svg'),w=RD.width(el),narrow=w<520,G=Math.max(18,Math.min(48,w*0.06)),cw=(w-8-2*G)/3+4,bh=30,gp=10,T=24;
    const cx=[4,4+cw-4+G,4+2*(cw-4+G)],H=T+3*(bh+gp)+6;let b='';
    const col={A:A,B:B};const box={};
    const mk=(id,x,y,lab,fill,lit)=>{box[id]=[x,y];b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+(cw-4).toFixed(1)+'" height="'+bh+'" rx="5" fill="'+fill+'" fill-opacity="'+(lit?.32:.1)+'" stroke="'+(lit?'var(--acc)':'var(--line)')+'" stroke-width="'+(lit?2:1)+'"/>'+
      RD.t(x+(cw-4)/2,y+bh/2+4,lab,{a:'middle',fs:11,w:lit?600:400})};
    [['thread A',cx[0],A],['CPU',cx[1],'var(--ink)'],['thread B',cx[2],B]].forEach(c=>b+=RD.t(c[1]+(cw-4)/2,14,c[0],{a:'middle',fs:12,w:600,fill:c[2]}));
    ['A','B'].forEach((k,j)=>{const x=cx[j*2];
      mk(k+'u',x,T,narrow?'user code':'user code and data',col[k],fr.lit.includes(k+'u'));
      mk(k+'k',x,T+bh+gp,narrow?'kernel stack':'kernel stack (user regs)',col[k],fr.lit.includes(k+'k'));
      mk(k+'s',x,T+2*(bh+gp),narrow?'saved regs':'task_struct: saved regs',col[k],fr.lit.includes(k+'s'))});
    mk('cpu',cx[1],T+bh+gp,(narrow?'regs: ':'registers: thread ')+(fr.reg===A?'A':'B'),fr.reg,fr.lit.includes('cpu'));
    mk('mmu',cx[1],T+2*(bh+gp),(narrow?'MMU: ':'MMU: page tables ')+(fr.mmu===A?'A':'B'),fr.mmu,fr.lit.includes('mmu'));
    b+=RD.t(cx[1]+(cw-4)/2,T+bh/2+4,i===2?'next = B':(fr.reg===A?'running: A':'running: B'),{a:'middle',fs:11,fill:'var(--mute)'});
    fr.ar.forEach(a=>{const p=box[a[0]],q=box[a[1]],y1=p[1]+bh/2,y2=q[1]+bh/2,lr=p[0]<q[0];
      const x1=lr?p[0]+cw-4:p[0],x2=lr?q[0]:q[0]+cw-4,dir=lr?1:-1;
      b+='<path d="M'+x1.toFixed(1)+' '+y1+' L'+(x2-dir*2).toFixed(1)+' '+y2+'" stroke="var(--acc)" stroke-width="2" fill="none"/>'+
        '<path d="M'+(x2-dir*8).toFixed(1)+' '+(y2-4)+' L'+x2.toFixed(1)+' '+y2+' L'+(x2-dir*8).toFixed(1)+' '+(y2+4)+'" stroke="var(--acc)" stroke-width="2" fill="none"/>'});
    el.innerHTML=RD.svg(w,H,b,'context switch step '+(i+1));
    $('sc-sw-cap').innerHTML='<div class="t">'+fr.t+'</div><p>'+fr.p+'</p>'}
  const an=RD.anim({card:'sc-sw-card',ctl:'sc-sw-ctl',n:F.length,draw,ms:2200,label:'Switch step'});
  RD.onResize(()=>an.redraw());
})();
