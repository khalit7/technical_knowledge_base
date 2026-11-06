// ---- Scene: Fig. 3, the sixteen stop-rule runs as a field of turns (renderer v2). Data: HB.stop, the native.py runs of section 10
// (one row per run, one block per turn; block height = prompt tokens read on that turn, colour = whether the tests passed after it). ----
(function(){
  if(!document.getElementById('stg-stop')||!window.HB||!HB.stop)return;const {at,mix,lerp}=S3;
  const by={};HB.stop.forEach(r=>by[r.id]=r);
  const order=['naive_s1','naive_s2','naive_s3','naive_s4','naive_s5','naive_t0','careful_s1','careful_s2','careful_s3','careful_s4','careful_s5','verify_s1','verify_s2','verify_s3','verify_s4','verify_s5'].filter(id=>by[id]);
  const rows=order.map(id=>by[id]);
  const maxT=Math.max(...rows.map(r=>r.turns.length)),maxP=Math.max(...rows.flatMap(r=>r.turns.map(t=>t.pt)));
  const DX=.52,DZ=.4,HM=1.3,x=n=>(n-1-(maxT-1)/2)*DX;
  const zOf=[];let z=0,prev='';rows.forEach((r,i)=>{if(prev&&r.rule!==prev)z+=.35;zOf.push(z);z+=DZ;prev=r.rule});
  const z0=(zOf[zOf.length-1])/2;rows.forEach((_,i)=>zOf[i]-=z0);
  // runs that ended with a test failing on the model's own stop, and the truncated one
  const early=rows.filter(r=>!r.passed&&r.turns[r.turns.length-1].fin!=='length'&&!r.turns[r.turns.length-1].calls.length).map(r=>r.id);
  const trunc=rows.filter(r=>r.turns[r.turns.length-1].fin==='length').map(r=>r.id);
  const CAP=5,capPass=rows.filter(r=>r.turns[Math.min(CAP,r.turns.length)-1].pass).length,pass=rows.filter(r=>r.passed).length;
  const fmt=n=>Math.round(n).toLocaleString('en-GB');
  function focus(k,r){if(k===0||k===4)return 1;if(k===1)return early.includes(r.id)||trunc.includes(r.id)?1:.18;
    if(k===2)return r.rule==='verify'?1:.15;if(k===3)return r.seed===2?1:.15;return 1}
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(x(1)-1.4,x(maxT)+1.6,zOf[0]-.8,zOf[zOf.length-1]+.8,.5);
    rows.forEach((r,i)=>{const zz=zOf[i],f=focus(k,r);
      r.turns.forEach(t=>{const grow=k===0?Math.min(1,Math.max(0,e*1.5-(t.n-1)*.04)):1,h=Math.max(.02,t.pt/maxP*HM*grow);
        const cut=k===4&&t.n>CAP,a=f*(cut?lerp(1,.14,e):1)*(k===0?Math.min(1,grow*2):1);
        R.box([x(t.n),0,zz],[DX*.78,h,DZ*.72],{fill:mix(P.paper,t.pass?P.good:P.bad,.55),a,shadow:false,lw:.6});
        // 3. the verifier's nudges: the harness ran the tests and showed the failure; the run went on
        if(k===2&&r.rule==='verify'&&t.note)R.glow([x(t.n),h+.12,zz],.2,{c:P.acc,a:fa});
      });
      const last=r.turns[r.turns.length-1],lx=x(r.turns.length)+DX*.62;
      // the end of each run: green flag when it passed, red when it stopped with a test failing
      if(k>=1&&k<=3)R.box([lx,0,zz],[.06,.42,.2],{fill:r.passed?P.good:P.bad,a:f,shadow:false});
      if(k===1&&trunc.includes(r.id)&&!nar)R.label([lx,.42,zz],'cut at 1,024 output tokens',{fs:12,mono:true,al:'left',dx:8,c:P.bad,a:fa,grp:'end'});
      if(k===1&&early.includes(r.id)&&!nar)R.label([lx,.42,zz],r.id+': "done", tests failing',{fs:12,mono:true,al:'left',dx:8,c:P.bad,a:fa,grp:'end'});
      if(k===3&&r.seed===2)R.label([lx,.42,zz],r.rule+' · '+r.turns.length+' turns · '+fmt(r.spent)+' tokens',{fs:12.5,mono:true,b:r.rule==='verify',al:'left',dx:8,c:r.rule==='verify'?P.bad:P.ink,a:fa,grp:'end'});
      if(k===2&&(r.id==='verify_s4'||r.id==='verify_s2'))R.label([lx,.42,zz],r.id==='verify_s4'?'seed 4: told the tests fail, fixed it':'seed 2: three nudges, still failing',{fs:12.5,b:1,al:'left',dx:8,c:r.passed?P.good:P.bad,a:fa,grp:'end'});
    });
    // the verifier: flows from the nudged turns back into the run (the failing test output shown to the model)
    if(k===2)rows.forEach((r,i)=>{if(r.rule!=='verify')return;r.turns.forEach(t=>{if(!t.note)return;const h=t.pt/maxP*HM;R.flowArc([x(t.n),h+.05,zOf[i]],[x(t.n+1),t.n<r.turns.length?r.turns[t.n].pt/maxP*HM+.05:h,zOf[i]],.5,{c:P.acc,a:fa,r:.055,n:4,speed:1})})});
    // rule names on the left
    [['naive',0],['careful',6],['verify',11]].forEach(([nm,i])=>{const ids=rows.map((r,j)=>[r,j]).filter(([r])=>r.rule===nm);if(!ids.length)return;
      const zm=(zOf[ids[0][1]]+zOf[ids[ids.length-1][1]])/2;R.label([x(1)-DX*.7,0,zm],nm+' · '+ids.length+' runs',{fs:12.5,b:1,al:'right',dx:-6,c:P.ink,grp:'rule',a:k===2&&nm!=='verify'?.35:1})});
    if(k===0){R.label([x(maxT),0,zOf[0]-.25],'turn '+maxT,{fs:12,mono:true,c:P.mute,dy:-6,a:fa});R.label([x(1),0,zOf[0]-.25],'turn 1',{fs:12,mono:true,c:P.mute,dy:-6,a:fa})}
    // 5. a cap of five turns, as a glass wall across every run
    if(k===4){const wx=(x(CAP)+x(CAP+1))/2,a=Math.min(1,e*1.4);R.glass([wx,0,zOf[0]-.3],[0,0,zOf[zOf.length-1]-zOf[0]+.6],[0,1.0,0],{c:P.acc,a,nu:8,nv:3});
      R.label([wx,1.0,zOf[0]-.3],'cap: 5 turns',{fs:13,b:1,c:P.acc,dy:-12,a});
      R.label([x(maxT)-.4,1.0,zOf[zOf.length-1]],capPass+' of '+rows.length+' still pass (no cap: '+pass+')',{fs:13,b:1,c:P.ink,dy:-12,a:Math.min(1,Math.max(0,e*2-.6))})}
  }
  const zA=zOf[0],zB=zOf[zOf.length-1],full={cam:[.14,.7],bounds:[[x(1)-.6,0,zA-.4],[x(maxT)+.6,1.3,zB+.4]]};
  const zv=[11,15].map(i=>zOf[Math.min(i,zOf.length-1)]);
  S3.stage({id:'stg-stop',list:'sx-stop',fig:'Fig. 3 · sixteen runs, turn by turn',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,215,14,120],
    view:k=>k===2?{cam:[.2,.6],bounds:[[x(1)-.4,0,zv[0]-.3],[x(maxT)+.4,1.3,zv[1]+.3]]}:full});
})();
