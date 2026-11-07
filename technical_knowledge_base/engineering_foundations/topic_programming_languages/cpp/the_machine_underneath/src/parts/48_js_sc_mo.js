// ---- Scene: message passing through a store buffer, relaxed against release/acquire (section 8; renderer v2).
// The store buffer is the textbook model (illustrative); the instructions are orders_asm.cpp's compiled code (str/ldr, stlr, ldapr)
// and the counts are litmus.cpp's measured run 1 (window.CB.litmus).
(function(){
  if(!document.getElementById('stg-mo')||!window.CB||!CB.litmus)return;const {at,off,cl,mix,lerp}=S3;
  const LV=CB.litmus.v,nRel=LV.relaxed.runs[0],nAcq=LV.acqrel.runs[0],T=LV.trials.runs[0].toLocaleString('en-US');
  const A=[-3.3,0,1.3],B=[3.3,0,1.3],SB=[-1.7,0,.15],MEM=[0,0,-1.5],CD=[-1,0,-1.5],CF=[1,0,-1.5],SL=[[-2.15,.2,.15],[-1.25,.2,.15]];
  function cell(R,c,txt,o){const P=R.P;R.box(c,[.95,.32,.6],{fill:o.fill||P.paper,a:o.a==null?1:o.a,shadow:false});R.label([c[0],.32,c[2]],txt,{mono:true,fs:12.5,b:1,dy:-10,c:o.c||P.ink,a:o.a==null?1:o.a})}
  function core(R,c,name,code,o){const P=R.P;R.box(c,[1.7,.55,1],{fill:mix(P.paper,o.col,.25)});R.label([c[0],.55,c[2]],name,{fs:13,b:1,dy:-12,c:o.col});
    code.forEach((t,i)=>R.label([c[0],0,c[2]+.5],t,{mono:true,fs:12,dy:16+i*16,c:o.ins&&o.ins[i]?o.ins[i]:P.ink,wide:1}))}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.6,2.6,.5);
    const rel=k>=4,acq=k>=5,bad=P.bad,good=P.good;
    // the shared cache, and the two variables in it
    R.glass([MEM[0]-1.8,.01,MEM[2]-.6],[3.6,0,0],[0,0,1.2],{c:P.c1,nu:4,nv:2,a:.8});R.label([MEM[0]+1.8,0,MEM[2]-.6],'shared cache',{al:'left',dx:8,fs:12.5,b:1,c:P.c1});
    // A's store buffer: a glass tray with two slots
    const sba=k===0?.35:1;R.glass([SB[0]-.95,.01,SB[2]-.45],[1.9,0,0],[0,0,.9],{c:P.c2,nu:2,nv:1,a:sba});R.label([SB[0],0,SB[2]+.45],'A’s store buffer',{fs:12.5,dy:16,c:P.c2,b:1,a:sba});
    // the cores, with their code: the flag's instruction changes with the memory order
    core(R,A,'core A',['data.store(1)','flag.store(1): '+(rel?'stlr':'str')],{col:P.c2,ins:[null,rel?P.good:null]});
    core(R,B,'core B',['f = flag.load(): '+(acq?'ldapr':'ldr'),'d = data.load()'],{col:P.c6,ins:[acq?P.good:null,null]});
    // where each store is: 0 not made, 1 in the buffer, 2 visible in the shared cache
    let dS=0,fS=0,te=1;
    if(k===1){dS=e>.15?1:0;fS=e>.55?1:0}
    if(k===2){dS=1;fS=e>.5?2:1;te=e}
    if(k===3){dS=1;fS=2}
    if(k===4){dS=e>.35?2:1;fS=e>.75?2:1}
    if(k===5){dS=2;fS=2}
    // flows: A into its buffer, the buffer into the cache
    if(k===1)[[SL[0],.15],[SL[1],.55]].forEach(([sl,t0])=>{const a=cl((e-t0+.15)*3,0,1);if(a>0)R.flowArc([A[0]+.5,.5,A[2]-.4],sl,.4,{c:P.c2,a,r:.05,n:6})});
    if(k===2&&e>.15)R.flowArc(SL[1],[CF[0],.3,CF[2]],.5,{c:P.c2,r:.06,n:8,a:1-cl((e-.75)*4,0,1)});
    if(k===4){if(e<.5)R.flowArc(SL[0],[CD[0],.3,CD[2]],.5,{c:P.good,r:.06,n:8});else if(e<.9)R.flowArc(SL[1],[CF[0],.3,CF[2]],.5,{c:P.good,r:.06,n:8})}
    // buffer entries
    if(dS===1)cell(R,SL[0],'data = 1',{fill:mix(P.paper,P.c2,.3)});
    if(fS===1)cell(R,SL[1],'flag = 1',{fill:mix(P.paper,P.c2,.3)});
    // the shared cache's values
    cell(R,CD,'data = '+(dS===2?1:0),{fill:dS===2?mix(P.paper,P.c2,.45):P.paper});
    cell(R,CF,'flag = '+(fS===2?1:0),{fill:fS===2?mix(P.paper,P.c2,.45):P.paper});
    // B's loads: flag first, then data
    if(k===3||k===5){const ok=k===5,c=ok?good:bad;
      R.flowArc([CF[0],.35,CF[2]],[B[0]-.4,.55,B[2]-.4],.6,{c:P.c6,r:.055,n:8,a:cl(e*3,0,1)});
      if(e>.4)R.flowArc([CD[0],.35,CD[2]],[B[0]-.6,.55,B[2]-.4],.9,{c:P.c6,r:.055,n:8,a:cl((e-.4)*3,0,1)});
      const t=ok?'f = 1, d = 1 · '+nAcq+' of '+T+' trials':'f = 1, d = 0 · '+nRel+' of '+T+' trials';
      R.label([B[0],.55,B[2]],t,{mono:true,fs:12.5,b:1,dy:-34,c,a:cl((e-.5)*3,0,1),al:'right',dx:80,wide:1})}
  }
  const full={cam:[.05,.78],bounds:[[-4.3,0,-2.2],[4.3,.8,2.2]]};
  S3.stage({id:'stg-mo',list:'sx-mo',fig:'message passing, 52 million times per order',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:5200,draw,
    view:k=>k===1||k===2?{cam:[-.15,.72],bounds:[[-4.3,0,-2.2],[1.8,.8,2.2]]}:full,
    margin:w=>w<520?[30,10,44,10]:[34,30,48,30]});
})();
