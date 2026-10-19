// ---- Kimi Linear hybrid ratio: perplexity against the share of layers that keep a cache ----
(function(){
  const el=$('hrSvg');if(!el)return;
  const D=[{r:'0:1 (all MLA)',c:1,v:5.77,t:9.45},{r:'1:1',c:1/2,v:5.66,t:9.29},{r:'3:1',c:1/4,v:5.65,t:9.23},{r:'7:1',c:1/8,v:5.70,t:9.23},{r:'15:1',c:1/16,v:5.82,t:9.34}];
  let m='v';
  function draw(){
    const W=Math.max(300,Math.min(720,el.clientWidth||640)),H=250,pl=48,pr=18,pt=16,pb=42;
    const vals=D.map(d=>d[m]),lo=Math.min(...vals)-0.04,hi=Math.max(...vals)+0.04;
    const X=c=>pl+(W-pl-pr)*(Math.log2(c)+4.2)/4.4,Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));
    let s='';const step=m==='v'?0.05:0.05;
    for(let v=Math.ceil(lo/step)*step;v<=hi+1e-9;v+=step)s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(2)+'</text>';
    [1,1/2,1/4,1/8,1/16].forEach(c=>{s+='<text x="'+X(c)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(c===1?'100%':(100*c).toFixed(c<0.1?2:1).replace(/\.0+$/,'')+'%')+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">share of layers with a growing cache, 1/(r + 1) (log)</text>';
    const k3=24/93;s+='<line x1="'+X(k3)+'" x2="'+X(k3)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--good)" stroke-dasharray="4 3"/><text x="'+(X(k3)+5)+'" y="'+(pt+10)+'" font-size="10.5" fill="var(--good)">K3: 24/93</text>';
    let d='';D.forEach((p,i)=>{d+=(i?'L':'M')+X(p.c).toFixed(1)+' '+Y(p[m]).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    const best=Math.min(...vals);
    D.forEach(p=>{const b=p[m]===best;s+='<circle cx="'+X(p.c)+'" cy="'+Y(p[m])+'" r="'+(b?6:4.5)+'" fill="'+(b?'var(--acc)':'var(--c2)')+'"/><text x="'+X(p.c)+'" y="'+(Y(p[m])-10)+'" font-size="11" text-anchor="'+(p.c===1?'end':p.c<0.07?'start':'middle')+'">'+p.r+' · '+p[m].toFixed(2)+'</text>'});
    el.innerHTML=svgEl(W,H,s,'Kimi Linear perplexity against hybrid ratio');
  }
  segBind('hrM',x=>{m=x;draw()});addEventListener('resize',draw);onTab('t-read',draw);draw();
})();
