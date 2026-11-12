// ---- Scene, Fig. 3 (section 6): a loader streaming shards from the object store through a local cache (renderer v2). The rates are the root
// Storage lab's measured reads of the same 64 MiB as 16 files of 4 MiB (window.IO_D.read_all: the SeaweedFS S3 stand-in against a Docker
// volume standing in for local NVMe, one thread and 16 threads); prices are AWS us-east-1 as section 6 quotes them. The three nodes and the
// shared cache tier of the last step are illustrative. Steps: #sx-cache.
(function(){
  if(!document.getElementById('stg-cache')||!window.IO_D||!IO_D.read_all)return;const {at,off,lerp,mix}=S3;
  const A=IO_D.read_all,g=(k)=>A[k].MBps,f1=x=>x.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  window.SD_CACHE={s3_1:g('big|s3|1'),s3_16:g('big|s3|16'),loc_1:g('big|local|1'),loc_16:g('big|local|16'),files:A['big|s3|1'].files};
  const C=window.SD_CACHE,OS=[0,0,-3.3],ND=[0,0,1.9],GP=[-1.5,.24,2],NV=[1.4,.24,2];
  const HL=[0,2.3,-4.6]; // the headline of each step sits high behind the object store
  const shard=i=>[OS[0]-1.75+(i%8)*.5,.95,OS[2]-.25+Math.floor(i/8)*.5],slot=i=>[NV[0]-.7+(i%8)*.2,.49,NV[2]-.15+Math.floor(i/8)*.3];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-6,6,-4.4,3.6,.5);
    // the object store and its 16 shards (the dataset of record)
    const oa=k===2?.3:1;
    R.box(OS,[4.6,.95,1.5],{fill:mix(P.paper,P.c5,.4),a:oa});
    for(let i=0;i<16;i++)R.box(shard(i),[.36,.16,.36],{fill:mix(P.paper,P.c5,.8),a:oa,shadow:false,lw:.6});
    lab([OS[0]+2.5,.5,OS[2]+.75],k===0?'object store · $0.023 per GB-month':'object store',{al:'left',dx:10,b:1,c:P.c5,a:Math.max(.5,oa)});
    const many=k===4?e:0,one=1-many;
    // one node: GPUs and a local NVMe cache with 16 slots
    if(one>0){R.box(ND,[5,.24,2],{fill:mix(P.paper,P.ink,.06),a:one,dz:200});
      R.box(GP,[1.4,.5,1],{fill:mix(P.paper,P.acc,.6),a:one,shadow:false});lab([GP[0],.74,GP[2]],'GPUs',{dy:-10,b:1,c:P.acc,a:one});
      R.box(NV,[1.8,.25,1],{fill:mix(P.paper,P.c3,.3),a:one,shadow:false});
      const filled=k===0?0:k===1?Math.floor(16*e):16,stale=k===3?.3:1;
      for(let i=0;i<16;i++){const s=slot(i);if(i<filled)R.box(s,[.16,.14,.24],{fill:k===3?P.mute:mix(P.paper,P.c3,.85),a:one*stale,shadow:false,lw:.5});
        else R.box(s,[.16,.04,.24],{fill:P.paper,a:one*.6,shadow:false,lw:.4})}
      lab([NV[0]+.9,.3,NV[2]],k===0?'local NVMe cache · empty':'local NVMe cache',{al:'left',dx:10,b:1,c:P.c3,a:one})}
    const gtop=[GP[0],.8,GP[2]-.2],ntop=[NV[0],.6,NV[2]-.2],otop=[OS[0],1.2,OS[2]+.4];
    if(k===0)lab(HL,'$0.145 per GB-month for FSx for Lustre',{c:P.mute,wide:1});
    if(k===1){R.flowArc(otop,gtop,1.3,{c:P.c5,a:e,r:.07,n:9,speed:1});R.flowArc([GP[0]+.6,.6,GP[2]],[NV[0]-.6,.55,NV[2]],.35,{c:P.c3,a:e*.8,r:.05,n:4,speed:.8});
      lab(HL,'epoch 1 · '+f1(C.s3_1)+' MB/s from the object store',{b:1,c:P.c5,a:e});lab(HL,f1(C.s3_16)+' MB/s with 16 threads',{dy:18,c:P.mute,a:e,wide:1})}
    if(k===2){R.flowArc(ntop,gtop,.6,{c:P.c3,a:e,r:.08,n:9,speed:2.2});
      lab(HL,'epoch 2 · '+f1(C.loc_1)+' MB/s from the cache',{b:1,c:P.c3,a:e});lab(HL,f1(C.loc_16)+' MB/s with 16 threads',{dy:18,c:P.mute,a:e,wide:1})}
    if(k===3){R.flowArc(otop,gtop,1.3,{c:P.c5,a:e,r:.07,n:9,speed:1});lab(HL,'single pass: each byte read once',{b:1,c:P.ink,a:e});lab([NV[0],.6,NV[2]],'a copy, never read',{dy:-14,c:P.mute,a:e})}
    // many readers: three nodes share one cache tier filled once from the object store (illustrative)
    if(many>0){const NX=[-3.2,0,3.2],SC=[0,0,-.9];
      R.box(SC,[4.2,.5,1],{fill:mix(P.paper,P.c3,.45),a:many});lab([SC[0]+2.1,.25,SC[2]],'shared cache tier',{al:'left',dx:10,b:1,c:P.c3,a:many});
      NX.forEach((x,n)=>{R.box([x,0,2.2],[2.2,.24,1.2],{fill:mix(P.paper,P.ink,.06),a:many,dz:200});R.box([x,.24,2.2],[1,.4,.7],{fill:mix(P.paper,P.acc,.6),a:many,shadow:false});
        lab([x,0,2.8],['job A','job B','serving'][n],{dy:14,b:1,a:many});R.flowArc([SC[0]+(n-1)*1.2,.55,SC[2]+.3],[x,.7,2.1],.7,{c:P.c3,a:many,r:.07,n:7,speed:1.8})});
      R.flowArc(otop,[SC[0],.55,SC[2]-.3],.6,{c:P.c5,a:many*.6,r:.05,n:4,speed:.6});lab(HL,'filled once, read many times',{b:1,c:P.c3,a:many})}
  }
  const full={cam:[.3,.62],bounds:[[-4.4,0,-4.8],[4.4,2.5,3]]};
  const st=S3.stage({id:'stg-cache',list:'sx-cache',fig:'Fig. 3 · shards through a local cache',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===2?{cam:[.38,.6],bounds:[[-3.2,0,-4.8],[3.6,2.5,3]]}:full});
  (window.SDSTG=window.SDSTG||{})['stg-cache']=st;
})();
