// ---- Reading, section 3: Rule #37's staircase of gaps, training to holdout to next-day to live, then the proxy gap to the product goal (static, schematic) ----
(function(){
  const el=document.getElementById('rd-gaps');if(!el)return;
  // schematic heights only: the page claims no sizes, only where each gap sits and what it means
  const S=[['Training','data',1.0],['Holdout','data',0.86],['Next-day','data',0.76],['Live','traffic',0.62],['Product','goal',0.5]];
  const G=['1','2','3','4'];
  function draw(){const W=Math.max(280,Math.min(860,RD.width(el))),n=S.length,gap=W<480?14:26,bw=(W-gap*(n-1))/n,H=W<480?150:170,top=22,base=H-34;let b='';
    S.forEach((s,i)=>{const x=i*(bw+gap),h=(base-top)*s[2],y=base-h,last=i===n-1;
      b+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+h+'" rx="4" fill="'+(last?'var(--soft)':'var(--acc2)')+'" stroke="'+(last?'var(--c5)':'var(--acc)')+'" stroke-width="1.4"'+(last?' stroke-dasharray="4 3"':'')+'/>';
      b+=RD.t(x+bw/2,base+14,s[0],{fs:11,a:'middle',w:600})+RD.t(x+bw/2,base+27,s[1],{fs:10.5,a:'middle',fill:'var(--mute)'});
      if(i){const px=x-gap/2,py=y-12;b+='<circle cx="'+px+'" cy="'+py+'" r="8" fill="'+(i===3?'var(--bad)':i===4?'var(--c5)':'var(--acc)')+'"/>'+RD.t(px,py+3.5,G[i-1],{fs:10.5,a:'middle',fill:'var(--bg)',w:600})}});
    b+=RD.t(0,12,'metric measured on each set (schematic heights)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Four gaps between a model\'s score on training data, holdout data, next-day data, live traffic and the product goal')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
