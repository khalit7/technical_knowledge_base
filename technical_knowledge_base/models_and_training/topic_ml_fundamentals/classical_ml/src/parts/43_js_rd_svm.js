// ---- Reading 5: the SVM's margin as C grows, linear kernel against RBF kernel on the same points (card rd-sv) ----
(function(){
  const d=CD.lab.moons,CS=[0.01,0.03,0.1,0.3,1,3,10,30,100],cache={};let kern='linear';
  const seg=document.getElementById('rd-svM');
  seg.innerHTML='<button data-k="linear" class="on">Linear kernel (a straight line)</button><button data-k="svmr">RBF kernel, gamma = scale</button>';
  function get(i){const key=kern+i;if(!cache[key])cache[key]=MR.fit(d,kern==='linear'?'svml':'svmr',{C:CS[i],g:null});return cache[key]}
  function draw(i){const o=get(i),m=o.svm,host=document.getElementById('rd-svV');MR.draw(host,d,o,{ratio:0.68});
    const at=m.bounded,free=m.sv.length-at;
    document.getElementById('rd-svT').innerHTML='C = '+CS[i]+(kern==='linear'?', linear kernel':', RBF kernel');
    document.getElementById('rd-svP').innerHTML=(i===0?'With a tiny C, violations are cheap: the solver buys a wide margin (dashed lines, where the score is &plusmn;1) and lets most points sit inside it. Every point on or inside the margin is a support vector (ringed); the rest could be deleted without changing the answer.':
      i<4?'Raising C makes each violation dearer, so the margin narrows and fewer points sit inside it.':
      kern==='linear'?'Past C of about 3 nothing changes: the best straight line is found, and the moons are not linearly separable, so '+RD.pct(1-o.train)+' of training points stay on the wrong side whatever C is. A wider C range cannot fix the wrong shape of boundary; a kernel can.':
      'With the kernel the boundary bends around the moons. Large C trusts every training point: the boundary starts wrapping single points and the support vectors thin out.')+' Support vectors: '+free+' on the margin, '+at+' inside it or misclassified (&alpha; = C).';
    document.getElementById('rd-svN').innerHTML=RD.stat('support vectors',m.sv.length+' of '+d.Xtr.length)+(m.w?RD.stat('margin width 2/||w||',(2/Math.hypot(m.w[0],m.w[1])).toFixed(2),'standardised units'):RD.stat('gamma',MR.gscale(d.Xtr).toFixed(3),'1 / (2 &times; Var(X))'))+RD.stat('training accuracy',RD.pct(o.train))+RD.stat('test accuracy',RD.pct(o.test),d.Xte.length+' unseen points')}
  const A=RD.anim({card:'rd-sv',ctl:'rd-svC',n:CS.length,draw,ms:1500,label:'C'});
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;kern=b.dataset.k;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(CS.length);A.play()});
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!document.getElementById('t-read').hidden)A.redraw()},200)});
})();
