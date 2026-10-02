// ---- Z.ai: end-to-end throughput by day (transcribed from Figure 1), phases coloured ----
(function(){
  const box=$('zaPlot');if(!box)return;
  const P=[[0,1.0,'W8A8 baseline',0],[1,1.21,'Async scheduling',0],[2,1.42,'Sort kernel optimisation',1],[3,1.41,'Hierarchical cache',1],[4,1.97,'Layer Split',1],[5,2.49,'Context parallel',1],[7,2.67,'KV transfer overlap',2],[8,2.67,'Mixed-precision cache quantisation',2],[9,2.67,'Chunked MQA',2],[10,2.85,'Prefill dequant kernel',2],[11,3.01,'Fused activation + quant',2],[13,3.22,'Linear attention (GLM-5.3-Flash launch)',3]];
  const PH=[['System bring-up and scheduling','var(--c1)'],['Parallelism and communication','var(--c2)'],['Kernel optimisation','var(--c3)'],['Launch','var(--c4)']];
  let sel=11;
  function draw(){
    const W=Math.max(300,box.clientWidth||340),narrow=W<560,H=narrow?230:250,pl=36,pr=14,pt=12,pb=34;
    const X=d=>pl+(W-pl-pr)*d/13.5,Y=v=>pt+(H-pt-pb)*(1-(v-0.8)/(3.5-0.8));
    let s='';[1,1.5,2,2.5,3,3.5].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'x</text>'});
    [0,2,4,6,8,10,12].forEach(d=>{s+='<text x="'+X(d)+'" y="'+(H-pb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+d+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">days from the start</text>';
    let d='';P.forEach((p,i)=>{if(i){const q=P[i-1];d+='L'+X(p[0])+' '+Y(q[1])+'L'+X(p[0])+' '+Y(p[1])}else d='M'+X(p[0])+' '+Y(p[1])});
    s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';
    P.forEach((p,i)=>{s+='<circle class="zp" data-i="'+i+'" cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+(i===sel?7:5.5)+'" fill="'+PH[p[3]][1]+'" stroke="'+(i===sel?'var(--ink)':'var(--bg)')+'" stroke-width="2" style="cursor:pointer"/>'});
    box.innerHTML=svgEl(W,H,s,'Throughput by day')+'<div class="lgd">'+PH.map(h=>'<span><i style="background:'+h[1]+'"></i>'+h[0]+'</span>').join('')+'</div>';
    box.querySelectorAll('.zp').forEach(c=>c.addEventListener('click',()=>{sel=+c.dataset.i;draw()}));
    const p=P[sel],q=sel?P[sel-1]:null;
    $('zaDet').innerHTML='<b>Day '+p[0]+': '+p[2]+'</b> · '+p[1].toFixed(2)+'x the baseline'+(q?' · step '+(p[1]/q[1]).toFixed(2)+'x over the day before ('+q[1].toFixed(2)+'x)':'')+' · phase: '+PH[p[3]][0]+'.'+(q&&Math.abs(p[1]-q[1])<0.015?' Flat end to end: whether this change helped is visible only in local tests.':'');
  }
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);
})();
