// ---- Scene, the top of the page (Fig. 1): one engine step of the running example (Llama 3.1 70B FP8 on one H200, the parent's chat
// assistant). The token budget is drawn to scale (8 units = vLLM's 8,192 tokens per step on an H200): 64 decode tokens, R7's 1,000 uncached
// prompt tokens, R8's 7,128-token chunk. The block pool and the host tier are schematic (one box stands for many blocks), as the step list says. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const B=8192,BX0=-4,BL=8,bx=t=>BX0+t/B*BL,ZB=-2.7,ZQ=-1.25;
  const SEG=[['64 decodes',0,64,'c6'],['R7 · 1,000',64,1064,'c2'],['R8 · 7,128-token chunk',1064,8192,'c4']];
  // the pool: 16 x 3 schematic blocks; kinds: S shared system prompt, R1 one request's blocks, o other running, c cached and free, f free
  const COLS=16,PX=.5,PZ0=.35,pb=i=>[BX0+.25+(i%COLS)*PX,0,PZ0+Math.floor(i/COLS)*PX];
  const K=[];for(let i=0;i<48;i++)K.push('o');[0,1,2,3].forEach(i=>K[i]='S');[9,22,30,37].forEach(i=>K[i]='R1');[34,35,36,38,39,40,41,42].forEach(i=>K[i]='c');[43,44,45,46,47,29].forEach(i=>K[i]='f');
  const HZ=2.6,hb=i=>[BX0+.25+i*PX,0,HZ];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));R.grid(-6.5,5,-3.4,3.4,.5);const la=k>=4?Math.max(0,1-2*at(k,e,4)):1;
    // the step's budget: a glass tray of 8,192 slots
    R.glass([bx(0),.02,ZB-.4],[BL,0,0],[0,0,.8],{c:P.acc,nu:16,nv:2,a:.9});
    lab([bx(B),0,ZB+.4],'step t · at most 8,192 new tokens',{al:'right',dy:16,b:1,c:P.acc,a:la});
    const fill=[k>=1?at(k,e,1):0,k>=2?at(k,e,2):0,k>=3?at(k,e,3):0],dim=k>=4?.45:1;
    SEG.forEach((s,i)=>{if(fill[i]<=0)return;const w=Math.max(.05,bx(s[2])-bx(s[1]))*fill[i];
      R.box([bx(s[1])+w/2,.03,ZB],[w,.32,.7],{fill:mix(P.paper,P[s[3]],.8),a:dim,lw:.6});
      if(fill[i]>=1){if(i===0)lab([bx(0),.15,ZB],s[0],{al:'right',dx:-8,b:1,c:P.c6,a:la});else lab([bx(s[1])+(bx(s[2])-bx(s[1]))/2,.35,ZB],s[0],{dy:-12,b:1,c:P[s[3]],a:la})}});
    // the requests, in front of the tray: 64 running (one decode token each), R7, R8 with its document, R9 waiting
    const qa=k>=4?.35:1,RX=[-1.4,.6,2.4];
    for(let i=0;i<64;i++)R.box([-3.7+(i%8)*.2,0,ZQ-.7+Math.floor(i/8)*.2],[.14,.12,.14],{fill:mix(P.paper,P.c6,.6),a:qa,lw:.4,shadow:false});
    lab([-3,.12,ZQ+.9],'64 running',{dy:14,c:P.c6,b:1,a:la});
    R.box([RX[0],0,ZQ],[.5,.3,.4],{fill:mix(P.paper,P.c2,.75),a:qa});lab([RX[0],0,ZQ+.2],'R7 · new turn',{dy:14,b:1,c:P.c2,a:la});
    R.box([RX[1],0,ZQ],[.5,.9,.4],{fill:mix(P.paper,P.c4,.75),a:qa});lab([RX[1],.9,ZQ],'R8 · 40,000 tokens',{dy:-12,b:1,c:P.c4,a:la});
    R.box([RX[2],0,ZQ+.4],[.5,.3,.4],{fill:mix(P.paper,P.mute,.3),ec:k>=3?P.bad:null,lw:k>=3?2:.9,a:qa});lab([RX[2]+.3,.15,ZQ+.4],k>=3?'R9 waits':'R9',{al:'left',dx:6,b:1,c:k>=3?P.bad:P.ink,a:la});
    if(k===1)R.flowArc([-3,.15,ZQ-.4],[bx(32),.35,ZB],.5,{c:P.c6,r:.05,n:8,speed:1.6});
    if(k===2)R.flowArc([RX[0],.3,ZQ],[bx(564),.35,ZB],.5,{c:P.c2,r:.06,speed:1.6});
    if(k===3)R.flowArc([RX[1],.9,ZQ],[bx(4600),.35,ZB],.5,{c:P.c4,r:.07,n:18,speed:1.8});
    // the KV cache: a pool of 16-token blocks (schematic), then the host tier in front
    const pa=k>=4?at(k,e,4):0;
    if(pa>0){lab([BX0+COLS*PX,0,PZ0-.3],'GPU KV cache · 16-token blocks',{al:'right',dy:-6,b:1,c:P.mute,a:pa,grp:'pool'});
      K.forEach((t,i)=>{const p=pb(i);
        if(t==='f'){R.quad([[p[0]-.19,.004,p[2]-.19],[p[0]+.19,.004,p[2]-.19],[p[0]+.19,.004,p[2]+.19],[p[0]-.19,.004,p[2]+.19]],{ec:P.mute,fill:P.card,a:pa,dz:300});return}
        const c=t==='S'?P.c5:t==='R1'?P.c1:t==='c'?mix(P.paper,P.mute,.4):mix(P.paper,P.c6,.5),hh=t==='c'?.16:.3;
        R.box(p,[.38,hh,.38],{fill:t==='c'?c:mix(P.paper,c,.75),a:pa*(k===5&&(t==='S'||t==='R1')?.5:1),lw:t==='R1'?1.6:.5,ec:t==='R1'?P.ink:null})});
      // R7 and other requests point at the same system-prompt blocks; R1's table points at its blocks wherever they lie
      if(k===4){[[RX[0],.3,ZQ],[-3,.12,ZQ],[RX[1],.9,ZQ]].forEach(a0=>R.flowArc(a0,pb(1),.6,{c:P.c5,r:.05,n:6,speed:1.4,a:pa}));
        const t0=[BX0+COLS*PX+.6,0,PZ0+.5];R.box(t0,[.5,.1,.3],{fill:mix(P.paper,P.c1,.6),a:pa});lab([t0[0],.1,t0[2]],'R1 table',{dy:14,b:1,c:P.c1,a:pa});
        [0,1,9,22,30,37].forEach(i=>R.arc([t0[0],.1,t0[2]],pb(i),.5,{c:K[i]==='S'?P.c5:P.c1,w:1.2,a:pa*.8}));
        lab(pb(1),'S · shared by all 65',{dy:-26,b:1,c:P.c5,a:Math.max(0,2*pa-1),grp:'pool'});lab(pb(37),'R1',{dy:-20,b:1,c:P.c1,a:pa})}}
    const ha=k>=5?at(k,e,5):0;
    if(ha>0){R.glass([BX0,.01,HZ-.3],[COLS*PX,0,0],[0,0,.6],{c:P.mute,nu:COLS,nv:1,a:ha*.7});
      for(let i=0;i<COLS;i++)if(i%5!==4)R.box(hb(i),[.36,.14,.36],{fill:mix(P.paper,P.mute,.4),a:ha,lw:.5});
      lab([BX0+COLS*PX,0,HZ],'host DRAM tier',{al:'left',dx:8,b:1,c:P.mute,a:ha});
      [34,35,36].forEach((i,j)=>R.flowArc(pb(i),hb(10+j),.5,{c:P.mute,r:.05,n:5,speed:1.2,a:ha}));
      lab(pb(35),'cached, free: evicted oldest first',{dy:-20,b:1,c:P.mute,a:ha,grp:'pool'});lab(pb(45),'free',{dy:-14,b:1,c:P.ink,a:ha,grp:'pool'})}
  }
  const top={cam:[.12,1.05],bounds:[[-5.4,0,-3.3],[4.4,1,-.4]]},full={cam:[.12,.9],bounds:[[-5.4,0,-3.3],[5.2,.6,3.1]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one engine step of the running example',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k<=3?top:full,margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  (window.BKSTG=window.BKSTG||{})['stg-hero']=st;
})();
