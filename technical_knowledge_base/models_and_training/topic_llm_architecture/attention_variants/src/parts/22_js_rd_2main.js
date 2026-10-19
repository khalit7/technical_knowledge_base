// Reading tab: every chart, table and drill answer drawn from window.AVR (recorded outputs).
(function(){
  if(!window.AVR||!window.AVP||!document.getElementById('av-spec'))return;
  const A=window.AVR,P=window.AVP,$=id=>document.getElementById(id),esc=P.esc,f3=v=>v.toFixed(3),f4=v=>v.toFixed(4);
  const run=n=>A.runs[n]||null;const L20=n=>run(n)?run(n).val_loss_20win:NaN,L100=n=>run(n)?run(n).val_loss_100win:NaN;
  const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const KR=A.kv_rank,UP=A.uptrain,M=A.mla;let first=true;
  function spec(){
    const rs=[8,16,32,48,64,80,96,128,192,256];
    P.lines($('av-spec'),KR.spectrum.map((r,i)=>({name:'layer '+r.layer,color:C[i],pts:rs.map(x=>[x,r.kv[String(x)]])})),
      {logx:true,xt:[8,16,32,64,128,256],ymin:0.3,ymax:1,yt:[0.4,0.6,0.8,0.9,1],yf:v=>Math.round(v*100)+'%',xlab:'directions kept (r), of 512',ylab:'variance kept',label:'variance of keys and values captured by top r directions'});
    $('av-spec-leg').innerHTML=KR.spectrum.map((r,i)=>'<span style="--sw:'+C[i]+'">layer '+r.layer+'</span>').join('');
    const s64=KR.spectrum.map(r=>r.kv['64']),s128=KR.spectrum.map(r=>r.kv['128']),k32=KR.spectrum.map(r=>r.k['32']);
    $('av-spec-say').innerHTML='Keys and values together span 512 numbers per token per layer, yet 64 directions hold '+(100*Math.min(...s64)).toFixed(1)+'% to '+(100*Math.max(...s64)).toFixed(1)+'% of their variance and 128 hold '+(100*Math.min(...s128)).toFixed(1)+'% to '+(100*Math.max(...s128)).toFixed(2)+'%. Keys alone: 32 directions (what MQA keeps) hold '+Math.round(100*Math.min(...k32))+'% to '+Math.round(100*Math.max(...k32))+'%. Variance is not loss, so the next chart tests it.';
  }
  function conv(){
    const rows=[{label:'MHA as trained (512 numbers)',v:KR.held_out_20win,color:'var(--c1)'}];
    for(const c of KR.conversions){if(c.method.startsWith('mean'))rows.push({label:'average heads into '+c.kv_heads+' KV head'+(c.kv_heads>1?'s':'')+' ('+c.numbers_per_token_layer+')',v:c.held_out_20win,color:'var(--bad)'})}
    if(UP)for(const r of UP.rows){const u=r.uptrain.find(x=>x.steps===75);if(u)rows.push({label:'average into '+r.kv_heads+', then uptrain 75 steps (5%)',v:u.held_out_20win,color:'var(--c4)'})}
    for(const c of KR.conversions){if(!c.method.startsWith('mean')&&c.rank<256)rows.push({label:'project onto top '+c.rank+' directions ('+c.rank+')',v:c.held_out_20win,color:'var(--c3)'})}
    for(const [n,l] of [['at_gqa4','GQA-4 trained from scratch (256)'],['at_gqa2','GQA-2 trained from scratch (128)'],['at_mqa','MQA trained from scratch (64)']])if(run(n))rows.push({label:l,v:L20(n),color:'var(--c2)'});
    P.bars($('av-conv'),rows,{min:2,max:4.6,ref:KR.held_out_20win,refLabel:'MHA '+f4(KR.held_out_20win),label:'held-out loss after each conversion'});
    const pool=KR.conversions.filter(c=>c.method.startsWith('mean')),pr=r=>KR.conversions.find(c=>c.rank===r);
    let t='Averaging destroys the model: '+pool.map(c=>c.kv_heads+' KV heads '+f3(c.held_out_20win)).join(', ')+', all worse than a bigram model (3.616, per the Transformer-from-zero child): the 8 heads\' keys are not similar, so their mean is a key no head asked for. Projecting onto the directions the keys and values actually use costs '+f3(pr(64).held_out_20win-KR.held_out_20win)+' at 64 numbers and '+f3(pr(128).held_out_20win-KR.held_out_20win)+' at 128, with no training.';
    if(UP){const g=k=>UP.rows.find(r=>r.kv_heads===k);const u=(k,s)=>g(k).uptrain.find(x=>x.steps===s).held_out_20win;
      t+=' The GQA paper\'s fix works here only in part: 75 steps of uptraining (5% of the 1,500) bring the averaged GQA-2 from '+f3(g(2).converted_no_training)+' to '+f3(u(2,75))+' and MQA from '+f3(g(1).converted_no_training)+' to '+f3(u(1,75))+(g(2).uptrain.find(x=>x.steps===150)?' (150 steps: '+f3(u(2,150))+' and '+f3(u(1,150))+')':'')+', against '+f3(L20('at_gqa2'))+' and '+f3(L20('at_mqa'))+' for models trained that way from the start (1,500 steps). Uptraining recovers most of the damage but, at this scale and budget, not all of it. The paper reports that GQA "already achieves reasonable performance after conversion" at T5-XXL scale; here it does not, so heads in this small model are more specialised than the paper\'s.'}
    $('av-conv-say').innerHTML=t+' <span class="meas">measured on Apple M1 Pro (CPU)</span>';
    first&&P.drill('pr-pool',()=> 'Measured: '+f3(pool.find(c=>c.kv_heads===2).held_out_20win)+'. Averaging keeps only what the heads share; the projection that keeps what they use costs a tenth of that.');
  }
  function mla(){
    const ls=M.layers;const e=v=>v===0?'0':v.toExponential(1);
    let h='<thead><tr><th>Layer</th><th class="num">largest output</th><th class="num">naive vs the model\'s forward</th><th class="num">absorbed vs naive (float64)</th><th class="num">(float32)</th><th class="num">(bf16)</th><th class="num">RoPE on the whole key, folded anyway: error in weights</th></tr></thead><tbody>';
    for(const l of ls)h+='<tr><td>'+l.layer+'</td><td class="num">'+l.max_abs_out.toFixed(2)+'</td><td class="num">'+e(l.naive_vs_model)+'</td><td class="num">'+e(l.absorbed_vs_naive)+'</td><td class="num">'+e(l.absorbed_vs_naive_fp32)+'</td><td class="num">'+e(l.absorbed_vs_naive_bf16)+'</td><td class="num">'+l.rope_trap_weight_err.toFixed(3)+'</td></tr>';
    $('av-mla-tab').innerHTML=h+'</tbody>';
    const mx=k=>Math.max(...ls.map(l=>l[k]));
    $('av-mla-say').innerHTML='The absorbed form matches the naive one to '+e(mx('absorbed_vs_naive'))+' in float64 and '+e(mx('absorbed_vs_naive_fp32'))+' in float32: the same function, computed in a different order. In bf16 the gap reaches '+mx('absorbed_vs_naive_bf16')+' (on outputs up to '+mx('max_abs_out').toFixed(2)+'), the rounding of a different order of operations, which is why kernels accumulate in float32. The trap column is the reason for the decoupled key: fold W<sub>UK</sub> into the query while RoPE rotates the whole key, and attention weights move by up to '+mx('rope_trap_weight_err').toFixed(2)+' (score errors up to '+mx('rope_trap_score_err').toFixed(2)+').';
    const cost=(lab,o)=>Object.entries(o).map(([k,v])=>'<tr><td>'+lab+'</td><td>'+k+'</td><td class="num">'+v.cache_numbers.toLocaleString()+'</td><td class="num">'+(v.flops>=1e9?(v.flops/1e9).toFixed(2)+' G':(v.flops/1e6).toFixed(2)+' M')+'</td><td class="num">'+v.flops_per_byte+'</td></tr>').join('');
    $('av-mla-cost').innerHTML='<thead><tr><th>Shape</th><th>Decode</th><th class="num">cache numbers read</th><th class="num">FLOPs</th><th class="num">FLOPs per byte</th></tr></thead><tbody>'+cost('tiny GPT, 256 tokens',M.costs_tiny_T256)+cost('DeepSeek-V3, 32,768 tokens',M.deepseek_v3.costs_T32768)+'</tbody>';
    const V=M.deepseek_v3.costs_T32768;
    $('av-mla-cost-say').innerHTML='Re-expanding the latents every step reads few bytes but does '+(V['re-expand every step'].flops/V['absorbed'].flops).toFixed(0)+'x the arithmetic of the absorbed form at DeepSeek-V3\'s shape; caching the expanded keys and values does the least arithmetic but reads '+(V['cache expanded K and V'].bytes/V['absorbed'].bytes).toFixed(0)+'x the bytes. The absorbed form reads the small cache and does '+V['absorbed'].flops_per_byte+' FLOPs per byte, close to an H100\'s balance point (about 295).';
    first&&P.drill('pr-absorb',()=> 'The absorbed form: '+(V['absorbed'].flops/1e9).toFixed(2)+' GFLOP against '+(V['cache expanded K and V'].flops/1e9).toFixed(2)+' for the expanded cache, '+(V['absorbed'].flops/V['cache expanded K and V'].flops).toFixed(1)+'x, because every head dots its query with the whole 576-number entry instead of a 192-number key. It still wins, because it reads '+(V['cache expanded K and V'].bytes/V['absorbed'].bytes).toFixed(0)+'x fewer bytes and decode is memory-bound.');
    // investigation runs
    const names=[['at_mha','MHA'],['at_mha_s1','MHA, seed 1'],['at_mla','MLA 64 + 16 (lab)'],['at_mla_s1','MLA 64 + 16, seed 1'],['av_mla_c128','MLA latent 128 + 16'],['av_mla_r32','MLA 64 + RoPE key 32'],['av_mla_c128_r32','MLA 128 + 32']];
    const rows=names.filter(([n])=>run(n)).map(([n,l],i)=>({label:l+' ('+(run(n).config.attn==='mla'?(run(n).config.mla_kv_latent+run(n).config.mla_rope_dim):512)+')',v:L100(n),color:run(n).config.attn==='mla'?'var(--c3)':'var(--c1)'}));
    P.bars($('av-mla-runs'),rows,{min:2.1,max:2.3,ref:L100('at_mha'),refLabel:'MHA '+f3(L100('at_mha')),label:'held-out loss of MLA variants'});
    const cv=[['at_mha','MHA',C[0]],['at_mla','MLA 64+16',C[2]],['av_mla_c128','128+16',C[3]],['av_mla_r32','64+32',C[4]],['av_mla_c128_r32','128+32',C[5]]].filter(([n])=>run(n));
    P.lines($('av-mla-curve'),cv.map(([n,l,c])=>({name:l,color:c,pts:run(n).eval_curve.filter(e=>e.step>0).map(e=>[e.step,+e.val_loss.toFixed(4)])})),
      {xt:[250,500,750,1000,1250,1500],ymin:2.1,ymax:3.2,yt:[2.2,2.4,2.6,2.8,3.0,3.2],yf:v=>v.toFixed(1),xlab:'training step (held-out loss on 20 windows)',label:'learning curves'});
    $('av-mla-leg').innerHTML=cv.map(([n,l,c])=>'<span style="--sw:'+c+'">'+l+'</span>').join('');
    if(window.AVR_MLA_FIND)$('av-mla-find').innerHTML=window.AVR_MLA_FIND(A);
  }
  function win(){
    const S=A.window_sweep,tr=S.filter(r=>r.served==='as trained'),sv=S.filter(r=>r.served!=='as trained');
    const lab=r=>r.trained_window?(r.global_every?'W '+r.trained_window+', 2 local : 1 global':'W '+r.trained_window+', every layer'):'full attention (256)';
    const rows=tr.map(r=>({label:lab(r)+' (trained)',v:r.loss_all,color:r.global_every?'var(--c4)':r.trained_window?'var(--c3)':'var(--c1)'})).concat(sv.map(r=>({label:'full model served with W '+r.serve_window,v:r.loss_all,color:'var(--bad)'})));
    const full=tr.find(r=>!r.trained_window);
    P.bars($('av-win'),rows,{min:2,max:2.5,ref:full.loss_all,refLabel:'full '+f3(full.loss_all),label:'window sweep'});
    const pick=[[null,0,'full',C[0]],[16,0,'W 16',C[2]],[64,0,'W 64',C[3]],[16,3,'W 16, 2:1',C[4]]];
    const ser=[];
    for(const [w,g,l,c] of pick){const r=tr.find(x=>(x.trained_window||null)===w&&(x.global_every||0)===g);if(r)ser.push({name:l+' trained',color:c,pts:r.loss_by_pos_16.map((v,i)=>[i*16+8,v])})}
    const s16=sv.find(r=>r.serve_window===16);if(s16)ser.push({name:'full served W 16',color:'var(--bad)',dash:true,pts:s16.loss_by_pos_16.map((v,i)=>[i*16+8,v])});
    P.lines($('av-winpos'),ser,{xt:[8,72,136,200,248],ymin:1.8,ymax:2.7,yt:[1.9,2.1,2.3,2.5,2.7],yf:v=>v.toFixed(1),xlab:'position in the 256-token window (mean of 16)',label:'loss by position'});
    $('av-winpos-leg').innerHTML=ser.map(s=>'<span style="--sw:'+s.color+'">'+s.name+'</span>').join('');
    if(window.AVR_WIN_SAY)$('av-win-say').innerHTML=window.AVR_WIN_SAY(A);
    const g=w=>tr.find(r=>r.trained_window===w&&!r.global_every),gi=w=>tr.find(r=>r.trained_window===w&&r.global_every);
    first&&P.drill('pr-win',()=>{const a=g(16),b=gi(16);if(!a||!b)return 'pending';const gap=a.loss_all-full.loss_all,gb=b.loss_all-full.loss_all;
      return 'Measured: all-local W 16 '+f3(a.loss_all)+', 2 : 1 '+f3(b.loss_all)+', full '+f3(full.loss_all)+(gb<0?': the interleave does better than full attention in every layer, by '+f3(-gb)+'. Two global layers carry the long-range information, and the four local ones, which cannot be distracted by distant tokens, do the local work; the lab\'s W 64 interleave also beat full attention (2.154 against 2.160 on 100 windows). One seed each: treat the sign as likely, the size as uncertain.':': the interleave closes '+Math.round(100*(1-gb/gap))+'% of the gap with two global layers out of six.')});
  }
  function sinks(){
    const S=A.sinks;if(!S||!S.length)return;
    const lbl={at_mha:'plain MHA',av_sink:'learned sink logit',av_gate:'output gate'};
    const rng=a=>Math.min(...a).toFixed(3)+' to '+Math.max(...a).toFixed(3);
    let h='<thead><tr><th></th>'+S.map(r=>'<th class="num">'+lbl[r.run]+'</th>').join('')+'</tr></thead><tbody>';
    const row=(t,f)=>'<tr><td>'+t+'</td>'+S.map(r=>'<td class="num">'+f(r)+'</td>').join('')+'</tr>';
    h+=row('held-out loss (100 windows)',r=>f3(L100(r.run)))+row('held-out loss (192 windows)',r=>f3(r.full_loss));
    h+=row('weight on position 0, by layer',r=>rng(r.first_token_mass));
    h+=row('weight sent to the sink, by layer',r=>r.sink_column_mass?rng(r.sink_column_mass):'n/a');
    h+=row('mean gate value, by layer',r=>r.mean_gate?rng(r.mean_gate):'n/a');
    h+=row('largest |residual| entry',r=>Math.max(...r.max_abs_resid).toFixed(1));
    h+=row('loss with the sink removed / gate forced open',r=>r.loss_sink_removed!==undefined?f3(r.loss_sink_removed):r.loss_gate_open!==undefined?f3(r.loss_gate_open):'n/a');
    for(const [W,s] of [[32,0],[32,1],[16,0],[16,1]])h+=row('served with window '+W+(s?' + position 0':'')+' (positions &ge; W)',r=>f3(r.serving.find(x=>x.serve_window===W&&x.sinks_kept===s).loss_pos_ge_W));
    $('av-sink-tab').innerHTML=h+'</tbody>';
    if(window.AVR_SINK_SAY)$('av-sink-say').innerHTML=window.AVR_SINK_SAY(A);
    const sk=S.find(r=>r.anim);if(!sk||!first)return;const an=sk.anim;let mode='with';
    $('av-sk-sub').innerHTML='<span class="meas">measured on Apple M1 Pro (CPU)</span>: the av_sink model, layer '+an.layer+', head '+an.head+' (the head that sends the most weight to its sink), on the running sequence. Each bar is one earlier position\'s weight; the red bar at the end is the sink. Removing the sink renormalises the same scores over the real tokens, which is what a model trained without a sink must do.';
    const toks=A.run_pieces||[];
    function draw(i){const r=an.rows[i],q=an.queries[i],w=r.slice(0,-1),s=r[r.length-1];const tot=w.reduce((a,b)=>a+b,0);
      const ww=mode==='with'?w:w.map(v=>v/tot),mx=Math.max(...ww,mode==='with'?s:0)||1;
      $('av-sk-row').innerHTML=ww.map(v=>'<i style="height:'+(2+60*v/mx).toFixed(1)+'px"></i>').join('')+(mode==='with'?'<i class="sk" style="height:'+(2+60*s/mx).toFixed(1)+'px;flex:0 0 8px"></i>':'');
      const top=ww.indexOf(Math.max(...ww));
      $('av-sk-cap').innerHTML='<b>Query position '+q+(toks[q]?' ("'+esc(toks[q].trim())+'")':'')+'.</b> '+(mode==='with'?'The sink takes '+(100*s).toFixed(0)+'% of this head\'s weight; the real tokens share '+(100*tot).toFixed(0)+'%, the largest '+(100*Math.max(...w)).toFixed(0)+'% on position '+top+'.':'Without the sink the same scores must sum to 1 over real tokens: position '+top+' now gets '+(100*Math.max(...ww)).toFixed(0)+'%, and the weight the head wanted to discard lands on tokens it did not choose.');
    }
    const a=RD.anim({card:'av-sk-row',ctl:'av-sk-ctl',n:an.queries.length,ms:1300,draw,label:'Query position'});
    RD.seg($('av-sk-mode'),m=>{mode=m;a.redraw()});
  }
  function code(){const Q=A.code;if(!Q)return;$('av-tfv').textContent=Q.transformers;
    const order=[['tiny_mla_cache','The tiny GPT\'s MLA caches the latent and the RoPE key, not K and V'],['tiny_window','The tiny GPT\'s window and its global layers'],['swa_mask','transformers: the sliding-window mask (W keys, the query included)'],['gemma3_pattern','transformers: Gemma 3\'s default layer pattern (every 6th layer global)'],['gptoss_pattern','transformers: gpt-oss alternates local and global'],['tiny_sink','The tiny GPT\'s learned sink column'],['gptoss_sinks','transformers: gpt-oss concatenates a sink logit per head'],['gptoss_sinks_drop','... and drops it after the softmax'],['qwen3next_gate_split','transformers: Qwen3-Next computes the gate with the query'],['qwen3next_gate_apply','... and applies it before the output projection'],['dsa_relu','transformers: DSA indexer scores use ReLU'],['dsa_topk','... and attention reads the top k'],['diff_lambda_init','transformers: DiffLlama\'s lambda_init'],['diff_combine','... and the subtraction, then the per-head norm']];
    $('av-code').innerHTML=order.filter(([k])=>Q.quotes[k]).map(([k,t])=>{const q=Q.quotes[k];return '<p class="small" style="margin:10px 0 2px"><b>'+esc(t)+'</b>: <code>'+esc(q.file)+'</code> line '+q.line+'</p><pre>'+esc(q.code)+'</pre>'}).join('');}
  let done=false;
  function all(){spec();conv();mla();win();sinks();if(!done){code();done=true}first=false}
  RD.onRender(all);RD.onResize(all);all();
})();
