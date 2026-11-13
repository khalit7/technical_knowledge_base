// ---- Scene, Fig. 6 (section 9): the caching allocator on the page's "batch 8, 9, 10" request stream, default (front) against expandable segments (back) ----
// Every frame is the page's model of CUDACachingAllocator.cpp at v2.14.1 (window.CACHESIM, 32_js_cache_core.js, checked against src/sim/cache_ref.py) on
// window.CACHE_SCEN.batch (illustrative sizes, a 2,560 MiB device). Each step plays a stretch of the 200 requests; device memory is drawn to scale.
(function(){
  if(!document.getElementById('stg-cuda')||!window.CACHESIM||!window.CACHE_SCEN)return;const {cl,lerp,mix}=S3;
  const SC=CACHE_SCEN.batch,M=CACHESIM.MiB,CAP=SC.cap,OPS=SC.ops;
  const DEF=CACHESIM.run(OPS,{capacity:CAP}),EXP=CACHESIM.run(OPS,{capacity:CAP,expandable:true});
  const L=11,X0=-5.5,U=L/CAP,ZF=1.25,ZB=-1.25,HD=.7;   // HD: half the depth of a row
  const ST=[[0,0],[1,9],[10,40],[41,80],[81,DEF.length-1],[DEF.length,OPS.length-1]];  // op stretches per step (the default stops at its OOM)
  const kind=t=>{t=String(t);return t==='w'?'c1':/a\d+$/.test(t)?'c3':/t\d+$/.test(t)?'c5':'c4'};
  const mib=b=>Math.round(b/M).toLocaleString('en-US');
  function opAt(k,e){const [a,b]=ST[k];return Math.min(b,a-1+Math.floor(e*(b-a+1.0001)))}
  function row(R,s,z,packed,dead){const P=R.P;if(!s)return [];let x=X0,cur=-1;const segX={};
    s.layout.forEach(r=>{if(r[3]==='U')return;const w=r[2]*U;
      if(packed){if(r[0]!==cur){if(cur>=0)x+=.05;cur=r[0];segX[r[0]]=x}}else x=X0+r[1]*U;
      const live=r[3]==='A';
      R.box([x+w/2,0,z],[Math.max(.02,w-.012),.04,2*HD],{fill:P.paper,shadow:false,lw:.5});
      R.box([x+w/2,.04,z],[Math.max(.02,w-.03),live?.5:.15,2*HD-.12],{fill:live?mix(P.paper,P[kind(r[4])],.55):mix(P.paper,P.c2,.6),shadow:false,lw:.6,a:dead?.55:1});
      if(packed)x+=w});
    return segX}
  function draw(R,k,e){const P=R.P;R.grid(-6.8,6.4,-2.4,2.6,.5);
    const i=opAt(k,e),dI=Math.min(i,DEF.length-1),dead=i>=DEF.length-1&&k>=4;
    // device capacity outlines and the driver between the rows
    [ZF,ZB].forEach(z=>R.quad([[X0,.002,z-HD],[X0+L,.002,z-HD],[X0+L,.002,z+HD],[X0,.002,z+HD]],{fill:false,dash:[5,4],ec:P.mute,ea:.6,dz:300}));
    R.quad([[X0,0,-.35],[X0+L,0,-.35],[X0+L,0,.35],[X0,0,.35]],{fill:mix(P.paper,P.c3,.12),edge:false,dz:310});
    R.label([X0+L,0,0],'CUDA driver',{al:'left',dx:8,fs:12.5,b:1,c:P.c3,wide:1});
    R.label([X0,0,ZF],'default',{al:'right',dx:-8,fs:12.5,b:1,grp:'side'});R.label([X0,0,ZB],'expandable',{al:'right',dx:-8,fs:12.5,b:1,grp:'side'});
    R.label([X0+L,0,ZF+HD],mib(CAP)+' MiB device',{al:'right',dy:14,fs:12,c:P.mute,wide:1});
    const sF=i>=0?DEF[dI]:null,sB=i>=0?EXP[Math.min(i,EXP.length-1)]:null;
    row(R,sF,ZF,true,dead);row(R,sB,ZB,false,false);
    // driver calls of the latest request in this stretch that made one: dots rise from the driver (cudaMalloc, map) or sink into it (cudaFree)
    [[DEF,ZF,true],[EXP,ZB,false]].forEach(([S,z])=>{let j=Math.min(i,S.length-1);const a0=ST[k][0];
      while(j>=a0&&j>=0&&!S[j].events.some(x=>x[0]!=='OOM'))j--;if(j<a0||j<0||i-j>3)return;
      const ev=S[j].events.filter(x=>x[0]!=='OOM'),up=ev.some(x=>x[0]==='cudaMalloc'||x[0]==='map'),xs=X0+L*(up?S[j].stats.reserved/CAP:.5)-.4;
      R.flow(up?[[xs,.02,0],[xs,.4,z*.6],[xs,.5,z]]:[[xs,.5,z],[xs,.4,z*.6],[xs,.02,0]],{c:P.c3,r:.06,n:5,a:.9})});
    const t=s=>s?'reserved '+mib(s.stats.reserved)+' · allocated '+mib(s.stats.allocated)+' MiB':'nothing reserved';
    R.label([X0,0,ZF+HD],dead?'OutOfMemoryError: '+mib(sF.stats.reserved-sF.stats.allocated)+' MiB reserved but unallocated':t(sF),{al:'left',dy:14,fs:12.5,b:1,c:dead?P.bad:P.ink,wide:1});
    R.label([X0,0,ZB-HD],t(sB),{al:'left',dy:-12,fs:12.5,b:1,c:P.ink,wide:1});
    if(dead)R.quad([[X0-.08,.01,ZF-HD-.05],[X0+L+.08,.01,ZF-HD-.05],[X0+L+.08,.01,ZF+HD+.05],[X0-.08,.01,ZF+HD+.05]],{fill:false,ec:P.bad,ea:1,lw:2,dz:-50});
    R.label([0,0,ZB-HD],i<0?'request 0 of '+OPS.length:'request '+Math.min(i+1,OPS.length)+' of '+OPS.length,{al:'left',dx:200,dy:-12,fs:12,mono:1,c:P.mute,wide:1});
  }
  S3.stage({id:'stg-cuda',list:'sx-cuda',fig:'Fig. 6 · caching allocator, batch 8, 9, 10',cam:[.06,.86],bounds:[[-6,0,-2.3],[6,.6,2.4]],aspect:.36,dur:3200,hold:4200,draw,
    margin:w=>w<520?[14,8,26,8]:[20,90,28,90]});
})();
