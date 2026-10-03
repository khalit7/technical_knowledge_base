// ---- The paper's tables tab ----
(function(){
const TB=PAPER.tables,RC=PAPER.rc,f=s=>s==='-'?null:parseFloat(String(s).replace(/,/g,''));
const td=(v,cls)=>'<td class="num'+(cls?' '+cls:'')+'">'+v+'</td>';
function t3(){const V=$('t3V').value,Cs=$('t3C').value;const cols=TB.t3.cols.map((c,i)=>({c,i})).filter(x=>Cs==='all'||x.i<6);
  let h='<thead><tr><th>Benchmark</th>'+cols.map(x=>'<th class="num">'+x.c[0].replace(' 26B A4B','')+'<br><span class="mute">'+x.c[1]+'</span></th>').join('')+'</tr></thead><tbody>';
  TB.t3.rows.forEach(r=>{const isMeta=/Output Speed|Tokens Per Forward|Average Total/.test(r.b);h+='<tr><td>'+r.b+(/Natural2Code|HiddenMath/.test(r.b)?' <span class="mute">(internal)</span>':'')+'</td>';
    cols.forEach(x=>{const v=r.v[x.i];if(V==='delta'&&!isMeta&&x.i!==4&&x.i!==5){const base=f(r.v[/No-think/.test(x.c[1])?5:4]),me=f(v);h+=td(me==null||base==null?'-':((me-base>0?'+':'')+(me-base).toFixed(r.b==='Codeforces ELO'?0:1)),me!=null&&base!=null&&me<base?'mute':'')}else h+=td(v)});h+='</tr>'});
  $('t3').innerHTML=h+'</tbody>';$('t3N').innerHTML=TB.t3.note+' Source: Table 3, arXiv HTML.'}
['t3V','t3C'].forEach(id=>$(id).addEventListener('change',t3));
function t4(){const o=+$('t4M').value,s=+$('t4S').value;const D={};RC.t4.forEach(x=>D[x.b]=x);
  let rows=TB.t4.rows.slice();if(s>=0)rows.sort((a,b)=>f(b.v[2*s+o])-f(a.v[2*s+o]));
  let h='<thead><tr><th>Benchmark</th>'+TB.t4.metrics.map(m=>'<th class="num">'+m+'</th>').join('')+(o===0?'<th class="num">tokens / E2E</th><th class="num">ms per pass</th><th class="num">tokens / forwards</th><th class="num">256 / (DNS + 1)</th>':'')+'</tr></thead><tbody>';
  rows.forEach(r=>{h+='<tr><td>'+r.b+'</td>'+TB.t4.metrics.map((m,i)=>td(r.v[2*i+o])).join('');
    if(o===0){const d=D[r.b];h+=td(d.tok_over_e2e.toFixed(0))+td(d.ms_per_fwd.toFixed(1))+td(d.tok_over_fw.toFixed(1))+td(d.tpf_from_dns.toFixed(1))}h+='</tr>'});
  $('t4').innerHTML=h+'</tbody>'}
['t4M','t4S'].forEach(id=>$(id).addEventListener('change',t4));
function chk(){let h='<thead><tr><th>Check</th><th>Recomputed</th><th>Paper</th><th>Verdict</th></tr></thead><tbody>';
  RC.checks.forEach(c=>{h+='<tr><td>'+c.name+' <a class="small" href="'+PAPER.meta.ax+'#'+c.at+'" target="_blank" rel="noopener noreferrer">(source)</a><div class="small mute">'+c.how+'</div></td><td>'+c.ours+'</td><td>'+c.paper+'</td><td>'+(c.ok===null?'<span class="mute">context</span>':c.ok?'<span class="ok">agrees</span>':'<span class="no">does not</span>')+'</td></tr>'});
  $('chk').innerHTML=h+'</tbody>'}
function small(){const F=RC.f11;let h='<thead><tr><th>Operation</th><th class="num">Gemma 4 AR (ms)</th><th class="num">DiffusionGemma (ms)</th><th class="num">Printed ratio</th></tr></thead><tbody>';
  F.ops.forEach((o,i)=>{h+='<tr><td>'+o+'</td>'+td(F.ar[i].toFixed(2)+(i===6?' (derived)':''))+td(F.dg[i].toFixed(2)+(i===6?' (derived)':''))+td('×'+F.ratio[i])+'</tr>'});
  h+='<tr><td><b>Total</b></td>'+td('<b>4.01</b>')+td('<b>12.63</b>')+td('×3.2')+'</tr>';$('f11').innerHTML=h+'</tbody>';
  $('t1').innerHTML='<thead><tr><th colspan="2">Table 1: parameters</th></tr></thead><tbody>'+TB.t1.map(r=>'<tr><td>'+r[0]+'</td>'+td(r[1])+'</tr>').join('')+'</tbody>';
  $('t2').innerHTML='<thead><tr><th colspan="2">Table 2: sampler defaults</th></tr></thead><tbody>'+TB.t2.map(r=>'<tr><td>'+r[0]+'</td>'+td(r[1])+'</tr>').join('')+'</tbody>';
  $('t5').innerHTML='<thead><tr><th>Table 5: Sudoku</th><th class="num">Denoising steps</th><th class="num">Accuracy (%)</th></tr></thead><tbody>'+TB.t5.map(r=>'<tr><td>'+r[0]+'</td>'+td(r[1])+td(r[2])+'</tr>').join('')+'</tbody>';
  $('t6').innerHTML='<thead><tr><th>Table 6: PubMedQA</th><th class="num">Effective steps</th><th class="num">Accuracy (%)</th><th class="num">BLEU</th></tr></thead><tbody>'+TB.t6.map(r=>'<tr><td>'+r[0]+'</td>'+td(r[1])+td(r[2])+td(r[3])+'</tr>').join('')+'</tbody>';
  $('t7').innerHTML='<thead><tr><th>Table 7</th>'+TB.t7.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+TB.t7.rows.map(r=>'<tr>'+r.map((c,i)=>i?'<td>'+c+'</td>':'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>'}
onTab('t-tables',()=>{t3();t4();chk();small()});
})();
