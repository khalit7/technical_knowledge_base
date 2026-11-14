// ---- Scene, top (Fig. 1): one request through an SGLang deployment (renderer v2). Schematic layout; the request is customer B of
// section 2's toy bank assistant (window.SGTOY: 15 prompt tokens, 9 of them found in the tree, the 40-slot pool after customer A),
// so the token and slot counts are the page's radix cache's. Router, then the server's three processes: TokenizerManager, the Scheduler
// (waiting queue, radix tree on the CPU, the KV pool on the GPU) and the DetokenizerManager. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.SGTOY)return;const {at,off,lerp,mix}=S3;
  const R2=SGTOY.reqs[1],R1=SGTOY.reqs[0],CAP=SGTOY.CAP;
  const XC=-7.7,XR=-5.8,XT=-2.7,XS=.2,XG=4.2,XD=7.2,Y=.12,ZR2=-4.4;
  const nodes=R2.after.nodes,byId=new Map(nodes.map(n=>[n.id,n])),fresh=new Set(nodes.filter(n=>!R1.after.nodes.some(m=>m.id===n.id)&&!R2.path.includes(n.id)).map(n=>n.id));
  // the tree, small: x by token position, z by branch
  const tu=.16,tz={};{let leaf=0;const kids=new Map();nodes.forEach(n=>{if(!kids.has(n.par))kids.set(n.par,[]);kids.get(n.par).push(n)});
    const f=n=>{const ch=kids.get(n.id)||[];tz[n.id]=ch.length?ch.map(f).reduce((a,b)=>a+b,0)/ch.length:leaf++;return tz[n.id]};(kids.get(-1)||[]).forEach(f)}
  const tx=p=>XS-.9+p*tu,tzz=id=>-.25-tz[id]*.75;
  const gx=s=>XG-1.05+(s%10)*.235,gz=s=>-.75+Math.floor(s/10)*.5;
  const VIS={front:[0,4,5],tok:[1,4,5],sch:[1,2,3,4,5],gpu:[3,4,5],det:[4,5],rep:[0,4,5]};let K=0;const V=g=>VIS[g].includes(K)?1:0; // the part names show in every view (on a phone the full views turn into depth, below)
  function proc(R,x,w,label,sub,a,hl,g){const P=R.P;R.box([x,Y,0],[w,.55,1.5],{fill:hl?mix(P.paper,P.acc,.18):P.paper,a,lw:hl?1.4:.9,ec:hl?P.acc:null});
    R.label([x,Y+.55,0],label,{dy:-12,fs:12.5,b:1,c:hl?P.acc:P.ink,a:V(g)*Math.max(a,.45)});if(sub)R.label([x,Y,.75],sub,{dy:12,fs:12,c:P.mute,a:V(g)*Math.max(a,.45),wide:1})}
  function draw(R,k,e){const P=R.P,last=k===5;K=k;R.grid(-9.5,9,-5.4,2.6,.5);
    const A=i=>last||k===i?1:.28;
    // the client and the router
    R.box([XC,0,0],[.9,.5,.9],{fill:mix(P.paper,P.c2,.25),a:A(0)>.5||k===4?1:.4});R.label([XC,.5,0],'client',{dy:-12,fs:12.5,b:1,a:V('front')*Math.max(.5,A(0))});
    R.box([XR,0,0],[1.5,.6,1.3],{fill:mix(P.paper,P.ink,.1),a:A(0),lw:1.1});R.label([XR,.6,0],'router',{dy:-12,fs:12.5,b:1,a:V('front')*Math.max(.5,A(0))});
    if(k===0){R.label([XR,0,.7],'cache_aware: which replica holds this prefix?',{dy:16,fs:12,c:P.mute,a:e});
      // an approximate tree per worker, as two small fans beside the router
      [[-.9,P.good,'replica 1 · prefix found'],[ZR2,P.mute,'replica 2 · no match']].forEach(([z,c,t])=>{R.line([[XR,.6,0],[XR+1.6,.3,z]],{c,w:1,a:.4*e,dash:[3,3]});R.label([XR+1.6,.3,z],t,{dy:-10,fs:12,c,a:e,b:z>-1})});
      R.flowArc([XC+.45,.3,0],[XR-.75,.3,0],.4,{c:P.c2,r:.06,n:5,speed:1.4,a:e});R.flowArc([XR+.75,.3,0],[-3.4,Y+.3,0],.6,{c:P.c2,r:.06,n:7,speed:1.4,a:e})}
    // two replicas, the second one faint
    R.box([2.1,0,0],[11.4,Y,3.1],{a:1,lw:.8,dz:400});R.label([-3.6,0,1.55],'replica 1 · one SGLang server',{al:'left',dy:14,fs:12.5,b:1,c:P.mute,a:V('rep'),wide:1});
    R.box([2.1,0,ZR2],[11.4,Y,2],{a:.35,lw:.6,dz:400});R.label([-3.6,0,ZR2+1],'replica 2',{al:'left',dy:12,fs:12,c:P.mute,a:.7*V('rep'),wide:1});
    proc(R,XT,1.6,'TokenizerManager','chat template · token ids',A(1),k===1,'tok');
    proc(R,XD,1.6,'DetokenizerManager','ids to text · stream',A(4),k===4,'det');
    // the Scheduler: a CPU plate with the waiting queue and the radix tree
    const sa=A(2)>.5||k===3||k===5?1:.3;R.box([XS,Y,0],[3.2,.06,2.6],{fill:mix(P.paper,P.c5,.12),a:sa,lw:.8,shadow:false,dz:300});
    R.label([XS,Y,-1.3],'Scheduler (CPU)',{dy:-12,fs:12.5,b:1,c:k===2?P.acc:P.ink,a:V('sch')*Math.max(.5,sa)});
    for(let j=0;j<4;j++){const me=j===0;R.box([XS-1.1+j*.42,Y+.06,.95],[.32,.24,.32],{fill:me?mix(P.paper,P.c2,.6):mix(P.paper,P.ink,.12),a:sa*(me&&k>2?.25:1),lw:.6})}
    R.label([XS-1.4,Y+.3,.95],'waiting queue',{al:'right',dx:-6,fs:12,c:P.mute,a:V('sch')*(k===1||k===2?1:0),wide:1});
    nodes.forEach(n=>{const nw=fresh.has(n.id),hp=R2.path.includes(n.id),show=nw?(k>=5?(k===5?e:1):0):1;if(show<=0)return;
      const c=hp&&k>=2?P.good:nw?P.acc:P.ink,fill=hp&&k>=2?mix(P.paper,P.good,.7):nw?mix(P.paper,P.acc,.6):P.paper;
      R.box([(tx(n.start)+tx(n.start+n.len))/2,Y+.06,tzz(n.id)],[n.len*tu-.05,.22,.4],{fill,a:sa*show,lw:.7,ec:hp&&k>=2?P.good:null});
      const p=byId.get(n.par);if(p)R.line([[tx(n.start),Y+.17,tzz(p.id)],[tx(n.start),Y+.17,tzz(n.id)]],{c:P.mute,w:1,a:sa*show*.6})});
    if(k===2){R.label([tx(R2.hit),Y+.3,tzz(R2.path[0])],R2.hit+' of '+R2.P+' tokens cached',{al:'left',dx:10,dy:6,fs:12.5,b:1,c:P.good,a:e});
      R.flowArc([XS-1.1,Y+.3,.95],[tx(4.5),Y+.3,tzz(R2.path[0])],.4,{c:P.good,r:.05,n:5,speed:1.2,a:e})}
    if(k===2){const a2=nodes.filter(n=>!fresh.has(n.id)&&!R2.path.includes(n.id));if(a2.length)R.label([tx(a2[0].start+1),Y+.3,tzz(a2[0].id)],'customer A: question, answer',{al:'left',dy:16,fs:12,c:P.mute,a:e})}
    if(k===1){R.flowArc([XT+.8,Y+.4,0],[XS-1.1,Y+.3,.95],.5,{c:P.c2,r:.06,n:7,speed:1.4,a:e});R.label([(XT+XS)/2-.2,Y,1.45],R2.P+' token ids over ZeroMQ',{dy:8,fs:12.5,b:1,c:P.c2,a:e})}
    if(k===5){const nn=nodes.find(n=>fresh.has(n.id)&&byId.get(n.par)&&!fresh.has(n.par));if(nn)R.label([tx(nn.start+nn.len),Y+.3,tzz(nn.id)],'new branch inserted',{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a:e,wide:1})}
    // the GPU: the KV pool as 40 slots; the tree only holds their numbers
    const ga=A(3)>.5||k===4||last?1:.3;R.box([XG,Y,0],[2.7,.06,2.3],{fill:mix(P.paper,P.c1,.1),a:ga,lw:.8,shadow:false,dz:300});
    R.label([XG,Y,-1.15],'KV pool (GPU)',{dy:-12,fs:12.5,b:1,c:k===3?P.acc:P.ink,a:V('gpu')*Math.max(.5,ga)});
    const own=k>=3?R2.after.owner:R1.after.owner,mine=new Set(),hit=new Set();nodes.forEach(n=>{if(fresh.has(n.id)&&(k>=4||!fresh.has(n.par)))n.slots.forEach(s=>mine.add(s));if(R2.path.includes(n.id))n.slots.forEach(s=>hit.add(s))});
    const outS=new Set();nodes.forEach(n=>{if(fresh.has(n.id)&&fresh.has(n.par))n.slots.forEach(s=>outS.add(s))});
    for(let s=0;s<CAP;s++){const held=own[s]>=0&&!(k===3&&outS.has(s)),isN=mine.has(s)&&k>=3,isH=hit.has(s)&&k>=2,grow=isN&&(k===3||k===4&&outS.has(s))?e:1;
      R.box([gx(s),Y+.06,gz(s)],[.19,held?.3*grow+.02:.03,.36],{fill:isH?mix(P.paper,P.good,.7):isN?mix(P.paper,P.acc,.6):held?mix(P.paper,P.ink,.12):P.paper,a:ga*(held?1:.6),lw:.5,shadow:false})}
    if(k===3){R.label([XG,Y+.4,.95],R2.P-R2.hit+' new tokens computed · '+R2.hit+' read in place',{dy:16,fs:12.5,b:1,c:P.acc,a:e});
      const t0=nodes.find(n=>n.id===R2.path[0]);[0,4,8].forEach(s=>R.arc([tx(t0.start+s+.5),Y+.2,tzz(t0.id)],[gx(s),Y+.3,gz(s)],.5,{c:P.good,w:1,a:.5*e}));
      [...mine].slice(0,6).forEach(s=>R.flowArc([tx(10),Y+.3,tzz(R2.path[0])-.8],[gx(s),Y+.3,gz(s)],.6,{c:P.acc,r:.045,n:3,speed:1.3,a:e}));
      R.label([XS,Y,1.3],'overlap loop: the next batch is prepared here while the GPU runs',{dy:16,fs:12,c:P.mute,a:e,wide:1})}
    if(k===4){R.flowArc([XG+1.2,Y+.3,0],[XD-.8,Y+.4,0],.5,{c:P.acc,r:.06,n:6,speed:1.3,a:e});
      R.flowArc([XD,Y+.6,0],[XC,.5,0],2.4,{c:P.c2,r:.06,n:14,speed:2,a:e});R.label([XG,Y+.4,-.4],'grammar mask (if a schema)',{dy:-34,fs:12,c:P.c5,a:e,b:1,wide:1})}
  }
  const ph=()=>{const c=document.querySelector('#stg-hero canvas');return c&&c.clientWidth<520}; // a phone: the full views turn the long row into depth so the parts draw larger
  const full={cam:[-.16,.8],bounds:[[-8.2,0,-5.2],[8.2,.9,1.9]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one request through an SGLang deployment',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    view:k=>k>=4&&ph()?{cam:[-.62,1.05],bounds:[[-8.2,0,-1.6],[8.2,.9,1.6]]}:k===0?{cam:[-.25,.62],bounds:[[-8.3,0,-4.8],[-2.6,.9,1.4]]}:k===1?{cam:[-.2,.62],bounds:[[-4.4,0,-1.6],[1.6,.9,1.8]]}:k===2?{cam:[-.15,.75],bounds:[[-1.7,0,-1.9],[2.2,.7,1.6]]}:k===3?{cam:[-.1,.72],bounds:[[-1.2,0,-1.8],[5.8,.7,1.8]]}:k===4?{cam:[-.16,.7],bounds:[[-8.2,0,-1.6],[8.2,1.8,1.6]]}:full,
    margin:w=>w<520?[14,10,14,10]:[22,24,20,24]});
  (window.SGSTG=window.SGSTG||{})['stg-hero']=st;
})();
