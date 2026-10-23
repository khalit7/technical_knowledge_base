// KV-cache calculator tab: one model, one context slider, the attention design as the variable; every preset at the
// same context below. Numbers from window.KC (19_js_kc_1core.js).
(function(){
  if(!window.KC||!LC.$('kc-model'))return;
  const $=LC.$,D=KCD,UTIL=0.92;
  const sel=$('kc-model');
  Object.entries(D.fams).forEach(([f,name])=>{const og=document.createElement('optgroup');og.label=name;
    KC.P.filter(p=>p.fam===f).forEach(p=>{const o=document.createElement('option');o.value=p.key;o.textContent=p.label;og.appendChild(o)});sel.appendChild(og)});
  sel.value='llama-3.1-8b';
  KC.DESIGNS.forEach(([k,n])=>{const o=document.createElement('option');o.value=k;o.textContent=n;$('kc-des').appendChild(o)});
  D.gpus.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=g[0]+' ('+g[1]+' GB, '+g[2]+' TB/s)';$('kc-gpu').appendChild(o)});
  $('kc-gpu').value='0';
  const ctx=()=>Math.round(2**(+$('kc-ctx').value));
  const kfmt=n=>n>=1048576?LC.fmt(n/1048576,n%1048576?1:0)+'M':n>=1024?LC.fmt(n/1024,n%1024?1:0)+'K':String(n);
  const opts=()=>({kvb:+$('kc-kdt').value,sb:+$('kc-sdt').value,keep:+$('kc-keep').value});
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>';
  function weights(p){return p.params?p.params*(+$('kc-wdt').value):null}
  function draw(){
    const p0=KC.byKey[sel.value],des=$('kc-des').value,p=KC.redesign(p0,des),T=ctx(),o=opts(),g=D.gpus[+$('kc-gpu').value],n=+$('kc-ngpu').value;
    $('kc-des').disabled=!p0.shape;if(!p0.shape&&des!=='cfg')$('kc-des').value='cfg';
    $('kc-ctxv').textContent=LC.int(T)+' tokens ('+kfmt(T)+')';
    const opt=id=>$(id).options[$(id).selectedIndex].text;$('kc-sum').textContent='cache '+opt('kc-kdt').split(' ')[0]+', state '+opt('kc-sdt').split(' ')[0]+', '+(o.keep<1?opt('kc-keep')+' kept':'no eviction')+', '+n+' x '+g[0]+', weights '+opt('kc-wdt');
    const W=weights(p0),cap=g[1]*1e9*n*UTIL,s0=KC.seq(p0,T,o),s1=KC.seq(p,T,o);
    // model note
    const pl=KC.perLayer(p0).map(x=>x.n+(p0.tokOnly?'':' layer'+(x.n>1?'s':''))+' x '+LC.int(x.e)+(x.idx?' + '+x.idx+' indexer':'')+' numbers'+(x.win?' (window '+LC.int(x.win)+')':'')+(x.topk?' (reads top '+LC.int(x.topk)+')':'')).join('; ');
    $('kc-mnote').innerHTML='<b>'+LC.esc(p0.label)+'</b>: '+(p0.tokB!==undefined?LC.fmt(p0.tokB,1)+' bytes per token in its published FP8/FP4 layout'+(p0.fixB?' plus '+LC.gb(p0.fixB)+' of fixed windows':''):p0.tokOnly?LC.int(p0.groups[0].e)+' numbers per token over all layers (layer split not copied)':'per token, '+pl)+
      (p0.stateNums?'; fixed state '+LC.int(p0.stateNums)+' numbers':'')+'. '+(p0.maxCtx?'Config maximum '+LC.int(p0.maxCtx)+' tokens. ':'')+
      'Source: '+LC.esc(p0.from)+(p0.kind==='cfg'?', revision '+p0.rev:'')+'.';
    // chart: cache per sequence against context, log-log
    const el=$('kc-chart'),CW=LC.width(el),CH=Math.round(Math.min(310,Math.max(230,CW*0.5))),L=48,R=10,Tp=14,B=42;
    const xs=[];for(let e=10;e<=20;e+=0.125)xs.push(Math.round(2**e));
    const y0=xs.map(t=>KC.seq(p0,t,o).total),y1=xs.map(t=>KC.seq(p,t,o).total);
    const top=Math.max(...y0,...y1,W||0,cap)*1.2,bot=Math.max(1e6,Math.min(...y0,...y1)/2);
    const lgT=Math.log10(top),lgB=Math.log10(bot);
    const px=t=>L+(CW-L-R)*(Math.log2(t)-10)/10,py=v=>Tp+(CH-B-Tp)*(1-(Math.log10(Math.max(v,bot))-lgB)/(lgT-lgB));
    let s='';for(let k=Math.ceil(lgB);k<=lgT;k++){const y=py(10**k);s+='<line x1="'+L+'" x2="'+(CW-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+LC.t(L-4,y+4,LC.gb(10**k).replace('.0 ',' '),{a:'end'})}
    (CW<520?[10,12,14,16,18,20]:[10,11,12,13,14,15,16,17,18,19,20]).forEach(e=>{s+=LC.t(px(2**e),CH-B+15,kfmt(2**e),{a:'middle'})});
    s+=LC.t(CW-R,CH-3,'context (tokens), memory: both log scale',{a:'end',fill:'var(--mute)'});
    const path=(ys,st)=>'<path d="'+ys.map((v,k)=>(k?'L':'M')+px(xs[k]).toFixed(1)+' '+py(v).toFixed(1)).join('')+'" fill="none" '+st+'/>';
    if(W){s+='<line x1="'+L+'" x2="'+(CW-R)+'" y1="'+py(W)+'" y2="'+py(W)+'" stroke="var(--c2)" stroke-width="2"/>'+LC.t(L+4,py(W)-4,'weights '+LC.gb(W),{fill:'var(--c2)'})}
    s+='<line x1="'+L+'" x2="'+(CW-R)+'" y1="'+py(cap)+'" y2="'+py(cap)+'" stroke="var(--ink)" stroke-dasharray="5 4" stroke-width="1.5"/>'+LC.t(CW-R-2,py(cap)-4,'usable '+LC.gb(cap),{a:'end',fill:'var(--ink)'});
    s+=path(y0,'stroke="var(--mute)" stroke-width="2" stroke-dasharray="5 4"')+path(y1,'stroke="var(--acc)" stroke-width="2.5"');
    if(p0.maxCtx&&p0.maxCtx<2**20){const x=px(p0.maxCtx);s+='<line x1="'+x+'" x2="'+x+'" y1="'+Tp+'" y2="'+(CH-B)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>'+LC.t(x-3,CH-B-4,'config max',{a:'end',fill:'var(--mute)'})}
    s+='<line x1="'+px(T)+'" x2="'+px(T)+'" y1="'+Tp+'" y2="'+(CH-B)+'" stroke="var(--c4)" stroke-width="1.5"/><circle cx="'+px(T)+'" cy="'+py(s1.total)+'" r="4.5" fill="var(--acc)"/>';
    el.innerHTML=LC.svg(CW,CH,s,'Cache of one sequence against context');
    // stats
    const fit=(seqB)=>W===null?Math.floor(cap/seqB):Math.max(0,Math.floor((cap-W)/seqB));
    const rd=KC.read(p,T,o),cw=W?KC.reach(p,W,o):null;
    const perTok=p.tokB!==undefined?p.tokB:KC.perLayer(p).reduce((a,x)=>a+x.n*(x.e+x.idx)*o.kvb,0);
    const bw=g[2]*1e12*n;
    $('kc-stats').innerHTML=[
      stat('Cache per token, all layers',LC.bytes(perTok),p.tokB!==undefined?'published layout':'windows not credited; '+(o.kvb===2?'bf16':o.kvb===1?'fp8':'int4')),
      stat('One sequence at '+kfmt(T),LC.gb(s1.total)+(des!=='cfg'?' <span class="kc-note">(was '+LC.gb(s0.total)+')</span>':''),(s1.state?'incl. '+LC.bytes(s1.state)+' fixed state; ':'')+LC.bytes(s1.total)),
      stat('Read per decoded token',rd===null?'not modelled':LC.gb(rd),rd!==null&&rd<s1.kv*0.99?'sparse attention reads less than it stores':'the whole cache, every step'),
      stat('Cache = weights at',W===null?'weights not listed':cw===Infinity?'never (fixed size)':LC.int(cw)+' tokens',W===null?'no parameter count copied for this preset':'weights '+LC.gb(W)),
      stat('Sequences that fit',W!==null&&W>cap?'none: weights alone exceed memory':LC.int(fit(s1.total)),'on '+n+' x '+g[0]+(W===null?', cache only':'')),
      stat('Decode ceiling, batch 1',W===null?'-':LC.fmt(bw/(W+s1.total),0)+' tokens/s','(weights + cache) / '+LC.fmt(g[2]*n,2)+' TB/s')
    ].join('');
    const notes=[];
    if(!p0.shape)notes.push('The design lever needs the model\'s query heads and head size; this preset was copied without them, so only "as released" is offered.');
    if(des==='mha'||des==='gqa8'||des==='mqa')notes.push('Changing KV heads changes the K and V projections (a few percent of parameters, ignored here) and needs retraining or uptraining (GQA paper).');
    if(des==='mla')notes.push('An MLA cache per layer is a 512-number latent plus a 64-number RoPE key, whatever the head count (DeepSeek-V2 and V3); the mechanism is on Attention variants.');
    if(des==='lg51'||des==='swa')notes.push('A window layout is a training-time choice: imposed on a trained model it loses retrieval (the Reading tab, section 5).');
    if(des==='hyb')notes.push('Three of every four layers replaced by Gated DeltaNet layers with Qwen3-Next\'s state (32 value heads of 128 x 128 numbers): a different model, trained as such.');
    if(o.keep<1)notes.push('Eviction counted as if every dropped entry were freed: the algorithmic saving. A paged engine frees only whole blocks (Batching, KV cache and scheduling).');
    if(p0.tokB!==undefined&&o.kvb!==2)notes.push('This preset keeps its published FP8/FP4 layout; the dtype control does not apply.');
    if(p0.maxCtx&&T>p0.maxCtx)notes.push('Past the config\'s '+LC.int(p0.maxCtx)+' tokens: arithmetic only.');
    $('kc-dnote').textContent=notes.join(' ');
    // all presets at this context
    const rows=KC.P.map(q=>({q,s:KC.seq(q,T,o)})),mx=Math.max(...rows.map(r=>r.s.total));
    let h='';Object.entries(D.fams).forEach(([f,name])=>{const rs=rows.filter(r=>r.q.fam===f).sort((a,b)=>b.s.total-a.s.total);if(!rs.length)return;
      h+='<div class="fh">'+LC.esc(name)+'</div>'+rs.map(r=>'<button data-k="'+r.q.key+'"'+(r.q.key===p0.key?' class="on"':'')+'><span class="nm">'+LC.esc(r.q.label)+'</span><span class="tr"><span style="width:'+(100*r.s.kv/mx).toFixed(2)+'%"></span><span class="st" style="left:'+(100*r.s.kv/mx).toFixed(2)+'%;width:'+(100*r.s.state/mx).toFixed(2)+'%"></span></span><span class="v">'+LC.gb(r.s.total)+'</span></button>').join('')});
    $('kc-bars').innerHTML=h;
  }
  $('kc-bars').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;sel.value=b.dataset.k;$('kc-des').value='cfg';draw();$('kc-card').scrollIntoView({block:'start'})});
  ['kc-model','kc-des','kc-kdt','kc-sdt','kc-keep','kc-gpu','kc-ngpu','kc-wdt'].forEach(id=>$(id).addEventListener('change',draw));
  $('kc-ctx').addEventListener('input',draw);
  const pr=$('kc-pr1');if(pr)pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{pr.classList.add('done');pr.querySelectorAll('.opts button').forEach(x=>x.classList.add(x.dataset.ok?'right':'wrong'))}));
  LC.onTab('t-kv',draw);LC.onResize($('t-kv'),draw);draw();
  window.KCU={draw};
})();
