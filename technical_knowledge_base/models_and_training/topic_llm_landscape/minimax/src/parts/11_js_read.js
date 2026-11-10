// ---- Reading tab: SWA ablation chart, recomputed claims (the lightning toy is the 3D stage in 41_js_sc_lt.js) ----
(function(){ // SWA ablation: hybrid sliding window minus full attention
  if(!$('sw'))return;
  const D={pt:[['HELMET ICL',75.8,72.7],['MMLU',85.5,85.6],['MATH',60.3,60.3],['RULER 128K CWE',90.0,72.0],['RULER 128K MQ',99.0,93.0],['RULER 32K CWE',99.0,99.0],['RULER 32K MQ',99.0,99.0],['MTOB K-e Bleurt',60.0,45.0],['MTOB e-k ChrF',44.8,27.2]],
    sft:[['AIME 2025',86.7,86.7],['ARC-AGI-1',38.9,39.6],['GPQA-Diamond',75.3,72.7],['MMLU-Pro',80.5,80.1],['IFBench',23.1,27.2],['SWE-verified',54.7,50.2],['Terminal-Bench',26.7,23.8],['BrowseComp-zh',32.8,28.7],['GAIA-103',53.4,51.5],['XBench-ds',58.0,63.0],['τ²-Bench retail',62.3,67.5],['τ²-Bench telecom',32.5,21.0]]};
  function draw(m){const rows=D[m],W=vw('swSvg',640,420),rh=24,pt=22,H=pt+rows.length*rh+8,l=W<500?110:150,r=W<500?112:150,fs=W<500?10.5:11.5,cx=l+(W-l-r)/2,sc=(W-l-r)/2/18;
    let s='<line x1="'+cx+'" x2="'+cx+'" y1="'+(pt-6)+'" y2="'+(H-4)+'" stroke="var(--mute)"/>';
    s+='<text x="'+(cx-6)+'" y="12" font-size="10.5" text-anchor="end" fill="var(--mute)">hybrid SWA worse</text><text x="'+(cx+6)+'" y="12" font-size="10.5" fill="var(--mute)">better</text>';
    [-15,-10,-5,5].forEach(t=>s+='<line x1="'+(cx+t*sc)+'" x2="'+(cx+t*sc)+'" y1="'+(pt-4)+'" y2="'+(H-4)+'" stroke="var(--line)"/><text x="'+(cx+t*sc)+'" y="'+(H)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+(t>0?'+':'−')+Math.abs(t)+'</text>');
    rows.forEach((x,i)=>{const y=pt+i*rh,d=+(x[2]-x[1]).toFixed(1),w=Math.abs(d)*sc,c=d<0?'var(--bad)':'var(--good)';
      s+='<text x="'+(l-8)+'" y="'+(y+15)+'" font-size="'+fs+'" text-anchor="end">'+x[0]+'</text>';
      s+='<rect x="'+(d<0?cx-w:cx)+'" y="'+(y+5)+'" width="'+Math.max(w,d?0:1.5)+'" height="13" rx="2" fill="'+(d?c:'var(--mute)')+'"/>';
      s+='<text x="'+(W-r+8)+'" y="'+(y+15)+'" font-size="11" fill="var(--mute)">'+x[1].toFixed(1)+' → '+x[2].toFixed(1)+' <tspan fill="'+(d?c:'var(--mute)')+'" font-weight="600">('+(d>0?'+':d<0?'−':'±')+Math.abs(d).toFixed(1)+')</tspan></text>'});
    $('swSvg').innerHTML=svgEl(W,H+4,s,'Hybrid sliding-window attention minus full attention, '+(m==='pt'?'pretraining':'after fine-tuning'))}
  let cur='pt';segBind('swM',m=>{cur=m;draw(m)});draw('pt');onTab('t-read',()=>draw(cur));let rw=0;addEventListener('resize',()=>{const w=$('swSvg').clientWidth;if(w&&w!==rw){rw=w;draw(cur)}});
})();

(function(){ // recomputed claim cells
  if(!$('rpA'))return;const n=1048576;
  $('rpA').innerHTML=eq12(n).toFixed(1)+'×';
  const full=2*4*128*2*n,msa=128*2*n+4*SELT*2*128*2;
  $('rpB').innerHTML=(full/msa).toFixed(1)+'× fewer bytes read per decoded token per layer (2 GiB against 260 MiB); eq. 12 gives '+eq12(n).toFixed(1)+'× in compute, above the 14.2× measured prefill';
  $('rpC').innerHTML=(compB('m2',n)/compB('m3',n)).toFixed(1)+'× (all 60 sparse: '+(compB('m2',n)/compB('m3',n,{all:true})).toFixed(1)+'×)';
})();
