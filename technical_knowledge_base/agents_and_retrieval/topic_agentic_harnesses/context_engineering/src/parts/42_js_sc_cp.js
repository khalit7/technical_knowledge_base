// ---- Scene: Fig. 3, compaction replacing the history with a summary (renderer v2). Data: HCTX.sessions.c1_manual (12 calls, /compact, the 13th call
// answers the recall question) and c4_auto (five 75 KB reads, a failed then a successful automatic compaction): per main-loop call, tokens read from the
// cache, written and fresh; the compact_boundary record (tokens before and after, seconds); the hidden summarising call of c4_auto derived as the
// session's modelUsage input minus every streamed call. One scale for both runs (130,000 tokens = 2.6 units). ----
(function(){
  if(!document.getElementById('stg-cp')||!window.HCTX)return;const {lerp,mix}=S3;
  const S=HCTX.sessions,tot=c=>c.in+c.cw+c.cr,fmt=n=>Math.round(n).toLocaleString('en-GB');
  const man=S.c1_manual,mc=man.calls.filter(c=>c.w==='m'),mcmp=man.events.find(e=>e.k==='compact');
  const au=S.c4_auto,ac=au.calls.filter(c=>c.w==='m'),acmp=au.events.find(e=>e.k==='compact'),fin=au.finals[0];
  const hidden=fin.mu.in+fin.mu.cw+fin.mu.cr-au.calls.slice(0,fin.after_call).reduce((s,c)=>s+tot(c),0);
  const HS=2.6/130000,X0=-2.9,DXC=.46,CWD=.32,PZ=-1.3,DKX=X0+12*.46+.75,DKZ=.9;
  const xs=i=>X0+i*DXC;
  // one call as a column: cache read, write, fresh from the floor up
  function col(R,x,c,a,o){o=o||{};const P=R.P;let y=0;[[c.cr,mix(P.paper,P.c1,.6)],[c.cw,P.c5],[c.in,P.c2]].forEach(([n,fill])=>{if(n<50)return; // the 8 to 10 fresh tokens of a call are below one pixel: skipped
    const h=Math.max(.008,n*HS*(o.g==null?1:o.g));R.box([x,y,0],[CWD,h,CWD],{fill,a,shadow:y===0,lw:.7});y+=h});return y}
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-3.6,3.6,-2.2,1.8,.5);
    const auto=k===4,mA=auto?Math.max(0,1-e*2.2):1;
    // the manual run: 12 calls, then the 13th after the compaction
    if(!auto||mA>0){const shown=k===0?Math.ceil(e*12):12;
      mc.forEach((c,i)=>{if(i>=12&&k<2)return;if(i<12&&i>=shown)return;const g=k===0&&i===shown-1?Math.min(1,(e*12-(shown-1))*1.3):1;
        const a=(i<12&&k>=2?.28:1)*mA,top=col(R,xs(i),c,a,{g});
        if(k===0&&i===shown-1)R.label([xs(i),top,0],'call '+(i+1)+' · '+fmt(tot(c)),{fs:12.5,mono:true,b:1,c:P.ink,dy:-12,a:mA});
        if(i===12&&k>=2)R.label([xs(i),top,0],'call 13 · '+fmt(tot(c)),{fs:12.5,mono:true,b:1,c:P.ink,dy:-12,a:mA*(k===2?fa:1)})});
      // the summarising call: the history streams into a glass plate behind the row; a short summary comes out
      if(k>=1&&k<=3){const px=xs(9),pa=(k===1?fa:k===3?.55:.7)*mA;R.glass([px-.5,.05,PZ],[1,0,0],[0,.75,0],{c:P.c6,a:pa,nu:5,nv:4});
        R.label([px,.8,PZ],k===1?'/compact · '+(mcmp.ms/1000).toFixed(1)+' s':'summarising call',{fs:12.5,b:1,c:P.c6,dy:-10,a:pa});
        if(k===1)[0,3,6,9,11].forEach(i=>R.flowArc([xs(i),tot(mc[i])*HS,-CWD/2],[px-.3+.06*i/11,.45,PZ+.05],.35,{c:P.c2,a:fa*.85,r:.045,n:5,speed:1.3}));
        // the summary itself: a small teal block in front of the plate
        const sa=k===1?Math.max(0,e*2-1):1,sh=mcmp.post*HS;R.box([px,0,PZ+.7],[.5,Math.max(.03,sh),.32],{fill:P.c6,a:sa*mA});
        R.label([px,sh,PZ+.7],k===1?fmt(mcmp.pre)+' → '+fmt(mcmp.post)+' tokens':'summary · '+fmt(mcmp.post),{fs:12.5,mono:true,b:1,c:P.c6,dy:-12,al:k===1?'center':'center',a:sa*mA});
        if(k>=2)R.flowArc([px,sh,PZ+.7],[xs(12),.3,-CWD/2],.25,{c:P.c6,a:(k===2?fa:.6)*mA,r:.045,n:4,speed:1})}
      // CLAUDE.md is read again from disk, not carried by the summary
      if(k>=2&&k<=3){const da=(k===2?fa:.8)*mA;R.box([DKX,0,DKZ],[.7,.28,.5],{fill:mix(P.paper,P.c3,.25),a:da});R.label([DKX,0,DKZ+.25],'CLAUDE.md on disk',{fs:12.5,b:1,c:P.c3,dy:14,a:da});
        R.flowArc([DKX-.2,.28,DKZ-.2],[xs(12)+.1,.25,CWD/2],.3,{c:P.c3,a:da,r:.045,n:4,speed:1})}
      if(k===2&&!nar){const c=mc[12];R.label([xs(12),c.cr*HS/2,CWD/2],'startup prefix read '+fmt(c.cr),{fs:12,mono:true,c:P.c1,al:'left',dx:26,grp:'c13'});R.label([xs(12),(c.cr+c.cw/2)*HS,CWD/2],'new prefix written '+fmt(c.cw),{fs:12,mono:true,c:mix(P.ink,P.c5,.7),al:'left',dx:26,grp:'c13'})}
      if(k===3){const L=[['all user messages: copied',P.good],['the change, with code: kept',P.good],['verbatim test output: gone',P.bad],['next step: a git commit nobody asked for',P.bad]];
        L.forEach(([t,c],i)=>R.label([xs(0),.55,PZ],t,{fs:12.5,b:1,c,al:'left',dy:-19*(L.length-1-i),a:fa}))}}
    // the automatic run: five big reads, a hidden summarising call, then the calls continue from the summary
    if(auto){const aa=Math.min(1,Math.max(0,e*2.2-1)),slot=i=>i<2?i:i+1;
      ac.forEach((c,i)=>{const top=col(R,xs(slot(i)),c,aa);if(i===1)R.label([xs(1)-CWD/2,top*.8,0],'call 2 · '+fmt(tot(c)),{fs:12.5,mono:true,b:1,c:P.ink,al:'right',dx:-10,a:aa})});
      const hx=xs(2),hh=hidden*HS;R.glass([hx-CWD/2,0,0],[CWD,0,0],[0,hh,0],{c:P.c6,a:aa,nu:1,nv:10});
      R.label([hx,hh,0],nar?'summarising · '+fmt(hidden):'hidden summarising call · read about '+fmt(hidden),{fs:12.5,b:1,c:P.c6,al:'left',dx:14,dy:-6,a:aa});
      R.label([xs(3),tot(ac[2])*HS,0],fmt(acmp.pre)+' → '+fmt(acmp.post)+' · call 3 · '+fmt(tot(ac[2])),{fs:12.5,mono:true,b:1,c:P.c6,al:'left',dx:12,dy:-14,a:aa});
      R.flowArc([xs(1),tot(ac[1])*HS*.7,0],[hx,hh*.7,0],.15,{c:P.c2,a:aa,r:.05,n:5,speed:1.5});
      R.flowArc([hx,.2,CWD/2],[xs(3),.25,CWD/2],.2,{c:P.c6,a:aa,r:.045,n:3,speed:.8})}
  }
  const close={cam:[.32,.68],bounds:[[X0-.3,0,-1.6],[xs(12)+1.2,.7,1.2]]};
  S3.stage({id:'stg-cp',list:'sx-cp',fig:'Fig. 3 · two recorded compactions, call by call',cam:close.cam,bounds:close.bounds,aspect:.46,dur:1600,hold:5400,draw,
    margin:w=>w<520?[16,10,14,10]:[24,16,14,16],
    view:k=>k===4?{cam:[.32,.3],bounds:[[X0-.3,0,-.4],[xs(12)+.6,2.7,.4]]}:null});
})();
