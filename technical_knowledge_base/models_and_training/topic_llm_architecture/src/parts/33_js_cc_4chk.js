// Config calculator: predict-then-reveal drills (answers computed live from the configs) and the check table.
(function(){
  if(!window.CCS||!document.getElementById('cc-drills'))return;
  const {$,esc,grp,cnt,bytes,fl,ctxs,byKey}=CCS;
  const sp=k=>CC.normalise(byKey[k].cfg);
  const near=(vals,x)=>{let b=0;vals.forEach((v,i)=>{if(Math.abs(Math.log(v/x))<Math.abs(Math.log(vals[b]/x)))b=i});return b};
  function crossCtx(s){const p=CC.params(s);const w=CC.flops(s,1,p).weights;let lo=1,hi=1e8;while(lo<hi){const m=Math.floor((lo+hi)/2);if(CC.flops(s,m,p).decode_attn>=w)hi=m;else lo=m+1}return lo}
  const D=[
    ()=>{const s=sp('llama-3.1-8b'),kv=CC.cache(s,1,2).kv,a=s.layers[0].mix;const v=[32*1024,128*1024,512*1024,1024*1024];
      return {q:'Llama 3.1 8B: KV cache per token in BF16, all layers?',o:['32 KiB','128 KiB','512 KiB','1 MiB'],r:near(v,kv),
        w:'2 (K and V) x '+s.layers.length+' layers x '+a.nkv+' KV heads x '+a.hd+' dims x 2 bytes = '+grp(kv)+' bytes = '+bytes(kv)+'.\nWith the '+a.nh+' query heads by mistake: '+bytes(kv*a.nh/a.nkv)+'.'}},
    ()=>{const s=sp('llama-3.1-8b'),p=CC.params(s),a=s.layers[0].mix,x=crossCtx(s);const per=s.layers.length*2*a.nh*2*a.hd;const v=[2048,8192,29000,131072];
      return {q:'Llama 3.1 8B: at what context do the attention FLOPs of one decoded token equal its weight FLOPs?',o:['about 2k','about 8k','about 29k','about 128k'],r:near(v,x),
        w:'weights: 2 x '+cnt(p.matmul_active)+' matmul weights = '+fl(2*p.matmul_active)+' per token.\nattention: '+s.layers.length+' layers x 2 x '+a.nh+' heads x ('+a.hd+' + '+a.hd+') = '+grp(per)+' FLOPs per cached position.\n'+fl(2*p.matmul_active)+' / '+grp(per)+' = about '+grp(x)+' positions. GQA does not change this: the 8 KV heads shrink the cache, not the scores.'}},
    ()=>{const s=sp('mixtral-8x7b'),p=CC.params(s),b=p.breakdown,f=s.layers[0].ffn;const v=[56e9,46.7e9,12.9e9,45.1e9];
      return {q:'Mixtral 8x7B: total parameters?',o:['56B (8 x 7B)','46.7B','12.9B','45.1B'],r:near(v,p.total),
        w:'experts: '+f.E+' x 3 x '+s.d+' x '+f.ff+' x '+s.layers.length+' layers = '+cnt(b.moe_routed)+'\nattention '+cnt(b.attention)+' + embedding and head '+cnt(b.embedding+b.unembedding)+' + routers and norms '+cnt(b.router+b.norms)+'\n= '+grp(p.total)+' ('+cnt(p.total)+'). Only the feed-forward is replicated, so it is not 8 x 7B.\nActive: 2 of 8 experts plus everything shared = '+cnt(p.active)+'.'}},
    ()=>{const s=sp('deepseek-v3'),kv=CC.cache(s,1,2).kv,m=s.layers[0].mix;const mha=s.layers.length*m.nh*(m.nope+m.rope+m.v)*2;const v=[576,70272,4.77*2**20,17*1024];
      return {q:'DeepSeek-V3 (MLA): KV cache per token in BF16, all 61 layers?',o:['576 B','68.6 KiB','4.8 MiB','17 KiB'],r:near(v,kv),
        w:'(KV latent '+m.kvl+' + shared RoPE key '+m.rope+') x '+s.layers.length+' layers x 2 bytes = '+grp(kv)+' bytes = '+bytes(kv)+'.\nThe same heads as MHA ('+m.nh+' heads, K '+(m.nope+m.rope)+' wide, V '+m.v+' wide): '+m.nh+' x '+(m.nope+m.rope+m.v)+' x '+s.layers.length+' x 2 = '+bytes(mha)+', '+(mha/kv).toFixed(0)+'x more.'}},
    ()=>{const s=sp('qwen3-30b-a3b'),p=CC.params(s),f=s.layers[0].ffn,b=p.breakdown;const v=[30.5e9,10.2e9,3.3e9,0.9e9];
      return {q:'Qwen3 30B-A3B: active parameters per token?',o:['30.5B','10.2B','3.3B','0.9B'],r:near(v,p.active),
        w:'routed experts: '+f.E+' x 3 x '+s.d+' x '+f.ff+' x '+s.layers.length+' layers = '+cnt(b.moe_routed)+', of which '+f.k+'/'+f.E+' per token = '+cnt(b.moe_routed*f.k/f.E)+'\n+ attention '+cnt(b.attention)+' + embedding and head '+cnt(b.embedding+b.unembedding)+' + routers and norms '+cnt(b.router+b.norms)+'\n= '+cnt(p.active)+' (the card says 3.3B).'}},
    ()=>{const s=sp('gemma-7b'),p=CC.params(s),a=s.layers[0].mix;const v=[7.0e9,7.75e9,8.54e9,9.3e9];
      return {q:'Gemma 7B: how many parameters does the checkpoint hold?',o:['7.0B','7.75B','8.54B','9.3B'],r:near(v,p.total),
        w:'tied embedding: '+grp(s.V)+' x '+s.d+' = '+cnt(p.breakdown.embedding)+' (a 256k vocabulary)\nattention: '+a.nh+' heads x '+a.hd+' = '+(a.nh*a.hd)+' wide on a '+s.d+'-wide stream (head_dim is set, not d / n_h)\ntotal '+grp(p.total)+' = '+cnt(p.total)+'; without the embedding '+cnt(p.total-p.breakdown.embedding)+'. "7B" is a name, not a count.'}}];
  let h='';D.forEach((f,i)=>{const d=f();h+='<div class="cc-pr" data-i="'+i+'"><div class="cc-q">'+(i+1)+'. '+esc(d.q)+'</div><div class="cc-opts">'+
    d.o.map((o,j)=>'<button data-j="'+j+'">'+esc(o)+'</button>').join('')+' <button class="cc-skip" data-j="-1">Show me</button></div><div class="cc-ans" hidden><div class="cc-fm">'+esc(d.w)+'</div></div></div>'});
  const box=$('cc-drills');box.innerHTML=h;
  box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const card=b.closest('.cc-pr');const d=D[+card.dataset.i]();const j=+b.dataset.j;
    card.querySelectorAll('.cc-opts button').forEach(x=>{x.classList.remove('cc-right','cc-wrong');if(+x.dataset.j===d.r)x.classList.add('cc-right')});
    if(j>=0&&j!==d.r)b.classList.add('cc-wrong');const an=card.querySelector('.cc-ans');an.hidden=false;
    const t=an.querySelector('.cc-v');const verdict=j<0?'':(j===d.r?'Right. ':'Not quite: the answer is '+esc(d.o[d.r])+'. ');
    if(t)t.textContent=verdict;else an.insertAdjacentHTML('afterbegin','<b class="cc-v">'+verdict+'</b>')});

  // ---- check table ----
  const M=CCD.models;let ok=0,withHub=0,pubN=0,pubOk=0;
  const why=m=>{const v=m.val,p=[];if(v.mtp)p.push('MTP layer '+cnt(v.mtp));if(v.vision)p.push('vision tower and projector '+cnt(v.vision));if(v.extra)p.push(v.extra_why+' ('+grp(v.extra)+')');return p.join('; ')};
  const acc=a=>a&&a.length?a.map(([n,how])=>esc(n)+' ('+how+')').join(', '):'<span class="ill">none</span>';
  let t='<thead><tr><th>Model</th><th class="num">Main model (calculated)</th><th class="num">+ stored extras</th><th class="num">Hub count</th><th class="num">Residual</th><th>Extras</th><th>Published</th><th>Total that matches</th><th>Active that matches</th></tr></thead><tbody>';
  M.forEach(m=>{const s=CC.normalise(m.cfg),p=CC.params(s);const v=m.val;const ext=(v.mtp||0)+(v.vision||0)+(v.extra||0);
    if(m.hub.total!=null){withHub++;if(m.hub.total-(p.total+ext)===0)ok++}
    if(m.pub){pubN++;if(m.pub.tot_match.length)pubOk++}
    t+='<tr data-k="'+m.key+'"><td><a href="#cc-s-pick" data-k="'+m.key+'">'+esc(m.label)+'</a></td><td class="num">'+grp(p.total)+'</td><td class="num">'+(ext?grp(ext):'0')+'</td><td class="num">'+(m.hub.total!=null?grp(m.hub.total):'n/a')+'</td><td class="num">'+(m.hub.total!=null?grp(m.hub.total-(p.total+ext)):'n/a')+'</td>'+
      '<td class="cc-why">'+(why(m)||'none')+'</td><td>'+(m.pub?esc(m.pub.label):'')+'</td><td class="cc-why">'+(m.pub?acc(m.pub.tot_match):'')+'</td><td class="cc-why">'+(m.pub&&m.pub.act_match?acc(m.pub.act_match):'')+'</td></tr>'});
  $('cc-val').innerHTML=t+'</tbody>';
  $('cc-chksum').innerHTML='<div class="t">Result</div><b>'+ok+' of '+withHub+'</b> checkpoints with a Hub count reconcile exactly: calculated main model plus the listed extras equals the stored count, residual 0, computed by this page from the configs. '+
    (M.length-withHub)+' (Mamba-2 2.7B) ships a PyTorch <code>.bin</code> file, which the Hub does not count. Of '+pubN+' published totals, '+pubOk+' are reproduced by rounding or truncating one accounting; the others are discussed under the table. The same check runs in Python (<code>src/calc/validate.py</code>) and fails on any unexplained residual.';
  $('cc-val').addEventListener('click',e=>{const a=e.target.closest('a[data-k]');if(!a)return;e.preventDefault();$('cc-model').value=a.dataset.k;CCS.setModel(a.dataset.k);
    document.querySelectorAll('#cc-val tr').forEach(r=>r.classList.toggle('cc-sel',r.dataset.k===a.dataset.k));$('cc-s-pick').scrollIntoView({block:'start'})});
  const g=k=>M.find(m=>m.key===k);const n=[];
  const glm=g('glm-4.5');if(glm)n.push('<b>GLM-4.5 (355B):</b> not reproduced. The main model is '+cnt(glm.val&&CC.params(CC.normalise(glm.cfg)).total)+' and the checkpoint with its MTP layer '+cnt(glm.hub.total)+' (that layer carries its own copy of the embedding and head). Which count Z.ai used is unconfirmed.');
  const mm=g('minimax-m2');if(mm)n.push('<b>MiniMax-M2 (230B):</b> not reproduced. The released weights hold '+cnt(mm.hub.total)+', exactly the main model; the config names '+mm.cfg.num_mtp_modules+' MTP modules that are not in the files. Whether 230B counts them is unconfirmed.');
  const gm=g('gemma-7b');if(gm){const p=CC.params(CC.normalise(gm.cfg));n.push('<b>Gemma 7B (7B):</b> a name, not a count: '+cnt(p.total)+' in total, '+cnt(p.total-p.breakdown.embedding)+' without the tied embedding.')}
  const go=g('gpt-oss-120b');if(go)n.push('<b>gpt-oss:</b> the experts ship in MXFP4: U8 tensors holding two 4-bit values per byte (shape [32, 5760, 90, 16] for one gpt-oss-20b layer\'s gate and up projections) plus one U8 scale per 32 values. The Hub counts each 4-bit value as one parameter and leaves the scales out, so its count equals the parameter count exactly ('+grp(go.hub.total)+' for gpt-oss-120b), not the bytes. OpenAI\'s 5.1B active excludes the input embedding.');
  n.push('<b>DeepSeek and Kimi active counts</b> round to the published 37B and 32B only without the input embedding; Qwen3-Next\'s "3B" only without both embedding and head. Accounting conventions differ by vendor, so compare active counts only under one convention.');
  $('cc-pubnote').innerHTML=n.map(x=>'<p class="small">'+x+'</p>').join('');
})();
