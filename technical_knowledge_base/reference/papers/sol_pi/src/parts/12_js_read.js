// ---- The paper tab: harness map (cost against score), tokens against dollars, the hourly derivation ----
(function(){
const TB=PAPER.tables,RC=PAPER.rc;
const COL={native:'var(--c2)',third:'var(--mute)',pi:'var(--c4)',sol:'var(--c3)',solp:'var(--c1)'};
// 1. cost against score, per model
let scMode='sol';
function drawSc(W){const rows=TB[scMode],H=Math.max(250,Math.min(330,W*.55)),pl=48,pr=14,pt=14,pb=40;
  const xmax=scMode==='sol'?3600:2700,ymin=20,ymax=55;
  const X=v=>pl+(W-pl-pr)*v/xmax,Y=v=>pt+(H-pt-pb)*(1-(v-ymin)/(ymax-ymin));
  let s='';for(let v=0;v<=xmax;v+=scMode==='sol'?1000:500){s+=ln2(X(v),pt,X(v),H-pb,'var(--line)')+tx(X(v),H-pb+15,'$'+fmt(v),{fs:11,a:'middle',c:'var(--mute)'})}
  for(let v=20;v<=55;v+=5){s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})}
  s+=tx((pl+W-pr)/2,H-4,'API cost over 51 tasks (US$, Table '+(scMode==='sol'?'1':'2')+')',{fs:11,a:'middle',c:'var(--mute)'});
  s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">EdgeBench average score</text>';
  if(scMode==='sol'){const y=Y(TB.edge_official_gpt55_2h);s+=ln2(pl,y,W-pr,y,'var(--mute)',{da:'4 3'})+tx(W-pr-4,y-4,'official GPT-5.5 @2h: 31.2',{fs:11,a:'end',c:'var(--mute)'})}
  const pi=rows.find(r=>r.kind==='pi'),ef=rows.find(r=>r.kind==='sol');
  s+='<line x1="'+X(pi.cost)+'" y1="'+Y(pi.score)+'" x2="'+X(ef.cost)+'" y2="'+Y(ef.score)+'" stroke="var(--c3)" stroke-width="1.6" marker-end="url(#scA)"/>';
  const pts=rows.map(r=>({x:X(r.cost),y:Y(r.score),t:r.name,r}));placeLabels(pts,W,H-pb);
  pts.forEach(p=>{s+='<circle cx="'+p.x+'" cy="'+p.y+'" r="5.5" fill="'+COL[p.r.kind]+'"><title>'+p.r.name+': $'+p.r.cost_s+', score '+p.r.score_s+', '+p.r.total_s+' B tokens</title></circle>'+tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});
  $('scSvg').innerHTML=svgW(W,H,'<defs><marker id="scA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--c3)"/></marker></defs>'+s,'API cost against EdgeBench score for each harness');
  const d=RC.checks;$('scNote').innerHTML='Each point is one harness with '+(scMode==='sol'?'GPT-5.6 Sol':'Opus 5')+'; the arrow goes from Pi to the full SoL-Pi stack: '+(100*(1-ef.cost/pi.cost)).toFixed(1)+'% cheaper, '+(pi.score-ef.score).toFixed(2)+' points lower. Up and to the left is better. One run per point; no error bars are reported. Hover a point for its tokens.'}
segBind('scM',m=>{scMode=m;document.querySelectorAll('#scM button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('scSvg'))});
onTab('t-read',()=>fit($('scSvg'),drawSc));
// 2. tokens against dollars, Opus 5 (prices recovered from Table 4)
let dcMode='tok';const PR=RC.opus_prices,KS=[['cache_read','cache read','var(--c1)'],['cache_write','cache write','var(--c2)'],['output','output','var(--c4)']];
function drawDc(W){const pi=TB.opus.find(r=>r.kind==='pi'),ef=TB.opus.find(r=>r.kind==='sol'),rows=[['Pi',pi],['SoL-Pi',ef]];
  const val=(r,k)=>dcMode==='tok'?r[k]*1000:PR[k]*r[k]*1000,tot=r=>KS.reduce((t,[k])=>t+val(r,k),0);
  const mx=Math.max(...rows.map(([,r])=>tot(r))),H=150,pl=62,pr=12,bh=34;let s='';
  rows.forEach(([n,r],i)=>{let x=pl;const y=18+i*(bh+26);s+=tx(pl-8,y+bh/2+4,n,{fs:12,a:'end',w:600});
    KS.forEach(([k,lab,c])=>{const w=(W-pl-pr)*val(r,k)/mx;s+=rc(x,y,w,bh,c,{r:2})+'<title>'+lab+'</title>';if(w>54)s+=tx(x+w/2,y+bh/2+4,dcMode==='tok'?fmt(val(r,k),0)+' M':'$'+fmt(val(r,k),0),{fs:11,a:'middle',c:'#fff'});x+=w});
    s+=tx(Math.min(x+4,W-pr-60),y-4,dcMode==='tok'?fmt(tot(r),0)+' M tokens':'$'+fmt(tot(r),0),{fs:11})});
  const lg=legend(KS.map(([,l,c])=>[l,c]),pl,H-8,W-pl);s+=lg.s;
  $('dcSvg').innerHTML=svgW(W,H+lg.h-12,s,'Pi against SoL-Pi on Opus 5, by token type');
  const dp=RC.opus_decomp.pi,de=RC.opus_decomp.sol,sv=k=>dp[k]-de[k];
  $('dcNote').innerHTML=dcMode==='tok'?'Million tokens over the 51 tasks (Table 4). Input tokens are 0.0000 B for both. Cache reads fall from 2,320 M to 1,263 M; cache writes and output barely move.':
    'At $0.50 (cache read), $6.25 (cache write) and $25 (output) per million: the $'+fmt(sv('cache_read')+sv('cache_write')+sv('output'),0)+' saving (the table prints $1,741 - $1,158 = $583; the gap is rounding of the token counts) is $'+fmt(sv('cache_read'),0)+' from cache reads and $'+fmt(sv('output'),0)+' from output, less $'+fmt(-sv('cache_write'),0)+' of extra cache writes. Output is under 1% of the tokens and about 20% of the bill, so a cut in re-read cache cannot move the bill as much as it moves the token count.'}
segBind('dcM',m=>{dcMode=m;document.querySelectorAll('#dcM button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('dcSvg'))});
PRED_REVEAL.pq1=()=>fit($('dcSvg'),drawDc);
// 3. the hourly derivation
PRED_REVEAL.pq2=()=>{let h='<table><thead><tr><th>Saving</th><th class="num">Cost difference</th><th class="num">÷ 102 h</th><th class="num">Printed</th></tr></thead><tbody>';
  RC.hourly.forEach(x=>{h+='<tr><td>'+x.n+'</td><td class="num">$'+fmt(x.diff,0)+'</td><td class="num">$'+x.v.toFixed(3)+'</td><td class="num">$'+x.p+'</td></tr>'});
  $('hrTab').innerHTML=h+'</tbody></table>'};
})();
