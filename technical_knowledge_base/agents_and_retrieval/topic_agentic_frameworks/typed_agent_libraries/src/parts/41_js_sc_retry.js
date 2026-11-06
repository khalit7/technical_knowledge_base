// ---- Scene: Fig. 2, Pydantic AI's validate-and-retry loop on the 30 recorded validator runs (FT.val: ten cases, local model, three passes,
// retries=2). One ball per run, attempt by attempt: gate 1 is Pydantic's type check, gate 2 your output_validator with ctx.deps. Which gate refused
// an attempt comes from the recorded retry text (a schema error is gate 1; "not valid Python" and "identical to a line" are the validator). ----
(function(){
  if(!document.getElementById('stg-retry'))return;const {mix,lerp3}=S3;
  const runs=window.FT.val.map(v=>({at:v.retries.map(t=>/not valid Python|identical/.test(t)?2:1),why:v.retries}));
  const n=runs.length,MX=-4,G1=-1.5,G2=1,TX=3.7;
  // a slot in a 6 x 5 block around a centre (the model's or the result tray's)
  const slot=(i,x)=>[x+((i%5)-2)*.24,.17,(Math.floor(i/5)-2.5)*.28];
  const wait=(i,x,m)=>[x-.3-(m%2)*.22,.17,(Math.floor(m/2)-1.5)*.3];
  // where run i is during step k (attempts play at steps 1, 3 and 4; the way back after a refusal at steps 2 and 4), and its colour
  const ord=(i,j)=>runs.slice(0,i).filter(x=>x.at.length>j&&x.at[j]===runs[i].at[j]).length;
  const stopAt=(i,j)=>wait(i,runs[i].at[j]===1?G1:G2,ord(i,j));
  function travel(R,i,j,u){const P=R.P,r=runs[i],home=slot(i,MX);
    if(j<r.at.length){const gx=r.at[j]===1?G1:G2,mid=[Math.min(gx,G1)-.5,.12,home[2]*.6],st=stopAt(i,j);
      return [u<.5?lerp3(home,mid,u/.5):lerp3(mid,st,(u-.5)/.5),u>.97?P.bad:P.c4]}
    const mid=[G1,.12,home[2]*.5],tr=slot(i,TX);return [u<.5?lerp3(home,mid,u/.5):lerp3(mid,tr,(u-.5)/.5),u>.97?P.good:P.c4]}
  function place(R,i,k,e){const P=R.P,na=runs[i].at.length,home=slot(i,MX),tray=[slot(i,TX),P.good];
    if(k===0)return [home,P.c4];
    if(k===1)return travel(R,i,0,e);
    if(k===2)return na>=1?[R.arcPt(stopAt(i,0),home,.55,e),P.bad]:tray;
    if(k===3)return na>=1?travel(R,i,1,e):tray;
    if(na>=2)return e<.4?[R.arcPt(stopAt(i,1),home,.55,e/.4),P.bad]:travel(R,i,2,(e-.4)/.6);
    return tray}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.4,5,-2.6,2.6,.5);
    R.box([MX,0,0],[1.45,.06,1.95],{fill:mix(P.paper,P.c4,.25),a:.9});R.label([MX,.1,-.95],'model',{fs:13.5,b:1,c:P.c4,dy:-14});
    const hl1=k===3,hl2=k===1||k===3;
    R.glass([G1,.02,-1.2],[0,0,2.4],[0,.95,0],{c:P.c1,a:k===0||hl1?1:.45,nu:5,nv:4});R.label([G1,.97,-1.2],'1 · types',{fs:13,b:1,c:P.c1,dy:-10});
    R.glass([G2,.02,-1.2],[0,0,2.4],[0,.95,0],{c:P.acc,a:k===0||hl2?1:.45,nu:5,nv:4});R.label([G2,.97,-1.2],'2 · your validator',{fs:13,b:1,c:P.acc,dy:-10});
    R.box([G2,0,-2.1],[.9,.42,.5],{fill:mix(P.paper,P.good,.3)});R.label([G2+.45,.2,-2.1],'ctx.deps',{mono:true,fs:12,c:P.good,al:'left',dx:8,wide:1});
    if(k===0||hl2)R.flowArc([G2,.35,-1.85],[G2,.5,-1.15],.25,{c:P.good,r:.05,n:4});
    R.box([TX,0,0],[1.45,.06,1.95],{fill:mix(P.paper,P.good,.25)});R.label([TX,.1,-.95],'result.output: Triage',{fs:13,b:1,c:P.good,dy:-14});
    runs.forEach((r,i)=>{const [p,c]=place(R,i,k,e);R.ball(p,.09,{c})});
    // the counts this step is about, from the recorded runs
    const cnt=(j,g)=>runs.filter(r=>r.at.length>j&&(g==null||r.at[j]===g)).length,reach=j=>runs.filter(r=>r.at.length===j).length;
    if(k===1){R.label([TX,.1,.95],reach(0)+' pass',{fs:13.5,b:1,c:P.good,dy:18,a:e});R.label([G2,0,1.2],cnt(0)+' refused',{fs:13.5,b:1,c:P.bad,dy:16,a:e})}
    if(k===2){const why=runs.filter(r=>r.at.length).map(r=>r.why[0]);const np=why.filter(t=>/not valid Python/.test(t)).length,id=why.filter(t=>/identical/.test(t)).length;
      R.label([(MX+G2)/2,1.25,0],cnt(0)+' retry prompts back to the model',{fs:13,b:1,c:P.bad,a:e});
      if(!nar)R.label([(MX+G2)/2,1.25,0],np+' fixed lines do not parse · '+id+' already in the file',{fs:12,c:P.mute,dy:18,a:e})}
    if(k===3){R.label([TX,.1,.95],reach(1)+' more pass',{fs:13.5,b:1,c:P.good,dy:18,a:e});R.label([G2,0,1.2],cnt(1,2)+' refused',{fs:13.5,b:1,c:P.bad,dy:16,a:e});R.label([G1,0,1.2],cnt(1,1)+' schema errors',{fs:13.5,b:1,c:P.bad,dy:16,a:e})}
    if(k===4){const tot=runs.reduce((s,r)=>s+r.at.length,0),wr=runs.filter(r=>r.at.length).length;
      R.label([TX,.1,.95],n+' of '+n+' valid',{fs:13.5,b:1,c:P.good,dy:18,a:e});R.label([(MX+G2)/2,1.25,0],tot+' retry prompts in '+wr+' runs',{fs:13,b:1,c:P.ink,a:e})}
  }
  S3.stage({id:'stg-retry',list:'sx-retry',fig:'Fig. 2 · 30 recorded runs through the checks',cam:[.85,.6],bounds:[[-5,0,-2.4],[4.6,1.3,1.9]],aspect:.62,dur:2200,hold:4800,draw,
    margin:w=>w<520?[18,10,14,10]:[26,16,18,16],
    view:k=>k===2?{cam:[.85,.55],bounds:[[-5,0,-2.2],[2,1.5,1.9]]}:null});
})();
