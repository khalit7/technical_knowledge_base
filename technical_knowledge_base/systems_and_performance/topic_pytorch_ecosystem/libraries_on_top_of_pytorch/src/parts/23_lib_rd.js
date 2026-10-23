// ---- Reading tab: numbers from window.LIB, predict questions, the gradient-norm chart,
// the accumulation animation, the torchtitan and DeepSpeed tables ----
(function(){
  const D=window.LIB, $=id=>document.getElementById(id), esc=RD.esc;
  const f5=x=>(+x).toFixed(5), f3=x=>(+x).toFixed(3);
  const MB=b=>(b/1e6).toFixed(1)+' MB';
  const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
  const pct=x=>(100*x).toFixed(1)+'%';
  // predict-then-reveal
  const OK={'lib-pr1':2,'lib-pr2':2,'lib-pr3':0};
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    pr.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===OK[pr.id])x.classList.add('right')});
      if(+b.dataset.a!==OK[pr.id])b.classList.add('wrong');
      pr.querySelector('.ans').hidden=false});
  });
  // ---- numbers in prose ----
  const dl=D.dl, P=dl.runs.plain, gn=P.gn.slice().sort((a,b)=>a-b);
  set('lib-pr2-n',dl.clip_active);set('lib-pr2-med',gn[Math.floor(gn.length/2)].toFixed(2));set('lib-pr2-g0',P.gn[0].toFixed(2));
  const last=r=>r.probe[r.probe.length-1][1];
  set('lib-pr2-p0',f3(last(P)));set('lib-pr2-p1',f3(last(dl.runs.hf_clip)));
  const acc=D.acc;
  set('lib-pr3-a',f3(acc.curve.naive[acc.curve.naive.length-1][1])+' (mean of means)');
  set('lib-pr3-b',f3(acc.curve.weighted[acc.curve.weighted.length-1][1])+' (token-weighted)');
  const ni=D.hf.num_items;
  set('lib-hf-items','on a tiny Llama with '+ni.valid_targets+' real targets, passing <code>num_items_in_batch='+(3*ni.valid_targets)+'</code> gave '+ni.loss_with_num_items_3n.toFixed(6)+' = sum / '+(3*ni.valid_targets)+' = '+ni.sum_over_3n.toFixed(6));
  const A=D.hf.attn;
  set('lib-hf-flex','the default picked <code>'+A['default@cpu'].chosen+'</code>; <code>sdpa</code> and <code>eager</code> trained on CPU and MPS (logits within '+A['sdpa@mps'].max_abs_diff_vs_eager_cpu.toExponential(1)+' of eager); <code>flex_attention</code> ran inference on both but its training forward raised "'+esc(A['flex_attention@cpu'].forward.replace(/^error: /,'').split('.')[0])+'" (and the same on MPS) <span class="meas">measured on Apple M1 Pro, torch 2.14.1</span>. On a CUDA GPU FlexAttention compiles to Triton with a backward; not run here.');
  // ---- gradient norm chart ----
  function drawGN(){const el=$('lib-gn');if(!el)return;const w=RD.width(el),h=180,l=34,r=8,t=18,b=24;
    const n=P.gn.length,ymax=4,X=i=>l+(w-l-r)*i/(n-1),Y=v=>t+(h-t-b)*(1-Math.min(v,ymax)/ymax);
    let s='';for(let v=0;v<=ymax;v++)s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,v,{a:'end',fill:'var(--mute)'});
    s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(1)+'" y2="'+Y(1)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="1.5" points="'+P.gn.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
    P.gn.forEach((v,i)=>{if(v>ymax)s+='<text x="'+X(i)+'" y="'+(t-6)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v.toFixed(0)+'</text>'});
    [0,50,100,149].forEach(i=>s+=RD.t(X(i),h-6,i,{a:i===149?'end':i?'middle':'start',fill:'var(--mute)'}));
    s+=RD.t(w-r,Y(1)-4,'clip at 1.0',{a:'end',fill:'var(--bad)'});
    el.innerHTML=RD.svg(w,h,s,'Gradient norm per step')}
  drawGN();RD.onRender(drawGN);RD.onResize(drawGN);
  // ---- accumulation animation ----
  const K=acc.accum_steps,M=acc.micro_batch,N=acc.tokens_total,T=acc.tokens_per_row,TM=acc.tokens_per_micro;
  let mode='naive';
  const share=(i,m)=>m==='naive'?T[i]/(K*TM[Math.floor(i/M)]):T[i]/N;
  const ref=i=>T[i]/N;
  const maxS=Math.max(...T.map((_,i)=>Math.max(share(i,'naive'),ref(i))));
  function drawAcc(st){const el=$('lib-acc-svg');if(!el)return;const w=RD.width(el),rowH=26,top=6,h=top+T.length*rowH+6,l=Math.min(150,Math.max(96,w*0.28)),r=44,bw=w-l-r;
    let s='';
    for(let j=0;j<K;j++){const y0=top+j*M*rowH,y1=y0+M*rowH-4,on=st>j&&st<=K||st>K;
      s+='<rect x="2" y="'+y0+'" width="'+(w-4)+'" height="'+(M*rowH-2)+'" rx="5" fill="'+(st===j+1?'var(--acc2)':'none')+'" stroke="var(--line)"/>';
      s+=RD.t(6,y0+12,'micro-batch '+(j+1),{fs:10,fill:'var(--mute)'})+RD.t(6,y0+24,TM[j]+' tokens',{fs:10,fill:'var(--mute)'});}
    T.forEach((n,i)=>{const y=top+i*rowH+4,done=st>Math.floor(i/M);
      s+=RD.t(l-6,y+12,'row '+i+': '+n,{a:'end',fs:11});
      s+='<rect x="'+l+'" y="'+y+'" width="'+(bw*ref(i)/maxS).toFixed(1)+'" height="8" rx="2" fill="var(--dim)"/>';
      if(done){const v=share(i,mode);s+='<rect x="'+l+'" y="'+(y+10)+'" width="'+(bw*v/maxS).toFixed(1)+'" height="8" rx="2" fill="'+(mode==='naive'?'var(--c2)':'var(--c3)')+'"/>'+RD.t(l+bw*v/maxS+4,y+18,pct(v),{fs:10,fill:'var(--mute)'});}
    });
    el.innerHTML=RD.svg(w,h,s,'Gradient share per row');
    let cap,cnt;
    const err=mode==='naive'?acc.rel_err.naive:acc.rel_err.weighted;
    if(st===0){cap='<div class="t">8 rows, 237 real tokens</div><p>The full batch weights every real token by 1/237, so a row\'s share of the gradient is its token count over 237 (grey). Now split into 4 micro-batches of 2 rows and accumulate.</p>'}
    else if(st<=K){const j=st-1,wt=mode==='naive'?1/(K*TM[j]):1/N;
      cap='<div class="t">Micro-batch '+st+': '+TM[j]+' real tokens</div><p>'+(mode==='naive'?'Its mean loss divides by '+TM[j]+', then by 4: each token weighs 1/'+(K*TM[j])+', '+(N*wt).toFixed(2)+' times its full-batch weight.':'Its summed loss is divided by all 237 tokens: each token weighs 1/237, exactly as in the full batch.')+'</p>'}
    else{cap='<div class="t">'+(mode==='naive'?'A different gradient':'The full-batch gradient')+'</div><p>Measured on the real model: relative error of the accumulated gradient against the full batch\'s = <b>'+pct(err)+'</b>. '+(mode==='naive'?'The 10 tokens of micro-batch 2 count as much as the 124 of micro-batch 1.':'Same as one batch of 8, at a quarter of the activation memory.')+'</p>'}
    set('lib-acc-cap',cap);
    const done=Math.min(st,K),tok=TM.slice(0,done).reduce((a,b)=>a+b,0),sh=T.map((_,i)=>Math.floor(i/M)<done?share(i,mode):0).reduce((a,b)=>a+b,0);
    set('lib-acc-cnt',RD.stat('Micro-batches done',done+' / '+K)+RD.stat('Tokens seen',tok+' / '+N)+RD.stat('Gradient weight so far',sh.toFixed(3),'full batch: 1.000')+RD.stat('Error vs full batch',st>K?pct(err):'...','measured'));
  }
  const an=RD.anim({card:'lib-acc-card',ctl:'lib-acc-ctl',n:K+2,ms:1700,draw:drawAcc,label:'Accumulation step'});
  RD.seg($('lib-acc-mode'),m=>{mode=m;an.reset(K+2)});
  RD.onResize(()=>an.redraw());
  // library table
  const LIBN={hf_no_kwargs:['HF Trainer, model without <code>**kwargs</code>','loss / 4 (micro-batches)','trainer.py L2089 to L2094'],
    hf_kwargs:['HF Trainer, model with <code>**kwargs</code> (any transformers model)','summed loss / num_items_in_batch','trainer.py L2142 to L2145, L2281'],
    accelerate:['Accelerate, <code>accumulate()</code>','loss / gradient_accumulation_steps','accelerator.py L2851'],
    lightning:['Lightning, <code>accumulate_grad_batches=4</code>','loss / accumulate_grad_batches','automatic.py L83']};
  set('lib-acc-tbl',Object.keys(LIBN).map(k=>'<tr><td>'+LIBN[k][0]+'</td><td>'+LIBN[k][1]+'</td><td>'+pct(acc.libraries[k].rel_err_vs_reference)+'</td><td class="small">'+LIBN[k][2]+'</td></tr>').join('')+
    '<tr><td>torchtitan 0.3.0</td><td>summed loss / global valid tokens (all-reduced)</td><td>not run on these rows (read from source)</td><td class="small">trainer.py L884 to L904</td></tr>');
  // ---- torchtitan table ----
  const R=D.titan.runs, TTN={titan_cpu:['1 process, defaults (bf16 compute, selective AC)','reference'],titan_cpu_fp32:['1 process, float32 compute','bf16 against fp32'],
    titan_cpu_noac:['1 process, no activation checkpointing','AC changes no maths'],titan_cpu_fullac:['1 process, full activation checkpointing','AC changes no maths'],titan_cpu_fsdp:['2 processes, FSDP2, float32','different data shards']};
  set('lib-tt-tbl',Object.keys(TTN).filter(k=>R[k]).map(k=>{const L=R[k].loss;return '<tr><td>'+TTN[k][0]+'</td><td>'+f5(L[0])+'</td><td>'+f5(L[1])+'</td><td>'+f5(L[L.length-1])+'</td><td>'+TTN[k][1]+'</td></tr>'}).join(''));
  const C=D.titan.attention_check;
  set('lib-tt-chk','largest difference from torch\'s own FlexAttention '+Math.max(...C.map(c=>c.max_abs_diff)).toExponential(1)+', with both '+Math.min(...C.map(c=>Math.min(c.sdpa_vs_f64,c.flex_vs_f64))).toExponential(1)+' to '+Math.max(...C.map(c=>Math.max(c.sdpa_vs_f64,c.flex_vs_f64))).toExponential(1)+' from a float64 reference: the inputs are bfloat16, so the two agree to bf16 rounding. The mask hid '+pct(C[0].masked_fraction)+' of query-key pairs, because documents end inside the sequence');
  // ---- DeepSpeed table ----
  const TR=D.tr,DS=[['ds_z0','ZeRO-0 (plain data parallel), defaults'],['ds_z0_noclip','ZeRO-0, gradient_clipping 0'],['ds_z1','ZeRO-1, defaults'],['ds_z2','ZeRO-2, defaults'],['ds_z3','ZeRO-3, defaults'],['ds_z3_noclip','ZeRO-3, gradient_clipping 0'],['pl_fsdp2','FSDP2 (Lightning ModelParallelStrategy)'],['acc_ddp','DDP (Accelerate)']];
  function colls(k){const c={};TR[k].key.forEach(e=>{if(e[0]!=='loop')return;const m=e[3].match(/(all_gather_into_tensor|reduce_scatter_tensor|all_reduce|broadcast)$/);if(m)c[m[1]]=(c[m[1]]||0)+e[4]});
    const s=Object.keys(c).map(x=>x+' '+c[x]).join(', ');return s||'none from library code'}
  set('lib-ds-tbl',DS.map(([k,n])=>{const x=TR[k];return '<tr><td>'+n+'</td><td>'+x.losses.map(f5).join(', ')+'</td><td>'+(x.optimizer_state_bytes_rank?MB(x.optimizer_state_bytes_rank):'not read')+'</td><td class="small">'+colls(k)+'</td></tr>'}).join(''));
})();
