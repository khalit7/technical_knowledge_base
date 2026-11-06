// ---- Scene: Fig. 5, a correction that arrives mid-run (renderer v2), replayed from three recorded Haiku 4.5 runs in window.HPD:
// s1_haiku_steer_gateoff (front track), s1_haiku_followup_gateoff (back track) and, at the last step, s1_haiku_followup_gateon.
// One block per tool call, coloured by its action class (read, reversible, staged memory, irreversible); the correction is a yellow ball
// from Sam that enters the steering run at the next tool boundary and waits in a queue for the follow-up run. Steps: ol#sx-steer. ----
(function(){
  if(!document.getElementById('stg-steer')||!window.HPD)return;const {mix,lerp3,at}=S3;
  const ZS=1.0,ZF=-1.0,X0=-2.4,DX=1.2,XR2=1.7,GAR=3.3,SAM=[-4.3,0,0],QB=[-1.8,0,-2.3],AQ=[0,0,-2.4];
  // blocks of a record: one per tool call; run 2 starts at XR2
  function blocks(key){const r=HPD[key],out=[];if(!r)return out;r.runs.forEach((run,ri)=>{let j=0;run.steps.forEach(s=>{if(!s.tool)return;out.push({x:ri?XR2+j*DX:X0+j*DX,ri,tool:s.tool,cls:s.cls,dec:s.dec});j++})});return out}
  const ST=blocks('s1_haiku_steer_gateoff'),FO=blocks('s1_haiku_followup_gateoff'),FG=blocks('s1_haiku_followup_gateon');
  const colOf=(P,b)=>b.dec==='hold'||b.dec==='stage'?mix(P.paper,P.c5,.55):b.cls==='irreversible'?mix(P.paper,P.bad,.6):b.cls==='reversible'?mix(P.paper,P.c3,.5):b.cls==='staged'?mix(P.paper,P.c5,.5):mix(P.paper,P.c1,.22);
  // which blocks of a track are visible at step k (calls appear as the replay reaches them)
  const shownS=(b,k)=>k===0?b.x<=X0:k>=2;
  const shownF=(b,k)=>k<=2?b.x<=X0:k===3?b.ri===0:true;
  function track(R,list,z,k,e,a,shown,lab){const P=R.P;R.box([(-2.9+3.0)/2,0,z],[6.3,.04,.95],{fill:mix(P.paper,P.soft,.6),a:a*.8,shadow:false});
    R.label([-3.05,.05,z],lab,{fs:12.5,b:1,c:P.ink,al:'right',dx:-6,a:Math.max(.4,a),grp:'trk'});
    list.forEach(b=>{if(!shown(b,k))return;const fresh=(k===2&&z===ZS&&b.x>X0)||(k===3&&z===ZF&&b.ri===0&&b.x>X0)||(k===4&&z===ZF&&b.ri===1)||(k===5&&b.ri===1);
      const g=fresh?e:1;R.box([b.x,.04,z],[.78,.36*g+.01,.62],{fill:colOf(P,b),a,lw:.8});
      if(a>.5)R.label([b.x,.42,z],b.tool,{mono:true,fs:12,c:b.cls==='irreversible'?P.bad:P.ink,dy:-8,a:a*g,b:b.cls==='irreversible',wide:1})})}
  function draw(R,k,e){const P=R.P;R.grid(-5,4.2,-3,2.4,.5);
    const aS=k<=2?1:.22,aF=k===2?.3:1;
    // Sam and the garage
    R.box(SAM,[.6,.5,.6],{fill:mix(P.paper,P.c5,.35)});if(k<=2)R.label([SAM[0],.5,SAM[2]],'Sam',{fs:13,b:1,c:P.ink,dy:-10});
    R.box([GAR,0,ZF],[.8,.5,.7],{fill:mix(P.paper,P.bad,.15),a:k>=3&&k<=4?1:.35});if(k>=3&&k<=4)R.label([GAR,.5,ZF],'Bay Motors',{fs:12.5,b:1,c:P.ink,dy:-10});
    track(R,ST,ZS,k,e,aS,shownS,'steer');
    track(R,k===5?FG:FO,ZF,k,e,aF,shownF,k===5?'follow-up, gate on':'follow-up');
    // the boundary after call 1
    const bx=X0+DX/2;[ZS,ZF].forEach(z=>{if((z===ZS?aS:aF)>.5)R.line([[bx,.02,z-.45],[bx,.62,z-.45],[bx,.62,z+.45],[bx,.02,z+.45]],{c:P.mute,w:1,dash:[3,3]})});
    if(k===1||k===2)R.label([bx,.62,ZS-.45],'tool boundary',{fs:12,c:P.mute,al:'left',dx:6,dy:-4,a:k===1?e:1,wide:1});
    const msg=P.c5,tS=[bx,.75,ZS],tQ=[QB[0],.55,QB[2]];
    // 2. the correction leaves Sam for both runs
    if(k===1){R.flowArc([SAM[0],.55,0],tS,.5,{c:msg,r:.07,n:6,a:e});R.flowArc([SAM[0],.55,0],tQ,.5,{c:msg,r:.07,n:6,a:e});
}
    // 3. steer: it enters the steering run before call 2
    if(k===2){R.ball(lerp3([bx,1.2,ZS],[bx,.5,ZS],e),.13,{c:msg});R.glow([bx,.5,ZS],.45,{c:msg,a:e});R.flow([[bx,.5,ZS],[X0+DX-.3,.3,ZS]],{c:msg,r:.05,n:4,a:e});
      R.label([X0+DX,.4,ZS],'a draft, nothing sent',{fs:12.5,b:1,c:P.c3,dy:28,a:e})}
    // 4 to 6. follow-up: queued until the run ends
    const qa=k>=1&&k!==2?1:.3;if(k>=1){R.box(QB,[.75,.32,.5],{fill:mix(P.paper,P.c5,.25),a:k===1?e*qa:qa});if(k!==2)R.label([QB[0]-.42,.2,QB[2]],k>=4?'queue, then a new turn':'queued until the run ends',{fs:12.5,c:P.c5,b:1,al:'right',dx:-6,a:k===1?e:1})}
    if(k>=3&&k<=4){R.ball([QB[0],.48,QB[2]],.12,{c:msg})}
    if(k===3){const sb=FO.find(b=>b.cls==='irreversible'&&b.ri===0);if(sb){R.flowArc([sb.x,.45,ZF],[GAR,.5,ZF],.9,{c:P.bad,r:.07,n:8,a:e});R.label([(sb.x+GAR)/2,1.1,ZF],'booking confirmed, sent',{fs:12.5,b:1,c:P.bad,dy:-6,a:e})}}
    if(k===4){const s2=FO.find(b=>b.ri===1);if(s2){R.flowArc([QB[0],.48,QB[2]],[s2.x,.45,ZF],.6,{c:msg,r:.06,n:6,a:e});R.flowArc([s2.x,.45,ZF],[GAR,.5,ZF],.5,{c:P.bad,r:.07,n:6,a:e});R.label([s2.x,.9,ZF],'apology, sent',{fs:12.5,b:1,c:P.bad,dy:-8,a:e})}}
    // 6. gate on: the same send is held in an approval queue it cannot withdraw from
    if(k===5){const hb=FG.find(b=>b.dec==='hold');R.box(AQ,[1.0,.4,.6],{fill:mix(P.paper,P.c5,.45),a:e});R.label([AQ[0]+.55,.25,AQ[2]],'approval queue · still waiting for Sam',{fs:12.5,b:1,c:P.c5,al:'left',dx:6,a:e});
      if(hb)R.flowArc([hb.x,.45,ZF],[AQ[0],.45,AQ[2]],.4,{c:P.c5,r:.07,n:6,a:e})}
  }
  const full={cam:[.32,.7],bounds:[[-4.7,0,-2.8],[3.8,1.1,1.6]]};
  S3.stage({id:'stg-steer',list:'sx-steer',fig:'Fig. 5 · a correction mid-run, three recorded Haiku runs',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    view:k=>k<=1?{cam:[.4,.75],bounds:[[-4.8,0,-2.8],[-.4,1.1,1.6]]}:k===2?{cam:[.35,.6],bounds:[[-3.4,0,.2],[.6,1.1,1.6]]}:k===5?{cam:[.3,.8],bounds:[[-3.4,0,-2.9],[2.8,1.0,-.2]]}:{cam:[.3,.82],bounds:[[-3.4,0,-2.8],[3.9,1.0,-.3]]},
    margin:w=>w<520?[16,10,14,10]:[26,16,16,70]});
})();
