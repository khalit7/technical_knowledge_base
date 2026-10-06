// Section 9: where the audit's tokens and dollars went, per design (means over runs), from result.modelUsage.
(function(){
  const U=FMU;
  const ds=[['single','haiku'],['multi','haiku'],['fanout','haiku'],['board','haiku'],['boardv','haiku'],['boardb','haiku'],['boardsharp','haiku']].filter(d=>U.runs(d[0],d[1]).length);
  const comp=[['input','fresh input','var(--c6)'],['cache_write','written to cache','var(--c5)'],['cache_read','read from cache','var(--c1)'],['output','output (incl. thinking)','var(--c2)']];
  let mode='tok';
  function rows(){return ds.map(([d,m])=>{const rs=U.runs(d,m),o={name:U.DN[d]};comp.forEach(c=>o[c[0]]=U.mean(rs.map(r=>r.tot[c[0]])));o.cost=U.mean(rs.map(r=>r.tot.cost));
    // cost of cache writes = reported total minus the three components with a single price; the implied rate shows the 1-hour / 5-minute mix
    o.c_input=o.input*1e-6;o.c_cache_read=o.cache_read*0.1e-6;o.c_output=o.output*5e-6;o.c_cache_write=Math.max(0,o.cost-o.c_input-o.c_cache_read-o.c_output);
    o.wrate=o.cache_write?o.c_cache_write/o.cache_write*1e6:0;return o})}
  function draw(){
    const R=rows(),el=document.getElementById('fm-acbars');
    const key=c=>mode==='tok'?c[0]:'c_'+c[0];
    const max=Math.max.apply(null,R.map(r=>comp.reduce((a,c)=>a+r[key(c)],0)));
    el.innerHTML=R.map(r=>{const tot=comp.reduce((a,c)=>a+r[key(c)],0);
      return '<div class="row"><div class="nm">'+r.name+'</div><div class="track">'+comp.map(c=>'<span style="width:'+(100*r[key(c)]/max).toFixed(2)+'%;background:'+c[2]+'" title="'+c[1]+': '+(mode==='tok'?U.nf(r[c[0]]):U.usd(r['c_'+c[0]]))+'"></span>').join('')+'</div><div class="val">'+(mode==='tok'?U.tok(tot):U.usd(tot))+'</div></div>'}).join('');
    document.getElementById('fm-acleg').innerHTML=comp.map(c=>'<span><i style="background:'+c[2]+'"></i>'+c[1]+'</span>').join('');
    document.getElementById('fm-acnote').textContent=mode==='tok'?'Mean tokens per run, all agents included (result.modelUsage counts subagents; result.usage does not).':
      'Mean cost per run. Fresh, cached and output are priced at Haiku 4.5 list prices; cache writes are the reported total minus those three. Implied write price per million tokens: '+R.map(r=>r.name+' $'+U.nf(r.wrate,2)).join('; ')+' (the main thread writes 1-hour entries at $2, subagents 5-minute entries at $1.25).';
  }
  RD.seg(document.getElementById('fm-acseg'),m=>{mode=m;draw()});
  RD.onRender(draw);draw();
})();
