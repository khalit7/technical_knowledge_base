// ---- Scene, Fig. 1 (the idea): one training job on one machine, user space as a glass plate over the kernel's plate over the hardware (renderer v2) ----
// A map, not a mechanism: each step lights the part one child page owns and links to that child's own figure. Real numbers from this page's runs
// (RD_DATA, src/read/code/out/): the job's processes and threads after the workers start (maps.procs.after_fork), their summed RSS and PSS
// (maps.after_fork_*.rollup), the getppid and function-call costs (syscall), the CPU count (env), the futex calls (futex).
// The write and fsync costs are the ladder's (section 1), measured by Storage and file systems.
// Colours: blue user space, gold the kernel, orange a system-call crossing, teal memory, green storage, purple the GPU path.
(function(){
  if(!document.getElementById('stg-hero')||!window.RD_DATA)return;const {mix,lerp}=S3;const D=RD_DATA;
  const pr=D.maps.procs.after_fork,main=pr.find(p=>p.role==='main'),wk=pr.filter(p=>p.role!=='main');
  const thr=p=>+p.status.Threads;
  const roll=['after_fork_main','after_fork_worker0','after_fork_worker1'].map(k=>D.maps[k].rollup);
  const MiB=kb=>Math.round(kb/1024);
  const RSS=MiB(roll.reduce((s,r)=>s+r.Rss,0)),PSS=MiB(roll.reduce((s,r)=>s+r.Pss,0));
  const NCPU=+(D.env.split('\n')[4]||5);
  const SYS=Math.round(D.syscall.getppid_syscall_ns),FN=D.syscall.function_call_ns;
  const FUT=(D.futex.match(/\s(\d+)\s+\d+\s+futex/)||[0,'?'])[1];
  const fmt=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const YU=3.0,YK=1.5;
  // the parts and where they sit
  const PR=[{p:wk[0],x:-4.3,w:1.5,h:.3},{p:wk[1],x:-2.55,w:1.5,h:.3},{p:main,x:.75,w:2.9,h:.42}];
  const MX=PR[2].x;
  const AL=[MX-.75,YU,.78],CU=[MX+.95,YU,.78];                     // allocator and libcuda trays, in front of the trainer
  const K={sched:[-3.4,YK,-.35],fx:[-4.1,YK,.85],ep:[-2.7,YK,.85],pt:[-.55,YK,-.3],pc:[1.35,YK,.55],blk:[2.95,YK,.55],nv:[4.7,YK,-.3]};
  const CPUX=i=>-4.85+i*.6;
  // which parts each step is about (everything else recedes)
  const HL=[['proc','thr'],['main','sys'],['thr','sched','cpu'],['proc','pt','ram'],['main','alloc','pt'],['thr','fx','ep'],['main','pc','blk','nvme'],['proc','thr','cg'],['main','cuda','gpu','nv','hyp']];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-6.6,6.6,-2.2,2.2,.5);
    const lit=g=>{const A=j=>HL[Math.max(0,j)].includes(g)?1:.2;return lerp(A(k-1),A(k),e)};
    const on=s=>k===s?e:0;
    // labels: in the two full views every part is named; in a close view only the parts the step is about, so nothing piles up at the edges
    const la=g=>{const a=lit(g);return (k===0||k===7)&&!nar?Math.max(.5,a):a>.6?a:0};
    // the three layers
    R.glass([-6,YK,-1.45],[12,0,0],[0,0,2.9],{c:P.c5,nu:16,nv:4,a:.5,dz:80,th:.03});
    R.glass([-6,YU,-1.45],[12,0,0],[0,0,2.9],{c:P.c1,nu:16,nv:4,a:.42,dz:60,th:.02});
    R.label([-6,YU,1.45],'user space',{al:'left',dx:2,dy:13,fs:12.5,b:1,c:P.c1});
    R.label([-6,YK,1.45],'kernel',{al:'left',dx:2,dy:13,fs:12.5,b:1,c:P.c5});
    R.label([-6,0,1.45],'hardware',{al:'left',dx:2,dy:13,fs:12.5,b:1,c:P.mute});
    // hardware: the CPUs, RAM, the NVMe drive, the GPU
    for(let i=0;i<NCPU;i++)R.box([CPUX(i),0,-.25],[.42,.34,.42],{fill:mix(P.paper,P.mute,.18),a:lit('cpu')});
    R.label([CPUX(2),.34,-.25],NCPU+' CPUs',{fs:12,dy:-10,c:P.ink,a:la('cpu')});
    R.box([-.55,0,-.2],[2.5,.16,.95],{fill:mix(P.paper,P.c6,.25),a:lit('ram')});
    for(let i=1;i<10;i++)R.line([[-1.8+i*.25,.165,-.67],[-1.8+i*.25,.165,.27]],{c:P.c6,w:.6,a:lit('ram')*.6});
    R.label([-.55,.16,-.2],'RAM, 4 KiB frames',{fs:12,dy:-10,c:P.ink,a:la('ram')});
    R.box([2.95,0,.45],[1.0,.24,.7],{fill:mix(P.paper,P.c3,.25),a:lit('nvme')});R.label([2.95,.24,.45],'NVMe',{fs:12,dy:-10,c:P.ink,a:la('nvme')});
    R.box([4.75,0,-.2],[1.6,.42,1.0],{fill:mix(P.paper,P.c4,.25),a:lit('gpu')});R.label([4.75,.42,-.2],'GPU',{fs:12,dy:-10,c:P.ink,a:la('gpu')});
    // a hypervisor under the kernel, in a cloud VM (and in this lab)
    const hy=lit('hyp');if(k>=7)R.quad([[-6,.85,-1.45],[6,.85,-1.45],[6,.85,1.45],[-6,.85,1.45]],{fill:false,ec:P.c4,dash:[5,4],lw:1.2,a:on(8)});
    if(k===8&&!nar)R.label([-6,.85,-1.45],'hypervisor, in a cloud VM',{al:'left',dx:2,dy:-8,fs:12,c:P.c4,a:e,wide:1});
    // the kernel's parts
    const kb=(c,s,g,t,col)=>{const a=lit(g);R.box(c,s,{fill:mix(P.paper,col,.3),a});if(t)R.label([c[0],c[1]+s[1],c[2]],t,{fs:12,dy:-10,c:P.ink,a:la(g)})};
    kb(K.sched,[1.5,.22,.8],'sched','scheduler',P.c5);
    kb(K.pt,[1.4,.22,.8],'pt','page tables',P.c6);
    kb(K.pc,[1.3,.2,.7],'pc','page cache',P.c3);
    kb(K.blk,[1.0,.2,.7],'blk','ext4, block',P.c3);
    kb(K.nv,[1.2,.22,.7],'nv','nvidia.ko',P.c4);
    kb(K.fx,[.9,.18,.5],'fx',k===5?'futex':null,P.c5);kb(K.ep,[.9,.18,.5],'ep',k===5?'epoll':null,P.c5);
    // user space: the trainer and its two DataLoader workers, one tile per thread
    PR.forEach((q,i)=>{const a=Math.max(lit('proc'),i===2?lit('main'):0),n=thr(q.p);
      R.box([q.x,YU,-.25],[q.w,q.h,.9],{fill:mix(P.paper,P.c1,.22),a});
      const g=Math.min(.24,(q.w-.3)/n),ta=Math.max(a,lit('thr'));
      for(let t=0;t<n;t++)R.box([q.x-(n-1)*g/2+t*g,YU+q.h,-.25],[g*.7,.16,.5],{fill:mix(P.paper,P.c1,.55),a:ta,shadow:false,lw:.5});
      // the second worker is named under its front edge, so the two worker names never collide
      const lb=i===1?[q.x,YU,.2]:[q.x,YU+q.h+.16,-.3];
      if(nar&&i===1)return;
      R.label(i===0&&nar?[(PR[0].x+PR[1].x)/2,YU+q.h+.16,-.3]:lb,nar?(i===2?'python '+q.p.pid:'workers '+wk.map(w=>w.pid).join(', ')):(i===2?'python train.py · PID ':'worker · PID ')+q.p.pid+' · '+n+' threads',{fs:12.5,b:i===2,dy:i===1?13:-10,c:P.ink,a:Math.max(la('proc'),i===2?la('main'):0)})});
    R.box(AL,[1.1,.14,.42],{fill:mix(P.paper,P.c6,.35),a:lit('alloc')});
    R.box(CU,[.85,.14,.42],{fill:mix(P.paper,P.c4,.35),a:lit('cuda')});
    if(k===4||k===3)R.label([AL[0],AL[1]+.14,AL[2]],'allocator',{fs:12,dy:12,c:P.c6,a:lit('alloc')});
    if(k===8)R.label([CU[0],CU[1]+.14,CU[2]],'libcuda',{fs:12,dy:12,c:P.c4,a:e});
    // 2. one door: a system call goes down and a number comes back
    if(k===1){const a=e;R.flow([[MX-.3,YU,-.1],[MX-.3,YK+.05,-.1]],{c:P.q,a,r:.075,n:5,speed:1.4});R.flow([[MX+.1,YK+.05,-.1],[MX+.1,YU,-.1]],{c:P.q,a,r:.075,n:5,speed:1.4});
      R.glow([MX-.1,YU,-.1],.5,{c:P.q,a:a*.8});
      R.label([MX+.4,(YU+YK)/2,-.1],nar?'syscall '+SYS+' ns':'system call · '+SYS+' ns',{al:'left',dx:6,fs:12.5,b:1,mono:true,c:P.q,a});
      R.label([MX+.4,(YU+YK)/2,-.1],'a function call: '+FN+' ns',{al:'left',dx:6,dy:17,fs:12,mono:true,c:P.mute,a})}
    // 3. CPU time: every thread waits in a run queue; the scheduler puts one on each CPU at a time
    if(k===2){PR.forEach(q=>R.flowArc([q.x,YU,-.25],[K.sched[0],YK+.22,K.sched[2]],.25,{c:P.c5,a:e,r:.06,n:6,speed:1.2}));
      for(let i=0;i<NCPU;i++)R.flow([[K.sched[0],YK,K.sched[2]],[CPUX(i),.34,-.25]],{c:P.c5,a:e,r:.055,n:4,speed:1});
      R.label([K.sched[0]+.8,YK+.22,K.sched[2]],(PR.reduce((s,q)=>s+thr(q.p),0))+' threads, '+NCPU+' CPUs',{al:'left',dx:8,fs:12.5,b:1,c:P.c5,a:e})}
    // 4. memory: every address goes through the process's page tables to a frame of RAM
    if(k===3){PR.forEach(q=>R.flowArc([q.x,YU,-.1],[K.pt[0],YK+.22,K.pt[2]],.3,{c:P.c6,a:e,r:.06,n:6,speed:1.2}));
      R.flow([[K.pt[0],YK,K.pt[2]],[-.55,.17,-.2]],{c:P.c6,a:e,r:.07,n:5,speed:1});
      R.label([K.pt[0]+.75,YK+.22,K.pt[2]],nar?'RSS '+RSS+' · PSS '+PSS+' MiB':'summed RSS '+RSS+' MiB · PSS '+PSS+' MiB',{al:'left',dx:8,fs:12.5,b:1,c:P.c6,a:e})}
    // 5. the allocator: small pieces often, big regions from the kernel rarely; freed memory stays with it
    if(k===4){for(let i=0;i<3;i++)R.flowArc([AL[0],AL[1]+.14,AL[2]],[MX-1.1+i*.7,YU+.45,-.25],.3,{c:P.c6,a:e,r:.05,n:4,speed:1.3});
      R.flowArc([K.pt[0],YK+.22,K.pt[2]],[AL[0],AL[1],AL[2]],.4,{c:P.c6,a:e,r:.11,n:2,speed:.6});
      R.label([AL[0],YU,AL[2]],nar?'freed stays here':'freed memory stays with the allocator',{al:'center',dy:30,fs:12.5,b:1,c:P.c6,a:e})}
    // 6. waiting: a thread blocked on another thread sleeps on a futex; one waiting for I/O sleeps in epoll
    if(k===5){[PR[2],PR[0]].forEach(q=>R.flowArc([q.x,YU+q.h,-.25],[K.fx[0],YK+.18,K.fx[2]],.4,{c:P.c5,a:e*.9,r:.055,n:5,speed:1}));
      R.flowArc([PR[1].x,YU,-.25],[K.ep[0],YK+.18,K.ep[2]],.3,{c:P.c5,a:e*.6,r:.05,n:4,speed:.9});
      for(let i=0;i<3;i++)R.ball([K.fx[0]-.25+i*.25,YK+.28,K.fx[2]],.07,{c:P.c5,a:e});
      R.label([K.fx[0]-.45,YK,1.45],nar?fmt(FUT)+' futex calls':fmt(FUT)+' futex calls for 20 million lock pairs',{al:'left',dy:14,fs:12.5,b:1,c:P.c5,a:e})}
    // 7. a checkpoint: write() stops at the page cache; only fsync waits for the drive
    if(k===6){R.flowArc([MX+.6,YU,.2],[K.pc[0],YK+.2,K.pc[2]],.35,{c:P.c3,a:e,r:.07,n:6,speed:1.4});
      R.flow([[K.pc[0]+.6,YK+.1,K.pc[2]],[K.blk[0],YK+.1,K.blk[2]],[2.95,.24,.45]],{c:P.c3,a:e*.85,r:.06,n:5,speed:.7});
      R.label([K.pc[0],YK+.2,K.pc[2]],'write() 1.4 µs',{al:'right',dx:-10,dy:-14,fs:12.5,b:1,mono:true,c:P.c3,a:e});
      R.label([2.95,.24,.45],'fsync 1,305 µs',{al:'left',dx:30,dy:-6,fs:12.5,b:1,mono:true,c:P.c3,a:e})}
    // 8. a container: the same processes, fenced by namespaces and budgeted by a cgroup, on the one kernel
    if(k===7){R.quad([[-5.3,YU+.01,-.9],[2.4,YU+.01,-.9],[2.4,YU+.01,1.15],[-5.3,YU+.01,1.15]],{fill:false,ec:P.c2,dash:[6,4],lw:1.6,a:e});
      R.quad([[-5.3,YK+.01,-1.0],[2.4,YK+.01,-1.0],[2.4,YK+.01,1.25],[-5.3,YK+.01,1.25]],{fill:false,ec:P.c2,dash:[3,4],lw:1.2,a:e*.8});
      R.label(nar?[-1.4,YU,1.15]:[2.4,YU,1.15],nar?'namespaces':'namespaces: what it sees',{al:nar?'center':'left',dx:nar?0:6,dy:nar?14:6,fs:12.5,b:1,c:P.c2,a:e});
      R.label(nar?[-1.4,YK,1.25]:[2.4,YK,1.25],nar?'cgroup':'cgroup: cpu.max 2 CPUs, memory.max 3 GiB',{al:nar?'center':'left',dx:nar?0:6,dy:14,fs:12.5,b:1,c:P.c2,a:e})}
    // 9. the GPU: commands go straight to memory the GPU reads, then a doorbell; the kernel driver only for setup
    if(k===8){R.flowArc([CU[0],CU[1],CU[2]],[4.3,.42,.1],.6,{c:P.c4,a:e,r:.075,n:9,speed:1.5});
      R.flowArc([CU[0]+.3,CU[1],CU[2]-.2],[K.nv[0],YK+.22,K.nv[2]],.3,{c:P.c4,a:e*.35,r:.045,n:2,speed:.5});
      R.label([4.3,1.2,.5],nar?'commands + doorbell':'commands into mapped memory, then a doorbell',{al:'left',dx:6,fs:12.5,b:1,c:P.c4,a:e,wide:1});
      R.label([K.nv[0],YK+.22,K.nv[2]],'ioctl: setup only',{al:'left',dx:40,dy:-12,fs:12,c:P.c4,a:e,grp:'nv'})}
  }
  const full={cam:[.42,.34],bounds:[[-6.2,0,-1.5],[6.2,3.7,1.6]]};
  const V=[full,{cam:[.42,.34],bounds:[[-1.4,1.3,-1.2],[3.4,3.95,1.2]]},{cam:[.55,.36],bounds:[[-6,0,-1.3],[.6,3.6,1.3]]},{cam:[.5,.36],bounds:[[-5.2,0,-1.3],[2.6,3.6,1.3]]},
    {cam:[.35,.38],bounds:[[-2.2,1.3,-1.2],[2.8,3.6,1.3]]},{cam:[.5,.36],bounds:[[-6,1.3,-1.2],[2.4,3.6,1.4]]},{cam:[.3,.36],bounds:[[-.8,0,-1.2],[4.2,3.6,1.3]]},full,{cam:[.25,.34],bounds:[[-.6,0,-1.5],[6.2,3.6,1.5]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one training job, three layers, eight owners',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:5200,draw,
    view:k=>V[k]||full,margin:w=>w<520?[16,8,14,8]:[20,16,16,16]});
})();
