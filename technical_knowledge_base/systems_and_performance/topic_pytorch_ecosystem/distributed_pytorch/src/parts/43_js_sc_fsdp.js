// ---- Scene, Fig. 3 (2026-11-12, renderer v2): one FSDP2 training step on 4 ranks. Each rank holds a quarter of every unit (the root unit:
// embeddings, ln_f and the tied head; then blocks 0 to 3) as Shard(0) DTensors; a unit is all-gathered whole just before it is used and freed after
// (the root is kept), and its gradients are reduce-scattered back to quarters. Counts and bytes are rank 0's recorded step 1
// (window.DPT.mesh.fsdp4: 9 all-gathers, 5 reductions) and its memory (DPT.mesh.fsdp4 and ddp4 .state). Slab sizes are not to scale.
// Steps are #sx-fsdp on the left. ----
(function(){
  if(!document.getElementById('stg-fsdp')||!window.S3||!window.DPT)return;const {mix}=S3,D=window.DPT,U=window.DU;
  const fs=D.mesh.fsdp4.ranks[0],dd=D.mesh.ddp4.ranks[0],C=fs.coll;
  const agRoot=C.find(c=>c[0]==='all_gather'&&c[4]===1)[3],agBlk=C.find(c=>c[0]==='all_gather'&&c[4]>1)[3];
  const rsBlk=C.find(c=>c[0]!=='all_gather'&&c[4]>1)[3],rsRoot=C.find(c=>c[0]!=='all_gather'&&c[4]===1)[3];
  const nAG=C.filter(c=>c[0]==='all_gather').reduce((s,c)=>s+c[4],0),nRS=C.filter(c=>c[0]!=='all_gather').reduce((s,c)=>s+c[4],0);
  const X=[-2.55,-.85,.85,2.55],TH=[.1,.17,.17,.17,.17],GAP=.06,Y0=.17,SW=1.2,SD=.8,NM=['root unit','block 0','block 1','block 2','block 3'];
  const YS=[];{let y=Y0;TH.forEach(h=>{YS.push(y);y+=h+GAP})}const TOP=YS[4]+TH[4];
  // per step: units gathered whole, the unit whose collective runs now, its kind, and the units whose gradients are already reduced to quarters
  const S=[{whole:[],now:-1},{whole:[0],now:0,kind:'ag'},{whole:[0,1],now:1,kind:'ag'},{whole:[0,4],now:4,kind:'ag'},{whole:[0,4],now:4,kind:'rs',grad:[4]},{whole:[],now:0,kind:'rs',grad:[0,1,2,3,4]}];
  const CNT=[[0,0],[1,0],[2,0],[5,0],[6,1],[nAG,nRS]];
  const qx=(x,j)=>x+SW*((j+.5)/4-.5);
  function draw(R,k,e){const P=R.P,s=S[k];R.grid(-3.6,3.6,-1.3,1.3,.5);
    X.forEach((x,r)=>{R.box([x,0,0],[1.45,.12,1.05],{fill:P.paper});R.label([x,0,.48],'rank '+r,{mono:true,fs:12,c:P.mute,dy:14});
      for(let i=0;i<5;i++){const y=YS[i],h=TH[i],whole=s.whole.includes(i),grad=(s.grad||[]).includes(i),fresh=whole&&i===s.now&&s.kind==='ag';
        for(let j=0;j<4;j++){const mine=j===r,cx=qx(x,j),w=SW/4-.02;
          if(mine){R.box([cx,y,0],[w,h,SD],{fill:mix(P.paper,grad?P.c2:P.c3,grad?.75:.6),shadow:false})}
          else if(whole){const a=fresh?Math.min(1,e*1.3):1;R.box([cx,y,0],[w,h,SD],{fill:mix(P.paper,P.c3,.3),a:Math.max(.22,a),shadow:false})}
          else R.box([cx,y,0],[w,h,SD],{fill:P.paper,a:.2,fa:.3,shadow:false})}
        if(r===0)R.label([x-SW/2-.15,y+h/2,0],NM[i],{al:'right',dx:-10,fs:12,c:P.mute,grp:'u'})}
      if(s.now>=0&&k<5)R.glow([x,YS[s.now]+TH[s.now]/2,0],.7,{c:s.kind==='rs'?P.c2:P.c3,a:.35})});
    // what moves: an all-gather sends each rank's quarter to every other rank; a reduce-scatter sends quarter j of each rank's full gradient to rank j
    if(s.now>=0&&k<5){const i=s.now,y=YS[i]+TH[i]+.02,c=s.kind==='rs'?P.c2:P.c3;
      X.forEach((x,r)=>X.forEach((x2,j)=>{if(j===r)return;const from=s.kind==='rs'?qx(x,j):qx(x,r),to=s.kind==='rs'?qx(x2,j):qx(x2,r);
        R.flowArc([from,y,0],[to,y,0],.26+.07*Math.abs(j-r),{c,a:.9*Math.min(1,e*1.5),r:.045,n:4,speed:1.3})}))}
    if(k===5){const y=YS[0]+TH[0]+.02;X.forEach((x,r)=>X.forEach((x2,j)=>{if(j!==r)R.flowArc([qx(x,j),y,0],[qx(x2,j),y,0],.2+.05*Math.abs(j-r),{c:P.c2,a:.55,r:.04,n:3,speed:1.2})}))}
    const T=[['At rest: a quarter of every unit per rank',U.comma(fs.state.params)+' B weights + '+U.comma(fs.state.opt_state)+' B AdamW (DDP: '+U.comma(dd.state.params)+' + '+U.comma(dd.state.opt_state)+')'],
      ['Root unit gathered, and kept','all-gather · '+U.comma(agRoot)+' B in per rank'],['Block 0 gathered for its forward, then freed','all-gather · '+U.comma(agBlk)+' B in per rank'],
      ['Blocks 1 to 3, one at a time','each all-gather '+U.comma(agBlk)+' B in · at most one block whole'],['Backward: gather block 3 again, reduce-scatter its gradient',U.comma(rsBlk)+' B per block (gloo: an all-reduce)'],
      ['Every rank ends with its gradient quarter','root\'s reduction '+U.comma(rsRoot)+' B last · '+nAG+' + '+nRS+' = '+(nAG+nRS)+' collectives']][k];
    R.label([0,TOP+.75,0],R.W<520?T[0].split(/[:,]/)[0]:T[0],{fs:14.5,b:1,c:k>=4?P.c2:P.ink,dy:-40});R.label([0,TOP+.75,0],R.W<520?T[1].split(' (')[0].split(' · ')[0]:T[1],{fs:12.5,mono:true,c:P.ink,dy:-20});
    R.label([0,TOP+.75,0],'all-gathers so far '+CNT[k][0]+' · reductions '+CNT[k][1],{fs:12,mono:true,c:P.mute,dy:-2,wide:1})}
  // bounds three times the view's: they set the camera's distance, so the outer ranks show less of their sides
  S3.stage({id:'stg-fsdp',list:'sx-fsdp',fig:'Fig. 3 · one FSDP2 step on 4 ranks',cam:[.06,.5],bounds:[[-10.2,0,-2.25],[10.2,5.55,2.25]],view:()=>({bounds:[[-3.4,0,-.75],[3.4,2.35,.75]]}),aspect:.5,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[16,16,18,16]});
})();
