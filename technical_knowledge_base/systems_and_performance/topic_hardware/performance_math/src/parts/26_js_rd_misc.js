// ---- Reading: the traced FLOP ledger chart (s1), the saved-tensor table (s3), the M1 chart (s6), predict-then-reveal ----
(function(){
  const P=window.PMD,X=window.CALCX;
  const parts=[['proj','Attention projections','var(--c1)'],['mlp','MLP','var(--c3)'],['head','Output head','var(--c4)'],['core_fwd','Attention core, forward','var(--c2)'],['core_bwd_flash','Attention core, backward','var(--c5)']];
  // s1: stacked bars per sequence length, against 6N
  const el=document.getElementById('rd-led');
  function led(){if(!el)return;const W=RD.width(el),rows=Object.keys(P.ledger_l8),rh=34,pl=Math.min(92,W*.22),pr=12,pt=22,H=pt+rows.length*rh+30;
    const mx=300e9,sx=v=>pl+(W-pl-pr)*Math.min(v,mx)/mx;let b='';
    [0,50,100,150,200,250,300].forEach(g=>{const x=sx(g*1e9);b+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-24)+'" stroke="var(--line)"/>'+RD.t(x,H-10,g,{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=RD.t(W-pr,H-10+0,'',{});
    rows.forEach((T,i)=>{const r=P.ledger_l8[T],y=pt+i*rh;let acc=0;
      parts.forEach(([k,,c])=>{const v=r[k],x0=sx(acc),x1=sx(acc+v);b+='<rect x="'+x0+'" y="'+(y+4)+'" width="'+Math.max(0,x1-x0)+'" height="'+(rh-12)+'" fill="'+c+'"/>';acc+=v});
      b+=RD.t(pl-6,y+rh/2+2,(+T).toLocaleString('en-US'),{a:'end',fs:11});
      b+=RD.t(Math.min(sx(acc)+4,W-pr-40),y+rh/2+2,X.sig(acc/1e9,3),{fs:10.5,w:600});});
    const x6=sx(P.ledger_l8[rows[0]].six_n);b+='<line x1="'+x6+'" x2="'+x6+'" y1="'+(pt-8)+'" y2="'+(H-24)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.t(x6+3,pt-10,'6N = 48.2',{fs:10.5});
    b+=RD.t(pl,H-0,'',{});
    el.innerHTML=RD.svg(W,H,b,'Training FLOPs per token by part, Llama 3.1 8B')+
      '<div class="leg">'+parts.map(p=>'<span style="--sw:'+p[2]+'">'+p[1]+'</span>').join('')+'<span class="mute">GFLOP per token; rows: sequence length</span></div>';}
  // s3: the saved tensors of one layer
  function saved(){const t=document.getElementById('rd-saved');if(!t)return;
    const rows=P.saved_tensors_l0.filter(r=>r[2]>=0.2);let sum=0;
    const h=window.CALCX.M.l8.h;let q=0;
    const role=r=>{const sh=r[0],w=r[3],last=sh[sh.length-1];
      if(last===14336)return 'MLP: one of gate output, up output, SiLU output, their product';
      if(r[1]==='torch.float32')return 'RMSNorm input, upcast to FP32';
      if(w.indexOf('self.weight')>=0)return 'RMSNorm: normalised value, before the weight';
      if(w.indexOf('q_proj')>=0)return 'attention norm output: input to q, k, v';
      if(w.indexOf('down_proj')>=0)return 'MLP norm output: input to gate and up';
      if(sh.length===4&&sh[1]===8)return 'K after RoPE (8 KV heads)';
      if(last===1024)return 'V (8 KV heads)';
      if(sh.length===4){q++;return q===1?'Q after RoPE':'attention output (also the o projection\'s input)'}
      return ''};
    t.innerHTML='<tr><th>What it is</th><th>Shape</th><th>dtype</th><th class="num">Bytes per token</th><th>Saved at (modeling_llama.py)</th></tr>'+rows.map(r=>{sum+=r[2];
      return '<tr><td>'+role(r)+'</td><td class="mono small">['+r[0].join(', ')+']</td><td class="small">'+r[1].replace('torch.','')+'</td><td class="num">'+X.sig(r[2],3)+'h</td><td class="small mono" style="overflow-wrap:anywhere">'+X.esc(r[3].replace(/^forward: |^flash_attention: /,''))+'</td></tr>'}).join('')+
      '<tr><td colspan="3">RoPE tables, log-sum-exp, norm scales</td><td class="num">'+X.sig(P.saved_groups_h.small,2)+'h</td><td></td></tr>'+
      '<tr><td colspan="3"><b>One layer</b></td><td class="num"><b>'+X.sig(P.act_layer_flash_per_tok_h,3)+'h</b></td><td class="small">MLP '+P.saved_groups_h.mlp+'h, norms and their outputs '+P.saved_groups_h.norm+'h, attention '+P.saved_groups_h.attn+'h</td></tr>';}
  // s6: measured against predicted on the M1 Pro GPU
  function m1(){const el=document.getElementById('rd-m1');if(!el||!P.m1||!P.m1.length)return;
    const W=RD.width(el),H=200,pl=46,pr=12,pt=14,pb=30,n=P.m1.length,mx=Math.max(...P.m1.map(r=>Math.max(r.median_s,r.pred_s)))*1.15;
    const gw=(W-pl-pr)/n,sy=v=>pt+(H-pt-pb)*(1-v/mx);let b='';
    for(let g=0;g<=4;g++){const v=mx*g/4;b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(v)+'" y2="'+sy(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,sy(v)+4,X.sig(v,2)+' s',{a:'end',fs:10,fill:'var(--mute)'})}
    P.m1.forEach((r,i)=>{const x=pl+i*gw+gw*.18,w=gw*.28;
      b+='<rect x="'+x+'" y="'+sy(r.median_s)+'" width="'+w+'" height="'+(sy(0)-sy(r.median_s))+'" fill="var(--c3)"/>';
      b+='<rect x="'+(x+w+3)+'" y="'+sy(r.pred_s)+'" width="'+w+'" height="'+(sy(0)-sy(r.pred_s))+'" fill="var(--c1)"/>';
      b+='<rect x="'+(x+w+3)+'" y="'+sy(r.compute_only_s)+'" width="'+w+'" height="1.5" fill="var(--ink)"/>';
      b+=RD.t(x+w,H-12,(r.seq).toLocaleString('en-US')+' tokens',{a:'middle',fs:10.5});
      b+=RD.t(x+w/2,sy(r.median_s)-4,X.sig(r.median_s,3),{a:'middle',fs:10});b+=RD.t(x+w*1.5+3,sy(r.pred_s)-4,X.sig(r.pred_s,3),{a:'middle',fs:10})});
    el.innerHTML=RD.svg(W,H,b,'Measured against predicted step time on the M1 Pro GPU')+
      '<div class="leg"><span style="--sw:var(--c3)">measured (median of '+P.m1_meta.runs+' runs)</span><span style="--sw:var(--c1)">predicted, operator by operator</span><span style="--sw:var(--ink)">black tick: FLOPs at peak only</span></div>';}
  function m1text(){const t=document.getElementById('rd-m1t');if(!t||!P.m1||!P.m1.length)return;
    t.innerHTML='<tr><th>Sequence</th><th class="num">Step (median)</th><th>Run medians</th><th class="num">TFLOP/s</th><th class="num">MFU</th><th class="num">Predicted</th></tr>'+P.m1.map(r=>
      '<tr><td>'+r.seq.toLocaleString('en-US')+'</td><td class="num">'+X.sig(r.median_s,3)+' s</td><td class="small">'+r.run_medians.map(v=>X.sig(v,3)).join(', ')+' s</td><td class="num">'+X.sig(r.achieved_tf,3)+'</td><td class="num">'+X.sig(r.mfu*100,3)+'%</td><td class="num">'+X.sig(r.pred_s,3)+' s</td></tr>').join('');
    const r=P.m1[P.m1.length-1],h=document.getElementById('rd-m1-h100');
    if(h)h.innerHTML='Give the 2,048-token step\'s operator list an H100\'s numbers instead (989.5 TFLOP/s, 3.35 TB/s): the matrix multiplies alone would take '+X.sig(r.h100_mm_s*1e3,2)+' ms, the whole list '+X.sig(r.h100_pred_s*1e3,3)+' ms, because the H100 does 295 FLOPs in the time it reads a byte and every unfused elementwise operator, cast and copy becomes the bottleneck. Even with perfect matmuls this unfused step could not exceed about '+Math.round(r.h100_ceiling*100)+'% MFU on an H100, against '+X.sig(r.mfu*100,2)+'% measured on the M1.';
    const d=document.getElementById('rd-drill-m1');if(d){const a=P.m1[P.m1.length-1];
      d.innerHTML='<div class="q">9. Two Llama 3.1 8B layers, 2,048 tokens, forward and backward: '+X.sig(a.flops/1e12,3)+' TFLOP in '+X.sig(a.median_s,3)+' s on the M1 Pro GPU (peak 5.06 TFLOP/s). What MFU?</div><div class="opts"><button data-a="0">About 15%</button><button data-a="0">About 40%</button><button data-a="1">About 70%</button></div><div class="ans" hidden>'+X.sig(a.flops/1e12,3)+'e12 / '+X.sig(a.median_s,3)+' s = '+X.sig(a.achieved_tf,3)+' TFLOP/s, '+X.sig(a.mfu*100,3)+'% of 5.06. High, because the M1 has no tensor cores (a low ridge) and nothing else (network, pipeline) gets in the way.</div>'}}
  function all(){led();saved();m1();m1text()}
  all();RD.onRender(()=>{led();saved();m1()});RD.onResize(()=>{led();m1()});
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));
      b.classList.add(b.dataset.a==='1'?'right':'wrong');pr.querySelectorAll('.opts button[data-a="1"]').forEach(x=>x.classList.add('right'));ans.hidden=false}))});
})();
