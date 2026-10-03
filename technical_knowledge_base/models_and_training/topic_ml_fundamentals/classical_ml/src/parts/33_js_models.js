// ---- MR: fit one of the seven classifiers on a 2-D dataset and describe it (shared by the Boundary lab and Reading) ----
window.MR=(function(){
  const M=window.ML;
  const MODELS={
    logreg:{name:'Logistic regression',par:[['C','C (inverse L2 strength)',-2,2,0,'log']]},
    knn:{name:'k nearest neighbours',par:[['k','k',1,51,15,'int']]},
    tree:{name:'Decision tree',par:[['depth','max depth (13 = no limit)',1,13,3,'int']]},
    rf:{name:'Random forest',par:[['trees','trees',1,200,100,'int'],['mf','features tried per split',1,2,1,'int']]},
    gb:{name:'Gradient boosting',par:[['stages','stages',1,300,50,'int'],['lr','learning rate',-2,0,-1,'log'],['depth','tree depth',1,5,3,'int']]},
    svml:{name:'SVM, linear kernel',par:[['C','C',-2,2,0,'log']]},
    svmr:{name:'SVM, RBF kernel',par:[['C','C',-2,3,0,'log'],['g','gamma (0 on the slider = sklearn "scale")',-2,2,null,'log']]}
  };
  const acc=(f,X,y)=>X.filter((x,i)=>(f(x)>=0.5?1:0)===y[i]).length/X.length;
  function gscale(X){const v=X.flat(),m=v.reduce((a,b)=>a+b,0)/v.length;return 1/(2*v.reduce((a,b)=>a+(b-m)**2,0)/v.length)}
  function fit(d,kind,p){
    const X=d.Xtr,y=d.ytr,o={kind,info:[]};
    if(kind==='logreg'){const m=M.logreg(X,y,p.C);o.prob=x=>m.predict(x);o.info.push(['weights','('+m.coef[0].toFixed(2)+', '+m.coef[1].toFixed(2)+'), bias '+m.b0.toFixed(2)])}
    else if(kind==='knn'){const m=M.knn(X,y,p.k);o.prob=x=>m.predict(x);o.info.push(['training','none: it stores '+X.length+' points'])}
    else if(kind==='tree'){const m=M.tree(X,y,null,{maxDepth:p.depth>=13?null:p.depth});o.prob=x=>m.predict(x);o.info.push(['leaves',String(m.leaves())],['depth reached',String(m.depth())])}
    else if(kind==='rf'){const m=M.forest(X,y,{nTrees:p.trees,maxFeatures:p.mf>=2?null:1,seed:1});o.prob=x=>m.predict(x);
      let c=0,k=0;X.forEach((x,i)=>{const v=m.oob(i,x);if(v!=null){k++;if((v>=0.5?1:0)===y[i])c++}});o.info.push(['out-of-bag accuracy',k?RD.pct(c/k)+' on '+k+' points':'n/a'],['leaves, mean per tree',(m.trees.reduce((a,t)=>a+t.t.leaves(),0)/m.trees.length).toFixed(1)])}
    else if(kind==='gb'){const m=M.gboost(X,y,{nStages:p.stages,lr:p.lr,maxDepth:p.depth,seeds:M.SK_SEEDS});o.prob=x=>m.predict(x);
      const ll=-X.reduce((a,x,i)=>{const q=Math.min(1-1e-15,Math.max(1e-15,m.predict(x)));return a+(y[i]?Math.log(q):Math.log(1-q))},0)/X.length;o.info.push(['training log-loss',ll.toFixed(3)],['trees',String(p.stages)])}
    else{const g=kind==='svml'?null:(p.g==null?gscale(X):p.g);const m=M.svm(X,y,{kernel:kind==='svml'?'linear':'rbf',C:p.C,gamma:g});
      o.dec=x=>m.decision(x);o.prob=x=>M.sig(2*m.decision(x));o.sv=m.sv;o.svm=m;
      o.info.push(['support vectors',m.sv.length+' of '+X.length+' ('+m.bounded+' at the bound C)']);if(g)o.info.push(['gamma',g.toPrecision(3)]);
      if(m.w){const nw=Math.hypot(m.w[0],m.w[1]);o.info.push(['margin width 2/||w||',(2/nw).toFixed(2)])}}
    o.train=acc(o.prob,X,y);o.test=acc(o.prob,d.Xte,d.yte);return o}
  // draw a fitted model on a canvas host element
  function draw(host,d,o,opt){opt=opt||{};const w=Math.max(220,host.clientWidth||RD.width(host)),h=Math.min(opt.maxH||460,Math.round(w*(opt.ratio||0.82)));
    const ctx=PL.cv(host,w,h),b=PL.bounds(d.Xtr.concat(d.Xte),0.3);{const rx=b[1]-b[0],ry=b[3]-b[2],ar=w/h;if(rx/ry<ar){const e=(ry*ar-rx)/2;b[0]-=e;b[1]+=e}else{const e=(rx/ar-ry)/2;b[2]-=e;b[3]+=e}}const F=PL.frame(b,w,h,{l:4,r:4,t:4,b:4});
    PL.heat(ctx,F,(a,c)=>o.prob([a,c]),opt.n||56);
    if(o.dec){PL.contour(ctx,F,(a,c)=>o.dec([a,c]),48,1,PL.css('--mute'),[4,3]);PL.contour(ctx,F,(a,c)=>o.dec([a,c]),48,-1,PL.css('--mute'),[4,3]);PL.contour(ctx,F,(a,c)=>o.dec([a,c]),48,0,PL.css('--ink'))}
    else PL.contour(ctx,F,(a,c)=>o.prob([a,c])-0.5,48,0,PL.css('--ink'));
    PL.points(ctx,F,d.Xtr,d.ytr,{r:w<360?2.6:3.2});PL.points(ctx,F,d.Xte,d.yte,{hollow:true,r:w<360?2.6:3.2});
    if(o.sv)o.sv.forEach(i=>PL.dot(ctx,F.X(d.Xtr[i][0]),F.Y(d.Xtr[i][1]),6,null,PL.css('--ink'),1.2));
    ctx.strokeStyle=PL.css('--line');ctx.strokeRect(0.5,0.5,w-1,h-1);return F}
  return {MODELS,fit,draw,gscale};
})();
