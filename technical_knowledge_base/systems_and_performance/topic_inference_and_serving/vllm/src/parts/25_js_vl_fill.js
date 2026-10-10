// ---- Reading: fill measured lines (process list, the patch diff) from window.VL_KNOB ----
(function(){
  const K=window.VL_KNOB;if(!K)return;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ps=document.getElementById('vl-ps-line');
  if(ps&&K.ps_k0_default){const names=K.ps_k0_default.map(l=>l.split(' ').slice(3).join(' ')).filter(c=>/vllm serve|VLLM::/.test(c)).map(c=>/vllm serve/.test(c)?'the API server (vllm serve)':c);
    ps.innerHTML=names.map(n=>'<span class="mono">'+esc(n)+'</span>').join(', ')+' (plus Python\'s multiprocessing resource tracker).'}
  const d=document.getElementById('vl-diff');
  if(d&&K.diff){// show the four source files, not the test (described in step 4)
    const parts=K.diff.split(/^(?=diff --git )/m).filter(p=>!/^diff --git a\/tests\//.test(p));
    d.innerHTML=parts.join('').split('\n').filter(l=>!/^(index |diff --git )/.test(l)).map(l=>{const c=l.startsWith('+')&&!l.startsWith('+++')?'a':(l.startsWith('-')&&!l.startsWith('---')?'d':(l.startsWith('@@')||l.startsWith('---')||l.startsWith('+++')?'c':''));return c?'<span class="'+c+'">'+esc(l)+'</span>':esc(l)}).join('\n')}
})();
// Reading sections 5 and 8: the measured summary lines
(function(){
  const K=window.VL_KNOB;if(!K||!K.runs)return;const R=t=>K.runs[t];
  const m=(p,g)=>{const a=[1,2].map(r=>R(p+'_r'+r)).filter(Boolean).map(g);return a.reduce((x,y)=>x+y,0)/a.length};
  const f=(v,d)=>(+v).toLocaleString('en-GB',{maximumFractionDigits:d,minimumFractionDigits:d});
  const s=document.querySelector('[data-vlk="summary"]');
  if(s&&R('seqs2_r1')&&R('chunk128_r1')&&R('kv1_r1'))s.innerHTML='<b>Measured here</b> on the CPU image (Knob lab, two runs each): raising <span class="mono">max_num_seqs</span> from 2 to 16 under sixteen users took throughput from '+f(m('seqs2',r=>r.A.out_tok_per_s),1)+' to '+f(m('seqs16',r=>r.A.out_tok_per_s),1)+' tokens per second and each user\'s median time per token from '+f(m('seqs2',r=>r.A.tpot_p50*1000),0)+' to '+f(m('seqs16',r=>r.A.tpot_p50*1000),0)+' ms; cutting the budget from 2,048 to 128 tokens cut the longest stall seen by streaming users from '+f(m('chunk2048',r=>r.gap_max),1)+' s to '+f(m('chunk128',r=>r.gap_max),2)+' s and cost the long prompts '+f(m('chunk128',r=>r.B.ttft_p50)-m('chunk2048',r=>r.B.ttft_p50),1)+' s of time to first token; a cache of '+f(R('kv1_r1').kv_tokens,0)+' tokens instead of '+f(R('seqs16_r1').kv_tokens,0)+' held '+R('kv1_r1').peaks.num_requests_running+' requests running instead of 16, without a single preemption.';
  const p=document.querySelector('[data-vlk="patchlive"]'),e=R('evict_patched');
  if(p&&e)p.innerHTML='<b>Live</b> <span class="meas">measured here</span>: with the four files mounted into the CPU image, a 1 GiB cache and a long shared prefix, <span class="mono">/metrics</span> reported <span class="mono">vllm:prefix_cache_evicted_blocks_total '+e.deltas['vllm:prefix_cache_evicted_blocks_total']+'</span> after the run, next to '+f(e.deltas['vllm:prefix_cache_hits_total'],0)+' hit tokens out of '+f(e.deltas['vllm:prefix_cache_queries_total'],0)+' queried ({{Knob lab|#t-knob}}, section 6).'.replace('{{Knob lab|#t-knob}}','<a href="#" data-tab="t-knob">Knob lab</a>');
  const tl=document.querySelector('[data-vlk="patchlive"]');if(tl)RD.tabLinks(tl);
})();
