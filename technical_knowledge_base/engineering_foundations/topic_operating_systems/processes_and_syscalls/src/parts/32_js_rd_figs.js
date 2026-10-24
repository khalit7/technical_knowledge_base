// ---- Reading: static annotated figures (2026-10-24 rebuild): the hero, clone flags, a signal's life, the three tables, the DataLoader ----
// All drawn at the measured width, two layouts (narrow below 560 px), labels on the figure, captions in HTML. No motion.
(function(){
  if(!window.RD)return;
  const esc=RD.esc;
  const T=(x,y,s,o)=>RD.t(x,y,esc(s),o);
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const defs=id=>'<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const arr=(id,x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.col||'var(--mute)')+'" stroke-width="'+(o.w||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+' marker-end="url(#'+id+')"/>'};
  const lines=(x,y,arr2,o)=>arr2.map((s,i)=>T(x,y+i*((o&&o.lh)||14),s,o)).join('');

  // 1. Hero: the job's process tree above the system-call boundary, one trainer's kernel record below it
  function hero(){
    const el=document.getElementById('rd-hero');if(!el)return;
    const W=RD.width(el),nar=W<560,fs=11;let b=defs('rdhA');
    const bw=nar?Math.min(150,(W-24)/2):170,bh=26;
    const cx=W/2;
    // user space
    b+=T(4,12,'user space: processes and threads',{fs:fs,fill:'var(--mute)'});
    const rh=40,yT=22,yR=yT+bh+24,yW=yR+rh+28;
    const xT=cx-bw/2;b+=box(xT,yT,bw,bh)+T(xT+8,yT+17,'torchrun (launcher)',{fs:fs,w:600});
    const xR0=nar?8:cx-bw-30,xR1=nar?W-bw-8:cx+30;
    b+=box(xR0,yR,bw,rh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+T(xR0+8,yR+16,'train.py rank 0',{fs:fs,w:600})+T(xR0+8,yR+31,'+ 8 threads, same process',{fs:10.5});
    b+=box(xR1,yR,bw,rh)+T(xR1+8,yR+16,'train.py rank 1 ...',{fs:fs})+T(xR1+8,yR+31,'one per GPU',{fs:10.5,fill:'var(--mute)'});
    b+='<path d="M'+cx+','+(yT+bh)+' V'+(yT+bh+12)+' H'+(xR0+bw/2)+' V'+yR+' M'+cx+','+(yT+bh+12)+' H'+(xR1+bw/2)+' V'+yR+'" fill="none" stroke="var(--mute)"/>';
    const ww=nar?Math.min(100,(W-40)/2):bw*0.8,xW0=nar?4:xR0-ww*0.55,xW1=nar?xW0+ww+24:xR0+bw*0.6;
    [xW0,xW1].forEach((x,i)=>{b+=box(x,yW,ww,bh)+T(x+6,yW+17,(nar?'worker ':'pt_data_worker ')+i,{fs:fs});
      b+='<line x1="'+(xR0+bw/2)+'" y1="'+(yR+rh)+'" x2="'+(x+ww/2)+'" y2="'+yW+'" stroke="var(--mute)"/>'});
    // the boundary
    const yB=yW+bh+26;
    b+='<line x1="0" y1="'+yB+'" x2="'+W+'" y2="'+yB+'" stroke="var(--acc)" stroke-width="1.5" stroke-dasharray="6 4"/>';
    b+=T(W-4,yB-6,nar?'system-call boundary':'system-call boundary: svc / syscall, about 270 ns',{fs:fs,a:'end',fill:'var(--acc)',w:600});
    const ax=(xW0+ww+xW1)/2;b+=arr('rdhA',ax,yR+rh,ax,yB+22,{col:'var(--acc)',w:1.6});
    b+=T(ax+6,yB+16,'fork, execve, wait4, kill, read, write ...',{fs:10.5,fill:'var(--acc)'});
    // kernel record
    const yK=yB+28;b+=T(4,yK+12,'kernel: the record of rank 0 (task_struct, one per thread)',{fs:fs,fill:'var(--mute)'});
    const parts=[
      ['address space (mm)',['fork: copied, pages COW','thread: shared','exec: replaced']],
      ['fd table (files)',['fork: copied, same files','thread: shared','exec: closes CLOEXEC']],
      ['signals (sighand, mask)',['fork: copied, no pending','thread: handlers shared','exec: handlers reset']],
      ['ids, limits, pgid, sid',['fork: inherited','thread: shared','exec: kept']]];
    const cols=nar?2:4,gw=8,cw=(W-8-gw*(cols-1))/cols,ch=78;let yy=yK+20;
    parts.forEach((p,i)=>{const c=i%cols,r=Math.floor(i/cols),x=4+c*(cw+gw),y=yy+r*(ch+gw);
      b+=box(x,y,cw,ch,{fill:'var(--bg)',stroke:'var(--acc)'})+T(x+7,y+16,p[0],{fs:fs,w:600})+lines(x+7,y+34,p[1],{fs:10.5,fill:'var(--mute)'})});
    const H=yy+Math.ceil(parts.length/cols)*(ch+gw)+2;
    el.innerHTML=RD.svg(W,H,b,'The training job as a process tree above the system-call boundary, and one trainer\'s kernel record below it');
  }

  // 2. Clone flags: shared or copied, per resource, under fork, a thread, vfork
  const FL={
    fork:{rows:[0,0,0,0,0],cap:'<b>fork</b>: no sharing flags, so the child gets copies of everything: its own page tables over the same pages (copy-on-write), its own descriptor table pointing at the same open files, its own copy of the handlers, a new thread group. A new process. glibc\'s <code>fork()</code> is <code>clone(CLONE_CHILD_SETTID | CLONE_CHILD_CLEARTID | SIGCHLD)</code>.'},
    thread:{rows:[1,1,1,1,1],cap:'<b>A thread</b>: <code>CLONE_VM | CLONE_FS | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD</code> (plus a few more in the strace below): everything is shared and the new task joins the caller\'s thread group, so <code>getpid()</code> returns the same number. Nothing is copied, which is why a thread is cheap and why one thread\'s crash takes the process down.'},
    vfork:{rows:[1,0,0,0,0],cap:'<b>vfork and posix_spawn</b>: <code>CLONE_VM | CLONE_VFORK</code>: the child borrows the parent\'s memory (nothing to copy, so the cost does not grow with the parent) and the parent is suspended until the child calls exec or <code>_exit</code>. Everything else is copied, as in fork.'}};
  const RES=[['address space','CLONE_VM','copied: page tables; pages shared COW','page tables'],['fd table','CLONE_FILES','copied: new table, same open files','same open files'],['cwd, root, umask','CLONE_FS','copied','own cwd'],['signal handlers','CLONE_SIGHAND','copied: same handlers, own table','same handlers'],['thread group','CLONE_THREAD','new group, so a new PID','new PID']];
  let flMode='fork';
  function flags(){
    const el=document.getElementById('rd-flags-svg');if(!el)return;
    const W=RD.width(el),nar=W<560,fs=11,lw=nar?96:140,cw=(W-lw-14)/2,rh=nar?40:34;let b='';
    b+=T(lw+cw/2,14,'calling task',{fs:fs,a:'middle',w:600})+T(lw+cw+10+cw/2,14,'new task',{fs:fs,a:'middle',w:600});
    const M=FL[flMode];
    RES.forEach((r,i)=>{const y=22+i*(rh+6);
      b+=T(0,y+15,r[0],{fs:fs,w:600})+T(0,y+29,r[1],{fs:10,fill:'var(--mute)'});
      if(M.rows[i]){b+=box(lw,y,cw*2+10,rh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+T(lw+cw+5,y+rh/2+4,'shared ('+r[1]+')',{fs:fs,a:'middle',w:600})}
      else{b+=box(lw,y,cw,rh,{fill:'var(--soft)'})+T(lw+8,y+rh/2+4,'original',{fs:fs,fill:'var(--mute)'})+
        box(lw+cw+10,y,cw,rh,{fill:'var(--bg)',stroke:'var(--c2)'})+(nar?T(lw+cw+16,y+15,'copy',{fs:fs,w:600})+T(lw+cw+16,y+30,r[3],{fs:10,fill:'var(--mute)'}):T(lw+cw+18,y+rh/2+4,r[2],{fs:fs}))}
    });
    let H=22+RES.length*(rh+6);
    if(flMode==='vfork'){b+=T(lw,H+12,'parent suspended until the child calls exec or _exit',{fs:fs,fill:'var(--bad)',w:600});H+=20}
    el.innerHTML=RD.svg(W,H,b,'Which resources a new task shares with or copies from its parent');
    const cap=document.getElementById('rd-flags-cap');if(cap)cap.innerHTML=M.cap;
  }

  // 3. A signal's life: generated, maybe dropped, pending, blocked, delivered
  function sig(){
    const el=document.getElementById('rd-sig-svg');if(!el)return;
    const W=RD.width(el),wide=W>=760,fs=11;let b=defs('rdsA');
    const S=[
      ['1 Generated',['kill(pid, SIGTERM)','kernel: SIGCHLD, SIGSEGV','terminal: Ctrl-C'],'var(--line)'],
      ['2 Dropped if ignored',['action is SIG_IGN, or','PID 1 with the default','(prepare_signal)'],'var(--line)'],
      ['3 Pending',['thread set or process set','standard: one bit, a','second copy is lost','real-time: queued'],'var(--acc)'],
      ['4 Blocked?',['in the thread\'s mask:','stays pending until','it is unblocked'],'var(--line)'],
      ['5 Delivered',['on return to user mode:','handler frame, then','rt_sigreturn; or the','default action'],'var(--line)']];
    let H;
    if(wide){const g=18,bw=(W-g*(S.length-1)-2)/S.length,bh=86;
      S.forEach((s,i)=>{const x=1+i*(bw+g);b+=box(x,4,bw,bh,{fill:i===2?'var(--acc2)':'var(--soft)',stroke:s[2],sw:i===2?1.5:1})+T(x+7,20,s[0],{fs:fs,w:600})+lines(x+7,37,s[1],{fs:10.5});
        if(i<S.length-1)b+=arr('rdsA',x+bw+1,4+bh/2,x+bw+g-1,4+bh/2)});
      H=bh+8}
    else{const bh=s=>22+s[1].length*14,g=16;let y=2;
      S.forEach((s,i)=>{const h=bh(s);b+=box(1,y,W-2,h,{fill:i===2?'var(--acc2)':'var(--soft)',stroke:s[2],sw:i===2?1.5:1})+T(9,y+16,s[0],{fs:fs,w:600})+T(W*0.42,y+16,s[1][0],{fs:10.5})+lines(W*0.42,y+30,s[1].slice(1),{fs:10.5});
        y+=h;if(i<S.length-1){b+=arr('rdsA',W/2,y+1,W/2,y+g-1);y+=g}});
      H=y+2}
    el.innerHTML=RD.svg(W,H,b,'The life of a signal: generated, dropped if ignored, pending, possibly blocked, delivered on return to user mode');
  }

  // 4. Three tables: the real FDSIM model after open, fork and a second open
  function fdt(){
    const el=document.getElementById('rd-fdt-svg');if(!el||!window.FDSIM)return;
    const st=FDSIM.run([{op:'proc 1 parent'},{op:'tty 1'},{op:'open 1 train.log O_WRONLY|O_CREAT|O_TRUNC'},{op:'fork 1 2 child'},{op:'open 2 train.log O_WRONLY'},{op:'write 1 3 PARENT\\n'}]);
    FDSIM.draw(el,st[st.length-1],Math.max(300,RD.width(el)));
  }

  // 5. The DataLoader: main process, two forked workers, queues, SIGCHLD and the watchdog
  function dl(){
    const el=document.getElementById('rd-dl-svg');if(!el)return;
    const W=RD.width(el),nar=W<620,fs=11;let b=defs('rddA');
    const mainL=['train.py main process','SIGCHLD handler (4)','index queue per worker','one result queue'];
    if(!nar){
      const mw=Math.min(230,W*0.34),ww=Math.min(250,W*0.36),wx=W-ww-2,wh=70,mh=2*wh+28;
      b+=box(2,4,mw,mh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+T(10,22,mainL[0],{fs:fs,w:600})+lines(10,40,mainL.slice(1),{fs:10.5});
      [0,1].forEach(i=>{const y=4+i*(wh+28);b+=box(wx,y,ww,wh)+T(wx+8,y+17,'pt_data_worker '+i+' (forked, daemon)',{fs:fs,w:600})+lines(wx+8,y+34,['(2) handlers for SIGBUS, SIGSEGV,','SIGFPE, SIGTERM; 1 thread; seed','(3) watchdog: getppid() every 5.0 s'],{fs:10,fill:'var(--mute)',lh:12.5});
        const yc=y+wh/2,x1=2+mw,x2=wx;
        b+=arr('rddA',x1+2,yc-8,x2-2,yc-8,{col:'var(--acc)'})+T((x1+x2)/2,yc-12,'(1) fork; (3) indices',{fs:10.5,a:'middle',fill:'var(--acc)'});
        b+=arr('rddA',x2-2,yc+8,x1+2,yc+8)+T((x1+x2)/2,yc+21,'(3) batch as a /dev/shm fd',{fs:10.5,a:'middle',fill:'var(--mute)'})});
      const H=4+2*(wh+28)+20;
      b+=T(2,H-6,'(4) a worker dies: SIGCHLD, waitid, RuntimeError in the main thread.  (5) shutdown: done event, stop message, join 5.0 s.',{fs:10.5,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,b,'The DataLoader main process and its two forked worker processes');return}
    const mh=74;b+=box(2,2,W-4,mh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+T(10,20,mainL[0],{fs:fs,w:600})+lines(10,38,mainL.slice(1),{fs:10.5});
    const ww=(W-14)/2,wy=mh+58,wh=96;
    [0,1].forEach(i=>{const x=2+i*(ww+10);b+=box(x,wy,ww,wh)+T(x+6,wy+16,'worker '+i+' (forked)',{fs:fs,w:600})+lines(x+6,wy+32,['(2) C handlers','for SIGTERM and','crashes; 1 thread','(3) getppid()','every 5.0 s'],{fs:10,fill:'var(--mute)',lh:12.5});
      const xc=x+ww/2;b+=arr('rddA',xc-10,mh+4,xc-10,wy-2,{col:'var(--acc)'})+arr('rddA',xc+10,wy-2,xc+10,mh+4)});
    const lx=2+ww/2+18;b+=T(lx,mh+24,'(1) fork, (3) indices',{fs:10.5,fill:'var(--acc)'})+T(lx,mh+40,'(3) batches as fds',{fs:10.5,fill:'var(--mute)'});
    const H=wy+wh+40;
    b+=T(2,H-22,'(4) a worker dies: SIGCHLD, RuntimeError',{fs:10.5,fill:'var(--mute)'})+T(2,H-7,'(5) shutdown: stop message, join 5.0 s',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'The DataLoader main process and its two forked worker processes');
  }

  const all=()=>{hero();flags();sig();fdt();dl()};
  const fm=document.getElementById('rd-flags-mode');if(fm)RD.seg(fm,m=>{flMode=m;flags()});
  all();RD.onRender(all);RD.onResize(all);
})();
