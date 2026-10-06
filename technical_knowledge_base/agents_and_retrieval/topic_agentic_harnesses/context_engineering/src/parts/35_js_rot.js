// ---- Needle lab: grids of graded replies ----
(function(){
const root=document.getElementById('t-rot');if(!root)return;
const H=window.HCTX,E=RD.esc,$=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const DATA={haiku:H.needle_haiku,local:H.needle_local};
const TN={lit:'Literal',nolit:'Non-literal',track:'Tracking',know:'Knowledge check'};
function grid(m){
  const D=DATA[m];
  if(!D||!D.rows.length){$('hnr-grid').innerHTML='<p class="mute">No results for this model.</p>';$('hnr-sum').innerHTML='';$('hnr-note').textContent='';return}
  const R=D.rows.filter(r=>r.task!=='know');
  const lens=[...new Set(R.map(r=>r.target))].sort((a,b)=>a-b);
  const tok=t=>{const x=R.filter(r=>r.target===t&&r.input_tokens).map(r=>r.input_tokens);return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length):null};
  const rowsDef=[];
  ['lit','nolit'].forEach(t=>{[...new Set(R.filter(r=>r.task===t).map(r=>r.depth))].sort((a,b)=>a-b).forEach(d=>rowsDef.push({t,d,lab:TN[t]+', depth '+Math.round(d*100)+'%',find:r=>r.task===t&&r.depth===d}))});
  [...new Set(R.filter(r=>r.task==='track').map(r=>r.id.split('_s')[1]))].sort((a,b)=>a-b).forEach(s=>rowsDef.push({t:'track',lab:'Tracking, seed '+s,find:r=>r.task==='track'&&r.id.endsWith('_s'+s)}));
  let h='<div class="tw"><table class="hnr"><thead><tr><th></th>'+lens.map(t=>'<th>'+(tok(t)?fmt(tok(t)):'')+'<br><span style="font-weight:400">tokens</span></th>').join('')+'</tr></thead><tbody>';
  rowsDef.forEach(rd=>{h+='<tr><th class="r">'+rd.lab+'</th>'+lens.map(t=>{const r=R.find(x=>x.target===t&&rd.find(x));
    if(!r)return '<td class="na">-</td>';return '<td class="'+(r.ok?'ok':'no')+'" data-id="'+r.id+'" tabindex="0" title="'+E(r.id)+'">'+(r.ok?'&#10003;':'&#10007;')+'</td>'}).join('')+'</tr>'});
  h+='</tbody></table></div>';
  $('hnr-grid').innerHTML=h;
  const kn=D.rows.find(r=>r.task==='know');
  $('hnr-note').innerHTML='Green: right; red: wrong. Columns: haystack length (mean measured prompt tokens). '+(kn?'Knowledge check with no haystack ("In which city is the Semperoper?"): '+(kn.ok?'answered Dresden':'wrong: '+E(kn.reply.slice(0,60)))+'.':'');
  // summary
  const sum=['lit','nolit','track'].map(t=>'<tr><td>'+TN[t]+'</td>'+lens.map(L=>{const x=R.filter(r=>r.task===t&&r.target===L);return '<td class="num">'+(x.length?x.filter(r=>r.ok).length+' / '+x.length:'-')+'</td>'}).join('')+'</tr>').join('');
  $('hnr-sum').innerHTML='<div class="tw"><table class="hc-t"><thead><tr><th>Right answers</th>'+lens.map(t=>'<th class="num">'+(tok(t)?fmt(tok(t)):'')+' tokens</th>').join('')+'</tr></thead><tbody>'+sum+'</tbody></table></div>';
}
let cur='haiku';
$('hnr-grid').addEventListener('click',e=>{const td=e.target.closest('td[data-id]');if(!td)return;
  $('hnr-grid').querySelectorAll('td.on').forEach(x=>x.classList.remove('on'));td.classList.add('on');
  const r=DATA[cur].rows.find(x=>x.id===td.dataset.id);
  $('hnr-rep').innerHTML='<b>'+E(TN[r.task])+', '+fmt(r.input_tokens||0)+' tokens'+(r.depth!=null?', depth '+Math.round(r.depth*100)+'%':'')+'.</b> Expected: '+E(r.answer)+(r.values_in_order?' (assignments in order: '+r.values_in_order.join(', ')+')':'')+(r.final!=null?'; graded answer: '+E(r.final):'')+(r.listed?'; the reply listed '+r.listed+' of the 5 assignments':'')+'\nReply: '+E(r.reply||'(none)')});
RD.seg($('hnr-model'),m=>{cur=m;grid(m);$('hnr-rep').textContent='Click a cell to read the model\'s reply.'});
grid('haiku');
})();
