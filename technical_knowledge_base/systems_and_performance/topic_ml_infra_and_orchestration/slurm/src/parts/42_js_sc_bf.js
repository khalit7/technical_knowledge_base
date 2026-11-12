// ---- Scene, section 6: the main loop and backfill on three nodes, four jobs (illustrative, as the 2D stepper it replaces was).
// The floor is nodes by time: three lanes (c1, c2, c3) running along the time axis, minutes 0 to 130. A job is a block whose footprint is
// its nodes by its time; waiting jobs sit in the queue in front with the same footprint (depth compressed), so the reader sees whether
// a job fits a gap. Reservations are glass blocks; the red pane is now. The rules are Slurm's (source quoted in the section). ----
(function(){
  if(!document.getElementById('stg-bf')||!window.S3)return;const {lerp,mix}=S3;
  const X=t=>-5+t*.077,LZ=[-1.15,0,1.15],ZQ=3.2,H=.42;
  // queue footprints: x range in "queue minutes" and depth per node
  const QX={B:0,C:36,D:62},LEN={B:30,C:20,D:60},NN={B:3,C:1,D:1};
  // the seven steps: now, and each job's place: 'q' (queue) or {l lanes, s, e, k: run | done | res | bf}
  const A0={l:[0,1],s:0};
  const S=[
    {now:5,A:{...A0,e:5,k:'run'},B:'q',C:'q',D:'q'},
    {now:5,A:{...A0,e:5,k:'run'},B:'q',C:'q',D:'q',tag:{B:'Resources',C:'Priority',D:'Priority'}},
    {now:5,A:{...A0,e:5,k:'run'},B:{l:[0,1,2],s:40,e:70,k:'res'},C:'q',D:'q',tag:{C:'Priority',D:'Priority'}},
    {now:5,A:{...A0,e:5,k:'run'},B:{l:[0,1,2],s:40,e:70,k:'res'},C:{l:[2],s:5,e:25,k:'bf'},D:'q',tag:{D:'Priority'}},
    {now:5,A:{...A0,e:5,k:'run'},B:{l:[0,1,2],s:40,e:70,k:'res'},C:{l:[2],s:5,e:25,k:'bf'},D:{l:[2],s:70,e:130,k:'res'}},
    {now:15,A:{...A0,e:15,k:'done'},B:{l:[0,1,2],s:25,e:55,k:'res'},C:{l:[2],s:5,e:25,k:'bf'},D:{l:[2],s:55,e:115,k:'res'}},
    {now:25,A:{...A0,e:15,k:'done'},B:{l:[0,1,2],s:25,e:55,k:'run'},C:{l:[2],s:5,e:25,k:'done'},D:{l:[2],s:55,e:115,k:'res'}}];
  window.SL_BF={S,LIM:40};
  // a job's box: [centre of bottom face, size]
  function pose(j,p){if(p==='q'){const x0=X(QX[j]),w=LEN[j]*.077,d=NN[j]*.34;return [[x0+w/2,0,ZQ],[w,H,d]]}
    const z0=Math.min(...p.l.map(l=>LZ[l]))-.46,z1=Math.max(...p.l.map(l=>LZ[l]))+.46,x0=X(p.s),x1=X(p.e);return [[(x0+x1)/2,0,(z0+z1)/2],[Math.max(.06,x1-x0),H,z1-z0]]}
  function draw(R,k,e){const P=R.P,C={A:P.c1,B:P.c4,C:P.c5,D:P.c6},s=S[k],s0=S[Math.max(0,k-1)],now=lerp(s0.now,s.now,k?e:1),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-6,6,-2.4,4.2,.5);
    // lanes and the time axis
    LZ.forEach((z,i)=>{R.quad([[X(0),.005,z-.46],[X(130),.005,z-.46],[X(130),.005,z+.46],[X(0),.005,z+.46]],{fill:mix(P.paper,P.ink,.06),dz:1e4,lw:.5,ea:.5});lab([X(0)-.15,0,z],'c'+(i+1),{al:'right',dx:-6,b:1,c:P.mute})});
    (R.W<520?[0,40,80,120]:[0,20,40,60,80,100,120]).forEach(t=>lab([X(t),0,1.75],t+(t===120?' min':''),{dy:8,c:P.mute}));
    lab([X(0)-.15,0,ZQ],'queue',{al:'right',dx:-6,b:1,c:P.mute});
    // idle c3 at the main loop's step
    if(k===1){R.glow([X(now)+1.2,.05,LZ[2]],.9,{c:P.good,a:.6*e});lab([X(now)+1.2,.1,LZ[2]],'c3 idle',{dy:-12,b:1,c:P.good,a:e})}
    ['A','B','C','D'].forEach(j=>{const p=s[j],p0=s0[j];if(!p)return;
      let [c,sz]=pose(j,p);const moving=k&&p0!==p&&JSON.stringify(p0)!==JSON.stringify(p);
      if(moving){const [c0,z0]=pose(j,p0),fromQ=p0==='q',u=e;c=[lerp(c0[0],c[0],u),lerp(c0[1],c[1],u)+(fromQ?Math.sin(Math.PI*u)*.9:0),lerp(c0[2],c[2],u)];sz=[lerp(z0[0],sz[0],u),sz[1],lerp(z0[2],sz[2],u)];
        if(fromQ&&u<1)R.flowArc([pose(j,p0)[0][0],H,ZQ],[pose(j,p)[0][0],H,pose(j,p)[0][2]],.9,{c:C[j],a:1-u*.5,r:.07,speed:1.6})}
      const kind=p==='q'?'q':p.k,col=kind==='done'?mix(P.paper,C[j],.3):C[j];
      if(kind==='res')R.box(c,sz,{fill:C[j],fa:.16,ea:.95,shadow:false});
      else R.box(c,sz,{fill:col,a:kind==='q'?.9:1});
      const nm=j+(kind==='res'?' reserved':kind==='bf'?' · backfill':kind==='done'?' · done':''),tg=s.tag&&s.tag[j];
      lab([c[0],H,c[2]],nm+(tg&&R.W>=520?' · '+tg:''),{dy:-11,b:1,c:tg==='Resources'?P.bad:kind==='done'?P.mute:P.ink,fs:12.5});
      if(tg==='Resources'&&k===1)R.glow([c[0],H,c[2]],1.1,{c:P.bad,a:.5*e})});
    // A's time limit, an outline from its end to minute 40, until A ends
    if(s.A.k==='run'){const x0=X(now),x1=X(40);R.box([(x0+x1)/2,0,0-.575],[x1-x0,H*.7,2.07],{fill:P.c1,fa:.08,ea:.9,shadow:false,ec:P.c1});
      lab([x1,H*.7,-1.6],'A\'s limit',{dy:-8,c:P.c1})}
    // now: a red pane across the lanes
    R.line([[X(now),.01,-1.75],[X(now),.01,1.75]],{c:P.bad,w:2.5,top:1});R.glass([X(now),0,-1.75],[0,0,3.5],[0,.7,0],{c:P.bad,a:.6,nu:1,nv:1,th:.01});lab([X(now),.7,-1.75],'now · minute '+Math.round(now),{dy:-10,b:1,c:P.bad});
  }
  const st=S3.stage({id:'stg-bf',list:'sx-bf',fig:'Main loop and backfill · illustrative',cam:[.1,1.0],bounds:[[-5.6,0,-2.0],[5.2,.7,3.7]],aspect:.56,dur:1400,hold:4600,draw,
    margin:w=>w<520?[18,10,16,10]:[24,18,20,18]});
  (window.SLSTG=window.SLSTG||{})['stg-bf']=st;
})();
