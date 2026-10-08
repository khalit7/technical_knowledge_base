// ---- Capacity planner (t-plan): controls, worked examples, outputs and charts ----
window.PLNU=(function(){
  const Q=window.PLN,D=Q.D,M=D.models,C=D.chips,$=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const sig=(x,n)=>{if(x==null||!isFinite(x))return '?';if(x===0)return '0';const d=Math.max(0,(n||3)-1-Math.floor(Math.log10(Math.abs(x))));return (+x.toFixed(Math.min(d,6))).toLocaleString('en-US',{maximumFractionDigits:Math.min(d,6)})};
  const fGB=b=>{const g=b/1e9;return g>=1000?sig(g/1000)+' TB':g>=1?sig(g)+' GB':sig(g*1e3)+' MB'};
  const fT=s=>s==null||!isFinite(s)?'?':s>=1?sig(s,3)+' s':sig(s*1e3,3)+' ms';
  const fUSD=x=>x==null||!isFinite(x)?'n/a':x>=1e6?'$'+sig(x/1e6)+'M':x>=1e4?'$'+sig(x/1e3)+'K':'$'+sig(x,3);
  const fInt=x=>Math.round(x).toLocaleString('en-US');
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const tx=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':' fill="var(--ink)"')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const ENG_DEF={l40s:'vllm_l40s',m1pro:D.engines.m1?'m1':'roof'};
  function batchDefaults(chip){const g=C[chip].mem/1.073741824;
    if(chip==='m1pro')return {tb:2048,seqs:16};
    if(g>=160)return {tb:16384,seqs:1024};if(g>=70)return {tb:8192,seqs:1024};return {tb:2048,seqs:256}}
  const PRESETS=[
    {id:'chat',name:'Chat assistant (running example)',o:Object.assign({},D.default,{eng:'vllm'}),
     note:'A chat assistant on Llama 3.1 70B in FP8 on H200s, each copy on one GPU; prompts of 2,000 tokens of which the first 1,000 (the system prompt) are shared and cached; 300-token answers; 20 requests per second at peak; p99 TTFT under 2 s and 50 ms per token (20 tokens per second, faster than anyone reads). Notice that the TPOT target, not memory, sets the copies: try 100 ms and watch the GPU count fall. Then try BF16 weights: 141 GB no longer fits one GPU, so TP 2 is the only option and the bill moves.'},
    {id:'rh100',name:'MLPerf: Llama 3.1 8B, one H100, vLLM',o:{model:'l8',chip:'h100',fmt:'fp8',kvb:1,tp:1,pp:1,ep:0,eng:'vllm',tb:1024,seqs:512,util:0.91,ovh:1.5,P:778,O:128,share:0,lam:39.56,avg:1,slo_ttft:2,slo_tpot:0.1,price:3.99,api:'min',latx:1,overlap:0,tseq:0},
     check:'h100',note:'Red Hat\'s MLPerf Inference v5.1 server run: vLLM 0.10.0, FP8 weights and FP8 KV cache, --max-num-batched-tokens 1024 --max-num-seqs 512 --gpu-memory-utilization 0.91, 778-token prompts (Red Hat\'s blog) and 128.0 output tokens per sample (the run log: 5,777.08 tokens/s / 45.13 samples/s; the blog\'s "73" does not match the log). The engine constants were fitted on this run and its offline twin.'},
    {id:'rl40s',name:'MLPerf: the same on one L40S',o:{model:'l8',chip:'l40s',fmt:'fp8',kvb:1,tp:1,pp:1,ep:0,eng:'vllm_l40s',tb:2048,seqs:256,util:0.96,ovh:1.5,P:778,O:128,share:0,lam:9.36,avg:1,slo_ttft:2,slo_tpot:0.1,price:1.57,api:'min',latx:1,overlap:0,tseq:0},
     check:'l40s',note:'Same model and engine on an L40S (48 GB GDDR6, 864 GB/s, PCIe). The H100 constants overpredict this card badly (see the calibration table): its sustained compute is a smaller share of its datasheet peak. This preset uses constants fitted to the L40S runs themselves, which still miss by about 10%.'},
    {id:'trt',name:'MLPerf: 8B on H200s, TensorRT-LLM',o:{model:'l8',chip:'h200',fmt:'fp8',kvb:1,tp:1,pp:1,ep:0,eng:'trt',tb:12000,seqs:2048,util:0.98,ovh:1.5,P:778,O:128,share:0,lam:503.21,avg:1,slo_ttft:2,slo_tpot:0.1,price:4.47,api:'min',latx:1,overlap:0,tseq:0},
     check:'h200',note:'HPE\'s MLPerf v5.1 server run on 8x H200 with TensorRT-LLM (max_num_tokens 12000, batch 2048, FP8 KV): 503.21 requests per second over 8 independent copies. TensorRT-LLM runs about 600 sequences per GPU at a mean TPOT of 75 ms, close to the 100 ms limit: it trades latency for throughput as far as the rules allow.'},
    {id:'dsv3',name:'DeepSeek-V3, wide expert parallel',o:{model:'dsv3',chip:'h100',fmt:'native',kvb:2,tp:72,pp:1,ep:1,eng:'vllm',tb:16384,seqs:256,util:0.92,ovh:1.5,P:2000,O:1000,share:0,lam:60,avg:0.5,slo_ttft:5,slo_tpot:0.1,price:3.99,api:'min',latx:1,overlap:1,tseq:0},
     check:'sglang',note:'The decode half of SGLang\'s 96-H100 deployment (lmsys blog, 2025-05-05, vendor): 72 GPUs, experts spread over all of them, attention data-parallel, 256 sequences per GPU, 2,000-token inputs, communication overlapped with compute. Notice that every GPU holds all the attention and shared weights plus a 72nd of the experts (about 28 GB), and that MLA\'s small cache (70 KB per token) is what lets hundreds of sequences fit beside them.'},
    {id:'oss',name:'gpt-oss-120b on one H100',o:{model:'oss120',chip:'h100',fmt:'native',kvb:2,tp:1,pp:1,ep:0,eng:'vllm',tb:8192,seqs:1024,util:0.92,ovh:1.5,P:1000,O:1000,share:0.2,lam:5,avg:0.5,slo_ttft:2,slo_tpot:0.05,price:3.99,api:'min',latx:1,overlap:0,tseq:0},
     note:'A reasoning model with 117B parameters, 5.7B of them active per token (the hardware root\'s count, embeddings included), and MXFP4 experts fits one 80 GB GPU. Notice the API comparison: providers list it at a few cents per million input tokens, so self-hosting only pays at high, steady traffic or when data must stay in-house.'},
    {id:'l405',name:'Llama 3.1 405B on 8x B200',o:{model:'l405',chip:'b200',fmt:'fp8',kvb:1,tp:8,pp:1,ep:0,eng:'vllm',tb:16384,seqs:1024,util:0.92,ovh:1.5,P:4000,O:500,share:0.25,lam:4,avg:0.5,slo_ttft:3,slo_tpot:0.06,price:6.69,api:'min',latx:1,overlap:0,tseq:0},
     note:'405B in FP8 is 406 GB: one 8-GPU B200 node with tensor parallelism. Notice the all-reduce share of the step at TP 8, and that no API lists this model on OpenRouter any more (2026-10-08), so there is nothing to compare with.'}
  ];
  if(D.m1&&D.m1.preset)PRESETS.push({id:'m1',name:D.m1.preset.name,o:D.m1.preset.o,check:'m1',note:D.m1.preset.note});
  let cur=null,state=null;
  // ---- controls ----
  function fillSelects(){
    $('pln-model').innerHTML=D.order.map(k=>'<option value="'+k+'">'+esc(M[k].name)+'</option>').join('');
    $('pln-chip').innerHTML=D.corder.map(k=>'<option value="'+k+'">'+esc(C[k].name)+'</option>').join('');
    $('pln-eng').innerHTML=Object.keys(D.engines).map(k=>'<option value="'+k+'">'+esc(D.engines[k].name)+'</option>').join('')+'<option value="custom">custom (Advanced)</option>';
    $('pln-presets').innerHTML=PRESETS.map(p=>'<button data-p="'+p.id+'">'+esc(p.name)+'</button>').join('');
  }
  function tpOptions(ep,chip){const max=C[chip].tpmax;const opts=ep?[2,4,8,16,32,64,72]:[1,2,4,8].filter(v=>v<=max);
    $('pln-tp').innerHTML=opts.map(v=>'<option>'+v+'</option>').join('');$('pln-tpl').firstChild.textContent=ep?'GPUs per copy (expert parallel) ':'Tensor parallel (GPUs per stage) '}
  function setSel(id,v){const el=$(id);const s=String(v);if(![...el.options].some(o=>o.value===s)){const op=document.createElement('option');op.value=s;op.textContent=s;el.appendChild(op)}el.value=s}
  function apply(o){
    $('pln-model').value=o.model;$('pln-chip').value=o.chip;$('pln-fmt').value=o.fmt;$('pln-kvb').value=String(o.kvb);
    $('pln-ep').checked=!!o.ep;tpOptions(!!o.ep,o.chip);setSel('pln-tp',o.tp);$('pln-pp').value=String(o.pp);
    $('pln-price').value=o.price||'';const e=D.engines[o.eng];$('pln-eng').value=o.eng;
    $('pln-effc').value=o.eff_c!=null?o.eff_c:e.eff_c;$('pln-effm').value=o.eff_m!=null?o.eff_m:e.eff_m;$('pln-tovh').value=o.tovh!=null?o.tovh:e.tovh;$('pln-tseq').value=o.tseq!=null?o.tseq:(e.tseq||0);
    setSel('pln-tb',o.tb);setSel('pln-seqs',o.seqs);$('pln-util').value=o.util;$('pln-ovh').value=o.ovh;$('pln-latx').value=o.latx;$('pln-overlap').checked=!!o.overlap;
    $('pln-lam').value=o.lam;$('pln-P').value=o.P;$('pln-O').value=o.O;$('pln-share').value=o.share;$('pln-avg').value=o.avg;
    $('pln-sttft').value=o.slo_ttft;$('pln-stpot').value=Math.round(o.slo_tpot*1000);$('pln-api').value=o.api;
  }
  function read(){
    const num=(id,d,lo)=>{const v=+$(id).value;return isFinite(v)&&v>=(lo||0)&&$(id).value!==''?v:d};
    const o={model:$('pln-model').value,chip:$('pln-chip').value,fmt:$('pln-fmt').value,kvb:+$('pln-kvb').value,tp:+$('pln-tp').value,
      pp:+$('pln-pp').value,ep:$('pln-ep').checked?1:0,tb:+$('pln-tb').value,seqs:+$('pln-seqs').value,util:+$('pln-util').value,ovh:+$('pln-ovh').value,
      P:Math.max(1,Math.round(num('pln-P',2000,1))),O:Math.max(2,Math.round(num('pln-O',300,2))),share:+$('pln-share').value,lam:Math.max(0.001,num('pln-lam',1,0.001)),avg:+$('pln-avg').value,
      slo_ttft:Math.max(0.01,num('pln-sttft',2,0.01)),slo_tpot:Math.max(0.001,num('pln-stpot',50,1)/1000),eff_c:+$('pln-effc').value,eff_m:+$('pln-effm').value,tovh:+$('pln-tovh').value,tseq:+$('pln-tseq').value,
      latx:+$('pln-latx').value,overlap:$('pln-overlap').checked?1:0,price:num('pln-price',0,0),api:$('pln-api').value,eng:$('pln-eng').value};
    const m=M[o.model];
    if(o.ep&&!m.E){o.ep=0}
    if(o.ep)o.pp=1;
    if(o.fmt==='native'&&!m.fmt)o.fmt='bf16';
    return o;
  }
  function labels(o){
    $('pln-util-v').textContent=Math.round(o.util*100)+'%';$('pln-effc-v').textContent=sig(o.eff_c*100,3)+'%';$('pln-effm-v').textContent=Math.round(o.eff_m*100)+'%';
    $('pln-tovh-v').textContent=sig(o.tovh,3)+' ms';$('pln-tseq-v').textContent=sig(o.tseq,3)+' ms';$('pln-ovh-v').textContent=sig(o.ovh,2)+' GB';$('pln-latx-v').textContent=sig(o.latx,2)+'x';
    $('pln-share-v').textContent=Math.round(o.share*100)+'%';$('pln-avg-v').textContent=Math.round(o.avg*100)+'%';
    $('pln-pp').disabled=!!o.ep;
    const m=M[o.model],ch=C[o.chip];
    const ws=Q.weightSplit(m,o.fmt);
    $('pln-modelnote').innerHTML=esc(m.name)+': '+sig(m.P/1e9,4)+'B parameters'+(m.E?', '+sig(m.Pact/1e9,3)+'B active per token ('+m.E+' experts, '+m.k+' per token)':'')+
      '; weights '+fGB(ws[0]+ws[1])+' at this precision; KV cache '+sig(Q.kvPerToken(m,o.kvb)/1024,3)+' KiB per token'+(m.mla?' (MLA latent, the same on every TP rank)':m.kv_slide?' (half the layers keep only a '+m.window+'-token window)':'')+
      '. <a href="'+esc(m.src)+'" target="_blank" rel="noopener noreferrer">config.json</a>. As released: '+esc(m.fmt_note)+'.';
    const pk=ch.peak;
    $('pln-chipnote').innerHTML=esc(ch.name)+': '+sig(ch.mem,3)+' GB at '+fInt(ch.bw)+' GB/s'+(o.chip==='m1pro'?' measured (unified memory; Metal lets the GPU use '+sig(ch.mem*ch.util,3)+' GB)':'')+', dense peak '+fInt(pk.bf16)+' TFLOP/s BF16'+(pk.fp8?', '+fInt(pk.fp8)+' FP8':'')+
      (ch.up?'; links '+sig(ch.up,3)+' GB/s per direction'+(ch.pcie?' (PCIe)':''):'')+'. Price: '+(ch.price!=null?'$'+ch.price+' per GPU-hour, '+esc(ch.price_src)+' (<a href="'+esc(ch.price_url)+'" target="_blank" rel="noopener noreferrer">list</a>, 2026-10-08)'+(ch.price_also?'; also '+esc(ch.price_also):''):'none: a machine you own');
  }
  // ---- outputs ----
  const SEG=[['w','weights','var(--c1)'],['a','activations','var(--c4)'],['o','other','var(--c5)'],['k','KV cache pool','var(--c3)'],['r','left to the system','var(--dim)']];
  function memBar(el,o,s,W,y0,h,scale){
    const ch=C[o.chip],tot=ch.mem*1e9;
    const parts={w:s.w_gpu,a:s.act,o:s.ovh,k:Math.max(0,s.pool),r:tot-s.usable};
    let x=0,b='';const sc=scale||(W/tot);
    SEG.forEach(([k,n,c])=>{const v=Math.max(0,parts[k]),w=v*sc;if(w>0.5)b+='<rect x="'+x+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="'+c+'" opacity="'+(k==='r'?0.6:0.85)+'"/>';
      if(w>46)b+=tx(x+w/2,y0+h/2+4,fGB(v),{a:'middle',fs:10.5,fill:'var(--bg)',w:600});x+=w});
    const over=s.w_gpu+s.act+s.ovh-s.usable;
    if(over>0){const w=Math.min(W*0.25,over*sc);b+='<rect x="'+(W-w)+'" y="'+(y0-3)+'" width="'+w+'" height="'+(h+6)+'" fill="none" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 3"/>'}
    return b;
  }
  function drawMem(o,r){
    const el=$('pln-mem'),W=width(el),s=r.setup,ch=C[o.chip];
    let b=memBar(el,o,s,W,4,30);
    b+=tx(0,52,'0',{fs:10,fill:'var(--mute)'})+tx(W,52,sig(ch.mem,3)+' GB',{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=svg(W,58,b,'Memory on one GPU');
    $('pln-memleg').innerHTML=SEG.map(([k,n,c])=>'<span><i style="--sw:'+c+'"></i>'+n+'</span>').join('');
    const fits=r.fits;
    const capBy=s.bmax<s.seqs_kv?'capped by max sequences':'limited by the cache';
    $('pln-memout').innerHTML=stat('Weights per GPU',fGB(s.w_gpu),s.ep?'non-expert weights whole, experts / '+s.G:'model / '+s.G+' GPU'+(s.G>1?'s':''))+
      stat('KV cache pool per GPU',s.pool>0?fGB(s.pool):'<span class="pln-bad">none</span>',fGB(s.kv_tok_gpu)+' per token on this GPU')+
      stat('Sequences at once, per copy',fits?fInt(s.bmax):'<span class="pln-bad">does not fit</span>',fits?capBy+'; each holds '+fInt(s.held)+' tokens on average ('+fGB(s.per_seq)+')':'weights, activations and other memory exceed '+fGB(s.usable));
    $('pln-memnote').innerHTML=fits?'Shared prefix: '+(o.share>0?fInt(o.P-s.Pu)+' tokens stored once ('+fGB(s.fixed)+'), not once per sequence: prefix caching saves memory and prefill compute; each sequence still reads those blocks when it decodes.':'no shared prefix.')+
      ' Activations are an estimate of vLLM\'s profiling peak at '+fInt(o.tb)+' tokens per step.':'Try FP8 or INT4 weights, more GPUs per copy (TP or PP), a GPU with more memory, or a smaller token budget.';
  }
  function drawStep(o,r){
    const el=$('pln-step');
    if(!r.fits){$('pln-stepout').innerHTML='';el.innerHTML='';$('pln-stepnote').textContent='';return}
    const s=r.setup,op=r.op,one=r.single;
    const B=op?op.B:1,d=Q.step(o,s,B,0),k=Math.max(1,Math.min(s.Pu,o.tb-B)),p=Q.step(o,s,B,k);
    $('pln-stepout').innerHTML=stat('One user alone',sig(one.tps,3)+' <small>tokens/s</small>',fT(one.t)+' per token, '+one.bound+'-bound')+
      stat('Decode step at your traffic',fT(d.t),op?'with '+sig(B,3)+' sequences (simulated mean), '+d.bound+'-bound':'no operating point')+
      stat('Step with a prefill chunk',fT(p.t),fInt(k)+' prompt tokens added');
    const W=width(el),rows=[['decode step',d],['with prefill chunk',p]],lw=Math.min(130,W*0.32),max=Math.max(d.t,p.t)*1.05,sc=(W-lw-8)/max;
    let b='';rows.forEach(([n,x],i)=>{const y=6+i*30;b+=tx(0,y+15,n,{fs:11});let xx=lw;
      const work=Math.max(x.t_mem,x.t_cmp),bits=[['var(--c1)',x.t_mem>=x.t_cmp?work:0],['var(--c2)',x.t_cmp>x.t_mem?work:0],['var(--c4)',o.overlap?Math.max(0,x.t_comm-work):x.t_comm],['var(--c5)',o.tovh*1e-3]];
      bits.forEach(([c,v])=>{const w=v*sc;if(w>0.3){b+='<rect x="'+xx+'" y="'+y+'" width="'+w+'" height="20" fill="'+c+'" opacity="0.85"/>';xx+=w}});
      if(x.t_mem<x.t_cmp)b+='<rect x="'+lw+'" y="'+(y+21)+'" width="'+(x.t_mem*sc)+'" height="3" fill="var(--c1)"/>';else b+='<rect x="'+lw+'" y="'+(y+21)+'" width="'+(x.t_cmp*sc)+'" height="3" fill="var(--c2)"/>';});
    el.innerHTML=svg(W,66,b,'Step time breakdown')+'<div class="pln-leg"><span><i style="--sw:var(--c1)"></i>reading bytes (memory-bound)</span><span><i style="--sw:var(--c2)"></i>FLOPs (compute-bound)</span><span><i style="--sw:var(--c4)"></i>communication</span><span><i style="--sw:var(--c5)"></i>fixed overhead</span><span>thin line: the other limit, hidden under the larger one</span></div>';
    $('pln-stepnote').innerHTML='A step lasts as long as the slower of reading its bytes and doing its FLOPs, plus communication and a fixed cost. Alone, a user is limited by reading '+fGB(Q.step(o,s,1,0).wr)+' of weights per token; batching shares that read across every sequence in the step, which is why throughput rises almost for free until compute or the cache runs out. A step that also carries a prompt chunk is slower, and every user decoding in that step waits for it: the decode stall that a smaller token budget trades against more steps per prompt. The arithmetic per phase is on <a href="https://app.notion.com/p/3c65c17b0d0d81faad1ef390b0e54d08" target="_blank" rel="noopener noreferrer">Performance math</a>.';
  }
  function curve(o,r){
    const s=r.setup,pts=[],lmax=r.lam_off;
    if(!lmax)return pts;
    for(let i=1;i<=24;i++){const lam=lmax*0.999*i/24,a=Q.atRate(o,s,lam);if(a)pts.push({lam:lam,x:lam*o.O,tpot:a.tpot,ttft:a.ttft.p99})}
    return pts;
  }
  function drawCurve(o,r){
    const el=$('pln-curve');
    if(!r.fits||!r.lam_off){el.innerHTML='<p class="pln-note">Nothing to draw: the deployment does not fit or cannot keep up with any traffic.</p>';$('pln-rateout').innerHTML='';return}
    const pts=curve(o,r),W=width(el),H=230,pl=46,pr=56,pt=12,pb=34;
    if(!pts.length){el.innerHTML='<p class="pln-note">The simulation finds no stable rate to draw.</p>';return}
    const xmax=Math.max(...pts.map(p=>p.x))*1.04,y1max=Math.max(o.slo_tpot*1.3,Math.min(Math.max(...pts.map(p=>p.tpot)),o.slo_tpot*4))*1.05,y2max=Math.max(o.slo_ttft*1.3,Math.min(Math.max(...pts.map(p=>p.ttft)),o.slo_ttft*4))*1.05;
    const X=v=>pl+(W-pl-pr)*v/xmax,Y1=v=>pt+(H-pt-pb)*(1-Math.min(v,y1max)/y1max),Y2=v=>pt+(H-pt-pb)*(1-Math.min(v,y2max)/y2max);
    let b='';
    for(let i=0;i<=4;i++){const v=xmax*i/4,y=pt+(H-pt-pb)*i/4;b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/>'+tx(X(v),H-pb+13,sig(v,2),{a:'middle',fs:10,fill:'var(--mute)'});
      b+=tx(pl-4,y+4,sig(y1max*(1-i/4)*1e3,2),{a:'end',fs:10,fill:'var(--c1)'})+tx(W-pr+4,y+4,sig(y2max*(1-i/4),2),{fs:10,fill:'var(--c2)'})}
    b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y1(o.slo_tpot)+'" y2="'+Y1(o.slo_tpot)+'" stroke="var(--c1)" stroke-dasharray="5 4"/>';
    b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y2(o.slo_ttft)+'" y2="'+Y2(o.slo_ttft)+'" stroke="var(--c2)" stroke-dasharray="5 4"/>';
    b+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+pts.map(p=>X(p.x)+','+Y1(p.tpot)).join(' ')+'"/>';
    b+='<polyline fill="none" stroke="var(--c2)" stroke-width="2" points="'+pts.map(p=>X(p.x)+','+Y2(p.ttft)).join(' ')+'"/>';
    if(r.lam_slo>0)b+='<line x1="'+X(r.lam_slo*o.O)+'" x2="'+X(r.lam_slo*o.O)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-width="1"/>'+tx(Math.min(X(r.lam_slo*o.O)+4,W-pr-70),pt+10,'max inside targets',{fs:10});
    if(r.op){const xo=r.op.out_tps;b+='<circle cx="'+X(xo)+'" cy="'+Y1(r.op.tpot)+'" r="4.5" fill="var(--c3)"/><circle cx="'+X(xo)+'" cy="'+Y2(r.op.ttft.p99)+'" r="4.5" fill="var(--c3)"/>'}
    b+=tx((pl+W-pr)/2,H-4,'output tokens per second, one copy',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+='<text transform="translate(11,'+((pt+H-pb)/2)+') rotate(-90)" text-anchor="middle" font-size="10.5" fill="var(--c1)">TPOT (ms)</text>';
    b+='<text transform="translate('+(W-13)+','+((pt+H-pb)/2)+') rotate(90)" text-anchor="middle" font-size="10.5" fill="var(--c2)">TTFT p99 (s)</text>';
    el.innerHTML=svg(W,H,b,'Throughput against latency');
    const s=r.setup,off=r.off;
    $('pln-rateout').innerHTML=stat('Most traffic per copy, no targets',sig(r.lam_off,3)+' <small>req/s</small>',fInt(r.lam_off*o.O)+' output tokens/s'+(off?'; '+sig(off.B,3)+' sequences, '+fT(off.t)+' per step (fluid limit)':''))+
      stat('Most traffic per copy, inside targets',r.lam_slo>0?sig(r.lam_slo,3)+' <small>req/s</small>':'<span class="pln-bad">none</span>',r.lam_slo>0?fInt(r.lam_slo*o.O)+' output tokens/s, '+sig(r.lam_slo*o.O/s.G,3)+' per GPU':'even one request misses a target: TPOT alone is '+fT(r.single.t))+
      stat('Your peak per copy',r.op?sig(o.lam/r.reps,3)+' <small>req/s</small>':'n/a',r.op?'TTFT p50 '+fT(r.op.ttft.p50)+', p99 '+fT(r.op.ttft.p99)+'; TPOT '+fT(r.op.tpot):'');
  }
  function drawCost(o,r){
    const s=r.setup;
    if(!r.fits||!(r.lam_slo>0)){$('pln-costout').innerHTML=stat('GPUs needed','<span class="pln-bad">n/a</span>',r.fits?'no traffic level meets both targets on this deployment':'the model does not fit');$('pln-costnote').textContent='';return}
    const c=r.cost;
    $('pln-costout').innerHTML=stat('Copies of the model',fInt(r.reps),fInt(s.G)+' GPU'+(s.G>1?'s':'')+' each')+stat('GPUs',fInt(r.gpus),c?fUSD(c.cost_h)+' per hour, '+fUSD(c.cost_h*730)+' per month':'no price set')+
      (c?stat('$ per million output tokens',fUSD(c.usd_out),'input: '+fUSD(c.usd_in)+' per million')+stat('$ per million tokens, blended',fUSD(c.usd_blend),'input and output together at '+Math.round(o.avg*100)+'% average load'):'');
    $('pln-costnote').innerHTML=c?'The fleet is sized for the peak ('+sig(o.lam,3)+' req/s) and paid for around the clock; tokens are counted at the average traffic. The split between input and output follows the share of step time each phase takes at the operating point ('+Math.round(c.share_pre*100)+'% prefill): a convention, since the GPUs serve both at once. Halving the average load doubles every per-token price.':'Set a price per GPU-hour to see costs.';
  }
  function drawApi(o,r){
    const el=$('pln-api-chart'),m=M[o.model],api=D.api[m.api];
    if(!r.cost||!r.api){el.innerHTML='';$('pln-verdict').innerHTML=!api||!api.min?'No API to compare: '+esc(api&&api.note?api.note:'no listing')+'.':'Needs a deployment that meets the targets and a GPU price.';$('pln-apinote').textContent='';return}
    const c=r.cost,a=r.api,W=width(el),H=200,pl=58,pr=12,pt=10,pb=34,xmax=o.lam,perReq=(o.P*a.pin+o.O*a.pout)/1e6;
    const ymax=Math.max(c.cost_h,xmax*3600*perReq)*1.1,X=v=>pl+(W-pl-pr)*v/xmax,Y=v=>pt+(H-pt-pb)*(1-v/ymax);
    let b='';for(let i=0;i<=4;i++){const v=xmax*i/4,u=ymax*i/4;b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/>'+tx(X(v),H-pb+13,sig(v,2),{a:'middle',fs:10,fill:'var(--mute)'})+tx(pl-4,Y(u)+4,'$'+sig(u,2),{a:'end',fs:10,fill:'var(--mute)'})}
    b+='<line x1="'+X(0)+'" x2="'+X(xmax)+'" y1="'+Y(c.cost_h)+'" y2="'+Y(c.cost_h)+'" stroke="var(--c1)" stroke-width="2"/>';
    b+='<line x1="'+X(0)+'" x2="'+X(xmax)+'" y1="'+Y(0)+'" y2="'+Y(xmax*3600*perReq)+'" stroke="var(--c2)" stroke-width="2"/>';
    const xa=o.lam*o.avg;b+='<line x1="'+X(xa)+'" x2="'+X(xa)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--c3)" stroke-width="2" stroke-dasharray="4 3"/>';
    if(a.breakeven<xmax)b+='<circle cx="'+X(a.breakeven)+'" cy="'+Y(c.cost_h)+'" r="4" fill="var(--ink)"/>';
    b+=tx((pl+W-pr)/2,H-4,'average traffic (requests per second)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+='<text transform="translate(11,'+((pt+H-pb)/2)+') rotate(-90)" text-anchor="middle" font-size="10.5" fill="var(--mute)">$ per hour</text>';
    el.innerHTML=svg(W,H,b,'Self-host against API cost per hour');
    const cheaper=c.cost_h<a.api_h;
    $('pln-verdict').innerHTML=(cheaper?'<span class="pln-good">Self-hosting is cheaper</span> at your average traffic: ':'<span class="pln-bad">The API is cheaper</span> at your average traffic: ')+fUSD(c.cost_h)+' against '+fUSD(a.api_h)+' per hour. Break-even at '+sig(a.breakeven,3)+' requests per second on average'+(a.breakeven>o.lam?', above your peak: this fleet never pays for itself at these prices.':'.');
    const ap=api;$('pln-apinote').innerHTML='API: $'+sig(a.pin,3)+' input and $'+sig(a.pout,3)+' output per million tokens ('+(o.api==='min'?'lowest of '+ap.n+' providers, '+esc(ap.min[2]):'median of '+ap.n+' providers')+', OpenRouter, 2026-10-08, model id '+esc(ap.id)+'). Providers serve different precisions and may batch more aggressively than your targets allow; cached-input discounts are not applied. Self-hosting also buys control of data, versions and latency, and costs engineering time this does not count.';
  }
  function exNote(){
    const p=PRESETS.find(x=>x.id===cur),el=$('pln-exnote');
    if(!p){el.innerHTML='<h4>Your own deployment</h4>Controls changed from a worked example.';return}
    let h='<h4>'+esc(p.name)+'</h4>'+p.note;
    if(p.check&&state){h+=' '+checkLine(p.check,state.o,state.r)}
    el.innerHTML=h;
  }
  function checkLine(k,o,r){
    const cal=D.calib,pub=cal.pub,s=r.setup;
    if(k==='h100'||k==='l40s'||k==='h200'){
      const srv=r.lam_slo*o.O,per=k==='h200'?'per GPU ':'';
      const lam=pub[k+'_srv_qps'];
      const a=Q.atRate(o,s,lam);
      let h='<br><b>Check:</b> highest rate inside 2 s / 100 ms: planner '+fInt(srv)+' output tokens/s per copy against '+fInt(pub[k+'_srv'])+' published '+per+'<span class="pln-tag pln-ven">vendor</span> (not fitted). The Offline run used its own settings'+(k==='h100'?' (a 4,096-token budget)':'')+'; with them the planner\'s ceiling is '+fInt(cal.fits[k].off)+' against '+fInt(pub[k+'_off'])+' (fitted)';
      if(a)h+='. At the published '+sig(lam,4)+' req/s per copy: TPOT '+fT(a.tpot)+' against '+sig(pub[k+'_tpot_mean'],3)+' ms measured (fitted on longer runs), TTFT p50 '+fT(a.ttft.p50)+' against '+sig(pub[k+'_ttft_p50'],3)+' ms and p99 '+fT(a.ttft.p99)+' against '+sig(pub[k+'_ttft_p99'],4)+' ms (not fitted; here every prompt has the same length).';
      if(k==='h200')h+=' The planner sizes '+fInt(r.gpus)+' GPUs for 503 req/s; HPE ran 8.';
      return h;
    }
    if(k==='sglang'){const B=256*s.G,d=Q.step(o,s,B,0);return '<br><b>Check:</b> one decode step with 256 sequences on each of the 72 GPUs takes '+fT(d.t)+' here, so '+fInt(256/d.t)+' output tokens/s per GPU, against 22,282 per 8-GPU node published, 2,785 per GPU <span class="pln-tag pln-ven">vendor</span> (not fitted; the constants are the H100 vLLM ones, and SGLang\'s DeepEP kernels are not vLLM\'s).'}
    if(k==='m1'&&D.m1&&D.m1.check)return '<br><b>Check:</b> '+D.m1.check;
    return '';
  }
  function render(){
    const o=read();labels(o);
    const r=Q.plan(o);state={o:o,r:r};
    drawMem(o,r);drawStep(o,r);drawCurve(o,r);drawCost(o,r);drawApi(o,r);exNote();
    if(window.PLNA)window.PLNA.update(o);
  }
  let pend=0;const later=()=>{clearTimeout(pend);pend=setTimeout(render,60)};
  function wire(){
    fillSelects();
    $('pln-presets').addEventListener('click',e=>{const bt=e.target.closest('button');if(!bt)return;const p=PRESETS.find(x=>x.id===bt.dataset.p);cur=p.id;
      [...$('pln-presets').querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===bt));apply(Object.assign({},p.o));render()});
    const user=()=>{cur=null;[...$('pln-presets').querySelectorAll('button')].forEach(x=>x.classList.remove('on'));later()};
    $('pln-chip').addEventListener('change',()=>{const ch=$('pln-chip').value,bd=batchDefaults(ch);$('pln-price').value=C[ch].price!=null?C[ch].price:'';setSel('pln-tb',bd.tb);setSel('pln-seqs',bd.seqs);
      $('pln-util').value=C[ch].util;const e=ENG_DEF[ch]||'vllm';$('pln-eng').value=e;const E=D.engines[e];$('pln-effc').value=E.eff_c;$('pln-tovh').value=E.tovh;$('pln-effm').value=E.eff_m;$('pln-tseq').value=E.tseq||0;
      tpOptions($('pln-ep').checked,ch);user()});
    $('pln-ep').addEventListener('change',()=>{tpOptions($('pln-ep').checked,$('pln-chip').value);setSel('pln-tp',$('pln-ep').checked?8:1);user()});
    $('pln-eng').addEventListener('change',()=>{const E=D.engines[$('pln-eng').value];if(E){$('pln-effc').value=E.eff_c;$('pln-tovh').value=E.tovh;$('pln-effm').value=E.eff_m;$('pln-tseq').value=E.tseq||0}user()});
    ['pln-effc','pln-effm','pln-tovh','pln-tseq'].forEach(id=>$(id).addEventListener('input',()=>{$('pln-eng').value='custom';user()}));
    ['pln-model','pln-fmt','pln-kvb','pln-tp','pln-pp','pln-price','pln-tb','pln-seqs','pln-util','pln-ovh','pln-latx','pln-overlap','pln-lam','pln-P','pln-O','pln-share','pln-avg','pln-sttft','pln-stpot','pln-api']
      .forEach(id=>$(id).addEventListener('input',user));
    cur='chat';apply(Object.assign({},PRESETS[0].o));
    $('pln-presets').querySelector('button').classList.add('on');
  }
  wire();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-plan']=window.TAB_RENDER['t-plan']||[]).push(render);
  addEventListener('resize',()=>{const t=$('t-plan');if(t&&!t.hidden)later()});
  return {render,read,apply,PRESETS,sig,fGB,fT,fUSD,fInt,esc,svg,tx,width,stat,memBar,SEG,get state(){return state}};
})();
