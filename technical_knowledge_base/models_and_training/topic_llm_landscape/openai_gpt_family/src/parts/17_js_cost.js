// ---- Reading, closed block under 'Price per token is not cost per task': per token against per task, one task taken apart (the cross-lab scatter is the landscape root's) ----
(function(){
  const rows=AA.map(r=>({n:r[0],lab:r[1],ix:r[2],cpt:r[3],pi:r[4],pc:r[5],po:r[6],I:r[7],O:r[8],R:r[9],C:r[10],slug:r[11],open:r[12],oa:r[1]==='OpenAI'}));
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
  selB.addEventListener('change',ratios);onTab('t-read',ratios);
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
  sel.addEventListener('change',()=>task(true));$('tkH').addEventListener('input',()=>task());$('tkO').addEventListener('input',()=>task());onTab('t-read',()=>task(H0===null));
})();
