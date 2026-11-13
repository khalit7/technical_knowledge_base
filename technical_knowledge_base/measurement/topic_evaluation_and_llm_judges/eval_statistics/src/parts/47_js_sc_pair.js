// ---- Scene: Fig. 2, one comparison analysed three ways on the same questions (stg-pair, renderer v2) ----
// Both models' greedy answers to the 1,311 RACE-H questions of this page's run (window.EST.race), each question a domino: model A
// (Qwen2.5-0.5B-Instruct) on the left half, model B (Qwen3-0.6B) on the right. The clouds are 200 seeded bootstrap re-draws of the
// difference B − A, computed here and labelled so: each model's questions drawn separately (unpaired), the questions drawn once for both
// (paired) and whole passages drawn (paired and clustered). The bands are the standard errors of EST.fourSE, ±1.96 SE, as in the hero.
// What the scene computes is published in window.ESS.pair for check_stages.mjs.
(function(){
  const S=window.EST;if(!S||!S.race)return;
  // the two comparisons' clustered SEs, which check_page.mjs compares with recompute.json (formerly set by the 2D animation)
  {const g=S.raceScores('greedy'),i=S.mtb.models.findIndex(m=>m.name==='claude-v1'),j=S.mtb.models.findIndex(m=>m.name==='claude-instant-v1'),Q=S.mtbPair(i,j);
    window.ES_CHECK=window.ES_CHECK||{};ES_CHECK.anim={race:S.fourSE(g[0],g[1],S.race.cl).clustered,mtb:S.fourSE(Q.a,Q.b,Q.cl).clustered}}
  if(!document.getElementById('stg-pair')||!window.S3||!window.ESK)return;const {mix,lerp}=S3,K=ESK;
  const A=S.race.g[0],B=S.race.g[1],n=A.length,f=S.fourSE(A,B,S.race.cl),ZF=.45+K.D/2,R0=.065;
  let b10=0,b01=0,b11=0,b00=0;A.forEach((a,i)=>{const b=B[i];if(a&&b)b11++;else if(a)b10++;else if(b)b01++;else b00++});
  const ROWS=[['unpaired',f.unpaired,-1.05],['paired',f.paired,-2.65],['paired, clustered',f.clustered,-4.25]],ZX=-5.05,lo=-9,hi=3,SX=v=>-4.2+(v-lo)/(hi-lo)*8.4;
  // seeded bootstrap clouds of B − A in points
  const rng=S.rng(20261110),G={};S.race.cl.forEach((c,i)=>{(G[c]=G[c]||[0,0]);G[c][0]+=B[i]-A[i];G[c][1]++});const GL=Object.values(G);
  const clouds=[[],[],[]];for(let b=0;b<200;b++){let sa=0,sb=0,sd=0,sm=0,m=0;
    for(let i=0;i<n;i++){sa+=A[(rng()*n)|0];sb+=B[(rng()*n)|0]}
    for(let i=0;i<n;i++){const j=(rng()*n)|0;sd+=B[j]-A[j]}
    for(let c=0;c<GL.length;c++){const q=GL[(rng()*GL.length)|0];sm+=q[0];m+=q[1]}
    clouds[0].push(100*(sb-sa)/n);clouds[1].push(100*sd/n);clouds[2].push(100*sm/m)}
  const hw=ROWS.map(r=>100*S.Z95*r[1]),d=100*f.diff,piles=clouds.map(v=>K.pile(v.map(x=>Math.max(lo,Math.min(hi,x))),SX,R0));
  window.ESS=window.ESS||{};ESS.pair={n,rA:b11+b10,rB:b11+b01,b11,b00,b10,b01,diff:+d.toFixed(2),hw:hw.map(h=>+h.toFixed(2)),r:+f.r.toFixed(2),C:f.C,
    ratio:+(f.paired/f.unpaired).toFixed(2),boot:clouds.map(v=>+(S.Z95*K.sd(v)).toFixed(2)),ex:hw.map(h=>Math.abs(d)>h)};
  const BX=K.W/2+.55,BS=.006; // the two discordant piles beside the field
  function draw(R,k,e){const P=R.P;R.grid(-5,5.6,-5.4,ZF+K.D/2+.3,.5);
    const cG=mix(P.paper,P.good,.72),cW=mix(P.paper,P.mute,.42),cA=P.c2,cB=P.c1,fa=k<=1?1:lerp(.5,.2,k===2?e:1);
    for(let i=0;i<n;i++){const q=K.pos[i],a=A[i],b=B[i],dis=a!==b,pz=[q[0],0,q[2]+ZF];
      let lift=0,al=fa,ca=a?cG:cW,cb=b?cG:cW;
      if(k===1){if(dis){lift=.14*e;ca=cb=mix(a?cG:cW,a?cA:cB,e)}else al=1-.8*e}
      else if(k>=2){const far=k<4?.4:1; // in steps 3 and 4 the field, cut by the card's lower edge, recedes further
        if(dis){lift=.14;ca=cb=a?cA:cB;al=Math.max(fa,.45)*far}else al=fa*.6*far}
      const hw2=K.TS/2;K.tile(R,[pz[0]-hw2/2-.004,0,pz[2]],lift,hw2,ca,al);K.tile(R,[pz[0]+hw2/2+.004,0,pz[2]],lift,hw2,cb,al)}
    if(k===0){R.label([0,0,ZF+K.D/2+.1],R.W<520?'left half A, right half B':'each question: left half A, right half B · A '+(b11+b10)+' right, B '+(b11+b01)+' right',{fs:12.5,dy:16,c:P.ink,b:1})}
    // step 2: the questions where exactly one model is right flow into two piles
    if(k>=1){const t=k===1?e:1,aa=k===1?1:k===2?1-e:0;[[b10,cA,'only A right',-.3],[b01,cB,'only B right',.3]].forEach(([c,col,txt,dz])=>{const h=c*BS*t,z=ZF+dz*2.2;
        R.box([BX,0,z],[.42,Math.max(.01,h),.42],{fill:mix(P.paper,col,.65),a:aa});R.label([BX+.25,h/2,z],c+' '+txt,{al:'left',dx:8,fs:12.5,b:1,c:col,a:aa});
        if(k===1)R.flowArc([dz<0?-1:1,.2,ZF+dz*4],[BX,h+.05,z],.5,{c:col,a:.75,r:.05,n:8})});
      if(k===1)R.label([0,0,ZF+K.D/2+.1],R.W<520?'agreements cancel':b11+' both right and '+b00+' both wrong cancel in B − A',{fs:12.5,dy:16,c:P.mute,b:1,a:e})}
    if(k>=2){const aa=k===2?e:1;K.axis(R,P,SX,lo,hi,2,ZX,aa,v=>(v>0?'+':v<0?'−':'')+Math.abs(v));
      R.line([[SX(0),0,-.3],[SX(0),0,ZX]],{c:P.ink,w:1.2,dash:[4,4],a:aa*.7});R.label([SX(0),0,-.3],'no difference',{fs:12,c:P.ink,dy:12,a:aa});
      R.line([[SX(d),0,-.3],[SX(d),0,ZX]],{c:P.bad,w:1,dash:[2,3],a:aa*.6});R.label([SX(d),0,-.3],'B − A = '+S.fmt(d,2),{fs:12.5,b:1,c:P.bad,dy:12,dx:-30,a:aa})}
    // steps 3 to 5: one cloud per analysis, the formula's band under it
    ROWS.forEach(([nm,se,z],r)=>{if(k<r+2)return;const cur=k===r+2,t=cur?e:1,aa=k>r+2?.45:1,col=[P.c2,P.c1,P.c4][r],pts=piles[r],nb=Math.round(pts.length*t);
      K.band(R,P,SX,d,hw[r],z,col,(cur?Math.min(1,e*1.6):1)*aa,'±'+hw[r].toFixed(2)+(R.W<520?'':Math.abs(d)>hw[r]?' excludes 0':' includes 0'),SX(hi)+.2);
      for(let b=0;b<nb;b++){const q=pts[b];R.ball([q[0],q[1],z+q[2]],R0,{c:col,a:.9*aa})}
      if(cur)R.flowArc([0,.2,ZF-K.D/2+.3],[SX(d),.2,z],.5+.25*r,{c:col,a:.7,r:.05,n:10});
      R.label([SX(lo),0,z],nm,{al:'right',dx:-6,fs:12,c:col,a:Math.max(.6,aa),grp:'cl'})});
    // step 5: the passages, the clusters the third cloud re-draws
    if(k===4){for(let c=0;c<K.C;c++){const gx=c%K.G,gz=Math.floor(c/K.G),x=(gx-(K.G-1)/2)*K.CX,z=(gz-(K.G-1)/2)*K.CZ+ZF,w=K.CX/2-.02,h=K.CZ/2-.02;
        R.quad([[x-w,.002,z-h],[x+w,.002,z-h],[x+w,.002,z+h],[x-w,.002,z+h]],{ec:P.c4,lw:1,ea:.55*e,a:1})}
      R.label([-K.W/2-.1,0,ZF-K.D/2+.6],K.C+' passages',{al:'right',dx:-6,fs:12.5,c:P.c4,b:1,a:e,wide:1})}
  }
  const full={cam:[0,.92],bounds:[[-4.6,0,ZX-.2],[5.3,.6,ZF+K.D/2+.2]]};
  S3.stage({id:'stg-pair',list:'sx-pair',fig:'Fig. 2 · RACE-H, B − A on the same 1,311 questions',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,50,16,8]:[18,135,18,110],
    view:k=>k===0?{cam:[0,1.05],bounds:[[-K.W/2-.2,0,ZF-K.D/2-.1],[K.W/2+.2,.3,ZF+K.D/2+.4]]}:k===1?{cam:[-.15,.95],bounds:[[-K.W/2-.2,0,ZF-K.D/2-.1],[BX+1.9,1.4,ZF+K.D/2+.4]]}:k>=2&&k<4?{cam:[0,.85],bounds:[[-4.4,0,ZX-.1],[4.4,.9,.4]]}:{cam:[0,1],bounds:[[-4.6,0,ZX-.1],[4.6,.9,ZF+K.D/2+.1]]}});
})();
