// ---- Scene, Fig. 2 (section 3): the same 20 kernels launched three ways, to scale on one time axis (renderer v2).
// The CPU thread (front) and the GPU stream (back) are two glass lanes along time; a launch is CPU work and a stream of dots to the GPU; a kernel
// is a block on the GPU lane. In graph mode the captured graph is a glass plate holding 20 nodes, launched with one call.
// Durations are the model fitted to NVIDIA's published V100 figures (Gray 2019; window.SGL in 25_js_sg_launch.js, numbers SG.blog);
// the steps are #sx-ln-* on the left. ----
(function(){
  if(!document.getElementById('stg-launch'))return;const {mix,lerp,at}=S3,$=id=>document.getElementById(id),B=SG.blog;
  const MOD={sync:SGL.model('sync',B),stream:SGL.model('stream',B),graph:SGL.model('graph',B)};
  const TMAX=Math.max(...Object.values(MOD).map(m=>m.total))*1.03;
  const gpuEnd=(m,i)=>MOD[m].ev.filter(x=>x[0]==='gpu')[i][2];
  // per mode, per step: the time window [a,b] revealed during the step, close: the camera moves in on the start of the axis, hl: the result step
  const W={
    sync:[{a:0,b:B.launch_cpu,close:1},{a:B.launch_cpu,b:B.launch_cpu+B.kernel+B.sync_cost,close:1},{a:B.launch_cpu+B.kernel+B.sync_cost,b:MOD.sync.total},{a:MOD.sync.total,b:MOD.sync.total,hl:1}],
    stream:[{a:0,b:2*B.launch_cpu+.01,close:1},{a:2*B.launch_cpu+.01,b:MOD.stream.total},{a:MOD.stream.total,b:MOD.stream.total,hl:1}],
    graph:[{a:0,b:0,cap:1,close:1},{a:0,b:0,inst:1,close:1},{a:0,b:B.launch_cpu+.01,close:1,go:1},{a:B.launch_cpu+.01,b:MOD.graph.total},{a:MOD.graph.total,b:MOD.graph.total,hl:1}]};
  const LIST={sync:'sx-ln-sync',stream:'sx-ln-stream',graph:'sx-ln-graph'};
  let mode='sync';
  const XA=-4.5,LEN=9,ZC=.85,ZG=-.85,HW=.3,TCLOSE=26;let X=t=>XA+t/TMAX*LEN; // a close step zooms the time axis to its first 26 us
  const closeView=()=>({cam:innerWidth<560?[.5,.8]:[.32,.6],bounds:[[XA-.9,0,-1.5],[XA+1.25,1.3,1.6]]});
  const fullView=()=>({cam:innerWidth<560?[.45,.88]:[.1,.74],bounds:[[XA-1.3,0,-2.4],[XA+LEN+.2,1,1.9]]});
  function draw(R,k,e,st){const P=R.P,w=W[mode][Math.min(k,W[mode].length-1)],m=MOD[mode],t=lerp(w.a,w.b,e),cc=P.c1,cg=P.c2;
    const pw=W[mode][Math.min(st.pk,W[mode].length-1)]||w,cf=w.close?(pw.close?1:e):(pw.close?1-e:0);
    const span=TMAX*Math.pow(TCLOSE/TMAX,cf),XE=XA+LEN;X=t=>XA+t/span*LEN;const XC=t=>Math.min(XE,X(t));
    R.grid(-6,6,-2.6,2.6,.5);
    [[ZC,cc,'CPU thread'],[ZG,cg,'GPU stream']].forEach(([z,c,n])=>{R.glass([XA-.1,0,z-.4],[LEN+.2,0,0],[0,0,.8],{c,a:.5,nu:1,nv:1,th:.02});
      R.label([XA-.25,.05,z],n,{al:'right',mono:true,fs:12.5,b:1,c,grp:'lane'})});
    // time ticks: every 20 us, finer near the start when the camera is close
    for(let v=0;v<=TMAX;v+=cf>.5?2:20){const x=X(v);if(x>XE+1e-6)break;R.line([[x,.004,ZC+.45],[x,.004,ZG-.45]],{c:P.line,w:1,a:.9});
      const lab=cf>.5?(v%4===0):(v%40===0);if(lab)R.label([x,0,ZC+.58],v+(v===0?' µs':''),{mono:true,fs:12,c:P.mute})}
    // blocks revealed up to t; the result step dims everything but the kernels
    const dimNon=w.hl?.3:1;let lastLaunch=null;
    m.ev.forEach(ev=>{const [ln,s,f]=ev;if(s>=t-1e-9&&!(s===0&&t>0))return;const x0=X(s),x1=XC(Math.min(f,t));if(x1<=x0)return;
      if(ln==='cpu'){R.box([(x0+x1)/2,0,ZC],[x1-x0,HW,.5],{fill:mix(P.paper,cc,.75),a:dimNon});if(f<=t+1e-9)lastLaunch=ev}
      else if(ln==='wait'){R.box([(x0+x1)/2,0,ZC],[x1-x0,.08,.5],{fill:mix(P.paper,P.mute,.3),fa:.75,a:dimNon})}
      else R.box([(x0+x1)/2,0,ZG],[x1-x0,HW,.5],{fill:mix(P.paper,cg,.8)})});
    // the launch in flight: dots from the end of the last launch to the start of its kernel
    if(mode!=='graph'&&lastLaunch&&!w.hl){const i=m.ev.filter(x=>x[0]==='cpu').indexOf(lastLaunch),gs=m.ev.filter(x=>x[0]==='gpu')[i];
      if(gs)R.flowArc([X(lastLaunch[2]),HW,ZC],[X(gs[1])+.03,HW,ZG],.45,{c:cc,r:.05,n:5,speed:1.1})}
    // close-up labels on the first launch, kernel and wait
    if(cf>.5){const a=cf;
      if(mode==='sync'){if(t>0)R.label([X(B.launch_cpu/2),HW,ZC],'launch '+B.launch_cpu+' µs',{mono:true,fs:12,b:1,c:cc,dy:-12,a});
        if(t>B.launch_cpu){R.label([X(B.launch_cpu+B.kernel/2),HW,ZG],'kernel '+B.kernel+' µs',{mono:true,fs:12,b:1,c:P.ink,dy:-12,a});
          R.label([X(B.launch_cpu)+.12,.08,ZC],'wait + wake '+(B.kernel+B.sync_cost).toFixed(1)+' µs',{al:'left',mono:true,fs:12,c:P.mute,dy:-12,a})}}
      if(mode==='stream'&&t>0){R.label([X(B.launch_cpu/2),HW,ZC],'launch',{mono:true,fs:12,b:1,c:cc,dy:-12,a});
        if(t>B.launch_cpu+B.kernel)R.label([X(B.launch_cpu+B.kernel+.45),0,ZG],'idle '+(B.launch_cpu-B.kernel).toFixed(1)+' µs',{al:'left',mono:true,fs:12,c:P.mute,dy:20,a})}}
    // graph mode: the captured graph, a glass plate of 20 nodes above the start of the CPU lane
    if(mode==='graph'){const px=XA-.2,pz=ZG-1.35,py=.35,gw=2.6,gd=.8,inst=k>=1,ga=k<=2?1:.35,go=w.go?e:k>2?1:0;
      const node=i=>{const r=Math.floor(i/10),c=r?9-i%10:i%10;return [px+.16+c*(gw-.32)/9,py+.03,pz-gd/2+.22+r*.36]};
      R.glass([px,py,pz-gd/2],[gw,0,0],[0,0,gd],{c:inst?P.c4:P.mute,a:ga*(k===0?Math.max(.3,e):1),nu:1,nv:1,th:.03});
      const shown=k===0?Math.round(20*e):20,pts=[];
      for(let i=0;i<shown;i++){const p=node(i);pts.push([p[0],p[1]+.05,p[2]]);R.box(p,[.14,.12,.14],{fill:mix(P.paper,cg,.8),a:ga,shadow:false})}
      if(pts.length>1)R.line(pts,{c:P.ink,w:1,a:.5*ga});
      R.label([px,py+.1,pz-gd/2],k===0?'capture: '+shown+' nodes, nothing runs':inst?'cudaGraphExec_t · instantiated once, ≈'+B.instantiate+' µs':'',{al:'left',mono:true,fs:12,b:1,c:inst?P.c4:P.ink,dy:-14,a:ga});
      if(go>0)R.flowArc([px+gw/2,py,pz+gd/2],[X(B.launch_cpu)+.05,HW,ZG],.35,{c:P.c4,r:.05,n:20,speed:1.2,a:Math.min(1,go*1.5)*(k===2?1:.35)})}
    if(w.hl){const per=SGL.steady(mode,B);R.label([XA+LEN/2,HW+.35,ZG],per.toFixed(1)+' µs per kernel · GPU busy '+Math.round(100*B.kernel/per)+'%',{mono:true,fs:13,b:1,c:P.ink,dy:-8,a:e})}
  }
  function counters(k){const w=W[mode][k],m=MOD[mode],t=w.b,done=m.ev.filter(x=>x[0]==='gpu'&&x[2]<=t+1e-9).length,busy=done*B.kernel;
    const key={sync:'sync_each',stream:'stream',graph:'graph'}[mode];
    $('sg-ln-cnt').innerHTML=RD.stat('Elapsed',t.toFixed(1)+' µs',done+' of '+B.n+' kernels done')+RD.stat('GPU busy, this run',t>0?Math.round(100*busy/t)+'%':'0%',busy.toFixed(1)+' µs of kernels so far')+
      RD.stat('Per kernel, steady state',SGL.steady(mode,B).toFixed(1)+' µs','NVIDIA measured '+B[key]+' µs')}
  const st=S3.stage({id:'stg-launch',list:'sx-ln-sync',fig:'Fig. 2 · 20 kernels, three ways to launch them',cam:fullView().cam,bounds:fullView().bounds,aspect:.5,dur:1500,hold:4400,draw,
        margin:w=>w<520?[14,8,10,8]:[18,16,14,16],onStep:k=>{try{counters(k)}catch(err){}}});
  (window.SGSTG=window.SGSTG||{})['stg-launch']=st;window.SG_LN3={W,MOD};
  RD.seg($('sg-ln-mode'),v=>{mode=v;Object.keys(LIST).forEach(x=>$(LIST[x]).hidden=x!==v);st.list(LIST[v])});
})();
