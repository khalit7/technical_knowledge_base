// ---- Scene: Fig. 1, the hero (stg-hero): who talks to whom on this page, and the orange gates where something outside the model approves.
// Renderer v2. Structure only, from the specifications the sections cite; no measured values. One step per link, the rest receding; the last step shows all. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3)return;const {mix}=S3;
  const N={A:[-.9,0],tools:[-4.1,-1.7],person:[-4.3,1.3],B:[3.0,-1.9],shop:[3.7,.9],pay:[1.9,2.8],dev:[-1.9,2.9]};
  const at3=(n,y)=>[N[n][0],y,N[n][1]];
  function draw(R,k,e){const P=R.P,G=P.c2,PH6=k===6&&R.W<520;R.grid(-5.4,5.4,-3.4,3.6,.5);   // PH6: the last step on a phone keeps only Team A's name; the step text names the rest
    const show=s=>k===6||s.indexOf(k)>=0?1:.22; // which steps a part belongs to
    // Team A's agent, always central
    R.box(at3('A',0),[1.5,.95,1.3],{fill:mix(P.paper,P.acc,.25)});R.label(at3('A',.95),"Team A's agent",{b:1,fs:13,dy:-10});
    // 1. its own tools over MCP
    let a=show([0]);[-.45,0,.45].forEach((dz,i)=>R.box([N.tools[0]+(i-1)*.15,0,N.tools[1]+dz],[.5,.35+.1*i,.35],{fill:mix(P.paper,P.c6,.4),a}));
    R.label(at3('tools',.55),'its own tools',{fs:12.5,b:a>.5,c:a>.5?P.ink:P.mute,dy:-8,a:Math.max(.45,a),wide:a<.5||PH6});
    if(k===0||k===6){R.flowArc([N.A[0]-.7,.5,N.A[1]-.3],[N.tools[0]+.3,.4,N.tools[1]],.45,{c:P.c6,r:.07,n:8,speed:1.5});R.flowArc([N.tools[0]+.3,.3,N.tools[1]+.3],[N.A[0]-.7,.35,N.A[1]],.25,{c:P.c6,r:.06,n:6,speed:1.3,a:.7})}
    if(k===0)R.label([(N.A[0]+N.tools[0])/2,.95,(N.A[1]+N.tools[1])/2],'MCP',{mono:true,fs:13,b:1,c:P.c6});
    // 2. A2A to Team B's opaque agent; its own tools hidden behind glass
    a=show([1,2]);R.box(at3('B',0),[1.6,1.0,1.2],{fill:mix(P.paper,P.ink,.3),a});R.label(at3('B',1.0),"Team B's agent (opaque)",{b:1,fs:12.5,dy:-10,a:Math.max(.45,a),wide:a<.5||PH6});
    R.glass([N.B[0]+.95,.05,N.B[1]-.7],[0,0,1.4],[0,1.0,0],{c:P.ink,nu:1,nv:1,a:.3*a});[0,1].forEach(i=>R.box([N.B[0]+1.45,0,N.B[1]-.35+.7*i],[.4,.35,.35],{fill:mix(P.paper,P.c6,.3),a:a*.35}));
    if(k===1||k===6){R.flowArc([N.A[0]+.6,.6,N.A[1]-.4],[N.B[0]-.7,.6,N.B[1]+.2],.5,{c:P.acc,r:.08,n:10,speed:1.5});R.flowArc([N.B[0]-.7,.4,N.B[1]+.45],[N.A[0]+.6,.4,N.A[1]-.1],.3,{c:P.c4,r:.065,n:7,speed:1.3})}
    if(k===1)R.label([(N.A[0]+N.B[0])/2,1.25,(N.A[1]+N.B[1])/2],'A2A · a task, states, artifacts',{mono:true,fs:12.5,b:1,c:P.acc});
    // 3. the person, and the grant that goes straight to Team B
    a=show([2,3,4]);R.box(at3('person',0),[.55,.85,.55],{fill:mix(P.paper,G,.35),a});R.label(at3('person',.85),'a person on Team A\'s side',{fs:12.5,b:a>.5,c:a>.5?G:P.mute,dy:-8,a:Math.max(.45,a),wide:a<.5||PH6});
    if(k===2||k===6){R.flowArc([N.person[0]+.3,.7,N.person[1]-.3],[N.B[0]-.5,.9,N.B[1]],1.2,{c:G,r:.08,n:12,speed:1.3});R.glow([N.B[0]-.5,.9,N.B[1]],.5,{c:G,a:.7});
      R.label([(N.person[0]+N.B[0])/2,1.95,(N.person[1]+N.B[1])/2],R.W<520?'auth-required: out of band':'auth-required: the grant goes out of band',{fs:12.5,b:1,c:G,dy:R.W<520?-18:0})}
    // 4. a merchant over UCP, with the escalation gate
    a=show([3]);R.box(at3('shop',0),[1.3,.8,1.0],{fill:mix(P.paper,P.c5,.3),a});R.label(at3('shop',.8),'merchant (UCP business)',{fs:12.5,b:1,dy:-8,a:Math.max(.45,a),wide:a<.5||PH6});
    R.glass([N.shop[0]-.85,.02,N.shop[1]-.55],[0,0,1.1],[0,.9,0],{c:G,nu:2,nv:3,a:Math.max(.25,a)});
    if(k===3||k===6){R.flowArc([N.A[0]+.75,.5,N.A[1]+.2],[N.shop[0]-.9,.5,N.shop[1]],.45,{c:P.c5,r:.075,n:9,speed:1.5});
      if(k===3){R.flowArc([N.person[0]+.3,.5,N.person[1]+.1],[N.shop[0]-.9,.6,N.shop[1]+.3],.9,{c:G,r:.07,n:10,speed:1.2});R.label([N.shop[0],0,N.shop[1]+.6],'requires_escalation: the buyer finishes on continue_url',{fs:12.5,b:1,c:G,dy:18,al:'right',dx:50})}}
    if(k===3)R.label([(N.A[0]+N.shop[0])/2,.95,(N.A[1]+N.shop[1])/2],'UCP · a checkout session',{mono:true,fs:12.5,b:1,c:P.c5});
    // 5. paying: AP2 mandates or an x402 signed payment
    a=show([4]);R.box(at3('pay',0),[1.2,.6,.9],{fill:mix(P.paper,P.c3,.3),a});R.label(at3('pay',.6),'payment',{fs:12.5,b:1,dy:-8,a:Math.max(.45,a),wide:a<.5||PH6});
    R.glass([N.pay[0]-.8,.02,N.pay[1]-.5],[0,0,1.0],[0,.75,0],{c:G,nu:2,nv:3,a:Math.max(.25,a)});
    if(k===4||k===6){R.flowArc([N.A[0]+.5,.5,N.A[1]+.6],[N.pay[0]-.85,.45,N.pay[1]],.5,{c:P.c3,r:.075,n:9,speed:1.5});
      if(k===4){R.flowArc([N.person[0]+.3,.6,N.person[1]+.3],[N.A[0]-.6,.7,N.A[1]+.5],.6,{c:G,r:.08,n:8,speed:1.2});R.label([N.pay[0],0,N.pay[1]+.5],'AP2: a mandate the user signed · x402: a signed payment',{fs:12.5,b:1,c:G,dy:18,al:'right',dx:40})}}
    if(k===4)R.label([(N.A[0]+N.pay[0])/2,.9,(N.A[1]+N.pay[1])/2],'AP2 or x402',{mono:true,fs:12.5,b:1,c:P.c3});
    // 6. a lab device through MHS, limits below the model
    a=show([5]);R.glass([N.dev[0]-.65,.42,N.dev[1]-.5],[1.3,0,0],[0,0,1.0],{c:G,nu:4,nv:3,a:Math.max(.25,a)});R.box(at3('dev',0),[1.1,.4,.85],{fill:mix(P.paper,P.ink,.15),a});
    R.box([N.dev[0],.47,N.dev[1]],[.6,.35,.5],{fill:mix(P.paper,P.c4,.3),a,shadow:false});R.label(at3('dev',.85),'lab device (MHS driver)',{fs:12.5,b:1,dy:-8,a:Math.max(.45,a),wide:a<.5||PH6});
    if(k===5||k===6){R.flowArc([N.A[0],.5,N.A[1]+.65],[N.dev[0],.85,N.dev[1]-.2],.4,{c:P.c4,r:.075,n:8,speed:1.4});if(k===5)R.label([N.dev[0],.42,N.dev[1]+.5],'safety limits below the model',{fs:12.5,b:1,c:G,dy:18})}
    if(k===5)R.label([(N.A[0]+N.dev[0])/2+.3,.8,(N.A[1]+N.dev[1])/2],'MHS · read and write',{mono:true,fs:12.5,b:1,c:P.c4});
    if(k===6)R.label([0,0,3.6],'orange: a person, a signature or a device limit decides',{fs:13,b:1,c:G,dy:14});
  }
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · who talks to whom, and the orange gates',cam:[.25,.82],bounds:[[-4.8,0,-2.7],[4.6,.9,3.5]],aspect:.6,dur:1400,hold:4600,draw,
    margin:w=>w<520?[16,8,12,8]:[20,16,14,16],
    view:k=>k===0?{cam:[.3,.75],bounds:[[-4.8,0,-2.6],[.6,1.0,1.0]]}:k===1||k===2?{cam:[.2,.75],bounds:[[-4.8,0,-2.8],[4.6,1.2,1.9]]}:k===5?{cam:[.3,.75],bounds:[[-3.4,0,-.6],[1.0,1.0,3.6]]}:null});
})();
