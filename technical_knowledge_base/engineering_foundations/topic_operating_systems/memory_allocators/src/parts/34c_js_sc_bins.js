// ---- Scene, Fig. 3 (section 3): where glibc 2.36's malloc(n) looks for a free chunk, cheapest first, as a staircase down to the kernel (renderer v2) ----
// Levels and their limits are the source's (malloc.c, the bins table in the closed block): tcache 7 per size up to 1,032 B, fastbins up to 128 B,
// small bins below 1,024 B, the unsorted bin, large bins, the top chunk, then sysmalloc. How many chunks each level holds is illustrative.
(function(){
  if(!document.getElementById('stg-bins'))return;const {cl,lerp,mix}=S3;
  const N=7,LX=i=>-6+i*2,LY=i=>(N-1-i)*.5,names=['tcache','fastbin','small bin','unsorted bin','large bin','top chunk','kernel'];
  const PROG=[-7.4,4,0];
  // chunk layouts per level: [dx, dz, width, stack height] (illustrative counts)
  const tc=[[-.6,7],[-.2,3],[.2,5],[.6,2]];
  const rows={1:[[3,.22],[2,.26],[4,.3]],2:[[3,.34],[2,.4],[3,.46]],3:[[5,0]],4:[[2,.62],[3,.5]]};
  const mixW=[.3,.6,.22,.5,.36];
  function draw(R,k,e){const P=R.P;R.grid(-8,8,-2,2,.5);
    // the program at the top left
    if(k<=1){R.box(PROG,[.9,.4,.8],{fill:P.paper,shadow:false});R.label([PROG[0],PROG[1]+.4,0],'malloc(n)',{dy:-10,mono:1,fs:12.5,b:1})}
    for(let i=0;i<N;i++){const x=LX(i),y=LY(i),on=i===k,a=on?1:(i<k?.32:.22),la=on?1:0;
      if(i<N-1)R.glass([x-.85,y,-.85],[1.7,0,0],[0,0,1.7],{c:on?P.c2:P.c1,nu:4,nv:4,a:a*.8,th:.03});
      else R.quad([[x-1.1,0,-1.1],[x+1.3,0,-1.1],[x+1.3,0,1.1],[x-1.1,0,1.1]],{fill:mix(P.paper,P.c5,.15),a:Math.max(a,.5),dz:200});
      // a thin post down to the floor, so each level reads as standing at its height
      if(i<N-1)R.box([x+.85,0,-.85],[.03,y,.03],{a:a*.7,shadow:false});
      if(Math.abs(i-k)<=1)R.label([x,y,.85],names[i],{dy:14,fs:12.5,b:1,c:on?P.c2:P.mute,a:on?1:.75});
      const ch=(cx,cz,w,yy,h,o)=>R.box([x+cx,yy,cz],[w,h||.1,.26],Object.assign({fill:mix(P.paper,P.c2,.55),a,shadow:false,lw:.6},o||{}));
      if(i===0)tc.forEach(([dz,n],j)=>{const show=k===1&&j===2?7:n;for(let m=0;m<show;m++)ch(-.2+j*.05,dz,.3,y+m*.11,.1);
        if(on)R.label([x+.35,y+n*.11,dz],String([32,48,64,80][j]),{al:'left',dx:6,mono:1,fs:12,c:P.mute,wide:1})});
      if(rows[i])rows[i].forEach(([n,w],r)=>{for(let m=0;m<n;m++){const ww=i===3?mixW[m]:w;ch(-.6+m*(i===3?.3:w+.06)+ww/2-.1,-.55+r*.55,ww*(i===3?.85:1),y)}});
      if(i===5)ch(0,0,1.5,y,.18,{fill:mix(P.paper,P.c2,.4)});
    }
    // the request walks down the staircase: at step k it arrives at level k from the level above
    const tgt=[LX(k),LY(k)+(k===N-1?.1:.35),0],src=k===0?[PROG[0]+.4,PROG[1],0]:[LX(k-1),LY(k-1)+.35,0];
    R.flowArc(src,tgt,.45,{c:P.c2,r:.07,n:8,a:Math.min(1,e*1.6)});
    if(k===0){R.flowArc([LX(0)-.2,LY(0)+.8,.2],[PROG[0]+.3,PROG[1],0],.4,{c:P.c1,r:.06,n:6,a:e});R.label([LX(0)+.9,LY(0)+1.1,0],'push on free, pop on malloc: no lock',{al:'left',fs:12.5,b:1,c:P.c2,a:e,wide:1})}
    if(k===1)R.label([LX(1)+.9,LY(1)+1.1,0],'that size\'s tcache list holds 7',{al:'left',fs:12.5,b:1,c:P.c2,a:e,wide:1});
    if(k===3)R.flowArc([LX(3)+.3,LY(3)+.2,-.2],[LX(2),LY(2)+.2,-.3],.35,{c:P.c2,r:.05,n:5,a:e*.8});
    if(k===6){R.flowArc([LX(6),.05,0],[LX(5)+.6,LY(5)+.2,0],.6,{c:P.c5,r:.08,n:8,a:Math.min(1,e*1.6),top:1});R.label([LX(6),0,1.1],'brk grows the heap · mmap at or above the threshold',{dy:32,fs:12.5,b:1,c:P.c5,a:e,wide:1})}
  }
  const full={cam:[.22,.52],bounds:[[-8,0,-1.2],[6.4,3.8,1.2]]};
  S3.stage({id:'stg-bins',list:'sx-bins',fig:'Fig. 3 · malloc(n), cheapest place first',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4600,draw,
    view:k=>({cam:[.22,.52],bounds:[[LX(k)-3.2,0,-1.2],[LX(k)+2.6,Math.max(LY(k)+1.6,1.8),1.2]]}),
    margin:w=>w<520?[14,8,24,8]:[18,14,24,14]});
})();
