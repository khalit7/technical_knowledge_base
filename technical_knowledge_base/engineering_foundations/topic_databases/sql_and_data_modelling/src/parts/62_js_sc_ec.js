// ---- Scene, Fig. 6 (section 11): expand and contract, renaming chats.title to chats.name while the application keeps running (renderer v2) ----
// Schematic: the chats table as two columns of cells (eight rows drawn), the running versions of the application in front.
// Writes stream from the code into a column (purple), reads from a column into the code (teal); the backfill copies title into name in batches.
(function(){
  if(!document.getElementById('stg-ec'))return;const {at,off,lerp,mix,cl}=S3;
  // per step: the versions running and what each does to [title, name]
  const F=[{run:[['v1',['read, write','']]]},{run:[['v1',['read, write','']]]},{run:[['v1',['read, write','']],['v2',['read, write','write']]]},
    {run:[['v2',['read, write','write']]]},{run:[['v2',['read, write','write']],['v3',['write','read, write']]]},
    {run:[['v3',['write','read, write']],['v4',['','read, write']]]},{run:[['v4',['','read, write']]]}];
  window.CHK=Object.assign(window.CHK||{},{ec:{steps:F.length}});
  const NR=8,z=i=>-2.0+i*.36,XT=-.85,XN=.85,CW=1.4,ZCODE=1.75;
  function draw(R,k,e){const P=R.P,W=P.c4,Rd=P.c6;R.grid(-4,4,-2.6,2.6,.5);
    // the title column
    const ta=k===5?.45:k===6?1-e:1;
    for(let i=0;i<NR;i++)R.box([XT,0,z(i)],[CW,.14,.3],{fill:mix(P.paper,P.c1,.4),a:ta,shadow:i===0,lw:.5});
    R.label([XT,.14,z(0)],k===6?'title · dropped':'title',{fs:13,b:1,mono:true,dy:-12,c:k===6?P.bad:P.c1,a:Math.max(.4,ta)});
    // the name column: absent, then NULL, then new rows only, then backfilled in batches, then the only column
    if(k===0)R.quad([[XN-CW/2,.01,z(0)-.15],[XN+CW/2,.01,z(0)-.15],[XN+CW/2,.01,z(NR-1)+.15],[XN-CW/2,.01,z(NR-1)+.15]],{dash:[4,4],ec:P.mute,a:.6});
    else for(let i=0;i<NR;i++){const filled=k>=4||(k>=2&&i>=NR-2)||(k===3&&i<NR-2&&i<Math.floor(e*(NR-2)+.001)),fresh=k===1?e:1;
      R.box([XN,0,z(i)],[CW,filled?.14:.05,.3],{fill:filled?mix(P.paper,P.c2,.45):P.paper,fa:filled?1:.5,a:fresh,shadow:i===0,lw:.5})}
    R.label([XN,.14,z(0)],k===0?'name · not yet':k===1?'name · added, NULL':'name',{fs:13,b:1,mono:true,dy:-12,c:k===0?P.mute:P.c2,a:1});
    if(k===2)R.label([XN+CW/2,.14,z(NR-1)],'new rows only',{fs:12,al:'left',dx:8,c:P.c2,wide:1});
    // the backfill: batches of rows copied from title into name
    if(k===3){const b=Math.min(NR-3,Math.floor(e*(NR-2)));R.flow([[XT+.3,.16,z(b)],[0,.4,z(b)],[XN-.3,.16,z(b)]],{c:P.c2,a:1,r:.06,n:6,speed:1.4});
      R.label([0,.45,z(b)],'batch '+(b+1),{fs:12,mono:true,b:1,dy:-8,c:P.c2,wide:1})}
    // the code: each running version reads (teal, out of a column) and writes (purple, into a column)
    const run=F[k].run,xs=run.length===1?[0]:[-1.35,1.35];
    run.forEach(([v,ops],j)=>{const nw=k>0&&!F[k-1].run.some(r=>r[0]===v),a=nw?e:1,cx=xs[j],c=[cx,0,ZCODE];
      R.box(c,[1.5,.42,.6],{fill:mix(P.paper,v==='v1'?P.mute:P.c5,.25),a});R.label([cx,.42,ZCODE],v+' code',{fs:13,b:1,dy:-11,a});
      [[XT,ops[0]],[XN,ops[1]]].forEach(([xc,op])=>{if(!op||(xc===XT&&k===6))return;
        if(/write/.test(op))R.flowArc([cx-.2,.42,ZCODE-.3],[xc-.15,.16,z(NR-1)+.1],.55,{c:W,a:a*.9,r:.05,n:7,speed:1.3});
        if(/read/.test(op))R.flowArc([xc+.15,.16,z(NR-1)+.1],[cx+.2,.42,ZCODE-.3],.75,{c:Rd,a:a*.9,r:.05,n:7,speed:1.3})})});
    R.label([-2.9,.2,ZCODE],'reads',{fs:12,b:1,c:Rd,al:'right',dy:-8,wide:1});R.label([-2.9,.2,ZCODE],'writes',{fs:12,b:1,c:W,al:'right',dy:10,wide:1});
  }
  S3.stage({id:'stg-ec',list:'sx-ec',fig:'Fig. 6 · chats.title becomes chats.name, the code running throughout',cam:[.35,.7],bounds:[[-3.1,0,-2.2],[2.4,.6,2.1]],aspect:.55,dur:1500,hold:5000,draw,
    margin:w=>w<520?[18,8,12,8]:[22,20,14,40]});
})();
