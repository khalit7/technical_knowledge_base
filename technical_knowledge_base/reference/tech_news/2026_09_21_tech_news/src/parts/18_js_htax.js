// ---- Harness tax: 7 models x 3 harnesses, success and cost on separate axes (Arena HarnessTax chart data) ----
(function(){
  const box=$('htPlot');if(!box)return;
  const D=[[0, "Claude Fable 5", "Claude Code", 97.8, 1.329], [0, "Claude Opus 4.8", "Claude Code", 86.7, 0.976], [0, "Claude Sonnet 4.6", "Claude Code", 66.7, 0.669], [0, "Claude Haiku 4.5", "Claude Code", 52.2, 0.426], [0, "GPT-5.6 Sol", "Claude Code", 77.8, 1.54], [0, "GPT-5.6 Luna", "Claude Code", 55.6, 0.152], [0, "Kimi K3", "Claude Code", 76.7, 0.784], [0, "Claude Fable 5", "Codex", 96.7, 0.89], [0, "Claude Opus 4.8", "Codex", 88.9, 0.694], [0, "Claude Sonnet 4.6", "Codex", 68.9, 0.745], [0, "Claude Haiku 4.5", "Codex", 57.8, 0.392], [0, "GPT-5.6 Sol", "Codex", 73.3, 0.561], [0, "GPT-5.6 Luna", "Codex", 55.6, 0.035], [0, "Kimi K3", "Codex", 74.4, 0.845], [0, "Claude Fable 5", "Pi", 96.7, 0.666], [0, "Claude Opus 4.8", "Pi", 82.2, 0.473], [0, "Claude Sonnet 4.6", "Pi", 64.4, 0.679], [0, "Claude Haiku 4.5", "Pi", 60.0, 0.374], [0, "GPT-5.6 Sol", "Pi", 74.4, 0.441], [0, "GPT-5.6 Luna", "Pi", 53.3, 0.03], [0, "Kimi K3", "Pi", 72.2, 0.455], [1, "Claude Fable 5", "Claude Code", 75.6, 1.554], [1, "Claude Haiku 4.5", "Claude Code", 41.1, 0.263], [1, "Claude Opus 4.8", "Claude Code", 68.9, 0.899], [1, "Claude Sonnet 4.6", "Claude Code", 62.2, 0.669], [1, "GPT-5.6 Luna", "Codex", 72.2, 0.064], [1, "GPT-5.6 Sol", "Codex", 78.9, 0.761], [1, "Claude Fable 5", "Pi", 71.1, 1.079], [1, "Claude Haiku 4.5", "Pi", 47.8, 0.25], [1, "Claude Opus 4.8", "Pi", 72.2, 0.758], [1, "Claude Sonnet 4.6", "Pi", 65.6, 0.614], [1, "GPT-5.6 Luna", "Pi", 76.7, 0.045], [1, "GPT-5.6 Sol", "Pi", 83.3, 0.421], [1, "Kimi K3", "Pi", 73.3, 0.383], [1, "Kimi K3", "Claude Code", 66.7, 0.521], [1, "GPT-5.6 Luna", "Claude Code", 70.0, 0.098], [1, "GPT-5.6 Sol", "Claude Code", 71.1, 1.355], [1, "Claude Fable 5", "Codex", 72.2, 0.976], [1, "Claude Haiku 4.5", "Codex", 31.1, 0.214], [1, "Kimi K3", "Codex", 70.0, 0.45], [1, "Claude Opus 4.8", "Codex", 72.2, 0.848], [1, "Claude Sonnet 4.6", "Codex", 63.3, 0.552]];
  const HS=[['Claude Code','var(--c2)'],['Codex','var(--c1)'],['Pi','var(--c3)']];
  const st={b:0};
  segBind('htB',m=>{st.b=+m;$('htB').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m?'true':'false'));draw()});
  function panel(W,rows,models,kind){
    const narrow=W<560,pl=narrow?104:130,pr=14,pt=22,rh=narrow?24:26,H=pt+models.length*rh+30;
    const log=kind==='cost',a=log?Math.log10(0.02):20,b=log?Math.log10(2):100;
    const X=v=>pl+(W-pl-pr)*((log?Math.log10(v):v)-a)/(b-a);
    let s='<text x="'+pl+'" y="12" font-size="12" font-weight="600">'+(log?'Cost per attempt, US$ (log scale)':'Tasks solved, %')+'</text>';
    (log?[[0.03,'0.03'],[0.1,'0.1'],[0.3,'0.3'],[1,'1'],[2,'2']]:[[20,'20'],[40,'40'],[60,'60'],[80,'80'],[100,'100']]).forEach(([v,l])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(H-28)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    models.forEach((m,i)=>{const y=pt+i*rh+rh/2,r=rows.filter(q=>q[1]===m),vals=r.map(q=>log?q[4]:q[3]);
      s+='<text x="'+(pl-6)+'" y="'+(y+4)+'" font-size="11" text-anchor="end">'+m+'</text>';
      const lo=Math.min(...vals),hi=Math.max(...vals);
      s+='<line x1="'+X(lo)+'" x2="'+X(hi)+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)" stroke-width="3" opacity=".35"/>';
      r.forEach(q=>{const c=HS.find(h=>h[0]===q[2])[1];s+='<circle cx="'+X(log?q[4]:q[3])+'" cy="'+y+'" r="4.5" fill="'+c+'" stroke="var(--bg)"><title>'+m+' in '+q[2]+': '+q[3]+'% at $'+q[4]+'</title></circle>'});
      if(log)s+='<text x="'+(W-pr)+'" y="'+(y-6)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+(hi/lo).toFixed(1)+'x</text>';
      else s+='<text x="'+(W-pr)+'" y="'+(y-6)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+(hi-lo).toFixed(1)+' pts</text>'});
    return svgEl(W,H,s,kind)}
  function draw(){
    const W=Math.max(300,box.clientWidth||340),rows=D.filter(r=>r[0]===st.b);
    const models=[...new Set(rows.map(r=>r[1]))].sort((x,y)=>Math.max(...rows.filter(r=>r[1]===y).map(r=>r[3]))-Math.max(...rows.filter(r=>r[1]===x).map(r=>r[3])));
    box.innerHTML=panel(W,rows,models,'succ')+panel(W,rows,models,'cost')+'<div class="lgd">'+HS.map(h=>'<span><i style="background:'+h[1]+';border-radius:50%"></i>'+h[0]+'</span>').join('')+'<span>grey bar: the spread across the three harnesses, labelled at right</span></div>';
    const g=(a,c)=>{const m=models.map(mm=>{const x=rows.find(r=>r[1]===mm&&r[2]===a),y=rows.find(r=>r[1]===mm&&r[2]===c);return Math.log(x[4]/y[4])});return Math.exp(m.reduce((p,q)=>p+q,0)/m.length)};
    $('htOut').innerHTML=stat('Claude Code against Pi, cost',g('Claude Code','Pi').toFixed(2)+'x','geometric mean over the 7 models (derived); Arena: '+(st.b?'1.5x':'2.0x'))+stat('Claude Code against Codex, cost',g('Claude Code','Codex').toFixed(2)+'x','geometric mean (derived)'+(st.b?'':'; Arena: 1.6x'))+stat('Average effect on success',st.b?'within about ±5%':'within ±2%','Arena\'s summary; single pairs vary more (see the grey bars)');
  }
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);
})();
