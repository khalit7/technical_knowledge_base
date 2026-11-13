// ---- Scene: Fig. 3, what parallel sampling is worth: the selector decides (stg-sel, renderer v2) ----
// Section 3's worked case: the right answer with p = 0.4, the rest spread evenly over four wrong answers (0.15 each), fifteen samples.
// The draw is illustrative (counts at their expectations rounded: 6 right; 3, 2, 2, 2 wrong). Every probability is computed exactly with the
// page's own maths (window.TTC.TM: pass@k, plurality vote with m wrong answers); the last step is a bar field of the three rules at n = 1, 5, 15, 63.
(function(){
  if(!document.getElementById('stg-sel')||!window.S3||!window.TTC)return;const {at,off,lerp,lerp3,mix,cl,ease}=S3,TM=TTC.TM;
  const p=.4,M=4,SEQ=[0,1,0,2,3,0,4,1,0,2,0,1,3,0,4],NS=[1,5,15,63];
  const cnt=[0,1,2,3,4].map(a=>SEQ.filter(x=>x===a).length),idx=SEQ.map((a,i)=>SEQ.slice(0,i).filter(x=>x===a).length);
  const val=(r,n)=>r===0?TM.passk(p,n):r===1?TM.plurality(p,n,M):(n===1?p:TM.plurality(p,n,1));
  const G=[0,1,2].map(r=>NS.map(n=>val(r,n)));
  window.TTCS=window.TTCS||{};TTCS.sel={cnt,pk5:+TM.passk(p,5).toFixed(3),pk15:+TM.passk(p,15).toFixed(4),v4_5:+(100*val(1,5)).toFixed(1),v4_15:+(100*val(1,15)).toFixed(1),
    v1_5:+(100*val(2,5)).toFixed(1),v1_15:+(100*val(2,15)).toFixed(1),v4_63:+(100*val(1,63)).toFixed(1),v1_63:+(100*val(2,63)).toFixed(1),grid:G.map(r=>r.map(v=>+(100*v).toFixed(1)))};
  const X=a=>-1.8+a*1.25,XM=X(2.5),XS=-4.2,CS=.5,CH=.22,YT=i=>i*CH;
  function draw(R,k,e){const P=R.P;R.grid(-5.4,4.4,-1.8,1.8,.5);
    const AC=[P.good,P.c2,P.c4,P.c1,P.c5];
    const pileA=k===5?off(5,e,5):1; // the piles recede when the bar field arrives
    // the sampler: one model, sampled at a temperature above zero
    R.glass([XS-.05,0,-.55],[0,0,1.1],[0,1.1,0],{c:P.ink,a:.5*pileA,nu:4,nv:4});R.label([XS,1.1,0],'the model',{fs:12.5,dy:-10,c:P.mute,a:k===5?Math.max(0,1-4*e):1});
    // answer plates on the floor
    const merge=k===4?ease(e):k>4?1:0;
    for(let a=0;a<5;a++){const wrong=a>0,xa=wrong?lerp(X(a),XM,merge):X(a),fa=wrong&&merge>0?(a===1?1:1-merge):1;
      const col=wrong&&merge>0?mix(AC[a],P.bad,merge):AC[a];
      R.quad([[xa-.48,0.005,-.48],[xa+.48,0.005,-.48],[xa+.48,0.005,.48],[xa-.48,0.005,.48]],{fill:mix(P.paper,col,.35),a:pileA*fa*(k===0?e:1)*(k===2&&wrong?.45:1),ec:col,lw:1.2});
      const lab=a===0?'right · 0.40':merge>.5?(a===1?'wrong · 0.60':null):'wrong · 0.15';
      if(lab)R.label([xa,0,.5],lab,{fs:12,dy:13,c:a===0?P.good:merge>.5?P.bad:P.mute,b:a===0||merge>.5,a:pileA*(k===0?e:1),wide:a>0&&merge<=.5?1:0})}
    // the samples: each flies from the model to its answer's pile
    if(k>=1){const shown=k===1?e*SEQ.length:SEQ.length;
      SEQ.forEach((a,i)=>{const u=k===1?cl(shown-i,0,1):1;if(u<=0)return;const wrong=a>0;
        let tgt=[X(a),YT(idx[i]),0];
        if(wrong&&merge>0){const mi=SEQ.slice(0,i).filter(x=>x>0).length;tgt=lerp3(tgt,[XM,YT(mi),0],merge)}
        const pt=u<1?R.arcPt([XS+.1,.7,0],tgt,.8,ease(u)):tgt;
        let fill=mix(P.paper,AC[a],.6),ec=null,lw=.9,aa=pileA;
        if(k===2){if(wrong){aa*=.35}else{fill=mix(P.paper,P.good,.8)}}
        if(wrong&&merge>0)fill=mix(fill,mix(P.paper,P.bad,.6),merge);
        if(k===3&&a===0){ec=P.ink;lw=2}
        if(k===4&&wrong){ec=mix(P.edge,P.ink,merge);lw=.9+1.1*merge}
        R.box(pt,[CS,CH*.92,CS],{fill,a:aa,ec,lw,shadow:false})});
      if(k===1)[0,1,2,3,4].forEach(a=>R.flowArc([XS+.1,.75,0],[X(a),YT(cnt[a])+.1,0],.9,{c:AC[a],a:.55,r:.045+.012*cnt[a],n:2+cnt[a],speed:1.4}));
      // pile heights
      if(k>=1&&k<=4){for(let a=0;a<5;a++){if(a>0&&merge>.5)continue;const h=a>0&&merge>.5?9:cnt[a];
          R.label([X(a),YT(h),0],String(h),{mono:true,fs:12.5,b:1,dy:-11,c:AC[a],a:k===1?at(1,e,1)*(e>.9?1:0):pileA*(k===2&&a>0?.4:1)})}
        if(merge>.5)R.label([XM,YT(9),0],'9',{mono:true,fs:12.5,b:1,dy:-11,c:P.bad})}}
    if(k===2){const a=Math.min(1,e*1.6);R.glass([X(0)-.6,0,-.9],[1.2,0,0],[0,1.9,0],{c:P.good,a:a*.8,nu:3,nv:6});R.glow([X(0),YT(cnt[0])+.1,0],.7,{c:P.good,a:a*.6});
      R.flow([[X(0),YT(cnt[0])+.15,0],[X(0),1.95,-.9]],{c:P.good,a,r:.06,n:4});R.label([X(0),1.9,-.9],'verifier: one right sample is enough',{fs:12.5,b:1,dy:-10,c:P.good,a})}
    if(k===3)R.label([X(0)-.32,YT(cnt[0])*.5,0],'vote: tallest pile',{fs:12.5,b:1,al:'right',dx:-14,c:P.ink,a:e,wide:1});
    if(k===4)R.label([XM+.32,YT(9)*.55,0],'now the tallest is wrong',{fs:12.5,b:1,al:'left',dx:14,c:P.bad,a:e,wide:1});
    // the bar field: rows are the three rules, columns n = 1, 5, 15, 63, height the probability of a right answer
    if(k===5){const nar=R.W<520,cols=nar?[1,3]:[1,2,3],BX=c=>-3.4+cols.indexOf(c+1)*(nar?4.2:3.05),BZ=r=>nar?-1.15+r*1.15:-1.55+r*1.55,BL=nar?2.6:2.05,BC=[P.good,P.c1,P.bad],NM=['verifier (pass@n)','vote, wrong answers scatter','vote, wrong answers agree'];
      G.forEach((row,r)=>{row.forEach((v,c)=>{if(cols.indexOf(c)<0)return;const x0=BX(c-1),L=Math.max(.03,v*BL*ease(e));
          R.box([x0+BL/2,0,BZ(r)],[BL,.02,.56],{fill:mix(P.paper,BC[r],.12),a:e*.8,shadow:false,edge:false});
          R.box([x0+L/2,0,BZ(r)],[L,.26,.56],{fill:mix(P.paper,BC[r],.62),a:e,shadow:false});
          R.label([x0+L,.26,BZ(r)],pct(v),{mono:true,fs:12.5,al:'left',dx:5,c:BC[r],b:1,a:e>.5?1:0})});
        R.label([BX(0)-.2,0,BZ(r)],NM[r],{al:'right',dx:-6,fs:12.5,c:BC[r],b:1,grp:'rule',a:e})});
      NS.forEach((n,c)=>{if(cols.indexOf(c)>=0)R.label([BX(c-1)+BL/2,0,BZ(2)+.3],'n = '+n,{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a:e})})}
  }
  const pct=v=>{const x=100*v;return (x>=99.9&&x<99.995?x.toFixed(2):x>=99.995?'100':x.toFixed(1))+'%'};
  const full={cam:[.32,.6],bounds:[[-4.8,0,-1],[3.9,2,1.1]]};
  (TTCS.stage=TTCS.stage||{}).sel=S3.stage({id:'stg-sel',list:'sx-sel',fig:'Fig. 3 · fifteen samples, three selectors',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1600,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,16,16],
    view:k=>k===5?{cam:[.06,1.02],bounds:document.getElementById('stg-sel').clientWidth<520?[[-3.7,0,-1.5],[5.3,.4,1.8]]:[[-6.2,0,-2.0],[5.6,.4,2.2]]}:full});
})();
