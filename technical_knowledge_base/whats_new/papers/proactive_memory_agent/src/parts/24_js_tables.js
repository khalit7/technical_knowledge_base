// ---- Tables tab ----
(function(){const RC=window.PAPER.rc,TB=window.PAPER.tables;
  const f1=v=>(+v).toFixed(1),sg=v=>(v>0?'+':'')+v;
  // Table 1
  $('tb1').innerHTML='<thead><tr><th>Benchmark</th><th>Split</th><th>Action model</th><th class="num">n</th><th class="num">Baseline</th><th class="num">tasks</th><th class="num">+ Memory</th><th class="num">tasks</th><th class="num">Δ printed</th><th class="num">Δ from counts</th></tr></thead><tbody>'+
    TB.T1.rows.map(r=>{const c=RC.t1.find(x=>x.bench===r[0]&&x.split===r[1]&&x.actor===r[2]);let kb,km,dc;
      if(c){kb=c.kb;km=c.km;dc=c.d_counts.toFixed(2)}else{const a=RC['tau_avg_'+r[2].split(' ')[0]];kb=a.kb;km=a.km;dc=(100*(km-kb)/278).toFixed(2)}
      const trunc=r[1].indexOf('avg')>=0&&r[2]==='Sonnet 4.5';
      return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+f1(r[4])+'%</td><td class="num">'+kb+'</td><td class="num">'+f1(r[5])+'%'+(trunc?'*':'')+'</td><td class="num">'+km+'</td><td class="num">+'+f1(r[6])+'</td><td class="num">+'+dc+'</td></tr>'}).join('')+'</tbody>';
  $('tb1').insertAdjacentHTML('afterend','<p class="small mute">* 172 of 278 is 61.87%, printed 61.8 (truncated, not rounded); the text quotes retail as "+9.7 pp" (58.8 minus 49.1) where the table prints +9.6 (11 tasks, 9.65).</p>');
  // Table 2
  let m2='p';function t2(){const rows=TB.T2.rows,R=RC.t2,full=R[1];
    let h='<thead><tr><th>Variant</th><th>Phase 1</th><th>Phase 2</th><th class="num">Airline</th><th class="num">Retail</th><th class="num">Telecom</th><th class="num">Macro</th><th class="num">Micro</th></tr></thead><tbody>';
    rows.forEach((r,i)=>{const c=R[i];let cells;
      if(m2==='p')cells=[f1(r[3]),f1(r[4]),f1(r[5]),f1(r[6])+' <span class="mute">('+c.macro.toFixed(2)+')</span>',f1(r[7])+' <span class="mute">('+c.micro.toFixed(2)+')</span>'];
      else if(m2==='k')cells=[c.k[0]+'/50',c.k[1]+'/114',c.k[2]+'/114','',c.solved+'/278'];
      else cells=[sg(c.k[0]-full.k[0]),sg(c.k[1]-full.k[1]),sg(c.k[2]-full.k[2]),'',sg(c.solved-full.solved)];
      h+='<tr'+(i===1?' style="font-weight:600"':'')+'><td>'+r[0]+'</td><td class="small">'+(r[1]||'')+'</td><td class="small">'+(r[2]||'')+'</td>'+cells.map(x=>'<td class="num">'+x+'</td>').join('')+'</tr>'});
    $('tb2').innerHTML=h+'</tbody>'}
  segBind('tb2M',m=>{m2=m;t2()});t2();
  // noise
  $('tbN').innerHTML='<thead><tr><th>Comparison</th><th class="num">n</th><th class="num">Net tasks</th><th class="num">Δ (pp)</th><th class="num">Unpaired SE (pp)</th><th class="num">Δ / SE</th><th class="num">Paired: significant if at most this many tasks changed</th></tr></thead><tbody>'+
    RC.noise.map(x=>'<tr><td>'+x.k+'</td><td class="num">'+x.n+'</td><td class="num">+'+x.net+'</td><td class="num">'+x.d.toFixed(1)+'</td><td class="num">'+x.se.toFixed(1)+'</td><td class="num">'+x.z.toFixed(2)+'</td><td class="num">'+(x.max_disc!=null?x.max_disc:'never (even '+x.net+' wins and 0 losses gives p = '+x.p_best.toFixed(2)+')')+'</td></tr>').join('')+'</tbody>';
  // Table 4
  $('tb4').innerHTML='<thead><tr><th>Setup</th><th class="num">Avg. reward</th><th class="num">Solved</th><th class="num">Δ reward</th><th class="num">Implied n if binary</th></tr></thead><tbody>'+
    TB.T5.rows.map((r,i)=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1].toFixed(3)+'</td><td class="num">'+r[2]+'</td><td class="num">'+(r[3]==null?'':(r[3]>0?'+':'')+r[3].toFixed(3))+'</td><td class="num">'+RC.seta_implied_n[i]+'</td></tr>').join('')+
    '<tr><td colspan="5" class="small mute">Transfer to Terminal-Bench 2.0 (n = 85): Qwen3.5-122B-A10B alone 37.6% (32 tasks); with the trained Qwen3.5-27B memory 41.1% (35 tasks, 41.18%, truncated), +3.5 pp.</td></tr></tbody>';
  // claim checks
  const C=[
    ['Abstract: "+8.3 pp on Terminal-Bench and +6.8 pp on τ²-Bench"','reproduces','Sonnet 4.5 rows: 32 → 39 of 85, 153 → 172 of 278.'],
    ['§4.2: Sonnet retail "+9.7 pp"','text and table differ','Table 1 prints +9.6; 56 → 67 of 114 is +9.65. The text subtracted the rounded percentages.'],
    ['Table 1: Sonnet τ² task-weighted 61.8%','truncated','172/278 = 61.87%, which rounds to 61.9. Every other cell is rounded.'],
    ['Table 4: trained memory 41.1% on Terminal-Bench','truncated','35/85 = 41.18%, rounds to 41.2.'],
    ['Table 1 vs Table 2: the full memory agent, Sonnet actor, τ²-Bench','two different runs','Retail 58.8% (67) in Table 1, 57.0% (65) in Table 2; task-weighted 61.8% and 61.2%; airline and telecom identical.'],
    ['§4.3: full-bank context "trails the full system by 2.8 macro points and 2.6 micro points"','reproduces','64.30 − 61.51 = 2.79; 61.15 − 58.63 = 2.52, printed 61.2 − 58.6 = 2.6.'],
    ['§4.3: always inject "slightly leads on micro-average by 0.3 points ... within expected run variance and disappears on the macro-average"','reproduces; the macro gap is also within that spread','171 against 170 tasks; macro 63.47 against 64.30, i.e. 3 airline tasks against 2 retail and 2 telecom the other way.'],
    ['§4.3: the full agent "achieves the highest macro-average, improving all three domains"','reproduces','Macro 64.3 is the highest; it improves airline, retail and telecom over the baseline. Mem0 has the highest retail (68 tasks), injection-only the highest telecom (76).'],
    ['§4.3: Mem0 "does not improve airline over the baseline"','reproduces','34 of 50 in both.'],
    ['§4.2: gains "do not disappear for the stronger" actor','holds in sign, small in tasks','Opus 4.6: +2 tasks on Terminal-Bench, +7 on τ²-Bench (0 on airline).'],
    ['§3.4 and Figure 1: memory agent runs "at a fixed interval" / "every N steps"','experiments use N = 1','§4.1 and the released configuration run it at every step (trigger_interval: 1).'],
    ['Released configuration header: "single-phase tool-only memory"','contradicts the method','The code it runs is the two-phase agent (memory_agent.py: Phase 1 tools, Phase 2 text).'],
    ['§1: the memory agent injects "a concise reminder"','not in the released traces','Mean reminder length 1,523 characters (about 400 tokens) over 52 reminders; 27 of 52 read as new diagnoses rather than reminders.'],
    ['§4.5 / Table 4: "RL improves the decision of when remembered state should enter the control loop"','not measured as such','SFT and GRPO solve the same 58 validation tasks; the gain is 0.014 in average reward; the decision itself is never evaluated.'],
    ['Takeaway and earlier summary: "Qwen3.5-27B: 37.6% to 41.1%"','corrected','The actor is Qwen3.5-122B-A10B; Qwen3.5-27B is the trained memory agent.']];
  $('tbC').innerHTML='<div class="tw"><table class="clt"><thead><tr><th>Claim</th><th>Verdict</th><th>Evidence</th></tr></thead><tbody>'+C.map(c=>'<tr><td>'+c[0]+'</td><td><b>'+c[1]+'</b></td><td>'+c[2]+'</td></tr>').join('')+'</tbody></table></div>';
})();
