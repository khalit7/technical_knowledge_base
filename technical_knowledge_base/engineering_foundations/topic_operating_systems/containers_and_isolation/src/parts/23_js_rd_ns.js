// ---- Section 1: namespace costs (table cells, log-scale bars, whole-command costs) ----
(function(){
  const D=window.CT_DATA,E=RD.esc,f1=x=>x>=100?Math.round(x).toLocaleString('en-US'):x.toFixed(1);
  const by={};D.nscost.forEach(r=>by[r.k]=r);
  document.querySelectorAll('#t-read [data-ns]').forEach(td=>{const r=by[td.dataset.ns];td.textContent=r?f1(r.med)+' us ('+f1(r.p90)+')':''});
  document.querySelectorAll('#t-read [data-cmd]').forEach(s=>{s.textContent=D.cmdcost[+s.dataset.cmd].med.toFixed(2)});
  const st=D.starts.slice().sort((a,b)=>a-b);document.getElementById('rd-dstart').textContent=st[Math.floor(st.length/2)].toFixed(3);
  const el=document.getElementById('rd-nscost');
  const rows=D.nscost.filter(r=>r.k!=='none');const max=Math.log10(5000),min=Math.log10(1);
  el.innerHTML='<div class="hb">'+rows.map(r=>{const w=Math.max(2,100*(Math.log10(r.med)-min)/(max-min));
    return '<div class="l">'+E(r.k)+'</div><div class="r"><span class="bar" style="width:'+w.toFixed(1)+'%;--bc:'+(r.med>1000?'var(--bad)':r.med>10?'var(--c5)':'var(--acc)')+'"></span><span class="v">'+f1(r.med)+' us</span></div>'}).join('')+
    '<div class="sub">Bar length is log10 of the median from 1 to 5,000 microseconds. "all but user" creates six at once in one call.</div></div>';
})();
// ---- Section 2: seven ways to start the job, stopped with docker stop (step animation) ----
(function(){
  const D=window.CT_DATA,E=RD.esc;const M={};D.stop.forEach(s=>M[s.id]=s);
  // each variant: processes [label, pid inside] and steps [caption, {pid: state}] ; states: sig, dead, kill, ok, ''
  const V={
    A_init_shell:{p:[['tini (docker-init)',1],['sh -c',7],['python3 stopjob.py',8]],s:[
      ['docker stop sends SIGTERM to PID 1, which is tini.',{1:'sig'}],
      ['tini forwards SIGTERM to its only child, the shell (tini.c line 526).',{1:'',7:'sig'}],
      ['The shell has no handler: SIGTERM terminates it at once. Python received nothing.',{7:'dead'}],
      ['tini reaps the shell and exits with the shell\'s status, 128 + 15 = 143.',{1:'dead',7:'dead'}],
      ['PID 1 is gone: the kernel\'s zap_pid_ns_processes SIGKILLs every other process in the namespace (pid_namespace.c line 211).',{1:'dead',7:'dead',8:'kill'}],
      ['Result.',{1:'dead',7:'dead',8:'dead'}]]},
    B_init_group:{p:[['tini, TINI_KILL_PROCESS_GROUP=1',1],['sh -c',7],['python3 stopjob.py',8]],s:[
      ['docker stop sends SIGTERM to PID 1, which is tini.',{1:'sig'}],
      ['tini sends SIGTERM to the child\'s whole process group (kill(-pid)): the shell and Python both get it.',{7:'sig',8:'sig'}],
      ['The shell dies at once. Python\'s C-level handler sets a flag; its Python handler has not run yet.',{7:'dead',8:'sig'}],
      ['tini sees its child exit and exits with 143.',{1:'dead',7:'dead',8:'sig'}],
      ['The namespace\'s SIGKILL reaches Python before its handler ran: the log has no SIGTERM line.',{1:'dead',7:'dead',8:'kill'}],
      ['Result.',{1:'dead',7:'dead',8:'dead'}]]},
    C_shell_pid1:{p:[['sh -c',1],['python3 stopjob.py',7]],s:[
      ['docker stop sends SIGTERM to PID 1, which is the shell.',{1:'sig'}],
      ['The shell has no SIGTERM handler, and PID 1 of a namespace ignores signals whose action is the default (signal.c lines 89 to 91). Nothing happens.',{1:''}],
      ['Docker waits the grace period, 10 s.',{}],
      ['Docker sends SIGKILL from outside the namespace, which PID 1 cannot ignore.',{1:'kill'}],
      ['PID 1 is gone: the kernel SIGKILLs Python.',{1:'dead',7:'kill'}],
      ['Result.',{1:'dead',7:'dead'}]]},
    D_dumb_init:{p:[['dumb-init',1],['sh -c',7],['python3 stopjob.py',8]],s:[
      ['docker stop sends SIGTERM to PID 1, which is dumb-init.',{1:'sig'}],
      ['dumb-init runs its child in a new session and forwards to the whole process group (dumb-init.c line 66): shell and Python.',{7:'sig',8:'sig'}],
      ['The shell dies at once.',{7:'dead',8:'sig'}],
      ['dumb-init sees its child exit and exits with 143.',{1:'dead',7:'dead',8:'sig'}],
      ['The namespace\'s SIGKILL reaches Python before its handler ran.',{1:'dead',7:'dead',8:'kill'}],
      ['Result.',{1:'dead',7:'dead',8:'dead'}]]},
    E_init_exec:{p:[['tini (docker-init)',1],['python3 (exec replaced sh)',7]],s:[
      ['docker stop sends SIGTERM to PID 1, which is tini.',{1:'sig'}],
      ['tini forwards SIGTERM to its child, which is now Python: exec replaced the shell and kept its PID.',{7:'sig'}],
      ['Python\'s handler sets the stop flag; the loop starts the checkpoint.',{7:'ok'}],
      ['The checkpoint (about 1 s) is written, fsynced and renamed into place; Python exits 0.',{7:'dead'}],
      ['tini exits with its child\'s status, 0. Nothing is left to kill.',{1:'dead',7:'dead'}],
      ['Result.',{1:'dead',7:'dead'}]]},
    F_bash_trap:{p:[['bash fwd.sh (trap)',1],['python3 stopjob.py',7]],s:[
      ['docker stop sends SIGTERM to PID 1, which is bash. It has a trap, so PID 1 does not ignore it.',{1:'sig'}],
      ['The trap runs kill -TERM on Python.',{1:'',7:'sig'}],
      ['Python\'s handler sets the stop flag; the loop starts the checkpoint. bash waits.',{7:'ok'}],
      ['The checkpoint is saved; Python exits 0.',{7:'dead'}],
      ['bash\'s second wait returns 0 and bash exits 0.',{1:'dead',7:'dead'}],
      ['Result.',{1:'dead',7:'dead'}]]},
    G_python_pid1:{p:[['python3 stopjob.py',1]],s:[
      ['docker stop sends SIGTERM to PID 1, which is Python itself.',{1:'sig'}],
      ['Python installed a SIGTERM handler, so the signal is not ignored even for PID 1.',{1:'sig'}],
      ['The handler sets the stop flag; the loop starts the checkpoint.',{1:'ok'}],
      ['The checkpoint is saved.',{1:'ok'}],
      ['Python exits 0; the container ends.',{1:'dead'}],
      ['Result.',{1:'dead'}]]}
  };
  let cur='A_init_shell';
  const tb=document.querySelector('#rd-stop-tab tbody');
  tb.innerHTML=D.stop.map(s=>'<tr><td>'+E(s.cmd.replace(/^docker run /,'').replace(/kb-os-cont:1 /,''))+'</td><td>'+s.s.toFixed(2)+' s</td><td>'+s.code+'</td><td>'+(s.saved?'<span class="pill ok">saved</span>':'<span class="pill bad">lost</span>')+'</td></tr>').join('');
  function draw(i){
    const v=V[cur],m=M[cur],st=v.s[i],last=i===v.s.length-1;
    document.getElementById('rd-stop-cmd').innerHTML='<code>'+E(m.cmd)+'</code>';
    // cumulative state up to step i
    const state={};for(let k=0;k<=i;k++)Object.assign(state,v.s[k][1]);
    document.getElementById('rd-stop-proc').innerHTML='<div class="box"><b>docker stop</b>outside</div><span class="arrow">&#8594;</span>'+v.p.map(([n,p])=>{const s=state[p]||'';
      return '<div class="box '+(s==='dead'?'dead':s==='kill'?'kill':s==='sig'?'sig':s==='ok'?'ok':'')+'"><b>PID '+p+'</b>'+E(n)+(s==='kill'?'<br><span class="small" style="color:var(--bad)">SIGKILL</span>':s==='sig'?'<br><span class="small" style="color:var(--c5)">SIGTERM</span>':s==='ok'?'<br><span class="small" style="color:var(--good)">checkpointing</span>':'')+'</div>'}).join('<span class="arrow">&#8594;</span>');
    const cap=last?(m.saved?'The checkpoint was saved and the container exited '+m.code+', '+m.s.toFixed(2)+' s after docker stop.':'No checkpoint: the container exited '+m.code+' after '+m.s.toFixed(2)+' s, and the checkpoint file is '+m.ckpt+'.'):st[0];
    document.getElementById('rd-stop-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+v.s.length+'</div><p>'+E(cap)+'</p>';
    document.getElementById('rd-stop-cnt').innerHTML=RD.stat('docker stop to exit',last?m.s.toFixed(2)+' s':'...','measured')+RD.stat('exit code',last?String(m.code):'...',last?(m.code===143?'128 + SIGTERM':m.code===137?'128 + SIGKILL':'clean'):'')+RD.stat('checkpoint',last?(m.saved?'saved':'lost'):'...',last?'file: '+m.ckpt:'');
    document.getElementById('rd-stop-log').textContent='the job\'s log (seconds from docker stop):\n'+m.log.slice(0,last?99:Math.min(m.log.length,1+Math.floor(i/2))).join('\n');
  }
  const a=RD.anim({card:'rd-stop-card',ctl:'rd-stop-ctl',n:6,draw,ms:1700,label:'Step of the stop'});
  RD.seg(document.getElementById('rd-stop-mode'),m=>{cur=m;a.reset(V[m].s.length);a.play()});
})();
