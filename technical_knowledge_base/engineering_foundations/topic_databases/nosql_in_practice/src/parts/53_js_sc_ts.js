// ---- Scene, Fig. 4 (section 7): one big table against 30 daily partitions, with the measured cost of each question (inputs/ts.json, renderer v2) ----
// Widths: each day is one slab; the rollup's width is to scale against the raw table (14 MB against 317 MB).
(function(){
  if(!document.getElementById('stg-ts')||!window.NQ||!NQ.ts)return;const {at,off,lerp,mix}=S3;
  const g=NQ.ts.pg,f0=n=>Math.round(n).toLocaleString('en-US'),mb=b=>Math.round(b/1048576)+' MB';
  const N=30,W=.3,x=i=>-4.6+(i+.5)*W,ZB=-1.5,ZP=.4,ZR=1.6,APP=[5.6,0,.4],HB=.7;
  const rollW=N*W*g.size.rollup/g.size.plain_heap;
  function draw(R,k,e){const P=R.P;R.grid(-5.5,6.5,-3,3.2,.5);
    // the dashboard
    R.box(APP,[.9,.6,.7],{fill:mix(P.paper,P.c2,.2)});R.label([APP[0],.6,APP[2]],'dashboard',{fs:12.5,b:1,dy:-12});
    // one big table: the same days, written one after another into one file
    for(let i=0;i<N;i++){const del=k===5&&i<7,hit=(k===1&&i===N-1)||(k===2);
      R.box([x(i),0,ZB],[W,HB,.8],{fill:del?mix(P.paper,P.bad,.45*e):hit&&k===1?mix(P.paper,P.c2,.6):k===2?mix(P.paper,P.c2,.3*at(k,e,2)):P.paper,a:k===1||k===5?1:k===2?.45:k>=3?.35:1,ec:del?P.bad:null,lw:.4,shadow:false,ea:.35})}
    R.box([0,0,ZB],[N*W,.02,.8],{a:.6});
    // 30 daily partitions
    for(let i=0;i<N;i++){const old=i<7,drop=k===4&&old?e:k===5&&old?1:0,now=i===N-1;
      const lit=(k===1&&now)||(k===2&&i<=Math.floor(e*N));
      R.box([x(i),drop*1.2,ZP],[W*.82,HB,1.0],{fill:lit?mix(P.paper,P.c2,.7):old&&k===4?mix(P.paper,P.bad,.35):P.paper,a:(1-drop)*(k===3||k===5?.35:1),lw:.7,shadow:drop<.05})}
    // flows to the dashboard
    if(k===1){R.flowArc([x(N-1),HB,ZP],[APP[0]-.3,.5,APP[2]],.6,{c:P.c2,r:.07,n:6});R.flowArc([x(N-1),HB,ZB],[APP[0]-.3,.5,APP[2]-.2],.7,{c:P.c2,a:.5,r:.05,n:5})}
    if(k===2)for(let i=0;i<N;i+=3)if(i<=e*N)R.flowArc([x(i),HB,ZP],[APP[0]-.3,.5,APP[2]],.4+.02*(N-i),{c:P.c2,a:.7,r:.045,n:4,speed:1.6});
    // the rollup table: one row per minute and model, to scale
    const ra=k===3?e:0;R.box([-4.6+rollW/2,0,ZR],[Math.max(.08,rollW),HB,.8],{fill:mix(P.paper,P.c4,.5),a:ra});
    if(k===3){R.flowArc([-4.6+rollW/2,HB,ZR],[APP[0]-.3,.5,APP[2]+.2],.8,{c:P.c4,r:.07,n:9});
      R.label([-4.6+rollW,HB,ZR],'rollup: '+f0(g.rollup_rows)+' rows, '+mb(g.size.rollup),{fs:12.5,b:1,al:'left',dx:8,dy:18,c:P.c4})}
    // labels
    R.label([-4.6,HB/2,ZB],'one big table',{fs:12.5,b:1,al:'right',dx:-8,c:k===5?P.bad:P.ink,grp:'rows'});
    R.label([-4.6,HB/2,ZP],'30 daily partitions',{fs:12.5,b:1,al:'right',dx:-8,c:k===4?P.bad:P.ink,grp:'rows'});
    if(k===0){R.label([0,HB,ZB],f0(NQ.ts.pg.rows||5184000)+' rows · '+mb(g.size.plain_heap),{mono:true,fs:12.5,dy:-14});R.label([x(0),0,ZP+.5],'day 1',{fs:12,dy:14,c:P.mute});R.label([x(N-1),0,ZP+.5],'today',{fs:12,dy:14,c:P.mute})}
    if(k===1)R.label([x(N-1),HB,ZP],'today: '+g.last_hour.part.buffers+' pages, '+g.last_hour.part.ms+' ms',{mono:true,fs:12.5,b:1,dy:-16,c:P.c2});
    if(k===2)R.label([0,HB,ZP],f0(g.chart_raw.buffers)+' page reads, '+f0(g.chart_raw.ms)+' ms',{mono:true,fs:13,b:1,dy:-18,c:P.c2});
    if(k===3)R.label([APP[0],0,APP[2]+.4],f0(g.chart_rollup.buffers)+' pages, '+g.chart_rollup.ms.toFixed(1)+' ms',{mono:true,fs:12.5,b:1,dy:16,c:P.c4});
    if(k===4)R.label([x(3),1.2*e+HB,ZP],'DROP 7 partitions: '+g.retention_drop.s+' s, '+f0(g.retention_drop.wal_bytes)+' B of log',{mono:true,fs:12.5,b:1,dy:-14,c:P.bad,a:e});
    if(k===5)R.label([x(3),HB,ZB],'DELETE: '+g.retention_delete.s+' s, '+mb(g.retention_delete.wal_bytes)+' of log; still '+mb(g.size.plain_heap),{mono:true,fs:12.5,b:1,dy:-16,al:'left',dx:-30,c:P.bad,a:e});
  }
  const full={cam:[.12,.85],bounds:[[-4.8,0,-1.95],[6.2,.8,2.05]]};
  S3.stage({id:'stg-ts',list:'sx-ts',fig:'Fig. 4 · chunks by time: a range reads few, retention drops whole',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    view:k=>k===1?{cam:[.3,.7],bounds:[[1.2,0,-2],[6.2,1,1.2]]}:full,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,150]});
})();
