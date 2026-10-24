// ---- Reading, top: the hero. Static pull curves (regression against the error, classification against the margin), labels on the figure ----
(function(){
  const card=document.getElementById('hr-card');if(!card)return;
  const $=id=>document.getElementById(id);
  function draw(){
    const narrow=RD.width($('hr-r'))<360;
    const us=PL.range(-3,3,300),p={delta:1};
    PL.chart({el:$('hr-r'),id:'hrr',h:narrow?210:230,x:[-3,3],y:[-3.2,3.2],xl:'error u',yl:'pull ψ(u)',yt:[-2,0,2],xt:[-3,-1,0,1,3],
      lines:[{xs:us,ys:us.map(u=>LF.REG.mse.psi(u)),c:'var(--c1)',w:2.4},{xs:us,ys:us.map(u=>LF.REG.huber.psi(u,p)),c:'var(--c3)',w:2.4},{xs:us,ys:us.map(u=>LF.REG.mae.psi(u)),c:'var(--c2)',w:2,dash:'5 3'}],
      txt:[{x:-0.6,y:-2.6,s:'MSE: 2u',c:'var(--c1)',b:1},{x:2.9,y:1.32,s:'Huber: capped',c:'var(--c3)',b:1,a:'end'},{x:2.9,y:0.62,s:'MAE: 1 for all',c:'var(--c2)',b:1,a:'end'}],
      label:'Pull against the error for MSE, Huber and MAE'});
    const ms=PL.range(-4,4,400);
    PL.chart({el:$('hr-c'),id:'hrc',h:narrow?210:230,x:[-4,4],y:[-0.1,3.2],xl:'margin m (wrong ← 0 → right)',yl:'pull',yt:[0,1,2,3],xt:[-4,-2,0,2,4],
      lines:[{xs:ms,ys:ms.map(m=>LF.MARG.exp.pull(m)),c:'var(--c4)',w:2.2},{xs:ms,ys:ms.map(m=>LF.MARG.hinge.pull(m)),c:'var(--c2)',w:2,dash:'5 3'},
        {xs:ms,ys:ms.map(m=>LF.MARG.logistic.pull(m)),c:'var(--c1)',w:2.4},{xs:ms,ys:ms.map(m=>LF.MARG.focal.pull(m,2)),c:'var(--c3)',w:2.4}],
      txt:[{x:-1.0,y:2.85,s:'exponential: e⁻ᵐ',c:'var(--c4)',b:1,a:'start'},{x:-1.9,y:1.33,s:'hinge',c:'var(--c2)',b:1},{x:1.15,y:0.62,s:'cross entropy',c:'var(--c1)',b:1,a:'start'},{x:-3.9,y:0.45,s:'focal γ = 2',c:'var(--c3)',b:1,a:'start'}],
      label:'Pull against the margin for exponential, hinge, cross entropy and focal losses'});
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
