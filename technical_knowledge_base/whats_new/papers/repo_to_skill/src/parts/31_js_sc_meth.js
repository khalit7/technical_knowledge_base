// ---- Scene: the four stages of Eq. 8 (renderer v2), two forms on one scene. Task-agnostic: the released Creator run on huggingface_hub
// (its 12 verification checks and 15 native test selections from the release's verification report, LIB.hub; six SKILL.md files and four
// scripts as the report's shape check lists them; the 20 areas from the router, LIB.areas). Task-oriented: the MLE-bench protocol of
// Appendix A.2.1 (up to 24 GPU-hours to explore, up to 24 to run). The repository's file blocks, the web pages and the number of skill
// versions are illustrative and the step list says so.
(function(){
  if(!document.getElementById('stg-meth'))return;const {at,off,lerp,mix}=S3;
  const H=LIB.hub,CHK=H.checks.map(c=>c[1]),SEL=H.sel,MX=Math.max(...SEL.map(s=>s[2]||0));
  const AREAS=LIB.areas.map(a=>({n:a.n,t:a.f.reduce((s,f)=>s+f.m.length,0)})),AMX=Math.max(...AREAS.map(a=>a.t));
  window.R2S_METH={checks:CHK,sel:SEL,native:H.native,overall:H.overall};
  let M='ag';
  // layout: data moves from the back to the front. The anchor at the back, DisCo's plate in the middle, the skills in front of it, the checks in front.
  // the repository: nine kinds of file, six read as evidence (§4.1, two columns) and three left out (Appendix A.1, the right column)
  const KIND=[['source',-1.9,-2.95,5,1],['docs',-.5,-2.95,4,1],['tests',-1.9,-2.25,5,1],['examples',-.5,-2.25,3,1],['scripts',-1.9,-1.55,2,1],['config',-.5,-1.55,2,1],
    ['build outputs',1.6,-2.95,3,0],['vendored code',1.6,-2.25,4,0],['caches',1.6,-1.55,3,0]];
  const SUB=['Hub operations','downloads and storage','inference and endpoints','CLI and automation','hosted compute'];
  const ZP=-.55,XE=-3.3,ZG=1.0,XS=i=>-1.95+i*1.2,ZC=3.0,ZT=2.3;  // DisCo's plate, the entry skill, the sub-skills, the checks and the tests
  // a skill card facing the reader: c the centre of its foot, lines for text
  function card(R,c,w,h,col,a,lines){const P=R.P;R.box(c,[w,h,.07],{fill:mix(P.paper,col,.22),a});
    if(lines)for(let y=.2;y<h-.08;y+=.15)R.line([[c[0]-w*.34,c[1]+y,c[2]+.04],[c[0]+w*.34,c[1]+y,c[2]+.04]],{c:col,w:1.3,a:a*.8})}
  function plate(R,a){R.glass([-2.4,.08,ZP],[4.8,0,0],[0,1.2,0],{c:R.P.c4,a,nu:8,nv:5});R.label([-2.4,1.28,ZP],'DisCo',{al:'left',fs:13.5,b:1,c:R.P.c4,dy:-8,a})}
  const top=k=>[KIND[k][1],.1+KIND[k][3]*.1,KIND[k][2]];
  function drawAg(R,k,e){const P=R.P;
    // 1-2. the repository and its include / exclude map
    const ra=k<=2?1:k===3?.4:.2;
    R.box([-.2,0,-2.25],[4.6,.06,2.2],{fill:mix(P.paper,P.ink,.04),a:ra});
    KIND.forEach(([n,x,z,nf,inc])=>{const out=!inc&&k>=1,a=ra*(out?(k===1?1-.7*e:.3):1),c=k>=1&&inc?mix(P.paper,P.c2,.45):P.paper;
      for(let j=0;j<nf;j++)R.box([x,.06+j*.1,z],[1.05,.08,.5],{fill:c,a,shadow:false,lw:.7});
      if(k===1)R.label([x+.6,.06+nf*.05,z],n,{al:'left',dx:6,fs:12,c:inc?P.c2:P.mute,wide:1})});
    if(k===0)R.label([-.2,.6,-3.35],'huggingface_hub 1.29.0 · one commit',{fs:13,b:1,dy:-8});
    if(k===1)R.label([1.6,.5,-3.3],'left out',{fs:12.5,b:1,c:P.mute,dy:-6,a:e});
    // 3. grounding: DisCo reads the evidence; live checks in a private environment
    const pa=k<2?0:k===2?e:k===3?1:.3;
    if(pa>0)plate(R,pa);
    if(k===2){KIND.filter(x=>x[4]).forEach((x,i)=>R.flowArc(top(KIND.indexOf(x)),[-1.6+i*.45,.6,ZP-.05],.35,{c:P.c2,r:.06,n:6,a:.9}));
      ['imports','versions','signatures','CLI'].forEach((n,i)=>{const x=-1.8+i*1.2;R.box([x,0,.25],[.28,.24,.28],{fill:mix(P.paper,P.good,.5),a:e});
        R.label([x,0,.25],n,{fs:12,c:P.good,dy:14,a:e,wide:1})});
      R.label([2.9,.12,.25],'live checks',{al:'left',dx:6,fs:12.5,b:1,c:P.good,a:e})}
    // 4. construction: one entry skill routing to five sub-skills, with references and four scripts
    const ga=k<3?0:k===3?e:k===4?.45:1;
    if(ga>0){card(R,[XE,0,ZG],.8,1.15,P.c1,ga,true);R.label([XE,1.15,ZG],'SKILL.md (entry)',{mono:true,fs:12.5,b:1,c:P.c1,dy:-10,a:ga});
      SUB.forEach((n,i)=>{const ai=k===3?Math.min(1,Math.max(0,e*5-i)):ga;
        R.arc([XE+.3,1.05,ZG],[XS(i),.8,ZG],.3,{c:P.c1,w:1.6,a:ai*.8,t:k===3?Math.min(1,e*1.5):1});
        card(R,[XS(i),0,ZG],.72,.8,P.c1,ai,true);if(k===3)R.label([XS(i),0,ZG],n,{fs:12,c:P.c1,dy:i%2?32:14,a:ai,wide:1})});
      [0,1].forEach(j=>R.box([XE,0,ZG+.75+j*.0],[.8,.06+.04*j,.45],{fill:mix(P.paper,P.c2,.5),a:ga,lw:.7}));
      for(let i=0;i<4;i++)R.box([XE-.75,0,ZG-.45+i*.3],[.2,.2,.2],{fill:mix(P.paper,P.c3,.6),a:ga});
      if(k===3){R.label([XE,.1,ZG+.75],'references',{fs:12,c:P.c2,dy:14,wide:1});R.label([XE-.75,.2,ZG-.45],'4 scripts',{fs:12,c:P.c3,dy:-10,wide:1});
        R.flowArc([-2.3,.6,ZP],[XE+.1,.9,ZG],.3,{c:P.c4,r:.07,n:7,a:e});R.flow([[0,.6,ZP],[0,.6,ZG-.1]],{c:P.c4,r:.07,n:4,a:e})}}
    // 5. verification: 12 checks as cubes, the package's 15 test selections as bars (height: tests passed, where the report prints a count)
    if(k>=4){const va=k===4?1:.55,cc=s=>s==='PASS'?P.good:s==='WARN'?P.c5:P.mute,XC=i=>-2.4+i*.44,XT=i=>-2.6+i*.37;
      CHK.forEach((s,i)=>R.box([XC(i),0,ZC],[.3,.3,.3],{fill:mix(P.paper,cc(s),.6),a:k===4?Math.min(1,Math.max(0,e*14-i)):va}));
      R.box([XT(7),0,ZT],[5.8,.05,.45],{a:va});
      SEL.forEach(([n,s,c],i)=>{const pass=s==='PASS',hh=pass&&c?Math.max(.05,c/MX*.95*(k===4?e:1)):.08;
        R.box([XT(i),.05,ZT],[.24,hh,.24],{fill:pass?P.good:s==='NATIVE_FAIL'?P.bad:mix(P.paper,P.mute,.5),a:va,shadow:false,lw:.6})});
      if(k===4){R.label([XC(0)-.3,.12,ZC],'12 checks',{al:'right',dx:-8,fs:12.5,b:1,c:P.good,grp:'ver'});R.label([XT(0)-.3,.1,ZT],'package tests',{al:'right',dx:-8,fs:12.5,b:1,c:P.good,grp:'ver'});
        R.label([XC(CHK.indexOf('WARN')),.3,ZC],'warning',{fs:12,c:P.c5,dy:-10,wide:1});R.label([XT(0),.05+.95,ZT],'268 tests',{mono:true,fs:12,dy:-10,c:P.good,e:1});
        R.label([XT(12),.1,ZT],'2 fail · 3 unsafe',{fs:12,c:P.bad,dy:-14,wide:1});
        SUB.forEach((n,i)=>R.flow([[XS(i),.3,ZG+.05],[XS(i),.3,ZT-.2]],{c:P.good,r:.055,n:3,a:.75}))}}
    // 6. accepted into the library: the graph joins its area, the router is rebuilt
    if(k===5){const ZL=-3.95;AREAS.forEach((ar,i)=>{const x=-4.75+i*.5,on=ar.n==='MLOps',h=.08+ar.t/AMX*.7;
        R.box([x,0,ZL],[.38,h,.38],{fill:on?P.c1:mix(P.paper,P.ink,.06),a:on?1:.55*e+.2,lw:.7});
        if(on)R.label([x,h,ZL],'MLOps · Model Hubs and Registries',{fs:12.5,b:1,c:P.c1,dy:-12,a:e})});
      const xm=-4.75+AREAS.findIndex(a=>a.n==='MLOps')*.5;R.flowArc([XE,1.15,ZG],[xm,.6,ZL],.9,{c:P.c1,r:.07,n:12,a:e});
      card(R,[-5.3,0,-3.1],.6,.9,P.c3,e,true);R.label([-5.3,.9,-3.1],'router rebuilt',{fs:12.5,c:P.c3,b:1,dy:-10,a:e});
      R.label([XE+.45,.6,ZG],'about $40, paid once',{al:'left',dx:8,fs:12.5,b:1,c:P.c1,a:e})}
  }
  // task-oriented: one competition, a plan, web search, a skill tried and revised on the task, then frozen and run
  const ZB=2.8,U=4.1/24,XK=2.6;                     // the GPU-hour bars along the front (24 GPU-hours = 4.1 units), Codex
  function drawTo(R,k,e){const P=R.P;
    const ca=k<=3?1:.8;
    // 1. the competition: training data, a held-out test split, the medal it is scored on, its own page blocked
    R.box([-.9,0,-2.4],[1.5,.55,.9],{fill:mix(P.paper,P.c6,.35),a:ca});R.box([.6,0,-2.4],[1.0,.3,.9],{fill:mix(P.paper,P.c6,.12),a:ca,fa:.7});
    R.ball([1.45,.42,-2.0],.17,{c:P.c5,a:ca});
    if(k===0){R.label([-.9,.55,-2.4],'train',{fs:12,dy:-10,c:P.c6});R.label([.6,.3,-2.4],'held-out test',{fs:12,dy:-10,c:P.c6});R.label([1.45,.6,-2.0],'medal',{fs:12,c:P.c5,al:'left',dx:10})}
    const wa=k===0?1:.35;card(R,[-2.9,0,-2.4],.75,.9,P.mute,wa,true);
    R.line([[-3.2,.15,-2.35],[-2.6,.8,-2.35]],{c:P.bad,w:2.6,a:wa});R.line([[-3.2,.8,-2.35],[-2.6,.15,-2.35]],{c:P.bad,w:2.6,a:wa});
    if(k===0)R.label([-2.9,.9,-2.4],'its own page: blocked',{fs:12.5,c:P.bad,dy:-10});
    // 2. scope: the plan's open questions
    const pa=k<1?0:k===1?e:k<=4?1:.4;if(pa>0)plate(R,pa);
    const QS=['which model?','preprocessing?','related work?'];
    if(k>=1&&k<=2)QS.forEach((q,i)=>{const x=-1.4+i*1.4,a=k===1?Math.min(1,Math.max(0,e*4-i)):.35;R.box([x,0,.2],[.34,.34,.34],{fill:mix(P.paper,P.c5,.45),a});
      if(k===1)R.label([x,0,.2],q,{fs:12.5,c:P.ink,dy:14,a,wide:1})});
    // 3. ground: web search builds the evidence for this task
    if(k===2){for(let i=0;i<6;i++){const x=-3.4+i*1.2;card(R,[x,0,-3.6],.6,.55,P.c2,e,false);R.flowArc([x,.55,-3.6],[-1.8+i*.7,.7,ZP-.05],.5,{c:P.c2,r:.06,n:6,a:.85})}
      R.label([-3.4,.65,-3.6],'web search',{al:'right',dx:-10,fs:12.5,b:1,c:P.c2})}
    // 4-6. the skill (versions stack up while trials run), Codex running trials on the competition
    const NV=4,nv=k<3?0:k===3?1:k===4?1+Math.floor(Math.min(.999,e)*NV):NV,sa=k<3?0:k===3?e:1,XV=-.6;
    if(sa>0){for(let v=0;v<nv;v++){const last=v===nv-1,a=last?sa:k===5?.15:.35;card(R,[XV-.22*(nv-1-v),0,ZG-.12*(nv-1-v)],.85,1.05,P.c1,a,true)}
      R.label([XV,1.05,ZG],k===5?'frozen skill · no scripts':'skill v'+nv,{mono:true,fs:12.5,b:1,c:P.c1,dy:-10});
      R.flow([[XV,.65,ZP],[XV,.65,ZG-.1]],{c:P.c4,r:.07,n:4,a:k===5?.25:.9})}
    const xa=k<3?0:k===3?e:1;
    if(xa>0){R.box([XK,0,ZG],[1.1,.42,.9],{fill:mix(P.paper,P.c3,.35),a:xa});R.label([XK,.42,ZG],'Codex',{fs:13,b:1,c:P.c3,dy:-10,a:xa});
      R.flowArc([XV+.45,.8,ZG],[XK-.5,.42,ZG],.25,{c:P.c1,r:.06,n:5,a:xa*.9});
      R.flowArc([XK,.42,ZG-.3],[-.6,.58,-2.3],1.1,{c:P.c3,r:.07,n:12,a:xa*.9,speed:1.6});
      if(k===4){R.flowArc([-1.3,.6,-2.0],[-1.3,.9,ZP-.05],.45,{c:P.c6,r:.06,n:6,a:.9});R.label([-1.0,1.0,-1.3],'log and result',{al:'left',dx:8,fs:12,c:P.c6,wide:1})}}
    // the GPU-hour bars: exploration (not counted) grows with the trials; the counted run follows the freeze
    if(k>=3){const ex=k===3?2*e:k===4?2+22*e:24,x0=-4.3,x1=.2;
      R.box([x0+12*U,0,ZB],[24*U,.04,.4],{fill:mix(P.paper,P.c2,.12),a:.8,shadow:false});
      R.box([x0+ex*U/2,0,ZB],[Math.max(.01,ex*U),.2,.36],{fill:P.c2,shadow:false});
      R.label([x0,.2,ZB],'explore '+(ex>=24?'24':ex.toFixed(0))+' GPU-h · not counted',{fs:12.5,b:1,c:P.c2,dy:-14,al:'left'});
      const ra=k===5?e:0;R.box([x1+12*U,0,ZB],[24*U,.04,.4],{fill:mix(P.paper,P.c1,.12),a:.8,shadow:false});
      if(ra>0){R.box([x1+12*U*ra,0,ZB],[24*U*ra,.2,.36],{fill:P.c1,shadow:false});R.label([x1+24*U,.2,ZB],'run 24 GPU-h · counted',{fs:12.5,b:1,c:P.c1,dy:-20,al:'right',a:ra})}}
  }
  function draw(R,k,e){R.grid(-5.6,5.2,-4.2,3.4,.5);(M==='ag'?drawAg:drawTo)(R,k,e)}
  const full={cam:[.25,.62],bounds:[[-5,0,-4],[4.6,1.5,3.2]]};
  const VA=[{cam:[.3,.85],bounds:[[-2.6,0,-3.4],[2.6,.9,-1.2]]},{cam:[.3,.85],bounds:[[-2.6,0,-3.4],[2.8,.9,-1.2]]},{cam:[.25,.5],bounds:[[-2.8,0,-3.3],[3.4,1.4,.5]]},
    {cam:[.2,.5],bounds:[[-4.3,0,-.9],[3.6,1.4,1.6]]},{cam:[.15,.62],bounds:[[-4.3,0,.4],[3.6,1.2,3.3]]},{cam:[.25,.66],bounds:[[-5.6,0,-4.2],[4.6,1.4,1.5]]}];
  const VT=[{cam:[.25,.6],bounds:[[-3.5,0,-2.9],[2,1.0,-1.8]]},{cam:[.25,.55],bounds:[[-3.5,0,-2.9],[2.5,1.3,.6]]},{cam:[.25,.6],bounds:[[-4,0,-3.9],[3,1.3,.2]]},
    {cam:[.2,.58],bounds:[[-4.5,0,-2.9],[4.5,1.4,3]]},{cam:[.22,.66],bounds:[[-4.5,0,-2.9],[4.5,1.4,3.1]]},{cam:[.22,.66],bounds:[[-4.5,0,-2.9],[4.5,1.4,3.1]]}];
  const stg=S3.stage({id:'stg-meth',list:'sx-meth-ag',fig:'Eq. 8 · scope, ground, construct, verify',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5200,draw,
    view:k=>(M==='ag'?VA:VT)[k],margin:w=>w<520?[16,10,14,10]:[18,14,14,110]});
  const seg=document.getElementById('mtM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    M=b.dataset.m;['ag','to'].forEach(m=>{const l=document.getElementById('sx-meth-'+m);if(l)l.hidden=m!==M});stg.list('sx-meth-'+M)}));
})();
