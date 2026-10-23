// ---- Reading section 5: job MTBF against GPU count at three published failure rates (MTBF = 1 / (servers x rate)) ----
(function(){
  const $=id=>document.getElementById(id),E=window.PWE,F=window.PWF;
  if(!$('pw-mtbf'))return;
  const RATES=[[6.5,'6.50 (Meta RSC-1)','var(--bad)'],[3.789,'3.79 (Llama 3)','var(--acc)'],[2.34,'2.34 (Meta RSC-2)','var(--c3)']];
  const MARK=[[16384,3.789,'Llama 3: '],[100000,3.789,'100,000: '],[131072,6.5,'131,072: ']];
  function draw(){const el=$('pw-mtbf');const W=RD.width(el),nar=W<520,H=nar?250:280,l=46,r=nar?40:112,t=12,b=34,pw=W-l-r,ph=H-t-b;
    const gx=[Math.log(1024),Math.log(524288)],gy=[Math.log(0.05),Math.log(120)];
    const x=g=>l+pw*(Math.log(g)-gx[0])/(gx[1]-gx[0]),y=h=>t+ph*(1-(Math.log(h)-gy[0])/(gy[1]-gy[0]));
    let s='';
    [[0.1,'6 min'],[1,'1 h'],[10,'10 h'],[100,'100 h']].forEach(([h,lab])=>{s+='<line x1="'+l+'" x2="'+(l+pw)+'" y1="'+y(h).toFixed(1)+'" y2="'+y(h).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,y(h)+4,lab,{a:'end',fs:11,fill:'var(--mute)'})});
    (nar?[[1024,'1K'],[16384,'16K'],[262144,'256K']]:[[1024,'1K'],[4096,'4K'],[16384,'16K'],[65536,'64K'],[262144,'256K']]).forEach(([g,lab])=>{s+=RD.t(x(g),H-18,lab,{a:'middle',fs:11,fill:'var(--mute)'})});
    s+=RD.t(l+pw/2,H-3,'GPUs in the job (log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    s+='<line x1="'+l+'" x2="'+(l+pw)+'" y1="'+y(1/3).toFixed(1)+'" y2="'+y(1/3).toFixed(1)+'" stroke="var(--mute)" stroke-dasharray="5 4"/>'+RD.t(l+4,y(1/3)+14,'20 min: C + D + R',{fs:11,fill:'var(--mute)'});
    RATES.forEach(([rate,lab,col])=>{let d='';for(let k=0;k<=40;k++){const g=Math.exp(gx[0]+(gx[1]-gx[0])*k/40);d+=(k?'L':'M')+x(g).toFixed(1)+' '+y(E.mtbfH(g,rate)).toFixed(1)}
      s+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2"/>';
      s+=RD.t(l+pw+4,y(E.mtbfH(524288,rate))+4,nar?lab.split(' ')[0]:lab,{fs:11,fill:col})});
    // label placement per marker: [dx, dy, anchor]
    const POS=[[-8,-8,'end'],[-8,-8,'end'],[8,16,null]];
    MARK.forEach(([g,rate,lab],k)=>{const h=E.mtbfH(g,rate),q=POS[k];s+='<circle cx="'+x(g).toFixed(1)+'" cy="'+y(h).toFixed(1)+'" r="4" fill="var(--ink)"/>'+
      RD.t(x(g)+q[0],y(h)+q[1],(nar?'':lab)+F.dur(h),{fs:11,w:600,a:q[2]}).replace('<text ','<text stroke="var(--bg)" stroke-width="4" paint-order="stroke" ')});
    el.innerHTML=RD.svg(W,H,s,'Job mean time between failures falls in proportion to GPU count')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
