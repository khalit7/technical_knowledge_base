// ---- Engine bench: speculative decoding (measured and modelled), prefix caching, engines table, every run, facts ----
(function(){
  const B=window.BCH,D=B.D,$=B.$;
  if(!$('bch-sp-bars'))return;
  const CFG=[['4b_base','no draft (baseline)'],['4b_d06q4_n3','draft, k = 3'],['4b_d06q4_n8','draft, k = 8'],['4b_d06q4_n16','draft, k = 16'],['4b_d06q4_n8_pmin075','draft, k = 8, stop when unsure (p &#8805; 0.75)'],['4b_ngram','prompt lookup (n-gram, no draft model)']];
  const PR={code_edit:'rewrite a function',summarize:'summarize',story:'short story',list:'list 1 to 60 with squares'};
  $('bch-sp-seg').innerHTML=Object.keys(PR).map((k,i)=>'<button data-m="'+k+'"'+(i===0?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+PR[k]+'</button>').join('');
  let pr='code_edit';
  function drawSP(){
    const base=D.spec.find(r=>r.cfg==='4b_base'&&r.prompt===pr);const b0=B.med(base.tok_s);
    const rows=CFG.map(([c,nm])=>{const r=D.spec.find(x=>x.cfg===c&&x.prompt===pr);if(!r)return null;const v=B.med(r.tok_s);
      const dn=r.draft_n.reduce((s,x)=>s+(x||0),0),ac=r.acc.reduce((s,x)=>s+(x||0),0);
      const mdl=dn&&c.indexOf('ngram')<0?modelled(r):null;
      return {name:nm.replace(/&#8805;/g,'>='),sub:dn?'accepted '+B.f(100*ac/dn)+'% of '+B.f(dn/r.draft_n.length)+' drafted per run'+(mdl?'; cost model '+B.f(mdl,1):''):(c==='4b_base'?'plain decode':'no drafts proposed'),
        v:v,lo:Math.min(...r.tok_s),hi:Math.max(...r.tok_s),color:c==='4b_base'?'var(--mute)':(v>b0*1.02?'var(--good)':v<b0*0.98?'var(--bad)':'var(--c1)'),vt:B.f(v,1)+' ('+B.f(v/b0,2)+'x)'}}).filter(Boolean);
    rows.unshift({name:'llama.cpp: Qwen3-4B Q4_K_M target, Qwen3-0.6B Q4_K_M draft',hdr:true});
    const ms=D.mlxspec.filter(r=>r.prompt===pr).sort((a,b)=>a.k-b.k);
    if(ms.length){const m0=B.med(ms[0].tok_s);rows.push({name:'MLX: Qwen3-1.7B 4-bit target, Qwen3-0.6B 4-bit draft',hdr:true});
      ms.forEach(r=>{const v=B.med(r.tok_s);const fd=r.from_draft.reduce((a,b)=>a+b,0)/r.n_out.reduce((a,b)=>a+b,0);const same=r.same_text.filter(Boolean).length;
        rows.push({name:r.k?'draft, k = '+r.k:'no draft (baseline)',sub:r.k?B.f(100*fd)+'% of tokens came from the draft'+(same<r.same_text.length?'; text differed from the baseline in '+(r.same_text.length-same)+' of '+r.same_text.length+' runs':''):'plain decode',
          v:v,lo:Math.min(...r.tok_s),hi:Math.max(...r.tok_s),color:!r.k?'var(--mute)':(v>m0*1.02?'var(--good)':v<m0*0.98?'var(--bad)':'var(--c2)'),vt:B.f(v,1)+' ('+B.f(v/m0,2)+'x)'})})}
    B.bars($('bch-sp-bars'),rows,{max:Math.max(...rows.filter(r=>!r.hdr).map(r=>r.hi!=null?r.hi:r.v))});
    $('bch-sp-cap').innerHTML='Decode tokens/s reported by llama-server for one request at a time, greedy (temperature 0), 256 tokens at most, 3 repetitions (bar: median of the server\'s own timing; mark: range; the value in brackets is the speed-up over no draft). "Cost model" predicts tokens/s from this run\'s own counts and the measured step costs below: verify steps = output tokens minus accepted tokens, each costing (drafted per step) draft steps plus one target step over that many tokens plus one; recompute.py holds the reference. It comes out '+D.facts.specModelLo+' to '+D.facts.specModelHi+'% above the measured speed (it leaves out the draft model\'s own per-step overheads), so read it as an upper bound. Green is faster than the baseline, red slower. Every configuration produced the same number of tokens and the same opening text as the baseline on every prompt (the first 80 characters were recorded and compared), as greedy speculative decoding should. MLX (mlx_lm 0.32.0 stream_generate, same prompts, 3 repetitions) was slower with a draft at every k on every prompt; at k = 6 two prompts produced different text from the baseline, most likely because the batched verify step computes slightly different numbers than one-token decode and a near-tie between two tokens can flip: \"identical output\" holds in exact arithmetic, not always in floating point. On llama.cpp only the highly predictable list prompt gains (up to '+B.f(Math.max(...D.spec.filter(r=>r.prompt==='list'&&r.cfg!=='4b_base').map(r=>B.med(r.tok_s)))/B.med(D.spec.find(r=>r.cfg==='4b_base'&&r.prompt==='list').tok_s),2)+'x); on free text the draft is right too rarely to pay for itself here.';
  }
  function modelled(r){ // tokens/s predicted from the run's counts and the measured step costs (recompute.spec_modelled)
    const v=r.draft_n.map((dn,i)=>{const steps=r.n_out-r.acc[i];const k=dn/steps;return r.n_out/(steps*(k*CD[0][1]+interp(CT,k+1)))});return B.med(v)}
  B.seg($('bch-sp-seg'),m=>{pr=m;drawSP()});
  // modelled speed-up with measured step costs (recompute.spec_speedup is the reference)
  const cost=m=>D.lb.filter(r=>r.set==='lb_smallbatch'&&r.model===m).sort((a,b)=>a.pp-b.pp).map(r=>[r.pp,r.pp/r.ts]);
  const CT=cost('Qwen3-4B'),CD=cost('Qwen3-0.6B');
  function interp(c,x){const xs=c.map(p=>p[0]),ys=c.map(p=>p[1]);let i=1;while(i<xs.length-1&&x>xs[i])i++;return ys[i-1]+(ys[i]-ys[i-1])*(x-xs[i-1])/(xs[i]-xs[i-1])}
  const expTok=(a,k)=>a>=1?k+1:(1-Math.pow(a,k+1))/(1-a);
  const speed=(a,k,ideal)=>expTok(a,k)*CT[0][1]/(k*CD[0][1]+(ideal?CT[0][1]:interp(CT,k+1)));
  B.specSpeed=speed;
  function drawSV(){
    const a=+$('bch-sv-a').value,k=+$('bch-sv-k').value;$('bch-sv-av').textContent=a.toFixed(2);$('bch-sv-kv').textContent=k;
    const meas={name:'one 4B step, measured (ms)',color:'var(--c1)',pts:CT.map(p=>[p[0],p[1]*1000,null,null,p[0]+' tokens in one step: '+B.f(p[1]*1000,1)+' ms ('+B.f(p[1]/CT[0][1],2)+'x one token)'])};
    const flat={name:'flat cost (illustrative datacenter ideal)',color:'var(--mute)',dash:'5 4',marker:false,pts:[[1,CT[0][1]*1000],[17,CT[0][1]*1000]]};
    const dr={name:'draft 0.6B, k steps of 1 token (ms)',color:'var(--c2)',pts:[1,2,4,9,17].map(n=>[n,n*CD[0][1]*1000,null,null,n+' draft steps: '+B.f(n*CD[0][1]*1000,1)+' ms'])};
    B.chart({el:$('bch-sv-plot'),legend:$('bch-sv-leg'),series:[meas,flat,dr],xlab:'tokens in the step (k + 1 for a verify step)',ylab:'milliseconds',ymin:0,xmin:0,xmax:18,xticks:[1,2,4,9,17],label:'Cost of a step against tokens in it'});
    const s1=speed(a,k,false),s2=speed(a,k,true);
    $('bch-sv-out').innerHTML='<div class="stat"><div class="k">expected tokens per verify step</div><div class="v">'+B.f(expTok(a,k),2)+'</div><div class="d">(1 &#8722; a<sup>k+1</sup>) / (1 &#8722; a)</div></div>'+
      '<div class="stat"><div class="k">modelled speed-up, measured M1 costs</div><div class="v" style="color:'+(s1>=1?'var(--good)':'var(--bad)')+'">'+B.f(s1,2)+'x</div><div class="d">draft '+k+' x '+B.f(CD[0][1]*1000,1)+' ms + verify '+B.f(interp(CT,k+1)*1000,1)+' ms</div></div>'+
      '<div class="stat"><div class="k">modelled speed-up, flat verify cost</div><div class="v" style="color:'+(s2>=1?'var(--good)':'var(--bad)')+'">'+B.f(s2,2)+'x</div><div class="d">illustrative: verify costs the same as one token</div></div>';
  }
  ['bch-sv-a','bch-sv-k'].forEach(id=>$(id).addEventListener('input',drawSV));
  // prefix caching
  function drawPX(){
    const px=D.srv.filter(r=>r.tag==='lsv_prefix_1.7b');const on=px.filter(r=>r.label.startsWith('on')),off=px.filter(r=>r.label.startsWith('off'));
    const vx=D.srv.filter(r=>r.tag==='vsv_prefix');const von=vx.filter(r=>r.label.startsWith('on')),voff=vx.filter(r=>r.label.startsWith('off'));
    const row=(nm,g,c)=>{const v=g.map(r=>r.ttft_p50*1000);return {name:nm,sub:g.length+' runs of '+g[0].n+' requests, median TTFT',v:B.med(v),lo:Math.min(...v),hi:Math.max(...v),color:c,vt:B.f(B.med(v))}};
    const rows=[row('llama.cpp, cache off',off,'var(--bad)'),row('llama.cpp, cache on',on,'var(--good)')];
    if(von.length&&voff.length){rows.push(row('vLLM CPU, prefix caching off',voff,'var(--bad)'));rows.push(row('vLLM CPU, prefix caching on',von,'var(--good)'))}
    B.bars($('bch-px-bars'),rows,{unit:'ms'});
    const p0=px[0];
    $('bch-px-cap').innerHTML='Each request: the same '+B.f(p0.prefix_words)+'-word system prompt, then '+B.f(p0.prompt_words)+' new words (about '+B.f(p0.in_tok_total/p0.n)+' prompt tokens in all), '+p0.max_tokens+' output tokens, one user at a time. llama.cpp: Qwen3-1.7B Q4_K_M on the GPU, prompt caching switched per request with <code>"cache_prompt"</code>.'+(von.length?' vLLM: Qwen3-0.6B on CPU, automatic prefix caching on (the default) and off (<code>--no-enable-prefix-caching</code>).':'')+' The first request of each run pays the full prompt; the rest reuse it. The saving equals the share of the prompt that is cached, which is why system prompts and conversation history should come first and stay byte-identical.';
  }
  // engines table: closed loop at 1 and 8 users
  function engTable(){
    const E=[['llama.cpp','lsv_0.6b_q4_closed','Qwen3-0.6B Q4_K_M, Metal GPU'],['MLX','msv_0.6b_4bit_closed','Qwen3-0.6B 4-bit, Metal GPU'],['vLLM (CPU)','vsv_0.6b_fp32_closed','Qwen3-0.6B float32, 4 CPU cores']];
    const cell=(g,k,m,n)=>{if(!g.length)return 'n/a';const v=g.map(r=>r[k]*m);return B.f(B.med(v),n)+' <span class="mute small">['+B.f(Math.min(...v),n)+' to '+B.f(Math.max(...v),n)+']</span>'};
    let h='<thead><tr><th>Engine</th><th>Users</th><th class="num">Output tokens/s</th><th class="num">TTFT p50 (ms)</th><th class="num">TPOT p50 (ms)</th><th class="num">TPOT p99 (ms)</th></tr></thead><tbody>';
    E.forEach(([e,tag,desc])=>[1,4,16].forEach((c,i)=>{const g=D.srv.filter(r=>r.tag===tag&&r.conc===c&&r.n_ok>0);
      h+='<tr><td>'+(i?'':'<b>'+e+'</b><br><span class="mute small">'+desc+'</span>')+'</td><td class="num">'+c+'</td><td class="num">'+cell(g,'out_tok_per_s',1,0)+'</td><td class="num">'+cell(g,'ttft_p50',1000,0)+'</td><td class="num">'+cell(g,'tpot_p50',1000,1)+'</td><td class="num">'+cell(g,'tpot_p99',1000,1)+'</td></tr>'}));
    $('bch-eng-tbl').innerHTML=h+'</tbody>';
  }
  // every run
  function runs(){
    const ks=[...new Set(D.runs.map(r=>r.kind))],es=[...new Set(D.runs.map(r=>r.engine))];
    $('bch-runs-kind').innerHTML='<option value="">all</option>'+ks.map(k=>'<option>'+B.esc(k)+'</option>').join('');
    $('bch-runs-eng').innerHTML='<option value="">all</option>'+es.map(k=>'<option>'+B.esc(k)+'</option>').join('');
    function draw(){const k=$('bch-runs-kind').value,e=$('bch-runs-eng').value;const rs=D.runs.filter(r=>(!k||r.kind===k)&&(!e||r.engine===e));
      $('bch-runs-n').textContent=rs.length+' of '+D.runs.length+' runs';
      $('bch-runs-tbl').innerHTML='<thead><tr><th>#</th><th>Engine</th><th>What</th><th>Started</th><th class="num">Load</th><th>Command</th></tr></thead><tbody>'+rs.map(r=>'<tr><td>'+r.id+'</td><td>'+B.esc(r.engine)+'</td><td>'+B.esc(r.what)+'</td><td>'+(r.t?B.esc(r.t.replace('T',' ').slice(5,16)):'')+'</td><td class="num">'+(r.load_before!=null?B.f(r.load_before,1)+(r.load_after!=null?' / '+B.f(r.load_after,1):''):'')+'</td><td class="cmd">'+B.esc(r.cmd)+'</td></tr>').join('')+'</tbody>'}
    $('bch-runs-kind').addEventListener('change',draw);$('bch-runs-eng').addEventListener('change',draw);draw();
  }
  // facts, versions, predictions, in-tab section links
  Object.assign(B.FACT,D.facts);B.fill();
  const V=D.meta.versions;$('bch-vers').textContent='llama.cpp '+V['llama.cpp']+'; '+V.mlx+'; '+V.vllm+'.';
  document.querySelectorAll('#t-bench .bch-pr').forEach(B.predict);
  B.onRender(()=>{drawSP();drawSV();drawPX();engTable()});
  runs();
})();
