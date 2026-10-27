// ---- Speed-of-light for batch-1 decode: bandwidth / (active weights + cache) ----
(function(){
  const card=$('v-sol');if(!card)return;
  const KVT=0.5e9/8192; // bytes of cache per context token, from Cohere's 0.5 GB at 8K (derived)
  const CTX=[8192,16384,32768,65536,131072,262144]; // slider maps 0..100 onto 8K..256K on a log scale
  const ctxOf=v=>Math.round(8192*Math.pow(32,v/100));
  const fmtK=n=>n>=1024?Math.round(n/1024)+'K':fmt(n);
  function draw(){
    const A=+$('slA').value*1e9,B=+$('slB').value,BW=+$('slW').value*1e12,C=ctxOf(+$('slC').value);
    $('slAv').textContent=(A/1e9).toFixed(1)+'B'+(Math.abs(A-3.3e9)<1?' (North Mini Code)':'');$('slCv').textContent=fmtK(C)+' tokens';
    const wB=A*B,kB=KVT*C,sol=BW/(wB+kB);
    const isDef=Math.abs(A-3.3e9)<1&&B===2&&BW===3.35e12&&C<8300;
    const el=$('slSvg'),narrow=(el.clientWidth||340)<560,w=narrow?Math.max(300,Math.round(el.clientWidth||340)):760,lw=narrow?92:150;
    // bars: tokens per second, ceiling and (at Cohere's settings) the two measurements, on one tokens-per-second axis
    const rows=[['Speed-of-light',sol,'var(--dim)']];if(isDef){rows.push([narrow?'Megakernel':'Megakernel (measured)',292,'var(--c3)'],[narrow?'vLLM':'vLLM (measured)',185,'var(--c2)'])}
    const max=Math.max(500,sol*1.08),X=v=>(w-lw-70)*v/max;let s='',y=6;
    rows.forEach(([n,v,c])=>{s+='<text x="'+(lw-8)+'" y="'+(y+14)+'" font-size="'+(narrow?11:12)+'" text-anchor="end">'+n+'</text><rect x="'+lw+'" y="'+y+'" width="'+X(v).toFixed(1)+'" height="20" rx="3" fill="'+c+'"/><text x="'+(lw+X(v)+6)+'" y="'+(y+14)+'" font-size="12">'+fmt(v)+' tok/s</text>';y+=28});
    if(!isDef){s+='<text x="4" y="'+(y+12)+'" font-size="11" fill="var(--mute)">'+(narrow?'measured only at Cohere\'s settings':'measured speeds exist only at Cohere\'s settings (3.3B, BF16, 8K, H100)')+'</text>';y+=20}
    // bytes per token split
    y+=6;const tot=wB+kB,bw=w-lw-10;s+='<text x="'+(lw-8)+'" y="'+(y+13)+'" font-size="11" text-anchor="end" fill="var(--mute)">bytes / token</text>';
    s+='<rect x="'+lw+'" y="'+y+'" width="'+(bw*wB/tot).toFixed(1)+'" height="18" fill="var(--c1)"/><rect x="'+(lw+bw*wB/tot)+'" y="'+y+'" width="'+(bw*kB/tot).toFixed(1)+'" height="18" fill="var(--c5)"/>';
    const wt='weights '+(wB/1e9).toFixed(2)+' GB',kt='cache '+(kB/1e9).toFixed(2)+' GB';
    if(bw*wB/tot>(narrow?90:120))s+='<text x="'+(lw+5)+'" y="'+(y+13)+'" font-size="11" fill="var(--bg)">'+wt+'</text>';
    if(bw*kB/tot>(narrow?80:110))s+='<text x="'+(lw+bw*wB/tot+5)+'" y="'+(y+13)+'" font-size="11" fill="var(--bg)">'+kt+'</text>';
    y+=26;
    el.innerHTML=svgEl(w,y,s,'Decode speed-of-light at batch size 1');
    $('slOut').innerHTML=stat('Bytes read per token',((wB+kB)/1e9).toFixed(2)+' GB',(wB/1e9).toFixed(2)+' GB weights + '+(kB/1e9).toFixed(2)+' GB cache')+
      stat('Speed-of-light',fmt(sol)+' tok/s','bandwidth / bytes per token')+
      (isDef?stat('Megakernel, share of it',(100*292/sol).toFixed(0)+'%','292 tok/s measured (Cohere: 62%)')+stat('vLLM, share of it',(100*185/sol).toFixed(0)+'%','185 tok/s; megakernel '+(292/185).toFixed(2)+'x faster')
      :stat('At 62% of it (the megakernel\'s share)',fmt(0.62*sol)+' tok/s','illustrative, not measured')+stat('Cache share of the bytes',(100*kB/(wB+kB)).toFixed(0)+'%',kB>wB?'the cache now dominates':'weights still dominate'))}
  ['slA','slC','slB','slW'].forEach(id=>$(id).addEventListener('input',draw));
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);draw();
})();
