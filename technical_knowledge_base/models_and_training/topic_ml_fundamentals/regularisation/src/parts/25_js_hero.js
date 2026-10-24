// ---- Reading, top: the hero. One network, same data and seed, trained with no regulariser and with dropout: train against test loss ----
// Curves recorded by train_digits.py (window.DIG.measures.seeds.*.curve_seed0: [epoch, train loss, test loss] every 10 epochs, eval mode).
(function(){
  const $=id=>document.getElementById(id);
  const el=$('hr-plot');if(!el)return;
  const S=DIG.measures.seeds,RUN={none:S.none.curve_seed0,drop:S.dropout.curve_seed0};let mode='none';
  const best=c=>c.reduce((a,q)=>q[2]<a[2]?q:a,c[0]);
  function draw(){
    $('hr-m').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===mode));
    const a=RUN[mode],o=RUN[mode==='none'?'drop':'none'],col=mode==='none'?'var(--c2)':'var(--c1)';
    const W=RD.width(el),narrow=W<520,last=a[a.length-1],bn=best(RUN.none);
    const lines=[{xs:o.map(q=>q[0]),ys:o.map(q=>q[1]),c:'var(--dim)',w:1.4},{xs:o.map(q=>q[0]),ys:o.map(q=>q[2]),c:'var(--dim)',w:1.4,dash:'5 3'},
      {xs:a.map(q=>q[0]),ys:a.map(q=>q[1]),c:col,w:2.4},{xs:a.map(q=>q[0]),ys:a.map(q=>q[2]),c:col,w:2.4,dash:'6 3'}];
    const segs=[{x1:300,y1:last[1],x2:300,y2:last[2],c:'var(--ink)',w:3}];
    const pts=mode==='none'?[{x:bn[0],y:bn[2],r:5,c:'var(--c3)',stroke:'var(--bg)'}]:[];
    const xl=narrow?120:200,at=q=>a.find(r=>r[0]===xl)[q];
    const txt=[{x:296,y:last[2]+0.03,s:'gap '+(last[2]-last[1]).toFixed(3),a:'end',c:'var(--ink)',b:1},
      {x:xl,y:at(2)+0.035,s:'test loss',c:col},{x:xl,y:Math.max(0.012,at(1)-0.04),s:'training loss',c:col}];
    if(mode==='none')txt.push({x:bn[0]+6,y:bn[2]-0.03,s:'lowest test loss, epoch '+bn[0]+(narrow?'':': early stopping keeps this'),c:'var(--c3)'});
    PL.chart({el,id:'hr',x:[0,300],y:[0,0.4],h:narrow?230:260,lines,segs,pts,txt,xl:'epoch',yl:'cross-entropy loss',label:'Training and test loss with and without dropout'});
    $('hr-cap').innerHTML=mode==='none'?'<b>No regulariser.</b> Training loss falls to '+last[1].toFixed(4)+' while test loss bottoms out at '+bn[2]+' (epoch '+bn[0]+') and climbs to '+last[2]+': the network has memorised its 1,437 training digits.':
      '<b>Dropout</b> (keep 0.8 of the inputs, 0.5 of each hidden layer). Training loss stays at '+last[1]+', test loss ends at '+last[2]+'; the gap is a third as wide. Grey: the unregularised run.';
  }
  $('hr-m').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;mode=b.dataset.v;draw()});
  RD.onRender(draw);addEventListener('resize',()=>{if(el.offsetParent)draw()});
})();
