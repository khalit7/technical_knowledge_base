// ---- Scene, Fig. 2 (section 1): one small matrix multiply through a 4 x 4 weight-stationary systolic array, against 16 scalar lanes (renderer v2) ----
// The matrices are case 0 of src/out/systolic_ref.json (check_embed.py compares X and W); every busy cell, partial sum, result, read and
// hand-off is the page's own cycle-level simulator SYS.simulate (a port of src/sim/systolic.py; check_sim.mjs compares). The array stands
// upright like the textbook picture: inputs flow right, partial sums flow down, results drop to the floor. Each list step plays a stretch of
// cycles (the long-replay rule): load 4, fill 1 to 3, full flow 4 to 8, drain 9 to 11. Positions and sizes are illustrative.
(function(){
  if(!document.getElementById('stg-sys')||!window.SYS)return;const {mix,lerp,cl}=S3;
  const X=[[2,1,2,3],[1,1,3,1],[2,3,1,3],[1,1,1,2],[2,1,1,1]];const W=[[3,2,1,3],[1,1,3,3],[3,1,3,3],[2,1,1,1]];
  const M=X.length,K=W.length,N=W[0].length,LANES=16,sim=SYS.simulate(X,W),T=sim.cycles,F=sim.frames;
  window.__tpuRdSys={Y:sim.Y,cycles:sim.cycles,passes:sim.passes,active:sim.active};
  // the stretches, from the simulator: the wave fills until the first result leaves the bottom, flows until the last input enters, then drains
  const firstOut=F.findIndex(f=>f.out.length)+1,lastIn=F.reduce((a,f,j)=>f.edge?j+1:a,0);
  const SPAN=[null,[0,firstOut-1],[firstOut-1,lastIn],[lastIn,T],null];
  const cum=c=>{let macs=0,edge=0,pass=0,outs=0;for(let j=0;j<Math.min(c,T);j++){const f=F[j];macs+=f.act;edge+=f.edge;pass+=f.pass;outs+=f.out.length}return {macs,edge,pass,outs}};
  const rounds=Math.ceil(M*N/LANES),maxY=Math.max(...sim.Y.flat());
  window.TPU_SYS={T,firstOut,lastIn,active:sim.active,cum,rounds,load:K,weights:K*N,inputs:M*K,lanesReads:2*M*K*N,laneCycles:rounds*K};  // checked by check_stages.mjs
  let mode='sys';const RD_RM=S3.RM;
  const S=1.05,Y0=1.05,CS=.8,cx=n=>(n-(N-1)/2)*S,cy=k=>Y0+(K-1-k)*S,TOP=cy(0)+CS,ZB=.3;
  const ballY=k=>cy(k)+CS*.66,sumY=k=>cy(k)+CS*.3;
  // where an input waits: d is the frame index in which it enters column 0, tau the cycles elapsed; one slot per cycle, packed closer further out
  const qx=(d,tau)=>{const D=d+1-tau;return cx(0)-S*Math.min(1,D)-.5*Math.max(0,D-1)};
  const barZ=m=>1.0+m*.56;
  function cells(R,busy,a){const P=R.P;for(let k=0;k<K;k++)for(let n=0;n<N;n++){const b=busy?busy(k,n):0;
    R.box([cx(n),cy(k),0],[CS,CS,.36],{fill:mix(P.paper,P.c2,.38*b),a,shadow:false})}}
  function bars(R,done,grow,a){const P=R.P;for(let m=0;m<M;m++)for(let n=0;n<N;n++){const g=done(m,n);if(g<=0)continue;
    R.box([cx(n),0,barZ(m)],[.44,Math.max(.02,sim.Y[m][n]/maxY*.95*g),.34],{fill:mix(P.paper,P.c6,.55),a,dz:0})}}
  function drawSys(R,k,e,st){const P=R.P,u=RD_RM?1:cl(st.e,0,1),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    // loaded rows of weights (step 1 slides them in from the top, bottom row first)
    const L=k===0?u*K:K,rowA=r=>cl(L-(K-1-r),0,1);
    // cycles elapsed
    const tau=k===0?0:k===4?T:lerp(SPAN[k][0],SPAN[k][1],u);
    // the frame in progress j (0-based) and how far it has moved, f in (0,1]; at a stretch's end the last frame shows complete
    const j=tau>0?Math.min(T-1,Math.ceil(tau-1e-9)-1):0,f=tau>0?cl(tau-j,0,1):0;
    const cur=F[j],prev=j>0?F[j-1]:null,on=(fr,r,n)=>!!(fr&&fr.pe[r]&&fr.pe[r][n]);
    const busy=(r,n)=>k===0||k===4?0:Math.max(on(cur,r,n)?Math.min(1,f*2):0,on(prev,r,n)?1-Math.min(1,f*2):0);
    cells(R,busy,1);
    // the weight tile: one tinted glass square per cell, darker for a larger weight; a light glass plate behind the whole array
    R.glass([cx(0)-S/2+.06,Y0-.08,-.24],[N*S-.12,0,0],[0,K*S-.1,0],{c:P.c1,a:.3*cl(L,0,1),nu:N,nv:K});
    for(let r=0;r<K;r++){const a=rowA(r);if(a<=0)continue;const dy=(1-a)*(TOP+.5-cy(r));
      for(let n=0;n<N;n++){R.glass([cx(n)-.3,cy(r)+.1+dy,ZB-.1],[.6,0,0],[0,.6,0],{c:P.c1,a:a*(.35+.2*W[r][n]),nu:1,nv:1,th:.03});
        if(a>.95)lab([cx(n)-.31,cy(r)+CS-.13,ZB],'w'+W[r][n],{fs:12,al:'left',c:P.c1,wide:1})}}
    if(k===0){for(let n=0;n<N;n++)R.flow([[cx(n),TOP+.75,ZB],[cx(n),cy(K-1)+.5,ZB]],{c:P.c1,r:.06,n:5,speed:1.4,a:.9});
      lab([0,TOP+.8,ZB],'weights from storage, one row per cycle',{dy:-14,c:P.c1,b:1,wide:1})}
    // inputs waiting in the skewed queue on the left
    if(k<4)for(let r=0;r<K;r++)for(let m=0;m<M;m++){const d=m+r;if(k>0&&d<=j)continue;
      const x=qx(d,k===0?0:tau);R.ball([x,ballY(r),ZB],.13,{c:P.c2,a:.9});lab([x,ballY(r),ZB],String(X[m][r]),{fs:12,dy:-15,c:P.c2,wide:1})}
    // the frame in progress: every busy cell's input moves in from the left and its partial sum down from above
    if(k>0&&k<4){for(let r=0;r<K;r++)for(let n=0;n<N;n++){const c=cur.pe[r][n];if(!c)continue;
        const x0=n===0?qx(j,j):cx(n-1),x=lerp(x0,cx(n),f);R.ball([x,ballY(r),ZB],.13,{c:P.c2});
        if(r>0){const y=lerp(sumY(r-1),sumY(r),f);R.ball([cx(n)+.18,y,ZB],.11,{c:P.c6})}
        if(f>.55)lab([cx(n),sumY(r),ZB],String(c.s),{fs:12.5,b:1,c:P.c6,dx:-10,wide:1})}
      // inputs leaving the right edge fade out; finished sums drop to the floor
      if(prev)for(let r=0;r<K;r++){const c=prev.pe[r][N-1];if(c)R.ball([lerp(cx(N-1),cx(N-1)+.6,f),ballY(r),ZB],.13,{c:P.c2,a:1-f})}
      cur.out.forEach(([m,n])=>{if(f<1)R.ball([cx(n),lerp(cy(K-1),.3,f),lerp(ZB,barZ(m),f)],.11,{c:P.c6,a:1-f*.6})})}
    // results so far, as bars on the floor (height = value)
    const doneAt={};for(let t=0;t<T;t++)F[t].out.forEach(([m,n])=>doneAt[m+','+n]=t);
    bars(R,(m,n)=>{const t=doneAt[m+','+n];return k===0?0:t<j?1:t===j?f:0},0,1);
    // labels and the counter
    const c=k===0?{macs:0,edge:0,pass:0}:cum(j+1),cyc=k===0?0:j+1;
    const reads=Math.ceil(L-1e-9)*N+c.edge,busyN=k===0||k===4?0:cur.act;
    const txt=k===0?'load cycle '+Math.max(1,Math.ceil(L-1e-9))+' of '+K+' · reads '+reads:k===4?'4 + '+T+' = '+(K+T)+' cycles · '+(K*N+M*K)+' reads · '+sim.passes+' hand-offs':'cycle '+cyc+' of '+T+' · '+busyN+' of 16 busy · reads '+reads;
    lab([0,TOP+.55,0],txt,{b:1,fs:13});
    if(k===1||k===2)lab([cx(0)-2.4,Y0-.45,ZB],'X enters from the left',{c:P.c2,b:1,wide:1});
    if(k>0)lab([cx(N-1)+.5,cy(0)+CS*.6,0],'W stays',{al:'left',dx:6,c:P.c1,b:1,wide:1});
    lab([cx(N-1)+.4,.25,barZ(M-1)],'Y leaves the bottom',{al:'left',dx:8,c:P.c6,b:1,wide:1});
  }
  function drawLanes(R,k,e,st){const P=R.P,u=RD_RM?1:cl(st.e,0,1),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    const tau=k===0?u*K:k===1?K+u*K:rounds*K,steps=tau>0?Math.min(rounds*K,Math.ceil(tau-1e-9)):0,r=Math.max(0,Math.floor((Math.max(1,steps)-1)/K)),done=s=>Math.min(LANES,M*N-Math.floor(s/K)*LANES);
    const act=l=>k<2&&r*LANES+l<M*N;
    const acc={};for(let s=0;s<steps;s++){const rr=Math.floor(s/K),kk=s%K;for(let l=0;l<LANES;l++){const idx=rr*LANES+l;if(idx>=M*N)continue;const m=Math.floor(idx/N),n=idx%N;acc[idx]=(acc[idx]||0)+X[m][kk]*W[kk][n]}}
    const lane=(kk,n)=>kk*N+n;
    cells(R,(kk,n)=>act(lane(kk,n))?1:0,1);
    // the register file: every busy lane pulls x and w from it on every step
    const rfx=cx(0)-2.1;R.box([rfx,Y0,0],[1.0,K*S-.2,.6],{fill:mix(P.paper,P.c2,.25),shadow:false});
    lab([rfx,TOP+.05,0],'register file',{dy:-12,b:1,c:P.c2});
    for(let kk=0;kk<K;kk++)for(let n=0;n<N;n++){const l=lane(kk,n);if(!act(l))continue;const y=ballY(kk),pts=[[rfx+.5,y,.2],[cx(n)-.15,y+.12,.75],[cx(n)-.1,y,ZB]];
      R.line(pts,{c:P.c2,w:1,a:.3});R.flow(pts,{c:P.c2,r:.055,n:5,speed:1.5})}
    for(let kk=0;kk<K;kk++)for(let n=0;n<N;n++){const l=lane(kk,n),idx=r*LANES+l;if(k<2&&acc[idx]!=null&&act(l))lab([cx(n),sumY(kk),ZB],String(acc[idx]),{fs:12.5,b:1,c:P.c6,wide:1})}
    // results: a round's outputs land when its fourth step completes
    bars(R,(m,n)=>{const end=(Math.floor((m*N+n)/LANES)+1)*K;return tau>=end-1e-9?1:tau>end-1?tau-(end-1):0},0,1);
    let reads=0;for(let s=0;s<steps;s++)reads+=2*done(s);
    const busyN=k<2?Math.min(LANES,M*N-r*LANES):0;
    lab([0,TOP+.5,0],k===2?rounds*K+' cycles · '+2*M*K*N+' reads · 0 hand-offs':'step '+steps+' of '+rounds*K+' · '+busyN+' of 16 busy · reads '+reads,{b:1,fs:13});
    lab([cx(N-1)+.4,.25,barZ(M-1)],'Y',{al:'left',dx:8,c:P.c6,b:1,wide:1});
  }
  const cam=[.4,.42],fullS={cam,bounds:[[-6.2,0,-.4],[2.4,5.6,3.4]]},VS=[fullS,fullS,{cam,bounds:[[-4.4,0,-.4],[2.4,5.6,3.4]]},{cam,bounds:[[-2.2,0,-.4],[2.5,5.6,3.4]]},{cam,bounds:[[-2.2,0,-.4],[2.5,5.6,3.4]]}],fullL={cam,bounds:[[-3.7,0,-.4],[2.4,5.6,3.4]]};
  const st=S3.stage({id:'stg-sys',list:'sx-sys',fig:'Fig. 2 · 80 multiply-adds, cycle by cycle',cam:fullS.cam,bounds:fullS.bounds,aspect:.72,dur:3200,hold:4200,
    draw:(R,k,e,s)=>mode==='sys'?drawSys(R,k,e,s):drawLanes(R,k,e,s),
    view:k=>mode==='sys'?VS[k]:fullL,margin:w=>w<520?[12,8,12,8]:[18,18,18,18]});
  (window.TPUSTG=window.TPUSTG||{})['stg-sys']=st;
  RD.seg(document.getElementById('rd-sys-mode'),m=>{mode=m;document.getElementById('sx-sys').hidden=m!=='sys';document.getElementById('sx-lanes').hidden=m==='sys';st.list(m==='sys'?'sx-sys':'sx-lanes')});
})();
