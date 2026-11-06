// ---- Scene: Fig. 3, one real training batch as a bar field (renderer v2). Data: EMB.batch, from the parent's src/vec/out/contrastive.json:
// 8 SciFact train claims (seed 0), bge-small cosines claim x labelled abstract (8 x 8), and each claim's own dense-mined hard negative.
// Probabilities are each row's softmax at tau = 0.05 (scale 20), over the 8 positives, then over 8 + its own hard negative (the parent's construction).
// Steps: one pair; the 64 cosines; softmax per row; + hard negatives; row 1's hard negative, a likely false negative. ----
(function(){
  if(!document.getElementById('stg-bt')||!window.EMB||!EMB.batch)return;const {at,off,lerp,mix}=S3;
  const B=EMB.batch,C=B.cos,Hc=B.hard.map(h=>h.cos),n=C.length;
  const sm=r=>{const m=Math.max(...r),e=r.map(x=>Math.exp(20*(x-m))),z=e.reduce((a,b)=>a+b,0);return e.map(x=>x/z)};
  const P8=C.map(sm),P9=C.map((r,i)=>sm(r.concat([Hc[i]])));
  const x=j=>-2.45+.7*j,XH=3.6,z=i=>-1.75+.5*i,HC=1.5,HP=1.5,cut=(s,m)=>s.length>m?s.slice(0,m-1)+'…':s;
  function draw(R,k,e){const P=R.P;R.grid(-3,4.3,-2.3,2.4,.5);
    for(let i=0;i<n;i++){
      const rowA=k===0?(i===0?1:0):k===4?(i===0?1:.22):1;
      for(let j=0;j<n;j++){const d=i===j;let a=rowA*(k===0&&!d?0:1);if(a<=.01)continue;
        // height: cosine (steps 1-2), then softmax over 8 (3), then over 9 (4-5)
        const hc=C[i][j]*HC,h8=P8[i][j]*HP,h9=P9[i][j]*HP;
        const h=k<=1?hc:k===2?lerp(hc,h8,e):k===3?lerp(h8,h9,e):h9;
        R.box([x(j),0,z(i)],[.42,Math.max(.012,h),.3],{fill:d?P.good:mix(P.paper,P.c1,.22),a,shadow:false,lw:.7});
        if(d&&k>=2&&rowA>.5)R.label([x(j),h,z(i)],Math.round(100*(k===2?lerp(C[i][j],P8[i][j],e):k===3?lerp(P8[i][j],P9[i][j],e):P9[i][j]))+'%',{fs:12,mono:true,b:1,c:P.good,dy:-10,wide:1,a:k===2?e:1})}
      // each row's own hard negative (steps 4-5)
      if(k>=3){const a=(k===3?e:1)*(k===4&&i>0?.22:1),h=lerp(Hc[i]*HC,P9[i][n]*HP,k===3?e:1);
        R.box([XH,0,z(i)],[.42,Math.max(.012,h),.3],{fill:P.bad,a,shadow:false,lw:.7});
        if(k===3&&P9[i][n]>.02)R.flowArc([x(i),P9[i][i]*HP*e+.05,z(i)],[XH,h+.05,z(i)],.25,{c:P.bad,a:e*.8,r:.035+.04*P9[i][n],n:Math.max(1,Math.round(1+6*P9[i][n])),speed:1.2})}
      // row labels: the claims
      R.label([-2.9,0,z(i)],cut(B.claims[i],30),{fs:12,al:'right',dx:-6,grp:'row',c:i===0&&(k===0||k===4)?P.ink:P.mute,b:i===0&&(k===0||k===4),a:k===0&&i>0?0:rowA<.5?.55:1})}
    // the one pair: the claim streams to its labelled abstract
    if(k===0)R.flowArc([-2.9,.15,z(0)],[x(0),C[0][0]*HC*e,z(0)],.5,{c:P.good,a:e,r:.06,speed:1.2});
    if(k===0)R.label([x(0),C[0][0]*HC,z(0)],'cos '+C[0][0].toFixed(3),{fs:13,b:1,mono:true,c:P.good,dy:-12,a:e});
    // column heads
    if(k>=1)for(let j=0;j<n;j++)R.label([x(j),0,2.15],'d'+(j+1)+'⁺',{fs:12,mono:true,c:P.mute,dy:10,a:k===1?e:1});
    if(k>=3)R.label([XH,0,2.15],'own hard neg.',{fs:12,mono:true,c:P.bad,dy:10,a:k===3?e:1});
    // row 1's hard negative: likely relevant, not wrong
    if(k===4){const h=P9[0][n]*HP;R.glow([XH,h,z(0)],.5,{c:P.bad,a:e});R.label([XH,h,z(0)],cut(B.hard[0].title,40),{fs:12.5,b:1,c:P.bad,dy:-16,al:'right',dx:10,a:e,wide:1})}
  }
  S3.stage({id:'stg-bt',list:'sx-bt',fig:'Fig. 3 · a real batch of 8, scored by bge-small',cam:[.28,.82],bounds:[[-3,0,-2.2],[4,1.6,2.3]],aspect:.66,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.45,.62],bounds:[[-3.2,0,-2.3],[.4,1.4,-1.1]]}:null,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,210]});
})();
