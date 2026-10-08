// ---- Engine bench: KV cache memory, quantization speed and quality ----
(function(){
  const B=window.BCH,D=B.D,$=B.$;
  if(!$('bch-kv-plot'))return;
  const KVB={f16:16,q8_0:8.5,q4_0:4.5}; // bits stored per number
  const PER=2*28*8*128; // numbers per token, Qwen3-0.6B
  const COL={f16:'var(--c1)',q8_0:'var(--c2)',q4_0:'var(--c3)'};
  function drawKV(){
    const ser=[];
    Object.keys(KVB).forEach(t=>{const pts=[];for(let c=0;c<=40960;c+=2048)pts.push([c,PER*KVB[t]/8*c/2**20]);
      ser.push({name:t+' formula ('+KVB[t]+' bits)',color:COL[t],pts:pts,marker:false,dash:'5 4',noleg:true});
      ser.push({name:t,color:COL[t],noline:true,r:4.5,pts:D.kv.filter(r=>r.kv_type===t).map(r=>[r.ctx,r.kv_mib,null,null,t+' KV at '+B.f(r.ctx)+' tokens: '+B.f(r.kv_mib)+' MiB allocated ('+B.f(r.kv_bytes_per_token)+' bytes per token)'])})});
    B.chart({el:$('bch-kv-plot'),legend:$('bch-kv-leg'),series:ser,xlab:'context (tokens)',ylab:'KV cache (MiB)',ymin:0,xmin:0,xmax:41500,label:'KV cache size against context'});
    $('bch-kv-leg').innerHTML+='<span>dots: measured allocation; dashed: formula</span>';
    const gb=+$('bch-kv-gb').value,ctx=+$('bch-kv-ctx').value;$('bch-kv-gbv').textContent=gb;$('bch-kv-ctxv').textContent=B.f(ctx);
    $('bch-kv-out').innerHTML=Object.keys(KVB).map(t=>{const per=PER*KVB[t]/8*ctx;const n=Math.floor(gb*1e9/per);
      return '<div class="stat"><div class="k">KV '+t+'</div><div class="v">'+B.f(n)+' sequences</div><div class="d">'+B.f(per/2**20)+' MiB each at '+B.f(ctx)+' tokens</div></div>'}).join('');
  }
  ['bch-kv-gb','bch-kv-ctx'].forEach(id=>$(id).addEventListener('input',drawKV));
  // quantization bars
  function qrows(m){
    const out=[];
    const lb=D.lb.filter(r=>r.set==='lb_0.6b_quants'||r.set==='lb_1.7b_quants');
    const models=['Qwen3-0.6B','Qwen3-1.7B'];
    models.forEach(md=>['BF16','F16','Q8_0','Q4_K_M'].forEach(q=>{
      const pp=lb.find(r=>r.model===md&&r.quant===q&&r.pp===512),tg=lb.find(r=>r.model===md&&r.quant===q&&r.tg===128);if(!pp||!tg)return;
      const bits=8*tg.bytes/tg.params;
      const v={tg:[tg.ts,Math.min(...tg.samples),Math.max(...tg.samples)],pp:[pp.ts,Math.min(...pp.samples),Math.max(...pp.samples)],gb:[tg.ts*tg.bytes/1e9,Math.min(...tg.samples)*tg.bytes/1e9,Math.max(...tg.samples)*tg.bytes/1e9],size:[tg.bytes/1e9,null,null]}[m];
      out.push({name:'llama.cpp '+md.slice(6)+' '+q,sub:B.f(bits,2)+' bits per weight',v:v[0],lo:v[1],hi:v[2],color:'var(--c1)',vt:m==='size'?B.f(v[0],2):null})}));
    D.mlx.filter(r=>r.b===1&&r.p===512).forEach(r=>{
      const v={tg:r.gen_tps,pp:r.prompt_tps,gb:null,size:null}[m];if(!v)return;
      out.push({name:'MLX '+r.model.slice(6)+' '+r.quant,sub:'median of '+v.length+' trials',v:B.med(v),lo:Math.min(...v),hi:Math.max(...v),color:'var(--c2)'})});
    return out;
  }
  let qm='tg';
  const QU={tg:'tok/s',pp:'tok/s',gb:'GB/s',size:'GB'};
  function drawQ(){B.bars($('bch-q-bars'),qrows(qm))}
  B.seg($('bch-q-seg'),m=>{qm=m;drawQ()});
  function qtable(){
    const P=Object.fromEntries(D.ppl.map(r=>[r.model,r]));const K=Object.fromEntries(D.kld.map(r=>[r.quant,r]));
    const rows=[['Qwen3-0.6B','F16'],['Qwen3-0.6B','Q8_0'],['Qwen3-0.6B','Q4_K_M'],['Qwen3-1.7B','Q8_0'],['Qwen3-1.7B','Q4_K_M']];
    let h='<thead><tr><th>Model</th><th>Weights</th><th class="num">Perplexity (lower is better)</th><th class="num">vs F16</th><th class="num">Mean KL divergence</th><th class="num">Same top token</th></tr></thead><tbody>';
    rows.forEach(([m,q])=>{const p=P[m+'-'+q];const k=m==='Qwen3-0.6B'?K[q]:null;const base=P['Qwen3-0.6B-F16'];
      h+='<tr><td>'+m+'</td><td>'+q+'</td><td class="num">'+(p?B.f(p.ppl,2)+' &#177; '+B.f(p.pm,2):'n/a')+'</td><td class="num">'+(m==='Qwen3-0.6B'&&p?(q==='F16'?'baseline':((p.ppl>=base.ppl?'+':'&#8722;')+B.f(Math.abs(100*(p.ppl/base.ppl-1)),1)+'%')):'')+'</td><td class="num">'+(k?B.f(k.kld_mean,4):(m==='Qwen3-0.6B'&&q==='F16'?'0 (baseline)':'<span class="mute">not run</span>'))+'</td><td class="num">'+(k?B.f(k.same_top,1)+'%':(m==='Qwen3-0.6B'&&q==='F16'?'100%':'<span class="mute">not run</span>'))+'</td></tr>'});
    $('bch-q-tbl').innerHTML=h+'</tbody>';
  }
  B.onRender(()=>{drawKV();drawQ();qtable()});
})();
