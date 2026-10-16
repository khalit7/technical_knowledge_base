// ---- Reading tab visuals of Kubernetes for ML (prefix km). Data: window.KM from 22_js_km_data.js ----
(function(){
  const $=id=>document.getElementById(id), E=RD.esc, K=window.KM;
  const f2=x=>(Math.round(x*100)/100).toFixed(2), f1=x=>(Math.round(x*10)/10).toFixed(1);
  const short=o=>o.replace(/^(Pod|Job|JobSet)\//,'').replace(/-([a-z0-9]{5})$/,'');
  const WK=['mi-kind-worker','mi-kind-worker2','mi-kind-worker3'], WN={'mi-kind-worker':'worker','mi-kind-worker2':'worker2','mi-kind-worker3':'worker3'};
  const box=(x,y,w,h,fill,stroke,sw)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(sw||1)+'"/>';
  const line=(x1,y1,x2,y2,c,w,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(w||1)+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  function arrow(x1,y1,x2,y2,c){const a=Math.atan2(y2-y1,x2-x1),L=7;
    return line(x1,y1,x2,y2,c,2)+'<path d="M'+x2+' '+y2+' L'+(x2-L*Math.cos(a-.45))+' '+(y2-L*Math.sin(a-.45))+' L'+(x2-L*Math.cos(a+.45))+' '+(y2-L*Math.sin(a+.45))+' Z" fill="'+c+'"/>'}
  const cut=(s,n)=>s.length>n?s.slice(0,n-1)+'.':s;

  // ---------- 1. the control loop, three ways ----------
  (function(){
    const card=$('km-life-card');if(!card)return;
    const EXPL={'creates Job':'A new object in etcd. Nothing runs yet: the job controller is watching Jobs and will react.','creates JobSet':'The JobSet object exists; the JobSet controller reacts by writing Jobs.',
      'creates pod':'The controller wrote a Pod object with no node. The scheduler is watching for exactly that.','binds pod':'The scheduler chose a node and wrote a Binding; spec.nodeName is now set. The kubelet on that node is watching for pods bound to it.',
      'Scheduled':'The scheduler also records an event saying where it put the pod.','SuccessfulCreate':'The job controller records an event for each pod it created.',
      'pod status':'The kubelet reports the pod\'s phase and conditions back to the API server.','Started':'The container runtime started the container: torchrun begins, and rendezvous follows.',
      'Job status':'The job controller recounts the pods and writes the Job\'s status.','JobSet status':'The JobSet controller mirrors its Jobs\' state.',
      'Completed':'Terminal: every pod succeeded.','AllJobsCompleted':'Terminal for the JobSet.'};
    let mode='job',steps=[],node={};
    function load(){steps=K.life[mode].filter(e=>e.what!=='Pulled'&&e.what!=='Created');node={};
      steps.forEach(e=>{const m=/spec\.nodeName = (\S+)/.exec(e.note);if(e.what==='binds pod'&&m)node[e.obj]=m[1]})}
    const lanes=()=>{const top=['you (kubectl)','Trainer controller','JobSet controller','job controller'],bot=['scheduler','kubelet worker','kubelet worker2','kubelet worker3'];return {top,bot}};
    function laneOf(e){if(e.who==='kubelet'){const n=node[e.obj];return 'kubelet '+(WN[n]||'worker')}return e.who}
    const SH={'you (kubectl)':['you','(kubectl)'],'Trainer controller':['Trainer','controller'],'JobSet controller':['JobSet','controller'],'job controller':['job','controller'],'scheduler':['scheduler',''],'kubelet worker':['kubelet','worker'],'kubelet worker2':['kubelet','worker2'],'kubelet worker3':['kubelet','worker3']};
    function lab(n,x,y,cw,on,used){const o={a:'middle',fs:11,w:on?600:400,fill:used||on?undefined:'var(--mute)'};if(cw>150)return RD.t(x,y+24,n,o);const a=SH[n]||[n,''];return RD.t(x,y+17,a[0],o)+RD.t(x,y+31,a[1],o)}
    function draw(i){
      const svgEl=$('km-life-svg'),W=Math.max(300,Math.min(860,RD.width(svgEl))),H=220,{top,bot}=lanes();
      const cw=(W-10)/4,bh=40,e=steps[i]||steps[0],cur=laneOf(e);
      let b='';const pos={};
      top.forEach((n,k)=>{const x=5+k*cw+3,y=8;pos[n]=[x+cw/2-3,y+bh];const on=n===cur,used=steps.slice(0,i+1).some(s=>laneOf(s)===n);
        b+=box(x,y,cw-6,bh,on?'var(--acc2)':'var(--bg)',on?'var(--acc)':(used?'var(--mute)':'var(--line)'),on?2:1)+lab(n,x+(cw-6)/2,y,cw,on,used)});
      bot.forEach((n,k)=>{const x=5+k*cw+3,y=H-bh-8;pos[n]=[x+cw/2-3,y];const on=n===cur,used=steps.slice(0,i+1).some(s=>laneOf(s)===n);
        b+=box(x,y,cw-6,bh,on?'var(--acc2)':'var(--bg)',on?'var(--acc)':(used?'var(--mute)':'var(--line)'),on?2:1)+lab(n,x+(cw-6)/2,y,cw,on,used)});
      const ay=H/2-22;b+=box(10,ay,W-20,44,'var(--soft)','var(--c2)',1.5)+RD.t(W/2,ay+18,'API server (validates, stores in etcd, notifies watchers)',{a:'middle',fs:11.5,w:600})+
        RD.t(W/2,ay+35,E(cut(e.what+': '+short(e.obj),Math.floor(W/6.4))),{a:'middle',fs:11,fill:'var(--acc)'});
      const p=pos[cur];if(p){const up=p[1]<ay;b+=arrow(p[0],up?p[1]+2:p[1]-2,p[0],up?ay-2:ay+46,'var(--acc)')}
      svgEl.innerHTML=RD.svg(W,H,b,'Actors writing to the API server, step '+(i+1));
      $('km-life-cap').innerHTML='<div class="t">t = '+f2(e.t)+' s: '+E(e.who)+', '+E(e.what)+' '+E(short(e.obj))+'</div><p>'+E(e.note)+'</p><p class="mute">'+E(EXPL[e.what]||'')+'</p>';
      const seen=[],st={};steps.slice(0,i+1).forEach(s=>{if(!seen.includes(s.obj))seen.push(s.obj);if(/Complete|Succeeded/.test(s.note)||/Completed/.test(s.what))st[s.obj]='done'});
      $('km-life-objs').innerHTML=seen.map(o=>'<span class="'+(o===e.obj?'new':(st[o]||''))+'">'+E(o.replace(/^(\w+)\//,'$1 '))+'</span>').join('');
      const actors=new Set(steps.slice(0,i+1).map(laneOf));
      $('km-life-cnt').innerHTML=RD.stat('elapsed',f2(e.t)+' s','since the first object')+RD.stat('writes seen',(i+1)+' of '+steps.length,'changes and events')+RD.stat('objects',seen.length,'in this run so far')+RD.stat('programs',actors.size,'that wrote something');
    }
    load();const A=RD.anim({card:'km-life-card',ctl:'km-life-ctl',n:steps.length,draw,ms:900,label:'Step of the job lifecycle'});
    RD.seg($('km-life-mode'),m=>{mode=m;load();A.reset(steps.length);A.play()});
    RD.onResize(()=>A.redraw());
  })();

  // ---------- 2. failure runs ----------
  (function(){
    const card=$('km-fail-card');if(!card)return;
    const RUNS=[['e2a','Crash, no rule'],['e2b','Crash, rule on 13'],['e2c','Crash, rule on 1'],['e2d1','Eviction, no rule'],['e2d2','Eviction, Ignore rule'],['e3b','Eviction, JobSet rule'],['e3c','Crash, JobSet rule'],['e4a','Shards, per-index limit'],['e4b','Leader, successPolicy']];
    const NOTE={e2a:'backoffLimit 2, no podFailurePolicy.',e2b:'FailJob on exit code 13, the code train.py exits with.',e2c:'FailJob on exit code 1, the code the container really returns.',
      e2d1:'backoffLimit 0, no rule; pod index 1 evicted after the step-50 checkpoint.',e2d2:'backoffLimit 0, Ignore on DisruptionTarget.',e3b:'JobSet: Job fails on DisruptionTarget, JobSet restarts free of maxRestarts 0.',
      e3c:'The same JobSet, rank 1 crashes at step 20.',e4a:'Four independent shards, index 2 always fails; backoffLimitPerIndex 1.',e4b:'Index 0 is the leader; successPolicy succeededIndexes "0".'};
    $('km-fail-mode').innerHTML=RUNS.map((r,k)=>'<button data-m="'+r[0]+'"'+(k?'':' class="on"')+'>'+r[1]+'</button>').join('');
    let run='e2a',ev=[];
    function load(){const R=K.fail[run];ev=[];
      R.pods.forEach((p,k)=>{ev.push({t:p.created,k:'pod '+p.idx+' created'});if(p.start!=null)ev.push({t:p.start,k:'pod '+p.idx+' container running'});
        if(p.disrupted!=null)ev.push({t:p.disrupted,k:'pod '+p.idx+' evicted: DisruptionTarget ('+(p.dreason||'')+')'});
        if(p.end!=null)ev.push({t:p.end,k:'pod '+p.idx+' exited '+p.exit+(p.exit===137?' (killed after the grace period)':'')})});
      R.conds.forEach(c=>ev.push({t:c.t,k:c.kind+' '+c.obj+': '+c.type+' ('+c.reason+')',m:c.msg}));
      ev.sort((a,b)=>a.t-b.t);
      // merge events within 0.15 s
      const m=[];ev.forEach(e=>{const l=m[m.length-1];if(l&&e.t-l.t<.15){l.k+='; '+e.k;if(e.m)l.m=e.m}else m.push({t:e.t,k:e.k,m:e.m})});ev=m}
    function draw(i){const R=K.fail[run],svgEl=$('km-fail-svg'),W=Math.max(300,Math.min(860,RD.width(svgEl)));
      const tmax=Math.max(...R.pods.map(p=>Math.max(p.end||0,p.created)),...R.conds.map(c=>c.t))+2,now=ev[i].t;
      const L=58,rh=20,top=30,H=top+R.pods.length*rh+26,X=t=>L+(W-L-10)*t/tmax;
      let b='';const tick=tmax>40?10:5;for(let t=0;t<=tmax;t+=tick){b+=line(X(t),top-6,X(t),H-20,'var(--line)',1)+RD.t(X(t),H-6,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
      const tries={};
      R.pods.forEach((p,k)=>{const y=top+k*rh;tries[p.idx]=(tries[p.idx]||0)+1;b+=RD.t(4,y+13,'idx '+p.idx+(tries[p.idx]>1?' #'+tries[p.idx]:''),{fs:10.5});
        if(p.created>now)return;const s=p.start!=null?p.start:p.created,e=p.end!=null?p.end:tmax;const e2=Math.min(e,now);
        let col='var(--acc)';if(p.end!=null&&p.end<=now)col=p.exit===0?'var(--good)':(p.exit===137?'var(--dim)':(p.disrupted!=null?'var(--c4)':'var(--bad)'));
        b+='<rect x="'+X(p.created)+'" y="'+(y+6)+'" width="'+Math.max(1,X(s)-X(p.created))+'" height="8" fill="var(--soft)" stroke="var(--line)"/>';
        if(s<=now)b+='<rect x="'+X(s)+'" y="'+(y+3)+'" width="'+Math.max(2,X(e2)-X(s))+'" height="14" rx="3" fill="'+col+'" opacity="'+(p.end!=null&&p.end<=now?1:.55)+'"/>';
        if(p.disrupted!=null&&p.disrupted<=now)b+=line(X(p.disrupted),y,X(p.disrupted),y+20,'var(--c4)',2)});
      R.conds.forEach(c=>{if(c.t>now)return;const x=X(c.t);b+='<path d="M'+x+' 6 L'+(x+5)+' 12 L'+x+' 18 L'+(x-5)+' 12 Z" fill="'+(/Fail/.test(c.type)?'var(--bad)':(/Restart/.test(c.type)?'var(--c4)':'var(--good)'))+'"/>'});
      b+=line(X(now),4,X(now),H-20,'var(--acc)',1.5,'3 3');
      svgEl.innerHTML=RD.svg(W,H,b,'Pods of run '+run+' over time');
      const e=ev[i];$('km-fail-cap').innerHTML='<div class="t">'+E(NOTE[run])+'</div><p><b>t = '+f2(e.t)+' s</b>: '+E(e.k)+'</p>'+(e.m?'<p class="mute">'+E(e.m)+'</p>':'');
    }
    load();const A=RD.anim({card:'km-fail-card',ctl:'km-fail-ctl',n:ev.length,draw,ms:1100,label:'Moment of the failure run'});
    RD.seg($('km-fail-mode'),m=>{run=m;load();A.reset(ev.length);A.play()});RD.onResize(()=>A.redraw());
  })();

  // shared: three workers of 4 GPU slots with pods
  function workers(W,pods,opt){opt=opt||{};const n=3,gap=8,cw=(W-gap*(n+1))/n,H=opt.h||110;let b='';
    WK.forEach((w,k)=>{const x=gap+k*(cw+gap),y=18;const tainted=opt.taint&&opt.taint===w;
      b+=box(x,y,cw,H-28,'var(--bg)',tainted?'var(--bad)':'var(--line)',tainted?2:1)+RD.t(x+6,y-5,WN[w]+(opt.block?' ('+(w==='mi-kind-worker3'?'b2':'b1')+')':'')+(tainted?', tainted':''),{fs:11,fill:tainted?'var(--bad)':undefined});
      const sw=(cw-20)/4;let used=0;
      pods.filter(p=>p.node===w).forEach(p=>{for(let g=0;g<p.g;g++){const sx=x+6+(used+g)*(sw+2.5);b+='<rect x="'+sx+'" y="'+(y+10)+'" width="'+sw+'" height="'+(H-56)+'" rx="3" fill="'+p.c+'" opacity="'+(p.dim?.35:.9)+'"/>'}
        b+=RD.t(x+6+used*(sw+2.5)+(p.g*(sw+2.5))/2-1,y+H-38,E(p.l),{a:'middle',fs:10.5});used+=p.g});
      for(let g=used;g<4;g++){const sx=x+6+g*(sw+2.5);b+='<rect x="'+sx+'" y="'+(y+10)+'" width="'+sw+'" height="'+(H-56)+'" rx="3" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>'}});
    return b}
  const PC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];

  // ---------- 3. spread vs pack (inline summary of the Scheduling cycle tab) ----------
  (function(){
    const card=$('km-pack-card');if(!card)return;let tag='e6spread';
    const m=K.scores;let c=0,t=0;Object.values(m).forEach(r=>{c+=r.checks.matched;t+=r.checks.compared});$('km-pack-match').textContent=c+' of '+t;
    function draw(i){const S=m[tag].steps,svgEl=$('km-pack-svg'),W=Math.max(300,Math.min(860,RD.width(svgEl)));
      const pods=S.slice(0,i+1).filter(s=>s.bound).map((s,k)=>({node:s.bound,g:s.gpus,c:PC[S.indexOf(s)],l:'p'+(S.indexOf(s)+1)}));
      const s=S[i],pend=!s.bound;let b=workers(W,pods,{h:110});
      if(pend)b+=RD.t(W/2,128,'p'+(i+1)+' ('+s.gpus+' GPUs): Pending, no worker has '+s.gpus+' free',{a:'middle',fs:11.5,fill:'var(--bad)',w:600});
      svgEl.innerHTML=RD.svg(W,138,b,'GPU slots after pod '+(i+1));
      const rows=s.rows.map(r=>r.fits?(WN[r.node]+': '+(r.logged?r.logged.total:r.total)+' (fit '+r.fit+', balanced '+r.balanced+', taint '+r.taint+')'):(WN[r.node]+': filtered out, '+r.gpuFree+' GPUs free')).join('; ');
      $('km-pack-cap').innerHTML='<div class="t">Pod p'+(i+1)+' asks for '+s.gpus+' GPU'+(s.gpus>1?'s':'')+(s.bound?' and is bound to '+WN[s.bound]:' and stays Pending')+'</div><p>'+E(rows)+'</p><p class="mute">'+
        (s.feasible===1&&s.bound?'Only one feasible node: the scheduler skips scoring.':(s.ties.length>1?'Tie between '+s.ties.map(x=>WN[x]).join(', ')+': broken by a random number per node.':(s.bound?'Highest total wins.':'3 Insufficient example.com/gpu, 4 GPUs free in total.')))+'</p>'}
    const A=RD.anim({card:'km-pack-card',ctl:'km-pack-ctl',n:6,draw,ms:1500,label:'Pod number'});
    RD.seg($('km-pack-mode'),v=>{tag=v;A.reset(6);A.play()});RD.onResize(()=>A.redraw());
  })();

  // ---------- 4. device plugin against DRA ----------
  (function(){
    const card=$('km-dev-card');if(!card)return;
    const LN=['plugin / driver','kubelet','API server','scheduler','container'];
    const ST={dp:[[0,1,'Register','The plugin calls Register on /var/lib/kubelet/device-plugins/kubelet.sock with resourceName example.com/resource. Its log: "Device Plugin registered with the Kubelet".'],
      [1,0,'ListAndWatch','The kubelet opens a stream; the plugin sends its devices, Dev-1 and Dev-2, both Healthy.'],
      [1,2,'node status','On its next status update the kubelet writes capacity and allocatable "example.com/resource": "2" into the Node.'],
      [3,2,'bind pod','The scheduler sees 2 allocatable, counts the pod\'s request of 1, and binds it to worker3. It does not know which device.'],
      [1,0,'Allocate','The kubelet picks a device itself and asks the plugin: Allocate request="container_requests:{devices_ids:\\"Dev-2\\"}". The answer: mount /tmp/Dev-2.'],
      [1,4,'start','The container starts with /tmp/Dev-2 mounted; the kubelet records pod, container and Dev-2 in kubelet_internal_checkpoint.'],
      [0,1,'plugin gone','The plugin pod is deleted: the node keeps capacity 2 but allocatable 0; the kubelet writes it back if the status is patched, until the kubelet itself restarts.']],
      dra:[[0,2,'ResourceSlice','A driver would publish this; here it was written by hand: 4 devices on worker3, gpu-0 and gpu-1 with 40Gi, gpu-2 and gpu-3 with 80Gi.'],
      [4,2,'claim','The pod references a ResourceClaimTemplate: exactly 2 devices of class km-gpu with memory at least 80Gi (a CEL selector). Kubernetes makes a ResourceClaim for the pod.'],
      [3,2,'allocate','The scheduler\'s DynamicResources plugin evaluates the CEL selector against the slice, picks gpu-2 and gpu-3, and writes them into the claim\'s status.allocation with a node selector for worker3.'],
      [3,2,'bind pod','Only then is the pod bound to worker3; the claim is "allocated,reserved" for it.'],
      [1,0,'NodePrepareResources','The kubelet asks the driver for gpu.km.example.com to prepare the devices. There is none: "DRA driver gpu.km.example.com is not registered". The pod stays in ContainerCreating.'],
      [3,2,'second pod','An identical second pod is refused at scheduling: "3 cannot allocate all claims", since both 80Gi devices are taken. The two 40Gi ones are free but do not match.']]};
    let mode='dp';
    function draw(i){const s=ST[mode][i],svgEl=$('km-dev-svg'),W=Math.max(300,Math.min(860,RD.width(svgEl))),n=LN.length,cw=W/n,H=46+ST[mode].length*22;
      let b='';LN.forEach((l,k)=>{const x=k*cw+cw/2;b+=RD.t(x,14,cut(l,Math.floor(cw/6)),{a:'middle',fs:10.5,w:600})+line(x,22,x,H-4,'var(--line)',1.5)});
      ST[mode].slice(0,i+1).forEach((q,j)=>{const y=36+j*22,x1=q[0]*cw+cw/2,x2=q[1]*cw+cw/2,on=j===i,c=on?'var(--acc)':'var(--mute)';
        b+=arrow(x1+(x2>x1?3:-3),y,x2+(x2>x1?-4:4),y,c)+RD.t((x1+x2)/2,y-4,E(q[2]),{a:'middle',fs:10,fill:on?'var(--acc)':'var(--mute)'})});
      svgEl.innerHTML=RD.svg(W,H,b,'Sequence of the '+(mode==='dp'?'device plugin':'DRA')+' run');
      $('km-dev-cap').innerHTML='<div class="t">'+(i+1)+'. '+E(s[2])+'</div><p>'+E(s[3])+'</p>'}
    const A=RD.anim({card:'km-dev-card',ctl:'km-dev-ctl',n:ST.dp.length,draw,ms:1800,label:'Step'});
    RD.seg($('km-dev-mode'),m=>{mode=m;A.reset(ST[m].length);A.play()});RD.onResize(()=>A.redraw());
  })();

  // ---------- 5. spread and preemption ----------
  function podsTxt(t){return t.split('\n').slice(1).filter(l=>l.trim()).map(l=>{const f=l.trim().split(/\s+/);return {pod:f[0],phase:f[1],node:f[2]==='<none>'?null:f[2]}})}
  (function(){
    const card=$('km-spread-card');if(!card)return;let mode='ignore';
    function draw(){const P=podsTxt(K.spread[mode].pods),svgEl=$('km-spread-svg'),W=Math.max(300,Math.min(860,RD.width(svgEl)));
      const pods=P.filter(p=>p.node).map((p,k)=>({node:p.node,g:1,c:'var(--c1)',l:p.pod.replace('km-sp-','s')}));
      let b=workers(W,pods,{h:104,taint:'mi-kind-worker3',block:true});const pend=P.filter(p=>!p.node).map(p=>p.pod.replace('km-sp-','s'));
      b+=RD.t(W/2,124,pend.length?('Pending: '+pend.join(', ')):'All three placed in block b1',{a:'middle',fs:11.5,fill:pend.length?'var(--bad)':'var(--good)',w:600});
      svgEl.innerHTML=RD.svg(W,132,b,'Spread pods');
      const ev=K.spread[mode].events[0];$('km-spread-cap').innerHTML='<div class="t">nodeTaintsPolicy: '+(mode==='ignore'?'Ignore':'Honor')+'</div><p>'+(ev?E(ev.replace(/^\S+\s+\S+\s+FailedScheduling\s+/,'FailedScheduling: ')):'No FailedScheduling events.')+'</p>'}
    RD.seg($('km-spread-mode'),m=>{mode=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
  })();
  (function(){
    const card=$('km-pre-card');if(!card)return;const T=K.preempt.tl.pods,P={};T.forEach(p=>P[p.pod]=p);
    const ev=K.preempt.events,fnd=re=>(ev.find(l=>re.test(l))||'');
    const ST=[{t:1.2,c:'Three km-low pods (priority 100) hold all 12 GPUs.',m:''},
      {t:6.5,c:'km-high-nopreempt (1000, preemptionPolicy Never) arrives: first in the queue, but it may not evict anyone.',m:fnd(/km-high-nopreempt\s+FailedScheduling/)},
      {t:12.65,c:'km-high (1000) arrives. PostFilter finds a node where evicting one lower-priority pod is enough; km-low-3 gets DisruptionTarget (PreemptionByScheduler) and km-high gets nominatedNodeName worker3.',m:fnd(/km-high\s+FailedScheduling/)+' | '+fnd(/Preempted/)},
      {t:15.3,c:'km-low-3 is gone (its sleep ignored SIGTERM: killed, exit 137); km-high is bound to worker3, about 2.2 s after the preemption decision. km-high-nopreempt still waits.',m:fnd(/km-high\s+Scheduled/)}];
    function draw(i){const s=ST[i],svgEl=$('km-pre-svg'),W=Math.max(300,Math.min(860,RD.width(svgEl)));
      const pods=T.filter(p=>p.node&&p.start!=null&&p.start<=s.t&&(p.end==null||p.end>s.t)).map(p=>({node:p.node,g:4,c:/high/.test(p.pod)?'var(--c2)':'var(--c1)',l:p.pod.replace('km-',''),dim:p.disrupted!=null&&p.disrupted<=s.t}));
      let b=workers(W,pods,{h:104});const q=T.filter(p=>p.created<=s.t&&!(p.start!=null&&p.start<=s.t)).map(p=>p.pod.replace('km-',''));
      b+=RD.t(W/2,124,q.length?'Waiting: '+q.join(', '):'',{a:'middle',fs:11.5,fill:'var(--bad)',w:600});svgEl.innerHTML=RD.svg(W,132,b,'Preemption step '+(i+1));
      $('km-pre-cap').innerHTML='<div class="t">t = '+f1(s.t)+' s</div><p>'+E(s.c)+'</p>'+(s.m?'<p class="mute">'+E(s.m.replace(/\s{2,}/g,' '))+'</p>':'')}
    const A=RD.anim({card:'km-pre-card',ctl:'km-pre-ctl',n:ST.length,draw,ms:2200,label:'Step'});RD.onResize(()=>A.redraw());
  })();

  // ---------- 6. gang ----------
  (function(){
    const card=$('km-gang-card');if(!card)return;let mode='nogang',ST=[];
    const hms=s=>{const a=s.split(':').map(Number);return a[0]*3600+a[1]*60+a[2]};
    function load(){const G=K.gang,T=(mode==='gang'?G.tl:G.tl0).pods,rel=G.release.filter((r,k)=>mode==='gang'?k>=6:k<6);
      const r0=hms(rel[0].split(' ')[0]);ST=[{t:-.5,c:'Six pods created behind a scheduling gate; nobody is scheduled yet.'}];
      rel.forEach(r=>{const [h,p]=r.split(' ');ST.push({t:hms(h)-r0+1.4,c:'Gate removed from '+p+'.',p})});
      if(mode==='gang'){T.forEach(p=>{if(p.end!=null&&!ST.some(s=>Math.abs(s.t-p.end)<1.5))ST.push({t:p.end+.3,c:'Gang '+p.pod.slice(3,4)+' finished.'});
        if(p.start!=null&&p.start>8&&!ST.some(s=>Math.abs(s.t-p.start)<1.5))ST.push({t:p.start+.2,c:'Gang '+p.pod.slice(3,4)+' placed whole and started.'})})}
      else ST.push({t:28,c:'28 s after the last release: still three Running pods waiting for peers that cannot be placed. This would last until a timeout or a person.'});
      ST.sort((a,b)=>a.t-b.t)}
    const EX={nogang:{'km-a-0':'a0 fits on a free worker: bound.','km-b-0':'b0 fits: bound.','km-c-0':'c0 takes the last free worker.','km-a-1':'a1: no worker has 4 GPUs free. Pending.','km-b-1':'b1: Pending.','km-c-1':'c1: Pending. Every job is half placed.'},
      gang:{'km-a-0':'PreEnqueue: "waiting for minCount pods from a gang to appear in scheduling queue". a0 does not even enter the queue.','km-b-0':'b0 waits the same way.','km-c-0':'c0 waits.','km-a-1':'Gang a has 2 pods: both are placed, held at Permit until the second is reserved, then released together ("Quorum is met").','km-b-1':'Gang b: only one worker free. "minCount (2) cannot be satisfied: 1 scheduled, 0 remaining": neither pod is bound.','km-c-1':'Gang c: refused the same way. No GPU is held by a half job.'}};
    function draw(i){const s=ST[i],T=(mode==='gang'?K.gang.tl:K.gang.tl0).pods,svgEl=$('km-gang-svg'),W=Math.max(300,Math.min(860,RD.width(svgEl)));
      const col={a:'var(--c1)',b:'var(--c2)',c:'var(--c3)'};
      const on=T.filter(p=>p.start!=null&&p.start<=s.t&&(p.end==null||p.end>s.t)).map(p=>({node:p.node,g:4,c:col[p.pod[3]],l:p.pod.replace('km-','')}));
      const done=T.filter(p=>p.end!=null&&p.end<=s.t).map(p=>p.pod.replace('km-',''));
      const relN=ST.slice(0,i+1).filter(x=>x.p).map(x=>x.p);
      const wait=T.filter(p=>relN.includes(p.pod)&&!(p.start!=null&&p.start<=s.t)&&!done.includes(p.pod.replace('km-',''))).map(p=>p.pod.replace('km-',''));
      let b=workers(W,on,{h:104});b+=RD.t(6,124,'Waiting: '+(wait.join(', ')||'none'),{fs:11.5,fill:wait.length?'var(--bad)':undefined})+RD.t(W-6,124,done.length?'Done: '+done.join(', '):'',{a:'end',fs:11.5,fill:'var(--good)'});
      svgEl.innerHTML=RD.svg(W,132,b,'Gang step '+(i+1));
      $('km-gang-cap').innerHTML='<div class="t">t = '+(s.t<0?'0':f1(s.t))+' s</div><p>'+E(s.c)+(s.p?' '+E(EX[mode][s.p]):'')+'</p>'}
    load();const A=RD.anim({card:'km-gang-card',ctl:'km-gang-ctl',n:ST.length,draw,ms:1500,label:'Step'});
    RD.seg($('km-gang-mode'),m=>{mode=m;load();A.reset(ST.length);A.play()});RD.onResize(()=>A.redraw());
  })();

  // ---------- 7. small fills: PVC output, TrainJob env, resume numbers ----------
  (function(){
    const o=$('km-pvc-out');if(o){const keep=K.pvc.split('\n').filter(l=>/^## |km-ckpt|WaitForFirstConsumer|km-writer|km-reader|values:|- mi-kind|FailedScheduling|latest/.test(l)).filter((l,k,a)=>a.indexOf(l)===k);
      o.textContent=keep.map(l=>l.replace(/\s{2,}/g,'  ').replace(/(FailedScheduling\s+\S+\s+default-scheduler\s+)(.*?)\. preemption.*/,'$1$2.')).join('\n')}
    const t=$('km-tj-env');if(t){const FL={PET_NNODES:'--nnodes',PET_NPROC_PER_NODE:'--nproc-per-node',PET_NODE_RANK:'--node-rank',PET_MASTER_ADDR:'--master-addr',PET_MASTER_PORT:'--master-port'};
      t.innerHTML=K.trainjob.env.filter(e=>FL[e[0]]).map(e=>'<tr><td><code>'+E(e[0])+'</code></td><td><code>'+E(e[1])+'</code></td><td><code>'+FL[e[0]]+'</code></td></tr>').join('')}
    const l=$('km-tj-loss');if(l)l.textContent=String(K.trainjob.gloss[0]);
    const d=$('km-res-diff'),st=$('km-res-steps');if(d){const D=K.resume.diff,ks=Object.keys(D);d.textContent=Number(D[ks[0]]).toExponential(1);
      st.textContent=ks.length>1?ks.slice(0,-1).join(', ')+' and '+ks[ks.length-1]:ks[0]}
  })();

  // ---------- predict-then-reveal, tab links, reading time ----------
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
      if(b.dataset.a!=='1')b.classList.add('wrong');ans.hidden=false}))});
  const r=$('t-read');if(r){const c=r.cloneNode(true);c.querySelectorAll('style,nav,.rd-card,pre').forEach(x=>x.remove());
    const words=(c.textContent.match(/\S+/g)||[]).length;window.RD_WORDS=words;const e=$('rd-time');if(e)e.textContent=Math.round(words/200)}
})();
