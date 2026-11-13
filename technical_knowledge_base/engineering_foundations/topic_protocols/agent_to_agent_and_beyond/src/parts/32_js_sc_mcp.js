// ---- Scene: Fig. 4 (section 10, stg-mcp), the same evaluation over MCP (front row: Team A's model drives Team B's three tools) and over A2A
// (back row: Team A delegates to Team B's agent, whose tools stay hidden behind it). Renderer v2. Data: window.A2AD.scen.mcp and .main, the
// recorded runs (mcp 2.3.0 and a2a-sdk 1.2.2, 5 October 2026), and their ctx_items: the characters Team A's model must read, item by item.
// The glass column beside each Team A fills to scale with those characters; steps 1 to 3 are MCP, 4 to 6 A2A, 7 both. ----
(function(){
  if(!document.getElementById('stg-mcp')||!window.S3||!window.A2AD)return;const D=window.A2AD,{mix,at}=S3;
  const M=D.scen.mcp,A=D.scen.main,fmt=n=>n.toLocaleString('en-GB');
  // ctx_items grouped by step: MCP tools/list | list_suites, the user's choice, load_checkpoint | three run_shard; A2A card | working, question | the rest
  const GM=[[0],[1,2,3],[4,5,6]],GA=[[0],[1,2],[3,4,5,6,7,8]];
  const cum=(items,G)=>{let s=0;return G.map(g=>{g.forEach(i=>s+=items[i].chars);return s})};
  const CM=cum(M.ctx_items,GM),CA=cum(A.ctx_items,GA);window.A2A_MCP_CUM={mcp:CM,a2a:CA}; // read by src/check_stages.mjs
  const MAX=Math.max(CM[2],CA[2]),HM=1.9,ZF=1.6,ZB=-1.6,AX=-2.4,MX=-4.3,TOOLS=[['list_suites',1.8],['load_checkpoint',3.1],['run_shard',4.4]],BX=3.1;
  function meter(R,z,v,c,a,lab){const P=R.P,h=HM*v/MAX;R.glass([MX-.3,0,z-.3],[.6,0,0],[0,HM,0],{c:P.mute,nu:1,nv:6,a:.35*a+.1});
    if(h>.01)R.box([MX,0,z],[.42,h,.42],{fill:mix(P.paper,c,.75),a,shadow:false});R.label([MX,h,z],fmt(v)+' chars',{mono:true,fs:12.5,b:1,c,a:Math.max(.35,a),dy:-10,wide:a<.5});
    if(lab)R.label([MX,0,z+.35],lab,{fs:12,c:P.mute,dy:16,a:Math.max(.35,a),wide:1})}
  function draw(R,k,e){const P=R.P;R.grid(-5.2,5.4,-3,3,.5);
    const fa=k<=2||k===6?1:.22,ba=k>=3?1:.22,sh=t=>R.W<520?t.split(' · ')[0].split(' → ')[0]:t;   // a phone: the receding row's labels hide (wide) and each message keeps only its first part
    // front: MCP
    R.box([AX,0,ZF],[1.3,.75,1.0],{fill:mix(P.paper,P.acc,.22),a:fa});R.label([AX,.75,ZF],'Team A · MCP client',{b:1,fs:12.5,dy:-10,a:Math.max(.4,fa),wide:fa<.5});
    TOOLS.forEach(([n,x],i)=>{const used=(k===0)||(k===1&&i<2)||(k===2&&i===2)||k===6;R.box([x,0,ZF],[1.0,.5,.8],{fill:mix(P.paper,P.c6,used?.45:.12),a:fa});
      R.label([x,.5,ZF],n,{mono:true,fs:12,b:used&&k<3,c:used?P.ink:P.mute,dy:-8,a:Math.max(.4,fa),grp:'tools'})});
    R.label([3.15,0,ZF+.55],"Team B's tools, visible to Team A",{fs:12,c:P.mute,dy:16,a:Math.max(.35,fa),wide:1});
    const cmv=k===0?CM[0]*Math.min(1,e*1.3):k===1?CM[0]+(CM[1]-CM[0])*e:k===2?CM[1]+(CM[2]-CM[1])*e:CM[2];
    meter(R,ZF,Math.round(cmv),P.c2,fa);
    // back: A2A
    R.box([AX,0,ZB],[1.3,.75,1.0],{fill:mix(P.paper,P.acc,.22),a:ba});R.label([AX,.75,ZB],'Team A · A2A client',{b:1,fs:12.5,dy:-10,a:Math.max(.4,ba),wide:ba<.5});
    R.box([BX,0,ZB],[1.7,1.0,1.2],{fill:mix(P.paper,P.ink,.3),a:ba});R.label([BX,1.0,ZB],"Team B's agent",{b:1,fs:12.5,dy:-10,a:Math.max(.4,ba),wide:ba<.5});
    R.glass([BX-1.0,.05,ZB-.7],[0,0,1.4],[0,.95,0],{c:P.ink,nu:1,nv:1,a:.25*ba+.05});
    const cav=k<3?0:k===3?CA[0]*Math.min(1,e*1.3):k===4?CA[0]+(CA[1]-CA[0])*e:k===5?CA[1]+(CA[2]-CA[1])*e:CA[2];
    meter(R,ZB,Math.round(cav),P.c1,ba);
    // the messages of this step
    const fa0=[AX+.65,.5,ZF],ba0=[AX+.65,.5,ZB];
    if(k===0){R.flowArc(fa0,[TOOLS[1][1],.5,ZF],.6,{c:P.acc,r:.07,n:7,speed:1.6});R.flowArc([TOOLS[1][1],.5,ZF],[MX+.2,.9,ZF],.9,{c:P.c2,r:.08,n:16,speed:1.4});
      R.label([1.0,1.8,ZF],sh('tools/list · '+fmt(M.ctx_items[0].chars)+' chars of schemas'),{mono:true,fs:12.5,b:1,dy:R.W<520?-22:0,c:P.c2})}
    if(k===1){[0,1].forEach(i=>{R.flowArc(fa0,[TOOLS[i][1],.5,ZF],.5+.2*i,{c:P.acc,r:.07,n:6,speed:1.6});R.flowArc([TOOLS[i][1],.4,ZF+.2],[MX+.2,.5,ZF],.4,{c:P.c2,r:.065,n:5,speed:1.5})});
      R.label([1.0,1.8,ZF],sh('list_suites, then load_checkpoint → handle h-step-4000'),{mono:true,fs:12.5,b:1,dy:R.W<520?-22:0,c:P.c2})}
    if(k===2){[-.25,0,.25].forEach((dz,i)=>{R.flowArc([AX+.65,.5,ZF+dz],[TOOLS[2][1],.5,ZF+dz],.5+.18*i,{c:P.acc,r:.065,n:5,speed:1.6});R.flowArc([TOOLS[2][1],.35,ZF+dz],[MX+.2,.4,ZF+dz],.3,{c:P.c2,r:.06,n:4,speed:1.5})});
      R.label([1.0,1.8,ZF],sh('run_shard × 3 · '+M.requests+' HTTP requests in all'),{mono:true,fs:12.5,b:1,dy:R.W<520?-22:0,c:P.c2})}
    if(k===3){R.flowArc([BX,.6,ZB],[MX+.2,.7,ZB],.7,{c:P.c1,r:.07,n:8,speed:1.5});R.flowArc(ba0,[BX-.85,.6,ZB],.5,{c:P.acc,r:.08,n:8,speed:1.6});
      R.label([1.0,1.8,ZB],sh('card skills · '+fmt(A.ctx_items[0].chars)+' chars, then one goal'),{mono:true,fs:12.5,b:1,dy:R.W<520?-22:0,c:P.c1})}
    if(k===4){R.flowArc([BX-.85,.6,ZB],[MX+.2,.6,ZB],.55,{c:P.c2,r:.08,n:8,speed:1.4});R.flowArc(ba0,[BX-.85,.5,ZB],.3,{c:P.acc,r:.07,n:6,speed:1.6});
      R.label([1.0,1.8,ZB],sh('"Which suite?" · answered in the same task'),{mono:true,fs:12.5,b:1,dy:R.W<520?-22:0,c:P.c2})}
    if(k===5){R.flowArc([BX-.85,.5,ZB],[MX+.2,.5,ZB],.45,{c:P.c4,r:.075,n:12,speed:1.4});R.label([1.0,1.8,ZB],sh('progress, scores, done · '+A.requests+' HTTP requests in all'),{mono:true,fs:12.5,b:1,dy:R.W<520?-22:0,c:P.c4})}
    if(k===6){R.label([MX,HM+.5,0],fmt(CM[2])+' against '+fmt(CA[2])+' characters',{fs:13,b:1,c:P.ink,dy:R.W<520?-30:0})}
  }
  S3.stage({id:'stg-mcp',list:'sx-mcp',fig:'Fig. 4 · the same job, MCP in front, A2A behind',cam:[.12,.66],bounds:[[-5.4,0,-2.4],[5.0,2.0,2.4]],aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,12,8]:[20,16,14,16],
    view:k=>k<=2?{cam:[.25,.58],bounds:[[-5.4,0,.4],[5.0,2.0,2.4]]}:k<=5?{cam:[.05,.6],bounds:[[-5.4,0,-2.4],[5.0,2.0,-.6]]}:null});
})();
