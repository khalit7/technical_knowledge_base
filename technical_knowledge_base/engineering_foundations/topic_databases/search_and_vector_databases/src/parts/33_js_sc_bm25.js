// ---- Scene, section 4: BM25's term-frequency part as a surface over term frequency and document length (renderer v2) ----
// Height = tf (k1 + 1) / (tf + k1 (1 - b + b |D| / avgdl)), the factor BM25 multiplies by idf; Lucene's defaults k1 1.2, b 0.75.
// The six questions of section 3 (SV.tiny, lexemes from Postgres) sit on it at their real term frequency and length (dl / avgdl from SV.bm25).
(function(){
  if(!document.getElementById('stg-bm')||!window.SV||!SV.tiny)return;const {at,off,lerp,mix}=S3;
  const D=SV.tiny,ql=D.query_lexemes.map(x=>x[0]),B=SV.bm25(D.docs.map(d=>d.lexemes),ql,1.2,.75);
  const TF=[1,2,3,4,5,6,7,8],LN=[.25,.5,1,1.5,2,3],K1=1.2,S=.36;
  const part=(tf,L,k1,b)=>tf*(k1+1)/(tf+k1*(1-b+b*L));
  const x=t=>-2.75+(t-1)*.78,z=L=>2.05-LN.indexOf(L)*.78,zL=L=>{for(let i=1;i<LN.length;i++)if(L<=LN[i]){const u=(L-LN[i-1])/(LN[i]-LN[i-1]);return lerp(z(LN[i-1]),z(LN[i]),u)}return z(3)};
  // the matched (question, term) pairs: all have tf 1 here; length differs
  const pts=[];D.docs.forEach((d,i)=>{const L=B.dl[i]/B.avg;ql.forEach(t=>{const f=B.tf[i][t]||0;if(f)pts.push({q:i+1,t,f,L,h:part(f,L,K1,.75)})})});
  const byQ={};pts.forEach(p=>{if(!byQ[p.q])byQ[p.q]=p});
  window.CHK=Object.assign(window.CHK||{},{bm:{avg:B.avg,dl:B.dl,pts:Object.values(byQ).map(p=>[p.q,+p.L.toFixed(2),+p.h.toFixed(2)])}});
  // height at a step: raw tf, then saturation (b 0), then length (b 0.75)
  const H=(tf,L,k,e)=>{const raw=tf,sat=part(tf,L,K1,0),len=part(tf,L,K1,.75);
    if(k===0)return raw;if(k===1)return lerp(raw,sat,e);if(k===2)return lerp(sat,len,e);return len};
  function draw(R,k,e){const P=R.P,wide=R.W>=520;R.grid(-4.2,4,-2.6,3,.5);
    const fieldA=k===3?.22:1;
    TF.forEach(t=>LN.forEach(L=>{const h=H(t,L,k,e)*S,c=L<1?mix(P.paper,P.c1,.55):L>1?mix(P.paper,P.c1,.18):mix(P.paper,P.c1,.35);
      R.box([x(t),0,z(L)],[.5,Math.max(.01,h),.5],{fill:k===0?mix(P.paper,P.c5,.35):c,a:fieldA,shadow:false,lw:.7})}));
    // axes
    TF.forEach(t=>R.label([x(t),0,z(.25)+.4],t===1?'tf 1':String(t),{mono:true,fs:12,c:P.mute,dy:6}));
    if(k!==3)LN.forEach(L=>R.label([x(1)-.45,0,z(L)],L===1?'|D| = avgdl':(L+'× avgdl'),{mono:true,fs:12,c:L===1?P.ink:P.mute,al:'right',dx:-4,grp:'len'}));
    // step 1: a text that says the word 8 times scores 8 times as much
    if(k===0){R.label([x(8),8*S,z(1)],'8 mentions = 8 × the score',{fs:12.5,b:1,c:P.c5,al:'left',dx:10,a:e})}
    // step 2: saturation: every column levels off under k1 + 1
    if(k>=1){const ca=k===1?e:k===3?.35:.7,y=(K1+1)*S;R.glass([x(1)-.35,y,z(3)-.35],[x(8)-x(1)+.7,0,0],[0,0,z(.25)-z(3)+.7],{c:P.c2,a:ca*.7,nu:8,nv:6});
      if(k<3)R.label([x(8)+.35,y,z(3)-.35],'ceiling k₁ + 1 = 2.2',{fs:12.5,b:1,c:P.c2,al:'left',dx:8,a:ca})}
    if(k===1)R.label([x(8),part(8,1,K1,0)*S,z(1)],'8 mentions ≈ 1.9 × one',{fs:12.5,b:1,c:P.c1,al:'left',dx:10,a:e,dy:-14});
    // step 3: length: short texts rise, long ones sink, for the same tf
    if(k===2){[.25,3].forEach(L=>{const h=part(2,L,K1,.75)*S;R.label([x(2),h,z(L)],(L<1?'short: ':'long: ')+part(2,L,K1,.75).toFixed(2),{mono:true,fs:12.5,b:1,c:L<1?P.c1:P.mute,al:'left',dx:16,a:e})})}
    // step 4: the six questions at tf 1 and their real lengths
    if(k===3)Object.values(byQ).forEach((p,i)=>{const pz=zL(p.L),py=p.h*S,a=at(k,e,3);
      R.line([[x(1),0,pz],[x(1),py,pz]],{c:P.c1,w:1.4,a});R.glow([x(1),py,pz],.22,{c:P.c1,a});R.ball([x(1),py,pz],.08,{c:P.c1,a});
      R.label([x(1),py,pz],'Q'+p.q+' · '+p.L.toFixed(2)+'× · '+p.h.toFixed(2),{mono:true,fs:12,b:1,c:P.c1,al:'left',dx:14,a,grp:'q'})});
  }
  const full={cam:[.55,.62],bounds:[[-4,0,-2.2],[3.2,1,2.5]]};
  S3.stage({id:'stg-bm',list:'sx-bm',fig:'BM25: repeats saturate, length discounts',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5000,draw,
    margin:w=>w<520?[18,8,14,8]:[24,150,18,110],
    view:k=>k===0?{cam:[.55,.5],bounds:[[-4.2,0,-2.3],[3.4,3,2.6]]}:k===3?{cam:[.75,.62],bounds:[[-4.2,0,-1.2],[1.4,1,2.6]]}:full});
})();
