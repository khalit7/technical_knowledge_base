// ---- Scene, Fig. 2 (section 1): the entropy of every bet over cat, dog and sat, as a surface over the probability triangle (renderer v2) ----
// Heights are IT.H(q, 2) in bits; the tiny model's bet is softmax(2, 1, 0); the temperature path is softmax(z / T) for T from 0.05 to 30.
(function(){
  if(!document.getElementById('stg-ent')||!window.ITS)return;const S=ITS,{mix}=S3;
  const H2=q=>IT.H(q,2),SY=1.05,M=S.mesh(H2,24),q0=IT.softmax([2,1,0]),u=[1/3,1/3,1/3];
  const qT=T=>IT.softmax([2/T,1/T,0]),Ts=[];for(let i=0;i<=60;i++)Ts.push(Math.pow(10,-1.3+i*(2.78/60)));
  const edge=[];for(let i=0;i<=40;i++){const t=i/40;edge.push([1-t,t,0])}
  function draw(R,k,e){const P=R.P;R.grid(-3.2,3.2,-3,2.2,.5);S.tri(R,{hide:k>=1?[2]:[]});
    const grow=k===0?0:k===1?e:1,dim=k>=3?.45:.85;
    if(grow>0)S.surf(R,M,SY,{c:P.c1,grow,lo:0,hi:Math.log2(3),a:dim,fa:.86});
    // 1. the uniform bet at the centre, the tiny bet near cat
    const pu=S.at(u,H2(u)*SY*grow),pq=S.at(q0,H2(q0)*SY*grow);
    R.ball(pu,.08,{c:P.ink,top:1});R.label(pu,k===0?'uniform · a third each':'uniform · log₂ 3 = '+(H2(u)*grow).toFixed(3)+' bits',{dy:-16,fs:12.5,b:1,a:k>=3?.5:1});
    // 3. the tiny model's bet
    const qa=k===2?e:k>2?(k===3?.4:.8):k===0?1:.5;
    R.ball(pq,.09,{c:P.c2,top:1,a:Math.max(qa,.4)});if(k>=2){R.line([S.at(q0,0),pq],{c:P.c2,w:1.4,dash:[3,3],a:qa});R.glow(pq,.3,{c:P.c2,top:1,a:qa*.6})}
    if(k!==4)R.label(pq,k>=2?'tiny bet · '+H2(q0).toFixed(3)+' bits':'tiny bet',{al:'right',dx:-12,dy:-6,fs:12.5,b:1,c:P.c2,a:k===2?Math.max(.4,e):k===3?.4:1});
    // 4. an edge is a coin: the cat-dog edge is the binary entropy curve
    if(k===3){const pts=S.lift(edge,H2,SY,.04);R.line(pts.slice(0,Math.max(2,Math.round(e*pts.length))),{c:P.c4,w:3,top:1});
      const h=S.at([.5,.5,0],SY+.04),c9=S.at([.9,.1,0],H2([.9,.1,0])*SY+.04);R.ball(h,.08,{c:P.c4,top:1,a:e});R.ball(c9,.08,{c:P.c4,top:1,a:e});
      R.label(h,'fair coin · 1 bit',{al:'left',dx:10,dy:-10,fs:12.5,b:1,c:P.c4,a:e});R.label(c9,'0.9 coin · '+H2([.9,.1,0]).toFixed(3),{al:'right',dx:-10,dy:-10,fs:12.5,b:1,c:P.c4,a:e})}
    // 5. temperature moves the bet along one path: from the cat corner (T -> 0) towards the centre (T -> infinity)
    if(k===4){const qs=Ts.map(qT),pts=S.lift(qs,H2,SY,.05);R.line(pts.slice(0,Math.max(2,Math.round(e*pts.length))),{c:P.c2,w:2.6,top:1});R.flow(pts,{c:P.c2,r:.065,n:10,speed:1,top:1,a:e});
      [[.5,'T = 0.5'],[1,'T = 1'],[2,'T = 2']].forEach(([T,s],i)=>{const q=qT(T),pt=S.at(q,H2(q)*SY+.05);R.ball(pt,.08,{c:P.c2,top:1,a:e});
        R.label(pt,s+' · '+H2(q).toFixed(3),{al:i===1?'right':'left',dx:i===1?-12:12,dy:i===2?-12:8,fs:12.5,b:1,c:P.c2,a:e})})}
  }
  S3.stage({id:'stg-ent',list:'sx-ent',fig:'Fig. 2 · entropy over every bet',cam:[.32,.62],bounds:[[-2.6,0,-2.6],[2.6,1.7,1.6]],aspect:.7,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,14,16],
    view:k=>k===3?{cam:[.12,.42],bounds:[[-2.4,0,-.6],[2.4,1.3,1.5]]}:null});
})();
