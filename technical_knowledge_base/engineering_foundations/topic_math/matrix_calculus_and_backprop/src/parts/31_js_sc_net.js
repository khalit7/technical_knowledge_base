// ---- Scenes: the two-layer network of section 5 forward and backward (renderer v2), used twice: the hero (Fig. 1, five steps) and section 5 (Fig. 5, twelve steps) ----
// The root page's Gradient lab network: x = (2, 1), W1 (3 x 2), ReLU, W2 (3 x 3), softmax cross-entropy on sat. Every bar is a value or gradient
// computed by MC2.two() (parts/22c_js_new.js, checked against PyTorch autograd by src/check_new.mjs). The chain runs left to right; values flow
// forward along the front row (green), gradients back along the row behind it (blue) through the same glass weight plates, and each weight's
// gradient rises as an outer-product bar field behind its plate, fed by the gradient arriving at the layer (blue) and the kept input (green).
(function(){
  if(!window.MCS||!window.MC2||(!document.getElementById('stg-net')&&!document.getElementById('stg-two')))return;
  const {at,off,mix}=S3,U=MCS,N=MC2.two();
  const XN=[-5.6,-2.6,-.3,2.7,4.15,5.45],PW1=-4.1,PW2=1.2,XR=-1.45,ZF=.75,ZB=-.75,ZW=-2.25,YP=.25,M=2.4,HM=.85;
  const FV=[N.x,N.a,N.h,N.z,N.p,[N.loss]],BV=[N.gx,N.ga,N.gh,N.gz,null,[1]];
  const FN=['x','a','h','z','p','L'],BN=['x̄','ā','h̄','z̄','','L̄'],SH=['2','3','3','3','3','1'];
  const WD=n=>n===1?.4:n===2?.75:1.05,KEPT=[1,1,1,0,1,0];
  const F1={cell:.42,m:Math.max(...N.gW1.flat().map(Math.abs)),hmax:1.05},F2={cell:.38,m:Math.max(...N.gW2.flat().map(Math.abs)),hmax:.85};
  const sc=k=>k===4?1:M; // p is drawn on its own scale (probabilities)
  const all=[0,1,2,3,4,5];
  // what each step shows: fw forward nodes known (0..fw-1), bw gradient nodes known, w1 w2 fields, ff forward flows [from,to], fb backward flows, act what is at full strength
  const TWO=[
    {fw:0,bw:[],ff:[],fb:[],act:['P1','P2','f0']},
    {fw:2,bw:[],ff:[[0,1]],fb:[],act:['f0','P1','f1']},
    {fw:3,bw:[],ff:[[1,2]],fb:[],act:['f1','f2','R']},
    {fw:4,bw:[],ff:[[2,3]],fb:[],act:['f2','P2','f3']},
    {fw:6,bw:[],ff:[[3,4],[4,5]],fb:[],act:['f3','f4','f5']},
    {fw:6,bw:[5,3],ff:[],fb:[[5,3]],act:['b5','b3','f4']},
    {fw:6,bw:[5,3],w2:1,ff:[],fb:[],out:['w2'],act:['b3','f2','w2']},
    {fw:6,bw:[5,3,2],w2:1,ff:[],fb:[[3,2]],act:['b3','P2','b2']},
    {fw:6,bw:[5,3,2,1],w2:1,ff:[],fb:[[2,1]],act:['b2','R','b1','f1']},
    {fw:6,bw:[5,3,2,1],w1:1,w2:1,ff:[],fb:[],out:['w1'],act:['b1','f0','w1']},
    {fw:6,bw:[5,3,2,1,0],w1:1,w2:1,ff:[],fb:[[1,0]],act:['b1','P1','b0']},
    {fw:6,bw:[5,3,2,1,0],w1:1,w2:1,ff:[],fb:[],upd:1,act:['f4','f5','w1','w2','P1','P2']}];
  const ffAll=[[0,1],[1,2],[2,3],[3,4],[4,5]],fbAll=[[5,3],[3,2],[2,1],[1,0]];
  const HERO=[
    {fw:6,bw:[],ff:ffAll,fb:[],kept:1,act:['f0','f1','f2','f3','f4','f5','P1','P2','R']},
    {fw:6,bw:[5,3],ff:[],fb:[[5,3]],act:['b5','b3','f4']},
    {fw:6,bw:[5,3,2,1,0],ff:[],fb:fbAll.slice(1),act:['b3','b2','b1','b0','P1','P2','R']},
    {fw:6,bw:[5,3,2,1,0],w1:1,w2:1,ff:[],fb:[],out:['w1','w2'],act:['w1','w2','b3','b1','f0','f2']},
    {fw:6,bw:[5,3,2,1,0],w1:1,w2:1,ff:ffAll,fb:fbAll,kept:1,act:['f0','f1','f2','f4','w1','w2','b0','b1','b2','b3','b5']}];
  // zr: the x range each step's camera shows (null: the whole chain); labels of parts outside it are not drawn, so none pile up at the canvas edge
  function scene(steps,nums,zr){
    return function(R,k,e){const P=R.P,s=steps[k],ps=k>0?steps[k-1]:null,Zk=zr&&zr[k],V=x=>!Zk||(x>=Zk[0]-.2&&x<=Zk[1]+.2);R.grid(-6.6,6.4,-3,1.7,.5);
      const A=key=>s.act.indexOf(key)>=0?1:.3,isNew=(arr,v)=>!ps||(Array.isArray(ps[arr])?ps[arr].indexOf(v)<0:!ps[arr]);
      // the two weight plates (the backward pass goes back through the same ones, transposed) and the ReLU gate
      [[PW1,'W1 · 3 × 2','P1',3,2],[PW2,'W2 · 3 × 3','P2',3,3]].forEach(([px,nm,key,nu,nv])=>{const a=A(key);
        R.glass([px,.08,ZB-.55],[0,0,ZF-ZB+1.1],[0,1.25,0],{c:P.c4,a:.35+.65*a,nu,nv});
        if(V(px))R.label([px,0,ZF+.8],nm,{mono:true,fs:12.5,b:a>.5,c:P.c4,a:Math.max(.55,a),dy:8})});
      R.box([XR,0,(ZF+ZB)/2],[.1,.6,ZF-ZB+.9],{fill:P.paper,fa:.35,a:.4+.6*A('R'),shadow:false});if(V(XR))R.label([XR,.72,ZF+.5],'ReLU',{mono:true,fs:12,c:P.mute,a:.5+.5*A('R')});
      if(V(3.4))R.label([3.42,0,ZF+.8],'softmax, −ln p_sat',{mono:true,fs:12,c:P.mute,wide:1,a:.4+.6*Math.max(A('f4'),A('f5'))});
      // forward row: empty slots for what is still to come, then the values
      all.forEach(i=>{const known=i<s.fw,a0=A('f'+i),fade=known&&isNew('fw',i)&&ps&&i>=ps.fw?e:1,vals=FV[i],n=vals.length;
        let v=vals;if(s.upd&&i===4)v=N.p_new;if(s.upd&&i===5)v=[N.loss_new];
        if(!known){U.comb(R,[XN[i],YP,ZF],new Array(n).fill(null),1,null,.5,HM,WD(n));}
        else U.comb(R,[XN[i],YP,ZF],v,sc(i),i===5?mix(P.paper,P.c3,.25):P.paper,a0*fade,HM,WD(n),{kept:(s.kept||nums)&&KEPT[i]});
        if(V(XN[i]))R.label([XN[i],0,ZF+.42],FN[i]+' · '+SH[i],{mono:true,fs:12.5,b:a0>.5&&known,c:known?P.ink:P.mute,a:known?Math.max(.5,a0):.45,dy:6})});
      // backward row
      all.forEach(i=>{if(i===4)return;const known=s.bw.indexOf(i)>=0,a0=A('b'+i),fade=known&&isNew('bw',i)?e:1,n=FV[i].length;
        if(!known){if(s.fw>=6)U.comb(R,[XN[i],YP,ZB],new Array(n).fill(null),1,null,.35,HM,WD(n));return}
        U.comb(R,[XN[i],YP,ZB],BV[i],M,P.acc,a0*fade,HM,WD(n));
        if(V(XN[i]))R.label([XN[i],0,ZB-.42],BN[i],{mono:true,fs:13,b:a0>.5,c:P.acc,a:Math.max(.5,a0),dy:-4})});
      // weight gradients: outer products, each shaped like its weight
      [['w1',PW1,N.gW1,F1,'W̄1 = ā xᵀ'],['w2',PW2,N.gW2,F2,'W̄2 = z̄ hᵀ']].forEach(([key,px,G,o,nm])=>{if(!s[key])return;const a0=A(key),g=isNew(key)?e:1;
        U.field(R,[px,0,ZW],G,Object.assign({a:a0,t:g},o));if(V(px))R.label([px,o.hmax+.25,ZW],nm,{mono:true,fs:12.5,b:a0>.5,c:P.acc,a:Math.max(.5,a0),dy:-6})});
      // flows: values forward (green), gradients back (blue); the outer products are fed by both
      const fl=(i,z)=>[XN[i],YP+.3,z];
      s.ff.forEach(([i,j])=>R.flow(U.path(fl(i,ZF),fl(j,ZF),16),{c:P.c3,a:s.ff.length>2?.75:Math.min(1,e*1.6),r:.07,speed:1.3}));
      s.fb.forEach(([i,j])=>R.flow(U.path(fl(i,ZB),fl(j,ZB),16),{c:P.acc,a:s.fb.length>2?.75:Math.min(1,e*1.6),r:.07,speed:1.3}));
      (s.out||[]).forEach(key=>{const px=key==='w1'?PW1:PW2,bi=key==='w1'?1:3,fi=key==='w1'?0:2,a=Math.min(1,e*1.6),tgt=[px,.55,ZW];
        R.flowArc([XN[bi],YP+.35,ZB],tgt,.45,{c:P.acc,a,r:.065,speed:1.2});R.flowArc([XN[fi],YP+.35,ZF],tgt,.7,{c:P.c3,a,r:.065,speed:1.2})});
      if(!nums)return;
      // section 5: the numbers of the step, on wide screens (the step list carries them on a phone)
      const lab=(i,z,t,c)=>R.label([XN[i],YP+1.15,z],t,{mono:true,fs:12.5,b:1,c,wide:1,a:e});
      if(k>=1&&k<=4){const i=k===4?4:k;lab(i,ZF,FN[i]+' = '+U.vec(FV[i]),P.ink);if(k===4)R.label([XN[5],YP+1.15,ZF],'L = '+U.f3(N.loss),{mono:true,fs:12.5,b:1,wide:1,a:e,dy:-18})}
      const bl={5:3,7:2,8:1,10:0}[k];if(bl!=null)lab(bl,ZB,BN[bl]+' = '+U.vec(BV[bl]),P.acc);
      if(k===8)R.label([XR,.25,ZB],'unit 3 blocked',{mono:true,fs:12,c:P.bad,b:1,wide:1,a:e,dy:-30});
      if(k===6)R.label([PW2+.75,.3,ZW],'third column 0 (h3 = 0)',{mono:true,fs:12,al:'left',c:P.acc,wide:1,a:e});
      if(k===9)R.label([PW1+.7,.3,ZW+.34],'unit 3’s row 0',{mono:true,fs:12,al:'left',c:P.acc,wide:1,a:e});
      if(k===11){R.label([XN[4],YP+1.15,ZF],'p_sat '+U.f3(N.p[2])+' → '+U.f3(N.p_new[2]),{mono:true,fs:12.5,b:1,c:P.c3,wide:1,a:e});
        R.label([XN[5],YP+1.15,ZF],'L '+U.f3(N.loss)+' → '+U.f3(N.loss_new),{mono:true,fs:12.5,b:1,c:P.c3,wide:1,a:e,dy:-20})}
    }}
  const full={cam:[-.5,.62],bounds:[[-6.3,0,-2.8],[6.1,1.1,1.3]]};
  const zoom=(x0,x1)=>({cam:[-.35,.6],bounds:[[x0,0,-2.8],[x1,1.1,1.3]]});
  const marg=w=>w<520?[14,8,10,8]:[18,14,14,14];
  if(document.getElementById('stg-net'))S3.stage({id:'stg-net',list:'sx-net',fig:'Fig. 1 · one forward pass, one backward pass',cam:full.cam,bounds:full.bounds,aspect:.5,margin:marg,dur:1500,hold:4600,draw:scene(HERO,false)});
  const Z=[null,[-6.3,-1.9],[-3.3,.4],[-1,3.4],[2,6],[2,6],[-1,3.4],[-1,3.4],[-3.3,.4],[-6.3,-1.9],[-6.3,-1.9],null];
  if(document.getElementById('stg-two'))S3.stage({id:'stg-two',list:'sx-two',fig:'Fig. 5 · the two-layer network, by hand',cam:full.cam,bounds:full.bounds,aspect:.52,margin:marg,dur:1500,hold:4800,draw:scene(TWO,true,Z),
    view:k=>Z[k]?zoom(Z[k][0],Z[k][1]):full});
})();
