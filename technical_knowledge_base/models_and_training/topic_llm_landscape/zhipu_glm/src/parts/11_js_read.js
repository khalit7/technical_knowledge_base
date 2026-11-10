// ---- Reading tab: the inference-stack chart (the depth/width figure and the head grid became steps of the Shape stage, 41_js_sc_tw.js, 2026-11-10) ----
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
