// ---- Scene, Fig. 4 (section 4): a cgroup v2 tree, the no-internal-processes rule, and limits pushing back (renderer v2) ----
// Data: the delegation session (cgroup.txt: 4 processes, EBUSY, then '+memory +pids +io +cpu' accepted), section 0's /ctr
// (minictr.txt: pids.max 16, pids.current 15 when the fork failed, memory.max 64 MiB, a 100 MB allocation killed) and the io.max run (window.CT_DATA.io).
// Three separate measured runs drawn on one tree; the step text says which run each number comes from.
(function(){
  if(!document.getElementById('stg-cg')||!window.CT_DATA)return;const {at,off,lerp,lerp3,mix,cl}=S3,D=window.CT_DATA;
  const io=D.io,ROOT=[0,0,-1.7],INIT=[-2.4,0,1.3],CTR=[2.4,0,1.3],PH=.22;
  // the four processes of the delegation session: on the root, then moved into the leaf init/
  const PR=[[-.9,-.3],[-.3,-.3],[.3,-.3],[.9,-.3]];
  function plat(R,c,w,d,col,a,o){R.box(c,[w,PH,d],Object.assign({fill:mix(R.P.paper,col,.22),a},o||{}))}
  function draw(R,k,e){const P=R.P;R.grid(-5.5,6,-3.2,3.2,.5);
    const cf=k>=3?.35:1; // the root and init recede once the limited child is the subject
    // the tree: the root, its children, and the edges between them
    plat(R,ROOT,3.6,1.5,P.c6,cf);R.label([ROOT[0],PH,ROOT[2]-.75],'/ (the container\'s cgroup)',{fs:12.5,b:1,dy:-12,c:P.c6,a:k>=3?0:1});
    const ia=k<2?0:k===2?e:cf;plat(R,INIT,2.6,1.4,P.c6,ia);R.label([INIT[0],0,INIT[2]+.7],'init/ (a leaf)',{fs:12.5,b:1,dy:14,c:P.c6,a:k>=3?0:ia});
    R.line([[ROOT[0]-.6,.05,ROOT[2]+.75],[INIT[0],.05,INIT[2]-.7]],{c:P.c6,w:2,a:ia});
    const ca=k<3?0:k===3?e:1;plat(R,CTR,2.6,1.6,P.c6,ca,{ec:k>=3?P.c6:undefined});R.label([CTR[0],0,CTR[2]+.8],'ctr/ (limited)',{fs:12.5,b:1,dy:14,c:P.c6,a:ca});
    R.line([[ROOT[0]+.6,.05,ROOT[2]+.75],[CTR[0],.05,CTR[2]-.8]],{c:P.c6,w:2,a:ca});
    // processes: on the root until step 3 moves them into init/
    const mv=k<2?0:k===2?cl(e*1.4,0,1):1;
    PR.forEach(([x,z],i)=>{const p=lerp3([ROOT[0]+x,PH,ROOT[2]+z],[INIT[0]+x*.9,PH,INIT[2]+z*.3],mv);p[1]+=Math.sin(Math.PI*mv)*.6;
      R.box(p,[.38,.45,.38],{fill:mix(P.paper,P.c1,.45),a:k>=3?.4:1,shadow:false})});
    if(k<2)R.label([ROOT[0]+1.5,PH+.45,ROOT[2]-.3],'4 processes',{al:'left',dx:6,fs:12.5,c:P.c1,b:1});
    // the controllers enabled for children: one tile per controller on each child
    const tiles=[['memory',P.c2],['pids',P.c4],['io',P.c3],['cpu',P.c1]];
    if(k>=2)[[INIT,ia],[CTR,ca]].forEach(([c,a])=>tiles.forEach(([t,col],j)=>{const ta=a*(k===2?cl(e*2-j*.25,0,1):1);
      R.box([c[0]-.9+j*.6,PH,c[2]+.58],[.42,.04,.18],{fill:mix(P.paper,col,.6),a:ta,shadow:false});if(c===INIT&&k===2)R.label([c[0]-.9+j*.6,PH+.04,c[2]+.58],t,{fs:12,mono:true,dy:-9,c:col,a:ta,wide:1})}));
    // the writes to the root's cgroup.subtree_control
    const W=[ROOT[0],2.2,ROOT[2]];
    if(k===1){R.flow([W,[ROOT[0],PH+.05,ROOT[2]]],{c:P.bad,a:e,r:.07,n:6,speed:1});R.glow([ROOT[0],PH,ROOT[2]],.6,{c:P.bad,a:e});
      R.label(W,'+memory: write error, EBUSY',{fs:12.5,b:1,c:P.bad,dy:-8,a:e})}
    if(k===2){R.flow([W,[ROOT[0],PH+.05,ROOT[2]]],{c:P.good,a:e,r:.07,n:6,speed:1});R.label(W,'+memory +pids +io +cpu: accepted',{fs:12.5,b:1,c:P.good,dy:-8,a:e})}
    // pids.max 16: sixteen slots on ctr/, fifteen tasks, and the fork that did not fit
    if(k>=3){const pa=k===3?1:k===4?.35:.2;for(let i=0;i<16;i++){const x=CTR[0]-.9+(i%8)*.26,z=CTR[2]-.55+Math.floor(i/8)*.32,fill=i<15&&(k>3||e*16>i);
        R.box([x,PH,z],[.18,.22,.2],fill?{fill:mix(P.paper,P.c4,.55),a:pa,shadow:false,lw:.6}:{fill:P.paper,fa:.15,a:pa*.8,shadow:false,lw:.6})}
      if(k===3){const t=cl(e*1.6-.6,0,1),p=[CTR[0]+1.4,PH+.2+1.1*Math.sin(Math.PI*t),CTR[2]-.3];R.box(p,[.2,.24,.22],{fill:mix(P.paper,P.bad,.4),a:t>0?1:0,shadow:false,ec:P.bad});
        R.label([CTR[0]+1.4,PH+.6,CTR[2]-.3],'fork: EAGAIN · pids.events max 1',{al:'left',dx:14,fs:12.5,b:1,c:P.bad,a:t});
        R.label([CTR[0],0,CTR[2]+.8],'pids.max 16 · 15 tasks',{fs:12.5,b:1,c:P.c4,dy:34,a:e})}}
    // memory.max 64 MiB as a glass ceiling; the 100 MB allocation rises into it and is killed
    if(k>=4){const YC=PH+1.6,ma=k===4?e:.35;R.glass([CTR[0]-1.25,YC,CTR[2]-.75],[2.5,0,0],[0,0,1.5],{c:P.c2,a:ma,nu:5,nv:3});
      R.label([CTR[0]+1.25,YC,CTR[2]-.75],'memory.max 64 MiB',{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a:ma});
      if(k===4){const ask=1.6*(100e6/1048576)/64,u=cl(e*1.5,0,1),top=Math.min(lerp(0,ask,u),1.6),kill=u*ask>=1.6;
        R.box([CTR[0]+.6,PH,CTR[2]],[.42,Math.max(.01,top),.42],{fill:mix(P.paper,kill?P.bad:P.c2,.45),shadow:false,a:kill?1-cl((e-.75)*4,0,.7):1});
        R.box([CTR[0]+.6,PH,CTR[2]],[.42,ask,.42],{fill:P.paper,fa:.05,a:.6,shadow:false,lw:.6});R.label([CTR[0]+.6,PH+ask,CTR[2]],'100 MB asked',{fs:12,dy:-9,c:P.mute});
        R.flow([[CTR[0]-.6,PH+.3,CTR[2]],[CTR[0]+.6,PH+top,CTR[2]]],{c:P.c2,a:e,r:.06,n:5});
        if(kill){R.glow([CTR[0]+.6,YC,CTR[2]],.55,{c:P.bad,a:.9});R.label([CTR[0]+.6,YC,CTR[2]],'OOM kill · exit 137 · the shell survives',{al:'right',dx:-16,fs:12.5,b:1,c:P.bad,dy:-10})}}}
    // io.max: the same 64 MiB read, unlimited and then capped at 20 MB/s
    if(k===5){const DK=[5.3,0,1.3];R.box(DK,[.8,.55,.8],{fill:mix(P.paper,P.ink,.12)});R.label([DK[0],.55,DK[2]],'disk 254:0',{fs:12,mono:true,dy:-10});
      R.flow([[DK[0]-.4,.4,DK[2]-.25],[CTR[0]+1.3,.4,CTR[2]-.25]],{c:P.mute,a:.35,r:.05,n:14,speed:2.4});
      R.flow([[DK[0]-.4,.3,DK[2]+.25],[CTR[0]+1.3,.3,CTR[2]+.25]],{c:P.c3,a:e,r:.07,n:3,speed:.25});
      R.label([DK[0]-1.3,.4,DK[2]-.6],'unlimited: '+io[0].s.toFixed(3)+' s ('+io[0].rate+')',{fs:12.5,c:P.mute,dy:-12,wide:1});
      R.label([DK[0]-1.3,.3,DK[2]+.6],'io.max 20 MB/s: '+io[1].s.toFixed(2)+' s ('+io[1].rate+')',{fs:12.5,b:1,c:P.c3,dy:14,a:e})}
  }
  const full={cam:[.2,.6],bounds:[[-4,0,-2.6],[4,1.6,2.4]]};
  S3.stage({id:'stg-cg',list:'sx-cg',fig:'Fig. 4 · one tree, limits pushing back',cam:full.cam,bounds:full.bounds,aspect:.68,dur:1500,hold:4800,draw,
    // the last three steps are about the limited child: the camera moves in on it
    view:k=>k===3||k===4?{cam:[.3,.6],bounds:[[-3.8,0,-2.5],[5.4,2.1,2.4]]}:k===5?{cam:[.25,.5],bounds:[[.8,0,.2],[6,1.4,2.3]]}:full,
    margin:w=>w<520?[16,8,16,8]:[18,16,18,16]});
})();
