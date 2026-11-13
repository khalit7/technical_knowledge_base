// ---- Scene (Idea, Figure 2 in 3D): the state hierarchy L0 to L3 and one orchestration task run through it, Prime Agent's rlm() against a
// subagent as a blocking tool call (renderer v2: glass for the weights and the model-context boundary, flowing dots wherever a call, a result,
// a message or a compaction moves state, the camera moving in close on the first call) ----
// Rows on the floor, front to back: the clock, L0 (the weights, a glass plate), L1 (the parent's active context, a tray of blocks; the parent model
// at its left end), the red model-context boundary (a glass wall), the daemon queue, L2 (REPL values on the left, subagent pods on the right),
// L3 (disk, stacks of event records). Illustrative: the paper measures none of this; the scenario is built only from §2.2 to §2.4 and Appendix B
// (a review and a test run handed to two subagents, then a follow-up to the reviewer), and its numbers are the same as the 2D animation it
// replaces: per step the blocks in L1, the values in L2, what is on disk, each child's state, the queue, the clock and the blocked units.
// window.PAORC exposes the steps and totals for src/check_stages.mjs.
(function(){
  if(!document.getElementById('stg-orc')||typeof S3==='undefined')return;const {at,off,lerp,mix}=S3;
  const old=[
    {L1:['task'],L2:[],L3:[],K:{},Q:[],tm:0,b:0,rs:0},
    {L1:['task','call: reviewer'],L2:[],L3:[],K:{reviewer:'run'},Q:[],tm:3,b:3,rs:0},
    {L1:['task','call: reviewer','reviewer report (full)'],L2:[],L3:[],K:{reviewer:'gone'},Q:[],tm:4,b:3,rs:0},
    {L1:['task','call: reviewer','reviewer report (full)','call: tester'],L2:[],L3:[],K:{reviewer:'gone',tester:'run'},Q:[],tm:7,b:6,rs:0},
    {L1:['task','call: reviewer','reviewer report (full)','call: tester','test log (full)'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone'},Q:[],tm:8,b:6,rs:0},
    {L1:['summary'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone'},Q:[],tm:9,b:6,rs:0},
    {L1:['summary','call: reviewer 2','reviewer 2 report'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone','reviewer 2':'gone'},Q:[],tm:13,b:9,rs:1},
    {L1:['summary','call: reviewer 2','reviewer 2 report','answer'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone','reviewer 2':'gone'},Q:[],tm:14,b:9,rs:1}];
  const neu=[
    {L1:['task'],L2:[],L3:[],K:{},Q:[],tm:0,b:0,rs:0},
    {L1:['task','code: rlm reviewer'],L2:['handle: reviewer'],L3:[],K:{reviewer:'run'},Q:[],tm:1,b:0,rs:0},
    {L1:['task','code: rlm reviewer','code: rlm tester'],L2:['handle: reviewer','handle: tester'],L3:[],K:{reviewer:'run',tester:'run'},Q:[],tm:2,b:0,rs:0},
    {L1:['task','code: rlm reviewer','code: rlm tester','own notes'],L2:['handle: reviewer','handle: tester','notes (values)'],L3:[],K:{reviewer:'run',tester:'run'},Q:[],tm:3,b:0,rs:0},
    {L1:['summary'],L2:['handle: reviewer','handle: tester','notes (values)'],L3:['events 1 to 4'],K:{reviewer:'idle',tester:'run'},Q:['reviewer: issues'],tm:4,b:0,rs:0},
    {L1:['summary','reviewer: 3 issues'],L2:['handle: reviewer','handle: tester','notes (values)','review (value)'],L3:['events 1 to 4'],K:{reviewer:'idle',tester:'idle'},Q:['tester: failures'],tm:5,b:0,rs:0},
    {L1:['summary','reviewer: 3 issues','sent follow-up'],L2:['handle: reviewer','handle: tester','notes (values)','review (value)','tests (value)'],L3:['events 1 to 4'],K:{reviewer:'run',tester:'idle'},Q:[],tm:6,b:0,rs:0},
    {L1:['summary','reviewer: 3 issues','sent follow-up','answer'],L2:['handle: reviewer','handle: tester','notes (values)','review (value)','tests (value)','report (value)'],L3:['events 1 to 4','events 5 to 8'],K:{reviewer:'idle',tester:'idle'},Q:[],tm:8,b:0,rs:0}];
  const MODES={new:neu,old};let mode='new';
  const blockedAt=i=>mode==='old'&&(i<3||(i>=4&&i<7)||(i>=9&&i<12));
  window.PAORC={steps:{new:neu.length,old:old.length},end:{new:neu[neu.length-1],old:old[old.length-1]},
    blocked:{old:Array.from({length:14},(_,i)=>i<3||(i>=4&&i<7)||(i>=9&&i<12)).filter(Boolean).length}};
  // rows (z) and spans (x)
  const ZC=4.05,Z0=3.15,Z1=2.05,ZW=1.22,ZQ=.66,Z2=-.05,Z3=-1.55,PX=-4.15,X0=-3.25;
  const big=t=>/\(full\)/.test(t),bw=t=>big(t)?1.15:t==='summary'?.8:.56,bh=t=>big(t)?.75:t==='summary'?.45:.3;
  const l1x=items=>{let x=X0;return items.map(t=>{const w=bw(t),c=x+w/2;x+=w+.14;return c})};
  const KX={reviewer:1.4,tester:2.85,'reviewer 2':4.3};
  const l2x=i=>X0+.2+i*.52;
  const short=t=>t.replace('code: ','').replace(' (value)','').replace(' (values)','').replace('handle: ','h: ');
  // what each step is about: that row at full strength, the others recede
  const FOC={new:['all','L2','L2','L2','L3','L1','L2','L1'],old:['all','L2','L1','L2','L1','L1','L2','all']};
  function draw(R,k,e){const P=R.P,ST=MODES[mode],S=ST[k],Pv=k>0?ST[k-1]:{L1:[],L2:[],L3:[],K:{},Q:[],tm:0},foc=FOC[mode][k];
    const dim=r=>foc==='all'||foc===r?1:.32,fresh=(arr,t)=>arr.indexOf(t)<0;
    R.grid(-5.2,5.2,-2.4,4.6,.5);
    // row labels
    [['clock · t '+S.tm+' · waiting '+S.b+(S.rs?' · re-sent '+S.rs:''),ZC,S.b?P.bad:P.c1],['L0 · weights',Z0,P.mute],['L1 · active context',Z1,P.c1],['model-context boundary',ZW,P.bad],['daemon queue',ZQ,P.c6],['L2 · REPL + subagents',Z2,P.c3],['L3 · disk',Z3,P.c5]]
      .forEach(([t,z,c])=>R.label([-5.05,.1,z],t,{al:'right',dx:-4,mono:true,fs:12,c,grp:'row',b:/^(L|clock)/.test(t)}));
    // L0: the weights, a glass plate lying flat (fixed during a run)
    R.glass([-4.7,.02,Z0-.32],[9.3,0,0],[0,0,.64],{c:P.mute,a:k===0?1:.55,nu:18,nv:2,th:.03});
    if(k===0)R.label([.5,.03,Z0],'fixed during the run · changed only by fine-tuning',{fs:12,c:P.mute,a:e,wide:1});
    // the parent model at the left of L1; red while it waits on a blocking call
    const blockedNow=mode==='old'&&(k===1||k===3||k===6),pc=blockedNow?mix(P.paper,P.bad,.55*Math.min(1,e*1.5)):mix(P.paper,P.c1,.35);
    R.box([PX,0,Z1],[.95,.85,.95],{fill:pc});R.label([PX,.85,Z1],blockedNow?'parent · waiting':'parent',{fs:12,b:1,dy:-10,c:blockedNow?P.bad:P.ink});
    // L1 tray and its blocks
    R.box([.75,0,Z1],[8.1,.07,1.05],{fill:mix(P.paper,P.c1,.08),shadow:false});
    const x1=l1x(S.L1),gone1=Pv.L1.filter(t=>S.L1.indexOf(t)<0),xp=l1x(Pv.L1);
    S.L1.forEach((t,i)=>{const nw=fresh(Pv.L1,t),a=(nw?e:1)*dim('L1'),f=big(t)?mix(P.paper,P.c2,.6):t==='summary'?mix(P.paper,P.c1,.45):mix(P.paper,P.c1,.18);
      R.box([x1[i],.07,Z1],[bw(t),bh(t)*(nw?Math.max(.15,e):1),.62],{fill:f,a,shadow:false});
      if(nw||big(t)||t==='summary')R.label([x1[i],.07+bh(t),Z1],t,{fs:12,dy:-8,a:Math.max(nw?e:0,big(t)||t==='summary'?.85:0)*Math.max(.5,dim('L1')),b:nw,c:big(t)?P.c2:P.ink,grp:'l1'})});
    // blocks leaving L1 at compaction fade out where they stood
    gone1.forEach(t=>{const i=Pv.L1.indexOf(t);R.box([xp[i],.07,Z1],[bw(t),bh(t),.62],{fill:big(t)?mix(P.paper,P.c2,.6):mix(P.paper,P.c1,.18),a:1-e,shadow:false})});
    // the model-context boundary: a red glass wall
    R.glass([-4.7,0,ZW],[9.4,0,0],[0,.55,0],{c:P.bad,nu:16,nv:2,a:.85});
    // the daemon queue (Prime Agent only) and its messages
    if(mode==='new'){R.box([2.6,0,ZQ],[4.2,.05,.34],{fill:mix(P.paper,P.c6,.25),shadow:false});
      S.Q.forEach((q,i)=>{const nw=fresh(Pv.Q,q),x=1.15+i*1.45;R.box([x,.05,ZQ],[1.2,.16,.26],{fill:mix(P.paper,P.c6,.6),a:(nw?e:1),shadow:false});R.label([x,.21,ZQ],q,{fs:12,dy:-7,c:P.c6,a:nw?e:.8})})}
    // L2: the REPL tray with its values (left) and the subagent pods (right)
    R.box([-1.55,0,Z2],[3.6,.06,1.0],{fill:mix(P.paper,P.c3,.08),shadow:false,a:mode==='old'?.5:1});
    if(mode==='old')R.label([-1.55,.06,Z2],'no REPL: nothing kept here',{fs:12,c:P.mute,a:k===0?e:.7});
    S.L2.forEach((t,i)=>{const nw=fresh(Pv.L2,t),a=(nw?e:1)*dim('L2');R.box([l2x(i),.06,Z2],[.4,.42,.4],{fill:mix(P.paper,P.c3,t.startsWith('handle')?.55:.3),a});
      if(nw)R.label([l2x(i),.48,Z2],short(t),{fs:12,dy:-8,b:1,c:P.c3,a:e,grp:'l2'})});
    Object.keys(KX).forEach(n=>{const s1=S.K[n],s0=Pv.K[n];if(!s1&&!s0)return;const x=KX[n];
      const born=!s0,flash=born&&s1==='gone',died=s1==='gone'&&s0&&s0!=='gone';let a=flash?(e<.6?Math.min(1,e*3):1-.75*(e-.6)/.4):born?e:died?1-.75*e:s1==='gone'?.25:1;a*=dim('L2')===1?1:.55;
      const run=s1==='run'||(flash&&e<.6),fill=run?mix(P.paper,P.c3,.6):mix(P.paper,P.c3,.15);
      R.box([x,0,Z2],[1.0,.95,.9],{fill,a,fa:s1==='gone'&&!run?.25:1});
      if(run&&a>.3)R.glow([x,1.15,Z2],.5,{c:P.c3,a:.55*a});
      R.label([x,.95,Z2],n,{fs:12,dy:-9,c:run?P.c3:s1==='gone'?P.mute:P.c3,b:run,a:Math.max(.45,a)})});
    // L3: disk, a stack of event records per entry
    R.box([.75,0,Z3],[8.1,.06,1.05],{fill:mix(P.paper,P.c5,.1),shadow:false,a:mode==='old'?.5:1});
    if(mode==='old')R.label([.75,.06,Z3],'no retained history',{fs:12,c:P.mute,a:k===0?e:.7});
    S.L3.forEach((t,i)=>{const nw=fresh(Pv.L3,t),a=(nw?e:1)*dim('L3'),x=X0+.6+i*1.5;
      for(let j=0;j<4;j++)R.box([x,.06+j*.15*(nw?e:1),Z3],[1.2,.12,.7],{fill:mix(P.paper,P.c5,.35+.08*j),a,shadow:false});
      R.label([x,.66,Z3],t,{fs:12,dy:-6,c:P.c5,b:nw,a:Math.max(.55,nw?e:.8)})});
    // the clock: 14 cells, blue while the parent works, red while it waits on a child
    for(let i=0;i<14;i++){const x=X0+.25+i*.56,done=i<Pv.tm?1:i<S.tm?Math.min(1,Math.max(0,e*(S.tm-Pv.tm)-(i-Pv.tm))):0,bl=blockedAt(i);
      R.box([x,0,ZC],[.46,.05+(done?(bl?.3:.14)*done:0),.4],{fill:done?(bl?mix(P.paper,P.bad,.75):mix(P.paper,P.c1,.55)):P.paper,a:done?1:.45,shadow:false})}
    // flows: where state moves in this step
    const top=[PX,.95,Z1],kid=n=>[KX[n],1.0,Z2],l1=i=>[l1x(S.L1)[i],.45,Z1],v2=i=>[l2x(i),.5,Z2],fa=Math.min(1,e*1.6);
    const F=(a,b,h,o)=>R.flowArc(a,b,h,Object.assign({a:fa,r:.065,speed:1.4},o));
    if(mode==='new'){
      if(k===1){F(top,kid('reviewer'),.7,{c:P.c3});F(top,v2(0),.5,{c:P.c3,n:6})}
      if(k===2){F(top,kid('tester'),.8,{c:P.c3});F(top,v2(1),.5,{c:P.c3,n:6})}
      if(k===3){F(top,v2(2),.5,{c:P.c3,n:7})}
      if(k===4){xp.forEach((x,i)=>F([x,.3,Z1],[X0+.6,.45,Z3],.9,{c:P.c5,n:6,a:fa*.8}));F(kid('reviewer'),[1.15,.25,ZQ],.3,{c:P.c6,n:6})}
      if(k===5){F([1.15,.25,ZQ],l1(1),.6,{c:P.c6,n:7});F([1.15,.25,ZQ],v2(3),.5,{c:P.c6,n:6});F(kid('tester'),[2.6,.25,ZQ],.3,{c:P.c6,n:6})}
      if(k===6){F(top,kid('reviewer'),.9,{c:P.c6,n:9})}
      if(k===7){F(v2(5),l1(3),.6,{c:P.c3,n:7});F([0,.3,Z1],[X0+2.1,.45,Z3],.9,{c:P.c5,n:6,a:fa*.7})}}
    else{
      if(k===1)F(top,kid('reviewer'),.7,{c:P.c3});
      if(k===2)F(kid('reviewer'),l1(2),.8,{c:P.c2,n:22,r:.08});
      if(k===3)F(top,kid('tester'),.8,{c:P.c3});
      if(k===4)F(kid('tester'),l1(4),.8,{c:P.c2,n:22,r:.08});
      if(k===5)xp.forEach((x,i)=>R.flow([[x,.3,Z1],[x,.25,(Z1+ZW)/2+.2],[x,.05,ZW+.2]],{c:P.mute,a:fa*.6*(1-e*.6),r:.05,n:4}));
      if(k===6){F(top,kid('reviewer 2'),.9,{c:P.c1,n:20,r:.075});F(kid('reviewer 2'),l1(2),.7,{c:P.c2,n:10})}}
  }
  const full={cam:[.16,1.08],bounds:[[-5.1,0,-2.2],[5.0,1.1,4.4]]};
  const close={cam:[.28,.95],bounds:[[-4.9,0,-.8],[3.6,1.3,2.6]]};
  const st=S3.stage({id:'stg-orc',list:'sx-orc-new',fig:'Fig. 2 in 3D · one task through the state hierarchy (illustrative)',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    view:k=>(mode==='new'&&k===1)||(mode==='old'&&k===2)?close:full,
    margin:w=>w<520?[12,8,12,8]:[14,10,10,160]});
  const seg=document.getElementById('orcM');
  if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    document.getElementById('sx-orc-new').hidden=mode!=='new';document.getElementById('sx-orc-old').hidden=mode!=='old';st.list('sx-orc-'+mode)}));
})();
