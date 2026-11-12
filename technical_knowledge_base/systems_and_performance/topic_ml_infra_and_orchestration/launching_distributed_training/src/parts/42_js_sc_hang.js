// ---- Scene, Fig. 3 (section 8): one rank stuck in its data loader while the other three wait in the all-reduce, measured (renderer v2) ----
// The stuck case of section 8 (4 ranks, gloo, process-group timeout 60 s): times from window.LD_SC.stuck (scripts/ld_scene_data.py, seconds
// since init_process_group), the flight recorder from LD.fr (entries per rank, the last one's sizes), the stacks from LD.hang.stuck_OFF.pyspy.
// Each tower is one rank's flight recorder, one slab per collective; positions are schematic.
(function(){
  if(!document.getElementById('stg-hang')||!window.LD||!window.LD_SC)return;const {at,off,lerp,mix}=S3;
  const S=window.LD_SC.stuck,FR=window.LD.fr.ranks,ODD=S.bug.rank,N=r=>FR[r].n,NMAX=Math.max(...[0,1,2,3].map(N));
  const st5=S.steps[0],errT=Math.min(...Object.values(S.errors)),wdT=Math.min(...Object.values(S.watchdog).map(x=>x[0]));
  const T={step1:st5[0][1],step5:st5[st5.length-1][1],bug:S.bug.t,pyspy:S.pyspy,pyspyL:S.pyspy_since_launch,wd:wdT,idle:Math.min(...Object.values(S.watchdog).map(x=>x[1])),err:errT,exit:S.exit,size:FR[0].last_sizes[0][0]};
  window.LD_HG=T;
  const X=r=>(r-1.5)*2.1,SH=.075,base=.32;
  const top=(r,n)=>base+n*SH;
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-5.5,5.5,-2.6,2.6,.5);
    const clock=[0,0,0,T.pyspy,T.wd,T.err][k]||0,ck=k===0?'t = '+T.step1.toFixed(2)+' to '+T.step5.toFixed(2)+' s':k===1?'t = '+T.bug.toFixed(2)+' s':k===2?'t = '+T.bug.toFixed(2)+' s, then silence':'t = '+clock.toFixed(1)+' s';
    lab([0,2.75,-1.2],ck,{b:1,fs:13,c:P.ink});
    for(let r=0;r<4;r++){const odd=r===ODD,x=X(r);
      // the rank: red once it is stuck, then the waiting ranks red when their timeout fires
      const red=odd&&k>=1?(k===1?e:1):(!odd&&k===5?e:0);
      R.box([x,0,0],[1.5,.3,1.2],{fill:mix(P.paper,P.bad,.55*red)});lab([x,0,.8],'rank '+r,{dy:16,b:1,c:red>.5?P.bad:P.ink});
      // its flight recorder: 15 entries for steps 1 to 5 on every rank, then the 16th on the three that reached the all-reduce
      const n15=Math.min(N(r),NMAX-1),grow=k===0?e:1;
      for(let i=0;i<n15;i++){if(i/n15>grow)break;R.box([x,top(r,i),0],[1.1,SH*.78,.8],{fill:mix(P.paper,P.c1,.35),shadow:false,lw:.6})}
      if(N(r)===NMAX&&k>=2){const a=k===2?e:1;R.box([x,top(r,NMAX-1),0],[1.1,SH*.78,.8],{fill:mix(P.paper,P.c5,.85),a,shadow:false})}
      if(odd&&k>=2){const a=k===2?e:1;R.box([x,top(r,NMAX-1),0],[1.1,SH*.78,.8],{fill:P.paper,fa:.08,a:a*.9,shadow:false})}
    }
    // 1. lockstep: every collective of steps 1 to 5 goes round all four ranks
    if(k===0)for(let r=0;r<4;r++)R.flowArc([X(r),top(r,15)+.05,0],[X((r+1)%4),top((r+1)%4,15)+.05,0],r===3?1.1:.4,{c:P.c1,a:e,r:.055,n:5,speed:1.5});
    // 2. the odd rank leaves for its data loader and never comes back
    if(k>=1&&k<=4)lab([X(ODD),0,.8],k===4?'stacks: Event.wait in next_batch':'next_batch: Event.wait',{dy:34,b:1,c:P.bad,a:k===1?e:1,wide:k===4?1:0});
    // 3. the other three issue collective 16 and wait for it: their data streams to the slot rank 1 never fills
    if(k>=2&&k<=4){const a=k===2?e:1;[0,1,2,3].filter(r=>r!==ODD).forEach(r=>R.flowArc([X(r),top(r,NMAX)+.05,0],[X(ODD),top(ODD,NMAX)+.05,0],.5+.12*Math.abs(r-ODD),{c:P.c5,a:a*.9,r:.06,n:6,speed:1.3}));
      if(k===2)lab([X(2),top(2,NMAX)+.5,0],'all-reduce '+NMAX+': '+T.size.toLocaleString('en-US')+' values',{b:1,c:P.c5,a:e,wide:1})}
    // 4. py-spy reads every stack from outside
    if(k===3)[0,1,2,3].filter(r=>r!==ODD).forEach(r=>lab([X(r),0,.8],'backward',{dy:34,b:1,c:P.c5,a:e}));
    // 5. the watchdog dumps the flight recorder: one rank is a collective behind
    if(k===4){for(let r=0;r<4;r++)lab([X(r),top(r,N(r)),0],String(N(r)),{dy:-12,b:1,fs:14,c:r===ODD?P.bad:P.c1,a:e});
      lab([X(ODD),top(ODD,NMAX)+.75,0],'missing ranks: {'+ODD+'}',{b:1,c:P.bad,a:e})}
    // 6. the 60 s timeout fires on the waiting ranks only; the stuck one says nothing until torchrun stops it
    if(k===5){[0,1,2,3].filter(r=>r!==ODD).forEach(r=>{R.glow([X(r),top(r,NMAX)+.2,0],.55,{c:P.bad,a:e*.8});lab([X(r),top(r,NMAX)+.2,0],'timed out',{dy:-16,b:1,c:P.bad,a:e})});
      lab([X(ODD),0,.8],'silent, then SIGTERM',{dy:34,b:1,c:P.bad,a:e})}
  }
  const full={cam:[.12,.8],bounds:[[-4.2,0,-1.8],[4.2,2.8,1.6]]};
  const st=S3.stage({id:'stg-hang',list:'sx-hang',fig:'Fig. 3 · one stuck rank, three waiting (measured)',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:5000,draw,
    view:k=>k===4?{cam:[.3,.55],bounds:[[-4,0,-1.2],[4,2.2,1.2]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
  (window.LDSTG=window.LDSTG||{})['stg-hang']=st;
})();
