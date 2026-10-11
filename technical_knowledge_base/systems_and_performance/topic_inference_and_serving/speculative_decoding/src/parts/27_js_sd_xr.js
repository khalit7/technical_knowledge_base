// ---- Reading section 5: measured llama-server throughput with a draft, relative to no draft, against users ----
(function(){
  const D=SD.D,X=D.xover,el=document.getElementById('sd-xr-svg');if(!el||!X)return;
  const cfg=[['d3','real draft, k = 3 (default)','var(--c1)',''],['d6','real draft, k = 6','var(--c4)',''],
    ['s25','synthetic acceptance length 2.5, k = 4','var(--c3)','5 3'],['s45','synthetic acceptance length 4.5, k = 4','var(--c2)','5 3']];
  function draw(){const Bs=X.Bs;
    SD.chart(el,{series:cfg.filter(c=>X.ratio[c[0]]).map(c=>({pts:Bs.map(B=>[B,X.ratio[c[0]][B].mean]),err:Bs.map(B=>[B,X.ratio[c[0]][B].lo,X.ratio[c[0]][B].hi]),color:c[2],dash:c[3],dots:true,label:c[1]})),
      xlog:true,xticks:Bs,xmin:Bs[0],xmax:Bs[Bs.length-1],ymin:0,ymax:Math.max(1.6,...cfg.filter(c=>X.ratio[c[0]]).flatMap(c=>Bs.map(B=>X.ratio[c[0]][B].hi)))*1.05,
      hline:{y:1,label:'no gain'},xlab:'concurrent users',ylab:'throughput relative to no draft',legend:true,aria:'speed-up against users'});
    document.getElementById('sd-xr-note').innerHTML='<span class="meas">measured here</span> '+D.facts.xNote;
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
