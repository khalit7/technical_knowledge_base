// ---- Figures tab: every figure rebuilt from its decoded vector data, Tables 1 and 2, checks ----
(function(){const RC=PAPER.rc,TB=PAPER.tables,lab=f=>{const o={};Object.values(FIGS[f].series).forEach(s=>o[s.label]=s);return o};
  const SEc=(p,n)=>Math.sqrt(p*(1-p)/n);
  // Figure 2 left
  const names=Object.values(FIGS.frontier.series).map(s=>s.label),show={};names.forEach(n=>show[n]=true);let env=true;
  $('f2Show').innerHTML=names.map((n,i)=>'<label><input type="checkbox" id="f2c'+i+'" checked> '+n+'</label>').join('');
  names.forEach((n,i)=>$('f2c'+i).addEventListener('change',e=>{show[n]=e.target.checked;refit($('f2Svg'))}));$('f2Env').addEventListener('change',e=>{env=e.target.checked;refit($('f2Svg'))});
  fit($('f2Svg'),w=>drawF2($('f2Svg'),w,show,{env}));
  const FA=RC.frontier_at,dom=RC.frontier_dominated;
  $('f2Tab').innerHTML='<thead><tr><th>method</th><th>points</th><th>best reward at KL ≤ 2</th><th>≤ 5</th><th>≤ 10</th><th>highest reward (at KL)</th><th>points beaten by a DPO point</th></tr></thead><tbody>'+names.map(n=>'<tr><td>'+n+'</td><td>'+RC.frontier_counts[n]+'</td>'+['2','5','10'].map(k=>'<td>'+(FA[k][n]==null?'':FA[k][n].toFixed(3))+'</td>').join('')+'<td>'+RC.frontier_max[n][0].toFixed(3)+' ('+RC.frontier_max[n][1].toFixed(1)+')</td><td>'+(dom[n]?dom[n][0]+' of '+dom[n][1]:'')+'</td></tr>').join('')+'</tbody>';
  // Figure 2 right
  const T=lab('tldr_winrate_vs_temp'),TC={DPO:'var(--c1)',PPO:'var(--c2)','Best of 128':'var(--c3)',SFT:'var(--c5)','Preferred-FT':'var(--c4)','GPT-J':'var(--mu)'};
  function wr(el,w,S,cols,xs,o){o=o||{};const H=w<500?250:290,nm=Object.keys(S);const leg=legendW(nm.map(n=>[n,cols[n]||'var(--ink)','l']),46,14,w-56);
    const f=linFrame({W:w,H,pl:42,pr:10,pt:10+leg.h,pb:32,x:o.x||[0,1],y:o.y||[0,0.75],xl:o.xl||'sampling temperature',yl:o.yl||'GPT-4 win rate',fx:o.fx||(v=>v.toFixed(2)),fy:v=>pc(v,0),xt:o.xt});let s=f.s+leg.s;
    if(o.half)s+=ln2(42,f.Y(0.5),w-10,f.Y(0.5),'var(--mute)',{sw:1,da:'4 3'});
    nm.forEach(n=>{const sr=S[n],c=cols[n]||'var(--ink)',pts=sr.line.map(p=>[o.xmap?o.xmap(p[0]):p[0],p[1]]);s+=lineS(pts,f.X,f.Y,c);
      (sr.bars||[]).forEach((b,i)=>{const x=pts[i]?pts[i][0]:b[0];s+=ln2(f.X(x),f.Y(b[1]),f.X(x),f.Y(b[2]),c,{sw:1.2,op:.7})});pts.forEach((p,i)=>{s+=dotS(f.X(p[0]),f.Y(p[1]),2.6,c,{t:n+': '+pc(p[1])+(o.n?' ('+Math.round(p[1]*o.n)+' of '+o.n+')':'')})})});
    el.innerHTML=svgW(w,H,s,'win rates')}
  fit($('f2rSvg'),w=>wr($('f2rSvg'),w,T,TC,null,{half:true,n:256,xmap:x=>x<0.05?0:x}));
  const tt=['0','0.25','0.5','0.75','1.0'];
  $('f2rTab').innerHTML='<thead><tr><th>method</th>'+tt.map(t=>'<th>T = '+t+'</th>').join('')+'</tr></thead><tbody>'+Object.keys(RC.tldr).map(n=>'<tr><td>'+n+'</td>'+RC.tldr[n].map(k=>'<td>'+k+' <span class="mute">('+pc(k/256)+' ± '+(100*SEc(k/256,256)).toFixed(1)+')</span></td>').join('')+'</tr>').join('')+'</tbody>';
  // Figure 3
  const D=lab('dialogue_winrate_vs_temp'),S3=lab('dialogue_winrate_vs_steps'),DC={DPO:'var(--c1)','Best of 128':'var(--c3)','Preferred-FT':'var(--c4)','Pythia-2.8B':'var(--mu)'};
  let f3='t';segBind('f3M',m=>{f3=m;refit($('f3Svg'))});
  fit($('f3Svg'),w=>{if(f3==='t'){wr($('f3Svg'),w,D,DC,null,{half:true,x:[0.2,1.05],y:[0.1,0.7],xt:[0.25,0.5,0.75,1],xmap:x=>Math.round(x*20)/20});$('f3Out').innerHTML='DPO\'s best, '+pc(RC.hh_dpo_max)+' at T = 1.0, against Best of 128\'s '+pc(RC.hh_bo128_max)+' at T = 1.0: z ≈ '+RC.hh_dpo_vs_bo_z.toFixed(1)+' with about 250 prompts each. At T = 0.25 DPO wins '+pc(RC.hh_dpo_t025)+' and Best of 128 '+pc(RC.hh_bo_t025)+'. The dashed line is the dataset\'s own chosen responses (50%).'}
    else{wr($('f3Svg'),w,S3,{'DPO (temp = 1.0)':'var(--c1)','DPO (temp = 0.7)':'var(--c6)'},null,{half:true,x:[0,3400],y:[0.3,0.72],xl:'fine-tuning step',fx:v=>fmt(v),xmap:x=>Math.round(x/300)*300});$('f3Out').innerHTML='DPO reaches its level within about 300 to 600 steps and then wanders by a few points either way (one run per temperature); the paper suggests the slight late decline might be reward over-optimisation (<a href="'+PAPER.meta.ax+'#S7" target="_blank" rel="noopener noreferrer">§7</a>).'}});
  // Figure 4
  const B1=lab('dialogue_winrate_vs_temp_rerank'),B2=lab('tldr_rerank_vs_temp'),BC={'Best of 1':'var(--mu)','Best of 4':'var(--c5)','Best of 16':'var(--c4)','Best of 64':'var(--c2)','Best of 128':'var(--c3)','Best of 256':'var(--c1)'};
  let f4='hh';segBind('f4M',m=>{f4=m;refit($('f4Svg'))});
  fit($('f4Svg'),w=>f4==='hh'?wr($('f4Svg'),w,B1,BC,null,{half:true,x:[0.2,1.05],y:[0.2,0.65],xt:[0.25,0.5,0.75,1],xmap:x=>Math.round(x*20)/20}):wr($('f4Svg'),w,B2,BC,null,{half:true,y:[0.35,0.65],n:256,xmap:x=>x<0.05?0:x}));
  // Table 1
  $('t1Tab').innerHTML='<thead><tr><th>algorithm</th>'+TB.t1.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+TB.t1.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody>';
  $('t1Out').innerHTML='Printed to two decimals; the number of CNN/DailyMail articles is not given. The 0.10 gap at temperature 0 is z = '+RC.t1_z_n100.toFixed(1)+' if 100 articles were judged, '+RC.t1_z_n256.toFixed(1)+' at 256 (the TL;DR count), '+RC.t1_z_n500.toFixed(1)+' at 500: "a significant margin" holds only if the test used a few hundred articles. Both policies lose to the human summaries most of the time.';
  // Table 2
  const t2=TB.t2;$('t2Tab').innerHTML='<thead><tr><th></th>'+t2.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+t2.rows.map(r=>'<tr><td>'+r[0]+'</td>'+r.slice(1).map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'<tr><td><i>± 1 SE of human win %</i></td>'+t2.cols.map(c=>'<td>'+RC.t2_se[c]+'</td>').join('')+'</tr></tbody>';
  $('t2Out').innerHTML='Each column compares the method with PPO at temperature 0 ('+t2.note+'). Standard errors are binomial over respondents, treating each as one judgment. The human preference for DPO, 58% of 272, is '+RC.t2_dpo_human_z_vs_half.toFixed(1)+' standard errors above an even split. Agreement with humans is of the same order as humans with each other (67 to 85% against 65 and 87%), which is what the paper claims; it is also what one would expect when most comparisons are easy (PPO-1 loses 83% of the time).';
  // checks
  const C=[
   ['no','Appendix A.4, Eq. 21 swaps the two answers inside the sigmoid (log σ(β log π(y<sub>l</sub>)/π<sub>ref</sub> − β log π(y<sub>w</sub>)/π<sub>ref</sub>)), and A.4\'s final gradient carries the weight σ(r̂<sub>w</sub> − r̂<sub>l</sub>), the opposite of §4\'s σ(r̂<sub>l</sub> − r̂<sub>w</sub>). §4 is right: it is what PyTorch autograd returns for Eq. 7 (this page\'s check_engine.py), and it is the version the text explains ("higher weight when reward estimate is wrong"). Same in v1 and v3.','A1.SS4'],
   ['no','§5.2 says "π* is the optimal policy from Eq. 7 induced by the reward function r<sub>φ</sub>"; the optimal policy is Eq. 4 (Eq. 7 is the DPO loss).','S5.SS2'],
   ['mid','§4 cites "Appendix Table 3" for the claim that the unweighted objective degenerates; Table 3 shows two Unlikelihood samples on TL;DR at temperature 1.0 ("when when when ..."), a qualitative illustration rather than an ablation of the weight.','A3.T3'],
   ['ok','"DPO has a win rate of approximately 61% at a temperature of 0.0" and "PPO at 57%": the figure gives 158 and 146 of 256, 61.7% and 57.0%.','S6.SS2'],
   ['ok','"DPO samples at temperature 0.25 were preferred 58% times over PPO samples at temperature 0" (§6.2) matches Table 2\'s human win rate for DPO.','S6.T2'],
   ['mid','"DPO also achieves a higher maximum win rate compared to the best of N baseline" on TL;DR: 61.7% against 57.4% (Best of 128 at T = 0.5), z ≈ '+RC.tldr_dpo_vs_bo_z.toFixed(1)+'.','S6.SS2'],
   ['mid','On HH, "DPO performs as well or better for the best-performing temperatures for each method": 62.9% against Best of 128\'s 60.8%, both at T = 1.0; z ≈ '+RC.hh_dpo_vs_bo_z.toFixed(1)+'.','S6.SS2'],
   ['ok','Figure 2 left: every PPO and PPO-GT evaluation except the untrained starting checkpoints is beaten by a DPO point on both axes (26 of 27, 28 of 29, 34 of 35), so "strictly dominates" holds for the plotted points.','S6.F2'],
   ['ok','The sweep is described as "22 runs in total"; the figure has 6 methods and 177 evaluation points, consistent with 22 runs evaluated every 100 steps, though runs cannot be told apart.','S6.SS1'],
   ['mid','Versions: v2 (December 2023) added §6.3 and Table 1 (CNN/DailyMail) and softened the abstract from "exceeds RLHF\'s ability to control sentiment ... and improves response quality" to "exceeds PPO-based RLHF ... and matches or improves"; v3 (July 2024) adds two citations and rewords §3 slightly. The experimental numbers are the same in all three.','S1']];
  $('chkList').innerHTML=C.map(([v,t,a])=>'<li><span class="vd '+v+'">'+(v==='ok'?'holds':v==='no'?'slip':'note')+'</span>'+t+' <a href="'+PAPER.meta.ax+'#'+a+'" target="_blank" rel="noopener noreferrer">in the paper</a></li>').join('');
  onTab('t-tables',()=>['f2Svg','f2rSvg','f3Svg','f4Svg'].forEach(id=>refit($(id))));
})();
