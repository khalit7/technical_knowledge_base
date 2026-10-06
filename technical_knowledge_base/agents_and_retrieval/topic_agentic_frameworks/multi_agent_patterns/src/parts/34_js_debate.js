// Debate lab: method table, voting curve, transitions, the puzzle grid and one puzzle's calls.
(function(){
  const D=FMD,U=FMU,esc=RD.esc;
  if(!D.P.length)return;
  const calls={single:1,vote3:3,vote5:5,judge:4,debate:6};
  document.querySelector('#fmd-methods tbody').innerHTML=D.M.map(m=>'<tr><td>'+m.name+'</td><td class="num">'+m.right+' of '+m.n+' ('+U.nf(100*m.right/m.n,0)+'%)</td><td class="num">'+calls[m.id]+'</td><td class="num">'+U.nf(m.tok)+'</td><td class="num">'+U.nf(m.out)+'</td><td class="num">'+U.usd(m.cost)+'</td></tr>').join('');
  document.getElementById('fmd-curve').innerHTML=D.curve.map(c=>'<div class="row"><div class="nm">vote of '+c.k+'</div><div class="track"><span style="width:'+(100*c.acc).toFixed(1)+'%;background:var(--c1)"></span></div><div class="val">'+U.nf(100*c.acc,1)+'%</div></div>').join('');
  const t=D.tr,n=t.rr+t.wr+t.rw+t.ww;
  document.getElementById('fmd-trans').innerHTML=RD.stat('Right, stayed right',t.rr,'of '+n+' solver answers')+RD.stat('Wrong, fixed by debate',t.wr,'')+RD.stat('Right, talked out of it',t.rw,'')+RD.stat('Wrong, stayed wrong',t.ww,'');
  document.getElementById('fmd-transnote').textContent='Round-1 solvers agreed on one answer in '+D.unan1+' of '+D.P.length+' puzzles; after debate in '+D.unan2+', of which '+D.unanWrong2+' were unanimous and wrong. '+D.parseFail+' of '+(D.P.length*9)+' calls ended without a readable ANSWER line and count as wrong.';
  const cols=['s1','s2','s3','s4','s5','d1','d2','d3','j'];
  const meth=D.M;
  const g=document.getElementById('fmd-grid');
  g.innerHTML='<thead><tr><th>Puzzle</th>'+cols.map(c=>'<th>'+c+'</th>').join('')+meth.map(m=>'<th title="'+m.name+'">'+m.id+'</th>').join('')+'</tr></thead><tbody>'+
    D.P.map((p,i)=>'<tr data-i="'+i+'"><td class="l">'+p.id+'</td>'+cols.map(c=>D.ok(p,p.calls[c].a)?'<td class="y">&#10003;</td>':'<td class="n">&#10007;</td>').join('')+meth.map(m=>D.ok(p,m.ans(p))?'<td class="y">&#10003;</td>':'<td class="n">&#10007;</td>').join('')+'</tr>').join('')+'</tbody>';
  let cur=0;
  const diff=(a,tr)=>a?[...a].map((ch,k)=>ch===tr[k]?ch:'<b class="x">'+ch+'</b>').join('')+(a.length!==tr.length?' <span class="small mute">('+a.length+' letters)</span>':''):'<i>no answer line</i>';
  function detail(i,lab){
    const p=D.P[i];lab=lab||'s1';
    g.querySelectorAll('tr').forEach(r=>r.classList.toggle('sel',r.dataset.i===String(i)));
    const c=p.calls[lab];
    document.getElementById('fmd-detail').innerHTML='<h3>'+p.id+'</h3><pre class="fm-pre">'+esc(p.text)+'</pre><p class="fmd-ans">Truth: '+p.truth+'</p>'+
      '<div class="fmd-calls">'+cols.map(k=>'<button data-k="'+k+'" class="'+(D.ok(p,p.calls[k].a)?'ok':'bad')+(k===lab?' on':'')+'"><b>'+k+'</b> <span class="fmd-ans">'+diff(p.calls[k].a,p.truth)+'</span><br><span class="small mute">'+U.nf(p.calls[k].out)+' output tokens</span></button>').join('')+'</div>'+
      '<p class="small">End of '+lab+'\'s reply (the last characters, as recorded):</p><pre class="fm-pre">...'+esc(c.tail)+'</pre>';
  }
  g.addEventListener('click',e=>{const r=e.target.closest('tr[data-i]');if(r){cur=+r.dataset.i;detail(cur)}});
  document.getElementById('fmd-detail').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(b)detail(cur,b.dataset.k)});
  detail(0);
})();
