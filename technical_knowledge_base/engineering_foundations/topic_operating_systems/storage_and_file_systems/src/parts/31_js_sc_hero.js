// ---- Scene, Fig. 1 (the idea): how far write, sync_file_range, fdatasync and fsync push one 4 KiB overwrite before they return (renderer v2) ----
// Costs are window.ST_DATA.sync, the medians of 1,000 overwrites on ext4 (measured); where each call stops is from fs/ext4/fsync.c and fs/sync.c (v5.10), section 5.
(function(){
  if(!document.getElementById('stg-hero')||!window.ST_DATA||!window.STL)return;const {at,lerp,mix}=S3,D=window.ST_DATA;
  const med=m=>D.sync.find(r=>r.fs==='ext4'&&r.shape==='overwrite'&&r.mode===m).med;
  const us=x=>(x<10?x.toFixed(1):Math.round(x).toLocaleString('en-US'))+' us';
  const YS=[4.6,3.5,2.4,1.3,.5],NAMES=['Your program','Page cache','Block layer, driver','Device cache','Stable media'],SUBS=['your 4 KiB buffer','kernel memory: dirty','bios in flight','acked, volatile','flash or platter'];
  const LX=[-2.4,-.8,.8,2.4],ZD=-.32,ZM=.42;
  // call, data stops at layer, metadata (the new modification time) stops at layer, measured median
  const C=[['write()',1,1,med('none')],['sync_file_range',3,1,med('sfr')],['fdatasync',4,1,med('fdatasync')],['fsync',4,4,med('fsync')]];
  const KEPT=['lost','lost','data kept','all kept'];
  const labX=k=>k<4?LX[k]-1.05:-3.25;
  function draw(R,k,e,st){const P=R.P,cut=k===4?e:0;R.grid(-4.5,4.5,-2,2,.5);
    const lx=lerp(labX(st.pk==null?k:st.pk),labX(k),st.pk===k?1:e);
    STL.stack(R,{ys:YS,names:NAMES,subs:SUBS,x0:-3.2,x1:3.2,z0:-1,z1:1,lab:lx,cutAt:4,cutY:.9,lost:cut,a:i=>1});
    C.forEach(([nm,ds,ms,cost],i)=>{const x=LX[i];if(i>k){R.line([[x,YS[0]+.5,0],[x,YS[4],0]],{c:P.mute,w:1,dash:[3,5],a:.35});return}
      const act=i===k,rec=k<4&&!act?.38:1,t=act?e:1;
      const yd=lerp(YS[0],YS[ds],t),ym=lerp(YS[0],YS[ms],t);
      R.label([x,YS[0]+.55,0],nm,{mono:1,fs:12.5,b:act||k===4,c:act||k===4?P.acc:P.ink,a:Math.max(.55,rec),wide:act?0:1});
      // the bytes stream down to where the call returns; the metadata change follows its own path
      if(act&&k<4){STL.down(R,x,ZD,YS[0]+.1,yd+.12,P.acc,1);if(ms>1)STL.down(R,x,ZM,YS[0]+.1,ym+.1,P.c4,.9);else STL.down(R,x,ZM,YS[0]+.1,ym+.1,P.c4,.6,3)}
      const dl=k===4&&ds<4?1-.75*cut:1,ml=k===4&&ms<4?1-.75*cut:1;
      STL.tok(R,[x,yd,ZD],[.5,.16,.42],mix(P.paper,P.acc,.75),rec*dl);
      STL.tok(R,[x,ym,ZM],[.36,.12,.3],mix(P.paper,P.c4,.7),rec*ml);
      if(k===4){if(ds===4)R.glow([x,YS[4]+.1,ZD],.55,{c:P.good,a:cut*.8});else R.glow([x,yd+.1,ZD],.6,{c:P.bad,a:cut*.7});
        R.label([x,0,1],KEPT[i],{fs:12.5,b:1,c:ds===4?P.good:P.bad,dy:16,a:cut})}
      if(!act||t>.85)R.label([x,yd,ZD],us(cost),{al:'left',dx:26,dy:-6,mono:1,fs:12,b:act,wide:act?0:1,c:act?P.acc:P.ink,a:Math.max(.5,rec)*(act?Math.min(1,(t-.85)/.15):1)})});
  }
  const full={cam:[-.3,.36],bounds:[[-3.3,0,-1.1],[3.3,5.3,1.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one 4 KiB overwrite, four calls',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    // each call's step moves in on its lane; the power cut shows all four
    view:k=>k<4&&innerWidth>=560?{cam:[-.3,.3],bounds:[[Math.max(-3.3,LX[k]-2.6),0,-1.1],[Math.min(3.3,LX[k]+2.6),5.3,1.1]]}:full,
    margin:w=>w<520?[16,10,26,96]:[18,90,30,150]});
})();
