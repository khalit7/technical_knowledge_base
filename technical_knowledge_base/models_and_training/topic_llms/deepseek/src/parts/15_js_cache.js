// ---- Cache across generations: bytes per sequence against context ----
(function(){
  const Ts=[4096,8192,16384,32768,65536,131072,262144,524288,1000000];
  const S=[
    {n:'DeepSeek LLM 67B',c:'var(--ink)',per:389120,fix:0,dash:'2 3',how:'2 × 8 KV heads × 128 × 95 layers × 2 bytes = 389,120 bytes per token (GQA-8, first generation)'},
    {n:'MHA (V3 dims)',c:'var(--bad)',per:3997696,fix:0,how:'2 × 128 × 128 × 61 layers × 2 bytes = 3,997,696 bytes per token'},
    {n:'GQA-8 (V3 dims)',c:'var(--c5)',per:249856,fix:0,how:'2 × 8 × 128 × 61 × 2 = 249,856 bytes per token'},
    {n:'MLA: V2, V3, V3.2',c:'var(--c4)',per:70272,fix:0,how:'(512 + 64) × 61 × 2 = 70,272 bytes per token; DSA keeps all of it resident'},
    {n:'V4-Pro CSA + HCA',c:'var(--acc)',per:4939.5,fix:128*576*61,how:'30 × 160 + 31 × 4.5 = 4,939.5 bytes per token, plus 4.5 MB of windows'},
    {n:'V4-Flash (estimate)',c:'var(--c6)',per:3450,fix:128*576*43,est:1,how:'21 × 160 + 20 × 4.5 = 3,450 bytes per token (assumed split), plus 3.2 MB of windows'},
    {n:'V4.1-Flash (reported)',c:'var(--good)',per:890,fix:0,how:'890 bytes per token as reported'}
  ];
  function draw(){
    const ti=+$('ccT').value,T=Ts[ti],B=+$('ccB').value*1e9;
    $('ccTv').textContent=fmt(T)+' tokens';
    const W=640,H=300,pl=52,pr=150,pt=14,pb=34;
    const lx=v=>pl+(W-pl-pr)*(Math.log2(v)-12)/(Math.log2(1e6)-12);
    const ymin=Math.log10(2**20),ymax=Math.log10(8*2**40),ly=v=>pt+(H-pt-pb)*(1-(Math.log10(v)-ymin)/(ymax-ymin));
    let s='';
    [[2**20,'1 MiB'],[10*2**20,'10 MiB'],[100*2**20,'100 MiB'],[2**30,'1 GiB'],[10*2**30,'10 GiB'],[100*2**30,'100 GiB'],[2**40,'1 TiB']].forEach(([v,lab])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+lab+'</text>'});
    [4096,16384,65536,262144,1000000].forEach(v=>{s+='<text x="'+lx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v>=1e6?'1M':(v/1024)+'K')+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">context length, tokens (log scale)</text>';
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(B)+'" y2="'+ly(B)+'" stroke="var(--ink)" stroke-dasharray="5 4"/><text x="'+(pl+4)+'" y="'+(ly(B)-4)+'" font-size="10.5">'+(B/1e9)+' GB budget</text>';
    s+='<line x1="'+lx(T)+'" x2="'+lx(T)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    const ends=[];
    S.forEach(q=>{const pts=[];for(let e=12;e<=Math.log2(1e6)+1e-9;e+=0.25){const t=Math.min(2**e,1e6);pts.push(lx(t).toFixed(1)+','+ly(q.per*t+q.fix).toFixed(1))}pts.push(lx(1e6).toFixed(1)+','+ly(q.per*1e6+q.fix).toFixed(1));
      s+='<path d="M'+pts.join('L')+'" fill="none" stroke="'+q.c+'" stroke-width="2"'+(q.est?' stroke-dasharray="6 3"':q.dash?' stroke-dasharray="'+q.dash+'"':'')+'/>';
      s+='<circle cx="'+lx(T)+'" cy="'+ly(q.per*T+q.fix)+'" r="3.5" fill="'+q.c+'"/>';
      ends.push({y:ly(q.per*1e6+q.fix),q})});
    ends.sort((a,b)=>a.y-b.y);let last=-99;ends.forEach(e=>{e.ly=Math.max(e.y,last+15);last=e.ly});
    ends.forEach(e=>{s+='<text x="'+(W-pr+6)+'" y="'+(e.ly+4)+'" font-size="11" fill="'+e.q.c+'"><title>'+e.q.how+'</title>'+e.q.n+'</text>'});
    $('ccPin').innerHTML='<div class="t">Defaults reproduce the "437-fold" reduction</div>DeepSeek LLM 67B caches 2 × 8 × 128 × 95 × 2 = '+fmt(389120)+' bytes per token; V4.1-Flash reports 890. '+fmt(389120)+' ÷ 890 = <b>'+(389120/890).toFixed(1)+'</b>, the model card\'s "437-fold" (<a href="https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash" target="_blank" rel="noopener noreferrer">model card</a>, Figure 1(b); <a href="https://huggingface.co/deepseek-ai/deepseek-llm-67b-base/blob/main/config.json" target="_blank" rel="noopener noreferrer">67B config</a>). At '+(T>=1e6?'1M':fmt(T))+' tokens one 67B sequence needs '+fmtBytes(389120*T)+' against V4.1-Flash\'s '+fmtBytes(890*T)+'.';
    $('ccPlot').innerHTML=svgEl(W,H,s,'KV cache per sequence against context length');
    $('ccTab').innerHTML='<tr><th>Design</th><th class="num">Bytes per token</th><th class="num">One sequence at '+(T>=1e6?'1M':fmt(T))+'</th><th class="num">vs GQA-8</th><th class="num">Sequences in '+(B/1e9)+' GB</th></tr>'+
      S.map(q=>{const tot=q.per*T+q.fix,g=249856*T;return '<tr><td><span style="color:'+q.c+'">●</span> '+q.n+'<div class="small mute">'+q.how+'</div></td><td class="num">'+fmt(q.per,q.per%1?1:0)+'</td><td class="num">'+fmtBytes(tot)+'</td><td class="num">'+(100*tot/g).toFixed(tot/g<0.1?1:0)+'%</td><td class="num">'+fmt(Math.floor(B/tot))+'</td></tr>'}).join('');
  }
  $('ccT').addEventListener('input',draw);$('ccB').addEventListener('change',draw);
  onTab('t-cache',draw);
})();

// ---- Lineage: timeline dots and parameter bars ----
(function(){
  const E=[['L-llm','2023-11-29','LLM',67],['L-v2','2024-05-06','V2',236],['L-v3','2024-12-26','V3',671],['L-r1','2025-01-20','R1',671],['L-v31','2025-08-21','V3.1',0],['L-v32','2025-09-29','V3.2-Exp',0],['L-v4','2026-04-24','V4',1600],['L-vis','2026-08-21','V4 vision',0],['L-v41','2026-09-10','V4.1-Flash',552]];
  document.querySelectorAll('.pb').forEach(el=>{const t=+el.dataset.t,a=+el.dataset.a,a2=el.dataset.a2,n=el.dataset.n,max=1600;
    el.innerHTML=(n?'<div class="small" style="font-weight:600;margin-top:4px">'+n+'</div>':'')+'<div class="pbar"><span>Total</span><span class="track"><span class="fill" style="width:'+(100*t/max).toFixed(1)+'%;background:var(--dim)"></span></span><span>'+(t>=1000?(t/1000)+'T':t+'B')+'</span></div><div class="pbar"><span>Active</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,100*a/max).toFixed(1)+'%;background:var(--acc)"></span></span><span>'+(a2?a2+'B prefill, '+a+'B decode':a+'B')+' ('+(t/a).toFixed(0)+'×)</span></div>'});
  function draw(){
    const W=640,H=150,pl=20,pr=20,t0=Date.parse('2023-09-01'),t1=Date.parse('2026-11-01'),x=d=>pl+(W-pl-pr)*(Date.parse(d)-t0)/(t1-t0),y0=86;
    let s='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--line)" stroke-width="2"/>';
    ['2024','2025','2026'].forEach(yr=>{const xx=x(yr+'-01-01');s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(y0-6)+'" y2="'+(y0+6)+'" stroke="var(--mute)"/><text x="'+(xx+3)+'" y="'+(H-6)+'" font-size="11" fill="var(--mute)">'+yr+'</text><line x1="'+xx+'" x2="'+xx+'" y1="'+(y0+6)+'" y2="'+(H-4)+'" stroke="var(--line)"/>'});
    const R=e=>e[3]?4+Math.sqrt(e[3])/3.2:4;
    E.map((e,i)=>[e,i]).sort((a,b)=>R(b[0])-R(a[0])).forEach(([e,i])=>{const xx=x(e[1]),r=R(e),up=i%2===0,ly=up?y0-r-10:y0+r+18;
      s+='<g class="tld" data-id="'+e[0]+'" style="cursor:pointer" tabindex="0" role="button" aria-label="'+e[2]+'"><circle cx="'+xx+'" cy="'+y0+'" r="'+r.toFixed(1)+'" fill="'+(e[3]?'var(--acc)':'var(--bg)')+'" stroke="var(--acc)" stroke-width="2" fill-opacity="'+(e[3]?0.7:1)+'"/><text x="'+xx+'" y="'+ly+'" font-size="11.5" text-anchor="'+(i===E.length-1?'end':'middle')+'">'+e[2]+'</text></g>'});
    $('tlSvg').innerHTML=svgEl(W,H,s,'DeepSeek release timeline');
    $('tlSvg').querySelectorAll('.tld').forEach(g=>{const go=()=>{document.querySelectorAll('.tl-item').forEach(c=>c.classList.toggle('sel',c.id===g.dataset.id));$(g.dataset.id).scrollIntoView({block:'start',behavior:'smooth'})};g.addEventListener('click',go);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go()}})});
  }
  onTab('t-line',draw);
})();
