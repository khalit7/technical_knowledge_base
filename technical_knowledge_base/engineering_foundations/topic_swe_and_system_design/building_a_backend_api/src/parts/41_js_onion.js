// ---- Reading, section 4: the middleware onion, drawn from the recorded order of section 2 ----
(function(){
  const el=document.getElementById('rd-onion-svg');if(!el)return;const esc=RD.esc;
  const rings=[['middleware added second (registered last): enters 1st, leaves 6th','added last: in 1st, out 6th','var(--c1)'],['middleware added first: enters 2nd, leaves 5th','added first: in 2nd, out 5th','var(--c2)'],
    ['router: picks the route; 404 or 405 if none','router: 404 or 405 if none','var(--c4)'],['dependency current_user: 3rd, only for routes that ask','dependency: 3rd','var(--c5)'],['handler: 4th, the route itself','handler: 4th','var(--acc)']];
  function draw(){const W=RD.width(el),nar=W<560,step=nar?10:18,lh=24;let b='';const n=rings.length;const H=2*(n-1)*(lh+4)+lh+10;
    rings.forEach((r,i)=>{const x=i*step,y=i*(lh+4),w=W-2*i*step,h=H-2*i*(lh+4)-2;
      b+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(w-2)+'" height="'+Math.max(lh,h)+'" rx="8" fill="'+(i===n-1?'var(--acc2)':'none')+'" stroke="'+r[2]+'" stroke-width="1.6"/>'+RD.t(x+10,y+17,esc(nar?r[1]:r[0]),{fs:12,fill:'var(--ink)'})});
    el.innerHTML=RD.svg(W,H+2,b,'Nested boxes: the middleware registered last wraps the one registered first, which wraps the router, the dependency and the handler')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
