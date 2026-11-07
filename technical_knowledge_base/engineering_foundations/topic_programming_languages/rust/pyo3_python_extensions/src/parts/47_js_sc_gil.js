// ---- Scene, Fig. 3 (section 8): four Python threads calling Rust, the GIL as a token (renderer v2, 2026-11-07) ----
// Each bar is a real call of code/c7_gil.py (window.RB.gil314 and RB.gil314t: start and end of each call, ms, the median run of 7), on one time axis.
// Each step replays its run as time passes (the step's tween), so a long replay is five explained stretches, not frames.
// The token sits on the thread whose call started last (a call needs the GIL to start, and tally_bytes keeps it): inferred from the start times.
// The rayon step has only the call's total (RB.gil314.rayon4); its four strands are what the code does, not measured spans.
(function(){
  if(!document.getElementById('stg-gil')||!window.S3||!window.RB||!RB.gil314)return;const {at,off,lerp,mix,cl}=S3;
  const G=RB.gil314,GT=RB.gil314t;
  const ST=[{d:G.serial,lanes:1,gil:'held',py:'3.14'},{d:G.held,lanes:4,gil:'held',py:'3.14'},{d:G.detached,lanes:4,gil:'free',py:'3.14'},{d:GT.held,lanes:4,gil:'none',py:'3.14t'},
    {d:{wall_ms:G.rayon4.wall_ms,spans:[[0,G.rayon4.wall_ms]]},lanes:1,gil:'free',py:'3.14',rayon:4}];
  const TMAX=Math.max(...ST.map(s=>s.d.wall_ms))*1.04,X0=-4.2,XL=9.6,x=t=>X0+t/TMAX*XL,ZL=i=>-1.35+i*1.0;
  function draw(R,k,e){const P=R.P,s=ST[k],t=e*s.d.wall_ms,sp=s.d.spans;R.grid(-6.2,5.4,-2.8,3,.5);
    const COL=[P.c1,P.c6,P.c3,P.c4],TOK=P.c2;
    // the time ruler along the front
    const zr=2.35;R.line([[x(0),0,zr],[x(TMAX),0,zr]],{c:P.mute,w:1});
    for(let m=0;m<=TMAX;m+=20){R.line([[x(m),0,zr-.08],[x(m),0,zr+.08]],{c:P.mute,w:1});R.label([x(m),0,zr+.1],m+(m===0?' ms':''),{mono:true,fs:12,dy:12,c:P.mute})}
    // thread lanes
    for(let ln=0;ln<4;ln++){const a=ln<s.lanes?1:.0;if(a<=0)continue;const z=ZL(ln);
      R.quad([[x(0),.005,z-.3],[x(TMAX),.005,z-.3],[x(TMAX),.005,z+.3],[x(0),.005,z+.3]],{fill:mix(P.paper,P.ink,.05),a:.8,edge:false});
      R.label([x(0),.1,z],'thread '+(ln+1),{mono:true,fs:12,al:'right',dx:-10,grp:'lane',b:1})}
    // the previous step's finish, faint, to compare against
    if(k>0){const pw=ST[k-1].d.wall_ms;R.line([[x(pw),0,ZL(0)-.5],[x(pw),0,ZL(Math.max(0,s.lanes-1))+.5]],{c:P.mute,w:1.2,dash:[4,4],a:.6});
      R.label([x(pw),0,ZL(0)-.5],'step '+k+': '+pw.toFixed(0)+' ms',{mono:true,fs:12,dy:-10,al:pw>s.d.wall_ms?'left':'right',dx:pw>s.d.wall_ms?4:-4,c:P.mute,a:.8,wide:1})}
    // the calls: each bar grows from its start to now, the GIL holder's bar (or every running bar when there is no GIL to hold) streams its work
    let holder=-1;if(s.gil==='held')sp.forEach((p,j)=>{if(t>=p[0])holder=j});
    sp.forEach((p,j)=>{const ln=s.lanes===1?0:j,z=ZL(ln),a0=p[0],b0=Math.min(p[1],t);if(t<=a0)return;
      const run=t<p[1],w=Math.max(.02,x(b0)-x(a0));
      if(s.rayon){for(let r=0;r<s.rayon;r++){const zz=z-.27+r*.18;R.box([x(a0)+w/2,0,zz],[w,.26,.14],{fill:mix(P.paper,COL[r],.55),shadow:r===0,lw:.6});
          if(run&&e<1)R.flow([[x(a0),.3,zz],[x(b0),.3,zz]],{c:COL[r],r:.045,speed:2.2})}
        R.label([x(a0)+w/2,.26,z-.27],'rayon: 4 chunks in one call',{mono:true,fs:12,dy:-12,b:1,wide:1});return}
      R.box([x(a0)+w/2,0,z],[w,.3,.5],{fill:mix(P.paper,COL[j],run?.6:.4),shadow:true});
      if(s.lanes===1&&!run&&w>.9)R.label([x(a0)+w/2,.3,z],'quarter '+(j+1),{mono:true,fs:12,dy:-10,c:P.mute,wide:1});
      if(run&&e<1&&(s.gil!=='held'||j===holder))R.flow([[x(a0),.36,z],[x(b0),.36,z]],{c:COL[j],r:.055,speed:2.2})});
    // the GIL token: on the holder's bar tip while held, parked on its pedestal when released, absent on the free-threaded build
    const PK=[X0-1.3,0,ZL(0)-1.0];
    if(s.gil!=='none'){R.box(PK,[.7,.12,.7],{fill:mix(P.paper,TOK,.25)});R.label([PK[0],.12,PK[2]],'GIL',{mono:true,fs:12.5,b:1,dy:-24,c:TOK})}
    if(s.gil==='held'&&holder>=0&&t<sp[holder][1]){const ln=s.lanes===1?0:holder,tip=[x(Math.min(t,sp[holder][1])),.62,ZL(ln)];
      R.glow(tip,.38,{c:TOK,a:.8});R.ball(tip,.15,{c:TOK})}
    else if(s.gil==='held'&&e>=1){R.glow([PK[0],.3,PK[2]],.3,{c:TOK,a:.7});R.ball([PK[0],.3,PK[2]],.15,{c:TOK})}
    else if(s.gil==='free'){R.glow([PK[0],.3,PK[2]],.3,{c:TOK,a:.7});R.ball([PK[0],.3,PK[2]],.15,{c:TOK});
      R.label([PK[0]+.5,.3,PK[2]],'released during the Rust work',{fs:12,al:'left',dx:14,c:TOK,wide:1})}
    else if(s.gil==='none')R.label([PK[0],.1,PK[2]],'no GIL (3.14t)',{mono:true,fs:12.5,b:1,c:P.c6});
    // the finish line of this step
    if(e>=.98){const lz=ZL(Math.max(0,s.lanes-1))+.5,pw=k>0?ST[k-1].d.wall_ms:0,lf=!(k>0&&pw>s.d.wall_ms);R.line([[x(s.d.wall_ms),0,ZL(0)-.5],[x(s.d.wall_ms),0,lz]],{c:P.ink,w:1.6});
      R.label([x(s.d.wall_ms),0,ZL(0)-.5],s.d.wall_ms.toFixed(0)+' ms',{mono:true,fs:13,b:1,dy:-10,al:lf?'left':'right',dx:lf?4:-4})}
    R.label([x(TMAX),0,2.35],'CPython '+s.py,{mono:true,fs:12,al:'right',c:P.mute,dy:32,b:1,wide:1});
  }
  S3.stage({id:'stg-gil',list:'sx-gil',fig:'Fig. 3 · four threads, one GIL',cam:[.12,.8],bounds:[[-5.4,0,-2.5],[5.6,.8,2.5]],aspect:.56,dur:3200,hold:4600,draw,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,96],
    view:k=>ST[k].lanes===1?{cam:[.12,.72],bounds:[[-5.4,0,-2.5],[5.6,.8,2.5]]}:null});
})();
