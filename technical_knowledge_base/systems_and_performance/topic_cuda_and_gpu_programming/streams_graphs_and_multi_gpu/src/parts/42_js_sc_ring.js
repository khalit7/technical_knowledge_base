// ---- Scene, Fig. 3 (section 6): one data-parallel training step on a ring of 8 of its 64 GPUs, without and with overlap (renderer v2).
// Each GPU carries its seven gradient buckets as columns (height in MiB); a GPU glows while it computes; dots run round the ring while a bucket is
// all-reduced, more dots for a bigger bucket. Every time and size is the page's step model (window.SGM in 24_js_sg_step.js, equal to recompute.py's
// SG.step: GPT-2-small shape, 64 H100 SXM, busbw 46 GB/s, DDP's bucket rule), played to scale within each step by the scene's own clock;
// the steps are #sx-ring-* on the left. ----
(function(){
  if(!document.getElementById('stg-ring'))return;const {mix,lerp,cl}=S3,$=id=>document.getElementById(id);
  const cfg=SGM.cfgFromData(),RES={serial:SGM.step(cfg,false,0),overlap:SGM.step(cfg,true,0)};
  const NG=8,RR=2.35,MIB=1048576;
  // per mode: compute intervals, bucket ready times (absolute), all-reduce intervals, and the step windows
  const M={};
  Object.entries(RES).forEach(([m,r])=>{const ev=r.events,cmp=ev.filter(x=>x[0]==='compute'),fw=cmp.find(x=>x[3]==='forward'),bw=cmp.find(x=>x[3]==='backward'),op=cmp.find(x=>x[3]==='optimizer');
    const ar=ev.filter(x=>x[0]==='comm').map(x=>[x[1],x[2]]),ready=r.buckets.map(b=>bw[1]+b[0]),mib=r.buckets.map(b=>b[1]/MIB);
    const win=m==='serial'?[[0,0],[0,bw[2]],[bw[2],ar[ar.length-1][1]],[op[1],op[2]]]:
      [[0,0],[0,fw[2]],[fw[2],ar[0][1]],[ar[0][1],bw[2]],[bw[2],ar[ar.length-1][1]],[op[1],op[2]]];
    M[m]={r,fw,bw,op,ar,ready,mib,win,list:'sx-ring-'+m}});
  let mode='serial';const PLAY=3.8,clk={k:-1,m:'',t0:0};
  const gp=i=>{const a=Math.PI/2+i*2*Math.PI/NG;return [RR*Math.cos(a),0,RR*Math.sin(a)]};
  const ring=[];for(let i=0;i<=72;i++){const a=Math.PI/2+i*2*Math.PI/72;ring.push([RR*Math.cos(a),.16,RR*Math.sin(a)])}
  function draw(R,k,e,st){const P=R.P,D=M[mode],w=D.win[Math.min(k,D.win.length-1)];
    if(clk.k!==k||clk.m!==mode){clk.k=k;clk.m=mode;clk.t0=R.t}
    const pr=S3.RM?1:cl((R.t-clk.t0)/PLAY,0,1),t=lerp(w[0],w[1],pr);if(pr<1)R.flow([[0,0,0],[0,0,.01]],{a:.011,n:1,r:.001});
    R.grid(-3.6,3.6,-3.4,3.4,.5);
    // the communicator: the ring's links appear in step 1
    R.line(ring,{c:P.c2,w:2.2,a:k===0?.25+.5*e:.45});
    const inAR=D.ar.findIndex(a=>t>=a[0]&&t<a[1]);
    if(inAR>=0){const n=Math.round(14+46*D.mib[inAR]/Math.max(...D.mib));R.flow(ring,{c:P.c2,r:.1,n,speed:2.4})}
    const comp=[D.fw,D.bw,D.op].find(x=>t>=x[1]&&t<x[2]),cmpCol=comp===D.op?P.c3:P.c1;
    for(let g=0;g<NG;g++){const c=gp(g),front=g===0,ga=front?1:.85;
      R.box(c,[1.05,.3,.8],{fill:comp?mix(P.paper,cmpCol,.55):P.paper,a:ga});
      // the seven buckets, left to right in the order they fill
      D.mib.forEach((mb,j)=>{const x=c[0]-.42+j*.14,hmax=.06+.86*mb/97.7,prev=j?D.ready[j-1]:D.bw[1],rd=D.ready[j],ar=D.ar[j];
        const f=cl((t-prev)/Math.max(1e-9,rd-prev),0,1),state=t>=ar[1]?'done':t>=ar[0]?'ar':t>=rd?'full':'fill';
        R.box([x,.3,c[2]],[.1,hmax,.24],{fill:P.paper,a:.18*ga,shadow:false,fa:.4});
        if(f>0){const col=state==='done'?P.c3:state==='ar'?P.c2:P.c5;R.box([x,.3,c[2]],[.1,Math.max(.01,hmax*f),.24],{fill:mix(P.paper,col,.85),a:ga,shadow:false});
          if(state==='ar'&&front)R.glow([x,.3+hmax+.05,c[2]],.25,{c:P.c2,a:.8})}});
      R.label([c[0],0,c[2]+.4],'rank '+g,{mono:true,fs:12,c:P.mute,dy:12,wide:1})}
    // labels for the front GPU's columns and the clock in the middle of the ring
    const g0=gp(0);
    if(k===0)R.label([g0[0]+.5,.3+.92,g0[2]],'buckets 1 to 7, height in MiB',{al:'left',mono:true,fs:12,c:P.c5,dx:6,a:e});
    if(inAR>=0)R.label([g0[0]-.42+inAR*.14,.3+.06+.86*D.mib[inAR]/97.7,g0[2]],'bucket '+(inAR+1)+' · '+D.mib[inAR].toFixed(1)+' MiB',{mono:true,fs:12.5,b:1,c:P.c2,dy:-16});
    const phase=comp===D.fw?'forward':comp===D.bw?'backward':comp===D.op?'optimizer':t>=D.r.total-1e-9?'step done':t>0?'SMs idle':'';
    R.label([0,.35,0],'t = '+t.toFixed(1)+' ms',{mono:true,fs:15,b:1,c:P.ink});
    if(phase)R.label([0,.35,0],phase+(inAR>=0?' · all-reduce':''),{mono:true,fs:12.5,c:comp?cmpCol:P.mute,dy:20});
    counters(t,inAR);
  }
  let last='';
  function counters(t,inAR){const D=M[mode],done=D.ar.filter(a=>t>=a[1]).length,cd=D.ar.reduce((s,a)=>s+Math.max(0,Math.min(t,a[1])-a[0]),0);
    const h=RD.stat('Clock',t.toFixed(2)+' ms','step ends at '+D.r.total.toFixed(2)+' ms')+RD.stat('Buckets all-reduced',done+' of '+D.mib.length,cd.toFixed(2)+' of '+D.r.comm.toFixed(2)+' ms of NCCL')+
      RD.stat('Step time',D.r.total.toFixed(2)+' ms',mode==='serial'?'nothing overlapped':D.r.exposed.toFixed(2)+' ms of NCCL exposed');
    if(h!==last){last=h;$('sg-ring-cnt').innerHTML=h}}
  const ph=()=>innerWidth<560;
  const st=S3.stage({id:'stg-ring',list:'sx-ring-serial',fig:'Fig. 3 · one DDP step on 8 of 64 GPUs',cam:ph()?[0,.95]:[0,.82],bounds:[[-3.1,0,-2.9],[3.1,1.3,3.1]],aspect:.72,dur:1300,hold:4800,draw,
    margin:w=>w<520?[12,8,10,8]:[16,14,12,14]});
  (window.SGSTG=window.SGSTG||{})['stg-ring']=st;window.SG_RING3=M;
  RD.seg($('sg-ring-mode'),v=>{mode=v;Object.keys(M).forEach(x=>$(M[x].list).hidden=x!==v);st.list(M[v].list)});
})();
