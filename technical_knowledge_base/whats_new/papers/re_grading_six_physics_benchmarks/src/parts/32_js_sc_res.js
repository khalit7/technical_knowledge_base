// ---- Scene: Table 1 (Figure 1) as a bar field (renderer v2: three models in rows, six benchmarks in columns, the pre-audit score as a white bar
// and the rise after correction stacked on it in the corrected colour; the camera moves to the public-source group, then the expert-written group) ----
// Data: window.PAPER.tables.t1 (mean@4 pre-audit and corrected for each model and benchmark; CritPt pre-audit is Artificial Analysis's mean@5,
// n0 and n1 the questions each score is computed on). window.RG6RES exposes the numbers for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-res'))return;const {at,off,lerp,mix}=S3;
  const T=window.PAPER.tables,RW=T.t1,MS=['gpt','fable','gem'],MN={gpt:'GPT-5.6-Sol',fable:'Fable 5',gem:'Gemini 3.1 Pro'};
  const SH={'PHYBench':'PHYBench','PRISM-Physics':'PRISM','UGPhysics':'UGPhysics','HLE-Physics':'HLE','CMT-Benchmark':'CMT','CritPt':'CritPt'};
  const PH={'PHYBench':'PHY','PRISM-Physics':'PRISM','UGPhysics':'UG','HLE-Physics':'HLE','CMT-Benchmark':'CMT','CritPt':'CritPt'};
  // the step at which each column's rise appears (steps count from 0): the rule-based graders, the LLM judge, then the three expert-written benchmarks
  const REV={'PHYBench':1,'PRISM-Physics':1,'UGPhysics':2,'HLE-Physics':3,'CMT-Benchmark':4,'CritPt':5};
  window.RG6RES={rows:RW.map(r=>({b:r.b,n0:r.n0,n1:r.n1,mean:r.mean})),rev:REV};
  const cssv=n=>S3.rgb(getComputedStyle(document.body).getPropertyValue(n).trim()||'#888');
  const GX=c=>-3.3+c*1.2+(c>=3?.6:0),RZ=r=>1.1-r*1.1,HS=1.6/100;
  function draw(R,k,e){const P=R.P,ok=cssv('--lok'),nar=R.W<520;R.grid(-4.6,4.6,-1.9,2.1,.5);
    const inView=c=>!(k>=1&&k<=2&&c>=3)&&!(k>=3&&k<=5&&c<3);
    RW.forEach((row,c)=>{const rv=REV[row.b],focus=k===0||k===6||rv===k,dim=focus?1:inView(c)?.28:(k===1||k===3?.28*(1-e):0);
      const g=k>rv||k===6?1:k===rv?e:0;
      MS.forEach((m,r)=>{const [v0,v1]=row.mean[m],z=RZ(r),h0=v0*HS,h1=v1*HS;
        if(dim<=.01)return;R.box([GX(c),0,z],[.5,Math.max(.012,h0),.4],{fill:P.paper,a:dim,shadow:false,lw:.6});
        if(g>.001)R.box([GX(c),h0,z],[.5,Math.max(.006,(h1-h0)*g),.4],{fill:mix(P.paper,ok,r===0?.85:.6),a:dim,shadow:false,lw:.6})});
      // the front row's numbers for the columns this step is about
      const [g0,g1]=row.mean.gpt;
      if(!inView(c))return;
      if(k===0)R.label([GX(c),g0*HS,RZ(0)],g0.toFixed(1),{mono:true,fs:12,b:1,dy:-10,a:e});
      else if(rv===k)R.label([GX(c),lerp(g0,g1,g)*HS,RZ(0)],nar?g1.toFixed(1):g0.toFixed(1)+' → '+g1.toFixed(1),{mono:true,fs:12.5,b:1,dy:-14,c:ok,a:e});
      else if(k===6)R.label([GX(c),g1*HS,RZ(0)],g1.toFixed(1),{mono:true,fs:12,b:1,dy:-10,c:ok,a:e});
      // column names and the questions each score is computed on
      R.label([GX(c),0,RZ(0)+.3],nar?PH[row.b]:SH[row.b],{fs:12,dy:14,b:focus&&k>0&&k<6,c:P.ink,a:focus?1:.55});
      if(focus&&k>0)R.label([GX(c),0,RZ(0)+.3],row.n0+' → '+row.n1+(nar?'':' qs'),{mono:true,fs:12,dy:31,c:P.mute,a:k===6?e:1,wide:k===6?1:0})});
    const rx=k>=3&&k<=5?GX(3)-.55:GX(0)-.55;MS.forEach((m,r)=>R.label([rx,0,RZ(r)],MN[m],{al:'right',dx:-6,fs:12,b:r===0,c:r===0?P.ink:P.mute,grp:'rows'}));
  }
  const full={cam:[.22,.78],bounds:[[-3.9,0,-1.5],[3.9,1.6,1.6]]},
    left={cam:[.32,.7],bounds:[[-4.0,0,-1.5],[-.2,1.6,1.6]]},right={cam:[.1,.7],bounds:[[.2,0,-1.5],[4.0,1.6,1.6]]};
  S3.stage({id:'stg-res',list:'sx-res',fig:'Fig. 2 · Table 1 in depth: pre-audit and corrected mean@4',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,30,8]:[20,16,40,120],
    view:k=>k===1||k===2?left:k>=3&&k<=5?right:full});
})();
