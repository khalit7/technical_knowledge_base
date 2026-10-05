// ---- Reading 6: handler latency table, signal-mask decoder, "one SIGTERM, three endings" animation ----
window.SIGNAMES=(function(){const n=['','SIGHUP','SIGINT','SIGQUIT','SIGILL','SIGTRAP','SIGABRT','SIGBUS','SIGFPE','SIGKILL','SIGUSR1','SIGSEGV','SIGUSR2','SIGPIPE','SIGALRM','SIGTERM','SIGSTKFLT','SIGCHLD','SIGCONT','SIGSTOP','SIGTSTP','SIGTTIN','SIGTTOU','SIGURG','SIGXCPU','SIGXFSZ','SIGVTALRM','SIGPROF','SIGWINCH','SIGIO','SIGPWR','SIGSYS','32 (glibc)','33 (glibc)'];
  for(let i=34;i<=64;i++)n.push(i===34?'SIGRTMIN':(i===64?'SIGRTMAX':'SIGRTMIN+'+(i-34)));return n})();
(function(){
  if(!window.PD)return;
  // latency table
  const t=document.getElementById('rd-lat');
  if(t){const cases=[...new Set(PD.latency.map(r=>r.case))];
    t.innerHTML='<table class="tbl-sm"><thead><tr><th>Main thread was doing</th><th class="num">handler ran after kill(), ms (3 runs)</th><th class="num">work left when signal sent, ms</th></tr></thead><tbody>'+
      cases.map(c=>{const r=PD.latency.filter(x=>x.case===c);return '<tr><td>'+RD.esc(c)+'</td><td class="num">'+r.map(x=>x.handler_ms.toFixed(1)).join(', ')+'</td><td class="num">'+r.map(x=>x.left_ms.toFixed(0)).join(', ')+'</td></tr>'}).join('')+
      '</tbody></table><p class="small mute">2 CPUs, torch 2.14.1+cpu with 2 threads, Python 3.11.2. Inputs were created before the clock started; the signal comes from a <code>threading.Timer</code> calling <code>os.kill(os.getpid(), SIGTERM)</code>.</p>';}
  // mask decoder
  const why={'main.ign':{2:'the job was started in the background (&) by a non-interactive shell, which by POSIX sets SIGINT and SIGQUIT to ignored; CPython then leaves SIGINT alone ("if the parent process has not changed it"), so Ctrl-C would not reach this job',3:'same: background job of a non-interactive shell',13:'CPython ignores SIGPIPE at startup so broken pipes become BrokenPipeError',25:'CPython also ignores SIGXFSZ (the subprocess docs list SIGPIPE, SIGXFZ and SIGXFSZ)'},
    'main.cgt':{15:'train.py\'s handler: set a flag, checkpoint after the step',17:'the DataLoader\'s handler (_set_SIGCHLD_handler): on any child exit it checks whether a worker died and raises in the main thread',33:'glibc\'s internal signal for applying set*id calls to every thread'},
    'worker.cgt':{7:'torch\'s C handler in each worker (_set_worker_signal_handlers): print an error, then die with the default action',8:'same (floating-point exception)',11:'same (segmentation fault)',15:'same: a worker that receives SIGTERM prints a message and dies; section 9 shows what that does under torchrun',33:'glibc internal'},
    'worker.ign':{2:'inherited from the main process through fork',3:'inherited',13:'inherited',25:'inherited'}};
  const inp=document.getElementById('rd-mask-in'),out=document.getElementById('rd-mask-out'),wy=document.getElementById('rd-mask-why');
  let key='main.ign';
  function decode(){
    let h=(inp.value||'').trim().toLowerCase().replace(/^0x/,'');
    if(!/^[0-9a-f]{1,16}$/.test(h)){out.innerHTML='<span class="mute">Type up to 16 hexadecimal digits.</span>';wy.innerHTML='';return}
    const v=BigInt('0x'+h),on=[];
    for(let s=1;s<=64;s++)if((v>>BigInt(s-1))&1n)on.push(s);
    out.innerHTML=on.length?on.map(s=>'<span class="on">'+s+' '+SIGNAMES[s]+'</span>').join(''):'<span>no signals</span>';
    const W=why[key]&&PD_MASKS&&(PD_MASKS[key.split('.')[0]][key.split('.')[1]]===h.padStart(16,'0'))?why[key]:null;
    wy.innerHTML=W?'<ul class="tight">'+on.map(s=>'<li><b>'+SIGNAMES[s]+'</b>: '+(W[s]||'not explained here')+'</li>').join('')+'</ul>':'<span class="mute">Custom mask: names only.</span>';
  }
  if(inp&&window.PD_MASKS){
    const setKey=k=>{key=k;const [p,f]=k.split('.');inp.value=PD_MASKS[p][f];decode()};
    RD.seg(document.getElementById('rd-mask-pick'),setKey);inp.addEventListener('input',()=>{key='';decode()});setKey('main.ign');
  }
  // one SIGTERM, three endings
  const S=PD.shutdown,stat=v=>{const r=S.filter(x=>x.v===v).map(x=>x.stop_s);return [Math.min(...r),Math.max(...r)]};
  const v1=stat('v1_exec'),v2=stat('v2_sh_c'),lat=PD.latency.filter(x=>/solve/.test(x.case)).map(x=>x.handler_ms/1000);
  const latLo=Math.min(...lat),latHi=Math.max(...lat);
  const f2=x=>x.toFixed(2);
  const LANES=['docker / kubelet','kernel','trainer, main thread','DataLoader workers'];
  const ok=[
    {l:0,e:'SIGTERM to PID 1',t:'0 s',c:'<code>docker stop</code> (or the kubelet deleting the pod) asks the container runtime to send SIGTERM to PID 1, here <code>python train.py</code> itself (exec form).'},
    {l:1,e:'handler installed: deliver',t:'0 s',c:'PID 1 is protected from signals with no handler, but SigCgt has bit 15 set (train.py\'s handler), so the signal goes pending and the kernel wakes the main thread.'},
    {l:2,e:'C handler sets flag',t:'~0 s',c:'CPython\'s C-level handler records "signal 15 arrived" and returns. Nothing else happens in the handler itself.'},
    {l:2,e:'Python handler: stop = True',t:'0.2 ms',c:'At the next bytecode the interpreter runs <code>on_sigterm</code>, which only sets <code>stop</code> and prints "got signal 15". Measured latency for a main thread running Python: 0.1 to 0.2 ms.'},
    {l:2,e:'finish the step',t:'+1 step',c:'The loop completes the current optimizer step, checks <code>stop</code> and leaves the loop. The model is never saved half-updated.'},
    {l:2,e:'checkpoint',t:'+5 to 9 ms',c:'<code>save_checkpoint</code>: write <code>ckpt.pt.tmp</code>, fsync, rename over <code>ckpt.pt</code>, fsync the directory (ckpt_begin to ckpt_end took 5 to 9 ms in the three logs).'},
    {l:3,e:'workers shut down',t:'',c:'<code>del it</code> makes the DataLoader send each worker a stop message, then join them; they exit 0.'},
    {l:0,e:'exit 0',t:f2(v1[0])+' to '+f2(v1[1])+' s',c:'PID 1 exits with 0, the container stops. <code>docker stop</code> returned after '+f2(v1[0])+' to '+f2(v1[1])+' s in three runs (Shutdown lab, variant "exec form").',done:{ck:'yes',code:'0'}}
  ];
  const busy=ok.slice(0,3).concat([
    {l:2,e:'inside a C++ call',t:'... '+latLo.toFixed(1)+' s',c:'The main thread is inside one long <code>torch.linalg.solve</code>. The flag is set, but no bytecode runs until the call returns: measured '+latLo.toFixed(2)+' to '+latHi.toFixed(2)+' s, the whole remaining duration of the call. On a GPU node the same happens inside a blocking synchronize or a stuck collective.'},
    {l:2,e:'Python handler: stop = True',t:latLo.toFixed(1)+' s',c:'The call returns and the Python handler finally runs. From here the path is the same as the first case.'}],
    ok.slice(4,7),[{l:0,e:'exit 0',t:'about '+(latLo+v1[0]).toFixed(1)+' s',c:'Exit 0 with a checkpoint, later by the length of the C++ call: about '+latLo.toFixed(1)+' s + '+f2(v1[0])+' s (derived: the two measurements added, not one run). Fine with a 10 or 30 s grace period; not if one step or one stuck collective is longer than the grace period.',done:{ck:'yes',code:'0'}}]);
  const pid1=[
    {l:0,e:'SIGTERM to PID 1',t:'0 s',c:'The container was started as <code>sh -c "python train.py ..."</code>. Debian\'s <code>dash</code> does not replace itself with python, so PID 1 is the shell, and SIGTERM goes to the shell.'},
    {l:1,e:'PID 1, no handler: dropped',t:'0 s',c:'The shell has no SIGTERM handler. For a namespace\'s init, <code>sig_task_ignored</code> drops a signal whose action is the default. The shell does not forward anything; python never hears of it.'},
    {l:2,e:'training continues',t:'0 to 10 s',c:'The job keeps training for the whole grace period (10 s for <code>docker stop</code>, 30 s by default on Kubernetes), unaware.'},
    {l:0,e:'SIGKILL to PID 1',t:'10 s',c:'The grace period ends; the runtime sends SIGKILL. Sent from outside the namespace, it is not dropped.'},
    {l:1,e:'namespace torn down',t:'10 s',c:'"If the \"init\" process of a PID namespace terminates, the kernel terminates all of the processes in the namespace via a SIGKILL signal" (<a href="https://man7.org/linux/man-pages/man7/pid_namespaces.7.html" target="_blank" rel="noopener noreferrer">pid_namespaces(7)</a>). Trainer and workers die mid-step.'},
    {l:0,e:'exit 137',t:f2(v2[0])+' to '+f2(v2[1])+' s',c:'Exit 137 (128 + 9) after '+f2(v2[0])+' to '+f2(v2[1])+' s, no checkpoint, in all three runs (Shutdown lab, variant "sh -c"). The fix is one word: <code>sh -c "exec python ..."</code>, or the exec form in the Dockerfile.',done:{ck:'no',code:'137'}}
  ];
  const seqs={ok,busy,pid1};let mode='ok';
  const sv=document.getElementById('rd-term-svg'),cap=document.getElementById('rd-term-cap'),cnt=document.getElementById('rd-term-cnt');
  function draw(i){
    if(!sv)return;
    const s=seqs[mode],W=RD.width(sv),lw=W<520?84:150,n=s.length,lh=30,h=LANES.length*lh+12,dx=(W-lw-16)/Math.max(1,n-1);
    let b='';
    LANES.forEach((L,k)=>{const y=6+k*lh;b+='<rect x="0" y="'+y+'" width="'+W+'" height="'+(lh-4)+'" rx="4" fill="var(--soft)"/>'+RD.t(6,y+17,W<520?L.replace('trainer, main thread','main thread').replace('DataLoader workers','workers').replace('docker / kubelet','runtime'):L,{fs:11,fill:'var(--mute)'})});
    let px=null,py=null;
    s.forEach((st,k)=>{const x=lw+k*dx,y=6+st.l*lh+(lh-4)/2,on=k<=i;
      if(px!==null&&k<=i)b+='<line x1="'+px+'" y1="'+py+'" x2="'+x+'" y2="'+y+'" stroke="var(--acc)" stroke-width="1.5" opacity=".7"/>';
      b+='<circle cx="'+x+'" cy="'+y+'" r="'+(k===i?7:5)+'" fill="'+(on?(mode==='pid1'&&k>=1&&k<=2?'var(--bad)':'var(--acc)'):'var(--dim)')+'"/>';
      px=x;py=y});
    sv.innerHTML=RD.svg(W,h,b,'Timeline of a SIGTERM through runtime, kernel, trainer and workers');
    const st=s[i];let done=null;for(let k=0;k<=i;k++)if(s[k].done)done=s[k].done;
    cnt.innerHTML=RD.stat('Time since SIGTERM',st.t||'','this step')+RD.stat('Checkpoint written',done?done.ck:'not yet','')+RD.stat('Exit code',done?done.code:'running','');
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+s.length+': '+st.e+'</div><p>'+st.c+'</p>';
  }
  if(document.getElementById('rd-term-card')){
    const A=RD.anim({card:'rd-term-card',ctl:'rd-term-ctl',n:ok.length,draw,ms:2300,label:'Step of the SIGTERM path'});
    RD.seg(document.getElementById('rd-term-mode'),m=>{mode=m;A.reset(seqs[m].length);A.play()});
    RD.onResize(()=>A.redraw());
  }
})();
