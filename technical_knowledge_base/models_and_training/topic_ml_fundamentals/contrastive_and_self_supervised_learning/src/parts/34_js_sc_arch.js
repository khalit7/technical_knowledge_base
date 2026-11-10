// ---- Scene (two branches, Fig. 3): one input, two views, two branches of plates, six designs (renderer v2) ----
// A structural diagram, no measured data: each step is one design as its paper describes it (sources in the step list and the table).
// Glass plates are networks: green trained by the gradient, grey a moving-average (EMA) copy that gets none. Blue dots are the data going
// forward, orange dots the gradient coming back from the loss, purple dots the EMA copy of the weights; a dark slab is a stop-gradient.
// Between two designs, what they share stays and what differs fades out before the new parts fade in.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ar')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const XL=-1.55,XR=1.55,ZX=3.1,ZA=2.05,ZE=.75,ZP=-.45,ZQ=-1.6,ZL=-3.05;
  // slots: side, z, plate size [w,h]; kinds: t trained, e EMA copy, a fixed operation
  const SL={augL:[XL,ZA],augR:[XR,ZA],encL:[XL,ZE,1.6,1],encR:[XR,ZE,1.6,1],prjL:[XL,ZP,1.25,.72],prjR:[XR,ZP,1.25,.72],prdL:[XL,ZQ,.95,.56],prdR:[XR,ZQ,.95,.56]};
  const DS=[
    {n:'SimCLR',L:'view 1',R:'view 2',c:{augL:['a','crop + colour jitter'],augR:['a','crop + colour jitter'],encL:['t','encoder f'],encR:['t','encoder f'],prjL:['t','head g'],prjR:['t','head g']},
      gl:1,gr:1,loss:'NT-Xent',num:'batch 4,096 · 2(N − 1) = 8,190 negatives · τ = 0.1',share:1,neg:'batch'},
    {n:'MoCo',L:'query',R:'key',c:{augL:['a','augment'],augR:['a','augment'],encL:['t','query encoder'],encR:['e','key encoder (EMA)']},
      gl:1,gr:0,sg:1,ema:'m = 0.999',loss:'InfoNCE',num:'queue of K = 65,536 keys · τ = 0.07',neg:'queue'},
    {n:'BYOL',L:'online',R:'target',c:{augL:['a','augment'],augR:['a','augment'],encL:['t','encoder'],encR:['e','encoder (EMA)'],prjL:['t','projector'],prjR:['e','projector (EMA)'],prdL:['t','predictor']},
      gl:1,gr:0,sg:1,ema:'0.996 → 1',loss:'MSE of normalised outputs',num:'no negatives · EMA rate 0.996 → 1, cosine schedule'},
    {n:'SimSiam',L:'view 1',R:'view 2',c:{augL:['a','augment'],augR:['a','augment'],encL:['t','encoder'],encR:['t','encoder'],prdL:['t','predictor']},
      gl:1,gr:0,sg:1,share:1,loss:'negative cosine',num:'no negatives, no EMA · batch 64 to 4,096'},
    {n:'DINO',L:'student',R:'teacher',c:{augL:['a','global + local crops'],augR:['a','global crops'],encL:['t','student ViT'],encR:['e','teacher ViT (EMA)'],prdL:['a','softmax, τ 0.1'],prdR:['a','centre, softmax τ 0.04']},
      gl:1,gr:0,sg:1,ema:'0.996 → 1',loss:'cross entropy, teacher → student',num:'teacher τ 0.04 → 0.07 · centre momentum 0.9'},
    {n:'VICReg',L:'view 1',R:'view 2',c:{augL:['a','augment'],augR:['a','augment'],encL:['t','encoder'],encR:['t','encoder'],prjL:['t','expander'],prjR:['t','expander']},
      gl:1,gr:1,share:1,loss:'invariance + variance + covariance',num:'λ = μ = 25 · ν = 1 · γ = 1'}];
  const fin=e=>Math.max(0,(e-.4)/.6),fout=e=>Math.max(0,1-e/.4);
  function draw(R,k,e,st){const P=R.P,narrow=R.W<520;R.grid(-4,4.4,-4,4,.5);
    const pk=st&&st.pk!=null&&st.pk!==k?st.pk:k,C=DS[k],O=DS[pk],same=pk===k;
    const aIn=key=>C.c[key]?(same||O.c[key]?1:fin(e)):(!same&&O.c[key]?fout(e):0);
    const kindCol=kd=>kd==='t'?P.c3:kd==='e'?P.mute:P.paper;
    const colOf=key=>{const a=C.c[key]||O.c[key],b=O.c[key]||C.c[key];return mix(kindCol(b[0]),kindCol(a[0]),same?1:e)};
    const topOf=key=>{const s=SL[key];return s.length>2?.12+s[3]:.4};
    // the input, then every plate or box in the design
    R.box([0,0,ZX],[1.3,.45,.45],{fill:P.paper});R.label([0,.45,ZX],'x · one input',{fs:12.5,b:1,dy:-10});
    Object.keys(SL).forEach(key=>{const a=aIn(key);if(a<=.01)return;const s=SL[key],d=C.c[key]||O.c[key],nm=C.c[key]?C.c[key][1]:O.c[key][1];
      if(s.length>2){R.glass([s[0]-s[2]/2,.12,s[1]],[s[2],0,0],[0,s[3],0],{c:colOf(key),a,nu:6,nv:4});if(s[1]===ZE)R.box([s[0],0,s[1]],[s[2]*.3,.12,.12],{a:a*.8,shadow:false})}
      else R.box([s[0],0,s[1]],[1.3,.32,.32],{fill:P.paper,a});
      const lt=O.c[key]&&C.c[key]&&O.c[key][1]!==C.c[key][1]&&!same;
      if(lt){const w=s[1]<ZE?1:0;R.label([s[0],topOf(key),s[1]],O.c[key][1],{fs:12.5,dy:-10,c:P.ink,a:fout(e),wide:w});R.label([s[0],topOf(key),s[1]],C.c[key][1],{fs:12.5,dy:-10,c:P.ink,a:fin(e),wide:w})}
      else R.label([s[0],topOf(key),s[1]],nm,{fs:12.5,dy:-10,c:d[0]==='e'?P.mute:P.ink,b:d[0]==='t',a,wide:s[1]<ZE?1:0})});
    // the loss
    R.box([0,0,ZL],[2.9,.38,.5],{fill:mix(P.paper,P.c5,.55)});
    const lab=(t0,t1,p,o)=>{if(same||t0===t1)R.label(p,t1,o);else{R.label(p,t0,Object.assign({},o,{a:fout(e)}));R.label(p,t1,Object.assign({},o,{a:fin(e)}))}};
    lab(O.loss,C.loss,[0,.38,ZL],{fs:12.5,b:1,dy:-11});
    lab(O.num,C.num,[0,.38,ZL-.5],{mono:true,fs:12,dy:-14,c:P.mute,wide:1});
    lab(O.L,C.L,[XL-1.05,0,ZA+.55],{fs:12.5,b:1,al:'right',c:P.ink});lab(O.R,C.R,[XR+1.05,0,ZA+.55],{fs:12.5,b:1,al:'left',c:P.ink});
    const sh=(C.share?1:0)*(same||O.share?1:fin(e))+(!same&&O.share&&!C.share?fout(e):0);
    if(sh>.01)R.label([0,.85,ZE],'same weights',{fs:12,c:P.c3,b:1,a:sh,dy:-4});
    // data forward: blue streams from x through each branch's parts to the loss
    const path=side=>{const ks=Object.keys(SL).filter(q=>q.endsWith(side)&&C.c[q]).sort((a,b)=>SL[b][1]-SL[a][1]),xs=side==='L'?XL:XR;
      const pts=[[0,.45,ZX-.2]];ks.forEach(q=>pts.push([xs,topOf(q)*.55,SL[q][1]]));pts.push([xs*.45,.4,ZL+.3]);return pts};
    const fa=same?1:fin(e);['L','R'].forEach(sd=>{const pts=path(sd),sm=[];for(let i=1;i<pts.length;i++)for(let u=0;u<=8;u++)sm.push(R.arcPt(pts[i-1],pts[i],.18,u/8));R.flow(sm,{c:P.c1,a:fa*.9,r:.085,speed:1.2})});
    // the gradient back from the loss: orange streams into every trained branch; a stop-gradient slab blocks the other
    [['L',C.gl],['R',C.gr]].forEach(([sd,g])=>{const xs=sd==='L'?XL:XR,ks=Object.keys(SL).filter(q=>q.endsWith(sd)&&C.c[q]&&C.c[q][0]==='t');
      if(g)ks.forEach(q=>R.flowArc([xs*.4,.42,ZL+.25],[xs,topOf(q)+.05,SL[q][1]],.5+.12*(ZE-SL[q][1]),{c:P.c2,a:fa*.95,r:.08,speed:1,n:6}));
      else if(C.sg)R.flowArc([xs*.4,.42,ZL+.25],[xs,.55,ZL+.95],.3,{c:P.c2,a:fa*.95,r:.08,speed:.8,n:4})});
    const sga=(C.sg?1:0)*(same||O.sg?1:fin(e))+(!same&&O.sg&&!C.sg?fout(e):0);
    if(sga>.01){R.box([XR,0,ZL+1.05],[1.5,.7,.07],{fill:mix(P.ink,P.bad,.25),a:sga*.85,shadow:false});R.label([XR+.85,.1,ZL+1.05],'stop-gradient',{fs:12.5,b:1,al:'left',c:P.bad,a:sga,wide:1})}
    // the EMA copy: purple dots carrying the trained encoder's weights into its slow copy
    const ea=(C.ema?1:0)*(same||O.ema?1:fin(e))+(!same&&O.ema&&!C.ema?fout(e):0);
    if(ea>.01){R.flowArc([XL+.4,1.15,ZE],[XR-.4,1.15,ZE],.45,{c:P.c4,a:ea,r:.08,speed:.7,n:7});lab(O.ema?'EMA · '+O.ema:'',C.ema?'EMA · '+C.ema:'',[0,1.6,ZE],{fs:12.5,b:1,c:P.c4,dy:-4})}
    // where the negatives come from: the rest of the batch, or a queue of past keys
    const qa=(C.neg==='queue'?1:0)*(same||O.neg==='queue'?1:fin(e))+(!same&&O.neg==='queue'&&C.neg!=='queue'?fout(e):0);
    if(qa>.01){for(let i=0;i<7;i++)R.glass([3.05,.12,ZE+.6-i*.2],[.8,0,0],[0,.62,0],{c:P.c6,a:qa*(.95-i*.09),nu:3,nv:3});R.label([3.45,.8,ZE+.6],'queue of past keys',{fs:12.5,b:1,c:P.c6,a:qa,dy:-8});
      R.flowArc([XR+.8,.6,ZE],[3.05,.5,ZE-.2],.2,{c:P.c6,a:qa*.8,r:.06,n:3,speed:.8});R.flowArc([3.45,.5,ZE-.8],[1.2,.4,ZL+.1],.35,{c:P.c6,a:qa*.85,r:.07,n:7,speed:.9})}
    const ba=(C.neg==='batch'?1:0)*(same||O.neg==='batch'?1:fin(e))+(!same&&O.neg==='batch'&&C.neg!=='batch'?fout(e):0);
    if(ba>.01){for(let i=0;i<6;i++)R.box([2.75+(i%3)*.34,0,ZL+.2-Math.floor(i/3)*.38],[.24,.24,.24],{fill:mix(P.paper,P.c2,.5),a:ba});R.label([3.1,.3,ZL-.2],'other views = negatives',{fs:12.5,b:1,dy:-18,c:P.c2,a:ba})}
  }
  S3.stage({id:'stg-ar',list:'sx-ar',fig:'Fig. 3 · two branches, six designs',cam:[.14,.66],bounds:[[-3.1,0,-3.7],[3.9,1.7,3.4]],aspect:.82,dur:1500,hold:5200,draw,
    margin:w=>w<520?[18,8,12,8]:[22,16,14,16]});
})();
