// Tab t-match: agentevals trajectory matching ported to JS (same logic as src/match_port.py), run on the five cases;
// the 400-trial grid comes from window.ATJ.meta.match (computed offline by the Python port).
(function(){
const $=id=>document.getElementById(id);const D=window.ATJ;if(!D||!$('mt-grid'))return;
const WR=new Set(['book_reservation','cancel_reservation','update_reservation_flights','update_reservation_passengers','update_reservation_baggages','send_certificate']);
const MODES=['strict','unordered','subset','superset'],ARGS=['exact','superset','subset','ignore'];
function eq(a,b){if(a===b)return true;if(typeof a!==typeof b||a===null||b===null)return false;if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;return a.every((x,i)=>eq(x,b[i]))}if(typeof a==='object'){if(Array.isArray(b))return false;const ka=Object.keys(a),kb=Object.keys(b);if(ka.length!==kb.length)return false;return ka.every(k=>k in b&&eq(a[k],b[k]))}return false}
function am(mode,o,r){if(mode==='exact')return eq(o,r);if(mode==='subset')return Object.keys(o).every(k=>k in r&&eq(r[k],o[k]));if(mode==='superset')return Object.keys(r).every(k=>k in o&&eq(o[k],r[k]));return true}
function sup(outs,refs,m){const used=new Set();for(const r of refs){let hit=false;for(let j=0;j<outs.length;j++){const o=outs[j];if(used.has(j)||o.name!==r.name)continue;if(am(m,o.args,r.args)){used.add(j);hit=true;break}}if(!hit)return false}return true}
function verdict(mode,a,outs,refs,wo){if(wo){outs=outs.filter(o=>WR.has(o.name));refs=refs.filter(r=>WR.has(r.name))}
  if(mode==='strict')return outs.length===refs.length&&outs.every((o,i)=>o.name===refs[i].name&&am(a,o.args,refs[i].args));
  if(mode==='unordered')return sup(outs,refs,a)&&sup(refs,outs,a);if(mode==='subset')return sup(refs,outs,a);return sup(outs,refs,a)}
const KEYS=Object.keys(D.cases);
const io=k=>{const c=D.cases[k];return [c.steps.filter(s=>s.k==='call').map(s=>({name:s.n,args:s.a})),c.gold.map(g=>({name:g.n,args:g.a}))]};
// all 5 x 32 verdicts, exposed for the check
const V={};KEYS.forEach(k=>{const [o,r]=io(k);MODES.forEach(m=>ARGS.forEach(a=>[0,1].forEach(w=>{V[k+'|'+m+'|'+a+'|'+w]=verdict(m,a,o,r,!!w)})))});window.ATJ_MATCH5=V;
let selM='strict',selA='exact';
function draw(){const mod=$('mt-m').value,w=$('mt-w').value,show=$('mt-s').value,M=D.meta.match;
  let h='<table class="mx"><thead><tr><th>mode \\ arguments</th>'+ARGS.map(a=>'<th>'+a+'</th>').join('')+'</tr></thead><tbody>';
  MODES.forEach(m=>{h+='<tr><td><b>'+m+'</b></td>'+ARGS.map(a=>{const x=M[mod+'|'+m+'|'+a+'|'+w];const v=show==='agree'?x[1]:x[0];const p=100*v/x[2];
    const s=(m===selM&&a===selA)?'outline:2px solid var(--acc);':'';const bg=show==='agree'?'background:color-mix(in srgb,var(--good) '+Math.round(Math.max(0,p-50)*1.4)+'%,transparent);':'';
    return '<td style="cursor:pointer;'+s+bg+'" data-m="'+m+'" data-a="'+a+'"><b>'+v+'</b><small class="mute"> / '+x[2]+'</small></td>'}).join('')+'</tr>'});
  $('mt-grid').innerHTML=h+'</tbody></table>';
  const R=window.ATJ_R.filter(r=>r.model===mod);const db=R.reduce((s,r)=>s+r.db,0);
  $('mt-ref').textContent=(show==='agree'?'Trials where the matcher\'s verdict equals the final-state verdict.':'Trials the matcher passes.')+' For reference, the final-state check passes '+db+' of '+R.length+' of these trials. Tap a cell.';
  $('mt-cases').innerHTML='<table class="mx"><thead><tr><th>Trial</th><th>'+selM+', '+selA+'</th><th>Final state</th><th>Agent calls / gold calls</th></tr></thead><tbody>'+KEYS.map(k=>{const c=D.cases[k];const v=V[k+'|'+selM+'|'+selA+'|'+w];const [o,r]=io(k);const f=w==='1'?(x=>x.filter(y=>WR.has(y.name))):(x=>x);
    return '<tr><td style="text-align:left">'+c.model.replace(' (high)','')+', task '+c.task+' · '+c.trial+'</td><td class="'+(v?'pp':'ff')+'">'+(v?'pass':'fail')+'</td><td class="'+(c.db?'pp':'ff')+'">'+(c.db?'pass':'fail')+'</td><td>'+f(o).length+' / '+f(r).length+'</td></tr>'}).join('')+'</tbody></table>';
}
['mt-m','mt-w','mt-s'].forEach(id=>$(id).onchange=draw);
$('mt-grid').onclick=e=>{const td=e.target.closest('td[data-m]');if(!td)return;selM=td.dataset.m;selA=td.dataset.a;draw()};
draw();
})();
