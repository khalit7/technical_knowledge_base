// ---- Reading, section 5: an A/B test (explore, then commit) against Thompson sampling on the same two variants and the same
// visitors (before/after on one input). Static: 1,000 runs precomputed by src/make_data.mjs (BXD.ab). ----
(function(){
  const D=window.BXD,$=id=>document.getElementById(id);if(!D||!$('ab-S'))return;const A=D.ab,nb=A.n/A.block;
  const xs=[];for(let j=0;j<nb;j++)xs.push((j+1)*A.block);
  const xt=[[0,'0'],[4000,'4,000'],[10000,'10,000'],[20000,'20,000']];
  function mark(X,Yf,y0,y1){return '<line x1="'+X(2*A.m)+'" x2="'+X(2*A.m)+'" y1="'+y0+'" y2="'+y1+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".6"/>'+RD.t(X(2*A.m)+4,(y0+y1)/2,'test ends',{fs:10.5,fill:'var(--mute)'})}
  function draw(){
    RD.chart($('ab-S'),[{col:'var(--c2)',w:2.4,xs:xs.map(v=>v-A.block/2),ys:A.shareE},{col:'var(--c4)',w:2.4,xs:xs.map(v=>v-A.block/2),ys:A.shareT}],
      {x0:0,x1:A.n,y0:0,y1:0.55,xt,yt:[[0,'0%'],[0.25,'25%'],[0.5,'50%']],xlab:'visitors',ylab:'share sent to the worse variant',H:220,label:'Traffic to the worse variant',
       extra:(X,Yf)=>mark(X,Yf,30,190)+RD.t(X(2*A.m)-6,Yf(0.5)+14,'A/B: 50%',{a:'end',fs:10.5,fill:'var(--c2)',w:600})+RD.t(X(A.n*0.55),Yf(A.shareT[Math.floor(nb*0.55)])-8,'Thompson',{fs:10.5,fill:'var(--c4)',w:600})});
    const ymax=Math.ceil(Math.max(A.regE.at(-1),A.regT.at(-1))/10)*10+5;
    RD.chart($('ab-R'),[{col:'var(--c2)',w:2.4,xs:[0].concat(xs),ys:[0].concat(A.regE)},{col:'var(--c4)',w:2.4,xs:[0].concat(xs),ys:[0].concat(A.regT)}],
      {x0:0,x1:A.n,y0:0,y1:ymax,xt,yt:[[0,'0'],[20,'20'],[40,'40']],xlab:'visitors',ylab:'conversions lost (regret)',H:220,label:'Conversions lost',
       extra:(X,Yf,W)=>mark(X,Yf,30,190)+RD.t(W-12,Yf(A.regE.at(-1))-5,'A/B '+RD.n(A.regE.at(-1),0),{a:'end',fs:11,fill:'var(--c2)',w:600})+RD.t(W-12,Yf(A.regT.at(-1))+14,'Thompson '+RD.n(A.regT.at(-1),0),{a:'end',fs:11,fill:'var(--c4)',w:600})});
    $('ab-N').innerHTML=RD.stat('Conversions lost, A/B',RD.n(A.regE.at(-1),0),RD.n(A.m*Math.abs(A.p[1]-A.p[0]),0)+' during the test; exact '+RD.n(A.regEExact,1))+
      RD.stat('Conversions lost, Thompson',RD.n(A.regT.at(-1),0),'same visitors, '+A.runs.toLocaleString('en-GB')+' runs')+
      RD.stat('A/B picks the worse variant',RD.pct(A.pWrongExact,2),'exact (two binomials); simulated '+RD.pct(A.wrong,1))+
      RD.stat('Worse variant\'s visitors at 4,000',A.m.toLocaleString('en-GB')+' vs '+A.worseT_at2m,'A/B vs Thompson')+
      RD.stat('95% interval on the difference at 4,000','±'+RD.n(A.hwE,1)+' vs ±'+RD.n(A.hwT_at2m,1)+' pts','A/B vs Thompson')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
