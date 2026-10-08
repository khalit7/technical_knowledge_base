// ---- Capacity planner (t-plan): calibration, simulation spread, published MLPerf results, M1 notes ----
(function(){
  const U=window.PLNU,D=window.PLND,$=id=>document.getElementById(id),sig=U.sig,fInt=U.fInt,esc=U.esc;
  const pct=x=>(x>=0?'+':'&minus;')+sig(Math.abs(x*100),2)+'%';
  const tag=(c,t)=>'<span class="pln-tag '+c+'">'+t+'</span>';
  const RH='https://github.com/mlcommons/inference_results_v5.1/tree/main/closed/RedHat/results',HPE='https://github.com/mlcommons/inference_results_v5.1/tree/main/closed/HPE/results/HPE_Cray_XD670_H200_SXM_141GBx8_TRT';
  function calib(){
    const c=D.calib,p=c.pub,F=c.fits,T=c.transfer;
    const run={h100:['vLLM 0.10.0, one H100 SXM (Red Hat)',RH],l40s:['vLLM 0.10.0, one L40S (Red Hat)',RH],h200:['TensorRT-LLM, 8x H200 SXM, per GPU (HPE)',HPE]};
    let h='<tr><th>Quantity</th><th class="num">Published</th><th class="num">Planner</th><th class="num">Difference</th></tr>';
    const head=s=>'<tr><td colspan="4" style="padding-top:10px"><b>'+s+'</b></td></tr>';
    const row=(b,pub,mod,fit,unit)=>{const d=mod/pub-1;return '<tr><td>'+b+' '+(fit?tag('pln-der','fitted'):tag('pln-ind','check'))+'</td><td class="num">'+sig(pub,4)+(unit||'')+'</td><td class="num">'+sig(mod,4)+(unit||'')+'</td><td class="num">'+pct(d)+'</td></tr>'};
    ['h100','l40s','h200'].forEach(k=>{const f=F[k];
      h+=head('<a href="'+run[k][1]+'" target="_blank" rel="noopener noreferrer">'+run[k][0]+'</a>'+tag('pln-ven','vendor')+'</b><br><span class="pln-note">MLPerf v5.1, Llama 3.1 8B FP8. Fitted: compute '+sig(f.eff_c*100,3)+'% of dense FP8 peak, '+sig(f.tovh,2)+' ms per step</span><b>');
      h+=row('Offline, output tokens/s',p[k+'_off'],f.off,true);
      h+=row('Server inside 2 s / 100 ms, tokens/s',p[k+'_srv'],f.srv,false);
      if(f.tpot_ms!=null){h+=row('Mean TPOT at '+sig(p[k+'_srv_qps'],4)+' req/s',p[k+'_tpot_mean'],f.tpot_ms,true,' ms');
        h+=row('TTFT p50 at that rate',p[k+'_ttft_p50'],f.ttft_p50_ms,false,' ms');
        h+=row('TTFT p99 at that rate',p[k+'_ttft_p99'],f.ttft_p99_ms,false,' ms')}});
    h+=head('Another submitter: TensorRT-LLM 1.0.0, one H200 (v6.1), with the HPE constants'+tag('pln-ven','vendor'));
    h+=row('Offline, output tokens/s',c.h200_single_check.pub,c.h200_single_check.model,false);
    h+=head('vLLM\'s H100 constants applied to the L40S');
    h+=row('Offline, output tokens/s',p.l40s_off,T.l40s.off,false)+row('Server inside targets',p.l40s_srv,T.l40s.srv,false);
    h+=head('vLLM\'s H100 constants applied to TensorRT-LLM on H200, per GPU');
    h+=row('Offline, output tokens/s',p.h200_off,T.h200.off,false)+row('Server inside targets',p.h200_srv,T.h200.srv,false);
    $('pln-calib').innerHTML=h;
    $('pln-calibnote').innerHTML='What the table says. (1) With two constants the model lands on vLLM\'s H100 runs: the unfitted Server throughput within '+sig(Math.abs(F.h100.srv_res*100),2)+'% and the median TTFT within '+sig(Math.abs(F.h100.ttft_p50_ms/p.h100_ttft_p50-1)*100,2)+'%. (2) The p99 TTFT comes out '+(F.h100.ttft_p99_ms<p.h100_ttft_p99?'lower':'higher')+' than measured: here every prompt is 778 tokens, while the real CNN/DailyMail prompts vary, and the long ones make the tail. Size with margin on p99. (3) Constants do not transfer between GPUs or engines: vLLM\'s H100 constants overpredict the L40S by '+sig(T.l40s.off_res*100,2)+'% (its sustained compute is a smaller share of its datasheet peak) and underpredict TensorRT-LLM on the H200 by '+sig(-T.h200.off_res*100,2)+'%. TensorRT-LLM reaches '+sig(F.h200.eff_c*100,2)+'% of FP8 peak against vLLM\'s '+sig(F.h100.eff_c*100,2)+'% (vLLM 0.10.0, August 2025; both engines have moved since). (4) The bandwidth share (80%) is assumed, not fitted: these runs are mostly compute-bound. Calibrate on your own engine and GPU before trusting a decision to a few percent: the Engine bench tab shows how. Workload: 778 input tokens per request from <a href="'+esc(D.redhat.blog)+'" target="_blank" rel="noopener noreferrer">Red Hat\'s write-up</a> ('+esc(D.redhat.blog_date)+'); 128.0 output tokens from the logs (5,777.08 tokens/s / 45.13 samples/s), not the write-up\'s 73. Server latency limits are p99 TTFT 2 s and TPOT 100 ms (<a href="'+esc(D.rules.url)+'" target="_blank" rel="noopener noreferrer">MLPerf rules</a>; the planner applies the TPOT limit to the mean).';
  }
  function valid(){
    const v=D.validate;let h='<tr><th>Operating point</th><th class="num">TPOT, ms</th><th class="num">TTFT p50, ms</th><th class="num">TTFT p99, ms</th></tr>';
    const f=x=>sig(x.lo*1e3,3)+' to '+sig(x.hi*1e3,3);
    v.forEach(r=>{h+='<tr><td>'+esc(r.name)+'</td><td class="num">'+f(r.tpot)+'</td><td class="num">'+f(r.ttft_p50)+'</td><td class="num">'+f(r.ttft_p99)+'</td></tr>'});
    $('pln-valid').innerHTML=h;
    $('pln-validnote').innerHTML='Five seeds, 3,000 requests each, as the planner runs. The H200 point sits at the knee (TensorRT-LLM ran it at a mean TPOT of 75 ms against a 100 ms limit), where the spread is widest; the running example, at 2 requests per second, barely moves. The calibration itself uses three seeds of 12,000 requests to average this out. The JavaScript simulation reproduces the Python reference exactly (same random stream, same step function), checked on '+(D.nref||12)+' deployments.';
  }
  const MLM=[['llama3.1-8b','Llama 3.1 8B'],['llama2-70b-99','Llama 2 70B'],['gpt-oss-120b','gpt-oss-120b'],['deepseek-r1','DeepSeek-R1'],['llama3.1-405b','Llama 3.1 405B']];
  let mm='llama3.1-8b';
  function mlp(){
    const seg=$('pln-mlpseg');
    if(!seg.innerHTML){seg.innerHTML=MLM.map(([k,n])=>'<button data-m="'+k+'"'+(k===mm?' class="on"':'')+'>'+n+'</button>').join('');
      seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mm=b.dataset.m;[...seg.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));mlp()})}
    const best={};
    D.mlperf.filter(r=>r.model===mm&&(r.sc==='Offline'||r.sc==='Server'||r.sc==='Interactive')).forEach(r=>{
      const key=r.v+'|'+r.acc+'|'+r.n+'|'+r.sc+'|'+r.sw.split(/[ ,(]/)[0]+'|'+r.w;
      if(!best[key]||best[key].tps<r.tps)best[key]=r});
    const rows=Object.values(best).sort((a,b)=>b.tps/b.n-a.tps/a.n);
    let h='<tr><th>GPUs</th><th>Scenario</th><th class="num">Tokens/s per GPU</th><th>Round, submitter, software, weights</th></tr>';
    rows.forEach(r=>{h+='<tr><td>'+r.n+'x '+esc(r.acc.replace('NVIDIA ','').replace('AMD Instinct ','').replace(/[- ]\d+GB.*$/i,''))+'</td><td>'+esc(r.sc)+'</td><td class="num">'+fInt(r.tps/r.n)+'</td><td class="pln-note">'+esc(r.v)+', '+esc(r.who)+', '+esc(r.sw.slice(0,40))+', '+esc(r.w.slice(0,20))+'</td></tr>'});
    $('pln-mlp').innerHTML=h;
    $('pln-mlpnote').innerHTML='Best result per round, GPU, scenario, engine and weight format; '+rows.length+' rows. Source: the summary files of <a href="https://github.com/mlcommons/inference_results_v5.1" target="_blank" rel="noopener noreferrer">v5.1</a> (September 2025), <a href="https://github.com/mlcommons/inference_results_v6.0" target="_blank" rel="noopener noreferrer">v6.0</a> (March 2026) and <a href="https://github.com/mlcommons/inference_results_v6.1" target="_blank" rel="noopener noreferrer">v6.1</a> (September 2026), fetched 2026-10-08. Server and Interactive runs meet p99 latency limits that differ per model ('+esc(D.rules.slo[mm.replace('-99','')]||'')+'). '+lessons();
  }
  function best(model,acc,sc,v,sw){let b=null;D.mlperf.forEach(r=>{if(r.model===model&&r.acc.indexOf(acc)>=0&&r.sc===sc&&(!v||r.v===v)&&(!sw||r.sw.indexOf(sw)>=0)&&r.n===8&&(!b||r.tps>b.tps))b=r});return b}
  function lessons(){
    const a=best('deepseek-r1','B200','Offline','v5.1'),b=best('deepseek-r1','B200','Offline','v6.1');
    const m=best('llama2-70b-99','MI300X','Offline'),h=best('llama2-70b-99','H200-SXM','Offline'),ms=best('llama2-70b-99','MI300X','Server'),hs=best('llama2-70b-99','H200-SXM','Server');
    let s=' Two things to read off.';
    if(a&&b)s+=' On 8x B200 the best DeepSeek-R1 Offline result rose '+sig(b.tps/a.tps,2)+' times in a year, '+fInt(a.tps)+' (v5.1, '+esc(a.who)+') to '+fInt(b.tps)+' tokens/s (v6.1, '+esc(b.who)+'), on the same GPUs: software moves these numbers as much as hardware.';
    if(m&&h&&ms&&hs)s+=' For Llama 2 70B, the best 8x MI300X results ('+esc(m.who)+', a vLLM-based stack) run '+Math.round((1-m.tps/h.tps)*100)+'% (Offline) to '+Math.round((1-ms.tps/hs.tps)*100)+'% (Server) below the best 8x H200 results (TensorRT-LLM).';
    return s}
  function m1(){
    const el=$('pln-m1'),m=D.m1;
    let h='<p>The M1 Pro in the planner uses the hardware root\'s measured figures (5.0 TFLOP/s FP16 and 165 GB/s stream copy, MLX, 2026-10-05) and Metal\'s recommended working set ('+sig(D.chips.m1pro.mem*D.chips.m1pro.util,3)+' GB of the 16 GB) as usable memory.</p>';
    if(m&&m.html)h+=m.html;
    else h+='<p>Measurements from the Engine bench tab will set the M1 constants here.</p>';
    h+='<p><b>What transfers</b> to a datacenter GPU: the shapes (a step is the larger of bytes over bandwidth and FLOPs over peak; throughput rises almost linearly with the batch while decode stays memory-bound, then bends when compute or the cache runs out; TTFT grows with prompt length and with queueing near the knee), and ratios such as FP8 against BF16 weights moving the memory-bound time by the bytes saved. <b>What does not</b>: absolute speeds (an H100 has 20 times the bandwidth and about 200 times the FP16 compute), the engine constants (llama.cpp and MLX are not vLLM; their per-step overheads and kernel efficiencies differ), and anything about several GPUs (no NVLink, no tensor parallelism on one laptop chip).</p>';
    el.innerHTML=h;
  }
  function all(){calib();valid();mlp();m1()}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-plan']=window.TAB_RENDER['t-plan']||[]).push(all);
})();
