// ---- Long-context calculator (t-arlong) ----
(function(){
  const A=ARL.A, L=A.lc, esc=ARL.esc, fi=ARL.fmtInt;
  const [a0,b0,c0]=L.coef, [d0,d1]=L.decode_coef;
  // prefill ms for n_new tokens on top of a prompt of n_ctx (this page's fitted model, Qwen3-1.7B)
  const pre=(nn,nc)=>a0+b0*nn+c0*nn*(nc-nn/2)/1000;
  const dec=(nout,nc)=>nout*(d0+d1*nc/1000);
  // 4B: scaled by measured ratios (RAG in production child): TTFT 23,612 / 9,338 ms at 7,611 tokens; decode 86 / 41 tokens/s
  const SC={'Qwen3-1.7B':[1,1],'Qwen3-4B':[23612/9338,86/41]};
  const PR={ // USD per million tokens, vendor list prices read 2026-10-14 (RAG in production child, src/inputs/prices.json)
    haiku55:{nm:'Claude Haiku 5.5 (prompts up to 100k)',in:.10,hit:.01,write:.125,out:.50,max:100000},
    sonnet55:{nm:'Claude Sonnet 5.5',in:2,hit:.10,write:2.5,out:10},
    gpt5mini:{nm:'OpenAI gpt-5-mini',in:.25,hit:.025,write:0,out:2},
    gpt5nano:{nm:'OpenAI gpt-5-nano',in:.05,hit:.005,write:0,out:.40}};
  const ps=document.getElementById('lc-price');ps.innerHTML=Object.keys(PR).map(k=>'<option value="'+k+'">'+PR[k].nm+'</option>').join('');
  const $=id=>document.getElementById(id);
  const v=()=>({N:Math.round(Math.pow(10,+$('lc-N').value)),k:+$('lc-k').value,c:+$('lc-c').value,q:+$('lc-q').value,a:+$('lc-a').value,D:Math.round(Math.pow(10,+$('lc-d').value)),p:PR[ps.value],m:$('lc-model').value});
  function calc(){const x=v(),s=SC[x.m],kv=L.cfg[x.m].kv_bytes_per_token_fp16,MAXC=L.cfg[x.m].max_position_embeddings;
    const rows=[];
    const mk=(nm,fresh,cached,ctx,newTok,writes)=>{const cost=(fresh*x.p.in+cached*x.p.hit+x.a*x.p.out)/1e6;const wcost=writes*x.N*(x.p.write||x.p.in)/1e6;
      const ttft=pre(newTok,ctx)*s[0]/1000,gen=dec(x.a,ctx)*s[1]/1000;
      rows.push({nm,tin:fresh+cached,cached,cost,day:cost*x.D+wcost,ttft,gen,kv:ctx*kv/2**30,ctx,over:ctx>MAXC,ext:ctx>L.max_ctx*1.05,pmax:x.p.max&&ctx>x.p.max})};
    mk('RAG, top '+x.k,x.q+x.k*x.c,0,x.q+x.k*x.c,x.q+x.k*x.c,0);
    mk('Long context, uncached',x.q+x.N,0,x.q+x.N,x.q+x.N,0);
    mk('Long context, corpus cached',x.q,x.N,x.q+x.N,x.q,Math.min(x.D,288));
    return {x,rows}}
  function table(){const {x,rows}=calc();
    ['N','k','c','q','a','d'].forEach(k=>{const el=$('lc-'+k+'v');if(el)el.textContent=fi(k==='N'?x.N:k==='d'?x.D:x[k])});
    const fl=r=>(r.over?' <span class="ill">beyond the '+fi(L.cfg[x.m].max_position_embeddings)+'-token window</span>':r.ext?' <span class="ill">extrapolated</span>':'');
    $('lc-tab').innerHTML='<thead><tr><th></th><th class="num">Input tokens</th><th class="num">$ per query</th><th class="num">$ per day</th><th class="num">Seconds to first token ('+x.m+')</th><th class="num">Generation s</th><th class="num">KV cache GiB</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+r.nm+'</td><td class="num">'+fi(r.tin)+(r.cached?' ('+fi(r.cached)+' cached)':'')+'</td><td class="num">'+(r.pmax?'n/a (over the preset\'s 100k)':'$'+r.cost.toPrecision(3))+'</td><td class="num">'+(r.pmax?'n/a':'$'+r.day.toPrecision(3))+'</td><td class="num">'+r.ttft.toFixed(r.ttft<10?2:0)+fl(r)+'</td><td class="num">'+r.gen.toFixed(2)+'</td><td class="num">'+r.kv.toFixed(2)+'</td></tr>').join('')+
      '</tbody>';$('lc-cap2').innerHTML='Cached row: the corpus is a cached prefix (the corpus is written to the cache '+(x.p.write?'at $'+x.p.write+'/M':'at the full input price, OpenAI\'s first request')+' at most once per 5-minute window, so '+Math.min(x.D,288)+' writes per day assumed); its seconds assume the prefix is already in the KV cache, so only the question is computed. RAG ratio, uncached long context against RAG: '+(rows[1].cost/rows[0].cost).toFixed(0)+' times per query.';
    race.reset(STEPS)}
  // time-to-first-token race, to scale
  const STEPS=31,raceEl=$('lc-race'),cap=$('lc-cap');
  const race=RD.anim({card:'lc-anim',ctl:'lc-ctl',n:STEPS,ms:160,label:'Time',draw:i=>{const {rows}=calc(),T=Math.max(...rows.map(r=>r.ttft)),t=T*i/(STEPS-1);
    raceEl.innerHTML='<div class="split">'+rows.map(r=>'<div class="small">'+esc(r.nm)+'</div><div class="sb" style="background:var(--soft)"><span style="width:'+(100*Math.min(t,r.ttft)/T).toFixed(1)+'%;background:'+(t>=r.ttft?'var(--c3)':'var(--c2)')+'">'+(t>=r.ttft?r.ttft.toFixed(1)+' s':'')+'</span></div>').join('')+'</div>';
    const done=rows.filter(r=>t>=r.ttft).map(r=>r.nm);cap.textContent='t = '+t.toFixed(1)+' s. '+(done.length?'First token reached: '+done.join(', ')+'.':'All three are still reading their prompt (prefill).')+(i===STEPS-1?' The uncached window pays for every corpus token on every query; the cached one pays once, then only for the question.':'')}});
  ['lc-N','lc-k','lc-c','lc-q','lc-a','lc-d'].forEach(id=>$(id).addEventListener('input',table));[ps,$('lc-model')].forEach(e=>e.addEventListener('change',table));
  // validation scatter: recorded prompt ms against the model
  function val(){const el=$('lc-val'),W=RD.width(el),H=Math.min(300,Math.max(220,W*.5)),m=40,P=L.pts;
    const lo=Math.log10(10),hi=Math.log10(12000),X=v=>m+(W-m-10)*(Math.log10(Math.max(10,v))-lo)/(hi-lo),Y=v=>10+(H-m-10)*(1-(Math.log10(Math.max(10,v))-lo)/(hi-lo));
    let g='<line x1="'+X(10)+'" y1="'+Y(10)+'" x2="'+X(12000)+'" y2="'+Y(12000)+'" stroke="var(--dim)" stroke-dasharray="4 3"/>';
    [10,100,1000,10000].forEach(t=>{g+=RD.t(X(t),H-m+14,t>=1000?(t/1000)+'k':t,{a:'middle',fill:'var(--mute)'})+RD.t(m-4,Y(t)+4,t>=1000?(t/1000)+'k':t,{a:'end',fill:'var(--mute)'})});
    P.forEach(p=>{g+='<circle cx="'+X(pre(p[0],p[1])).toFixed(1)+'" cy="'+Y(p[2]).toFixed(1)+'" r="2.5" fill="var(--acc)" opacity=".7"/>'});
    g+=RD.t((W+m)/2,H-6,'predicted prefill ms (log)',{a:'middle',fill:'var(--mute)'})+RD.t(m+4,18,'recorded ms',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,g,'predicted against recorded prefill time')+'<p class="small mute">Held-out mean absolute error '+(100*L.mape_test).toFixed(1)+'%; points on the dashed line are predicted exactly. Measured on Apple M1 Pro (Metal), root Agentic lab runs, 2026-10-14.</p>'}
  function acc(){const el=$('lc-acc'),AC=L.acc;ARL.bars(el,['single_k2','single_k5','single_k10','longctx','longctx_tokens8000'].map(s=>({nm:ARL.NAMES[s]+' ('+fi(AC[s].tok)+' tok)',v:AC[s].f1,max:.35,txt:ARL.f3(AC[s].f1),col:s.indexOf('long')===0?'var(--c4)':'var(--acc)'})))}
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-arlong']=[table,val,acc];
  addEventListener('resize',()=>{const t=$('t-arlong');if(t&&!t.hidden){val()}});
})();
