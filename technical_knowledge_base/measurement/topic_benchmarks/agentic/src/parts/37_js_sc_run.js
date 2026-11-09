// ---- Scene: Fig. 2 (stg-run, renderer v2): one real Terminal-Bench 2.0 task (regex-log), three runs, step by step. The agent's container is a glass box
// with the files the run touches as blocks; in the third run a separate verifier container stands beside it and only the declared artifact may cross.
// Files and commands are verbatim from harbor-framework/terminal-bench-2/regex-log (read 2026-10-04, quoted in the step lists); the exploit follows
// Berkeley RDI's write-up; the third run is the separate-verifier layout of the TB 3.0 and 4.0 task files (illustrative on this task, as the page says).
// The 82 of 89 and the 74 and 66 separate-verifier counts come from AG.survey (counted from the task files by mk_data.py). ----
(function(){
  if(!document.getElementById('stg-run')||!window.S3||!window.AG)return;
  const {mix,lerp,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  // file blocks: id, label, position in the agent container [x,z]; tests and reward move to the verifier in the separate layout
  const F=[['ins','instruction.md',[-2.25,-.6]],['rx','regex.txt',[-1.0,-.6]],['tests','tests/',[.25,-.6]],['rew','reward.txt',[1.5,-.6]],['curl','curl',[-1.0,.6]],['uvx','uvx',[.25,.6]]];
  const VPOS={tests:[3.9,-.25],rew:[5.0,-.25]};
  // state per step: [short state, cls] with cls '' | new | bad | good | dim | gone (an empty slot)
  const S0={ins:['given','new'],rx:['absent','gone'],curl:['not in image','gone'],uvx:['absent','gone'],tests:['not yet','gone'],rew:['absent','gone']};
  const st=(b,c)=>Object.assign({},b,c);
  const MODES=[
    [S0, st(S0,{ins:['given',''],rx:['1 regex line','new']}), st(S0,{ins:['given',''],rx:['1 regex line',''],tests:['uploaded','new']}),
     st(S0,{ins:['given',''],rx:['1 regex line',''],tests:['uploaded',''],curl:['installed','new'],uvx:['from astral.sh','new']}),
     st(S0,{ins:['given',''],rx:['read by test',''],tests:['9 of 9 dates','good'],curl:['installed',''],uvx:['runs pytest','']}),
     st(S0,{ins:['given',''],rx:['read by test',''],tests:['passed','good'],curl:['installed',''],uvx:['ran pytest',''],rew:['1, earned','good']})],
    [S0, st(S0,{ins:['given',''],rx:['still absent','gone'],curl:['wrapper','bad']}), st(S0,{ins:['given',''],curl:['wrapper','bad'],tests:['clean','new']}),
     st(S0,{ins:['given',''],curl:['wrapper runs','bad'],tests:['clean',''],uvx:['trojan','bad']}),
     st(S0,{ins:['given',''],rx:['never read','gone'],curl:['wrapper',''],tests:['never run','bad'],uvx:['fake "passed"','bad']}),
     st(S0,{ins:['given',''],rx:['never existed','gone'],curl:['wrapper',''],tests:['never run','bad'],uvx:['trojan',''],rew:['1, for nothing','bad']})],
    [S0, st(S0,{ins:['given',''],curl:['wrapper','bad']}), st(S0,{ins:['given',''],rx:['artifact missing','gone'],curl:['left behind','dim'],tests:['in verifier image','new']}),
     st(S0,{ins:['given',''],rx:['artifact missing','gone'],curl:['not used','dim'],tests:['own pytest','']}),
     st(S0,{ins:['given',''],rx:['does not exist','gone'],curl:['not used','dim'],tests:['FAILED','bad']}),
     st(S0,{ins:['given',''],rx:['does not exist','gone'],curl:['not used','dim'],tests:['failed','bad'],rew:['0','good']})]];
  // what moves at each step: [from, to, colour key, arc height]
  const FLOW=[[[],[['agent','rx','c2']],[['harness','tests','c1']],[['net','curl','c6'],['curl','uvx','c6']],[['rx','tests','c2'],['uvx','tests','c6']],[['tests','rew','good']]],
              [[],[['agent','curl','bad']],[['harness','tests','c1']],[['curl','uvx','bad']],[['uvx','tests','bad']],[['uvx','rew','bad']]],
              [[],[['agent','curl','bad']],[['rx','vtests','c2']],[],[['vtests','vtests2','bad']],[['vtests','vrew','good']]]];
  let mode=0;
  const C=AG.survey;window.AGN=window.AGN||{};AGN.run={n:C.tb2.n,curl:C.tb2.curl,sep3:C.tb3.sep,n3:C.tb3.n,sep4:C.tb4.sep,n4:C.tb4.n,steps:MODES.map(m=>m.length)};
  // on a phone (canvas under 520 px) only labels marked ph:1 are drawn (the changed blocks and short container names); the step text names the rest
  const lab=(R,p,t,o)=>{if(R.W<520&&!o.ph)return;const q=R.p(p);if(q[2]<=0||q[0]<-2||q[0]>R.W+2||q[1]<-2||q[1]>R.H+2)return;R.label(p,t,o)};
  function cont(R,x0,x1,z0,z1,h,c,a,title,sub){const P=R.P;R.quad([[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1]],{fill:mix(P.paper,c,.25),fa:.55,a,ec:c,ea:.7});
    const E=[[[x0,0,z0],[x0,h,z0]],[[x1,0,z0],[x1,h,z0]],[[x1,0,z1],[x1,h,z1]],[[x0,0,z1],[x0,h,z1]],[[x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1],[x0,h,z0]]];
    E.forEach(l=>R.line(l,{c,w:1.3,a:a*.75}));
    lab(R,[(x0+x1)/2,h,z0],R.W<520?(sub==='8 h agent limit'?'agent':title==='separate verifier'?'verifier':'one container'):title,{b:1,fs:12.5,dy:-10,c,a,ph:1});if(sub)lab(R,[(x0+x1)/2,h,z0],sub,{mono:true,fs:12,dy:-26,c:P.mute,a})}
  function pos(id){const sep=mode===2;if(id==='agent')return [-2.25,.4,.6];if(id==='harness')return [-4.0,.45,-.6];if(id==='net')return [-1.0,1.9,-2.0];
    if(id==='vtests'||id==='vtests2')return [VPOS.tests[0],.32,VPOS.tests[1]];if(id==='vrew')return [VPOS.rew[0],.32,VPOS.rew[1]];
    if(sep&&VPOS[id])return [VPOS[id][0],.32,VPOS[id][1]];const f=F.find(x=>x[0]===id);return [f[2][0],.32,f[2][1]]}
  function draw(R,k,e,S){const P=R.P,sep=mode===2,M=MODES[mode],rows=M[k],prev=M[S&&S.pk!=null&&S.pk<M.length?S.pk:k];R.grid(-4.6,4.8,-2.4,2.0,.5);
    cont(R,-2.95,2.2,-1.2,1.2,1.35,sep?P.c1:P.bad,1,sep?'agent container':'one container: the agent ran here, the verifier runs here',sep?'8 h agent limit':'900 s · 1 CPU · 2 GB');
    if(sep)cont(R,3.3,5.6,-.95,.45,1.15,P.c6,1,'separate verifier','fresh from tests/Dockerfile');
    // outside sources
    lab(R,[-4.0,0,-.3],'Harbor',{fs:12,b:1,dy:14,c:P.c1,a:sep?.3:1});R.box([-4.0,0,-.6],[.55,.45,.55],{fill:mix(P.paper,P.c1,.3),a:sep?.3:1});
    if(!sep){R.box([-1.0,1.75,-2.0],[.7,.28,.35],{fill:mix(P.paper,P.c6,.3),shadow:false,a:.8});lab(R,[-1.0,2.03,-2.0],'astral.sh (internet)',{fs:12,dy:-9,c:P.c6})}
    // the agent
    const ag=pos('agent');R.glow(ag,.32,{c:mode?P.bad:P.c2,a:k<=1?.9:.35});R.ball(ag,.16,{c:mode?P.bad:P.c2,a:k<=1?1:.5});lab(R,ag,mode?'exploit agent':'agent',{fs:12,b:1,dy:-22,c:mode?P.bad:P.c2});
    // the file blocks
    F.forEach(([id,name])=>{const p=pos(id),[txt,cls]=rows[id],hot=cls&&cls!=='dim'&&cls!=='gone'&&(prev[id][0]!==txt||prev[id][1]!==cls||k===0),c=cls==='bad'?P.bad:cls==='good'?P.good:cls==='new'?P.acc:P.c1;
      const x=p[0],z=p[2];
      if(cls==='gone'){R.quad([[x-.39,0,z-.31],[x+.39,0,z-.31],[x+.39,0,z+.31],[x-.39,0,z+.31]],{ec:P.mute,ea:.8,dash:[4,3],lw:1.2});}
      else R.box([x,0,z],[.78,.4,.62],{fill:mix(P.paper,c,cls?(cls==='dim'?.1:.5):.12),a:cls==='dim'?.35:1});
      lab(R,[x,cls==='gone'?0:.4,z],name,{ph:hot,mono:true,fs:12.5,dy:-10,c:cls==='gone'||cls==='dim'?P.mute:P.ink,a:cls==='gone'?.75:1});
      if(hot||cls==='gone'&&(id==='rx'&&k>0))lab(R,z<0?[x,cls==='gone'?0:.4,z]:[x,0,z+.31],txt,{ph:hot,fs:12,b:hot,dy:z<0?-27:13,c:cls==='gone'?P.mute:c,a:hot?win(e,.3,1):.8})});
    if(sep){const p=pos('vtests');R.flowArc([-1.0,.2,-.6],[p[0]-.4,.2,p[2]],.9,{c:P.c2,a:k===2?.9:0,n:8,r:.06});lab(R,[2.75,1.55,-.6],'only declared artifacts',{fs:12,c:P.c2,a:k===2?win(e,.3,1):0,wide:1})}
    // flows of this step
    FLOW[mode][k].forEach(([a,b,ck])=>{if(a==='rx'&&b==='vtests')return;const pa=pos(a),pb=pos(b);if(b==='vtests2'){R.glow(pa,.45,{c:P.bad,a:.7*win(e,.2,1)});return}
      R.flowArc([pa[0],pa[1]+.05,pa[2]],[pb[0],pb[1]+.05,pb[2]],.35+.1*Math.hypot(pa[0]-pb[0],pa[2]-pb[2]),{c:P[ck],a:win(e,.1,.6),n:7,r:.06})});
  }
  const B1=[[-4.4,0,-2.1],[2.4,1.9,1.4]],B2=[[-4.4,0,-1.2],[5.7,1.4,1.1]];
  const stg=S3.stage({id:'stg-run',list:'sx-run-0',fig:'Fig. 2 · regex-log, three runs',cam:[.22,.62],bounds:()=>mode===2?B2:B1,aspect:.52,dur:1300,hold:4800,draw,
    margin:w=>w<520?[30,8,16,8]:[44,16,22,16],view:()=>mode===2?{cam:[.1,.66]}:null});
  document.querySelectorAll('#run-mode button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#run-mode button').forEach(x=>x.classList.toggle('on',x===b));mode=+b.dataset.m;
    [0,1,2].forEach(i=>{document.getElementById('sx-run-'+i).hidden=i!==mode});stg.list('sx-run-'+mode)}));
  window.AGN.runStage=stg;
})();
