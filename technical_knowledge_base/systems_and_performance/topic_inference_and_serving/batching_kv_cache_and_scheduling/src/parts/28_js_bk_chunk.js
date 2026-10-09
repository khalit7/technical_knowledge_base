// ---- Reading section 5: stall against TTFT per token budget (BKD.meas.chunk measured; BKD.sch.chunk_m1 / chunk_h100 simulated) ----
(function(){
  const el=document.getElementById('bk-ck-svg');if(!el)return;
  let mode='m1';
  const ms=v=>v>=1?(Math.abs(v-Math.round(v))<1e-9?String(Math.round(v)):v.toFixed(1))+' s':Math.round(v*1000)+' ms';
  function draw(){
    const W=Math.max(300,Math.min(860,RD.width(el))),H=W<480?250:280,L=50,R=12,T=12,B=38;
    let pts=[],sim=[];
    const M=BKD.meas&&BKD.meas.chunk;
    if(mode==='m1'){if(M)pts=M.rows.map(r=>({b:r.budget,x:r.maxgap_med,y:r.ttft_med,x0:r.maxgap_min,x1:r.maxgap_max,y0:r.ttft_min,y1:r.ttft_max}));
      sim=BKD.sch.chunk_m1.rows.filter(r=>r.budget).map(r=>({b:r.budget,x:r.max_gap,y:r.long_ttft}))}
    else sim=BKD.sch.chunk_h100.rows.filter(r=>r.budget).map(r=>({b:r.budget,x:r.max_gap,y:r.long_ttft}));
    const all=pts.concat(sim),xl=Math.min(...all.map(p=>p.x))*0.7,xh=Math.max(...all.map(p=>p.x1||p.x))*1.4;
    const yl=Math.min(...all.map(p=>p.y0||p.y))*0.95,yh=Math.max(...all.map(p=>p.y1||p.y))*1.05;
    const x=v=>L+(W-L-R)*(Math.log(v)-Math.log(xl))/(Math.log(xh)-Math.log(xl)),y=v=>T+(H-T-B)*(1-(v-yl)/(yh-yl));
    let b='';
    [0.01,0.03,0.1,0.3,1,3].filter(v=>v>=xl&&v<=xh).forEach(v=>{b+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/>'+RD.t(x(v),H-B+14,ms(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    {const raw=(yh-yl)/4,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(m=>m*mag).find(m=>m>=raw);for(let v=Math.ceil(yl/st)*st;v<=yh;v+=st){b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+RD.t(L-4,y(v)+4,ms(v),{a:'end',fs:10,fill:'var(--mute)'})}}
    b+=RD.t((L+W-R)/2,H-4,(W<480?'longest gap while the long prompt is read (log)':'longest gap a decoding user sees while the long prompt is read (log scale)'),{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+=RD.t(L,T-2,'long prompt\'s TTFT',{fs:10.5,fill:'var(--mute)'});
    const line=(arr,c,d)=>'<polyline fill="none" stroke="'+c+'" stroke-width="1.5"'+(d?' stroke-dasharray="'+d+'"':'')+' points="'+arr.map(p=>x(p.x).toFixed(1)+','+y(p.y).toFixed(1)).join(' ')+'"/>';
    b+=line(sim,mode==='m1'?'var(--c4)':'var(--c1)','4 3');
    sim.forEach(p=>{b+='<circle cx="'+x(p.x)+'" cy="'+y(p.y)+'" r="3.5" fill="var(--bg)" stroke="'+(mode==='m1'?'var(--c4)':'var(--c1)')+'" stroke-width="1.8"/>';if(mode!=='m1')b+=RD.t(x(p.x),y(p.y)-7,p.b.toLocaleString('en-US'),{a:'middle',fs:10})});
    if(pts.length){b+=line(pts,'var(--good)');pts.forEach(p=>{b+='<line x1="'+x(p.x0)+'" x2="'+x(p.x1)+'" y1="'+y(p.y)+'" y2="'+y(p.y)+'" stroke="var(--good)"/><line x1="'+x(p.x)+'" x2="'+x(p.x)+'" y1="'+y(p.y0)+'" y2="'+y(p.y1)+'" stroke="var(--good)"/><circle cx="'+x(p.x)+'" cy="'+y(p.y)+'" r="4" fill="var(--good)"/>'+RD.t(x(p.x)+6,y(p.y)-6,p.b.toLocaleString('en-US'),{fs:10})})}
    el.innerHTML=RD.svg(W,H,b,'chunk budget trade');
    const n=document.getElementById('bk-ck-note');
    n.innerHTML=mode==='m1'?('<span class="meas">measured here</span> (filled dots, median of '+(M?M.reps:0)+' runs, bars from the fastest to the slowest run; labels are the budget in tokens): '+(M?M.model+'; '+M.engine:'')+'; four users decoding 500 tokens each from 163-token prompts, then a '+(M?M.rows[0].prompt_tokens.toLocaleString('en-US'):'')+'-token prompt sent once each has 40 tokens. The machine was shared: one-minute load averages '+(M?Math.min(...M.rows.map(r=>r.load_min)).toFixed(0)+' to '+Math.max(...M.rows.map(r=>r.load_max)).toFixed(0):'')+' during the runs. Hollow dots: <span class="der">derived</span>, the parent\'s simulator with its M1 Pro preset (fitted earlier on llama.cpp runs of Qwen3-0.6B) and Qwen3-1.7B\'s shape, the same requests.')
      :'<span class="der">derived</span>: Llama 3.1 8B in BF16 on one H100, the parent\'s simulator; eight users decoding (500-token prompts, 400 tokens out) when a 12,000-token prompt arrives at 0.2 s. Labels: the budget in tokens per step.';
  }
  RD.seg(document.getElementById('bk-ck-mode'),m=>{mode=m;draw()});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
