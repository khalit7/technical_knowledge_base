// ---- Scene, Fig. 5 (section 5): read() copies, mmap maps the page cache itself into two processes (renderer v2) ----
// Eight pages stand for the file. The numbers on the last step are the page's cold random-row run (VM_DATA.rows: read_mib for 20,000 rows of 1,028 bytes).
(function(){
  if(!document.getElementById('stg-mmap')||!window.VM_DATA)return;const {at,off,lerp,mix}=S3,D=VM_DATA;
  const N=8,useful=20000*1028/1048576,RW=D.rows;
  const XA=-3.3,XB=3.3,ZP=-1.7,ZC=.15,ZF=1.9,px=i=>(i-(N-1)/2)*.62,W3=3,RA=[1,2,3,4,5,6];
  const amp=k=>(RW[k].read_mib/useful).toFixed(1);
  function plate(R,x,lab,a,c){const P=R.P;R.glass([x-.8,.1,ZP],[1.6,0,0],[0,1.3,0],{c:P.c5,nu:2,nv:8,a});
    R.box([x,0,ZP-.55],[1.0,.5,.5],{fill:mix(P.paper,c,.35),a});R.label([x,1.4,ZP],lab,{fs:12.5,b:1,dy:-10,a:Math.max(.4,a)})}
  const ey=i=>.15+(i+.5)*1.2/N; // entry i's height on a process's page-table plate
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5,5,-2.6,2.8,.5);
    // the file on disk
    for(let i=0;i<N;i++)R.box([px(i),0,ZF],[.56,.18,.55],{fill:mix(P.paper,P.mute,k===5&&RA.includes(i)?.55:.25),a:k===0||k===5?1:.45});
    R.label([px(N-1)+.35,.16,ZF],'train.bin on disk',{al:'left',dx:6,fs:12.5,b:1,a:k===0||k===5?1:.5});
    // the page cache: filled by the first read; cold again on the last step, where only what the fault reads comes back
    const cold=k===5;for(let i=0;i<N;i++){const here=cold?(RA.includes(i)?e:0):k===0?at(k,e,0)*(e*N>i?1:0):1;
      const hl=(k===2||k===3)?1:k===4&&i===W3?.6:.85;if(here>0)R.box([px(i),0,ZC],[.5,.5,.5],{fill:mix(P.paper,P.c1,.55),a:here*hl});
      if(cold&&here<=0)R.box([px(i),0,ZC],[.5,.5,.5],{fill:P.paper,a:.18})}
    R.label([px(0)-.35,.5,ZC],'page cache (RAM)',{al:'right',dx:-6,fs:12.5,b:1,c:P.c1,wide:1});
    if(k===0)R.flow([[px(2),.16,ZF-.25],[px(2),.2,ZC+.25]],{c:P.c1,a:e,r:.07,n:6});
    // process A, its read() buffer, and its mapping
    const aA=k<=3?1:.5;plate(R,XA,'process A',aA,P.c3);
    const bufA=k===1?e:k===2?1-e:0;if(bufA>0){for(let i=0;i<4;i++)R.box([-4.55+(i%2)*.5,0,-.75+Math.floor(i/2)*.5],[.44,.44,.44],{fill:mix(P.paper,P.c3,.55),a:bufA});
      R.label([-4.35,.4,-.5],'read() buffer: a copy',{fs:12.5,b:1,dy:-12,c:P.c3,a:bufA});
      if(k===1)R.flowArc([px(1),.4,ZC],[-4.35,.4,-.55],.7,{c:P.c3,a:e,r:.07})}
    const mapA=k===2?e:k>=3?1:0;if(mapA>0)for(let i=0;i<N;i++){R.line([[XA+.4,ey(i),ZP+.03],[px(i),.4,ZC-.2]],{c:P.c1,w:1,a:mapA*(k>=4?.3:.55)});
      if(k===2&&i===3)R.flow([[XA+.4,ey(i),ZP+.03],[px(i),.4,ZC-.2]],{c:P.c1,a:e,r:.06,n:5})}
    if(k===2)R.label([-1.2,1.25,(ZP+ZC)/2],'no copy: entries point at the cache',{fs:12.5,b:1,c:P.c1,a:e,wide:1});
    // process B maps the same file
    const aB=k>=3?(k===3?e:1):.25;plate(R,XB,'process B',aB,P.c3);
    if(k>=3)for(let i=0;i<N;i++){if(k>=4&&i===W3)continue;R.line([[XB-.4,ey(i),ZP+.03],[px(i),.4,ZC-.2]],{c:P.c1,w:1,a:(k===3?e:1)*(k===5?.3:.55)})}
    if(k===3)R.label([0,1.0,ZC],'one copy in RAM, shared',{fs:12.5,b:1,c:P.c1,a:e});
    // B writes page 3 of a private mapping: one page copied
    if(k>=4){const cp=[XB+.2,0,-.4],ca=k===4?e:1;R.box(cp,[.4,.4,.4],{fill:mix(P.paper,P.c2,.6),a:ca*(k===5?.5:1)});R.line([[XB-.4,ey(W3),ZP+.03],[cp[0],.4,cp[2]]],{c:P.c2,w:1.6,a:ca*(k===5?.4:1)});
      if(k===4){R.flowArc([px(W3),.4,ZC],[cp[0],.4,cp[2]],.6,{c:P.c2,a:e,r:.07});R.label(cp,'MAP_PRIVATE write: B\'s own copy',{fs:12.5,b:1,dy:-34,c:P.c2,a:e,al:'right'})}}
    // a cold fault reads around the page it needs
    if(k===5){R.flow([[px(3),.16,ZF-.25],[px(3),.2,ZC+.25]],{c:P.c1,a:e,r:.07,n:6});RA.forEach(i=>{if(i!==3)R.flow([[px(i),.16,ZF-.25],[px(i),.2,ZC+.25]],{c:P.c1,a:e*.6,r:.05,n:4})});
      R.label([0,0,ZF+.3],nar?'read-around':'one fault, neighbours read too (read_ahead_kb)',{fs:12.5,b:1,dy:16,c:P.c1,a:e});
      R.label([0,0,ZF+.3],'cold rows: mmap read '+amp('mmap_cold')+'x the useful bytes, MADV_RANDOM '+amp('mmap_random_cold')+'x',{fs:12.5,b:1,dy:36,c:P.ink,a:e,wide:1})}
  }
  const full={cam:[.1,.6],bounds:[[-4.9,0,-2.3],[4.9,1.5,2.5]]};
  S3.stage({id:'stg-mmap',list:'sx-mmap',fig:'Fig. 5 · read() copies, mmap shares the cache',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    view:k=>k===1?{cam:[.2,.6],bounds:[[-5,0,-2.3],[2.4,1.5,2.4]]}:full,
    margin:w=>w<520?[22,8,22,8]:[28,14,24,14]});
})();
