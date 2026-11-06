// ---- Scene: Fig. 4, a handoff (Agents SDK) or a transfer (ADK) replayed from the recorded requests (FT.mech, running example, local model,
// greedy). The agents stand on the left, the model in the middle, the tools offered in this request on the right; the history the model is
// sent is a stack of message slabs that rides with whoever is speaking. Tool names, message counts and replies are the recorded ones. ----
(function(){
  if(!document.getElementById('stg-ho'))return;const {mix,lerp,lerp3}=S3;
  const M=window.FT.mech,LIST={oai_handoff_greedy:'sx-ho-oai',adk_transfer_greedy:'sx-ho-adk'};
  const AG={oai_handoff_greedy:['triage','fixer','explainer'],adk_transfer_greedy:['coordinator','fixer','explainer']};
  let key='oai_handoff_greedy';
  const AX=-3.3,AZ=[-1.4,.1,1.6],MX=0,TX=2.9,SL=.075,TG=.78;
  const called=x=>{const m=/^TOOL CALL (\w+)/.exec(x.reply);return m?m[1]:null};
  function draw(R,k,e){const P=R.P,nar=R.W<520,w=M[key].wire,ag=AG[key],last=w.length-1;R.grid(-5,4.6,-2.6,2.6,.5);
    const spk=k<=1?0:1; // who speaks: the first agent until the transfer, then the fixer
    // the agents
    ag.forEach((nm,i)=>{const on=(k<=1&&i===0)||(k>=2&&i===1),a=on?1:.3;R.box([AX,0,AZ[i]],[1.1,.55,.9],{fill:mix(P.paper,i===0?P.c1:P.c2,on?.35:.15),a});
      R.label([AX-.55,.28,AZ[i]],nm,{fs:13,b:on,c:on?(i===0?P.c1:P.c2):P.mute,al:'right',dx:-8,a:Math.max(.5,a)})});
    // the model
    R.box([MX,0,0],[1.3,.85,1.5],{fill:mix(P.paper,P.c4,.25)});R.label([MX,.85,0],'model',{fs:13.5,b:1,c:P.c4,dy:-12});
    // the request this step is about, and its tools
    const ri=k===0||k===1?0:k===2?1:k===3?4:last,req=w[ri];
    const prevTools=k===2?w[0].tools:null,tools=req.tools;
    const showTools=(ts,a)=>ts.forEach((t,j)=>{const z=(j-(ts.length-1)/2)*TG,tr=/transfer/.test(t),hit=(k===1&&j===ts.indexOf(called(w[0])))||(k===3&&w.slice(1,last).some(x=>called(x)===t));
      R.box([TX,0,z],[.9,.26,.5],{fill:mix(P.paper,tr?P.acc:P.c3,tr?.35:.2),a:a*(hit||k===0||k===2?1:.45)});
      R.label([TX+.5,.13,z],t,{mono:true,fs:12,b:tr,c:tr?P.acc:P.ink,al:'left',dx:6,a:Math.max(.45,a*(hit||k===0||k===2?1:.5)),grp:'tools'})});
    if(prevTools&&e<.5)showTools(prevTools,1-e*2);else showTools(tools,k===2?(e-.5)*2:1);
    // the history: one slab per message in the request, riding with the speaker
    const n0=k===3?Math.round(lerp(w[1].msgs,w[4].msgs,e)):req.msgs;
    const from=[AX,.5,AZ[0]],to=[AX,.5,AZ[1]],base=k===2?lerp3(from,to,e):k<2?from:to;
    for(let s=0;s<n0;s++)R.box([base[0]+1.25,base[1]-.5+s*SL,base[2]+.25],[.55,.055,.6],{fill:mix(P.paper,P.c5,.5),shadow:s===0,lw:.6});
    R.label([base[0]+1.25,n0*SL,base[2]+.55],n0+' messages',{fs:12.5,b:1,c:P.c5,dy:14});
    // what moves this step
    const sp=[AX+1.6,.35,AZ[spk]+.25],md=[MX-.7,.35,0];
    if(k===0||k===2||k===3)R.flow([sp,md],{c:P.c5,r:.06,n:Math.min(14,4+req.msgs)});
    if(k===1){const j=w[0].tools.indexOf(called(w[0])),z=(j-(w[0].tools.length-1)/2)*TG;R.flowArc([MX+.7,.5,0],[TX-.5,.2,z],.4,{c:P.acc,r:.07,n:8});
      R.label([MX+.4,.85,-.6],w[0].reply.replace('TOOL CALL ','').slice(0,48),{mono:true,fs:12.5,b:1,c:P.acc,al:'left',dy:-14,a:e})}
    if(k===3){const cnt={};w.slice(1,last).forEach(x=>{const t=called(x);if(t)cnt[t]=(cnt[t]||0)+1});
      Object.entries(cnt).forEach(([t,c])=>{const j=tools.indexOf(t),z=(j-(tools.length-1)/2)*TG;R.flowArc([MX+.7,.45,0],[TX-.5,.2,z],.35,{c:P.c3,r:.05+.015*c,n:3+3*c})});
      R.label([MX,.85,0],'requests 2 to '+last,{fs:12.5,c:P.mute,dy:-32})}
    if(k===4){R.flowArc([MX-.7,.6,.2],[AX+.6,.6,AZ[1]+.2],.4,{c:P.c4,r:.06,n:6});const t=M[key].tests;
      R.label([MX,.85,0],'request '+w.length+': text, no tool call',{fs:12.5,b:1,c:P.c4,dy:-32,a:e});
      R.label([MX,0,.75],'tests '+(t&&t.pass?'pass':'still fail'),{fs:13,b:1,c:t&&t.pass?P.good:P.bad,dy:18,a:e})}
    if(k===2)R.label([AX,.5,(AZ[0]+AZ[1])/2],'switch agent',{fs:12.5,b:1,c:P.acc,dx:-70,a:Math.sin(Math.PI*e),wide:1});
  }
  const full={cam:[.3,.78],bounds:[[-4.0,0,-2.0],[3.6,1.0,2.0]]};
  const st=S3.stage({id:'stg-ho',list:LIST[key],fig:'Fig. 4 · a handoff, request by request',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[34,10,14,10]:[40,150,14,70]});
  RD.seg(document.getElementById('ftyped-ho-seg'),m=>{key=m;Object.entries(LIST).forEach(([k,id])=>document.getElementById(id).hidden=k!==key);st.list(LIST[key])});
})();
