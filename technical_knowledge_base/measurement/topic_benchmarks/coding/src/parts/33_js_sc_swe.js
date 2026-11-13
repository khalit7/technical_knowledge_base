// ---- Scene: Fig. 3, one SWE-bench task through the harness (stg-swe, renderer v2): django__django-11099 from SWE-bench Verified. A container (glass box)
// holds the repository at the base commit (a stack of files, validators.py and its test file marked); the candidate patch, then the test patch, land on
// their files; the 3 fail-to-pass and 19 pass-to-pass tests run (flows out of the container); the verdict. Four candidates (gold, the issue's suggestion,
// half the fix, no change), one step list each. The two username-validator tests are the page's re-runs (window.CD.djr, src/recompute.py); the third
// fail-to-pass test and the 19 pass-to-pass tests are drawn as the dataset records them for the gold patch, as the caption beside the stage says. ----
(function(){
  if(!document.getElementById('stg-swe')||!window.S3||!window.CD)return;
  const {mix,lerp,lerp3,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1),T=CD.dj,DJ=CD.djr;
  const F2P=['test_ascii_validator','test_unicode_validator'],NP=T.PASS_TO_PASS.length;
  const checks=m=>F2P.reduce((s,t)=>s+DJ.res[m][t].valid.filter(x=>x).length+DJ.res[m][t].invalid.filter(x=>x).length,0),NCHK=F2P.reduce((s,t)=>s+DJ.lists[t][0].length+DJ.lists[t][1].length,0);
  window.CBN=window.CBN||{};CBN.swe={np:NP,nf:T.FAIL_TO_PASS.length,nchk:NCHK,commit:T.base_commit.slice(0,10),version:T.version,
    m:Object.fromEntries(['gold','issue','half','none'].map(m=>[m,{chk:checks(m),a:DJ.res[m].test_ascii_validator.pass,u:DJ.res[m].test_unicode_validator.pass}]))};
  let mode='gold';
  const XI=-4.3,XR=-1.55,XF=1.45,XV=4.2,YS=.13,NS=7,SV=3,ST=5; // x of issue, repository, tests, verdict; slab height, slabs, validators.py and test file
  const sy=i=>.04+i*YS;
  function lab(R,p,t,o){const q=R.p(p);if((o.a!=null&&o.a<.15)||q[2]<=0)return;R.label(p,t,o)}
  function draw(R,k,e,st){const P=R.P;R.grid(-5.4,5.4,-1.8,1.8,.5);const pk=st&&st.pk!=null?st.pk:k,res=DJ.res[mode],a=res.test_ascii_validator.pass,u=res.test_unicode_validator.pass,ok=a&&u;
    const pc=mode==='gold'||mode==='issue'?P.c2:mode==='half'?P.c5:P.mute;
    // the issue, outside the container: what the model was given
    const aI=k===0?1:k===1?.8:.3;R.glass([XI,.05,-.45],[0,0,.9],[0,1.0,0],{c:P.c1,a:aI,nu:2,nv:5});
    lab(R,[XI,1.05,0],'the issue',{b:1,dy:-10,wide:k!==1&&k!==2,a:k===3||k===4?0:aI});lab(R,[XI,0,.45],'trailing newline in usernames',{fs:12,dy:14,c:P.mute,a:k===0?aI:0,wide:1});
    // the container and the repository inside it
    const cA=k===0?win(e,0,.6):k===3||k===4?.18:1;   // steps 4 and 5 move in on the tests, so the container (cut by the crop) recedes
    R.glass([XR-1.05,.0,-.8],[2.1,0,0],[0,1.35,0],{c:P.c6,a:cA*.7,nu:4,nv:3});R.glass([XR-1.05,0,-.8],[0,0,1.6],[0,1.35,0],{c:P.c6,a:cA*.6,nu:3,nv:3});R.glass([XR+1.05,0,-.8],[0,0,1.6],[0,1.35,0],{c:P.c6,a:cA*.6,nu:3,nv:3});
    lab(R,[XR,1.35,-.8],'container · Django '+T.version+' @ '+T.base_commit.slice(0,10),{fs:12,b:1,mono:true,dy:-10,c:P.c6,wide:k===5,a:k===3||k===4?0:cA});
    const pA=k>=1?(k===1?win(e,.55,.9):1):0,tA=k>=2?(k===2?win(e,.55,.9):1):0;
    for(let i=0;i<NS;i++){const f=i===SV&&pA>0?mix(P.paper,pc,.5*pA):i===ST&&tA>0?mix(P.paper,P.c6,.5*tA):P.paper;R.box([XR,sy(i),0],[1.2,.1,.9],{fill:f,a:cA,shadow:i===0,lw:.7})}
    lab(R,[XR-.6,sy(SV)+.05,.45],'validators.py',{fs:12,mono:true,al:'right',dx:-6,b:k===1,c:k===1?pc:P.ink,a:k===1||k===2?cA:0,grp:'files'});
    lab(R,[XR-.6,sy(ST)+.05,.45],'test_validators.py',{fs:12,mono:true,al:'right',dx:-6,b:k===2,c:k===2?P.c6:P.ink,a:k===1||k===2?cA:0,grp:'files'});
    // the candidate patch flies from beside the issue onto validators.py; the test patch drops onto its test file
    if(k===1&&e<.95){const p=lerp3([XI+.2,.5,.9],[XR,sy(SV)+.1,0],win(e,.15,.75)),a=1-win(e,.75,.95);R.box(p,[.6,.06,.45],{fill:mix(P.paper,pc,.7),a,shadow:false});
      R.flowArc([XI+.2,.55,.9],[XR,sy(SV)+.15,0],.5,{c:pc,a:.8*(1-win(e,.8,1)),n:7})}
    if(k===1)lab(R,[XR,0,.8],'ASCII '+DJ.cand[mode][0]+' · Unicode '+DJ.cand[mode][1],{fs:12,mono:true,dy:16,c:pc,b:1,a:win(e,.5,1)});
    if(k===2&&e<.95){const p=lerp3([XR+.2,2.1,0],[XR,sy(ST)+.1,0],win(e,.15,.75)),a=1-win(e,.75,.95);R.box(p,[.6,.06,.45],{fill:mix(P.paper,P.c6,.7),a,shadow:false});
      R.flow([[XR+.2,2.15,0],[XR,sy(ST)+.15,0]],{c:P.c6,a:.8*(1-win(e,.8,1)),n:6})}
    if(k===2)lab(R,[XR,0,.8],"test patch: + 'trailingnewline\\n' as an invalid username",{fs:12,mono:true,dy:16,c:P.c6,b:1,a:win(e,.5,1)});
    // the tests: three fail-to-pass cubes in front, 19 pass-to-pass behind
    const fA=k>=3?1:.35,fR=k===3?win(e,.2,.8):k>3?1:0,fv=[a,u,true];
    ['ascii','unicode','help_text'].forEach((nm,i)=>{const x=XF-.55+i*.55,lit=fR>=(i+1)/3-.01;
      R.box([x,0,.55],[.36,.36,.36],{fill:lit?mix(P.paper,fv[i]?P.good:P.bad,.65):P.paper,a:fA});
      lab(R,[x,0,.75],nm,{fs:12,mono:true,dy:13+(i===1?14:0),a:k===3||k===4?1:0,b:lit&&!fv[i],c:lit&&!fv[i]?P.bad:P.ink})});
    lab(R,[XF+.85,.18,.55],'fail-to-pass · '+T.FAIL_TO_PASS.length,{fs:12,b:1,al:'left',dx:6,a:k===3||k===4?1:0});
    const pR=k===4?win(e,.1,.85):k>4?1:0;
    for(let i=0;i<NP;i++){const c=i%10,r=Math.floor(i/10),x=XF-.9+c*.2,lit=pR>=(i+1)/NP-.001;R.box([x,0,-.35-r*.25],[.15,.15,.15],{fill:lit?mix(P.paper,P.good,.6):P.paper,a:k>=4?1:.35,shadow:false,lw:.5})}
    lab(R,[XF+1.05,.08,-.47],'pass-to-pass · '+NP,{fs:12,b:1,al:'left',dx:6,a:k===3?.4:k===4?1:0});
    // running: dots from the container to the tests
    if(k===3)R.flowArc([XR+1.0,.5,.3],[XF-.55+Math.min(2,Math.floor(fR*3))*.55,.4,.55],.35,{c:P.c6,a:.85,n:7});
    if(k===4)R.flowArc([XR+1.0,.5,-.3],[XF,.2,-.5],.35,{c:P.c6,a:.85,n:8});
    if(k===3)lab(R,[XF+.85,.18,.55],checks(mode)+' of '+NCHK+' username checks right',{fs:12.5,b:1,al:'left',dx:6,dy:20,c:ok?P.good:P.bad,a:win(e,.6,1)});
    // the verdict
    const vA=k===5?win(e,.2,.8):0;
    if(k===5){R.flowArc([XF+.4,.35,.55],[XV-.3,.45,0],.35,{c:ok?P.good:P.bad,a:vA,n:7});R.flowArc([XF+.9,.2,-.5],[XV-.3,.3,0],.3,{c:P.good,a:vA*.7,n:6})}
    R.box([XV,0,0],[.75,.6,.75],{fill:k===5?mix(P.paper,ok?P.good:P.bad,.6*vA):P.paper,a:k===5?1:.35});
    lab(R,[XV,.6,0],k===5?(ok?'RESOLVED':'NOT RESOLVED'):'verdict',{b:1,fs:k===5?13.5:12.5,dy:-11,c:k===5?(ok?P.good:P.bad):P.ink,a:k===5?Math.max(.35,vA):k>=1&&k<=4?0:.35});
  }
  const full={cam:[.22,.6],bounds:[[-4.9,0,-1.1],[4.8,1.5,1.3]]};
  const stg=S3.stage({id:'stg-swe',list:'sx-swe-gold',fig:'Fig. 3 · '+T.instance_id+', SWE-bench Verified',cam:full.cam,bounds:full.bounds,aspect:.42,dur:1700,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[24,16,22,16],
    view:k=>k===1||k===2?{cam:[.26,.5],bounds:[[-4.9,0,-1.1],[.0,2.1,1.3]]}:k===3||k===4?{cam:[.2,.55],bounds:[[-.1,0,-1.1],[3.3,1.1,1.4]]}:null});
  document.querySelectorAll('#swe-mode button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#swe-mode button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;
    ['gold','issue','half','none'].forEach(m=>{document.getElementById('sx-swe-'+m).hidden=m!==mode});if(window.TKD)TKD(mode);stg.list('sx-swe-'+mode)}));
  CBN.sweStage=stg;
})();
