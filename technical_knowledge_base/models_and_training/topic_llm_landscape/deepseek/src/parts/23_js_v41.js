// ---- V4.1-Flash: layer modes from config.json, and the two-stage indexer ----
(function(){
  const full=[2,8,14,20],rein=[24,28,32,36],eng=[1,14];
  const mode=i=>i<2?'swa':full.includes(i)?'full':rein.includes(i)?'rein':'reuse';
  const src=i=>{if(i<2)return -1;if(i<20){return full.filter(f=>f<20&&f<=i).at(-1)}return 20};
  const isrc=i=>{const s=[2,8,14,20,24,28,32,36].filter(f=>f<=i&&(i<20?f<20:f>=20));return s.at(-1)};
  const C={swa:'var(--dim)',full:'var(--acc)',rein:'var(--c2)',reuse:'var(--acc2)'};
  let sel=20;
  function desc(i){const m=mode(i),part=i<20?'Encoder':'Decoder';let d;
    if(m==='swa')d='Sliding-window attention over the last 128 positions only; no global cache entry.';
    else if(m==='full')d=(i<20?'Computes and stores one of the three encoder cache copies, two adjacent positions merged into one entry, and picks its own top-k with its own indexer. Layers '+(i+1)+' to '+(i+5)+' reuse it.':'Computes the single decoder cache copy (projected from the encoder\'s final hidden state, one entry per position), ranks the context in blocks of 8 and keeps up to 2,048 blocks as the candidate pool for the later indexing layers.');
    else if(m==='rein')d='Reuses layer 20\'s cache entries but scores the candidate pool with its own indexer query, picking a new top 512. Layers '+(i+1)+' to '+(i+3)+' reuse its choice.';
    else d='Reuses layer '+src(i)+'\'s cache entries and layer '+isrc(i)+'\'s top-k indices unchanged: no cache stored, no indexer run.';
    return '<h3>Layer '+i+' · '+part+' · '+{swa:'sliding window',full:'full',rein:'reindex',reuse:'reuse'}[m]+'</h3><p class="small" style="margin:2px 0 0">'+d+(eng.includes(i)?' The Engram memory is injected here.':'')+'</p>'}
  function draw(){
    const W=640,cw=14.6,x0=24,y=70,h=26;let s='';
    s+='<text x="'+(x0+10*cw)+'" y="14" font-size="11.5" text-anchor="middle" fill="var(--mute)">Encoder: layers 0 to 19 (prompt positions)</text><text x="'+(x0+30*cw+4)+'" y="14" font-size="11.5" text-anchor="middle" fill="var(--mute)">Decoder: layers 20 to 39</text>';
    for(let i=0;i<40;i++){const x=x0+i*cw+(i>=20?4:0),m=mode(i);
      s+='<g data-l="'+i+'" style="cursor:pointer"><rect x="'+x+'" y="'+y+'" width="'+(cw-2)+'" height="'+h+'" rx="2" fill="'+C[m]+'" stroke="'+(i===sel?'var(--ink)':'none')+'" stroke-width="2"/>'+(i%5===0||i===39?'<text x="'+(x+cw/2-1)+'" y="'+(y+h+13)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+i+'</text>':'')+(eng.includes(i)?'<text x="'+(x+cw/2-1)+'" y="'+(y-4)+'" font-size="10" text-anchor="middle">◆</text>':'')+'</g>'}
    // arcs: each cache copy and the layers that read it
    full.forEach((f,k)=>{const fx=x0+f*cw+(f>=20?4:0)+cw/2-1,last=f<20?f+5:39,lx=x0+last*cw+(last>=20?4:0)+cw/2-1;
      s+='<path d="M'+fx+','+(y+h+18)+' Q'+((fx+lx)/2)+','+(y+h+(f<20?40:56))+' '+lx+','+(y+h+18)+'" fill="none" stroke="var(--acc)" stroke-width="1.3"/><text x="'+((fx+lx)/2)+'" y="'+(y+h+(f<20?40:50))+'" font-size="10" text-anchor="middle" fill="var(--acc)">copy '+(k+1)+'</text>'});
    s+='<text x="'+x0+'" y="'+(y-22)+'" font-size="10.5" fill="var(--mute)">2:1 merged positions</text><text x="'+(x0+20*cw+4)+'" y="'+(y-22)+'" font-size="10.5" fill="var(--mute)">every position kept</text>';
    s+='<text x="'+x0+'" y="164" font-size="11" fill="var(--ink)">4 cache copies for 40 layers (3 encoder, 1 decoder); 8 layers run an indexer.</text>';
    $('v41Svg').innerHTML=svgEl(W,172,s,'V4.1-Flash layer modes');
    $('v41Svg').querySelectorAll('g[data-l]').forEach(g=>{const go=()=>{sel=+g.dataset.l;draw()};g.addEventListener('click',go);g.addEventListener('mouseenter',go)});
    $('v41Det').innerHTML=desc(sel);
  }
  const Ts=[16384,32768,65536,131072,262144,524288,1048576];
  function fn(){
    const L=Ts[+$('fnT').value];$('fnTv').textContent=fmt(L)+' positions';
    const blocks=Math.ceil(L/8),kb=Math.min(2048,blocks),cand=Math.min(L,kb*8),k=Math.min(512,cand);
    const rows=[['Positions in context',L,'var(--dim)'],['Stage 1: blocks of 8 ranked',blocks,'var(--acc)'],['Candidates kept (≤ 2,048 blocks)',cand,'var(--c6)'],['Stage 2: top-k kept',k,'var(--c2)']];
    const lg=v=>Math.log10(v),mx=lg(1048576);
    $('fnBars').innerHTML=rows.map(r=>'<div class="pbar" style="grid-template-columns:minmax(0,14em) minmax(0,1fr) 6em"><span>'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*lg(r[1])/mx).toFixed(1)+'%;background:'+r[2]+'"></span></span><span>'+fmt(r[1])+'</span></div>').join('');
    $('fnCap').innerHTML='Log scale. Each later indexing layer ranks '+fmt(cand)+' candidates, '+(100*cand/L).toFixed(L>16384?1:0)+'% of the context, whatever the length beyond 16,384; without the pool each would rank all '+fmt(L)+'. Attention then reads the '+k+' kept entries.';
  }
  $('fnT').addEventListener('input',fn);$('v41Est').textContent=fmt(3*288/2+288);draw();fn();
})();
