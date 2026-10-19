// ---- Newton-Schulz stepper and the Adam-matched scale ----
(function(){
  const card=$('ns');if(!card)return;
  const a=3.4445,b=-4.7750,c=2.0315,f=s=>a*s+b*s**3+c*s**5;
  function seq(s1,s2,n){const F=Math.hypot(s1,s2);const out=[[s1/F,s2/F]];for(let k=1;k<=n;k++){const [x,y]=out[k-1];out.push([f(x),f(y)])}return {F,out}}
  function draw(){
    const s1=+$('nsS1').value,s2=+$('nsS2').value,n=+$('nsSteps').value;
    $('nsA').textContent=s1.toFixed(1);$('nsB').textContent=s2.toFixed(2);$('nsK').textContent=n;
    const {F,out}=seq(s1,s2,n);
    // plot: f on [0,1.35]
    const W=Math.max(280,Math.min(420,($('nsPlot').clientWidth||380))),H=Math.round(W*0.72),pl=36,pr=10,pt=10,pb=30;
    const X=v=>pl+(W-pl-pr)*v/1.35,Y=v=>pt+(H-pt-pb)*(1-(v+0.1)/1.5);
    let s='<rect x="'+X(0)+'" y="'+Y(1.3)+'" width="'+(X(1.35)-X(0))+'" height="'+(Y(0.7)-Y(1.3))+'" fill="var(--acc2)" opacity=".55"/>';
    [0,0.5,1,1.3].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    [0,0.5,1,1.3].forEach(v=>{s+='<text x="'+X(v)+'" y="'+(H-pb+14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">σ before the step</text>';
    let d='';for(let i=0;i<=135;i++){const v=i/100;d+=(i?'L':'M')+X(v).toFixed(1)+' '+Y(f(v)).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s+='<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(1.3)+'" y2="'+Y(1.3)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    const cols=['var(--c2)','var(--c3)'];
    const cx=v=>X(Math.max(0,Math.min(v,1.35))).toFixed(1),cy=v=>Y(Math.max(-0.1,Math.min(v,1.38))).toFixed(1);
    [0,1].forEach(j=>{let p='M'+cx(out[0][j])+' '+cy(out[0][j]);for(let k=0;k<out.length-1;k++){const v=out[k][j],w=out[k+1][j];p+='L'+cx(v)+' '+cy(w)+'L'+cx(w)+' '+cy(w)}
      s+='<path d="'+p+'" fill="none" stroke="'+cols[j]+'" stroke-width="1.2" opacity=".8"/>';
      for(let k=0;k<out.length;k++){const v=out[k][j];s+='<circle cx="'+cx(v)+'" cy="'+cy(v)+'" r="'+(k===out.length-1?4.5:2.6)+'" fill="'+cols[j]+'"/>'}});
    s+='<text x="'+(W-pr)+'" y="'+(pt+10)+'" font-size="11" text-anchor="end" fill="var(--c2)">σ₁</text><text x="'+(W-pr)+'" y="'+(pt+24)+'" font-size="11" text-anchor="end" fill="var(--c3)">σ₂</text>';
    $('nsPlot').innerHTML=svgEl(W,H,s,'Newton-Schulz polynomial and iterates');
    let t='<tr><th>Step</th><th class="num">σ₁</th><th class="num">σ₂</th><th class="num">σ₁ / σ₂</th></tr>';
    out.forEach((p,k)=>{t+='<tr'+(k===out.length-1?' class="hl2"':'')+'><td>'+(k===0?'X₀ = M / ‖M‖F':k)+'</td><td class="num">'+p[0].toFixed(4)+'</td><td class="num">'+p[1].toFixed(4)+'</td><td class="num">'+(p[1]?(p[0]/p[1]).toFixed(3):'')+'</td></tr>'});
    $('nsTab').innerHTML=t;
    const last=out[out.length-1],inBand=last.every(v=>v>=0.7&&v<=1.3);
    $('nsOut').innerHTML=stat('Frobenius norm ‖M‖F','√('+fmt(s1*s1,2)+' + '+fmt(s2*s2,4)+') = '+F.toFixed(3),'divides both singular values')+stat('Spread before',(s1/s2).toFixed(1)+' to 1','raw momentum spends this much more on σ₁')+stat('Spread after '+n+' step'+(n===1?'':'s'),(last[0]/last[1]).toFixed(3)+' to 1',inBand?'both inside 0.7 to 1.3':'not yet inside 0.7 to 1.3');
  }
  ['nsS1','nsS2','nsSteps'].forEach(id=>$(id).addEventListener('input',draw));
  function scale(){const [A,B]=$('nsShape').value.split(',').map(Number),m=Math.max(A,B);
    $('nsScale').innerHTML=stat('Orthogonal update RMS','1/√'+fmt(m)+' = '+(1/Math.sqrt(m)).toFixed(4),'a full-rank orthogonal '+fmt(A)+' × '+fmt(B)+' matrix')+stat('Muon scale factor','0.2√'+fmt(m)+' = '+(0.2*Math.sqrt(m)).toFixed(2),'multiplies O_t')+stat('Update RMS after scaling','0.2','AdamW-like, so its learning rate and decay carry over')}
  $('nsShape').addEventListener('change',scale);
  addEventListener('resize',draw);onTab('t-read',draw);draw();scale();
})();
