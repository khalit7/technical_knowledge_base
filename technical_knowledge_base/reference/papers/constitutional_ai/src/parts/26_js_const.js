// ---- The constitution and the numbers: both principle lists verbatim, draw counts, the recomputed counts ----
(function(){
const X=CAI.x,S=CAI.s,RC=PAPER.rc,C=S.chains;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const mx=Math.max(...Object.values(C.draws));
$('kChi').innerHTML='χ² = '+C.chi2_uniform.toFixed(2)+' on '+C.dof+' degrees of freedom, p = '+C.chi2_p.toFixed(2)+', so the counts are consistent with drawing uniformly at random. Draws repeat the previous step\'s principle '+C.consecutive_repeats+' times in 198 consecutive pairs ('+C.consecutive_repeats_expected+' expected at 1 in 16): the draws are with replacement, as the first PALMS chain, principle 1 twice in a row, shows.';
$('kSLl').innerHTML=X.principles.sl.map((p,i)=>{const n=C.draws['harmful'+i]||0;return '<li><div class="pk">Principle '+i+'</div><div><b>Critique:</b> '+esc(p.c)+'</div><div><b>Revision:</b> '+esc(p.r)+'</div><div class="dr"><span class="track"><span class="fill" style="width:'+(100*n/mx).toFixed(1)+'%;display:block"></span></span>drawn '+n+' times</div></li>'}).join('');
const anti=/preachy|overly-reactive|accusatory|condescending|condemnatory|obnoxious/i;
$('kRLl').innerHTML=X.principles.rl.map((p,i)=>'<li'+(anti.test(p)?' class="flagged"':'')+'><div class="pk">Label principle '+(i+1)+(anti.test(p)?' · discourages over-reaction':'')+'</div>'+esc(p)+'</li>').join('');
const row=(what,parts,v,printed,where)=>'<tr><td>'+what+'</td><td>'+parts+'</td><td class="num">'+fmt(v)+'</td><td>'+(printed?'matches the printed '+printed:'derived')+'</td><td>'+where+'</td></tr>';
const A=(t,a)=>'<a href="'+PAPER.meta.ax+'#'+a+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
$('kNumT').innerHTML='<thead><tr><th>Count</th><th>From</th><th class="num">Total</th><th>Check</th><th>Where</th></tr></thead><tbody>'+
 row('Red-team prompts for SL-CAI','42,496 human + 140,335 generated',RC.red_total,'182,831',A('§3.2','S3.SS2'))+
 row('Generated share of those prompts','140,335 / 182,831',Math.round(RC.red_model_share*100),'',A('§3.2','S3.SS2')).replace('<td class="num">'+fmt(Math.round(RC.red_model_share*100))+'</td>','<td class="num">'+(RC.red_model_share*100).toFixed(1)+'%</td>')+
 row('Revisions generated (all kept)','182,831 × 4',RC.sl_revisions,'',A('§3.2','S3.SS2'))+
 row('Helpfulness samples for SL-CAI','135,296 prompts × 2',RC.sl_help_samples,'',A('§3.2','S3.SS2'))+
 row('SL-CAI sequences, one epoch','731,324 + 270,592',RC.sl_sequences,'',A('§3.2','S3.SS2'))+
 row('Optimiser steps at batch 1,024','⌈1,001,916 / 1,024⌉',RC.sl_steps_one_epoch,'',A('§3.2','S3.SS2'))+
 row('PM comparisons','182,831 AI + 135,296 human',RC.pm_total,'',A('§4.2','S4.SS2'))+
 row('RL red-team prompts','182,831 + 491,142',RC.rl_red,'',A('§4.2','S4.SS2'))+
 row('RL helpfulness prompts','135,296 + 474,300',RC.rl_help,'',A('§4.2','S4.SS2'))+
 row('All RL prompts','673,973 + 609,596',RC.rl_prompts,'',A('§4.2','S4.SS2'))+
 row('Crowdworker comparisons for Elo','10,274 helpfulness + 8,135 harmlessness',RC.cmp_total,'',A('§3.3','S3.SS3'))+
 row('HHH comparison questions','221 earlier + 217 new',RC.hhh_total,'438',A('§2','S2'))+
 row('Absolute-harm samples per snapshot','64 prompts × 256 responses',RC.abs_samples,'',A('§4.5','S4.SS5'))+
 row('Released HHH, harmful-or-ethical, harm-type items','repository evals/',S.evals['438HHHEvaluations']+S.evals.HarmfulVsEthical+S.evals.HarmfulnessClassification,'438, 254 and 287 ('+S.evals['438HHHEvaluations']+', '+S.evals.HarmfulVsEthical+', '+S.evals.HarmfulnessClassification+' in the files)',A('§2, App. B','A2'))+
 row('Principles','SL and RL lists in the repository',X.principles.sl.length+X.principles.rl.length,'16 + 16',A('App. C','A3'))+
 '</tbody>';
$('kNumT').insertAdjacentHTML('afterend','<p class="small mute">Rough Elo noise, derived: if the comparisons were spread evenly, each of the 24 snapshots appears in about '+fmt(RC.appear_harm)+' harmlessness and '+fmt(RC.appear_help)+' helpfulness comparisons, a standard error near '+RC.elo_se_harm+' and '+RC.elo_se_help+' Elo for a snapshot near 50% (400 / ln 10 / 0.25 × 0.5 / √n). The paper shows error bars only in Figure 3. On the 438 HHH questions an accuracy of 70%, 80% or 90% has a binomial standard error of '+RC.hhh_se_70+', '+RC.hhh_se_80+' or '+RC.hhh_se_90+' points.</p>');
const H=X.hhh_example;$('kHHH').textContent=H.prompt.replace(/\[\[\[|\]\]\]/g,'');
$('kHHHn').innerHTML='The file marks '+esc(H.correct.join(', '))+' as the better answer: the honest "I can\'t affect the physical world" beats the agreeable but impossible offer. Responses are wrapped in [[[ ]]] in the file (removed here for reading).';
})();
