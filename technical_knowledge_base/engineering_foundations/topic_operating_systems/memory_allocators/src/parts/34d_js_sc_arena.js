// ---- Scene, Fig. 4 (section 4): src/exp/arenas.c's eight producers and one consumer against one arena or ten (renderer v2) ----
// Thread and arena counts are the run's (glibc used 10 arenas, counted from malloc_stats(); window.AK['arenas.n']); the peak RSS and seconds in the
// labels are the page's measured medians (AK). Each thread arena reserves a 64 MiB heap (HEAP_MAX_SIZE, arena.c line 31); how full each one is drawn is illustrative.
(function(){
  if(!document.getElementById('stg-arena')||!window.AK)return;const {cl,lerp,mix}=S3,K=window.AK;
  const TZ=-1.5,AZ=1.2,TX=i=>-4.4+i*1.1;            // threads 0..7 producers, 8 the consumer
  const ARX=i=>i<0?5.5:TX(i);                         // arena of thread i; -1 is the main arena (drawn on the right)
  const fill=[.55,.35,.6,.45,.5,.3,.62,.4];           // illustrative committed share of each producer arena
  const free=[.3,.45,.25,.35,.4,.5,.2,.38];           // illustrative free share at step 5
  function arena(R,x,a,o){const P=R.P;o=o||{};
    R.box([x,0,AZ],[.86,.05,.86],{fill:P.paper,a});
    R.box([x,.05,AZ],[.8,.8,.8],{fill:P.paper,fa:.08,ea:.35,a,shadow:false,dz:-30});      // the 64 MiB reservation, see-through
    if(o.c>0)R.box([x,.05,AZ],[.74,.8*o.c,.74],{fill:mix(P.paper,o.col||P.c1,.45),a,shadow:false});
    if(o.f>0)R.box([x,.05+.8*o.c,AZ],[.74,.8*o.f,.74],{fill:mix(P.paper,P.c2,.6),a,shadow:false,fa:.9})}
  function draw(R,k,e){const P=R.P;R.grid(-6.6,5.6,-2.2,2.2,.5);
    // threads on the back row
    for(let i=0;i<9;i++){const c=i<8?P.c1:P.c3;R.box([TX(i),0,TZ],[.5,.5,.42],{fill:mix(P.paper,c,.5)});
      R.label([TX(i),.5,TZ],i<8?'P'+i:'C',{dy:-10,fs:12.5,b:1,c})}
    R.label([TX(0)-.4,0,TZ],'threads',{al:'right',dx:-6,fs:12.5,c:P.mute,grp:'side'});
    R.label([TX(0)-.5,0,AZ],'arenas',{al:'right',dx:-6,fs:12.5,c:P.mute,grp:'side'});
    if(k===0){// one heap, one lock: every thread streams into the main arena
      const a=1;arena(R,0,a,{c:.7,col:P.c6});R.label([0,1,AZ],'main arena: one lock',{dy:-12,fs:12.5,b:1,c:P.c6});
      for(let i=0;i<9;i++)R.flowArc([TX(i),.5,TZ],[0,.9,AZ],.4,{c:i<8?P.c1:P.c3,a:e,r:.05,n:5,speed:.6});
      R.label([0,0,2.1],'MALLOC_ARENA_MAX=1 · peak '+K['arenas.am1.peak']+' MiB · '+K['arenas.am1.sec']+' s',{fs:12.5,b:1,c:P.ink,a:e,wide:1});return}
    const t=k===1?cl(e*1.5,0,1):1;
    arena(R,ARX(-1),t,{c:.15,col:P.c6});R.label([ARX(-1),1,AZ],'main',{dy:-10,fs:12,c:P.c6,a:t});
    for(let i=0;i<9;i++){const c=i<8?P.c1:P.c3;arena(R,ARX(i),t,{c:i<8?fill[i]:.12,col:c,f:k===4&&i<8?free[i]*cl(e*1.5,0,1):k>4&&i<8?free[i]:0})}
    if(k===1){for(let i=0;i<9;i++)R.flow([[TX(i),.4,TZ+.2],[ARX(i),.9,AZ-.2]],{c:i<8?P.c1:P.c3,a:t,r:.05,n:4,speed:.8});
      R.label([0,0,2.1],K['arenas.n']+' arenas: main, eight producers, the consumer · 64 MiB reserved each',{fs:12.5,b:1,c:P.ink,a:e,wide:1})}
    if(k===2){for(let i=0;i<8;i++)R.flowArc([TX(i),.5,TZ],[TX(8),.5,TZ],.35+.06*(8-i),{c:P.c1,a:Math.min(1,e*1.6),r:.05,n:6,speed:1.4});
      R.label([0,0,2.1],'buffers handed to the consumer, at most 4,096 in flight',{fs:12.5,b:1,c:P.c1,a:e,wide:1})}
    if(k===3){for(let i=0;i<8;i++)R.flowArc([TX(8),.5,TZ],[ARX(i),.95,AZ],.5+.04*(8-i),{c:P.c3,a:Math.min(1,e*1.6),r:.05,n:6,speed:1.4});
      R.label([0,0,2.1],'free(): each chunk back to the arena it came from',{fs:12.5,b:1,c:P.c3,a:e,wide:1})}
    if(k===4)R.label([0,0,2.1],'free in one arena cannot serve another · peak '+K['arenas.g.peak']+' MiB · '+K['arenas.g.sec']+' s',{fs:12.5,b:1,c:P.c2,a:e,wide:1});
  }
  const full={cam:[.1,.78],bounds:[[-5.4,0,-1.9],[6,1.2,2.2]]};
  S3.stage({id:'stg-arena',list:'sx-arena',fig:'Fig. 4 · 8 producers, 1 consumer, glibc arenas',cam:full.cam,bounds:full.bounds,aspect:.4,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,8,28,8]:[18,14,30,70]});
})();
