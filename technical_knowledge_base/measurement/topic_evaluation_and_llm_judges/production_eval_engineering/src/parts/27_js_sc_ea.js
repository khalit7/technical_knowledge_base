// ---- Scene: Fig. 1, error analysis on the running swap (stg-ea, renderer v2). The traces are the challenger's 159 graded MT-Bench turns (section 3),
// laid out in a seeded random reading order; a trace fails when it scored below the champion on the same turn (45). MT-Bench's category stands in for
// the failure mode that axial coding would name from notes (said on the page). Counts, the saturation point of this order and of 1,000 orders, and
// the three worst writing drops come from window.PES.ea (22_js_vals.js). ----
(function(){
  if(!document.getElementById('stg-ea')||!window.PES||!window.PEK)return;
  const {mix,lerp,lerp3,at,cl}=S3,{lab,win,poly,block}=PEK,S=PES,E=S.ea,C=PEC;
  const NC=20,TX=n=>-4.6+(n%NC)*.3,TZ=n=>-2.2+Math.floor(n/NC)*.42,TS=[.24,.05,.32];
  const pos=new Map();E.order.forEach((i,n)=>pos.set(i,n));
  const MXj=j=>-4.3+j*.95,MZ=2.05,HB=.1;                      // one plate per mode along the front, the biggest on the left; HB: height of one stacked trace
  const mi={};E.modes.forEach((m,j)=>mi[m.c]=j);
  // where each failing trace sits on its mode's stack
  const slot={};E.modes.forEach(m=>{let k=0;E.fails.forEach(i=>{if(C.catOf[i]===m.c)slot[i]=k++})});
  // after promotion the writing stack closes the gap the three promoted traces leave
  const slot2={};{let k=0;E.fails.forEach(i=>{if(C.catOf[i]==='writing'&&!E.worst.some(w=>w.i===i))slot2[i]=k++})}
  const GS=[3.1,0,.6],worst=new Set(E.worst.map(w=>w.i)),firsts=new Set();
  {const seen=new Set();E.order.forEach(i=>{if(E.fails.includes(i)&&!seen.has(C.catOf[i])){seen.add(C.catOf[i]);firsts.add(i)}})}
  const trayP=i=>{const n=pos.get(i);return [TX(n),0,TZ(n)]},stackP=i=>[MXj(mi[C.catOf[i]]),.06+slot[i]*HB,MZ];
  function draw(R,k,e){const P=R.P;R.grid(-5.4,4.2,-2.8,3,.5);
    const bad=P.bad,dimT=k===0?1:k===1||k===4?.55:.22;
    // the tray of traces
    const rd=k===4?Math.round(win(e,.05,.9)*E.satN):0;        // step 5: traces read so far in this order
    E.order.forEach((i,n)=>{const f=B(i)<A(i);let a=k===0?win(e,n/159*.6,n/159*.6+.25):dimT,col=P.paper,t=0,h=TS[1];
      if(k===1&&f){col=bad;t=.55*win(e,.2,.6);h=TS[1]+.12*win(e,.2,.6);a=1}
      if(k>=2&&f){col=bad;t=.25}
      if(k===4){a=n<rd?1:.25;if(f&&n<rd){t=.5;h=.1}if(firsts.has(i)&&n<rd){t=.85;h=.16}}
      R.box([TX(n),0,TZ(n)],[TS[0],h,TS[2]],{fill:t?mix(P.paper,col,t):col,a,shadow:false,lw:.6})});
    // traces stream in from production
    if(k===0)R.flow(poly([[-5.6,.15,-2.6],[-5.6,.15,-.7],[-4.8,.15,-.7]],8),{c:P.c1,r:.07,speed:1.4,a:1-win(e,.7,1)});
    // the mode plates, the traces flying onto them and stacking into counts
    const pa=k<2?0:k===2?win(e,0,.3):k===4?.35:1;
    E.modes.forEach((m,j)=>{const x=MXj(j),hi=m.c==='writing';
      R.glass([x-.4,.02,MZ-.3],[.8,0,0],[0,0,.6],{c:hi?P.acc:P.c1,a:pa,nu:2,nv:2,th:.03});
      if(k===5){const a=win(e,.1,.5);R.glass([x-.3,.06,MZ+.5],[.6,0,0],[0,.55,0],{c:P.c6,a,nu:2,nv:2});
        R.flow(poly([[x,m.n*HB+.1,MZ],[x,m.n*HB+.25,MZ+.25],[x,.4,MZ+.5]],6),{c:P.c6,r:.05,speed:1.1,n:4,a:a*.9})}});
    if(k>=2)E.fails.forEach(i=>{const a0=trayP(i),b0=stackP(i);let p=b0,a=k===4?.35:1;
      if(k===6&&slot2[i]!==undefined){p=b0.slice();p[1]=lerp(b0[1],.06+slot2[i]*HB,S3.ease(win(e,.5,.9)))}
      if(k===2){const dl=(slot[i]/12)*.35,u=S3.ease(win(e,.15+dl,.55+dl));p=lerp3(a0,b0,u);p[1]+=Math.sin(Math.PI*u)*.9}
      if(k===6&&worst.has(i)){const u=S3.ease(win(e,.1,.7)),top=[GS[0],.66+E.worst.findIndex(w=>w.i===i)*.1,GS[2]];p=lerp3(b0,top,u);p[1]+=Math.sin(Math.PI*u)*.6;a=1}
      const hiW=C.catOf[i]==='writing';
      R.box(p,[.4,HB*.82,.4],{fill:mix(P.paper,bad,k===6&&worst.has(i)?.9:hiW?.6:.4),a,shadow:false,lw:.6})});
    if(k===2)E.fails.forEach(i=>{if(slot[i]===0){R.flowArc(trayP(i),[MXj(mi[C.catOf[i]]),.2,MZ],.7,{c:bad,r:.05,n:5,speed:1.6,a:win(e,0,.3)*(1-win(e,.8,1))})}});
    // the golden set and the loop back to the traces
    if(k===6){const a=win(e,0,.3);block(R,GS,[1.1,.6,.7],P.c1,a,.25);
      R.flow(poly([[GS[0],.2,GS[2]-.45],[GS[0],.2,-1],[1.5,.2,-1]],10),{c:P.acc,r:.06,speed:1.2,a:win(e,.6,1)})}
    // labels: only the current step's, so nothing from the last step lingers under the new ones
    const la=win(e,.45,.9),L=(p,t,o)=>lab(R,p,t,Object.assign({fs:12.5,a:la},o));
    if(k===0){L([-1.75,.05,.9],'159 traces, in one random reading order',{b:1,dy:18,ph:1});L([-5.6,.15,-2.6],'production',{dy:-12,c:P.c1})}
    if(k===1){L([-1.75,.05,.9],'45 scored below the champion: a note each',{b:1,c:bad,dy:18,ph:1})}
    if(k===2||k===3){E.modes.forEach((m,j)=>{L([MXj(j),0,MZ+.3],m.c==='stem'?'STEM':m.c,{dy:j%2?32:16,b:m.c==='writing',c:m.c==='writing'?P.acc:P.ink});
        if(k===3)L([MXj(j),m.n*HB+.06,MZ],String(m.n),{b:1,c:bad,dy:-12,ph:m.c==='writing'})})}
    if(k===4){const n=E.satN-1,i=E.order[n];L([TX(n),.16,TZ(n)],'trace '+E.satN+': the seventh category',{b:1,c:bad,dy:-16,ph:1,a:win(e,.8,1)});
      L([-1.75,.05,.9],'read so far: '+Math.max(rd,0)+' of 159',{dy:18,ph:1,mono:1,a:1})}
    if(k===5)L([MXj(6)+.45,.3,MZ+.5],'one evaluator per mode, pass or fail',{al:'left',dx:8,b:1,c:P.c6,ph:1});
    if(k===6){L([GS[0],.6,GS[2]],'golden set v+1',{b:1,dy:-44,ph:1});L([GS[0],0,GS[2]+.4],'+3 · constrained rewrite',{dy:16,c:bad,b:1});
      L([2.3,.2,-1],'re-enters at step 1',{c:P.acc,dy:16,a:win(e,.6,1)})}
  }
  const A=i=>S.A[i],B=i=>S.B[i];
  const full={cam:[.25,.72],bounds:[[-5.2,0,-2.5],[3.8,1.25,2.7]]},tray={cam:[.15,.85],bounds:[[-4.9,0,-2.5],[1.4,.4,1.1]]};
  S3.stage({id:'stg-ea',list:'sx-ea',fig:'Fig. 1 · error analysis on the swap of section 3',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[22,8,14,8]:[22,18,18,18],view:k=>k===0?{cam:[.2,.8],bounds:[[-5.8,0,-2.7],[1.4,.4,1.2]]}:k===1||k===4?tray:full});
})();
