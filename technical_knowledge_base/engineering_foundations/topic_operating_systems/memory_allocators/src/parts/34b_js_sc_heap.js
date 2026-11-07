// ---- Scene, Fig. 2 (section 1): the drill on a 100-byte heap, run by the page's port of OSTEP's malloc.py (window.FREELIST, 31_js_fl_core.js) ----
// Options as the lab's preset Q7 plus two more operations: -S 100 -H 0 -p BEST -l ADDRSORT -C, -A +10 x10, -0,-2,-4,-6,-8, +15, -1, +15.
// The heap is drawn to scale (0.1 world units a byte); allocated chunks in the lab's pointer colours, free chunks orange, the free list as arcs.
(function(){
  if(!document.getElementById('stg-heap')||!window.FREELIST)return;const {cl,lerp,mix}=S3;
  const OPS='+10,+10,+10,+10,+10,+10,+10,+10,+10,+10,-0,-2,-4,-6,-8,+15,-1,+15';
  const RUN=FREELIST.run({seed:0,size:100,base:1000,header:0,align:-1,policy:'BEST',order:'ADDRSORT',coalesce:true,numOps:10,range:10,pAlloc:50,list:OPS}).steps;
  const S0={free:[[1000,100]],used:[]};
  const X=a=>-5+(a-1000)*.1,COL=['c1','c3','c4','c5','c6'];  // the lab's pointer colours (orange is kept for free space)
  // the run's state shown at step k, progress e: step 2 plays the ten mallocs, step 3 the five frees
  function state(k,e){if(k===0)return S0;if(k===1)return RUN[Math.min(9,Math.floor(e*10.99))];if(k===2)return RUN[10+Math.min(4,Math.floor(e*4.99))];return RUN[k+12]}
  function draw(R,k,e){const P=R.P,S=state(k,e);R.grid(-6.5,6.5,-2,2.4,.5);
    R.quad([[-5.1,.075,-.55],[5.1,.075,-.55],[5.1,.075,.55],[-5.1,.075,.55]],{fill:P.paper,dz:400});
    R.label([-5.1,.08,.55],'1000',{al:'left',dy:12,mono:1,fs:12,c:P.mute});R.label([5.1,.08,.55],'1100',{al:'right',dy:12,mono:1,fs:12,c:P.mute});
    S.used.forEach(([a,sz,ptr])=>{const c=P[COL[ptr%5]],fresh=(k===5&&ptr===11);const y=fresh?lerp(1.2,.08,cl(e*1.6,0,1)):.08;
      R.box([X(a)+sz*.05,y,0],[sz*.1-.05,.55,.9],{fill:mix(P.paper,c,.6),shadow:false});
      R.label([X(a)+sz*.05,y+.55,0],'ptr['+ptr+']',{dy:-10,mono:1,fs:12,c:P.ink,wide:1,a:k===5&&ptr!==11?.55:1})});
    S.free.forEach(([a,sz])=>{R.box([X(a)+sz*.05,.08,0],[sz*.1-.05,.12,.9],{fill:mix(P.paper,P.c2,.55),shadow:false,fa:.85});
      R.label([X(a)+sz*.05,.2,0],sz+' B',{dy:-9,mono:1,fs:12,c:P.c2,b:1,wide:sz<15?1:0})});
    // the free list: a head on the left, then one arc to each free chunk in address order (the links live inside the free chunks)
    const H=[-6.1,.1,0];R.box(H,[.5,.3,.5],{fill:mix(P.paper,P.c2,.25)});R.label([H[0],.4,0],'free list',{dy:-10,fs:12.5,b:1,c:P.c2});
    let prev=[H[0]+.25,.3,0];S.free.forEach(([a,sz])=>{const p=[X(a)+.15,.2,0];R.arc(prev,p,.35+.02*Math.abs(p[0]-prev[0]),{c:P.c2,w:1.6,head:6});prev=p});
    R.label([0,.08,.55],S.free.length?'free list: '+S.free.length+(S.free.length>1?' entries':' entry'):'free list: empty, the heap is full',{dy:30,fs:12.5,b:1,c:P.c2,wide:1});
    // step 4: malloc(15) tries each free chunk and fails; step 6: it takes the 30-byte chunk
    if(k===3){const fr=S.free,i=Math.min(fr.length-1,Math.floor(e*fr.length*.999)),a=fr[i][0],x=X(a)+.75;
      R.box([x,1.25,0],[1.45,.45,.8],{fill:mix(P.paper,P.ink,.12),ec:P.ink,fa:.75,shadow:false});
      R.label([x,1.7,0],'malloc(15)',{dy:-10,mono:1,fs:12.5,b:1,c:P.ink});
      R.flow([[x,1.2,0],[X(a)+.5,.35,0]],{c:P.ink,r:.06,n:4,a:.9});
      R.label([0,2.3,0],'50 bytes free, largest 10: returned -1 (searched '+RUN[15].res[1]+')',{fs:12.5,b:1,c:P.bad,a:e,wide:1})}
    if(k===4)R.label([X(1000)+1.5,.2,0],'merged: 10 + 10 + 10',{dy:-26,fs:12.5,b:1,c:P.c2,a:e});
    if(k===5){R.flow([[X(1000)+.75,1.5,0],[X(1000)+.75,.7,0]],{c:P.c1,r:.06,n:4,a:1-e*.5});
      R.label([0,2.3,0],'returned 1000 (searched '+RUN[17].res[1]+'); 15 bytes left at 1015',{fs:12.5,b:1,c:P.good,a:e,wide:1})}
  }
  S3.stage({id:'stg-heap',list:'sx-heap',fig:'Fig. 2 · a 100-byte heap, malloc.py',cam:[-.12,.66],bounds:[[-6.4,0,-.8],[5.4,2.3,.8]],aspect:.52,dur:2400,hold:4600,draw,
    margin:w=>w<520?[14,8,22,8]:[18,16,24,16]});
})();
