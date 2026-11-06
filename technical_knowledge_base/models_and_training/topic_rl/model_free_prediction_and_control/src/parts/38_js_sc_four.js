// ---- Scene (section 4): one recorded episode on a 3 x 6 cliff, four learners updating four copies of the same Q-table side by side ----
// Data: the page's engine, MFE.mDefault() (the starting table is Q-learning's after 30 seeded episodes; the episode is seed 6, 14 steps)
// and MFE.fourLearners(Q0, T, 0.5, 0.1), which returns the four tables after every step (checked in src/checks/recompute.py).
// Each cell carries its four action values as bars pointing up, down, right and left; a bar's height grows with the square root of -Q (the cost to the goal).
// Each stage step covers a stretch of the episode (FR below); the bars and the agent move step by step through it.
// Renderer v2: each table is a tinted glass plate; each TD learner's target streams from the next state into the bar it updates; Monte Carlo's
// return streams back along the whole episode when it ends; the bars a transition changes stand out while the rest recede; no shadows (208 bars).
(function(){
  const M=window.MFE;if(!M||!window.S3||!document.getElementById('stg-four'))return;const {mix}=S3;
  const D=M.mDefault();if(!D)return;const T=D.T,L=M.fourLearners(D.Q0,T,0.5,0.1),F=L.F,N=T.length;
  const ORD=['sarsa','esarsa','q','mc'],NM={sarsa:'SARSA',esarsa:'Expected SARSA',q:'Q-learning',mc:'Monte Carlo'},CL={sarsa:'c1',esarsa:'c3',q:'c2',mc:'c4'};
  // the four grids, 2 x 2: SARSA and Expected SARSA at the back, Q-learning and Monte Carlo in front
  const OFF={sarsa:[-3.35,-2],esarsa:[3.35,-2],q:[-3.35,2],mc:[3.35,2]};
  const cx=(g,s)=>OFF[g][0]+(s%M.MC-2.5),cz=(g,s)=>OFF[g][1]+(((s/M.MC)|0)-1);
  const DIR=[[0,-.27],[0,.27],[.27,0],[-.27,0]];                                      // up, down, right, left within a cell
  const HQ=q=>.22*Math.sqrt(Math.max(0,-q));
  // stage steps: [from frame, to frame]; frame f is the tables after f steps of the episode
  const FR=[[0,0],[0,3],[3,4],[4,5],[5,13],[13,14],[14,14]];
  const kFall=T.findIndex(s=>s.r===-100),kPrev=kFall-1,kPair=T[kPrev].s*4+T[kPrev].a,kDown=T[kFall].s*4+T[kFall].a;
  const pos=f=>{let s=M.MS;for(let j=0;j<f;j++)s=T[j].s2;return s};
  function agentAt(fr){const f0=Math.floor(fr),u=fr-f0;if(u<=0||f0>=N)return {s:pos(f0),u:0};const st=T[f0],a=pos(f0);
    // a fall goes to the cliff cell first, then back to the start
    return {s:a,to:st.r===-100?st.hit:st.s2,u,fall:st.r===-100}}
  const f1=v=>(v<0?'−':'')+Math.abs(v).toFixed(1);
  // the cells the agent visits, in order, a fall passing through the cliff cell it hit (Monte Carlo's return flows back along them)
  const visits=[M.MS];T.forEach(st=>{if(st.r===-100)visits.push(st.hit);visits.push(st.s2)});
  const top=(g,s,q,Q)=>[cx(g,s)+DIR[q][0],HQ(Q)+.03,cz(g,s)+DIR[q][1]];
  function draw(R,k,e){const P=R.P,[a,b]=FR[k],fr=a+(b-a)*e,f0=Math.floor(fr),fu=fr-f0,Fa=F[Math.min(N,f0)],Fb=F[Math.min(N,f0+1)];
    const j=f0<N&&fu>0?f0:Math.round(fr)-1,cf=Math.ceil(fr);              // j: the transition being played (or the last one, while a step holds)
    ORD.forEach(g=>{const ox=OFF[g][0],oz=OFF[g][1],C=P[CL[g]];
      R.label([ox-3,0,oz-1.5],NM[g],{al:'left',fs:13,b:1,c:C,dy:-10});
      // the learner's Q-table: a tinted glass plate under its cells, drawn beneath everything else
      R.glass([ox-3,0,oz-1.5],[6,0,0],[0,0,3],{c:C,nu:M.MC,nv:M.MR,th:.05,a:.4,dz:60});
      for(let s=0;s<M.MR*M.MC;s++){const x=cx(g,s),z=cz(g,s),cl=M.mCliff(s),gl=s===M.MG;
        if(cl||gl){R.quad([[x-.46,.01,z-.46],[x+.46,.01,z-.46],[x+.46,.01,z+.46],[x-.46,.01,z+.46]],{fill:cl?mix(P.paper,P.bad,.6):mix(P.paper,P.good,.5),ea:.4,dz:40});continue}
        for(let q=0;q<4;q++){const i=s*4+q,v=Fa.Q[g][i]+(Fb.Q[g][i]-Fa.Q[g][i])*fu,ch=cf>0&&Math.abs(F[Math.min(N,cf)].Q[g][i]-F[Math.max(0,cf-1)].Q[g][i])>1e-9;
          const key=i===kPair&&k>=2;
          // composition: the bars this transition changes, and the key pair, at full strength; the rest of the table recedes
          R.box([x+DIR[q][0],0,z+DIR[q][1]],[.24,Math.max(.02,HQ(v)),.24],{fill:key?P.acc:ch?mix(P.paper,C,.9):mix(P.paper,C,.3),lw:.6,ea:key||ch?.8:.35,a:ch||key?1:.6,shadow:false});
          if(key&&(k===2||k===6))R.label([x+DIR[q][0],HQ(v),z+DIR[q][1]],n2(v),{fs:12,b:1,mono:true,c:P.acc,dy:-10,grp:'k'+g})}}
      // each TD learner's update: its target's value streams from the next state into the bar it changes
      // (SARSA from the action taken next, Expected SARSA from the whole next cell, Q-learning from the best action there)
      if(j>=0&&j<N&&g!=='mc'){const st=T[j],Q=F[j].Q[g],dst=top(g,st.s,st.a,F[j+1].Q[g][st.s*4+st.a]);let src;
        if(st.done)src=[cx(g,st.s2),.05,cz(g,st.s2)];
        else if(g==='sarsa')src=top(g,st.s2,st.a2,Q[st.s2*4+st.a2]);
        else if(g==='q'){let bq=0;for(let q=1;q<4;q++)if(Q[st.s2*4+q]>Q[st.s2*4+bq])bq=q;src=top(g,st.s2,bq,Q[st.s2*4+bq])}
        else src=[cx(g,st.s2),.35,cz(g,st.s2)];
        R.flowArc(src,dst,.5,{c:C,r:.08,n:7,speed:1.1,top:1})}
      // Monte Carlo at the end of the episode: the return flows back along every cell the episode visited
      if(g==='mc'&&k>=5&&(k===6||fr>=N-.02)){const pts=visits.map(s=>[cx(g,s),.12,cz(g,s)]).reverse();R.line(pts,{c:C,w:1.2,a:.5,top:1});R.flow(pts,{c:C,r:.07,speed:2.2,n:Math.round(pts.length*1.6),top:1})}
      // the agent, the same moves on every grid
      const A=agentAt(fr),p0=[cx(g,A.s),.25,cz(g,A.s)];let p=p0;
      if(A.to!=null){const p1=[cx(g,A.to),.25,cz(g,A.to)];p=A.fall&&A.u>.6?[cx(g,M.MS),.25,cz(g,M.MS)]:[p0[0]+(p1[0]-p0[0])*Math.min(1,A.u/.6),.25,p0[2]+(p1[2]-p0[2])*Math.min(1,A.u/.6)]}
      R.ball(p,.17,{c:P.acc,top:1})});
  }
  // under the step list: this step's target and update for each learner
  const n2=v=>(v<0?'−':'')+Math.abs(v).toFixed(2);
  const ROW=['top','middle','bottom'],cell=s=>s===M.MS?'the start':s===M.MG?'the goal':ROW[(s/M.MC)|0]+' row, column '+(s%M.MC+1);
  function table(k){const el=document.getElementById('rd-fourTab');if(!el)return;const f=FR[k][1];
    if(f===0){el.innerHTML='<tr><th>Learner</th><th>Target</th><th>Q(S, A)</th></tr><tr><td colspan="3">Nothing yet: every learner holds the same table.</td></tr>';return}
    const st=T[f-1],u=F[f].u;let h='<tr><th colspan="3">Step '+f+' of '+N+': in '+cell(st.s)+', '+(st.x?'random':'greedy')+' move '+M.AN[st.a]+(st.r===-100?', falls (reward −100)':st.done?', reaches the goal':'')+(st.done?'':'; next action '+M.AN[st.a2]+(st.x2?' (random)':''))+'</th></tr><tr><th>Learner</th><th>Target</th><th>Q(S, A): before to after</th></tr>';
    ORD.forEach(g=>{let tg,up;if(g==='mc'){const m=u.mc;if(!m){tg='waits for the return';up='unchanged'}else{const z=m[m.length-1];tg='G = '+n2(z.tg)+' (and '+(m.length-1)+' earlier pairs)';up=n2(z.old)+' to <b>'+n2(z.nw)+'</b>'}}
      else{const x=u[g];tg=st.done?'R = '+n2(st.r)+' (terminal)':n2(st.r)+' + ('+n2(x.boot)+') = '+n2(x.tg);up=n2(x.old)+' to <b>'+n2(x.nw)+'</b>'}
      h+='<tr><td><span style="color:var(--'+CL[g]+')">&#9632;</span> '+NM[g]+'</td><td>'+tg+'</td><td class="num">'+up+'</td></tr>'});
    el.innerHTML=h}
  const full={cam:[-.1,.95],bounds:[[-6.4,0,-3.4],[6.4,1.8,3.1]]},close={cam:[-.1,.8],bounds:[[-6.45,0,-2.6],[4.45,.9,3.6]]};
  // steps 3 and 4 are about one transition (the moment and the fall, columns 1 to 3): the camera moves in on those columns of all four tables
  const S=S3.stage({id:'stg-four',list:'sx-four',fig:'one episode, four copies of one Q-table',cam:full.cam,bounds:full.bounds,aspect:.52,draw,dur:2600,hold:5200,onStep:table,view:k=>k===2||k===3?close:full});
  table(0);
  window.RD_TEST=Object.assign(window.RD_TEST||{},{four:{S,D,L,kPrev,kPair,kDown,FR}});
})();
