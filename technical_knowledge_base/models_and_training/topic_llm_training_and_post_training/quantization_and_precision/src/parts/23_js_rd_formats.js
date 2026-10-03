// ---- Reading, number formats: range bars on one log2 axis, computed from each format's bit layout ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-fr'))return;
  // [name, exponent bits, mantissa bits, special: 0 IEEE (inf/NaN reserved), 1 OCP E4M3, 2 no specials]
  const F=[['fp32',8,23,0],['tf32',8,10,0],['bf16',8,7,0],['fp16',5,10,0],['fp8 E5M2',5,2,0],['fp8 E4M3',4,3,1],['fp4 E2M1',2,1,2]];
  const rows=F.map(([n,e,m,sp])=>{const b=Math.pow(2,e-1)-1;const emax=sp===0?Math.pow(2,e)-2-b:Math.pow(2,e)-1-b;const mm=sp===1?2-2*Math.pow(2,-m):2-Math.pow(2,-m);
    return {n,e,m,max:Math.pow(2,emax)*mm,minN:Math.pow(2,1-b),sub:Math.pow(2,1-b-m),eps:Math.pow(2,-m)}});
  window.QF_ROWS=rows;
  function draw(){
    const W=RD.width($('rd-fr')),lw=74,pr=8,iw=W-lw-pr;
    const lo=-150,hi=130,x=v=>lw+(Math.log2(v)-lo)/(hi-lo)*iw;
    const rh=22;let s='';
    rows.forEach((r,i)=>{const y=6+i*rh;
      s+='<text x="0" y="'+(y+12)+'" font-size="11.5">'+r.n+'</text>';
      s+='<rect x="'+x(r.sub)+'" y="'+(y+3)+'" width="'+Math.max(1,x(r.minN)-x(r.sub))+'" height="12" fill="var(--c1)" fill-opacity=".35"/>';
      s+='<rect x="'+x(r.minN)+'" y="'+(y+3)+'" width="'+Math.max(2,x(r.max)-x(r.minN))+'" height="12" fill="var(--c1)"/>';});
    const yb=6+rows.length*rh+2;
    (iw<520?[-149,-75,0,64,128]:[-149,-126,-100,-75,-50,-24,0,16,64,128]).forEach(t=>{const xx=lw+(t-lo)/(hi-lo)*iw;s+='<line x1="'+xx+'" x2="'+xx+'" y1="4" y2="'+yb+'" stroke="var(--line)"/><text x="'+xx+'" y="'+(yb+12)+'" font-size="10" text-anchor="'+(t===128?'end':t===-149?'start':'middle')+'" fill="var(--mute)">2^'+t+'</text>'});
    $('rd-fr').innerHTML='<svg viewBox="0 0 '+W+' '+(yb+16)+'" width="'+W+'" height="'+(yb+16)+'" role="img" aria-label="Dynamic range of each format on a log2 axis">'+s+'</svg>';
  }
  RD.onRender(draw);draw();addEventListener('resize',draw);
})();
