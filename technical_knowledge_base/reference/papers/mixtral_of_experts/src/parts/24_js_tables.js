// ---- The paper's tables, rebuilt ----
const CFGURL=RC.cfg_url;
const num=s=>parseFloat(String(s).replace('%',''));
const sgn=v=>(v>0?'+':v<0?'−':'±')+Math.abs(v).toFixed(1);
(function(){
  // parameter recount
  const P=RC.params,rows=[['mixtral_8x7b','Mixtral 8x7B'],['mistral_7b','Mistral 7B'],['llama2_13b','Llama 2 13B'],['llama2_70b','Llama 2 70B']];
  let h='<table class="cmp"><thead><tr><th>Model</th><th class="num">Layers</th><th class="num">Experts (active)</th><th class="num">Total</th><th class="num">Active per token</th><th class="num">bfloat16 weights</th><th class="num">KV cache per token</th></tr></thead><tbody>';
  rows.forEach(([k,n])=>{const p=P[k];h+='<tr><td>'+n+'</td><td class="num">'+p.layers+'</td><td class="num">'+(p.n>1?p.n+' ('+p.k+')':'dense')+'</td><td class="num">'+fmt(p.total)+'</td><td class="num">'+fmt(p.active)+'</td><td class="num">'+(2*p.total/1e9).toFixed(1)+' GB</td><td class="num">'+fmt(p.kv_bytes_per_token/1024)+' KiB</td></tr>'});
  $('tbCountT').innerHTML=h+'</tbody></table><p class="small mute">Mixtral: one expert 3 × 4,096 × 14,336 = '+fmt(P.mixtral_8x7b.expert)+'; attention per layer '+fmt(P.mixtral_8x7b.attn_layer)+'; all experts '+(100*RC.expert_share_total).toFixed(1)+'% of the total. Total over active '+RC.ratio_total_active+'; Llama 2 70B total over Mixtral active '+RC.ratio_active_70b+' (the paper\'s "5x"). Eight Mistral 7Bs would be '+(RC.naive_8x7/1e9).toFixed(1)+'B. Configs: '+rows.map(([k,n])=>'<a href="'+CFGURL[k]+'" target="_blank" rel="noopener noreferrer">'+n+'</a>').join(', ')+' (Llama 2 via the NousResearch mirror of the gated files).</p>';
})();
// Table 2 with a reference row and sorting
(function(){const t=TB.t2,sel=$('t2Ref');t.rows.forEach((r,i)=>{const o=document.createElement('option');o.value=i;o.textContent=r[0];if(r[0]==='LLaMA 2 70B')o.selected=true;sel.appendChild(o)});
  let sortC=-1;
  function draw(){const ref=t.rows[+sel.value];let rows=t.rows.map((r,i)=>({r,i}));
    if(sortC>=2)rows.sort((a,b)=>num(b.r[sortC])-num(a.r[sortC]));
    let h='<table class="cmp"><thead><tr>'+t.cols.map((c,j)=>'<th class="'+(j>1?'num':'')+'" data-c="'+j+'" style="cursor:pointer">'+c+(j===sortC?' ▾':'')+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(({r,i})=>{const isRef=i===+sel.value;h+='<tr'+(r[0]==='Mixtral 8x7B'?' style="font-weight:600"':'')+'><td>'+r[0]+(isRef?' <span class="mute small">(reference)</span>':'')+'</td><td class="num">'+r[1]+'</td>';
      r.slice(2).forEach((v,j)=>{const d=num(v)-num(ref[j+2]);h+='<td class="num'+(isRef?'':d>0?' pos':d<0?' neg':'')+'">'+v+(isRef?'':'<br><span class="small">'+sgn(d)+'</span>')+'</td>'});h+='</tr>'});
    $('t2T').innerHTML=h+'</tbody></table>';$('t2T').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;sortC=c>=2?(sortC===c?-1:c):-1;draw()}))}
  sel.addEventListener('change',draw);draw()})();
// Figure 3 rebuilt: one benchmark at a time against active parameters
(function(){const t=TB.t2,sel=$('f3B');t.cols.slice(2).forEach((c,i)=>{const o=document.createElement('option');o.value=i+2;o.textContent=c+' ('+t.shots[c]+')';sel.appendChild(o)});
  const act={'LLaMA 2 7B':7,'LLaMA 2 13B':13,'LLaMA 1 33B':33,'LLaMA 2 70B':70,'Mistral 7B':7,'Mixtral 8x7B':13};
  function draw(){fit($('f3C'),W=>{const c=+sel.value,vals=t.rows.map(r=>num(r[c])),lo=Math.max(0,Math.floor((Math.min(...vals)-5)/10)*10),hi=Math.min(100,Math.ceil((Math.max(...vals)+5)/10)*10);
    const H=W<520?230:250,f=frame({W,H,x:[5,100],y:[lo,hi],xlog:1,pl:44,pr:16,pt:28,pb:40,xt:[[7,'7B'],[13,'13B'],[33,'33B'],[70,'70B']],yt:[...Array((hi-lo)/10+1).keys()].map(i=>[lo+10*i,(lo+10*i)+'%']),xl:'active parameters (log)',yl:'score'});
    let s=f.s+tx(0,14,t.cols[c]+(W<560?' against active parameters':': score against active parameters (Table 2)'),{fs:12,w:600});
    const L2=['LLaMA 2 7B','LLaMA 2 13B','LLaMA 2 70B'].map(n=>t.rows.find(r=>r[0]===n));
    s+=path(L2.map(r=>[f.sx(act[r[0]]),f.sy(num(r[c]))]),'var(--mute)',{sw:1.6});
    const pts=t.rows.map(r=>{const col=r[0]==='Mixtral 8x7B'?'var(--acc)':r[0]==='Mistral 7B'?'var(--c2)':r[0].startsWith('LLaMA 1')?'var(--c4)':'var(--mute)';return {x:f.sx(act[r[0]]),y:f.sy(num(r[c])),t:r[0].replace('LLaMA','Llama')+' '+r[c],c:col}});
    placeLabels(pts,W,H);pts.forEach(p=>{s+=dot(p.x,p.y,4.5,p.c)+tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:p.c})});
    $('f3C').innerHTML=svgW(W,H,s,'Score against active parameters')})}
  sel.addEventListener('change',draw);onTab('t-tables',draw)})();
// Llama 2 70B: this paper against the Llama 2 paper
(function(){const t=TB.t2,l=t.rows.find(r=>r[0]==='LLaMA 2 70B'),own=TB.l2own.rows;
  let h='<table class="cmp"><thead><tr><th>Benchmark</th><th class="num">Mixtral paper (re-run)</th><th class="num">Llama 2 paper</th><th class="num">Difference</th><th>Llama 2 paper setting</th></tr></thead><tbody>';
  t.cols.slice(2).forEach((c,i)=>{const o=own.find(r=>r[0]===c),a=num(l[i+2]),b=o&&o[1]?num(o[1]):null;
    h+='<tr><td>'+c+'</td><td class="num">'+l[i+2]+'</td><td class="num">'+(b==null?'<span class="mute">not extracted</span>':o[1]+'%')+'</td><td class="num">'+(b==null?'':sgn(a-b))+'</td><td class="small">'+(o?o[2]:'')+'</td></tr>'});
  $('l2T').innerHTML=h+'</tbody></table>'})();
// Table 3 with provenance
(function(){const t=TB.t3,prov={MMLU:'GPT-4 report, Table 2 (70.0%)',HellaSwag:'GPT-4 report, Table 2 (85.5%)','ARC Challenge':'GPT-4 report, Table 2 (85.2%)',WinoGrande:'GPT-4 report, Table 2 (81.6%)',MBPP:'not stated','GSM-8K':'GPT-4 report, Table 2 (57.1%)','MT Bench':'gpt-3.5-turbo-1106 (§3)'};
  let h='<table class="cmp"><thead><tr><th>Benchmark</th><th>Setting</th><th class="num">Llama 2 70B</th><th class="num">GPT-3.5</th><th class="num">Mixtral 8x7B</th><th class="num">Mixtral minus GPT-3.5</th><th>Where the GPT-3.5 number comes from</th></tr></thead><tbody>';
  t.rows.forEach(r=>{const d=num(r[4])-num(r[3]);h+='<tr><td>'+r[0]+'</td><td class="small">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num"><b>'+r[4]+'</b></td><td class="num '+(d>0?'pos':d<0?'neg':'')+'">'+(r[0]==='MT Bench'?(d>0?'+':'−')+Math.abs(d).toFixed(2):sgn(d))+'</td><td class="small">'+prov[r[0]]+'</td></tr>'});
  $('t3T').innerHTML=h+'</tbody></table>'})();
// Table 4 with differences
(function(){const t=TB.t4;let h='<table class="cmp"><thead><tr><th>Model</th><th class="num">Active</th>'+t.langs.map(l=>'<th class="num" colspan="3">'+l+'</th>').join('')+'</tr><tr><th></th><th></th>'+t.langs.map(()=>t.bench.map(b=>'<th class="num small">'+b+'</th>').join('')).join('')+'</tr></thead><tbody>';
  t.rows.forEach(r=>{h+='<tr><td>'+r[0]+'</td>'+r.slice(1).map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>'});
  h+='<tr><td><b>Mixtral minus Llama 2 70B</b></td><td></td>'+RC.t4_delta.map(d=>'<td class="num pos">'+sgn(d)+'</td>').join('')+'</tr>';
  $('t4T').innerHTML=h+'</tbody></table>'})();
// Figure 5: bias, checked
(function(){const t=TB.f5;let h='<table class="cmp"><thead><tr><th>Metric</th><th class="num">Llama 2 70B</th><th class="num">Mixtral 8x7B</th><th>Mean (higher is more positive)</th><th>Std (lower is less bias within group)</th></tr></thead><tbody>';
  t.rows.forEach((r,i)=>{if(i===0){h+='<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num"><b>'+r[2]+'</b></td><td colspan="2" class="small">higher is better: Mixtral +'+(num(r[2])-num(r[1])).toFixed(1)+' points</td></tr>';return}
    const a=r[1].split(' ± ').map(Number),b=r[2].split(' ± ').map(Number);
    h+='<tr><td>BOLD '+r[0].replace('_',' ')+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="'+(b[0]>a[0]?'pos':b[0]<a[0]?'neg':'')+'">'+(b[0]>a[0]?'Mixtral higher':b[0]<a[0]?'Mixtral lower':'equal')+'</td><td class="'+(b[1]<a[1]?'pos':b[1]>a[1]?'neg':'')+'">'+(b[1]<a[1]?'Mixtral lower':b[1]>a[1]?'Mixtral higher':'equal')+'</td></tr>'});
  $('f5T').innerHTML=h+'</tbody></table>';
  $('f5N').innerHTML='Mean higher for Mixtral in '+RC.f5_higher_mean.length+' of '+RC.f5_groups+' BOLD groups ('+RC.f5_higher_mean.join(', ').replace(/_/g,' ')+'); standard deviation lower in '+RC.f5_lower_std.length+' of '+RC.f5_groups+' ('+RC.f5_lower_std.join(', ').replace(/_/g,' ')+'). The caption\'s "lower std on BOLD" holds for those two only; the text\'s "similar variances" is the fairer reading. <a href="'+window.PAPER.meta.ax+'#S3.F5" target="_blank" rel="noopener noreferrer">Figure 5</a>, base models; the text of §3.3 calls it Table 5.'})();
// Figures 7 and 9 decoded
const PNM=['ArXiv','DM Mathematics','Github','Gutenberg','PhilPapers','PubMed Abstracts','StackExchange','Wikipedia (en)'];
const PCOL=['#db5f57','#c9ad3a','#7fc243','#3fbf6a','#3fb9c2','#5770db','#a157db','#db57b2'];
let F9L='0',F9C='Either choice';
function f9Draw(){const FG=window.PAPER.figs,pn=FG.fig9.find(p=>p.title==='Layer '+F9L+' -- '+F9C);
  fit($('f9Ch'),W=>{const H=W<520?230:250,pl=40,pr=8,pt=30,pb=40,v=pn.values,mx=Math.max(...PNM.map(n=>Math.max(...v[n]))),top=Math.ceil(mx*20)/20;
    const f=frame({W,H,x:[0,8],y:[0,top],pl,pr,pt,pb,yt:[...Array(Math.round(top*20)+1).keys()].map(i=>[i/20,(i*5)+'%']),xl:'expert',yl:'share of selections'});
    let s=f.s+tx(0,14,W<560?'Mixtral, layer '+F9L+', '+F9C.toLowerCase():'Mixtral 8x7B, layer '+F9L+', '+F9C.toLowerCase()+' (Figure '+(F9C==='Either choice'?'7':'9')+', decoded)',{fs:12,w:600});
    const gw=f.sx(1)-f.sx(0),bw=Math.max(1.5,(gw-4)/8);
    for(let e=0;e<8;e++){PNM.forEach((n,j)=>{const y=v[n][e],x=f.sx(e)+2+j*bw;s+=rc(x,f.sy(y),Math.max(1,bw-.6),f.sy(0)-f.sy(y),PCOL[j],{r:0})});s+=tx(f.sx(e)+gw/2,H-pb+15,'E'+e,{fs:11,a:'middle',c:'var(--mute)'})}
    s+=ln2(pl,f.sy(1/8),W-pr,f.sy(1/8),'var(--ink)',{da:'4 3'})+tx(W-pr-2,f.sy(1/8)-4,'1/8',{fs:11,a:'end',c:'var(--mute)'});
    const lg=legend(PNM.map((n,j)=>[n,PCOL[j]]),pl,H+18,W-pl);$('f9Ch').innerHTML=svgW(W,H+lg.h+12,s+lg.s,'Mixtral expert use per Pile subset')});
  const t7=RC.fig7_tv[['0','15','31'].indexOf(F9L)],ub=RC.t5_first_usage_baseline[F9L],ex=RC.t5_first_excess_over_usage[F9L],t5=TB.t5.rows,ci=1+['0','15','31'].indexOf(F9L);
  let h='<table class="cmp"><thead><tr><th>Layer '+F9L+'</th><th class="num">Distance from the average (either choice)</th><th class="num">Table 5: same first choice</th><th class="num">Expected from uneven use alone</th><th class="num">Locality beyond that</th></tr></thead><tbody>';
  PNM.forEach(n=>{const r=t5.find(x=>x[0]===n);h+='<tr><td>'+n+'</td><td class="num">'+t7.tv[n].toFixed(3)+'</td><td class="num">'+r[ci]+'</td><td class="num">'+(100*ub[n]).toFixed(1)+'%</td><td class="num">'+(ex[n]>=0?'+':'−')+Math.abs(100*ex[n]).toFixed(1)+' points</td></tr>'});
  $('f9T').innerHTML=h+'</tbody></table><p class="small mute">Distance: total variation distance between the subset\'s eight shares and the average of all eight subsets (0 = identical). Expected from uneven use: Σ<i>p</i><sub><i>i</i></sub>², the chance two independent tokens of that subset pick the same first expert given its first-choice shares <i>p</i> (Figure 9); 12.5% only when use is uniform. For the toy\'s equivalents see the <a href="#" data-tab="t-run" data-to="rv7">toy tab</a>.</p>'}
segBind('f9L',m=>{F9L=m;f9Draw()});segBind('f9C',m=>{F9C=m;f9Draw()});onTab('t-tables',f9Draw);
$('f10chk').textContent=RC.fig10_vs_table5;
// Table 5 and Figure 10: Mixtral against the toy
let T5M='first';
function t5Draw(){fit($('t5C'),W=>{const m=T5M,H=W<520?250:260,pl=44,pr=10,pt=28,pb=40;const f=frame({W,H,x:[0,1],y:[0,m==='first'?.8:1],pl,pr,pt,pb,yt:(m==='first'?[0,.2,.4,.6,.8]:[0,.25,.5,.75,1]).map(v=>[v,(100*v).toFixed(0)+'%']),xt:[[0,'first'],[.5,'middle'],[1,'last']],xl:W<560?'relative depth':'relative depth (Mixtral layers 0 to 31; toy layers 0 to 3)',yl:m==='first'?'same first choice':'first or second overlap'});
  let s=f.s+tx(0,14,W<560?'Repeats: Mixtral and the toy':'Consecutive tokens keeping their expert: Mixtral (Figure 10) and the toy',{fs:12,w:600});
  const F=window.PAPER.figs.fig10[m==='first'?'First choice':'First or second choice'].lines;
  PNM.forEach(n=>{s+=path(F[n].map(([x,y])=>[f.sx(x/31),f.sy(y)]),'var(--ink)',{sw:1,op:.4})});
  const tm=RT.main;RDOM.forEach(d=>{const pts=[0,1,2,3].map(l=>[f.sx(l/3),f.sy(tm.rep[d][l][m])]),ps=[0,1,2,3].map(l=>[f.sx(l/3),f.sy(tm.rep[d][l][m+'_shuf'])]);
    s+=path(pts,RDC[d],{sw:1.8});pts.forEach(p=>{s+='<rect x="'+(p[0]-3)+'" y="'+(p[1]-3)+'" width="6" height="6" fill="'+RDC[d]+'"/>'});s+=path(ps,RDC[d],{sw:1,da:'2 3'})});
  const b=m==='first'?1/8:RC.t5_either_random;s+=ln2(pl,f.sy(b),W-pr,f.sy(b),'var(--mute)',{da:'5 3'});
  const lg=legend([['Mixtral, 8 Pile subsets','var(--ink)']].concat(RDOM.map(d=>['toy '+RDN[d],RDC[d]])).concat([['toy shuffled (dotted, own colour)','var(--mute)','2 3']]),pl,H+18,W-pl);
  $('t5C').innerHTML=svgW(W,H+lg.h+12,s+lg.s,'Repeat rates against depth')})}
segBind('t5M',m=>{T5M=m;t5Draw()});onTab('t-tables',t5Draw);
// Figure 6: Elo as win probabilities
(function(){const t=TB.elo,me=num(t.rows[0][1]);let h='<table class="cmp"><thead><tr><th>Model</th><th class="num">Arena Elo</th><th class="num">Gap</th><th class="num">Mixtral Instruct expected to win</th></tr></thead><tbody>';
  t.rows.forEach((r,i)=>{const g=me-num(r[1]);h+='<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+(i?g:'')+'</td><td class="num">'+(i?(100/(1+Math.pow(10,-g/400))).toFixed(1)+'%':'')+'</td></tr>'});
  $('eloT').innerHTML=h+'</tbody></table>'})();
// checks on the paper's own numbers
(function(){const P=RC.params.mixtral_8x7b,ok='<span class="ok">✓</span> ',no='<span class="no">✗</span> ';
  const L=[[1,'47B total and 13B active (abstract, §2.1) recount to '+(P.total/1e9).toFixed(2)+'B and '+(P.active/1e9).toFixed(2)+'B from Table 1; the release post\'s 46.7B and 12.9B match to the digit.'],
    [1,'"5x fewer active parameters" (Table 2 caption): Llama 2 70B\'s '+(RC.params.llama2_70b.total/1e9).toFixed(1)+'B over Mixtral\'s 12.9B is '+RC.ratio_active_70b+'.'],
    [1,'Table 5\'s random baselines: 1/8 = 12.5%, and 1 − (6/8)(5/7) = '+(100*RC.t5_either_random).toFixed(2)+'%, the chance that two random pairs of 8 experts share at least one (1 − C(6,2)/C(8,2) gives the same).'],
    [0,'Abstract: "outperforms or matches Llama 2 70B and GPT-3.5 across all evaluated benchmarks". Table 2 has Llama 2 70B ahead on '+RC.t2_losses.length+' of '+RC.t2_n+' ('+RC.t2_losses.join(', ')+'); Table 3 has GPT-3.5 ahead on WinoGrande and MT-Bench.'],
    [0,'§3: "despite its significantly smaller capacity (47B tokens compared to 70B)": parameters, not tokens.'],
    [0,'§3.3 says the bias results are "in Table 5"; they are printed as Figure 5, and Table 5 is the routing table of §5.'],
    [0,'§4 cites MT-Bench 8.30 "(see Table 2)"; it is in Table 3.'],
    [0,'Footnote 2 reports "Llama 1 34B"; the tables print "LLaMA 1 33B".'],
    [0,'Figure 5 caption "lower std on BOLD" against §3.3 "similar variances within each group": lower in '+RC.f5_lower_std.length+' of '+RC.f5_groups+' groups.'],
    [1,'Table 4: Mixtral ahead of Llama 2 70B in all 12 cells, by '+RC.t4_min_delta+' to '+RC.t4_max_delta+' points, as stated.'],
    [1,'Release dates: magnet link tweeted '+RC.magnet_utc+' (from the post\'s ID), '+RC.days_magnet_to_arxiv+' days before arXiv v1; the old summary of this page said a week.']];
  $('chkL').innerHTML='<ul class="lst small">'+L.map(([g,t])=>'<li>'+(g?ok:no)+t+'</li>').join('')+'</ul>'})();
