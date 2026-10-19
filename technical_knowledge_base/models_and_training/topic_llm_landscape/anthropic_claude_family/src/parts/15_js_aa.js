// ---- Effort and cost per task tab (AA v4.3) ----
(function(){
  const R=AA.map(a=>({n:a[0],lab:a[1],idx:a[2],cpt:a[3],I:a[4],O:a[5],run:a[6],pi:a[7],po:a[8],pc:a[9],slug:a[10]}));
  R.forEach(r=>{const oc=r.O*r.po/1e6,ic=r.run-oc;r.f=Math.min(1,Math.max(0,(r.pi-ic*1e6/r.I)/(r.pi-r.pc)))});
  const FR=['GPT-6 Astra (max)','GPT-6.1 Sol (max)','GPT-6 Sol (max)','Gemini 4 Argon (high)','Muse Spark 1.3 (max)','Grok 4.7 (xhigh)','Kimi K3 (max)','GLM-5.3 (max)','MiMo-V2.6-Pro','DeepSeek V4.1 Flash (max)','Qwen3.8 Max (0902)'];
  const LINES=[['Opus 5.5 (medium)','Opus 5.5 (xhigh)','Opus 5.5 (max)'],['Sonnet 5.5 (medium)','Sonnet 5.5 (max)'],['Muse Spark 1.3 (xhigh)','Muse Spark 1.3 (max)']];
  let set='claude';
  function plot(){
    const pts=R.filter(r=>set==='all'||r.lab==='Anthropic'||FR.includes(r.n));
    const narrow=$('aaSvg').clientWidth<560,W=narrow?380:860,H=narrow?380:420;
    const F=logFrame({W,H,pl:44,pr:narrow?14:24,pt:14,pb:40,x:[0.01,20],y:[1,1],xt:[[0.01,'$0.01'],[0.1,'$0.10'],[1,'$1'],[10,'$10']],yt:[],xl:'cost per Intelligence Index task (log scale)'});
    const y0=H-40,y1=14,ly=v=>y0-(y0-y1)*(v-10)/50;let s=F.s;
    [10,20,30,40,50,60].forEach(v=>{s+='<line x1="44" x2="'+(W-(narrow?14:24))+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="38" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="12" y="'+((y0+y1)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((y0+y1)/2)+')">Intelligence Index v4.3</text>';
    LINES.forEach(L=>{const q=L.map(n=>pts.find(r=>r.n===n)).filter(Boolean);if(q.length<2)return;const c=q[0].lab==='Anthropic'?'var(--c2)':'var(--mute)';
      s+='<polyline points="'+q.map(r=>F.lx(r.cpt).toFixed(1)+','+ly(r.idx).toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="1.6" stroke-dasharray="4 3"/>'});
    const OFF={'Opus 5.5 (max)':[-8,-6,'end'],'Opus 5.5 (xhigh)':[-8,-4,'end'],'Opus 5.5 (medium)':[-8,14,'end'],'Sonnet 5.5 (max)':[8,4,'start'],'Fable 5.1 (max)':[8,14,'start'],'Opus 5 (max)':[-8,14,'end'],'Sonnet 5.5 (medium)':[8,4,'start'],'Haiku 4.5':[8,4,'start'],
      'GPT-6 Astra (max)':[0,-9,'middle'],'GPT-6.1 Sol (max)':[0,-9,'middle'],'Gemini 4 Argon (high)':[0,16,'middle'],'MiMo-V2.6-Pro':[8,4,'start'],'DeepSeek V4.1 Flash (max)':[8,4,'start']};
    pts.forEach(r=>{const cl=r.lab==='Anthropic',x=F.lx(r.cpt),y=ly(r.idx);
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(cl?5.5:4)+'" fill="'+(cl?'var(--c2)':'var(--dim)')+'" stroke="'+(cl?'var(--bg)':'var(--mute)')+'"><title>'+r.n+' ('+r.lab+'): '+r.idx+' at $'+r.cpt+' per task</title></circle>';
      let o=OFF[r.n];const tx=r.n.replace(' (high)','');if(o&&o[2]==='start'&&x+o[0]+tx.length*5.6>W)o=[-8,o[1],'end'];if(o&&(cl||!narrow))s+='<text x="'+(x+o[0])+'" y="'+(y+o[1])+'" font-size="'+(narrow?9.5:10.5)+'" text-anchor="'+o[2]+'" fill="'+(cl?'var(--ink)':'var(--mute)')+'">'+r.n.replace(' (high)','').replace(/ \(max\)$/,cl?' (max)':'')+'</text>'});
    $('aaSvg').innerHTML=svgEl(W,H,s,'Intelligence Index against cost per task');
    $('aaLeg').innerHTML='<span><i style="background:var(--c2);height:8px;width:8px;border-radius:50%"></i>Claude</span><span><i style="background:var(--dim);height:8px;width:8px;border-radius:50%"></i>other labs</span><span>dashed: one model at several efforts</span>';
  }
  const runs=R.filter(r=>r.lab==='Anthropic'||['GPT-6 Astra (max)','GPT-6.1 Sol (max)','Gemini 4 Argon (high)'].includes(r.n));
  $('aaRun').innerHTML=runs.map((r,i)=>'<option value="'+i+'">'+r.n+(r.lab!=='Anthropic'?' ('+r.lab+')':'')+'</option>').join('');
  const PL=[['own','its own price list'],['Opus 5.5','Opus 5.5'],['Sonnet 5.5','Sonnet 5.5'],['Fable 5.1','Fable 5.1'],['Fable 5','Fable 5'],['Opus 5','Opus 5'],['Haiku 4.5','Haiku 4.5']];
  $('aaPrice').innerHTML=PL.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  function setRun(){const r=runs[+$('aaRun').value];$('aaF').value=r.f.toFixed(4);split()}
  function split(){
    const r=runs[+$('aaRun').value],pv=$('aaPrice').value,f=+$('aaF').value;$('aaFv').textContent=(100*f).toFixed(1)+'%';
    const p=pv==='own'?{i:r.pi,o:r.po,c:r.pc}:PBY(pv);
    const out=r.O*p.o/1e6,cac=r.I*f*p.c/1e6,unc=r.I*(1-f)*p.i/1e6,tot=out+cac+unc;
    const parts=[[out,'output','var(--c4)'],[cac,'cached input','var(--good)'],[unc,'uncached input','var(--c1)']];
    $('aaSplit').innerHTML='<span>'+r.n+'</span><div class="sb">'+parts.map(([v,l,c])=>sbSeg(v,tot,l,c,l+' '+usd(v,0))).join('')+'</div>';fitSb($('aaSplit'));
    const scale=tot/r.run;
    $('aaStats').innerHTML=stat('Cost to run the index',usd(tot,0),pv==='own'&&Math.abs(f-r.f)<0.00006?'Artificial Analysis: '+usd(r.run,0):'Artificial Analysis at its own prices: '+usd(r.run,0))+
      stat('Cost per task at these prices',usd(r.cpt*scale,2),'AA\'s '+usd(r.cpt,2)+' × '+scale.toFixed(2))+
      stat('Tokens used',sci(r.I,2)+' in','and '+sci(r.O,2)+' out (thinking included)')+
      stat('Fitted cached share',(100*r.f).toFixed(1)+'%','of input tokens, at its own prices');
    let rep='';
    if(pv==='own'&&Math.abs(f-r.f)<0.00006)rep='At the fitted share the split adds up to Artificial Analysis\'s published run cost exactly: a reproduction <b>by construction</b>, since the share was fitted to it.';
    if(r.n==='Fable 5.1 (max)'&&pv==='Fable 5'&&Math.abs(f-r.f)<0.00006)rep='The same run at Fable 5\'s $1.00 cache read costs '+usd(tot,0)+', '+(100*(tot/r.run-1)).toFixed(0)+'% more; the 5.1 price is a '+(100*(1-r.run/tot)).toFixed(1)+'% saving, near Anthropic\'s "around 25%" for typical workloads (an independent claim; the cached share here is fitted).';
    if(r.n==='Sonnet 5.5 (max)'&&pv==='Opus 5.5')rep='Sonnet 5.5 (max) used 1.59 times the output tokens and 1.70 times the input tokens of Opus 5.5 (max). At Opus 5.5\'s prices its run would cost '+scale.toFixed(2)+' times its own bill; at its own half-price list it still costs $7.62 per task against Opus 5.5\'s $5.98.';
    $('aaRep').innerHTML=rep||'Move the share: input is billed at '+usd(p.i,2)+' uncached and '+usd(p.c,2)+' cached per million, so the share decides most of the input bill.';
  }
  segBind('aaSet',m=>{set=m;plot()});
  $('aaRun').addEventListener('change',setRun);$('aaPrice').addEventListener('change',split);$('aaF').addEventListener('input',split);
  onTab('t-aa',()=>{plot();split()});addEventListener('resize',()=>fitSb($('aaSplit')));
  $('aaRun').value=String(runs.findIndex(r=>r.n==='Opus 5.5 (medium)'));setRun();
})();
