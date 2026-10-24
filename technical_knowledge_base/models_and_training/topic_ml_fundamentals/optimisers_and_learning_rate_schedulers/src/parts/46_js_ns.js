// ---- Reading, section 4: Muon's five Newton-Schulz iterations on the singular values of one real gradient (stepper) ----
(function(){
  const host=document.getElementById('ns-svg');if(!host||!window.NS_SV)return;
  const a=3.4445,b=-4.775,c=2.0315;const IT=[NS_SV.slice()];
  for(let k=0;k<5;k++)IT.push(IT[k].map(s=>a*s+b*s*s*s+c*s*s*s*s*s));
  const cap=document.getElementById('ns-cap');const n=NS_SV.length,YM=1.3;
  function draw(i){const v=IT[i],W=RD.width(host),H=Math.round(Math.min(230,Math.max(170,W*0.32))),ml=30,mr=8,mt=22,mb=26;
    const x=k=>ml+(W-ml-mr)*(k+0.5)/n,bw=Math.max(2,(W-ml-mr)/n*0.7),y=q=>mt+(H-mt-mb)*(1-Math.min(q,YM)/YM);
    let s='';[0,0.5,1].forEach(q=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(q)+'" y2="'+y(q)+'" stroke="'+(q===1?'var(--mute)':'var(--line)')+'"'+(q===1?' stroke-dasharray="4 3"':'')+'/>'+RD.t(ml-4,y(q)+4,q,{a:'end',fs:11,fill:'var(--mute)'})});
    s+=RD.t(W-mr,13,'dashed: orthogonal, every value 1',{a:'end',fs:11,fill:'var(--mute)'});
    if(i>0)IT[0].forEach((q,k)=>{s+='<rect x="'+(x(k)-bw/2)+'" y="'+y(q)+'" width="'+bw+'" height="'+(y(0)-y(q))+'" fill="var(--dim)"/>'});
    v.forEach((q,k)=>{const w=i>0?bw*0.55:bw;s+='<rect x="'+(x(k)-w/2)+'" y="'+y(q)+'" width="'+w+'" height="'+(y(0)-y(q))+'" fill="var(--acc)"/>'});
    s+=RD.t(ml,H-6,'32 directions of the gradient, strongest first',{fs:11,fill:'var(--mute)'});
    host.innerHTML=RD.svg(W,H,s,'Singular values of the update after each Newton-Schulz iteration');
    const lo=Math.min(...v),hi=Math.max(...v),f=q=>q.toFixed(2);
    const t=i===0?'The gradient as SGD would step along it':'Newton-Schulz iteration '+i+' of 5';
    const p=i===0?'Singular values from '+f(lo)+' to '+f(hi)+': the strongest direction is '+(hi/lo).toFixed(1)+' times the weakest, so a plain step moves mostly along the first few.'
      :'Each value σ becomes aσ + bσ³ + cσ⁵: small ones are lifted fast, large ones capped. Range now '+f(lo)+' to '+f(hi)+', a spread of '+(hi/lo).toFixed(2)+' : 1 (grey: the gradient).'+(i===5?' Not exactly 1: the coefficients trade precision for speed on the smallest values, which the authors found does not hurt.':'');
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>'}
  const an=RD.anim({card:'ns-card',ctl:'ns-ctl',n:6,ms:1300,draw,label:'Newton-Schulz iteration'});
  RD.onResize(()=>an.redraw());
})();
