// ---- Reading sections 10 and 11: attention memory and backends, FlexAttention notes, torchao ----
(function(){
  const D=window.FST,U=window.FU,$=U.$,esc=RD.esc;
  // ---- attention memory ----
  const SV=D.attn.saved;
  U.seg($('fst-attmem-seg'),[['cpu','CPU'],['mps','MPS']],dev=>{
    const rows=[];const mx=Math.max(...SV.filter(s=>s.device===dev).map(s=>s.saved_bytes))/1e6;
    [256,1024,2048].forEach(T=>['sdpa','manual'].forEach(h=>{const s=SV.find(x=>x.device===dev&&x.T===T&&x.how===h);
      rows.push({nm:'T = '+U.comma(T)+', '+(h==='sdpa'?'SDPA':'written out'),ml:s.saved_shapes.map(x=>'('+x.join(' &times; ')+')').join(' + '),v:s.saved_bytes/1e6,txt:U.f1(s.saved_bytes/1e6)+' MB',col:h==='sdpa'?'var(--c3)':'var(--c2)'})}));
    U.bars($('fst-attmem-bars'),rows,mx)},'cpu');
  const sv=(d,T,h)=>SV.find(x=>x.device===d&&x.T===T&&x.how===h).saved_bytes;
  // ---- SDPA table ----
  const C=D.attn.cases;
  const short=o=>o?o.replace('aten::',''):'';
  U.seg($('fst-sdpa-seg'),[['cpu','CPU'],['mps','MPS']],dev=>{
    let h='<table class="rd-tbl tbl-sm"><thead><tr><th>Inputs</th><th>Kernel that ran</th><th>Error vs float64</th><th>Forcing FLASH</th><th>Forcing EFFICIENT</th></tr></thead><tbody>';
    C.filter(c=>c.device===dev).forEach(c=>{
      const lab=c.dtype+', ('+c.shape.join(', ')+')'+(c.mask?', '+c.mask+' mask':c.is_causal?', is_causal':'')+(c.dropout?', dropout '+c.dropout:'')+(c.requires_grad?', requires_grad':'');
      const f=k=>{const v=c.forced[k]||'';return v.startsWith('error')?'<span class="ann">raises</span>':short(v)};
      h+='<tr><td>'+lab+'</td><td><code>'+short(c.default_ops[c.default_ops.length-1])+'</code></td><td>'+(c.max_abs_err_vs_f64!=null?c.max_abs_err_vs_f64.toExponential(1):'(random dropout)')+'</td><td>'+f('FLASH_ATTENTION')+'</td><td>'+f('EFFICIENT_ATTENTION')+'</td></tr>'});
    $('fst-sdpa-tbl').innerHTML=h+'</tbody></table>'},'cpu');
  const ef=C.find(c=>c.device==='cpu'&&!c.mask&&!c.dropout&&!c.requires_grad&&c.dtype==='float32').forced.EFFICIENT_ATTENTION;
  // ---- FlexAttention summary ----
  const F=D.flex,bm=(T,m)=>F.block_masks.find(b=>b.T===T&&b.mask===m);
  const mpsr=F.runs.filter(r=>r.device==='mps'&&r.compiled_max_abs_err_vs_f64!=null);
  const maxe=Math.max(...mpsr.map(r=>r.compiled_max_abs_err_vs_f64));
  const TF=D.time_flex&&D.time_flex.results;
  let tx='';
  if(TF){const t=(T,m,i)=>{const r=TF.find(x=>x.device==='mps'&&x.T===T&&x.mask===m&&x.impl===i);return r?r.median_ms:NaN};
    tx=' Timed on MPS at 4,096 positions (inference, float32, bench lock), FlexAttention did not win: sliding window '+U.ms(t(4096,'sliding_window','flex compiled'))+' against '+U.ms(t(4096,'sliding_window','sdpa dense mask'))+' for SDPA with the same mask as a dense boolean tensor (a tie), four documents '+U.ms(t(4096,'document_causal','flex compiled'))+' against '+U.ms(t(4096,'document_causal','sdpa dense mask'))+', causal '+U.ms(t(4096,'causal','flex compiled'))+' against '+U.ms(t(4096,'causal','sdpa is_causal'))+' for SDPA with is_causal. Its cost tracks the tiles it visits (sliding window visits fewest), so block sparsity works as designed; the per-tile kernel is just slower than Apple\'s fused SDPA here. The 2.13 release notes claim "up to ~12x speedup over SDPA on sparse patterns" on MPS <span class="vend">vendor</span>; that did not reproduce on this M1 Pro in float32 (other chips, dtypes and sizes not tried).';}
  const VL=D.varlen;
  const first=m=>m.split('. ')[0]+'.';
  // ---- torchao table ----
  const AO=D.ao,P=AO.ptq_big_after_150_steps,base=P[0];
  let h='<table class="rd-tbl tbl-sm"><thead><tr><th>Config</th><th>Weight becomes</th><th class="num">Linear bytes</th><th class="num">Loss</th><th class="num">Max logit diff</th></tr></thead><tbody>';
  P.forEach(r=>{h+='<tr><td><code>'+esc(r.config)+'</code></td>'+(r.ok?'<td><code>'+r.weight_type+'</code></td><td class="num">'+U.f1(r.linear_bytes/1e6)+' MB</td><td class="num">'+r.eval_loss.toFixed(4)+'</td><td class="num">'+(r.max_abs_logit_diff!=null?r.max_abs_logit_diff.toFixed(3):'')+'</td>':'<td colspan="4"><span class="ann">fails here:</span> '+esc(r.error)+'</td>')+'</tr>'});
  $('fst-ao-tbl').innerHTML=h+'</tbody></table>';
  const g=n=>P.find(r=>r.config.startsWith(n));
  // ---- torchao speed ----
  const TA=D.time_ao&&D.time_ao.results;
  if(TA){let M='1';const draw=()=>{const rows=TA.filter(r=>String(r.M)===M);const f=rows.find(r=>r.config==='float32');
      U.bars($('fst-aos-bars'),rows.map(r=>({nm:r.config,ml:(f.median_ms/r.median_ms).toFixed(2)+' times float32\'s speed',v:r.median_ms,txt:U.ms(r.median_ms),col:r.config==='float32'?'var(--c1)':'var(--c5)',hl:r.config==='float32'})))};
    U.seg($('fst-aos-seg'),[['1','1 token (M = 1)'],['2048','2,048 tokens (M = 2,048)']],m=>{M=m;draw()},'1');
    $('fst-aos-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, CPU 4 threads, torchao 0.18.0, <code>torch.utils.benchmark.Timer.blocked_autorange</code> medians, eager (no compile), '+U.load(TA[0].load)+', bench lock (src/exp/time_misc.py <code>ao</code>).';
    const t=(c,m)=>TA.find(r=>r.config===c&&r.M===m).median_ms;
  }
  // ---- float8 emulated: two loss curves ----
  const F8=AO.float8_emulated_small;
  if(F8&&F8.float32){
    const el=$('fst-f8-svg');
    const drawF8=()=>{const w=RD.width(el),h=170,L=36,R=8,T=8,B=22,a=F8.float32,b=F8.float8_emulated,n=a.length;
      const ymax=Math.ceil(Math.max(...a,...b)),ymin=Math.floor(Math.min(...a,...b));
      const X=i=>L+(w-L-R)*i/(n-1),Y=v=>T+(h-T-B)*(1-(v-ymin)/(ymax-ymin));
      let s='';for(let g=ymin;g<=ymax;g++)s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(g)+4,g,{a:'end',fs:10,fill:'var(--mute)'});
      const path=(arr,c)=>'<path d="'+arr.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="1.6"/>';
      s+=path(a,'var(--c1)')+path(b,'var(--c2)');
      s+=RD.t(L+4,T+12,'float32',{fs:11,fill:'var(--c1)'})+RD.t(L+60,T+12,'float8, emulated',{fs:11,fill:'var(--c2)'})+RD.t(w-R,h-4,'step',{a:'end',fs:10,fill:'var(--mute)'});
      el.innerHTML=RD.svg(w,h,s,'Loss curves')};
    drawF8();RD.onResize(drawF8);RD.onRender(drawF8);
    const a=F8.float32,b=F8.float8_emulated;let im=0;b.forEach((v,i)=>{if(v-a[i]>b[im]-a[im])im=i});
  }
  const Q=AO.qat_small;
})();
