// ---- Output modes lab ----
(function(){
const F=window.FT,E=RD.esc,U=window.FTU;
let run='all',sel=null;
const filt=a=>a.filter(r=>run==='all'||r.run==='once'||(run==='greedy'?r.run==='greedy':r.run.startsWith('t07')));
const R=U.by(F.so,'route');
const ids=U.ORDER[0].concat(U.ORDER[1]);
function table(){U.soTable(document.getElementById('ftyped-m-tbl'),{run:run==='t07'?null:run});
  if(run==='t07'){const el=document.getElementById('ftyped-m-tbl');const a=F.so.filter(r=>r.run.startsWith('t07')||r.run==='once');
    // rebuild with sampled rows only
    const keep={};a.forEach(r=>(keep[r.route]=keep[r.route]||[]).push(r));
    let h='<thead><tr><th>Route</th><th class="num">runs</th><th class="num">valid</th><th class="num">right function</th><th class="num">model calls per run</th></tr></thead><tbody>';
    ids.forEach(id=>{const x=keep[id];if(!x)return;const n=x.length,v=U.cnt(x,'valid');h+='<tr><td>'+E(U.routeLabel(id))+'</td><td class="num">'+n+'</td><td class="num"><span class="pill '+(v===n?'ok':v===0?'bad':'mid')+'">'+v+'/'+n+'</span></td><td class="num">'+U.cnt(x,'function_ok')+'/'+n+'</td><td class="num">'+(U.mean(x.map(r=>r.calls))||0).toFixed(1)+'</td></tr>'});
    el.innerHTML=h+'</tbody>'}}
function hm(){const t=document.getElementById('ftyped-m-hm');
  let h='<thead><tr><th class="mh">Route</th>'+F.cases.map(c=>'<th>'+E(c.id)+'<small>'+E(c.category.replace('_',' '))+'</small></th>').join('')+'</tr></thead><tbody>';
  ids.forEach(id=>{const a=filt(R[id]||[]);if(!a.length)return;const bc=U.by(a,'case');
    h+='<tr><th class="mh">'+E(U.routeLabel(id))+'</th>'+F.cases.map(c=>{const x=bc[c.id]||[];if(!x.length)return '<td class="na">n/a</td>';const v=U.cnt(x,'valid'),f=x.length;
      const col=v===f?'var(--open2)':v===0?'color-mix(in srgb,var(--bad) 30%,transparent)':'color-mix(in srgb,var(--c5) 30%,transparent)';
      return '<td class="v'+(sel&&sel[0]===id&&sel[1]===c.id?' on':'')+'" data-r="'+id+'" data-c="'+c.id+'" style="background:'+col+'" title="'+E(U.routeLabel(id)+', '+c.id)+'">'+v+'/'+f+'</td>'}).join('')+'</tr>'});
  t.innerHTML=h+'</tbody>'}
function det(){const d=document.getElementById('ftyped-m-det');if(!sel){d.innerHTML='<p class="small mute">No cell selected.</p>';return}
  const [id,cid]=sel,w=F.wire[id]||{cases:{}},c=w.cases[cid];const all=(R[id]||[]).filter(r=>r.case===cid);
  let h='<b>'+E(U.routeLabel(id))+'</b>, case <code>'+E(cid)+'</code>';
  h+='<div class="runs small">'+all.map(r=>'<span>'+E(r.run)+': <span class="pill '+(r.valid?'ok':'bad')+'">'+(r.valid?'valid':'failed')+'</span> '+r.calls+' call'+(r.calls===1?'':'s')+(r.err?' ('+E(r.err)+')':'')+'</span>').join('')+'</div>';
  if(w.req)h+='<h4>Request (greedy run; where the schema sits)</h4><pre>'+E(w.req)+'</pre>';
  if(c){h+='<h4>First reply</h4><pre>'+E(c.reply)+'</pre>';if(c.retry)h+='<h4>Retry message sent back</h4><pre>'+E(c.retry)+'</pre>';if(c.reply2)h+='<h4>Second reply</h4><pre>'+E(c.reply2)+'</pre>';
    h+='<h4>Result</h4><pre>'+(c.valid?E(JSON.stringify(c.obj,null,1)):'none: '+E(c.err||''))+'</pre>'}
  d.innerHTML=h}
function claude(){const t=document.getElementById('ftyped-m-claude');
  let h='<thead><tr><th>Route</th><th class="num">valid</th><th class="num">turns</th><th class="num">input tokens, mean</th><th class="num">output tokens, mean</th><th class="num">replies with thinking</th><th class="num">API-equivalent, 10 runs</th></tr></thead><tbody>';
  U.ORDER[1].forEach(id=>{const a=R[id]||[];if(!a.length)return;h+='<tr><td>'+E(U.routeLabel(id))+'</td><td class="num">'+U.cnt(a,'valid')+'/'+a.length+'</td><td class="num">'+U.mean(a.map(r=>r.calls)).toFixed(0)+'</td><td class="num">'+U.fmt(U.mean(a.map(r=>r.pt0)))+'</td><td class="num">'+U.fmt(U.mean(a.map(r=>r.ct)))+'</td><td class="num">'+a.filter(r=>r.thinking).length+'/'+a.length+'</td><td class="num">$'+a.reduce((s,r)=>s+(r.cost||0),0).toFixed(4)+'</td></tr>'});
  t.innerHTML=h+'</tbody>'}
function val(){const t=document.getElementById('ftyped-m-val');
  t.innerHTML='<thead><tr><th>Pass</th><th>Case</th><th>Result</th><th class="num">calls</th><th>Retry prompts the validator (or schema) sent</th></tr></thead><tbody>'+F.val.map(r=>'<tr><td>'+E(r.run)+'</td><td><code>'+E(r.case)+'</code></td><td><span class="pill '+(r.valid?'ok':'bad')+'">'+(r.valid?'valid':'failed')+'</span>'+(r.valid&&!r.function_ok?' <span class="pill mid">wrong function</span>':'')+'</td><td class="num">'+r.calls+'</td><td class="small">'+(r.retries.length?r.retries.map(E).join('<br>'):'none')+(r.err?'<br>'+E(r.err):'')+'</td></tr>').join('')+'</tbody>'}
function cases(){const s=document.getElementById('ftyped-m-case');s.innerHTML=F.cases.map(c=>'<option>'+E(c.id)+'</option>').join('');
  const show=()=>{const c=F.cases.find(x=>x.id===s.value);document.getElementById('ftyped-m-casebox').innerHTML='<p class="small">Ground truth: function <code>'+E(c.function)+'</code>, category <code>'+E(c.category)+'</code>, failing test <code>'+E(c.failing_test)+'</code>.</p><h4>mod.py</h4><pre>'+E(c.code)+'</pre><h4>Real test output</h4><pre>'+E(c.test_output)+'</pre>'};
  s.addEventListener('change',show);show()}
document.getElementById('ftyped-m-hm').addEventListener('click',e=>{const td=e.target.closest('td.v');if(!td)return;sel=[td.dataset.r,td.dataset.c];hm();det()});
RD.seg(document.getElementById('ftyped-m-run'),m=>{run=m;table();hm()});
sel=['pai_native',F.cases[0].id];
table();hm();det();claude();val();cases();
})();
