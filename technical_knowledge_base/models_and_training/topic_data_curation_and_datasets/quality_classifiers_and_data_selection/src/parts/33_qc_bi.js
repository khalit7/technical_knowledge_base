// Bias browser, inline in Reading sections 3 and 10 (#qc-bi, #bi-edits, #bi-pairs): keep rates by topic / format / country domain, controlled edits, Nemotron-CC pairs
(function(){
  const B=window.QC&&window.QC.bi; if(!B)return;
  const $=id=>document.getElementById(id), esc=RD.esc, pc=x=>(x*100).toFixed(x<0.1&&x>0?1:0)+'%';
  let sel=null;
  function heat(l){if(!isFinite(l))return 'transparent';const a=Math.min(1,Math.abs(Math.log2(Math.max(l,0.05)))/2.5);return l>=1?'rgba(63,160,90,'+(0.1+0.55*a).toFixed(2)+')':'rgba(214,100,60,'+(0.1+0.55*a).toFixed(2)+')'}
  function table(){
    const dim=$('bi-dim').value, show=$('bi-show').value, D=B[dim];
    if(!D){$('bi-table').innerHTML='<p class="bi-note">This breakdown is not available yet (its classifier run has not been recorded).</p>';$('bi-note').innerHTML='';return}
    let h='<table><thead><tr><th>'+(dim==='tld'?'Domain':'Category')+'</th><th class="c">docs</th>'+B.cols.filter(c=>D.overall[c.key]!==undefined).map(c=>'<th class="c">'+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>';
    h+='<tr><td class="nm"><b>All</b></td><td class="c">'+D.n.toLocaleString('en-GB')+'</td>'+B.cols.filter(c=>D.overall[c.key]!==undefined).map(c=>'<td class="c"><b>'+pc(D.overall[c.key])+'</b></td>').join('')+'</tr>';
    D.rows.forEach((r,ri)=>{h+='<tr><td class="nm">'+esc(r.name)+'</td><td class="c">'+r.n.toLocaleString('en-GB')+'</td>';
      B.cols.filter(c=>D.overall[c.key]!==undefined).forEach(c=>{const v=r.keep[c.key];if(v===undefined||v===null){h+='<td class="c mute">n/a</td>';return}
        const lift=D.overall[c.key]?v/D.overall[c.key]:NaN, txt=show==='lift'?(isFinite(lift)?lift.toFixed(2)+'x':'n/a'):pc(v);
        h+='<td class="c'+(sel&&sel.d===dim&&sel.r===ri&&sel.c===c.key?' on':'')+'" data-r="'+ri+'" data-c="'+c.key+'" style="background:'+heat(lift)+'" title="'+esc(r.name)+', '+esc(c.label)+': keeps '+pc(v)+' (lift '+(isFinite(lift)?lift.toFixed(2):'n/a')+')">'+txt+'</td>'});
      h+='</tr>'});
    $('bi-table').innerHTML=h+'</tbody></table>';
    $('bi-note').innerHTML=D.note;
    $('bi-table').querySelectorAll('td.c[data-r]').forEach(td=>td.addEventListener('click',()=>{sel={d:dim,r:+td.dataset.r,c:td.dataset.c};table();docs()}));
  }
  function docs(){
    const el=$('bi-docs');if(!sel||sel.d==='tld'){el.innerHTML=sel?'<p class="bi-note">Country rows have no hand-labelled documents (they come from the 50,000-page FineWeb sample).</p>':'';return}
    const D=B[sel.d], r=D.rows[sel.r], c=B.cols.find(x=>x.key===sel.c);
    const ds=(r.docs||[]).map(i=>B.docs[i]).filter(Boolean);
    el.innerHTML='<p class="bi-note"><b>'+esc(r.name)+'</b>, '+esc(c.label)+': '+ds.length+' hand-labelled document'+(ds.length===1?'':'s')+' in this '+(sel.d==='topic'?'topic':'format')+' (labels by the agent that built this page).</p>'+
      ds.map(d=>'<div><div class="h">.'+esc(d.tld)+' · hand label: <b>'+esc(d.keep)+'</b> · '+esc(d.topic)+' / '+esc(d.format)+' · '+esc(c.label)+': '+(d.v[c.key]?'<span class="k">kept</span>':'<span class="d">dropped</span>')+'</div>'+(d.x?esc(d.x)+' ...':'<i class="mute">excerpt withheld (page about a private individual)</i>')+'<div class="h">'+esc(d.note)+'</div></div>').join('');
  }
  function edits(){
    let h='<table><thead><tr><th>Documents</th><th>Edit</th><th>Classifier</th><th class="c">mean change</th><th class="c">scores up</th><th class="c">kept before</th><th class="c">moved in</th><th class="c">moved out</th></tr></thead><tbody>';
    B.edits.forEach(e=>{h+='<tr><td>'+esc(e.set)+'</td><td>'+esc(e.edit)+'</td><td>'+esc(e.model)+'</td><td class="c">'+e.delta+'</td><td class="c">'+pc(e.up)+'</td><td class="c">'+e.kb+'</td><td class="c">'+e.inn+'</td><td class="c">'+e.out+'</td></tr>'});
    $('bi-edits').innerHTML=h+'</tbody></table>';
    if(B.pairs){let p='<table><thead><tr><th>Rewrite (Nemotron-CC)</th><th class="c">pairs</th><th class="c">FineWeb-Edu score: source → rewrite</th><th class="c">rewrite higher</th><th class="c">DCLM logit: source → rewrite</th><th class="c">rewrite higher</th></tr></thead><tbody>';
      B.pairs.rows.forEach(r=>{p+='<tr><td>'+esc(r.kind)+'</td><td class="c">'+r.n+'</td><td class="c">'+r.edu_b.toFixed(2)+' → '+r.edu_a.toFixed(2)+'</td><td class="c">'+pc(r.edu_up)+'</td><td class="c">'+r.dc_b.toFixed(1)+' → '+r.dc_a.toFixed(1)+'</td><td class="c">'+pc(r.dc_up)+'</td></tr>'});
      $('bi-pairs').innerHTML=p+'</tbody></table>';$('bi-pairs-note').innerHTML=B.pairs.note}
  }
  $('bi-dim').addEventListener('change',()=>{sel=null;table();docs()});$('bi-show').addEventListener('change',table);
  RD.onRender(()=>{table();docs()});table();edits();
})();
