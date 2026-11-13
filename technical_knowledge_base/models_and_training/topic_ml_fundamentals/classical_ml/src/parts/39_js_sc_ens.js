// ---- Scene (3 Ensembles, Fig. 2): one tree, a forest and boosting on the same real curve, with the trees laid out in depth (renderer v2) ----
// Head acceleration against time after impact in simulated motorcycle crashes (MASS::mcycle, 133 readings, every fourth held out).
// The front plate holds the readings (ink: the 100 training readings; green: the 33 held out) and the ensemble's curve (blue).
// Forest: each plate behind holds one full-depth tree grown on a bootstrap sample (orange); their values stream forward into the average.
// Boosting: the plate behind holds the newest stage's tree times the learning rate 0.3, fitted to the grey residuals; it streams into the sum.
// Fits are this page's ML.tree, ML.forest and ML.gboost (tree and boosting identical to scikit-learn's to 1e-13). Errors are mean squared, in g².
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-en')||!window.S3||!window.ML||!window.CD)return;const {lerp,mix}=S3;
  const mc=CD.mcycle,te=mc.x.map((_,i)=>i%4===3),Xtr=[],ytr=[],Xte=[],yte=[];
  mc.x.forEach((v,i)=>{if(te[i]){Xte.push([v]);yte.push(mc.y[i])}else{Xtr.push([v]);ytr.push(mc.y[i])}});
  const STEPS={tree:[1,2,4,13],rf:[1,3,10,50,200],gb:[1,2,5,20,200]},LIST={tree:'sx-en-tree',rf:'sx-en-rf',gb:'sx-en-gb'};
  const mse=(f,X,y)=>X.reduce((a,x,i)=>a+(f(x)-y[i])**2,0)/X.length;
  let M=null,mode='rf';
  function fitAll(){if(M)return M;M={trees:STEPS.tree.map(k=>ML.tree(Xtr,ytr,null,{task:'reg',maxDepth:k>=13?null:k})),
      rf:ML.forest(Xtr,ytr,{task:'reg',nTrees:200,seed:1}),gb:ML.gboost(Xtr,ytr,{task:'reg',nStages:200,lr:0.3,maxDepth:2,seeds:ML.SK_SEEDS})};
    M.f={tree:STEPS.tree.map((_,i)=>x=>M.trees[i].predict(x)),rf:STEPS.rf.map(n=>x=>M.rf.predict(x,n)),gb:STEPS.gb.map(n=>x=>M.gb.predict(x,n))};
    M.err={};Object.keys(M.f).forEach(k=>M.err[k]=M.f[k].map(f=>[mse(f,Xtr,ytr),mse(f,Xte,yte)]));return M}
  {const m=fitAll(),set=(k,v)=>document.querySelectorAll('[data-en="'+k+'"]').forEach(e=>e.textContent=v);
    Object.keys(m.err).forEach(k=>m.err[k].forEach((e,i)=>{set(k+i+'a',e[0].toFixed(0));set(k+i+'b',e[1].toFixed(0))}))}
  // world: time across (x), acceleration up (y), trees in depth (z, behind the front plate)
  const XW=t=>(t-30)*.088,YW=g=>(Math.max(-150,Math.min(95,g))+150)/245*2.5,ZB=k=>-.62*(k+1),NB=6;
  const curve=(f,z,n)=>{const pts=[];n=n||240;for(let i=0;i<=n;i++){const t=58*i/n+.5;pts.push([XW(t),YW(f([t])),z])}return pts};
  function plate(R,z,c,a){R.glass([XW(0),0,z],[XW(60)-XW(0),0,0],[0,YW(95),0],{c,a,nu:6,nv:4,th:.01})}
  function draw(R,k,e,st){const P=R.P,m=fitAll(),n=STEPS[mode][k],ink=P.ink;R.grid(-3,3,-4.2,1.2,.5);
    // the front plate: zero line, axes and readings
    plate(R,0,P.mute,.35);R.line([[XW(0),YW(0),0],[XW(60),YW(0),0]],{c:P.mute,w:1,a:.6,dash:[4,4]});
    R.label([XW(60),YW(0),0],'0 g',{mono:true,fs:12,c:P.mute,al:'left',dx:6});R.label([XW(0),0,0],'0 ms',{mono:true,fs:12,c:P.mute,dy:12});R.label([XW(60),0,0],'60 ms',{mono:true,fs:12,c:P.mute,dy:12});
    Xtr.forEach((x,i)=>R.ball([XW(x[0]),YW(ytr[i]),.02],.045,{c:ink,a:.8}));Xte.forEach((x,i)=>R.ball([XW(x[0]),YW(yte[i]),.02],.06,{c:P.c3,a:.95}));
    const fr=f=>curve(f,.03);
    if(mode==='tree'){const f=m.f.tree[k],p0=k?m.f.tree[k-1]:null;if(p0)R.line(fr(p0),{c:P.c1,w:1.4,a:.35*(1-e),top:1});R.line(fr(f),{c:P.c1,w:2.8,a:p0?e:1,top:1})}
    else if(mode==='rf'){const show=Math.min(n,NB),prev=k?Math.min(STEPS.rf[k-1],NB):0;
      for(let j=0;j<show;j++){const a=j<prev?1:e,z=ZB(j),t=m.rf.trees[j].t,f=x=>t.predict(x);const fb=j?.4:.85;plate(R,z,P.c2,(j?.14:.22)*a);R.line(curve(f,z),{c:P.c2,w:j?1.2:1.5,a:fb*a});
        // each tree's prediction streams forward into the average, at a few times
        if(j<4)[8,16,22,32,45].forEach(tt=>R.flow([[XW(tt),YW(f([tt])),z],[XW(tt),YW(m.f.rf[k]([tt])),.03]],{c:P.c2,r:.04,n:3,speed:.8,a:(j?.35:.6)*a}))}
      if(n>NB)R.label([XW(0),YW(95),ZB(NB-1)],'+ '+(n-NB)+' more trees',{fs:12.5,b:1,c:mix(ink,P.c2,.6),al:'right',dx:-6,a:k>0&&STEPS.rf[k-1]>NB?1:e});
      const p0=k?m.f.rf[k-1]:null;if(p0)R.line(fr(p0),{c:P.c1,w:1.4,a:.35*(1-e),top:1});R.line(fr(m.f.rf[k]),{c:P.c1,w:2.8,a:p0?e:1,top:1})}
    else{const cur=m.f.gb[k],prev=x=>m.gb.predict(x,n-1),add=x=>.3*m.gb.stages[n-1].t.predict(x),z=-1.1;
      // residuals of the sum before this stage: what the new tree is fitted to
      Xtr.forEach((x,i)=>R.line([[XW(x[0]),YW(prev(x)),.02],[XW(x[0]),YW(ytr[i]),.02]],{c:P.mute,w:1,a:.5*(1-.6*e)}));
      R.line(fr(prev),{c:P.c1,w:1.4,a:.6,dash:[5,4],top:1});
      // the newest stage on its plate, drawn around its own zero line, streaming into the sum
      plate(R,z,P.c4,.28);R.line([[XW(0),YW(0),z],[XW(60),YW(0),z]],{c:P.c4,w:1,a:.5,dash:[3,3]});
      R.line(curve(x=>add(x),z).map(p=>[p[0],YW(0)+(p[1]-YW(0)),p[2]]),{c:P.c4,w:2.2,a:.95});
      [6,15,20,26,34,45].forEach(tt=>{const v=add([tt]);if(Math.abs(v)<1)return;R.flow([[XW(tt),YW(v),z],[XW(tt),YW(cur([tt])),.03]],{c:P.c4,r:.045,n:3,speed:.8,a:.8})});
      R.label([XW(0),YW(95),z],'stage '+n+': 0.3 × tree',{mono:true,fs:12.5,b:1,c:mix(ink,P.c4,.6),al:'right',dx:-6});
      R.line(fr(cur),{c:P.c1,w:2.8,a:e,top:1})}
    const er=m.err[mode][k];R.label([XW(30),YW(95),.03],'held-out error '+er[1].toFixed(0)+' g²',{mono:true,fs:12.5,b:1,c:mix(ink,P.c3,.5),dy:-12});
  }
  const st=S3.stage({id:'stg-en',list:LIST[mode],fig:'Fig. 2 · one tree, a forest and boosting on a real curve',cam:[.78,.4],bounds:[[-2.7,0,-3.8],[2.7,2.6,.2]],aspect:.62,dur:1400,hold:4800,draw,
    view:()=>$('stg-en').clientWidth<520?{cam:[.5,.42],bounds:[[-2.7,0,-2.6],[2.7,2.6,.2]]}:null,
    margin:w=>w<520?[22,10,14,10]:[28,18,18,120]});
  const seg=$('enM');if(seg)seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    Object.values(LIST).forEach(id=>$(id).hidden=id!==LIST[mode]);st.list(LIST[mode])});
})();
