// ---- Scene (section 4, Fig. 2): the reward of a coding task is the end of a chain, and each hack cuts into one link (renderer v2) ----
// No numbers are drawn from data here: the parts are the chain every RLVR coding environment on this page uses (solution, tests, pytest, exit code, grader),
// and the steps are the moves of the old moves table, each with its source in the step list. The two columns on the right are the point:
// "reward" (what the grader pays) stays full on every hack, "task solved" empties.
(function(){
  if(!document.getElementById('stg-tests')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const ZC=0,PH=1.45,PWD=1.45;
  const X={sol:-3.9,tst:-1.65,fw:.6,ex:2.7,rw:4.25,sv:5.05};
  // the chain: solution, tests, framework (pytest and conftest.py), exit code; the agent in front, the library behind the solution, the person to the right
  const AG=[-1.0,0,2.2],LIB=[-4.2,0,1.9],USR=[3.2,0,2.3];
  // per step: which parts the move touches (lit), the flows it adds, which parts it skips, whether the task is solved
  const S=[
    {lit:['sol','tst','fw','ex'],solved:1,hl:'the honest path: tests pass, task solved',hs:'honest · paid, solved'},
    {lit:['tst','sol'],hack:['sol'],read:['tst'],hl:'hard-code: expected values copied into the solution',hs:'hard-code · paid, not solved'},
    {lit:['tst','fw'],hack:['tst','fw'],hl:'edit or skip the tests, or a conftest.py that passes all',hs:'edit tests · paid, not solved'},
    {lit:['sol','tst'],hack:['sol'],eq:1,hl:'override __eq__: every assert compares True',hs:'__eq__ True · paid, not solved'},
    {lit:['sol','ex'],hack:['sol'],skip:['tst','fw'],jump:1,hl:'sys.exit(0): exit code 0 before any assert',hs:'exit(0) · paid, not solved'},
    {lit:['tst'],read:['tst'],hl:'mine the test files: answers flow to the agent',hs:'mine tests · paid, not solved'},
    {lit:['tst','lib'],hack:['lib'],lib:1,hl:'overwrite the library the tests call',hs:'own pandas · paid, not solved'},
    {lit:['ex','usr'],usr:1,hl:'claim success: "all tests pass"',hs:'claim success · paid, not solved'}];
  const NAME={sol:'solution.py',tst:'test_*.py',fw:'pytest · conftest.py',ex:'exit code'},SHORT={sol:'solution',tst:'tests',fw:'pytest',ex:'exit'};
  function draw(R,k,e){const P=R.P,s=S[k],sp=S[Math.max(0,k-1)];R.grid(-5.4,6,-2.8,3.2,.5);
    const COL={sol:P.c1,tst:P.c6,fw:P.c4,ex:P.c5},hk=P.bad,ok=P.good;
    const lit=n=>s.lit.includes(n),fade=(n,wasLit)=>lit(n)?(k===0||sp.lit.includes(n)?1:Math.max(.25,e)):.22;
    const mid=n=>[X[n],.75,ZC];
    // the four links of the chain as glass plates, the honest data path through them as a flow
    ['sol','tst','fw','ex'].forEach(n=>{const a=fade(n),hacked=(s.hack||[]).includes(n),skipped=(s.skip||[]).includes(n);
      const w=n==='ex'?.9:PWD;R.glass([X[n]-w/2,.08,ZC],[w,0,0],[0,PH,0],{c:hacked?hk:COL[n],a:skipped?.12:a,nu:n==='ex'?3:5,nv:4});
      R.label([X[n],PH+.08,ZC],R.W<520?SHORT[n]:NAME[n],{mono:true,fs:12.5,b:lit(n)&&k>0,c:hacked?hk:skipped?P.mute:P.ink,dy:-11,a:skipped?.6:Math.max(.55,a),wide:R.W<520&&!lit(n)?1:0});
      if(skipped)R.label([X[n],.75,ZC],'not run',{mono:true,fs:12,c:P.mute,a:e,wide:1})});
    if(k===0||!s.jump){R.flow([mid('sol'),mid('tst'),mid('fw'),mid('ex'),[X.rw,.75,ZC]],{c:k===0?ok:P.mute,a:k===0?1:.5,r:.06,n:20,speed:1.2})}
    else R.flowArc([X.sol+.5,PH,ZC],[X.ex,PH*.8,ZC],.9,{c:hk,a:e,r:.075,n:10,speed:1.4});
    // the agent, and its edits as flows: green for the honest solution, orange for a hack, blue for answers read out of the checker
    R.box(AG,[1.1,.7,.7],{fill:P.paper});R.label([AG[0],.7,AG[2]],R.W<520?'agent':'agent (the policy)',{mono:true,fs:12.5,dy:-12,b:1});
    const ag=[AG[0],.75,AG[2]-.2];
    if(k===0)R.flowArc(ag,[X.sol,.4,ZC+.05],.6,{c:ok,r:.07,n:8,speed:1.2});
    (s.hack||[]).forEach(n=>{const t=n==='lib'?[LIB[0]+.3,.55,LIB[2]]:[X[n],.4,ZC+.05];R.flowArc(ag,t,.7,{c:hk,a:e,r:.08,n:9,speed:1.3})});
    (s.read||[]).forEach(n=>R.flowArc([X[n],.9,ZC+.05],ag,.8,{c:P.c1,a:e,r:.07,n:9,speed:1.2}));
    if(k===1)R.flowArc([X.tst-.3,.5,ZC+.05],[X.sol+.3,.5,ZC+.05],.35,{c:P.c1,a:e,r:.06,n:6,speed:1});
    if(s.eq){R.label([X.tst,.45,ZC],'assert x == y → True',{mono:true,fs:12.5,b:1,c:hk,a:e})}
    // the library the tests import, and the person who reads the summary
    const la=s.lib?Math.max(.3,e):.18;R.box(LIB,[1.2,.55,.6],{fill:s.lib?mix(P.paper,hk,.35):P.paper,a:la});R.label([LIB[0],.55,LIB[2]],'pandas (a library)',{mono:true,fs:12,dy:-11,wide:s.lib?0:1,a:Math.max(.45,la),c:s.lib?hk:P.mute});
    if(s.lib)R.flowArc([LIB[0]+.4,.5,LIB[2]-.2],[X.tst,.35,ZC+.05],.5,{c:hk,a:e,r:.07,n:7,speed:1.2});
    const ua=s.usr?Math.max(.3,e):.18;R.box(USR,[.9,.6,.6],{fill:P.paper,a:ua});R.label([USR[0],.6,USR[2]],'the person',{mono:true,fs:12,dy:-11,wide:s.usr?0:1,a:Math.max(.45,ua),c:s.usr?P.ink:P.mute});
    if(s.usr){R.flowArc(ag,[USR[0]-.3,.5,USR[2]],.5,{c:hk,a:e,r:.08,n:9,speed:1.3});R.label([(AG[0]+USR[0])/2,.95,AG[2]],'"all tests pass"',{mono:true,fs:12.5,b:1,c:hk,a:e,wide:1})}
    // what the grader pays against what was wanted
    const rwH=1.5,sv=s.solved?1:0,sv0=sp.solved?1:0,svH=rwH*(k===0?1:lerp(sv0,sv,e));
    R.box([X.rw,0,ZC],[.55,rwH,.5],{fill:P.acc});R.label([X.rw,rwH,ZC],'reward 1',{mono:true,fs:12.5,b:1,c:P.acc,dy:-11,wide:1});
    if(svH>.02)R.box([X.sv,0,ZC],[.55,svH,.5],{fill:ok});
    R.quad([[X.sv-.27,.004,ZC-.25],[X.sv+.27,.004,ZC-.25],[X.sv+.27,.004,ZC+.25],[X.sv-.27,.004,ZC+.25]],{ec:P.mute,ea:.6,dash:[3,3],lw:.9});
    R.label([X.sv,s.solved?rwH:.05,ZC],s.solved?'solved':'not solved',{mono:true,fs:12.5,b:1,c:s.solved?ok:P.bad,dy:s.solved?-26:-14,wide:1});
    R.label([.3,R.W<520?PH+1.3:PH+.9,ZC],R.W<520?s.hs:s.hl,{mono:true,fs:13.5,b:1,c:k===0?ok:hk,a:k===0?1:e});
  }
  S3.stage({id:'stg-tests',list:'sx-tests',fig:'Fig. 2 · where each coding hack cuts into the reward',cam:[.2,.42],bounds:()=>innerWidth<560?[[-4.6,0,-.3],[5.4,2.6,2.6]]:[[-5.0,0,-.5],[5.6,2.35,2.6]],aspect:.46,dur:1300,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[18,24,18,20]});
})();
