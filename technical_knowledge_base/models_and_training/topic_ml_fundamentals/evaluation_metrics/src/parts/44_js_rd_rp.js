// ---- Reading, section 2: the same logistic regression on all sentences and on rare positives, ROC and PR overlaid ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f;if(!$('rd-rp'))return;
  const {Y,P}=window.SST;
  const sets=[false,true].map(rare=>{const idx=MX.sst(rare),y=idx.map(i=>Y[i]),p=idx.map(i=>P.lr[i]);return {rare,cv:MX.curves(y,p),auc:MX.auc(y,p),prev:y.reduce((a,b)=>a+b,0)/y.length}});
  function plot(id,kind){const box=$(id),S=Math.min(RD.width(box),330),ml=32,mr=8,mt=8,mb=28,x=v=>ml+(S-ml-mr)*v,y=v=>mt+(S-mt-mb)*(1-v);
    let s='<svg viewBox="0 0 '+S+' '+S+'" width="'+S+'" height="'+S+'" role="img" aria-label="'+(kind==='roc'?'ROC':'Precision-recall')+' curves, all data and rare positives">';
    for(let v=0;v<=1.001;v+=0.25)s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+F(v,2)+'</text><text x="'+x(v)+'" y="'+(S-15)+'" font-size="11" text-anchor="'+(v>0.99?'end':v<0.01?'start':'middle')+'" fill="var(--mute)">'+F(v,2)+'</text>';
    s+='<text x="'+x(1)+'" y="'+(S-2)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+(kind==='roc'?'false positive rate':'recall')+'</text>';
    if(kind==='roc')s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(0)+'" y2="'+y(1)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    sets.forEach(d=>{const pts=kind==='roc'?d.cv.roc:d.cv.pr,col=d.rare?'var(--c2)':'var(--c1)';
      s+='<path d="'+pts.map((p,k)=>(k?'L':'M')+x(p[0]).toFixed(1)+' '+y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="2.2"/>';
      if(kind==='pr')s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(d.prev)+'" y2="'+y(d.prev)+'" stroke="'+col+'" stroke-dasharray="3 3" stroke-opacity=".7"/>'});
    // labels on the figure
    const a=sets[0],r=sets[1];
    const lb=(xv,yv,t,c,an)=>'<text x="'+x(xv)+'" y="'+y(yv)+'" font-size="11"'+(an?' text-anchor="'+an+'"':'')+' fill="'+c+'">'+t+'</text>';
    if(kind==='roc')s+=lb(0.97,0.30,'all: AUC '+F(a.auc,3),'var(--c1)','end')+lb(0.97,0.22,'rare: AUC '+F(r.auc,3),'var(--c2)','end');
    else s+=lb(0.03,0.42,'all: AP '+F(a.cv.ap,3),'var(--c1)')+lb(0.03,0.34,'rare: AP '+F(r.cv.ap,3),'var(--c2)')+lb(0.03,r.prev+0.03,'chance '+F(r.prev,2)+' (rare)','var(--mute)')+lb(0.03,a.prev+0.03,'chance '+F(a.prev,2),'var(--mute)');
    box.innerHTML=s+'</svg>'}
  const draw=()=>{plot('rd-rpR','roc');plot('rd-rpP','pr')};RD.onRender(draw);draw();RD.onResize(draw);
})();
