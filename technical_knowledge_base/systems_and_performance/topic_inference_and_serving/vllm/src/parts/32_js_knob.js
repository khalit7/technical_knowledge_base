// ---- Knob lab tab: the CPU image's runs (data: window.VL_KNOB, built by src/knob/build_knob.py) ----
(function(){
  const K=window.VL_KNOB;if(!K||!K.runs)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const f=(v,d)=>v==null||isNaN(v)?'n/a':(+v).toLocaleString('en-GB',{maximumFractionDigits:d==null?2:d,minimumFractionDigits:d==null?0:Math.min(d,2)});
  const R=t=>K.runs[t];
  const reps=pre=>[1,2].map(r=>R(pre+'_r'+r)).filter(Boolean);
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
  const load=r=>r?'load '+r.load_before[0].toFixed(1)+' to '+r.load_after[0].toFixed(1):'';
  // horizontal bars: rows [{label, vals:[...], note}], unit, colour; each repetition drawn as a tick, the bar at the mean
  function bars(el,title,rows,unit,col,lowerBetter){
    const w=RD.width(el),lw=Math.min(150,w*.34),vw=70,bw=Math.max(60,w-lw-vw-12),max=Math.max(...rows.flatMap(r=>r.vals))*1.08||1;
    let b='',y=4;rows.forEach(r=>{const m=mean(r.vals);b+=RD.t(0,y+15,esc(r.label),{fs:11.5})+'<rect x="'+lw+'" y="'+(y+3)+'" width="'+Math.max(1,bw*m/max)+'" height="16" rx="3" fill="'+col+'" opacity=".8"></rect>';
      r.vals.forEach(v=>{b+='<line x1="'+(lw+bw*v/max)+'" x2="'+(lw+bw*v/max)+'" y1="'+(y+1)+'" y2="'+(y+21)+'" stroke="var(--ink)" stroke-width="1.5"></line>'});
      b+=RD.t(lw+bw+6,y+15,f(m,Number.isInteger(m)?0:(m<10?2:0))+(unit?' '+unit:''),{fs:11});y+=26});
    el.insertAdjacentHTML('beforeend','<div class="small" style="font-weight:600;margin-top:6px">'+title+(lowerBetter?' <span class="mute">(lower is better)</span>':'')+'</div><div class="vl-k-chart">'+RD.svg(w,y+2,b,title)+'</div>');
  }
  function setup(){const r=R('k0_default');if(!r)return;const lg=(K.log_k0_default||[]);
    const kvl=lg.find(l=>/KV cache size/.test(l))||'',mr=lg.find(l=>/Model Runner/.test(l))||'';
    $('vl-k-setup').innerHTML='<div class="co"><div class="t">Set-up, identical for every run unless the row says otherwise</div>Image <span class="mono">vllm/vllm-openai-cpu:v0.31.0-arm64</span> in Docker Desktop (5 CPUs, about 9.7 GiB) on an Apple M1 Pro; model Qwen/Qwen3-0.6B (revision c1899de2) in float32, <span class="mono">--max-model-len 4096</span>; KV cache set with <span class="mono">VLLM_CPU_KVCACHE_SPACE</span> (GiB); load from the parent page\'s load generator (<span class="mono">src/bench/scripts/loadgen.py</span>: streamed completions, <span class="mono">ignore_eos</span> so every answer has the requested length, one warm-up request, a unique tag per run so runs do not hit each other\'s cache); /metrics scraped every second. Each sweep point ran twice; bars show the mean, ticks each run. The laptop was shared, so each row records the 1-minute load average before and after.<br><span class="small">Start-up log, default run: <span class="mono">'+esc(kvl.replace(/^\(EngineCore pid=\d+\) INFO \S+ \S+ /,''))+'</span>; and <span class="mono">'+esc(mr.replace(/^\(APIServer pid=\d+\) WARNING \S+ \S+ /,''))+'</span></span></div>';
  }
  function seqs(){const el=$('vl-k-seqs');el.innerHTML='';const S=[2,4,16].map(s=>({s,rs:reps('seqs'+s)})).filter(x=>x.rs.length);if(!S.length)return;
    el.insertAdjacentHTML('beforeend','<p>Sixteen users in a closed loop (each sends its next request when its answer ends), '+S[0].rs[0].prompt_tokens_A.join(' or ')+'-token prompts, 64-token answers, 32 requests, a 3 GiB cache so memory never binds (4 GiB was refused at start-up: the worker found only 3.45 of the VM\'s 9.72 GiB free after loading the float32 model, and said so). Only <span class="mono">--max-num-seqs</span> changes.</p>');
    bars(el,'Output tokens per second, whole server',S.map(x=>({label:'max_num_seqs '+x.s,vals:x.rs.map(r=>r.A.out_tok_per_s)})),'tok/s','var(--c1)');
    bars(el,'Time per output token, median request',S.map(x=>({label:'max_num_seqs '+x.s,vals:x.rs.map(r=>r.A.tpot_p50*1000)})),'ms','var(--c2)',1);
    bars(el,'Time to first token, median request',S.map(x=>({label:'max_num_seqs '+x.s,vals:x.rs.map(r=>r.A.ttft_p50)})),'s','var(--c4)',1);
    el.insertAdjacentHTML('beforeend','<div class="tw"><table><tr><th>max_num_seqs</th><th>peak running</th><th>peak waiting</th><th>peak KV usage</th><th>preemptions</th></tr>'+S.map(x=>'<tr><td>'+x.s+'</td><td>'+x.rs.map(r=>r.peaks.num_requests_running).join(', ')+'</td><td>'+x.rs.map(r=>r.peaks.num_requests_waiting).join(', ')+'</td><td>'+x.rs.map(r=>f(r.peaks.kv_cache_usage_perc*100,0)+'%').join(', ')+'</td><td>'+x.rs.map(r=>r.deltas['vllm:num_preemptions_total']).join(', ')+'</td></tr>').join('')+'</table></div><p class="small mute">Machine load (1-minute average, before to after each run): '+S.map(x=>x.s+': '+x.rs.map(r=>r.load_before[0].toFixed(1)+' to '+r.load_after[0].toFixed(1)).join(', ')).join('; ')+'. Each pair of values in a cell is run 1, run 2.</p><p class="small" id="vl-k-seqs-note"></p>');
  }
  function chunk(){const el=$('vl-k-chunk');el.innerHTML='';const C=[128,2048].map(c=>({c,rs:reps('chunk'+c)})).filter(x=>x.rs.length);if(!C.length)return;
    el.insertAdjacentHTML('beforeend','<p>Three users stream long answers ('+C[0].rs[0].prompt_tokens_A.join(' or ')+'-token prompts, 128 tokens out) while four long prompts ('+f(C[0].rs[0].prompt_tokens_B[0],0)+' tokens, 8 tokens out) arrive at random (Poisson, 0.08 per second). Only <span class="mono">--max-num-batched-tokens</span> changes: 128 tokens per step, shared with the decodes, spreads each long prompt over at least '+Math.ceil(C[0].rs[0].prompt_tokens_B[0]/128)+' steps; 2,048 reads it in one step.</p>');
    bars(el,'Streaming users: longest gap between two tokens',C.map(x=>({label:'budget '+x.c,vals:x.rs.map(r=>r.gap_max*1000)})),'ms','var(--c2)',1);
    bars(el,'Streaming users: 99th percentile gap',C.map(x=>({label:'budget '+x.c,vals:x.rs.map(r=>r.A.itl_p99*1000)})),'ms','var(--c5)',1);
    bars(el,'Streaming users: median gap between tokens',C.map(x=>({label:'budget '+x.c,vals:x.rs.map(r=>r.A.itl_p50*1000)})),'ms','var(--c3)',1);
    bars(el,'Long prompts: median time to first token',C.map(x=>({label:'budget '+x.c,vals:x.rs.filter(r=>r.B).map(r=>r.B.ttft_p50)})),'s','var(--c4)',1);
    el.insertAdjacentHTML('beforeend','<p class="small mute">Machine load: '+C.map(x=>'budget '+x.c+': '+x.rs.map(r=>r.load_before[0].toFixed(1)+' to '+r.load_after[0].toFixed(1)).join(', ')).join('; ')+'.</p><p class="small" id="vl-k-chunk-note"></p>');
  }
  function kv(){const el=$('vl-k-kv');el.innerHTML='';const big=reps('seqs16'),small=reps('kv1');if(!big.length||!small.length)return;
    const rows=[['1 GiB',small],['3 GiB',big]];
    el.insertAdjacentHTML('beforeend','<p>The sixteen-user load of section 1 with <span class="mono">max_num_seqs 16</span>, at two cache sizes. Neither run preempted once (the counter stayed at 0 in all four). vLLM\'s start-up line gives each cache in tokens: '+rows.map(x=>x[0]+' = '+f(x[1][0].kv_tokens,0)+' tokens').join(', ')+' (229,376 bytes per token in float32, whole 128-token blocks).</p>');
    bars(el,'Peak KV cache usage',rows.map(x=>({label:x[0],vals:x[1].map(r=>r.peaks.kv_cache_usage_perc*100)})),'%','var(--c3)');
    bars(el,'Peak requests waiting',rows.map(x=>({label:x[0],vals:x[1].map(r=>r.peaks.num_requests_waiting)})),'','var(--c2)',1);
    bars(el,'Output tokens per second',rows.map(x=>({label:x[0],vals:x[1].map(r=>r.A.out_tok_per_s)})),'tok/s','var(--c1)');
    bars(el,'Peak requests running',rows.map(x=>({label:x[0],vals:x[1].map(r=>r.peaks.num_requests_running)})),'','var(--c3)');
    el.insertAdjacentHTML('beforeend','<p class="small mute">Machine load: '+rows.map(x=>x[0]+': '+x[1].map(r=>r.load_before[0].toFixed(1)+' to '+r.load_after[0].toFixed(1)).join(', ')).join('; ')+'.</p><p class="small" id="vl-k-kv-note"></p>');
  }
  // time series
  let tsRun=null;
  function ts(){const el=$('vl-k-ts');const opts=['seqs16_r1','kv1_r1','seqs2_r1','chunk128_r1'].filter(t=>R(t));if(!opts.length)return;tsRun=tsRun||opts[0];
    el.innerHTML='<p>The same scrape vLLM\'s own dashboards read, one point per second. Gauges are drawn as they are; preemptions and generated tokens are counters, drawn as their increase per second.</p><div class="seg" id="vl-k-ts-seg">'+opts.map(t=>'<button data-m="'+t+'"'+(t===tsRun?' class="on"':'')+'>'+t.replace('_r1','').replace('seqs','max_num_seqs ').replace('kv1','1 GiB cache').replace('chunk128','budget 128')+'</button>').join('')+'</div><div class="vl-k-chart" id="vl-k-ts-svg"></div><div class="vl-leg small" id="vl-k-ts-leg"></div>';
    RD.seg($('vl-k-ts-seg'),m=>{tsRun=m;drawTs()});drawTs()}
  function drawTs(){const el=$('vl-k-ts-svg');if(!el)return;const r=R(tsRun),F=K.ts_fields,ix=n=>1+F.indexOf(n);
    const pts=r.ts.filter(p=>p[ix('num_requests_running')]!=null);if(pts.length<2){el.innerHTML='';return}
    const w=RD.width(el),h=210,x0=34,y0=10,pw=w-x0-40,ph=h-40,T=pts[pts.length-1][0];
    const X=t=>x0+pw*t/T;
    const run=pts.map(p=>p[ix('num_requests_running')]),wait=pts.map(p=>p[ix('num_requests_waiting')]),kvu=pts.map(p=>p[ix('kv_cache_usage_perc')]);
    const pre=pts.map((p,i)=>i?Math.max(0,p[ix('num_preemptions_total')]-pts[i-1][ix('num_preemptions_total')]):0);
    const gen=pts.map((p,i)=>i?Math.max(0,(p[ix('generation_tokens_total')]-pts[i-1][ix('generation_tokens_total')])/Math.max(.2,p[0]-pts[i-1][0])):0);
    const ymax=Math.max(1,...run,...wait);const Y=v=>y0+ph-ph*v/ymax,Yk=v=>y0+ph-ph*v,gmax=Math.max(1,...gen),Yg=v=>y0+ph-ph*v/gmax;
    const line=(arr,Yf,col,dash)=>'<polyline fill="none" stroke="'+col+'" stroke-width="1.8"'+(dash?' stroke-dasharray="4 3"':'')+' points="'+pts.map((p,i)=>X(p[0]).toFixed(1)+','+Yf(arr[i]).toFixed(1)).join(' ')+'"></polyline>';
    let b='<line x1="'+x0+'" x2="'+(x0+pw)+'" y1="'+(y0+ph)+'" y2="'+(y0+ph)+'" stroke="var(--line)"></line>';
    b+=line(gen,Yg,'var(--c6)',1)+line(run,Y,'var(--c1)')+line(wait,Y,'var(--c2)')+line(kvu,Yk,'var(--c3)');
    pts.forEach((p,i)=>{if(pre[i])b+='<line x1="'+X(p[0])+'" x2="'+X(p[0])+'" y1="'+y0+'" y2="'+(y0+ph)+'" stroke="var(--bad)" opacity=".5"></line>'+RD.t(X(p[0])+2,y0+10,String(pre[i]),{fs:10,fill:'var(--bad)'})});
    b+=RD.t(2,y0+8,String(ymax),{fs:10,fill:'var(--mute)'})+RD.t(2,y0+ph,'0',{fs:10,fill:'var(--mute)'})+RD.t(x0+pw+4,y0+8,'100%',{fs:10,fill:'var(--c3)'})+RD.t(x0,h-8,'0 s',{fs:10,fill:'var(--mute)'})+RD.t(x0+pw,h-8,Math.round(T)+' s',{fs:10,fill:'var(--mute)',a:'end'});
    el.innerHTML=RD.svg(w,h,b,'metrics over time');
    $('vl-k-ts-leg').innerHTML='<span style="color:var(--c1)">&#9644; num_requests_running</span><span style="color:var(--c2)">&#9644; num_requests_waiting</span><span style="color:var(--c3)">&#9644; kv_cache_usage_perc (right scale)</span><span style="color:var(--c6)">- - generation tokens per second (scaled to its peak, '+f(gmax,0)+')</span><span style="color:var(--bad)">| preemptions in that second</span>';
  }
  const EXPL={
    'vllm:num_requests_running':'Requests in the running list after the last step. Pinned at max_num_seqs: the concurrency cap binds.',
    'vllm:num_requests_waiting':'Requests waiting for admission. Growing: demand above capacity (memory or the cap).',
    'vllm:num_requests_waiting_by_reason':'Waiting requests split by why they wait (capacity or deferred).',
    'vllm:engine_sleep_state':'1 when awake; sleep mode (RL weight swaps) frees the GPU.',
    'vllm:kv_cache_usage_perc':'Share of blocks held by running requests (0 to 1). Cached but unused blocks count as free.',
    'vllm:prefix_cache_queries_total':'Prompt tokens looked up in the prefix cache.',
    'vllm:prefix_cache_hits_total':'Of those, tokens found. Hit rate = hits / queries.',
    'vllm:external_prefix_cache_queries_total':'Lookups in an external KV connector tier (LMCache, offload).',
    'vllm:external_prefix_cache_hits_total':'Hits in that tier.',
    'vllm:mm_cache_queries_total':'Multimodal encoder-output cache lookups.','vllm:mm_cache_hits_total':'Multimodal cache hits.',
    'vllm:num_preemptions_total':'Preemptions: running requests evicted to free blocks. Any steady rise means the cache is too small for the load.',
    'vllm:prompt_tokens_total':'Prompt tokens received (cached or not).','vllm:prompt_tokens_by_source_total':'Prompt tokens by where their KV came from (computed, local cache, external).',
    'vllm:prompt_tokens_cached_total':'Prompt tokens served from a cache.','vllm:generation_tokens_total':'Output tokens: its rate is throughput.',
    'vllm:request_success_total':'Finished requests, labelled by reason (stop, length, abort).',
    'vllm:request_prompt_tokens':'Histogram of prompt lengths: your traffic\'s shape.','vllm:request_generation_tokens':'Histogram of output lengths.',
    'vllm:iteration_tokens_total':'Tokens per engine step: how full the budget is.','vllm:request_max_num_generation_tokens':'Histogram of the largest output per request.',
    'vllm:request_params_n':'The n parameter (parallel samples) per request.','vllm:request_params_max_tokens':'The max_tokens requested.',
    'vllm:time_to_first_token_seconds':'TTFT as the server measures it: arrival to first token. Alert on its p99.',
    'vllm:inter_token_latency_seconds':'Every gap between consecutive tokens. Its tail shows prefill chunks stalling decodes.',
    'vllm:request_time_per_output_token_seconds':'Per request mean gap (TPOT).','vllm:e2e_request_latency_seconds':'Arrival to last token.',
    'vllm:request_queue_time_seconds':'Time in the waiting queue before first scheduled. High with low KV usage: head-of-line blocking.',
    'vllm:request_inference_time_seconds':'From first scheduled to finished (prefill plus decode).','vllm:request_prefill_time_seconds':'First scheduled to first token.',
    'vllm:request_decode_time_seconds':'First token to last.','vllm:request_num_preemptions':'Preemptions per finished request.',
    'vllm:request_prefill_kv_computed_tokens':'Prompt tokens actually computed per request (prompt minus cache hits).',
    'vllm:cache_config_info':'Constant 1 whose labels carry the cache configuration (block size, dtype, utilization).',
    'vllm:estimated_flops_per_gpu_total':'Estimated FLOPs (performance accounting; 0 on this CPU backend).','vllm:estimated_read_bytes_per_gpu_total':'Estimated bytes read (0 here).','vllm:estimated_write_bytes_per_gpu_total':'Estimated bytes written (0 here).',
    'vllm:prefix_cache_evicted_blocks_total':'Added by this page\'s patch: cached blocks evicted to make room.'};
  function met(){const M=K.metrics_k0_default;if(!M)return;const r=R('k0_default');
    const val=v=>v.value!=null?f(v.value,v.value%1?3:0):(v.count!=null?'n '+f(v.count,0)+', mean '+(v.count?f(v.sum/v.count,3):'n/a'):'n/a');
    $('vl-k-met').innerHTML='<p>All '+Object.keys(M).length+' metric families the default server exported at <span class="mono">/metrics</span>, before and after its run (4 users, 12 requests plus a warm-up). Histograms show their count and mean.</p><div class="tw"><table class="vl-m"><tr><th>Metric</th><th>Type</th><th>Before</th><th>After</th><th>What it tells you</th></tr>'+Object.entries(M).map(([n,v])=>'<tr><td>'+esc(n)+'</td><td>'+esc(v.type||'')+'</td><td>'+val(v.before)+'</td><td>'+val(v.after)+'</td><td>'+esc(EXPL[n]||v.help||'')+'</td></tr>').join('')+'</table></div><p class="small" id="vl-k-met-note"></p>';
  }
  function patch(){const r=R('evict_patched');const el=$('vl-k-patch');if(!r){el.innerHTML='';return}
    const d=r.deltas;el.innerHTML='<p>The patched files of Reading section 8 mounted over the image\'s package, a 1 GiB cache ('+f(r.kv_tokens,0)+' tokens), and prefix-heavy traffic: 8 users, a shared 900-word prefix plus 150 words of their own, 32-token answers, 32 requests. The new counter appears in <span class="mono">/metrics</span> next to the hit counters:</p><div class="vl-k-cnt">'+RD.stat('prefix_cache_queries',f(d['vllm:prefix_cache_queries_total'],0),'tokens looked up')+RD.stat('prefix_cache_hits',f(d['vllm:prefix_cache_hits_total'],0),'hit rate '+f(100*d['vllm:prefix_cache_hits_total']/Math.max(1,d['vllm:prefix_cache_queries_total']),1)+'%')+RD.stat('prefix_cache_evicted_blocks',f(d['vllm:prefix_cache_evicted_blocks_total'],0),'blocks of 128 tokens')+RD.stat('num_preemptions',f(d['vllm:num_preemptions_total'],0))+'</div><p class="small" id="vl-k-patch-note"></p>';
  }
  function all(){setup();seqs();chunk();kv();ts();met();patch();if(window.VL_NOTES)window.VL_NOTES()}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-knob']=window.TAB_RENDER['t-knob']||[]).push(all);
  RD.onResize(all,'t-knob');
})();
// ---- Knob lab: conclusions, computed from the same data (means of the two runs) ----
window.VL_NOTES=function(){
  const K=window.VL_KNOB,R=t=>K.runs[t],m=(p,g)=>{const a=[1,2].map(r=>R(p+'_r'+r)).filter(Boolean).map(g);return a.reduce((x,y)=>x+y,0)/a.length};
  const f=(v,d)=>(+v).toLocaleString('en-GB',{maximumFractionDigits:d,minimumFractionDigits:d});
  const set=(id,h)=>{const e=document.getElementById(id);if(e)e.innerHTML=h};
  if(R('seqs2_r1')&&R('seqs16_r1')){const t2=m('seqs2',r=>r.A.out_tok_per_s),t16=m('seqs16',r=>r.A.out_tok_per_s),p2=m('seqs2',r=>r.A.tpot_p50*1000),p16=m('seqs16',r=>r.A.tpot_p50*1000),f2=m('seqs2',r=>r.A.ttft_p50),f16=m('seqs16',r=>r.A.ttft_p50);
    set('vl-k-seqs-note','<b>Reading it.</b> From 2 to 16 running requests, throughput rose '+f(t16/t2,1)+' times ('+f(t2,1)+' to '+f(t16,1)+' tokens per second) while each user\'s median time per token rose '+f(p16/p2,1)+' times ('+f(p2,0)+' to '+f(p16,0)+' ms): the trade of section 3 of the parent page, on a real engine. Time to first token <i>fell</i> from '+f(f2,1)+' s to '+f(f16,1)+' s, because with a small cap the other users wait in the queue, and queueing counts in TTFT. On a GPU the gain from batching is usually much larger, because a decode step there is bound by reading the weights, which more users share; on this CPU each extra user adds a larger share of arithmetic to every step (most likely: float32 matrix work on 5 cores, not measured separately).')}
  if(R('chunk128_r1')&&R('chunk2048_r1')){const g1=m('chunk128',r=>r.gap_max),g2=m('chunk2048',r=>r.gap_max),c1=m('chunk128',r=>r.B.ttft_p50),c2=m('chunk2048',r=>r.B.ttft_p50),p1=m('chunk128',r=>r.A.itl_p99*1000),p2=m('chunk2048',r=>r.A.itl_p99*1000);
    set('vl-k-chunk-note','<b>Reading it.</b> With a 2,048-token budget each long prompt is read in one step, and every user already streaming waits for that step: the longest gap averaged '+f(g2,1)+' s. With 128, the same prompts are spread over many short steps and the longest gap was '+f(g1,2)+' s; the price is the long prompts\' own first token, '+f(c1,1)+' s against '+f(c2,1)+' s. The 99th percentile ('+f(p1,0)+' against '+f(p2,0)+' ms on average) swings between the two runs because only about a dozen of the '+f(R('chunk128_r1').n_gaps,0)+' gaps are stalls, right at the 1% boundary: look at the maximum, or count gaps above an SLO, when stalls are rare. This is the trade chunked prefill makes, and the reason the API server\'s default budget (2,048 on most GPUs, 8,192 on H100-class) is smaller than the offline class\'s.')}
  if(R('kv1_r1')&&R('seqs16_r1')){const r1=R('kv1_r1');
    set('vl-k-kv-note','<b>Reading it.</b> The 1 GiB cache ('+f(r1.kv_tokens,0)+' tokens) never preempted: with prompts of about 410 tokens and 64-token answers, the admission rule (the whole prompt must fit, Reading section 2) kept at most '+r1.peaks.num_requests_running+' requests running, with KV usage peaking at '+f(r1.peaks.kv_cache_usage_perc*100,0)+'% and up to '+r1.peaks.num_requests_waiting+' waiting. Memory pressure in v0.31.0 shows up first as <b>waiting</b> requests and higher TTFT ('+f(m('kv1',r=>r.A.ttft_p50),1)+' s against '+f(m('seqs16',r=>r.A.ttft_p50),1)+' s), and as preemption only when running requests outgrow what admission assumed: longer answers, as in the parent page\'s Engine bench run where 128-token answers in a 2 GiB cache gave 8 preemptions. Throughput barely moved ('+f(m('kv1',r=>r.A.out_tok_per_s),1)+' against '+f(m('seqs16',r=>r.A.out_tok_per_s),1)+' tokens per second): on this CPU the step, not memory, limits it.')}
  if(R('evict_patched')){const d=R('evict_patched').deltas;
    set('vl-k-patch-note','A 1 GiB cache and a long shared prefix: '+f(100*d['vllm:prefix_cache_hits_total']/d['vllm:prefix_cache_queries_total'],0)+'% of prompt tokens came from the cache, yet '+d['vllm:prefix_cache_evicted_blocks_total']+' cached blocks were evicted to make room for new requests\' own tokens. Before the patch that number existed nowhere; a rising rate of it while the hit rate falls is the signal to give the cache more memory.')}
  const k0=R('k0_default');if(k0){const M=K.metrics_k0_default,q=M['vllm:request_queue_time_seconds'].after,pf=M['vllm:request_prefill_time_seconds'].after,tt=M['vllm:time_to_first_token_seconds'].after;
    set('vl-k-met-note','One thing the table shows: with 4 users the mean queue time was '+f(1000*q.sum/q.count,2)+' ms, while the mean time to first token was '+f(tt.sum/tt.count,2)+' s, of which prefill took '+f(pf.sum/pf.count,2)+' s. TTFT is not queueing here; it is the CPU reading 411 tokens while also decoding for the others.')}
};
