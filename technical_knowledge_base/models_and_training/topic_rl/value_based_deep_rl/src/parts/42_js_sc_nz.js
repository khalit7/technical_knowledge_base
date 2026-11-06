// ---- Scene (section 9): NoisyNet's noise for one layer with p = 6 inputs and q = 4 outputs, factorised (p + q draws) then independent (pq + q) (renderer v2: glass weight plate, flows, camera per step) ----
// Noise values are illustrative draws from a seeded generator (the same generator and seed as the 2026-10-24 2D figure); the counts are exact:
// window.VB3.nz holds them for src/checks/check_stages.mjs, with DQN's 512-unit layer on 3,136 inputs (3,648 against 1,606,144 draws).
(function(){
  const p=6,q=4;
  window.VB3=window.VB3||{};window.VB3.nz={p,q,fac:p+q,ind:p*q+q,dqnFac:3136+512,dqnInd:3136*512+512};
  if(!document.getElementById('stg-nz')||!window.S3)return;const {at,mix,lerp}=S3;
  const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const f=x=>Math.sign(x)*Math.sqrt(Math.abs(x));
  let seed=7,N=null;
  function noise(){const r=rng(seed),g=()=>{const u=Math.max(1e-9,r()),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
    const ei=Array.from({length:p},g),ej=Array.from({length:q},g),r2=rng(seed+1000),g2=()=>{const u=Math.max(1e-9,r2()),v=r2();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
    return {ei,ej,W:ej.map(b=>ei.map(a=>f(a)*f(b))),B:ej.map(f),WI:ej.map(()=>ei.map(g2)),BI:ej.map(g2)}}
  N=noise();
  const HS=.36,YF=1.0,X=i=>-2+i*.8,Z=j=>-1.2+j*.8,ZI=-2.3,XO=-3.3,XB=3.35;
  const tint=(P,v)=>mix(P.paper,v>=0?P.c1:P.c2,.25+.55*Math.min(1,Math.abs(v)/2));
  // a signed bar on a raised plate: positive stands on it, negative hangs below
  function bar(R,x,z,v,o){const h=Math.max(.02,Math.abs(v)*HS);R.box([x,v>=0?YF:YF-.04-h,z],[o.w||.46,h,o.w||.46],Object.assign({shadow:false,lw:.8},o))}
  // a white shelf on two legs (the draws' rows and the bias column)
  function shelf(R,c,s,a){if(a<=.01)return;R.box([c[0],YF-.04,c[2]],[s[0],.04,s[2]],{a,shadow:false});
    const L=s[0]>s[2]?[[c[0]-s[0]/2+.06,c[2]],[c[0]+s[0]/2-.06,c[2]]]:[[c[0],c[2]-s[2]/2+.06],[c[0],c[2]+s[2]/2-.06]];L.forEach(([x,z])=>R.box([x,0,z],[.04,YF-.04,.04],{a:a*.9}))}
  const n1=v=>(v<0?'−':'')+Math.abs(v).toFixed(1);
  function draw(R,k,e){const P=R.P,ph=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4,4.2,-3,2.2,.5);
    const ind=k===4?e:0,io=k===4?lerp(1,.15,e):k>=2?.55:1;
    // the input draws: six unit Gaussians on a shelf along the input edge
    const s0=at(k,e,0),ai=(k===0?1:io);shelf(R,[X(2.5),0,ZI],[4.6,0,.5],s0*ai);
    N.ei.forEach((v,i)=>{bar(R,X(i),ZI,v*s0,{fill:tint(P,v),a:ai,w:.4,ec:P.acc,lw:1.3});
      if(k<=1)R.label([X(i),YF+(v>=0?v*HS*s0:-.04-Math.abs(v)*HS*s0),ZI],n1(v),{fs:12,mono:1,dy:v>=0?-10:12,a:s0})});
    R.label([X(0)-.4,YF,ZI],ph?'εᵢ':'εᵢ: 6 input draws',{fs:12.5,b:1,al:'right',dx:-6,c:P.acc,a:s0*Math.max(ai,.5)});
    // the output draws: four more on a shelf along the output edge
    const s1=at(k,e,1),ao=(k===1?1:io);if(s1>0){shelf(R,[XO,0,Z(1.5)],[.5,0,3.0],s1*ao);
      N.ej.forEach((v,j)=>{bar(R,XO,Z(j),v*s1,{fill:tint(P,v),a:ao,w:.4,ec:P.acc,lw:1.3});
        if(k===1)R.label([XO-.25,YF+(v>=0?v*HS*s1:0),Z(j)],n1(v),{fs:12,mono:1,al:'right',dx:-6,a:s1})});
      R.label([XO,0,Z(q-1)+.35],ph?'εⱼ':'εⱼ: 4 output draws',{fs:12.5,b:1,dy:14,c:P.acc,a:s1*Math.max(ao,.5)})}
    // the weight matrix as a glass plate; its noise f(εᵢ) f(εⱼ) as signed bars on it, rank one when factorised, then independent
    const s2=k<2?0:k===2?e:1;
    if(s2>0){R.glass([X(0)-.4,YF-.02,Z(0)-.4],[p*.8,0,0],[0,0,q*.8],{c:P.mute,a:Math.min(1,s2*1.5),nu:p,nv:q,th:.03});
      [[X(0)-.36,Z(0)-.36],[X(p-1)+.36,Z(0)-.36],[X(0)-.36,Z(q-1)+.36],[X(p-1)+.36,Z(q-1)+.36]].forEach(([x,z])=>R.box([x,0,z],[.04,YF-.04,.04],{a:s2*.8}));
      // the draws stream into the plate: each input along its column, each output along its row (their product is where they cross)
      if(k===2){N.ei.forEach((v,i)=>R.flow([[X(i),YF+.25,ZI+.2],[X(i),YF+.85,Z(0)-.3],[X(i),YF+.85,Z(q-1)+.3]],{c:P.acc,a:fa*(.35+.65*Math.min(1,Math.abs(v)/1.5)),r:.065,speed:1.2,n:7}));
        N.ej.forEach((v,j)=>R.flow([[XO+.2,YF+.25,Z(j)],[X(0)-.5,YF+.85,Z(j)],[X(p-1)+.3,YF+.85,Z(j)]],{c:P.c2,a:fa*(.35+.65*Math.min(1,Math.abs(v)/1.5)),r:.065,speed:1.2,n:9}))}
      for(let j=0;j<q;j++)for(let i=0;i<p;i++){const g=Math.max(0,Math.min(1,s2*1.6-j*.2)),v=lerp(N.W[j][i],N.WI[j][i],ind)*g;bar(R,X(i),Z(j),v,{fill:tint(P,v),w:.38})}
      R.label([X(2.5),0,Z(q-1)+.45],k===4?'weight noise, independent':'weight noise f(εᵢ) f(εⱼ)',{fs:12.5,b:1,dy:16,a:k===2?e:1,c:P.ink})}
    // the bias noise: one per output, f(εⱼ), streamed along each output's row
    const s3=at(k,e,3);if(s3>0){shelf(R,[XB,0,Z(1.5)],[.5,0,3.0],s3);
      if(k===3)N.ej.forEach((v,j)=>R.flow([[X(p-1)+.4,YF+.12,Z(j)],[XB-.2,YF+.12,Z(j)]],{c:P.c2,a:fa*.9,r:.05,speed:1,n:3}));
      N.B.forEach((b,j)=>{const v=lerp(b,N.BI[j],ind)*s3;bar(R,XB,Z(j),v,{fill:tint(P,v),w:.4})});
      R.label([XB,0,Z(q-1)+.35],'bias',{fs:12.5,b:1,dy:14,a:s3})}
    // the count of random numbers
    const cnt=k<1?'':k<4?'10 random numbers (p + q)':'28 random numbers (pq + q)';
    if(cnt)R.label(ph?(k>=2?[X(2.5),0,Z(q-1)+.45]:[XO,0,Z(q-1)+.35]):[X(p-1)+.5,YF,ZI],cnt,{fs:13,b:1,al:ph?'center':'left',dx:ph?0:12,dy:ph?34:0,c:k<4?P.acc:P.c2,a:k===1||k===4?e:1});
  }
  const full={cam:[-.35,.66],bounds:[[-3.9,0,-2.7],[3.8,1.9,2.2]]};
  // the draws are seen up close (inputs, then outputs); the field and the bias column in the full view
  const V0=[{cam:[-.25,.55],bounds:[[-2.8,0,-2.7],[2.8,1.8,-1.6]]},{cam:[-1.05,.5],bounds:[[-3.8,0,-2.7],[2.4,2.1,1.6]]}];
  const st=S3.stage({id:'stg-nz',list:'sx-nz',fig:'§9 · factorised noise for a 6-input, 4-output layer',cam:full.cam,bounds:full.bounds,aspect:.62,draw,dur:1500,hold:4600,
    margin:w=>w<520?[16,10,14,10]:[20,16,16,16],view:k=>V0[k]||full});
  const btn=document.getElementById('vb-nzR');
  if(st&&btn)btn.addEventListener('click',()=>{seed++;N=noise();st.st.user=true;st.pause();st.draw()});
})();
