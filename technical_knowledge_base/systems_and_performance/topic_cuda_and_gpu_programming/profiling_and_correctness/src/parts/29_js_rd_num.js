// ---- Reading section 5: accumulation chart, summation order, atomics, FP8, and the numbers of the summation-order stage (Fig. 3) ----
(function(){
  const NU=PCD.numerics,AT=PCD.atomics,f=MC.fmtN;
  const sci=v=>v==null?'':v===0?'0':Number.isInteger(v)&&Math.abs(v)<1e6?v.toLocaleString('en-US'):Math.abs(v)>=1e5||Math.abs(v)<1e-2?v.toExponential(2).replace('e+','e'):String(+v.toPrecision(4));
  // formats: a static table in 20_read_e.html since 2026-10-23 (check/check_embed.py compares it with the data)
  // accumulation chart
  function acc(){const R=NU.accumulate.inputs.float16,S=[['fp32_pairwise','float32, pairwise tree','var(--c3)'],['fp32_sequential','float32 running sum','var(--c1)'],['fp16_sequential','float16 running sum','var(--c2)'],['bf16_sequential','bfloat16 running sum','var(--c4)']];
    MC.line(document.getElementById('rd-acc'),S.map(([k,n,c])=>({name:n,color:c,pts:R.map(r=>({x:r.K,y:r[k].median}))})),{logx:true,logy:true,xl:'reduction length K',yl:'median relative error',xfmt:v=>v>=1024?(v/1024)+'K':String(v),yfmt:v=>'1e'+Math.round(Math.log10(v)),label:'accumulation error against K'})}
  // order bars
  const SU=NU.summation,ulp=SU.ulp_at_exact;
  function order(){const items=[['sequential, left to right',SU.orders['sequential']],['pairwise (NumPy)',SU.orders['pairwise (NumPy)']],['PyTorch CPU sum',SU.orders['torch CPU sum']],['sorted by magnitude',SU.orders['sorted by magnitude, sequential']],['sorted by value',SU.orders['sorted ascending, sequential']]]
      .concat(['2','16','256','1024'].map(s=>['split-K, S = '+s,SU.split_k[s]]));
    MC.bars(document.getElementById('rd-order'),items.map(([n,v])=>{const u=(v-SU.exact)/ulp;return {name:n,v:Math.max(0.5,Math.abs(u)),label:(u>0?'+':'')+f(u,Math.abs(u)<10?1:0)+' ulp',color:Math.abs(u)>1000?'var(--bad)':'var(--acc)'}}),{log:true})}
  // atomics table
  const K=AT.kernels;document.getElementById('rd-atom-tab').innerHTML='<table class="tbl-sm"><thead><tr><th>Kernel</th><th class="num">distinct results in 30 runs</th><th class="num">spread, ulps</th><th class="num">worst error</th></tr></thead><tbody>'+
    [['atomic_all','every thread does one <code>atomic_fetch_add</code> on the total'],['atomic_tg','each 256-thread group sums its chunk with a fixed tree, then one atomic add per group (the split-K pattern)'],['tree_fixed','same tree, partials stored and added in a fixed order']]
    .map(([k,n])=>'<tr><td>'+n+'</td><td class="num">'+K[k].distinct+'</td><td class="num">'+f(K[k].spread_ulps,0)+'</td><td class="num">'+sci(K[k].max_abs_err)+'</td></tr>').join('')+'</tbody></table><p class="small mute">MLX '+AT.mlx+' custom Metal kernels; exact sum '+f(AT.exact,4)+' (math.fsum), one ulp = '+AT.ulp_at_exact+'; load '+AT.load.join(', ')+'. Metal\'s relaxed float atomics behave like CUDA\'s <code>atomicAdd</code> on floats here: the order is the hardware\'s.</p>';
  // fp8 table
  const F8=NU.fp8,fr=[['no scale',F8.no_scale],['one scale per tensor',F8.per_tensor],['one scale per row',F8.per_row]];
  document.getElementById('rd-fp8-tab').innerHTML='<table class="tbl-sm"><thead><tr><th>Scaling</th><th class="num">non-zero values cast to 0</th><th class="num">median relative error</th><th class="num">99th percentile</th></tr></thead><tbody>'+
    fr.map(([n,s])=>'<tr><td>'+n+'</td><td class="num">'+f(s.zero_from_nonzero,0)+'</td><td class="num">'+f(s.median_rel_err*100,2)+'%</td><td class="num">'+f(s.p99_rel_err*100,1)+'%</td></tr>').join('')+'</tbody></table>';
  const all=()=>{acc();order()};RD.onRender(all);RD.onResize(all);all();
  // ---- the numbers of Fig. 3 (the summation-order stage, 42_js_sc_sum.js): sixteen float16 numbers summed three ways by the page's float16 model ----
  const RAW=[2048,0.9,1.1,0.8,1.2,1,0.7,1.3,0.95,1.05,0.85,1.15,0.6,1.4,1,0.99],X=RAW.map(v=>FP.round(v,'fp16')),exact=FP.fsum(X);
  // ops of one order: each addition with its operands, its rounded result and the exact sum of the same numbers
  function build(mode,seed){const ops=[];
    if(mode==='pair'){let lev=X.map((v,i)=>({v,ids:[i]})),L=0;while(lev.length>1){const nx=[];for(let i=0;i<lev.length;i+=2){const a=lev[i],b=lev[i+1],v=FP.round(a.v+b.v,'fp16'),ids=a.ids.concat(b.ids);
        ops.push({a:a.v,b:b.v,v,ids,lev:L+1,pos:i/2,ex:FP.fsum(ids.map(j=>X[j]))});nx.push({v,ids})}lev=nx;L++}}
    else{const ord=X.map((_,i)=>i);if(mode==='atom'){const r=FP.rng(seed);for(let i=ord.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]]}}
      let s=X[ord[0]],ids=[ord[0]];for(let k=1;k<ord.length;k++){const v=FP.round(s+X[ord[k]],'fp16');ids=ids.concat([ord[k]]);ops.push({a:s,b:X[ord[k]],v,ids:ids.slice(),k:ord[k],ord,ex:FP.fsum(ids.map(j=>X[j]))});s=v}}
    return ops}
  const sq=build('seq'),pq=build('pair'),last=o=>o[o.length-1];
  window.PCSUM={X,exact,build};
  Object.assign(window.RDV=window.RDV||{},{sum_exact:f(exact,2),sum_seq:f(last(sq).v,0),sum_seq_lost:f(exact-last(sq).v,2),sum_pair:f(last(pq).v,0),sum_pair_lost:f(exact-last(pq).v,2),
    sum_a1:f(sq[0].a+sq[0].b,2),sum_r1:f(sq[0].v,0),sum_a2:f(sq[1].a+sq[1].b,2),sum_r2:f(sq[1].v,0),sum_s5:f(sq[4].v,0),sum_e5:f(sq[4].ex,2),sum_s10:f(sq[9].v,0),sum_e10:f(sq[9].ex,2),
    sum_l1:f(pq.filter(o=>o.lev===1).slice(1).reduce((m,o)=>Math.max(m,o.v),0),2),sum_n1:String(pq.filter(o=>o.lev===1).length),sum_p3:f(pq.filter(o=>o.lev===3)[0].v,0),sum_q3:f(pq.filter(o=>o.lev===3)[1].v,2)});
  const mmr=NU.matmul_vs_ref.float16,acc65=NU.accumulate.inputs.float16.find(r=>r.K===65536);
  Object.assign(window.RDV=window.RDV||{},{mm_f4096:String(mmr.find(r=>r.K===4096).fail_default),mm_f16384:String(mmr.find(r=>r.K===16384).fail_default),
    mm_scale:f(mmr.find(r=>r.K===4096).max_err_over_scale*100,2),acc_bf:f(acc65.bf16_sequential.median*100,1),ulp:String(+ulp.toPrecision(2))});
})();
