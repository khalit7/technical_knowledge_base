// ---- The paper tab: recounted numbers, data mixes, the forecast reveal, Table 5, the run schedule, the post-training animation ----
const lg10=Math.log10;
// nav: highlight the section in view
(function(){const nav=$('nav');if(!nav||!('IntersectionObserver' in window))return;const as=[...nav.querySelectorAll('a')];
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){as.forEach(a=>a.classList.toggle('cur',a.getAttribute('href')==='#'+e.target.id))}})},{rootMargin:'-20% 0px -70% 0px'});
  as.forEach(a=>{const s=$(a.getAttribute('href').slice(1));if(s)io.observe(s)})})();

// 1. Numbers recounted by recompute.py
(function(){const P=RC.params;
  setH('p405',pB(P['405B'].total));setH('p70',pB(P['70B'].total));setH('p8',pB(P['8B'].total));setH('p405b',pB(P['405B'].total));
  setH('f6nd',sci(RC.flops_6nd,2));
  setH('effT',Math.round(RC.eff_tflops_per_gpu));setH('effM',RC.eff_mfu.toFixed(1)+'%');setH('effD',RC.days_on_16k.toFixed(0));
  const f=RC.forecast.refit;setH('faA',f.alpha.toFixed(4));setH('faB',f.A.toFixed(4));setH('faC',sci(RC.C_for_16_55T,2));
  setH('faN',bil(f.N_at_4e25));setH('faD',tril(f['D_at_3.8e25']));setH('faE',bil(f['N_at_3.8e25']));
  const tb=$('t3mini');if(tb){let s='';const want=['Layers','Model Dimension','FFN Dimension','Attention Heads','Key/Value Heads','Peak Learning Rate'];
    TB.t3.rows.filter(r=>want.includes(r[0])).forEach(r=>{s+='<tr><td>'+r[0]+'</td>'+r[1].map(v=>'<td class="num">'+latexLR(v)+'</td>').join('')+'</tr>'});
    s+='<tr><td><b>Parameters, recounted</b></td>'+['8B','70B','405B'].map(m=>'<td class="num"><b>'+pB(P[m].total)+'</b></td>').join('')+'</tr>';tb.innerHTML=s}
  const t4=$('t4mini');if(t4){t4.innerHTML=TB.t4.rows.map(r=>'<tr>'+r.map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>').join('')}})();

// 2. Data mixes: pre-training (§3.1.2), preference data (Table 6), SFT data (Table 7)
(function(){const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const mb=$('mixbar');if(mb)mb.innerHTML=stackBar('Pre-training mix, by tokens',[['General knowledge',50,C[0]],['Maths and reasoning',25,C[1]],['Code',17,C[2]],['Multilingual',8,C[3]]],'"Roughly", as stated in §3.1.2; the shares sum to 100.');
  const mx=$('mixes');if(!mx)return;
  const t6=TB.t6.rows.filter(r=>r[0]!=='Total').map((r,i)=>[r[0],num(r[1]),C[i]]);
  const order=['General English','Code','Multilingual','Exam-like','Reasoning and tools','Long context'];
  const t7=TB.t7.rows.filter(r=>r[0]!=='Total');
  const ex=order.map((n,i)=>[n,num(t7.find(r=>r[0]===n)[1]),C[i]]);
  const tk=order.map((n,i)=>[n,RC.t7_token_share[n],C[i]]);
  mx.innerHTML=stackBar('Human preference comparisons (Table 6)',t6.map(x=>[x[0]==='Coding'?'Coding':x[0],x[1],x[2]]))+
    stackBar('SFT examples (Table 7)',ex)+stackBar('SFT tokens (derived: share of examples × average tokens per example)',tk,'Long-context examples are 0.11% of SFT examples but, at about 38,000 tokens each, about 5% of SFT tokens. Average tokens per example: '+fmt(RC.t7_weighted_tokens,1)+' recomputed against Table 7\'s printed 846.1.')})();

// 3. The scaling-law forecast (Figure 3), revealed by the predict question
(function(){const host=$('fcSvg');if(!host)return;let mode='text';
  const STOPS=[1e23,3e23,1e24,3e24,1e25,2e25,3e25,3.8e25,4e25,5e25,1e26];const sl=$('fcC');sl.min=0;sl.max=STOPS.length-1;sl.value=7;
  const K={text:[0.53,0.29],legend:[0.537,0.299],refit:[RC.fit.alpha,RC.fit.A]};
  function draw(w){const C=STOPS[+sl.value],[al,A]=K[mode],H=Math.min(300,Math.max(230,w*.55));
    const fr=logFrame({W:w,H,pl:46,pr:12,pt:12,pb:34,x:[1e18,2e26],y:[1e9,1e14],xt:[[1e18,'10¹⁸'],[1e20,'10²⁰'],[1e22,'10²²'],[1e24,'10²⁴'],[1e26,'10²⁶']],yt:[[1e9,'1B'],[1e10,'10B'],[1e11,'100B'],[1e12,'1T'],[1e13,'10T'],[1e14,'100T']],xl:'Training compute, FLOPs',yl:'Optimal training tokens'});
    let s=fr.s;const D=c=>A*c**al;
    // the law across the range, solid inside the data, dashed outside
    const seg=(l0,l1)=>{let p='';for(let i=0;i<=40;i++){const c=10**(l0+i*(l1-l0)/40);p+=(i?'L':'M')+fr.lx(c).toFixed(1)+','+fr.ly(D(c)).toFixed(1)}return p};
    const p1=seg(18,22),p2=seg(22,26.3);
    s+='<path d="'+p1+'" fill="none" stroke="var(--c1)" stroke-width="2"/><path d="'+p2+'" fill="none" stroke="var(--c1)" stroke-width="2" stroke-dasharray="5 4"/>';
    FG.fig3_points.forEach(([c,d])=>{s+='<circle cx="'+fr.lx(c).toFixed(1)+'" cy="'+fr.ly(d).toFixed(1)+'" r="4" fill="var(--c4)"/>'});
    // paper's stated forecast and the budget marker
    s+='<rect x="'+(fr.lx(3.8e25)-5).toFixed(1)+'" y="'+(fr.ly(16.55e12)-5).toFixed(1)+'" width="10" height="10" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    const x=fr.lx(C),y=fr.ly(D(C));s+=ln2(x,12,x,H-34,'var(--mute)',{da:'3 3'})+'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5.5" fill="var(--c1)" stroke="var(--bg)" stroke-width="1.5"/>';
    const lgd=legend([['law with chosen constants','var(--c1)'],['paper: 16.55T at 3.8 × 10²⁵','var(--c2)']],52,24,w-60);s+=lgd.s;
    host.innerHTML=svgW(w,H,s,'Optimal training tokens against compute, Figure 3 rebuilt');
    const Dv=D(C),N=C/(6*Dv);$('fcCv').textContent=sci(C,C===3.8e25?1:0)+' FLOPs';
    $('fcOut').innerHTML=stat('Optimal tokens D*',tril(Dv),'paper: 16.55T at its budget')+stat('Parameters, C / 6D*',bil(N),'paper: 402B')+stat('Tokens per parameter',(Dv/N).toFixed(1),'Chinchilla\'s rule of thumb: about 20');}
  function go(){fit(host,draw)}
  sl.addEventListener('input',()=>refit(host));
  $('fcM').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('fcM').querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});mode=b.dataset.m;refit(host)}));
  PRED_REVEAL['pr-law']=go;})();

// 4. Table 5 as bars
(function(){const el=$('t5bars');if(!el)return;const rows=TB.t5.rows,mx=Math.max(...rows.map(r=>+r[2]));
  let s='<div class="stkt">Unexpected interruptions over 54 days, by root cause (Table 5)</div><div class="bars">';
  rows.forEach(r=>{const c=CAT[r[1]]||'var(--mute)',star=r[0]==='Faulty GPU'?' *':'';
    s+='<div class="row'+(star?' hl':'')+'"><span class="nm" title="'+r[1]+'">'+r[0]+star+'</span><span class="track"><span class="fill" style="width:'+(+r[2]/mx*100).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+r[2]+' · '+r[3]+'</span></div>'});
  s+='</div><div class="stkl">'+Object.entries(CAT).map(([k,c])=>'<span><i style="background:'+c+'"></i>'+k+'</span>').join('')+'</div>';
  s+='<p class="small mute" style="margin:6px 0 0">* 148 of 419 is '+RC.t5.faulty_gpu_pct_from_count.toFixed(1)+'%, not the printed 30.1% (below). Hardware by count: GPU, host and unplanned maintenance '+RC.t5.hw_count_share_no_network.toFixed(1)+'%, or '+RC.t5.hw_count_share_with_network.toFixed(1)+'% with network switches and cables, bracketing the paper\'s "approximately 78%".</p>';
  el.innerHTML=s})();

// 5. The 405B run on one axis: learning rate and batch size against training tokens
(function(){const el=$('runline');if(!el)return;const M=2**20;
  const ramp=[[0,252e6,4*M,4096],[252e6,2.87e12,8*M,8192],[2.87e12,15.6e12,16*M,8192]];
  const step=t=>{let s=0;for(const [a,b,bs] of ramp){if(t<=a)break;s+=(Math.min(t,b)-a)/bs}return s};
  const lr=st=>st<8000?8e-5*st/8000:8e-7+0.5*(8e-5-8e-7)*(1+Math.cos(Math.PI*Math.min(st,1.2e6)/1.2e6));
  fit(el,w=>{const H=250,pl=48,pr=48,pt=16,pb=36,X0=1e8,X1=1.56e13,lx=t=>pl+(w-pl-pr)*(lg10(t)-lg10(X0))/(lg10(X1)-lg10(X0)),ly=v=>pt+(H-pt-pb)*(1-v/8.4e-5),by=b=>pt+(H-pt-pb)*(1-b/(18*M));
    let s='';[[1e8,'100M'],[1e9,'1B'],[1e10,'10B'],[1e11,'100B'],[1e12,'1T'],[1e13,'10T']].forEach(([v,l])=>{s+=ln2(lx(v),pt,lx(v),H-pb,'var(--line)')+tx(lx(v),H-pb+15,l,{fs:11,a:'middle',c:'var(--mute)'})});
    [0,2e-5,4e-5,6e-5,8e-5].forEach(v=>{s+=tx(pl-5,ly(v)+4,v?(v*1e5).toFixed(0)+'e−5':'0',{fs:11,a:'end',c:'var(--c1)'})});
    [4,8,16].forEach(b=>{s+=tx(w-pr+5,by(b*M)+4,b+'M',{fs:11,c:'var(--c2)'})});
    // long-context band: the last ~800B tokens
    s+=rc(lx(15.6e12-800e9),pt,lx(X1)-lx(15.6e12-800e9),H-pt-pb,'var(--acc2)',{r:0,op:.7});
    let p='';for(let i=0;i<=200;i++){const t=10**(lg10(X0)+i*(lg10(X1)-lg10(X0))/200);p+=(i?'L':'M')+lx(t).toFixed(1)+','+ly(lr(step(t))).toFixed(1)}
    s+='<path d="'+p+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    let q='M'+lx(X0).toFixed(1)+','+by(4*M).toFixed(1);ramp.forEach(([a,b,bs],i)=>{if(i)q+='L'+lx(a).toFixed(1)+','+by(bs).toFixed(1);q+='L'+lx(Math.min(b,X1)).toFixed(1)+','+by(bs).toFixed(1)});
    s+='<path d="'+q+'" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    const tWU=252e6+(8000-step(252e6))*8*M;
    s+=ln2(lx(tWU),pt,lx(tWU),H-pb,'var(--mute)',{da:'3 3'})+tx(lx(tWU)-4,pt+30,'warm-up ends',{fs:11,a:'end',c:'var(--mute)'});
    s+=tx(lx(252e6)+4,by(8*M)-6,'8K sequences',{fs:11,c:'var(--c2)'});
    s+=tx(lx(15.6e12-800e9)-4,H-pb-8,w<520?'long context →':'long-context stages (8K → 128K), then annealing →',{fs:11,a:'end',c:'var(--ink)'});
    s+=tx(pl,H-3,'Training tokens (log scale)',{fs:11,c:'var(--mute)'})+tx(pl,pt-4,'learning rate',{fs:11,c:'var(--c1)'})+tx(w-pr,pt-4,'batch (tokens)',{fs:11,a:'end',c:'var(--c2)'});
    el.innerHTML=svgW(w,H,s,'Learning rate and batch schedule of the 405B run')})})();

// 6. DPO per-pair calculator (reveal of the DPO question)
(function(){if(!$('dpW'))return;const B=0.1;
  function run(){const rw=+$('dpW').value,rl=+$('dpL').value,d=rw-rl,z=B*d,sg=1/(1+Math.exp(-z)),loss=-Math.log(sg),wt=B*(1-sg),nll=$('dpN').checked;
    $('dpWv').textContent=rw;$('dpLv').textContent=rl;
    $('dpOut').innerHTML=stat('DPO loss, −log σ(βΔ)',loss.toFixed(3),'Δ = '+d+' nats, implied reward margin βΔ = '+z.toFixed(2))+
      stat('Push on each chosen token',(wt+(nll?0.2:0)).toFixed(3),'β(1 − σ) = '+wt.toFixed(3)+(nll?' + 0.2 from the NLL term':''))+
      stat('Push on each rejected token','−'+wt.toFixed(3),'the same weight, downwards')+
      stat('End-of-turn token, unmasked','+'+(wt+(nll?0.2:0)).toFixed(3)+' / −'+wt.toFixed(3),'up after the chosen text, down after the rejected; masked, both are 0')}
  ['dpW','dpL','dpN'].forEach(i=>$(i).addEventListener('input',run));PRED_REVEAL['pr-dpo']=run;})();

// 7. Human evaluations (Figure 17), revealed by the predict question
(function(){const host=$('heSvg');if(!host)return;let opp='GPT-4o';
  function draw(w){const rows=TB.f17.panels[opp],rh=44,H=rows.length*rh+40,nameW=Math.min(150,w*.34),x0=nameW+8,x1=w-12,sx=v=>x0+(x1-x0)*v/45;
    let s='';[0,10,20,30,40].forEach(v=>{s+=ln2(sx(v),8,sx(v),H-26,'var(--line)')+tx(sx(v),H-12,v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=10+i*rh,sep=r.win_ci[1]<r.loss_ci[0]||r.loss_ci[1]<r.win_ci[0];
      s+=tx(0,y+20,r.row,{fs:11.5,w:sep?600:400});
      s+=rc(x0,y+2,sx(r.win)-x0,14,'var(--c1)',{r:2})+ln2(sx(r.win_ci[0]),y+9,sx(r.win_ci[1]),y+9,'var(--ink)',{sw:1.4});
      s+=rc(x0,y+19,sx(r.loss)-x0,14,'var(--c2)',{r:2})+ln2(sx(r.loss_ci[0]),y+26,sx(r.loss_ci[1]),y+26,'var(--ink)',{sw:1.4});
      s+=tx(Math.min(sx(Math.max(r.win_ci[1],r.loss_ci[1]))+4,x1-2),y+20,(r.win-r.loss>0?'+':'')+(r.win-r.loss).toFixed(1),{fs:11,a:sx(Math.max(r.win_ci[1],r.loss_ci[1]))+40>x1?'end':'start',c:sep?(r.win>r.loss?'var(--good)':'var(--bad)'):'var(--mute)'})});
    host.innerHTML=svgW(w,H,s,'Win and loss rates of Llama 3 405B against '+opp)+'<div class="stkl"><span><i style="background:var(--c1)"></i>405B wins</span><span><i style="background:var(--c2)"></i>405B loses</span><span>lines: 95% interval; number: win minus loss, coloured where the intervals separate</span></div>';
    const R=rows.map(r=>({d:r.win-r.loss,sep:r.win_ci[1]<r.loss_ci[0]||r.loss_ci[1]<r.win_ci[0]}));
    $('heOut').innerHTML=stat('Clear wins',R.filter(r=>r.sep&&r.d>0).length+' of 7','win interval above the loss interval')+stat('Within noise',R.filter(r=>!r.sep).length+' of 7','intervals overlap')+stat('Clear losses',R.filter(r=>r.sep&&r.d<0).length+' of 7','loss interval above the win interval')}
  const go=()=>fit(host,draw);
  $('heM').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('heM').querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});opp=b.dataset.m;refit(host)}));
  PRED_REVEAL['pr-he']=go;})();

// 8. Table 2, the frontier columns, with 95% intervals
function t2Verdict(bench,score,rivals){const c=ciFor(bench,'Llama 3 405B',score);const best=rivals.filter(r=>r.v!=null).sort((a,b)=>b.v-a.v)[0];
  if(!best||!c)return {c,best,cls:'',txt:'–'};const cb=ciFor(bench,best.m,best.v),h=Math.sqrt(c.h**2+(cb?cb.h:c.h)**2),d=score-best.v;
  return {c,best,d,h,cls:Math.abs(d)<=h?'in':d>0?'up':'dn',txt:Math.abs(d)<=h?'within noise':d>0?'ahead':'behind'}}
(function(){const el=$('t2mini');if(!el)return;const T=TB.t2,M=T.models,i405=M.indexOf('Llama 3 405B'),R=['GPT-4 (0125)','GPT-4o','Claude 3.5 Sonnet'];
  let s='<div class="stkt">The 405B against the frontier (Table 2), with 95% intervals</div><div class="tw"><table class="t2"><thead><tr><th>Benchmark</th><th class="num">405B</th><th class="num">±</th>'+R.map(r=>'<th class="num">'+r.replace(' 3.5 Sonnet',' 3.5')+'</th>').join('')+'<th>vs best rival</th></tr></thead><tbody>';
  T.rows.forEach(r=>{const v=num(r.v[i405]),riv=R.map(m=>({m,v:num(r.v[M.indexOf(m)])})),vd=t2Verdict(r.bench,v,riv);
    s+='<tr><td>'+r.bench+'</td><td class="num"><b>'+r.v[i405]+'</b></td><td class="num n">'+(vd.c?vd.c.h.toFixed(1)+(vd.c.src==='printed'?'':'°'):'')+'</td>'+riv.map((x,j)=>'<td class="num">'+r.v[M.indexOf(R[j])]+'</td>').join('')+'<td class="'+vd.cls+'">'+vd.txt+(vd.d!=null?' ('+(vd.d>0?'+':'')+vd.d.toFixed(1)+')':'')+'</td></tr>'});
  s+='</tbody></table></div><p class="small mute">± is the 405B\'s 95% interval: printed in Tables 18, 21 and 22 where the paper gives one, otherwise (°) 1.96 √(S(1 − S)/N) with N the benchmark\'s size ('+Object.entries(RC.bench_n).filter(([k])=>!k.startsWith('MMLU (0')).map(([k,n])=>k.replace(/ \(.*/,'')+' '+fmt(n)).join(', ')+'; GPQA assumed to be the 448-question main set). "Within noise" means the gap to the best of the three rivals is smaller than the interval of the difference, √(h₁² + h₂²). Rivals\' scores are Meta\'s best of reported and reproduced numbers, so their intervals are approximate too.</p>';
  el.innerHTML=s})();
