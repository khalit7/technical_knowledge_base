// ---- Reading: stranded GPUs, where limits live, requeue dead time, a maintenance window (static figures and one toggle) ----
// Every figure is drawn at the measured width. The hero and the two scheduler loops are 3D stages since 2026-11-12 (41_js_sc_hero.js, 42_js_sc_bf.js).
(function(){
const esc=RD.esc,$=id=>document.getElementById(id),T=RD.t;
const box=(x,y,w,h,stroke,fill,extra)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(fill||'var(--soft)')+'" stroke="'+stroke+'" stroke-width="1.5"'+(extra||'')+'/>';
const arrow=(x1,y1,x2,y2,c)=>{c=c||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),h=6;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.4"/><path d="M'+x2+' '+y2+' L'+(x2-h*Math.cos(a-0.45))+' '+(y2-h*Math.sin(a-0.45))+' L'+(x2-h*Math.cos(a+0.45))+' '+(y2-h*Math.sin(a+0.45))+' Z" fill="'+c+'"/>'};
const reg=(f)=>{f();RD.onRender(f);RD.onResize(f)};

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
