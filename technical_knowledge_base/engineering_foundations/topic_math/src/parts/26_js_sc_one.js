// ---- Hero stage (Fig. 1, renderer v2): one training step of the tiny model, forward along the front row, backward along the row behind,
// with each child page's concept pinned where it acts. Every value comes from RDM (22_js_rd_one.js): x = (2, 1), W rows cat (1, 0), dog (0, 1),
// sat (1, -2), the truth sat; one gradient step at learning rate 0.1. The statistics step uses the page's own example (spread 0.5 nats per
// sentence, 100 sentences, a 0.1-nat gain; its error bar is 1.96 x 0.5 / sqrt(100)). Colours: one per area, as in the step list.
(function(){
  if(!document.getElementById('stg-one')||!window.RDM)return;const {at,off,lerp,mix}=S3,M=RDM;
  const s0=M.step(M.W,0.1),s1=M.step(s0.W2,0),lam=M.lmax(s0.p),L0=s0.L,L1=s1.L,LN3=Math.log(3);
  const SE=1.96*0.5/Math.sqrt(100),GAIN=0.1;
  const XX=-4.9,PW=-3.25,XZ=-1.45,XP=.65,XL=2.55,XS=4.45,ZF=.75,ZB=-.75,ZW=-2.15,YP=.22,HM=1.2,LS=.6;
  const f3=v=>M.f(v,3);
  // a vector as signed bars on a white plinth (positive up, negative hanging below), the every-joule look
  function comb(R,c,vals,m,col,a,wd,hl){if(a<=.01)return;const P=R.P,nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.14,.045,.36],{a,shadow:false});
    if(c[1]>.12)[-1,1].forEach(sx=>R.box([c[0]+sx*(wd/2),0,c[2]],[.03,c[1]-.05,.03],{a:a*.9}));
    vals.forEach((v,i)=>{const hgt=Math.max(.014,Math.abs(v)/m*HM),bx=c[0]-wd/2+bw*(i+.5),cc=hl!=null&&i!==hl?mix(P.paper,col,.35):col;
      R.box([bx,v>=0?c[1]:c[1]-.045-hgt,c[2]],[bw*.68,hgt,.13],{fill:cc,a,shadow:false,lw:.7})})}
  // a matrix as a bar field on the floor: rows (cat, dog, sat) front to back, columns along x
  function field(R,c,G,m,col,a,t){if(a<=.01)return;const P=R.P,s=.44;
    R.box([c[0],0,c[2]],[2*s+.16,.03,3*s+.16],{a:a*.8,shadow:false,lw:.6});
    G.forEach((r,i)=>r.forEach((v,j)=>{const x=c[0]+(j-.5)*s,z=c[2]+(i-1)*s,h=Math.max(.014,Math.abs(v)/m*1.0*t);
      R.box([x,.03,z],[s*.66,h,s*.66],{fill:v>=0?col:mix(P.paper,col,.4),a,shadow:false,lw:.7})}))}
  const path=(a,b,k)=>{const o=[];k=k||14;for(let i=0;i<=k;i++){const t=i/k;o.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t])}return o};
  // which parts are at full strength on each step; the rest recede
  // labels are drawn only for the parts a step is about, so receded parts never crowd the picture
  const ACT=[['x','W'],['x','W','z'],['z','p'],['p','L'],['L','g'],['g','x','gW'],['gW','W','p','L'],['L','S'],['F']];
  function draw(R,k,e){const P=R.P,A=n=>k===8?.55:ACT[k].indexOf(n)>=0?1:.24,on=n=>k<8&&ACT[k].indexOf(n)>=0,C={la:P.c1,pr:P.c2,it:P.c4,ca:P.c3,op:P.c5,st:P.c6};
    R.grid(-6.2,6,-3.2,2,.5);
    // 9. floating point: one glass slab under every box
    if(k===8){const a=Math.min(1,e*1.5);R.glass([-6,.012,-2.9],[11.8,0,0],[0,0,4.3],{c:P.mute,a:a*.45,nu:24,nv:8,th:.02});
      R.label([0,0,1.75],'float32 under every box: e^z overflows past z = 88.72',{mono:true,fs:12.5,b:1,c:P.ink,a,dy:14,wide:1})}
    // 1. the input x and the weight matrix W (a glass plate that both passes go through)
    const ax=A('x');comb(R,[XX,YP,ZF],M.x,2.2,C.la,ax,.62);if(on('x'))R.label([XX,0,ZF+.45],'x = (2, 1)',{mono:true,fs:12.5,b:ax>.5,c:C.la,a:Math.max(.5,ax),dy:6});
    const aw=A('W');R.glass([PW,.08,ZB-.5],[0,0,ZF-ZB+1],[0,1.2,0],{c:C.la,a:.3+.7*aw,nu:3,nv:2});
    if(on('W'))R.label(k===6?[PW,1.32,ZF+.5]:[PW,1.32,ZB-.5],k===6?'W ← W − 0.1 ∇W':'W · 3 × 2',{mono:true,fs:12.5,b:aw>.5,c:C.la,a:Math.max(.5,aw),dy:-6});
    if(k===0)R.flow(path([XX,YP+.3,ZF],[PW,YP+.3,ZF]),{c:C.la,a:Math.min(1,e*1.6),r:.07,speed:1.2});
    // 2. scores z = Wx
    const az=A('z'),zt=at(k,e,1);if(zt>0){comb(R,[XZ,YP,ZF],s0.z,2.2,C.la,az*zt,1.05);if(on('z'))R.label([XZ,0,ZF+.45],'z = Wx = (2, 1, 0)',{mono:true,fs:12.5,b:az>.5,c:C.la,a:Math.max(.5,az)*zt,dy:6})}
    if(k===1)R.flow(path([PW,YP+.3,ZF],[XZ,YP+.3,ZF]),{c:C.la,a:Math.min(1,e*1.6),r:.07,speed:1.2});
    // 3. the bet p = softmax(z); sat, the truth, keeps its full colour
    const ap=A('p'),pt=at(k,e,2);if(pt>0){const pv=k===6?s0.p.map((v,i)=>lerp(v,s1.p[i],e)):k>6?s1.p:s0.p;
      comb(R,[XP,YP,ZF],pv,1,C.pr,ap*pt,1.05,k>=3?2:null);
      if(on('p'))R.label([XP,0,ZF+.45],k>=6?'p(sat) '+f3(s0.p[2])+' → '+f3(s1.p[2]):'p = '+M.vec(s0.p),{mono:true,fs:12.5,b:ap>.5,c:C.pr,a:Math.max(.5,ap)*pt,dy:6});
      if(k===2||k===3)['cat','dog','sat'].forEach((w,i)=>R.label([XP-1.05/2+1.05/3*(i+.5),YP+pv[i]*HM+.05,ZF],w,{fs:12,serif:true,c:i===2?C.pr:P.mute,b:i===2,a:ap*pt,dy:-9,wide:1}))}
    if(k===2)R.flow(path([XZ,YP+.3,ZF],[XP,YP+.3,ZF]),{c:C.pr,a:Math.min(1,e*1.6),r:.07,speed:1.2});
    // 4. the price: L = -ln p(sat) in nats, against the uniform guess ln 3
    const al=A('L'),lt=at(k,e,3);if(lt>0){const Lv=k===6?lerp(L0,L1,e):k>6?L1:L0;
      R.box([XL,0,ZF],[.7,Lv*LS*lt,.6],{fill:mix(P.paper,C.it,.75),a:al});
      R.quad([[XL-.5,LN3*LS,ZF-.4],[XL+.5,LN3*LS,ZF-.4],[XL+.5,LN3*LS,ZF+.4],[XL-.5,LN3*LS,ZF+.4]],{fill:C.it,a:al*.22*lt});
      if(k===3)R.label([XL+.55,LN3*LS,ZF],'uniform guess ln 3 = '+f3(LN3),{mono:true,fs:12,al:'left',c:P.mute,a:al*lt,wide:1});
      if(on('L')){const nr=R.W<520;R.label([XL+(nr?-.36:.36),Lv*LS*lt,ZF+.3],'L = '+f3(Lv)+' nats',{mono:true,fs:12.5,al:nr?'right':'left',b:al>.5,c:C.it,a:Math.max(.5,al)*lt,dx:nr?-8:8})}
      if(k===3){R.label([XL,0,ZF+.45],'= '+f3(L0/Math.LN2)+' bits',{mono:true,fs:12,c:C.it,a:e,dy:6,wide:1});
        R.flowArc([XP+.27,YP+s0.p[2]*HM+.1,ZF],[XL,L0*LS*.6,ZF],.4,{c:C.it,a:Math.min(1,e*1.6),r:.07,speed:1.2})}}
    // 5. backward: the gradient on the scores, p - y, along the back row
    const ag=A('g'),gt=at(k,e,4);if(gt>0){comb(R,[XZ,YP,ZB],s0.g,1,C.ca,ag*gt,1.05);
      if(on('g'))R.label([XZ+.62,YP+.35,ZB],'z̄ = p − y = '+M.vec(s0.g),{mono:true,fs:12.5,al:'left',b:ag>.5,c:C.ca,a:Math.max(.5,ag)*gt,dx:6,wide:1});
      if(k===4)R.flow(path([XL,.6,ZF-.2],[XL,.6,ZB]).concat(path([XL,.6,ZB],[XZ+.5,YP+.35,ZB]).slice(1)),{c:C.ca,a:Math.min(1,e*1.6),r:.07,speed:1.2})}
    // 6. the weight gradient: an outer product (p - y) x^T, rank 1, shaped like W
    const aG=A('gW'),Gt=at(k,e,5);if(Gt>0){field(R,[PW,0,ZW],s0.gW,1.9,C.ca,aG,k===5?e:1);
      if(on('gW')&&k!==6)R.label([PW,1.15,ZW],'∇W = (p − y) xᵀ',{mono:true,fs:12.5,b:aG>.5,c:C.ca,a:Math.max(.5,aG),dy:-6});
      if(k===5){const tg=[PW,.6,ZW],a=Math.min(1,e*1.6);R.flowArc([XZ,YP+.35,ZB],tg,.45,{c:C.ca,a,r:.065,speed:1.2});R.flowArc([XX,YP+.35,ZF],tg,.8,{c:C.la,a,r:.065,speed:1.2})}}
    // 7. the step: the gradient flows into W, then the forward pass reruns
    if(k===6){const a=Math.min(1,e*1.6);R.flow(path([PW,.7,ZW+.5],[PW,.7,ZB-.4]),{c:C.op,a,r:.075,speed:1.2});
      R.flow(path([PW,YP+.3,ZF+.05],[XL,YP+.3,ZF+.05],24),{c:C.op,a:a*.8,r:.06,speed:1.5});
      R.label([PW,0,ZF+.95],'η = 0.1 < 2/λmax = 2/'+f3(lam)+' = '+M.f(2/lam,2),{mono:true,fs:12.5,b:1,c:C.op,a,dy:12,wide:1})}
    // 8. was it real? the average change on held-out sentences with its 95% error bar (the page's example: s = 0.5, n = 100)
    const as=A('S'),st=at(k,e,7);if(st>0){const sc=8,h=GAIN*sc*st;R.box([XS,0,ZF],[.5,h,.42],{fill:mix(P.paper,C.st,.7),a:as,fa:.45});
      const w0=Math.max(0,(GAIN-SE)*sc)*st,w1=(GAIN+SE)*sc*st;const zf=ZF+.32;R.line([[XS,w0,zf],[XS,w1,zf]],{c:C.st,w:2.4,a:as,dz:-50});
      [w0,w1].forEach(y=>R.line([[XS-.2,y,zf],[XS+.2,y,zf]],{c:C.st,w:2.4,a:as,dz:-50}));
      if(on('S'))R.label([XS,w1,ZF],'held-out gain 0.1 ± '+f3(SE),{mono:true,fs:12.5,b:as>.5,c:C.st,a:Math.max(.5,as)*st,dy:-12});
      if(on('S'))R.label([XS,0,ZF+.45],'± 1.96 · 0.5 / √100',{mono:true,fs:12,c:C.st,a:as*st,dy:6,wide:1});
      if(k===7)R.flowArc([XL,L1*LS,ZF],[XS,h+.1,ZF],.5,{c:C.st,a:Math.min(1,e*1.6),r:.06,speed:1.1})}
  }
  const full={cam:[-.5,.74],bounds:[[-5.5,0,-2.7],[5.1,1.7,1.4]]};
  const zoom=(x0,x1,ph,z0)=>({cam:[-.46,ph||.7],bounds:[[x0,0,z0||-2.7],[x1,1.7,1.4]]});
  const V=[zoom(-5.6,-2.2,.72,-1.4),zoom(-5.6,-.6,.72,-1.4),zoom(-2.4,1.6,.72,-.6),zoom(-.4,3.6,.72,-.6),zoom(-4.6,3.3,.76,-1.0),zoom(-5.6,-.6,.8),full,zoom(1.6,5.2,.72,-.6),full];
  S3.stage({id:'stg-one',list:'sx-one',fig:'Fig. 1 · one training step of the tiny model',cam:full.cam,bounds:full.bounds,aspect:.56,
    margin:w=>w<520?[14,8,12,8]:[20,16,16,16],dur:1500,hold:5200,draw,
    view:k=>{const v=V[k]||full;return innerWidth<520?{cam:[v.cam[0],v.cam[1]+.25],bounds:v.bounds}:v}}); // on a phone the camera looks down more, so the long scene uses the card's height
})();
