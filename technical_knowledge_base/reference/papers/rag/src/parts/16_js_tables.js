// ---- The paper's tables, rebuilt (data: PAPER.tables from tables.json, PAPER.rc from recompute.py) ----
(function(){if(!$('t1'))return;const T=PAPER.tables,RC=PAPER.rc;
  const f1=v=>v==null?'<span class="mute">-</span>':v.toFixed(1);
  const sgn=v=>(v>0?'+':'')+v.toFixed(1);
  const se=(p,n)=>100*Math.sqrt(p/100*(1-p/100)/n);
  const NT={NQ:3611,TQA:11314,WQ:2033,CT:635,'TQA-Wiki':null};
  function t1(){const t=T.t1,b=$('t1Base').value,showSe=$('t1Se').checked;
    let h='<table><thead><tr><th>Model</th>'+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
    let g='';t.rows.forEach(r=>{if(r.g!==g){g=r.g;h+='<tr><td colspan="'+(t.cols.length+1)+'" class="small mute">'+g+'</td></tr>'}
      h+='<tr'+(r.g==='RAG'?' style="font-weight:600"':'')+'><td>'+r.m+'</td>'+r.v.map(v=>'<td class="num">'+f1(v)+'</td>').join('')+'</tr>'});
    const base=j=>{const o=t.rows.filter(r=>r.g!=='RAG'&&(b==='best'||r.m===b)&&r.v[j]!=null);if(!o.length)return null;return o.reduce((a,c)=>c.v[j]>a.v[j]?c:a)};
    const best=j=>t.rows.filter(r=>r.g==='RAG').reduce((a,c)=>c.v[j]>a.v[j]?c:a);
    h+='<tr><td>best RAG minus '+(b==='best'?'best other':b)+'</td>'+t.cols.map((c,j)=>{const o=base(j),r=best(j);if(!o)return '<td class="num mute">n/a</td>';const d=r.v[j]-o.v[j];return '<td class="num" title="'+r.m+' '+r.v[j]+' against '+o.m+' '+o.v[j]+'">'+sgn(d)+'</td>'}).join('')+'</tr>';
    if(showSe)h+='<tr><td>standard errors of that margin</td>'+t.cols.map((c,j)=>{const o=base(j),r=best(j),n=NT[c];if(!o)return '<td class="num mute">n/a</td>';if(!n)return '<td class="num mute">test size not given</td>';
      const s=Math.sqrt(se(r.v[j],n)**2+se(o.v[j],n)**2),z=(r.v[j]-o.v[j])/s;return '<td class="num" style="color:var(--'+(z>=2?'good':z<=-2?'bad':'mute')+')">'+z.toFixed(1)+(z>=2?' clear':Math.abs(z)<2?' within noise':' clear loss')+'</td>'}).join('')+'</tr>';
    $('t1').innerHTML=h+'</tbody></table>';
    $('t1n').innerHTML='TQA is the standard open-domain test set (DPR\'s splits, 11,314 questions); TQA-Wiki is the official Wikipedia test set that T5 used, whose size the paper does not give (%D%). The margin row takes the better of RAG-Token and RAG-Sequence in each column, as the headline does. Defaults reproduce the text\'s NQ comparison (44.5 against 41.5) independently; the noise test is this page\'s, not the paper\'s.'.replace('%D%','<a href="'+PAPER.meta.ax+'#A4.SS0.SSS0.Px2" target="_blank" rel="noopener noreferrer">Appendix D</a>')}
  ['t1Base','t1Se'].forEach(id=>$(id).addEventListener(id==='t1Se'?'click':'change',t1));
  function t2(){const t=T.t2,d=$('t2D').checked,B=t.rows.find(r=>r.m==='BART').v;
    $('t2').innerHTML='<table><thead><tr><th>Model</th>'+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>'+t.rows.map(r=>'<tr><td>'+r.m+'</td>'+r.v.map((v,j)=>{if(v==null)return '<td class="num mute">-</td>';const star=r.gold&&r.gold[j]?'*':'';
      if(d&&r.m!=='BART'){return '<td class="num">'+sgn(v-B[j])+star+'</td>'}return '<td class="num">'+v.toFixed(1)+star+'</td>'}).join('')+'</tr>').join('')+'</tbody></table>'}
  $('t2D').addEventListener('click',t2);
  function t3(){$('t3').innerHTML='<table><thead><tr><th>Task</th><th>Input</th><th>BART</th><th>RAG-Token</th><th>RAG-Sequence</th></tr></thead><tbody>'+T.t3.rows.map(r=>'<tr><td>'+r.task+'</td><td>'+r.x+'</td><td>'+r.BART+'</td><td>'+r.T+'</td><td>'+r.S+'</td></tr>').join('')+'</tbody></table><p class="small mute">'+T.t3.note+'</p>'}
  function t4(){const t=T.t4,s=[0,1].map(j=>t.rows.reduce((a,r)=>a+r.v[j],0));
    $('t4').innerHTML='<table><thead><tr><th></th>'+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">factuality, as pairs</th><th class="num">specificity, as pairs</th></tr></thead><tbody>'+t.rows.map(r=>'<tr><td>'+r.m+'</td>'+r.v.map(v=>'<td class="num">'+v.toFixed(1)+'%</td>').join('')+'<td class="num">'+(r.v[0]*4.52).toFixed(1)+'</td><td class="num">'+(r.v[1]*4.52).toFixed(1)+'</td></tr>').join('')+
      '<tr><td><b>sum</b></td>'+s.map(v=>'<td class="num" style="color:var(--'+(Math.abs(v-100)<0.15?'good':'bad')+')"><b>'+v.toFixed(1)+'%</b></td>').join('')+'<td class="num">'+(s[0]*4.52).toFixed(1)+'</td><td class="num">'+(s[1]*4.52).toFixed(1)+'</td></tr></tbody></table>';
    $('t4n').innerHTML='Factuality sums to '+RC.t4.sum_fact+'%; specificity sums to <b>'+RC.t4.sum_spec+'%</b>, so 7 points of it are missing from the table as printed. The text says both were factual "in a further 17% of cases"; the table\'s "Both good" is 11.7% and its "Both poor" 17.7%. As counts of 452 pairs, the factuality column is whole numbers to rounding (193, 32, 53, 80 and 94 pairs, 452 in all); the specificity column comes to about 420 pairs, so about 32 are unaccounted for. Ratio RAG better to BART better: '+RC.t4.fact_ratio+' for factuality, '+RC.t4.spec_ratio+' for specificity.'}
  function t5(){const t=T.t5;fit($('t5'),w=>{const lab=96,bw=(w-lab-60)/2;let s='';t.cols.forEach((c,j)=>{s+=tx(lab+j*(bw+30),12,c,{fs:12,w:600})});
    t.rows.forEach((r,i)=>{const y=20+i*22;s+=tx(lab-6,y+12,r.m,{fs:11,a:'end',c:'var(--mute)'});r.v.forEach((v,j)=>{const x=lab+j*(bw+30);s+=rc(x,y+2,bw*v/100,14,r.m==='Gold'?'var(--c3)':r.m==='BART'?'var(--c2)':'var(--c1)',{r:2});s+=tx(x+bw*v/100+4,y+13,v.toFixed(1)+'%',{fs:11})})});
    $('t5').innerHTML=svgW(w,20+t.rows.length*22+4,s,'Table 5 distinct trigram ratios')})}
  function t6(){const t=T.t6,v=$('t6V').value;const L=f=>t.rows.find(r=>r.f===f&&r.r==='Learned').v;
    $('t6').innerHTML='<table><thead><tr><th>Model</th>'+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>'+t.rows.filter(r=>v==='raw'||r.r===(v==='frozen'?'Frozen':'BM25')).map(r=>'<tr><td>'+(v==='raw'?r.m:(r.f==='tok'?'RAG-Token':'RAG-Sequence')+': learned minus '+r.r)+'</td>'+r.v.map((x,j)=>{
      const sh=r.shared&&r.shared.includes(j);if(v==='raw')return '<td class="num'+(sh?' mute':'')+'">'+x.toFixed(1)+'</td>';
      if(sh)return '<td class="num mute">as above</td>';const d=+(L(r.f)[j]-x).toFixed(1);return '<td class="num" style="color:var(--'+(d<0?'bad':d<1?'mute':'good')+')">'+sgn(d)+'</td>'}).join('')+'</tr>').join('')+'</tbody></table>';
    const c=RC.t6;$('t6n').innerHTML=v==='raw'?'FEVER is classification, so its two columns are one model per retriever (the RAG-Sequence rows repeat RAG-Token\'s value, greyed). '+t.note:
      c.filter(x=>x.vs===(v==='frozen'?'Frozen':'BM25')).map(x=>(x.fam==='tok'?'RAG-Token':'RAG-Sequence')+': learned is ahead in '+x.wins+' cells, tied in '+x.ties+', behind in '+x.losses+'; '+x.small+' of the margins are between 0 and 1 point').join('. ')+'. Grey: margins under one point, on one run each, on dev sets. Recomputed from the table by <code>recompute.py</code>.'}
  $('t6V').addEventListener('change',t6);
  function t7(){const t=T.t7;$('t7').innerHTML='<table><thead><tr><th>Dataset</th>'+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">SE at 50%, test</th></tr></thead><tbody>'+t.rows.map(r=>'<tr><td>'+r.m+'</td>'+r.v.map((v,j)=>'<td class="num">'+fmt(v)+(j===2&&r.star?'*':'')+'</td>').join('')+'<td class="num">±'+se(50,r.v[2]).toFixed(2)+'</td></tr>').join('')+'</tbody></table><p class="small mute">'+t.note+'. The last column is the binomial standard error, in points, of a 50% score on that test set: the noise floor of one system\'s number. CuratedTrec\'s 635 test questions give ±2.0 points; FEVER\'s 10,000 give ±0.5.</p>'}
  function chk(){const H=RC.hot_swap,P=RC.params,I=RC.index,t2=RC.t2;
    const rows=[
     ['NQ: RAG-Sequence 44.5 against DPR 41.5 and T5-11B+SSM 36.6 (§4.1, Table 1)','+'+RC.t1_rag_seq_vs_dpr_nq+' and +'+RC.t1_rag_seq_vs_t5ssm_nq,'reproduces'],
     ['"New state of the art" on all four QA sets (§4.1)','clear on NQ (z = '+RC.t1_sota[0].z+') and TQA-Wiki (+'+RC.t1_sota[2].delta+'); WQ +'+RC.t1_sota[3].delta+' (z = '+RC.t1_sota[3].z+') and CT +'+RC.t1_sota[4].delta+' (z = '+RC.t1_sota[4].z+') within noise; standard TQA '+RC.t1_sota[1].delta,'two of four clear'],
     ['RAG-Token against RAG-Sequence on NQ, 44.1 against 44.5','difference '+RC.t1_tok_vs_seq_nq.d+' against a standard error of '+RC.t1_tok_vs_seq_nq.se,'a tie'],
     ['MS-MARCO: RAG-Sequence beats BART by 2.6 BLEU and 2.6 Rouge-L (§4.2)','+'+t2.msmarco_bleu+' and +'+t2.msmarco_rouge,'reproduces'],
     ['"Approaches" the gold-passage state of the art (§4.2)','still '+t2.msmarco_gap_to_gold_bleu+' BLEU-1 and '+t2.msmarco_gap_to_gold_rouge+' Rouge-L behind','qualified'],
     ['FEVER within 4.3% (3-way) and 2.7% (2-way) (§4.4)',t2.fever3_gap+' and '+t2.fever2_gap+' points; FEVER-3 noise ±'+t2.fever3_se,'reproduces'],
     ['Jeopardy: both RAG models beat BART on Q-BLEU-1 (§4.3)','+'+t2.jeop_qb1_tok_minus_bart+' (Token), +'+t2.jeop_qb1_seq_minus_bart+' (Sequence); on BLEU-1 Sequence is '+t2.jeop_b1_seq_minus_bart,'reproduces, metric-dependent'],
     ['Human evaluation: both factual in "a further 17%" (§4.3)','Table 4: both good 11.7%, both poor 17.7%','text and table disagree'],
     ['Table 4 columns sum to 100%','factuality '+RC.t4.sum_fact+'%, specificity '+RC.t4.sum_spec+'%','specificity does not'],
     ['Learned retrieval "improves results for all tasks" (§4.5, Table 6)','RAG-Token against frozen: '+RC.t6[0].wins+' ahead, '+RC.t6[0].ties+' tie; RAG-Sequence: '+RC.t6[2].wins+' of 8 ahead','one tie'],
     ['Hot-swap: 70%, 68%, 12%, 4% of 82 leaders (§4.5)',H['2016_on_2016'].count+', '+H['2018_on_2018'].count+', '+H['2018idx_2016leaders'].count+', '+H['2016idx_2018leaders'].count+' leaders ('+H['2016_on_2016'].exact+'%, '+H['2018_on_2018'].exact+'%, '+H['2018idx_2016leaders'].exact+'%, '+H['2016idx_2018leaders'].exact+'%); noise ±'+H['2016_on_2016'].se,'consistent with integer counts'],
     ['"626M trainable parameters" = 110M + 110M + 406M (Appendix G)',P.listed_total+'M as summed; the document encoder is never trained, so '+P.actually_trained+'M are','counting slip'],
     ['BART-large: "400M" (§2.3) and "406M" (Appendix G)','both in the paper; 406M is the count','rounding'],
     ['Index: "21M 728 dimensional vectors, consisting of 15.3B values" (Appendix G)','21M × 728 = '+I.values_paper_728+'B, consistent; BERT-base gives 768, 21M × 768 = '+I.values_768+'B','728 is a typo for 768'],
     ['Index memory about 100 GB, 36 GB compressed (Appendix C)','21M × 768 float32 = '+I.gb_fp32_768+' GB of vectors alone (fp16 '+I.gb_fp16_768+', 8-bit '+I.gb_8bit_768+'); the rest is the HNSW graph and overheads','plausible, not derivable'],
     ['21M chunks of 100 words (§3)','about '+(I.words/1e9).toFixed(1)+' billion words of Wikipedia','derived'],
     ['T5-large (770M) scores 28.9 on NQ, "substantially below" 44.5 (Appendix G)',''+(44.5-28.9).toFixed(1)+' points','reproduces']];
    $('chk').innerHTML='<table><thead><tr><th>Claim</th><th>Recomputed</th><th>Verdict</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody></table>'}
  onTab('t-tables',()=>{t1();t2();t3();t4();t5();t6();t7();chk()});
})();
