// ---- Tables tab: Tables 1, 2, 4 (interactive), Table 3 and the swarm, Figures 6 to 8 rebuilt, every check ----
(function(){
const TB=PAPER.tables,RC=PAPER.rc,AX=PAPER.meta.ax;
let bk='sol';
const COLS=[['input','Input (B)',4],['cache_read','Cache read (B)',4],['cache_write','Cache write (B)',4],['output','Output (B)',4],['total','Total (B)',4],['cost','Cost ($)',0],['score','Avg. score',3],['eff','$ / score',4]];
function rows(){const abl=TB.abl[bk==='sol'?'GPT-5.6 Sol':'Opus 5'],main=TB[bk];
  const out=main.filter(r=>r.kind==='native'||r.kind==='third').map(r=>Object.assign({src:bk==='sol'?'Table 1':'Table 2'},r));
  abl.forEach(r=>out.push(Object.assign({src:'Table 4'},r)));return out}
function drawTb(){const v=$('tbV').value,so=$('tbS').value;let R=rows();const pi=R.find(r=>r.kind==='pi');
  if(so!=='paper')R=R.slice().sort((a,b)=>so==='score'?b.score-a.score:a[so]-b[so]);
  let h='<table><thead><tr><th>Harness</th>'+COLS.map(c=>'<th class="num">'+c[1]+'</th>').join('')+'</tr></thead><tbody>';
  R.forEach(r=>{h+='<tr'+(r.kind==='pi'?' class="basec"':'')+'><td>'+r.name+(r.perf?' <span class="mute">(Performance)</span>':'')+' <span class="mute small">'+r.src+'</span></td>';
    COLS.forEach(([k,,d])=>{let t;if(v==='abs'||r.kind==='pi')t=r[k+'_s'];else{if(!pi[k]){t=r[k]===0?'0':'n/a'}else{const x=100*(r[k]/pi[k]-1);t=(x>=0?'+':'')+x.toFixed(1)+'%'}}
      h+='<td class="num">'+t+'</td>'});h+='</tr>'});
  $('tbT').innerHTML=h+'</tbody></table>';
  $('tbN').innerHTML=(bk==='sol'?'GPT-5.6 Sol, the model the search used. The EdgeBench official GPT-5.5 @2h checkpoint (31.2, score only) is an unranked reference in Table 1. ':'Opus 5, never used in the search; the stack was applied unchanged. ')+
    'Pi and the four add-one rows come from Table 4; "Performance" marks the row the paper picks as SoL-Pi [Performance] for this model. The change view divides by Pi\'s printed value; Opus 5 input tokens are 0.0000 B throughout, so no change is shown for them.'}
segBind('tbM',m=>{bk=m;document.querySelectorAll('#tbM button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));drawTb()});
$('tbV').addEventListener('change',drawTb);$('tbS').addEventListener('change',drawTb);
// Table 3 and the swarm
function drawT3(){let h='<table><thead><tr><th>Harness</th><th class="num">TB4 solved / 63</th><th class="num">TB4 cost ($)</th><th class="num">$ / solved</th><th class="num">IMO passed / 6</th><th class="num">IMO cost ($)</th><th class="num">$ / passed</th></tr></thead><tbody>';
  TB.t3.forEach(r=>{h+='<tr><td>'+r.name+'</td><td class="num">'+r.tb_solved+'</td><td class="num">'+r.tb_cost.toFixed(2)+'</td><td class="num">'+r.tb_per.toFixed(2)+'</td><td class="num">'+r.imo_pass+'</td><td class="num">'+r.imo_cost.toFixed(2)+'</td><td class="num">'+r.imo_per.toFixed(2)+'</td></tr>'});
  h+='</tbody></table><table style="margin-top:10px"><thead><tr><th>Swarm configuration (one 2-hour run each)</th><th class="num">Final cycles</th><th class="num">Cost ($)</th><th class="num">Speed thresholds</th><th class="num">Speed-up over starter</th></tr></thead><tbody>';
  TB.swarm.forEach(r=>{h+='<tr><td>'+r.name+'</td><td class="num">'+fmt(r.cycles)+'</td><td class="num">'+r.cost.toFixed(2)+'</td><td class="num">'+r.thresholds+' / 8</td><td class="num">'+(TB.starter_cycles/r.cycles).toFixed(0)+'×</td></tr>'});
  $('t3T').innerHTML=h+'</tbody></table><p class="small mute">Table 3 and §3.3. The starter takes '+fmt(TB.starter_cycles)+' cycles. Every row is one run; Terminal-Bench 4 excludes GPU tasks; IMO uses GPT-5.6 Sol at xhigh with Lean 4 verification and a 150-minute cap.</p>'}
// Figures 6 and 7
let fg='f6';const MECH=TB.figs.mechanisms;
function drawFg(W){const F=fg==='f6'?TB.figs.fig6:TB.figs.fig7,pan=$('fgP').value,V=F[pan],log=pan==='intensity';
  const H=250,pl=44,pr=10,pt=20,pb=56;const mx=pan==='trigger_rate_pct'?100:pan==='gain_pct'?40:100;
  const Y=v=>log?pt+(H-pt-pb)*(1-Math.log10(Math.max(1,v))/2):pt+(H-pt-pb)*(1-v/mx);
  let s='';const ticks=log?[1,2,5,10,20,50,100]:pan==='gain_pct'?[0,10,20,30,40]:[0,20,40,60,80,100];
  ticks.forEach(t=>{s+=ln2(pl,Y(t),W-pr,Y(t),'var(--line)')+tx(pl-5,Y(t)+4,t,{fs:11,a:'end',c:'var(--mute)'})});
  const gw=(W-pl-pr)/4,bw=Math.min(40,gw*.34),C=['var(--c1)','var(--c3)'];
  V.forEach((pair,i)=>{const cx=pl+gw*i+gw/2;pair.forEach((v,j)=>{const x=cx+(j?2:-bw-2);s+=rc(x,Y(v),bw,Y(log?1:0)-Y(v),C[j],{r:2})+tx(x+bw/2,Y(v)-4,(log?v.toFixed(2):v.toFixed(1)+'%'),{fs:11,a:'middle'})});
    const nm=[['Action','Fusion'],['Online Ctx','Compact'],['Evidence','Reducer'],['Observation','Pack']][i];
    s+=tx(cx,H-pb+16,nm[0],{fs:11,a:'middle'})+tx(cx,H-pb+30,nm[1],{fs:11,a:'middle'})});
  const lg=legend(F.series.map((n,j)=>[n,C[j]]),pl,H-6,W-pl);s+=lg.s;
  $('fgSvg').innerHTML=svgW(W,H+lg.h-10,s,'Mechanism activation');
  $('fgN').innerHTML=(fg==='f6'?'{F6}: every mechanism fires less often and less intensively on Opus 5, the model the search never saw.':'{F7}: GPT-5.6 Sol, each mechanism alone (as in Figure 6) against the same mechanism inside the full stack.').replace('{F6}','<a href="'+AX+'#S3.F6" target="_blank" rel="noopener noreferrer">Figure 6</a>').replace('{F7}','<a href="'+AX+'#S3.F7" target="_blank" rel="noopener noreferrer">Figure 7</a>')+
    ' Trigger rates are whole numbers of 51 tasks (for example '+V[0][0]+'% = '+Math.round(V[0][0]*51/100)+'/51). Gains are measured on each configuration\'s own triggered tasks against its own disabled baseline, so the paper calls the comparison descriptive. Intensity is on a log scale.'}
segBind('fgM',m=>{fg=m;document.querySelectorAll('#fgM button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('fgSvg'))});
$('fgP').addEventListener('change',()=>refit($('fgSvg')));
// Figure 8
function drawF8(W){const F=TB.figs.fig8,tr=F.trigger_rate_pct_batches_1_9.concat([100]),sc=F.task_score_batches;
  const H=220,pl=40,pr=40,pt=16,pb=36,X=i=>pl+(W-pl-pr)*i/9,Yt=v=>pt+(H-pt-pb)*(1-(v-20)/80),Ys=v=>pt+(H-pt-pb)*(1-(v-70)/25);
  let s='';[20,40,60,80,100].forEach(v=>{s+=ln2(pl,Yt(v),W-pr,Yt(v),'var(--line)')+tx(pl-5,Yt(v)+4,v+'%',{fs:11,a:'end',c:'var(--c1)'})});
  [70,75,80,85,90,95].forEach(v=>{s+=tx(W-pr+5,Ys(v)+4,v,{fs:11,c:'var(--c2)'})});
  for(let i=0;i<10;i++)s+=tx(X(i),H-pb+15,i+1,{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx((pl+W-pr)/2,H-4,'search batch',{fs:11,a:'middle',c:'var(--mute)'});
  const path=(a,Y,c)=>'<path d="'+a.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+a.map((v,i)=>'<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.5" fill="'+c+'"><title>batch '+(i+1)+': '+v+'</title></circle>').join('');
  s+=path(tr,Yt,'var(--c1)')+path(sc,Ys,'var(--c2)');
  s+='<circle cx="'+X(9)+'" cy="'+Yt(100)+'" r="7" fill="none" stroke="var(--bad)" stroke-width="1.6"/>';
  const lg=legend([['trigger rate (left axis)','var(--c1)'],['task score (right axis)','var(--c2)']],pl,H+12,W-pl);s+=lg.s;
  $('f8Svg').innerHTML=svgW(W,H+lg.h+4,s,'Action Fusion search batches')}
// every check
function drawCk(){const f=$('ckF').value;const C=RC.checks.filter(c=>f==='all'||(f==='bad'?(c.verdict==='does not'||c.verdict==='within rounding'):c.cat===f));
  let h='<table class="chktab"><thead><tr><th>What</th><th>Where</th><th class="num">Printed</th><th class="num">Recomputed</th><th>Verdict</th></tr></thead><tbody>';
  C.forEach(c=>{const w=c.where==='blog'?'<a href="https://nvlabs.github.io/SoL-Pi/" target="_blank" rel="noopener noreferrer">blog</a>':c.where==='abstract'?'<a href="https://arxiv.org/abs/2609.20519" target="_blank" rel="noopener noreferrer">abstract</a>':'<a href="'+AX+'#'+c.where+'" target="_blank" rel="noopener noreferrer">'+(c.wl||c.where)+'</a>';
    const cls=c.verdict==='reproduces'?'ok':c.verdict==='does not'?'no':'pt';
    h+='<tr><td>'+c.what+'<div class="small mute">'+c.how+'</div></td><td>'+w+'</td><td class="num">'+c.printed+'</td><td class="num">'+c.ours+'</td><td class="v"><span class="verdict '+cls+'">'+c.verdict+'</span></td></tr>'});
  $('ckT').innerHTML=h+'</tbody></table>';
  const S=RC.summary;$('ckSum').innerHTML='<code>recompute.py</code> runs '+RC.checks.length+' checks: '+(S.reproduces||0)+' reproduce, '+(S['within rounding']||0)+' within rounding, '+(S['does not']||0)+' do not, and '+(S.added||0)+' report numbers the paper does not compute. "Derived" rows are our reconstruction of how a printed number was made (the hourly savings), not something the paper states.'}
$('ckF').addEventListener('change',drawCk);
onTab('t-tables',()=>{drawTb();drawT3();fit($('fgSvg'),drawFg);fit($('f8Svg'),drawF8);drawCk()});
})();
