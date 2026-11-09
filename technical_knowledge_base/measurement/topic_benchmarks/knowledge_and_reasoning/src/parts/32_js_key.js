// ---- MMLU's defect map (data: window.KR; the Fix the key re-grade is the 3D stage in 36_js_sc_key.js) ----
(function(){
  const K=window.KR,R=K.redux;
  const TYPES=[['w','wrong key','var(--bad)'],['n','no correct option','var(--c5)'],['m','several correct','var(--c4)'],['q','unclear question','var(--c6)'],['p','unclear options','var(--c1)'],['e','needs an expert','var(--mute)']];
  const TC={};TYPES.forEach(([c,n,col])=>TC[c]=col);
  // ---- defect map ----
  const map=document.getElementById('ky-map'),mout=document.getElementById('ky-mapout');
  document.getElementById('ky-mapleg').innerHTML=TYPES.map(([c,n,col])=>'<span><i style="background:'+col+'"></i>'+n+'</span>').join('');
  let sort='rate',N=20,sel='virology';
  const fl=s=>Object.values(s.c).reduce((a,b)=>a+b,0);
  function drawMap(){
    const S=R.subjects.slice().map(s=>({s,f:fl(s),est:fl(s)/s.n*s.t}));
    S.sort((a,b)=>sort==='rate'?b.f-a.f:b.est-a.est);
    const mx=sort==='rate'?60:Math.max(...S.map(x=>x.est));
    map.innerHTML=S.slice(0,N).map(({s,f,est})=>{const scale=sort==='rate'?100/mx:100/mx*(s.t/s.n);
      return '<div class="row'+(s.k===sel?' sel':'')+'" data-k="'+s.k+'" role="button" tabindex="0"><span class="nm">'+s.k.replace(/_/g,' ')+'</span><span class="st">'+TYPES.map(([c,n,col])=>s.c[c]?'<span style="width:'+(s.c[c]*scale).toFixed(2)+'%;background:'+col+'" title="'+n+': '+s.c[c]+'"></span>':'').join('')+'</span><span class="vl">'+(sort==='rate'?f+'%':Math.round(est))+'</span></div>'}).join('');
    const s=R.subjects.find(x=>x.k===sel),f=fl(s);
    mout.innerHTML=KU.stat(sel.replace(/_/g,' '),f+' of 100 flagged','test set: '+s.t+' questions')+TYPES.filter(([c])=>s.c[c]).map(([c,n])=>KU.stat(n,s.c[c])).join('')+
      KU.stat('Estimated flawed test questions',Math.round(f/100*s.t),'derived: share × '+s.t);
  }
  map.addEventListener('click',e=>{const r=e.target.closest('.row');if(!r)return;sel=r.dataset.k;drawMap()});
  map.addEventListener('keydown',e=>{if(e.key==='Enter'){const r=e.target.closest('.row');if(r){sel=r.dataset.k;drawMap()}}});
  KU.seg(document.getElementById('ky-sort'),m=>{sort=m;drawMap()});
  KU.seg(document.getElementById('ky-n'),m=>{N=+m;drawMap()});
  drawMap();
})();
