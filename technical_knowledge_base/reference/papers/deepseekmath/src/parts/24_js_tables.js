// ---- Tables tab: transcribed tables with deltas and sorting, decoded figures as numbers, checks ----
(function(){const KEYS=['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10'];let cur='T1',sortCol=-1,sortDir=-1;
  const NOTES={T1:'Corpus sizes counted with DeepSeek\'s 100K-vocabulary tokenizer. Baseline row: no math training.',T2:'Minerva rows quoted from Lewkowycz et al. (2022). Baseline: Minerva 7B.',T3:'Baseline: Mistral 7B.',T4:'†: the Coder checkpoint just before learning-rate decay, which DeepSeekMath-Base starts from; its code scores (40.2%, 52.6%) are what "maintains" refers to.',
    T5:'Grey in the paper (hatched in the Reading tab): Gemini Ultra and Gemini Pro on GSM8K are majority votes over 32 samples. v1 printed MAmmoTH 70B with tools as 72.4% and 21.1%; v2 corrected it to 76.9% and 41.8% and added SeaLLM-v2. Baseline: Gemini Ultra.',
    T6:'1.3B, 89B-token second-round corpus. Baseline: no continual training.',T7:'The same models as Table 6.',T8:'Two models: DeepSeek-LLM 1.3B (150B tokens) and DeepSeek-Coder-Base-v1.5 7B (40B tokens). Baseline: the first row.',T9:'DeepSeek-Coder-Base-v1.5 7B.',T10:'GC: the gradient coefficient of Eq. 5. Equations 10, 14, 18 and 21 are in Appendix A.1.'};
  segFill('tbM',KEYS.map(k=>[k,'Table '+k.slice(1)]),cur,m=>{cur=m;sortCol=-1;draw()});
  $('tbDelta').addEventListener('change',draw);
  function draw(){const t=TB[cur],num=v=>{const x=parseFloat(String(v).replace('%',''));return /^-?[\d.]+%$/.test(String(v))?x:null};
    $('tbTitle').innerHTML='<b>'+t.title+'</b> · <a href="'+PAPER.meta.ax+'#'+t.anchor+'" target="_blank" rel="noopener noreferrer">in the paper</a>';
    const d=$('tbDelta').checked&&cur!=='T10',base=t.rows[0];let rows=t.rows.map((r,i)=>({r,i}));
    if(sortCol>=0)rows.sort((a,b)=>{const x=num(a.r.v[sortCol]),y=num(b.r.v[sortCol]);return ((x==null?-1e9:x)-(y==null?-1e9:y))*sortDir});
    const hasSize=t.rows.some(r=>r.size),hasG=t.rows.some(r=>r.group);
    let h='<table class="lt"><tr>'+(hasG?'<th>group</th>':'')+'<th>row</th>'+(hasSize?'<th>size</th>':'')+t.cols.map((c,j)=>'<th class="num" data-c="'+j+'" style="cursor:pointer" title="sort">'+c+(sortCol===j?(sortDir<0?' ▼':' ▲'):'')+'</th>').join('')+'</tr>';
    rows.forEach(({r})=>{h+='<tr>'+(hasG?'<td class="small mute">'+(r.half?r.half+', ':'')+(r.group||'')+'</td>':'')+'<td>'+r.label+'</td>'+(hasSize?'<td>'+(r.size||'')+'</td>':'')+r.v.map((v,j)=>{const x=num(v),b=num(base.v[j]);let s=v==='–'?'-':v;
      if(d&&x!=null&&b!=null&&r!==base)s=(x-b>=0?'+':'')+(x-b).toFixed(1);if(r.grey&&r.grey[j])s+=' <span class="small mute">(maj@32)</span>';return '<td class="num">'+s+'</td>'}).join('')+'</tr>'});
    $('tbWrap').innerHTML=h+'</table>';$('tbNote').textContent=NOTES[cur]||'';
    $('tbWrap').querySelectorAll('th[data-c]').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;sortDir=sortCol===c?-sortDir:-1;sortCol=c;draw()}))}
  draw();
  // decoded figures
  let fg='combined_figure_rl';
  function fig(){const F=FIGS[fg],P=F.panels;let h='<table class="lt"><tr><th>panel</th><th>series</th><th class="num">points</th><th class="num">first</th><th class="num">last</th><th class="num">best</th>'+(fg==='combined_figure_rl'?'<th class="num">mean of last 10</th>':'')+'</tr>';
    Object.entries(P).forEach(([b,p])=>Object.entries(p.series).forEach(([n,pts])=>{const best=pts.reduce((a,x)=>x[1]>a[1]?x:a);const l10=pts.slice(-10).reduce((a,x)=>a+x[1],0)/10;
      const xl=v=>fg==='combined_MAJ_PASS'?'K='+v:'step '+fmt(Math.abs(v)<1e-9?0:v);h+='<tr><td>'+b+'</td><td>'+n+'</td><td class="num">'+pts.length+'</td><td class="num">'+pts[0][1].toFixed(2)+' ('+xl(pts[0][0])+')</td><td class="num">'+pts[pts.length-1][1].toFixed(2)+' ('+xl(pts[pts.length-1][0])+')</td><td class="num">'+best[1].toFixed(2)+' ('+xl(best[0])+')</td>'+(fg==='combined_figure_rl'?'<td class="num">'+l10.toFixed(2)+'</td>':'')+'</tr>'}));
    $('tbFigWrap').innerHTML=h+'</table>';
    const g=RC.fig5_gaps_last10;$('tbFigNote').innerHTML=fg==='combined_figure_rl'?'Gaps over the last ten checkpoints (recompute.py): GRPO+OS minus Online RFT '+g.GSM8K['GRPO+OS - Online RFT'].toFixed(2)+' (GSM8K) and '+g.MATH['GRPO+OS - Online RFT'].toFixed(2)+' (MATH); GRPO+PS minus GRPO+OS '+g.GSM8K['GRPO+PS - GRPO+OS'].toFixed(2)+' and '+g.MATH['GRPO+PS - GRPO+OS'].toFixed(2)+'; Online RFT minus RFT '+g.GSM8K['Online RFT - RFT'].toFixed(2)+' and '+g.MATH['Online RFT - RFT'].toFixed(2)+'. One evaluation\'s binomial standard error at these accuracies: about 1.3 points (GSM8K, 1,319 problems) and 0.64 (MATH, 5,000), assuming the standard test sets.':
      fg==='iter_rl'?'Iteration 1 starts at step 1,100 from iteration 0; iteration 2 starts at step 2,700 from iteration 1. Table 5\'s 88.2% and 51.7% do not appear together at any plotted step (closest: iteration 2 at step 2,900, 87.9% and 51.7%).':'Values are exact to the 0.1 point the figure\'s scale allows; Maj@1 = Pass@1 = top-1 at temperature 0.7 (44.6% and 50.9% on MATH, below Table 5\'s 46.8% and 51.7%; the paper does not say how Table 5\'s top-1 was decoded, presumably greedily).'}
  segOn('tbFM',m=>{fg=m;fig()});fig();
  // checks
  const C=[['ok','"120B tokens … almost 7 times the size of the math web pages used by Minerva and 9 times … OpenWebMath" (§1.1)','120.2 / 17.5 = 6.9 (Minerva\'s 17.5B tokens of math web pages); 120.2 / 13.6 = 8.8.'],
    ['ok','"a closed-source base model 77 times larger" (§2.3)','540 / 7 = 77.1.'],
    ['ok','"surpasses existing open-source base models by over 10% absolute" on MATH (§2.3)','36.2 − 25.3 (Llemma 34B) = 10.9 points.'],
    ['mid','"outperforms Minerva 540B" (§2.3); "comparable" (§1.1)','Ahead on GSM8K (+5.4) and MATH (+2.6); behind on OCW (−2.2) and MMLU-STEM (−7.4). "Comparable" is the fair word.'],
    ['ok','Instruct "surpasses all open-source models and the majority of proprietary models (e.g., Inflection-2 and Gemini Pro) by at least 9% absolute" on MATH (§3.2)','+9.1 over the best other open model (InternLM2-Math 37.7%), +12.0 over Inflection-2, +14.2 over Gemini Pro.'],
    ['ok','RL: GSM8K 82.9 → 88.2, MATH 46.8 → 51.7, CMATH 84.6 → 88.8; "improves over DeepSeekMath-Instruct 7B on all benchmarks" (§1, Table 5)','All eight differences positive: +5.3, +4.9, +6.4, +4.2 (chain-of-thought); +3.0, +1.4, +6.4, +3.3 (tools). The MATH gain is about 5 standard errors on 5,000 problems.'],
    ['mid','"over 50% on the competition-level MATH dataset for the first time within the open-source community" (§1.2)','True without tools. With tools, Table 5 already has InternLM2-Math 20B at 54.3% and DeepSeek-LLM-Chat 67B at 51.1%.'],
    ['ok','"Self-consistency over 64 samples … achieves 60.9% on MATH" (abstract)','Figure 7 decoded: Maj@64 of the RL model on MATH = 60.9%.'],
    ['mid','"Online RFT significantly outperforms RFT" (§5.2.1)','Last-ten-checkpoint means: +2.4 (GSM8K), +1.3 (MATH): about two standard errors, one run each.'],
    ['no','"GRPO surpasses online RFT, thereby highlighting the efficiency of altering positive and negative gradient coefficients" (§5.2.1)','+0.8 (GSM8K) and +0.4 (MATH): within one standard error of a single evaluation, one run each, and GRPO also used a learned reward where Online RFT used the rule.'],
    ['mid','"GRPO+PS shows superior performance compared to GRPO+OS" (§5.2.1)','+1.7 (GSM8K), +0.3 (MATH). The old summary\'s "especially on MATH" has it backwards.'],
    ['mid','"iterative RL significantly improves the performance, especially at the first iteration" (§5.2.1)','GSM8K: iteration ends 86.0, 87.9, 88.8. MATH: 48.7, 51.6, 51.3: iteration 2 adds nothing on MATH.'],
    ['ok','"RL enhances Maj@K but not Pass@K" (Figure 7)','Maj@64 +1.5 (GSM8K) and +1.0 (MATH); Pass@64 −1.8 and −0.7.'],
    ['mid','"maintains the performance of DeepSeek-Coder-Base-v1.5 on the two coding benchmarks" (§2.3)','Against the † checkpoint it started from: 40.9 vs 40.2 (HumanEval), 52.6 vs 52.6 (MBPP). Against the released Coder model: 40.9 vs 43.2, 52.6 vs 60.4.'],
    ['no','GRPO "significantly reducing training resources"; "less memory consumption" (§4.1, §6)','No measurement in the paper. Derived here: about 44% less weight and optimiser memory for a 7B policy with a 7B reward model.'],
    ['mid','Eq. 12 (DPO objective)','The rejected sequence\'s log-ratio is written over o⁻<sub>&lt;t</sub> where o⁻<sub>t</sub> is meant. Eq. 14 writes DPO\'s coefficient with per-token log-ratios; Eq. 12 implies the per-sequence average. PyTorch autograd of the corrected Eq. 12 matches the toy\'s DPO gradient to 1e-17.'],
    ['mid','Algorithm 1, line 11: "maximizing the GRPO objective (Equation 21)"','Equation 21 is the gradient coefficient; the objective is Eq. 3 (or Eq. 19 in the appendix).'],
    ['ok','Appendix A.1.6: GC_GRPO = Â + β(π_ref/π − 1) (Eq. 21)','Confirmed by autograd of Eq. 3 with the k3 term at π_old = π (toy check, 1e-16). The same coefficient is, in expectation, the gradient of KL(π_ref ‖ π), not of the KL(π ‖ π_ref) the objective names (Tang and Munos, 2025).'],
    ['mid','Table 10: PPO and GRPO reward "Model"; RFT, Online RFT, DPO "Rule"','So Figure 5 compares different reward functions as well as different coefficients; §5.2.1 says the reward model\'s training data "is based on the rule judgment".'],
    ['ok','v1 → v2 → v3','v2 corrects MAmmoTH 70B (tools) from 72.4% / 21.1% to 76.9% / 41.8% and adds SeaLLM-v2 7B; v3 adds two authors (Xiao Bi, Haowei Zhang). No result changed.']];
  $('tbChkList').innerHTML=C.map(([v,c,r])=>'<li><span class="vd '+v+'">'+(v==='ok'?'holds':v==='no'?'not shown':'partly')+'</span>'+c+'. '+r+'</li>').join('')})();
