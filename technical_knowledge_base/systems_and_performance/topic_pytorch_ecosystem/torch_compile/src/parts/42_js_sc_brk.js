// ---- Scene, Fig. 2 (2026-11-12, renderer v2): a print in Block.forward splits the running example's forward. Drawn at the level of frames
// and graphs (the sibling Extending PyTorch, Fig. 2, draws the same kind of split op by op). Numbers from window.TCP.fix[0] (the print
// row of exp/fixer.py: graphs, breaks, ops per compiled piece, piece calls per forward) and TCP.fix_base (the unmodified model). Steps: #sx-brk. ----
(function(){
  if(!document.getElementById('stg-brk')||!window.S3||!window.TCP)return;const {at,off,mix}=S3;
  const F=TCP.fix[0],B=TCP.fix_base,G1=F.b.piece_ops[0],G2=F.b.piece_ops[1],NB=4;
  // rows from the back (top of the picture) to the front: the embeddings, blocks 0 to 3, the head; x runs along the forward
  const ROWS=['embeddings','block 0','block 1','block 2','block 3','ln_f, head, loss'],ZR=i=>-2.1+i*.84;
  const X0=-3.2,X1=3.2,W=X1-X0,BK=.42,WA=(W-BK-.2)*G1/(G1+G2),WB=(W-BK-.2)*G2/(G1+G2);
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-3,3,.5);
    const whole=k===0?1:k===1?1-e:k===4?e:0;       // the one graph of the unmodified (and the fixed) forward
    const split=k===1?e:k===4?1-e:k>=2?1:0;          // GPT.forward abandoned: its own rows run as Python
    ROWS.forEach((nm,i)=>{const z=ZR(i),blk=i>=1&&i<=NB,b=i-1;
      const focus=k===2?(i===1?1:.25):1;
      R.label([X0-.15,0,z],nm,{mono:true,fs:12,al:'right',dx:-8,c:k===2&&i!==1?P.mute:P.ink,grp:'rows'});
      if(!blk){ // embeddings and the head: compiled in the whole graph, plain Python after the break
        R.box([0,0,z],[W,.16,.42],{fill:split>.5?mix(P.paper,P.c5,.35):P.paper,a:Math.max(.3,focus),shadow:false});
        if(k===1)R.label([X0+.2,.16,z],'Python, eager',{mono:true,fs:12,b:1,c:P.ink,dy:-9,al:'left',a:split});return}
      // a block: the attention half, the print, the rest; drawn as two compiled pieces once Block.forward is its own frame
      const xa=X0+WA/2,xp=X0+WA+.1+BK/2,xb=X1-WB/2,lift=.55*split;
      R.box([xa,0,z],[WA,.16,.42],{fill:P.paper,a:focus,shadow:false});R.box([xb,0,z],[WB,.16,.42],{fill:P.paper,a:focus,shadow:false});
      R.box([xp,lift,z],[BK,.22,.34],{fill:split>.05?P.bad:P.paper,a:focus,shadow:false});
      if(split>.05)R.line([[xp,0,z],[xp,lift,z]],{c:P.bad,w:1.3,dash:[3,3],a:focus*split});
      // the two graphs, as glass trays, once the block is compiled on its own (step 3 on)
      const ga=k===2?(i===1?e:0):k===3?(i===1?1:e):k===4?1-e:0;
      if(ga>0){R.glass([X0-.05,.01,z-.26],[WA+.1,0,0],[0,0,.52],{c:P.c1,a:ga*focus,nu:Math.max(2,Math.round(G1/2)),nv:1,th:.02,dz:1e3});
        R.glass([X1-WB-.05,.01,z-.26],[WB+.1,0,0],[0,0,.52],{c:P.c3,a:ga*focus,nu:Math.max(2,G2),nv:1,th:.02,dz:1e3});
        if(i===1&&k>=2&&k<=3){R.label([xa,.2,z-.26],'graph 1 · '+G1+' ops',{mono:true,fs:12,b:1,c:P.c1,dy:-12,a:ga});R.label([xb,.2,z-.26],'graph 2 · '+G2+' ops',{mono:true,fs:12,b:1,c:P.c3,dy:-12,a:ga});
          R.label([xp,lift+.22,z],'print · Python',{mono:true,fs:12,b:1,c:P.bad,dy:-10,a:ga})}}
      // the path the data takes through the block: straight through a graph, up and over the break
      if(k>=2&&k<=3&&(k===3||i===1)){const pts=[[X0,.28,z],[X0+WA,.28,z]];for(let s=0;s<=10;s++){const u=s/10;pts.push([xp-BK/2-.05+u*(BK+.1),.3+(lift+.25)*Math.sin(Math.PI*u),z])}pts.push([X1-WB,.28,z],[X1,.28,z]);
        R.flow(pts,{c:P.acc,r:.055,speed:1.5,a:(k===2?e:1)*.85})}});
    // the one graph spanning the whole forward
    if(whole>.01){R.glass([X0-.15,.005,ZR(0)-.36],[W+.3,0,0],[0,0,ZR(5)-ZR(0)+.72],{c:P.acc,a:whole*.55,nu:16,nv:6,th:.02,dz:1e3});
      const pts=[];ROWS.forEach((_,i)=>{const z=ZR(i);pts.push([i%2?X1:X0,.28,z],[i%2?X0:X1,.28,z])});R.flow(pts,{c:P.acc,r:.06,speed:2.2,a:whole*.85});
      R.label([0,.7,ZR(0)-.36],(k===4?'fixed: ':'')+B.graphs+' graph · '+(k===4?F.f.piece_ops[0]:B.piece_ops[0])+' ops · 0 breaks',{mono:true,fs:13,b:1,c:P.acc,a:whole})}
    if(k===1)R.label([0,.85,ZR(0)-.36],'GPT.forward: skipped, falls back to eager',{mono:true,fs:12.5,b:1,c:P.bad,a:e});
    if(k===3)R.label([0,1.15,ZR(0)-.36],F.b.graphs+' graphs · '+F.b.breaks+' break · '+F.b.pieces_per_forward+' piece calls per forward',{mono:true,fs:13,b:1,c:P.bad,a:e});
  }
  const full={cam:[.3,.72],bounds:[[-3.6,0,-2.6],[3.6,1.1,2.6]]};
  S3.stage({id:'stg-brk',list:'sx-brk',fig:'Fig. 2 · a print in Block.forward, frame by frame',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1400,hold:5000,draw,
    margin:w=>w<520?[14,8,14,8]:[16,14,14,120],
    // step 3 moves in close on block 0, the first frame Dynamo compiles on its own
    view:k=>k===2?{cam:[.3,.6],bounds:[[-3.6,0,-2.0],[3.6,1.2,-.6]]}:full});
})();
