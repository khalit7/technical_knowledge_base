// ---- Scene: false sharing, four cores and their L1s fighting over 128-byte lines (section 8; renderer v2).
// Counters are false_sharing.cpp's std::atomic<int64_t> (8 bytes), 4 threads x 100 million relaxed increments; times are run 1 (window.CB.fs).
(function(){
  if(!document.getElementById('stg-fs')||!window.CB||!CB.fs)return;const {at,off,cl,mix,lerp}=S3;
  const V=CB.fs.v,ms=k=>V[k].runs[0].toLocaleString('en-US')+' ms';
  const CX=[-3.3,-1.1,1.1,3.3],ZC=-1.3,ZL=.35,SW=.13;        // core x, core z, L1 plate z, width of one 8-byte slot (16 per line)
  // per step: the lines (each a list of [slot, core] counters) and which cores share each line
  const LINES=[[[[0,0]]],[[[0,0],[1,1],[2,2],[3,3]]],[[[0,0],[8,1]],[[0,2],[8,3]]],[[[0,0]],[[0,1]],[[0,2]],[[0,3]]]];
  const TIME=[ms('one'),ms('b8'),ms('b64'),ms('b128')];
  function line(R,c,ctrs,o){const P=R.P,COL=[P.c1,P.c3,P.c4,P.c6];
    if(o.ghost){const w=8*SW,y=c[1]+.02;R.quad([[c[0]-w,y,c[2]-.16],[c[0]+w,y,c[2]-.16],[c[0]+w,y,c[2]+.16],[c[0]-w,y,c[2]+.16]],{fill:false,ec:P.bad,dash:[4,3],lw:1.3,a:.9});return}
    for(let s=0;s<16;s++){const own=ctrs.find(x=>x[0]===s);R.box([c[0]+(s-7.5)*SW,c[1],c[2]],[SW-.02,.16,.32],{fill:own?mix(P.paper,COL[own[1]],.75):P.paper,a:o.a,shadow:false,lw:.6,ec:o.ghost?P.mute:null,fa:o.ghost?.25:1})}}
  function draw(R,k,e){const P=R.P,COL=[P.c1,P.c3,P.c4,P.c6];R.grid(-5,5,-2.6,2.2,.5);
    const used=k===0?[0]:[0,1,2,3];
    CX.forEach((x,i)=>{const on=used.includes(i),a=on?1:.25;
      R.box([x,0,ZC],[1.5,.55,.8],{fill:mix(P.paper,COL[i],.3),a});R.label([x,.55,ZC],'core '+i,{fs:12.5,b:1,dy:-10,c:COL[i],a:Math.max(.5,a)});
      R.glass([x-1,.01,ZL-.45],[2,0,0],[0,0,.9],{c:COL[i],nu:4,nv:1,a:a*.8});R.label([x,0,ZL+.45],'L1',{fs:12,dy:14,c:P.mute,a})});
    const L=LINES[k];
    L.forEach((ctrs,li)=>{const cores=[...new Set(ctrs.map(x=>x[1]))];
      if(cores.length===1){const x=CX[cores[0]];line(R,[x,.03,ZL],ctrs,{a:1});
        R.flowArc([x-.3,.55,ZC+.4],[x-.3,.2,ZL-.1],.25,{c:COL[cores[0]],r:.04,n:4,speed:.8});return}
      // a shared line: one valid copy, the others invalidated; it moves on to the next core's L1 again and again
      const j=Math.floor(e*cores.length*2)%cores.length,owner=k===1||k===2?cores[e>=1?0:j]:cores[0];
      cores.forEach(ci=>line(R,[CX[ci],.03,ZL],ctrs,{a:ci===owner?1:.55,ghost:ci!==owner}));
      cores.forEach((ci,n)=>{const nx=cores[(n+1)%cores.length];if(cores.length===2&&n===1)return;
        R.flowArc([CX[ci],.2,ZL+.1],[CX[nx],.2,ZL+.1],cores.length===2?.6:.5+.15*Math.abs(nx-ci),{c:P.bad,r:.07,n:9,speed:1.8});
        if(cores.length===2)R.flowArc([CX[nx],.2,ZL-.1],[CX[ci],.2,ZL-.1],.45,{c:P.bad,r:.07,n:9,speed:1.8})})});
    const t=(k===0?'1 thread · ':'4 threads · ')+TIME[k]+(k===1?' · '+Math.round(V.b8.runs[0]/V.one.runs[0])+'x one thread':'');
    R.label([0,0,ZL+.6],t,{mono:true,fs:13,b:1,dy:34,c:k===1?P.bad:k===3||k===0?P.good:P.c5});
    R.label([0,0,ZL+.6],['counter in its own line','counters 8 bytes apart: 1 line','counters 64 bytes apart: 2 lines','counters 128 bytes apart: 4 lines'][k],{fs:12.5,dy:54,c:P.mute})
  }
  S3.stage({id:'stg-fs',list:'sx-fs',fig:'4 counters, 128-byte lines',cam:[.02,.72],bounds:[[-4.3,0,-1.8],[4.3,.8,1.4]],aspect:.45,dur:2600,hold:5200,draw,
    margin:w=>w<520?[14,10,64,10]:[18,20,70,20]});
})();
