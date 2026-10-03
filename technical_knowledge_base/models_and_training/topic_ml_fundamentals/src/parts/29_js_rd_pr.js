// ---- Reading, step 7: ROC against precision-recall as positives get rarer (binormal model, RDE.roc / RDE.curves) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-pr'))return;
  const F=RD.f,lo=Math.log10(0.5),hi=Math.log10(0.001);
  const prevOf=v=>Math.pow(10,lo+(hi-lo)*v/100);
  function plot(id,pts,pt,xl,yl,base){const box=$(id),W=RD.width(box),S=Math.min(W,300),ml=34,mr=8,mt=8,mb=30,H=S;
    const x=v=>ml+(S-ml-mr)*v,y=v=>mt+(H-mt-mb)*(1-v);
    let s='<svg viewBox="0 0 '+S+' '+H+'" width="'+S+'" height="'+H+'" role="img" aria-label="'+xl+' and '+yl+'">';
    for(let v=0;v<=1.001;v+=0.25)s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+F(v,2)+'</text><text x="'+x(v)+'" y="'+(H-16)+'" font-size="10" text-anchor="'+(v>0.99?'end':v<0.01?'start':'middle')+'" fill="var(--mute)">'+F(v,2)+'</text>';
    s+='<text x="'+x(1)+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+xl+'</text>';
    if(base!=null)s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(base)+'" y2="'+y(base)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    else s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(0)+'" y2="'+y(1)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    s+='<path d="'+pts.map((p,k)=>(k?'L':'M')+x(p[0]).toFixed(1)+' '+y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2.4"/>';
    s+='<circle cx="'+x(pt[0])+'" cy="'+y(pt[1])+'" r="5" fill="var(--c2)" stroke="var(--bg)"/>';
    box.innerHTML=s+'</svg>'}
  function draw(){const prev=prevOf(+$('rd-prP').value),dp=+$('rd-prD').value/10,th=+$('rd-prT').value/100;
    $('rd-prPv').textContent=prev>=0.01?RD.pct(prev,prev>=0.1?0:1):RD.pct(prev,2);$('rd-prDv').textContent=F(dp,1);$('rd-prTv').textContent=F(th,2);
    const c=RDE.curves(dp,prev),o=RDE.roc(dp,prev,th);
    plot('rd-prR',c.R,[o.fpr,o.tpr],'false positive rate','recall');plot('rd-prQ',c.P,[o.tpr,o.prec],'recall','precision',prev);
    const f1=o.prec+o.tpr>0?2*o.prec*o.tpr/(o.prec+o.tpr):0,N=100000,tp=Math.round(N*prev*o.tpr),fp=Math.round(N*(1-prev)*o.fpr);
    $('rd-prN').innerHTML=RD.stat('ROC-AUC',F(c.auc,3),'unchanged by prevalence')+RD.stat('AUPRC',F(c.auprc,3),'chance = prevalence, '+(prev>=0.01?F(prev,2):F(prev,3)))+
      RD.stat('At this threshold','recall '+F(o.tpr,2),'FPR '+F(o.fpr,3)+', precision '+F(o.prec,3))+RD.stat('Per 100,000 examples',tp.toLocaleString('en-GB')+' TP, '+fp.toLocaleString('en-GB')+' FP','F1 '+F(f1,3));
  }
  ['rd-prP','rd-prD','rd-prT'].forEach(id=>$(id).addEventListener('input',draw));RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
})();
