// ---- Scene, Fig. 4 (2026-11-12, renderer v2): memory by category through one training step of the larger variant, plain (front row) and with
// every block checkpointed (back row). Data: window.FST.mem.runs, configs ('big','plain') and ('big','ckpt'): PyTorch's memory profiler on the
// CPU, float32, the second training step; each run's curve is [time ms, MB per category in run.cats order]. Each column is the memory at one
// moment, placed by phase on the run's own clock (before forward; forward at 25, 50, 75 and 100%; backward at 2, 20, 40, 60, 80 and 98%, the
// moment nearest the run's peak snapped to the peak itself; mid-optimizer; after zero_grad). Heights to scale (867.4 MB = 2.4 units).
// Steps are #sx-mem. ----
(function(){
  if(!document.getElementById('stg-mem')||!window.S3||!window.FST)return;const {mix,lerp}=S3,D=window.FST;
  const get=h=>D.mem.runs.find(r=>r.config==='big'&&r.how===h),RP=get('plain'),RC=get('ckpt');if(!RP||!RC||!RP.curve||!RC.curve)return;
  const CATS=[['PARAMETER','parameters','c1'],['OPTIMIZER_STATE','AdamW state','c5'],['GRADIENT','gradients','c3'],['ACTIVATION','activations','c2'],['AUTOGRAD_DETAIL','backward temporaries','c4'],['OTHER','batch, temporaries','mute']];
  function cols(r){const c=r.curve,m=r.marks,tot=p=>p.slice(1).reduce((a,b)=>a+b,0),ipk=c.findIndex(p=>Math.abs(p[0]-Math.round(r.peak_ms*10)/10)<.06)>=0?c.findIndex(p=>Math.abs(p[0]-Math.round(r.peak_ms*10)/10)<.06):c.reduce((b,p,i)=>tot(p)>tot(c[b])?i:b,0);
    const near=t=>c.reduce((b,p,i)=>Math.abs(p[0]-t)<Math.abs(c[b][0]-t)?i:b,0),at=(ph,f)=>m[ph][0]+(m[ph][1]-m[ph][0])*f;
    const T=[[0,'start'],...[.25,.5,.75,1].map(f=>[at('fwd',f),'fwd']),...[.02,.2,.4,.6,.8,.98].map(f=>[at('bwd',f),'bwd']),[at('opt',.5),'opt'],[c[c.length-1][0],'end']];
    const I=T.map(([t])=>near(t)),bw=T.map((x,i)=>x[1]==='bwd'?i:-1).filter(i=>i>=0),j=bw.reduce((b,i)=>Math.abs(T[i][0]-r.peak_ms)<Math.abs(T[b][0]-r.peak_ms)?i:b,bw[0]);I[j]=ipk;
    const ix=n=>r.cats.indexOf(n);
    return {pk:j,ph:T.map(x=>x[1]),v:I.map(i=>{const p=c[i],g=n=>ix(n)>=0?p[1+ix(n)]:0;return {PARAMETER:g('PARAMETER'),OPTIMIZER_STATE:g('OPTIMIZER_STATE'),GRADIENT:g('GRADIENT'),ACTIVATION:g('ACTIVATION'),AUTOGRAD_DETAIL:g('AUTOGRAD_DETAIL'),OTHER:g('INPUT')+g('TEMPORARY')+g('UNKNOWN')}})}}
  const CP=cols(RP),CC=cols(RC),N=CP.v.length,MU=2.4/(RP.peak/1e6),XS=.62,X=i=>(i-(N-1)/2)*XS,ZP=-.7,ZC=.8,W=.46;
  const f1=v=>v.toFixed(1);
  // a stacked column; g grows it (0..1); returns the layer spans
  function col(R,x,z,v,a,g,labs){const P=R.P;let y=0;const sp={};
    CATS.forEach(([k,n,c],i)=>{const h=v[k]*MU*g;if(h>.003)R.box([x,y,z],[W,h,W],{fill:mix(P.paper,P[c],.8),a,shadow:i===0,lw:.6});sp[k]=[y,y+h];y+=h});
    if(labs)CATS.forEach(([k,n,c])=>{if(v[k]<.5)return;const [y0,y1]=sp[k];R.label([x+W/2,(y0+y1)/2,z+W/2],n+' '+f1(v[k])+' MB',{al:'left',dx:8,mono:true,fs:12,c:P[c],grp:'pk'})});
    return [sp,y]}
  const tot=v=>CATS.reduce((s,[k])=>s+v[k],0);
  // which columns each step shows, front row: the first n
  const SHOWN=[1,5,6,11,13,13,13];
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-1.5,1.4,.5);const ph=R.W<520;
    // front row: the plain step
    const n=SHOWN[k],n0=k?SHOWN[k-1]:0,fa=k===6?.1:k===5?.22:1;
    for(let i=0;i<N;i++){const x=X(i);
      if(i>=n){R.box([x,0,ZP],[W,.012,W],{fill:P.soft,a:.6,shadow:false});continue}
      const grow=i>=n0&&k<5?Math.min(1,Math.max(0,e*(n-n0)-(i-n0))):1;
      const isPk=i===CP.pk&&(k===2||k===3);
      const [sp,y]=col(R,x,ZP,CP.v[i],k===2&&!isPk?.35:fa,grow,isPk&&k===2);
      if(isPk&&grow>=1)R.label([x,y,ZP],f1(RP.peak/1e6)+' MB · the peak',{fs:13,b:1,mono:true,dy:-14,c:P.ink})}
    if(k===0){const y=tot(CP.v[0])*MU;R.label([X(0),y,ZP],f1(RP.start/1e6)+' MB',{fs:13,b:1,mono:true,dy:-12});
      R.label([X(0)+W/2,y*.2,ZP+W/2],'parameters '+f1(CP.v[0].PARAMETER)+' MB',{al:'left',dx:8,mono:true,fs:12,c:P.c1});R.label([X(0)+W/2,y*.7,ZP+W/2],'AdamW state '+f1(CP.v[0].OPTIMIZER_STATE)+' MB',{al:'left',dx:8,mono:true,fs:12,c:P.c5})}
    // phase names under the front row
    const ph0=[['forward',1,4],['backward',5,10],['opt',11,12]];
    ph0.forEach(([t,i,j])=>{if(i<n)R.label([(X(i)+X(Math.min(j,n-1)))/2,0,(k>=5?ZC:ZP)+.42],t,{fs:12,c:P.mute,dy:10})});
    // flows: forward saves activations as it goes; backward turns them into gradients; the optimizer reads the gradients into its state
    const top=(C,i,key)=>{let y=0;for(const [c] of CATS){y+=C.v[i][c]*MU;if(c===key)return y}return y};
    if(k===1){const p=[];for(let i=0;i<=4;i++)p.push([X(i),top(CP,i,'ACTIVATION')+.04,ZP]);R.flow(p,{c:P.c2,r:.055,n:14,speed:1.1,a:Math.min(1,e*1.5)})}
    if(k===3){[6,8,10].forEach(i=>R.flowArc([X(CP.pk),top(CP,CP.pk,'ACTIVATION')-.1,ZP],[X(i),top(CP,i,'GRADIENT'),ZP],.3,{c:P.c3,r:.05,n:7,speed:1.2,a:Math.min(1,e*1.5)}))}
    if(k===4){R.flowArc([X(10),top(CP,10,'GRADIENT'),ZP],[X(11),top(CP,11,'OPTIMIZER_STATE'),ZP],.35,{c:P.c5,r:.055,n:8,speed:1.1});
      const y=tot(CP.v[12])*MU;R.label([X(12),y,ZP],f1(tot(CP.v[12]))+' MB',{fs:12.5,b:1,mono:true,dy:-12})}
    // back row: every block checkpointed
    if(k>=5){for(let i=0;i<N;i++){const grow=k===5?Math.min(1,Math.max(0,e*N-i)):1,isPk=k===6&&i===CC.pk;
        const [sp,y]=col(R,X(i),ZC,CC.v[i],k===6&&!isPk?.3:1,grow,isPk);
        if(isPk)R.label([X(i),y,ZC],f1(RC.peak/1e6)+' MB · its peak',{fs:13,b:1,mono:true,dy:-14})}
      if(k===5){const p=[];for(let i=0;i<=4;i++)p.push([X(i),top(CC,i,'ACTIVATION')+.04,ZC]);R.flow(p,{c:P.c2,r:.05,n:10,speed:1.1,a:e});
        R.label([X(4),top(CC,4,'ACTIVATION'),ZC],'forward saves '+f1(RC.saved/1e6)+' MB',{al:'left',dx:10,fs:12.5,b:1,mono:true,c:P.c2,dy:-10,a:e})}
      // the plain peak, for comparison, on its (receded) column behind
      R.label([X(CP.pk),RP.peak/1e6*MU,ZP],(ph?'':'plain peak ')+f1(RP.peak/1e6)+' MB',{fs:12,mono:true,c:P.mute,dy:-12})}
    if(!ph){R.label([X(0)-.3,0,ZP],'plain',{al:'right',dx:-8,fs:12,mono:true,b:1,grp:'row',a:fa});if(k>=5)R.label([X(0)-.3,0,ZC],'checkpoint every block',{al:'right',dx:-8,fs:12,mono:true,b:1,grp:'row'})}
  }
  const full={cam:[-.28,.55],bounds:[[-4.3,0,-1.2],[4.3,2.5,1.3]]};
  const close=(i,z)=>({cam:[-.4,.42],bounds:[[X(i)-1.6,0,z-.6],[X(i)+2.6,2.5,z+.6]]});
  S3.stage({id:'stg-mem',list:'sx-mem',fig:'Fig. 4 · memory through one step, plain and checkpointed',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[18,10,12,10]:[20,16,14,150],
    // the two peaks are each about one column: the camera moves in on it
    view:k=>k===2?close(CP.pk,ZP):k===6?close(CC.pk,ZC):k===0?{cam:[-.4,.45],bounds:[[X(0)-1,0,ZP-.6],[X(0)+3.2,1.4,ZP+.6]]}:full});
})();
