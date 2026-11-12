// ---- Scene, Fig. 3 (section 7): where one flipped bit goes in a data-parallel step, measured (renderer v2) ----
// Four replicas of the running example: a glass plate for each replica's weights, a block for its local gradient, the all-reduce between them.
// The run (gradient or weight, which bit) is the one picked beside the stage (window.FTSDC from 22_js_ft_sdc.js); the flipped value, the step
// at which the checksums disagree, the loss, the NaN and the replay's verdict are that run's measured values (window.FT.sdc). The red bar on the
// faulty replica is the flip's size, log10 of |after| / |before|. Positions are schematic.
(function(){
  if(!document.getElementById('stg-sdc')||!window.FTSDC)return;const {at,lerp,mix}=S3;
  const X=k=>(k-1.5)*2.7,ZW=-.45,ZG=.75,AR=[0,.1,2.9];
  function draw(R,k,e){const P=R.P,S=window.FTSDC,r=S.run(),f=r.flip,G=S.kind==='grad',lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-6.5,6.5,-3,4.4,.5);
    // the step at which the flip appears and spreads: gradient runs flip at step 2 and spread at 3; weight runs flip at 3 on one replica
    const flipK=G?1:2,flipA=k<flipK?0:k===flipK?e:1;
    const spread=G?(k<2?0:k===2?e:1):0;                    // every replica holds the bad update
    const nan=r.nan_step&&k>=4?(k===4?e:1):0;              // the loud case: NaN everywhere one step later
    const bad=i=>Math.max(nan,G?spread:(i===f.rank?flipA:0));
    // the all-reduce
    const arA=G?(k===2?1:.35):(k===1?1:.35);
    R.box(AR,[3.2,.22,1],{fill:mix(P.paper,P.c4,.4),a:arA});lab([AR[0],.32,AR[2]],'all-reduce (average)',{dy:-12,b:1,c:P.c4,a:Math.max(.55,arA)});
    for(let i=0;i<4;i++){const x=X(i),fr=i===f.rank;
      R.box([x,0,0],[2.2,.16,2.2],{fill:mix(P.paper,P.ink,.06),dz:200});
      // weights: a glass plate, red once this replica's weights are wrong
      const wc=bad(i)>.5?P.bad:P.c1;R.glass([x-.8,.18,ZW],[1.6,0,0],[0,1.15,0],{c:wc,a:.95,nu:6,nv:5});
      // the local gradient
      const gb=G&&fr&&k>=1&&k<2+1?flipA:0;R.box([x,.16,ZG],[1.3,.28,.5],{fill:gb>.5?P.bad:mix(P.paper,P.c2,.55),shadow:false});
      lab([x,.16,1.25],'replica '+i+(fr?' (faulty chip)':''),{dy:16,b:fr,c:fr?P.bad:P.ink});
      // checksums, step 4 on
      if(k>=3&&!nan&&k<5){const differs=!G&&fr;lab([x,1.45,ZW],differs?'checksum differs':'checksum ok',{dy:-10,b:1,fs:12,c:differs?P.bad:P.good,a:k===3?e:1})}
      if(nan&&k<5)lab([x,1.45,ZW],'loss NaN',{dy:-10,b:1,c:P.bad,a:nan});
    }
    // the flip: a red glow and a bar for its size in orders of magnitude
    {const fr=f.rank,x=X(fr),p=G?[x,.6,ZG]:[x+.3,.9,ZW+.06],mag=Math.log10(Math.abs(f.after)/Math.abs(f.before)),hb=Math.max(.04,Math.abs(mag)/40*2.2);
      if(flipA>0&&k<5){R.glow(p,.35,{c:P.bad,a:flipA});R.box([x+1.25,0,G?ZG:ZW],[.22,hb*flipA,.22],{fill:P.bad,shadow:false});
        if(k<3)lab([x+1.25,hb*flipA,G?ZG:ZW],S.sci(f.before)+' → '+S.sci(f.after),{al:'left',dx:8,b:1,c:P.bad,a:flipA})}}
    // flows: gradients into the all-reduce and the average back into every replica's weights
    const fl=(a,b,h,c,o)=>R.flowArc(a,b,h,Object.assign({c,r:.07,speed:1.8,n:7},o||{}));
    if(k===0)for(let i=0;i<4;i++)fl([X(i),1.4,ZW-.6],[X(i),.5,ZG],.3,P.c1,{a:e,n:4});
    if((G&&k===2)||(!G&&k===1))for(let i=0;i<4;i++){const c=G&&i===f.rank?P.bad:P.c2;fl([X(i),.45,ZG],[AR[0]+(i-1.5)*.6,.35,AR[2]],.6,c);fl([AR[0]+(i-1.5)*.6,.35,AR[2]],[X(i),1.2,ZW],1.1,G?P.bad:P.c4,{a:e})}
    if(k===4&&!nan)for(let i=0;i<4;i++)fl([X(i),.45,ZG],[AR[0]+(i-1.5)*.6,.35,AR[2]],.6,P.c2,{a:.6,n:5});
    if(k===4&&nan)for(let i=0;i<4;i++)fl([X(f.rank),.45,ZG],[X(i),1.2,ZW],1,P.bad,{a:e});
    // the replay: recompute from the step-100 checkpoint and compare fingerprints; the faulty replica is named
    if(k===5){const ck=[0,0,-2.5];R.box(ck,[2,.35,.8],{fill:mix(P.paper,P.c5,.45),a:e});lab([-1,.2,-2.5],'step-100 checkpoint',{al:'right',dx:-10,b:1,c:P.c5,a:e});
      if(r.replay){for(let i=0;i<4;i++)fl([0,.4,-2.5],[X(i),1.3,ZW],.8,i===r.replay.first[1]?P.bad:P.good,{a:e,n:6});
        lab([X(r.replay.first[1]),1.7,ZW],'replay: replica '+r.replay.first[1]+', step '+r.replay.first[0],{dy:-14,b:1,c:P.bad,a:e})}
      else lab([0,1.9,0],'no replay needed: the NaN is the alarm',{b:1,c:P.bad,a:e,wide:1})}
  }
  const st=S3.stage({id:'stg-sdc',list:'sx-sdc-grad',fig:'Fig. 3 · one flipped bit, measured',cam:[.12,.85],bounds:[[-5.4,0,-3],[6.6,2,3.7]],aspect:.5,dur:1400,hold:5200,draw,
    view:k=>(window.FTSDC.kind==='grad'?k===1:k===2)?{cam:[.45,.55],bounds:[[X(window.FT.sdc.runs.grad_hi.flip.rank)-2.2,0,-1.4],[X(window.FT.sdc.runs.grad_hi.flip.rank)+2.4,2,1.6]]}:null,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,18]});
  (window.FTSTG=window.FTSTG||{})['stg-sdc']=st;
})();
