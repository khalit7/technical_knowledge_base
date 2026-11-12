// ---- Scene, section 4 (Fig. 3): one queue of 16 questions about 5 documents of 800 tokens, a 3,000-token pool, scheduled first come
// first served (front lane) and longest prefix match (back lane), round by round (renderer v2). Data: the page's checked scheduling-round
// model (SG.schedRun in 22_js_sg_core.js, whose orders match SGLang v0.5.21's own SchedulePolicy, src/iso/check_sched.py), run here on
// SG.ragTrace(5, 800, 16) with arrival order 3. The sizes are illustrative; every order, admission, hit and eviction is the model's.
// Each lane: the waiting queue as the policy sorted it (cubes coloured by document; the admitted ones raised), and the five documents'
// places in the pool (a block where the document is cached). Green streams: a question reusing its cached document; orange: computing it. ----
(function(){
  if(!document.getElementById('stg-sched')||!window.SG)return;const {at,off,lerp,mix,rgb}=S3;
  const ND=5,DL=800,NQ=16,CAP=3000,SEED=3,TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#76b7b2'];
  const tr=SG.ragTrace(ND,DL,NQ,5),by=new Map(tr.map(q=>[q.id,q])),docs=[];for(let d=0;d<ND;d++)docs.push(SG.tokens({g:d,S:DL,conv:0,P:DL},DL));
  const RUN={};['fcfs','lpm'].forEach(p=>{const r=SG.schedRun(tr,CAP,p,SEED,SEED,t=>docs.map(ids=>t.peek(ids)/DL));RUN[p]=r});
  const arrival=RUN.fcfs.rounds[0].wait,NS=Math.max(RUN.fcfs.rounds.length,RUN.lpm.rounds.length)+2;
  const LANES=[['fcfs',1.7,'fcfs (the default)'],['lpm',-2.1,'lpm']];
  const qx=j=>-7.2+j*.5,dx=d=>1.7+d*1.45,nf=v=>Math.round(v).toLocaleString('en-US');
  const cum=(p,k)=>{let h=0,c=0;RUN[p].rounds.slice(0,k).forEach(r=>{h+=r.hit;c+=r.prefill});return [h,c]};
  function draw(R,k,e){const P=R.P,last=k===NS-1;R.grid(-8.4,8.4,-3.8,3.2,.5);
    LANES.forEach(([p,z,name])=>{const run=RUN[p],ri=k-1,rd=k>=1&&ri<run.rounds.length?run.rounds[ri]:null,done=k>=1&&ri>=run.rounds.length;
      const prevSnap=ri>=1?run.rounds[Math.min(ri,run.rounds.length)-1].snap:docs.map(()=>0),snap=k===0?docs.map(()=>0):rd?rd.snap:run.rounds[run.rounds.length-1].snap;
      if(R.W<520)R.label([qx(0)-.2,.34,z-.25],name,{al:'left',dy:-12,fs:12.5,b:1,c:P.ink});else R.label([qx(0)-.3,0,z],name,{al:'right',dx:-8,fs:12.5,b:1,c:P.ink});
      // the queue: the order this round's policy sorted it in; the admitted ones stand raised and stream to their documents
      const wait=k===0?arrival:rd?rd.wait:[],adm=new Set(rd?rd.admitted:[]);
      wait.forEach((id,j)=>{const q=by.get(id),a=adm.has(id),c=rgb(TAB[q.g]),cached=prevSnap[q.g]>=1;
        R.box([qx(j),a?.32*e:0,z],[.4,.34,.5],{fill:mix(P.paper,c,.8),a:a?1:rd?.45:1,lw:a?1.2:.6,ec:a?P.ink:null,shadow:!a});
        if(a)R.flowArc([qx(j),.62,z],[dx(q.g),.62,z],.7,{c:cached?P.good:P.c2,r:.05,n:5,speed:1.5,a:Math.min(1,e*1.6)})});
      if(!wait.length)R.label([qx(4),0,z],done?'queue empty':'',{fs:12,c:P.mute});
      // the pool: one place per document; a cached document is a block, an evicted one a red ghost
      for(let d=0;d<ND;d++){const c=rgb(TAB[d]),had=prevSnap[d]>=1&&k>=1,has=snap[d]>=1,nw=has&&!had&&rd,gone=had&&!has&&rd;
        R.quad([[dx(d)-.5,.004,z-.45],[dx(d)+.5,.004,z-.45],[dx(d)+.5,.004,z+.45],[dx(d)-.5,.004,z+.45]],{ec:P.line,dash:[4,3],a:.9,dz:300});
        if(has)R.box([dx(d),0,z],[.95,.55*(nw?e:1),.85],{fill:mix(P.paper,c,.75),lw:.8});
        if(gone)R.box([dx(d),0,z],[.95,.55,.85],{fill:mix(P.paper,P.bad,.3),ec:P.bad,a:1-e*.7,lw:1.2});
        if(rd){const n=rd.admitted.filter(id=>by.get(id).g===d&&!(prevSnap[d]>=1)).length;if(n>1)R.label([dx(d),.55,z],'computed ×'+n,{dy:-10,fs:12,b:1,c:P.c2,a:e})}}
      const [h,c]=cum(p,Math.min(k,run.rounds.length));const tot=run.prompt_tokens;
      R.label([qx(0)-.2,0,z+.5],last?run.rounds.length+' rounds · '+Math.round(100*h/tot)+'% reused · '+nf(c)+' computed':(done?'done · ':'')+'reused '+nf(h)+' · computed '+nf(c),{al:'left',dy:16,fs:12.5,b:last||done,c:last?(p==='lpm'?P.good:P.c2):P.mute})});
    for(let d=0;d<ND;d++)R.label([dx(d),0,LANES[0][1]+.5],(R.W<520?'':'doc ')+(d+1),{dy:14,fs:12.5,c:rgb(TAB[d]),b:1});R.label([dx(0)-.5,0,-.2],'the pool: '+nf(CAP)+' tokens, room for about three documents',{al:'left',fs:12,c:P.mute,wide:1})}
  const st=S3.stage({id:'stg-sched',list:'sx-sched',fig:'Fig. 3 · one queue, two policies, round by round',cam:[0,1.0],bounds:[[-8.2,0,-2.8],[8.6,.6,2.8]],aspect:.46,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[20,22,18,110]});
  (window.SGSTG=window.SGSTG||{})['stg-sched']=st;
  window.SG_SCHED_SCENE={RUN,tr,ND,DL,NQ,CAP,SEED};
})();
