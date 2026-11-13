// ---- Scene, Fig. 1 (the idea): one launch unpacked, scale<<<4096, 256>>>, as four plates from left to right: the grid (blocks 0 to 31 of 4,096),
// block 9 (8 warps), warp 1 (32 lanes), and lane 5 = thread 37, whose element is i = 9 x 256 + 37 = 2,341. Every number is the running example's
// launch (section 1); the counts are computed below and checked by check/check_stages.mjs. Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,mix}=S3;
  const GRID=4096,BLOCK=256,WS=32,BI=9,TI=37,WI=Math.floor(TI/WS),LANE=TI%WS,I=BI*BLOCK+TI;
  window.PM_HERO={grid:GRID,block:BLOCK,warps:BLOCK/WS,warp:WI,lane:LANE,i:I,threads:GRID*BLOCK};
  // plate centres along x; each plate lies on the floor and holds its level's parts
  const XG=-4.6,XB=-1.45,XW=1.65,XT=4.55,PZ=1.7;
  const gcell=.34,gpos=k=>[XG+((k%8)-3.5)*gcell,0,((Math.floor(k/8))-1.5)*gcell];       // blocks 0 to 31, 8 per row
  const bpos=w=>[XB,0,(w-3.5)*.2];                                                   // warps 0 to 7 as rows
  const wcell=.3,wpos=l=>[XW+((l%8)-3.5)*wcell,0,((Math.floor(l/8))-1.5)*wcell];      // lanes 0 to 31, 8 per row
  const MEM=[I-3,I-2,I-1,I,I+1,I+2,I+3],mpos=j=>[XT-.95+j*.32,0,.55];
  function plate(R,x,w,d,c,a){R.glass([x-w/2,.005,-d/2],[w,0,0],[0,0,d],{c,a:a*.85,nu:8,nv:4,th:.03})}
  function draw(R,k,e){const P=R.P,H=P.acc,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-6.6,6.4,-2.4,2.4,.5);
    // what each step is about stays at full strength; the others recede
    const fG=k===0||k===4?1:k===1?1-.6*e:.4,fB=k===1?e:k===2?1-.6*e:k===4?1:k>2?.4:0,fW=k===2?e:k===3?1-.6*e:k===4?1:k>3?.4:0,fT=k===3?e:k===4?1:0;
    // 1. the grid: blocks 0 to 31 of 4,096 drawn; block 9 lit
    plate(R,XG,8*gcell+.3,4*gcell+.3,P.c1,fG);
    for(let b=0;b<32;b++){const hi=b===BI&&k>=1;R.box(gpos(b),[.26,hi?.32:.2,.26],{fill:hi?mix(P.paper,H,.7):mix(P.paper,P.c1,.3),a:Math.max(fG,hi?.9:0),shadow:false,lw:.6})}
    lab([XG,0,-PZ+.3],'grid · 4,096 blocks',{b:1,dy:-14,a:Math.max(.5,fG)});
    if(k===0)lab([XG,0,PZ-.3],'blocks 0 to 31 drawn',{dy:14,c:P.mute,fs:12,wide:1,a:k===0?e:1});
    // 2. block 9: 256 threads in 8 warps of 32 (linear ids 32w to 32w + 31); warp 1 lit
    if(fB>0){plate(R,XB,2.5,1.95,P.c6,fB);
      for(let w=0;w<8;w++){const hi=w===WI&&k>=2,c=bpos(w);R.box(c,[2.1,hi?.22:.14,.13],{fill:hi?mix(P.paper,H,.7):mix(P.paper,P.c6,.3),a:Math.max(fB,hi?.9:0),shadow:false,lw:.6})}
      lab([XB,0,-PZ+.3],'block 9 · 256 threads',{b:1,dy:-14,a:Math.max(.5,fB)});
      if(k===1)lab([XB+1.05,.15,bpos(7)[2]],'8 warps of 32',{al:'left',dx:8,c:P.mute,fs:12,a:e,wide:1})}
    if(k===1)R.flowArc([gpos(BI)[0],.34,gpos(BI)[2]],[XB-.6,.2,0],.9,{c:H,a:e,r:.07,n:9,speed:1.4});
    // 3. warp 1: 32 lanes (threads 32 to 63 of the block); lane 5 lit
    if(fW>0){plate(R,XW,8*wcell+.3,4*wcell+.3,P.c4,fW);
      for(let l=0;l<32;l++){const hi=l===LANE&&k>=3;R.box(wpos(l),[.22,hi?.34:.2,.22],{fill:hi?mix(P.paper,H,.7):mix(P.paper,P.c4,.3),a:Math.max(fW,hi?.9:0),shadow:false,lw:.6})}
      lab([XW,0,-PZ+.3],'warp 1 · 32 lanes',{b:1,dy:-14,a:Math.max(.5,fW)});
      if(k===2)lab([XW,0,PZ-.3],'threads 32 to 63',{dy:14,c:P.mute,fs:12,a:e,wide:1})}
    if(k===2)R.flowArc([XB+.2,.25,bpos(WI)[2]],[XW-.9,.25,0],.8,{c:H,a:e,r:.07,n:9,speed:1.4});
    // 4. lane 5 is thread 37 of block 9: its element is i = 9 x 256 + 37 = 2,341
    if(fT>0){R.box([XT,0,-.45],[.5,.5,.5],{fill:mix(P.paper,H,.6),a:fT});
      lab([XT,.5,-.45],'thread 37',{b:1,dy:-14,c:H,a:fT});
      MEM.forEach((m,j)=>{const hi=m===I;R.box(mpos(j),[.27,hi?.2:.08,.27],{fill:hi?mix(P.paper,H,.7):P.paper,a:fT*(hi?1:.7),shadow:false,lw:.6})});
      lab([XT,0,.55],'x[i], i = 9 × 256 + 37 = 2,341',{dy:22,fs:12.5,b:1,c:H,a:fT,wide:k===4?1:0})}
    if(k===3){R.flowArc([wpos(LANE)[0],.35,wpos(LANE)[2]],[XT-.25,.3,-.45],.8,{c:H,a:e,r:.07,n:9,speed:1.4});
      R.flowArc([XT,.52,-.45],[XT,.22,.55],.35,{c:H,a:e,r:.06,n:5,speed:1})}
    // 5. how each level cooperates and where it runs
    if(k===4){const t=[[XG,'atomics, or end the kernel','runs over all SMs, in waves'],[XB,'shared memory + __syncthreads()','runs on one SM, never split'],
        [XW,'shuffles, votes, __syncwarp()','one instruction for 32 lanes'],[XT,'only its own registers','runs as one lane']];
      t.forEach(([x,a1,a2],j)=>{const d=j%2?62:0;lab([x,0,PZ+.05],a1,{dy:12+d,fs:12,c:P.ink,a:e,wide:1});lab([x,0,PZ+.05],a2,{dy:28+d,fs:12,c:P.mute,a:e,wide:1})})}
  }
  const phone=()=>document.getElementById('stg-hero').clientWidth<520;   // on a phone the full view turns the row into depth, so the four levels draw larger
  const full={cam:[.18,.72],bounds:[[-6.4,0,-1.9],[6.0,.6,2.3]]};
  const close=(x0,x1)=>({cam:[.2,.68],bounds:[[x0,0,-1.9],[x1,.6,2.0]]});
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one launch, unpacked',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,96,16],
    view:k=>k===0?close(-6.4,-2.6):k===1?close(-6.2,.1):k===2?close(-2.9,3.4):k===3?close(.1,6.0):phone()?{cam:[.75,.9],bounds:full.bounds}:full});
  (window.PMSTG=window.PMSTG||{})['stg-hero']=st;
})();
