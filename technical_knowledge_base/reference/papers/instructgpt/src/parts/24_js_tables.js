// ---- The paper's numbers, rebuilt ----
(function(){let done=0;const AXL=(a,t)=>'<a href="'+window.PAPER.meta.ax+'#'+a+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
const VT={reproduces:'r',derived:'d','does not reproduce':'n','paper error':'n'};
function render(){if(done)return;done=1;
  // checks
  $('ckTab').innerHTML='<table class="ck"><thead><tr><th>Claim</th><th>Where</th><th>Printed</th><th>Recomputed</th><th>Verdict</th></tr></thead><tbody>'+RC.checks.map(c=>'<tr><td><b>'+escH(c.claim)+'</b>'+(c.note?'<div class="small mute">'+escH(c.note)+'</div>':'')+'</td><td class="small" data-l="where">'+escH(c.where)+'</td><td data-l="printed">'+escH(c.printed)+'</td><td data-l="recomputed">'+escH(c.recomputed)+'</td><td><span class="vt '+(VT[c.verdict]||'d')+'">'+escH(c.verdict)+'</span></td></tr>').join('')+'</tbody></table>';
  // Bradley-Terry head to head
  const opts=[];MODELS.forEach(m=>FG.fig1.series[m].forEach(r=>opts.push({k:m+' '+r.x,v:r.v})));
  ['btA','btB'].forEach((id,j)=>{$(id).innerHTML=opts.map((o,i)=>'<option value="'+i+'"'+((j===0&&o.k==='PPO-ptx 1.3B')||(j===1&&o.k==='GPT 175B')?' selected':'')+'>'+escH(o.k)+'</option>').join('')});
  const lg=p=>Math.log(p/(1-p)),bt=()=>{const a=opts[+$('btA').value],b=opts[+$('btB').value],p=TOY.sig(lg(a.v)-lg(b.v));
    const pr={'PPO-ptx 175B|GPT 175B':'85 ± 3%','PPO-ptx 175B|GPT (prompted) 175B':'71 ± 4%'}[a.k+'|'+b.k];
    $('btOut').innerHTML='<p style="margin:4px 0">'+escH(a.k)+' wins '+(100*a.v).toFixed(1)+'% against SFT 175B, '+escH(b.k)+' '+(100*b.v).toFixed(1)+'%. Implied: <b>'+escH(a.k)+' preferred '+(100*p).toFixed(1)+'% of the time</b>'+(pr?'; the paper measured '+pr+' directly ('+AXL('S4.SS1.SSS0.Px1','§4.1')+').':'; no direct comparison is printed.')+'</p>';
    fit($('btSvg'),W=>{const x0=0,x1=W,y=10,s=rc(x0,y,(x1-x0)*p,18,'var(--acc)',{r:3})+rc(x0+(x1-x0)*p,y,(x1-x0)*(1-p),18,'var(--dim)',{r:3})+tx(6,y+13,'A '+(100*p).toFixed(0)+'%',{fs:11,c:'var(--bg)',w:600})+tx(x1-6,y+13,'B '+(100*(1-p)).toFixed(0)+'%',{fs:11,a:'end'});$('btSvg').innerHTML=svgW(W,36,s,'Implied preference')})};
  $('btA').addEventListener('change',bt);$('btB').addEventListener('change',bt);bt();
  // Figure 3
  let f3m='training_instructdist';const xs={'1.3B':1.3,'6B':6,'175B':175};
  const f3=()=>fit($('f3Svg'),W=>{const P=FG.fig3.panels[f3m];$('f3Svg').innerHTML=lineChart({W,H:230,x:[1,230],xlog:1,y:[0,.8],xt:[[1.3,'1.3B'],[6,'6B'],[175,'175B']],yt:[0,.2,.4,.6,.8].map(v=>[v,(100*v)+'%']),xl:'model size (log scale)',yl:'win rate against 175B SFT',fmt:v=>(100*v).toFixed(1)+'%',series:MODELS.filter(m=>P[m]).map(m=>({n:m,c:MCOL[m],pts:P[m].map(r=>[xs[r.x],r.v,r.lo,r.hi])})),refs:[[.5,'= SFT 175B']]})});
  segBind('f3M',m=>{f3m=m;refit($('f3Svg'))});f3();
  // Figure 4 against Figure 30
  let f30m='Hallucinations';const f30=()=>fit($('f30Svg'),W=>{const P=FG.fig30.panels[f30m],pool=FG.fig4.panels[f30m==='Appropriate for customer assistant'?'Uses language appropriate for customer assistant':f30m];
    const ser=MODELS.map(m=>({n:m,c:MCOL[m],pts:P[m].map(r=>[xs[r.x],r.v,r.lo,r.hi])}));
    const lo=Math.min(...MODELS.map(m=>Math.min(pool[m].v,...P[m].map(r=>r.lo)))),hi=Math.max(...MODELS.map(m=>Math.max(pool[m].v,...P[m].map(r=>r.hi))));
    const y0=Math.max(0,Math.floor(lo*10)/10),y1=Math.min(1,Math.ceil(hi*10)/10);
    let svg=lineChart({W,H:230,x:[1,600],xlog:1,y:[y0,y1],xt:[[1.3,'1.3B'],[6,'6B'],[175,'175B'],[450,'pooled']],yt:[0,1,2,3,4,5].map(i=>y0+i*(y1-y0)/5).map(v=>[v,(100*v).toFixed(0)+'%']),xl:'model size (Figure 30) and pooled (Figure 4)',fmt:v=>(100*v).toFixed(1)+'%',
      series:ser.concat(MODELS.map(m=>({n:m+' pooled',c:MCOL[m],pts:[[450,pool[m].v,pool[m].lo,pool[m].hi]],nolg:1}))),title:f30m});
    $('f30Svg').innerHTML=svg;
    const g=P.GPT.map(r=>r.v),gp=pool.GPT.v,out=gp<Math.min(...g)||gp>Math.max(...g);
    $('f30Out').innerHTML=AXL('A5.F30','Figure 30')+' by size and '+AXL('S4.F4','Figure 4')+' pooled, both decoded. GPT-3: '+g.map(v=>(100*v).toFixed(1)+'%').join(', ')+' by size; pooled '+(100*gp).toFixed(1)+'%'+(out?', outside the range of its own sizes, which an average of them cannot be.':'.')});
  segBind('f30M',m=>{f30m=m;refit($('f30Svg'))});f30();
  // Figure 5
  fit($('f5Svg'),W=>{const B=FG.fig5.bars;$('f5Svg').innerHTML=hbars(W,['GPT','GPT (prompted)','SFT','PPO-ptx','FLAN','T0'].map(m=>({n:m,v:B[m].v,c:MCOL[m],tag:'('+B[m].lo.toFixed(2)+' to '+B[m].hi.toFixed(2)+')'})),{dom:[1,7],fmt:v=>v.toFixed(2),title:'Likert score, 175B'})});
  // Figure 7
  fit($('f7Svg'),W=>{const P=FG.fig7.panels;let h='';['Human eval','PerspectiveAPI score'].forEach(pn=>{const it=[];['None','Respectful'].forEach(pr=>['GPT','SFT','PPO-ptx'].forEach(m=>it.push({n:m+', '+(pr==='None'?'no instruction':'respectful'),v:P[pn][pr][m].v,c:MCOL[m]})));h+=hbars(W,it,{dom:[0,.26],fmt:v=>v.toFixed(3),title:pn==='Human eval'?'Toxicity rated by labelers':'Perspective API toxicity'})});$('f7Svg').innerHTML=h});
  // Table 14
  let sz=2;const cap=['HellaSwag','WSC','RTE','SST','QuAC','SQuADv2','DROP','FR to EN 15','CNN/DM','TLDR'];
  const t14=()=>{const f=$('t14F').value,o=$('t14O').value;let rows=TB.t14.rows.map((r,i)=>({r,i,v:r.v.map(Number)}));
    rows=rows.filter(x=>f==='all'||(f==='cap')===cap.includes(x.r.task));
    const d=(x,m)=>x.v[m*3+sz]-x.v[sz];if(o!=='paper')rows.sort((a,b)=>d(a,o==='ppo'?2:3)-d(b,o==='ppo'?2:3));
    const lowerBetter=x=>x.r.task==='Real Toxicity';
    const cell=(x,m)=>{const v=x.r.v[m*3+sz];if(m===0)return '<td class="num">'+v+'</td>';const dd=d(x,m),good=lowerBetter(x)?dd<0:dd>0;const dec=(x.r.v[sz].split('.')[1]||'').length;
      return '<td class="num">'+v+'<br><span class="small '+(Math.abs(dd)<1e-9?'mute':good?'good':'bad')+'">'+(dd>0?'+':'')+dd.toFixed(dec)+'</span></td>'};
    $('t14Tab').innerHTML='<table><thead><tr><th>Task <span class="mute">(metric, prompt)</span></th><th class="num">GPT</th><th class="num">SFT</th><th class="num">PPO</th><th class="num">PPO-ptx</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escH(x.r.task)+' <span class="small mute">('+escH(x.r.metric)+(x.r.prompt?', '+escH(x.r.prompt):'')+')</span></td>'+[0,1,2,3].map(m=>cell(x,m)).join('')+'</tr>').join('')+'</tbody></table>'};
  segBind('t14S',m=>{sz=+m;t14()});$('t14F').addEventListener('change',t14);$('t14O').addEventListener('change',t14);t14();
  // Figures 33, 34, 36
  let f33m='g';const f33=()=>fit($('f33Svg'),W=>{if(f33m==='l'){const F=FG.fig36;$('f33Svg').innerHTML=lineChart({W,H:220,x:[4e-4,3],xlog:1,y:[1.5,4.5],xt:[[1e-3,'0.001'],[.01,'0.01'],[.1,'0.1'],[1,'1']],yt:[2,3,4].map(v=>[v,v]),xl:'KL reward coefficient β (log)',yl:'Likert',series:[{n:'Likert, with 95% intervals',c:'var(--c2)',pts:F.points.map(r=>[r.x,r.v,r.lo,r.hi])}],refs:[[F.zero_line[0],'β = 0 ('+F.zero_line[1].toFixed(2)+' to '+F.zero_line[2].toFixed(2)+')','var(--c1)']],title:'Figure 36: Likert against the KL coefficient'});
      $('f33Out').innerHTML=AXL('A5.F36','Figure 36')+': best '+Math.max(...F.points.map(r=>r.v)).toFixed(2)+' at β = 0.0104; the final models use 0.02 ('+F.points.find(r=>Math.abs(r.x-.02)<1e-3).v.toFixed(2)+'), within the interval.'}
    else{$('f33Svg').innerHTML=taxChart(W,f33m);$('f33Out').innerHTML=f33m==='g'?AXL('A5.F33','Figure 33')+' (1.3B): DROP first reaches GPT-3 at γ = 27.8 (24.9 at 16.7), SQuAD v2 at 10; validation reward falls from -0.61 to -0.85 at γ = 27.8 and -1.55 at 129.':AXL('A5.F34','Figure 34')+' (1.3B, γ = 0, GPT-3 as KL reference): at small β both benchmarks collapse to near 0 F1; the best values (21.5 and 53.6) stay below GPT-3, while the validation reward falls to -2.8 at β = 2.'}});
  segBind('f33M',m=>{f33m=m;refit($('f33Svg'))});f33();
  // data tables
  const tab=(title,cols,rows,at)=>'<p class="small" style="margin:0 0 4px"><b>'+AXL(at,escH(title))+'</b></p><table><thead><tr>'+cols.map(c=>'<th>'+escH(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+escH(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  const t6=TB.t6,t6rows=[];['SFT','RM','PPO'].forEach(k=>t6[k].forEach(r=>t6rows.push([k].concat(r))));
  ['SFT','RM','PPO'].forEach(k=>t6rows.push([k,'train total','',fmt(RC.sizes[k].train)]));
  $('t6Tab').innerHTML=tab(TB.t6.title,['Data','Split','Source','Prompts'],t6rows,'A1.T6')+'<p class="small mute" style="margin:4px 0 0">Totals recomputed; they equal Table 9\'s counts. Labeler-written prompts are '+(100*RC.sft_labeler_share).toFixed(0)+'% of the SFT data, '+(100*RC.rm_labeler_share).toFixed(0)+'% of the RM data and none of the PPO data. '+tab(TB.t8.title,TB.t8.cols,TB.t8.rows,'A1.T8').replace('<p class="small" style="margin:0 0 4px">','</p><p class="small" style="margin:8px 0 4px">');
  $('t7Tab').innerHTML=tab(TB.t7.title,TB.t7.cols,TB.t7.rows,'A1.T7')+tab(TB.t1.title,TB.t1.cols,TB.t1.rows,'S3.T2').replace('<p class="small" style="margin:0 0 4px">','<p class="small" style="margin:8px 0 4px">');
  $('t9Tab').innerHTML=tab(TB.t9.title,TB.t9.cols,TB.t9.rows,'A1.T9')+tab(TB.t10.title,TB.t10.cols,TB.t10.rows,'A1.T10').replace('<p class="small" style="margin:0 0 4px">','<p class="small" style="margin:8px 0 4px">')+tab(TB.t11.title,TB.t11.cols,TB.t11.rows,'A1.T11').replace('<p class="small" style="margin:0 0 4px">','<p class="small" style="margin:8px 0 4px">');
  // labelers
  let t12m='t12';const t12=()=>fit($('t12Svg'),W=>{let h='';TB[t12m].qs.forEach(q=>{h+=hbars(W,q.a.map(a=>({n:a[0],v:parseFloat(a[1]),c:'var(--c1)'})),{dom:[0,100],fmt:v=>v.toFixed(1)+'%',title:q.q})});$('t12Svg').innerHTML=h});
  segBind('t12M',m=>{t12m=m;refit($('t12Svg'))});t12()}
onTab('t-tables',render);
document.querySelectorAll('a[data-tab="t-tables"]').forEach(a=>a.addEventListener('click',render,true));
})();
