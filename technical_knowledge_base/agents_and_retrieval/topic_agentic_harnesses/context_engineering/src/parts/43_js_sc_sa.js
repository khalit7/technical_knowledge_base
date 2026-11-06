// ---- Scene: Fig. 4, a subagent reads in its own window and returns a short result (renderer v2). Data: HCTX.sessions.sb_none and sb_agent
// (run 1 of each: "Read every module in service/ in full ...", 30 modules, Haiku 4.5): the size of every main-loop and subagent call, /context of the
// parent, and the session's per-model usage (all input processed) and cost. Heights to scale: 65,000 tokens = 2.4 units. ----
(function(){
  if(!document.getElementById('stg-sa')||!window.HCTX)return;const {lerp,mix}=S3;
  const S=HCTX.sessions,tot=c=>c.in+c.cw+c.cr,fmt=n=>Math.round(n).toLocaleString('en-GB');
  const no=S.sb_none,ag=S.sb_agent,noM=no.calls.filter(c=>c.w==='m').map(tot),agM=ag.calls.filter(c=>c.w==='m').map(tot),agS=ag.calls.filter(c=>c.w==='s').map(tot);
  const fin=s=>s.finals[s.finals.length-1],proc=s=>fin(s).mu.in+fin(s).mu.cw+fin(s).mu.cr;
  const HS=2.4/65000,CW=.7,NX=-3.1,PX=-1.7,SX=-.1,SZ=-.5,FX=1.6,FZ=-1.1,FD=.42;
  const files=[];for(let i=0;i<30;i++)files.push([FX+(i%6)*FD,FZ+Math.floor(i/6)*FD]);
  function colm(R,x,z,n,base,fill,a,o){o=o||{};const P=R.P;const hb=base*HS,h=n*HS;R.box([x,0,z],[CW,Math.min(h,hb),CW],{fill:mix(P.paper,P.c4,.5),a});
    if(h>hb)R.box([x,hb,z],[CW,h-hb,CW],{fill,a,shadow:false});return h}
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4,4,-2.2,1.8,.5);
    const HIST=mix(P.paper,P.c2,.75);
    // the 30 modules of the package
    files.forEach(([x,z],i)=>R.box([x,0,z],[.3,.16,.3],{fill:mix(P.paper,P.c6,.3),a:k===0||k===2?1:.45,lw:.6}));
    R.label([FX+2.5*FD,.16,FZ+4*FD+.2],'service/: 30 modules, 121 KB',{fs:12.5,b:1,c:P.c6,dy:16});
    // without a subagent: the parent reads all 30 itself
    const na=k===0?1:k===4?.9:.22,nh=k===0?lerp(noM[1],noM[2],Math.min(1,e*1.2)):noM[2];
    const h0=colm(R,NX,0,nh,noM[0],HIST,na);
    R.label([NX,h0,0],k===0?'no subagent · '+fmt(nh):'no subagent · '+fmt(noM[2]),{fs:12.5,mono:true,b:1,c:P.ink,dy:-12,a:Math.max(.45,na)});
    if(k===0)[0,7,14,21,28].forEach(i=>R.flowArc([files[i][0],.16,files[i][1]],[NX+.2,h0*.8,0],.6,{c:P.c6,a:fa,r:.05,n:6,speed:1.4}));
    // with a subagent: the parent writes a task, the subagent reads, one short result comes back
    if(k>=1){const pa=1,ph=k===3||k===4?lerp(agM[0],agM[1],k===3?e:1):agM[0],h1=colm(R,PX,0,ph,agM[0]*.95,HIST,pa);
      R.label([PX,h1,0],'parent · '+fmt(ph),{fs:12.5,mono:true,b:1,c:P.ink,dy:-12,al:'left',dx:-10});
      const sa=k===4?.25:k===3?1-.6*e:1,j=k===1?0:k===2?Math.min(agS.length-1,e*(agS.length-1)):agS.length-1,sh=k===1?lerp(0,agS[0],e):lerp(agS[Math.floor(j)],agS[Math.min(agS.length-1,Math.floor(j)+1)],j-Math.floor(j));
      R.box([SX,0,SZ],[CW+.14,2.45,CW+.14],{fa:.03,a:.25*sa,shadow:false});
      const h2=colm(R,SX,SZ,sh,agS[0],HIST,sa);R.label([SX,Math.max(h2,.3),SZ],'subagent window · '+fmt(sh),{fs:12.5,mono:true,b:1,c:P.c4,dy:-12,al:'left',dx:-10,a:Math.max(.4,sa)});
      if(k===1)R.flowArc([PX+CW/2,h1*.8,0],[SX-CW/2,.25,SZ],.35,{c:P.c4,a:fa,r:.055,n:5,speed:1.1});
      if(k===1)R.label([(PX+SX)/2,.6,SZ/2],'task message',{fs:12.5,c:P.c4,dy:-16,a:fa});
      if(k===2)[0,6,12,18,24,29].forEach(i=>R.flowArc([files[i][0],.16,files[i][1]],[SX+.2,Math.max(.3,h2*.8),SZ],.55,{c:P.c6,a:fa,r:.05,n:6,speed:1.4}));
      if(k===3){R.flowArc([SX-CW/2,Math.max(.3,h2*.6),SZ],[PX+CW/2,h1-.04,0],.3,{c:P.c6,a:fa,r:.05,n:3,speed:.8});R.label([(PX+SX)/2,h1+.35,0],'final text only',{fs:12.5,b:1,c:P.c6,a:fa})}
      if(k===4){R.label([PX,0,CW/2],nar?'$'+fin(ag).cost.toFixed(3):'processed '+fmt(proc(ag))+' · $'+fin(ag).cost.toFixed(3),{fs:12.5,mono:true,b:1,c:P.c4,dy:18,a:fa,al:'center'});
        R.label([NX,0,CW/2],nar?'$'+fin(no).cost.toFixed(3):'processed '+fmt(proc(no))+' · $'+fin(no).cost.toFixed(3),{fs:12.5,mono:true,b:1,c:P.ink,dy:36,a:fa,al:'center'})}}
  }
  S3.stage({id:'stg-sa',list:'sx-sa',fig:'Fig. 4 · the same question, with and without a subagent',cam:[.42,.5],bounds:[[-3.6,0,-1.4],[4,2.5,1.1]],aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[22,16,24,16]});
})();
