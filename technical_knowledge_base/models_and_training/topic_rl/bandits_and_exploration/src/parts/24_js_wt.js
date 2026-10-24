// ---- Reading, section 2: the weight each of the last 20 rewards gets, sample average (1/n) against a constant step alpha (one slider) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('wt-P'))return;const n=20;
  function draw(){const a=+$('wt-a').value;$('wt-av').textContent=RD.n(a,2);
    const el=$('wt-P'),W=RD.width(el),H=200,l=36,r=8,t=14,b=34,cols=n+1,cw=(W-l-r)/cols,ymax=Math.max(0.12,a*1.08);
    const Y=v=>t+(H-t-b)*(1-Math.min(v,ymax)/ymax);let s='';
    const ticks=ymax>0.3?[0,0.2,0.4]:ymax>0.15?[0,0.1,0.2]:[0,0.05,0.1];
    ticks.forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,RD.n(v,2),{a:'end',fs:10,fill:'var(--mute)'})});
    for(let j=0;j<cols;j++){const x=l+j*cw,isQ=j===0,i=j;// j = 0 is Q1; j = 1..20 are rewards R_1..R_20
      const wa=isQ?Math.pow(1-a,n):a*Math.pow(1-a,n-i),ws=isQ?0:1/n,bw=Math.max(2,cw*0.38);
      s+='<rect x="'+(x+cw*0.1)+'" y="'+Y(ws)+'" width="'+bw+'" height="'+(Y(0)-Y(ws))+'" fill="var(--c1)" opacity=".55"/>';
      s+='<rect x="'+(x+cw*0.1+bw)+'" y="'+Y(wa)+'" width="'+bw+'" height="'+(Y(0)-Y(wa))+'" fill="var(--c2)"/>'}
    s+=RD.t(l+cw*0.5,H-b+14,'Q₁',{a:'middle',fs:10.5});s+=RD.t(l+cw*1.5,H-b+14,'R₁',{a:'middle',fs:10.5});s+=RD.t(W-r-cw*0.5,H-b+14,'R₂₀',{a:'middle',fs:10.5});
    s+=RD.t((l+W-r)/2,H-4,'oldest reward → newest (n = 20)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Weight of each reward in the estimate');
    const q1=Math.pow(1-a,n);
    $('wt-N').innerHTML=RD.stat('Newest reward R₂₀',RD.n(a,3),'sample average: 0.050')+RD.stat('Oldest reward R₁',RD.n(a*Math.pow(1-a,n-1),3),'sample average: 0.050')+RD.stat('Initial guess Q₁',RD.n(q1,3),'sample average: 0 after one pull')+RD.stat('Mean age of the weight',RD.n((1-a)/a,1)+' rewards','(1 − α)/α, unrolled to infinity')}
  $('wt-a').addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
