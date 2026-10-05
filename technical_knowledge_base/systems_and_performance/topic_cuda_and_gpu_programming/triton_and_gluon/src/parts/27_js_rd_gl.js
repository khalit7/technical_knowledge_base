// ---- Reading sections 9 and 10: Inductor's generated code, Gluon stages, tutorial 02 table ----
(function(){
  const D=window.TGD,$=id=>document.getElementById(id),esc=RD.esc;
  const py=window.TG_py;
  const strip=s=>s.split('\n').filter(l=>!/^\s*$/.test(l)).join('\n');
  $('rd-ind-pw').innerHTML=py(strip(D.inductor.pointwise.kernel));
  $('rd-ind-soft').innerHTML=py(strip(D.inductor.attn_like.kernel));
  $('rd-ind-call').innerHTML=py(D.inductor.attn_like.call.split('\n').filter(l=>!/^\s*$/.test(l)&&!/raw_stream|recursively/.test(l)).join('\n'));
  $('rd-gl-stages').textContent=D.gluon.vadd_stages.join(', ');
  const P=D.gl_pub,rows=D.gluon.memcpy.filter(r=>r.t==='sm_100a');
  const cnt=a=>{const c={};a.forEach(x=>c[x]=(c[x]||0)+1);return Object.entries(c).map(([k,v])=>v+' x '+k).join(', ')};
  let h='<table class="tbl-sm"><thead><tr><th>R (elements per thread per run)</th><th>Loads per thread, sm_100a</th><th>Stores per thread</th><th class="num">Tutorial: load width (bits)</th><th class="num">Tutorial: GB200 TB/s</th></tr></thead><tbody>';
  rows.forEach(r=>{const t=P.table[String(r.R)];h+='<tr><td>'+r.R+'</td><td><code>'+cnt(r.ld)+'</code></td><td><code>'+cnt(r.st)+'</code></td><td class="num">'+t.vec_len+(t.n_loads>1?' x '+t.n_loads:'')+'</td><td class="num">'+P.xblock_2048_TBps[String(r.R)].toFixed(3)+'</td></tr>'});
  $('rd-gl-tbl').innerHTML=h+'</tbody></table>';
})();
(function(){const D=window.TGD,m={};D.main.forEach(r=>m[r.key+'.'+r.target]=r);const a=m['vadd.sm_90a'],b=m['vadd_n1000.sm_90a'],el=document.getElementById('rd-m-n1000');
  if(el)el.textContent=a.ops['LDG.E.128']+' LDG.E.128 became '+b.ops['LDG.E']+' LDG.E per thread on sm_90a';})();
