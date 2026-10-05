// ---- Part 2: LLM JSON lab (t-tb-zod). Data: TB.zodlab, the real output of src/tb/zodlab/lab.ts ----
(function(){
  if(!window.TB||!document.getElementById('t-tb-zod'))return;
  const esc=TBX.esc,R=TB.zodlab;
  const WAYS=[['as','JSON.parse(...) as Answer','viaCast'],['zod','z.object (unknown keys dropped)','AnswerB'],['zod strict','z.strictObject (unknown keys rejected)','AnswerC'],['zod coerce','z.coerce.number() for population','AnswerD']];
  const LBL={ok:'correct',caught:'rejected',silent:'wrong data',crash:'crashed'};
  function kind(row,c){
    if(c.threw)return 'crash';
    if(/^rejected/.test(c.out))return 'caught';
    const z=row.cells.find(x=>x.way==='zod');
    if(c.way==='as'&&z&&/^rejected/.test(z.out))return 'silent';
    return 'ok';
  }
  let sel=[3,0];
  const tbl=document.getElementById('tbz-tbl'),det=document.getElementById('tbz-det');
  function renderTable(){
    tbl.innerHTML='<thead><tr><th class="rl">Reply</th>'+WAYS.map(w=>'<th>'+esc(w[0])+'</th>').join('')+'</tr></thead><tbody>'+
      R.map((r,i)=>'<tr><th class="rl">'+esc(r.label)+'</th>'+r.cells.map((c,j)=>{const k=kind(r,c);return '<td class="cell k-'+k+(sel[0]===i&&sel[1]===j?' on':'')+'" data-i="'+i+'" data-j="'+j+'" tabindex="0" aria-label="'+esc(r.label+', '+c.way+': '+LBL[k])+'">'+LBL[k]+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
  }
  function renderDet(){
    const r=R[sel[0]],c=r.cells[sel[1]],w=WAYS[sel[1]],k=kind(r,c);
    det.innerHTML='<h3>'+esc(r.label)+' × '+esc(w[1])+'</h3><div class="tbn-lab small mute">The model replied</div><pre class="tb-code" style="border:1px solid var(--line);border-radius:8px">'+esc(r.text)+'</pre>'+
      '<div class="small mute" style="margin-top:6px">The program printed ('+LBL[k]+')</div><pre class="tb-term" style="border-radius:8px">'+(c.threw?'<span class="e">'+esc(c.out)+'</span>':esc(c.out))+'</pre>'+
      '<div class="small">'+explain(r,c,k)+'</div>';
  }
  function explain(r,c,k){
    if(k==='crash')return 'The cast promised an <code>Answer</code>; the value was not one, and the first property access on it threw. With a schema this is a rejection you can handle.';
    if(k==='silent')return 'No error anywhere, and the output is wrong: <code>toLocaleString</code> exists on strings too, so a string where the type says number went straight through. This is the worst outcome, because nothing tells you.';
    if(k==='caught'&&/not JSON/.test(c.out))return 'Not valid JSON at all, so <code>JSON.parse</code> threw inside the <code>try</code>. Common causes: the reply hit the token limit, or the model wrote JavaScript-style JSON. Retry, or ask for a shorter answer.';
    if(k==='caught')return 'The schema rejected the value and says which field and why: a message you can send back to the model ("population must be a number") for a corrected reply.';
    if(c.way==='zod coerce'&&R[sel[0]].cells.find(x=>x.way==='zod').out.startsWith('rejected'))return 'Coercion ran <code>Number("2100000")</code> first, so the string became a number. Convenient, but <code>Number</code> also turns <code>""</code> into 0 and <code>"2.1 million"</code> into NaN (rejected, see that row).';
    return 'Read and validated: the value matches the schema, and from here on its type is true.';
  }
  function renderSum(){
    document.getElementById('tbz-sum').innerHTML=WAYS.map((w,j)=>{const n={ok:0,caught:0,silent:0,crash:0};R.forEach(r=>n[kind(r,r.cells[j])]++);
      return '<div><b>'+esc(w[0])+'</b><br>'+['ok','caught','silent','crash'].filter(k=>n[k]).map(k=>n[k]+' '+LBL[k]).join(', ')+'</div>'}).join('');
  }
  tbl.addEventListener('click',e=>{const td=e.target.closest('td.cell');if(!td)return;sel=[+td.dataset.i,+td.dataset.j];renderTable();renderDet()});
  tbl.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const td=e.target.closest('td.cell');if(!td)return;e.preventDefault();sel=[+td.dataset.i,+td.dataset.j];renderTable();renderDet();
    const n=tbl.querySelector('td.cell.on');if(n)n.focus()});
  document.getElementById('tbz-src').innerHTML='<pre class="tb-code" style="border:1px solid var(--line);border-radius:8px">'+TBX.hl(TB.zodlabSrc.replace(/\n$/,''))+'</pre>';
  renderTable();renderDet();renderSum();
})();
