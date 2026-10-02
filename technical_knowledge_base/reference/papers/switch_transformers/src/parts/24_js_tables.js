// ---- Tables tab: Table 9 recount, Tables 1, 5 to 8, the small tables and the checks ----
(function(){const R=RC.recount,AX=window.PAPER.meta.ax;
  const B=v=>v>=1e12?(v/1e12).toFixed(2)+'T':v>=1e9?(v/1e9).toFixed(v>=1e11?1:v>=1e10?2:3)+'B':(v/1e6).toFixed(1)+'M';
  const pct=v=>(v>=0?'+':'')+(100*v).toFixed(1)+'%';
  const tbl=(head,rows,cls)=>'<table class="lt'+(cls?' '+cls:'')+'"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  const ok=(v,tol)=>Math.abs(v)<=tol?'<span class="ok">'+pct(v)+'</span>':'<span class="no">'+pct(v)+'</span>';
  // Table 9 recount
  function t9(){const withR=$('tb9R').checked;const rows=TB.T9.rows.map(r=>{const x=R[r[0]],fl=withR?x.flops_router:x.flops;
      return [r[0],r[1]+(x.exact_src?' <span class="small mute">('+x.exact_src+')</span>':''),B(x.params)+' '+ok(x.params_vs_printed,0.01),x.released_params?B(x.released_params)+' '+ok(x.released_vs_printed,0.01):'same',r[2],B(fl)+' '+ok(fl/x.printed_flops-1,0.01),x.released_flops?B(x.released_flops)+' '+ok(x.released_flops_vs_printed,0.01):'same',x.router_over_expert_flops?(100*x.router_over_expert_flops).toFixed(1)+'%':'']});
    $('tb9T').innerHTML=tbl(['Model','Params, printed','Recount, Table 9 row','Recount, released config','FLOPs/seq, printed','Recount, Table 9 row','Released','Router / one expert'],rows);
    $('tb9Rep').innerHTML='<b>Reproduces independently</b>: T5-Base ('+B(R['T5-Base'].params)+' against the text\'s 223M; 124.6B FLOPs against 124B), T5-XXL (11.0B, 6.26T), Switch-Base (7.415B against Table 8\'s 7,410M), Switch-C (1,571.3B against 1,571B; 894B against 890B, only with the router left out: counting it adds '+B(R['Switch-C'].flops_router-R['Switch-C'].flops)+', because at 2,048 experts the router costs '+(100*R['Switch-C'].router_over_expert_flops).toFixed(0)+'% of one expert\'s FLOPs, not the "lightweight" share it is at 128). '+
      '<b>Does not reproduce from the printed row</b>: T5-Large and Switch-Large with GEGLU and <i>d</i><sub>ff</sub> 2816 come out at 750M and 27.1B with 433B FLOPs; the released ReLU FFN with <i>d</i><sub>ff</sub> 4096 gives 738M (the text says 739M), 26.3B and 424.9B, so the table\'s FFN columns describe a different variant from the one counted. Switch-XXL with Table 9\'s 64 experts counts to 201.3B, half the printed 395B; with the released 128 experts it is 394.5B. Switch-C\'s released configuration has 30 heads, not 32, which gives 869B FLOPs.';
    const q=TB.T9.rows.map(r=>{const m=r[0].replace(/^(T5|Switch)-/,''),d=TB.T9.rows.find(x=>x[0]==='T5-'+(m==='C'?'XXL':m));const a=+r[11]-+d[11],b=+r[12]-+d[12];
      return [r[0],r[11],r[12],/^Switch/.test(r[0])?(a>=0?'+':'')+a.toFixed(3)+' / '+(b>=0?'+':'')+b.toFixed(3)+' against '+d[0]:'']});
    $('tb9Q').innerHTML=tbl(['Model','Neg. Log Perp. @250k','@500k','Gain over T5 (Switch-C against T5-XXL, not FLOP-matched)'],q)}
  $('tb9R').onchange=t9;t9();
  // Table 1
  let m1='all';function t1(){const r=TB.T1.rows;if(m1==='all'){$('tb1T').innerHTML=tbl(TB.T1.cols,r.map(x=>x.map(v=>v||'n/a')));return}
    const P=[['2.0',2,3],['1.25',4,5],['1.0',6,7]].map(([cf,a,b])=>{const M=r[a],S=r[b],dq=+S[2]-+M[2],dt=+S[3]-+M[3],ds=+S[4]-+M[4];
      return [cf,M[2]+' / '+S[2],(dq>=0?'+':'')+dq.toFixed(3),M[3]+' / '+S[3],(dt>=0?'+':'')+dt.toFixed(1)+' h',M[4]+' / '+S[4],(ds>=0?'+':'')+ds]});
    $('tb1T').innerHTML=tbl(['Capacity factor','Quality, MoE / Switch','Δ quality','Hours, MoE / Switch','Δ hours','Speed, MoE / Switch','Δ ex/s'],P)+'<p class="small">Switch is better per step at 1.25 and 1.0 and worse at 2.0, by 0.006 to 0.011; faster to the threshold at 1.25 and 1.0 and slower at 2.0. Switch-Base at 1.25 against T5-Large: '+RC.ratios.table1_time_t5large_over_switch125.toFixed(2)+'x less time.</p>'}
  segBind('tb1M',m=>{m1=m;t1()});t1();
  // Table 5 with deltas, sortable
  let sortCol=-1;function t5(){const cols=TB.T5.cols.slice(1),rows=TB.T5.rows,D=RC.t5_diff;
    let idx=cols.map((c,i)=>i);if(sortCol>=0)idx.sort((a,b)=>D.base[cols[b]]-D.base[cols[a]]);
    const head=['Task'].concat(rows.map(r=>r[0])).concat(['Δ Base','Δ Large']);
    const body=idx.map(i=>{const c=cols[i],db=D.base[c],dl=D.large[c],cl=v=>v>0?'<span class="ok">+'+v.toFixed(1)+'</span>':v<0?'<span class="no">'+v.toFixed(1)+'</span>':'0.0';return [c].concat(rows.map(r=>r[1+i])).concat([cl(db),cl(dl)])});
    $('tb5T').innerHTML='<button id="tb5S" class="small" style="margin-bottom:4px">'+(sortCol>=0?'Paper order':'Sort by Δ Base')+'</button>'+tbl(head,body);$('tb5S').onclick=()=>{sortCol=sortCol>=0?-1:1;t5()}}
  t5();
  // Tables 6 to 8
  function t67(){const s02=$('tb7S').checked;const r6=TB.T6.rows,t6=RC.t6;
    let h='<p class="small" style="margin:4px 0"><b>Table 6</b> (share of the gap between T5-Base −1.636 and Switch-Base −1.444):</p>'+tbl(['Technique','Neg. Log Perp.','Printed share','Recomputed'],[[r6[2][0],r6[2][2],r6[2][3],t6.distill+'%'],[r6[3][0],r6[3][2],r6[3][3],t6.init+'%'],[r6[4][0],r6[4][2],r6[4][3],t6.mix+'%'],[r6[5][0],r6[5][2],'',(100*(-1.639+1.636)/(-1.444+1.636)).toFixed(1)+'% (no distillation)']]);
    h+='<p class="small" style="margin:8px 0 4px"><b>Table 7</b>:</p>'+tbl(['Teacher','Teacher NLP','Distilled NLP','Printed share','Recomputed','Printed compression','Recomputed'],RC.t7.map((x,i)=>{const r=TB.T7.rows[i],c=s02?x.compress_02B:x.compress_223M,d=Math.abs(c-x.compress_printed);
      return [r[0],r[1],r[2],r[3],x.share+'%',r[4],(d<=0.5?'<span class="ok">':'<span class="no">')+c.toFixed(1)+'%</span>']}));
    h+='<p class="small" style="margin:8px 0 4px"><b>Table 8</b>: (76.6 − 74.6) / (81.3 − 74.6) = '+RC.t8+'%, printed 30%; compression 1 − 223 / 7,410 = '+RC.t8_compress+'%, printed 97%.</p>';
    $('tb67T').innerHTML=h;$('tb67Rep').innerHTML='Every share reproduces to the printed precision. Compression with a 223M student comes out 79.7%, 88.8% and 94.1% for the first three teachers against the printed 82%, 90% and 95%; with the student counted as 0.2B (Table 9\'s rounding) all five match. The text\'s "≈1/20th of the parameters" is 223M / 3.8B = 1/'+RC.ratios.distill_teacher_over_student.toFixed(0)+'; Table 6\'s caption says "100x more parameters".'}
  $('tb7S').onchange=t67;t67();
  // small tables
  const sm=['T2','T3','T4','T10','T11'].map(k=>'<p class="small" style="margin:10px 0 4px"><b>'+k.replace('T','Table ')+'</b>: '+escH(TB[k].title)+' ('+A(AX+'#'+TB[k].at,'in the paper')+')</p>'+tbl(TB[k].cols,TB[k].rows.map(r=>r.map(v=>v||'n/a')))).join('');
  $('tbSmallT').innerHTML=sm+'<p class="small">Table 3 is the only result with seeds: the mean gap is '+RC.t3.diff+' with a standard error of '+RC.t3.se+' (t = '+RC.t3.t+' on two degrees of freedom), so its firm finding is the spread (0.01 against 0.68). Table 11\'s caption says "lower is better"; for negative log perplexity higher is better, and the text picks the highest (input jitter).</p>';
  // checks
  const H='holds',HR='holds by rounding',NO='does not hold';const r=RC.ratios,g=RC.t9_gaps;
  const C=[['T5-Base has 223M parameters (§4.1)','recount '+B(R['T5-Base'].params)+' (tied embeddings)',H],
    ['T5-Large has 739M parameters (§4.1)','Table 9 row (GEGLU, 2816): '+B(R['T5-Large'].params)+'; released ReLU 4096: '+B(R['T5-Large'].released_params),HR+' (released config only)'],
    ['T5-Base 124B, T5-Large 425B FLOPs per sequence (Table 9)','124.6B; 432.8B from the row, 424.9B from the released config',HR],
    ['T5-Large applies 3.5x more FLOPs per token (§3.3)','425 / 124 = '+r.large_over_base_flops_printed.toFixed(2),HR],
    ['Switch-XXL has 395B parameters with 64 experts (Table 9)','64 experts: 201.3B; 128 (released): 394.5B',NO+' as printed'],
    ['Switch-C has 1,571B parameters and 890B FLOPs (Table 9)','1,571.3B; 894.0B without the router (974B with it)',H],
    ['Switch-XXL has "nearly 10x" Switch-C\'s FLOPs (§5.6), "≈10x" (§8)','6.3T / 890B = '+r.xxl_over_c_flops_printed.toFixed(1)+'x',NO],
    ['"≈4x less unique parameters (395B vs 1.6T)" (§8)','1,571 / 395 = '+r.c_over_xxl_params_printed.toFixed(2),H],
    ['Both large Switch models beat T5-XXL by "over 0.061" at 250k (§5.6)','Switch-XXL +'+g.xxl_250k+', Switch-C +'+g.c_250k,NO+' for Switch-C'],
    ['T5-XXL gains 0.052 from 250k to 500k; Switch-XXL leads by 0.087 at 500k','+'+g.t5xxl_250k_to_500k+'; +'+g.xxl_500k,H],
    ['7.5x step speedup: T5-Base at 450k equals Switch-Base 64 at 60k (§3.1)','450 / 60 = 7.5 (both readings from Figure 4)',H+' (by construction)'],
    ['576B pretraining tokens: 2<sup>20</sup> per batch for 550k steps (§4.1)',(r.pretrain_tokens/1e9).toFixed(1)+'B',H],
    ['503B tokens is "approximately half" of T5-XXL\'s (§5.6)','503B / (1M steps × 2<sup>20</sup>) = '+r.xxl_tokens_share_of_t5xxl.toFixed(2),H],
    ['Distillation shares 3%, 20%, 29% (Table 6) and 30% (Table 8)',RC.t6.distill+'%, '+RC.t6.init+'%, '+RC.t6.mix+'%; '+RC.t8+'%',HR],
    ['Compression 82%, 90%, 95%, 97%, 99% (Table 7)','223M student: 79.7, 88.8, 94.1, 97.0, 98.5; 0.2B student: 81.8, 90.0, 94.7, 97.3, 98.6',HR+' with 0.2B only'],
    ['"100x more parameters" (Table 6 caption)','3,800M / 223M = '+r.distill_teacher_over_student.toFixed(1)+'x',NO],
    ['SuperGLUE +4.4 and +2 over T5-Base and T5-Large (§4.1)','+'+RC.t5_diff.base.SuperGLUE+', +'+RC.t5_diff.large.SuperGLUE.toFixed(1),H],
    ['Switch-Base+ raises heads "from 14 to 16" (Table 1 caption)','Switch-Base has 12 heads (Table 9)',NO],
    ['Selective precision "nearly equal speed" to bfloat16 (Table 2)','1,390 against 1,390; '+((r.table2_speed_bf16_over_fp32-1)*100).toFixed(0)+'% faster than float32',H],
    ['Table 11: "lower is better"','negative log perplexity: higher is better everywhere else, and the text picks the highest',NO],
    ['Load-balancing pseudocode: mean(f · P) × num_experts ^ 2 (Code Block 14)','N × Σ f<sub>i</sub>P<sub>i</sub> = Eq. 4 when ^ means a power (in Python it is exclusive or)',H],
    ['Dropped tokens "typically &lt;1%" (§2.2)','no drop rates are printed anywhere','not checkable']];
  $('tbChkT').innerHTML=tbl(['Claim','Recomputed','Verdict'],C.map(c=>[c[0],c[1],c[2].startsWith('does not')?'<span class="no">'+c[2]+'</span>':c[2].startsWith('not')?'<span class="mute">'+c[2]+'</span>':'<span class="ok">'+c[2]+'</span>']));
})();
