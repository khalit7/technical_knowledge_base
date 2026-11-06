// ---- Scene: Fig. 1, the idea in one picture (renderer v2, 2026-11-06). The running example's graph (section 2) on the floor, its shared state behind it,
// the SqliteSaver's checkpoints stacked on the right, the model above the diagnoses. It plays run A of section 5 (durability "sync", real Claude Haiku 4.5
// calls through claude -p): killed while one diagnosis was in flight, resumed by a second process, paused at interrupt(), approved by a third.
// Times, calls and cost come from FLG.e6.runs.A; the stored totals (checkpoints, writes) from its database read back after the run. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const D=window.FLG,A=D.e6.runs.A,G=window.FLG3;
  const pos=G.layout(FLGG.LAYOUT.real,-4.9,1.9,-.4,1.5);
  const call=(n,p)=>A.calls.find(c=>c.node===n&&c.process===p)||{};
  const ret=A.calls.filter(c=>c.t1!==null),cost=ret.reduce((s,c)=>s+c.cost,0);
  const s1=x=>Number(x).toFixed(1)+' s';
  const tw=call('diagnose_top_words','start'),wc=call('diagnose_word_count','resume'),pf=call('propose_fix','resume');
  const pause=(A.events.find(e=>e.what==='process_end'&&e.process==='resume')||{}).t;
  const NAME={read_and_test:'read_and_test',diagnose_word_count:'diagnose word_count',diagnose_top_words:'diagnose top_words',propose_fix:'propose_fix',human_review:'human_review',apply_and_test:'apply_and_test'};
  const EDGES=window.FLG_REAL_EDGES;
  // the shared state: one column per key, behind the graph; diagnoses is a list with an operator.add reducer, so it holds one block per diagnosis
  const KEYS=['core','test_output','diagnoses','patch','decision','passed'],ZS=1.55,KX=k=>-5.0+KEYS.indexOf(k)*1.45;
  const DB=[4.6,0,-.4],ZM=-2.3;
  // per step: node states, filled state keys (diagnoses: number of items), checkpoints stacked, process
  const NODES=['read_and_test','diagnose_word_count','diagnose_top_words','propose_fix','human_review','apply_and_test'];
  const S=[
    {proc:1,ns:{},keys:{},ck:2},
    {proc:1,ns:{read_and_test:'run'},keys:{core:1,test_output:1},ck:3,wr:['read_and_test',['core','test_output']]},
    {proc:1,ns:{read_and_test:'done',diagnose_word_count:'run',diagnose_top_words:'run'},keys:{core:1,test_output:1},ck:3,pend:1},
    {proc:0,ns:{read_and_test:'done',diagnose_word_count:'lost',diagnose_top_words:'done'},keys:{core:1,test_output:1},ck:3,pend:1,kill:1},
    {proc:2,ns:{read_and_test:'done',diagnose_word_count:'run',diagnose_top_words:'done'},keys:{core:1,test_output:1,diagnoses:2},ck:4,load:1,wr:['diagnose_word_count',['diagnoses']]},
    {proc:2,ns:{read_and_test:'done',diagnose_word_count:'done',diagnose_top_words:'done',propose_fix:'run',human_review:'next'},keys:{core:1,test_output:1,diagnoses:2,patch:1},ck:5,intr:1,wr:['propose_fix',['patch']]},
    {proc:3,ns:{read_and_test:'done',diagnose_word_count:'done',diagnose_top_words:'done',propose_fix:'done',human_review:'done',apply_and_test:'done',__end__:'done'},keys:{core:1,test_output:1,diagnoses:2,patch:1,decision:1,passed:1},ck:A.db.checkpoints,load:1,wr:['apply_and_test',['decision','passed']]}];
  function draw(R,k,e){const P=R.P,s=S[k],pv=S[Math.max(0,k-1)],nar=R.W<520;R.grid(-7,6,-2.8,2.8,.5);
    // the process running the graph: a tinted floor plate; red when killed; gone when it exits at the interrupt
    const PC=[null,P.acc,P.c6,P.c3][s.proc]||P.bad,pa=s.kill?1:k===5?1-.7*Math.max(0,(e-.6)/.4):1;
    R.quad([[-6.4,0,-1.8],[3.5,0,-1.8],[3.5,0,.95],[-6.4,0,.95]],{fill:mix(P.paper,PC,s.kill?.3:.14),a:.9*pa,edge:false,dz:60}); // dz: sorted behind everything standing on it
    R.label([-6.35,0,-1.8],s.kill?'process 1 · killed':k===5&&e>.6?'process 2 · exits, waiting':'process '+s.proc,{al:'left',fs:12.5,b:1,c:s.kill?P.bad:PC,dy:-10,wide:1});
    // edges, then trigger flows into the nodes that run this step
    EDGES.forEach(ed=>{const pts=G.edge(R,pos[ed.s],pos[ed.t],{a:.55,s:ed.s,t:ed.t});const st=s.ns[ed.t];
      if(pts&&(st==='run'||(k===0&&ed.s==='__start__'))&&!(k===4&&ed.t==='diagnose_word_count'&&false))R.flow(pts,{c:P.c5,r:.06,n:5,speed:1,a:k===0?1:.8})});
    Object.keys(pos).forEach(n=>{const st=s.ns[n]||'idle',p=pos[n];
      const lab=n==='human_review'&&k===5?'human_review · interrupt()':n==='diagnose_word_count'&&st==='lost'?'word_count · call lost':NAME[n];
      const show=!nar||st==='run'||st==='next'||st==='lost'||G.isSE(n);
      G.node(R,p,n,{st,text:lab,label:show,a:st==='idle'?.55:1,w:1.0})});
    // the model: an upright glass plate behind the diagnoses and propose_fix; calls flow back to it
    const xm0=pos.diagnose_word_count[0]-.8,xm1=pos.propose_fix[0]+.8,mOn=k>=2&&k<=5;
    R.glass([xm0,.1,ZM],[xm1-xm0,0,0],[0,1.15,0],{c:P.c4,a:mOn?.9:.3,nu:6,nv:4});
    R.label([xm1,1.1,ZM],'Claude Haiku 4.5',{al:'left',dx:8,fs:12.5,b:1,c:P.c4,a:mOn?1:.5,wide:1});
    const up=(n,a)=>{const p=pos[n];R.flowArc([p[0],.32,p[1]],[p[0]+.1,.75,ZM+.05],.35,{c:P.c4,r:.06,n:5,speed:1,a})};
    if(k===2){up('diagnose_word_count',1);up('diagnose_top_words',1-.6*e)}
    if(k===3){const p=pos.diagnose_word_count;R.line([[p[0],.32,p[1]],[p[0]+.1,.75,ZM+.05]],{c:P.bad,w:2,dash:[4,4],a:.9});
      R.label([xm0,.9,ZM],'SIGKILL · '+s1(A.kill),{al:'right',dx:-10,fs:13,b:1,c:P.bad})}
    if(k===4)up('diagnose_word_count',1);if(k===5)up('propose_fix',1);
    if(k===2)R.label([pos.diagnose_top_words[0]+.5,.3,pos.diagnose_top_words[1]],'returns at '+s1(tw.t1),{al:'left',dx:12,fs:12.5,c:P.c4,a:e,wide:1});
    // the shared state (in the process's memory): a plinth per key, a green block per value; memory is gone at the kill
    const mem=s.kill?.15:s.load?(e<.35?.15+e*2:1):1;
    KEYS.forEach(key=>{const x=KX(key),n=s.keys[key]||0,n0=pv.keys[key]||0,isNew=n>n0;
      R.box([x,0,ZS],[.9,.06,.5],{a:.9,lw:.7});R.label([x,0,ZS+.25],key,{mono:true,fs:12,c:n?P.c3:P.mute,dy:14,a:n?1:.6,grp:nar?'k':null});
      for(let i=0;i<n;i++){const ap=isNew&&i>=n0?Math.max(0,(e-.45)/.55):1;if(ap<=0)continue;
        R.box([x,.06+i*.26,ZS],[.62,.22,.36],{fill:mix(P.paper,key==='passed'?P.good:P.c3,.55),a:mem*ap,lw:.7,shadow:false})}});
    R.label([KX('core')-.6,.2,ZS],'state',{al:'right',dx:-4,fs:12.5,b:1,c:P.c3,wide:1});
    // writes: from the node that ran into the state keys it returned
    if(s.wr){const p=pos[s.wr[0]];s.wr[1].forEach(key=>R.flowArc([p[0],.32,p[1]],[KX(key),.4,ZS],.55,{c:P.c3,r:.06,n:5,speed:1,a:Math.min(1,e*1.6)}))}
    // the checkpointer: a stack of saved checkpoints; the pending write and the interrupt wait beside it
    const pk=pv.ck,newSlab=s.ck>pk&&k>0;const top=G.stack(R,DB,s.ck,newSlab?Math.max(0,(e-.6)/.4):1,{hiLast:newSlab});
    R.label([DB[0],top,DB[2]],(nar?'':'SqliteSaver · ')+s.ck+' checkpoints',{fs:12.5,b:1,c:P.acc,dy:-12});
    const toDB=(from,c,a)=>R.flowArc(from,[DB[0]-.2,top,DB[2]],.6,{c,r:.06,n:6,speed:1.1,a});
    if(newSlab&&!s.load)toDB([KX('passed')+.4,.4,ZS],P.acc,Math.max(0,(e-.4)/.6));
    if(newSlab&&s.load)toDB([KX('passed')+.4,.4,ZS],P.acc,Math.max(0,(e-.6)/.4));
    if(k===0)toDB([pos.__start__[0],.3,pos.__start__[1]],P.acc,1);
    if(s.pend){const c=[DB[0]+.05,0,DB[2]+1.3];R.box(c,[.7,.16,.4],{fill:mix(P.paper,P.c3,.55),a:k===2?Math.max(0,(e-.3)/.7):1,lw:.8});
      R.label([c[0],.16,c[2]+.2],nar?'pending write':'pending write · top_words',{fs:12.5,c:P.c3,b:1,dy:16,a:k===2?Math.max(0,(e-.3)/.7):1});
      if(k===2){const p=pos.diagnose_top_words;R.flowArc([p[0],.32,p[1]],[c[0],.2,c[2]],.7,{c:P.c3,r:.06,n:6,speed:1.1,a:Math.max(0,(e-.3)/.7)})}}
    if(s.intr){const c=[DB[0]+.05,0,DB[2]+1.3],a=Math.max(0,(e-.55)/.45);R.box(c,[.7,.16,.4],{fill:mix(P.paper,P.c5,.6),a,lw:.8});
      R.label([c[0],.16,c[2]+.2],nar?'interrupt':'interrupt · waiting for a person',{fs:12.5,c:P.c5,b:1,dy:16,a});
      if(!nar)R.label([pos.human_review[0],.3,pos.human_review[1]],'returns the diff at '+s1(pause),{fs:12,c:P.mute,dy:-30,a})}
    // loading a checkpoint: the saved state flows back into the new process's memory
    if(s.load)R.flowArc([DB[0]-.3,top,DB[2]],[KX('passed')+.4,.5,ZS],.6,{c:P.acc,r:.065,n:7,speed:1.2,a:e<.5?1:1-(e-.5)});
    if(k===4&&!nar)R.label([pos.diagnose_word_count[0]+.5,.3,pos.diagnose_word_count[1]],'only this call reruns · '+s1(wc.t1-wc.t0),{al:'left',dx:12,fs:12.5,c:P.c4,a:e});
    if(k===5&&!nar)R.label([pos.propose_fix[0]+.5,.3,pos.propose_fix[1]],'model call · '+s1(pf.t1-pf.t0),{al:'left',dx:12,fs:12.5,c:P.c4,a:e});
    if(k===6){R.label([-1.2,1.3,ZM],A.calls.length+' model calls started, '+ret.length+' returned · $'+cost.toFixed(4)+' · '+A.db.writes+' writes saved',{fs:13,b:1,c:P.ink,dy:-14,a:e,wide:1})}
  }
  const full={cam:[.14,.74],bounds:[[-6.5,0,-2.4],[5.4,1.4,2.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the running example, killed and resumed',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1700,hold:5200,draw,
    margin:w=>w<520?[14,10,26,10]:[18,16,34,16],
    view:()=>innerWidth<520?{cam:[.5,.92]}:null});
})();
