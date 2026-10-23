// ---- Reading tab: steps animation (without/with --exact), the priority snapshots, the dependency Gantt ----
(function(){
const S=window.SL, esc=RD.esc, $=id=>document.getElementById(id), T=RD.t;

// ---------- steps: four 1-task steps in one 2-node allocation ----------
(function(){if(!$('sl-st-card'))return;
  let mode='plain';
  const lanes=['c1 cpu 0','c1 cpu 1','c2 cpu 0','c2 cpu 1'];
  function plan(m){const rows=S.steps[m].filter(r=>/^sl-par/.test(r.name));const t0=Math.min(...rows.map(r=>r.s));
    const busy={};const out=[];
    rows.slice().sort((a,b)=>a.s-b.s||a.id.localeCompare(b.id)).forEach(r=>{const base=r.nodes==='c1'?0:2;let ls=[];
      if(r.cpu>=2)ls=[base,base+1];else{for(const l of [base,base+1]){if(!(busy[l]>r.s))ls=[l];if(ls.length)break}if(!ls.length)ls=[base]}
      ls.forEach(l=>busy[l]=r.e);out.push({id:r.id,name:r.name,node:r.nodes,cpu:r.cpu,gpu:r.gpu,s:r.s-t0,e:r.e-t0,lanes:ls})});
    return {rows:out,end:Math.max(...out.map(r=>r.e))}}
  const P={plain:plan('plain'),exact:plan('exact')};
  const TMAX=Math.max(P.plain.end,P.exact.end);
  const n=TMAX+1;
  function draw(i){const p=P[mode],el=$('sl-st-svg'),W=Math.min(RD.width(el),860),L=W<480?62:78,R=10,top=8,lh=26,H=top+lanes.length*lh+30;
    const x=t=>L+(W-L-R)*t/TMAX;let b='';
    lanes.forEach((ln,k)=>{const y=top+k*lh;b+='<rect x="'+L+'" y="'+y+'" width="'+(W-L-R)+'" height="'+(lh-6)+'" fill="var(--soft)" rx="3"/>'+T(4,y+15,ln,{fs:11,fill:'var(--mute)'})});
    p.rows.forEach((r,k)=>{if(r.s>i)return;const e=Math.min(r.e,i),col=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'][+r.name.slice(-1)-1];
      r.lanes.forEach(l=>{const y=top+l*lh;b+='<rect x="'+x(r.s)+'" y="'+(y+1)+'" width="'+Math.max(2,x(e)-x(r.s))+'" height="'+(lh-8)+'" rx="3" fill="'+col+'" opacity="'+(r.e<=i?0.55:0.9)+'"/>';
        if(x(e)-x(r.s)>46)b+=T(x(r.s)+5,y+14,esc(r.id),{fs:11,fill:'var(--bg)',w:600})})});
    // waiting steps
    const wait=p.rows.filter(r=>r.s>i);if(wait.length)b+=T(L,top+lanes.length*lh+2+10,'waiting for CPUs: '+wait.map(r=>r.id).join(', '),{fs:11,fill:'var(--bad)'});
    b+='<line x1="'+x(i)+'" y1="'+top+'" x2="'+x(i)+'" y2="'+(top+lanes.length*lh-4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    for(let t=0;t<=TMAX;t+=2)b+=T(x(t),H-4,t+' s',{fs:11,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Four job steps on two nodes');
    const run=p.rows.filter(r=>r.s<=i&&r.e>i),done=p.rows.filter(r=>r.e<=i);
    $('sl-st-cap').innerHTML=i===0?(mode==='plain'?'<b>t = 0.</b> Four <code>srun -n1 -N1 sleep 6 &amp;</code> start together. Without <code>--exact</code> (job 129, submitted without <code>--cpus-per-task</code>) each step is given both CPUs of its node, so only one fits per node.':'<b>t = 0.</b> The same four steps with <code>--exact</code> (job 126): each takes the 1 CPU and 1 GPU it asked for, so two fit on each node.')
      :(run.length?'<b>t = '+i+' s.</b> Running: '+run.map(r=>r.id+' on '+r.node+' ('+r.cpu+' CPU'+(r.cpu>1?'s':'')+')').join(', ')+'.'+(wait.length?' Waiting: '+wait.map(r=>r.id).join(', ')+' (srun prints nothing until it gets in, then <code>Step created for StepId=129.4</code>).':''):'<b>t = '+i+' s.</b> All four steps done: '+(mode==='plain'?'12 s, two waves.':'6 s, one wave.'));
    $('sl-st-cnt').innerHTML=RD.stat('time since launch',i+' s','')+RD.stat('steps running',run.length,'of 4')+RD.stat('steps finished',done.length,'')+RD.stat('CPUs per step',p.rows[0].cpu,mode==='plain'?'the whole node\'s share':'what each asked for')+RD.stat('all done at',p.end+' s',mode==='plain'?'without --exact':'with --exact');}
  const A=RD.anim({card:'sl-st-card',ctl:'sl-st-ctl',n:n,draw:draw,ms:700,label:'Second'});
  RD.seg($('sl-st-mode'),m=>{mode=m;A.reset(n)});RD.onResize(()=>A.redraw());
})();

// ---------- priority: the same queue at two snapshots ----------
(function(){if(!$('sl-pq-card'))return;let snap=0,sel=null;
  const parts=[['fs','fairshare','var(--c1)'],['age','age','var(--c3)'],['js','job size','var(--c5)'],['part','partition','var(--c6)'],['qos','QOS','var(--c4)'],['tres','GPU TRES','var(--c2)']];
  const maxv=Math.max(...S.snaps.flatMap(s=>Object.values(s.sprio).map(r=>r.prio+r.nice)));
  function rows(k){const s=S.snaps[k];return Object.keys(s.sprio).map(id=>{const r=s.sprio[id],q=s.q.find(x=>x.id===id||x.id.indexOf(id+'_')===0)||{};return Object.assign({id:id,name:q.name||id,user:q.user||'',reason:q.reason||''},r)}).sort((a,b)=>b.prio-a.prio||(+a.id)-(+b.id))}
  function draw(){const el=$('sl-pq-svg'),W=Math.min(RD.width(el),860),L=W<480?118:170,R=46,rh=20,rs=rows(snap),H=rs.length*rh+26;
    const x=v=>(W-L-R)*v/maxv;let b='';
    for(let v=0;v<=maxv;v+=2500)b+='<line x1="'+(L+x(v))+'" y1="2" x2="'+(L+x(v))+'" y2="'+(H-20)+'" stroke="var(--line)"/>'+T(L+x(v),H-6,v/1000+'k',{fs:11,a:'middle',fill:'var(--mute)'});
    rs.forEach((r,k)=>{const y=4+k*rh;let cx=L;
      b+='<g data-j="'+r.id+'" style="cursor:pointer"><rect x="0" y="'+y+'" width="'+W+'" height="'+rh+'" fill="'+(sel===r.id?'var(--acc2)':'transparent')+'"/>'+T(4,y+14,esc(r.id+' '+r.name.replace('sl-g-',''))+' <tspan fill="var(--mute)">'+esc(r.user)+'</tspan>',{fs:11});
      parts.forEach(p=>{const w=x(r[p[0]]);if(w>0)b+='<rect x="'+cx+'" y="'+(y+3)+'" width="'+w+'" height="'+(rh-7)+'" fill="'+p[2]+'"/>';cx+=w});
      if(r.nice){const w=x(r.nice);b+='<rect x="'+(cx-w)+'" y="'+(y+3)+'" width="'+w+'" height="'+(rh-7)+'" fill="var(--bg)" opacity=".75"/><rect x="'+(cx-w)+'" y="'+(y+3)+'" width="'+w+'" height="'+(rh-7)+'" fill="none" stroke="var(--bad)" stroke-dasharray="3 2"/>'}
      b+=T(L+x(r.prio)+4,y+14,r.prio.toLocaleString('en-US'),{fs:11,w:600})+'</g>'});
    el.innerHTML=RD.svg(W,H,b,'Priority of each pending job, by factor');
    const leg=parts.map(p=>'<span><svg width="10" height="10"><rect width="10" height="10" fill="'+p[2]+'"/></svg>'+p[1]+'</span>').join(' ');
    const r=sel&&rs.find(x=>x.id===sel);
    $('sl-pq-info').innerHTML='<div class="hmleg">'+leg+'</div>'+(r?'<b>Job '+r.id+' ('+esc(r.name)+', '+esc(r.user)+', '+esc(r.reason)+') at '+S.snaps[snap].at+':</b> fairshare '+r.fs+' + age '+r.age+' + job size '+r.js+' + partition '+r.part+' + QOS '+r.qos+' ('+esc(r.qosn)+') + GPU TRES '+r.tres+(r.nice?' &minus; nice '+r.nice:'')+' = '+r.prio.toLocaleString('en-US')+' (sprio rounds each part; the total is computed unrounded, then truncated).':'<b>Click a job</b> for its sum. '+(snap===0?'At 05:38:07 bob\'s job 95 leads: bob\'s team had used less than alice\'s.':'At 05:38:58 bob\'s job 95 is near the bottom: his running 12-GPU job pushed teamb\'s usage past teama\'s.'));}
  $('sl-pq-svg').addEventListener('click',e=>{const g=e.target.closest('g[data-j]');if(!g)return;sel=g.dataset.j;draw()});
  RD.seg($('sl-pq-mode'),m=>{snap=+m;draw()});draw();RD.onRender(draw);RD.onResize(draw);
})();

// ---------- arrays and dependencies, as sacct recorded them ----------
(function(){const el=$('sl-dg-svg');if(!el)return;
  function draw(){const W=Math.min(RD.width(el),860),L=W<480?92:120,R=10,rh=19,rows=S.deps,t0=Math.min(...rows.map(r=>r.sub)),t1=Math.max(...rows.map(r=>r.e))-t0,H=rows.length*rh+24;
    const x=t=>L+(W-L-R)*(t-t0)/t1;let b='';
    rows.forEach((r,k)=>{const y=4+k*rh;b+=T(4,y+13,esc(r.id+' '+r.name.replace('sl-','')),{fs:11});
      const sEnd=r.s!=null?r.s:r.e;b+='<rect x="'+x(r.sub)+'" y="'+(y+7)+'" width="'+Math.max(1,x(sEnd)-x(r.sub))+'" height="3" fill="var(--dim)"/>';
      if(r.s!=null){const col=r.st==='FAILED'?'var(--bad)':'var(--good)';b+='<rect x="'+x(r.s)+'" y="'+(y+2)+'" width="'+Math.max(2,x(r.e)-x(r.s))+'" height="'+(rh-5)+'" rx="3" fill="'+col+'"/>';
        if(x(r.e)-x(r.s)>24)b+=T(x(r.s)+3,y+13,esc(r.node),{fs:11,fill:'var(--bg)',w:600})}
      else b+=T(x(r.e)-4,y+13,'never ran ('+esc(r.st.split(' ')[0].toLowerCase())+')',{fs:11,a:'end',fill:'var(--bad)'})});
    for(let t=0;t<=t1;t+=10)b+=T(x(t0+t),H-5,t+' s',{fs:11,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Arrays and dependencies timeline')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
})();
