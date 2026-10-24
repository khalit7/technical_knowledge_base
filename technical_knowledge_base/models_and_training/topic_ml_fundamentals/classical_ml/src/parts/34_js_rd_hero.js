// ---- Reading, top: the hero. Three model shapes fitted to the same 2-D points (card rd-he) ----
// Uses MR.fit and MR.draw (33_js_models.js), the same code as the Boundary lab; static until the reader changes the data.
(function(){
  const card=document.getElementById('rd-he');if(!card)return;
  const L=CD.lab,ORDER=['circles','moons','xor','cancer'],$=id=>document.getElementById(id);
  const K=[['logreg',{C:1},'Logistic regression','a weighted sum: one straight line'],
    ['tree',{depth:3},'One tree, depth 3','yes/no questions: an axis-aligned staircase'],
    ['gb',{stages:100,lr:0.1,depth:2},'Boosting, 100 trees of depth 2','a sum of small staircases']];
  $('rd-heD').innerHTML=ORDER.map(k=>'<option value="'+k+'">'+L[k].name+(L[k].kind==='real'?' (real)':'')+'</option>').join('');
  $('rd-heG').innerHTML=K.map((k,i)=>'<div class="he-p"><div class="he-h"><b>'+k[2]+'</b><br><span class="small mute">'+k[3]+'</span></div><div class="cv" id="rd-he'+i+'"></div><div class="he-s" id="rd-heS'+i+'"></div></div>').join('');
  const cache={};
  function fits(ds){if(!cache[ds])cache[ds]=K.map(k=>MR.fit(L[ds],k[0],k[1]));return cache[ds]}
  function draw(){if(card.offsetParent===null)return;const ds=$('rd-heD').value,d=L[ds],F=fits(ds);
    F.forEach((o,i)=>{MR.draw($('rd-he'+i),d,o,{ratio:innerWidth<560?0.68:0.9,n:48});
      $('rd-heS'+i).innerHTML='training <b>'+RD.pct(o.train)+'</b> &middot; held out <b class="hl">'+RD.pct(o.test)+'</b>'});
    $('rd-heN').textContent=d.src+'; '+d.Xtr.length+' training points (filled), '+d.Xte.length+' held out (hollow).'}
  $('rd-heD').addEventListener('change',draw);
  RD.onRender(draw);RD.onResize(draw);
})();
