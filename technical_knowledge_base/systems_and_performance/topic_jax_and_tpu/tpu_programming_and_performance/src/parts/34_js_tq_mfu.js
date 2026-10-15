// ---- MFU calculator (tab t-mfu) ----
(function(){
  const U=window.TQU,D=U.D,G=U.G,$=id=>document.getElementById(id),E=RD.esc,gl=U.label,M=D.mfu;
  // MaxText's default-path training FLOPs per token (same as tq_mfu.py maxtext_flops_per_token)
  function fpt(c,S){const ffn=mlp=>2*S*mlp*c.emb_dim*c.n_act+2*S*mlp*c.emb_dim;
    const ffnL=c.num_experts>1?2*S*c.emb_dim*c.num_experts+ffn(c.moe_mlp_dim)*c.k:ffn(c.mlp_dim);
    const qkv=2*S*c.emb_dim*(c.num_query_heads+2*c.num_kv_heads)*c.head_dim,non=4*S*S*c.num_query_heads*c.head_dim,proj=2*S*c.emb_dim*c.num_query_heads*c.head_dim,emb=2*S*c.emb_dim*c.vocab_size,L=c.num_decoder_layers;
    const w=(ffnL*L+(qkv+proj)*L+emb)*3/S,a=non/2*L*3/S;return {w,a,causal:w+a,non:w+2*a}}
  const CFGN={'Llama 2 70B':'llama2-70b','Llama 3.1 8B':'llama3.1-8b','Llama 3.1 70B':'llama3.1-70b','Llama 3.1 405B':'llama3.1-405b','Mixtral 8x7B':'mixtral-8x7b','Mixtral 8x22B':'mixtral-8x22b'};
  let sel=0;
  function tab(){U.table($('tq-f-tab'),[['Model',r=>E(r.model)+' <span class="mute">'+r.tier+'</span>'],['Hardware',r=>gl(r.gen)+', '+r.chips+' chips'],['Seq',r=>U.fmt(r.seq),'num'],['Tokens/s per chip',r=>U.fmt(r.tok),'num',r=>r.tok],
      ['MFU published',r=>U.pct(r.mfu,2),'num',r=>r.mfu],['Non-causal',r=>U.pct(r.mfu_noncausal,2),'num',r=>r.mfu_noncausal],['Causal',r=>U.pct(r.mfu_recomputed,2),'num',r=>r.mfu_recomputed],['Gap, points',r=>U.fmt((r.mfu-r.mfu_recomputed)*100,1),'num',r=>r.mfu-r.mfu_recomputed]],
      M.rows,{rowAttr:(r,j)=>' class="tq-click'+(M.rows.indexOf(r)===sel?' tq-sel':'')+'" data-row="'+M.rows.indexOf(r)+'"'})}
  $('tq-f-tab').addEventListener('click',e=>{const tr=e.target.closest('tr[data-row]');if(!tr)return;sel=+tr.dataset.row;tab();det()});
  function det(){const r=M.rows[sel],c=M.cfgs[CFGN[r.model]],f=fpt(c,r.seq),pk=M.peak[r.gen];
    const host=$('tq-f-det'),W=Math.min(700,U.width(host)),L=10,R=10,mx=Math.max(f.non,r.implied_flops_tok)*1.05,X=v=>L+v/mx*(W-L-R);
    let s='';const bars=[['causal (current count)',f.w,f.a,0],['non-causal (before PR 1988)',f.w,2*f.a,0],['implied by the published MFU',r.implied_flops_tok,0,1]];
    bars.forEach((b,i)=>{const y=18+i*34;s+=U.tx(L,y-3,b[0]+': '+U.si(b[1]+b[2],'FLOP')+' per token',{fs:10.5});
      if(b[3])s+='<rect x="'+L+'" y="'+y+'" width="'+(X(b[1])-L)+'" height="14" rx="2" fill="var(--c4)"/>';
      else s+='<rect x="'+L+'" y="'+y+'" width="'+(X(b[1])-L)+'" height="14" rx="2" fill="var(--c1)"/><rect x="'+X(b[1])+'" y="'+y+'" width="'+(X(b[1]+b[2])-X(b[1]))+'" height="14" rx="2" fill="var(--c2)"/>'});
    host.innerHTML='<div class="tq-leg"><span><i style="background:var(--c1)"></i>weight matmuls (x3)</span><span><i style="background:var(--c2)"></i>attention</span><span><i style="background:var(--c4)"></i>implied</span></div>'+U.S(W,18+3*34,s,'FLOPs per token, three counts')+
      '<p class="small">'+E(r.model)+': '+U.sig(r.params/1e9,4)+'B parameters'+(r.active!==r.params?' ('+U.sig(r.active/1e9,4)+'B active per token)':'')+'; 6N = '+U.si(r.six_n,'FLOP')+' per token. Attention is '+U.pct(f.a/f.causal,1)+' of the causal count at sequence '+U.fmt(r.seq)+
      '. Implied / causal = '+U.fmt(r.ratio,3)+'. Price: $'+U.fmt(r.price,2)+' per chip-hour, so $'+U.fmt(r.usd_per_mtok,3)+' per million training tokens <span class="der">calculated</span>.'+(r.step_s?' Recipe batch '+r.pdbs+' sequences per chip (<code>benchmarks/maxtext_trillium_model_configs.py:'+r.recipe_line+'</code>), so one step takes about '+U.fmt(r.step_s,1)+' s.':'')+'</p>'}
  // your run
  const MOD=Object.keys(M.cfgs);$('tq-f-model').innerHTML=MOD.map(k=>'<option'+(k==='llama2-70b'?' selected':'')+'>'+E(k)+'</option>').join('');
  const HW=U.GEN_ORDER.map(k=>[gl(k),G[k].bf16,G[k].price_v]).concat([['H100 (dense bf16 989.5)',D.gpu.h100.bf16,D.gpu.h100.price],['B200 (dense bf16 2,250)',D.gpu.b200.bf16,D.gpu.b200.price]]);
  $('tq-f-hw').innerHTML=HW.map((h,i)=>'<option value="'+i+'"'+(i===3?' selected':'')+'>'+E(h[0])+'</option>').join('');
  $('tq-f-meas').addEventListener('change',e=>{const st=e.target.value==='step';$('tq-f-stepl').hidden=!st;$('tq-f-tokl').hidden=st;run()});
  function run(){const c=M.cfgs[$('tq-f-model').value],S=+$('tq-f-seq').value,h=HW[+$('tq-f-hw').value],f=fpt(c,S);let tok;
    if($('tq-f-meas').value==='tok')tok=Math.max(0,+$('tq-f-tok').value||0);else{const st=+$('tq-f-step').value||1,bs=+$('tq-f-bs').value||1,ch=+$('tq-f-chips').value||1;tok=bs*S/st/ch}
    $('tq-f-out').innerHTML=RD.stat('Tokens/s per chip',U.fmt(tok,1),'')+RD.stat('FLOPs per token',U.si(f.causal,'FLOP'),'causal count')+RD.stat('MFU, causal',U.pct(f.causal*tok/h[1],2),'current MaxText')+RD.stat('MFU, non-causal',U.pct(f.non*tok/h[1],2),'old count')+
      RD.stat('MFU, weights only',U.pct(f.w*tok/h[1],2),'no attention FLOPs')+RD.stat('$ per million tokens','$'+U.fmt(h[2]/(Math.max(tok,1e-9)*3600)*1e6,3),'$'+U.fmt(h[2],2)+' per chip-hour');
    $('tq-f-note').textContent='Peak '+U.si(h[1],'FLOP/s')+' (bf16, dense). TPU prices: Google Cloud on demand, read '+D.price_read+'; GPU prices: Lambda 8-GPU on demand, read 2026-10-15. "Weights only" counts the weight matmuls (MaxText leaves out the input embedding lookup, which is a gather).'}
  ['tq-f-model','tq-f-seq','tq-f-hw','tq-f-tok','tq-f-step','tq-f-bs','tq-f-chips'].forEach(id=>{$(id).addEventListener('input',run);$(id).addEventListener('change',run)});
  function all(){tab();det();run()}
  U.onTab('t-mfu',all);U.onResize('t-mfu',det);
})();
