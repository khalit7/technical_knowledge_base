// ---- Checker lab (Reading section 6, closed block #pd-pc) ----
(function(){
const P=window.PD,E=RD.esc,$=id=>document.getElementById(id),{f0,pc}=window.PDU;const C=P.check;
const NM={last_number:'Last number',tulu_math:'Tulu 3 MATH',minerva:'Minerva sentence',boxed_exact:'Exact \\boxed{}',answer_is:'"The answer is"',math_verify:'Math-Verify 0.8.0',rec_mv:'Recorded Math-Verify (2025-02)'};
const CAT={mv_only:'Math-Verify accepts, Tulu 3 MATH rejects',tulu_only:'Tulu 3 MATH accepts, Math-Verify rejects',versions:'Math-Verify today differs from the recorded 2025 verdict',llama_rescue:'Llama judge accepted what Math-Verify rejected',thinking_vs_answer:'Reading the thinking changes Math-Verify\'s verdict',mcq:'Multiple choice: exact \\boxed{} and Math-Verify differ',all_reject:'Every checker rejects a complete answer'};
let view='answer',pairSel=null,cat='mv_only',i=0;
const cols=C.ex.concat(['rec_mv']);
function mat(){const A=C[view].agree,n=C.n;let h='<table class="hm" style="min-width:640px"><thead><tr><th class="mh"></th>'+cols.map(c=>'<th>'+E(NM[c])+'</th>').join('')+'</tr></thead><tbody>';
  cols.forEach(a=>{h+='<tr><th class="mh">'+E(NM[a])+' <small>accepts '+pc(C[view].ok[a],n,0)+'</small></th>'+cols.map(b=>{if(a===b)return '<td class="na">&middot;</td>';const v=A[a][b]/n;return '<td class="v'+(pairSel&&pairSel[0]===a&&pairSel[1]===b?' on':'')+'" data-a="'+a+'" data-b="'+b+'" style="background:color-mix(in srgb,var(--bad) '+Math.round((1-v)*120)+'%,transparent)">'+pc(A[a][b],n,0)+'</td>'}).join('')+'</tr>'});
  $('pc-mat').innerHTML=h+'</tbody></table>';
  $('pc-mat').querySelectorAll('td.v').forEach(td=>td.addEventListener('click',()=>{pairSel=[td.dataset.a,td.dataset.b];cat='pair';i=0;mat();sel();one()}))}
function qt(){const q=C[view].by_qtype;$('pc-qt').innerHTML='<table><thead><tr><th>Checker</th>'+Object.keys(q).map(k=>'<th class="num">'+E(k)+' ('+f0(C.qtype_n[k])+')</th>').join('')+'</tr></thead><tbody>'+cols.map(c=>'<tr><td>'+E(NM[c])+'</td>'+Object.keys(q).map(k=>'<td class="num">'+pc(q[k][c],C.qtype_n[k],0)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
function cats(){$('pc-cats').innerHTML='<table><thead><tr><th>Kind</th><th class="num">Generations</th></tr></thead><tbody>'+Object.keys(CAT).map(k=>'<tr><td>'+E(CAT[k])+'</td><td class="num">'+f0(C.cat_counts[k])+'</td></tr>').join('')+'</tbody></table><p class="small mute">Of the '+f0(C.llama.n)+' generations the Llama judge saw (all rejected by Math-Verify), it accepted '+f0(C.llama.true)+'; 30 of those were read by hand (section 3). At least one checker or the recorded verdict accepts '+f0(C.any_ok)+' of '+f0(C.n)+'.</p>'}
function list(){if(cat==='pair'){const [a,b]=pairSel;const V=view==='answer'?'v':'vf';return C.examples.filter(e=>a!=='rec_mv'&&b!=='rec_mv'?e[V][a][1]!==e[V][b][1]:(e[V][a==='rec_mv'?b:a][1]!==e.rec_mv))}return C.examples.filter(e=>e.cat===cat)}
function sel(){const s=$('pc-cat');s.innerHTML=Object.keys(CAT).map(k=>'<option value="'+k+'"'+(k===cat?' selected':'')+'>'+E(CAT[k])+'</option>').join('')+(pairSel?'<option value="pair"'+(cat==='pair'?' selected':'')+'>'+E(NM[pairSel[0]]+' against '+NM[pairSel[1]])+'</option>':'')}
function one(){const L=list();if(!L.length){$('pc-one').innerHTML='<p class="small">No example in the seeded set for this choice.</p>';$('pc-pos').textContent='';return}
  i=(i+L.length)%L.length;const e=L[i];$('pc-pos').textContent=(i+1)+' of '+L.length;const V=view==='answer'?e.v:e.vf;
  $('pc-one').innerHTML='<div class="small"><b>'+E(e.qtype)+'.</b> '+E(e.problem)+'</div><div class="small" style="margin:4px 0">Label: <code>'+E(e.gold)+'</code>. Recorded Math-Verify: '+(e.rec_mv?'<span class="ok">accept</span>':'<span class="no">reject</span>')+(e.llama==null?'':'; Llama judge: '+(e.llama?'<span class="ok">accept</span>':'<span class="no">reject</span>'))+'. '+f0(e.tok)+' tokens.</div>'+
    '<div class="pc-v">'+C.ex.map(x=>'<div>'+E(NM[x])+': '+(V[x][1]?'<span class="ok">accept</span>':'<span class="no">reject</span>')+' <code>'+E(V[x][0])+'</code></div>').join('')+'</div>'+
    (view==='full'&&e.think_tail?'<div class="small mute">End of the thinking:</div><div class="t">'+E(e.think_tail)+'</div>':'')+'<div class="small mute">Answer after &lt;/think&gt; (end shown):</div><div class="t">'+E(e.tail)+'</div>'}
function rl(){const r=P.rl,m=r.math,f=r['if'];const NMx={last_number:'Last number',tulu_math:'Tulu 3 MATH (Ai2\'s checker)',minerva:'Minerva sentence',boxed_exact:'Exact \\boxed{}',answer_is:'"The answer is"',math_verify:'Math-Verify 0.8.0'};
  $('pc-rl').innerHTML='<table><thead><tr><th>Math rows ('+f0(m.rows)+' prompts, '+f0(m.rollouts)+' rollouts)</th><th class="num">Accepted rollouts</th><th class="num">Prompts whose count equals Ai2\'s</th></tr></thead><tbody><tr><td>Ai2\'s recorded count</td><td class="num">'+f0(m.recorded)+'</td><td class="num">&middot;</td></tr>'+
    Object.keys(NMx).map(k=>'<tr><td>'+E(NMx[k])+'</td><td class="num">'+f0(m.ours[k])+'</td><td class="num">'+f0(m.rows_equal[k])+'</td></tr>').join('')+'</tbody></table>'+
    '<table style="margin-top:8px"><thead><tr><th>IF rows ('+f0(f.rows)+' prompts, '+f0(f.rollouts)+' rollouts)</th><th class="num">Value</th></tr></thead><tbody><tr><td>Ai2\'s recorded count</td><td class="num">'+f0(f.recorded)+'</td></tr><tr><td>Sum of partial credit here (share of constraints met)</td><td class="num">'+f.ours_partial.toFixed(1)+'</td></tr><tr><td>Rollouts meeting every constraint</td><td class="num">'+f0(f.ours_all)+'</td></tr><tr><td>Constraints per prompt (1 / 2 / 3 / 4 / 5)</td><td class="num">'+[1,2,3,4,5].map(k=>f0(f.n_constraints[k]||0)).join(' / ')+'</td></tr></tbody></table>'}
function render(){mat();qt();cats();sel();one()}
RD.seg($('pc-view'),m=>{view=m;render()});
$('pc-cat').addEventListener('change',e=>{cat=e.target.value;i=0;one()});
$('pc-prev').addEventListener('click',()=>{i--;one()});$('pc-next').addEventListener('click',()=>{i++;one()});
RD.onRender(render);
rl();render();
})();
