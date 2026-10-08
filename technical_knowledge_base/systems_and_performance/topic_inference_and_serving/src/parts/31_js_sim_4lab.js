// ---- Serving simulator (t-sim): section 2, the lab (controls, one run, a one-switch comparison, timeline and scatter) ----
window.SIMLAB=(function(){
  const S=window.ISIM,U=window.SIMU,D=window.SIMD,$=U.$;
  if(!$('sim-labbox'))return null;
  const HWP={
    h100_bf16:{label:'H100 SXM 80 GB, Llama 3.1 8B in BF16',hw:'h100_bf16',m:'l8_bf16',api:0,
      note:'Peak 989.5 TFLOP/s BF16 dense and 3.35 TB/s (NVIDIA). Efficiencies fitted on the FP8 NIM table and assumed to hold at BF16. KV cache default: 0.9 of 80 GB, minus 16.1 GB of weights, minus an assumed 2 GB for activations.'},
    h100_fp8:{label:'H100 SXM 80 GB, Llama 3.1 8B in FP8 (as calibrated)',hw:'h100_fp8',m:'l8_fp8',api:0,
      note:'Peak 1,979 TFLOP/s FP8 dense and 3.35 TB/s (NVIDIA); weights and KV in FP8. Efficiencies and KV size as fitted on NVIDIA\'s NIM measurements (section 4).'},
    m1:{label:'Apple M1 Pro, Qwen3-0.6B Q4_K_M (llama.cpp, measured here)',hw:'m1',m:'q06_q4',api:0,
      note:'Measured on Apple M1 Pro: efficiencies fitted on llama.cpp (Metal) runs on this machine. KV default 3.76 GB, the 32,768-token context llama-server was given. The two-GPU deployments here mean a hypothetical second laptop.'}};
  const kvDefault=k=>{const p=HWP[k],m=D.models[p.m];
    if(k==='h100_fp8')return Math.round(D.h100.kv_tokens_fit*m.kvtok/1e8)/10;
    if(k==='m1')return Math.round(32768*m.kvtok/1e7)/100;
    return Math.round((0.9*80e9-m.wbytes-2e9)/1e8)/10};
  // traffic scenarios; each names the comparison it is built to show
  const SCN={
    chat:{label:'Chat traffic (Poisson arrivals)',w:{n:300,rate:12,plo:200,phi:2000,olo:50,ohi:500,maxtok:1024,sys:0,share:0,groups:1,turns:1,gap:0,seed:11},slo:[500,50],
      m1:{n:60,rate:1,plo:100,phi:600,olo:20,ohi:200,maxtok:256}},
    sys:{label:'One long system prompt shared by most chats (try prefix caching)',w:{n:300,rate:30,plo:50,phi:400,olo:50,ohi:300,maxtok:512,sys:3000,share:0.9,groups:3,turns:1,gap:0,seed:12},slo:[300,50],
      m1:{n:60,rate:1.5,plo:30,phi:150,olo:20,ohi:120,maxtok:256,sys:1000}},
    turns:{label:'Multi-turn chats (each turn resends the history)',w:{n:300,rate:8,plo:100,phi:600,olo:50,ohi:400,maxtok:512,sys:500,share:1,groups:1,turns:5,gap:4,seed:13},slo:[400,50],
      m1:{n:60,rate:0.4,plo:50,phi:200,olo:20,ohi:120,maxtok:256,sys:200,gap:8}},
    long:{label:'Long documents in, short answers out (try chunked prefill)',w:{n:200,rate:2.5,plo:4000,phi:16000,olo:50,ohi:300,maxtok:512,sys:0,share:0,groups:1,turns:1,gap:0,seed:14},slo:[2000,40],
      m1:{n:30,rate:0.1,plo:1500,phi:4000,olo:20,ohi:120,maxtok:256}},
    burst:{label:'A burst bigger than the cache (preemption)',w:{n:400,rate:0,plo:300,phi:3000,olo:100,ohi:1500,maxtok:2048,sys:0,share:0,groups:1,turns:1,gap:0,seed:15},slo:[60000,60],kvgb:6,
      m1:{n:40,plo:100,phi:800,olo:50,ohi:500,maxtok:1024},m1kvgb:0.5}};
  const ids=['n','rate','plo','phi','olo','ohi','maxtok','sys','share','groups','turns','gap','seed'];
  const sel=$('sim-hw');sel.innerHTML=Object.keys(HWP).map(k=>'<option value="'+k+'">'+HWP[k].label+'</option>').join('');
  $('sim-scn').innerHTML=Object.keys(SCN).map(k=>'<option value="'+k+'">'+SCN[k].label+'</option>').join('');
  function engDefaults(k){const m1=k==='m1';
    $('sim-mode').value='cont';$('sim-kv').value=m1?'contig':'paged';$('sim-bs').value='16';$('sim-maxseq').value=m1?16:1024;$('sim-budget').value=m1?2048:8192;
    $('sim-chunk').checked=true;$('sim-pc').checked=!m1;$('sim-pre').value='recompute';$('sim-admit').value='optimistic';$('sim-dep').value='1';
    $('sim-xbw').value=50;$('sim-swbw').value=m1?50:25}
  function loadScn(){const k=sel.value,s=SCN[$('sim-scn').value],w=Object.assign({},s.w,k==='m1'?(s.m1||{}):{});
    for(const id of ids)$('sim-'+id).value=w[id];
    $('sim-slo1').value=k==='m1'?Math.max(s.slo[0],2000):s.slo[0];$('sim-slo2').value=k==='m1'?Math.max(s.slo[1],100):s.slo[1];
    $('sim-kvgb').value=k==='m1'?(s.m1kvgb||kvDefault(k)):(s.kvgb||kvDefault(k))}
  function cfgFrom(over){over=over||{};const k=sel.value,p=HWP[k],m=D.models[p.m],hw=D.hw[p.hw];
    const w={};for(const id of ids)w[id]=+$('sim-'+id).value;
    w.n=Math.max(1,Math.min(3000,Math.round(w.n)));w.plo=Math.max(1,Math.round(w.plo));w.phi=Math.max(w.plo,Math.round(w.phi));
    w.olo=Math.max(1,Math.round(w.olo));w.ohi=Math.max(w.olo,Math.round(w.ohi));w.maxtok=Math.max(1,Math.round(w.maxtok));w.groups=Math.max(1,Math.round(w.groups));w.turns=Math.max(1,Math.round(w.turns));
    w.share=Math.max(0,Math.min(1,w.share));w.seed=Math.max(1,Math.round(w.seed))|0;w.rate=Math.max(0,w.rate);w.gap=Math.max(0,w.gap);w.sys=Math.max(0,Math.round(w.sys));
    const bs=+$('sim-bs').value,kvgb=Math.max(0.001,+$('sim-kvgb').value);
    const c={mode:$('sim-mode').value,kv:$('sim-kv').value,bs:bs,nblocks:Math.max(4,Math.floor(kvgb*1e9/(m.kvtok*bs))),pc:$('sim-pc').checked,chunk:$('sim-chunk').checked,
      budget:Math.max(16,Math.round(+$('sim-budget').value)),maxseq:Math.max(1,Math.round(+$('sim-maxseq').value)),preempt:$('sim-pre').value,swapbw:Math.max(1,+$('sim-swbw').value)*1e9,admit:$('sim-admit').value,lv:1};
    if(c.kv==='contig')c.pc=false;
    const dep=$('sim-dep').value;
    const cfg={w:w,hw:hw,m:m,c:c,api:p.api,slo:[+$('sim-slo1').value/1e3,+$('sim-slo2').value/1e3],xbw:Math.max(1,+$('sim-xbw').value)*1e9};
    if(dep==='2')cfg.reps=2;if(dep==='pd'){cfg.disagg=true;cfg.np=1;cfg.nd=1}
    if(over.c)Object.assign(c,over.c);if(over.dep){delete cfg.reps;delete cfg.disagg;if(over.dep==='2')cfg.reps=2;if(over.dep==='pd'){cfg.disagg=true;cfg.np=1;cfg.nd=1}}
    if(c.kv==='contig')c.pc=false;
    // without chunking a prompt must fit in one step: raise the budget to the longest prompt, as vLLM requires
    if(!c.chunk){let mx=0;for(const q of S.makeWorkload(w))if(q.P>mx)mx=q.P;if(mx>c.budget){c.budget=mx;cfg.raised=mx}}
    return cfg}
  function runCfg(cfg){const t0=performance.now();const r=S.run(cfg,true);r.m=S.metrics(r.reqs,r.engs,cfg.slo);r.cfg=cfg;r.ms=performance.now()-t0;return r}
  function depName(cfg){return cfg.disagg?'1 prefill + 1 decode GPU':(cfg.reps===2?'2 replicas':'1 GPU')}
  function describe(cfg){const c=cfg.c;return (c.mode==='static'?'static':'continuous')+', '+(c.kv==='paged'?'paged':'contiguous')+(c.pc?', prefix cache':'')+(c.chunk?', chunked':'')+(c.preempt==='swap'?', swap':'')+(c.admit==='reserve'?', reserve':'')+', '+depName(cfg)}
  let cur=null,cmp=null,cmpLabel='';
  const pctS=(m)=>m.n?Math.round(100*m.good/m.n)+'%':'0%';
  function stats(r){const m=r.m,cfg=r.cfg,ngpu=cfg.disagg?2:(cfg.reps||1);
    const hit=m.ptok?m.hit/m.ptok:0;let ns=0,st=0;for(const s of r.log){ns+=s.ns;st++}
    $('sim-stats').innerHTML=U.stat('Output tokens/s',U.n0(m.tps),U.n0(m.tps/ngpu)+' per GPU')+
      U.stat('Goodput',U.sig(m.goodput,3)+' req/s',pctS(m)+' of requests meet both targets')+
      U.stat('TTFT p50 / p99',U.ms(m.ttft[0])+' / '+U.ms(m.ttft[2]))+
      U.stat('TPOT p50 / p99',U.ms(m.tpot[0])+' / '+U.ms(m.tpot[2]),'worst gap '+U.ms(m.itl[4]))+
      U.stat('Mean batch',U.n1(st?ns/st:0)+' seqs',U.n0(m.steps)+' steps')+
      U.stat('Preemptions',U.n0(m.npre),m.rej?m.rej+' rejected (too big for the cache)':'')+
      U.stat('Prefix cache hits',Math.round(100*hit)+'%','of prompt tokens');
  }
  function row(nm,r,ref,cls){const m=r.m;
    const d=(a,b,lower)=>{if(!ref||!isFinite(a)||!isFinite(b)||b===0)return '';const x=(a-b)/b;if(Math.abs(x)<0.005)return ' <small>(same)</small>';
      const good=lower?x<0:x>0;return ' <small class="'+(good?'sim-better':'sim-worse')+'">'+(x>0?'+':'')+Math.round(100*x)+'%</small>'};
    const f=ref?ref.m:null;
    return '<tr'+(cls?' class="'+cls+'"':'')+'><td>'+nm+'<br><small class="mute">'+describe(r.cfg)+'</small></td><td class="num">'+U.n0(m.tps)+(f?d(m.tps,f.tps,false):'')+'</td><td class="num">'+U.sig(m.goodput,3)+(f?d(m.goodput,f.goodput,false):'')+'</td><td class="num">'+U.ms(m.ttft[0])+(f?d(m.ttft[0],f.ttft[0],true):'')+'</td><td class="num">'+U.ms(m.ttft[2])+(f?d(m.ttft[2],f.ttft[2],true):'')+'</td><td class="num">'+U.ms(m.tpot[0])+(f?d(m.tpot[0],f.tpot[0],true):'')+'</td><td class="num">'+U.ms(m.tpot[2])+(f?d(m.tpot[2],f.tpot[2],true):'')+'</td><td class="num">'+U.n0(m.npre)+'</td></tr>'}
  // what each switch needs before it changes anything (shown when a comparison comes out the same)
  const WHEN={mode:'',kv:'Contiguous reservation only hurts when the cache is the limit: shrink the KV cache size, or raise the rate, and it will.',
    pc:'Prefix caching needs repeated prefixes: a shared system prompt or multi-turn chats.',chunk:'Chunking only matters when a prompt is long compared with the per-step budget and other requests are decoding at the same time.',
    pre:'Swap and recompute only differ when requests are preempted, which needs a cache too small for the load (try the burst traffic).',
    admit:'Admission policy only matters when the cache fills (try the burst traffic).',dep:''};
  function table(){const head='<thead><tr><th>Run</th><th class="num">Tokens/s</th><th class="num">Goodput, req/s</th><th class="num">TTFT p50</th><th class="num">TTFT p99</th><th class="num">TPOT p50</th><th class="num">TPOT p99</th><th class="num">Preempted</th></tr></thead><tbody>';
    let note='';if(cmp){const a=cur.m,b=cmp.m,same=Math.abs(a.tps-b.tps)<0.005*a.tps&&Math.abs(a.ttft[2]-b.ttft[2])<0.005*a.ttft[2]&&Math.abs(a.tpot[0]-b.tpot[0])<0.005*a.tpot[0];
      if(same&&WHEN[cmpKey])note='<tr><td colspan="8" class="small mute">No difference on this traffic. '+WHEN[cmpKey]+'</td></tr>'}
    const raised=[cur,cmp].filter(r=>r&&r.cfg.raised).map(r=>r.cfg.raised);
    if(raised.length)note+='<tr><td colspan="8" class="small mute">Without chunked prefill a whole prompt must fit in one step, so the per-step token budget was raised to '+U.n0(Math.max(...raised))+' (the longest prompt), as vLLM requires.</td></tr>';
    $('sim-cmp').innerHTML=head+row('Current',cur,null,cmp?'sim-base':'')+(cmp?row(cmpLabel,cmp,cur):'')+note+'</tbody>'}
  // the engine over time: bins of steps (engine 0, or the decode engine when disaggregated)
  function timeline(){const el=$('sim-tl'),w=U.width(el),h=w<480?150:180,pl=40,pr=34,pt=8,pb=20;
    const runs=[cur].concat(cmp?[cmp]:[]);let T=0;for(const r of runs){for(const s of r.log)if(s.t+s.dt>T)T=s.t+s.dt}
    const nb=Math.max(20,Math.floor((w-pl-pr)/4));let body='';const lane=(h-pt-pb)/runs.length;
    runs.forEach((r,ri)=>{const cfg=r.cfg,eng=cfg.disagg?null:0;
      const bp=new Array(nb).fill(0),bd=new Array(nb).fill(0),bt=new Array(nb).fill(0),kv=new Array(nb).fill(-1),pre=new Array(nb).fill(0);
      const cap=r.engs.map(e=>e.paged?e.pool.n:e.ctg.cap);
      for(const s of r.log){if(eng!==null&&s.e!==eng)continue;const b=Math.min(nb-1,Math.floor(s.t/T*nb));bp[b]+=s.np;bd[b]+=s.nd;bt[b]+=1;
        const u=s.kvu/cap[s.e];if(u>kv[b])kv[b]=u;pre[b]+=s.pre.length}
      let mx=1,md=1;for(let i=0;i<nb;i++){if(bt[i]){if(bp[i]/bt[i]>mx)mx=bp[i]/bt[i];if(bd[i]/bt[i]>md)md=bd[i]/bt[i]}}
      const y0=pt+lane*(ri+1)-4,hh=lane-14,bw=(w-pl-pr)/nb;
      for(let i=0;i<nb;i++){if(!bt[i])continue;const x=pl+i*bw,hp=hh*bp[i]/bt[i]/mx;
        if(hp>0)body+='<rect x="'+x.toFixed(1)+'" y="'+(y0-hp).toFixed(1)+'" width="'+Math.max(0.8,bw-0.4).toFixed(1)+'" height="'+hp.toFixed(1)+'" fill="var(--c2)" opacity="0.85"/>';
        if(pre[i])body+='<rect x="'+x.toFixed(1)+'" y="'+(y0+1)+'" width="'+Math.max(1.5,bw-0.4).toFixed(1)+'" height="3" fill="var(--c4)"/>'}
      let pd='',pth='';for(let i=0;i<nb;i++){if(!bt[i])continue;const x=pl+(i+0.5)*bw;pd+=(pd?'L':'M')+x.toFixed(1)+' '+(y0-hh*bd[i]/bt[i]/md).toFixed(1);if(kv[i]>=0)pth+=(pth?'L':'M')+x.toFixed(1)+' '+(y0-hh*kv[i]).toFixed(1)}
      body+='<path d="'+pd+'" fill="none" stroke="var(--c1)" stroke-width="1.5"/><path d="'+pth+'" fill="none" stroke="var(--c3)" stroke-width="1.5"/>';
      body+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y0+'" y2="'+y0+'" class="sim-ax"/>';
      body+=U.t(pl-4,y0-hh+8,U.n0(mx),{a:'end',fill:'var(--c2)'})+U.t(pl-4,y0-hh+20,U.n0(md),{a:'end',fill:'var(--c1)'})+U.t(pl-4,y0,'0',{a:'end'})+U.t(w-pr+4,y0-hh+8,'100%')+U.t(w-pr+4,y0,'0%');
      body+=U.t(pl+4,y0-hh+9,ri?'Comparison: '+cmpLabel:'Current'+(cfg.disagg?' (decode GPU shown)':(cfg.reps===2?' (GPU 1 of 2 shown)':'')),{fill:'var(--ink)',fs:11})});
    for(const tv of U.ticks(0,T,w<480?4:7))body+=U.t(pl+(w-pl-pr)*tv/T,h-5,U.sig(tv,3)+(tv===0?' s':''),{a:U.anc(pl+(w-pl-pr)*tv/T,w)});
    el.innerHTML=U.svg(w,h,body,'Tokens per step and KV cache use over time')}
  function scatter(){const el=$('sim-sc'),w=U.width(el),h=w<480?220:260,pl=46,pr=10,pt=8,pb=30;
    const runs=[cur].concat(cmp?[cmp]:[]);const slo=cur.cfg.slo;
    let x0=Infinity,x1=0,y1=0;for(const r of runs)for(const q of r.reqs){if(q.done<0)continue;const a=q.first-q.arr,tp=q.O>1?(q.times[q.times.length-1]-q.first)/(q.O-1):0;if(a<x0)x0=a;if(a>x1)x1=a;if(tp>y1)y1=tp}
    x0=Math.max(1e-3,Math.min(x0,slo[0])*0.8);x1=Math.max(x1,slo[0])*1.25;y1=Math.max(y1,slo[1])*1.15;
    const X=v=>pl+(w-pl-pr)*(Math.log10(Math.max(v,x0))-Math.log10(x0))/(Math.log10(x1)-Math.log10(x0)),Y=v=>h-pb-(h-pt-pb)*v/y1;
    let b='<rect x="'+pl+'" y="'+Y(slo[1]).toFixed(1)+'" width="'+(X(slo[0])-pl).toFixed(1)+'" height="'+(h-pb-Y(slo[1])).toFixed(1)+'" fill="var(--open2)" opacity="0.6"/>';
    for(const tv of U.logTicks(x0,x1)){const x=X(tv);b+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+pt+'" y2="'+(h-pb)+'" class="sim-ax"/>'+U.t(x,h-pb+12,U.ms(tv),{a:U.anc(x,w)})}
    for(const tv of U.ticks(0,y1*1e3,4)){const y=Y(tv/1e3);b+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="sim-ax"/>'+U.t(pl-4,y+3,U.sig(tv,3),{a:'end'})}
    b+=U.t(pl+(w-pl-pr)/2,h-3,'time to first token (log scale)',{a:'middle'})+U.t(4,pt+8,'TPOT, ms',{});
    runs.forEach((r,ri)=>{for(const q of r.reqs){if(q.done<0)continue;const a=q.first-q.arr,tp=q.O>1?(q.times[q.times.length-1]-q.first)/(q.O-1):0;
      b+=ri?'<rect x="'+(X(a)-2).toFixed(1)+'" y="'+(Y(tp)-2).toFixed(1)+'" width="4" height="4" fill="none" stroke="var(--c4)" stroke-width="1"/>':'<circle cx="'+X(a).toFixed(1)+'" cy="'+Y(tp).toFixed(1)+'" r="2" fill="var(--c1)" opacity="0.7"/>'}});
    el.innerHTML=U.svg(w,h,b,'Per-request TTFT against TPOT');
    $('sim-sc-leg').innerHTML='<span><i style="background:var(--c1);border-radius:50%"></i>current ('+pctS(cur.m)+' inside the box)</span>'+(cmp?'<span><i style="border:1px solid var(--c4)"></i>'+U.esc(cmpLabel)+' ('+pctS(cmp.m)+')</span>':'')+'<span><i style="background:var(--open2)"></i>meets both targets</span>'}
  function render(){if(!cur)return;stats(cur);table();timeline();scatter();
    $('sim-run-note').textContent='Simulated '+U.n0(cur.m.n)+' requests in '+U.n0(cur.m.steps)+' engine steps ('+Math.round(cur.ms)+' ms in your browser). '+(cur.m.n<cur.cfg.w.n?(cur.cfg.w.n-cur.m.n)+' requests did not finish. ':'')}
  function run(){cur=runCfg(cfgFrom());if(cmpKey)cmp=runCfg(cmpCfg(cmpKey));render()}
  let cmpKey=null;
  function cmpCfg(k){const c=cfgFrom().c;
    if(k==='mode'){cmpLabel=c.mode==='static'?'Continuous batching':'Static batching';return cfgFrom({c:{mode:c.mode==='static'?'cont':'static'}})}
    if(k==='kv'){cmpLabel=c.kv==='paged'?'Contiguous memory':'Paged memory';return cfgFrom({c:{kv:c.kv==='paged'?'contig':'paged'}})}
    if(k==='pc'){cmpLabel=c.pc?'Prefix caching off':'Prefix caching on';return cfgFrom({c:{pc:!c.pc,kv:'paged'}})}
    if(k==='chunk'){cmpLabel=c.chunk?'Chunked prefill off':'Chunked prefill on';return cfgFrom({c:{chunk:!c.chunk}})}
    if(k==='pre'){cmpLabel=c.preempt==='swap'?'Recompute on preemption':'Swap on preemption';return cfgFrom({c:{preempt:c.preempt==='swap'?'recompute':'swap'}})}
    if(k==='admit'){cmpLabel=c.admit==='reserve'?'Optimistic admission':'Reserve admission';return cfgFrom({c:{admit:c.admit==='reserve'?'optimistic':'reserve'}})}
    if(k==='dep'){const d=$('sim-dep').value;cmpLabel=d==='pd'?'2 replicas':'1 prefill + 1 decode';return cfgFrom({dep:d==='pd'?'2':'pd'})}
    return null}
  document.querySelectorAll('#sim-labbox [data-cmp]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.cmp;
    if(k==='clear'){cmpKey=null;cmp=null;render();return}
    if(k==='dep'&&$('sim-dep').value==='1')$('sim-dep').value='2';
    cmpKey=k;run()}));
  function hwChange(){const k=sel.value;$('sim-hwnote').textContent=HWP[k].note;engDefaults(k);loadScn();cmpKey=null;cmp=null;run()}
  sel.addEventListener('change',hwChange);
  $('sim-scn').addEventListener('change',()=>{loadScn();run()});
  let tmr=0;document.querySelectorAll('#sim-labbox input,#sim-labbox select').forEach(el=>{if(el===sel||el.id==='sim-scn')return;
    el.addEventListener('change',()=>{clearTimeout(tmr);tmr=setTimeout(run,60)})});
  let started=false;
  U.onRender(()=>{if(!started){started=true;$('sim-hwnote').textContent=HWP[sel.value].note;engDefaults(sel.value);loadScn();run()}else render()});
  U.onResize(()=>{if(cur){timeline();scatter()}});
  return {cfgFrom,runCfg,HWP,SCN,kvDefault,get cur(){return cur}};
})();
