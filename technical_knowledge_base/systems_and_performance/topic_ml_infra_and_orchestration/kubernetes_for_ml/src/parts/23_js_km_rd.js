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
    load();const A=RD.anim({card:'km-fail-card',ctl:'km-fail-ctl',n:ev.length,draw,ms:1100,label:'Moment of the failure run',auto:false,start:ev.length-1});
    RD.seg($('km-fail-mode'),m=>{run=m;load();A.reset(ev.length);A.go(ev.length-1,true)});RD.onResize(()=>A.redraw());
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
      }
    const A=RD.anim({card:'km-dev-card',ctl:'km-dev-ctl',n:ST.dp.length,draw,ms:4200,label:'Step',list:'sx-dev-dp'});
    RD.seg($('km-dev-mode'),m=>{mode=m;['dp','dra'].forEach(x=>$('sx-dev-'+x).hidden=x!==m);A.reset(ST[m].length,'sx-dev-'+m)});RD.onResize(()=>A.redraw());
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
})();
