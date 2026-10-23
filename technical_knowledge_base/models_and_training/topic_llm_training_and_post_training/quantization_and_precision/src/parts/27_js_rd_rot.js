// ---- Reading, outliers: one real token before and after a 64 x 64 Hadamard rotation, with its 4-bit per-token grid (toggle-compare) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-rt'))return;
  const R=window.QV.rot(),S=window.QD.slice;let mode='plain',tk=12;
  const top=S.chans.map(c=>S.top.indexOf(c)>=0);
  const A=R.plain.xmax*1.05;
  function draw(){
    const r=R[mode],x=r.X[tk],q=r.X4[tk],W=RD.width($('rd-rtP')),Ht=W<520?170:200,pl=34,pr=4,pt=8,pb=16,iw=W-pl-pr,ih=Ht-pt-pb,bw=iw/64;
    const y=v=>pt+ih/2-(v/A)*(ih/2);let s='';
    let am=0;for(const v of x)am=Math.max(am,Math.abs(v));const sc=am/7;
    for(let k=-7;k<=7;k++){const t=k*sc;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t).toFixed(1)+'" y2="'+y(t).toFixed(1)+'" stroke="'+(k===0?'var(--mute)':'var(--c4)')+'" stroke-opacity="'+(k===0?1:.35)+'"/>'}
    [20,10,-10,-20].forEach(t=>{if(Math.abs(t)<=A)s+=RD.t(pl-4,y(t)+4,String(t).replace('-','−'),{a:'end',fs:10.5,fill:'var(--mute)'})});
    for(let c=0;c<64;c++){const xx=pl+c*bw,v=x[c],z=q[c]===0&&v!==0;
      s+='<rect x="'+(xx+bw*0.12).toFixed(1)+'" y="'+Math.min(y(0),y(v)).toFixed(1)+'" width="'+(bw*0.76).toFixed(1)+'" height="'+Math.max(0.8,Math.abs(y(v)-y(0))).toFixed(1)+'" fill="'+(mode==='plain'&&top[c]?'var(--c5)':'var(--c1)')+'"/>';
      if(z)s+='<circle cx="'+(xx+bw/2).toFixed(1)+'" cy="'+y(0).toFixed(1)+'" r="'+Math.max(1.6,Math.min(3,bw*0.3)).toFixed(1)+'" fill="var(--bad)"/>'}
    s+=RD.t(pl,Ht-3,mode==='plain'?'64 input channels':'64 rotated channels',{fs:10.5,fill:'var(--mute)'});
    $('rd-rtP').innerHTML=RD.svg(W,Ht,s,'One token\'s 64 activation values and its 4-bit grid');
    const zc=q.filter((v,i)=>v===0&&x[i]!==0).length;
    $('rd-rtN').innerHTML=RD.stat('This token: largest value',am.toFixed(1),'4-bit step '+sc.toFixed(2)+', '+zc+' of 64 rounded to 0')+
      RD.stat('All 16 tokens: largest over median channel peak',r.ratio.toFixed(1)+'×',r.xmax.toFixed(1)+' against '+r.med.toFixed(2))+
      RD.stat('Output error, activations in 4 bits',(100*r.a4).toFixed(1)+'%','per token; weights exact. Other mode: '+(100*R[mode==='plain'?'hadamard':'plain'].a4).toFixed(1)+'%')+
      (mode==='plain'?RD.stat('XWᵀ','not rotated','switch modes to rotate X and W'):RD.stat('XWᵀ after rotating both','unchanged','largest difference '+r.prodDiff.toExponential(1)));
    $('rd-rtTv').textContent='"'+S.tokens[tk].trim()+'" (token '+(tk+1)+')';
  }
  RD.seg($('rd-rtM'),m=>{mode=m;draw()});
  $('rd-rtTk').addEventListener('input',e=>{tk=+e.target.value;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
