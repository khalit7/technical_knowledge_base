// ---- Reading tab: predict-then-reveal buttons, the cold-start table, the LoRA and structured-output tables ----
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});
      if(!b.dataset.ok)b.classList.add('wrong');if(ans)ans.hidden=false}))});
  const D=window.PRD||{};
  const ct=document.getElementById('pr-cold-tab');
  if(ct&&D.cold){const by={};D.cold.forEach(r=>{(by[r.model]=by[r.model]||{})[r.mode]=r});
    let h='<tr><th>Model file</th><th class="num">Size</th><th class="num">Ready, cold</th><th class="num">Ready, warm</th><th class="num">First token after ready</th></tr>';
    Object.keys(by).forEach(m=>{const c=by[m].cold,w=by[m].warm;if(!c||!w)return;
      h+='<tr><td>'+m.replace('.gguf','')+'</td><td class="num">'+(c.bytes/1e9).toFixed(2)+' GB</td><td class="num">'+c.ready[1].toFixed(2)+' s <small class="mute">('+c.ready[0].toFixed(2)+' to '+c.ready[2].toFixed(2)+')</small></td><td class="num">'+w.ready[1].toFixed(2)+' s <small class="mute">('+w.ready[0].toFixed(2)+' to '+w.ready[2].toFixed(2)+')</small></td><td class="num">'+Math.round(c.first_token[1]*1000)+' ms</td></tr>'});
    ct.innerHTML=h}
})();
// ---- Reading tab, sections 4 and 5: multi-LoRA bars and the structured-output table ----
(function(){
  const D=window.PRD||{},L=D.lora||{};
  const el=document.getElementById('pr-lora-bars');
  if(el&&L.noadapters_c8){
    const rows=[['noadapters_c8','No adapters loaded','8 users'],['lora_zero_c8','8 adapters loaded, all off','8 users'],['lora_same_c8','All on the same adapter','8 users'],['lora_distinct2_c8','2 different adapters','8 users'],['lora_distinct4_c8','4 different adapters','8 users'],['lora_distinct8_c8','8 different adapters','8 users'],['lora_same_c1','One user alone, one adapter','1 user'],['lora_base_c8','No adapter named: all 8 applied','8 users, the trap']];
    const mx=Math.max(...rows.filter(r=>L[r[0]]).map(r=>Math.max(...L[r[0]].map(x=>x.out_tok_per_s))));
    el.innerHTML=rows.filter(r=>L[r[0]]).map(r=>{const v=L[r[0]].map(x=>x.out_tok_per_s),mn=Math.min(...v),mxv=Math.max(...v);
      const col=r[0].startsWith('lora_distinct')?'var(--bad)':r[0]==='lora_base_c8'?'var(--c5)':'var(--c1)';
      return '<div class="row"><div class="nm">'+r[1]+'<span class="ml">'+r[2]+'</span></div><div class="track"><div class="fill" style="width:'+(100*mxv/mx).toFixed(1)+'%;background:'+col+';opacity:.35"></div><div class="fill" style="width:'+(100*mn/mx).toFixed(1)+'%;background:'+col+'"></div></div><div class="val">'+Math.round(mn)+(Math.round(mn)!==Math.round(mxv)?'&ndash;'+Math.round(mxv):'')+'<span class="ml">tokens/s</span></div></div>'}).join('');
  }
  const st=document.getElementById('pr-so-tab');
  if(st&&L.so_free_c1){
    const r2=(a,f,d)=>a.map(f).map(v=>v.toFixed(d)).join(' / ');
    let h='<tr><th>Users</th><th>Schema</th><th class="num">Median ms per output token (repeat 1 / 2)</th><th class="num">Output tokens/s</th><th class="num">Strictly valid JSON</th><th class="num">Valid after stripping a code fence</th></tr>';
    [1,4].forEach(c=>['free','schema'].forEach(m=>{const a=L['so_'+m+'_c'+c];if(!a)return;
      h+='<tr><td>'+c+'</td><td>'+(m==='schema'?'yes':'no')+'</td><td class="num">'+r2(a,x=>x.ms_per_tok_median,1)+'</td><td class="num">'+r2(a,x=>x.out_tok_per_s,0)+'</td><td class="num">'+a.reduce((s,x)=>s+x.valid,0)+' of '+a.reduce((s,x)=>s+x.reqs,0)+'</td><td class="num">'+a.reduce((s,x)=>s+x.valid_after_fence_strip,0)+'</td></tr>'}));
    st.innerHTML=h;
  }
})();
