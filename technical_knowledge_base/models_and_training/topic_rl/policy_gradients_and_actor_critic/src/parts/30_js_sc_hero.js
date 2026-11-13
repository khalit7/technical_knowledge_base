// ---- Scene (top, Fig. 1): one policy-gradient update on section 4's worked example (renderer v2: few large objects per step, flows, glass, camera per step).
// A softmax over three actions with rewards 1, 2 and 6 and every logit 0; the score of a sampled action; the weight without and with a baseline;
// the spread of single samples around the exact gradient; one step of eta = 0.5 against PPO's clip band. Every number comes from PGE (21_js_pg_engine.js). ----
(function(){
  const E=window.PGE;if(!E||!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const REW=[1,2,6],S=E.pgStats([0,0,0],REW),pi=S.pi,V=S.V,SA=0,ETA=.5,EPS=.2;
  const score=a=>pi.map((p,j)=>(j===a?1:0)-p),upd=(a,b)=>score(a).map(x=>(REW[a]-b)*x);
  const sampA=[0,1,2].map(a=>upd(a,0)),sampB=[0,1,2].map(a=>upd(a,V));
  const spread=s=>[0,1,2].map(j=>[Math.min(...s.map(u=>u[j])),Math.max(...s.map(u=>u[j]))]);
  const rA=spread(sampA),rB=spread(sampB),pi1=E.softmax(S.grad.map(g=>ETA*g));
  // the numbers the step list quotes (checked by src/checks/check_page.mjs)
  window.PG3=Object.assign(window.PG3||{},{hero:{pi,V,score:score(SA),u0:upd(SA,0),uB:upd(SA,V),grad:S.grad,var0:S.var0,varB:S.varB,pi1,ratio:pi1[2]/pi[2]}});
  const X=j=>(j-1)*1.9,ZP=-1.7,ZA=.45,ZB=2.05,YP=.95,SC=.5,HP=3.3,XW=-3.7,X0=XW-.55,X1=X(2)+.6;
  const sg=v=>(v<0?'−':'+')+Math.abs(v).toFixed(2);
  const yv=v=>v>=0?YP+v*SC:YP-.05+v*SC; // top (or bottom) of a signed bar
  // a row is a white shelf on two legs; each value a signed bar on it (positive stands, negative hangs below)
  function shelf(R,z,a){if(a<=.01)return;R.box([(X0+X1)/2,YP-.05,z],[X1-X0,.05,.62],{a,shadow:false});[X0+.06,X1-.06].forEach(x=>R.box([x,0,z],[.05,YP-.05,.05],{a:a*.9}))}
  function bar(R,x,z,v,col,a,w){if(a<=.01)return;const h=Math.max(.014,Math.abs(v)*SC);R.box([x,v>=0?YP:YP-.05-h,z],[w||.62,h,.34],{fill:col,a,shadow:false,lw:.8})}
  function row(R,z,vals,col,a,labs,lc){vals.forEach((v,j)=>{bar(R,X(j),z,v,col,a);if(labs)R.label([X(j),yv(v),z],sg(v),{mono:true,fs:12.5,dy:v>=0?-11:12,b:1,c:lc||R.P.ink,a})})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.4,3.8,-3,3.4,.5);
    const cA=mix(P.paper,P.c2,.75),cB=mix(P.paper,P.acc,.75);
    // 1. the policy: one white column per action, height = probability, its reward written on it; at the last step they move to the new policy
    const pk=k===5?pi.map((p,j)=>lerp(p,pi1[j],e)):pi,ca=k===4?.3:1;
    for(let j=0;j<3;j++){const hl=j===SA&&k>=1&&k<=3,last=j===2&&k===5;
      R.box([X(j),0,ZP],[1.05,pk[j]*HP,1.05],{fill:hl?mix(P.paper,P.c2,.5):last?mix(P.paper,P.acc,.45):P.paper,a:ca});
      R.label([X(j),pk[j]*HP,ZP],'π '+pk[j].toFixed(2),{mono:true,fs:12.5,dy:-12,b:hl||last,c:hl?P.c2:last?P.acc:P.ink,a:Math.max(.45,ca)});   // the action's name on a line above its probability, so the three columns' labels stay apart
      if(!nar)R.label([X(j),pk[j]*HP,ZP],'action '+(j+1),{mono:true,fs:12.5,dy:-27,b:hl||last,c:hl?P.c2:last?P.acc:P.ink,a:Math.max(.45,ca)});
      R.label([X(j),pk[j]*HP*.45,ZP+.53],'r = '+REW[j],{fs:13,b:1,c:hl?P.c2:P.mute,a:Math.max(.45,ca)})}
    // 2. the sampled action: a stream from action 1's column to the score row
    if(k===1){const t=Math.min(1,e*1.6);R.glow([X(SA),pi[SA]*HP+.05,ZP],.5,{c:P.c2,a:t*.8});
      R.flowArc([X(SA),pi[SA]*HP*.6,ZP+.5],[X(SA),YP+.4,ZA],.6,{c:P.c2,a:t,r:.08,speed:1.4})}
    // row A: the score (step 2), then the update without a baseline (step 3); it recedes once the baseline row is the subject
    const aA=k===0?0:k===1?e:k===2?1:k===3?.25:k===4?1:off(k,e,5)*.2;
    if(k>=1&&k<=3){shelf(R,ZA,aA);row(R,ZA,k===1?score(SA):upd(SA,0),k===1?mix(P.paper,P.c2,.45):cA,aA,k<=2,P.c2);
      R.label([X0,YP,ZA],k===1?'score e₁ − π':'no baseline',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c2,a:Math.max(.4,aA),grp:'rows'})}
    // the weight block at the left of a row, and its stream into the row
    if(k===2||k===3){const z=k===2?ZA:ZB,w=k===2?REW[SA]:REW[SA]-V,c=k===2?P.c2:P.acc,t=Math.min(1,e*1.5);
      if(k===3)shelf(R,ZB,t);bar(R,XW,z,w,k===2?cA:cB,t,.75);
      R.label([XW,yv(w),z],(k===2?'weight G = ':'weight G − V = ')+(w<0?'−':'')+Math.abs(w),{mono:true,fs:13,b:1,c,dy:w>=0?-12:13,a:t});
      for(let j=0;j<3;j++)R.flowArc([XW+.4,YP+.2,z],[X(j),YP+.25,z],.5+.12*j,{c,a:t*.9,r:.07,speed:1.5,n:8});
      if(k===3){row(R,ZB,upd(SA,V),cB,t,true,P.acc);R.label([X0,YP,ZB],'baseline b = V',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.acc,a:t,grp:'rows'})}}
    // 5. both rows over all three samples: the exact mean as solid bars, the scatter of single samples as glass
    if(k>=4){const a=k===4?Math.min(1,e*1.5):off(k,e,5)*.9;
      [[ZA,rA,cA,P.c2,S.var0,'no baseline'],[ZB,rB,cB,P.acc,S.varB,'baseline']].forEach(([z,rg,col,c,vr,lab])=>{shelf(R,z,a);
        row(R,z,S.grad,col,a,k===4&&z===ZB,c);
        rg.forEach(([lo,hi],j)=>{const y0=yv(Math.min(0,lo)),y1=yv(Math.max(0,hi));R.glass([X(j)-.42,y0,z+.24],[.84,0,0],[0,y1-y0,0],{c,a:a*.8,nu:1,nv:4})});
        R.label([X0,YP,z],lab+' · variance '+vr.toFixed(2),{al:'right',dx:-8,mono:true,fs:12.5,b:1,c,a,grp:'rows'})})}
    // 6. one step of eta = 0.5 along the exact gradient flows into the logits; PPO's clip band sits on action 3 as two glass plates
    if(k===5){for(let j=0;j<3;j++)R.flowArc([X(j),YP+.4,ZB],[X(j),pk[j]*HP*.5,ZP+.55],1,{c:P.acc,a:(.25+.75*Math.min(1,Math.abs(S.grad[j])))*(1-e*.6),r:.08,speed:1.6,n:9});
      const p3=pi[2]*HP;[[1-EPS,'1 − ε'],[1+EPS,'1 + ε']].forEach(([m,l])=>{R.glass([X(2)-.85,p3*m,ZP-.85],[1.7,0,0],[0,0,1.7],{c:P.c5,a:e,nu:3,nv:3});
        R.label([X(2)+.85,p3*m,ZP+.85],l,{al:'left',dx:6,mono:true,fs:12.5,c:P.c5,b:1,a:e})});
      R.label([X(2),pk[2]*HP,ZP],'ratio '+(pk[2]/pi[2]).toFixed(2),{mono:true,fs:12.5,dy:nar?-30:-45,b:1,c:P.acc,a:e})}
  }
  const full={cam:[-.2,.62],bounds:[[-4.4,0,-2.4],[2.6,2.1,2.5]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one update of a softmax policy',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[22,16,14,150],
    // step 2 moves in close on the sampled action; the last step on the policy and its clip band
    view:k=>k===0?{cam:[-.2,.55],bounds:[[-2.7,0,-2.4],[2.7,1.6,-.6]]}:k===1?{cam:[-.25,.55],bounds:[[-3,0,-2.4],[1.2,1.9,1]]}:k===5?{cam:[-.2,.4],bounds:[[-2.8,0,-2.7],[2.9,2.3,-.5]]}:full});
})();
