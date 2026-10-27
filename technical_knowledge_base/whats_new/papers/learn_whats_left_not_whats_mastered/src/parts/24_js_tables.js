// ---- Tables tab: the four tables with differences from GDPO, Figure 1 recomputed, claims checked ----
(function(){const T=PAPER.tables,R=PAPER.rc,BM=T.bench;let cur='T1';
  const NOTES={T1:'Accuracy higher is better; Exceed (share of answers over the 4,000-token budget) lower is better. The 7B model was trained only with three objectives; the 3B Base column is shared by both 3B settings. Differences pair each SA-MRPO column with the GDPO column of the same setting.',
    T2:'DeepSeek-R1-Distill-Qwen-7B, correctness plus the graded length reward. Len is the average number of generated tokens. No Base row is printed. The Δ column is the paper\'s; every Δ equals SA-MRPO minus GDPO as printed, and the averages recompute to 26.62 and 22.82.',
    T3:'Qwen2.5-7B-Instruct on Eurus-2-RL. Pass is the average test-case pass rate (higher is better); Bug is the share of programs with compile or runtime errors (lower is better).',
    T4:'Qwen2.5-3B-Instruct, correctness plus binary length. Its γ = 0 and γ = 0.25 columns are identical, cell for cell, to Table 1\'s GDPO and SA-MRPO two-objective columns (the caption says so for γ = 0.25), although §5.5 says these runs train for one epoch and §5.1 says three.'};
  const pc=s=>parseFloat(String(s).replace('%','').replace('+',''));
  const dl=(v,b,lowGood)=>{const d=Math.round((pc(v)-pc(b))*10)/10;const good=lowGood?d<0:d>0;return '<span style="color:'+(d===0?'var(--mute)':good?'var(--good)':'var(--bad)')+'">'+(d>0?'+':d<0?'−':'±')+Math.abs(d).toFixed(1)+'</span>'};
  function draw(){const t=T[cur],d=$('tbDelta').checked;$('tbTitle').innerHTML='<b>'+{T1:'Table 1: GDPO against SA-MRPO on math, two and three objectives',T2:'Table 2: adaptive reasoning with a saturated length objective',T3:'Table 3: code generation',T4:'Table 4: the saturation exponent γ'}[cur]+'</b> · <a href="'+PAPER.meta.ax+'#S5.'+cur+'" target="_blank" rel="noopener noreferrer">in the paper</a>';
    let h='<table class="lt"><tr><th>benchmark</th><th>metric</th>';
    if(cur==='T1'){h+=t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>';BM.forEach(b=>['Acc','Exceed'].forEach((m,r)=>{h+='<tr><td>'+(r?'':b)+'</td><td>'+m+'</td>'+t.rows[b][r].map((v,j)=>'<td class="num">'+v+(d&&[2,5,7].includes(j)?' <small>'+dl(v,t.rows[b][r][j-1],r===1)+'</small>':'')+'</td>').join('')+'</tr>'}))}
    if(cur==='T2'){h=h.replace('<th>metric</th>','')+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>';BM.concat(['Average']).forEach(b=>{const r=t.rows[b];h+='<tr><td>'+b+'</td>'+r.map((v,j)=>'<td class="num">'+v+(d&&j===1?' <small>'+dl(v,r[3],false).replace(/color:[^"]*/,'color:var(--mute)')+'</small>':'')+'</td>').join('')+'</tr>'})}
    if(cur==='T3'){h+=t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>';Object.keys(t.rows).forEach(b=>['Pass','Bug'].forEach((m,r)=>{h+='<tr><td>'+(r?'':b)+'</td><td>'+m+'</td>'+t.rows[b][r].map((v,j)=>'<td class="num">'+v+(d&&j===2?' <small>'+dl(v,t.rows[b][r][1],r===1)+'</small>':'')+'</td>').join('')+'</tr>'}))}
    if(cur==='T4'){h+=t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>';BM.forEach(b=>['Acc','Exceed'].forEach((m,r)=>{h+='<tr><td>'+(r?'':b)+'</td><td>'+m+'</td>'+t.rows[b][r].map((v,j)=>'<td class="num">'+v+(d&&j>=2?' <small>'+dl(v,t.rows[b][r][1],r===1)+'</small>':'')+'</td>').join('')+'</tr>'}));
      h+='<tr><td><b>average</b></td><td>Acc</td>'+R.T4.avg_acc.map(v=>'<td class="num"><b>'+v.toFixed(2)+'%</b></td>').join('')+'</tr><tr><td></td><td>Exceed</td>'+R.T4.avg_exceed.map(v=>'<td class="num">'+v.toFixed(2)+'%</td>').join('')+'</tr>'}
    $('tbWrap').innerHTML=h+'</table>';$('tbNote').textContent=NOTES[cur]+(cur==='T1'?' Averages over the five benchmarks (derived): 7B '+R.T1.deltas['7B, 3 objectives'].avg_gdpo+'% against '+R.T1.deltas['7B, 3 objectives'].avg_sa+'%; 3B two objectives '+R.T1.deltas['3B, 2 objectives'].avg_gdpo+'% against '+R.T1.deltas['3B, 2 objectives'].avg_sa+'%; 3B three objectives '+R.T1.deltas['3B, 3 objectives'].avg_gdpo+'% against '+R.T1.deltas['3B, 3 objectives'].avg_sa+'%.':'')}
  segBind('tbM',m=>{cur=m;draw()});$('tbDelta').addEventListener('change',draw);
  // Figure 1
  const f=R.fig1,row=(n,a,p)=>'<tr><td>'+n+'</td>'+a.map((v,j)=>'<td class="num">'+sgn(v)+(p?' <small class="mute">('+sgn(p[j])+')</small>':'')+'</td>').join('')+'</tr>';
  $('tbFig1Wrap').innerHTML='<table class="lt"><tr><th>recipe (printed in brackets)</th><th class="num">answer 1</th><th class="num">answer 2</th><th class="num">answer 3</th><th class="num">answer 4</th></tr>'+row('GRPO',f.grpo,f.printed.grpo)+row('GDPO',f.gdpo,f.printed.gdpo)+row('SA-MRPO, γ = 1, no Eq. 1',f.sa_g1_unnormalised,f.printed.sa)+row('SA-MRPO, γ = 1, with Eq. 1',f.sa_g1_eq1)+row('SA-MRPO, γ = 0.5, no Eq. 1',f.sa_g05_unnormalised)+row('SA-MRPO, γ = 0.5, with Eq. 1',f.sa_g05_eq1)+'</table>';
  const C=[['ok','12 of 15','SA-MRPO above GDPO in 12 of 15 Table 1 accuracy cells (4 of 5 per setting): recounted, '+R.T1.wins_total+' of 15.'],
    ['ok','+5.0, +3.5','AIME24 +5.0 and MATH500 +3.5 for 7B (§5.2): recomputed from Table 1.'],
    ['ok','+3.8, +9.2','Adaptive average +3.8 (26.6 against 22.8) and AMC23 +9.2 (§5.3): the averages recompute to 26.62 and 22.82; every printed Δ is consistent.'],
    ['ok','333 to 459','Average length 333 to 459 tokens: recomputes to 332.6 and 459.4.'],
    ['ok','0.6, 1.4, 2.3, −0.4','Code pass-rate differences (§5.4): recomputed from Table 3.'],
    ['ok','γ = 0.5','"γ = 0.5 achieves the highest average accuracy and the strongest performance on AIME24 and AMC23" (§5.5): true, 28.04% against 27.84% (0.75), 27.64% (1.0), 27.50% (0.25) and 26.42% (0).'],
    ['mid','Exceed','"Only small changes in Exceed" (§5.2): small, but Exceed rises in 10 of 15 cells and falls in 2 (3B two objectives: up on 4 of 5, equal on 1).'],
    ['mid','bug rates','"Comparable bug rates" (§5.4): SA-MRPO\'s bug rate is equal or higher on all four code benchmarks (+1.4, 0.0, +0.4, +1.4).'],
    ['no','γ used','The main 3B two-objective result used γ = 0.25 (Table 4 caption), not the recommended 0.5; the γ of every other run is unstated.'],
    ['no','epochs','§5.5: γ runs train "for one epoch"; §5.1: all models train 3 epochs; Table 4\'s γ = 0 and 0.25 columns equal Table 1\'s, cell for cell.'],
    ['mid','Figure 1','The SA-MRPO advantages in Figure 1 correspond to γ = 1 with the batch standardisation of Eq. 1 skipped, a step the method as defined includes; its rewards are graded out of 100 although format and correctness are binary in §5.2.'],
    ['ok','Algebra','γ = 0 gives GDPO; one objective gives GRPO (up to a positive batch rescale); the weight ratio is strictly decreasing in γ when s_a > s_b: verified, and the toy\'s implementation of all three recipes matches PyTorch to 1e-15.'],
    ['mid','"about 40K"','DeepScaleR-Preview has 40,315 problems; one epoch at batch 256 is 157 steps, three epochs 472.']];
  $('tbChecksList').innerHTML=C.map(([v,k,t])=>'<li><span class="vd '+v+'">'+k+'</span> '+t+'</li>').join('');
  onTab('t-tables',draw);
})();
