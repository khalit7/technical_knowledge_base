// ---- Runs on this laptop (t-m1): every number from window.DDM (src/exp/summarise.py) ----
(function(){
  const M=window.DDM;if(!M||!document.getElementById('m1-rpc'))return;
  const $=id=>document.getElementById(id);
  const fmt=(x,d)=>x==null?'n/a':(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const pm=(o,d)=>o?fmt(o.mean,d)+' <span class="mute small">&plusmn; '+fmt(o.sd,d)+'</span>':'n/a';
  const env=[];
  env.push('<div class="t">Set-up <span class="meas">measured here</span></div><p>Apple M1 Pro, 16 GB unified memory, macOS; llama.cpp build 11146 (Homebrew 0.5.0, Metal) and the same build compiled here with its RPC back end; vLLM v0.31.0 CPU image (arm64) in Docker Desktop (5 CPUs, about 10 GB). Models: Qwen3-1.7B Q8_0 and Qwen3-4B Q4_K_M (GGUF), Qwen3-0.6B (safetensors, float32 for vLLM). Dates: 2026-10-10. Spread is the standard deviation over all repetitions; load averages during the runs are in each section.</p>');
  $('m1-env').innerHTML=env.join('');
  function rpcTable(){
    const R=M.rpc;if(!R){$('m1-rpc').innerHTML='<tr><td>not run</td></tr>';return}
    let h='<tr><th>Model</th><th>Layout</th><th class="num">Prompt, tokens/s (pp512)</th><th class="num">Generation, tokens/s (tg64)</th><th class="num">ms per generated token</th></tr>';
    const NM={one:'one process, one device',layer:'two processes, split by layers (pipeline)',tensor:'two processes, split by tensors'};
    Object.keys(R.res).forEach(m=>['one','layer','tensor'].forEach(k=>{const x=R.res[m][k];if(!x)return;
      h+='<tr><td>'+RD.esc(m)+'</td><td>'+NM[k]+'</td><td class="num">'+pm(x.pp512,0)+'</td><td class="num">'+pm(x.tg64,1)+'</td><td class="num">'+fmt(1000/x.tg64.mean,1)+'</td></tr>'}));
    $('m1-rpc').innerHTML=h;
    const a=R.res['Qwen3-1.7B-Q8_0'];
    $('m1-rpc-say').innerHTML='Qwen3-1.7B: splitting by layers costs '+fmt(100*(1-a.layer.pp512.mean/a.one.pp512.mean),0)+'% of prompt speed but '+fmt(100*(1-a.layer.tg64.mean/a.one.tg64.mean),0)+'% of generation speed: a 512-token prompt crosses the boundary once per batch, a generated token crosses it every token, and each crossing is a round of messages and waits between two processes (about '+fmt(1000/a.layer.tg64.mean-1000/a.one.tg64.mean,0)+' ms per token here). The data itself is tiny: one hidden state of 2,048 values. Splitting by tensors puts synchronisation points inside every layer, so generation falls to '+fmt(a.tensor.tg64.mean,1)+' tokens/s, '+fmt(a.one.tg64.mean/a.tensor.tg64.mean,1)+' times slower than one process: tensor parallelism over a slow link, in miniature. '+R.runs+' runs of 3 repetitions each; load average '+fmt(R.load[0])+' to '+fmt(R.load[1])+'. Both splits run on the same GPU, so neither can be faster than one process; on two real GPUs the layer split adds memory, the tensor split adds bandwidth.';
  }
  rpcTable();
  const pending=(id,what)=>{$(id).innerHTML='<tr><td>'+what+'</td></tr>'};
  // 2. vLLM CPU parallel layouts
  (function(){const V=M.vtp;if(!V){pending('m1-vtp','Not run yet.');return}
    const NM={tp1:'one worker (TP 1)',tp2:'tensor parallel 2',pp2:'pipeline parallel 2'};
    let h='<tr><th>Layout</th><th class="num">1 user: TTFT p50</th><th class="num">1 user: time per token p50</th><th class="num">8 users: output tokens/s</th><th class="num">8 users: time per token p50</th></tr>';
    ['tp1','tp2','pp2'].forEach(k=>{const x=V.res[k];if(!x)return;const c1=x.c1||{},c8=x.c8||{};
      h+='<tr><td>'+NM[k]+'</td><td class="num">'+(c1.ttft_p50?pm({mean:c1.ttft_p50.mean*1000,sd:c1.ttft_p50.sd*1000},0)+' ms':'n/a')+'</td><td class="num">'+(c1.tpot_p50?pm({mean:c1.tpot_p50.mean*1000,sd:c1.tpot_p50.sd*1000},1)+' ms':'n/a')+'</td><td class="num">'+(c8.out_tok_per_s?pm(c8.out_tok_per_s,1):'n/a')+'</td><td class="num">'+(c8.tpot_p50?pm({mean:c8.tpot_p50.mean*1000,sd:c8.tpot_p50.sd*1000},1)+' ms':'n/a')+'</td></tr>'});
    $('m1-vtp').innerHTML=h;
    const t1=V.res.tp1,t2=V.res.tp2,p2=V.res.pp2;
    let say='Runs per layout: '+((t1&&t1.c1&&t1.c1.tpot_p50)?t1.c1.tpot_p50.n:0)+'; load average '+(V.load?fmt(V.load[0])+' to '+fmt(V.load[1]):'n/a')+'. ';
    if(t1&&t2&&t1.c1.tpot_p50&&t2.c1.tpot_p50)say+='With one user, TP 2 changes the time per token from '+fmt(t1.c1.tpot_p50.mean*1000,1)+' to '+fmt(t2.c1.tpot_p50.mean*1000,1)+' ms. ';
    if(t1&&p2&&t1.c1.tpot_p50&&p2.c1.tpot_p50)say+='PP 2 gives '+fmt(p2.c1.tpot_p50.mean*1000,1)+' ms: one request still walks both stages. ';
    if(t1&&p2&&t1.c1.ttft_p50&&p2.c1.ttft_p50)say+='Its time to first token rose from '+fmt(t1.c1.ttft_p50.mean*1000,0)+' to '+fmt(p2.c1.ttft_p50.mean*1000,0)+' ms, and with 8 users it delivered '+fmt(p2.c8.out_tok_per_s.mean,1)+' tokens/s against '+fmt(t1.c8.out_tok_per_s.mean,1)+' for one worker. ';
    if(V.info&&V.info.tp1&&V.info.tp2&&V.info.tp1.kv_tokens)say+='The start-up log\u2019s KV cache size went from '+fmt(V.info.tp1.kv_tokens,0)+' tokens with one worker to '+fmt(V.info.tp2.kv_tokens,0)+' with two, because each worker was given its own 1 GiB of cache (VLLM_CPU_KVCACHE_SPACE) and holds half of every token\u2019s heads (TP) or layers (PP). ';
    say+='On a CPU the "link" is shared memory and the cores are shared too, so TP 2 splits the same 4 CPUs’ work in two and adds a synchronisation per layer: the experiment shows the mechanics (it starts, it splits, the cost appears per token), not a GPU speed-up.';
    $('m1-vtp-say').textContent=say})();
  // 3. llama-server hand-over
  (function(){const L=M.lpd;if(!L){pending('m1-lpd','Not run yet.');return}
    const by={};L.transfer.forEach(x=>(by[x.words]=by[x.words]||[]).push(x));
    let h='<tr><th class="num">Prompt tokens</th><th class="num">Prefill on P</th><th class="num">Cache file</th><th class="num">tokens &times; 112 KiB</th><th class="num">Save</th><th class="num">Restore on D</th><th class="num">Tokens D recomputed</th><th class="num">D recomputing all of it</th><th class="num">Same answer</th></tr>';
    const av=(xs,k)=>xs.reduce((a,x)=>a+x[k],0)/xs.length;
    Object.keys(by).sort((a,b)=>a-b).forEach(w=>{const xs=by[w];
      h+='<tr><td class="num">'+fmt(av(xs,'prompt_n'),0)+'</td><td class="num">'+fmt(av(xs,'prefill_ms'),0)+' ms</td><td class="num">'+fmt(av(xs,'file_bytes')/2**20,1)+' MiB</td><td class="num">'+fmt(av(xs,'kv_bytes')/2**20,1)+' MiB</td><td class="num">'+fmt(av(xs,'save_ms'),0)+' ms</td><td class="num">'+fmt(av(xs,'restore_ms'),0)+' ms</td><td class="num">'+fmt(av(xs,'dec_prompt_n'),1)+'</td><td class="num">'+fmt(av(xs,'base_prompt_ms'),0)+' ms</td><td class="num">'+xs.filter(x=>x.same_text).length+' of '+xs.length+'</td></tr>'});
    $('m1-lpd').innerHTML=h;
    const big=by[Object.keys(by).sort((a,b)=>b-a)[0]];
    $('m1-lpd-say').innerHTML='Averages over '+L.runs+' runs with fresh random prompts; load average '+(L.load?fmt(L.load[0])+' to '+fmt(L.load[1]):'n/a')+'. The file holds the cache plus a small header: its size matches tokens &times; 28 layers &times; 8 KV heads &times; 128 &times; 2 &times; 2 bytes (112 KiB per token), the same formula as the Reading tab’s 320 KiB for the 70B model. Restoring the largest cache took '+fmt(av(big,'restore_ms'),0)+' ms against '+fmt(av(big,'base_prompt_ms'),0)+' ms to recompute it (the file had just been written, so it was probably still in the operating system\u2019s memory; a cold read from the SSD would take longer), and the decode server then computed only '+fmt(av(big,'dec_prompt_n'),1)+' prompt token(s) itself. Here the "network" is a file on the same SSD; between machines it would be RDMA (NIXL, Mooncake) or a shared store (LMCache, Dynamo’s KV block manager).'})();
  // 4. interference
  (function(){const L=M.lpd;if(!L||!L.interfere.length){pending('m1-int','Not run yet.');$('m1-gap').innerHTML='';return}
    const runs=L.interfere,sel=$('m1-gr');
    const pairs=[];for(let i=0;i+1<runs.length;i+=2)pairs.push([runs[i],runs[i+1]]);
    sel.innerHTML=pairs.map((p,i)=>'<option value="'+i+'">'+(i+1)+'</option>').join('');
    function draw(){const p=pairs[+sel.value],el=$('m1-gap'),W=Math.max(300,Math.min(860,RD.width(el))),H=210,Lm=58,R=8,T=8,B=26;
      const g0=p[0].gaps.slice(0,-1),g1=p[1].gaps.slice(0,-1),all=g0.concat(g1),mx=Math.max(...all)*1.05,n=Math.max(g0.length,g1.length);
      const x=i=>Lm+(W-Lm-R)*i/(n-1),y=v=>T+(H-T-B)*(1-Math.log10(Math.max(v,1))/Math.log10(mx));
      let b='';[1,10,100,1000,10000].forEach(v=>{if(v<=mx)b+='<line x1="'+Lm+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(Lm-4,y(v)+4,fmt(v,0)+' ms',{a:'end',fs:10,fill:'var(--mute)'})});
      [[g0,'var(--c2)'],[g1,'var(--c1)']].forEach(([r,c])=>{b+='<polyline fill="none" stroke="'+c+'" stroke-width="1.6" points="'+r.map((g,i)=>x(i)+','+y(g)).join(' ')+'"/>'});
      b+=RD.t((Lm+W-R)/2,H-4,'token number in the stream (log scale of the gap)',{a:'middle',fs:10.5,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,b,'Gaps between tokens of a stream while a long prompt arrives')}
    sel.addEventListener('change',draw);(window.TAB_RENDER=window.TAB_RENDER||{})['t-m1']=[draw];addEventListener('resize',()=>{if(!$('t-m1').hidden)draw()});draw();
    let h='<tr><th>Prompt sent to</th><th class="num">Its prompt tokens</th><th class="num">Its prefill</th><th class="num">Stream gap before, p50</th><th class="num">Longest gap while it ran</th><th class="num">Gap p50 while it ran</th></tr>';
    runs.forEach(r=>{h+='<tr><td>'+(r.where==='colocated'?'the same server (colocated)':'the other process (separate)')+'</td><td class="num">'+fmt(r.big_prompt_n,0)+'</td><td class="num">'+fmt(r.big_prompt_ms,0)+' ms</td><td class="num">'+fmt(r.gap_before_p50,1)+' ms</td><td class="num">'+fmt(r.gap_during_max,0)+' ms</td><td class="num">'+fmt(r.gap_during_p50,1)+' ms</td></tr>'});
    $('m1-int').innerHTML=h;
    const co=runs.filter(r=>r.where==='colocated'),se=runs.filter(r=>r.where!=='colocated'),mean=(xs,k)=>xs.reduce((a,x)=>a+x[k],0)/xs.length;
    $('m1-int-say').textContent='Colocated, the stream stops for one long step (longest gap '+fmt(mean(co,'gap_during_max'),0)+' ms on average): llama-server put the first 2,048 prompt tokens (its default batch size) into the same step as the stream’s next token. In a separate process the longest gap was '+fmt(mean(se,'gap_during_max'),0)+' ms and the typical gap '+fmt(mean(se,'gap_during_p50'),1)+' ms, against '+fmt(mean(se,'gap_before_p50'),1)+' ms before the prompt: the GPU interleaves the two processes’ work, so the stall becomes a slowdown, but the prompt still takes GPU time from the stream. Separate processes on one GPU do not give the guarantee disaggregation gives; separate GPUs do.'})();
  // 5. vLLM connector
  (function(){const V=M.vpd,el=$('m1-vpd');if(!V||!Object.keys(V).length){el.innerHTML='';$('m1-vpd-say').textContent='Not run yet.';return}
    const runs=Object.keys(V).map(k=>V[k]).filter(r=>r.prefill&&r.decode&&r.baseline);
    if(!runs.length){el.innerHTML='';$('m1-vpd-say').textContent='vLLM v0.31.0’s ExampleConnector did not complete on the CPU image; not run here.';return}
    const n=runs[0].prefill.res.length,avg=(ph,i)=>runs.reduce((a,r)=>a+r[ph].res[i].wall,0)/runs.length,sd=(ph,i)=>{const m=avg(ph,i);return Math.sqrt(runs.reduce((a,r)=>a+(r[ph].res[i].wall-m)**2,0)/Math.max(1,runs.length-1))};
    const c=(ph,i)=>fmt(avg(ph,i),1)+' s <span class="mute small">&plusmn; '+fmt(sd(ph,i),1)+'</span>';
    let h='<tr><th class="num">Prompt tokens</th><th class="num">Prefill instance (prompt, 1 token)</th><th class="num">Decode instance, cache loaded (32 tokens)</th><th class="num">No connector (prompt + 32 tokens)</th><th>Same text</th></tr>';
    for(let i=0;i<n;i++){const same=runs.every(r=>r.decode.res[i].text===r.baseline.res[i].text);
      h+='<tr><td class="num">'+fmt(runs[0].prefill.res[i].n_prompt,0)+'</td><td class="num">'+c('prefill',i)+'</td><td class="num">'+c('decode',i)+'</td><td class="num">'+c('baseline',i)+'</td><td>'+(same?'yes':'no')+'</td></tr>'}
    el.innerHTML=h;
    const r0=runs[0],kvt=28*8*128*2*4;
    $('m1-vpd-say').innerHTML='vLLM v0.31.0 CPU image, Qwen3-0.6B in float32, the offline example of <code>examples/disaggregated/example_connector</code>, timed: a prefill instance with <code>ExampleConnector</code> writes every layer’s cache for each prompt to safetensors files (per run '+fmt(r0.kv_files,0)+' files, '+fmt(r0.kv_bytes/2**20,0)+' MiB: 28 layers per prompt, '+fmt(kvt/1024,0)+' KiB per token in float32, whole 128-token blocks only); a fresh decode instance finds them by the prompt’s token hash, injects them instead of computing the prompt, and generates 32 tokens. The decode instance logged an injected cache for every prompt ('+[...new Set(r0.injected)].join(' and ')+' tokens: the prompt rounded down to whole blocks, the rest computed). Here loading was <b>slower</b> than computing: the decode instance took '+fmt(avg('decode',0),1)+' s for the first prompt against '+fmt(avg('baseline',0),1)+' s for an instance that simply computed it, and the prefill instance paid to write the files too. ExampleConnector reads one file per layer synchronously from disk and copies it slot by slot; real connectors (NIXL, Mooncake) move the cache over RDMA while other work runs. The lesson holds at any scale: a transfer pays only when it is faster than recomputing, which is why the transport matters as much as the idea. '+(r0.torch_threads?'vLLM ran PyTorch with '+r0.torch_threads+' thread in this single-process mode, in all three phases. ':'')+'Mean wall time per request over '+runs.length+' run'+(runs.length>1?'s':'')+', one request at a time'+(M.vpd_discarded?' (one earlier run discarded: '+RD.esc(Object.values(M.vpd_discarded)[0])+')':'')+'.'})();

})();
