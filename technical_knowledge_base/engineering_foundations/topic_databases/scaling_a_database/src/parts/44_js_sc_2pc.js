// ---- Scene, Fig. 4 (section 8): a transaction on one shard against one on two workers, committed with two-phase commit (renderer v2) ----
// The measured test (SC.citus.tx): UPDATE users SET plan = plan WHERE id = 11, then ids 11 and 13, which live on different workers; medians of 300.
// Rows sit on each worker's roof: gold while changed but uncommitted (locked), green once committed; a glass plate is the durable prepared state.
(function(){
  if(!document.getElementById('stg-2pc')||!window.SC)return;const {at,off,lerp,mix,cl}=S3;const X=SC.citus.tx,U=X.pair||[11,13];
  const f2=v=>v.toFixed(2),APP=[0,0,3.15],CO=[0,0,.95],CS=[2,.42,.75],WP=[[-2.7,0,-1.25],[2.7,0,-1.25]],WS=[2.3,.6,1.25],RD_=[-4.1,0,1.1];
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.6,3.4,.5);
    R.box(APP,[1.6,.3,.6],{fill:mix(P.paper,P.ink,.06)});R.label([APP[0],.32,APP[2]],'application',{fs:12.5,b:1,dy:-12});
    R.box(CO,CS,{fill:mix(P.paper,P.ink,.06)});if(R.W<520)R.label([CO[0],CS[1],CO[2]],'coordinator',{fs:12.5,b:1,dy:-12});else R.label([CO[0]-CS[0]/2,CS[1]*.5,CO[2]],'coordinator',{al:'right',dx:-10,fs:12.5,b:1});
    const cTop=[CO[0],CS[1],CO[2]];
    WP.forEach((c,i)=>{const dim=k===0&&i===1?.3:1;R.box(c,WS,{fill:mix(P.paper,P.c2,.22),a:dim});
      R.label([c[0],0,c[2]+WS[2]/2],'worker '+(i+1),{fs:12.5,b:1,dy:14,a:dim});
      // the row: changed (gold, locked) from step 2; committed (green) at step 1 for the single shard, and at step 5 for both (step 6: only worker 1 so far)
      let fill=P.paper,lab='user '+U[i];
      const changed=k>=1,committed=(k===0&&i===0)?e>.5:k===4?e>.5:k===5?i===0:false;
      if(k===0&&i===0)fill=e>.5?mix(P.paper,P.good,.55):mix(P.paper,P.c5,.6);
      else if(changed)fill=committed?mix(P.paper,P.good,.55):mix(P.paper,P.c5,.6);
      R.box([c[0]-.35,WS[1],c[2]],[.95,.28,.6],{fill,a:dim,shadow:false});R.label([c[0]-.35,WS[1]+.28,c[2]],lab,{fs:12,b:1,dy:-10,a:dim});
      // the prepared state: a glass plate standing beside the row from phase 1 until its commit
      const pa=k===2?e:k===3?1:k===4?1-e:k===5?(i===1?1:0):0;
      R.glass([c[0]+.35,WS[1],c[2]-.3],[.6,0,0],[0,.7,0],{c:P.c5,a:pa,nu:4,nv:4});R.label([c[0]+.65,WS[1]+.7,c[2]-.3],'prepared',{fs:12,c:P.c5,b:1,dy:-10,a:pa})});
    const wTop=i=>[WP[i][0]-.35,WS[1]+.3,WP[i][2]+.1],down=(i,col,a,n)=>R.flowArc([cTop[0]+(i?.3:-.3),cTop[1],cTop[2]],wTop(i),.6,{c:col,a,r:.07,speed:1.3,n}),
      up=(i,col,a)=>R.flowArc([WP[i][0]+.1,WS[1]+.1,WP[i][2]+.3],[cTop[0]+(i?.6:-.6),cTop[1],cTop[2]],.6,{c:col,a,r:.06,speed:1.3,n:6});
    // the application sends its transaction to the coordinator throughout
    R.flow([[APP[0],.3,APP[2]-.3],[CO[0],.4,CO[2]+.4]],{c:P.acc,a:k<=1?e:.35,r:.065,speed:1.1});
    if(k===0){down(0,P.acc,e);up(0,P.good,cl(e*2-1,0,1));R.label([CO[0],0,CO[2]+CS[2]/2],'one shard · '+f2(X.one_shard.p50)+' ms',{dy:15,mono:true,fs:12,b:1,wide:1,c:P.acc,a:e})}
    if(k===1){[0,1].forEach(i=>down(i,P.c4,e));R.label([CO[0],0,CO[2]+CS[2]/2],'UPDATE on each worker',{dy:15,mono:true,fs:12,b:1,wide:1,c:P.c4,a:e})}
    if(k===2){[0,1].forEach(i=>{down(i,P.c5,Math.min(1,e*2));up(i,P.good,cl(e*2-.8,0,1))});R.label([CO[0],0,CO[2]+CS[2]/2],'PREPARE TRANSACTION · both vote yes',{dy:15,mono:true,fs:12,b:1,wide:1,c:P.c5,a:e})}
    // the decision: a record on the coordinator's own disk
    const da=k===3?e:k>3?1:0;
    if(da>0){R.box([CO[0]+.45,CS[1],CO[2]],[.7,.18,.45],{fill:mix(P.paper,P.good,.5),a:da,shadow:false});
      R.label([CO[0],0,CO[2]+CS[2]/2],k===3?'decision: commit record on the coordinator':'',{dy:15,mono:true,fs:12,b:1,wide:1,c:P.good,a:da});if(k===3)R.glow([CO[0]+.45,CS[1]+.1,CO[2]],.8,{c:P.good,a:e*.5})}
    if(k===4){[0,1].forEach(i=>down(i,P.good,e));R.label([CO[0],0,CO[2]+CS[2]/2],'COMMIT PREPARED · '+f2(X.two_nodes_2pc.p50)+' ms',{dy:15,mono:true,fs:12,b:1,wide:1,c:P.good,a:e})}
    // between the two COMMIT PREPAREDs: a reader sees worker 1's half and not worker 2's
    if(k===5){down(0,P.good,.5);R.box(RD_,[1.2,.3,.6],{fill:mix(P.paper,P.ink,.06),a:e});R.label([RD_[0],.32,RD_[2]],'a reader',{fs:12.5,b:1,dy:-12,a:e});
      [0,1].forEach(i=>R.flowArc([WP[i][0]-.35,WS[1]+.15,WP[i][2]+.3],[RD_[0]+(i?.3:-.1),.3,RD_[2]-.3],.5,{c:i?P.c5:P.good,a:e,r:.06,speed:1.1,n:6}));
      R.label([RD_[0],0,RD_[2]+.3],'new user '+U[0]+', old user '+U[1],{dy:16,fs:12,b:1,c:P.bad,a:e})}
  }
  S3.stage({id:'stg-2pc',list:'sx-2pc',fig:'Fig. 4 · two-phase commit, measured',cam:[.2,.66],bounds:[[-4.6,0,-2],[4.4,1.3,3.4]],aspect:.6,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,8,14,8]:[18,20,14,20]});
})();
