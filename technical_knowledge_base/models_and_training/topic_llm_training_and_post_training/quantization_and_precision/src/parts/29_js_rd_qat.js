// ---- Reading, QAT: fake quantisation in the forward pass, the straight-through estimator in the backward pass (static annotated diagram) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-qt'))return;
  const B=[['w','master weight','fp32 or bf16',16],['fake-quantise','round to the 4-bit grid,','then back to float',4],['ŵ','what serving','will store',4],['matmul with x','then the rest','of the network',16],['loss','sees the','rounding',32]];
  const COL={32:'var(--mute)',16:'var(--c1)',4:'var(--c3)'};
  const box=(x,y,w,h,b)=>'<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="7" fill="'+COL[b[3]]+'" fill-opacity=".15" stroke="'+COL[b[3]]+'"/>'+
    RD.t(x+w/2,y+16,'<tspan font-weight="600">'+b[0]+'</tspan>',{a:'middle',fs:12})+RD.t(x+w/2,y+31,b[1],{a:'middle',fs:11})+RD.t(x+w/2,y+44,b[2],{a:'middle',fs:11});
  const back='stroke="var(--acc)" stroke-width="2" stroke-dasharray="5 3" fill="none"';
  function draw(){
    const W=RD.width($('rd-qtP')),bh=50;let s='',H;
    if(W>=560){const gap=16,bw=(W-4*gap)/5;
      B.forEach((b,i)=>{const x=i*(bw+gap);s+=box(x,4,bw,bh,b);if(i<4)s+='<path d="M'+(x+bw+2).toFixed(1)+',22 L'+(x+bw+gap-3).toFixed(1)+',22 m-5,-4 l5,4 l-5,4" fill="none" stroke="var(--ink)"/>'});
      const xa=bw/2,xb=2*(bw+gap)+bw/2,yy=bh+16;
      s+='<path d="M'+xb.toFixed(1)+','+(bh+6)+' L'+xb.toFixed(1)+','+yy+' L'+xa.toFixed(1)+','+yy+' L'+xa.toFixed(1)+','+(bh+8)+' m-4,6 l4,-6 l4,6" '+back+'/>';
      s+=RD.t((xa+xb)/2,yy+15,'backward: ∂L/∂w = ∂L/∂ŵ, as if rounding were the identity (straight-through)',{a:'middle',fs:11,fill:'var(--acc)'});H=yy+22}
    else{const bw=Math.min(220,W*0.6),gap=18;
      B.forEach((b,i)=>{const y=4+i*(bh+gap);s+=box(0,y,bw,bh,b);if(i<4)s+='<path d="M'+(bw/2)+','+(y+bh+2)+' L'+(bw/2)+','+(y+bh+gap-3)+' m-4,-5 l4,5 l4,-5" fill="none" stroke="var(--ink)"/>'});
      const xr=bw+14,ya=4+bh/2,yb=4+2*(bh+gap)+bh/2;
      s+='<path d="M'+(bw+2)+','+yb+' L'+xr+','+yb+' L'+xr+','+ya+' L'+(bw+5)+','+ya+' m6,-4 l-6,4 l6,4" '+back+'/>';
      s+=RD.t(xr+6,(ya+yb)/2-6,'backward:',{fs:11,fill:'var(--acc)'})+RD.t(xr+6,(ya+yb)/2+9,'∂L/∂w = ∂L/∂ŵ',{fs:11,fill:'var(--acc)'});
      H=4+5*(bh+gap)}
    $('rd-qtP').innerHTML=RD.svg(W,H,s,'Fake quantisation in training and the straight-through gradient');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
