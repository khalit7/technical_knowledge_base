// ---- Scene, Fig. 2 (section 2): two threads as lanes in time with the shared counter between them (renderer v2) ----
// Three modes on one input (count = 41, illustrative): the plain read-modify-write loses an update, a mutex serialises it, an atomic fetch-and-add does it in one step.
// Costs quoted in the step lists are the page's measured values (lk.S1.mutex.wall, lk.S1.atomic.wall, pp.1cpu.futex.half).
(function(){
  if(!document.getElementById('stg-race'))return;const {at,lerp,mix,cl}=S3;
  // one op per column: th thread (1 or 2), op name, r register after it, m memory after it, s the step it appears in, u its stagger within that step
  const M={
    plain:{n:6,ops:[[1,'load',41,41,1],[2,'load',41,41,2],[1,'add',42,41,3],[1,'store',42,42,4],[2,'add',42,42,5],[2,'store',42,42,6]].map((o,c)=>({c,th:o[0],op:o[1],r:o[2],m:o[3],s:o[4],u:0}))},
    lock:{n:9,ops:[[1,'lock',null,41,1,0],[1,'load',41,41,2,0],[1,'add',42,41,2,1],[1,'store',42,42,2,2],[1,'unlock',null,42,3,0],[2,'load',42,42,4,0],[2,'add',43,42,4,1],[2,'store',43,43,4,2],[2,'unlock',null,43,4,3]].map((o,c)=>({c,th:o[0],op:o[1],r:o[2],m:o[3],s:o[4],u:o[5]}))},
    atomic:{n:2,ops:[[1,'ldadd',41,42,1],[2,'ldadd',42,43,2]].map((o,c)=>({c,th:o[0],op:o[1],r:o[2],m:o[3],s:o[4],u:0}))}};
  let mode='plain';
  const Z1=-1.7,Z2=1.7,ZM=0;
  function draw(R,k,e){const P=R.P,D=M[mode],nc=D.n+1,dx=Math.min(1.2,8.4/nc),X=c=>(c+1-(nc-1)/2)*dx,cw=dx*.8;R.grid(-5,5,-2.5,2.5,.5);
    const zc=th=>th===1?Z1:Z2,colT=th=>th===1?P.c1:P.c4;
    // the lanes, with every column still to come drawn faintly so the layout is there from the first step
    [[Z1,'T1',P.c1],[ZM,'count in memory',P.ink],[Z2,'T2',P.c4]].forEach(([z,t,c])=>{R.line([[X(-1)-dx*.6,.01,z],[X(D.n-1)+dx*.6,.01,z]],{c:P.line,w:1.2,dash:[4,4]});
      R.label([X(-1)-dx*.6,0,z],t,{al:'right',dx:-6,fs:12.5,b:1,c,grp:'lane'})});
    for(let c=0;c<D.n;c++){R.box([X(c),0,ZM],[cw*.75,.06,.55],{fill:P.paper,a:.25,shadow:false})}
    R.box([X(-1),0,ZM],[cw*.75,.25,.55],{fill:mix(P.paper,P.ink,.05)});R.label([X(-1),.25,ZM],'41',{fs:13.5,b:1,mono:true,dy:-10});
    // the ops seen so far; the current step's at full strength, older ones recede
    const vis=o=>o.s<k?1:o.s===k?(o.u===0?e:cl((e-o.u*.22)/.3,0,1)):0;
    let last=41,lastX=X(-1);
    D.ops.forEach(o=>{const a=vis(o);if(a<=.01)return;const cur=o.s===k,z=zc(o.th),c=colT(o.th),x=X(o.c),rec=cur?1:.4;
      const lockop=o.op==='lock'||o.op==='unlock';
      R.box([x,0,z],[cw,lockop?.22:.36,.62],{fill:mix(P.paper,c,cur?.6:.35),a:a*rec});
      R.label([x,lockop?.22:.36,z],o.op,{fs:12.5,mono:true,b:1,dy:-10,a:a*Math.max(rec,.6),c:cur?P.ink:P.mute});
      if(o.r!=null)R.label([x,0,z+.31],'r='+o.r,{fs:12,mono:true,dy:12,a:a*Math.max(rec,.6),c:c,wide:1});
      // memory after this column
      const changed=o.m!==last,from=lastX;last=o.m;
      if(changed||o.op==='ldadd'||o.op==='store'){const lost=mode==='plain'&&o.c===D.n-1,fin=o.m===43;
        R.box([x,0,ZM],[cw*.75,.25,.55],{fill:lost?mix(P.paper,P.bad,.45):fin&&mode!=='plain'?mix(P.paper,P.good,.4):P.paper,a});
        R.label([x,.25,ZM],String(o.m),{fs:13.5,b:1,mono:true,dy:-10,a,c:lost?P.bad:fin&&mode!=='plain'?P.good:P.ink});if(changed)lastX=x}
      // data moving on the current step: loads come up from memory, stores go down to it, an atomic does both in one step
      if(cur){const mem=[x,.25,ZM],op=[x,.36,z];
        if(o.op==='load'||o.op==='ldadd')R.flowArc([from,.25,ZM],op,.45,{c:P.c6,a,r:.06,n:6});
        if(o.op==='store'||o.op==='ldadd')R.flowArc(op,mem,.45,{c:c,a:o.op==='ldadd'?cl(e*2-.6,0,1):a,r:.06,n:6})}});
    // the mutex: T2 asleep on its futex from step 2 to step 4
    if(mode==='lock'){const sa=k<1?0:k===1?e:k<=3?1:0,x0=X(0),x1=X(4);
      if(sa>.01){R.box([(x0+x1)/2,0,Z2],[x1-x0+cw,.12,.5],{fill:mix(P.paper,P.bad,.25),a:sa*(k===3?1-.6*e:1),ec:P.bad});R.label([(x0+x1)/2,.12,Z2],'T2 asleep on m’s futex',{fs:12.5,b:1,dy:-10,c:P.bad,a:sa*(k===3?1-e:1)})}
      if(k===1)R.label([X(0),.36,Z2],'lock: taken',{fs:12,mono:true,dy:-10,c:P.bad,a:e,wide:1});
      if(k===3)R.flowArc([X(4),.22,Z1],[X(4),.12,Z2],.6,{c:P.good,a:e,r:.07,n:8})}
    // the verdict
    if(k===(mode==='plain'?6:mode==='lock'?4:2)){const a=e,ok=mode!=='plain';
      R.label([X(D.n-1),.25,ZM],ok?'43, correct':'expected 43, got 42',{fs:13,b:1,dy:-30,c:ok?P.good:P.bad,a})}
  }
  const st=S3.stage({id:'stg-race',list:'sx-race-plain',fig:'Fig. 2 · two threads, one counter',cam:[-.1,1.0],bounds:[[-4.4,0,-2.1],[4.4,.6,2.2]],aspect:.52,dur:1300,hold:4200,draw,
    margin:w=>w<520?[22,10,16,10]:[24,16,18,130]});
  const seg=document.getElementById('rd-race-mode');
  RD.seg(seg,m=>{mode=m;['plain','lock','atomic'].forEach(x=>{document.getElementById('sx-race-'+x).hidden=x!==m});st.list('sx-race-'+m)});
})();
