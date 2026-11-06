// ---- Scene: Fig. 3, one support message through a handoff and through agents as tools (renderer v2). Every step is one request
// the logging proxy recorded in run 1 of each design (FM.handoffs, openai-agents 0.23.1, Qwen3-4B on a local server): the agent it was
// sent to, the messages it carried (one slab per message, coloured by role, stacked on the agent), and the tools it called (flows).
// The live viewer on the left (26_js_handoff.js, FMHO.show) prints the same request's messages as text. ----
(function(){
  if(!document.getElementById('stg-ho')||!window.FMHO)return;const {at,mix}=S3;
  const runOf=FMHO.runOf,who=FMHO.who;let mode='handoff';
  // numbers quoted in the step lists: prompt tokens and message count of request i of run 1
  document.querySelectorAll('.fm-v[data-v^="ho."]').forEach(el=>{const m=/^ho\.(\w+)\.(\d+)\.(pt|m)$/.exec(el.dataset.v);if(!m)return;const r=runOf(m[1]),q=r&&r.reqs[+m[2]-1];if(!q)return;
    el.textContent=m[3]==='pt'?String(q.usage.prompt_tokens||0):String(q.msgs.length);el.classList.remove('fm-miss')});
  const POS={customer:[-3.4,0],triage:[-1.1,0],manager:[-1.1,0],billing:[1.5,-1.15],tech:[1.5,1.15]};
  const TOOL={lookup_invoice:[3.4,-1.65],refund_charge:[3.4,-.7],check_status:[3.4,1.15]};
  const top=(n,y)=>[POS[n][0],y==null?.65:y,POS[n][1]];
  const ROLE=P=>({system:mix(P.paper,P.mute,.35),user:mix(P.paper,P.c2,.55),assistant:mix(P.paper,P.c1,.45),tool:mix(P.paper,P.c3,.5)});
  function agentBox(R,n,a,hot){const P=R.P,[x,z]=POS[n];R.box([x,0,z],[.8,.6,.8],{fill:hot?mix(P.paper,P.c1,.4):mix(P.paper,P.c1,.18),a});
    R.label([x,0,z+.4],n,{fs:12.5,b:hot,dy:14,a:Math.max(.5,a),c:hot?P.c1:P.ink})}
  function draw(R,k,e){const P=R.P,r=runOf(mode),q=r.reqs[k],cur=who(q.agent),prev=k>0?who(r.reqs[k-1].agent):null,front=mode==='as_tool'?'manager':'triage',last=k===r.reqs.length-1;
    R.grid(-4.2,4.2,-2.4,2.4,.5);
    // the customer and the agents; the one this request was sent to is solid
    R.box([POS.customer[0],0,0],[.5,.16,.42],{fill:mix(P.paper,P.c5,.5)});R.label([POS.customer[0],0,.21],'customer',{fs:12.5,dy:14});
    [front,'billing','tech'].forEach(n=>agentBox(R,n,n===cur?1:n===prev?.55:.3,n===cur));
    // tools, under the specialist that owns them; a tool glows when this request calls it
    const called=q.calls.map(c=>c[0]);
    Object.entries(TOOL).forEach(([t,[x,z]])=>{const on=called.includes(t),own=t==='check_status'?'tech':'billing',a=on?1:own===cur?.6:.25;
      R.box([x,0,z],[.5,.26,.5],{fill:on?mix(P.paper,P.c2,.45):P.paper,a});R.label([x+.25,.11,z],t,{mono:true,fs:12,al:'left',dx:6,a:Math.max(.45,a),c:on?P.c2:P.mute,wide:1});
      if(t==='refund_charge'&&last)R.label([x,.22,z],'never called',{fs:12,b:1,c:P.bad,dy:-12})});
    // the request: a stack of message slabs on the agent it was sent to, the new ones lit
    const prevSame=k>0&&prev===cur?r.reqs[k-1].msgs.length:0,RC=ROLE(P),[ax,az]=POS[cur];
    q.msgs.forEach((m,i)=>{const nw=i>=prevSame,y=.6+i*.12,t=nw?Math.min(1,Math.max(0,e*1.6-(i-prevSame)*.15)):1;
      R.box([ax,y,az],[.66,.1,.66],{fill:RC[m[0]]||RC.user,a:nw?t:.85,shadow:false,lw:.6});
      if(nw&&i===q.msgs.length-1)R.glow([ax,y+.06,az],.35,{c:P.c6,a:.5*t})});
    R.label([ax,.6+q.msgs.length*.12,az],q.msgs.length+' messages · '+(q.usage.prompt_tokens||0)+' prompt tokens',{fs:12,b:1,dy:-16,c:P.c6});
    // how the request got here: the customer's message, the whole history moving with a handoff, or a generated input from the manager
    if(k===0)R.flowArc([POS.customer[0],.2,0],top(cur,.6),.35,{c:P.c5,a:1,r:.06,n:5});
    else if(prev!==cur){if(mode==='as_tool'&&cur!=='manager')R.flowArc(top(prev,.6),top(cur,.6),.4,{c:P.c2,a:1,r:.05,n:3});
      else if(mode==='as_tool')R.flowArc(top(prev,.6),top(cur,.6),.4,{c:P.c4,a:1,r:.06,n:5});
      else R.flowArc(top(prev,.9),top(cur,.9),.5,{c:P.c6,a:1,r:.065,n:9})}
    // what it called
    q.calls.forEach((c,j)=>{const n=c[0];
      if(/^transfer_to_/.test(n)){const to=n.replace('transfer_to_',''),first=q.calls.findIndex(x=>/^transfer_to_/.test(x[0]))===j;
        if(first){R.flowArc(top(cur,1.0),top(to,1.0),.4,{c:P.c6,a:e,r:.06,n:7});R.label(top(to,1.1),'takes over, with the whole history',{fs:12,dy:-14,c:P.c6,a:e})}
        else{const a0=top(cur,1.0),b0=top(to,1.0),m=[a0[0]+(b0[0]-a0[0])*.6,1.1,a0[2]+(b0[2]-a0[2])*.6];R.line([a0,m],{c:P.bad,w:2,dash:[5,4],a:e});
          R.label(m,'second transfer ignored',{fs:12,b:1,al:'left',dx:6,dy:10,c:P.bad,a:e,wide:1})}}
      else if(/^ask_/.test(n)){const to=n.replace('ask_','');R.flowArc(top(cur,.8),top(to,.8),.35,{c:P.c2,a:1,r:.05,n:4});R.label(top(to,.8),'only a generated input',{fs:12,dy:-16,c:P.c2,a:e,wide:1})}
      else{const [x,z]=TOOL[n]||[0,0];R.flowArc(top(cur,.6),[x,.25,z],.3,{c:P.c2,a:1,r:.05,n:4})}});
    if(mode==='handoff_mesh'&&cur==='billing'){const a0=top('billing',.6),b0=top('tech',.6);R.line([a0,b0],{c:P.mute,w:1.4,dash:[3,4],a:.7});R.label([(a0[0]+b0[0])/2+.3,.6,(a0[2]+b0[2])/2],'transfer_to_tech: offered, never called',{fs:12,al:'left',dx:6,c:P.mute})}
    // the final reply goes back to the customer
    if(last){R.flowArc(top(cur,.7),[POS.customer[0],.2,0],.6,{c:P.c4,a:e,r:.06,n:6});
      const claims=r.score&&r.score.reply_claims_refund&&!r.score.refund_done;R.label([POS.customer[0],.2,0],claims?'reply promises a refund':'reply to the customer',{fs:12,b:1,dy:-24,c:claims?P.bad:P.c4,a:e})}
  }
  const st=S3.stage({id:'stg-ho',list:'sx-ho-handoff',fig:'Fig. 3 · the same message, request by request',cam:[.15,.6],bounds:[[-3.8,0,-2],[4.3,1.6,2]],aspect:.5,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,16,14],onStep:k=>{try{FMHO.show(mode,k)}catch(err){}}});
  RD.seg(document.getElementById('fm-hoseg'),m=>{mode=m;['handoff','handoff_mesh','as_tool'].forEach(x=>document.getElementById('sx-ho-'+x).hidden=x!==m);st.list('sx-ho-'+m)});
})();
