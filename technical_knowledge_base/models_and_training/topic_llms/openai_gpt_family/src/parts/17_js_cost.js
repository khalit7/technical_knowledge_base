// ---- Cost per task tab: index against cost, per token against per task, one task taken apart ----
(function(){
  const rows=AA.map(r=>({n:r[0],lab:r[1],ix:r[2],cpt:r[3],pi:r[4],pc:r[5],po:r[6],I:r[7],O:r[8],R:r[9],C:r[10],slug:r[11],open:r[12],oa:r[1]==='OpenAI'}));
  let xm='task';
  function scatter(){
    const W=640,H=360,pl=52,pr=16,pt=14,pb=40,lg=Math.log10;
    const xv=r=>xm==='task'?r.cpt:r.po,x0=xm==='task'?0.01:0.1,x1=xm==='task'?10:100;
    const X=v=>pl+(W-pl-pr)*(lg(v)-lg(x0))/(lg(x1)-lg(x0)),Y=v=>pt+(H-pt-pb)*(1-(v-5)/(60-5));
    let s='';[10,20,30,40,50,60].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    const xt=xm==='task'?[[0.01,'$0.01'],[0.1,'$0.10'],[1,'$1'],[10,'$10']]:[[0.1,'$0.10'],[1,'$1'],[10,'$10'],[100,'$100']];
    xt.forEach(([v,l])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(xm==='task'?'cost per Intelligence Index task (log scale)':'list price per million output tokens (log scale)')+'</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">Intelligence Index v4.3</text>';
    // efficient frontier: staircase of models no other model beats on both axes
    const srt=rows.slice().sort((a,b)=>xv(a)-xv(b)||b.ix-a.ix);let best=-1,fr=[];srt.forEach(r=>{if(r.ix>best){fr.push(r);best=r.ix}});
    let d='';fr.forEach((r,i)=>{d+=(i?'H'+X(xv(r))+'V'+Y(r.ix):'M'+X(xv(r))+' '+Y(r.ix))});d+='H'+(W-pr);
    s+='<path d="'+d+'" fill="none" stroke="var(--good)" stroke-width="1.5" stroke-dasharray="5 3"/>';
    rows.filter(r=>!r.oa).forEach(r=>{s+='<circle cx="'+X(xv(r))+'" cy="'+Y(r.ix)+'" r="4" fill="'+(r.open?'none':'var(--dim)')+'" stroke="var(--mute)" stroke-width="'+(r.open?1.3:0)+'"><title>'+r.n+' ('+r.lab+'): '+r.ix+', '+usd(xv(r),2)+'</title></circle>'});
    const lab=[];rows.filter(r=>r.oa).forEach(r=>{const x=X(xv(r)),y=Y(r.ix);s+='<g style="cursor:help"><circle cx="'+x+'" cy="'+y+'" r="5.5" fill="'+(r.open?'var(--bg)':'var(--closed)')+'" stroke="var(--closed)" stroke-width="2"/><title>'+r.n+': '+r.ix+', '+usd(xv(r),xv(r)<0.1?4:2)+'</title></g>';lab.push({x,y,n:r.n.replace(/ \((max|high)\)/,'')})});
    lab.sort((a,b)=>a.y-b.y);let last=-99;lab.forEach(l=>{const yy=Math.max(l.y+4,last+13);last=yy;s+='<text x="'+(l.x+9)+'" y="'+yy+'" font-size="11" fill="var(--closed)">'+l.n+'</text>'});
    $('csSvg').innerHTML=svgEl(W,H,s,'Intelligence Index against cost');
    const onF=fr.filter(r=>r.oa).map(r=>r.n.replace(/ \((max|high)\)/,''));
    $('csPin').innerHTML=(xm==='task'?'On cost per task, OpenAI models on the frontier: ':'On price per output token, OpenAI models on the frontier: ')+(onF.length?onF.join(', '):'none')+'. The frontier is drawn over all '+rows.length+' priced models.';
  }
  segBind('csX',m=>{xm=m;scatter()});onTab('t-cost',scatter);
  // per token against per task, against a chosen baseline
  const OA=rows.filter(r=>r.oa&&!r.open);
  const selB=$('ptB');OA.forEach((r,i)=>{selB.innerHTML+='<option value="'+i+'"'+(r.n.startsWith('GPT-6 Astra')?' selected':'')+'>'+r.n+'</option>'});
  function ratios(){
    const b=OA[+selB.value];
    const t='<tr><th>Model</th><th class="num">Index</th><th class="num">Price per token, ×</th><th class="num">Output tokens, ×</th><th class="num">Input tokens, ×</th><th class="num">Cost per task, ×</th><th class="num">Reasoning share of output</th></tr>'+
      OA.map(r=>{const pr=r.po/b.po,tk=r.cpt/b.cpt;return '<tr'+(r===b?' style="font-weight:600"':'')+'><td>'+r.n+'</td><td class="num">'+r.ix+'</td><td class="num">'+pr.toFixed(2)+'</td><td class="num">'+(r.O/b.O).toFixed(2)+'</td><td class="num">'+(r.I/b.I).toFixed(2)+'</td><td class="num"><b>'+tk.toFixed(3)+'</b>'+(tk<1?' (1/'+(1/tk).toFixed(1)+')':'')+'</td><td class="num">'+Math.round(100*r.R/r.O)+'%</td></tr>'}).join('');
    $('ptT').innerHTML=t;
    const s1=OA.find(r=>r.n.startsWith('GPT-6.1 Sol')),lu=OA.find(r=>r.n.startsWith('GPT-6 Luna'));
    $('ptPin').innerHTML=b.n.startsWith('GPT-6 Astra')?'Against Astra: GPT-6.1 Sol is <b>0.20×</b> per token but <b>'+(s1.cpt/b.cpt).toFixed(3)+'×</b> per task (1/'+(b.cpt/s1.cpt).toFixed(1)+', not 1/5), because it spends '+(s1.O/b.O).toFixed(2)+'× the output and '+(s1.I/b.I).toFixed(2)+'× the input tokens; Luna is 0.01× per token and '+(lu.cpt/b.cpt).toFixed(4)+'× per task (1/'+(b.cpt/lu.cpt).toFixed(0)+'), spending '+(lu.O/b.O).toFixed(2)+'× the output tokens.':'Ratios against '+b.n+'. The cost ratio is the price ratio times a token ratio, weighted by how the bill splits between input, cache and output.';
  }
  selB.addEventListener('change',ratios);onTab('t-cost',ratios);
  // one task taken apart
  const sel=$('tkM');OA.forEach((r,i)=>{sel.innerHTML+='<option value="'+i+'"'+(r.n.startsWith('GPT-6 Astra')?' selected':'')+'>'+r.n+'</option>'});
  const fitH=r=>Math.max(0,Math.min(1,(r.I*r.pi+r.O*r.po-r.C*1e6)/(r.I*(r.pi-r.pc))));
  let H0=null;
  function task(fromSel){
    const r=OA[+sel.value];if(fromSel||H0===null){H0=fitH(r);$('tkH').value=Math.round(1000*H0)}
    const h=+$('tkH').value/1000,om=+$('tkO').value/100,sc=r.cpt/r.C,I=r.I*sc,O=r.O*sc*om;
    $('tkHv').textContent=(100*h).toFixed(1)+'%';$('tkOv').textContent=om.toFixed(2);
    const cu=I*(1-h)*r.pi/1e6,cc=I*h*r.pc/1e6,co=O*r.po/1e6,tot=cu+cc+co;
    const parts=[['uncached input',cu,'var(--c2)'],['cached input',cc,'var(--c6)'],['output incl. reasoning',co,'var(--closed)']];
    $('tkBar').innerHTML='<div class="sb">'+parts.map(([n,v,c])=>'<span style="width:'+(100*v/tot)+'%;background:'+c+'" title="'+n+'">'+(v/tot>.12?Math.round(100*v/tot)+'%':'')+'</span>').join('')+'</div><div class="leg">'+parts.map(([n,v,c])=>'<span><i style="background:'+c+';height:8px"></i>'+n+' '+usd(v,3)+'</span>').join('')+'</div>';
    $('tkOut').innerHTML=stat('Cost per task',usd(tot,3),'AA: '+usd(r.cpt,3))+stat('Input tokens per task',fmt(Math.round(I)),'run total × '+sc.toExponential(2))+stat('Output tokens per task',fmt(Math.round(O)),Math.round(100*r.R/r.O)+'% hidden reasoning');
    const at=Math.abs(h-H0)<.0006&&om===1;
    $('tkPin').innerHTML=at?'<b>Defaults reproduce AA\'s '+usd(r.cpt,4)+' per task by construction</b>: the cached share '+(100*H0).toFixed(1)+'% is back-solved from AA\'s run total ($'+fmt(r.C,0)+'), so the match is not independent. What the split adds is where the money goes.':'Moved from the fitted point: '+usd(tot,3)+' against AA\'s '+usd(r.cpt,3)+' ('+(tot/r.cpt).toFixed(2)+'×).';
  }
  sel.addEventListener('change',()=>task(true));$('tkH').addEventListener('input',()=>task());$('tkO').addEventListener('input',()=>task());onTab('t-cost',()=>task(H0===null));
})();
