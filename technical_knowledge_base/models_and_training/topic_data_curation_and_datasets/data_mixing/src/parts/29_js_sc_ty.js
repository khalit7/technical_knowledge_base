// ---- Scene (Reading 6b, Fig. 6): the replay toy's nine CPT runs (window.CPT.toy.summary, means of three seeds) as a 3 x 3 bar field:
// replay share across, peak learning rate front to back; height the English loss rise over the base, then German loss above the best German run. ----
(function(){
  if(!document.getElementById('stg-ty')||!window.CPT||!CPT.toy)return;const {at,off,lerp,mix}=S3;
  const T=CPT.toy,S=T.summary,M=T.meta,PK=M.peaks,RP=M.replays;
  const nm=(pk,rp)=>'p'+(pk===1?'1.0':pk)+'_r'+(rp===0?'0.0':rp);
  const best=Math.min(...PK.flatMap(pk=>RP.map(rp=>S[nm(pk,rp)].de)));
  const X=j=>(j-1)*1.75,Z=i=>(i-1)*1.45,HS=.62,FW=.5;
  const show=(k,i,j)=>k===0?0:k===1?(i===0&&j===0):k===2?(j===0):1; // which English columns are up at step k
  function draw(R,k,e){const P=R.P;R.grid(-3.6,4.2,-2.4,2.4,.5);
    // the base: one model, continued nine ways
    const BX=-3.2;R.box([BX,0,0],[.7,.55,.7],{fill:mix(P.paper,P.c1,.35)});R.label([BX,.55,0],'English base',{fs:12.5,b:1,dy:-13,c:P.c1});
    PK.forEach((pk,i)=>RP.forEach((rp,j)=>{const s=S[nm(pk,rp)],x=X(j),z=Z(i),focus=k===5?(i===0&&j===2):true;
      R.quad([[x-.62,.005,z-.55],[x+.62,.005,z-.55],[x+.62,.005,z+.55],[x-.62,.005,z+.55]],{fill:mix(P.card,P.ink,.04),ec:P.line,a:.9});
      if(k===0)R.flowArc([BX+.35,.4,0],[x,.05,z],.4+.1*j,{c:P.c2,a:.7*e,r:.045,n:4,speed:1.3});
      // English rise
      const up=show(k,i,j),grow=up?(k===1||(k===2&&j===0&&i>0)||(k===3&&j>0)?e:1):0;
      if(up||k>=3){const h=s.forget*HS*(k===3&&j>0?lerp(S[nm(pk,0)].forget/s.forget,1,e):grow);
        const a=(k===4?.35:1)*(focus?1:.2);
        R.box([x-(k>=4?.16:0),0,z],[FW,Math.max(.01,h),FW],{fill:mix(P.paper,P.c1,.75),a,shadow:a>.5});
        if(k<4||k===5&&focus)R.label([x-(k>=4?.16:0),h,z],'+'+s.forget.toFixed(2),{mono:true,fs:12.5,b:1,dy:-11,c:P.c1,a:a*(k===3&&j>0?e:1)*(grow>.95||k>=3?1:0)})}
      // English replayed back into the stream
      if(k===3&&j>0)R.flowArc([BX+.35,.5,0],[x,s.forget*HS+.1,z],.6,{c:P.c1,a:.8,r:.04+.06*rp*4,n:Math.round(3+rp*24),speed:1.3});
      // German loss above the best German run
      if(k>=4){const g=(s.de-best)*HS,a=(k===4?e:1)*(focus?1:.2);R.box([x+.2,0,z],[.34,Math.max(.012,g),.34],{fill:P.c2,a,shadow:false});
        if(k===4||focus)R.label([x+.2,g,z],'+'+(s.de-best).toFixed(2),{mono:true,fs:12,dy:-10,c:P.c2,a,grp:k===4?'g'+i:null})}}));
    // axes
    RP.forEach((rp,j)=>R.label([X(j),0,Z(2)+.62],rp*100+'% replay',{mono:true,fs:12,dy:14,c:P.mute,a:k===5?.35:1}));
    PK.forEach((pk,i)=>R.label([X(2)+.7,0,Z(i)],'peak '+pk+'×',{al:'left',dx:6,mono:true,fs:12,c:P.mute}));
  }
  const full={cam:[.42,.62],bounds:[[-3.7,0,-2.2],[4.4,2,2.3]]};
  S3.stage({id:'stg-ty',list:'sx-ty',fig:'Fig. 6 · replay toy, nine runs',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[20,16,20,16],
    view:k=>k===5?{cam:[.62,.6],bounds:full.bounds}:full});
})();
