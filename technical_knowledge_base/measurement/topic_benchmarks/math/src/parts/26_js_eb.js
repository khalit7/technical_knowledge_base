// ---- Reading: 95% half-width by item count for the math sets, one accuracy slider (values checked against recompute.py) ----
(function(){
  const el=document.getElementById('eb-svg'),sl=document.getElementById('eb-p');if(!el||!sl||!window.RD)return;
  // name, short name (phone width), number of items
  const SETS=[['AIME, one year','AIME',30],['HMMT February 2026','HMMT 26',33],['FrontierMath Tier 4 v2, private','FM T4',41],['One GSM-Symbolic set','GSM-Sym set',100],['miniF2F test','miniF2F',244],['FrontierMath T1-3 v2, private','FM T1-3',285],['MATH-500','MATH-500',500],['GSM8K test','GSM8K',1319],['MATH Level 5','MATH L5',1324]];
  const MX=18;
  function draw(){const W=RD.width(el),wide=W>=560,p=+sl.value/100;
    document.getElementById('eb-pv').textContent=(+sl.value).toFixed(1).replace(/\.0$/,'')+'%';
    const lw=wide?230:112,vr=52,x0=lw,x1=W-vr,sc=v=>x0+(x1-x0)*Math.min(v,MX)/MX,rh=20;let b='',y=16;
    [0,5,10,15].forEach(v=>{b+=RD.t(sc(v),10,'±'+v,{a:'middle',fill:'var(--mute)'})+'<line x1="'+sc(v)+'" y1="13" x2="'+sc(v)+'" y2="'+(16+SETS.length*rh)+'" stroke="var(--line)"/>'});
    SETS.forEach(([n,s,k])=>{const hw=196*Math.sqrt(p*(1-p)/k);
      b+=RD.t(0,y+13,(wide?n:s)+' ('+k.toLocaleString('en-US')+')');
      b+='<rect x="'+x0+'" y="'+(y+3)+'" width="'+Math.max(0,sc(hw)-x0).toFixed(1)+'" height="13" rx="2" fill="var(--c2)"/>';
      b+=RD.t(sc(hw)+4,y+14,'±'+hw.toFixed(1),{w:k===30?600:null});y+=rh});
    el.innerHTML=RD.svg(W,y+4,b,'Interval half-width by set');
  }
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
