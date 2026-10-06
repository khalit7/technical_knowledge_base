// ---- fobs: tab t-pipe (tail-sampling simulator, cost table, collector configs) ----
(function(){
  const {D,fmt,esc}=FOBSU;
  const S=D.samp.sent,first=S[0][1],rootIdx=S.length-1,rootAt=S[rootIdx][1];
  let lastExec=-1;S.forEach((s,i)=>{if(s[0]==='claude_code.tool.execution')lastExec=i});
  const injected=new Set([lastExec,rootIdx]);
  const E=D.samp.emitted_seconds_after_replay_start,C=D.samp.configs;
  const $=id=>document.getElementById(id);
  const PRE=[
    {lab:'5 s',run:'failed',pol:'any',w:5,ar:false,kept:C.short.kept},
    {lab:'5 s + cache',run:'failed',pol:'any',w:5,ar:false,kept:C.short_cached.kept},
    {lab:'60 s',run:'failed',pol:'any',w:60,ar:false,kept:C.long.kept,emit:E.long},
    {lab:'root, failed run',run:'failed',pol:'any',w:120,ar:true,kept:C.root.kept,emit:E.root},
    {lab:'any ERROR, successful run',run:'ok',pol:'any',w:120,ar:true,kept:C.any_error.kept_by_trace['successful run']||0},
    {lab:'root ERROR, successful run',run:'ok',pol:'root',w:120,ar:true,kept:C.root_outcome.kept_by_trace['successful run']||0},
    {lab:'root ERROR, failed run',run:'failed',pol:'root',w:120,ar:true,kept:C.root_outcome.kept_by_trace['failed run']||0}];
  function sim(o){
    const err=S.map((s,i)=>s[2]&&(o.run==='failed'||!injected.has(i)));
    let dec=first+o.w;if(o.ar&&rootAt+2<dec)dec=rootAt+2;
    const seen=S.map((s,i)=>i).filter(i=>S[i][1]<=dec);
    const keep=o.pol==='any'?seen.some(i=>err[i]):(seen.includes(rootIdx)&&err[rootIdx]);
    return {dec,keep,kept:keep?S.length:0,seenN:seen.length,err};
  }
  $('fobs-sim-pre').innerHTML=PRE.map((p,i)=>{const r=sim(p),ok=r.kept===p.kept;
    return '<button data-p="'+i+'" style="font-size:12px;margin:2px">'+esc(p.lab)+': '+p.kept+' kept '+(ok?'<span class="ok">sim agrees</span>':'<span class="no">sim differs</span>')+'</button>'}).join(' ');
  $('fobs-sim-pre').addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b)return;const p=PRE[+b.dataset.p];
    $('fobs-sim-run').value=p.run;$('fobs-sim-pol').value=p.pol;$('fobs-sim-w').value=p.w;$('fobs-sim-ar').checked=p.ar;draw()});
  function draw(){const o={run:$('fobs-sim-run').value,pol:$('fobs-sim-pol').value,w:+$('fobs-sim-w').value,ar:$('fobs-sim-ar').checked};
    $('fobs-sim-wv').textContent=o.w;const r=sim(o);
    const el=$('fobs-sim-svg'),w=RD.width(el),h=110,TM=Math.max(65,r.dec+5),x=t=>8+(w-16)*t/TM;
    let b='<rect x="8" y="18" width="'+(w-16)+'" height="56" fill="var(--soft)"/>';
    S.forEach((s,i)=>{const c=r.err[i]?'var(--bad)':(r.keep?'var(--good)':'var(--mute)');
      b+='<line x1="'+x(s[1]).toFixed(1)+'" x2="'+x(s[1]).toFixed(1)+'" y1="'+(r.err[i]?22:38)+'" y2="72" stroke="'+c+'" stroke-width="'+(r.err[i]?2.5:1.5)+'"/>'});
    b+='<line x1="'+x(r.dec)+'" x2="'+x(r.dec)+'" y1="8" y2="84" stroke="'+(r.keep?'var(--good)':'var(--bad)')+'" stroke-width="2"/>'+RD.t(Math.min(x(r.dec)+4,w-70),12,'decision',{fs:11,fill:r.keep?'var(--good)':'var(--bad)'});
    for(let t=0;t<=TM;t+=TM>100?20:10)b+=RD.t(x(t),98,t+' s',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,b,'Span arrivals and the sampling decision');
    $('fobs-sim-out').innerHTML=RD.stat('Decision at',fmt(r.dec,1)+' s',r.seenN+' of '+S.length+' spans seen')+RD.stat('Outcome',r.keep?'kept, '+r.kept+' spans':'dropped',r.keep?'':'every later span follows the decision')+
      RD.stat('Trace held in memory',fmt(r.dec-first,1)+' s','per trace in flight')+RD.stat('ERROR spans in this trace',r.err.filter(Boolean).length,o.run==='failed'?'2 recoverable + 2 marked failed':'recoverable only');
    const pm=PRE.find(p=>p.run===o.run&&p.pol===o.pol&&p.w===o.w&&p.ar===o.ar);
    $('fobs-sim-note').innerHTML=pm?'This setting was run on the real collector: '+pm.kept+' spans kept'+(pm.emit?', written out '+pm.emit+' s after the first span':'')+'.':'Not run on the real collector; simulated.'}
  ['fobs-sim-run','fobs-sim-pol','fobs-sim-w','fobs-sim-ar'].forEach(id=>$(id).addEventListener('input',draw));
  draw();RD.onRenderTab('t-pipe',draw);RD.onResize(draw,'t-pipe');

  // cost table
  const C2=D.cost,M=C2.ways.mapped.gens,T2=C2.ways.ttl.gens;
  $('fobs-cost-tab').innerHTML='<thead><tr><th class="num">Call</th><th class="num">Fresh in</th><th class="num">Cache read</th><th class="num">Cache write</th><th class="num">Output</th><th class="num">Langfuse, GenAI names</th><th class="num">Langfuse, 1 h key</th><th class="num">Check</th></tr></thead><tbody>'+
    T2.map((g,i)=>{const u=g[0],chk=(u.input*1+u.input_cached_tokens*0.1+u.input_cache_creation_1h*2+u.output*5)/1e6;
      return '<tr><td class="num">'+(i+1)+'</td><td class="num">'+fmt(u.input)+'</td><td class="num">'+fmt(u.input_cached_tokens)+'</td><td class="num">'+fmt(u.input_cache_creation_1h)+'</td><td class="num">'+fmt(u.output)+'</td><td class="num">$'+M[i][1].total.toFixed(6)+'</td><td class="num">$'+g[1].total.toFixed(6)+'</td><td class="num">$'+chk.toFixed(6)+'</td></tr>'}).join('')+
    '<tr><td class="num"><b>Sum</b></td><td></td><td></td><td></td><td></td><td class="num"><b>$'+C2.ways.mapped.total.toFixed(6)+'</b></td><td class="num"><b>$'+C2.ways.ttl.total.toFixed(6)+'</b></td><td class="num"><b>$'+C2.result+'</b> reported</td></tr></tbody>';

  // configs
  function cfg(k){$('fobs-cfg').textContent=D.cfg[k]}
  RD.seg($('fobs-cfg-pick'),cfg);cfg('to_langfuse');
})();
