// ---- Reading: GAN generator gradient, minimax against non-saturating ----
(function(){
  const card=document.getElementById('gn-card');if(!card)return;
  const $=id=>document.getElementById(id);
  let v=171;
  const lg=t=>-7+14*t/1000; // slider to discriminator logit
  function draw(){
    const l=lg(v),D=LF.sig(l);$('gn-dv').textContent=D<0.01?D.toFixed(4):D.toFixed(3);
    const ls=PL.range(-7,7,280),xs=ls.map(x=>Math.log10(LF.sig(x)));
    const lines=[{xs,ys:ls.map(x=>Math.abs(LF.GAN.minimax(x))),c:'var(--c2)'},{xs,ys:ls.map(x=>Math.abs(LF.GAN.ns(x))),c:'var(--c1)'}];
    const x=Math.log10(D),gm=Math.abs(LF.GAN.minimax(l)),gn=Math.abs(LF.GAN.ns(l));
    const pts=[{x,y:gm,r:5,c:'var(--c2)',stroke:'var(--bg)'},{x,y:gn,r:5,c:'var(--c1)',stroke:'var(--bg)'}];
    const txt=[{x:-2.9,y:0.9,s:'non-saturating, 1 − D',c:'var(--c1)'},{x:-2.9,y:0.1,s:'minimax, D',c:'var(--c2)'}];
    PL.chart({el:$('gn-svg'),id:'gn',x:[Math.log10(LF.sig(-7)),0],y:[0,1.05],lines,pts,txt,xt:[-3,-2,-1,0],xf:t=>String(Math.pow(10,t)).replace(/^0\.0*1$/,s=>s),yt:[0,0.5,1],
      xl:'D(G(z)), how likely the discriminator thinks the fake is real (log scale)',yl:'generator gradient',label:'Generator gradient against D(G(z)) for two losses'});
    $('gn-out').innerHTML=RD.stat('minimax, |d/dl log(1 − D)|',gm.toPrecision(3),'')+RD.stat('non-saturating, |d/dl (−log D)|',gn.toPrecision(3),'')+RD.stat('ratio',(gn/gm>=10?Math.round(gn/gm):(gn/gm).toFixed(2))+'×','non-saturating over minimax');
  }
  $('gn-d').value=v;$('gn-d').addEventListener('input',e=>{v=+e.target.value;draw()});
  RD.onRender(draw);draw();addEventListener('resize',()=>{if(card.offsetParent)draw()});
})();
