// ---- The paper tab, part 2: Figure 5 rebuilt, the three predict reveals, the Factorio replay ----
const RUNCOL={'Prime Agent + Opus 5':'var(--c4)','Prime Agent + GPT-5.6 Sol':'var(--c2)','Prime Agent + Terra':'var(--c1)','Prime Agent + GLM 5.2':'var(--c3)','Hermes Agent + GPT-5.6 Sol':'var(--c6)'};
const kfmt=v=>v>=1e6?(v/1e6).toFixed(v>=1e7?0:1)+'M':Math.round(v/1000)+'k';
const dfmt=v=>v>=1000?'$'+(v/1000).toFixed(v>=10000?0:1)+'k':'$'+Math.round(v);
function linY(v,pt,ph,lo,hi){return pt+ph*(1-(v-lo)/(hi-lo))}

// Figure 5 rebuilt
(function(){const host=$('f5Svg');if(!host)return;let mode='cost';const F=PT.fig5;
  function draw(w){const narrow=w<520,pl=34,pr=narrow?8:150,pt=10,pb=36,H=narrow?300:330,pw=w-pl-pr,ph=H-pt-pb;
    const X=mode==='tokens'?[1e4,3e6]:[10,3e4],lg=Math.log10,lx=v=>pl+pw*(lg(v)-lg(X[0]))/(lg(X[1])-lg(X[0])),ly=v=>linY(v,pt,ph,0,100);
    let s='';[0,25,50,75,100].forEach(v=>{s+=ln2(pl,ly(v),pl+pw,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})});
    const ticks=mode==='tokens'?[[1e4,'10k'],[3e4,'30k'],[1e5,'100k'],[3e5,'300k'],[1e6,'1M'],[3e6,'3M']]:[[10,'$10'],[100,'$100'],[1000,'$1k'],[1e4,'$10k'],[3e4,'$30k']].concat(narrow?[]:[[30,'$30'],[300,'$300'],[3000,'$3k']]);
    ticks.forEach(([v,l])=>{const last=v===X[1];s+=ln2(lx(v),pt+ph,lx(v),pt+ph+4,'var(--mute)')+tx(lx(v),pt+ph+16,l,{fs:11,a:last?'end':'middle',c:'var(--mute)'})});
    s+=tx(pl+pw/2,H-4,mode==='tokens'?'output tokens per game (log scale)':'estimated API cost (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    // references
    const R=F.refs;const ref=(v,c,da,n)=>{s+=ln2(pl,ly(v),pl+pw,ly(v),c,{sw:1.3,da})};
    ref(R['Human baseline'].score,'var(--acc)','6 4');
    if(mode==='tokens'){ref(R['Opus 5, ARC harness'].score,'var(--mute)','6 4');
      [['GPT-5.6 Sol, Responses API','2 3'],['GPT-5.6 Terra, Responses API','6 4']].forEach(([n,da])=>{const P=F.ref_token_points[n];s+='<path d="'+P.map((p,i)=>(i?'L':'M')+lx(p[0]).toFixed(1)+','+ly(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--mute)" stroke-width="1.4" stroke-dasharray="'+da+'"/>';P.forEach(p=>{s+='<circle cx="'+lx(p[0]).toFixed(1)+'" cy="'+ly(p[1]).toFixed(1)+'" r="3" fill="var(--bg)" stroke="var(--mute)"/>'})})}
    else{ref(R['GPT-5.6 Sol, Responses API'].score,'var(--mute)','2 3');
      const o=R['Opus 5, ARC harness'],g=R['GPT-5.6 Sol, ARC harness'];
      s+='<path d="M'+lx(o.cost)+','+(ly(o.score)-6)+'l6,6l-6,6l-6,-6z" fill="var(--bg)" stroke="var(--c4)" stroke-width="1.5"/>';
      s+='<circle cx="'+lx(g.cost)+'" cy="'+ly(g.score)+'" r="5" fill="var(--bg)" stroke="var(--c2)" stroke-width="1.5"/>'}
    const ends=[];
    Object.entries(F.runs).forEach(([n,r])=>{const P=r[mode];if(!P)return;const c=RUNCOL[n];
      s+='<path d="'+P.map((p,i)=>(i?'L':'M')+lx(Math.max(X[0],p[0])).toFixed(1)+','+ly(p[1]).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="2.4"'+(n.startsWith('Hermes')?' stroke-dasharray="5 3"':'')+'/>';
      const e=P[P.length-1];s+='<circle cx="'+lx(e[0]).toFixed(1)+'" cy="'+ly(e[1]).toFixed(1)+'" r="4" fill="'+c+'"/>';
      ends.push({y:ly(e[1]),c,n:(narrow?n.replace('Prime Agent + ','PA + ').replace('Hermes Agent + ','Hermes + '):n.replace('Prime Agent + ','')).replace('GPT-5.6 ','')+' '+F.printed[n]+'%',how:n+': '+F.printed[n]+'% at '+(mode==='tokens'?kfmt(e[0])+' tokens per game':dfmt(e[0]))})});
    if(!narrow)s+=endLabels(ends,pl+pw+8,13);
    host.innerHTML=svgW(w,H,s,'Figure 5 rebuilt');
    let cap=mode==='tokens'?'Panel A. Grey dashed curves with circles: GPT-5.6 Sol (dotted) and Terra (dashed) through the Responses API, external points; grey dashed line: Opus 5 in the ARC harness, 30.2%; blue dashed line: human baseline, 95.4%.':'Panel B. Diamond: Opus 5 in the ARC harness, 30.2% at about '+dfmt(F.refs['Opus 5, ARC harness'].cost)+'; open circle: GPT-5.6 Sol in the ARC harness, 7.0% at about '+dfmt(F.refs['GPT-5.6 Sol, ARC harness'].cost)+'; grey dotted line: GPT-5.6 Sol through the Responses API, 38.3% (no cost given); blue dashed line: human baseline, 95.4%. Hermes Agent + GPT-5.6 Sol (dashed teal) reaches 5.8%.';
    if(narrow)cap+=' Lines: '+Object.keys(F.runs).map(n=>n.replace('Prime Agent + ','PA + ')+' '+F.printed[n]+'%').join('; ')+' (PA: Prime Agent; purple Opus 5, orange Sol, blue Terra, green GLM 5.2).';
    $('f5Cap').textContent=cap}
  segBind('f5M',m=>{mode=m;$('f5M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit(host)});
  fit(host,draw)})();

// predict 1: the public-set scorecards before Prime Agent's
PRED_REVEAL.pq1=function(){const host=$('pq1Svg');const C=PT.arc.cards.slice().sort((a,b)=>b.printed-a.printed);
  const rows=[{n:'Prime Agent, best of 3 (blog)',v:95.5,d:'2026-08',p:1}].concat(C.map(c=>({n:c.name.replace(' (median of 3 runs)',', median run'),v:c.printed,d:c.date,p:c.name.startsWith('Prime')})));
  rows.sort((a,b)=>b.v-a.v);
  fit(host,w=>{const lw=Math.min(230,w*.48),bh=19,H=rows.length*(bh+4)+6;let s='';const bx=v=>lw+(w-lw-44)*v/100;
    const mc=Math.floor((lw-8)/6.6);rows.forEach((r,i)=>{const y=4+i*(bh+4),nm=r.n.replace(' (NVIDIA-labs OO Agents)','').replace(' - Continual Learning v1',' CL v1');s+=tx(lw-6,y+14,nm.length>mc?nm.slice(0,mc-1)+'…':nm,{fs:11,a:'end',w:r.p?700:null});
      s+=rc(lw,y,bx(Math.max(0,r.v))-lw,bh,r.p?'var(--c4)':(r.n.startsWith('Human')?'var(--acc)':'var(--dim)'),{r:3})+tx(bx(Math.max(0,r.v))+4,y+14,r.v.toFixed(1),{fs:11})});
    host.innerHTML=svgW(w,H,s,'ARC-AGI-3 public-set scorecards')})};

// predict 2: Table 1 gaps
PRED_REVEAL.pq2=function(){const host=$('pq2Svg');const R=PT.t1.rows,MC=['var(--c3)','var(--c4)','var(--c2)'],MN=['GLM-5.2 vs Pi-mono','Opus 5 vs Claude Code','GPT-5.6 Sol vs Codex'];
  fit(host,w=>{const lw=Math.min(150,w*.36),pr=10,H=R.length*24+46,x0=-0.35,x1=0.35,X=v=>lw+(w-lw-pr)*(Math.max(x0,Math.min(x1,v))-x0)/(x1-x0);let s='';
    s+=rc(X(-0.02),4,X(0.02)-X(-0.02),R.length*24,'var(--soft)',{r:0})+ln2(X(0),4,X(0),4+R.length*24,'var(--mute)');
    [-0.3,-0.2,-0.1,0,0.1,0.2,0.3].forEach(v=>{if(w<480&&Math.abs(v*10)%2===1)return;s+=tx(X(v),R.length*24+18,(v>0?'+':'')+v.toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})});
    R.forEach((r,i)=>{const y=4+i*24+12;s+=tx(lw-6,y+4,r[0].replace(' (Yahoo, 128k)','').replace(' (English)','').replace(' (math)',''),{fs:11,a:'end'});
      [0,1,2].forEach(m=>{const d=r[3][2*m]-r[3][2*m+1];s+='<circle cx="'+X(d).toFixed(1)+'" cy="'+(y+(m-1)*5)+'" r="4.5" fill="'+MC[m]+'" opacity=".9"><title>'+MN[m]+': '+(d>0?'+':'')+d.toFixed(3)+'</title></circle>'})});
    const lg=legend(MN.map((n,i)=>[n,MC[i]]),lw,R.length*24+32,w-lw);s+=lg.s;
    host.innerHTML=svgW(w,R.length*24+32+lg.h,s,'Table 1 gaps, Prime Agent minus the other harness')})};

// predict 3: Figure 6 with counts
PRED_REVEAL.pq3=function(){const host=$('pq3Svg');const F=PT.fig6,P=RC.fig6;
  fit(host,w=>{const lw=Math.min(190,w*.42),bh=18,H=F.length*(bh+6)+8;let s='';const bx=v=>lw+(w-lw-110)*v/8;
    F.forEach((r,i)=>{const y=4+i*(bh+6),pr=r[1]==='Prime Agent';s+=tx(lw-6,y+13,(i===0||F[i-1][0]!==r[0]?r[0]+', ':'')+r[1],{fs:11,a:'end',w:pr?700:null});
      s+=rc(lw,y,bx(r[4])-lw,bh,pr?'var(--c2)':'var(--dim)',{r:3})+tx(bx(r[4])+4,y+13,r[4]+' ('+r[2]+'/'+r[3]+')',{fs:11})});
    host.innerHTML=svgW(w,H,s,'Figure 6 rebuilt')+'<p class="small">'+P.map(p=>p.model+' against '+p.vs+': rate ratio '+p.rate_ratio+'×, raw count ratio '+p.count_ratio+'×, one-sided p '+(p.p_one_sided<0.001?'< 0.001':p.p_one_sided.toFixed(3))).join('; ')+'.</p>'})};

// Factorio replay (Figure 9 decoded)
(function(){if(!$('fac'))return;const F=PT.fig9;
  const MS=[[3.0,'The run starts','A seven-day Claude Sonnet 5 run: the root spawns subagents, up to four at a time at first, while one technology is researched. The clock is cumulative output tokens across the root and every descendant.'],
    [4.39,'Five technologies','The count jumps to five technologies after about 4.4M output tokens.'],
    [4.5,'A destructive world reset','The model "handled irreversible actions poorly": a world reset takes the count from five back to one (§3.5). The session recovers and continues instead of the trajectory being thrown away.'],
    [6.2,'Back to five and beyond','The lost technologies come back within about a million tokens, then the burst of early research; the figure annotates Logistic science near here.'],
    [11.3,'Long construction intervals','Progress comes in bursts separated by long building stretches; the figure annotates Advanced materials near 11.6M tokens.'],
    [16.4,'Oil gathering and railway','Around 15 to 16M tokens the figure annotates Railway and Oil gathering. Concurrency rises: more waves run six subagents at once.'],
    [17.62,'The 22nd technology','22 technologies at about 17.6M tokens. The next one takes about 4.4M more tokens, a fifth of the whole run.'],
    [22.2,'23 and 24','Technologies 23 and 24 arrive close together around 22M tokens; the peak of 7 active subagents came at about 20M.'],
    [23.4,'End: 24 of 196, advanced circuit 71%','23.4M output tokens, 24 of 196 technologies, 71% of the way through advanced-circuit research, 633 depth-one subagents in 149 dispatch waves, at most 7 at once.']];
  const steps=MS.map(m=>({t:m[1],c:m[2]}));
  const at=(arr,x)=>{let v=arr[0][1];for(const p of arr){if(p[0]<=x)v=p[1];else break}return v};
  const tokAt=(k,e)=>{const a=k?MS[k-1][0]:0,b=MS[k][0];return a+(b-a)*e};
  function draw(m,k,e,w){const x=tokAt(k,e),pl=30,pr=34,H1=150,H2=120,pw=w-pl-pr,X=v=>pl+pw*v/23.4;let s='';
    // panel A
    const yA=v=>8+(H1-28)*(1-v/25);[0,5,10,15,20,25].forEach(v=>{s+=ln2(pl,yA(v),pl+pw,yA(v),'var(--line)')+tx(pl-5,yA(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})});
    s+=tx(pl+4,16,'technologies researched',{fs:11,c:'var(--mute)'});
    const T=F.tech.filter(p=>p[0]<=x);T.push([x,at(F.tech,x)]);
    s+='<path d="'+T.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+yA(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    if(x>=F.reset_at_M)s+=ln2(X(F.reset_at_M),8,X(F.reset_at_M),H1+H2+4,'var(--bad)',{da:'4 3',sw:1.3})+tx(X(F.reset_at_M)+4,yA(23),'world reset, 5 to 1',{fs:11,c:'var(--bad)'});
    if(k===MS.length-1&&e>.5)s+=tx(X(23.4)-2,yA(25)+2,'advanced circuit 71%',{fs:11,a:'end',c:'var(--c2)'});
    // panel B
    const y0=H1+6,yB=v=>y0+(H2-26)*(1-v/8),yC=v=>y0+(H2-26)*(1-v/650);
    [0,2,4,6,8].forEach(v=>{s+=ln2(pl,yB(v),pl+pw,yB(v),'var(--line)')+tx(pl-5,yB(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})});
    [0,200,400,600].forEach(v=>{s+=tx(pl+pw+4,yC(v)+4,String(v),{fs:11,c:'var(--c1)'})});
    const A=F.active.filter(p=>p[0]<=x);if(A.length){A.push([x,A[A.length-1][1]]);s+='<path d="'+A.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+yB(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c2)" stroke-width="1" opacity=".85"/>'}
    const Cc=F.cumulative.filter(p=>p[0]<=x);if(Cc.length)s+='<path d="'+Cc.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+yC(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2" stroke-dasharray="5 3"/>';
    s+=tx(pl+4,y0+8,w<520?'active (orange, left), cumulative (blue, right)':'active subagents (orange, left) and cumulative subagents (blue, right)',{fs:11,c:'var(--mute)'});
    const yx=y0+H2-6;(w<480?[0,5,10,15]:[0,5,10,15,20]).forEach(v=>{s+=tx(X(v),yx,v+'M',{fs:11,a:'middle',c:'var(--mute)'})});s+=tx(X(23.4),yx,'23.4M',{fs:11,a:w<420?'end':'middle',c:'var(--mute)'});
    s+=ln2(X(x),8,X(x),yx-12,'var(--acc)',{sw:1.2,op:.6});
    return svgW(w,H1+H2+4,s,'Factorio run replay')}
  function counters(m,k){const x=MS[k][0],A=F.active.filter(p=>p[0]<=x);return stat('Output tokens',x.toFixed(1)+'M','root and descendants')+stat('Technologies',String(at(F.tech,x)),'of 196')+stat('Active now',String(A.length?A[A.length-1][1]:0),'subagents')+stat('Subagents so far',String(Math.min(633,at(F.cumulative,x))),'depth one')+stat('Peak active so far',String(A.length?Math.max(...A.map(p=>p[1])):0),'max 7 in the run')}
  makeAnim({id:'fac',modes:{run:steps},mode:'run',draw,counters,dur:3200});
})();
