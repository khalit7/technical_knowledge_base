// ---- Cost lab: measured sections (one allocation, the before/after animation, a queue, failures priced) ----
(function(){
  const C=window.CO,D=C.D,$=C.$;
  const PH=[['before_proc','Container and process start','c4'],['startup','Imports, rendezvous, process group','c2'],['to_first','Data, model, DDP wrapper','c5'],
    ['train','Training steps','c3'],['ckpt','Checkpoint writes','c6'],['after','After the last step, still allocated','c1']];
  const lab=a=>a.system+(a.run.indexOf('co-')===0?' ('+(a.steps===2000?'2,000 steps':'200 steps, run '+(a.run==='co-k200b'?'2':'1'))+')':' (setup run'+(a.after==null?', no end record':'')+')');
  const sh=a=>a.train/a.alloc_s;
  // ---- numbers in prose ----
  function prose(){
    const k2=C.run('co-k200'),k20=C.run('co-k2000'),sl=D.alloc.find(a=>a.system==='Slurm'),ry=D.alloc.find(a=>a.system==='Ray');
    const q=D.queue,F=Object.fromEntries(D.fails.map(f=>[f.key,f]));
    const h=D.prices.filter(p=>p.gpu==='H100').map(p=>p.usd);
    const node=F.node;
    const v={k200share:C.pct(sh(k2)),k2000share:C.pct(sh(k20)),fifo:C.pct(q.fifo.util),bf:C.pct(q.backfill.util),
      dlsec:C.fs(q.deadlock.to_s-q.deadlock.from_s),dlgpus:C.num(12*(q.deadlock.to_s-q.deadlock.from_s)),
      nodex:(node.held_gpu_s/F.base.held_gpu_s).toFixed(1)+'x',pmin:'$'+Math.min(...h).toFixed(2),pmax:'$'+Math.max(...h).toFixed(2),
      k8safter:C.fs(k2.after),ckslurm:C.fs(sl.ckpt/4),ckk8s:C.fs(k2.ckpt/4),tcpu:C.fs(sl.total_cpu_s),cpucap:C.num(sl.ncpu*sl.alloc_s),
      cpueff:C.pct(sl.cpu_eff),slshare:C.pct(sh(sl)),raybefore:C.fs(ry.before_proc),slbefore:C.fs(sl.before_proc),
      fifowait:C.fs(q.fifo.mean_wait),bfwait:C.fs(q.backfill.mean_wait),kqmax:C.pct(q.kueue.per_job/q.kueue.quota),
      nodedet:C.fs(node.fault_to_end),nodegap:C.fs(node.gaps[0]),hangdet:C.fs(F.hang.fault_to_end)};
    document.querySelectorAll('#t-cost [data-co]').forEach(el=>{const k=el.dataset.co;if(k in v)el.textContent=v[k]});
    C.prose=v;
  }
  prose();
  // ---- one allocation ----
  const order=['Slurm|setup job 1','Kubernetes|co-k200','Kubernetes|co-k200b','Kubernetes|setup run','Kubernetes|co-k2000','Ray|setup run'];
  let cur='Kubernetes|co-k200';
  $('co-al-seg').innerHTML=order.map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+C.esc(lab(C.runs[k.split('|')[1]+'|'+k.split('|')[0]]))+'</button>').join('');
  C.seg($('co-al-seg'),m=>{cur=m;drawAl()});
  $('co-al-leg').innerHTML=PH.map(p=>'<span><i style="background:var(--'+p[2]+')"></i>'+p[1]+'</span>').join('');
  function bar(a,x0,y,W,H,scale,upto){ // upto: number of phases shown (animation)
    let x=x0,s='';
    PH.forEach((p,i)=>{const v=a[p[0]];if(v==null)return;const w=v*scale;if(upto==null||i<upto)s+=C.rect(x,y,w,H,C.col(p[2]),{rx:1});x+=w});
    s+=C.rect(x0,y,a.alloc_s*scale,H,'none',{stroke:C.col('ink'),sw:1,rx:1,dash:a.after==null?'4 3':null});
    return s;
  }
  function axis(x0,y,W,max){let s='';const st=max>60?10:max>20?5:2;
    for(let v=0;v<=max+1e-9;v+=st){const x=x0+v*W/max;s+=C.line(x,y,x,y+4,C.col('mute'))+C.t(x,y+15,v+' s',{a:x>x0+W-30?'end':'middle',fs:10,fill:C.col('mute')})}return s}
  function drawAl(){
    const k=cur.split('|'),a=C.runs[k[1]+'|'+k[0]],el=$('co-al-svg'),W=C.width(el),x0=12,BW=W-26,max=Math.ceil(a.alloc_s);
    const sc=BW/max;let s=bar(a,x0,8,BW,30,sc)+axis(x0,42,BW,max);
    el.innerHTML=C.svg(W,62,s,'Allocation of '+lab(a)+' split by phase');
    const out=[C.stat('Allocated',C.fs(a.alloc_s)+' x '+a.gpus+' GPUs',C.num(a.alloc_s*a.gpus,1)+' GPU-seconds'),
      C.stat('In training steps',C.pct(sh(a)),C.fs(a.train)+', '+C.num(a.steps)+' steps at '+C.num(a.per_step_ms,1)+' ms'),
      C.stat('Before the first step',C.fs(a.before_proc+a.startup+a.to_first),'container, imports, rendezvous, model'),
      C.stat('Checkpoints',C.fs(a.ckpt),C.num(a.steps/50)+' writes of 1.39 MB'),
      C.stat('After the last step',a.after==null?'not recorded':C.fs(a.after),'teardown until the allocation ended')];
    if(a.cpu_eff!=null)out.push(C.stat('CPU efficiency (sacct)',C.pct(a.cpu_eff),'TotalCPU '+C.fs(a.total_cpu_s)+' of '+C.num(a.ncpu*a.alloc_s)+' CPU-s'));
    $('co-al-out').innerHTML=out.join('');
    $('co-al-note').textContent='Accounting: '+a.accounting+'. Final global loss '+a.gloss+' at step '+a.steps+'.';
  }
  // ---- before/after animation: 200 vs 2000 steps on kind ----
  let am='co-k200';
  const STEPS=[['Kueue admits the Workload: the allocation starts, 4 fake GPUs are now paid for, nothing runs yet.',0],
    ['The two pods start their containers and torchrun.',1],['torchrun imports torch, the agents meet at the rendezvous, workers spawn and join the process group.',2],
    ['Each rank loads the data, builds the model and wraps it in DDP.',3],['Training steps: the only part of the allocation that moves the model.',4],
    ['Checkpoint writes every 50 steps (summed here) on the kind nodes\' host folder.',5],['After the last step: processes exit, the Job controller sees both pods succeed, Kueue marks the Workload finished. Only then is the allocation released.',6]];
  function drawAm(i){
    const a=C.run(am),b=C.run(am==='co-k200'?'co-k2000':'co-k200'),el=$('co-am-svg'),W=C.width(el),x0=12,BW=W-26;
    const max=Math.ceil(Math.max(a.alloc_s,b.alloc_s)),sc=BW/max;
    let s=C.t(x0,12,C.esc(lab(a)),{fs:11,w:600})+bar(a,x0,18,BW,26,sc,STEPS[i][1])+
      C.t(x0,64,'the other run, same scale: '+C.esc(lab(b)),{fs:10,fill:C.col('mute')})+'<g opacity="0.45">'+bar(b,x0,70,BW,12,sc)+'</g>'+axis(x0,86,BW,max);
    el.innerHTML=C.svg(W,106,s,'Allocation of the running example filling up phase by phase');
    let used=0,tr=0;PH.forEach((p,j)=>{if(j<STEPS[i][1]&&a[p[0]]!=null){used+=a[p[0]];if(p[0]==='train')tr+=a[p[0]]}});
    if(i===STEPS.length-1)used=a.alloc_s;
    $('co-am-cap').innerHTML='<b>Step '+(i+1)+' of '+STEPS.length+'.</b> '+STEPS[i][0]+'<br><span class="small">Allocated so far: <b>'+C.fs(used)+'</b> ('+C.num(used*4,1)+' GPU-s); in training steps: <b>'+C.fs(tr)+'</b>'+(used>0?' = '+C.pct(tr/used)+' of it':'')+'.</span>';
  }
  const AM=C.anim({card:'co-am-card',ctl:'co-am-ctl',n:STEPS.length,draw:drawAm,ms:1500,label:'Allocation phase'});
  C.seg($('co-am-seg'),m=>{am=m;AM.reset()});
  // ---- a queue ----
  let qm='fifo';
  C.seg($('co-q-seg'),m=>{qm=m;drawQ()});
  function gantt(js,cap,max,W,label){ // rows per job, thickness by GPUs
    const x0=24,BW=W-x0-8,sc=BW/max;let y=6,s='';
    js.forEach(j=>{const h=6+j.g*3;s+=C.t(x0-6,y+h/2+4,j.n,{a:'end',fs:11})+C.rect(x0+j.st*sc,y,(j.en-j.st)*sc,h,C.col('c1'),{rx:2})+
      C.t(x0+j.en*sc+3>W-30?x0+j.st*sc+3:x0+j.en*sc+3,y+h/2+4,j.g+' GPU',{fs:10,fill:x0+j.en*sc+3>W-30?'#fff':C.col('mute')});y+=h+4});
    // busy GPUs over time
    const ts=[...new Set(js.flatMap(j=>[j.st,j.en]))].sort((a,b)=>a-b);const H=50,y0=y+8;
    s+=C.t(x0,y0-1,'GPUs busy (of '+cap+')',{fs:10,fill:C.col('mute')});
    for(let i=0;i<ts.length-1;i++){const b=js.filter(j=>j.st<=ts[i]&&j.en>ts[i]).reduce((a,j)=>a+j.g,0);
      s+=C.rect(x0+ts[i]*sc,y0+4+H*(1-b/cap),(ts[i+1]-ts[i])*sc,H*b/cap,C.col('c3'),{rx:0})}
    s+=C.rect(x0,y0+4,max*sc,H,'none',{stroke:C.col('line'),rx:0});
    const st=max>600?200:100;for(let v=0;v<=max;v+=st){const x=x0+v*sc;s+=C.t(x,y0+H+18,v+' s',{a:x>W-24?'end':v===0?'start':'middle',fs:10,fill:C.col('mute')})}
    return [s,y0+H+24];
  }
  function drawQ(){
    const el=$('co-q-svg'),W=C.width(el),q=D.queue;let body='',H=60,out=[],cap='';
    if(qm==='fifo'||qm==='backfill'){const r=q[qm],max=Math.max(q.fifo.makespan,q.backfill.makespan);
      const g=gantt(r.jobs,8,max,W);body=g[0];H=g[1];
      out=[C.stat('GPU-seconds used',C.num(r.gpu_s),'of '+C.num(8*r.makespan)+' available'),C.stat('Scheduling efficiency',C.pct(r.util,1),'over the '+C.fs(r.makespan)+' makespan'),C.stat('Mean wait',C.fs(r.mean_wait),'submit to start')];
      cap=qm==='fifo'?'Slurm with sched/builtin (strict FIFO), 8 fake GPUs on 2 nodes, the Scheduling lab\'s eight jobs (scaled to minutes), times from sacct. B needs 6 GPUs, so it waits for A, and every job behind it waits too, with GPUs free.':
        'The same jobs with sched/backfill: small jobs start in the holes as long as they do not delay the reserved start of the big job. Same work, '+C.pct(1-q.backfill.makespan/q.fifo.makespan)+' shorter makespan.';
    }else if(qm==='deadlock'){const d=q.deadlock,x0=70,BW=W-x0-10;let s='';const nodes=['worker','worker2','worker3'],own=['sc-a','sc-c','sc-b'];
      nodes.forEach((n,i)=>{const y=8+i*30;s+=C.t(x0-6,y+15,n,{a:'end',fs:11});for(let g=0;g<4;g++)s+=C.rect(x0+g*(Math.min(34,BW/6)),y,Math.min(30,BW/6-4),20,C.col('bad'),{op:0.8});
        s+=C.t(x0+4*Math.min(34,BW/6)+6,y+15,own[i]+' pod 0: held, waiting',{fs:11})});
      s+=C.t(x0,108,'Each job\'s pod 1: Pending, "Insufficient example.com/gpu"',{fs:11,fill:C.col('mute')});
      body=s;H=118;out=[C.stat('GPUs allocated','12 of 12','from '+d.from_s+' s'),C.stat('Training steps','0','in '+C.fs(d.to_s-d.from_s)),C.stat('GPU-seconds held for nothing',C.num(12*(d.to_s-d.from_s)),'until the lab stopped it')];
      cap='kind with the default kube-scheduler (no gang scheduling in v1.37 by default), three 2-pod jobs of 4 fake GPUs per pod. Each job got one pod placed; the second pods cannot fit. Scheduler message: '+C.esc(d.msg);
    }else if(qm==='kueue'){const k=q.kueue,ends=k.admits.slice(1).concat([k.end]);const js=k.admits.map((a,i)=>({n:'sc-'+'abc'[i],g:8,st:a,en:ends[i]}));
      const g=gantt(js,12,k.end,W);body=g[0];H=g[1];
      const used=js.reduce((a,j)=>a+j.g*(j.en-j.st),0);
      out=[C.stat('Most GPUs ever busy','8 of 12',C.pct(8/12)+' of quota'),C.stat('Scheduling efficiency',C.pct(used/(12*(k.end-k.admits[0]+1)),1),'admitted GPU-s over quota GPU-s'),C.stat('Waits (Kueue events)',k.waits.map(w=>w.match(/(\d+)s$/)[1]+' s').join(', '),'quota reserved after')];
      cap='The same three jobs through Kueue: admitted whole or not at all, one at a time. No deadlock, but 4 GPUs sit idle throughout because no waiting job fits in 4 (fragmentation). Each bar runs from one admission to the next, so it includes the allocation tail after training (see One allocation).';
    }else{const r=q.ray_pg,x0=6;let s='',y=6;
      r.forEach(p=>{s+=C.t(x0,y+12,C.esc(p.name)+' ('+p.strategy+', '+p.n+')',{fs:11})+C.t(W-8,y+12,p.state,{a:'end',fs:11,fill:p.state==='CREATED'?C.col('good'):C.col('bad'),w:600});
        if(p.note)s+=C.t(x0+12,y+26,C.esc(p.note),{fs:10,fill:C.col('mute')});y+=p.note?32:20});
      body=s;H=y+4;out=[C.stat('Pending groups hold','nothing','Ray reserves all bundles or none'),C.stat('Nodes','2 x 2 fake GPUs','STRICT_PACK of 4 can never fit')];
      cap='Ray placement groups from the Scheduling lab (state API). A group that cannot be placed waits PENDING and holds no resources: no waste, but no progress either, and nothing tells the user it can never fit.';}
    el.innerHTML=C.svg(W,H,body,'Queue run '+qm);$('co-q-out').innerHTML=out.join('');$('co-q-cap').innerHTML=cap;
  }
  // ---- failures priced ----
  let fsel='node';
  function drawF(){
    const el=$('co-f-svg'),W=C.width(el),F=D.fails,x0=Math.min(150,W*0.36),BW=W-x0-8;const max=Math.max(...F.map(f=>f.segs[f.segs.length-1][1]));const sc=BW/max;
    let s='',y=4;
    F.forEach((f,i)=>{if(i===5){s+=C.t(4,y+12,'100-step runs, one rank slowed:',{fs:10,fill:C.col('mute')});y+=18}
      const hl=f.key===fsel,h=18;
      s+='<g data-co-f="'+f.key+'" style="cursor:pointer" tabindex="0" role="button" aria-label="'+C.esc(f.label)+'">'+C.rect(0,y-2,W,h+4,hl?C.col('acc2'):'transparent',{rx:3});
      s+=C.t(x0-6,y+13,C.esc(f.key==='base'?'No failure':f.key==='crash'?'Crash, checkpoints':f.key==='nockpt'?'Crash, no checkpoints':f.key==='node'?'Node lost':f.key==='hang'?'Hang':f.label.replace('One rank ','+').replace(' slower per step','/step')),{a:'end',fs:11,w:hl?600:400});
      for(let k=0;k<f.segs.length;k++){const g=f.segs[k];if(k>0){const p=f.segs[k-1];s+=C.line(x0+p[1]*sc,y+h/2,x0+g[0]*sc,y+h/2,C.col('mute'),{dash:'3 3'})}
        s+=C.rect(x0+g[0]*sc,y,(g[1]-g[0])*sc,h,g[2]==='COMPLETED'?C.col('c3'):C.col('bad'),{rx:2})}
      const e=f.segs[f.segs.length-1][1];const lbl=C.num(f.held_gpu_s)+' GPU-s';
      s+=C.t(x0+e*sc+4>W-60?x0+e*sc-4:x0+e*sc+4,y+13,lbl,{fs:10,a:x0+e*sc+4>W-60?'end':null,fill:x0+e*sc+4>W-60?'#fff':C.col('ink')})+'</g>';y+=h+6});
    s+=C.t(x0,y+10,'0',{fs:10,fill:C.col('mute')})+C.t(x0+BW,y+10,max+' s from first submit',{a:'end',fs:10,fill:C.col('mute')});
    el.innerHTML=C.svg(W,y+16,s,'GPU-seconds held by each failure run');
    el.querySelectorAll('[data-co-f]').forEach(g=>{const go=()=>{fsel=g.dataset.coF;drawF()};g.addEventListener('click',go);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})});
    const f=F.find(x=>x.key===fsel),b=F.find(x=>x.key==='base'),s0=F.find(x=>x.key==='strag0');
    const rel=f.key.indexOf('strag')===0?f.held_gpu_s/s0.held_gpu_s:f.held_gpu_s/b.held_gpu_s;
    let txt={base:()=>'The clean run: one job, '+C.fs(b.segs[0][1]-b.segs[0][0])+' held, '+C.num(b.held_gpu_s)+' GPU-seconds. Every other bar is compared with it.',
      crash:()=>'Rank 3 exits after step '+f.crash_step+'; the job fails, is resubmitted, resumes from step '+f.resumed_from+' and redoes '+(f.crash_step-f.resumed_from)+' steps. Cost: '+C.pct(rel-1)+' more GPU-seconds than clean.',
      nockpt:()=>'The same crash at step '+f.crash_step+' with no checkpoint: the second job starts from step 0, so all '+f.crash_step+' steps are paid twice. Cost: '+C.pct(rel-1)+' more.',
      node:()=>'Node c2 stopped at step '+f.last_step_first_job+'. Slurm marks the job NODE_FAIL '+C.fs(f.fault_to_end)+' after (all 4 GPUs held, no progress), requeues it, waits '+C.fs(f.gaps[0])+' (dashed: nothing held, but the run is not running either) and resumes from step '+f.resumed_from+' on c1 and c3. Cost: '+C.pct(rel-1)+' more GPU-seconds and '+(f.wall/b.wall).toFixed(1)+'x the wall-clock time.',
      hang:()=>'One rank stops answering after step '+f.last_step_first_job+'. The others wait inside a collective until the timeout, '+C.fs(f.fault_to_end)+' later, then the job fails. '+C.num(f.held_gpu_s)+' GPU-seconds and no finished run.'}[f.key];
    txt=txt?txt():null;
    if(!txt)txt='Every rank waits for the slowest at each all-reduce: '+C.num(f.per_step_ms,1)+' ms per step against '+C.num(s0.per_step_ms,1)+' ms with no straggler, so 4 GPUs pay '+rel.toFixed(1)+'x for one slow rank.';
    $('co-f-cap').innerHTML=txt;
  }
  $('co-f-leg').innerHTML='<span><i style="background:var(--c3)"></i>job held GPUs, completed</span><span><i style="background:var(--bad)"></i>job held GPUs, failed</span><span>dashed: waiting, nothing held</span>';
  C.pr('co-pr1');
  C.onRender(()=>{drawAl();AM.redraw();drawQ();drawF()});
})();
