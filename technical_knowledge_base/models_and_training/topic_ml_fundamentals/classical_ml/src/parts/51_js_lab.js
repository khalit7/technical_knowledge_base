// ---- Boundary lab tab (ids lb-) ----
window.LAB=(function(){
  const ds=document.getElementById('lb-ds'),dsn=document.getElementById('lb-dsn'),L=CD.lab;
  const ORDER=['moons','circles','xor','blobs','cancer'];
  ds.innerHTML=ORDER.map(k=>'<option value="'+k+'">'+L[k].name+(L[k].kind==='real'?' (real)':'')+'</option>').join('');
  const panes={A:{kind:'logreg',p:{}},B:{kind:'svmr',p:{}}};
  function defaults(kind){const o={};MR.MODELS[kind].par.forEach(([k,,lo,hi,def,t])=>{o[k]=t==='log'?(def==null?null:Math.pow(10,def)):def});return o}
  panes.A.p=defaults('logreg');panes.B.p=defaults('svmr');
  function sliderVal(t,v){return t==='log'?(v==null?0:Math.log10(v)):v}
  function build(id){const P=panes[id],el=document.getElementById('lb-p'+id),M=MR.MODELS;
    el.innerHTML='<h3>Model '+id+'</h3><div class="ctl2"><label><select id="lb-m'+id+'" aria-label="Model '+id+'">'+Object.entries(M).map(([k,v])=>'<option value="'+k+'"'+(k===P.kind?' selected':'')+'>'+v.name+'</option>').join('')+'</select></label></div>'+
      '<div class="ctl2" id="lb-c'+id+'">'+M[P.kind].par.map(([k,lab,lo,hi,def,t])=>'<label>'+lab+' <b id="lb-v'+id+k+'"></b><input type="range" id="lb-s'+id+k+'" min="'+lo+'" max="'+hi+'" step="'+(t==='log'?0.05:1)+'" value="'+sliderVal(t,P.p[k])+'" aria-label="'+lab+'"></label>').join('')+'</div>'+
      '<div class="cv" id="lb-cv'+id+'"></div><div class="out mini" id="lb-o'+id+'"></div>';
    document.getElementById('lb-m'+id).addEventListener('change',e=>{P.kind=e.target.value;P.p=defaults(P.kind);build(id);run(id)});
    M[P.kind].par.forEach(([k,,lo,hi,def,t])=>{const s=document.getElementById('lb-s'+id+k);
      s.addEventListener('input',()=>{const v=+s.value;P.p[k]=t==='log'?((k==='g'&&Math.abs(v)<0.025)?null:Math.pow(10,v)):v;label(id);sched(id)})});
    label(id)}
  function label(id){const P=panes[id];MR.MODELS[P.kind].par.forEach(([k,,lo,hi,def,t])=>{const v=P.p[k];document.getElementById('lb-v'+id+k).textContent=v==null?'scale':(t==='log'?(+v.toPrecision(2)).toString():(k==='depth'&&P.kind==='tree'&&v>=13?'none':String(v)))})}
  const timers={};function sched(id){clearTimeout(timers[id]);timers[id]=setTimeout(()=>run(id),90)}
  function run(id){const P=panes[id],d=L[ds.value],host=document.getElementById('lb-cv'+id);if(!host||host.offsetParent===null&&document.getElementById('t-lab').hidden)return;
    const o=MR.fit(d,P.kind,P.p);MR.draw(host,d,o);
    document.getElementById('lb-o'+id).innerHTML=RD.stat('training accuracy',RD.pct(o.train),d.Xtr.length+' points')+RD.stat('test accuracy',RD.pct(o.test),d.Xte.length+' unseen points')+o.info.map(([k,v])=>RD.stat(k,'<span style="font-size:13px">'+v+'</span>','')).join('')}
  function all(){dsn.textContent=L[ds.value].src;run('A');run('B')}
  ds.addEventListener('change',all);
  build('A');build('B');
  RD.onRender(()=>{});(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(all);
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!document.getElementById('t-lab').hidden)all()},200)});
  document.getElementById('lb-chk').innerHTML='Checked against scikit-learn 1.9.1 on all five datasets (src/check/check_ml.mjs, 41 &times; 41 grid of points each): logistic regression within 10<sup>&minus;7</sup> of LogisticRegression; kNN identical to KNeighborsClassifier; single trees identical to DecisionTreeClassifier at every depth (this code reproduces sklearn\'s feature-drawing generator, so ties break the same way); gradient boosting identical to GradientBoostingClassifier with depth-1 trees and within 0.035 in log-odds with depth 3 (floating-point near-ties); bagged trees identical to sklearn trees on the same bootstrap samples; SVM decision values within 0.013 of SVC (libsvm), whose solver, like this one, stops at tolerance 10<sup>&minus;3</sup>. The random forest with one feature per split draws its own random features, so it matches scikit-learn only in distribution (mean test accuracy over 10 seeds within 0.6 points on every dataset).';
  // presets from links elsewhere on the page: data-lab="dataset|kindA|kindB"
  document.addEventListener('click',e=>{const a=e.target.closest('a[data-lab]');if(!a)return;e.preventDefault();const [d,k1,k2]=a.dataset.lab.split('|');
    ds.value=d;panes.A.kind=k1;panes.A.p=defaults(k1);panes.B.kind=k2;panes.B.p=defaults(k2);build('A');build('B');
    document.querySelector('#tabs button[data-t="t-lab"]').click();document.getElementById('tabs').scrollIntoView({block:'start'})});
  return {panes,run,all};
})();
