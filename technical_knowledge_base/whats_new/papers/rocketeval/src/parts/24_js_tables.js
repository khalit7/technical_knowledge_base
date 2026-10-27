// ---- The paper's tables, rebuilt: sortable tables, derived columns, every number checked ----
(function(){
  function table(el,head,rows,opt){opt=opt||{};let sk=opt.sort==null?-1:opt.sort,dir=1;
    function render(){const R=rows.slice();if(sk>=0)R.sort((a,b)=>{const x=a[sk].v,y=b[sk].v;if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?x.localeCompare(y):x-y)*dir});
      let h='<table><thead><tr>'+head.map((c,i)=>'<th class="'+(i?'num':'')+'" data-i="'+i+'" style="cursor:pointer" title="Sort">'+c+(i===sk?(dir>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>';
      R.forEach(r=>{h+='<tr>'+r.map((c,i)=>'<td class="'+(i?'num':'')+'"'+(c.b?' style="font-weight:600"':'')+'>'+c.h+'</td>').join('')+'</tr>'});
      el.innerHTML=h+'</tbody></table>';el.querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const i=+th.dataset.i;if(sk===i)dir=-dir;else{sk=i;dir=i?-1:1}render()}))}
    render()}
  const cell=(s,v,b)=>({h:s==null?'<span class="mute">-</span>':s,v:v==null?null:v,b});
  const P=s=>s==='-'?null:parseFloat(String(s).replace('%',''));
  const sgn=(d,dg,u)=>d==null?null:(d>0?'+':d<0?'−':'')+fmt(Math.abs(d),dg)+(u||'');
  // Table 1
  let m1='vs_gpt4o';function t1(){table($('tb1T'),['Judge','Direct','CoT','CoT with GPT-4o analysis','Gain from GPT-4o analysis'],TB.t1[m1].map(r=>[cell(r[0],r[0]),cell(r[1],P(r[1])),cell(r[2],P(r[2])),cell(r[3],P(r[3])),cell(sgn(P(r[3])-P(r[2]),1,' pts'),P(r[3])-P(r[2]))]))}
  seg2('tb1M',m=>{m1=m;t1()});
  // Table 2
  let m2='v';function t2(){const B=TB.t2.base;const rows=TB.t2.rows.map(r=>{const c=P(r[1]);return [cell(r[0],r[0])].concat(r.slice(1).map((x,i)=>{const v=P(x);if(m2==='v'||i===0)return cell(v==null?null:x,v,v!=null&&v>=64.7);const d=v==null||c==null?null:v-c;return cell(sgn(d,1,' pts'),d)}))});
    table($('tb2T'),['Judge'].concat(TB.t2.cols),rows);$('tb2N').innerHTML='Baselines printed above the table: '+Object.entries(B).map(([k,v])=>k+' '+v).join(', ')+'. Bold: at or above the 64.7% human-to-human agreement. Agreement counts ties (a score difference under 0.1), so random is 33.3%. RocketEval (Unsup.) beats CoT for '+RC.t2.unsup_beats_cot.length+' of 13 judges, by '+fmt(RC.t2.mean_gain,1)+' points on average; the Fixed checklist is below CoT for '+RC.t2.fixed_below_cot.length+'.'}
  seg2('tb2M',m=>{m2=m;t2()});
  // Table 3
  let m3='1';function t3(){const rows=TB.t3.rows.map(r=>{const D=RC.t3_discordant[r[0]];return [cell(r[0],r[0])].concat([0,1,2,3,4].map(c=>{if(m3==='d'){const d=D[c];return cell(d==null?null:fmt(d,Math.abs(d-Math.round(d))<0.03?0:2),d)}const x=r[1+2*c+(+m3)];const v=P(x);return cell(v==null?null:x,v,m3==='1'&&v!=null&&v>=0.979)}))});
    table($('tb3T'),['Judge'].concat(TB.t3.cols),rows)}
  seg2('tb3M',m=>{m3=m;t3()});
  // Table 4
  function t4(){const C=RC.cost.rows;const rows=TB.t4.rows.map((r,i)=>{const c=C[i];return [cell(r.m+': '+r.judge,r.judge),cell(r.env,r.env),cell(r.price,r.price),cell(r.use,r.use),cell(r.extra,c.extra),
      cell(r.n[0]+'<br><span class="mute">'+usd(c.calc[0])+'</span>',c.calc[0]),cell(r.n[1]+'<br><span class="mute">'+usd(c.calc[1])+'</span>',c.calc[1]),cell(r.n[2]+'<br><span class="mute">'+usd(c.calc[2])+'</span>',c.calc[2],c.rel[2]>0.05)]});
    table($('tb4T'),['Method: judge','Environment','Price','Usage per run','Extra cost','N = 10','N = 100','N = 1000'],rows);
    $('tb4N').innerHTML='Printed values above, recomputed below in grey: extra + N × per-run, with per-run = tokens × price for OpenAI models and seconds × hourly price / 3,600 for GPUs; the extra cost is the checklists, 1.38M × $1.25 + 0.228M × $5.00 per million = $'+fmt(RC.cost.ck,3)+'. '+TB.t4.note+' Bold: does not reproduce. The Llama-3-70B totals imply $'+fmt(RC.cost.l70_implied_per_test[2],3)+' a run, about '+fmt(RC.cost.l70_implied_sec[2],0)+' s at $1.44 an hour, not the printed 3,760 s.'}
  // Table 5
  function t5(){table($('tb5T'),['Dataset'].concat(TB.t5.cols),TB.t5.rows.map(r=>r.map((x,i)=>cell(x,i?parseFloat(x):x))))}
  // Table 6
  let m6='mt';function t6(){const g=TB.t6.gpt4o[m6];const rows=TB.t6[m6].map(r=>[cell(r[0],r[0])].concat(r.slice(1).map(x=>cell(x==='-'?null:x,P(x),P(x)!=null&&P(x)>=parseFloat(g[1])))));
    table($('tb6T'),['Judge','CoT Kend.','CoT Spea.','Direct Kend.','Direct Spea.','Ours (Unsup.) Kend.','Ours (Unsup.) Spea.','Ours (Sup.) Kend.','Ours (Sup.) Spea.'],rows);
    $('tb6N').innerHTML='GPT-4o (CoT) on this benchmark: Kendall '+g[0]+', Spearman '+g[1]+'. Bold: at or above GPT-4o\'s Spearman. Test-model counts from the released <code>config/rankings/*_test.json</code>.'}
  seg2('tb6M',m=>{m6=m;t6()});
  // Tables 7, 8
  let m7='t7';function t7(){const T=TB[m7];let rows;
    if(m7==='t7')rows=T.rows.map(r=>{const u=P(r[1]);return [cell(r[0],r[0])].concat(r.slice(1).map((x,i)=>{const v=P(x);return cell(x+(i?'<br><span class="mute">'+sgn(v-u,1)+'</span>':''),v)}))});
    else rows=T.rows.map(r=>{const u=P(r[2]);return [cell(r[0],r[0])].concat([0,1,2,3,4].map(c=>{const x=r[1+2*c+1],v=P(x);return cell(x+(c?'<br><span class="mute">'+sgn(v-u,3)+'</span>':''),v)}))});
    table($('tb7T'),['Judge'].concat(T.cols),rows);
    $('tb7N').innerHTML=m7==='t7'?'Differences from RocketEval (Unsup.) in grey. Without the normalised score agreement drops by '+fmt(RC.t7.norm_drop_mean,1)+' points on average; without independent grading by '+fmt(RC.t7.indep_drop_mean,1)+' (it helps '+RC.t7.indep_helps_count+' of 13 judges).':'Spearman only (Kendall in the arXiv table); differences from RocketEval (Unsup.) in grey. Setting α to 1 gives the best rankings.'}
  seg2('tb7M',m=>{m7=m;t7()});
  // Figures 4 and 5
  function tf(){const F=REL.fig;const rows=[];['smp','pos'].forEach(k=>Object.entries(F[k]).forEach(([n,v])=>rows.push([cell((k==='smp'?'Figure 4 (samples), ':'Figure 5 (position), ')+n,n)].concat(v.map(x=>cell(fmt(100*x,1)+'%',x))))));
    table($('tbfT'),['Series','1','2','3','4','5','6','7'],rows)}
  // Checks
  function checks(){const C=RC.cost,G=RC.g4o_rerun,K=RC.ck,J=RC.judges,MT=RC.mt;const ok='<span class="ok">reproduces</span>',no='<span class="no">does not reproduce</span>',pt='<span class="mute">partly</span>',nt='<span class="mute">note</span>';
    const L=[
     [ok,"Table 3's GPT-4o row (Kendall 0.909, Spearman 0.979)","Recomputed from GPT-4o's released WildBench grades of the 12 test models on the "+fmt(G.nq)+' queries all share, against the released Elo ratings: '+fmt(G.kendall,3)+' and '+fmt(G.spearman,3)+', independently. Discordant pairs: '+G.pairs.map(p=>p.join(' / ')).join('; ')+'.'],
     [ok,'1.84M input tokens per GPT-4o run (Table 4)','Released GPT-4o gradings: '+fmt(RC.tokens.mean_in_per_1000/1e6,3)+'M input tokens per 1,000 queries on average over the 12 test models.'],
     [pt,'220k output tokens per GPT-4o run (Table 4)','Released gradings: '+fmt(RC.tokens.mean_out_per_1000/1e3,0)+'k per 1,000 queries, 5% more.'],
     [ok,'$3,400 for 1,000 GPT-4o runs; checklists $2.87','1.84 × $1.25 + 0.22 × $5.00 = $'+fmt(C.g4o,2)+' a run; 1.38 × $1.25 + 0.228 × $5.00 = $'+fmt(C.ck,3)+'. These are Batch API prices for gpt-4o-2024-08-06; at standard prices a run is $'+fmt(C.std.g4o,2)+' and 1,000 runs $'+fmt(1000*C.std.g4o,0)+'.'],
     [ok,'Llama-3-8B, Gemma-2-2B and Qwen2.5-1.5B rows of Table 4','Checklists + N × seconds × $0.36 / 3,600: all within 0.3% of the printed totals.'],
     [pt,'GPT-4o-mini row of Table 4','$'+fmt(C.mini,3)+' a run gives $2.04, $20.4, $204 against the printed $2.00, $20.0, $200.'],
     [no,'Llama-3-70B row of Table 4','3,760 s × $1.44 / 3,600 = $'+fmt(C.l70_from_sec,3)+' a run, but the printed totals imply $'+fmt(C.l70_implied_per_test[2],3)+' (about '+fmt(C.l70_implied_sec[2],0)+' s).'],
     [pt,'"A cost reduction exceeding 50-fold" (abstract) and "2% of the evaluation cost" (§1)','At N = 1,000: Gemma-2-2B '+fmt(C.ratio_1000['Gemma-2-2B'],0)+'× ('+fmt(100*C.share_1000['Gemma-2-2B'],1)+'%), Qwen2.5-1.5B '+fmt(C.ratio_1000['Qwen2.5-1.5B'],0)+'×, Llama-3-8B '+fmt(C.ratio_1000['Llama-3-8B'],1)+'× ('+fmt(100*C.share_1000['Llama-3-8B'],1)+'%). Each claim fits a different judge.'],
     [pt,'Human-to-human agreement 64.8% and GPT-4o 66.7% (§2.2, Figure 1 legend)','Table 2 prints 64.7% and 66.6%.'],
     [nt,'Eq. 2: s_unsup = Σ p̂ ("the arithmetic mean")','Printed as a sum; the released code takes the mean and rescales it, 9 × mean + 1.'],
     [pt,'"5-10 questions created for each instance" (§3.1)','Released WildBench checklists: '+K.min+' to '+K.max+' items, '+K.in_5_10+' of '+K.n+' within 5 to 10, mean '+fmt(K.mean,1)+'.'],
     [nt,'WildBench has 1,024 queries (Table 5)','The released data and README use a 1,000-query subset; GPT-4o grades exist for 1,021 to 1,024 queries per test model.'],
     [nt,'"Figure 5 shows that the ratio of disagreement ..." (§2.4)','The sampling result is Figure 4; Figure 5 is the position experiment. Qwen2-1.5B at three samples: '+fmt(100*RC.fig.fig4_at3['Qwen2-1.5B'],1)+'% (vector figure), matching "exceeding 50%".'],
     [ok,'Disagreement grows with the number of previous questions (Figure 5)','Read from the vector figure: rising at every position for all five models.'],
     [pt,'Test models chosen with no overlap in 95% Elo intervals (A.3.1)','The released list has one overlap: '+RC.elo_ci_overlap.map(p=>p.join(' and ')).join('; ')+' (0.5 Elo). The footnote names 14 models for a set of 12.'],
     [no,'"Llama-3-8B and Mistral-Nemo achieve over 64% agreement" (§4.1)','Table 2: Mistral-Nemo 63.2% and 64.2% (Sup.), Llama-3-8B 63.8% and 62.9%; only one cell exceeds 64%.'],
     [pt,'"For smaller-sized LLMs ... over 60%, outperforming GPT-4" (§4.1)','Over 60% unsupervised: '+RC.t2.small_over60_unsup.join(', ')+'; GPT-4 single-answer grading is 59.6%. Gemma-2-2B reaches 57.9%.'],
     [ok,'Kendall values in Table 3 as discordant pairs','(1 − τ) × 33: GPT-4o 3, Gemma-2-2B 4, Mistral-Nemo 2 and Llama-3-8B 3 with RocketEval, all whole numbers.'],
     [nt,'Supervised labels: "annotations from humans and powerful LLMs" (§3.3)','In the released code and data the labels are GPT-4o grades of 10 training models per query; ExtraTrees with 10 trees of depth 2, one per query. α = entropy of the label histogram / ln 10 (derived), mean '+fmt(REL.alpha.mean,2)+' on WildBench.'],
     [nt,'Training-model ratings in config/rankings/wildbench_train.json','Three names are paired with another model\'s Elo (yi-1.5-34b-chat with Yi-1.5-6B-Chat, deepseek-llm-67b-chat with deepseekv2-chat, pplx-7b-online with neo_7b_instruct_v0.1). The fit uses GPT-4o grades, not these ratings, so no result depends on them.'],
     [ok,'Probability readout beats the hard token (Table 7, w/o Norm Score)','Released gradings against GPT-4o, Pearson soft / hard: '+J.map(j=>j.judge+' '+fmt(j.r_soft,2)+' / '+fmt(j.r_hard,2)).join('; ')+'.'],
     [nt,'Instance-level agreement (Table 2) from released gradings','Only 3 of 6 human-judged models and 2 judges are released. GPT-4 against Claude-v1 (200 votes): Qwen2.5-3B '+fmt(100*MT.two.q3[2],1)+'%, Qwen2.5-0.5B '+fmt(100*MT.two.q05[2],1)+'%, GPT-4 single grades '+fmt(100*MT.two.gpt4[2],1)+'%, human with human '+fmt(100*MT.two.hh[2],1)+'% ('+MT.two.hh[0]+' vote pairs); standard error about '+fmt(100*MT.se_two,1)+' points. Not comparable with Table 2\'s averages over all pairs.']];
    $('tbcL').innerHTML=L.map(r=>'<div class="sp" style="margin:6px 0"><p style="margin:0">'+r[0]+' · <b>'+r[1]+'</b></p><p class="small">'+r[2]+'</p></div>').join('')+'<p class="small mute">'+L.filter(r=>r[0]===ok).length+' reproduce, '+L.filter(r=>r[0]===pt).length+' partly, '+L.filter(r=>r[0]===no).length+' do not; '+L.filter(r=>r[0]===nt).length+' notes. Scripts: <code>recompute.py</code>, <code>mk_data.py</code>, <code>decode_figs.py</code>.</p>'}
  let done=false;onTab('t-tables',()=>{if(done)return;done=true;t1();t2();t3();t4();t5();t6();t7();tf();checks()});
})();
