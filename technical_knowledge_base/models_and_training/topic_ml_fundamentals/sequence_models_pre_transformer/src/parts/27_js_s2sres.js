// ---- Reading: measured accuracy of the three toy seq2seq models against input length ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('sr'))return;
  const D=SQ.s2s,L=D.lens,F=(v,d)=>v.toFixed(d);
  const MS=[['fixed','fixed vector','var(--c2)'],['fixed_reversed','fixed vector, source reversed','var(--c5)'],['attention','attention','var(--c3)']];
  const st={view:'seq_acc'};
  const runs=m=>D.runs.filter(r=>r.model===m);
  function draw(){
    const box=$('sr-svg'),W=RD.width(box),H=Math.round(Math.min(280,Math.max(210,W*.42))),ml=42,mr=12,mt=10,mb=34,x0=ml,x1=W-mr,y0=mt,y1=H-mb;
    const pos=st.view==='pos',xs=pos?Array.from({length:20},(_,i)=>i+1):L,lx=v=>x0+(x1-x0)*(v-xs[0])/(xs[xs.length-1]-xs[0]),ly=v=>y1-(y1-y0)*v;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Seq2seq accuracy against length">';
    if(!pos)s+='<rect x="'+lx(D.train[0])+'" y="'+y0+'" width="'+(lx(D.train[1])-lx(D.train[0]))+'" height="'+(y1-y0)+'" fill="var(--soft)"/><text x="'+(lx(D.train[0])+4)+'" y="'+(y0+11)+'" font-size="9.5" fill="var(--mute)">training lengths '+D.train[0]+' to '+D.train[1]+'</text>';
    for(const v of [0,.25,.5,.75,1])s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(x0-5)+'" y="'+(ly(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+Math.round(v*100)+'%</text>';
    if(st.view!=='seq_acc')s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+ly(.1)+'" y2="'+ly(.1)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(x1-2)+'" y="'+(ly(.1)-3)+'" font-size="9.5" text-anchor="end" fill="var(--mute)">chance 10%</text>';
    xs.forEach(v=>{if(pos?(v%2===1||v===20):(v%4===2))s+='<text x="'+lx(v)+'" y="'+(y1+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+x1+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(pos?'position of the digit in a 20-digit string':'digits in the input')+'</text>';
    MS.forEach(([m,,col])=>runs(m).forEach(r=>{const a=pos?r.pos_acc_L20:r[st.view];s+='<path d="'+a.map((v,i)=>(i?'L':'M')+lx(xs[i]).toFixed(1)+' '+ly(v).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="1.8" opacity="'+(r.seed?0.55:1)+'"/>'}));
    box.innerHTML=s+'</svg>';
    const mean=(m,key,len)=>{const rr=runs(m);return rr.reduce((a,r)=>a+r[key][L.indexOf(len)],0)/rr.length};
    $('sr-n').innerHTML=pos?MS.map(([m,n])=>{const rr=runs(m),f=rr.reduce((a,r)=>a+r.pos_acc_L20[0],0)/rr.length,l=rr.reduce((a,r)=>a+r.pos_acc_L20[19],0)/rr.length;return RD.stat(n,F(100*f,0)+'% to '+F(100*l,0)+'%','first digit to last, mean of 2 seeds')}).join('')
      :MS.map(([m,n])=>RD.stat(n+', 12 digits',F(100*mean(m,st.view,12),1)+'%',(st.view==='seq_acc'?'whole string':'per digit')+', mean of 2 seeds')).join('');
  }
  $('sr-view').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.view=b.dataset.v;[...$('sr-view').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});draw()});
  RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,150)});
})();
