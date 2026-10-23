// ---- Reading: the hero, stranded GPUs, where limits live, the two scheduler loops, requeue dead time, a maintenance window ----
// Every figure is drawn at the measured width; nothing moves until the reader steps.
(function(){
const esc=RD.esc,$=id=>document.getElementById(id),T=RD.t;
const box=(x,y,w,h,stroke,fill,extra)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(fill||'var(--soft)')+'" stroke="'+stroke+'" stroke-width="1.5"'+(extra||'')+'/>';
const arrow=(x1,y1,x2,y2,c)=>{c=c||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),h=6;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.4"/><path d="M'+x2+' '+y2+' L'+(x2-h*Math.cos(a-0.45))+' '+(y2-h*Math.sin(a-0.45))+' L'+(x2-h*Math.cos(a+0.45))+' '+(y2-h*Math.sin(a+0.45))+' Z" fill="'+c+'"/>'};
const num=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="8" fill="var(--acc)"/>'+T(x,y+4,n,{fs:11,a:'middle',fill:'var(--bg)',w:700});
const reg=(f)=>{f();RD.onRender(f);RD.onResize(f)};

// ---------- hero ----------
(function(){const el=$('sl-hero');if(!el)return;
  function draw(){const W=Math.min(RD.width(el),860),nar=W<520,g=8,half=(W-3*g)/2;let b='';
    // row 1: users and slurmdbd
    b+=box(g,6,half,44,'var(--c4)')+T(g+half/2,24,'users (login node)',{a:'middle',w:600})+T(g+half/2,40,nar?'sbatch, srun, squeue':'sbatch, srun, squeue, sacct',{a:'middle',fill:'var(--mute)'});
    b+=box(2*g+half,6,half,44,'var(--c5)')+T(2*g+half*1.5,24,'slurmdbd + database',{a:'middle',w:600})+T(2*g+half*1.5,40,nar?'usage, QOS, limits':'usage, accounts, QOS, limits',{a:'middle',fill:'var(--mute)'});
    // row 2: the controller
    const cy=72,ch=104;b+=box(g,cy,W-2*g,ch,'var(--acc)');
    b+=T(g+10,cy+18,nar?'slurmctld: the one controller':'slurmctld: the one controller, every job and node in memory',{w:600});
    const qx=g+10,qy=cy+28,qw=W-2*g-20;
    b+=T(qx,qy+12,'queue, highest priority first:',{fill:'var(--mute)'});
    const pw=Math.min(118,(qw-8)/3);const q0=nar?qx:qx+190;const qyy=nar?qy+18:qy;
    [['79: Resources','var(--acc)'],['next: Priority','var(--line)'],['next: Priority','var(--line)']].forEach((p,i)=>{b+=box(q0+i*(pw+4),qyy,pw,18,p[1],'var(--bg)')+T(q0+i*(pw+4)+pw/2,qyy+13,p[0],{a:'middle'})});
    const ly=cy+ch-34,lw=(W-2*g-30)/2;
    b+=box(g+10,ly,lw,26,'var(--c1)','var(--bg)')+T(g+10+lw/2,ly+17,nar?'main loop: fits now':'main loop: start what fits now, in order',{a:'middle'});
    b+=box(g+20+lw,ly,lw,26,'var(--c5)','var(--bg)')+T(g+20+lw*1.5,ly+17,nar?'backfill: gaps by limit':'backfill: fill gaps, planning with time limits',{a:'middle'});
    // row 3: nodes
    const ny=cy+ch+34,nh=112,nw=(W-4*g)/3;
    ['c1','c2','c3'].forEach((n,i)=>{const x=g+i*(nw+g);b+=box(x,ny,nw,nh,'var(--c3)')+T(x+nw/2,ny+17,n+': slurmd',{a:'middle',w:600})});
    // the allocation of job 79 over c1 and c2
    b+='<rect x="'+(g-3)+'" y="'+(ny+24)+'" width="'+(2*nw+g+6)+'" height="'+(nh-28)+'" rx="8" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="6 4"/>';
    b+=T(g+4,ny+40,nar?'job 79: c1 + c2 together':'job 79: one allocation, c1 and c2 together, or nothing',{fill:'var(--acc)',w:600});
    b+='<rect x="'+(g+4)+'" y="'+(ny+48)+'" width="'+(nw-8)+'" height="20" rx="4" fill="var(--c4)" opacity=".85"/>'+T(g+nw/2,ny+62,'79.batch: script',{a:'middle',fill:'var(--bg)',w:600});
    b+='<rect x="'+(g+4)+'" y="'+(ny+74)+'" width="'+(2*nw+g-8)+'" height="20" rx="4" fill="var(--c1)" opacity=".85"/>'+T(g+nw+g/2,ny+88,nar?'79.0: srun, torchrun x2':'step 79.0: srun starts one torchrun per node, 2 ranks each',{a:'middle',fill:'var(--bg)',w:600});
    b+=T(g+2*(nw+g)+nw/2,ny+62,'free',{a:'middle',fill:'var(--mute)'});
    // arrows and numbers
    b+=arrow(g+half/2,50,g+half/2,cy-2,'var(--c4)')+num(g+half/2+16,61,'1');
    b+=arrow(2*g+half*1.5,cy-2,2*g+half*1.5,52,'var(--c5)')+num(2*g+half*1.5+16,61,'4');
    b+=arrow(g+nw/2+20,cy+ch,g+nw/2+20,ny-2,'var(--c1)')+num(g+nw/2+36,cy+ch+17,'2');
    b+=arrow(g+nw+g/2+30,cy+ch,g+nw+g/2+30,ny-2,'var(--c1)')+num(g+nw+g/2+46,cy+ch+17,'3');
    el.innerHTML=RD.svg(W,ny+nh+6,b,'Users submit to slurmctld, which grants job 79 nodes c1 and c2 together and launches its steps')}
  reg(draw)})();

// ---------- stranded GPUs ----------
(function(){const el=$('sl-sg-svg');if(!el)return;let mode=0;
  const CAP=['<b>NumCPUs=8.</b> Slurm placed one task per node, and one task per node takes all its CPUs: c1 CPUs 0-3 with GPUs 0-3, c2 CPUs 0-3 with GPUs 0-1. c2\'s last 2 GPUs are free but have no CPU to go with them, so the next 2-GPU job waits in <code>(Resources)</code> while <code>sinfo</code> shows GPUs free.',
   '<b>6 CPUs.</b> Six tasks of one GPU and one CPU each hold exactly 6 CPUs and 6 GPUs, so 2 CPUs and 2 GPUs stay usable together and the next 2-GPU job can start on c2.'];
  function draw(){const W=Math.min(RD.width(el),860),g=10,nw=(W-3*g)/2,s=Math.max(14,Math.min(26,(nw-24)/4-6));let b='';
    const alloc=mode===0?{c1:[4,4],c2:[4,2]}:{c1:[4,4],c2:[2,2]};
    ['c1','c2'].forEach((n,i)=>{const x=g+i*(nw+g),y=4,h=2*s+58;b+=box(x,y,nw,h,'var(--c3)')+T(x+8,y+16,n+': 4 CPUs, 4 GPUs',{w:600});
      const [ac,ag]=alloc[n];
      for(let k=0;k<4;k++){const cx=x+12+k*(s+6);
        b+='<rect x="'+cx+'" y="'+(y+24)+'" width="'+s+'" height="'+s+'" rx="3" fill="'+(k<ac?'var(--c1)':'var(--bg)')+'" stroke="var(--line)"/>';
        const strand=k>=ag&&ac===4;b+='<rect x="'+cx+'" y="'+(y+30+s)+'" width="'+s+'" height="'+s+'" rx="3" fill="'+(k<ag?'var(--c4)':strand?'var(--bg)':'var(--soft)')+'" stroke="'+(strand?'var(--bad)':'var(--line)')+'" stroke-width="'+(strand?2:1)+'"'+(strand?' stroke-dasharray="3 2"':'')+'/>'}
      const lx=x+12+4*(s+6)+2;if(nw-(lx-x)>40){b+=T(lx,y+24+s*0.7,'CPU',{fill:'var(--mute)'})+T(lx,y+30+s*1.7,'GPU',{fill:'var(--mute)'})}
      const note=n==='c2'?(mode===0?'2 GPUs stranded':'2 CPU + 2 GPU free'):'';if(note)b+=T(x+8,y+h-8,note,{fill:mode===0?'var(--bad)':'var(--good)',w:600})});
    el.innerHTML=RD.svg(W,2*s+68,b,'CPUs and GPUs held on two nodes');
    $('sl-sg-cap').innerHTML=CAP[mode]+' <span class="small mute">Top row CPUs, bottom row GPUs; filled = held by this job, red dashed = stranded.</span>'}
  RD.seg($('sl-sg-mode'),m=>{mode=+m;draw()});reg(draw)})();

// ---------- where limits live ----------
(function(){const el=$('sl-lm-svg');if(!el)return;
  const R=[['Partition batch','MaxTime=60, in slurm.conf','job 88: alice, 120 min','PartitionTimeLimit'],
           ['QOS sl-small','MaxTRESPerUser gpu=4, slurmdbd','job 92: alice, 8 GPUs','QOSMaxGRESPerUser'],
           ['Association teama/carol','GrpTRES gpu=2, slurmdbd','job 93: carol, 4 GPUs','AssocGrpGRES']];
  function draw(){const W=Math.min(RD.width(el),860),g=6,nar=W<560;let b='',y=4;
    R.forEach(r=>{if(nar){const lw=W-2*g;b+=box(g,y,lw,44,'var(--c5)')+T(g+8,y+18,r[0],{w:600})+T(g+8,y+35,r[1],{fill:'var(--mute)'});
        b+=arrow(g+18,y+70,g+18,y+47,'var(--bad)')+T(g+30,y+60,r[2])+T(g+30,y+76,'PD ('+r[3]+')',{fill:'var(--bad)',w:600});y+=90}
      else{const lw=280,rh=48;b+=box(g,y,lw,rh,'var(--c5)')+T(g+8,y+19,r[0],{w:600})+T(g+8,y+37,r[1],{fill:'var(--mute)'});
        const rx=g+lw+30;b+=arrow(rx-4,y+rh/2,g+lw+4,y+rh/2,'var(--bad)')+T(rx,y+19,r[2])+T(rx,y+37,'PD ('+r[3]+')',{fill:'var(--bad)',w:600});y+=rh+8}});
    el.innerHTML=RD.svg(W,y,b,'Three pending jobs and the level whose limit holds each')}
  reg(draw)})();

// ---------- the two loops (illustrative) ----------
(function(){if(!$('sl-bf-card'))return;
  const TM=100;
  // frames: now, bars [lane list, start, end, label, kind], queue text, caption
  const A0={l:[0,1],s:0,lim:40},S=[
   {now:5,bars:[[[0,1],0,0,'A','run']],q:'B (3 nodes, 30 min) | C (1 node, 20 min) | D (1 node, 60 min)',cap:'<b>Step 1 of 7.</b> At minute 5, job A runs on c1 and c2 with a 40-minute limit; c3 is idle. Three jobs wait, in priority order: B wants all 3 nodes, C and D want one each.'},
   {now:5,bars:[[[0,1],0,0,'A','run']],q:'B <b>Resources</b> | C <b>Priority</b> | D <b>Priority</b>',cap:'<b>Step 2: the main loop.</b> B is first and needs 3 nodes; only c3 is free, so B cannot start: reason <code>Resources</code>. The loop now starts nothing else in this partition, so C and D are not even tried: reason <code>Priority</code>. c3 stays idle.'},
   {now:5,bars:[[[0,1],0,0,'A','run'],[[0,1,2],40,70,'B reserved','res']],q:'B reserved at 40 | C <b>Priority</b> | D <b>Priority</b>',cap:'<b>Step 3: backfill plans.</b> It cannot know runtimes, so it assumes A runs to its limit (40) and reserves all 3 nodes for B from 40 to 70. This is what <code>squeue --start</code> shows.'},
   {now:5,bars:[[[0,1],0,0,'A','run'],[[0,1,2],40,70,'B reserved','res'],[[2],5,25,'C','bf']],q:'B reserved at 40 | C <b>started by backfill</b> | D <b>Priority</b>',cap:'<b>Step 4: backfill fills the gap.</b> C needs one node for 20 minutes; on c3, from now (minute 5) to 25, it ends before B\'s reservation at 40, so backfill starts it now. B is not delayed.'},
   {now:5,bars:[[[0,1],0,0,'A','run'],[[0,1,2],40,70,'B reserved','res'],[[2],5,25,'C','bf'],[[2],70,130,'D reserved','res']],q:'B reserved at 40 | C running | D reserved at 70',cap:'<b>Step 5: a job that does not fit.</b> D asks for 60 minutes; on c3 it would run past 40 and delay B, so it waits. Slurm reserves a start for every job it tests (here 70). A shorter limit is D\'s only way in.'},
   {now:15,bars:[[[0,1],0,15,'A','done'],[[0,1,2],25,55,'B reserved','res'],[[2],5,25,'C','bf'],[[2],55,115,'D reserved','res']],q:'B reserved at 25 | C running | D reserved at 55',cap:'<b>Step 6: A ends at 15, 25 minutes before its limit.</b> The job-end event runs the main loop at once; B still needs c3, which C holds until at most 25, so B waits, but its planned start moves from 40 to 25. A plan is an upper bound that moves earlier (job 79 started 34 s before its plan).'},
   {now:25,bars:[[[0,1],0,15,'A','done'],[[0,1,2],25,55,'B','run'],[[2],5,25,'C','done'],[[2],55,115,'D reserved','res']],q:'B running | D <b>Priority</b>, reserved at 55',cap:'<b>Step 7.</b> C ends; the main loop starts B on all three nodes at 25, 15 minutes before the first plan. Backfill used c3 for C without costing B a minute.'}];
  const el=$('sl-bf-svg'),lanes=['c1','c2','c3'];let cur=0;
  function draw(i){cur=i;const f=S[i],W=Math.min(RD.width(el),860),L=34,R=8,top=6,lh=30,H=top+3*lh+40;const x=t=>L+(W-L-R)*Math.min(t,TM)/TM;let b='';
    lanes.forEach((n,k)=>{const y=top+k*lh;b+='<rect x="'+L+'" y="'+y+'" width="'+(W-L-R)+'" height="'+(lh-6)+'" fill="var(--soft)" rx="3"/>'+T(4,y+16,n,{fill:'var(--mute)'})});
    f.bars.forEach(br=>{const [ls,s0,e0,lab,k]=br;const e=k==='run'&&e0<=s0?Math.max(f.now,s0+0.5):e0;
      const ys=ls.map(l=>top+l*lh),y0=Math.min(...ys),y1=Math.max(...ys)+lh-6;
      const col=k==='bf'?'var(--c5)':k==='done'?'var(--dim)':'var(--c1)';
      if(k==='res')b+='<rect x="'+x(s0)+'" y="'+(y0+1)+'" width="'+Math.max(2,x(e)-x(s0))+'" height="'+(y1-y0-2)+'" rx="4" fill="none" stroke="var(--c5)" stroke-width="1.6" stroke-dasharray="5 3"/>';
      else b+='<rect x="'+x(s0)+'" y="'+(y0+1)+'" width="'+Math.max(4,x(e)-x(s0))+'" height="'+(y1-y0-2)+'" rx="4" fill="'+col+'" opacity=".9"/>';
      if(x(e)-x(s0)>30||k!=='res')b+=T(x(s0)+5,(y0+y1)/2+4,lab,{w:600,fill:k==='res'?'var(--c5)':'var(--ink)'})});
    // A's time limit
    if(i<5){const y=top+lh+lh/2-3;b+='<line x1="'+x(Math.max(1,f.now))+'" y1="'+y+'" x2="'+x(A0.lim)+'" y2="'+y+'" stroke="var(--ink)" stroke-dasharray="2 3"/><line x1="'+x(A0.lim)+'" y1="'+(y-8)+'" x2="'+x(A0.lim)+'" y2="'+(y+8)+'" stroke="var(--ink)"/>'+(W>420?T(x(A0.lim)-4,top+lh*2-8,"A's limit",{a:'end',fill:'var(--mute)'}):'')}
    b+='<line x1="'+x(f.now)+'" y1="'+(top-2)+'" x2="'+x(f.now)+'" y2="'+(top+3*lh)+'" stroke="var(--bad)" stroke-width="1.5"/>'+T(x(f.now)+3,top+3*lh+12,'now',{fill:'var(--bad)'});
    for(let t=0;t<=TM;t+=20)b+=T(x(t),H-4,t===TM?t+' min':String(t),{a:t===0?'start':t===TM?'end':'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Main loop and backfill on three nodes');
    $('sl-bf-cap').innerHTML=f.cap+'<br><span class="small"><b>Queue:</b> '+f.q+'</span>'}
  const A=RD.anim({card:'sl-bf-card',ctl:'sl-bf-ctl',n:S.length,draw:draw,ms:2600,label:'Step'});RD.onResize(()=>A.redraw());
})();

// ---------- requeue dead time: job 128 ----------
(function(){const el=$('sl-pe-svg');if(!el)return;
  // seconds since 05:42:39 (submission), from sacct -D and the job's output
  const E={start:1,sig:13,ask:36,lim:61,elig:134,start2:135,end:140};
  function draw(){const W=Math.min(RD.width(el),860),L=8,R=8,TM=145,x=t=>L+(W-L-R)*t/TM;let b='';
    const y1=56,bh=22;
    b+='<rect x="'+x(E.start)+'" y="'+y1+'" width="'+(x(E.sig)-x(E.start))+'" height="'+bh+'" rx="3" fill="var(--c1)"/>';
    b+='<rect x="'+x(E.sig)+'" y="'+y1+'" width="'+(x(E.lim)-x(E.sig))+'" height="'+bh+'" rx="3" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>';
    b+='<rect x="'+x(E.sig)+'" y="'+(y1+bh+8)+'" width="'+(x(E.elig)-x(E.sig))+'" height="'+bh+'" rx="3" fill="var(--dim)" opacity=".55"/>'+T((x(E.sig)+x(E.elig))/2,y1+bh+24,'requeued: held 121 s (BeginTime)',{a:'middle',w:600});
    b+='<rect x="'+x(E.start2)+'" y="'+y1+'" width="'+Math.max(4,x(E.end)-x(E.start2))+'" height="'+bh+'" rx="3" fill="var(--good)"/>';
    const mk=(t,lab,c,row,anc)=>'<line x1="'+x(t)+'" y1="'+(4+row*15)+'" x2="'+x(t)+'" y2="'+(y1+bh)+'" stroke="'+c+'" stroke-width="1.5"'+(c==='var(--mute)'?' stroke-dasharray="3 3"':'')+'/>'+T(x(t)+(anc==='end'?-3:3),12+row*15,lab,{fill:c,a:anc||'start'});
    b+=mk(E.sig,'SIGUSR1 at +12 s','var(--bad)',0);b+=mk(E.ask,'asked: +35 s','var(--mute)',1);
    b+=mk(E.lim,'limit +60 s','var(--mute)',2);b+=mk(E.start2,W<480?'resumes':'resumes from checkpoint','var(--good)',0,'end');
    const ty=y1+2*bh+30;[0,30,60,90,120].forEach(t=>{b+=T(x(t),ty,(t?'+':'')+t+' s',{a:t?'middle':'start',fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,ty+4,b,'Job 128: run, signal, requeue hold, resumed run')}
  reg(draw)})();

// ---------- the maintenance window ----------
(function(){const el=$('sl-rv-svg');if(!el)return;
  // seconds since 05:39:57 (submission); window 05:42:57 to 05:47:57
  const W0=180,W1=480,J=[['119 alice, --time=2: runs',120,null],['120 bob, --time=4: held',240,240],['118 alice, --time=10: held',600,600]];
  function draw(){const W=Math.min(RD.width(el),860),L=8,R=8,TM=1110,x=t=>L+(W-L-R)*t/TM,rh=40,top=18;let b='';
    const H=top+J.length*rh+22;
    b+='<rect x="'+x(W0)+'" y="'+(top-4)+'" width="'+(x(W1)-x(W0))+'" height="'+(J.length*rh+2)+'" fill="var(--bad)" opacity=".13"/>'+T(x(W0)+3,12,W<480?'sl_maint window':'sl_maint: maintenance, all nodes',{fill:'var(--bad)',w:600});
    J.forEach((j,i)=>{const y=top+i*rh;b+=T(x(0)+2,y+11,j[0],{w:600});
      if(j[2]==null)b+='<rect x="'+x(0)+'" y="'+(y+16)+'" width="'+(x(j[1])-x(0))+'" height="14" rx="3" fill="var(--good)"/>';
      else{b+='<rect x="'+x(0)+'" y="'+(y+16)+'" width="'+(x(j[1])-x(0))+'" height="14" rx="3" fill="none" stroke="var(--bad)" stroke-dasharray="4 3"/>';
        b+='<rect x="'+x(W1)+'" y="'+(y+16)+'" width="'+(x(W1+j[2])-x(W1))+'" height="14" rx="3" fill="var(--c1)" opacity=".6"/>'+(x(W1+j[2])-x(W1)>60?T(x(W1)+4,y+27,'planned',{fill:'var(--ink)'}):'')}});
    [['05:40',3],['05:45',303],['05:50',603],['05:55',903]].forEach(t=>{b+=T(x(t[1]),H-4,t[0],{a:t[1]<10?'start':'middle',fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,b,'Three jobs against a maintenance window')}
  reg(draw)})();
})();
