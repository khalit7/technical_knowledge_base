// ---- Scene: Fig. 3, Raft (stg-raft): the page's own Raft trace (34_js_raft_trace.js, the model of 31_js_raft_model.js with seed 11) in
// eight stretches. During each step the stretch's simulated time plays: every message is a dot on its way (vote requests and votes purple,
// AppendEntries and replies blue), each server's log grows as a stack of slabs coloured by term (see-through until that server knows it is
// committed), and a follower's election timer drains as a glass column. At the end of a step the leader's heartbeats keep flowing. ----
(function(){
  if(!document.getElementById('stg-raft')||!window.DSK||!window.DSF_RTRACE)return;
  const {mix}=S3,{node,stack,timer,cut,arcPts}=DSK,T=window.DSF_RTRACE,N=T.N;
  const POS=[...Array(N)].map((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/N;return [Math.cos(a)*2.7,0,Math.sin(a)*2.2+.1]});
  // the same server order as the 2D widget, turned so S1 is at the back
  const pos=i=>[POS[i][0],0,-POS[i][2]];
  const termCol=(P,t)=>[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6][(t-1+60)%6];
  function draw(R,k,e){const P=R.P,st=T.stretches[k],t=st.t0+(st.t1-st.t0)*e,sn=T.at(t,k),end=e>=.999;R.grid(-4.4,4.4,-3.6,3.8,.5);
    // the split: a red-tinted floor under the servers cut off from the rest
    if(sn.g){sn.S.forEach((s,i)=>{if(sn.g[i]!==1)return;const p=pos(i);R.glass([p[0]-.9,.012,p[2]-.85],[1.8,0,0],[0,0,1.7],{c:P.bad,a:.75,nu:2,nv:2,th:.02})});
      const mi=sn.S.map((_,i)=>i).filter(i=>sn.g[i]===1),cx=mi.reduce((s,i)=>s+pos(i)[0],0)/mi.length,cz=Math.max(...mi.map(i=>pos(i)[2]))+.9;
      R.label([cx,0,cz],'cut off from the other three',{fs:12.5,b:1,c:P.bad,dy:10})}
    const L=sn.S.reduce((b,s,i)=>s.alive&&s.role==='leader'&&(b<0||s.term>sn.S[b].term)?i:b,-1);
    sn.S.forEach((s,i)=>{const p=pos(i),c=!s.alive?P.mute:s.role==='leader'?P.good:s.role==='candidate'?P.c5:P.acc,a=s.alive?1:.4;
      node(R,p,[1,.46,.8],c,{a,t:s.alive?.42:.15});
      const cols=s.log.map(x=>termCol(P,x[0])),done=s.log.map((_,j)=>j<s.commit);
      const top=stack(R,p,.78,.6,.48,cols,done,a,{h:.1,g:.022});
      const role=!s.alive?'crashed':s.role;
      R.label([p[0],top,p[2]-.26],'S'+(i+1)+' · term '+s.term,{b:1,fs:13,dy:-14,c:s.alive?P.ink:P.mute});
      const unc=s.log.length-s.commit;R.label([p[0],top,p[2]-.26],role+(s.alive&&unc>0&&s.log.length?' · '+unc+' uncommitted':''),{fs:12,mono:1,dy:-30,wide:1,c:s.role==='leader'&&s.alive?P.good:s.role==='candidate'?P.c5:!s.alive?P.bad:P.mute});
      if(!s.alive)cut(R,[p[0],.75,p[2]],1,.28);
      // the election timer of a live follower or candidate: full when just reset, empty when it fires
      if(s.alive&&s.role!=='leader'&&s.eto>0)timer(R,[p[0]+.66,0,p[2]+.2],(s.dl-t)/s.eto,.9,s.role==='candidate'?P.c5:P.acc,.95)});
    // messages in flight at time t
    if(!end)T.msgs.forEach(m=>{if(m.t0>t||m.t1<=t||m.t1<=m.t0)return;const f=(t-m.t0)/(m.t1-m.t0),a0=pos(m.a),b0=pos(m.b),vote=m.k==='RV'||m.k==='RVR',rep=m.k==='RVR'||m.k==='AER';
      const q=R.arcPt([a0[0],.6,a0[2]],[b0[0],.6,b0[2]],.5,f),c=vote?P.c4:P.acc;R.glow(q,rep?.18:.26,{c,a:.7});R.ball(q,rep?.05:.075,{c,a:.95})});
    // at rest: the leader's heartbeats keep flowing to every server it can reach; at the end of an election, the votes that elected it
    if(end&&L>=0)sn.S.forEach((s,i)=>{if(i===L||!s.alive||(sn.g&&sn.g[i]!==sn.g[L]))return;const a0=pos(L),b0=pos(i);
      R.flow(arcPts(R,[a0[0],.6,a0[2]],[b0[0],.6,b0[2]],.45,20),{c:P.acc,a:.75,r:.06,n:5,speed:1.3})});
    if(end&&k===7)sn.S.forEach((s,i)=>{if(!s.alive)return;sn.S.forEach((o,j)=>{if(j===i)return;const a0=pos(i),b0=pos(j);
      R.flow(arcPts(R,[a0[0],.6,a0[2]],[b0[0],.6,b0[2]],.45,20),{c:P.c4,a:o.alive?.6:.3,r:.05,n:3,speed:.9})})});
  }
  const st=S3.stage({id:'stg-raft',list:'sx-raft',fig:'Fig. 3 · five Raft servers, one log',cam:[0,.78],bounds:[[-3.6,0,-2.6],[3.6,1.6,3.1]],aspect:.66,dur:3600,hold:4400,draw,
    margin:w=>w<520?[34,10,24,10]:[40,20,30,20]});
  window.DSF_RAFT_STAGE=st;
})();
