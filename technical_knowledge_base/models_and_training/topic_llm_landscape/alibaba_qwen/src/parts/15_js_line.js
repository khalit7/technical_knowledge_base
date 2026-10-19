// ---- Lineage timeline: one dot per release, filled open / ring closed, coloured by licence ----
(function(){
  if(!$('tlSvg'))return;
  const LC={ap:['Apache 2.0','var(--open)'],tq:['Tongyi Qianwen / Qwen License','var(--c5)'],rs:['Research only','var(--bad)'],mx:['Qwen3.8-Max License','var(--c4)'],cm:['Qwen Community License 1.0','var(--c6)'],cl:['Closed (hosted only)','var(--mute)']};
  // [card id, label, ISO date, open, licence, total params in B (null if unpublished), lane]
  const R=[['L-q1','Qwen-7B','2023-08-03',1,'tq',7,0],['L-q1','Qwen-72B','2023-11-26',1,'tq',72,0],['L-q15','Qwen1.5','2024-01-30',1,'tq',72,0],['L-q15','Qwen1.5-MoE','2024-03-28',1,'tq',14.3,1],
    ['L-q2','Qwen2-72B','2024-05-28',1,'tq',72,0],['L-q2','Qwen2-7B','2024-06-04',1,'ap',7,1],['L-q25','Qwen2.5-72B','2024-09-19',1,'tq',72,0],['L-q25','Qwen2.5-32B','2024-09-19',1,'ap',32,1],['L-q25','QwQ-32B-Preview','2024-11-28',1,'ap',32.5,1],['L-q25','QwQ-32B','2025-03-05',1,'ap',32.5,1],
    ['L-q3','Qwen3-235B','2025-04-29',1,'ap',235,0],['L-2507','Qwen3-Coder-480B','2025-07-22',1,'ap',480,1],['L-2507','Qwen3-2507','2025-07-21',1,'ap',235,0],['L-next','Qwen3-Next','2025-09-09',1,'ap',80,1],['L-3max','Qwen3-Max','2025-09-24',0,'cl',1000,2],['L-3max','Qwen3-VL-235B','2025-09-23',1,'ap',235,0],
    ['L-35','Qwen3.5-397B','2026-02-16',1,'ap',397,0],['L-36','Qwen3.6-35B-A3B','2026-04-16',1,'ap',35,1],['L-36','Qwen3.6-Max preview','2026-04-20',0,'cl',null,2],['L-37','Qwen3.7-Max','2026-05-20',0,'cl',null,2],['L-37','Qwen3.7-Plus','2026-06-02',0,'cl',397,2],
    ['L-38','Qwen3.8-Max','2026-08-03',0,'cl',2400,2],['L-38','Qwen3.8-2.4T-A95B','2026-08-12',1,'mx',2400,0],['L-27','Qwen3.8-27B','2026-08-14',1,'ap',27,1],['L-fn','Flash-Next','2026-08-26',1,'cm',125,1],['L-0902','Max-0902','2026-09-02',0,'cl',2400,2],['L-img','Qwen-Image-2.1','2026-09-14',1,'rs',null,1]];
  const yr=s=>{const d=new Date(s+'T00:00:00Z');const y=d.getUTCFullYear();return y+(d-Date.UTC(y,0,1))/(Date.UTC(y+1,0,1)-Date.UTC(y,0,1))};
  function draw(){
    const W=Math.max(600,Math.min(880,$('tlSvg').clientWidth||800)),H=250,pl=86,pr=16,x0=2023.5,x1=2026.85,lx=v=>pl+(W-pl-pr)*(v-x0)/(x1-x0);
    const lanes=['Flagship, open','Mid and small, open','Closed, hosted'],ly=i=>40+i*68;
    let s='';lanes.forEach((n,i)=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(i)+'" y2="'+ly(i)+'" stroke="var(--line)"/><text x="4" y="'+(ly(i)+4)+'" font-size="11" fill="var(--mute)">'+n+'</text>'});
    for(let y=2024;y<=2026;y++){s+='<line x1="'+lx(y)+'" x2="'+lx(y)+'" y1="18" y2="'+(H-18)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+lx(y)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+y+'</text>'}
    const rad=t=>t?Math.max(4,Math.min(16,3+2.2*Math.log10(t)*1.6)):5;
    const placed=[];
    R.forEach((r,i)=>{const x=lx(yr(r[2])),c=LC[r[4]][1],rr=rad(r[5]);let y=ly(r[6]);
      // nudge vertically when dots collide in a lane
      let tries=0;while(placed.some(p=>p.l===r[6]&&Math.abs(p.x-x)<p.r+rr&&Math.abs(p.y-y)<p.r+rr)&&tries<4){y+=(tries%2?-1:1)*(10+tries*6);tries++}
      placed.push({x,y,r:rr,l:r[6]});
      s+='<g class="lnd" data-go="'+r[0]+'" style="cursor:pointer"><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+rr.toFixed(1)+'" fill="'+(r[3]?c:'var(--bg)')+'" fill-opacity="'+(r[3]?.85:1)+'" stroke="'+c+'" stroke-width="2"'+(r[5]==null?' stroke-dasharray="2 2"':'')+'/><title>'+r[1]+' · '+r[2]+' · '+LC[r[4]][0]+(r[5]?' · '+(r[5]>=1000?(r[5]/1000)+'T':r[5]+'B')+' total':'')+'</title></g>'});
    // labels for a few anchors, to orient
    [['Qwen3',2025.33,0],['Next',2025.69,1],['3.5',2026.13,0],['3.8',2026.6,0],['Flash-Next',2026.65,1],['Qwen3-Max',2025.73,2]].forEach(([t,v,l])=>{s+='<text x="'+lx(v)+'" y="'+(ly(l)-22)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    $('tlSvg').innerHTML=svgEl(W,H,s,'Qwen releases 2023 to 2026 by lane and licence');
    $('tlSvg').querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>{const el=$(g.dataset.go);if(!el)return;document.querySelectorAll('.tl-item.sel').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');el.scrollIntoView({block:'start',behavior:'smooth'})}));
    $('tlLeg').innerHTML=Object.values(LC).map(([n,c])=>'<span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="'+c+'"/></svg>'+n+'</span>').join('')+'<span>dashed ring: size unpublished</span>';
  }
  onTab('t-line',draw);addEventListener('resize',()=>{if(!$('t-line').hidden)draw()});
})();
