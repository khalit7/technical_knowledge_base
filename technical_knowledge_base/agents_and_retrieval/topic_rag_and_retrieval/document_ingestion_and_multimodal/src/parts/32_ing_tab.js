// ---- Table lab (t-ingtab): one real table, ground truth from LaTeX, each parser's output scored (data: ING.table) ----
(function(){
  const T=window.ING&&ING.table;const gtEl=document.getElementById('ing-t-gt');if(!T||!gtEl)return;
  let view='raw',par=T.order[0];
  document.getElementById('ing-t-about').innerHTML=T.about;
  document.getElementById('ing-t-img').innerHTML=T.img?'<img alt="Crop of the table in the PDF" src="'+T.img+'">':'';
  const chips=document.getElementById('ing-t-parsers');
  chips.innerHTML=T.order.map(p=>'<button data-p="'+p+'"'+(p===par?' class="on"':'')+'>'+RD.esc(T.names[p]||p)+'</button>').join('');
  chips.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;par=b.dataset.p;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  RD.seg(document.getElementById('ing-t-view'),m=>{view=m;draw()});
  const qcells=new Set((T.question_cells||[]).map(c=>c.join(',')));
  function grid(g,cls){return '<table class="tg"><tbody>'+g.map((r,i)=>'<tr>'+r.map((c,j)=>'<td class="'+((cls&&cls(i,j))||'')+(qcells.has(i+','+j)?' q':'')+'">'+RD.esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
  function draw(){
    const R=T.parsers[par];
    gtEl.innerHTML=grid(T.gt,(i,j)=>view==='grid'?(R.cell_found[i][j]?'hit':'miss'):'');
    const h=document.getElementById('ing-t-h'),out=document.getElementById('ing-t-out');
    if(view==='raw'){h.textContent=(T.names[par]||par)+': raw output';out.innerHTML='<pre class="raw">'+RD.esc(R.raw||'(nothing found for this table)')+'</pre>'}
    else if(view==='grid'){h.textContent=(T.names[par]||par)+': grid it implies';out.innerHTML=R.grid?'<div class="tw">'+grid(R.grid)+'</div>':'<p class="mute">No table structure in this output: the cells are a stream of text, so there is no grid to rebuild. Ground-truth cells are marked found if their text appears in the output at all.</p>'}
    else{h.textContent='Row serialisation of the ground truth';out.innerHTML='<pre class="raw" style="white-space:pre-wrap">'+RD.esc(T.rows.join('\n'))+'</pre><p class="small mute">Each value written with its row and column headers, the form that BM25 and an embedding model can match to a question. Built from the true grid; a parser with a correct grid gives the same lines.</p>'}
    document.getElementById('ing-t-stats').innerHTML=RD.stat('Cells whose text appears',R.cells_present+' / '+R.n_cells,'anywhere in the output')+RD.stat('Adjacency F1',R.adj_f1==null?'n/a':R.adj_f1.toFixed(2),'right and below neighbours, ICDAR 2013 style')+RD.stat('Numbers under the right headers',R.hdr_ok==null?'n/a':(100*R.hdr_ok).toFixed(0)+'%','all three header words above, right row')+RD.stat('Answer cells in the right row and column',R.q_ok+' / '+(T.question_cells||[]).length,'the cells the QASPER answer needs')+RD.stat('Output form',R.form,'');
  }
  document.getElementById('ing-t-q').innerHTML=T.question_html;
  function bars(){const el=document.getElementById('ing-t-bars');const W=1;
    el.innerHTML=T.order.map(p=>{const R=T.parsers[p],v=R.hdr_ok||0;return '<div class="row"><span class="nm">'+RD.esc(T.names[p]||p)+'</span><span class="track"><span class="fill" style="width:'+(100*v).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+(R.hdr_ok==null?'no grid':(100*v).toFixed(0)+'%')+'</span></div>'}).join('')}
  bars();document.getElementById('ing-t-note').innerHTML=T.note;
  draw();
})();
