// ---- Scene, Fig. 2 (section 6): what @triton.autotune does at a call, over tutorial 03's 16 real configurations compiled for sm_90a.
// Each configuration is a slab: footprint BM x BN (the tile of C it computes), height its shared memory (window.TGD.sweep 'mm_*', sm_90a);
// the glass plane is sm_90a's 227 KB per-block limit (TG_ARCH, from 32_js_cfg.js). The timing per configuration is do_bench's default
// (about 25 ms warm-up + 100 ms timed), not a measurement; the winner is not drawn because it needs a GPU. Explained by #sx-at. ----
(function(){
  if(!document.getElementById('stg-at')||!window.TGD||!window.TG_ARCH)return;const {at,off,mix}=S3,D=window.TGD;
  const rows=D.sweep.filter(r=>r.t==='sm_90a'&&r.k.startsWith('mm_')),lim=TG_ARCH.sm_90a.smemBlock,SM=Math.max(...rows.map(r=>r.smem)),HM=2.4,y=b=>b/SM*HM;
  const over=rows.filter(r=>r.smem>lim),fit=rows.length-over.length,MS=125;
  window.TG_AT={n:rows.length,over:over.length,fit,limKB:lim/1024,regs:[Math.min(...rows.map(r=>r.regs)),Math.max(...rows.map(r=>r.regs))],
    smemKB:[Math.min(...rows.map(r=>r.smem))/1024,SM/1024],timing_s:fit*MS/1000};
  const pos=j=>[((j%4)-1.5)*1.5,0,(Math.floor(j/4)-1.5)*1.25],KEY=[-4.3,0,-.4],KEY2=[-4.3,0,1.3],BEN=[4.3,0,-1.1],CACHE=[4.3,0,1.3];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-5.2,5.2,-3,3,.5);
    const rise=k===0?0:k===1?e:1,fade=k===5?1-.75*e:k===6?.25+.75*e:1;
    // the key that arrives (and, at step 7, a second one)
    const ka=k===5?1:k===6?.35:1;R.box(KEY,[.55,.55,.55],{fill:mix(P.paper,P.acc,.7),a:ka});lab([KEY[0],.55,KEY[2]],'key (M, N, K, dtypes)',{dy:-14,b:1,c:P.acc,a:ka});
    if(k===6){R.box(KEY2,[.55,.55,.55],{fill:mix(P.paper,P.c5,.7),a:e});lab([KEY2[0],0,KEY2[2]],'a new key',{dy:20,b:1,c:P.c5,a:e})}
    // the 16 configurations
    rows.forEach((r,j)=>{const c=pos(j),w=r.cx.BN/256*1.15,d=r.cx.BM/256*1.0,bad=r.smem>lim,h=Math.max(.03,y(r.smem)*rise);
      let fill=mix(P.paper,P.c1,.45),a=fade;if(k>=2&&bad){fill=mix(P.paper,P.bad,.55);a=fade*(k===2?1:.35)}if(k===4&&!bad)a=.55;
      R.box(c,[w,h,d],{fill,a,fa:k===0?.25:1})});
    // compile: the key's request reaches every configuration
    if(k===1||k===6){const a=k===1?1:e,src=k===1?KEY:KEY2;rows.forEach((r,j)=>{const c=pos(j);R.flowArc([src[0]+.3,.45,src[2]],[c[0],y(r.smem)*rise+.05,c[2]],.7,{c:k===1?P.acc:P.c5,a:a*.7,r:.05,n:4,speed:1.6})})}
    if(k===1){const hi=rows.reduce((a,r,j)=>r.smem>rows[a].smem?j:a,0),lo=rows.reduce((a,r,j)=>r.smem<rows[a].smem?j:a,0);
      [[hi,'largest'],[lo,'smallest']].forEach(([j,t])=>{const r=rows[j],c=pos(j);lab([c[0],y(r.smem)*e,c[2]],r.cx.BM+'×'+r.cx.BN+'×'+r.cx.BK+' · '+(r.smem/1024)+' KB',{dy:-12,fs:12,a:e,grp:'cfg'})})}
    // the per-block limit
    if(k>=2&&k<=4){const a=k===2?e:.6;R.glass([-3.1,y(lim),-2.6],[6.2,0,0],[0,0,5.2],{c:P.bad,a:a*.32,nu:4,nv:3,th:.01});
      lab([3.1,y(lim),-2.6],'227 KB per block (sm_90a)',{al:'left',dx:8,c:P.bad,a,grp:'lim'});
      if(k===2)lab([3.1,y(lim),-2.6],over.length+' × OutOfResources',{al:'left',dx:8,dy:20,fs:12,b:1,c:P.bad,a:e,wide:1})}
    // timing the 11 that fit
    if(k>=3){const a=k===3?e:k>=5?.35:1;R.box(BEN,[.7,.5,.7],{fill:mix(P.paper,P.c4,.6),a});lab([BEN[0],.5,BEN[2]],'do_bench · about 125 ms each',{dy:-14,b:1,c:P.c4,a,grp:'right'})}
    if(k===3)rows.forEach((r,j)=>{if(r.smem>lim)return;const c=pos(j);R.flowArc([c[0],y(r.smem)+.05,c[2]],[BEN[0]-.3,.4,BEN[2]],.8,{c:P.c4,a:e*.8,r:.05,n:4,speed:1.5})});
    if(k===3)lab([BEN[0],0,BEN[2]],fit+' × '+MS+' ms ≈ '+(fit*MS/1000).toFixed(1)+' s',{dy:22,fs:12,c:P.mute,a:e,wide:1});
    // the winner is stored under the key (left blank: which one wins needs a GPU)
    if(k>=4){const a=k===4?e:1;R.box(CACHE,[.7,.5,.7],{fill:P.paper,a,fa:.5});lab([CACHE[0],.25,CACHE[2]],'?',{fs:16,b:1,a});
      lab([CACHE[0],0,CACHE[2]],'cache[key] = fastest',{dy:24,b:1,a,grp:'right2'});
      if(k===4)R.flowArc([BEN[0],.5,BEN[2]],[CACHE[0],.5,CACHE[2]],.4,{c:P.c4,a:e,r:.06,n:5,speed:1.2});
      if(k===4)lab([CACHE[0],0,CACHE[2]],'winner: needs a GPU',{dy:40,fs:12,c:P.mute,a:e,wide:1})}
    if(k===5){R.flowArc([KEY[0]+.3,.5,KEY[2]],[CACHE[0]-.35,.5,CACHE[2]],1.4,{c:P.acc,a:e,r:.07,n:14,speed:2.2});lab([0,1.5,.4],'same key: one lookup',{b:1,c:P.acc,a:e})}
    if(k===6)lab([0,0,2.4],'2 keys: 32 compiles, 22 timings',{dy:24,b:1,c:P.c5,a:e,wide:1})
  }
  const full={cam:[.3,.66],bounds:[[-5,0,-2.8],[5,2.5,2.8]]};
  const st=S3.stage({id:'stg-at',list:'sx-at',fig:'Fig. 2 · tutorial 03 on sm_90a',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16],
    view:k=>k===1||k===2?{cam:[.3,.6],bounds:[[-3.6,0,-2.6],[3.6,2.5,2.6]]}:full});
  (window.TGSTG=window.TGSTG||{})['stg-at']=st;
})();
