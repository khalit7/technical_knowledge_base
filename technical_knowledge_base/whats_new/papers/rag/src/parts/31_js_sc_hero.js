// ---- Scene: the paper's Figure 1 in 3D, driven by the page's trained toy RAG-Token (renderer v2: glass plates, flowing dots, camera per step) ----
// One held-out question ("who is the president of ...?", a country whose facts were never a training answer). The query encoder's weights for the
// question's tokens are the signed bars; the index is the frozen 2018 edition (1,020 documents); the five retrieved documents carry their real
// p(z|x); the generator reads each one with the question; RAG-Token's mixture writes the answer; the last step shows where the training gradient goes
// (a path, not values: the query encoder and the generator are trained, the document encoder and index are not, §2.4).
// window.__hero() returns what the scene draws, for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix,cl}=S3;
  const ci=[...WD.testC].sort((a,b)=>a-b)[0],Q=demoQ('president',ci),M=RAG.load('tok');
  let D=null;
  function data(){if(D)return D;const R=RAG.retrieve(M,IDX18,Q.x,5),A=RAG.answer(M,IDX18,Q.x,5);
    // the query side of the retriever: one learned weight per question token, scaled by 1/sqrt(length) as in bag() (22_js_rag.js)
    const toks=Q.x,r=1/Math.sqrt(toks.length),qw=toks.map(t=>M.qw.w[RAG.vocab.indexOf(t)]*r);
    const docs=R.idx.map((i,j)=>({i,t:WD.show(IDX18[i].toks),p:Math.exp(R.lpz[j]),s:R.score[j]}));
    return D={toks,qw,mq:Math.max(...qw.map(Math.abs)),docs,y:A.y,right:A.y.join(' ')===Q.y.join(' '),steps:A.steps}}
  const trunc=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;
  // a vector as signed bars on a white plinth (the reference scene's comb)
  function comb(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.14,.045,.34],{a,shadow:false});
    vals.forEach((v,i)=>{const h=Math.max(.014,Math.abs(v)/m*hmax),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,v>=0?c[1]:c[1]-.045-h,c[2]],[bw*.7,h,.11],{fill:col,a,shadow:false,lw:.7})})}
  // layout: question and query encoder at the left, the index on the floor in the middle, the five documents in depth, the generator and the answer at the right
  const XQ=-4.7,XE=-4.0,XC=-2.95,IX0=-2.2,IX1=.3,IZ0=-1.8,IZ1=1.5,XD=1.55,XG=2.95,XS=4.05,zr=j=>(j-2)*.8,NC=34,NR=30;
  const cell=i=>[IX0+(IX1-IX0)*((i%NC)+.5)/NC,.02,IZ0+(IZ1-IZ0)*(Math.floor(i/NC)+.5)/NR];
  function draw(R,k,e){const P=R.P,T=data();R.grid(-5.5,5,-2.6,2.6,.5);
    const qa=k<=1||k===5?1:.3,ia=k===1||k===5?1:k===3||k===4?.06:.3,da=k>=2?(k===2?e:1):0,ga=k>=3?(k===3?e:1):0,z0=zr(2);
    // 1. the question and the query encoder (orange glass: fine-tuned); the question's tokens stream through it into one signed weight each
    if(k<=1||k===5)R.label([XQ,1.25,z0],'x: '+WD.show(T.toks),{mono:true,fs:12.5,b:1,al:'left',dx:-20,c:P.ink});
    R.glass([XE-.42,.1,z0],[.84,0,0],[0,.9,0],{c:P.q,a:qa,nu:6,nv:6});
    if(k<=1)R.label([XE,0,z0+.1],'query encoder q(x)',{mono:true,fs:12,dy:14,c:P.q});
    if(k===0){R.flowArc([XQ,1.15,z0],[XE,.55,z0],.15,{c:P.q,a:e,r:.06,n:6,speed:1.1});R.flowArc([XE,.55,z0],[XC,.6,z0],.12,{c:P.q,a:e,r:.06,n:5})}
    comb(R,[XC,.5,z0],T.qw,T.mq,P.q,(k===0?e:1)*qa,.45,1.15);
    if(k===0)R.label([XC+.65,.3,z0],'q(x): one weight per token',{mono:true,fs:12,al:'left',dx:6,c:P.q,a:e});
    // 2. the index: 1,020 documents, embedded once, frozen (teal glass on the floor); the query is scored against every one (MIPS)
    R.glass([IX0,.02,IZ0],[IX1-IX0,0,0],[0,0,IZ1-IZ0],{c:P.k,a:ia,nu:NC/2,nv:NR/2,th:.03});
    if(k===1||k===5)R.label([IX0,0,IZ1],k===5?'index · frozen · no gradient':'index · '+IDX18.length.toLocaleString('en-GB')+' documents d(z) · frozen',{mono:true,fs:12.5,b:k===5,al:'left',dx:-10,dy:16,c:P.k,a:k===5?e:1});
    if(k===1){R.flowArc([XC+.5,.55,z0],[(IX0+IX1)/2,.05,(IZ0+IZ1)/2],.45,{c:P.q,a:Math.min(1,e*1.5),r:.07,n:9,speed:1.3});
      T.docs.forEach(d=>{const c=cell(d.i);R.glow([c[0],.06,c[2]],.3,{c:P.c1,a:e*.9});R.box(c,[.12,.04+.25*d.p*e,.12],{fill:P.c1,a:e,shadow:false})})}
    // 3. the top five rise out of the index into a row in depth, each with its prior p(z|x) as a bar on a plinth
    T.docs.forEach((d,j)=>{if(da<=.01)return;const c0=cell(d.i),c1=[XD,0,zr(j)],t=k===2?e:1,c=[lerp(c0[0],c1[0],t),0,lerp(c0[2],c1[2],t)],dd=k>=3&&k!==5?.6:k===5?.35:1;
      R.box(c,[1.1,.1,.52],{fill:P.paper,a:da*dd});
      const h=.05+1.0*d.p;R.box([c[0]-.72,0,c[2]],[.22,.04,.3],{a:da*dd,shadow:false});R.box([c[0]-.72,.04,c[2]],[.14,h*t,.14],{fill:P.c1,a:da*dd,shadow:false});
      if(k>=2&&k<=4)R.label([c[0]-.72,.04+h*t,c[2]],d.p.toFixed(2),{mono:true,fs:12,dy:-9,c:P.c1,a:da*dd,b:j===0});
      if(k===2)R.label([c[0]+.58,.1,c[2]],trunc(d.t,34),{mono:true,fs:12,al:'left',dx:6,c:P.ink,a:da,grp:'docs',wide:1})});
    if(k===2)R.label([XD-.72,0,zr(4)+.4],'p(z|x): the top 5 scores, softmaxed',{mono:true,fs:12,c:P.c1,a:e,dy:18});
    // 4. the generator (purple glass: fine-tuned) reads each document concatenated with the question, one pass per document
    const gx=XG,gz0=zr(0)-.42,gz1=zr(4)+.42;
    if(ga>0){R.glass([gx,.08,gz0],[0,0,gz1-gz0],[0,1.0,0],{c:P.v,a:ga*(k===3?1:.55),nu:10,nv:4});
      if(k===3||k===4)R.label([gx,0,gz1],'generator pθ · reads z // x',{mono:true,fs:12,dy:18,c:P.v,a:ga});
      if(k===3)T.docs.forEach((d,j)=>R.flow([[XD+.55,.12,zr(j)],[gx,.5,zr(j)],[gx+.55,.5,zr(j)]],{c:P.v,a:e,r:.075,n:7,speed:1.1}))}
    // 5. marginalise: each pass's next-token distribution, weighted by p(z|x), summed; the stream from each document is as dense as its weight
    if(k>=4){const sp=[XS,.55,z0],ka=k===4?e:1;T.docs.forEach((d,j)=>{if(d.p<.005)return;R.flowArc([gx+.05,.5,zr(j)],sp,.25,{c:P.c1,a:(k===5?.3:1)*ka*(.3+.7*Math.min(1,d.p*1.6)),r:.04+.05*d.p,n:Math.max(2,Math.round(2+d.p*10)),speed:1.1})});
      R.ball(sp,.16,{c:P.acc,a:ka});if(k===4)R.label(sp,'Σ p(z|x) pθ(y|x,z)',{mono:true,fs:12,dy:-24,c:P.acc,a:ka});
      R.label(sp,'y: '+WD.show(T.y)+(T.right?'  ✓':'  ✗'),{mono:true,fs:13,b:1,dy:26,c:T.right?P.good:P.bad,a:ka})}
    // 6. training: the loss −log p(y|x) sends a gradient back through the generator and, through p(z|x), into the query encoder; the index gets none
    if(k===5){const g=P.bad;R.flowArc([XS,.6,z0],[gx+.05,.6,z0],.3,{c:g,a:e,r:.06,n:6,speed:1.2});
      R.flowArc([gx-.05,.6,z0],[XE+.2,.7,z0],1.1,{c:g,a:e,r:.065,n:18,speed:1.4});
      R.glow([gx,.6,z0],.7,{c:P.v,a:.5*e});R.glow([XE,.55,z0],.6,{c:P.q,a:.5*e});
      R.label([XS,.55,z0],'loss −log p(y|x)',{mono:true,fs:12.5,b:1,dy:-24,c:g,a:e});
      R.label([gx,1.1,gz0],'generator: trained',{mono:true,fs:12,dy:-10,c:P.v,a:e,grp:'tr'});R.label([XE,1.0,z0],'query encoder: trained',{mono:true,fs:12,dy:-10,c:P.q,a:e,grp:'tr'})}
  }
  {const T=data(),set=(k,v)=>document.querySelectorAll('.toy[data-k="'+k+'"]').forEach(e=>e.textContent=v);set('ndocs',IDX18.length.toLocaleString('en-GB'));set('herop1',pct(T.docs[0].p));
    set('heroy','"'+WD.show(T.y)+'"'+(T.right?', which is right':', against the truth "'+WD.show(Q.y)+'"'))}
  window.__hero=()=>{const T=data();return {q:WD.show(T.toks),y:T.y.join(' '),truth:Q.y.join(' '),docs:T.docs.map(d=>[d.t,+d.p.toFixed(3)])}};
  const full={cam:[.42,.7],bounds:[[-4.9,0,-2.0],[4.6,1.4,2.0]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the toy RAG-Token, one held-out question',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,16,8]:[18,14,18,14],
    // step 1 moves in on the question and the query encoder, step 2 looks down on the index, step 3 on the five documents and their weights,
    // steps 4 and 5 on the generator and the sum; the last step shows the whole model with the gradient's path
    view:k=>k===0?{cam:[.35,.5],bounds:[[-5.0,0,-.9],[-2.2,1.4,.9]]}:k===1?{cam:[.3,.9],bounds:[[-4.4,0,-1.9],[.5,1.0,1.7]]}:k===2?{cam:[.55,.62],bounds:[[-.6,0,-2.0],[3.2,1.3,2.0]]}:k===3||k===4?{cam:[.5,.62],bounds:[[.7,0,-2.0],[4.7,1.3,2.0]]}:innerWidth<520?{cam:[.85,.85],bounds:full.bounds}:full});
})();
