// ---- Scene: Fig. 2, one weight under the three export rules (renderer v2: rails with the bf16 grid, glass gates for the dead zone,
// export flows from the master to each copy, signed error bars on white plinths) ----
// Every position is the page's rounding engine (20_js_sim.js, bit-exact against torch's bf16 cast) at the Round a weight tab's defaults:
// w0 = 0.02, eta = 1e-6, update 0.5 eta + 0.5 eta noise (illustrative), seed 1, 300 steps, 256 stochastic runs for the average.
// The 300 steps play in 5 explained stretches (the long-replay rule); each stretch plays its steps during its step of the list.
(function(){
  if(!document.getElementById('stg-dz'))return;const {mix}=S3;
  const r=FCSIM.run({w0:0.02,eta:1e-6,drift:0.5,noise:0.5,T:300,seed:1,reps:256});
  const B=[0,40,100,101,300]; // the end of each stretch (step k of the list shows steps B[k-1]+1 .. B[k])
  const U=v=>(v-r.w0)/r.u,XS=2.1,X=v=>XS*(v-.7),V0=-.56,V1=2.05,BX=X(V1)+.85,EY=1.05,ES=1;
  const RULES=[['round-to-nearest',r.qn,'c2',1.55],['stochastic',r.qs,'c1',0],['error feedback',r.qe,'c3',-1.55]];
  const tAt=(k,e)=>k===0?0:Math.round(B[k-1]+(B[k]-B[k-1])*e);
  const changes=(a,t)=>{let c=0;for(let i=1;i<=t;i++)if(a[i]!==a[i-1])c++;return c};
  function draw(R,k,e){const P=R.P,t=tAt(k,e),th=U(r.th[t]);
    R.grid(X(V0)-.8,BX+.9,-2.4,2.4,.5);
    RULES.forEach(([name,a,ck,z],i)=>{const col=P[ck],q=U(a[t]),err=th-q,focus=k===3&&i>0?.22:1,la=k===3&&i>0?0:1;
      // the rail and the bf16 values on it (dark ticks across the rail)
      R.box([(X(V0)+X(V1))/2,0,z],[X(V1)-X(V0)+.3,.06,.7],{a:focus});
      [0,1,2].forEach(v=>{R.box([X(v),.06,z],[.05,.03,.7],{fill:P.ink,a:focus*.8,shadow:false,edge:false});
        if(i===0)R.label([X(v),0,z+.36],v?'w₀ + '+(v>1?v:'')+'u':'w₀',{fs:12,mono:true,c:P.mute,dy:13})});
      // round-to-nearest's dead zone: glass gates half a gap either side of its copy
      if(i===0)[q-.5,q+.5].forEach(g=>{if(g>V0&&g<V1)R.glass([X(g),.06,z-.35],[0,0,.7],[0,.75,0],{c:P.c2,a:.75,nu:2,nv:3})});
      // the copy, the master, and the export stream from the master to the copy
      R.box([X(q),.06,z],[.44,.4,.46],{fill:mix(P.paper,col,.7),a:focus,shadow:false});
      R.line([[X(th),.07,z],[X(th),.62,z]],{c:P.ink,w:1.2,a:.6*focus});R.ball([X(th),.72,z],.12,{c:P.ink,a:focus});
      if(Math.abs(err)>.04)R.flowArc([X(th),.7,z],[X(q),.5,z],.15+.12*Math.min(1,Math.abs(err)),{c:col,a:.9*focus,r:.06,n:5,speed:.9});
      // master minus copy, in gaps: a signed bar on a white plinth (up: the copy lags, down: it leads)
      R.box([BX,EY,z],[.6,.05,.5],{a:focus,shadow:false});[-1,1].forEach(sx=>R.box([BX+sx*.27,0,z],[.03,EY,.03],{a:focus*.9}));
      const h=Math.max(.012,Math.abs(err)*ES);R.box([BX,err>=0?EY+.05:EY-h,z],[.3,h,.3],{fill:col,a:focus,shadow:false});
      R.label([BX+.32,EY+(err>=0?.05+h:-h),z],(err<0?'−':'+')+Math.abs(err).toFixed(2)+' u',{fs:12,mono:true,b:1,c:col,al:'left',dx:6,a:la,wide:1});
      const n=changes(a,t);R.label([X(V0)-.1,.1,z],name+' · '+n+(n===1?' change':' changes'),{fs:12.5,b:1,c:col,al:'right',dx:-6,grp:'row',a:la})});
    // the average of 256 stochastic copies: E[q] follows the master
    if(k>=2&&k!==3){const m=U(r.qm[t]);R.glow([X(m),.72,0],.36,{c:P.c1,a:.9});R.label([X(m),.72,0],'mean of 256',{fs:12,c:P.c1,dy:-24,wide:1})}
    R.label([BX,EY+1.05,RULES[2][3]],'master − copy',{fs:12,c:P.mute,dy:-8,wide:1,a:k===3?0:1});
    R.label([X(.65),1.3,-2],'optimizer step '+t+' of 300',{fs:13,b:1,mono:true,c:P.ink});
  }
  const full={cam:[0,.78],bounds:[[X(V0)-.2,0,-1.95],[BX+.4,1.6,2.1]]};
  const stg=S3.stage({id:'stg-dz',list:'sx-dz',fig:'Fig. 2 · one weight, three export rules',cam:full.cam,bounds:full.bounds,aspect:.5,dur:3200,hold:4600,draw,
    margin:w=>w<520?[16,8,18,8]:[16,62,16,165],
    // the jump: in close on the round-to-nearest rail
    view:k=>k===3?{cam:[.08,.6],bounds:[[X(-.5),0,.9],[X(1.6),1.1,2.1]]}:full});
  window.FC_DZ={r,B,changes,stg};
})();
