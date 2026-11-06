// ---- Scene: Fig. 3, the recorded crash, resume, pause and rewind of a LangGraph StateGraph with a SQLite checkpointer (renderer v2).
// Data: window.ORCH.lg (the Orchestration lab's redacted recording, 32_js_a_data.js): its 30 events grouped into six stretches, the eleven
// checkpoint rows read back with get_state_history, and the five processes that ran the graph. Step 7 (Temporal) is a picture of the other
// family of durability, not a run: Temporal was not run here, and the step says so. ----
(function(){
  if(!document.getElementById('stg-dur'))return;const {mix,lerp}=S3;
  const NODES=[['read_and_test','read + test','code'],['diagnose','diagnose','llm'],['propose_fix','propose fix','llm'],['human_review','human review','human'],['apply_and_test','apply + test','code']];
  const NX=i=>-4+i*2,YN=0,ZN=.15,ZC0=-1.55,ZC1=-2.45,ZPR=2.05;
  let D=null;
  function data(){if(D)return D;const L=window.ORCH&&window.ORCH.lg;if(!L)return null;const ev=L.events;
    const CK=L.final.slice().sort((a,b)=>a.t-b.t),byId={};CK.forEach(c=>byId[c.id]=c);
    CK.forEach(c=>{let x=c,b=0;while(x){if(x.source==='update'){b=1;break}x=byId[x.parent]}c.br=b});
    const dg=ev.find(e=>e.what==='llm_done'&&e.node.startsWith('diag')),pr=ev.filter(e=>e.what==='llm_done'&&e.node.startsWith('propose'));
    const kill=ev.find(e=>e.what==='SIGKILL'),ps=ev.find(e=>e.node==='propose_fix'&&e.what==='start');
    // the stretches end at these moments of the recording (seconds from the first process start)
    const T=[dg.t-12,dg.t+.01,kill.t+.01,pr[0].t+.01,ev.filter(e=>e.what==='process_end')[1].t+.01,ev[ev.length-1].t+.01,ev[ev.length-1].t+.01];
    return D={CK,T,dg,pr,kill,ps}}
  // which processes have run by each step, and how each ended: start (killed), resume (paused at the interrupt), approve, fork (paused), approve
  const PS=[[['1 start','run']],[['1 start','run']],[['1 start','dead']],[['1 start','dead'],['2 resume','run']],[['1 start','dead'],['2 resume','paused'],['3 approve','done']],[['1 start','dead'],['2 resume','paused'],['3 approve','done'],['4 fork','paused'],['5 approve','done']],[]];
  // the node each stretch is about, and the nodes it ran
  const ACT=[[0,1],[1],[2],[2],[3,4],[2,3,4],[]];
  function draw(R,k,e){const P=R.P,d=data();if(!d)return;const nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-5.4,5.4,-3,2.5,.5);
    const tNow=lerp(k?d.T[k-1]:0,d.T[k],k===0?1:e),tmp=k===6;
    const col=t=>t==='llm'?P.c1:t==='human'?P.c5:mix(P.paper,P.ink,.25);
    // the graph's five nodes and its edges
    NODES.forEach(([id,lab,t],i)=>{const on=ACT[k].includes(i),a=tmp?.55:on?1:.4;
      R.box([NX(i),YN,ZN],[1.45,.45,.8],{fill:mix(P.paper,col(t),t==='code'?.15:.45),a,lw:on?1.3:.8});
      R.label([NX(i),.45,ZN],lab,{fs:12.5,b:on,c:t==='code'?P.ink:col(t),dy:-10,a:Math.max(.5,a)});
      if(i<4)R.line([[NX(i)+.74,.22,ZN],[NX(i+1)-.74,.22,ZN]],{c:P.mute,w:1.4,a:.6,head:6})});
    // the checkpoint rows (SQLite, thread "fix-1"): each row appears when it was written; a second row for the rewound branch
    const ckX=c=>-4.6+(c.step+1)*1.3;
    if(!tmp){R.box([.2,0,(ZC0+ZC1)/2],[10.3,.06,1.65],{fill:mix(P.paper,P.c5,.08),a:.9,shadow:false,dz:1000});
      R.label([-5.15,.06,ZC0],nar?'checkpoints':'checkpoints · SQLite · thread "fix-1"',{fs:12,al:'left',c:P.c5,b:1,dy:-14});
      d.CK.forEach(c=>{if(c.t>tNow+.02)return;const z=c.br?ZC1:ZC0,fresh=k>0&&c.t>(d.T[k-1]||0);
        const f=c.interrupt?P.c5:c.source==='update'?P.c4:c.next.length===0?P.good:P.paper;
        R.box([ckX(c),.06,z],[.62,.2,.5],{fill:mix(P.paper,f,f===P.paper?0:.6),a:fresh?1:.6,lw:fresh?1.2:.7,shadow:false});
        const p=c.parent&&d.CK.find(x=>x.id===c.parent);if(p&&p.t<=tNow+.02)R.line([[ckX(p)+.31,.16,p.br?ZC1:ZC0],[ckX(c)-.31,.16,z]],{c:P.mute,w:1,a:.5})});
      // flows: a finished node writes its row; a resume reads the newest row back
      if(k===1)R.flowArc([NX(1),.3,ZN-.4],[ckX(d.CK.find(c=>c.step===2&&!c.br)),.26,ZC0],.4,{c:P.c5,a:fa,r:.06,n:6,speed:1.1});
      if(k===3)R.flowArc([ckX(d.CK.find(c=>c.step===2&&!c.br)),.26,ZC0],[NX(2),.3,ZN-.4],.55,{c:P.c5,a:fa,r:.065,n:7,speed:1.1});
      if(k===4)R.flowArc([NX(3),.3,ZN-.4],[ckX(d.CK.find(c=>c.interrupt&&!c.br)),.26,ZC0],.4,{c:P.c5,a:fa,r:.06,n:5,speed:1});
      if(k===5)R.flowArc([ckX(d.CK.find(c=>c.step===2&&!c.br)),.26,ZC0],[ckX(d.CK.find(c=>c.source==='update')),.26,ZC1],.45,{c:P.c4,a:fa,r:.065,n:6,speed:1})}
    // a model call in flight: dots from the node up to the provider and back (the one cut by SIGKILL stops at step 3)
    if(k===1)R.flowArc([NX(1),.45,ZN],[NX(1)+.6,1.35,ZN],.1,{c:P.c1,a:fa,r:.06,n:5,speed:1});
    if(k===3)R.flowArc([NX(2),.45,ZN],[NX(2)+.6,1.35,ZN],.1,{c:P.c1,a:fa,r:.06,n:5,speed:1});
    if(k===2){R.line([[NX(2),.45,ZN],[NX(2)+.35,.95,ZN]],{c:P.bad,w:2.2,a:1-.5*e});R.label([NX(2)+.4,1,ZN],'SIGKILL',{mono:true,fs:12.5,b:1,c:P.bad,dy:-6})}
    // the processes that ran the graph, in front
    const ps=PS[k],WORD={run:'running',dead:'killed',paused:'paused',done:'done'};ps.forEach(([n,s],i)=>{const x=-4+i*2,c=s==='dead'?P.bad:s==='paused'?P.c5:s==='done'?P.mute:P.good,fresh=i===ps.length-1||(k===5&&i>=3);
      R.box([x,0,ZPR],[1.5,.24,.55],{fill:mix(P.paper,c,.45),a:fresh?1:.55});R.label([x,.24,ZPR],nar?n.split(' ')[0]:'process '+n.split(' ')[0]+' · '+WORD[s],{fs:12,c:fresh?P.ink:P.mute,b:fresh,dy:15})});
    // 7. Temporal (not run here): an event history of completed activities; after a crash the workflow code runs again from the top and every
    // recorded result is replayed from the history instead of calling the model again
    if(tmp){const hx=-5.15;for(let i=0;i<5;i++)R.box([hx+.75,.02+i*.12,ZC0-.2],[1.3,.1,.7],{fill:mix(P.paper,P.c6,.45),a:fa,shadow:i===0,lw:.7});
      R.label([hx+.75,.7,ZC0-.2],'event history',{fs:12.5,b:1,c:P.c6,dy:-8,a:fa});
      NODES.forEach((n,i)=>R.flowArc([hx+1.3,.5,ZC0-.2],[NX(i),.47,ZN-.2],.3+.08*i,{c:P.c6,a:fa,r:.055,n:4,speed:1.6}));
      R.label([0,0,ZPR],nar?'replayed, not called again':'every result replayed from the history, not called again',{fs:13,c:P.c6,b:1,a:fa})}
  }
  const full={cam:[.08,.8],bounds:[[-5.3,0,-2.8],[5.1,1.1,2.5]]};
  S3.stage({id:'stg-dur',list:'sx-dur',fig:'Fig. 3 · one recorded run: kill, resume, pause, rewind',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1400,hold:5200,draw,
    view:k=>k===2||k===3?{cam:[.15,.7],bounds:[[-3.2,0,-2.2],[2.6,1.4,2.5]]}:full});
})();
