// ---- Scene, Fig. 7 (section 7): a deadlock between two transfers, then the same transfers locking in one order (renderer v2) ----
// TXD.extras.traces.deadlock (steps 1 to 4) and deadlock_ordered (steps 5 and 6), PostgreSQL 16.2. A transfers 5 from user 7 to 12, B transfers 3 from 12 to 7.
(function(){
  if(!document.getElementById('stg-dl')||!window.TXD)return;const {mix,cl,at,off}=S3,T=TXD.extras.traces,D=T.deadlock,O=T.deadlock_ordered;
  const R7=[-1.75,0,0],R12=[1.75,0,0],SA=[0,0,1.95],SB=[0,0,-1.95];
  const err=D.tr.flatMap(s=>s.f||[]).find(z=>z.err)||{};
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-3,3,.5);const cA=P.c1,cB=P.c4;
    const ord=k>=4;
    // the two credit rows
    [[R7,'row 7 · Ines'],[R12,'row 12 · Quinn']].forEach(([p,t])=>{R.box(p,[1.6,.5,1.05],{fill:mix(P.paper,P.ink,.05)});R.label([p[0],.5,p[2]],t,{fs:12.5,b:1,dy:-11})});
    // who holds which row lock (a slab on the row in the holder's colour)
    const hold=(p,c,a,dz)=>{if(a<=.01)return;R.box([p[0],.5,p[2]+dz],[1.2,.1,.32],{fill:c,a,shadow:false})};
    // the sessions
    const bGone=k===3?cl(e*1.6,0,1):0,bErr=k===3&&e>.15;
    const sA=ord?'A · locks 7, then 12':'A · 7 → 12, 5 credits',sB=ord?'B · locks 7, then 12':'B · 12 → 7, 3 credits';
    R.box(SA,[1.5,.42,.8],{fill:mix(P.paper,cA,.3)});R.label([SA[0],.42,SA[2]],sA,{fs:12.5,b:1,dy:-11});
    if(!(k===3&&e>.9)){R.box(SB,[1.5,.42,.8],{fill:bErr?mix(P.paper,P.bad,.45):mix(P.paper,cB,.3),a:1-.6*bGone});R.label([SB[0],.42,SB[2]],bErr?'B · killed, 40P01':sB,{fs:12.5,b:1,dy:-11,c:bErr?P.bad:P.ink,a:1-.5*bGone})}
    else R.label([SB[0],.2,SB[2]],'B rolled back',{fs:12.5,b:1,c:P.bad});
    const top=(p,dz)=>[p[0],.5,p[2]+dz],me=s=>[s[0],.42,s[2]];
    if(!ord){
      // step 1: each takes its first row (UPDATE locks it until commit)
      const a1=k===0?e:1;hold(R7,cA,a1,.28);hold(R12,cB,k===3?1-e:a1,-.28);
      if(k===0){R.flowArc(me(SA),top(R7,.3),.6,{c:cA,a:e,r:.06,n:6});R.flowArc(me(SB),top(R12,-.3),.6,{c:cB,a:e,r:.06,n:6})}
      // step 2: A asks for row 12 and waits for B; step 3: B asks for row 7 and waits for A: a cycle
      if(k>=1&&k<3||k===3&&e<.4){const a=k===1?e:k===3?1-e/.4:1;R.flowArc(me(SA),top(R12,.3),.9,{c:P.bad,a,r:.08,n:8,speed:.7});R.label([1.2,.6,1.1],'A waits for B',{fs:12,b:1,c:P.bad,a,wide:1})}
      if(k>=2&&k<3){const a=k===2?e:1;R.flowArc(me(SB),top(R7,-.3),.9,{c:P.bad,a,r:.08,n:8,speed:.7});R.label([-1.2,.6,-1.1],'B waits for A',{fs:12,b:1,c:P.bad,a,wide:1});
        R.glow([0,.6,0],2.2,{c:P.bad,a:a*.25});R.label([2.3,.9,-2.2],'a cycle: nobody can move',{fs:13,b:1,c:P.bad,a})}
      // step 4: after deadlock_timeout Postgres kills B; A gets row 12 and commits
      if(k===3){hold(R12,cA,cl((e-.4)*3,0,1),.28);if(e>.4)R.flowArc(me(SA),top(R12,.3),.6,{c:cA,a:cl((e-.4)*3,0,1),r:.06,n:6});
        R.label([2.3,.9,-2.2],'after '+(err.ms/1000).toFixed(1)+' s: B killed, A commits',{fs:13,b:1,c:P.good,a:cl((e-.4)*3,0,1)});
        R.label([R7[0],0,.53],'final '+D.final.balances[0][1],{fs:12,mono:true,dy:13,a:cl((e-.6)*3,0,1),wide:1});R.label([R12[0],0,.53],'final '+D.final.balances[1][1],{fs:12,mono:true,dy:13,a:cl((e-.6)*3,0,1),wide:1})}
    }else{
      // step 5: same order: A locks 7 then 12 in one statement; B asks for 7 first and waits, holding nothing
      const a5=k===4?e:1-(k===5?cl(e*2,0,1):0);hold(R7,cA,a5,.28);hold(R12,cA,a5,.28);
      if(k===4){R.flowArc(me(SA),top(R7,.3),.6,{c:cA,a:e,r:.06,n:6});R.flowArc(me(SA),top(R12,.3),.6,{c:cA,a:e,r:.06,n:6});
        R.flowArc(me(SB),top(R7,-.3),.9,{c:P.bad,a:cl(e*2-.6,0,1),r:.06,n:6,speed:.7});R.label([2.3,.9,-2.2],'B waits, holding nothing: no cycle',{fs:13,b:1,c:P.good,a:cl(e*2-.6,0,1)})}
      // step 6: A commits; B takes both rows and finishes
      if(k===5){const b=cl(e*2-.6,0,1);hold(R7,cB,b,-.28);hold(R12,cB,b,-.28);R.flowArc(me(SB),top(R7,-.3),.6,{c:cB,a:b,r:.06,n:6});R.flowArc(me(SB),top(R12,-.3),.6,{c:cB,a:b,r:.06,n:6});
        R.label([2.3,.9,-2.2],'both transfers complete',{fs:13,b:1,c:P.good,a:b});
        R.label([R7[0],0,.53],'final '+O.final.balances[0][1],{fs:12,mono:true,dy:13,a:b,wide:1});R.label([R12[0],0,.53],'final '+O.final.balances[1][1],{fs:12,mono:true,dy:13,a:b,wide:1})}
    }
  }
  S3.stage({id:'stg-dl',list:'sx-dl',fig:'Fig. 5 · a deadlock, then one lock order, recorded',cam:[-.45,.72],bounds:[[-2.7,0,-2.4],[2.7,1.1,2.4]],aspect:.6,dur:1700,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[20,20,16,20]});
})();
