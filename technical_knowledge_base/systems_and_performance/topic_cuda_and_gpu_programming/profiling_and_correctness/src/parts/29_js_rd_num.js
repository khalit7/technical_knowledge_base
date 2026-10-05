// ---- Reading section 5: formats table, accumulation chart, summation order, atomics, FP8, and the summation-order animation ----
(function(){
  const NU=PCD.numerics,AT=PCD.atomics,f=MC.fmtN;
  const sci=v=>v==null?'':v===0?'0':Number.isInteger(v)&&Math.abs(v)<1e6?v.toLocaleString('en-US'):Math.abs(v)>=1e5||Math.abs(v)<1e-2?v.toExponential(2).replace('e+','e'):String(+v.toPrecision(4));
  // formats
  const TL=NU.assert_close_defaults,rows=[['float32','float32'],['tf32','TF32 (tensor cores)'],['bfloat16','bfloat16'],['float16','float16'],['float8_e4m3fn','float8 e4m3fn'],['float8_e5m2','float8 e5m2']];
  document.getElementById('rd-fmt-tab').innerHTML='<table class="tbl-sm"><thead><tr><th>Type</th><th class="num">bits</th><th class="num">eps</th><th class="num">largest</th><th class="num">smallest normal</th><th class="num">default rtol, atol</th></tr></thead><tbody>'+
    rows.map(([k,n])=>{const d=NU.dtypes[k],t=TL[k];return '<tr><td>'+n+'</td><td class="num">'+d.bits+'</td><td class="num">'+sci(d.eps)+'</td><td class="num">'+(d.max==null?'as float32':sci(d.max))+'</td><td class="num">'+(d.smallest_normal==null?'as float32':sci(d.smallest_normal))+'</td><td class="num">'+(t?sci(t[0])+', '+sci(t[1]):'none')+'</td></tr>'}).join('')+'</tbody></table>';
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
  // ---- the summation-order animation ----
  const RAW=[2048,0.9,1.1,0.8,1.2,1,0.7,1.3,0.95,1.05,0.85,1.15,0.6,1.4,1,0.99],X=RAW.map(v=>FP.round(v,'fp16'));
  const exact=FP.fsum(X);let mode='seq',seed=7,ops=[];
  function build(){ops=[];
    if(mode==='pair'){let lev=X.map((v,i)=>({v,ids:[i]}));let L=0;while(lev.length>1){const nx=[];for(let i=0;i<lev.length;i+=2){const a=lev[i],b=lev[i+1],v=FP.round(a.v+b.v,'fp16');ops.push({a:a.v,b:b.v,v,ids:a.ids.concat(b.ids),lev:L+1,pos:i/2,ex:FP.fsum(a.ids.concat(b.ids).map(j=>X[j]))});nx.push({v,ids:a.ids.concat(b.ids)})}lev=nx;L++}}
    else{let ord=X.map((_,i)=>i);if(mode==='atom'){const r=FP.rng(seed);for(let i=ord.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]]}}
      let s=X[ord[0]],ids=[ord[0]];for(let k=1;k<ord.length;k++){const v=FP.round(s+X[ord[k]],'fp16');ids=ids.concat([ord[k]]);ops.push({a:s,b:X[ord[k]],v,ids:ids.slice(),k:ord[k],ord,ex:FP.fsum(ids.map(j=>X[j]))});s=v}}}
  const el=document.getElementById('rd-sum-svg'),cap=document.getElementById('rd-sum-cap'),cnt=document.getElementById('rd-sum-cnt');
  function draw(i){if(!ops.length)build();const W=RD.width(el),cw=(W-20)/16,H=mode==='pair'?222:140,fz=W<500?10.5:12;let s='';const done=ops.slice(0,i+1),used=new Set();done.forEach(o=>o.ids.forEach(j=>used.add(j)));
    X.forEach((v,j)=>{const x=10+j*cw,cur=ops[i]&&ops[i].ids.includes(j);s+='<rect x="'+(x+1).toFixed(1)+'" y="8" width="'+(cw-2).toFixed(1)+'" height="26" rx="3" style="fill:'+(cur?'var(--hl)':used.has(j)?'var(--acc2)':'var(--soft)')+';stroke:var(--line)"/>'+RD.t(x+cw/2,25,j===0?(cw<32?'2k':'2048'):f(v,cw>40?2:1),{a:'middle',fs:cw>40?10.5:8.5})});
    if(mode==='pair'){done.forEach(o=>{const span=Math.pow(2,o.lev),x=10+o.pos*span*cw,y=40+o.lev*36;s+='<rect x="'+(x+2).toFixed(1)+'" y="'+y+'" width="'+(span*cw-4).toFixed(1)+'" height="24" rx="3" style="fill:'+(o===ops[i]?'var(--hl)':'var(--bg)')+';stroke:var(--acc)"/>'+RD.t(x+span*cw/2,y+16,f(o.v,o.v>100?0:2)+(o.v!==o.ex&&span*cw>150?' (exact '+f(o.ex,2)+')':''),{a:'middle',fs:10.5})})}
    else{const o=ops[i];if(o&&mode==='atom')o.ord.forEach((j,r)=>{s+=RD.t(10+j*cw+cw/2,46,'#'+(r+1),{a:'middle',fs:9,fill:'var(--mute)'})});
      if(o){s+=RD.t(10,82,'running total (float16): '+f(o.a,o.a>100?0:2)+' + '+f(o.b,2)+' = '+f(o.a+o.b,4)+' rounds to '+f(o.v,o.v>100?0:2),{fs:fz});
        s+=RD.t(10,104,'exact running total of the same numbers: '+f(o.ex,4),{fs:fz,fill:'var(--mute)'});
        s+=RD.t(10,126,'lost so far: '+f(o.ex-o.v,4),{fs:fz,fill:(o.ex-o.v)?'var(--bad)':'var(--good)'})}}
    el.innerHTML=RD.svg(W,H,s,'summation order animation');
    const o=ops[i],last=ops[ops.length-1];
    cap.innerHTML='<div class="t">Addition '+(i+1)+' of 15</div><p>'+(mode==='seq'?'Left to right: the 2,048 comes first, so every later number is added to a total whose float16 spacing is 2.':mode==='pair'?'Pairwise: neighbours are added first, so the small numbers meet each other before they meet 2,048; a parallel reduction adds this way.':'Atomics: the hardware picks the order; each run is a different order and may give a different answer.')+'</p>';
    cnt.innerHTML=RD.stat('Result so far',f(o.v,o.v>100?0:2),'float16')+RD.stat('Exact sum of all 16',f(exact,4),'float64')+RD.stat('Final result',i>=14?f(last.v,last.v>100?0:2):'...',i>=14?'error '+f(last.v-exact,3):'')+
      (mode==='atom'?RD.stat('Run','<button id="rd-sum-again" style="font-size:12px">Another run</button>','order seed '+seed):'');
    const b=document.getElementById('rd-sum-again');if(b)b.onclick=()=>{seed++;build();an.reset(15);an.play()};
  }
  const an=RD.anim({card:'rd-sum-card',ctl:'rd-sum-ctl',n:15,ms:900,draw,label:'Addition'});
  RD.seg(document.getElementById('rd-sum-seg'),v=>{mode=v;build();an.reset(15);an.play()});
  RD.onResize(()=>an.redraw());
  const mmr=NU.matmul_vs_ref.float16,acc65=NU.accumulate.inputs.float16.find(r=>r.K===65536);
  Object.assign(window.RDV=window.RDV||{},{mm_f4096:String(mmr.find(r=>r.K===4096).fail_default),mm_f16384:String(mmr.find(r=>r.K===16384).fail_default),
    mm_scale:f(mmr.find(r=>r.K===4096).max_err_over_scale*100,2),acc_bf:f(acc65.bf16_sequential.median*100,1),ulp:String(+ulp.toPrecision(2))});
})();
