// ---- The idea: hero figure. Static annotated diagram of vLLM's processes, its loop, and where each knob acts (source: v0.31.0) ----
(function(){
  const el=document.getElementById('vl-hero');if(!el)return;
  const esc=RD.esc;
  const C=[
    {t:'API server process',n:1,rows:[{l:['HTTP, OpenAI-compatible API']},{l:['tokenize (chat template)']},{l:['detokenize, stop strings']},{l:['/metrics for Prometheus']}]},
    {t:'Engine core process',rows:[{l:['busy loop, every step:','schedule() → model →','update_from_output()'],n:2,a:1},
      {l:['Scheduler: waiting and','running queues, token budget'],n:3,k:['max_num_seqs','max_num_batched_tokens','max_loras']},
      {l:['KV cache manager, block','pool: free queue, hash map'],n:4,k:['gpu_memory_utilization','enable_prefix_caching','block_size']}]},
    {t:'GPU worker, one per GPU',n:5,rows:[{l:['model runner (MRV2):','persistent batch']},{l:['forward pass: CUDA','graphs, torch.compile'],k:['-O level']},{l:['sampler: one token','per request']},{l:['KV tensors in GPU','memory, by block id']}]}
  ];
  const LH=15,PH=19,PW=s=>s.length*6.6+12;
  function pillRows(k,cw){if(!k)return [];const rows=[[]];let x=0;k.forEach(p=>{const w=PW(p);if(x+w>cw-16&&rows[rows.length-1].length){rows.push([]);x=0}rows[rows.length-1].push(p);x+=w+5});return rows}
  function rowH(r,cw){return 8+r.l.length*LH+pillRows(r.k,cw).length*(PH+3)+5}
  function badge(x,y,n){return '<circle cx="'+x+'" cy="'+y+'" r="8" fill="var(--acc)"></circle><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--bg)">'+n+'</text>'}
  // one column at (x,y) of width cw; returns {svg, h, mids:[row centre y]}
  function col(c,x,y,cw){let b='',yy=y;
    b+='<text x="'+(x+(c.n?20:0))+'" y="'+(yy+13)+'" font-size="12.5" font-weight="700">'+esc(c.t)+'</text>';if(c.n)b+=badge(x+8,yy+9,c.n);
    yy+=22;const mids=[];
    c.rows.forEach(r=>{const h=rowH(r,cw);b+='<rect x="'+x+'" y="'+yy+'" width="'+cw+'" height="'+h+'" rx="6" class="'+(r.a?'bxa':'bx')+'"></rect>';
      let ty=yy+8+11;r.l.forEach(t=>{b+='<text x="'+(x+(r.n?26:9))+'" y="'+ty+'" font-size="11.5">'+esc(t)+'</text>';ty+=LH});
      if(r.n)b+=badge(x+13,yy+15,r.n);
      let py=ty-8;pillRows(r.k,cw).forEach(pr=>{let px=x+9;pr.forEach(p=>{const w=PW(p);b+='<rect x="'+px+'" y="'+py+'" width="'+w+'" height="'+PH+'" rx="9" class="pill"></rect><text x="'+(px+6)+'" y="'+(py+13.5)+'" font-size="11" class="pillt" font-family="ui-monospace,Menlo,monospace">'+esc(p)+'</text>';px+=w+5});py+=PH+3});
      mids.push(yy+h/2);yy+=h+6});
    return {svg:b,h:yy-y,mids}}
  function arrow(x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,hx=x2-ux*7,hy=y2-uy*7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+hx+'" y2="'+hy+'" class="ar"></line><path d="M'+x2+' '+y2+' L'+(hx-uy*4)+' '+(hy+ux*4)+' L'+(hx+uy*4)+' '+(hy-ux*4)+' Z" style="fill:var(--mute)"></path>'}
  function draw(){const w=RD.width(el);let b='',H;
    if(w>=680){const gap=58,cw=(w-2*gap)/3,xs=[0,cw+gap,2*(cw+gap)];
      const r=C.map((c,i)=>col(c,xs[i],0,cw));r.forEach(o=>b+=o.svg);H=Math.max(...r.map(o=>o.h));
      const yA=r[1].mids[0];// API server <-> engine core, at the loop row
      b+=arrow(xs[0]+cw+4,yA-7,xs[1]-4,yA-7)+arrow(xs[1]-4,yA+7,xs[0]+cw+4,yA+7);
      b+='<text x="'+(xs[0]+cw+gap/2)+'" y="'+(yA-14)+'" text-anchor="middle" font-size="10.5" class="mt">ZeroMQ</text><text x="'+(xs[0]+cw+gap/2)+'" y="'+(yA+24)+'" text-anchor="middle" font-size="10.5" class="mt">msgpack</text>';
      const yC=r[2].mids[0],yS=yC;
      b+=arrow(xs[1]+cw+4,yS-7,xs[2]-4,yC-7)+arrow(xs[2]-4,yC+7,xs[1]+cw+4,yS+7);
      b+='<text x="'+(xs[1]+cw+gap/2)+'" y="'+(Math.min(yS,yC)-14)+'" text-anchor="middle" font-size="10.5" class="mt">batch</text><text x="'+(xs[1]+cw+gap/2)+'" y="'+(Math.max(yS,yC)+24)+'" text-anchor="middle" font-size="10.5" class="mt">token ids</text>';
    }else{const cw=w-2;let y=0;
      C.forEach((c,i)=>{const o=col(c,1,y,cw);b+=o.svg;y+=o.h;
        if(i<2){const cx=w/2;b+=arrow(cx-10,y+2,cx-10,y+28)+arrow(cx+10,y+28,cx+10,y+2);
          b+='<text x="'+(cx+22)+'" y="'+(y+19)+'" font-size="10.5" class="mt">'+(i?'batch, token ids':'ZeroMQ, msgpack')+'</text>';y+=34}});
      H=y}
    el.innerHTML=RD.svg(w,Math.ceil(H)+2,b,'vLLM processes: API server, engine core with scheduler and KV cache manager, GPU worker; knobs shown where they act');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
