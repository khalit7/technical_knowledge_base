// ---- Scene, Fig. 2 (2026-11-12, renderer v2): Dynamo tracing one forward of the running example, a direct C++ call against a custom op.
// Every box is one operation recorded by torch._dynamo.explain (src/exp/graphs.py, window.EXT.graphs): the custom-op graph's operations
// laid out in recording order, one row per stretch (embeddings, blocks 0 to 3, the head), and, for the direct call, the four small graphs
// and the eager stretches Dynamo actually produced. Glass trays are compiled graphs; the red box is the graph break. Steps: #sx-dyn-pb, #sx-dyn-co. ----
(function(){
  if(!document.getElementById('stg-dyn')||!window.S3||!window.EXT)return;const {lerp,mix}=S3,G=window.EXT.graphs;
  const cg=G.custom_op.graphs[0],pg=G.pybind.graphs,NA=pg[0].length;
  // rows in recording order: the 4 operations before block 0, then per block the attention part (as long as the direct call's graph 1), fc, GELU, proj, residual add, then the rest
  const rows=[];let k0=0;const take=n=>{const s=cg.slice(k0,k0+n);k0+=n;return s};
  rows.push({nm:'embeddings',parts:[take(4)]});
  for(let b=0;b<4;b++)rows.push({nm:'block '+b,b,parts:[take(NA),take(1),take(1),take(1),take(1)]});
  rows.push({nm:'ln_f, head, loss',parts:[take(cg.length-k0)]});
  const NB=NA+4,DX=.21,X0=-(NB-1)*DX/2,ZR=[-2.15,-1.3,-.45,.4,1.25,2.1],OB=[.15,.2,.3],xi=i=>X0+i*DX;
  let mode='pybind';const close=k=>mode==='pybind'?k>=1&&k<=3:k>=1&&k<=2; // the block 0 steps, in close
  // [appears at step, in focus until step] for each part of each row
  function steps(r,j){const pb=mode==='pybind';
    if(r===0)return [0,0];if(r===5)return pb?[5,5]:[4,4];if(r>1)return pb?[4,4]:[3,3];
    if(pb)return j===0?[1,3]:j<=2?[2,3]:[3,3];return j<=1?[1,2]:[2,2]}
  function draw(R,k,e){const P=R.P,pb=mode==='pybind',GC=[P.c1,P.c3,P.c6,P.c4],last=pb?5:4;R.grid(-3.2,3.2,-2.8,2.8,.5);
    const alpha=(r,j)=>{const [s0,s1]=steps(r,j);if(!pb&&k===last)return k===s0?Math.max(.14,e):1;return k<s0?.14:k===s0?Math.max(.14,e):k<=s1?1:.4};
    let lastRow=0;
    rows.forEach((row,r)=>{const z=ZR[r];let i0=0;const pts=[];let focus=false;
      row.parts.forEach((part,j)=>{const n=part.length,x1=xi(i0),x2=xi(i0+n-1),a=alpha(r,j),[s0,s1]=steps(r,j),isG=row.b!==undefined&&j===2;
        if(k>=s0)lastRow=r;if(k>=s0&&k<=s1)focus=true;
        // the trays: under the direct call one per graph (the GELU and the eager rows get none); under the custom op one tray for everything, below
        const eager=pb&&row.b===undefined;
        if(pb&&!isG&&!eager){const g=j===0?0:j===1?1:j===3?2:3;R.glass([x1-.12,.01,z-.24],[x2-x1+.24,0,0],[0,0,.48],{c:GC[g],a:a*.9,nu:Math.max(1,n),nv:1,th:.02,dz:1e3});
          if(r===1&&k>=s0&&k<=3)R.label([(x1+x2)/2,.2,z-.24],n>1?'graph '+(g+1)+' · '+n+' ops':'g'+(g+1),{mono:true,fs:12,b:1,c:GC[g],dy:-12,a,wide:1})}
        part.forEach((o,i)=>{const x=xi(i0+i);
          if(isG){const lift=pb?.75*(k>s0?1:k===s0?e:0):0;
            R.box([x,lift,z],[.17,.24,.32],{fill:pb?P.bad:P.ink,a,shadow:false});
            if(pb&&lift>.05)R.line([[x,0,z],[x,lift,z]],{c:P.bad,w:1.4,dash:[3,3],a:a*.8});
            if(r===1&&k===2)R.label([x,lift+.24,z],pb?'raw_gelu · runs in Python':'ext.gelu.default · 1 node',{mono:true,fs:12.5,b:1,c:pb?P.bad:P.ink,dy:-10,a:e,al:'left',dx:-30})}
          else R.box([x,0,z],OB,{fill:eager?mix(P.paper,P.c5,.55):P.paper,a,shadow:false});
          // the path the dots take: along the row, up and over at a graph break
          if(k>=s0){if(isG&&pb){for(let s=0;s<=10;s++){const u=s/10;pts.push([x+(u-.5)*.3,.34+.9*Math.sin(Math.PI*u),z])}}else pts.push([x,.34,z])}});
        i0+=n});
      if(!(close(k)&&r>=3))R.label([X0-.2,0,z],row.nm,{al:'right',dx:-8,mono:true,fs:12,c:focus?P.ink:P.mute,grp:'rows'}); // rows out of the close-up keep no label (it would be clamped to the edge)
      if(focus&&pts.length>1)R.flow(pts,{c:pb?(row.b===undefined?P.c5:P.c1):P.acc,r:.05,speed:1.6,a:.75});
      if(focus&&row.b===undefined&&k<last)R.label([xi(row.parts[0].length-1)+.15,.2,z],pb?'eager · '+row.parts[0].length+' ops':'graph 1 · '+row.parts[0].length+' ops',{al:'left',dx:6,mono:true,fs:12,b:1,c:pb?P.c5:P.acc})});
    // one tray for the whole forward under the custom op, growing row by row as Dynamo traces
    if(!pb){const z1=ZR[lastRow];R.glass([X0-.2,0,ZR[0]-.32],[(NB-1)*DX+.4,0,0],[0,0,z1-ZR[0]+.64],{c:P.acc,a:.5,nu:12,nv:lastRow+1,th:.02,dz:1e3})}
    // the result, on the last step
    if(k===last)R.label([0,1.15,ZR[0]-.3],pb?G.pybind.gc+' graphs · '+G.pybind.bc+' breaks · outer frame eager':'1 graph · '+G.custom_op.n0+' operations · 0 breaks',{mono:true,fs:13,b:1,c:pb?P.bad:P.acc,a:e});
  }
  const full={cam:[.18,.95],bounds:[[-2.9,0,-2.4],[2.9,1.2,2.4]]};
  const st=S3.stage({id:'stg-dyn',list:'sx-dyn-pb',fig:'Fig. 2 · one forward, as Dynamo recorded it',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,8,14,8]:[16,14,14,130],
    // the block 0 steps move in close on its row; the rest show the whole forward
    view:k=>close(k)?{cam:[.12,.55],bounds:[[-2.5,0,-1.75],[2.6,1.2,-.9]]}:full});
  RD.seg(document.getElementById('ext-dyn-seg'),m=>{mode=m;document.getElementById('sx-dyn-pb').hidden=m!=='pybind';document.getElementById('sx-dyn-co').hidden=m==='pybind';st.list(m==='pybind'?'sx-dyn-pb':'sx-dyn-co')});
})();
