// ---- Scene: Fig. 1, one turn of the loop (renderer v2). Structure, not data: the six parts of context stacked into the request (purple),
// the model (a glass plate), the enforcement chain every tool call passes (blue glass gates: PreToolUse hooks, the three rule lists,
// the permission mode, the sandbox), the tool, and the result flowing back into the conversation. Section numbers as on the page.
// Steps (ol#sx-hero): context in, the reply, hooks, rules and mode, the tool and its result, the end of the turn. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {mix,lerp3,at}=S3;
  const XC=-4.3,XM=-2.1,Y=.55,XT=4.15,ZB=1.25;
  // context parts, bottom up: label, height, section
  const CTX=[['system prompt, tool definitions',.42,'2'],['CLAUDE.md files, rules',.2,'5'],['skill names, descriptions',.12,'6'],['MCP tool names',.1,'10'],['SessionStart hook output',.08,'4'],['conversation, tool results',.42,'1, 9']];
  // the enforcement chain: x, label, colour key, section
  const ENF=[[-.6,'PreToolUse hooks','c4','4'],[.55,'deny',"bad",'3'],[.85,'ask','c5','3'],[1.15,'allow','good','3'],[2.2,'permission mode','acc','3, 8'],[3.1,'sandbox, if on','mute','3']];
  function stack(R,k,e){const P=R.P;let y=.06;const tops=[];R.box([XC,0,0],[1.6,.06,1.2],{fill:mix(P.paper,P.soft,.5)});
    CTX.forEach(([t,h],i)=>{const hh=i===5&&k>=4?h+(k===4?.16*e:.16):h;R.box([XC,y,0],[1.3,hh,1.0],{fill:mix(P.paper,P.c4,.18+i*.07),a:k===0||k===4&&i===5?1:.75,lw:.7,shadow:i===0});tops.push([y,y+hh]);y+=hh});return tops}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.6,5.0,-1.4,2.0,.5);
    const tops=stack(R,k,e);
    if(k===0&&!nar)CTX.forEach(([t,h,s],i)=>R.label([XC-.65,(tops[i][0]+tops[i][1])/2,0],t+' ('+s+')',{fs:12.5,al:'right',dx:-8,c:mix(P.ink,P.c4,.4),grp:'ctx'}));
    if(k===0||k>=4)R.label([XC,0,.6],'context',{fs:13.5,b:1,c:P.c4,dy:18});
    // the model
    const ma=k<=1||k===5?1:.4;R.box([XM,0,0],[1.0,.06,1.0],{fill:mix(P.paper,P.soft,.5),a:ma});R.glass([XM,.06,-.6],[0,0,1.2],[0,1.3,0],{c:P.c2,a:ma,nu:5,nv:6});
    if(k<=1)R.label([XM,1.36,0],'model',{fs:13.5,b:1,c:P.c2,dy:-10,a:Math.max(.5,ma)});
    // context streams into the request; the conversation part with the most dots
    if(k===0||k===5)CTX.forEach(([t,h],i)=>{const m=(tops[i][0]+tops[i][1])/2;R.flow([[XC+.66,m,0],[XM-.05,Math.min(1.2,.2+m*.55),0]],{c:P.c4,r:.05+.02*(i===5),n:Math.max(2,Math.round(h*14)),speed:1.1,a:k===0?e:.6})});
    // the chain
    ENF.forEach(([x,t,c,s],i)=>{const on=k===2&&i===0||k===3&&i>0,a=on?1:k===0||k===1?.3:k>=4?.45:.2;
      R.glass([x,.04,-.75],[0,0,1.5],[0,1.05,0],{c:P[c],a:i===5?a*.6:a,nu:3,nv:4});
      if(on||k===1&&!nar)R.label([x,1.05,0],nar?t.split(' ')[0]:t+' ('+s+')',{fs:12.5,b:on,c:mix(P.ink,P[c],.35),dy:i>=1&&i<=3?(i===2?-30:-12):-12,a:on?1:.7,grp:'enf'})});
    R.box([XT,0,0],[.9,.7,1.0],{fill:mix(P.paper,P.good,.25),a:k===4?1:.45});if(k>0)R.label([XT,.7,0],k===4?'tool runs, output capped (2)':'tool',{fs:12.5,b:k===4,c:P.good,dy:-12});
    // the call: a ball from the model through the gates to the tool
    const path=[[XM+.1,Y,0],[ENF[0][0]-.25,Y,0],[ENF[4][0]+.3,Y,0],[XT-.5,Y,0]],seg=k===1?[0,1]:k===2?[1,1]:k===3?[1,2]:k===4?[2,3]:null;
    if(seg){const from=path[seg[0]],to=path[seg[1]],pos=k===2?to:lerp3(from,to,e);R.flow(path.slice(0,seg[1]+1).slice(0,-1).concat([pos]),{c:P.c2,r:.05,n:8,speed:1.3});R.ball(pos,.11,{c:P.c2})}
    if(k===1)R.label([XM,.06,.6],'text, or a tool call',{fs:12.5,c:P.c2,dy:18,b:1,a:e});
    if(k===2)R.label([ENF[0][0],.06,.75],'exit 2 blocks',{fs:12.5,c:P.c4,dy:18,b:1,a:e});
    if(k===3)R.label([.85,.06,.75],'first match decides',{fs:12.5,c:P.ink,dy:18,b:1,a:e,wide:1});
    // the result flows back along the front, past the PostToolUse hook, into the conversation
    if(k>=4){const top=tops[5][1],back=[[XT,.4,.5],[XT,.4,ZB],[1.6,.4,ZB],[XC+.2,.4,ZB],[XC+.2,top-.1,.5]];
      R.glass([1.6,.04,ZB-.5],[0,0,1.0],[0,.8,0],{c:P.c4,a:k===4?1:.4,nu:3,nv:3});if(k===4)R.label([1.6,.84,ZB],'PostToolUse hooks (4)',{fs:12.5,b:1,c:P.c4,dy:-10,wide:1});
      R.flow(back,{c:P.good,r:.06,n:14,speed:1.2,a:k===4?e:.5});if(k===4)R.label([XC+.2,.4,ZB],'result appended',{fs:12.5,b:1,c:P.good,dy:20,a:e})}
    // the end of a turn and the branches
    if(k===5){R.glass([XM+.95,.04,-.6],[0,0,1.2],[0,.9,0],{c:P.acc,a:1,nu:3,nv:3});R.label([XM+.95,.94,.6],'Stop hook (4)',{fs:12.5,b:1,c:P.acc,dy:-10,al:'left',dx:-4});
      R.box([XM-1.1,0,-1.3],[.7,.45,.5],{fill:mix(P.paper,P.c3,.35)});R.label([XM-1.1,.45,-1.3],'subagent (7)',{fs:12.5,b:1,c:P.c3,dy:-10,wide:1});
      R.flowArc([XM,.9,-.3],[XM-1.1,.45,-1.25],.4,{c:P.c3,r:.05,n:5,speed:1,a:e});
      R.label([XT,.7,0],'claude -p: result record (11)',{fs:12.5,b:1,c:P.ink,dy:-30,a:e,wide:1})}
  }
  const full={cam:[.36,.55],bounds:[[-5.4,0,-1.3],[4.7,1.6,1.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one turn of the loop',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:4800,draw,
    view:k=>k===0?{cam:[.5,.45],bounds:[[-6.9,0,-.8],[-1.4,1.6,.8]]}:k===2||k===3?{cam:[.45,.5],bounds:[[-1.6,0,-.9],[3.6,1.3,1.0]]}:full,
    margin:w=>w<520?[16,10,14,10]:[28,16,16,16]});
})();
