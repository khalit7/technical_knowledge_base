// ---- QK-Clip: per head against a naive whole-layer clip (illustrative max logits) ----
(function(){
  const card=$('qk');if(!card)return;
  const S=[42,88,150,64,230,97,120,31]; // illustrative per-head max logits; head 3 is the worked example
  let mode='head',sel=2;
  function draw(){
    const tau=+$('qkTau').value;$('qkT').textContent=tau;
    const gAll=Math.min(1,tau/Math.max(...S));
    const g=S.map(v=>mode==='head'?Math.min(1,tau/v):gAll);
    const W=Math.max(300,Math.min(760,card.clientWidth-28)),H=210,pl=40,pr=8,pt=12,pb=34,max=260;
    const bw=(W-pl-pr)/S.length,Y=v=>pt+(H-pt-pb)*(1-Math.min(v,max)/max);
    let s='';[0,100,200].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    S.forEach((v,i)=>{const x=pl+i*bw+bw*0.18,w=bw*0.64,a=v*g[i],clipped=g[i]<1;
      s+='<g style="cursor:pointer" data-h="'+i+'"><rect x="'+x+'" y="'+pt+'" width="'+w+'" height="'+(H-pt-pb)+'" fill="transparent"/>';
      s+='<rect x="'+x+'" y="'+Y(v)+'" width="'+w+'" height="'+(Y(0)-Y(v))+'" rx="2" fill="var(--dim)"/>';
      s+='<rect x="'+(x+w*0.18)+'" y="'+Y(a)+'" width="'+(w*0.64)+'" height="'+(Y(0)-Y(a))+'" rx="2" fill="'+(clipped?'var(--c2)':'var(--acc)')+'"/>';
      if(i===sel)s+='<rect x="'+(x-3)+'" y="'+(pt-3)+'" width="'+(w+6)+'" height="'+(H-pt-pb+6)+'" rx="4" fill="none" stroke="var(--ink)" stroke-dasharray="3 3"/>';
      s+='<text x="'+(x+w/2)+'" y="'+(H-pb+14)+'" font-size="11" text-anchor="middle">h'+(i+1)+'</text><text x="'+(x+w/2)+'" y="'+(H-pb+27)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v+'→'+(Math.round(a*10)/10)+'</text></g>'});
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(tau)+'" y2="'+Y(tau)+'" stroke="var(--bad)" stroke-dasharray="5 3"/><text x="'+(W-pr)+'" y="'+(Y(tau)-4)+'" font-size="11" text-anchor="end" fill="var(--bad)">τ = '+tau+'</text>';
    $('qkSvg').innerHTML=svgEl(W,H,s,'Per-head max logits before (grey) and after clipping');
    $('qkSvg').querySelectorAll('[data-h]').forEach(e=>e.addEventListener('click',()=>{sel=+e.dataset.h;draw()}));
    const gh=g[sel],r=Math.sqrt(gh);
    $('qkTab').innerHTML='<tr><th>Head '+(sel+1)+' (S<sub>max</sub> = '+S[sel]+')</th><th class="num">Scale</th><th>Why</th></tr>'+
      '<tr><td>Content query <i>q</i><sup>C</sup> and key <i>k</i><sup>C</sup></td><td class="num">√γ = '+r.toFixed(3)+'</td><td>head-specific; each takes half the shrink</td></tr>'+
      '<tr><td>Rotary query <i>q</i><sup>R</sup></td><td class="num">γ = '+gh.toFixed(3)+'</td><td>head-specific; the rotary key it multiplies is not scaled</td></tr>'+
      '<tr><td>Rotary key <i>k</i><sup>R</sup></td><td class="num">1</td><td>shared by every head, so left alone</td></tr>'+
      '<tr><td>Resulting max logit</td><td class="num">'+(S[sel]*gh).toFixed(1)+'</td><td>'+(gh<1?'brought back to τ':'below τ, untouched')+'</td></tr>';
    const n=g.filter(x=>x<1).length,healthy=S.map((v,i)=>v<=tau?g[i]:null).filter(x=>x!==null);
    const hl=healthy.length?(100*(1-healthy.reduce((p,q)=>p+q,0)/healthy.length)):0;
    $('qkNote').innerHTML=(mode==='head'?n+' of 8 heads clipped; heads already below τ keep their logits.':'Every head shrinks by the worst head\'s factor, γ = '+gAll.toFixed(3)+': heads that were already below τ lose '+hl.toFixed(0)+'% of their logit for no reason, the over-regularisation per-head clipping avoids.')+' Click a bar to see that head\'s per-part scale factors on MLA.';
  }
  $('qkTau').addEventListener('input',draw);
  segBind('qkM',m=>{mode=m;draw()});
  addEventListener('resize',draw);onTab('t-read',draw);draw();
})();
