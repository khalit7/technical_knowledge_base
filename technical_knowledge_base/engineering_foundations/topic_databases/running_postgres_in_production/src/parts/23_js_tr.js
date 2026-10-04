// ---- Real transcripts: every <div class="tr" data-run="run" data-steps="a,b"> is filled from window.RPG (inputs/*.json) ----
window.TR=(function(){
  const esc=RD.esc;
  const isSql=c=>/^\s*(SELECT|ALTER|INSERT|DELETE|UPDATE|VACUUM|CREATE|ROLLBACK|BEGIN|SET|SHOW|--|DROP)/i.test(c);
  function paint(line){
    const e=esc(line);
    if(/^(ERROR|FATAL|PANIC)|\bERROR:|FATAL:|error:/.test(line))return '<span class="er">'+e+'</span>';
    if(/^(WARNING|HINT|DETAIL)/.test(line))return '<span class="er">'+e+'</span>';
    if(/successfully verified|Done!|server promoted|INSERT 0 1$|ready to accept connections$/.test(line))return '<span class="ok">'+e+'</span>';
    return e;
  }
  function body(run,stepName){
    const R=window.RPG&&window.RPG[run];const s=R&&R.steps[stepName];
    if(!s)return '<span class="er">(no recorded output for '+esc(run+':'+stepName)+')</span>';
    const p=isSql(s.cmd)?'chat=# ':'$ ';
    let h=s.cmd.split('\n').map((l,i)=>'<span class="cmd">'+(i?'  ':p)+'</span>'+(l.trim().startsWith('--')?'<span class="cm">'+esc(l)+'</span>':esc(l).replace(/(--.*)$/,'<span class="cm">$1</span>'))).join('\n');
    if(s.out)h+='\n'+String(s.out).split('\n').map(paint).join('\n');
    if(s.log&&s.log.length)h+='\n<span class="cm">-- server log:</span>\n'+s.log.map(paint).join('\n');
    return h;
  }
  function fill(el){
    const run=el.dataset.run,steps=(el.dataset.steps||'').split(',').filter(Boolean);
    const R=window.RPG&&window.RPG[run];
    const secs=steps.map(s=>R&&R.steps[s]&&R.steps[s].secs).filter(x=>x!=null);
    const title=el.dataset.title||'Real run';
    el.innerHTML='<div class="h"><b>'+esc(title)+'</b><span class="meas">measured'+(secs.length===1?', took '+secs[0]+' s':'')+'</span></div>'+
      '<pre class="term">'+steps.map(s=>body(run,s)).join('\n\n')+'</pre>'+(el.dataset.note?'<div class="n">'+el.dataset.note+'</div>':'');
  }
  document.querySelectorAll('.tr[data-run]').forEach(fill);
  return {fill,body};
})();
// ---- numbers in prose: <span data-v="run.path.to.value" data-d="1"> is filled from window.RPG, so text and data cannot drift ----
(function(){
  document.querySelectorAll('[data-v]').forEach(el=>{
    let v=window.RPG;for(const k of el.dataset.v.split('.')){v=v==null?v:v[k]}
    if(v==null){el.textContent='?';return}
    const d=el.dataset.d;if(typeof v==='number')v=d!=null?v.toLocaleString('en-US',{minimumFractionDigits:+d,maximumFractionDigits:+d}):v.toLocaleString('en-US');
    el.textContent=v;
  });
})();
