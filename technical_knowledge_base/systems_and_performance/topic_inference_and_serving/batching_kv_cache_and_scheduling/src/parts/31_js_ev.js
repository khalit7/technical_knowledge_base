// ---- Eviction lab (t-ev): every chart from BKD.ev (src/evict/gen_evict.py) and BKD.evcheck (src/evict/check/vllm_evict.py) ----
(function(){
  const E=BKD.ev;if(!document.getElementById('ev-plot'))return;
  const $=id=>document.getElementById(id);
  const P=[['lru','LRU, tail first (vLLM, SGLang)','var(--c1)',''],['lru_head','LRU, head first','var(--c6)','5 3'],['fifo','FIFO','var(--c5)',''],['lfu','LFU','var(--c2)',''],['arc','ARC (vLLM host tier option)','var(--c4)',''],['opt','Belady (needs the future)','var(--ink)','2 3']];
  const KV={l70:327680,l8:131072,q06:114688};
  const fmtN=v=>v.toLocaleString('en-US');
  const pct=v=>(100*v).toFixed(1)+'%';
  const wid=el=>{const w=el.clientWidth;return w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  function capLabel(c,u){if(u==='b')return fmtN(c);const t=c*512;if(u==='t')return t>=1e6?(t/1e6).toFixed(t>=1e7?0:1)+'M':Math.round(t/1000)+'k';const g=t*KV[u]/1e9;return g>=100?Math.round(g)+' GB':g>=10?g.toFixed(0)+' GB':g.toFixed(1)+' GB'}
  function capFull(c,u){const t=c*512;let s=fmtN(c)+' blocks = '+fmtN(t)+' tokens';if(KV[u])s+=' = '+(t*KV[u]/1e9).toFixed(1)+' GB';return s}
  function plot(){
    const tr=E.traces[$('ev-tr').value],w=+$('ev-w').value,u=$('ev-u').value,ci=+$('ev-cap').value;
    const el=$('ev-plot'),W=Math.max(300,Math.min(860,wid(el))),H=W<480?240:280,L=40,R=10,T=10,B=34;
    const n=E.caps.length,x=i=>L+(W-L-R)*i/(n-1),inf=w?tr.stats.inf_hit_tok:tr.stats.inf_hit,ym=Math.min(1,Math.ceil(inf*10+0.5)/10),y=v=>T+(H-T-B)*(1-v/ym);
    let b='';
    for(let v=0;v<=ym+1e-9;v+=0.1){b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
    const step=W<480?3:2;
    E.caps.forEach((c,i)=>{if(i%step===0||i===n-1)b+=RD.t(x(i),H-B+14,capLabel(c,u),{a:i===n-1?'end':(i===0?'start':'middle'),fs:10,fill:'var(--mute)'})});
    b+=RD.t((L+W-R)/2,H-4,'cache size ('+(u==='b'?'blocks of 512 tokens':u==='t'?'tokens':'GB of KV cache')+', log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(inf)+'" y2="'+y(inf)+'" stroke="var(--good)" stroke-dasharray="1 3" stroke-width="1.5"/>'+RD.t(W-R,y(inf)-4,'unlimited '+pct(inf),{a:'end',fs:10,fill:'var(--good)'});
    P.forEach(p=>{const row=tr.grid[p[0]];b+='<polyline fill="none" stroke="'+p[2]+'" stroke-width="'+(p[0]==='lru'?2.4:1.6)+'"'+(p[3]?' stroke-dasharray="'+p[3]+'"':'')+' points="'+row.map((r,i)=>x(i).toFixed(1)+','+y(r[w]).toFixed(1)).join(' ')+'"/>'});
    b+='<line x1="'+x(ci)+'" x2="'+x(ci)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    el.innerHTML=RD.svg(W,H,b,'hit rate against cache size');
    $('ev-leg').innerHTML=P.map(p=>'<span style="--sw:'+p[2]+'">'+p[1]+'</span>').join('');
    $('ev-capv').textContent=capFull(E.caps[ci],u);
    const best=tr.grid.opt[ci][w];
    $('ev-tbl').innerHTML='<thead><tr><th>Policy</th><th class="num">Hit rate, blocks</th><th class="num">Hit rate, tokens</th><th class="num">Share of Belady</th><th class="num">Orphans met</th></tr></thead><tbody>'+
      P.map(p=>{const r=tr.grid[p[0]][ci];return '<tr'+(p[0]==='lru'?' class="ev-best"':'')+'><td>'+p[1]+'</td><td class="num">'+pct(r[0])+'</td><td class="num">'+pct(r[1])+'</td><td class="num">'+(best>0?(100*r[w]/best).toFixed(0)+'%':'')+'</td><td class="num">'+fmtN(r[2])+'</td></tr>'}).join('')+'</tbody>';
    $('ev-note').innerHTML='<span class="ev-tag" style="color:var(--c6)">trace</span> '+fmtN(tr.stats.n)+' requests, '+fmtN(tr.stats.blocks)+' prompt blocks, '+fmtN(tr.stats.unique)+' distinct. A block counts as a hit only if every block before it in the same prompt also hit. "Orphans met": cached blocks a request found after its first miss, unusable because their prefix was gone. GB use the model\'s KV bytes per token in BF16 (2 x layers x KV heads x head size x 2 bytes).';
  }
  // section 2: tiers
  const PF={l70:[0.4235/2000,327680,'Llama 3.1 70B: prefill 0.21 ms per token (the parent\'s planner), reload 327,680 bytes per token at 64 GB/s'],l8:[2*7504658432/(989.5e12*0.5),131072,'Llama 3.1 8B: prefill 30 us per token (simulator roofline at 50% of 989.5 TFLOP/s), reload 131,072 bytes per token at 64 GB/s']};
  function tiers(){
    const t=$('ev2-tr').value,g=+$('ev2-g').value,m=$('ev2-m').value,tr=E.traces[t];
    const rows=E.tiers[t].filter(r=>r[0]===g),mx=Math.max(...rows.map(r=>r[2]+r[3]),tr.stats.inf_hit)*1.02;
    const pf=PF[m][0],ld=PF[m][1]/64e9,meanIn=tr.stats.mean_in;
    $('ev2-bars').innerHTML=rows.map(r=>{const saved=meanIn*((r[4]+r[5])*pf-r[5]*ld);
      return '<div class="row"><div class="nm">host '+(r[1]?fmtN(r[1])+' blocks':'none')+'<span class="ml">'+(r[1]?(r[1]*512*PF[m][1]/1e9).toFixed(0)+' GB':'GPU only')+'</span></div><div class="track"><div class="fill" style="width:'+(100*r[2]/mx).toFixed(2)+'%;background:var(--c1)"></div><div class="fill" style="left:'+(100*r[2]/mx).toFixed(2)+'%;width:'+(100*r[3]/mx).toFixed(2)+'%;background:var(--good)"></div></div><div class="val">'+pct(r[2]+r[3])+'<span class="ml">'+(saved*1000).toFixed(0)+' ms saved</span></div></div>'}).join('');
    $('ev2-note').innerHTML='Blue: hits in the GPU tier ('+fmtN(g)+' blocks = '+(g*512*PF[m][1]/1e9).toFixed(0)+' GB); green: hits loaded from host memory. Unlimited cache: '+pct(tr.stats.inf_hit)+'. "Saved" is per request on average: mean prompt '+fmtN(Math.round(meanIn))+' tokens x (hit share x prefill time per token, minus host-hit share x reload time per token). '+PF[m][2]+'.';
  }
  function tables(){
    const N={conversation:'Conversation',toolagent:'Tool and agent',synthetic:'Synthetic'};
    $('ev3-tbl').innerHTML='<thead><tr><th>Trace</th><th class="num">Requests</th><th class="num">Span</th><th class="num">Mean input</th><th class="num">Mean output</th><th class="num">Prompt blocks</th><th class="num">Distinct</th><th class="num">Unlimited hit rate</th></tr></thead><tbody>'+
      Object.keys(N).map(k=>{const s=E.traces[k].stats;return '<tr><td>'+N[k]+'</td><td class="num">'+fmtN(s.n)+'</td><td class="num">'+Math.round(s.span_s/60)+' min</td><td class="num">'+fmtN(Math.round(s.mean_in))+'</td><td class="num">'+fmtN(Math.round(s.mean_out))+'</td><td class="num">'+fmtN(s.blocks)+'</td><td class="num">'+fmtN(s.unique)+'</td><td class="num">'+pct(s.inf_hit)+'</td></tr>'}).join('')+'</tbody>';
    const t1=E.table1,cl=c=>c===null?'unlimited':fmtN(c);
    $('ev3-t1').innerHTML='<thead><tr><th>Mooncake report Table 1 (arXiv trace)</th>'+t1.caps.map(c=>'<th class="num">'+cl(c)+'</th>').join('')+'</tr></thead><tbody>'+
      [['LRU, published','published','lru'],['LRU, this replay','ours','lru'],['LFU, published','published','lfu'],['LFU, this replay','ours','lfu'],['LengthAware, published','published','lengthaware'],['ARC, this replay','ours','arc'],['Belady, this replay','ours','opt']].map(r=>'<tr><td>'+r[0]+'</td>'+t1[r[1]][r[2]].map(v=>'<td class="num">'+(100*v).toFixed(r[1]==='published'?0:1)+'%</td>').join('')+'</tr>').join('')+'</tbody>';
    const f9=E.fig9.ours;
    $('ev3-note').innerHTML='<span class="ev-tag" style="color:var(--c4)">authors\' figures</span> against <span class="ev-tag" style="color:var(--c6)">trace</span> replays. Table 1 ({{Mooncake arXiv report, section 4.2|https://arxiv.org/abs/2407.00079}}) does not reproduce exactly: same shape (LRU ahead of LFU at middle sizes; little gain past 50,000 blocks) but this replay of the released file ('+fmtN(t1.stats.n)+' requests, mean input '+fmtN(Math.round(t1.stats.mean_in))+' tokens) runs 2 to 6 points higher; the report gives a mean input of 7,590 tokens, the file 8,590, so the table may come from another cut of the data. LengthAware ("similar to LFU but prioritizing cache blocks occurring later in requests") is not described precisely enough to re-implement. FAST\'25 Fig. 9 prints, for a 3-million-token local cache, the hit rate as a share of the unlimited one: 75%, 46%, 48% and 41%; LRU here gives '+pct(f9.toolagent)+' (tool and agent), '+pct(f9.all)+' (all three merged), '+pct(f9.synthetic)+' (synthetic) and '+pct(f9.conversation)+' (conversation), so the labels most likely belong in that order.';
    $('ev4-tbl').innerHTML='<thead><tr><th>Trace (first 3,000 requests)</th><th class="num">Cache, blocks</th><th class="num">Prompt blocks</th><th class="num">vLLM hits</th><th class="num">Re-implementation</th><th class="num">Lab LRU</th><th>Same</th></tr></thead><tbody>'+
      BKD.evcheck.map(c=>c.rows.map(r=>'<tr><td>'+c.trace.replace('_trace.jsonl','')+'</td><td class="num">'+fmtN(r.cap)+'</td><td class="num">'+fmtN(r.blocks)+'</td><td class="num">'+fmtN(r.vllm_hit_blocks)+'</td><td class="num">'+fmtN(r.exact_hit_blocks)+'</td><td class="num">'+fmtN(r.lab_lru_hit_blocks)+'</td><td>'+(r.identical?'yes':'NO')+'</td></tr>').join('')).join('')+'</tbody>';
  }
  ['ev-tr','ev-w','ev-u'].forEach(id=>$(id).addEventListener('change',plot));$('ev-cap').addEventListener('input',plot);
  ['ev2-tr','ev2-g','ev2-m'].forEach(id=>$(id).addEventListener('change',tiers));
  const all=()=>{plot();tiers();tables()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-ev']=[all];
  let tm=0;addEventListener('resize',()=>{if($('t-ev').hidden)return;clearTimeout(tm);tm=setTimeout(plot,80)});
  all();
})();
