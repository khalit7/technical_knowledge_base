// ---- Reading s5: one cross-CPU wake-up, step by step: this VM (target idle or busy) against bare hardware ----
(function(){
  const box=document.getElementById('wk-steps');if(!box)return;
  const V=window.VD,f1=x=>(+x).toFixed(1),f2=x=>(+x).toFixed(2);
  const ex=f2(V.hvf.mmio_med),kick=f2(V.hvf.kick_med),wake=f1(V.hvf.wake_med);
  const S={
    idle:[
      ['guest','Thread A on vCPU 1 writes to the pipe','The guest kernel finds thread B asleep; B last ran on vCPU 2, which is idle. It must send vCPU 2 a reschedule IPI (resched_curr, smp_send_reschedule).'],
      ['exit','vCPU 1 writes the distributor register: VM exit 1','A store to the emulated GICv2 distributor (GICD_SGIR) is an MMIO access: vCPU 1\'s host thread returns from hv_vcpu_run into QEMU. One exit cost '+ex+' µs on this laptop.'],
      ['host','QEMU emulates the interrupt controller','Holding its global lock, QEMU marks the interrupt pending for vCPU 2 and kicks vCPU 2\'s thread: a signal plus hv_vcpus_exit. vCPU 1 re-enters the guest.'],
      ['wake','macOS wakes vCPU 2\'s sleeping host thread','vCPU 2 had run wfi (idle), exited, and QEMU put its thread to sleep in pselect. The signal wakes it. Waking an idle host thread this way took '+wake+' µs (median) in a separate test.'],
      ['host','vCPU 2\'s thread injects the interrupt','It takes the global lock, marks the virtual IRQ pending (hv_vcpu_set_pending_interrupt) and enters the guest.'],
      ['exit','The guest acknowledges the IPI: VM exit 2','Linux reads the CPU interface\'s acknowledge register (GICC_IAR): another MMIO access, another exit.'],
      ['exit','The guest ends the IPI: VM exit 3','After the handler, Linux writes the end-of-interrupt register (GICC_EOIR): a third exit.'],
      ['guest','Thread B runs and reads the byte','The scheduler on vCPU 2 switches to B. Measured: '+f1(V.ipi.idle_one_way_med)+' µs one way for the whole path.']],
    busy:[
      ['guest','Thread A on vCPU 1 writes to the pipe','Thread B sleeps; vCPU 2 is busy running a nice 19 loop, so it is inside the guest, not idle. B still needs a reschedule IPI to preempt the loop.'],
      ['exit','vCPU 1 writes the distributor register: VM exit 1','The same MMIO store and exit as before ('+ex+' µs per exit).'],
      ['host','QEMU emulates the interrupt controller','Under its global lock it marks the interrupt pending for vCPU 2 and kicks it.'],
      ['kick','QEMU forces vCPU 2 out of the guest','vCPU 2\'s thread is inside hv_vcpu_run, so hv_vcpus_exit makes it exit: '+kick+' µs measured. No host thread has to wake.'],
      ['host','vCPU 2\'s thread injects the interrupt','Pending IRQ set; back into the guest.'],
      ['exit','The guest acknowledges the IPI: VM exit 2','GICC_IAR read.'],
      ['exit','The guest ends the IPI: VM exit 3','GICC_EOIR write.'],
      ['guest','Thread B preempts the loop and reads the byte','Measured: '+f1(V.ipi.busy_one_way_med)+' µs one way. Faster than the idle case because no sleeping host thread had to be woken.']],
    bm:[
      ['guest','Thread A on CPU 1 writes to the pipe','Same kernel decision: B sleeps, its CPU is idle, send a reschedule IPI.'],
      ['hw','CPU 1 writes the interrupt controller','On real hardware this register write goes to the interrupt controller itself, which delivers the IPI. No software in between.'],
      ['hw','CPU 2 wakes from wfi','The idle instruction ends in hardware when the interrupt arrives.'],
      ['hw','CPU 2 acknowledges and ends the interrupt','Plain register accesses to real hardware: no exits.'],
      ['guest','Thread B runs and reads the byte','Measured on the same laptop, natively on macOS (cores chosen by macOS): '+f2(V.hvf.pipe_one_way_med)+' µs one way. Bare-metal Linux was not measured here.']]
  };
  const TOT={idle:V.ipi.idle_one_way_med,busy:V.ipi.busy_one_way_med,bm:V.hvf.pipe_one_way_med};
  const NAME={idle:'This VM, target idle',busy:'This VM, target busy',bm:'Bare hardware (macOS)'};
  const TAG={guest:'guest',exit:'VM exit',host:'QEMU',wake:'host wake-up',kick:'forced exit',hw:'hardware'};
  let mode='idle';
  function bars(){const mx=Math.max(TOT.idle,TOT.busy,TOT.bm);let h='';
    ['bm','busy','idle'].forEach(k=>{h+='<div class="r'+(k===mode?' on':' off')+'"><span class="lbl">'+NAME[k]+'</span><span><span class="bar" style="display:block;width:'+Math.max(1,TOT[k]/mx*100)+'%;--bc:'+(k==='bm'?'var(--good)':k==='busy'?'var(--c5)':'var(--bad)')+'"></span></span><span class="num">'+f1(TOT[k])+' µs</span></div>'});
    document.getElementById('wk-bars').innerHTML='<div class="small mute">One-way hand-off, measured medians, to scale</div>'+h}
  function draw(i){const st=S[mode];let h='';
    st.forEach((s,k)=>{h+='<div class="'+(k===i?'on':k<i?'done':'')+'"><b>'+TAG[s[0]]+'</b><span>'+(k+1)+'. '+s[1]+'</span></div>'});
    box.innerHTML=h;const d=st.slice(0,i+1);
    const exits=d.filter(s=>s[0]==='exit').length,wakes=d.filter(s=>s[0]==='wake').length,kicks=d.filter(s=>s[0]==='kick').length;
    document.getElementById('wk-cnt').innerHTML=RD.stat('VM exits',exits,mode==='bm'?'none on hardware':'each about '+ex+' µs')+RD.stat('Host thread wake-ups',wakes+kicks,wakes?'idle vCPU woken':kicks?'running vCPU kicked':'')+RD.stat('One way, measured',i===st.length-1?f1(TOT[mode])+' µs':'...','median of 3 runs');
    document.getElementById('wk-cap').innerHTML='<div class="t">'+st[i][1]+'</div><p>'+st[i][2]+'</p>';bars()}
  const a=RD.anim({card:'wk-card',ctl:'wk-ctl',n:S.idle.length,draw,ms:1800,label:'Wake-up step'});
  RD.seg(document.getElementById('wk-mode'),m=>{mode=m;a.reset(S[m].length);a.play()});
})();
