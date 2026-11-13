// ---- Scene: the hero (2026-11-13, renderer v2). Where the frontier model sits: once per query, before any response exists.
// A benchmark's queries are rows (8 drawn of WildBench's 1,024), runs are columns (one run grades every query for one model version;
// 6 drawn). GPT-4o writes one checklist per query (glass plates), the small judge fills every cell; then the usual way, GPT-4o in
// every cell; then the cost of 1,000 runs as two towers to scale. Costs from PAPER.rc.cost (Table 4 recomputed by recompute.py):
// checklists $2.865, GPT-4o $3.40 a run (batch prices), Gemma-2-2B 248 s at $0.36 an hour = $0.0248 a run. Grid size illustrative.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix,cl}=S3;
  const CO=PAPER.rc.cost,gem=CO.rows.find(r=>r.judge==='Gemma-2-2B'),N=1000;
  const totG=N*CO.g4o,totR=CO.ck+N*gem.per;                  // 3,400 and 27.665
  window.RKHERO={ck:CO.ck,g4o:CO.g4o,gem:gem.per,totG,totR,share:totR/totG,rows:8,runs:6};
  const NR=8,NC=6,zr=r=>-2.1+r*.6,xc=j=>-2.5+j*.95,XG=-5.5,XP=-3.9,TH=3.0;
  const hT=TH,hR=Math.max(.02,TH*totR/totG),XT=[3.9,5.2];
  function draw(R,k,e){const P=R.P;R.grid(-6.5,6,-3,3,.5);
    const grid=k>=3?1-.82*at(k,e,3):1;                         // the grid recedes when the towers come
    const gp=k===0?1:k===1?.75:.45;
    // GPT-4o: the frontier model, at the back left
    R.box([XG,0,0],[1.1,1.0,1.5],{fill:mix(P.paper,P.c2,.45),a:grid*(k===1?.55:1)});
    R.label([XG,1.0,0],'GPT-4o',{fs:13,b:1,dy:-12,c:P.c2,a:grid*(k===1?.6:1)});
    // checklists: one glass plate per query, written once
    const pa=k===2?off(k,e,2)*.85+.15:k>2?.15:1;
    for(let r=0;r<NR;r++){const ar=k===0?cl(e*1.6-r*.08,0,1):1;
      R.glass([XP-.32,.28,zr(r)-.2],[.64,0,0],[0,0,.4],{c:P.c2,nu:1,nv:4,a:ar*pa*grid});
      if(k===0)R.flow([[XG+.55,.8,0],[XP-.5,.6,zr(r)*.6],[XP,.32,zr(r)]],{c:P.c2,a:ar*.9,r:.06,n:5,speed:1.4})}
    R.label([XP,.3,zr(0)-.3],'1 checklist per query',{mono:true,fs:12,c:P.c2,dy:-14,a:grid*pa,wide:1});
    R.label([XG-.6,.1,zr(NR-1)],'8 of 1,024 queries',{mono:true,fs:12,al:'right',c:P.mute,a:grid,wide:1});
    // runs: cells filled by the small judge, then by GPT-4o
    if(k>=1){const g2=k===2?e:k>2?1:0;
      for(let j=0;j<NC;j++){const ca=k===1?cl(e*1.5*NC/1-j,0,1):1;
        for(let r=0;r<NR;r++){const h=lerp(.16,.5,g2),fill=mix(mix(P.paper,P.c1,.38),mix(P.paper,P.c2,.5),g2);
          R.box([xc(j),0,zr(r)],[.48,h,.36],{fill,a:ca*grid,shadow:false,lw:.7})}
        R.label([xc(j),0,zr(NR-1)+.45],j===NC-1?'run N':'run '+(j+1),{mono:true,fs:12,c:P.mute,dy:10,a:ca*grid,wide:j>0&&j<NC-1?1:0})}
      // the small judge reads each query's plate along its row; GPT-4o instead reads every response itself
      for(let r=0;r<NR;r++){
        if(k===1)R.flow([[XP+.3,.32,zr(r)],[xc(NC-1)+.3,.24,zr(r)]],{c:P.c1,a:.85,r:.055,speed:1.6});
        if(k===2)R.flow([[XG+.55,.7,zr(r)*.4],[xc(0)-.4,.62,zr(r)],[xc(NC-1)+.3,.6,zr(r)]],{c:P.c2,a:.85*e,r:.06,speed:1.6})}
      if(k===1)R.label([xc(2.5),.3,zr(0)-.35],'small judge · $0.025 a run',{mono:true,fs:12.5,b:1,dy:-12,c:P.c1,wide:1});
      if(k===2)R.label([xc(2.5),.95,zr(0)-.35],'GPT-4o in every cell · $3.40 a run',{mono:true,fs:12.5,b:1,dy:-12,c:P.c2,a:e,wide:1})}
    // 1,000 runs: the two totals as towers, to scale
    if(k>=3){const a=at(k,e,3);
      R.box([XT[0],0,0],[.9,hT*a,.9],{fill:mix(P.paper,P.c2,.55)});
      R.box([XT[1],0,0],[.9,hR,.9],{fill:mix(P.paper,P.c1,.6),a});
      R.label([XT[0],hT*a,0],'$3,400 · 1,000 runs',{fs:15,b:1,dy:-14,c:P.c2,a});
      R.label([XT[0],0,.45],'GPT-4o',{mono:true,fs:12,dy:14,c:P.mute,a});
      R.label([XT[1],hR,0],'$27.7',{fs:15,b:1,dy:-14,c:P.c1,a});
      R.label([XT[1],0,.45],R.W<520?'Gemma-2-2B':'checklists + Gemma-2-2B',{mono:true,fs:12,dy:30,c:P.mute,a});
      }
  }
  const B0=[[-6.3,0,-2.5],[3.4,1.1,2.5]],B1=[[-6.3,0,-2.5],[5.9,3.1,2.5]];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · checklists once, a small judge per cell',cam:[.42,.72],bounds:B1,aspect:.66,dur:1500,hold:4800,draw,
    view:k=>k<3?{cam:[.42,.78],bounds:B0}:{cam:[.5,.42],bounds:[[-4.8,0,-2.4],[5.9,3.1,2.4]]},
    margin:w=>w<520?[14,10,26,10]:[16,16,28,16]});
})();
