// ---- Reading 2: one tree grown depth by depth on the real breast-cancer pair (card rd-td) ----
(function(){
  const d=CD.lab.cancer,X=d.Xtr,y=d.ytr,DEP=[0,1,2,3,4,5,6,8,10,13];
  const acc=(f,A,b)=>A.filter((x,i)=>(f(x)>=0.5?1:0)===b[i]).length/A.length;
  const maj=d.ytr.reduce((a,b)=>a+b,0)/d.ytr.length;
  let cache=null;
  function models(){if(cache)return cache;cache=DEP.map(k=>{if(k===0)return {prob:()=>maj,leaves:1,nodes:[{leaf:true}]};
    const t=ML.tree(X,y,null,{maxDepth:k>=13?null:k});return {prob:x=>t.predict(x),leaves:t.leaves(),t}});
    cache.forEach(m=>{m.train=acc(m.prob,X,y);m.test=acc(m.prob,d.Xte,d.yte)});return cache}
  const nm=['mean radius','mean texture'];
  // reverse the standardisation for captions: raw value = z * sd + mean (train statistics, from load_breast_cancer)
  function cap(i){const M=models(),m=M[i],k=DEP[i];
    if(k===0)return ['Depth 0: one leaf, the majority class','Before any split the tree predicts benign for everyone: '+RD.pct(1-maj)+' of training tumours are benign. Gini impurity of the root is 1 &minus; p&sup2; &minus; (1 &minus; p)&sup2; = '+(1-maj*maj-(1-maj)**2).toFixed(3)+'.'];
    const nd=m.t.nodes,newS=nd.filter(n=>!n.leaf&&n.depth===k-1);
    if(k===1){const r=nd[0];return ['Depth 1: the best single question','The search tries every midpoint between neighbouring values of both features and keeps the one that lowers weighted Gini most: <b>'+nm[r.f]+' &le; '+r.th.toFixed(2)+'</b> (standardised), Gini '+r.imp.toFixed(3)+' &rarr; '+(r.imp-r.gain).toFixed(3)+'. One question already gets '+RD.pct(m.test)+' of unseen tumours right.']}
    if(k>=13)return ['No depth limit: every leaf pure','The tree keeps splitting until each leaf holds one class: '+m.leaves+' leaves, '+RD.pct(m.train)+' of training points right, and '+RD.pct(m.test)+' of test points: it has memorised the noise. The islands in the picture are single tumours.'];
    const best=M.reduce((a,b,j)=>b.test>M[a].test?j:a,0);
    return ['Depth '+k+': '+newS.length+' new split'+(newS.length===1?'':'s'),'Each leaf of the previous level is split again by the same greedy rule, on its own points only. '+m.leaves+' leaves; training accuracy '+RD.pct(m.train)+', test '+RD.pct(m.test)+'.'+(i===best?' This is the best test score of the run.':(i>best?' Test accuracy is now below its peak at depth '+DEP[best]+': deeper splits fit the training noise.':''))]}
  function draw(i){const host=document.getElementById('rd-tdV'),m=models()[i];
    MR.draw(host,d,{prob:m.prob},{ratio:0.72});
    const c=cap(i);document.getElementById('rd-tdT').innerHTML=c[0];document.getElementById('rd-tdP').innerHTML=c[1];
    document.getElementById('rd-tdN').innerHTML=RD.stat('depth',DEP[i]>=13?'none':String(DEP[i]))+RD.stat('leaves',String(m.leaves))+RD.stat('training accuracy',RD.pct(m.train))+RD.stat('test accuracy',RD.pct(m.test),'171 tumours never seen');
    // accuracy against depth
    const el=document.getElementById('rd-tdC'),w=RD.width(el),h=150,ctx=PL.cv(el,w,h),F=PL.frame([0,DEP.length-1,0.6,1.0],w,h,{l:40,r:10,t:8,b:30});
    PL.axes(ctx,F,{xt:DEP.map((v,j)=>j),xf:j=>DEP[j]>=13?'none':String(DEP[j]),yt:[0.6,0.7,0.8,0.9,1],yf:v=>Math.round(v*100)+'%',xl:'max depth'});
    [['train','--c4'],['test','--c3']].forEach(([k,c])=>{ctx.strokeStyle=PL.css(c);ctx.lineWidth=2;ctx.beginPath();models().forEach((mm,j)=>{const p=[F.X(j),F.Y(Math.max(0.6,mm[k]))];j?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.stroke();
      models().forEach((mm,j)=>PL.dot(ctx,F.X(j),F.Y(Math.max(0.6,mm[k])),j===i?4.5:2.5,PL.css(c)))});
    PL.text(ctx,'training',F.X(DEP.length-1)-4,F.Y(models()[DEP.length-1].train)+14,{a:'right',c:PL.css('--c4')});PL.text(ctx,'test',F.X(DEP.length-1)-4,F.Y(models()[DEP.length-1].test)+14,{a:'right',c:PL.css('--c3')});
    ctx.strokeStyle=PL.css('--line');ctx.beginPath();ctx.moveTo(F.X(i),F.pad.t);ctx.lineTo(F.X(i),F.pad.t+F.H);ctx.stroke()}
  const A=RD.anim({card:'rd-td',ctl:'rd-tdK',n:DEP.length,draw,ms:1700,label:'Tree depth'});
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!document.getElementById('t-read').hidden)A.redraw()},200)});
})();
