// ---- Reading 3: one deep tree, bagging and boosting on the same real curve (motorcycle crash data), card rd-en ----
(function(){
  const mc=CD.mcycle,te=mc.x.map((_,i)=>i%4===3);
  const Xtr=[],ytr=[],Xte=[],yte=[];mc.x.forEach((v,i)=>{if(te[i]){Xte.push([v]);yte.push(mc.y[i])}else{Xtr.push([v]);ytr.push(mc.y[i])}});
  const STEPS={tree:[1,2,3,4,5,6,8,13],rf:[1,2,3,5,10,20,50,100,200],gb:[1,2,3,5,10,20,50,100,200]};
  const mse=(f,X,y)=>X.reduce((a,x,i)=>a+(f(x)-y[i])**2,0)/X.length;
  let M=null;
  function fitAll(){if(M)return M;M={};
    M.trees=STEPS.tree.map(k=>ML.tree(Xtr,ytr,null,{task:'reg',maxDepth:k>=13?null:k}));
    M.rf=ML.forest(Xtr,ytr,{task:'reg',nTrees:200,seed:1});
    M.gb=ML.gboost(Xtr,ytr,{task:'reg',nStages:200,lr:0.3,maxDepth:2,seeds:ML.SK_SEEDS});
    M.err={tree:M.trees.map(t=>[mse(x=>t.predict(x),Xtr,ytr),mse(x=>t.predict(x),Xte,yte)]),
      rf:STEPS.rf.map(k=>[mse(x=>M.rf.predict(x,k),Xtr,ytr),mse(x=>M.rf.predict(x,k),Xte,yte)]),
      gb:STEPS.gb.map(k=>[mse(x=>M.gb.predict(x,k),Xtr,ytr),mse(x=>M.gb.predict(x,k),Xte,yte)])};
    return M}
  let mode='gb';
  const seg=document.getElementById('rd-enM');
  seg.innerHTML=[['tree','One tree, growing'],['rf','Random forest: average trees'],['gb','Gradient boosting: fit the residuals']].map(([k,t])=>'<button data-m="'+k+'"'+(k===mode?' class="on"':'')+'>'+t+'</button>').join('');
  const curve=(ctx,F,f,c,lw,dash)=>{ctx.save();ctx.strokeStyle=c;ctx.lineWidth=lw;if(dash)ctx.setLineDash(dash);ctx.beginPath();for(let k=0;k<=360;k++){const x=k/6;const p=[F.X(x),F.Y(Math.max(-150,Math.min(90,f([x]))))];k?ctx.lineTo(...p):ctx.moveTo(...p)}ctx.stroke();ctx.restore()};
  function draw(i){const m=fitAll(),n=STEPS[mode][i],el=document.getElementById('rd-enV'),w=RD.width(el),h=Math.round(Math.min(380,w*0.62)),strip=mode==='gb'?70:0;
    const ctx=PL.cv(el,w,h+strip),F=PL.frame([0,60,-150,90],w,h,{l:40,r:8,t:8,b:30});
    PL.axes(ctx,F,{xt:[0,10,20,30,40,50,60],yt:[-150,-100,-50,0,50],xl:'time after impact (ms)',yl:'acceleration (g)'});
    const ink=PL.css('--ink'),c1=PL.css('--c1'),c2=PL.css('--c2'),mute=PL.css('--mute');
    if(mode==='gb'){const prev=x=>m.gb.predict(x,n-1),cur=x=>m.gb.predict(x,n);
      ctx.strokeStyle=PL.css('--dim');ctx.lineWidth=1;Xtr.forEach((x,j)=>{ctx.beginPath();ctx.moveTo(F.X(x[0]),F.Y(prev(x)));ctx.lineTo(F.X(x[0]),F.Y(ytr[j]));ctx.stroke()});
      curve(ctx,F,prev,mute,1.5,[5,4]);curve(ctx,F,cur,c1,2.6);
      // strip: what this stage added (learning rate x tree n), on its own axis
      const t=m.gb.stages[n-1].t,G=PL.frame([0,60,-60,60],w,h+strip,{l:40,r:8,t:h+6,b:4});
      ctx.strokeStyle=PL.css('--line');ctx.strokeRect(G.pad.l,G.pad.t,G.W,G.H);ctx.beginPath();ctx.moveTo(G.X(0),G.Y(0));ctx.lineTo(G.X(60),G.Y(0));ctx.stroke();
      ctx.strokeStyle=c2;ctx.lineWidth=2;ctx.beginPath();for(let k=0;k<=360;k++){const x=k/6,v=Math.max(-60,Math.min(60,0.3*t.predict([x])));k?ctx.lineTo(G.X(x),G.Y(v)):ctx.moveTo(G.X(x),G.Y(v))}ctx.stroke();
      PL.text(ctx,'added at stage '+n+': 0.3 × tree '+n+' (fitted to the grey residuals)',G.pad.l+6,G.pad.t+12,{c:c2})}
    else if(mode==='rf'){const show=Math.min(n,12);for(let k=0;k<show;k++){const t=m.rf.trees[k].t;curve(ctx,F,x=>t.predict(x),c2,1,null);}
      ctx.globalAlpha=1;curve(ctx,F,x=>m.rf.predict(x,n),c1,2.6)}
    else{const t=m.trees[i];curve(ctx,F,x=>t.predict(x),c1,2.4)}
    Xtr.forEach((x,j)=>PL.dot(ctx,F.X(x[0]),F.Y(ytr[j]),2.6,ink));Xte.forEach((x,j)=>PL.dot(ctx,F.X(x[0]),F.Y(yte[j]),3,PL.css('--bg'),PL.css('--c3'),1.6));
    const e=m.err[mode][i],e0=m.err[mode];
    const bestI=e0.reduce((a,b,j)=>b[1]<e0[a][1]?j:a,0);
    const C={tree:['One tree, max depth '+(n>=13?'none':n),'A single regression tree predicts the mean of the training points in each leaf, so its curve is a staircase. '+(i===bestI?'This depth gives the lowest held-out error of the run.':(i>bestI?'Deeper than depth '+STEPS.tree[bestI]+' it starts chasing single readings: training error keeps falling, held-out error does not.':'Too shallow: the steps are too coarse to follow the dip and rebound (high bias).'))],
      rf:[n+' tree'+(n>1?'s':'')+', averaged','Each orange curve is a full-depth tree grown on a bootstrap sample (drawn with replacement) of the 100 training readings; they disagree wildly where data are sparse. Their average (blue) is smoother than any of them: averaging cuts variance. '+(n>=50?'Past about 50 trees the average barely moves: more trees never make a forest worse, they only stop helping.':'')],
      gb:['Stage '+n+' of gradient boosting','Each stage fits a small tree (depth 2) to the residuals left by the stages before (grey bars from the dashed curve), and adds 0.3 of it. '+(n<=5?'Early stages remove the big systematic error: boosting cuts bias.':(i>bestI?'Held-out error was lowest at '+STEPS.gb[bestI]+' stages; later stages fit noise in the 100 training readings. Boosting needs early stopping; a forest does not.':'The curve now follows the dip and the rebound.'))]}[mode];
    document.getElementById('rd-enT').innerHTML=C[0];document.getElementById('rd-enP').innerHTML=C[1];
    document.getElementById('rd-enN').innerHTML=RD.stat(mode==='tree'?'depth':mode==='rf'?'trees':'stages',n>=13&&mode==='tree'?'none':String(n))+RD.stat('training error (MSE)',e[0].toFixed(0),'g&sup2;, 100 readings')+RD.stat('held-out error (MSE)',e[1].toFixed(0),'g&sup2;, 33 readings')+RD.stat('best held-out in this mode',e0[bestI][1].toFixed(0),'at '+(mode==='tree'?'depth ':'')+STEPS[mode][bestI]+(mode==='rf'?' trees':mode==='gb'?' stages':''))}
  const A=RD.anim({card:'rd-en',ctl:'rd-enC',n:STEPS[mode].length,draw,ms:1500,label:'Step'});
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(STEPS[mode].length);A.play()});
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!document.getElementById('t-read').hidden)A.redraw()},200)});
})();
