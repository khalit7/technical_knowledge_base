// ---- Scene (section 9): NoisyNet's noise for one layer with p = 6 inputs and q = 4 outputs, factorised (p + q draws) then independent (pq + q) ----
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
  const HS=.42,X=i=>-2+i*.8,Z=j=>-1.2+j*.8,ZI=-2.25,XO=-3.25,XB=3.35;
  const tint=(P,v)=>mix(P.paper,v>=0?P.c1:P.c2,.25+.55*Math.min(1,Math.abs(v)/2));
  function bar(R,x,z,v,o){const h=v*HS;R.box([x,Math.min(0,h),z],[o.w||.5,Math.max(.03,Math.abs(h)),o.w||.5],o)}
  const n1=v=>(v<0?'−':'')+Math.abs(v).toFixed(1);
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-3.8,4,-2.8,1.9,.4);
    const ind=k===4?e:0,fadeIO=k===4?lerp(1,.15,e):1;
    // input and output draws
    const s0=at(k,e,0);N.ei.forEach((v,i)=>{bar(R,X(i),ZI,v*s0,{fill:tint(P,v),a:fadeIO,w:.42,ec:P.acc,lw:1.4});
      R.label([X(i),Math.max(0,v*HS*s0),ZI],n1(v),{fs:12,mono:1,dy:-10,a:s0*fadeIO,wide:1})});
    R.label([X(0)-.4,0,ZI],ph?'ε inputs':'εᵢ: 6 input draws',{fs:12.5,b:1,al:'right',dx:-6,c:P.acc,a:s0*fadeIO});
    const s1=at(k,e,1);if(s1>0){N.ej.forEach((v,j)=>{bar(R,XO,Z(j),v*s1,{fill:tint(P,v),a:fadeIO,w:.42,ec:P.acc,lw:1.4});
      R.label([XO-.25,Math.max(0,v*HS*s1),Z(j)],n1(v),{fs:12,mono:1,al:'right',dx:-6,a:s1*fadeIO,grp:'oj'})});
      R.label([XO,0,Z(q-1)+.4],ph?'ε outputs':'εⱼ: 4 output draws',{fs:12.5,b:1,dy:14,c:P.acc,a:s1*fadeIO})}
    // the weight noise: rank one when factorised, then independent
    const s2=k<2?0:k===2?e:1;
    if(s2>0)for(let j=0;j<q;j++)for(let i=0;i<p;i++){const g=Math.max(0,Math.min(1,s2*1.6-j*.2)),v=lerp(N.W[j][i],N.WI[j][i],ind)*g;bar(R,X(i),Z(j),v,{fill:tint(P,v)})}
    if(k>=2)R.label([X(2.5),0,Z(q-1)+.85],k===4?'weight noise, independent':'weight noise f(εᵢ) f(εⱼ)',{fs:12.5,b:1,dy:16,a:k===2?e:1,wide:1});
    // the bias noise
    const s3=at(k,e,3);if(s3>0){N.B.forEach((b,j)=>{const v=lerp(b,N.BI[j],ind)*s3;bar(R,XB,Z(j),v,{fill:tint(P,v),w:.42})});
      R.label([XB,0,Z(q-1)+.4],'bias',{fs:12.5,b:1,dy:14,a:s3})}
    // counts
    const cnt=k<1?'':k<4?'10 random numbers (p + q)':'28 random numbers (pq + q)';
    if(cnt)R.label(ph?[X(2.5),0,Z(q-1)+.85]:[X(5)+.4,0,ZI],cnt,{fs:13,b:1,al:ph?'center':'left',dx:ph?0:10,dy:ph?16:0,c:k<4?P.acc:P.c2,a:k===1?e:k===4?e:1});
  }
  const st=S3.stage({id:'stg-nz',list:'sx-nz',fig:'§9 · factorised noise for a 6-input, 4-output layer',cam:[-.35,.62],aspect:.62,
    bounds:[[-3.9,-1,-2.6],[3.8,1.2,2.2]],draw,dur:1300,hold:4400});
  const btn=document.getElementById('vb-nzR');
  if(st&&btn)btn.addEventListener('click',()=>{seed++;N=noise();st.st.user=true;st.pause();st.draw()});
  if(st)st.draw();
})();
