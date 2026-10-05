// ---- Shutdown lab: the ten recorded variants, a stop-time chart, and per-variant detail ----
(function(){
  if(!window.PD||!document.getElementById('t-stop'))return;
  const V=[
    ['v1_exec','Exec form','CMD ["python", "train.py"]','python','Python is PID 1 and has a SIGTERM handler, so the kernel delivers the signal (a namespace init only drops signals that have no handler). It checkpoints and exits 0.'],
    ['v2_sh_c','sh -c, one command','sh -c "python train.py ..."','sh (dash)','Debian\'s dash 0.5.12 forks python instead of replacing itself, so PID 1 is the shell. It has no SIGTERM handler, so as a namespace init it drops SIGTERM, and it does not forward it. Python trains on until the SIGKILL at 10 s; the kernel kills the namespace.'],
    ['v3_sh_c_two','sh -c, two commands','sh -c "python train.py ...; echo ..."','sh (dash)','Same as one command: with a second command no shell could exec anyway.'],
    ['v4_bash_c','bash -c, one command','bash -c "python train.py ..."','python','Bash replaces itself with a single simple command, so Python becomes PID 1, exactly as in the exec form. The same line behaves differently under dash and bash.'],
    ['v5_sh_exec','sh -c "exec ..."','sh -c "exec python train.py ..."','python','The explicit exec makes Python PID 1 under any shell: the one-word fix for scripts and entrypoints.'],
    ['v6_init_sh','--init, sh -c, two commands','docker run --init ... sh -c "python ...; echo ..."','tini','tini forwards SIGTERM to its child, the shell. The shell is not PID 1, so the default action kills it at once; tini exits with its status, 143; the kernel then SIGKILLs Python with the rest of the namespace. Fast and wrong: no checkpoint.'],
    ['v7_init_group','--init, signal the group','... --init -e TINI_KILL_PROCESS_GROUP=1 ... sh -c "..."','tini','tini sends SIGTERM to the child\'s whole process group: shell, Python and workers. Python receives it too, but the shell dies at once and takes the namespace down before Python\'s handler gets to run (no run logged "got signal"). No checkpoint in any run.'],
    ['v8_torchrun','torchrun','torchrun --nproc-per-node 1 train.py ...','torchrun','torchrun\'s handler raises SignalException; the agent sends SIGTERM with killpg to the trainer\'s group, which includes both DataLoader workers. The workers die (torch\'s C handler), the trainer\'s SIGCHLD handler raises "DataLoader worker (pid N) is killed by signal: Terminated." mid-step, and the trainer dies before the checkpoint; torchrun exits 1.'],
    ['v9_init_exec','--init, exec form','docker run --init ... python train.py ...','tini','tini forwards SIGTERM to Python, its direct child, and would also reap orphans. The process tree caught two workers of the previous epoch as zombies (Z, &lt;defunct&gt;) for a moment, between their exit and the DataLoader\'s join.'],
    ['v10_torchrun_fixed','torchrun, workers ignore SIGTERM','torchrun ... ignore_term_in_workers.py train.py ...','torchrun','Same launcher, but each worker ignores SIGTERM (worker_init_fn). Only the trainer reacts: it finishes the step, checkpoints, shuts its workers down and exits 0. torchrun still exits 1, as it re-raises the death signal.']
  ];
  const runs=v=>PD.shutdown.filter(r=>r.v===v).sort((a,b)=>a.rep-b.rep);
  const yes=b=>b?'<span class="y">yes</span>':'<span class="n">no</span>';
  const tb=document.getElementById('sd-table');let sel='v1_exec';
  function table(){
    tb.innerHTML='<table class="tbl-sm"><thead><tr><th>Variant</th><th>PID 1</th><th class="num">docker stop, s (3 runs)</th><th class="num">exit code</th><th>Python got SIGTERM</th><th>Checkpoint</th></tr></thead><tbody>'+
      V.map(v=>{const r=runs(v[0]);return '<tr class="sd-row'+(v[0]===sel?' sel':'')+'" data-v="'+v[0]+'" tabindex="0"><td><b>'+v[1]+'</b></td><td>'+v[3]+'</td><td class="num">'+r.map(x=>x.stop_s.toFixed(2)).join(', ')+'</td><td class="num">'+[...new Set(r.map(x=>x.code))].join(', ')+'</td><td>'+r.filter(x=>x.got_signal>0).length+' of '+r.length+'</td><td>'+r.filter(x=>x.ckpt).length+' of '+r.length+'</td></tr>'}).join('')+
      '</tbody></table><p class="small mute">Click a row for its process tree, log and explanation. "Python got SIGTERM" counts runs whose log has the handler\'s "got signal 15" line.</p>';
  }
  const det=document.getElementById('sd-det');
  function detail(){
    const v=V.find(x=>x[0]===sel),r=runs(sel);let rep=0;
    const show=()=>{const x=r[rep];
      det.innerHTML='<h3>'+v[1]+'</h3><p class="small"><code>'+RD.esc(v[2])+'</code></p><p>'+v[4]+'</p>'+
        '<div class="seg" id="sd-rep">'+r.map((q,i)=>'<button data-m="'+i+'"'+(i===rep?' class="on"':'')+'>run '+q.rep+': '+q.stop_s.toFixed(2)+' s, exit '+q.code+'</button>').join('')+'</div>'+
        '<p class="small">Checkpoint: '+yes(x.ckpt)+'. Worker killed by SIGTERM: '+yes(x.worker_killed)+'.</p>'+
        '<div class="small mute">Process tree just before the stop (ps inside the container; the first line is ps itself)</div><pre class="cd">'+RD.esc(x.tree)+'</pre>'+
        '<div class="small mute">Container log: first the last three per-step lines, then every other line in order. (These runs used an earlier train.py, which printed "start method none (no workers)" whenever no method was named; the workers ran with the Linux default, fork. The root\'s train.py now prints "fork (default)" in that case.)</div><pre class="cd">'+RD.esc(x.log)+'</pre>';
      RD.seg(document.getElementById('sd-rep'),m=>{rep=+m;show()});
    };show();
  }
  tb.addEventListener('click',e=>{const tr=e.target.closest('.sd-row');if(!tr)return;sel=tr.dataset.v;table();detail();chart()});
  tb.addEventListener('keydown',e=>{if(e.key==='Enter'){const tr=e.target.closest('.sd-row');if(tr){sel=tr.dataset.v;table();detail();chart()}}});
  const el=document.getElementById('sd-chart');
  function chart(){
    const W=Math.max(300,el.clientWidth||Math.min(880,innerWidth-32)),lw=W<520?110:190,pw=W-lw-30,rh=20,h=V.length*rh+30,x=s=>lw+pw*s/11;
    let b='<line x1="'+x(10)+'" x2="'+x(10)+'" y1="2" y2="'+(h-20)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(x(10),h-6,'10 s: SIGKILL',{a:'middle',fs:10,fill:'var(--bad)'});
    [0,2,4,6,8].forEach(t=>{b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="2" y2="'+(h-20)+'" stroke="var(--line)"/>'+RD.t(x(t),h-6,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})});
    V.forEach((v,i)=>{const y=6+i*rh,r=runs(v[0]),ck=r.every(q=>q.ckpt);
      b+=RD.t(lw-6,y+11,v[1].length>(W<520?16:30)?v[1].slice(0,W<520?15:29)+'...':v[1],{a:'end',fs:11,w:v[0]===sel?600:400});
      r.forEach(q=>{b+='<circle cx="'+x(q.stop_s)+'" cy="'+(y+7)+'" r="4.5" fill="var(--'+(ck?'good':'bad')+')" opacity=".8"><title>'+v[1]+': '+q.stop_s+' s, exit '+q.code+'</title></circle>'})});
    el.innerHTML=RD.svg(W,h,b,'Seconds from docker stop to exit for each variant; green means a checkpoint was written')+'<div class="leg"><span style="--sw:var(--good)">checkpoint written</span><span style="--sw:var(--bad)">no checkpoint</span></div>';
  }
  table();detail();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-stop']=window.TAB_RENDER['t-stop']||[]).push(chart);
  addEventListener('resize',()=>{if(!document.getElementById('t-stop').hidden)chart()});
})();
