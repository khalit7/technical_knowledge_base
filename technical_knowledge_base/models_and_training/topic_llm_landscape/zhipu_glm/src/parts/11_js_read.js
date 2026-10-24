// ---- Reading tab: small inline visuals ----
// GLM-4.5's 96 query heads sharing 8 key-value heads
(function(){const g=$('headGrid'),k=$('kvGrid');if(!g||!k)return;const C=['--c1','--c2','--c3','--c4','--c5','--c6','--acc','--bad'];let s='',t='';
  for(let i=0;i<96;i++){const grp=Math.floor(i/12);s+='<span title="query head '+(i+1)+', key-value group '+(grp+1)+'" style="background:var('+C[grp]+');opacity:.8"></span>'}
  for(let j=0;j<8;j++)t+='<span title="key-value head '+(j+1)+' (cached)" style="background:var('+C[j]+')"></span>';
  g.innerHTML=s;k.innerHTML=t;
  k.insertAdjacentHTML('afterend','<div class="small mute">8 cached key-value heads, one per group of 12 query heads</div>')})();

// Inference-stack throughput by development day (Z.ai Figure 1)
(function(){const el=$('infChart');if(!el)return;
  const D=[[0,1.00,'W8A8 baseline'],[1,1.21,'Async scheduling'],[2,1.42,'Sort kernel optimisation'],[3,1.41,'Hierarchical cache'],[4,1.97,'Layer Split'],[5,2.49,'Context parallel'],[7,2.67,'KV transfer overlap'],[8,2.67,'Mixed-precision cache quantisation'],[9,2.67,'Chunked MQA'],[10,2.85,'Prefill dequant kernel'],[11,3.01,'Fused activation and quantisation'],[13,3.22,'Linear attention (launch)']];
  function draw(){const W=el.clientWidth<520?360:680,nar=W<500,pl=nar?34:44,pr=12,pt=14,pb=34,H=nar?230:250;
    const x=v=>pl+(W-pl-pr)*v/13,y=v=>pt+(H-pt-pb)*(1-(v-.8)/(3.5-.8));let s='';
    [1,1.5,2,2.5,3,3.5].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'×</text>'});
    for(let d=0;d<=13;d+=nar?2:1)s+='<text x="'+x(d)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+d+'</text>';
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">development day</text>';
    s+='<path d="'+D.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(1)+' '+y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    D.forEach((p,i)=>{s+='<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="4" fill="var(--c1)"><title>Day '+p[0]+': '+p[1].toFixed(2)+'× after '+p[2]+'</title></circle>';
      const up=i%2===0;s+='<text x="'+x(p[0])+'" y="'+(y(p[1])+(up?-9:16))+'" font-size="10.5" text-anchor="middle" fill="var(--c1)" font-weight="600">'+p[1].toFixed(2)+'</text>'});
    el.innerHTML=svgEl(W,H,s,'Throughput gain by development day, 1.00 to 3.22 times')+'<div class="small" style="columns:'+(nar?1:2)+';column-gap:18px;margin-top:4px">'+D.map(p=>'<div>Day '+p[0]+': <b>'+p[1].toFixed(2)+'×</b> '+p[2]+'</div>').join('')+'</div>'}
  draw();let w=el.clientWidth;addEventListener('resize',()=>{const n=el.clientWidth;if(n&&(Math.abs(n-w)>30||(n<520)!==(w<520))){w=n;draw()}})})();

// Depth against width: GLM-4.5 against DeepSeek-V3 and Kimi K2 (GLM-4.5 report, Table 1), drawn to scale
(function(){const el=$('zg-dw');if(!el)return;
  const D=[['GLM-4.5',92,5120,160,96,'var(--acc)'],['DeepSeek-V3',61,7168,256,128,'var(--c2)'],['Kimi K2',61,7168,384,64,'var(--c4)']];
  function draw(){const cw=el.clientWidth||600,W=Math.min(cw,680),nar=W<500,pad=8,gap=nar?10:26,colW=(W-2*pad-2*gap)/3;
    const sx=colW/7168,sy=(nar?1.7:2.1),top=34,H=top+92*sy+(nar?52:44);let s='';
    D.forEach((d,i)=>{const x0=pad+i*(colW+gap),w=d[2]*sx,h=d[1]*sy,x=x0+(colW-w)/2,y=top+92*sy-h;
      s+='<text x="'+(x0+colW/2)+'" y="14" font-size="12" font-weight="600" text-anchor="middle" fill="'+d[5]+'">'+d[0]+'</text>';
      s+='<text x="'+(x0+colW/2)+'" y="28" font-size="11" text-anchor="middle" fill="var(--mute)">'+d[1]+' layers</text>';
      for(let l=0;l<d[1];l++){s+='<rect x="'+x.toFixed(1)+'" y="'+(y+l*sy).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,sy-0.6).toFixed(1)+'" fill="'+d[5]+'" opacity="'+(l<(i===2?1:3)?0.45:0.85)+'"/>'}
      const yb=top+92*sy;s+='<line x1="'+x.toFixed(1)+'" x2="'+(x+w).toFixed(1)+'" y1="'+(yb+6)+'" y2="'+(yb+6)+'" stroke="var(--mute)"/>';
      s+='<text x="'+(x0+colW/2)+'" y="'+(yb+19)+'" font-size="11" text-anchor="middle" fill="var(--ink)">width '+fmt(d[2])+'</text>';
      s+='<text x="'+(x0+colW/2)+'" y="'+(yb+33)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+d[3]+' experts, '+d[4]+' heads</text>'});
    el.innerHTML=svgEl(W,H,s,'GLM-4.5 has 92 layers of width 5,120; DeepSeek-V3 and Kimi K2 have 61 layers of width 7,168');
    el.querySelector('svg').style.maxWidth=W+'px'}
  draw();(TAB_RENDER['t-read']=TAB_RENDER['t-read']||[]).push(draw);let w=el.clientWidth;addEventListener('resize',()=>{const n=el.clientWidth;if(n&&Math.abs(n-w)>30){w=n;draw()}})})();
