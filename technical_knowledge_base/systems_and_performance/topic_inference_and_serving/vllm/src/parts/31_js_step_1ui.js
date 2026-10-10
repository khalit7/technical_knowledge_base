// ---- Scheduler stepper tab: replays vLLM v0.31.0's recorded scheduler and block pool (data: window.VL_STEP) ----
(function(){
  const D=window.VL_STEP;if(!D||!D.runs||!D.runs.length)return;
  window.VL_STEPX=window.VL_STEPX||function(){D.runs.forEach(r=>{Object.values(r.req).forEach(q=>{if(!q.pieces)q.pieces=D.texts[q.t]});r.steps.forEach(st=>{if(typeof st.blocks==='string')st.blocks=st.blocks.split(',').map(x=>x.split('.').map(Number))})})};window.VL_STEPX();
  const G='https://github.com/vllm-project/vllm/blob/v0.31.0/';
  const L=(f,n,t)=>'<a href="'+G+f+'#L'+n+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const SCH='vllm/v1/core/sched/scheduler.py',BP='vllm/v1/core/block_pool.py',KM='vllm/v1/core/kv_cache_manager.py';
  const COL={A:'#2f6fb5',B:'#c2703a',C:'#3f7f56',D:'#8a5cb8',A2:'#3a9aa8'};
  const col=r=>COL[r]||'#787774';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const chip=r=>'<span class="vl-chip" style="background:'+col(r)+'">'+r+'</span>';
  const seg=document.getElementById('vl-st-seg');
  let run=D.runs.find(r=>r.key==='pc_on')||D.runs[0];
  seg.innerHTML=D.runs.map(r=>'<button data-m="'+r.key+'"'+(r===run?' class="on"':'')+'>'+esc(r.label)+'</button>').join('');
  const $=id=>document.getElementById(id);
  // text of block j of request r
  // expand compact blocks [ref_cnt, hash index, owner index] to [id, ref_cnt, hash, owner]
  const ex=s=>s.blocks.map((b,k)=>[k+1,b[0],b[1]>=0?run.H[b[1]]:null,b[2]>=0?run.names[b[2]]:null]);
  function blockText(r,j){const q=run.req[r];if(!q)return'';return q.pieces.slice(j*run.bs,(j+1)*run.bs).join('')}
  function desc(){const c=run.cfg;
    $('vl-st-desc').innerHTML='<b>'+esc(run.label)+'.</b> '+esc(run.desc)+' Settings: '+c.real_num_blocks+' blocks of '+c.block_size+' tokens (block 0 is the null block), budget '+c.max_num_batched_tokens+' tokens per step, max_num_seqs '+c.max_num_seqs+', prefix caching '+(c.enable_prefix_caching?'on':'off')+', chunked prefill '+(c.chunked_prefill?'on':'off')+', '+c.max_tokens+' output tokens per request'+(c.ignore_eos?' (end-of-sequence ignored)':'')+', greedy. Engine '+esc(c.vllm)+', '+esc(c.model)+' in '+c.dtype+'.'}
  function caption(i){const s=run.steps[i],out=[];
    const pf=Object.keys(s.tok).filter(r=>s.kind[r]==='prefill'),dc=Object.keys(s.tok).filter(r=>s.kind[r]==='decode');
    s.ev.forEach(e=>{
      if(e[0]==='preempt')out.push(chip(e[1])+' is <b>preempted</b>: the pool could not give a running request its next block, so the last-admitted request loses all its blocks and goes to the front of the waiting queue ('+L(SCH,771,'scheduler.py L771')+', '+L(SCH,1538,'L1538')+').');
      else if(e[0]==='admit'){const resumed=e[4]>0;out.push(chip(e[1])+(resumed?' is <b>readmitted</b> after preemption':' is <b>admitted</b>')+(e[2]>0?' with <b>'+e[2]+' tokens already computed</b>: a prefix-cache hit of '+(e[2]/run.bs)+' blocks found by hash ('+L(KM,264,'get_computed_blocks')+')':' with no cached prefix')+'.')}
      else if(e[0]==='hit')out.push('Cached block'+(e[1].length>1?'s ':' ')+e[1].join(', ')+' '+(e[1].length>1?'are':'is')+' <b>touched</b>: taken out of the free queue and shared ('+L(BP,755,'touch, L755')+').');
      else if(e[0]==='evict')out.push('<b>Evicted</b> from the cache: block'+(e[1].length>1?'s ':' ')+e[1].join(', ')+' still had a hash when popped from the head of the free queue, so the hash is dropped and the block reused ('+L(BP,669,'get_new_blocks, L669')+').');
      else if(e[0]==='alloc')out.push('New blocks '+e[1].join(', ')+' taken from the head of the free queue ('+L(KM,371,'allocate_slots')+').');
      else if(e[0]==='cache')out.push('Block'+(e[1].length>1?'s ':' ')+e[1].join(', ')+' filled up and got '+(e[1].length>1?'their hashes':'its hash')+' ('+L(BP,226,'cache_full_blocks')+').');
      else if(e[0]==='finish')out.push(chip(e[1])+' <b>finished</b> ('+run.cfg.max_tokens+' tokens): '+L(SCH,1967,'update_from_output')+' frees its blocks.');
      else if(e[0]==='free'){const h=e[2],u=e[1].filter(b=>h.indexOf(b)<0);out.push('Freed: '+(u.length?u.join(', ')+' (no hash) to the <b>front</b> of the free queue':'')+(u.length&&h.length?'; ':'')+(h.length?h.join(', ')+' (hashed) to the <b>back</b>, kept as cache':'')+' ('+L(BP,777,'free_blocks, L777')+').')}
    });
    let head='Step '+(i+1)+': '+(pf.length?pf.length+' prefill'+(pf.length>1?'s':'')+(dc.length?' and ':''):'')+(dc.length?dc.length+' decode'+(dc.length>1?'s':''):'')+(!pf.length&&!dc.length?'nothing scheduled':'');
    return '<div class="t">'+head+'</div>'+(out.length?'<ul>'+out.map(x=>'<li>'+x+'</li>').join('')+'</ul>':'<p>Only decodes: one token each, no block changes.</p>');
  }
  function draw(i){
    const s=run.steps[i],c=run.cfg;
    $('vl-st-cap').innerHTML=caption(i);
    // cumulative counters
    let tok=0,pre=0,hit=0,ev=0;for(let k=0;k<=i;k++){const t=run.steps[k];tok+=Object.values(t.tok).reduce((a,b)=>a+b,0);t.ev.forEach(e=>{if(e[0]==='preempt')pre++;if(e[0]==='admit')hit+=e[2];if(e[0]==='evict')ev+=e[1].length})}
    const used=Object.values(s.tok).reduce((a,b)=>a+b,0);
    $('vl-st-cnt').innerHTML=RD.stat('Step',(i+1)+' / '+run.steps.length)+RD.stat('Tokens this step',used+' / '+c.max_num_batched_tokens)+RD.stat('Tokens computed so far',tok.toLocaleString('en-GB'))+RD.stat('Served from cache',hit.toLocaleString('en-GB'),'tokens')+RD.stat('Preemptions',String(pre))+RD.stat('Evicted blocks',String(ev))+RD.stat('KV usage',Math.round(s.usage*100)+'%','held by running requests');
    // queues
    $('vl-st-q').innerHTML='<div class="vl-q"><span class="lb">running</span>'+(s.run.length?s.run.map(chip).join(''):'<span class="mute">empty</span>')+'</div><div class="vl-q"><span class="lb">waiting</span>'+(s.wait.length?s.wait.map(chip).join(''):'<span class="mute">empty</span>')+'</div>';
    // budget bar
    const B=c.max_num_batched_tokens;
    $('vl-st-bud').innerHTML='<div class="vl-bud" role="img" aria-label="token budget use">'+Object.entries(s.tok).map(([r,n])=>'<div style="width:'+(100*n/B)+'%;background:'+col(r)+(s.kind[r]==='decode'?';opacity:.7':'')+'" title="'+r+': '+n+' tokens, '+s.kind[r]+'">'+(n/B>.08?r+' '+n:'')+'</div>').join('')+'</div><div class="small mute" style="margin-top:4px">'+Object.entries(s.tok).map(([r,n])=>r+' +'+n+' ('+s.kind[r]+')').join(', ')+(used<B?'; '+(B-used)+' left unused':'')+'</div>';
    // pool
    const prev=i>0?run.steps[i-1]:null,pm={};if(prev)ex(prev).forEach(b=>pm[b[0]]=b);
    $('vl-st-pool').innerHTML=ex(s).map(b=>{const [id,rc,h,ow]=b,p=pm[id];const chg=p&&(p[1]!==rc||p[2]!==h);
      let cls='vl-blk'+(rc>0?' used':'')+(h?' cached':'')+(chg?' chg':''),st='';
      if(rc>0)st='background:'+col(ow)+';border-color:'+col(ow);else if(h)st='border-color:'+col(ow)+';color:'+col(ow);
      // which token range: find in owner's block table
      let txt='';const rq=ow&&s.reqs[ow];if(rq){const j=rq[5].indexOf(id);if(j>=0)txt=blockText(ow,j)}
      const tip='block '+id+', ref_cnt '+rc+(h?', hash '+h:', no hash')+(ow?', '+(rc>0?'held by ':'last held by ')+ow:'')+(txt?': '+txt.replace(/\s+/g,' ').slice(0,90):'');
      return '<div class="'+cls+'" style="'+st+'" title="'+esc(tip)+'"><span class="id">'+id+'</span>'+(rc>1?'<span class="rc">&times;'+rc+'</span>':'')+(h?'<span class="hs">'+h.slice(0,4)+'</span>':'')+'</div>'}).join('');
    // free queue
    const bm={};ex(s).forEach(b=>bm[b[0]]=b);
    $('vl-st-free').innerHTML='<span class="mute" style="border:0">head</span>'+s.free.map(id=>{const b=bm[id];return '<span class="'+(b&&b[2]?'h':'')+'" style="'+(b&&b[2]?'border-color:'+col(b[3])+';color:'+col(b[3]):'')+'">'+id+'</span>'}).join('')+'<span class="mute" style="border:0">tail</span>';
    // requests
    const rows=Object.keys(run.req).map(r=>{const q=s.reqs[r],rq=run.req[r];
      if(!q){const done=run.steps.slice(0,i+1).some(t=>t.ev.some(e=>e[0]==='finish'&&e[1]===r));return '<div class="vl-req">'+chip(r)+'<div class="mute small">'+(done?'finished':(rq.at>i?'arrives at step '+(rq.at+1):'waiting to be added'))+'</div></div>'}
      const tot=rq.np+c.max_tokens,nc=q[1],np=q[3],nout=q[4];
      const bar='<div class="vl-bar" title="'+r+': '+nc+' of '+q[2]+' tokens computed; prompt '+np+', output '+nout+'"><div style="left:0;width:'+(100*np/tot)+'%;background:var(--soft);border-right:1px dashed var(--mute)"></div><div style="left:0;width:'+(100*Math.min(nc,q[2])/tot)+'%;background:'+col(r)+';opacity:.85"></div></div>';
      const outTxt=rq.pieces.slice(np,np+nout).join('');
      return '<div class="vl-req">'+chip(r)+bar+'<div class="vl-txt">'+({RUNN:'running',PREE:'preempted, waiting',WAIT:'waiting'}[q[0]]||q[0].toLowerCase())+', '+nc+' / '+q[2]+' computed'+(q[6]?', preempted '+q[6]+'&times;':'')+(outTxt?': &ldquo;'+esc(outTxt)+'&rdquo;':'')+'</div></div>'}).join('');
    $('vl-st-reqs').innerHTML=rows+'<p class="small mute">Bar: the dashed line is the end of the prompt; colour is tokens whose keys and values are in the cache. Answers are cut at '+c.max_tokens+' tokens.</p>';
  }
  $('vl-st-leg').innerHTML='<span><i style="background:#2f6fb5"></i>held by a running request (&times;n: shared by n)</span><span><i style="border:2px dashed #787774"></i>dashed: hashed, so findable by the prefix cache</span><span><i style="outline:2px solid var(--bad)"></i>changed this step</span><span>hex: first bytes of the block hash</span>';
  let an;
  function summary(){
    const rows=D.runs.map(r=>'<tr><td>'+esc(r.label)+'</td><td>'+r.sum.steps+'</td><td>'+r.sum.tokens_computed.toLocaleString('en-GB')+'</td><td>'+r.sum.hit_tokens.toLocaleString('en-GB')+'</td><td>'+r.sum.preemptions+'</td><td>'+r.sum.evicted_blocks+'</td></tr>').join('');
    $('vl-st-sum').innerHTML='<h3>The runs side by side</h3><div class="tw"><table class="vl-cmp"><tr><th>Run</th><th>Engine steps</th><th>Tokens computed</th><th>Prompt tokens served from cache</th><th>Preemptions</th><th>Cached blocks evicted</th></tr>'+rows+'</table></div><p class="small mute">All prompts together hold '+D.runs[0].sum.prompt_tokens.toLocaleString('en-GB')+' tokens. <span class="meas">measured here</span>: counted from the recordings.</p>';
  }
  function start(){desc();if(an)an.reset(run.steps.length);}
  an=RD.anim({card:'vl-st-card',ctl:'vl-st-ctl',n:run.steps.length,draw:i=>draw(Math.min(i,run.steps.length-1)),ms:1700,label:'Engine step',tab:'t-step'});
  RD.seg(seg,m=>{run=D.runs.find(r=>r.key===m);start()});
  RD.tabLinks($('vl-st-cap'));
  desc();summary();
  const sys=D.system;
  $('vl-st-how').innerHTML='<h3>How this was recorded</h3><p>Inside the <span class="mono">vllm/vllm-openai-cpu:v0.31.0-arm64</span> image, a script (<span class="mono">src/stepper/record.py</span>) built the real engine with the engine core in-process, wrapped <span class="mono">Scheduler.schedule()</span> and <span class="mono">update_from_output()</span> only to copy out the block pool (every block\'s reference count and hash, the free queue in order) and every request\'s state, and drove it with <span class="mono">LLMEngine.add_request()</span> and <span class="mono">step()</span>: customers A and B at step 1, C at step 4, D at step 7, and A\'s follow-up (A2, whose prompt contains A\'s real answer) as soon as A finished. Nothing in vLLM was modified. The system prompt every request shares: &ldquo;'+esc(sys)+'&rdquo; Prompts use Qwen3\'s chat template with thinking off. <span class="meas">measured here</span>, 2026-10-08.</p>';
})();
