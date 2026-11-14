// ---- Scene, Fig. 12 (2026-11-12): one data-parallel step of the real two-process run (src/runs/ss_multi.py: 2 processes x 4 simulated devices,
// jax.distributed over localhost, gloo between processes), against one process with 8 devices. Device ids, shard rows, the single all-reduce and the
// losses are SS.multi's recorded values. The 'Fig. 12 runs as' buttons swap the step list (sx-multi2, sx-multi1) and replay. ----
(function(){
  if(!document.getElementById('stg-multi')||!window.S3||!window.SS)return;const {at,off,mix}=S3,$=id=>document.getElementById(id);
  const PR=SS.multi.normal.processes,ids=PR[0].device_ids,rows=PR.map(p=>p.addressable_shards),L0=PR[0].losses[0],L19=PR[0].losses[19];
  let mode=2;
  // chips: host h holds chips 4h..4h+3 in a row; global device i
  const HX=[-1.62,1.62],CW=.5,CH=.16,CD=.6;
  const chip=i=>{const h=i>>2,j=i&3;return [HX[h]+(j-1.5)*.64,0,.2]};
  const bc=(P,i)=>[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6,mix(P.c1,P.c3,.5),mix(P.c2,P.c4,.5)][i];
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-1.9,1.9,.5);
    const two=mode===2,lit=k===1?mix(P.paper,P.acc,.18*e):P.paper;
    // hosts: two plinths (two processes) or one (one process)
    if(two)HX.forEach((x,h)=>{R.box([x,0,.2],[2.75,.08,1.1],{fill:k>=1?lit:mix(P.paper,P.line,.25),shadow:false});
        R.label([x,.08,.75],'process '+h+' · host '+h,{fs:12.5,b:1,dy:16,c:P.ink})});
    else{R.box([0,0,.2],[6.0,.08,1.1],{fill:P.paper,shadow:false});R.label([0,.08,.75],'one process, 8 devices',{fs:12.5,b:1,dy:16,c:P.ink})}
    for(let i=0;i<8;i++){const p=chip(i),y=.08;R.box([p[0],y,p[2]],[CW,CH,CD],{fill:P.paper,shadow:false});
      const nm=two?'cpu:'+ids[i]:'cpu:'+i;R.label([p[0],y+CH,p[2]-CD/2],nm,{mono:true,fs:12,dy:-10,c:P.mute,a:k<=2?1:0,wide:1})}
    // 1. before connecting each process sees only its own 4 devices (the other host's chips are greyed for it)
    if(k===0&&two)R.label([0,.1,.2],'each sees only its own 4',{fs:12.5,b:1,dy:-34,c:P.mute,a:e});
    // 2. jax.distributed.initialize: the two processes connect; both now list all 8 devices
    if(k===1){if(two){R.flowArc([HX[0]+1.2,.3,.2],[HX[1]-1.2,.3,.2],.5,{c:P.acc,a:e,r:.06,n:7,speed:1});R.flowArc([HX[1]-1.2,.25,.45],[HX[0]+1.2,.25,.45],.35,{c:P.acc,a:e,r:.05,n:5,speed:1});
        R.label([0,.95,.05],'jax.distributed.initialize()',{mono:true,fs:12.5,b:1,c:P.acc,a:e});R.label([0,.95,.05],'jax.devices(): all 8 in both',{fs:12.5,dy:18,c:P.ink,a:e})}
      else R.label([0,.95,.05],'nothing to connect',{fs:12.5,b:1,c:P.mute,a:e})}
    // 3. load: each process loads its own rows and builds one global [32, 128] array without communication
    if(k>=2){const a=k===2?Math.min(1,e*1.5):k===3?.6:.35;
      (two?[0,1]:[0]).forEach(h=>{const x0=two?HX[h]-1.2:-2.8,w=two?2.4:5.6,n=two?4:8,g=.05,bw=w/n;
        for(let j=0;j<n;j++){const i=two?4*h+j:j;R.glass([x0+j*bw+g/2,1.2,-.9],[bw-g,0,0],[0,.38,0],{c:bc(P,i),a,nu:1,nv:2,th:.03});
          if(k===2)R.flowArc([x0+(j+.5)*bw,1.2,-.9],[chip(i)[0],.32,chip(i)[2]],.15,{c:bc(P,i),a:e,r:.05,n:4,speed:1.1})}
        R.label([x0+w/2,1.58,-.9],two?'process '+h+' loads rows '+rows[h][0][2]+'-'+(rows[h][3][3]-1):'loads rows 0-31',{fs:12.5,b:1,dy:-10,c:P.ink,a})});
      for(let i=0;i<8;i++){const p=chip(i);R.glass([p[0]-.2,.26,p[2]],[.4,0,0],[0,.16,0],{c:bc(P,i),a:k===2?e:1,nu:1,nv:1,th:.03})}
      if(k===2)R.label([0,1.0,.2],'4 rows per device, one global [32, 128]',{fs:12.5,b:1,c:P.ink,a:e,wide:1})}
    // 4. compute: forward and backward per device give partial gradients
    if(k>=3)for(let i=0;i<8;i++){const p=chip(i),h=.2*(k===3?e:1);R.box([p[0],.45,p[2]],[.36,h+.01,.3],{fill:mix(P.paper,P.c3,.55),a:k>=5?1-.6*e:1,shadow:false})}
    if(k===3)R.label([0,1.0,.2],'partial gradients on every device',{fs:12.5,b:1,c:P.c3,a:e});
    // 5. all-reduce: the one collective of the step; between the processes it crosses over gloo
    if(k===4){for(let i=0;i<8;i++){const j=(i+1)%8,a=chip(i),b=chip(j),cross=(i>>2)!==(j>>2);
        R.flowArc([a[0],.7,a[2]],[b[0],.7,b[2]],cross?.45:.12,{c:cross&&two?P.c2:P.c3,a:e,r:cross?.065:.05,n:cross?8:3,speed:1.1})}
      R.label([0,1.2,.05],two?(R.W<520?'all-reduce, over gloo between hosts':'all-reduce: inside each process, and over gloo between them'):'all-reduce: a memory copy inside one process',{fs:12.5,b:1,dy:-6,c:two?P.c2:P.c3,a:e})}
    // 6. update: the same AdamW step on every device; both processes read the same loss
    if(k>=5){for(let i=0;i<8;i++){const p=chip(i);R.box([p[0],.45,p[2]],[.42,.12*e+.01,.36],{fill:mix(P.paper,P.c4,.55),a:e,shadow:false})}
      R.label([0,1.2,.05],R.W<520?'same weights; loss '+L0.toFixed(4)+' to '+L19.toFixed(4):'same weights on all 8; loss '+L0.toFixed(6)+' at step 0, '+L19.toFixed(6)+' at step 19',{fs:12.5,b:1,dy:-6,c:P.c4,a:e})}
  }
  const full={cam:[.15,.5],bounds:[[-3.1,0,-1.0],[3.1,1.6,.9]]};
  const st=S3.stage({id:'stg-multi',list:'sx-multi2',fig:'Fig. 12 · one data-parallel step, recorded run',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[22,10,30,10]:[26,24,34,24],
    view:k=>(v=>innerWidth<520?{cam:[v.cam[0],v.cam[1]+.4],bounds:v.bounds}:v)(k===0||k===1?{cam:[.1,.42],bounds:[[-3.1,0,-.4],[3.1,1.0,.9]]}:full)} /* on a phone a steeper camera fills the taller card */);
  const seg=$('mu-mode');if(seg)SSU.seg(seg,v=>{mode=+v;$('sx-multi2').hidden=mode!==2;$('sx-multi1').hidden=mode===2;st.list('sx-multi'+mode)});
})();
