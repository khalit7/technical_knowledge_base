// ---- Tokens against spend on Vercel's gateway; Harvey's margin arithmetic ----
(function(){
  const card=$('v-share');if(!card)return;
  const OT=56,OS=14,AN=64,SER=[['Dec 2025',7],['Apr 2026',13],['Aug 2026',56]];
  const ratio=((100-OS)/(100-OT))/(OS/OT);
  function draw(){
    const box=$('shSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<600;
    const bw=narrow?W-4:Math.round(W*0.62),pl=2,bh=26;let s='';
    const X=v=>pl+bw*v/100;
    const bar=(y,lab,segs)=>{s+='<text x="'+pl+'" y="'+(y-6)+'" font-size="12" font-weight="600">'+lab+'</text>';let a=0;
      segs.forEach(g=>{s+='<rect x="'+X(a)+'" y="'+y+'" width="'+(X(a+g[0])-X(a))+'" height="'+bh+'" fill="'+g[1]+'" opacity="'+(g[3]||.85)+'"/>';
        const w=X(a+g[0])-X(a),t=g[2]+' '+g[0]+'%';if(w>t.length*6.3+8)s+='<text x="'+(X(a)+6)+'" y="'+(y+17)+'" font-size="11.5" fill="#fff">'+t+'</text>';
        else s+='<text x="'+(X(a)+w/2)+'" y="'+(y+bh+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+g[0]+'%</text>';a+=g[0]});};
    bar(22,'Share of tokens, August',[[OT,'var(--open)','open-weight'],[100-OT,'var(--closed)','closed']]);
    bar(88,'Share of spend, August',[[OS,'var(--open)','open'],[AN,'var(--closed)','Anthropic'],[100-OS-AN,'var(--closed)','other closed',.55]]);
    let H=88+bh+22;
    // open-weight token share over time
    const x0=narrow?2:bw+40,y0=narrow?H+26:22,cw=narrow?W-40:W-x0-14,ch=narrow?110:100;
    s+='<text x="'+x0+'" y="'+(y0-6)+'" font-size="12" font-weight="600">Open-weight share of tokens</text>';
    const px=i=>x0+30+(cw-60)*i/(SER.length-1),py=v=>y0+10+ch*(1-v/60);
    [0,20,40,60].forEach(v=>{s+='<line x1="'+x0+'" x2="'+(x0+cw)+'" y1="'+py(v)+'" y2="'+py(v)+'" stroke="var(--line)"/>'});
    s+='<path d="'+SER.map((p,i)=>(i?'L':'M')+px(i)+','+py(p[1])).join('')+'" fill="none" stroke="var(--open)" stroke-width="2.5"/>';
    SER.forEach((p,i)=>{s+='<circle cx="'+px(i)+'" cy="'+py(p[1])+'" r="4.5" fill="var(--open)"/><text x="'+px(i)+'" y="'+(py(p[1])-9)+'" font-size="11.5" text-anchor="middle">'+p[1]+'%</text><text x="'+px(i)+'" y="'+(y0+ch+28)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+p[0]+'</text>'});
    H=Math.max(H,y0+ch+34);
    box.innerHTML=svgEl(W,H,s,'Open-weight share of tokens and of spend');
    box.insertAdjacentHTML('beforeend','<div class="out">'+stat('Closed token against open token',ratio.toFixed(1)+'x','average price, derived: (86/44) / (14/56)')+stat('Anthropic',AN+'% of spend','Claude Opus 5 alone 22.5%')+'</div>');
  }
  function margin(){
    const r=+$('shR').value;$('shRV').textContent=(r*100).toFixed(1)+'% ('+(1/r).toFixed(1)+'x cheaper)';
    const m=1-1.5*r;
    $('shOut').innerHTML=stat('Before the agent workload','+50%','$0.50 to serve each revenue dollar')+stat('June, tokens up 20x','−50%','$1.50 per revenue dollar (3x)')+stat('Same workload on the replacement',(m>=0?'+':'−')+Math.abs(Math.round(m*100))+'%','1 − 1.5 × '+r.toFixed(3)+(r>=1/1.5?': still under water':''))+stat('Break-even price','67% of the old','1 / 1.5: anything cheaper turns positive');
  }
  $('shR').addEventListener('input',margin);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();margin()});
})();
