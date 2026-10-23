// Reading section 7: one layer of each real design, what one decoded token reads in that layer at a chosen context, and the FLOPs
// per byte read (AVLC arithmetic per layer group). One slider: the context. Whole-model sizing lives on the Long context page.
(function(){
  if(!window.AVL||!window.AVLC||!window.RD||!document.getElementById('ld-rows'))return;
  const $=id=>document.getElementById(id),D=window.AVL,C=window.AVLC,G=D.gpu,BAL=G.bf16_dense_tflops/G.hbm_tb_s;
  const LS=[1024,4096,8192,32768,65536,131072,262144,524288,1048576];
  const esc=RD.esc,col={attn:'var(--c1)',mla:'var(--good)',comp:'var(--c3)',gdn:'var(--c2)'};
  // one row per layer type of each rung
  const rows=[];
  for(const r of D.rungs){const multi=r.groups.length>1;
    for(const g of r.groups){let kind='';
      if(g.kind==='attn')kind=(g.win?'W '+g.win.toLocaleString():'full')+', '+g.nq+' : '+g.nkv+' heads of '+g.hd;
      if(g.kind==='mla')kind='MLA '+g.dc+' + '+g.dr+(g.topk?', indexer '+g.idx_dim+', top '+g.topk.toLocaleString():'')+', '+g.nq+' heads';
      if(g.kind==='comp')kind=g.entry+' per '+g.ratio+' tokens'+(g.topk?', top '+g.topk.toLocaleString():', all')+', W '+g.win;
      if(g.kind==='gdn')kind='Gated DeltaNet, fixed state';
      rows.push({nm:r.name+(multi?(g.kind==='gdn'?', linear layer':g.kind==='comp'?(g.ratio===4?', CSA layer':', HCA layer'):g.win?', local layer':', global layer'):''),kind,g,whatif:r.whatif,n:g.n})}}
  function draw(){
    const L=LS[+$('ld-L').value];$('ld-Lv').textContent=L.toLocaleString();
    const xs=rows.map(o=>{const x=C.layer(o.g,L);const rb=(x.read||0)*D.bytes_per_number+(x.readBytes||0);return {o,rb,fl:x.flops,ent:x.readEntries}});
    const mx=Math.max(...xs.map(v=>v.rb));
    $('ld-scale').textContent='Linear scale: the longest bar is '+C.fmtB(mx)+' read per decoded token in one layer at '+L.toLocaleString()+' tokens. A FLOP/B bar is full at the H100 balance point ('+BAL.toFixed(0)+'); below it the layer is memory-bound.';
    $('ld-rows').innerHTML=xs.map(v=>{const o=v.o,fpb=v.fl&&v.rb?v.fl/v.rb:0;const bound=o.g.kind==='gdn'?'fixed state':fpb>BAL?'compute-bound':'memory-bound';
      return '<div class="ld-row"><div class="ld-nm">'+esc(o.nm)+'<i>'+o.n+' x '+esc(o.kind)+'</i></div><div>'+
      '<div class="ld-bar"><span class="kk">read</span><div class="tr"><div class="fl" style="width:'+(100*v.rb/mx).toFixed(2)+'%;background:'+col[o.g.kind]+'"></div></div><span class="vv">'+C.fmtB(v.rb)+'</span></div>'+
      '<div class="ld-bar"><span class="kk">FLOP/B</span><div class="tr"><div class="fl" style="width:'+Math.min(100,100*fpb/BAL).toFixed(2)+'%;background:var(--c4)"></div></div><span class="vv">'+(o.g.kind==='gdn'?'n/a':fpb.toFixed(1))+'</span></div>'+
      '</div></div>'}).join('');
  }
  let inited=false;
  function init(){if(inited)return;inited=true;$('ld-L').addEventListener('input',draw);draw()}
  RD.onRender(()=>{init();draw()});
})();
