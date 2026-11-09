// ---- Scene: Fig. 2, one model swap, two gates (stg-gate, renderer v2). claude-v1 (champion) against claude-instant-v1 (challenger) on MT-Bench's
// 160 graded turns, one bar per turn in 8 rows of 20 (one row per category tag), heights LMSYS's released GPT-4 grades; then the paired change per
// turn as signed bars on a glass plinth; then one gate design or the other (a mode toggle swaps the step list): every row flowing into one aggregate
// pillar, or each row into its own pillar with its 95% paired interval, against a threshold plate; then the budget gate (2023 list prices) and the
// decision. Every number is window.PES (22_js_vals.js), computed by window.PEC from the released file. ----
(function(){
  if(!document.getElementById('stg-gate')||!window.PES||!window.PEK)return;
  const {mix,lerp}=S3,{lab,win,seg,poly,block,sbar}=PEK,S=PES,C=PEC,G=S.G;
  let mode='a';
  const rows=C.CATS.map(c=>S.A.map((_,i)=>i).filter(i=>C.catOf[i]===c));
  const X=j=>-4.35+j*.3,Z=r=>-1.9+r*.54,GS=.05,YG=.75,DS=.07,BW=.22;
  const PZ=3.25,PXs=r=>-4.05+r*.78,PXa=-1.3,Y0=1.1,PS=.45,EXIT=[3.1,0,-.2];
  const worst=new Set(S.ea.worst.map(w=>w.i));
  const vcol=(P,v)=>v==='fail'?P.bad:v==='escalate'?P.c5:P.good;
  function draw(R,k,e){const P=R.P;R.grid(-5.4,4.2,-2.7,4.2,.5);
    const ca=P.c1,cb=P.c2,u3=k===3?S3.ease(win(e,.1,.8)):k>3?1:0;
    const gridA=k===4?.12:k===5?.06:k===6?(mode==='a'?.45:.3):1;
    if(u3>0)R.glass([-4.6,YG-.005,-2.2],[6.05,0,0],[0,0,4.35],{c:P.c1,a:.5*Math.max(u3,.4)*(k===5?.15:k===4?.25:1),nu:8,nv:4,th:.02});
    rows.forEach((ix,r)=>ix.forEach((i,j)=>{const a0=S.A[i],b0=S.B[i],x=X(j),z=Z(r);
      if(k===0){R.box([x,0,z],[BW,.03,BW],{fill:P.paper,a:win(e,j/20*.5,j/20*.5+.3),shadow:false,lw:.6});return}
      if(b0===null&&k>=2){const a=k===2?win(e,.4,.8):gridA;R.box([x,0,z],[BW,.03,BW],{fill:mix(P.paper,P.bad,.5),a,shadow:false});
        R.line([[x-.11,.04,z-.11],[x+.11,.04,z+.11]],{c:P.bad,w:2,a});R.line([[x+.11,.04,z-.11],[x-.11,.04,z+.11]],{c:P.bad,w:2,a});return}
      if(k===1){const h=a0*GS*S3.ease(win(e,.05,.6));R.box([x,0,z],[BW,Math.max(.03,h),BW],{fill:mix(P.paper,ca,.15+.6*a0/10),shadow:false,lw:.6});return}
      if(k===2){const t=S3.ease(win(e,.05,.6)),v=lerp(a0,b0,t);R.box([x,0,z],[BW,v*GS,BW],{fill:mix(P.paper,mix(ca,cb,t),.15+.6*v/10),shadow:false,lw:.6});return}
      // the paired change: the bar rises onto the plinth and becomes signed
      const d=b0-a0,wh=k===6&&mode==='s'&&worst.has(i)?win(e,.1,.5):0;
      const y0=lerp(0,YG,u3)+wh*.6,v=lerp(b0*GS/DS,d,u3),col=d<0?P.bad:d>0?P.good:P.mute;
      const a=wh?1:k===6&&r!==0?gridA*.5:gridA;
      sbar(R,x,z,y0,v,DS,BW,u3<1?mix(mix(P.paper,cb,.5),mix(P.paper,col,d===0?.25:.65),u3):mix(P.paper,col,d===0?.25:.65),a)}));
    // the quality gate: pillars on a white plinth in front of the grid
    if(k===4){const sl=mode==='a'?[{...G.agg,v:G.aggV,x:PXa,rs:[0,1,2,3,4,5,6,7]}]:G.slices.map((s,r)=>({...s,x:PXs(r),rs:[r]})),tol=mode==='a'?S.O.aggTol:S.O.sliceTol;
      const x0=mode==='a'?PXa-.7:PXs(0)-.45,x1=mode==='a'?PXa+.7:PXs(7)+.45,pa=win(e,0,.3);
      R.box([(x0+x1)/2,Y0-.04,PZ],[x1-x0,.04,.6],{fill:P.paper,a:pa,shadow:false});[x0+.08,x1-.08].forEach(x=>R.box([x,0,PZ],[.05,Y0-.04,.05],{a:pa}));
      R.glass([x0,Y0-tol*PS,PZ-.4],[x1-x0,0,0],[0,0,.8],{c:P.bad,a:pa*.8,nu:mode==='a'?2:8,nv:1,th:.02});
      sl.forEach(s=>{const col=vcol(P,s.v),a=win(e,.35,.7);
        sbar(R,s.x,PZ,Y0,s.mean,PS,.34,mix(P.paper,col,.75),a);
        R.line([[s.x+.25,Y0+s.lo*PS,PZ],[s.x+.25,Y0+s.hi*PS,PZ]],{c:col,w:2.2,a});
        [s.lo,s.hi].forEach(v=>R.line([[s.x+.19,Y0+v*PS,PZ],[s.x+.31,Y0+v*PS,PZ]],{c:col,w:2,a}));
        s.rs.forEach(r=>R.flow(poly([[X(19)+.2,YG+.1,Z(r)],[X(19)+.6,YG+.1,Z(r)],[s.x,Y0+.1,PZ-.3]],8),{c:mode==='a'?P.c1:col,r:.05,n:7,speed:1.4,a:win(e,0,.3)*(1-.6*win(e,.7,1))}))})}
    // the budget gate: list prices per million tokens, champion against challenger, on the same spot
    const PR=[[S.price.a[0],ca],[S.price.b[0],cb],[S.price.a[1],ca],[S.price.b[1],cb]],PRX=j=>-3.6+j*.8+(j>1?.6:0);
    if(k===5)PR.forEach(([v,c],j)=>block(R,[PRX(j),0,PZ],[.5,Math.max(.02,v*.05*S3.ease(win(e,.1,.6))),.5],c,1,.55));
    // decision: to shadow traffic, or stopped at a barrier
    if(k===6){const a=win(e,.2,.5);block(R,EXIT,[.8,.35,.8],P.c4,a,.3);
      if(mode==='a')R.flow(poly([[X(19)+.2,YG+.1,Z(0)],[EXIT[0]-.4,.3,Z(0)],[EXIT[0]-.4,.3,EXIT[2]]],10),{c:P.bad,r:.06,speed:1.3,a});
      else{R.box([2.1,0,EXIT[2]],[.08,1.2,1.6],{fill:mix(P.paper,P.bad,.8),a,shadow:false});R.flow(seg([X(19)+.2,YG+.1,Z(0)],[2,YG+.1,Z(0)],10),{c:P.bad,r:.06,speed:1.3,a})}}
    // labels: only this step's
    const la=win(e,.45,.9),L=(p,t,o)=>lab(R,p,t,Object.assign({fs:12.5,a:la},o));
    if(k<=3)C.CATS.forEach((c,r)=>L([X(0)-.2,k===3?YG:0,Z(r)],C.CATN[c],{al:'right',dx:-6,a:1,c:k>=3&&c==='writing'?P.bad:P.ink,b:k>=3&&c==='writing',grp:'rows'}));
    if(k===0)L([X(10),0,Z(7)+.3],'160 graded turns · 8 tagged slices of 20',{b:1,dy:16,ph:1});
    if(k===1)L([X(10),.7,Z(0)],'champion: claude-v1, mean '+S.champMean,{b:1,c:ca,dy:-14,ph:1});
    if(k===2){L([X(10),.7,Z(0)],'challenger: claude-instant-v1, mean '+S.challMean,{b:1,c:cb,dy:-14,ph:1});
      const r=C.CATS.indexOf(C.catOf[S.failIdx]),j=rows[r].indexOf(S.failIdx);L([X(j),.05,Z(r)],'no grade',{c:P.bad,b:1,dy:14})}
    if(k===3)L([X(10),YG,Z(7)+.3],G.agg.worse+' worse · '+G.agg.same+' level · '+G.agg.better+' better',{b:1,dy:18,ph:1});
    if(k===4){if(mode==='a'){L([PXa,Y0,PZ],'all '+G.agg.n+' turns · '+C.f(G.agg.mean)+' · pass',{b:1,c:P.good,dy:-40,ph:1});L([PXa-.7,Y0-S.O.aggTol*PS,PZ],'fail line −0.25',{al:'right',dx:-8,c:P.bad})}
      else{G.slices.forEach((s,r)=>{const top=Y0+Math.max(0,s.mean)*PS+.02,c=vcol(P,s.v);L([PXs(r),top,PZ],C.CATN[s.cat],{dy:-30,c:s.v==='pass'?P.mute:c,b:s.v!=='pass',ph:s.v!=='pass'});
          L([PXs(r),top,PZ],C.f(s.mean),{dy:-14,c,b:1,mono:1});if(s.v!=='pass')L([PXs(r),Y0+s.lo*PS,PZ],s.v==='fail'?'FAIL':'REVIEW',{dy:14,c,b:1,ph:1})});
        L([PXs(0)-.45,Y0-S.O.sliceTol*PS,PZ],'fail line −0.5',{al:'right',dx:-8,c:P.bad})}}
    if(k===5){PR.forEach(([v,c],j)=>L([PRX(j),v*.05,PZ],'$'+v.toFixed(2),{dy:-22,b:1,c,ph:1}));
      L([(PRX(0)+PRX(1))/2,0,PZ+.3],'prompt',{dy:14,c:P.mute});L([(PRX(2)+PRX(3))/2,0,PZ+.3],'completion',{dy:14,c:P.mute});L([PRX(3)+.5,.4,PZ],'US$ per million tokens · budget: pass',{al:'left',dx:10,b:1,c:P.good,wide:1})}
    if(k===6){L([EXIT[0],0,EXIT[2]+.4],'shadow, then users',{b:1,dy:16,c:P.c4});
      if(mode==='a')L([X(10),YG,Z(0)],'promoted: the writing drop ships',{b:1,c:P.bad,dy:-40,ph:1});
      else{L([2.1,1.2,EXIT[2]],'blocked on writing',{b:1,c:P.bad,dy:-14,al:'left',dx:6,ph:1});
        S.ea.worst.forEach(w=>{const j=rows[0].indexOf(w.i);L([X(j),YG+.9,Z(0)],'Q'+w.q+' · '+w.a+' → '+w.b,{mono:1,dy:-14,c:P.bad,grp:'wd'})})}}
  }
  const full={cam:[.3,.98],bounds:[[-5.6,0,-2.3],[3.8,1.1,2.3]]},gate={cam:[.05,.3],bounds:[[-4.8,0,2.4],[1.9,2.1,3.9]]};
  const st=S3.stage({id:'stg-gate',list:'sx-gate',fig:'Fig. 2 · one swap through two gate designs',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[22,8,14,8]:[24,18,18,18],view:k=>k===4||k===5?gate:k<4?{cam:[.3,.98],bounds:[[-5.6,0,-2.3],[1.9,.8,2.3]]}:full});
  const sg=document.getElementById('ga-mode');
  if(sg&&st)sg.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;
    sg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    document.querySelectorAll('#sx-gate .pe-ma').forEach(x=>x.hidden=mode!=='a');document.querySelectorAll('#sx-gate .pe-ms').forEach(x=>x.hidden=mode!=='s');st.list('sx-gate')});
})();
