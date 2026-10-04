// ---- Reading sections 11 and 13: the contraction chart and the state-space calculator ----
(function(){
  const D=window.DPE;
  // ---- contraction: two value-iteration runs on the 4x3 world ----
  (function(){
    const w=D.W.aima,P=document.getElementById('dp-ctP'),O=document.getElementById('dp-ctO'),S=document.getElementById('dp-ctG'),Gv=document.getElementById('dp-ctGv');
    const K=40;
    function draw(){const g=+S.value/100;Gv.textContent=g.toFixed(2);
      const a=D.init(w),b=D.init(w).map((v,s)=>w.term[s]?v:(g<1?-1/(1-g):-100));
      const rows=D.twoRuns(w,g,K,a,b),gap0=rows[0].dab;
      const W=RD.width(P),H=210,l=48,r=10,t=10,bt=26,lo=-12,hi=Math.log10(Math.max(rows[0].da,rows[0].db,gap0))+0.3;
      const X=k=>l+(W-l-r)*k/K,Y=v=>{const L=Math.log10(Math.max(v,1e-12));return t+(H-t-bt)*(hi-L)/(hi-lo)};let s='';
      for(let e=Math.ceil(lo);e<=Math.floor(hi);e+=2){const y=Y(Math.pow(10,e));s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(l-4,y+4,'10<tspan dy="-5" font-size="8">'+(e<0?'−'+(-e):e)+'</tspan>',{a:'end',fs:10,fill:'var(--mute)'})}
      [0,10,20,30].forEach(k=>{s+=RD.t(X(k),H-8,String(k),{a:'middle',fs:10,fill:'var(--mute)'})});s+=RD.t(W-r,H-8,'40 sweeps',{a:'end',fs:10,fill:'var(--mute)'});
      const line=(f,col,dash)=>'<polyline fill="none" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+' points="'+rows.map((x,k)=>X(k).toFixed(1)+','+Y(f(x,k)).toFixed(1)).join(' ')+'"/>';
      s+=line((x,k)=>gap0*Math.pow(g,k),'var(--mute)',true)+line(x=>x.da,'var(--c1)')+line(x=>x.db,'var(--c2)')+line(x=>x.dab,'var(--c4)');
      P.innerHTML=RD.svg(W,H,s,'Errors against sweeps, log scale');
      const viol=rows.slice(1).some((x,k)=>x.dab>g*rows[k].dab+1e-12);
      const hit=rows.findIndex(x=>x.da<1e-4);
      O.innerHTML=RD.stat('Sweeps to error 10<sup>−4</sup> from zeros',hit<0?'over '+K:String(hit),'4 × 3 world, synchronous')+
        RD.stat('Bound says, worst case',g<1?String(D.sweepsFor(g,1e-4/Math.max(rows[0].da,1e-12))):'no bound','γ<sup>k</sup> × starting error ≤ 10<sup>−4</sup>')+
        RD.stat('Contraction held every sweep',viol?'no':'yes','gap shrank by at least γ = '+g.toFixed(2))+
        RD.stat('Stop at a last change of 0.001',g<1?'error ≤ '+RD.n(D.stopBound(g,0.001),3):'no bound','γθ/(1 − γ)')}
    S.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();
  // ---- curse of dimensionality ----
  (function(){
    const ids=['D','V','M'],el={};ids.forEach(k=>{el[k]=document.getElementById('dp-cu'+k);el[k+'v']=document.getElementById('dp-cu'+k+'v')});const O=document.getElementById('dp-cuO');
    const big=x=>x<1e6?Math.round(x).toLocaleString('en-US'):RD.e(x,2);
    const time=ops=>{const s=ops/1e9;if(s<1)return 'under a second';if(s<3600)return RD.n(s,0)+' s';if(s<86400*365)return RD.n(s/3600,1)+' hours';const y=s/(86400*365.25);return y<1e6?Math.round(y).toLocaleString('en-US')+' years':RD.e(y,2)+' years'};
    function draw(){const d=+el.D.value,v=+el.V.value,m=+el.M.value;ids.forEach(k=>el[k+'v'].textContent=el[k].value);
      const c=D.curse(d,v,m,3);
      O.innerHTML=RD.stat('States n',big(c.n),v+'<sup>'+d+'</sup>')+RD.stat('Look-ups per sweep, dense',big(c.dense),'about '+time(c.dense)+' a sweep')+
        RD.stat('Look-ups per sweep, 3 successors',big(c.sparse),'about '+time(c.sparse)+' a sweep')+RD.stat('Deterministic policies',c.policies<6?big(Math.pow(10,c.policies)):'10<sup>'+(c.policies<1e6?Math.round(c.policies).toLocaleString('en-US'):RD.e(c.policies,2))+'</sup>','m<sup>n</sup>: what DP avoids enumerating')}
    ids.forEach(k=>el[k].addEventListener('input',draw));draw();
  })();
})();
