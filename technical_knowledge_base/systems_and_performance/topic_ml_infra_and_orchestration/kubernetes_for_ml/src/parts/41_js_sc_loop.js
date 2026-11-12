// ---- Scene: the control loop (section 1). The recorded watch streams of the running example (window.KM.life) submitted three ways:
// an Indexed Job by hand, a JobSet, a Kubeflow TrainJob. Back row: the controllers; middle: the API server with the objects stored in it;
// front: the three workers with their kubelets and 4 fake GPUs each. Teal dots are watch events reaching a controller, orange dots its writes,
// green dots status flowing back. Each step groups the recorded changes of one stretch; its time is the last change of that stretch. ----
(function(){
  if(!document.getElementById('stg-loop')||!window.KMG||!window.KM)return;const {at,mix}=S3,G=KMG,L=KM.life;
  const ZC=-2.7,ZP=-.3,ZW=2.6,YO=.22;
  const CX={you:-3.9,trainer:-2.1,jsctl:-.2,jobctl:2.35,sched:4.0},CN={you:'you (kubectl)',trainer:'Trainer',jsctl:'JobSet controller',jobctl:'job controller',sched:'scheduler'};
  const OX={TrainJob:-3.9,JobSet:-2.1,Job:-.2,pod0:1.6,pod1:3.2};
  const MODES={job:['top','pods','bind','start','done'],jobset:['top','job','pods','bind','start','done'],trainjob:['top','js','job','pods','bind','start','done']};
  let mode='job';
  // what the recorded stream says for each mode: the objects, which node each pod went to, and the time that closes each stretch
  function facts(m){const S=L[m],last=re=>{let t=null;S.forEach(e=>{if(re(e))t=e.t});return t},pods=[],node={};
    S.forEach(e=>{if(e.what==='creates pod'&&!pods.includes(e.obj))pods.push(e.obj);const b=/spec\.nodeName = (\S+)/.exec(e.note);if(e.what==='binds pod'&&b)node[e.obj]=G.WN[b[1]]});
    const nm=k=>{const e=S.find(x=>x.obj.startsWith(k+'/'));return e?e.obj.split('/')[1]:''};
    const T={top:m==='trainjob'?null:0,js:last(e=>e.what==='creates JobSet'),job:last(e=>e.what==='creates Job'),pods:last(e=>e.what==='creates pod'),bind:last(e=>e.what==='binds pod'),
      start:last(e=>e.what==='Started'),run:last(e=>/^Succeeded/.test(e.note)),done:S[S.length-1].t};
    const objs=[];if(m==='trainjob')objs.push({k:'TrainJob',x:OX.TrainJob,ph:'top',w:'you',lab:'TrainJob'});
    if(m!=='job')objs.push({k:'JobSet',x:OX.JobSet,ph:m==='trainjob'?'js':'top',w:m==='trainjob'?'trainer':'you',watch:m==='trainjob'?'trainer':null,lab:'JobSet'});
    objs.push({k:'Job',x:OX.Job,ph:m==='job'?'top':'job',w:m==='job'?'you':'jsctl',lab:'Job'});
    pods.forEach((p,i)=>objs.push({k:'pod'+i,x:OX['pod'+i],ph:'pods',w:'jobctl',lab:'pod '+i,pod:p,node:node[p]}));
    return {T,objs,pods,node}}
  const F={job:facts('job'),jobset:facts('jobset'),trainjob:facts('trainjob')};
  window.KM_LOOP=F;
  const ctrls=m=>m==='job'?['you','jobctl','sched']:m==='jobset'?['you','jsctl','jobctl','sched']:['you','trainer','jsctl','jobctl','sched'];
  // the controller that watches each kind of object and writes the next
  const WATCHER={TrainJob:'trainer',JobSet:'jsctl',Job:'jobctl'};
  function draw(R,k,e){const P=R.P,ph=MODES[mode],cur=ph[k],idx=n=>ph.indexOf(n),f=F[mode],WR=P.q,WA=P.k,OK=P.good,ink=P.ink;
    const has=n=>idx(n)>=0&&k>=idx(n),seen=n=>idx(n)<0?false:at(k,e,idx(n));
    R.grid(-5,5,-3.4,3.4,.5);
    // focus: what this stretch is about stays at full strength, the rest recedes
    const FOC={top:['you','top'],js:['trainer','JobSet','TrainJob'],job:['jsctl','Job','JobSet'],pods:['jobctl','Job','pod0','pod1'],bind:['sched','pod0','pod1','w'],start:['w','pod0','pod1'],done:['all']}[cur];
    const topK=f.objs[0].k,fa=id=>FOC.includes('all')||FOC.includes(id)||(id===topK&&FOC.includes('top'))?1:.28;
    // the API server, with etcd behind it: every object lives here
    R.box([0,0,ZP],[9.4,YO,1.6],{fill:mix(P.paper,P.c4,.16),a:.95,lw:.7});
    R.label([-4.7,YO,ZP],'API server + etcd',{al:'right',dx:-8,mono:true,fs:12,c:P.c4,grp:'side'});
    // controllers
    ctrls(mode).forEach(c=>{const p=[CX[c],0,ZC],a=fa(c);R.box(p,[1.25,.5,.75],{fill:c==='you'?mix(P.paper,P.acc,.25):mix(P.paper,P.ink,.05),a,lw:.7});
      R.label([p[0],.5,ZC],CN[c],{fs:12,dy:-10,b:a===1,c:a===1?ink:P.mute,a:Math.max(.55,a)})});
    // workers and their kubelets
    G.WX.forEach((x,i)=>{const used=f.pods.some(p=>f.node[p]===i),a=has('bind')&&used?fa('w'):.3;
      G.worker(R,[x,0,ZW],{a});R.label([x,0,ZW+.55],G.NAMES[i]+' · kubelet',{fs:12,dy:14,c:a===1?ink:P.mute,a:Math.max(.55,a)})});
    // the objects, appearing in the stretch that writes them
    f.objs.forEach(o=>{const a0=seen(o.ph);if(a0<=0)return;const a=a0*fa(o.k),done=cur==='done',p=[o.x,YO,ZP];
      R.box(p,[1.3,.3,.62],{fill:done?mix(P.paper,OK,.35+.25*e):o.k.startsWith('pod')&&has('bind')?mix(P.paper,P.acc,.3):P.paper,a,lw:.8,shadow:false});
      R.label([o.x,YO+.3,ZP],o.lab,{mono:true,fs:12,dy:-9,a:Math.max(.5,a)});
      // the write that created it, during its own stretch
      if(o.ph===cur){const wp=[CX[o.w],.5,ZC];R.flowArc(wp,[o.x,YO+.3,ZP],.5,{c:WR,a:e,r:.075,speed:1.4});
        if(o.watch){const src=f.objs.find(x=>WATCHER[x.k]===o.watch);if(src)R.flowArc([src.x,YO+.3,ZP],wp,.45,{c:WA,a:e,r:.06,speed:1.4})}
        if(o.k==='Job'&&mode!=='job'){const js=f.objs.find(x=>x.k==='JobSet');R.flowArc([js.x,YO+.3,ZP],[CX.jsctl,.5,ZC],.45,{c:WA,a:e,r:.06,speed:1.4})}
        if(o.k==='pod0'){const jb=f.objs.find(x=>x.k==='Job');R.flowArc([jb.x,YO+.3,ZP],[CX.jobctl,.5,ZC],.45,{c:WA,a:e,r:.06,speed:1.4})}}});
    // binding: the scheduler watches pods with no node and writes a node name into each; the arc shows where each pod went
    f.objs.filter(o=>o.pod).forEach(o=>{const wi=o.node;if(wi==null)return;const tgt=G.podAt([G.WX[wi],0,ZW],0,2),src=[o.x,YO+.3,ZP],b=seen('bind');
      if(b>0){R.arc(src,tgt,.6,{c:P.acc,w:1.6,t:cur==='bind'?e:1,a:cur==='bind'||cur==='start'?.9:.35});
        if(cur==='bind'){R.flowArc(src,[CX.sched,.5,ZC],.5,{c:WA,a:e,r:.06,speed:1.4});R.flowArc([CX.sched,.5,ZC],src,.7,{c:WR,a:e,r:.075,speed:1.4})}}
      // the kubelet on that node watches for pods bound to it, then starts the container on 2 of its 4 GPUs
      const s=seen('start');if(s>0){if(cur==='start')R.flowArc(src,tgt,.6,{c:WA,a:e,r:.06,speed:1.2});
        G.pod(R,tgt,2,{c:cur==='done'?mix(P.acc,OK,e):P.acc,a:s*(cur==='done'?1:fa('w')),h:.36*s});
        R.label([tgt[0],tgt[1]+.36,tgt[2]],o.lab+' · torchrun',{mono:true,fs:12,dy:-9,a:s,wide:1})}
      if(cur==='done')R.flowArc(tgt,src,.6,{c:OK,a:e,r:.07,speed:1.2})});
    if(cur==='done'){const jb=f.objs.find(x=>x.k==='Job');R.flowArc([jb.x,YO+.3,ZP],[CX.jobctl,.5,ZC],.45,{c:OK,a:e,r:.06,speed:1.3});
      if(mode!=='job'){const js=f.objs.find(x=>x.k==='JobSet');R.flowArc([jb.x,YO+.3,ZP],[CX.jsctl,.5,ZC],.4,{c:OK,a:e,r:.06,speed:1.3})}}
    // the clock: the recorded time that closes this stretch
    const T=f.T[cur==='start'?'start':cur],txt=cur==='top'&&mode==='trainjob'?'you apply the TrainJob':cur==='done'?'t = '+f.T.done.toFixed(2)+' s · complete':'t = '+(T==null?0:T).toFixed(2)+' s';
    R.label([-4.7,0,ZP+.4],txt,{al:'right',dx:-8,dy:14,mono:true,fs:13,b:1,c:cur==='done'?OK:P.acc,a:Math.max(.3,e)});
  }
  const full={cam:[.26,.78],bounds:[[-4.8,0,-3.5],[4.8,1.0,3.2]]};
  const st=S3.stage({id:'stg-loop',list:'sx-loop-job',fig:'The control loop · one job, recorded',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4600,draw,
    // the first step turns the camera towards the one object you write; every other step shows the whole chain from the front
    view:k=>MODES[mode][k]==='top'?{cam:[.4,.78]}:null,
    margin:w=>w<520?[16,10,14,10]:[22,16,16,190]});
  (window.KMSTG=window.KMSTG||{})['stg-loop']=st;
  const seg=document.getElementById('km-loop-mode');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    Object.keys(MODES).forEach(m=>document.getElementById('sx-loop-'+m).hidden=m!==mode);st.list('sx-loop-'+mode)}));
})();
