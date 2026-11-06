// ---- Scene: Fig. 3, eight canaries (section 5, renderer v2). Run "memory": eight planted files, each holding one code word; what loaded at
// launch, what waited for a matching file, what never loaded, and the two model calls (their input and cache write from the run's usage).
// Steps (ol#sx-mem): the launch walk, the project files, two skips and a rule, call 1, the Read, call 2. ----
(function(){
  if(!document.getElementById('stg-mem')||!window.HCCR)return;const {mix,at}=S3;
  const r=HCCR.run('memory');if(!r)return;const c1=r.calls[0],c2=r.calls[1],fmt=HCCR.fmt;
  // the eight files: where they sit, their code word, and the step at which they load (+) or are skipped (-)
  const F=[
    {w:'HOTEL-PARENT',f:'../CLAUDE.md',p:[-4.3,0],k:0},
    {w:'ALPHA-ROOT',f:'CLAUDE.md',p:[-2.55,-.45],k:1},
    {w:'BRAVO-IMPORT',f:'docs/style.md',p:[-1.5,-.45],k:1},
    {w:'CHARLIE-LOCAL',f:'CLAUDE.local.md',p:[-.45,-.45],k:-2},
    {w:'DELTA-RULE',f:'rules/general.md',p:[-2.55,.5],k:3},
    {w:'ECHO-PATHRULE',f:'rules/python.md',p:[-1.5,.5],k:6},
    {w:'GOLF-AGENTS',f:'AGENTS.md',p:[-.45,.5],k:-4},
    {w:'FOXTROT-SUBDIR',f:'textstats/CLAUDE.md',p:[1.05,-.3],k:6}];
  const ORDER=[0,1,2,4,5,7]; // slabs in the order they enter the context
  const CX=3.25,MX=6.5,SH=.17,FB=[.62,.34,.42];
  const slabY=j=>.08+.22+j*(SH+.03);
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.4,7.0,-1.5,1.5,.5);
    // three folders as white plinths
    const plin=(x,w,d,t,on)=>{R.box([x,0,0],[w,.08,d],{fill:mix(P.paper,P.soft,.5),a:on?1:.55});R.label([x,0,d/2],t,{fs:12.5,b:on,c:on?P.ink:P.mute,dy:18,wide:1})};
    plin(-4.3,1.3,1.4,'parent folder',k===0);plin(-1.5,3.3,2.0,'project (working directory)',k>=1&&k<=4);plin(1.3,1.5,1.4,'textstats/',k===6);
    // the file the model reads at step 7
    const rd=k>=6;R.box([1.65,.08,.4],FB,{fill:mix(P.paper,P.c2,rd?.35:.08),a:k===6?1:.55});if(k>=6)R.label([1.65,.42,.4],'core.py',{mono:true,fs:12,c:P.c2,dy:-10,a:k===6?1:.5,wide:1});
    // the eight files: white while waiting, purple once loaded, faded with a red edge when skipped
    F.forEach((x,i)=>{const lk=x.k>=0&&k>=x.k,sk=x.k<0&&k>=-x.k,cur=x.k===k||-x.k===k,
      fill=lk?mix(P.paper,P.c4,cur?.55*e+.1:.45):sk?mix(P.paper,P.bad,.18):P.paper,a=cur?1:lk?.7:sk?.45:.5;
      R.box([x.p[0],.08,x.p[1]],FB,{fill,a});
      if(cur||(k===0&&i===0))R.label([x.p[0],.42,x.p[1]],(nar?x.w.split('-')[0]:x.w)+(cur&&sk?' · skipped':''),{mono:true,fs:12,b:cur,c:sk?P.bad:P.c4,dy:-10,a:Math.max(.6,cur?e:1),grp:'f'});
    });
    // the context: a plinth with the system prompt and tools at the bottom, then one slab per memory file as it loads
    R.box([CX,0,0],[1.2,.08,1.1],{fill:mix(P.paper,P.soft,.5)});R.box([CX,.08,0],[.95,.2,.85],{fill:mix(P.paper,P.mute,.18),a:.8});
    R.label([CX,0,.55],'context',{fs:13,b:1,c:P.c4,dy:18});
    ORDER.forEach((i,j)=>{const x=F[i];if(k<x.k)return;const cur=x.k===k,y=slabY(j),a=cur?e:1;
      R.box([CX,y,0],[.95,SH,.85],{fill:mix(P.paper,P.c4,.5),a});
      if(cur){const src=[x.p[0],.45,x.p[1]],dst=[CX,y+SH,0];R.flowArc(src,dst,.9,{c:P.c4,a:1-.3*e,r:.065,speed:1.4,n:9})}
      if((k===5||k===7)&&!nar)R.label([CX+.5,y+SH/2,0],x.w+(k===7&&x.k===6?' (new)':''),{mono:true,fs:12,al:'left',dx:8,c:P.c4,grp:'ctx',a:.95})});
    // the model: a glass plate; the two calls read the whole context
    const ma=k===5||k===7?1:.3;R.glass([MX,.1,-.6],[0,0,1.2],[0,1.25,0],{c:P.c2,a:ma,nu:5,nv:5});if(k>=5)R.label([MX,1.35,0],'Haiku 4.5',{fs:12.5,b:1,c:P.c2,dy:-10,a:Math.max(.5,ma)});
    if(k===5||k===7){const n=k===5?4:6,top=slabY(n-1)+SH;R.flow([[CX+.48,top*.5,0],[MX,top*.5+.1,0]],{c:P.c4,r:.07,n:6+n,speed:1.2,a:e});
      R.label([MX,.1,.6],k===5?'call 1: 4 canaries · '+fmt(c1[0]+c1[1]+c1[2])+' tokens in':'call 2: 6 canaries · '+fmt(c2[1])+' written to cache',{fs:13,b:1,c:P.ink,dy:22,al:'right',dx:30,a:e})}
    if(k===6)R.flowArc([1.65,.5,.4],[CX,slabY(4),0],.7,{c:P.c2,r:.06,n:6,speed:1.2,a:e});
  }
  const full={cam:[.32,.62],bounds:[[-5.1,0,-1.1],[6.8,1.5,1.2]]};
  const near=(x0,x1)=>({cam:[.45,.62],bounds:[[x0,0,-1.1],[x1,1.1,1.2]]});
  S3.stage({id:'stg-mem',list:'sx-mem',fig:'Fig. 3 · run memory, eight canaries',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1400,hold:4600,draw,
    view:k=>k>=1&&k<=4?near(-3.8,4.0):k===5?near(.8,6.9):full,
    margin:w=>w<520?[14,10,14,10]:[22,16,16,16]});
})();
