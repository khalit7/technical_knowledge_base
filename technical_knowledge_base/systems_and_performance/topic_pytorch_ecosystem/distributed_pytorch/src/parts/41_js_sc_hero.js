// ---- Scene, Fig. 1 (2026-11-12, renderer v2): what each rank holds under DDP, FSDP2, tensor parallel and pipelining, and which collectives move.
// The running example drawn as 6 slabs (embeddings, blocks 0 to 3, output layer) on each rank's plinth. Which slabs and which fraction of each
// a rank holds is the layout as run (fsdpm_ddp4, fsdpm_fsdp4, tp_tp1, the 2-stage pipeline); the counts and bytes in the labels come from
// window.DPT (the recorded runs). Slab sizes are not to scale. Steps are #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.DPT)return;const {mix,lerp}=S3,D=window.DPT,U=window.DU;
  const ddp=D.mesh.ddp4.ranks[0],fs=D.mesh.fsdp4.ranks[0];
  const nAG=fs.coll.filter(c=>c[0]==='all_gather').reduce((s,c)=>s+c[4],0),nRS=fs.coll.filter(c=>c[0]!=='all_gather').reduce((s,c)=>s+c[4],0);
  const arB=ddp.coll.filter(c=>c[0]==='all_reduce').map(c=>U.comma(c[3]));
  const NAMES=['embeddings','block 0','block 1','block 2','block 3','output layer'];
  const TH=[.07,.16,.16,.16,.16,.07],GAP=.05,Y0=.17,SW=1.2,SD=.8;
  const YS=[];{let y=Y0;TH.forEach(h=>{YS.push(y);y+=h+GAP})}const TOP=YS[5]+TH[5];
  const X4=[-2.55,-.85,.85,2.55],X2=[-1.25,1.25],X1=[0];
  // fraction [a, z] of slab i that rank r holds under layout k (z <= a: holds none of it)
  const held=(k,r,i)=>k===2?[r/4,(r+1)/4]:k===3?(i===0||i===5?[0,1]:[r/2,(r+1)/2]):k===4?((r===0)===(i<=2)?[0,1]:[0,0]):[0,1];
  const XK=k=>k===0?X1:k===1||k===2?X4:X2;
  function slab(R,x,i,fr,col,al,whole){const P=R.P,y=YS[i],h=TH[i],[a,z]=whole?[0,1]:fr;
    const ghost=(u,v)=>{if(v-u>.001)R.box([x+SW*((u+v)/2-.5),y,0],[SW*(v-u),h,SD],{fill:P.paper,a:al*.22,fa:.3,shadow:false})};
    ghost(0,Math.max(0,a));ghost(Math.min(1,Math.max(a,z)),1);
    if(z>a)R.box([x+SW*((a+z)/2-.5),y,0],[SW*(z-a)-(z-a<1?.02:0),h,SD],{fill:mix(P.paper,col,whole&&!(fr[0]===0&&fr[1]===1)?.85:.55),a:al,shadow:false})}
  function scene(R,k,al,e){const P=R.P,X=XK(k),col=[mix(P.paper,P.ink,.25),P.c1,P.c3,P.c4,P.c5][k];
    X.forEach((x,r)=>{R.box([x,0,0],[1.45,.12,1.05],{fill:P.paper,a:al});R.label([x,0,.48],'rank '+r,{mono:true,fs:12,c:P.mute,dy:14,a:al});
      for(let i=0;i<6;i++)slab(R,x,i,held(k,r,i),col,al,k===2&&i===2)});
    if(k===0)NAMES.forEach((n,i)=>R.label([-SW/2-.15,YS[i]+TH[i]/2,0],n,{al:'right',dx:-8,fs:12.5,c:P.ink,a:al,grp:'ly'}));
    // what moves
    if(k===1){const zf=.72,xa=X4[0],xb=X4[3],pts=[];for(let i=0;i<=20;i++)pts.push([lerp(xa,xb,i/20),.05,zf]);
      for(let i=1;i<=14;i++){const t=i*Math.PI/14;pts.push([xb+.95*Math.sin(t),.05,zf*Math.cos(t)])}
      for(let i=1;i<=20;i++)pts.push([lerp(xb,xa,i/20),.05,-zf]);for(let i=1;i<=14;i++){const t=i*Math.PI/14;pts.push([xa-.95*Math.sin(t),.05,-zf*Math.cos(t)])}
      R.line(pts,{c:P.c1,w:1.6,a:al*.45});R.flow(pts,{c:P.c1,r:.07,n:26,speed:1.6,a:al})}
    if(k===2){const y=YS[2]+TH[2]+.02;R.glow([0,y,0],1.2,{c:P.c3,a:al*.25});
      X4.forEach((x,r)=>X4.forEach((x2,j)=>{if(j===r)return;const off=SW*((r+.5)/4-.5);R.flowArc([x+off,y,0],[x2+off,y,0],.28+.06*Math.abs(j-r),{c:P.c3,a:al*.9,r:.045,n:4,speed:1.3})}))}
    if(k===3)[1,2,3,4].forEach(i=>{const y=YS[i]+TH[i]/2;R.flowArc([X2[0]+SW/2,y,0],[X2[1]-SW/2,y,0],.12,{c:P.c4,a:al*.9,r:.045,n:4,speed:1.2});R.flowArc([X2[1]-SW/2,y-.03,0],[X2[0]+SW/2,y-.03,0],.08,{c:P.c4,a:al*.6,r:.04,n:3,speed:1.2})});
    if(k===4){const a0=[X2[0]+SW/2,YS[2]+TH[2]/2+.04,0],b0=[X2[1]-SW/2,YS[3]+TH[3]/2+.04,0];
      R.flowArc(a0,b0,.32,{c:P.c1,a:al,r:.06,n:7,speed:1.2});R.flowArc([b0[0],b0[1]-.1,0],[a0[0],a0[1]-.1,0],.1,{c:P.c2,a:al,r:.06,n:7,speed:1.2});
      R.label([0,YS[3]+.42,0],'activations',{fs:12.5,c:P.c1,a:al,b:1});R.label([0,YS[2]-.02,0],'gradients',{fs:12.5,c:P.c2,a:al,b:1,dy:14})}
    // the layout's name and what it costs, from the recordings
    const T=[['One process: the whole model','3,186,944 parameters · 12,747,776 B'],['DDP · 4 ranks, whole model each','2 all-reduces per step ('+arB.join(' and ')+' B)'],
      ['FSDP2 · 4 ranks, a quarter each',(nAG+nRS)+' collectives: '+nAG+' all-gathers, '+nRS+' reductions · '+U.comma(fs.state.params)+' B per rank'],
      ['Tensor parallel · 2 ranks, half of each matrix','16 all-reduces of 524,288 B per step'],['Pipeline · 2 stages, half the blocks each','send/recv once per micro-batch · idle 10 to 21%']][k];
    R.label([0,TOP+.3,0],R.W<520?T[0].split(/ ·|,/)[0]:T[0],{fs:14.5,b:1,c:k?col:P.ink,a:al,dy:-16});R.label([0,TOP+.3,0],R.W<520?T[1].split(' · ')[0].split(' (')[0]:T[1],{fs:12.5,mono:true,c:P.ink,a:al,dy:4})}
  function draw(R,k,e,st){R.grid(-3.6,3.6,-1.3,1.3,.5);
    if(st&&st.pk!==k&&e<1&&!S3.RM){if(e<.4)scene(R,st.pk,1-e/.4,e);else scene(R,k,(e-.4)/.6,e)}else scene(R,k,1,e)}
  const full={cam:[.06,.5],bounds:[[-3.55,0,-.8],[3.55,1.75,.8]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · what each rank holds',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[16,16,18,16],
    view:k=>k===0?{cam:[.3,.4],bounds:[[-1.9,0,-.6],[1.4,1.75,.6]]}:k>=3?{cam:[.06,.5],bounds:[[-2.4,0,-.75],[2.4,1.75,.75]]}:full});
})();
