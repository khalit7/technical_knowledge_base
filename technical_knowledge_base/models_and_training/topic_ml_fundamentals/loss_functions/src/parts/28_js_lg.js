// ---- Reading, cross entropy: the same logits under four losses, the gradient on every logit (before/after on one input) ----
(function(){
  const card=document.getElementById('lg-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const Z=[3.0,1.5,0.5,-0.5,-1.5],NM=['cat','dog','fox','owl','car'];
  const LN={ce:'Cross entropy',ls:'Label smoothing, ε = 0.1',focal:'Focal, γ = 2',brier:'MSE on probabilities'};
  const st={t:0,k:'ls'};
  const run=(k,t)=>LF.logitLoss(k,Z,t,{eps:0.1,g:2});
  const f3=v=>(Math.abs(v)<0.0005?0:v).toFixed(3).replace('-','−');
  function bars(el,r,t,scale){
    const W=Math.max(240,Math.min(420,RD.width(el))),rowH=26,H=NM.length*rowH+24,x0=64,x1=W-48,mid=(x0+x1)/2,half=(x1-x0)/2;
    let s='<line x1="'+mid+'" x2="'+mid+'" y1="4" y2="'+(H-18)+'" stroke="var(--dim)"/>';
    NM.forEach((n,k)=>{const y=6+k*rowH,v=-r.grad[k],w=half*Math.min(1,Math.abs(v)/scale),xa=v>=0?mid:mid-w;
      s+=RD.t(x0-6,y+15,n+' '+(r.p[k]).toFixed(3),{a:'end',fill:k===t?'var(--ink)':'var(--mute)',w:k===t?600:null});
      s+='<rect x="'+xa+'" y="'+(y+3)+'" width="'+Math.max(0.5,w)+'" height="'+(rowH-9)+'" rx="2" fill="'+(v>=0?'var(--c1)':'var(--c2)')+'"'+(k===t?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>';
      s+=RD.t(v>=0?Math.min(x1+4,mid+w+4):mid+4,y+15,f3(v),{fill:'var(--ink)'})});
    s+=RD.t(mid-4,H-4,'← lower',{a:'end',fill:'var(--mute)'})+RD.t(mid+4,H-4,'raise →',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Gradient on each logit');
  }
  function draw(){
    const a=run('ce',st.t),b=run(st.k,st.t);
    const scale=Math.max(...a.grad.map(Math.abs),...b.grad.map(Math.abs));
    bars($('lg-a'),a,st.t,scale);bars($('lg-b'),b,st.t,scale);$('lg-h').innerHTML=LN[st.k]+' <small>on the same logits</small>';
    const ga=-a.grad[st.t],gb=-b.grad[st.t],ratio=ga/gb;
    $('lg-out').innerHTML=RD.stat('loss: cross entropy',a.loss.toFixed(3),'nats')+RD.stat('loss: '+LN[st.k],b.loss.toFixed(3),'')+
      RD.stat('push on the right logit',f3(ga)+' vs '+f3(gb),'cross entropy vs '+LN[st.k].split(',')[0].toLowerCase())+
      RD.stat('ratio',(Math.abs(ratio)>=10?Math.round(ratio):ratio.toFixed(2))+'×','cross entropy over the other');
    const easy=st.t===0,K={
      ls:easy?'Smoothing stops short of certainty: the cat logit gets '+f3(gb)+' instead of '+f3(ga)+', and the car logit is pushed <b>up</b>, because its probability 0.008 is below the target ε/K = 0.02.':'On a wrong example smoothing changes little: the target moves only 0.1 of the mass, so the push on the car logit is '+f3(gb)+' against '+f3(ga)+'.',
      focal:easy?'Focal loss multiplies by (1 − p)² ≈ 0.07 and more: the easy cat gets '+f3(gb)+', '+(ga/gb).toFixed(1)+' times less than cross entropy. The gradient budget leaves the easy examples.':'On the hard example focal loss pushes as hard as cross entropy ('+f3(gb)+' against '+f3(ga)+'): (1 − p)² is nearly 1 when p = 0.008.',
      brier:easy?'On the easy example squared error on probabilities pushes about half as hard as cross entropy ('+f3(gb)+').':'Squared error on probabilities pushes the car logit only '+f3(gb)+', '+Math.round(ga/gb)+' times less than cross entropy: the softmax slope p(1 − p) is nearly 0 at p = 0.008 and nothing cancels it. The worst example learns least.'};
    $('lg-cap').innerHTML='<div class="t">'+(easy?'Easy: the model already gives the cat 0.743':'Confidently wrong: the car has 0.008')+'</div>'+K[st.k];
  }
  RD.seg($('lg-in'),m=>{st.t=+m;draw()});RD.seg($('lg-l'),m=>{st.k=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
