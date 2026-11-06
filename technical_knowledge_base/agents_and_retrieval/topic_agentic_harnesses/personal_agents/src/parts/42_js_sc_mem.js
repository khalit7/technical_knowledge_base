// ---- Scene: Fig. 6, who decides to look in the history (renderer v2). The eleven past-session lines of the fake history (dates from the
// recordings' search results and retrievals; the deciding line is 3 September), the model as a glass plate, MEMORY.md and the calendar.
// Per configuration, the lines lit are the ones the recorded Haiku 4.5 runs actually got back (window.HPD); the score is right answers of 3. Steps: ol#sx-mem. ----
(function(){
  if(!document.getElementById('stg-mem')||!window.HPD)return;const {mix,lerp3,at}=S3;
  // the eleven history dates (src/demo/world.py HISTORY); the label shows day and month
  const D=['2026-05-14','2026-06-02','2026-06-20','2026-07-03','2026-07-19','2026-08-11','2026-08-28','2026-08-29','2026-09-03','2026-09-18','2026-09-25'];
  const KEY='2026-09-03',MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],dm=d=>(+d.slice(8))+' '+MON[+d.slice(5,7)-1];
  const X=i=>-4+i*.8,ZH=-1.3,MZ=1.4,MEMX=-1.7,CALX=1.8,SAM=[-3.6,0,1.9],GWY=[-3.4,0,.15];
  const dates=s=>D.filter(d=>String(s).indexOf(d)>=0);
  // what each configuration got back: the first recorded Haiku run's search results, or the gateway's retrieval
  const hit=k=>{const r=HPD['s2_haiku_'+k+'_1'];if(!r)return [];if(k==='inject')return dates((r.runs[0].ret||[]).join(' '));
    const s=r.runs[0].steps.find(x=>x.tool==='search_history');return s?dates(s.res):[]};
  const HINT=hit('hint'),INJ=hit('inject');
  const score=m=>{const ks=Object.keys(HPD).filter(k=>k.indexOf('s2_haiku_'+m+'_')===0);return ks.filter(k=>HPD[k].grade.ok).length+' of '+ks.length+' right'};
  const SC=['',score('off'),score('tool'),score('hint'),score('inject')];
  function draw(R,k,e){const P=R.P;R.grid(-4.8,4.6,-2.4,2.6,.5);
    const lit=k===3?HINT:k===4?INJ:[];
    const baseA=k===0?1:k===1?.18:k===2?.4:.4;
    // the history: one tile per past session
    D.forEach((d,i)=>{const on=lit.indexOf(d)>=0,key=d===KEY,h=on?.1+.3*e:.1,a=on||k===0&&key?1:baseA;
      R.box([X(i),0,ZH],[.62,h,.8],{fill:key?mix(P.paper,P.good,.5):on?mix(P.paper,P.c4,.45):P.paper,a,lw:.7});
      if(on||key||k===0&&(i===0||i===D.length-1))R.label([X(i),h,ZH+.4],dm(d)+(k===4&&key?' · ranked 5th, left out':''),{mono:true,fs:12,c:key?P.good:on?P.c4:P.mute,dy:16,b:key,a:Math.max(.55,a),grp:'d'})});
    R.label([X(0)-.4,.1,ZH],'history · 11 past sessions',{fs:12.5,b:1,c:P.c4,al:'right',dx:-6,a:k===1?.4:1,wide:1});
    // the model, the profile and the calendar
    R.box([0,0,MZ],[1.5,.06,.5],{fill:mix(P.paper,P.soft,.5),shadow:false});R.glass([-.7,.06,MZ],[1.4,0,0],[0,1.1,0],{c:P.c2,nu:5,nv:4});R.label([0,1.16,MZ],'model',{fs:13,b:1,c:P.c2,dy:-8});
    R.box([MEMX,0,MZ],[.7,.22,.55],{fill:mix(P.paper,P.c4,.25)});R.label([MEMX,.22,MZ],'MEMORY.md',{mono:true,fs:12,c:P.ink,dy:-8});
    R.box([CALX,0,MZ],[.7,.3,.55],{fill:mix(P.paper,P.c1,.25),a:k===1||k===2?1:.45});R.label([CALX,.3,MZ],'calendar',{fs:12.5,c:P.ink,dy:-8,a:k===1||k===2?1:.5});
    R.flow([[MEMX+.36,.15,MZ],[-.72,.35,MZ]],{c:P.c4,r:.05,n:3,a:.6});
    // Sam's question
    R.box(SAM,[.55,.45,.55],{fill:mix(P.paper,P.c5,.35)});R.label([SAM[0],.45,SAM[2]],'Sam: "Should I?"',{fs:12.5,b:1,c:P.ink,dy:-10,wide:1});
    if(k===0)R.flowArc([SAM[0]+.3,.4,SAM[2]],[-.7,.6,MZ],.4,{c:P.c5,r:.07,n:7,a:e});
    // where the model looks
    if(k===1||k===2)R.flow([[.72,.5,MZ],[CALX-.36,.2,MZ]],{c:P.c1,r:.06,n:5,a:e});
    if(k===2){R.line([[0,.3,MZ-.1],[0,.3,ZH+.5]],{c:P.mute,w:1.2,dash:[4,4],a:e});R.label([-.15,.3,ZH+.75],'search tool: never called',{fs:12.5,c:P.mute,b:1,al:'right',dx:-8,a:e})}
    if(k===3){R.flow([[0,.4,MZ-.05],[X(6),.3,ZH+.45]],{c:P.c2,r:.06,n:6,a:e});
      HINT.forEach(d=>{const i=D.indexOf(d);R.flowArc([X(i),.45,ZH],[.1,.7,MZ],.4,{c:d===KEY?P.good:P.c4,r:d===KEY?.08:.055,n:d===KEY?8:5,a:e})});
      R.label([-.15,.3,ZH+.75],'search_history, as told',{fs:12.5,b:1,c:P.c2,al:'right',dx:-8,a:e,wide:1})}
    if(k===4){R.box(GWY,[.7,.5,.6],{fill:mix(P.paper,P.c3,.35),a:e});R.label([GWY[0],.5,GWY[2]],'gateway · top 4 by BM25',{fs:12.5,b:1,c:P.c3,dy:-10,a:e});
      INJ.forEach(d=>{const i=D.indexOf(d);R.flowArc([X(i),.45,ZH],[GWY[0]+.3,.45,GWY[2]],.35,{c:P.c4,r:.055,n:5,a:e})});R.flow([[GWY[0]+.36,.35,GWY[2]],[-.72,.45,MZ]],{c:P.c3,r:.06,n:6,a:e})}
    if(k>=1)R.label([.75,.9,MZ],SC[k],{fs:14,b:1,c:k===3?P.good:P.bad,al:'left',dx:8,a:e})
  }
  const full={cam:[.18,.72],bounds:[[-4.6,0,-2.1],[4.4,1.2,2.3]]};
  S3.stage({id:'stg-mem',list:'sx-mem',fig:'Fig. 6 · who looks in the history (Haiku 4.5, 3 runs each)',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:4800,draw,
    view:k=>k===1||k===2?{cam:[.25,.7],bounds:[[-4.2,0,-2],[2.6,1.2,2.3]]}:full,
    margin:w=>w<520?[34,10,14,10]:[36,16,16,16]});
})();
