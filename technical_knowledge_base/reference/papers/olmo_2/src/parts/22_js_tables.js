// ---- The paper's tables, rebuilt ----
(function(){if(!$('t-tables'))return;
const ok=t=>flag(t||'reproduces','g'),bad=(t,why)=>flag(t||'does not reproduce','b',why);

// every check in one place
(function(){const g=RC.t9_gains,t=RC.tokens,P=RC.params,S=RC.spikes;
  const C=[
   ['Parameters from the released configs','7.30B, 13.72B, 32.23B (1B: 1.48B)',ok('consistent with the names')],
   ['Tokens, stage 1 (checkpoints)','3.90T, 5.00T, 6.06T; 7B "4T" in Table 3, §4.1 and Table 9 is a rounding; 32B "7 trillion" in the Table 9 caption is wrong',bad('two captions off')],
   ['Totals 4.05T, 5.6T, 6.6T','stage 1 plus every anneal ingredient: '+t['OLMo-2-1124-7B'].total_all_ingredients_T+', '+t['OLMo-2-1124-13B'].total_all_ingredients_T+', '+t['OLMo-2-0325-32B'].total_all_ingredients_T+'T',ok()],
   ['Table 6 FLOPs for OLMo 2 (6ND)',t['OLMo-2-1124-7B'].flops_6ND_e23+', '+t['OLMo-2-1124-13B'].flops_6ND_e23+', '+t['OLMo-2-0325-32B'].flops_6ND_e23+' against 1.8, 4.6, 13.0',ok()],
   ['Qwen 2.5 32B FLOPs','Table 6 prints 16.0 (the 14B\'s value); 6ND gives 35.1, as Table 7 prints and Figure 1 draws',bad('Table 6 typo')],
   ['Figure 1 against Table 6','OLMo 2 32B drawn at 11.5 (Table 6: 13.0), OLMo-0424 at 0.87 (1.0); the x axis is a square-root scale',bad('three points off')],
   ['"4.6x the FLOPs" (Qwen 2.5 7B against OLMo 2 7B)','8.2 / 1.8 = '+RC.flops_ratio_qwen7_olmo7,ok()],
   ['Table 6 averages recomputed from each row',RC.avg_t6.filter(x=>Math.abs(x.diff)>0.06).map(x=>x.row+' '+x.printed+' against '+x.recomputed).join('; '),bad('two rows')],
   ['Table 6 against Table 9 (same checkpoints)',RC.t9_vs_t6.map(d=>d[0]+' '+d[1]+' '+d[3]+' in Table 6, '+d[2]+' in Table 9').join('; '),bad('two cells')],
   ['Mid-training gains in the text (10.6, 10.3)','v3 Table 9 gives +'+g['OLMo 2 7B'].gain+' and +'+g['OLMo 2 13B'].gain+'; 10.6 and 10.3 are v1\'s 9-task gains',bad('stale text')],
   ['Appendix B.1 relative gains','1B +37.0%, 7B +18.7% reproduce; 13B '+g['OLMo 2 13B'].rel_pct.toFixed(1)+'% (printed 15.9), 32B '+g['OLMo 2 32B'].rel_pct.toFixed(1)+'% (printed 12.3)',bad('two of four')],
   ['Table 11 deltas in §4.3','all reproduce except "+20" (MMLU, is +2.0) and "−0.4" (OLMES-Gen, is −0.7)',bad('two typos')],
   ['Table 12 in the text of experiment 2','text 61, 66, 65; table 63.5, 66.0, 65.0',bad('one value')],
   ['Table 13 Mix % from Source %','50B mix reproduces (the mix is 51.5B); 100B and 300B maths shares imply '+RC.t13['100B'].math_implied_B+'B and '+RC.t13['300B'].math_implied_B+'B of maths, not 21.4B and 42.8B',bad('two columns')],
   ['Table 14 "consistently equals or outperforms"','23 of 24 cells; mix E GSM* is −17.5',bad('one cell')],
   ['Table 7 against Table 16','13B average 63.5 against 63.4; everything else identical',bad('one cell')],
   ['Tables 4 and 5 totals','3.90T, 832.6B and 10.7B all reproduce; web is '+RC.web_share_pt+'% of the pretraining mix ("over 95%")',ok()],
   ['FineWeb-Edu ≥ 2 keeps 20.3%','752B / 3.71T = '+RC.dclm_hq_retention_pct+'%',ok()],
   ['Table 19 carbon and water','every OLMo row reproduces from power × PUE × intensity',ok()],
   ['§6.5 totals 391 MWh, 154 t, 1.1 ML','column sums 388 MWh, 153 t, 1,094 kL; 391 matches neither 388 nor 445 (with PUE)',bad('391')],
   ['Table 27 and the DPO prompt counts','13B column 377,743 reproduces; the 7B column sums to 366,949, the text says 366.7k',bad('7B count')],
   ['Spike scores (§3)','direction reproduces for all three printed pairs; levels differ ('+S['fig4/gnorm/old init'].ours.pct.toFixed(2)+' against 0.40, '+S['fig7/gnorm/reordered norm + QK-norm'].ours.pct.toFixed(3)+' against 0.069)',flag('direction only','')],
   ['Crossover of 3 and 6 × 10⁻⁴ "well past 200B tokens"','the drawn curves cross at about '+RC.lr_cross['3e-4 below 6e-4'].toFixed(0)+'B',bad('180B, not past 200B')],
   ['Anneals end "the same", the lowest lagging','last-2B losses within '+(Math.max(...Object.values(RC.lr_ends))-Math.min(...['12e-4 50B','9e-4 50B','6e-4 50B','3e-4 50B'].map(k=>RC.lr_ends[k]))).toFixed(3)+' (50B), 3 × 10⁻⁴ highest',ok()],
   ['z-loss coefficient','10⁻⁵ in Table 1, 10⁻⁴ in §3.3.3',bad('two values')]];
  setH('chkTab',htab(['Claim or number','Recomputed','Verdict'],C.map(c=>({c})),{left:true}))})();

// Table 6, sortable
(function(){const T=TB.t6,H=T.head;const sel=$('t6S');sel.innerHTML=H.slice(1).map((h,i)=>'<option value="'+(i+1)+'"'+(i===0?' selected':'')+'>'+h+'</option>').join('');
  const avg=Object.fromEntries(RC.avg_t6.map(x=>[x.row,x]));
  function draw(){const k=+sel.value,keep=$('t6G').checked;let rows=T.rows.slice();const v=r=>{const x=num(r.c[k]);return x==null?-1:x};
    let out=[];if(keep){let g='';rows.forEach(r=>{if(r.g!==g){g=r.g;out.push({grp:g})}out.push(r)});const grs=[];let cur=null;out.forEach(r=>{if(r.grp){cur={h:r,rs:[]};grs.push(cur)}else cur.rs.push(r)});out=[];grs.forEach(G=>{out.push(G.h);G.rs.sort((a,b)=>v(b)-v(a)).forEach(r=>out.push(r))})}
    else out=rows.sort((a,b)=>v(b)-v(a));
    setH('t6Tab',htab(H.concat(['Avg recomputed']),out.map(r=>{if(r.grp)return r;const c=r.c.slice(),a=avg[c[0]];let fl='';
      if(c[0]==='Qwen 2.5 32B')c[2]+=bad('35.1','6ND with 32.5B parameters and 18T tokens; Table 7 prints 35.0');
      if(c[0]==='OLMo 2 32B')c[11]+=flag('T9: 43.3','b','Table 9 prints 43.3 for the same checkpoint');if(c[0]==='OLMo 2 7B')c[8]+=flag('T9: 60.8','b','Table 9 prints 60.8 for the same checkpoint');
      return {c:c.concat([a?(a.recomputed.toFixed(2)+(Math.abs(a.diff)>0.06?flag('≠','b'):'')):'']),cls:/^OLMo 2/.test(c[0])?'hl':''}})))}
  sel.addEventListener('change',draw);$('t6G').addEventListener('change',draw);draw()})();

// Figure 1 against Table 6
setH('f1Tab',htab(['Model','Table 6 FLOPs (10²³)','Figure 1 FLOPs (10²³)','Ratio','Table 6 avg','Figure 1 avg'],RC.fig1.map(x=>({c:[x.model,x.table6_e23,(x.fig_flops/1e23).toFixed(2),x.ratio==null?'':x.ratio.toFixed(2)+(Math.abs(x.ratio-1)>0.05?flag('off','b'):''),x.table6_avg,x.fig_avg.toFixed(1)]}))));

// Table 3 recount
(function(){const M=['OLMo-2-0425-1B','OLMo-2-1124-7B','OLMo-2-1124-13B','OLMo-2-0325-32B'],P=RC.params,K=RC.tokens,R=RC.refs;
  const row=(n,f)=>({c:[n].concat(M.map(m=>f(m)))});
  setH('t3Tab',htab(['','1B','7B','13B','32B'],[row('Layers, d, FFN',m=>P[m].layers+', '+fmt(P[m].d)+', '+fmt(P[m].ffn)),row('Heads (Q/KV)',m=>P[m].heads+'/'+P[m].kv),row('Vocabulary (padded)',m=>fmt(P[m].vocab)),
    row('<b>Parameters</b>',m=>'<b>'+(P[m].params/1e9).toFixed(3)+'B</b>'),row('of which embeddings (in and out)',m=>(P[m].embedding_pair/1e9).toFixed(3)+'B'),
    row('Last stage-1 checkpoint',m=>'<span class="mono11">'+K[m].stage1_last_branch.replace('stage1-','')+'</span>'),row('Stage-1 tokens',m=>K[m].stage1_T.toFixed(3)+'T'),row('Printed',m=>K[m].printed_stage1),
    row('Total with every anneal',m=>K[m].total_all_ingredients_T.toFixed(2)+'T'+(K[m].printed_total_T?' (printed '+K[m].printed_total_T+')':'')),
    row('<b>6ND FLOPs (10²³)</b>',m=>'<b>'+K[m].flops_6ND_e23.toFixed(2)+'</b> (printed '+K[m].printed_flops_e23+')'),row('Public checkpoints (branches)',m=>fmt(R[m].branches))]))})();

// Table 9 with gains
(function(){const T=TB.t9,rows=[];for(let i=0;i<T.rows.length;i+=2){const a=T.rows[i],b=T.rows[i+1];rows.push({grp:a.g});rows.push({c:[a.c[0]].concat(a.c.slice(1))});rows.push({c:[b.c[0]].concat(b.c.slice(1)),cls:'hl'});
    rows.push({c:['<i>gain</i>'].concat(b.c.slice(1).map((v,j)=>{const d=num(v)-num(a.c[j+1]);return '<span style="color:'+(d>=0?'var(--good)':'var(--bad)')+'">'+sgn(d)+'</span>'}))})}
  setH('t9Tab',htab(T.head,rows));
  setH('t9Warn','<div class="t">Does not reproduce: the text\'s gains</div>The text says the 7B "improves, on average by 10.6 points" and the 13B "by 10.3 points". From this table they are +'+RC.t9_gains['OLMo 2 7B'].gain+' and +'+RC.t9_gains['OLMo 2 13B'].gain+'. In v1, Table 9 had nine tasks (no TriviaQA): 50.6 to 61.2 and 56.5 to 66.8, which is where 10.6 and 10.3 come from; v3 added TriviaQA and the 1B and 32B rows without updating the sentence. Two cells also differ from Table 6 for the same final checkpoints (7B DROP 60.8 against 60.9; 32B MMLU-Pro 43.3 against 46.9).')})();

// Tables 10 and 11
(function(){function draw(){const v=$('t10S').value;
  if(v==='t11'){const T=TB.t11,D=RC.t11_deltas,base=T.rows[1].c.slice(1).map(num);
    setH('t11Tab',htab(T.head.concat(['GSM* ± SE']),T.rows.map((r,i)=>({c:[r.c[0]].concat(r.c.slice(1).map((x,j)=>i>1?x+' <span class="small mute">'+sgn(num(x)-base[j])+'</span>':x)).concat(['± '+(100*Math.sqrt(num(r.c[4])/100*(1-num(r.c[4])/100)/200)).toFixed(1)])})))+
      '<p class="small">Small grey numbers: change from the anneal on the pretraining mix (second row). The text\'s deltas, recomputed: pretraining mix minus pretrained checkpoint '+D['PT mix minus pretrain'].map(x=>sgn(x)).join(', ')+' (text: +4.4, +1.3, "+20", −1.5); Web FW2 minus pretraining mix '+D['Web FW2 minus PT mix'].map(x=>sgn(x)).join(', ')+' (text: +1.2, "−0.4", +1.3, +1.5).</p>')}
  else{const T=TB.t10;setH('t11Tab',htab(T.head,(()=>{const o=[];let g='';T.rows.forEach(r=>{if(r.g!==g){g=r.g;o.push({grp:g})}o.push({c:r.c})});return o})()))}}
  $('t10S').addEventListener('change',draw);draw()})();

// Table 12
setH('t12Tab',htab(['Mix','Web ratio','Tokens','MMLU','GSM*','± SE'],(()=>{const o=[];let g='';TB.t12.rows.forEach((r,i)=>{if(r.g!==g){g=r.g;o.push({grp:g})}o.push({c:r.c.concat(['± '+RC.t12[i].se.toFixed(1)])})});return o})())+
  '<p class="small mute">SE: binomial standard error of a score on 200 questions, √(p(1 − p)/200). A difference between two runs has a standard error of about 4.8 points at these scores. Microannealing cost: 19 runs, 130B tokens in total (about 6.8B each), less than the 150B of the 7B\'s three final anneals.</p>');

// Tables 5 and 13
(function(){function draw(){const m=$('t13S').value,R=RC.t13[m],T=TB.t13,mi=['50B','100B','300B'].indexOf(m);
  setH('t13Tab',htab(['Source','Pool tokens','Source % (printed)','Tokens used','Mix % recomputed','Mix % printed'],R.rows.map((x,i)=>({c:[x.src,T.rows[i].c[1],T.rows[i].c[2+2*mi],x.tokens_B.toFixed(1)+'B',x.share_recomputed.toFixed(1),x.share_printed+(Math.abs(x.share_recomputed-x.share_printed)>1?flag('≠','b'):'')]})).concat([{c:['<b>Total</b>','','','<b>'+R.total_B+'B</b>','100','('+R.printed_share_sum+')']}])));
  setH('t13Warn',m==='50B'?'<div class="t">Reproduces</div>The 50B mix\'s printed shares follow from its source fractions to within 0.1 point (the mix is in fact 51.5B tokens).':'<div class="t">Does not reproduce</div>With the printed Source % the '+m+' mix would hold '+R.total_B+'B tokens, '+R.rows[5].tokens_B.toFixed(1)+'B of them maths ('+R.rows[5].share_recomputed.toFixed(1)+'%), but the printed Mix % gives maths '+R.rows[5].share_printed+'%. Taking the DCLM row\'s share as right, the mix holds about '+R.math_implied_B+'B of maths, so the maths was not fully repeated '+(m==='100B'?'twice':'four times')+' as the table and the text say, or the shares are of a different mix. The paper does not say which.')}
  $('t13S').addEventListener('change',draw);draw()})();

// Table 14
setH('t14Tab',htab(['Mix','OLMES single → soup','OLMES-Gen','MMLU','GSM*'],TB.t14.rows.map(r=>({c:[r.c[0]].concat([0,1,2,3].map(j=>{const a=num(r.c[1+j]),b=num(r.c[5+j]),d=b-a;return r.c[1+j]+' → '+r.c[5+j]+' <span style="color:'+(d>=0?'var(--good)':'var(--bad)')+'">'+sgn(d)+'</span>'}))})))+'<p class="small mute">All six mixes annealed for 50B tokens from the 7B pretrained checkpoint, three data orders each. Mix E\'s soup loses 17.5 GSM* points to its best single run, about 3.6 standard errors of a difference (4.9 points).</p>');

// Tables 7, 16, 23, 24
(function(){function draw(){const v=$('t7S').value,T=TB[v],H=v==='t16'?T.head:v==='t24'?T.head:T.head;const o=$('t7O');
  if(o.dataset.t!==v){o.dataset.t=v;o.innerHTML=H.slice(1).map((h,i)=>'<option value="'+(i+1)+'">'+h+'</option>').join('')}
  const k=+o.value||1,val=r=>{const x=num(r.c[k]);return x==null?-1:x};let out=[];
  if(v==='t16'){out=T.rows.map(r=>({c:r.c,cls:/Instruct/.test(r.c[0])?'hl':''}))}
  else{let g='';const grs=[];T.rows.forEach(r=>{if(r.g!==g||!grs.length){g=r.g;grs.push({h:{grp:g||'Models'},rs:[]})}grs[grs.length-1].rs.push(r)});grs.forEach(G=>{out.push(G.h);G.rs.slice().sort((a,b)=>val(b)-val(a)).forEach(r=>out.push({c:r.c,cls:/OLMo 2/.test(r.c[0])?'hl':''}))})}
  setH('t7Tab',htab(H,out))}
  $('t7S').addEventListener('change',draw);$('t7O').addEventListener('change',draw);draw()})();

// Table 19
setH('t19Tab',htab(['Model','GPU power (MWh)','PUE','kg CO₂/kWh','tCO₂eq printed','recomputed','WUE (L/kWh)','water kL printed','recomputed'],RC.t19.map((x,i)=>({c:[x.model,x.mwh,x.pue,x.ci==null?'-':x.ci,x.co2_printed,x.co2_recomputed==null?'':x.co2_recomputed,TB.t19.rows[i].c[5],TB.t19.rows[i].c[6],x.water_recomputed_kL==null?'':fmt(x.water_recomputed_kL,1)]}))));

// Tables 17, 18, 27
setH('t27Tab','<p class="small"><b>Table 17</b>, the 7B SFT sweep (effective batch 128, linear schedule, warmup ratio 0.3): summed loss beats mean loss by about 1.5 points on average.</p>'+htab(TB.t17.head,TB.t17.rows.map(r=>({c:r.c})))+
  '<p class="small"><b>Table 18</b>, PPO for RLVR (7B and 13B):</p>'+htab(['Hyperparameter','Value'],TB.t18.rows.map(r=>({c:[tex(r.c[0]),tex(r.c[1])]})),{left:true})+
  '<p class="small"><b>Table 27</b>, DPO prompt sources: the 13B column sums to '+fmt(RC.t27.sum_13B)+' (the printed total), the 7B column (no WildChat IF) to '+fmt(RC.t27.sum_7B)+', where the text says 366.7k.</p>'+htab(TB.t27.head,TB.t27.rows.map(r=>({c:r.c}))));
})();
