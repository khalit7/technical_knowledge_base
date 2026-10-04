// ---- Calibration lab (t-cal): Rogan-Gladen correction of the judge's win rate with a seeded gold slice ----
(function(){
  const L=window.LJ,$=id=>document.getElementById(id),P=(x,d)=>L.pct(x,d);
  const tS=$('cl-t');[2,1,0,3,4,5].forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=L.nm(m);tS.appendChild(o)});
  let seed=1,I=null,last=null,showRep=false,showCurve=false;
  function items(){
    const j=$('cl-j').value;
    // the pointwise file has no Vicuna v1.2 answers
    [...tS.options].forEach(o=>{o.disabled=(j==='S'&&+o.value===3)});
    if(j==='S'&&+tS.value===3)tS.value='2';
    I=L.items(+tS.value,j);
  }
  function ciRow(label,x,lo,hi,color,y,X,lw){
    let s=RD.t(lw-6,y+4,label,{a:'end',fs:11});
    if(isFinite(lo)&&isFinite(hi))s+='<line x1="'+X(lo)+'" y1="'+y+'" x2="'+X(hi)+'" y2="'+y+'" stroke="'+color+'" stroke-width="3" stroke-linecap="round"/>';
    if(isFinite(x))s+='<circle cx="'+X(x)+'" cy="'+y+'" r="5" fill="'+color+'"/>';
    return s;
  }
  function render(){
    items();const m=Math.min(+$('cl-m').value,I.length);$('cl-mv').textContent=m;$('cl-sv').textContent=seed;
    const C=L.calib(I,m,seed);last=C;
    $('cl-stats').innerHTML=RD.stat('Truth (all humans)',P(C.th),I.length+' items')+
      RD.stat('Judge raw rate',P(C.p),'error '+((C.p-C.th)*100>=0?'+':'')+((C.p-C.th)*100).toFixed(1)+' points')+
      RD.stat('Corrected',C.c.ok?P(C.c.est):'not computable',C.c.ok?P(C.c.lo)+' to '+P(C.c.hi):'q&#770;0 + q&#770;1 &le; 1 or an empty class')+
      RD.stat('Labels used alone',P(C.human.est),P(C.human.lo)+' to '+P(C.human.hi)+' (Wilson)');
    const wd=RD.width($('cl-ci')),lw=Math.min(120,wd*0.32),pw=wd-lw-14,X=v=>lw+pw*Math.max(0,Math.min(1,v)),hh=118;
    let s='';[0,.25,.5,.75,1].forEach(t=>{s+='<line x1="'+X(t)+'" y1="14" x2="'+X(t)+'" y2="'+(hh-6)+'" stroke="var(--line)"/>'+RD.t(X(t),10,Math.round(t*100)+'%',{a:'middle',fs:11,fill:'var(--mute)'})});
    s+='<line x1="'+X(C.th)+'" y1="14" x2="'+X(C.th)+'" y2="'+(hh-6)+'" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 3"/>';
    s+=ciRow('Judge raw',C.p,NaN,NaN,'var(--bad)',32,X,lw)+ciRow('Corrected',C.c.est,C.c.lo,C.c.hi,'var(--c1)',58,X,lw)+ciRow('Labels alone',C.human.est,C.human.lo,C.human.hi,'var(--c3)',84,X,lw);
    s+=RD.t(Math.min(X(C.th)+4,wd-40),hh-2,'truth',{fs:11,fill:'var(--mute)'});
    $('cl-ci').innerHTML=RD.svg(wd,hh,s,'Raw, corrected and human-only estimates against the truth');
    $('cl-cm').innerHTML='<table class="cm"><tr><th></th><th>judge: win</th><th>judge: not</th></tr><tr><th>human: win</th><td class="d">'+C.tp+'</td><td>'+C.fn+'</td></tr><tr><th>human: loss</th><td>'+C.fp+'</td><td class="d">'+C.tn+'</td></tr></table>';
    const sig=C.q0+C.q1-1;
    $('cl-read').innerHTML='Sensitivity q&#770;<sub>1</sub> = '+C.tp+'/'+C.m1+' = '+(isFinite(C.q1)?C.q1.toFixed(3):'n/a')+'; specificity q&#770;<sub>0</sub> = '+C.tn+'/'+C.m0+' = '+(isFinite(C.q0)?C.q0.toFixed(3):'n/a')+'. The correction divides by q&#770;<sub>0</sub> + q&#770;<sub>1</sub> &minus; 1 = '+(isFinite(sig)?sig.toFixed(3):'n/a')+
      (isFinite(sig)&&sig>0?', so the noise of the slice\'s two rates is multiplied by about 1/'+sig.toFixed(2)+' = '+(1/sig).toFixed(1)+(sig<0.35?': a judge this weak gives a very wide interval.':'.'):': the correction cannot be computed.')+
      ' With '+m+' labels the corrected interval is '+(C.c.ok?((C.c.hi-C.c.lo)*100).toFixed(1)+' points wide':'not computable')+' against '+((C.human.hi-C.human.lo)*100).toFixed(1)+' for the labels alone.';
    if(showRep)repeat();else{$('cl-rep').innerHTML='';$('cl-repn').textContent=''}
    if(showCurve)curve();else{$('cl-cv').innerHTML='';$('cl-cvn').textContent=''}
  }
  const changed=()=>{showRep=false;showCurve=false;render()};
  function repeat(){
    const m=Math.min(+$('cl-m').value,I.length);const ests=[],hum=[];let cov=0,ok=0,w=0,wh=0,covh=0;
    let th=NaN;
    for(let s=1;s<=200;s++){const C=L.calib(I,m,s);th=C.th;hum.push(C.human.est);wh+=C.human.hi-C.human.lo;if(C.human.lo<=th&&th<=C.human.hi)covh++;
      if(!C.c.ok||!isFinite(C.c.est))continue;ok++;ests.push(C.c.est);w+=C.c.hi-C.c.lo;if(C.c.lo<=th&&th<=C.c.hi)cov++}
    const p=I.reduce((a,x)=>a+x[1],0)/I.length;
    const wd=RD.width($('cl-rep')),pad=14,X=v=>pad+(wd-2*pad)*Math.max(0,Math.min(1,v)),hh=96;
    const hs=hum.slice().sort((a,b)=>a-b),q=f=>hs[Math.floor(f*(hs.length-1))];
    let s='';[0,.25,.5,.75,1].forEach(t=>{s+='<line x1="'+X(t)+'" y1="12" x2="'+X(t)+'" y2="'+(hh-4)+'" stroke="var(--line)"/>'+RD.t(X(t),9,Math.round(t*100)+'%',{a:'middle',fs:11,fill:'var(--mute)'})});
    s+='<rect x="'+X(q(.025))+'" y="66" width="'+Math.max(1,X(q(.975))-X(q(.025)))+'" height="14" fill="var(--c3)" opacity=".35"><title>middle 95% of the human-only estimates</title></rect>';
    ests.forEach((e,i)=>{const y=22+((i*37)%40);s+='<circle cx="'+X(e).toFixed(1)+'" cy="'+y+'" r="2.4" fill="var(--c1)" opacity=".6"/>'});
    s+='<line x1="'+X(p)+'" y1="12" x2="'+X(p)+'" y2="'+(hh-4)+'" stroke="var(--bad)" stroke-width="2"/>'+'<line x1="'+X(th)+'" y1="12" x2="'+X(th)+'" y2="'+(hh-4)+'" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 3"/>';
    $('cl-rep').innerHTML=RD.svg(wd,hh,s,'Corrected estimates over 200 gold-slice draws')+'<div class="leg"><span style="--sw:var(--c1)">corrected, one per draw</span><span style="--sw:var(--c3)">labels alone, middle 95%</span><span style="--sw:var(--bad)">judge raw</span><span style="--sw:var(--ink)">truth (dashed)</span></div>';
    const mean=ests.reduce((a,x)=>a+x,0)/Math.max(1,ests.length),sd=Math.sqrt(ests.reduce((a,x)=>a+(x-mean)**2,0)/Math.max(1,ests.length));
    $('cl-repn').innerHTML='Usable draws '+ok+' of 200 (the rest had no wins or no losses in the slice, or q&#770;0 + q&#770;1 &le; 1). Corrected: mean '+P(mean)+', spread (sd) '+(sd*100).toFixed(1)+' points, interval covers the truth in <b>'+cov+' of '+ok+'</b>, mean width '+(ok?(100*w/ok).toFixed(1):'n/a')+' points. Labels alone: covers in '+covh+' of 200, mean width '+(100*wh/200).toFixed(1)+' points. Raw judge: '+P(p)+', off by '+((p-th)*100).toFixed(1)+' points in every draw.';
  }
  function curve(){
    const sizes=[];for(let m=20;m<=400;m+=20)if(m<=I.length)sizes.push(m);
    const rows=sizes.map(m=>{let w=0,ok=0,wh=0;for(let s=1;s<=50;s++){const C=L.calib(I,m,s);wh+=C.human.hi-C.human.lo;if(C.c.ok){w+=C.c.hi-C.c.lo;ok++}}return {m,c:ok?w/ok:NaN,h:wh/50,ok}});
    const wd=RD.width($('cl-cv')),lw=34,pw=wd-lw-12,hh=170,ph=130,X=m=>lw+pw*(m-20)/380,Y=v=>14+ph*(1-Math.min(1,v));
    let s='';[0,.25,.5,.75,1].forEach(t=>{s+='<line x1="'+lw+'" y1="'+Y(t)+'" x2="'+(wd-12)+'" y2="'+Y(t)+'" stroke="var(--line)"/>'+RD.t(lw-4,Y(t)+3,Math.round(t*100),{a:'end',fs:11,fill:'var(--mute)'})});
    [20,100,200,300,400].forEach(m=>{s+=RD.t(X(m),hh-6,m,{a:'middle',fs:11,fill:'var(--mute)'})});
    const path=k=>rows.filter(r=>isFinite(r[k])).map((r,i)=>(i?'L':'M')+X(r.m).toFixed(1)+' '+Y(r[k]).toFixed(1)).join(' ');
    s+='<path d="'+path('c')+'" fill="none" stroke="var(--c1)" stroke-width="2"/><path d="'+path('h')+'" fill="none" stroke="var(--c3)" stroke-width="2"/>';
    $('cl-cv').innerHTML=RD.svg(wd,hh,s,'Interval width against gold slice size')+'<div class="leg"><span style="--sw:var(--c1)">corrected judge rate</span><span style="--sw:var(--c3)">labels alone</span></div>';
    const better=rows.filter(r=>r.c<r.h).map(r=>r.m);
    $('cl-cvn').innerHTML='Width of the 95% interval in points (vertical) against human labels in the slice (horizontal). '+(better.length?'The corrected judge is narrower at '+better.length+' of '+rows.length+' sizes ('+better[0]+' to '+better[better.length-1]+' labels).':'The labels alone are narrower at every size: this judge is not accurate enough on this task for calibration to save human labels, the result Lee et al. report for Chatbot Arena.');
  }
  ['cl-t','cl-j'].forEach(id=>$(id).addEventListener('change',changed));
  $('cl-m').addEventListener('input',()=>{showRep=false;render()});
  $('cl-new').addEventListener('click',()=>{seed++;render()});
  $('cl-reset').addEventListener('click',()=>{seed=1;render()});
  $('cl-run').addEventListener('click',()=>{showRep=true;repeat()});
  $('cl-curve').addEventListener('click',()=>{showCurve=true;curve()});
  RD.onRender(render,'t-cal');RD.onResizeTab('t-cal',render);
})();
