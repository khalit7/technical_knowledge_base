// ---- Scene: Fig. 2, quorums (stg-q): N replicas on an arc, a write confirmed by W of them, a read that hears from R, drawn as the quorum
// widget draws it (the write lands on the first W replicas, the read takes the worst R, the last R), so the overlap R + W - N is the set
// both touch. Settings are the widget's presets: Dynamo's (3,2,2), Cassandra ONE / ONE (3,1,1), QUORUM with 5 copies (5,3,3). ----
window.DSF_QSTEPS=[{N:3,W:0,R:0},{N:3,W:2,R:0},{N:3,W:2,R:2},{N:3,W:1,R:1},{N:5,W:3,R:3}].map(s=>Object.assign(s,{ov:Math.max(0,s.R+s.W-s.N),ok:s.R+s.W>s.N}));
(function(){
  if(!document.getElementById('stg-q')||!window.DSK)return;
  const {node,tag,win,arcPts}=DSK,S=window.DSF_QSTEPS;
  const pos=(i,N)=>{const a=Math.PI*(.12+.76*(N===1?.5:i/(N-1)));return [-Math.cos(a)*3.5,0,-Math.sin(a)*2.0+.7]};
  const CL=[0,0,2.7];
  function draw(R,k,e){const P=R.P,s=S[k],N=s.N;R.grid(-4.6,4.6,-2.6,3.6,.5);
    const ew=k===1||k===3?win(e,0,.6):1,er=k===2||k===3||k===4?win(e,k===3?.35:.2,.85):1;
    node(R,CL,[.9,.42,.6],P.c4,{});R.label([CL[0],0,CL[2]+.3],k===0?'client':'client · N '+N+', W '+s.W+', R '+s.R,{b:1,fs:12.5,dy:14});
    for(let i=0;i<N;i++){const p=pos(i,N),wr=i<s.W,rd=s.R>0&&i>=N-s.R,both=wr&&rd,stale=rd&&!wr;
      const v2=wr&&(k===1||k===3?ew>.6:true);
      node(R,p,[.82,.5,.62],P.acc,{t:.22,a:1});R.label([p[0],0,p[2]+.31],'r'+(i+1),{b:1,fs:12.5,dy:18,c:P.mute});
      tag(R,[p[0],.5,p[2]],v2?P.good:P.mute,v2?'v2':'v1',1,{s:[.55,.16,.42],dy:-10});
      // the write: dots from the client to the W replicas that confirm (a dot also heads for the others: it is sent to all N)
      if(s.W&&(k===1||k===3||k===4))R.flow(arcPts(R,[CL[0],.45,CL[2]-.2],[p[0],.7,p[2]],.7,20),{c:P.good,a:(wr?.95:.25)*(k===4?.45:1),r:.06,n:6,speed:1.2});
      // the read set: a dashed outline on the floor, and dots coming back from each replica the read hears from
      if(rd&&k>=2){const c=stale&&!s.ok?P.bad:P.acc,a=er;R.quad([[p[0]-.6,.02,p[2]-.5],[p[0]+.6,.02,p[2]-.5],[p[0]+.6,.02,p[2]+.5],[p[0]-.6,.02,p[2]+.5]],{fill:null,ec:c,dash:[5,4],lw:2,a});
        R.flow(arcPts(R,[p[0],.7,p[2]],[CL[0]+.2,.45,CL[2]-.2],.5,20),{c,a:a*.95,r:.06,n:5,speed:1.1})}
      if(both&&k>=2)R.glow([p[0],.75,p[2]],.55,{c:P.good,a:er*.8});
      if(stale&&s.ov===0&&k===3)R.label([p[0],.7,p[2]],'read returns v1',{fs:12.5,b:1,c:P.bad,dy:-32,a:er})}
    // the verdict
    if(k>=2){const t='R + W = '+(s.R+s.W)+(s.ok?' > ':' ≤ ')+N+(s.ok?': overlap at least '+s.ov:': the read can miss v2');
      R.label([CL[0],0,CL[2]+.3],t,{fs:13,b:1,c:s.ok?P.good:P.bad,dy:33,a:er})}
    if(k===1)R.label([CL[0],0,CL[2]+.3],'2 of 3 confirmed: write succeeds',{fs:13,b:1,c:P.good,dy:33,a:ew});
  }
  let st=null;const narrow=()=>st&&st.R&&st.R.W<520;
  st=S3.stage({id:'stg-q',list:'sx-q',fig:'Fig. 2 · where a read meets a write',cam:[0,.7],bounds:[[-3.9,0,-1.5],[3.9,1.0,3.2]],aspect:.56,dur:1500,hold:4600,draw,
    margin:w=>w<520?[26,8,44,8]:[28,16,50,16],view:()=>narrow()?{cam:[0,1.05]}:null});
})();
