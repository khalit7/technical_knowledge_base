// ---- Section 9: NoisyNet's noise for one layer with p = 6 inputs and q = 4 outputs, factorised (p + q draws) or independent (pq + q) ----
// Noise values are illustrative draws from a seeded generator; the counts are exact.
(function(){
  const el=document.getElementById('vb-nzD');if(!el)return;const T=document.getElementById('vb-nzT');
  const p=6,q=4;let m='fac',seed=7;
  const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const f=x=>Math.sign(x)*Math.sqrt(Math.abs(x));
  function draw(){const r=rng(seed),g=()=>{const u=Math.max(1e-9,r()),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
    let ei,ej,EW,EB;
    if(m==='fac'){ei=Array.from({length:p},g);ej=Array.from({length:q},g);EW=ej.map(b=>ei.map(a=>f(a)*f(b)));EB=ej.map(f)}
    else{EW=Array.from({length:q},()=>Array.from({length:p},g));EB=Array.from({length:q},g)}
    const W=RD.width(el),lw=m==='fac'?52:20,cs=Math.min(40,(W-lw-60)/(p+1.6)),x0=lw,y0=m==='fac'?34:18,H=y0+q*cs+30;let s='';
    const cell=(x,y,v,lab)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(cs-3).toFixed(1)+'" height="'+(cs-3).toFixed(1)+'" rx="3" fill="'+RD.colorScale(v,-2,2)+'" stroke="var(--line)"/>'+(cs>=30?RD.t(x+(cs-3)/2,y+(cs-3)/2+4,RD.n(v,1),{a:'middle',fs:11,fill:'var(--ink)'}):'');
    if(m==='fac'){ei.forEach((v,i)=>{s+='<rect x="'+(x0+i*cs).toFixed(1)+'" y="4" width="'+(cs-3).toFixed(1)+'" height="22" rx="3" fill="none" stroke="var(--acc)"/>'+RD.t(x0+i*cs+(cs-3)/2,19,RD.n(v,1),{a:'middle',fs:11,fill:'var(--acc)'})});
      ej.forEach((v,j)=>{s+='<rect x="4" y="'+(y0+j*cs).toFixed(1)+'" width="'+(lw-10)+'" height="'+(cs-3).toFixed(1)+'" rx="3" fill="none" stroke="var(--acc)"/>'+RD.t(4+(lw-10)/2,y0+j*cs+(cs-3)/2+4,RD.n(v,1),{a:'middle',fs:11,fill:'var(--acc)'})})}
    EW.forEach((row,j)=>row.forEach((v,i)=>{s+=cell(x0+i*cs,y0+j*cs,v)}));
    const bx=x0+p*cs+cs*0.6;EB.forEach((v,j)=>{s+=cell(bx,y0+j*cs,v)});
    s+=RD.t(x0,y0+q*cs+16,'weight noise: '+q+' outputs × '+p+' inputs',{fs:11,fill:'var(--mute)'})+RD.t(bx+(cs-3)/2,y0+q*cs+16,'bias',{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Noise matrix of one noisy layer');
    T.innerHTML=m==='fac'?'Factorised: '+p+' input draws (top) and '+q+' output draws (left), '+(p+q)+' random numbers in all; each weight\'s noise is f(ε<sub>i</sub>)f(ε<sub>j</sub>) and each bias\'s f(ε<sub>j</sub>), so every row is a scaled copy of one pattern (rank one). Values illustrative.':
      'Independent: one Gaussian per weight and per bias, '+(p*q+q)+' random numbers (pq + q). Values illustrative.'}
  RD.seg(document.getElementById('vb-nzM'),v=>{m=v;draw()});
  document.getElementById('vb-nzR').addEventListener('click',()=>{seed++;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
