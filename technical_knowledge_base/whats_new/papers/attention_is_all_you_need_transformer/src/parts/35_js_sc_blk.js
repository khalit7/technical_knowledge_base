// ---- Scene: inside one layer. Self-attention mixes positions, the residual and post-LN, the FFN's 4× expansion per position, and the decoder's mask ----
(function(){
  if(!$('stg-blk'))return;const {at,off,lerp,mix}=S3;
  const n=5,X=i=>(i-(n-1)/2)*1.25,Y={x:0,att:.5,an1:1.0,f1:1.35,f2:1.7,f3:2.2,an2:2.55};
  const TG=['vor','gran','ka','miska','pik','ka'];
  let MS=null;function mask(){if(MS)return MS;try{const r=TM.translate(TM.load('full'),'the big dog chased the small cat'.split(' '));MS={w:r.self[1][0].slice(0,6).map(row=>row.slice(0,6)),words:r.dec_in.slice(0,6)}}
    catch(e){MS={w:TG.map((_,i)=>TG.map((_,j)=>j<=i?1/(i+1):0)),words:TG}}return MS}
  function draw(R,k,e){const P=R.P;R.grid(-4.5,4.5,-2.6,2.6,.5);
    const la=k>=4?off(k,e,4):1,hl=s=>k===0||k>=4?1:s?1:.13;
    // inputs, self-attention (one slab across all positions: it is the only part that mixes them), add & norm, FFN per position, add & norm
    for(let i=0;i<n;i++){R.box([X(i),Y.x,0],[.8,.16,.5],{fill:mix(P.paper,P.c5,.3),a:la*hl(k===2)});
      R.box([X(i),Y.an1,0],[.8,.07,.5],{a:la*hl(k===2)});R.box([X(i),Y.an2,0],[.8,.07,.5],{a:la*hl(k===3)});
      const fa=la*hl(k===3),fc=mix(P.paper,P.c3,k===3?.6:.4);R.box([X(i),Y.f1,0],[.5,.14,.5],{fill:fc,a:fa});R.box([X(i),Y.f2-.08,0],[.5,.34,2.0],{fill:mix(P.paper,P.c3,k===3?.45:.28),a:fa});R.box([X(i),Y.f3-.1,0],[.5,.14,.5],{fill:fc,a:fa})}
    R.box([0,Y.att,0],[n*1.25-.3,.28,.9],{fill:mix(P.paper,P.c1,k===1?.6:.38),a:la*hl(k===1)});
    const L=(y,t,c,a,g)=>R.label([X(0)-.5,y,.25],t,{al:'right',dx:-8,mono:true,fs:12,c,a:la*a,grp:'L'});
    L(Y.x+.08,'x · 512',P.c5,hl(k===2));L(Y.att+.14,'multi-head self-attention',P.c1,hl(k===1));L(Y.an1+.03,'Add & Norm',P.mute,hl(k===2));
    L(Y.f1+.07,'FFN in · 512',P.c3,hl(k===3));L(Y.f2+.09,'hidden · 2048, ReLU',P.c3,hl(k===3));L(Y.f3-.03,'FFN out · 512',P.c3,hl(k===3));L(Y.an2+.03,'Add & Norm',P.mute,hl(k===3));
    if(k===1){for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!==j)R.arc([X(j),Y.att+.3,.2],[X(i),Y.att+.3,-.2],.25+.12*Math.abs(i-j),{c:P.c1,w:1.3,a:.55*e,t:Math.min(1,e*1.2),top:1})}
    if(k===2){for(let i=0;i<n;i++){const xr=X(i)+.4,z=.25,a=e;R.line([[xr,Y.x+.08,z],[xr+.18,Y.x+.08,z],[xr+.18,Y.an1,z],[xr,Y.an1,z]],{c:P.acc,w:2,a,head:6,top:1});
        R.ball([X(i)+.4,Y.an1-.06,z+.05],.07,{c:P.acc,a,top:1})}
      R.label([X(n-1)+.6,Y.an1,0],'x + Sublayer(x), then LayerNorm',{al:'left',dx:8,mono:true,fs:12,c:P.acc,a:e})}
    if(k===3){const yy=lerp(Y.f1,Y.an2,e);for(let i=0;i<n;i++)R.glow([X(i),yy,0],.45,{c:P.c3,a:.9,top:1});R.label([X(n-1)+.6,Y.f2+.2,0],'same weights at every position',{al:'left',dx:8,mono:true,fs:12,c:P.c3,a:e})}
    // the decoder's mask: query i (rows) may use keys j ≤ i; the rest are set to −∞ before the softmax
    if(k>=4){const M=mask(),m=M.w.length,cs=.55,a=at(k,e,4),x0=-m*cs/2,z0=-m*cs/2,y0=.0;
      R.quad([[x0,y0,z0],[x0+m*cs,y0,z0],[x0+m*cs,y0,z0+m*cs],[x0,y0,z0+m*cs]],{fill:mix(P.paper,P.ink,.04),a});
      for(let i=0;i<m;i++)for(let j=0;j<m;j++){const c=[x0+cs*(j+.5),y0,z0+cs*(i+.5)];
        if(j>i)R.box(c,[cs*.86,.5*a,cs*.86],{fill:P.dark?mix(P.card,P.ink,.18):mix(P.paper,P.ink,.5),a:a*.9});
        else R.box(c,[cs*.7,Math.max(.02,M.w[i][j]*1.6)*a,cs*.7],{fill:mix(P.paper,P.c1,.3+.6*M.w[i][j]),a})}
      M.words.forEach((w,j)=>R.label([x0+cs*(j+.5),y0,z0+m*cs],w,{serif:true,fs:12,dy:12+(j%2?13:0),a}));
      M.words.forEach((w,i)=>R.label([x0,y0,z0+cs*(i+.5)],w,{serif:true,fs:12,al:'right',dx:-6,a,grp:'q'}));
      R.label([x0+m*cs,.5,z0+cs*.5],'−∞: masked',{mono:true,fs:12,al:'left',dx:8,c:P.mute,a});
      R.label([x0,0,z0+m*cs],'rows: queries · columns: keys',{mono:true,fs:12,al:'right',dx:-6,dy:30,c:P.mute,a})}
  }
  S3.stage({id:'stg-blk',list:'sx-blk',fig:'Fig. 5 · inside one layer',cam:[.55,.55],bounds:[[-4,0,-1.8],[4,2.8,1.8]],aspect:.8,draw,dur:1300,hold:2600});
})();
