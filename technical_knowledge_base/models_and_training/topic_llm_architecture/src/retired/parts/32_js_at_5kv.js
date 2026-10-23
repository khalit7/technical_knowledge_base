// Attention lab section 8: KV-cache sizing for a serving budget, on the Config calculator's configs (window.CCD) and
// formulas (window.CC.normalise, CC.cache, CC.params), so numbers agree with that tab and the Architecture map (bf16, windows credited).
// The CC scripts load after this one, so everything starts on DOMContentLoaded.
(function(){
  const A=window.AT;if(!A||!A.$('at-kv-card'))return;
  const $=A.$;
  const CTX=[1024,4096,8192,16384,32768,65536,131072,262144,524288,1048576],BAT=[1,2,4,8,16,32,64,128,256,512];
  let M=[],specs={},sel='llama-3.1-8b';
  // attention summary of a normalised spec
  function summ(s){
    let na=0,nw=0,nm=0,ns=0,o={};
    for(const lay of s.layers)for(const k of ['mix','mix2']){const m=lay[k];if(!m)continue;
      if(m.t==='attn'){na++;if(m.win)nw++;o.nh=m.nh;o.nkv=m.nkv;o.hd=m.hd;if(m.win)o.win=m.win}
      else if(m.t==='mla'){na++;nm++;o.nh=m.nh;o.kvl=m.kvl;o.rope=m.rope;o.ihd=m.ihd;o.itop=m.itop}
      else ns++}
    return Object.assign(o,{na,nw,nm,ns,L:s.layers.length});
  }
  // the same spec with its attention layers swapped (state-space layers untouched)
  function swap(s,how){
    const map=new Map();
    const conv=m=>{if(!m||(m.t!=='attn'&&m.t!=='mla'))return m;if(map.has(m))return map.get(m);
      const nh=m.nh,hd=m.t==='attn'?m.hd:m.v,base={t:'attn',nh,hd,hdv:hd,win:m.t==='attn'?m.win:0};
      let r;
      if(how==='mha')r=Object.assign({},base,{nkv:nh});
      else if(how==='gqa8')r=Object.assign({},base,{nkv:Math.min(8,nh)});
      else if(how==='mqa')r=Object.assign({},base,{nkv:1});
      else if(how==='mla')r={t:'mla',nh,kvl:512,rope:64,ihd:0,itop:0};
      else if(how==='nowin')r=m.t==='attn'?Object.assign({},m,{win:0}):m;
      map.set(m,r);return r};
    return Object.assign({},s,{layers:s.layers.map(l=>Object.assign({},l,{mix:conv(l.mix),mix2:conv(l.mix2)}))});
  }
  const kvAt=(s,ctx,kvb)=>window.CC.cache(s,ctx,kvb,4);
  function describe(a){
    if(a.nm)return 'MLA: latent '+a.kvl+' + RoPE key '+a.rope+(a.ihd?' + indexer key '+a.ihd+' (top '+A.grp(a.itop)+')':'');
    if(!a.na)return 'no attention';
    let s=a.nkv===a.nh?'MHA':a.nkv===1?'MQA':'GQA-'+a.nkv;
    if(a.nw)s+=', window '+A.grp(a.win)+' on '+a.nw+' of '+a.na;
    return s;
  }
  function render(){
    const s=specs[sel];if(!s)return;
    const ctx=CTX[+$('at-kv-ctx').value],B=BAT[+$('at-kv-b').value],kvb=+$('at-kv-kvb').value,wb=+$('at-kv-wb').value,gpu=+$('at-kv-gpu').value*1e9;
    $('at-kv-ctxv').textContent=A.grp(ctx);$('at-kv-bv').textContent=B;
    const a=summ(s),c=kvAt(s,ctx,kvb),per=c.total,tot=per*B,P=window.CC.params(s).total,w=P*wb,res=0.1*gpu;
    const free=gpu-res-w,maxB=per>0?Math.max(0,Math.floor(free/per)):Infinity;
    const perTok=kvAt(s,1,kvb).kv;
    $('at-kv-stats').innerHTML=A.stat('Attention',describe(a),a.na+' attention layers'+(a.ns?', '+a.ns+' state-space':'')+' of '+a.L)+
      A.stat('KV per token, full',A.bytes(perTok),'all attention layers, '+(kvb===2?'bf16':kvb===1?'fp8':'fp32'))+
      A.stat('Cache per sequence',A.bytes(per),'at '+A.grp(ctx)+' tokens'+(c.state?' (state '+A.bytes(c.state)+')':'')+(a.nw?', windows credited':''))+
      A.stat('Cache for the batch',A.bytes(tot),B+' sequences')+A.stat('Weights',(w/1e9).toFixed(1)+' GB',A.grp(Math.round(P/1e6))+'M parameters x '+wb+' B');
    // drawn to scale: the GPU, weights, reserve, cache
    const el=$('at-kv-bar'),W=Math.max(280,A.width(el)),need=w+res+tot,scale=(W-4)/Math.max(gpu,need),h=26;
    const seg=(x,v,col,lab)=>{const ww=Math.max(0,v*scale);return '<rect x="'+x+'" y="18" width="'+ww+'" height="'+h+'" fill="'+col+'"/>'+(ww>60?A.t(x+4,35,lab,{fs:11,fill:'var(--bg)'}):'')};
    let x=2,body='';body+=seg(x,w,'var(--c1)','weights');x+=w*scale;body+=seg(x,res,'var(--mute)','reserve');x+=res*scale;body+=seg(x,tot,'var(--c2)','KV cache');
    body+='<rect x="2" y="16" width="'+(gpu*scale)+'" height="'+(h+4)+'" fill="none" stroke="var(--ink)" stroke-width="1.5" rx="2"/>';
    body+=A.t(2,11,'GPU '+A.grp(gpu/1e9)+' GB',{fs:11})+(need>gpu?A.t(W-2,11,'needs '+A.grp(need/1e9)+' GB',{fs:11,a:'end',fill:'var(--bad)'}):'');
    el.innerHTML=A.svg(W,h+24,body,'Memory: weights, reserve and KV cache against the GPU');
    $('at-kv-fit').innerHTML=free<=0?'<b class="no">The weights alone do not fit</b> in '+A.grp(gpu/1e9)+' GB with a 10% reserve: shard the model or use a smaller weight format.':
      (B<=maxB?'<b class="ok">Fits.</b> ':'<b class="no">Does not fit.</b> ')+'Up to <b>'+(maxB===Infinity?'unbounded':A.grp(maxB))+'</b> sequences of '+A.grp(ctx)+' tokens fit beside the weights ('+A.bytes(Math.max(0,free))+' left for the cache).';
    // what if
    const rows=[['As configured',s]];
    if(a.na){rows.push(['MHA',swap(s,'mha')],['GQA-8',swap(s,'gqa8')],['MQA',swap(s,'mqa')],['MLA 512 + 64',swap(s,'mla')]);if(a.nw)rows.push(['No windows',swap(s,'nowin')])}
    $('at-kv-what').innerHTML='<tr><th>Attention</th><th class="num">KV per token</th><th class="num">Per sequence</th><th class="num">Max batch</th></tr>'+
      rows.map(([n,sp],i)=>{const pt=kvAt(sp,1,kvb).kv,ps=kvAt(sp,ctx,kvb).total,mb=ps>0?Math.max(0,Math.floor(free/ps)):Infinity;
        return '<tr'+(i?'':' class="at-sel"')+'><td>'+n+'</td><td class="num">'+A.bytes(pt)+'</td><td class="num">'+A.bytes(ps)+'</td><td class="num">'+(mb===Infinity?'n/a':A.grp(mb))+'</td></tr>'}).join('');
    const notes=(s.notes||[]).slice();if(a.ns)notes.push('state-space layers keep a fixed state per sequence whatever the context; it is in "per sequence"');
    if(sel.startsWith('gpt-oss'))notes.push('gpt-oss ships its expert weights in MXFP4 (4-bit values with shared scales); pick "4-bit" for a rough weight size');
    if(a.ihd)notes.push('DeepSeek Sparse Attention stores an extra indexer key per token and layer; it reads only the top '+A.grp(a.itop)+' full entries per query but all indexer keys');
    $('at-kv-notes').textContent=notes.length?'Notes: '+notes.join('; ')+'.':'';
  }
  function table(){
    const rows=M.filter(m=>summ(specs[m.key]).na).map(m=>{const s=specs[m.key],a=summ(s);
      return {m,a,pt:kvAt(s,1,2).kv,c128:kvAt(s,131072,2).total}}).sort((x,y)=>y.pt-x.pt);
    $('at-real').innerHTML='<tr><th>Model</th><th class="num">Attn layers</th><th class="num">Q heads</th><th class="num">KV heads</th><th class="num">head_dim</th><th>Pattern</th><th class="num">KV / token</th><th class="num">At 131,072</th></tr>'+
      rows.map(r=>'<tr class="at-click'+(r.m.key===sel?' at-sel':'')+'" data-k="'+r.m.key+'"><td>'+A.esc(r.m.label)+'</td><td class="num">'+r.a.na+(r.a.na<r.a.L?' / '+r.a.L:'')+'</td><td class="num">'+r.a.nh+'</td><td class="num">'+(r.a.nm?'latent':r.a.nkv)+'</td><td class="num">'+(r.a.nm?r.a.kvl+'+'+r.a.rope:r.a.hd)+'</td><td>'+A.esc(describe(r.a))+'</td><td class="num">'+A.bytes(r.pt)+'</td><td class="num">'+A.bytes(r.c128)+'</td></tr>').join('');
    $('at-real-note').textContent=rows.length+' models with attention layers, sorted by KV per token. Pure state-space models (Mamba) have no KV cache and are left out. Configs and revisions: src/data/configs/manifest.json.';
  }
  function go(){
    if(!window.CC||!window.CCD)return;
    M=window.CCD.models;
    for(const m of M){try{specs[m.key]=window.CC.normalise(m.cfg)}catch(e){}}
    const groups={};M.forEach(m=>{if(specs[m.key])(groups[m.group]=groups[m.group]||[]).push(m)});
    $('at-kv-model').innerHTML=Object.keys(groups).map(g=>'<optgroup label="'+A.esc(g)+'">'+groups[g].map(m=>'<option value="'+m.key+'"'+(m.key===sel?' selected':'')+'>'+A.esc(m.label)+'</option>').join('')+'</optgroup>').join('');
    ['at-kv-ctx','at-kv-b'].forEach(id=>$(id).addEventListener('input',render));
    ['at-kv-kvb','at-kv-wb','at-kv-gpu'].forEach(id=>$(id).addEventListener('change',render));
    $('at-kv-model').addEventListener('change',e=>{sel=e.target.value;render();table()});
    $('at-real').addEventListener('click',e=>{const tr=e.target.closest('tr[data-k]');if(!tr)return;sel=tr.dataset.k;$('at-kv-model').value=sel;render();table();$('at-kv-card').scrollIntoView({block:'start'})});
    A.onRender(()=>{render();table()});A.onResize(render);
    window.AT.kv={specs,summ,swap,kvAt};
    if(A.visible()){render();table()}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
