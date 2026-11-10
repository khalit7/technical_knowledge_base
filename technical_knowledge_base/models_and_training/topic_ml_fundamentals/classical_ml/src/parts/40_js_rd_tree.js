// ---- Reading 2: training and test accuracy of the tree against its depth on the real breast-cancer pair (card rd-td) ----
// The same fits as Fig. 1 (36_js_sc_tree.js); the marked depth follows the step Fig. 1 is on (window.CMLtd).
(function(){
  if(!document.getElementById('rd-td'))return;
  const d=CD.lab.cancer,X=d.Xtr,y=d.ytr,DEP=[0,1,2,3,4,5,6,8,10,13];
  const acc=(f,A,b)=>A.filter((x,i)=>(f(x)>=0.5?1:0)===b[i]).length/A.length;
  const maj=d.ytr.reduce((a,b)=>a+b,0)/d.ytr.length;
  let cache=null,cur=4;
  function models(){if(cache)return cache;cache=DEP.map(k=>{if(k===0)return {prob:()=>maj,leaves:1};
    const t=ML.tree(X,y,null,{maxDepth:k>=13?null:k});return {prob:x=>t.predict(x),leaves:t.leaves()}});
    cache.forEach(m=>{m.train=acc(m.prob,X,y);m.test=acc(m.prob,d.Xte,d.yte)});return cache}
  function draw(){const el=document.getElementById('rd-tdC');if(!el||el.offsetParent===null)return;const M=models(),i=Math.max(0,DEP.indexOf(cur));
    const w=RD.width(el),h=190,ctx=PL.cv(el,w,h),F=PL.frame([0,DEP.length-1,0.6,1.0],w,h,{l:40,r:10,t:10,b:32});
    PL.axes(ctx,F,{xt:DEP.map((v,j)=>j),xf:j=>DEP[j]>=13?'none':String(DEP[j]),yt:[0.6,0.7,0.8,0.9,1],yf:v=>Math.round(v*100)+'%',xl:'max depth'});
    ctx.strokeStyle=PL.css('--line');ctx.beginPath();ctx.moveTo(F.X(i),F.pad.t);ctx.lineTo(F.X(i),F.pad.t+F.H);ctx.stroke();
    [['train','--c4'],['test','--c3']].forEach(([k,c])=>{ctx.strokeStyle=PL.css(c);ctx.lineWidth=2;ctx.beginPath();M.forEach((mm,j)=>{const p=[F.X(j),F.Y(Math.max(0.6,mm[k]))];j?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.stroke();
      M.forEach((mm,j)=>PL.dot(ctx,F.X(j),F.Y(Math.max(0.6,mm[k])),j===i?5:2.5,PL.css(c)))});
    PL.text(ctx,'training',F.X(DEP.length-1)-4,F.Y(M[DEP.length-1].train)+14,{a:'right',c:PL.css('--c4')});PL.text(ctx,'test',F.X(DEP.length-1)-4,F.Y(M[DEP.length-1].test)+14,{a:'right',c:PL.css('--c3')});
    const best=M.reduce((a,b,j)=>b.test>M[a].test?j:a,0);PL.text(ctx,'best test: depth '+DEP[best],F.X(best),F.Y(M[best].test)+18,{a:'center',c:PL.css('--c3'),b:1});
    const m=M[i];document.getElementById('rd-tdN').innerHTML=RD.stat('depth',DEP[i]>=13?'none':String(DEP[i]))+RD.stat('leaves',String(m.leaves))+RD.stat('training accuracy',RD.pct(m.train))+RD.stat('test accuracy',RD.pct(m.test),'171 tumours never seen')}
  window.CMLtd=k=>{cur=k==null?13:k;draw()};
  RD.onRender(draw);RD.onResize(draw);
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[0].isIntersecting)draw()}).observe(document.getElementById('rd-td'));else draw();
})();
