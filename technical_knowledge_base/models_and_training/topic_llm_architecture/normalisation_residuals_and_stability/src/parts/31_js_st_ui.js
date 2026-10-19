// ---- Stability explorer (t-stab): grid of recorded runs, up to three overlaid ----
(function(){
  const D=window.NSD,C=window.NSC,$=id=>document.getElementById(id);
  if(!D||!C||!$('st-grid'))return;
  const COLS=['var(--c1)','var(--c2)','var(--c3)'];
  const lrs=D.grid.lrs,sel=[];
  const cls=v=>v===null?'bad':v<D.grid.ok?'ok':v<D.grid.bad?'meh':'bad';
  const lrTxt=v=>({0.0003:'3e-4',0.001:'1e-3',0.003:'3e-3',0.01:'1e-2',0.03:'3e-2'}[v]||String(v));
  function table(){
    let h='<thead><tr><th></th>'+lrs.map(l=>'<th>lr '+lrTxt(l)+'</th>').join('')+'</tr></thead><tbody>';
    D.grid.rows.forEach(r=>{h+='<tr><th class="rl">'+C.esc(r.label)+'</th>';
      lrs.forEach(l=>{const c=r.cells[lrTxt(l)];
        if(!c){h+='<td></td>';return}
        if(c.nr){h+='<td><span class="st-cell nr" style="display:block" title="'+C.esc(c.nr)+'">not run<small>'+C.esc(c.short||'')+'</small></span></td>';return}
        const R=D.runs[c.run];
        h+='<td><button class="st-cell '+cls(R.final)+(sel.includes(c.run)?' sel':'')+'" data-run="'+c.run+'" aria-pressed="'+sel.includes(c.run)+'">'+(R.status==='diverged'?'diverged':C.fmt(R.final,3))+'<small>'+(R.lab==='bl'?'Block lab':R.note||'&nbsp;')+'</small></button></td>'});
      h+='</tr>'});
    $('st-grid').innerHTML=h+'</tbody>'}
  function color(i){return COLS[i%3]}
  function draw(){
    table();
    const rs=sel.map(n=>D.runs[n]);
    $('st-sel').innerHTML=rs.length?rs.map((R,i)=>'<div class="run" style="--sw:'+color(i)+'"><b>'+C.esc(R.label)+'</b> <span class="mute">('+C.esc(R.name)+')</span>: final held-out '+C.fmt(R.final,3)+', '+(R.status==='done'?'1,500 steps':C.esc(R.status))+(R.ml?', largest attention logit '+C.fmt(R.ml_max)+' (peak, step '+R.ml_at+'), '+C.fmt(R.ml_end)+' at the end':', attention logits not recorded')+'. '+C.esc(R.say||'')+'</div>').join(''):'<p class="small mute">Nothing selected.</p>';
    const ser=k=>rs.map((R,i)=>({name:R.label,color:color(i),pts:R[k]||[]}));
    C.line($('st-ev'),ser('ev'),{xmax:1500,ymin:2,ymax:8.5,xl:'step',hline:[{y:D.grid.unigram,label:'unigram floor'}],label:'held-out loss'});
    const ml=ser('ml').filter(s=>s.pts.length);
    if(ml.length)C.line($('st-ml'),ml,{xmax:1500,log:true,ymin:1,ymax:Math.max(100,...[].concat(...ml.map(s=>s.pts.map(p=>p[1]))))*1.2,xl:'step',label:'largest attention logit'});else $('st-ml').innerHTML='<p class="small mute">Not recorded for the selected runs.</p>';
    C.line($('st-gn'),ser('gn'),{xmax:1500,log:true,ymin:0.01,ymax:Math.max(10,...[].concat(...rs.map(R=>(R.gn||[]).map(p=>p[1]||0))))*1.2,xl:'step',label:'gradient norm'});
    const lz=ser('lz').filter(s=>s.pts.length);
    if(lz.length)C.line($('st-lz'),lz,{xmax:1500,xl:'step',label:'log Z'});else $('st-lz').innerHTML='<p class="small mute">Not recorded for the selected runs.</p>';
  }
  $('st-grid').addEventListener('click',e=>{const b=e.target.closest('button[data-run]');if(!b)return;const n=b.dataset.run,i=sel.indexOf(n);
    if(i>=0)sel.splice(i,1);else{sel.push(n);if(sel.length>3)sel.shift()}draw()});
  D.grid.start.forEach(n=>sel.push(n));
  C.onTab('t-stab',draw);C.onResize('t-stab',draw);
})();
