// ---- Reading section 7, closed block: the gambler's problem (moved from the Sweep lab on 2026-10-24) ----
(function(){
  const D=window.DPE,$=id=>document.getElementById(id);if(!$('dp-gm'))return;
  (function(){const P1=$('dp-gmV'),P2=$('dp-gmP'),T=$('dp-gmT'),S=$('dp-gmS');let R=null;
    function draw(){const ph=+S.value;R=R&&R.ph===ph?R:Object.assign(D.gambler(ph,100000,1e-12),{ph});
      const W=RD.width(P1),l=40,r=10,t=8,b=22,H=170,X=s=>l+(W-l-r)*(s-1)/98;let s='';
      const Y=v=>t+(H-t-b)*(1-v);[0,0.5,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,String(v),{a:'end',fs:10,fill:'var(--mute)'})});
      const pl=(V,col,wd)=>'<polyline fill="none" stroke="'+col+'" stroke-width="'+wd+'" points="'+V.slice(1,100).map((v,i)=>X(i+1).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
      [1,2,3].forEach(k=>{if(R.hist[k])s+=pl(R.hist[k],'var(--dim)',1.5)});s+=pl(R.V,'var(--c1)',2);
      [1,25,50,75,99].forEach(c=>{s+=RD.t(X(c),H-6,String(c),{a:'middle',fs:10,fill:'var(--mute)'})});s+=RD.t(l+2,t+10,'value (probability of winning)',{fs:10,fill:'var(--mute)'});
      P1.innerHTML=RD.svg(W,H,s,'Gambler value function');
      const H2=170,mx=50,Y2=v=>t+(H2-t-b)*(1-v/mx);let q='';[0,25,50].forEach(v=>{q+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y2(v)+'" y2="'+Y2(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y2(v)+4,String(v),{a:'end',fs:10,fill:'var(--mute)'})});
      R.ties.forEach((ts,i)=>{ts.slice(1).forEach(a=>{q+='<circle cx="'+X(i+1).toFixed(1)+'" cy="'+Y2(a).toFixed(1)+'" r="1.6" fill="var(--dim)"/>'});q+='<circle cx="'+X(i+1).toFixed(1)+'" cy="'+Y2(ts[0]).toFixed(1)+'" r="2.2" fill="var(--c2)"/>'});
      [1,25,50,75,99].forEach(c=>{q+=RD.t(X(c),H2-6,String(c),{a:'middle',fs:10,fill:'var(--mute)'})});q+=RD.t(l+2,t+10,'stake',{fs:10,fill:'var(--mute)'})+RD.t(W-r,t+10,'capital',{a:'end',fs:10,fill:'var(--mute)'});
      P2.innerHTML=RD.svg(W,H2,q,'Gambler optimal stakes');
      const multi=R.ties.filter(x=>x.length>1).length;
      T.innerHTML='p<sub>h</sub> = '+ph+': converged after '+(R.hist.length-1)+' in-place sweeps. V(50) = '+RD.n(R.V[50],4)+'; smallest optimal stake at 50 is '+R.pol[49]+', at 51 it is '+R.pol[50]+'. '+multi+' of the 99 capitals have more than one optimal stake.'}
    S.addEventListener('change',draw);document.getElementById('dp-gm').addEventListener('toggle',draw);RD.onRender(draw);RD.onResize(draw);draw()})();

})();
