// Cache ladder tab: bars, detail card, the two-rung decode race (RD.anim), the table.
(function(){
  if(!window.AVL||!window.AVLC||!document.getElementById('ld-rows'))return;
  const $=id=>document.getElementById(id),D=window.AVL,C=window.AVLC,G=D.gpu;
  const LS=[1024,4096,8192,32768,65536,131072,262144,524288,1048576];
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let sel='llama31';
  const col={attn:'var(--c1)',mla:'var(--c3)',comp:'var(--c5)',gdn:'var(--c2)'};
  function L(){return LS[+$('ld-L').value]}
  function stores(r){return r.groups.map(g=>{
    if(g.kind==='attn')return g.n+' x '+(g.win?'local '+g.win.toLocaleString()+': ':'full: ')+'2 x '+g.nkv+' KV heads x '+g.hd+' = '+(2*g.nkv*g.hd).toLocaleString()+' numbers';
    if(g.kind==='mla')return g.n+' x latent '+g.dc+' + RoPE key '+g.dr+(g.idx_dim?' + indexer key '+g.idx_dim:'')+' = '+(g.dc+g.dr+(g.idx_dim||0)).toLocaleString()+' numbers'+(g.topk?', attention reads the top '+g.topk.toLocaleString():'');
    if(g.kind==='comp')return g.n+' x one '+g.entry+'-number entry per '+g.ratio+' tokens'+(g.idx_dim?' + indexer key '+g.idx_dim+' per entry, top '+g.topk.toLocaleString()+' read':', all read')+', plus the last '+g.win+' tokens';
    if(g.kind==='gdn')return g.n+' x a fixed state of '+C.fmtB(g.state_bytes_layer)+' (fp32), whatever the context';
    return ''}).join('; ')}
  function draw(){
    const l=L();$('ld-Lv').textContent=l.toLocaleString();
    const what=$('ld-what').value;const xs=D.rungs.map(r=>({r,x:C.rung(r,l,D.bytes_per_number)}));
    const val=o=>what==='store'?o.x.storeBytes:what==='read'?o.x.readBytes:o.x.flops;
    const mx=Math.max(...xs.map(val));
    $('ld-scale').textContent='Linear scale: the longest bar is '+(what==='flops'?C.fmtF(mx):C.fmtB(mx))+' at '+l.toLocaleString()+' tokens. Tap a rung for its arithmetic.';
    $('ld-rows').innerHTML=xs.map(o=>{const r=o.r,v=val(o);const kinds=[...new Set(r.groups.map(g=>g.kind))];
      return '<div class="ld-row'+(r.id===sel?' on':'')+'" data-r="'+r.id+'" role="button" tabindex="0"><div class="ld-nm">'+esc(r.name)+'<i>'+esc(r.design)+(r.whatif?' (illustrative)':'')+'</i></div><div class="ld-bars">'+
      '<div class="ld-bar"><span class="kk">'+(what==='store'?'held':what==='read'?'read':'FLOPs')+'</span><div class="tr"><div class="fl" style="width:'+(100*v/mx).toFixed(2)+'%;background:'+col[kinds[kinds.length-1]]+'"></div></div><span class="vv">'+(what==='flops'?C.fmtF(v):C.fmtB(v))+'</span></div>'+
      '<div class="ld-bar"><span class="kk">per byte</span><div></div><span class="vv">'+(o.x.flops/o.x.readBytes).toFixed(1)+' FLOP/B</span></div></div></div>'}).join('');
    for(const el of $('ld-rows').querySelectorAll('.ld-row')){const f=()=>{sel=el.dataset.r;draw()};el.addEventListener('click',f);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}})}
    const r=D.rungs.find(q=>q.id===sel),x=C.rung(r,l,D.bytes_per_number),rf=C.roof(x,G);
    $('ld-det').innerHTML='<h4>'+esc(r.name)+(r.date?' ('+r.date+')':'')+'</h4><p><b>Each layer stores per token:</b> '+esc(stores(r))+'.</p>'+
      '<p>At '+l.toLocaleString()+' tokens: cache '+C.fmtB(x.storeBytes)+' per sequence'+(x.fixedBytes?' (of which '+C.fmtB(x.fixedBytes)+' fixed state)':'')+'; one decoded token reads '+C.fmtB(x.readBytes)+' and does '+C.fmtF(x.flops)+' of attention arithmetic, '+(x.flops/x.readBytes).toFixed(1)+' FLOPs per byte. On one H100 that is '+C.fmtT(rf.tm)+' of memory traffic against '+C.fmtT(rf.tc)+' of arithmetic: <b>'+rf.bound+'-bound</b> (the H100 balance point is '+(G.bf16_dense_tflops*1e12/(G.hbm_tb_s*1e12)).toFixed(0)+' FLOPs per byte).</p>'+
      '<p class="small">Source: <code>'+esc(r.src)+'</code>.</p>';
    table(l);race();
  }
  function table(l){
    let h='<thead><tr><th>Design</th><th class="num">Held per token at this length (average)</th><th class="num">Cache at '+l.toLocaleString()+'</th><th class="num">Read per decoded token</th><th class="num">FLOPs per byte</th><th>Bound on H100</th></tr></thead><tbody>';
    for(const r of D.rungs){const x=C.rung(r,l,2),rf=C.roof(x,G);
      h+='<tr><td>'+esc(r.name)+'</td><td class="num">'+C.fmtB(x.perToken)+'</td><td class="num">'+C.fmtB(x.storeBytes)+'</td><td class="num">'+C.fmtB(x.readBytes)+'</td><td class="num">'+(x.flops/x.readBytes).toFixed(1)+'</td><td>'+rf.bound+'</td></tr>'}
    $('ld-tab').innerHTML=h+'</tbody>';
    const g=(id)=>C.rung(D.rungs.find(q=>q.id===id),l,2);
    const a=g('llama2'),b=g('llama31'),m=g('dsv3'),d=g('dsv32'),v=g('dsv4');
    $('ld-say').innerHTML='At '+l.toLocaleString()+' tokens, GQA-8 holds '+(a.storeBytes/b.storeBytes).toFixed(0)+'x less than MHA at the same shape, and MLA (DeepSeek-V3, a 671B model) holds '+C.fmtB(m.storeBytes)+' against Llama 2 7B\'s '+C.fmtB(a.storeBytes)+'. DSA adds its indexer keys to what is held ('+C.fmtB(d.storeBytes)+') but '+(l>2048?'reads '+(d.readBytes/m.readBytes*100).toFixed(0)+'% of what V3 reads':'reads as much as V3 until the context passes 2,048 tokens')+'; V4-Pro\'s compression cuts what is held to '+C.fmtB(v.storeBytes)+'. Every grouped-query rung does 4 or 8 FLOPs per byte read: decode attention is bound by memory bandwidth for them at every length, so cache bytes are time. MLA\'s absorbed form makes all 128 heads reuse one entry, '+(m.flops/m.readBytes).toFixed(0)+' FLOPs per byte, near the H100 balance point: the reason DeepSeek can afford 128 heads.';
  }
  // the race: two rungs, one decode step, time shared
  const steps=21;let anim=null;
  function fill(){const opts=D.rungs.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join('');$('ld-a').innerHTML=opts;$('ld-b').innerHTML=opts;$('ld-a').value='llama31';$('ld-b').value='dsv3'}
  function race(i){
    if(i===undefined)i=anim?+document.getElementById('ld-ctl-s').value:steps-1;
    const l=L(),ra=D.rungs.find(q=>q.id===$('ld-a').value),rb=D.rungs.find(q=>q.id===$('ld-b').value);
    const xa=C.rung(ra,l,2),xb=C.rung(rb,l,2),fa=C.roof(xa,G),fb=C.roof(xb,G);const T=Math.max(fa.t,fb.t),t=T*i/(steps-1);
    const lane=(nm,a,tot,c)=>'<div class="ld-lane"><span>'+nm+'</span><div class="tr"><div class="fl" style="width:'+(100*Math.min(a,tot)/T).toFixed(2)+'%;background:'+c+'"></div></div><span class="vv">'+C.fmtT(Math.min(a,tot))+'</span></div>';
    $('ld-race').innerHTML='<div class="small"><b>'+esc(ra.name)+'</b></div>'+lane('memory',t,fa.tm,'var(--c1)')+lane('arithmetic',t,fa.tc,'var(--c4)')+
      '<div class="small"><b>'+esc(rb.name)+'</b></div>'+lane('memory',t,fb.tm,'var(--c1)')+lane('arithmetic',t,fb.tc,'var(--c4)');
    const done=(f)=>t>=f.t-1e-15;
    $('ld-cap').innerHTML='<b>'+C.fmtT(t)+' into the step.</b> '+(i===0?'Both start reading their caches from HBM; arithmetic overlaps with the reads.':
      esc(ra.name)+(done(fa)?' is done ('+C.fmtT(fa.t)+', '+fa.bound+'-bound)':' still '+(t<fa.tm?'reading':'computing'))+'; '+esc(rb.name)+(done(fb)?' is done ('+C.fmtT(fb.t)+', '+fb.bound+'-bound)':' still '+(t<fb.tm?'reading':'computing'))+'.'+
      (i===steps-1?' Ratio of step times: '+(Math.max(fa.t,fb.t)/Math.min(fa.t,fb.t)).toFixed(1)+'x at '+l.toLocaleString()+' tokens. Move the context slider: the windowed and sparse rungs stop growing once the context passes their window or top-k.':''));
  }
  function init(){
    if(anim)return;fill();
    anim=RD.anim({card:'ld-race',ctl:'ld-ctl',n:steps,ms:450,start:steps-1,draw:race,label:'Time within the decode step'});
    $('ld-L').addEventListener('input',draw);$('ld-what').addEventListener('change',draw);
    $('ld-a').addEventListener('change',()=>race());$('ld-b').addEventListener('change',()=>race());
    draw();
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-ladder']=window.TAB_RENDER['t-ladder']||[]).push(()=>{init();draw()});
})();
