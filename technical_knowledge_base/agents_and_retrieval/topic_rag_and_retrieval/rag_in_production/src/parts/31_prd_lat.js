// ---- Latency waterfall (Reading, section 7): recorded timings, each stage with its source and load average ----
(function(){
if(!document.getElementById('pla-card'))return;
const P=window.PRD,LT=P.lat,PG=P.pipgen,esc=RD.esc,$=id=>document.getElementById(id);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
// Qwen3-1.7B time to first token: prompt tokens / the prefill rate the Pipeline lab recorded for that prompt-length band (derived)
function rate(n){const r=PG.rows.find(b=>n>=b.tokens[0]&&n<b.tokens[1])||PG.rows[PG.rows.length-1];return r.prefill_tps_p50}
const ttftPip=n=>1000*n/rate(n);
const med=a=>{const t=[...a].sort((x,y)=>x-y);return t.length%2?t[(t.length-1)/2]:(t[t.length/2-1]+t[t.length/2])/2};
// measured sweep (ttft.py), when recorded: median of 3 repeats per target length, linear between points
function curve(name){if(!P.ttft||!P.ttft.models[name])return null;const by={};P.ttft.models[name].sweep.forEach(r=>{(by[r.target]=by[r.target]||[]).push(r)});
  return {pts:Object.keys(by).map(Number).sort((a,b)=>a-b).map(t=>({n:med(by[t].map(r=>r.prompt_n)),ms:med(by[t].map(r=>r.ttft_ms))})),dec:med(P.ttft.models[name].sweep.map(r=>r.gen_tps).filter(x=>x))}}
function interp(pts,n){if(n<=pts[0].n)return pts[0].ms;for(let i=1;i<pts.length;i++)if(n<=pts[i].n){const a=pts[i-1],b=pts[i];return a.ms+(b.ms-a.ms)*(n-a.n)/(b.n-a.n)}
  const a=pts[pts.length-2],b=pts[pts.length-1];return b.ms+(b.ms-a.ms)*(n-b.n)/(b.n-a.n)}
const gen=()=>$('pla-g').value;
const ttftOf=n=>{const c=curve(gen());return c?interp(c.pts,n):ttftPip(n)};
const decRate=()=>{const c=curve(gen());return c?c.dec:PG.run.gen_tps_median};
const AT=LT.abstract_tokens,BASE=80;
if(P.ttft&&P.ttft.models['qwen3-4b'])$('pla-g').insertAdjacentHTML('beforeend','<option value="qwen3-4b">Qwen3-4B Q4_K_M, llama.cpp</option>');
function stages(){
  const e=$('pla-e').value,dev=$('pla-dev').value,s=$('pla-s').value,r=$('pla-r').value,K=+$('pla-k').value,k=+$('pla-k2').value,o=+$('pla-o').value,c=$('pla-c').value;
  const em=LT.embed.models[e],embed=dev==='mps'?em[0]:em[2];
  const search=s==='sci'?5183*1024*4/(LT.scan_gbps*1e9)*1000:LT.search_other[s+'_ms'];
  const rr=r==='none'?0:1000*K/LT.rerank_pairs_per_s[r];
  const pn=BASE+k*AT,ttft=ttftOf(pn),dec=1000*o/decRate();
  const st=[['embed query',c==='emb'||c==='ans'?0:embed,'--c1'],['search',c==='res'||c==='ans'?0:search,'--c3'],['rerank',c==='res'||c==='ans'?0:rr,'--c4'],
    ['prefill (to first token)',c==='ans'?0:ttft,'--c2'],['decode '+o+' tokens',c==='ans'?0:dec,'--c5']];
  return {st,pn};
}
function draw(){
  $('pla-kv').textContent=$('pla-k').value;$('pla-k2v').textContent=$('pla-k2').value;$('pla-ov').textContent=$('pla-o').value;
  const {st,pn}=stages(),host=$('pla-svg'),W=RD.width(host);
  const first=st.slice(0,4).reduce((a,x)=>a+x[1],0),total=first+st[4][1];
  $('pla-out').innerHTML=RD.stat('To first token',Math.round(first).toLocaleString('en-US')+' ms','sum of the stages')+RD.stat('To the last token',Math.round(total).toLocaleString('en-US')+' ms','')+
    RD.stat('Prompt tokens',Math.round(pn).toLocaleString('en-US'),'')+RD.stat('Largest stage',total>0?st.reduce((a,x)=>x[1]>a[1]?x:a)[0]:'none: served from the answer cache','');
  const lw=Math.min(150,W*0.36),x0=lw+6,x1=W-56,rowh=26,H=st.length*rowh+30,X=v=>x0+(total>0?v/total:0)*(x1-x0);let g='',t=0;
  st.forEach((x,i)=>{const y=6+i*rowh,w=Math.max(x[1]>0?1.5:0,X(t+x[1])-X(t));
    g+=RD.t(lw,y+15,x[0],{a:'end',fs:11})+'<rect x="'+X(t)+'" y="'+(y+3)+'" width="'+w+'" height="'+(rowh-9)+'" rx="2" fill="'+css(x[2])+'"/>'+
      RD.t(Math.min(X(t)+w+4,x1+4),y+15,(x[1]<10?x[1].toFixed(1):Math.round(x[1]).toLocaleString('en-US'))+' ms',{fs:10.5,fill:css('--mute')});t+=x[1]});
  g+='<line x1="'+X(first)+'" x2="'+X(first)+'" y1="2" y2="'+(H-22)+'" stroke="'+css('--ink')+'" stroke-dasharray="3 3"/>'+RD.t(X(first),H-8,'first token',{a:'middle',fs:10.5});
  host.innerHTML=RD.svg(W,H,g,'Latency waterfall');
  const e=$('pla-e').value,r=$('pla-r').value;
  $('pla-check').textContent='Load averages of the recorded runs: embedding '+LT.embed_load[e]+(r!=='none'?'; reranker '+LT.rerank_load[r]:'')+'; generator '+(P.ttft?P.ttft.loadavg_start[0]+' to '+P.ttft.loadavg_end[0]+' (this page\'s ttft.py sweep)':PG.run.loadavg_before[0]+' to '+PG.run.loadavg_after[0]+' (Pipeline lab run of '+PG.run.when+', '+PG.run.answers+' answers)')+'. Search on SciFact is derived from the Vector indexes page\'s measured scan rate ('+LT.scan_gbps+' GB/s per core); reranking from pairs per second; prefill and decode from llama-server\'s own timings.';
  if(P.e2e){const S=P.e2e.summary;const c=curve('qwen3-1.7b');const sum=LT.embed.models['qwen3-emb-0.6b'][0]+5183*1024*4/(LT.scan_gbps*1e9)*1000+30000/LT.rerank_pairs_per_s['ce-minilm-l6']+(c?interp(c.pts,S.prompt_n.p50):ttftPip(S.prompt_n.p50));
    $('pla-check').textContent+=' End-to-end check, default request (Qwen3-Embedding on MPS, exact search, MiniLM cross-encoder at K 30, Qwen3-1.7B with 5 abstracts, '+Math.round(S.prompt_n.p50)+' prompt tokens): measured p50 to first token '+Math.round(S.wall_to_first_token.p50)+' ms (p90 '+Math.round(S.wall_to_first_token.p90)+') against '+Math.round(sum)+' ms from the separate stage records; measured stage medians: embed '+S.embed.p50+', search '+S.search.p50+', rerank '+S.rerank.p50+', first token '+S.ttft.p50+' ms. The gap is GPU sharing: in one process the MPS embedder and cross-encoder and the Metal generator contend for the same GPU and memory, while each stage record was taken alone.'}
  ttChart();
}
function ttChart(){
  const host=$('pla-tt'),W=RD.width(host),H=190,x0=48,x1=W-12,y0=12,y1=H-32,mxn=4000,mxt=Math.max(ttftPip(mxn),...['qwen3-1.7b','qwen3-4b'].map(m=>{const c=curve(m);return c?Math.max(...c.pts.filter(q=>q.n<=mxn*1.02).map(q=>q.ms)):0}))*1.05;
  const X=v=>x0+v/mxn*(x1-x0),Y=v=>y1-v/mxt*(y1-y0);let g='';
  [0,0.5,1].forEach(f=>{const v=f*mxt;g+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+css('--line')+'"/>'+RD.t(x0-4,Y(v)+4,Math.round(v).toLocaleString('en-US'),{a:'end',fs:10,fill:css('--mute')})});
  [0,1000,2000,3000,4000].forEach(v=>g+=RD.t(X(v),y1+13,v.toLocaleString('en-US'),{a:'middle',fs:10,fill:css('--mute')}));
  g+=RD.t((x0+x1)/2,y1+27,'prompt tokens (ms to first token on the y axis)',{a:'middle',fs:10.5,fill:css('--mute')});
  let d='';for(let n=50;n<=mxn;n+=50)d+=(n>50?'L':'M')+X(n).toFixed(1)+','+Y(ttftPip(n)).toFixed(1);
  g+='<path d="'+d+'" fill="none" stroke="'+css('--dim')+'" stroke-width="2" stroke-dasharray="4 3"/>';
  [['qwen3-1.7b','--c1'],['qwen3-4b','--c2']].forEach(([m,col],j)=>{const c=curve(m);if(!c)return;let p='';c.pts.filter(q=>q.n<=mxn*1.02).forEach((q,i)=>p+=(i?'L':'M')+X(q.n).toFixed(1)+','+Y(q.ms).toFixed(1));
    g+='<path d="'+p+'" fill="none" stroke="'+css(col)+'" stroke-width="2"/>'+c.pts.filter(q=>q.n<=mxn*1.02).map(q=>'<circle cx="'+X(q.n)+'" cy="'+Y(q.ms)+'" r="3" fill="'+css(col)+'"/>').join('')+
      '<rect x="'+(x0+6)+'" y="'+(y0+j*14)+'" width="10" height="3" fill="'+css(col)+'"/>'+RD.t(x0+20,y0+5+j*14,(m==='qwen3-4b'?'Qwen3-4B':'Qwen3-1.7B')+' measured, decode '+c.dec.toFixed(0)+' tokens/s',{fs:10.5})});
  if(P.ttft)g+='<rect x="'+(x0+6)+'" y="'+(y0+28)+'" width="10" height="3" fill="'+css('--dim')+'"/>'+RD.t(x0+20,y0+33,'1.7B derived from the Pipeline lab records',{fs:10.5});
  const pn=BASE+(+$('pla-k2').value)*AT;if(pn<=mxn)g+='<line x1="'+X(pn)+'" x2="'+X(pn)+'" y1="'+y0+'" y2="'+y1+'" stroke="'+css('--ink')+'" stroke-dasharray="3 3"/>';
  host.innerHTML=RD.svg(W,H,g,'Time to first token by prompt length');
  $('pla-tt-cap').textContent=(P.ttft?'Solid lines: measured here with ttft.py (median of 3 streamed requests per length, cache_prompt off; load '+P.ttft.loadavg_start.join('/')+' to '+P.ttft.loadavg_end.join('/')+'). Dashed: ':'')+'Qwen3-1.7B Q4_K_M: prompt tokens divided by the median prefill rate of each prompt-length band in the Pipeline lab\'s records ('+PG.rows.map(b=>b.tokens[0]+' to '+b.tokens[1]+' tokens: '+b.prefill_tps_p50+' tokens/s over '+b.n+' calls').join('; ')+'); dots at each band\'s median prompt length. The band above 2,000 tokens rests on '+PG.rows[PG.rows.length-1].n+' calls.'+(P.ttft?'':' Not recorded yet: prompt caching, Qwen3-4B prefill, a single end-to-end timing.');
}
$('pla-src').innerHTML='Sources: query embedding p50 on MPS and on CPU from '+esc(LT.embed.src)+'; reranker time = K &divide; pairs per second ('+esc(LT.rerank_pairs_per_s.src)+'; MiniLM: mean of its SciFact and NFCorpus runs), a derived figure; search on Quora from the '+esc(LT.search_other.src)+'; exact search on SciFact derived from that page\'s measured scan rate; the generator from the root Pipeline lab\'s llama-server records (median prefill '+PG.run.prompt_tps_median+' and decode '+PG.run.gen_tps_median+' tokens/s over '+PG.run.answers+' answers). Prompt = '+BASE+' tokens of instructions and claim (assumed) + k &times; '+AT+' tokens (SciFact\'s mean abstract length in Qwen3 tokens). A server GPU is much faster for every model stage (not run here); the shape transfers.';
$('pla-card').querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',draw);el.addEventListener('change',draw)});
RD.onRender(draw);RD.onResize(draw);
draw();
})();
