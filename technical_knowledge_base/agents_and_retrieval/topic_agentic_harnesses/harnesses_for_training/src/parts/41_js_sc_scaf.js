// ---- Scene: Fig. 2, the scaffold experiment (renderer v2). Data: HT.runs (every rollout's hidden and visible result) and HT.table
// (success and input tokens per model and harness). Front row Qwen3-4B, back row Haiku 4.5; one plate per harness; one block per rollout. ----
(function(){
  if(!document.getElementById('stg-scaf')||!window.HT)return;const {at,mix}=S3,HT=window.HT;
  const HX={bash:-4.2,tools:-1.4,plain:1.4,ccfull:4.2},MZ={local:1.45,haiku:-1.45},NAME=HT.harness;
  const row=(m,h)=>HT.table.find(x=>x.m===m&&x.h===h);
  const cells=[];['local','haiku'].forEach(m=>['bash','tools','plain','ccfull'].forEach(h=>{const t=row(m,h);if(!t)return;
    const rs=HT.runs.filter(r=>r.m===m&&r.h===h),reps=[...new Set(rs.map(r=>r.r))].sort();cells.push({m,h,t,rs,reps})}));
  const maxInp=Math.max(...HT.table.filter(x=>x.m==='haiku').map(x=>x.inp));
  const kt=n=>(n/1000).toFixed(1)+'k';
  function draw(R,k,e){const P=R.P,fa=Math.min(1,e*1.6),nar=R.W<520;R.grid(-6,6,-3.4,3,.5);
    const emph=c=>k===0?1:k===1?(c.m==='local'?(c.h==='bash'?1:.32):.14):k===2?(c.m==='local'?(c.h==='bash'?.45:1):.14):k===3?(c.m==='haiku'?1:.22):(c.m==='haiku'?.4:.1);
    cells.forEach(c=>{const a=emph(c),x0=HX[c.h],z0=MZ[c.m],nr=c.reps.length,dep=nr*.32+.25;
      R.box([x0,0,z0],[2.6,.03,dep],{a:a*.9,shadow:false});
      c.rs.forEach(r=>{const ti=+r.t.slice(1)-1,ri=c.reps.indexOf(r.r),x=x0+(ti-4.5)*.245,z=z0+(ri-(nr-1)/2)*.32;
        const hgt=r.bin?.7:r.vis?.35:.04,fill=r.bin?P.good:r.vis?P.c5:mix(P.paper,P.mute,.35);
        R.box([x,.03,z],[.18,hgt,.22],{fill,a,shadow:false,lw:.6})});
      const la=a<.3?0:a;if(k!==4||c.m==='local')R.label([x0,.78,z0],HT.f[(c.m==='local'?'loc_':'hk_')+c.h],{fs:14,b:1,mono:true,dy:-8,c:a>.5?P.ink:P.mute,a:la});
      if(k!==4)R.label([x0,0,z0+dep/2],NAME[c.h],{fs:12,dy:14,c:P.mute,a:la,wide:1})});
    R.label([-5.75,.2,MZ.local],'Qwen3-4B',{fs:13,b:1,al:'right',dx:-4,c:P.ink,a:k===3?.4:k===4?0:1,grp:'m'});
    R.label([-5.75,.2,MZ.haiku],'Haiku 4.5',{fs:13,b:1,al:'right',dx:-4,c:P.ink,a:k===1||k===2?.4:k===4?0:1,grp:'m'});
    if(k===1)R.label([HX.bash,0,MZ.local+.9],HT.f.loc_bash_nochange+': code never changed',{fs:12.5,mono:true,b:1,dy:18,c:P.bad,a:fa});
    if(k===2){R.label([(HX.tools+HX.plain)/2,1.5,MZ.local],HT.f.pair_loc_bash_tools+' points over bash · line numbers: no detectable change',{fs:12.5,b:1,c:P.good,a:fa,dy:-8,wide:1});
      R.label([HX.tools,0,MZ.local+.9],HT.f.loc_tools_editerr+' edit errors',{fs:12,mono:true,dy:18,c:P.c5,a:fa});R.label([HX.plain,0,MZ.local+.9],HT.f.loc_plain_editerr+' edit errors',{fs:12,mono:true,dy:18,c:P.c5,a:fa})}
    if(k===3)R.label([0,1.15,MZ.haiku],HT.f.hk_min+' to '+HT.f.hk_max+' in every harness',{fs:12.5,b:1,c:P.ink,a:fa,dy:-8});
    // the bill: input tokens per rollout as glass columns behind each Haiku plate, tokens streaming into the plate
    if(k===4)cells.filter(c=>c.m==='haiku').forEach((c,i)=>{const hgt=2.3*c.t.inp/maxInp*fa,x=HX[c.h],z=MZ.haiku+1.15;
      R.glass([x-.45,0,z],[.9,0,0],[0,Math.max(.02,hgt),0],{c:P.c1,a:.95,nu:3,nv:Math.max(2,Math.round(hgt*4))});
      R.flow([[x,hgt,z-.02],[x,hgt+.05,z-.45],[x,.75,MZ.haiku+.3]],{c:P.c1,a:fa*.85,r:.05,speed:1.2,n:Math.max(3,Math.round(14*c.t.inp/maxInp))});
      if(nar)R.label([x,hgt,z],kt(c.t.inp),{fs:12.5,mono:true,b:1,dy:-10,c:P.c1});else R.label([x,hgt,z],NAME[c.h]+': '+kt(c.t.inp)+' tokens · $'+c.t.cost.toFixed(3),{fs:12.5,mono:true,b:1,dy:-10,c:P.c1,grp:'bill'})});
  }
  const full={cam:[.18,.72],bounds:[[-6.2,0,-2.4],[5.6,1,2.3]]};
  S3.stage({id:'stg-scaf',list:'sx-scaf',fig:'Fig. 2 · 240 rollouts, four harnesses, two models',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[18,14,14,14],
    view:k=>k===1?{cam:[.35,.6],bounds:[[-5.6,0,.6],[-2.8,.9,2.2]]}:k===2?{cam:[.2,.62],bounds:[[-5.6,0,.4],[2.8,1.5,2.3]]}:k===3?{cam:[.15,.6],bounds:[[-6.2,0,-2.3],[5.6,1.2,-.6]]}:k===4?{cam:[.15,.5],bounds:[[-6.2,0,-2.4],[5.6,2.5,.4]]}:full});
})();
