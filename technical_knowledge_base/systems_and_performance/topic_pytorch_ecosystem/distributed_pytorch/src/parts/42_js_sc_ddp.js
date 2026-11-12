// ---- Scene, Fig. 2 (2026-11-12, renderer v2): DDP's buckets during one recorded backward, two replicas.
// Data: window.DPT.ddpb, the parent lab's DDP run on 2 CPU processes (rank 0's gradient-ready times, bucket layout and all-reduce issue times),
// reshaped by src/ddp_timeline.py; both ranks are drawn with rank 0's times. Mode 1 is step 1 (buckets rebuilt), mode 0 is step 0 (one bucket).
// A layer fills with its bucket's colour as its gradients become ready; bucket heights are to scale by bytes; dots run between the ranks'
// copies of a bucket while its all-reduce is issued. The 7 steps are the 7 moments of the old stepper (#sx-ddp-0 and #sx-ddp-1 on the left). ----
(function(){
  if(!document.getElementById('stg-ddp')||!window.S3||!window.DPT)return;const {mix}=S3,D=window.DPT,$=id=>document.getElementById(id);
  const LANES=[p=>p.startsWith('ln_f'),p=>p.startsWith('blocks.3.'),p=>p.startsWith('blocks.2.'),p=>p.startsWith('blocks.1.'),p=>p.startsWith('blocks.0.'),p=>p==='tok.weight'||p==='pos.weight'];
  const LN=['ln_f','block 3','block 2','block 1','block 0','embeddings'];
  // the 7 moments of a backward: start, bucket 0 closes, each block done, the last gradient (and last all-reduce), backward returns
  function frames(st){const rd=st.ready,laneEnd=k=>Math.max(...rd.filter(q=>LANES[k](q[0])).map(q=>q[1]));
    const b0last=rd.filter(q=>q[2]===0).length===rd.length?rd[3][1]:Math.max(...rd.filter(q=>q[2]===0).map(q=>q[1]));
    const ar=st.allreduce,last=Math.max(...rd.map(q=>q[1]));
    return [0,Math.max(b0last,ar.length>1?ar[0][1]:0),laneEnd(1),laneEnd(2),laneEnd(3),Math.max(last,ar[ar.length-1][1]),st.bwd_end_ms]}
  const M=D.ddpb.steps.map(st=>{const f=frames(st),lb=LANES.map(fn=>st.ready.filter(q=>fn(q[0])).reduce((s,q)=>s+q[3],0));return {st,f,lb}});
  let mode=1;
  const XR=[-2.25,2.25],XB=[-.75,.75],TH=[.07,.17,.17,.17,.17,.07],GAP=.05,Y0=.17,SW=.95,SD=.7,TOT=12747776,HB=1.3;
  const YS=[];{let y=Y0;for(let i=5;i>=0;i--){YS[i]=y;y+=TH[i]+GAP}}   // lane 5 (embeddings) at the bottom, lane 0 (ln_f) on top
  const bz=(nb,b)=>nb===1?0:(b===0?.4:-.3);
  function draw(R,k,e){const P=R.P,Mo=M[mode],st=Mo.st,t=Mo.f[k],tp=k?Mo.f[k-1]:-1,nb=st.buckets.length,BC=[P.c5,P.c3];
    R.grid(-3.2,3.2,-1.2,1.2,.5);
    const ready=(q,tt)=>q[1]<=tt+1e-9;
    XR.forEach((x,r)=>{R.box([x,0,0],[1.2,.12,.9],{fill:P.paper});R.label([x,0,.46],'rank '+r,{mono:true,fs:12,c:P.mute,dy:14});
      // the layers: paper until their gradients are ready, then their bucket's colour (in proportion of bytes)
      for(let i=0;i<6;i++){const y=YS[i],h=TH[i];let x0=x-SW/2;
        for(let b=0;b<nb;b++){const got=st.ready.filter(q=>LANES[i](q[0])&&q[2]===b&&ready(q,t)).reduce((s,q)=>s+q[3],0),w=SW*got/Mo.lb[i];
          if(w>.004){R.box([x0+w/2,y,0],[w,h,SD],{fill:mix(P.paper,BC[b],.7),shadow:false});x0+=w}}
        const rest=x+SW/2-x0;if(rest>.004)R.box([x0+rest/2,y,0],[rest,h,SD],{fill:P.paper,shadow:false});
        if(r===0)R.label([x-SW/2-.12,y+h/2,0],LN[i],{al:'right',dx:-10,fs:12,c:P.mute,grp:'ln'});
        // gradients that became ready during this step stream into their bucket
        for(let b=0;b<nb;b++){const nw=st.ready.filter(q=>LANES[i](q[0])&&q[2]===b&&q[1]>tp+1e-9&&ready(q,t));if(!nw.length||k===0)continue;
          const bytes=nw.reduce((s,q)=>s+q[3],0),hb=Math.max(.06,HB*st.buckets[b].bytes/TOT);
          R.flowArc([x+(r?-1:1)*SW/2,y+h/2,0],[XB[r],.16+hb*.6,bz(nb,b)],.25,{c:BC[b],r:.04+.03*Math.min(1,bytes/3e6),n:Math.max(3,Math.round(3+bytes/6e5)),speed:1.3,a:Math.min(1,e*1.5)})}}
      // where backward is now
      if(k>=1&&k<=4)R.glow([x,YS[k]+TH[k]/2,0],.75,{c:P.acc,a:.45});
      if(k===0)R.glow([x,YS[0]+TH[0]+.08,0],.5,{c:P.acc,a:.6});
      // the buckets: glass boxes to scale by bytes, filled as their gradients arrive
      st.buckets.forEach((bk,b)=>{const hb=Math.max(.06,HB*bk.bytes/TOT),got=st.ready.filter(q=>q[2]===b&&ready(q,t)).reduce((s,q)=>s+q[3],0),z=bz(nb,b);
        R.box([XB[r],.04,z],[.5,.12,.5],{fill:P.paper,shadow:true});
        R.box([XB[r],.16,z],[.46,hb,.46],{fill:P.paper,a:.5,fa:.15,shadow:false});
        if(got>0)R.box([XB[r],.16,z],[.44,Math.max(.01,hb*got/bk.bytes),.44],{fill:mix(P.paper,BC[b],.8),shadow:false});
        if(r===0)R.label([0,.16+(b===0&&nb>1?.02:hb*.55),z],R.W<520?'b'+b+' '+(bk.bytes/1e6).toFixed(1)+' MB':'bucket '+b+' · '+(bk.bytes/1e6).toFixed(2)+' MB',{fs:12,mono:true,b:1,c:BC[b]})})});
    // all-reduces: dots between the two ranks' copies of a bucket in the step it is issued and the next
    st.allreduce.forEach((a,b)=>{const ks=Mo.f.findIndex((v,j)=>j>0&&a[1]<=v+1e-9&&a[1]>Mo.f[j-1]+1e-9);if(!(k===ks||k===ks+1&&k<6))return;
      const bb=nb===1?0:b,hb=Math.max(.06,HB*st.buckets[bb].bytes/TOT),z=bz(nb,bb),y=.16+hb+.05;
      R.flowArc([XB[0],y,z],[XB[1],y,z],.35,{c:BC[bb],r:.06,n:9,speed:1.4});R.flowArc([XB[1],y-.04,z+.06],[XB[0],y-.04,z+.06],.22,{c:BC[bb],r:.05,n:7,speed:1.4,a:.8});
      R.label([0,1.75,0],R.W<520?'all-reduce, bucket '+bb:'all-reduce of bucket '+bb+' ('+(a[0]/1e6).toFixed(2)+' MB) issued at '+a[1].toFixed(2)+' ms',{fs:12.5,b:1,c:BC[bb],dy:38})});
    const lab=k===0?'backward starts at the loss':k===6?'backward() returns · '+t.toFixed(2)+' ms':'t = '+t.toFixed(2)+' ms into backward';
    R.label([0,1.75,0],lab,{fs:14,b:1,mono:true,c:P.ink});
    R.label([0,1.75,0],R.W<520?(mode?'step 1 on':'step 0'):mode?'step 1 on: buckets rebuilt in arrival order':'step 0: one bucket for the whole model',{fs:12.5,c:P.mute,dy:18})}
  const stg=S3.stage({id:'stg-ddp',list:'sx-ddp-1',fig:'Fig. 2 · DDP buckets, one recorded backward',cam:[.06,.42],bounds:[[-2.85,0,-.75],[2.85,1.85,.75]],aspect:.5,dur:1300,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[18,14,16,14]});
  RD.seg($('dpt-ddp-seg'),m=>{mode=+m;[0,1].forEach(x=>{$('sx-ddp-'+x).hidden=x!==mode});stg.list('sx-ddp-'+m)});
})();
