// ---- Scene: Fig. 3, run s4's sessions (section 7, renderer v2). Three Claude Code processes on one saved history: process 1 (ClaudeSDKClient,
// two turns, get_context_usage between them), process 2 (resume) and process 3 (fork, a new session id). The session files are slabs on the floor,
// transcript lines flow into and out of them; the cost columns in front are the result message's total_cost_usd after each phase (FSDK.runs.s4_session),
// stacked as earlier spend (grey) plus what that phase added (its own cost, the difference); the context column is the recorded get_context_usage. ----
(function(){
  if(!document.getElementById('stg-sess'))return;const {at,mix}=S3;
  const F=window.FSDK,S=F.runs.s4_session,rs=S.results,cu=S.other.find(o=>o.kind==='context_usage');
  const usd=x=>'$'+Number(x).toFixed(4),fmt=n=>Number(n).toLocaleString('en-US');
  const ph={};rs.forEach(r=>ph[r.phase]=r);const mx=Math.max(...rs.map(r=>r.cost));
  // x of each phase; processes in the back row, session files in the middle, cost columns in front
  const PX={turn1:-3.0,turn2:-1.6,resume:.9,fork:3.1},ZP=0,ZF=1.45,ZC=-1.5,CH=2.0;
  const PROC=[{x0:-3.75,x1:-.85,t:'process 1 · ClaudeSDKClient',s:0},{x0:.2,x1:1.6,t:'process 2 · resume',s:3},{x0:2.4,x1:3.8,t:'process 3 · fork',s:4}];
  const cat=n=>(cu.categories.find(c=>c.name===n)||{}).tokens;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.4,4.8,-2.6,2.6,.5);
    // which process is live at this step: 0 turn 1, 1 context, 2 turn 2, 3 resume, 4 fork, 5 differences
    const live=k<=2?0:k===3?1:k===4?2:-1;
    PROC.forEach((p,i)=>{const shown=k>=p.s?(k===p.s?e:1):0;if(shown<=0)return;const a=live===i?1:k===5?.7:.3,w=p.x1-p.x0,xc=(p.x0+p.x1)/2;
      R.box([xc,0,ZP],[w,.75,.9],{fill:mix(P.paper,P.acc,live===i?.35:.15),a:a*shown});R.label([xc,.75,ZP+.45],nar?'process '+(i+1):p.t,{fs:13,b:live===i,c:P.acc,dy:-10,a:Math.max(.4,a)*shown});
      if(i===0&&k>=3)R.label([xc,0,ZP+.45],'exited',{fs:12.5,c:P.mute,dy:-14,a:.8})});
    // session files: session-1 grows phase by phase; session-2 is written by the fork
    const g1=k===0?e:1,th1=.06+.05*Math.min(k+1,4)*(k===0?e:1)+(k>=2?.05:0);
    R.box([-1.2,0,ZF],[4.0,th1,.75],{fill:mix(P.paper,P.c6,.35),a:g1*(k===4?.55:1)});R.label([-1.2,th1,ZF+.37],'session-1.jsonl',{mono:true,fs:12.5,b:1,c:P.c6,dy:16,a:g1});
    if(k>=4){const g2=k===4?e:1;R.box([3.1,0,ZF],[1.3,.08,.75],{fill:mix(P.paper,P.c5,.35),a:g2});R.label([3.1,.08,ZF+.37],'session-2.jsonl',{mono:true,fs:12.5,b:1,c:P.c5,dy:16,a:g2})}
    // flows: a turn appends lines to the file; resume and fork read the whole history back first
    const down=(x,c,n)=>R.flow([[x,.5,ZP+.45],[x,.35,ZF-.1],[x,th1+.02,ZF]],{c,r:.06,n:n||5,speed:.9});
    const up=(x0,x1,c)=>R.flowArc([x0,th1+.02,ZF],[x1,.5,ZP+.45],.5,{c,r:.06,n:7,speed:1.1});
    if(k===0)down(PX.turn1,P.c6);if(k===2)down(PX.turn2,P.c6);
    if(k===3){up(.3,PX.resume,P.c6);down(PX.resume+.35,P.c6,4)}
    if(k===4){up(1.4,PX.fork,P.c6);R.flow([[PX.fork+.35,.5,ZP+.45],[PX.fork+.35,.3,ZF-.1],[PX.fork+.35,.1,ZF]],{c:P.c5,r:.06,n:4,speed:.9})}
    // the context column (get_context_usage between turns 1 and 2): 200,000 tokens of window, the autocompact line, what was used
    const ca=k===1?1:k===0||k===2?.25:0;
    if(ca>0){const X=-4.6,H=2.2,y=v=>H*v/cu.maxTokens,used=Math.max(.025,y(cu.totalTokens));
      R.glass([X-.25,0,ZP],[.5,0,0],[0,H,0],{c:P.c6,a:ca,nu:2,nv:10});R.box([X,0,ZP+.04],[.46,used,.1],{fill:P.c2,a:ca,shadow:false});
      R.line([[X-.32,y(cu.autoCompactThreshold),ZP],[X+.32,y(cu.autoCompactThreshold),ZP]],{c:P.bad,w:2,a:ca});
      if(k===1){R.label([X+.3,y(cu.autoCompactThreshold),ZP],'autocompact at '+fmt(cu.autoCompactThreshold),{al:'left',dx:8,fs:12.5,b:1,c:P.bad,a:e});
        R.label([X+.3,H,ZP],fmt(cu.maxTokens)+' window',{al:'left',dx:8,fs:12.5,c:P.mute,a:e});
        R.label([X+.3,used,ZP],fmt(cu.totalTokens)+' used',{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a:e});
        R.flowArc([PX.turn1,.75,ZP],[X+.1,.6,ZP],.4,{c:P.c2,r:.05,n:5,speed:1})}}
    // cost columns: reported total after each phase = earlier spend (grey) + own (accent)
    const order=['turn1','turn2','resume','fork'],stepOf={turn1:0,turn2:2,resume:3,fork:4};
    order.forEach(p=>{const r=ph[p];if(!r)return;const s=stepOf[p];if(k<s)return;const g=k===s?e:1,x=PX[p],hT=CH*r.cost/mx,hO=CH*r.own_cost/mx,hE=hT-hO;
      const hl=k===s||k===5,a=hl?1:.4;
      if(hE>.005)R.box([x,0,ZC],[.5,hE,.5],{fill:mix(P.paper,P.mute,.35),a:a*g,lw:.7});
      R.box([x,hE,ZC],[.5,hO*g,.5],{fill:mix(P.paper,P.acc,.75),a,lw:.7,shadow:hE<=.005});
      R.label([x,hT,ZC],usd(r.cost),{mono:true,fs:12.5,b:hl,c:P.ink,dy:-12,a:Math.max(.45,a)*g});
      if(hl&&!nar)R.label([x,hT,ZC],'own '+usd(r.own_cost),{al:'left',dx:20,dy:8,mono:true,fs:12,c:P.acc,a:g})});
    if(k===5&&!nar){const sum=order.reduce((s,p)=>s+(ph[p]?ph[p].cost:0),0);R.label([0,0,ZF+.4],'sum of the four totals '+usd(sum)+' · real spend '+usd(ph.fork.cost),{fs:13,b:1,c:P.bad,dy:40,a:e})}
  }
  const full={cam:[.3,.55],bounds:[[-5,0,-1.9],[4.2,2.1,2.1]]};
  S3.stage({id:'stg-sess',list:'sx-sess',fig:'Fig. 3 · run s4: three processes, one history',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:5200,draw,
    view:k=>k===1?{cam:[.45,.45],bounds:[[-5.2,0,-.9],[-.6,2.3,1.9]]}:full});
})();
