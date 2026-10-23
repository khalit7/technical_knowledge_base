// ---- Lineage: timeline dots and parameter bars ----
(function(){
  const E=[['L-llm','2023-11-29','LLM',67],['L-v2','2024-05-06','V2',236],['L-v3','2024-12-26','V3',671],['L-r1','2025-01-20','R1',671],['L-v31','2025-08-21','V3.1',0],['L-v32','2025-09-29','V3.2-Exp',0],['L-v4','2026-04-24','V4',1600],['L-vis','2026-08-21','V4 vision',0],['L-v41','2026-09-10','V4.1-Flash',552],['L-v41b','2026-10-17','1017',0]];
  document.querySelectorAll('.pb').forEach(el=>{const t=+el.dataset.t,a=+el.dataset.a,a2=el.dataset.a2,n=el.dataset.n,max=1600;
    el.innerHTML=(n?'<div class="small" style="font-weight:600;margin-top:4px">'+n+'</div>':'')+'<div class="pbar"><span>Total</span><span class="track"><span class="fill" style="width:'+(100*t/max).toFixed(1)+'%;background:var(--dim)"></span></span><span>'+(t>=1000?(t/1000)+'T':t+'B')+'</span></div><div class="pbar"><span>Active</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,100*a/max).toFixed(1)+'%;background:var(--acc)"></span></span><span>'+(a2?a2+'B prefill, '+a+'B decode':a+'B')+' ('+(t/a).toFixed(0)+'×)</span></div>'});
  function draw(){
    const W=640,H=150,pl=20,pr=20,t0=Date.parse('2023-09-01'),t1=Date.parse('2026-11-01'),x=d=>pl+(W-pl-pr)*(Date.parse(d)-t0)/(t1-t0),y0=86;
    let s='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--line)" stroke-width="2"/>';
    ['2024','2025','2026'].forEach(yr=>{const xx=x(yr+'-01-01');s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(y0-6)+'" y2="'+(y0+6)+'" stroke="var(--mute)"/><text x="'+(xx+3)+'" y="'+(H-6)+'" font-size="11" fill="var(--mute)">'+yr+'</text><line x1="'+xx+'" x2="'+xx+'" y1="'+(y0+6)+'" y2="'+(H-4)+'" stroke="var(--line)"/>'});
    const R=e=>e[3]?4+Math.sqrt(e[3])/3.2:4;
    E.map((e,i)=>[e,i]).sort((a,b)=>R(b[0])-R(a[0])).forEach(([e,i])=>{const xx=x(e[1]),r=R(e),up=i%2===0,ly=up?y0-r-10:y0+r+18;
      s+='<g class="tld" data-id="'+e[0]+'" style="cursor:pointer" tabindex="0" role="button" aria-label="'+e[2]+'"><circle cx="'+xx+'" cy="'+y0+'" r="'+r.toFixed(1)+'" fill="'+(e[3]?'var(--acc)':'var(--bg)')+'" stroke="var(--acc)" stroke-width="2" fill-opacity="'+(e[3]?0.7:1)+'"/><text x="'+xx+'" y="'+ly+'" font-size="11.5" text-anchor="'+(i===E.length-1?'end':'middle')+'">'+e[2]+'</text></g>'});
    $('tlSvg').innerHTML=svgEl(W,H,s,'DeepSeek release timeline');
    $('tlSvg').querySelectorAll('.tld').forEach(g=>{const go=()=>{document.querySelectorAll('.tl-item').forEach(c=>c.classList.toggle('sel',c.id===g.dataset.id));$(g.dataset.id).scrollIntoView({block:'start',behavior:'smooth'})};g.addEventListener('click',go);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go()}})});
  }
  onTab('t-line',draw);
})();
