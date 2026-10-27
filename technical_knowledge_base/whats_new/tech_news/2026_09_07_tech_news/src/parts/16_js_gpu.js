// ---- OpenAI's GPU reallocation after Aug 7: shares derived from the three published figures ----
(function(){
  const box=$('gpuSvg');if(!box)return;
  const cut=0.592,rise=0.172,off=0.85,ratio=off*cut/rise,a=100/(1+ratio),o=100-a; // derived: 25.5 and 74.5
  let mode='imp';
  function draw(){
    const cw=box.clientWidth||360,W=Math.max(300,Math.round(cw)),narrow=W<560,lw=narrow?0:128,pr=8,bh=26,gap=narrow?50:34,top=narrow?20:8;
    const rows=mode==='imp'?[{l:'Week before',a:a,o:o},{l:'Week after',a:a*(1-cut),o:o*(1+rise)}]:[{l:'Week before',a:a,o:o},{l:'Headline reading',a:a*(1-cut),o:o*(1-cut),naive:1}];
    const X=v=>lw+(W-lw-pr)*v/116;let s='';
    for(let t=0;t<=100;t+=25)s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(top-4)+'" y2="'+(top+rows.length*(bh+gap)-gap+6)+'" stroke="var(--line)"/><text x="'+X(t)+'" y="'+(top+rows.length*(bh+gap)-gap+20)+'" font-size="11" text-anchor="'+(t===0&&narrow?'start':'middle')+'" fill="var(--mute)">'+t+'</text>';
    rows.forEach((r,k)=>{const y=top+k*(bh+gap);
      if(narrow)s+='<text x="0" y="'+(y-6)+'" font-size="12" font-weight="600">'+r.l+'</text>';else s+='<text x="'+(lw-8)+'" y="'+(y+bh/2+4)+'" font-size="12" text-anchor="end">'+r.l+'</text>';
      s+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(r.a)-X(0))+'" height="'+bh+'" fill="var(--c2)"/><rect x="'+X(r.a)+'" y="'+y+'" width="'+(X(r.a+r.o)-X(r.a))+'" height="'+bh+'" fill="var(--c1)" opacity=".75"/>';
      const ta=r.a.toFixed(1),to=r.o.toFixed(1);
      if(X(r.a)-X(0)>34)s+='<text x="'+(X(0)+4)+'" y="'+(y+bh/2+4)+'" font-size="11" fill="var(--bg)">'+ta+'</text>';
      s+='<text x="'+(X(r.a)+4)+'" y="'+(y+bh/2+4)+'" font-size="11" fill="var(--bg)">'+to+'</text>';
      const tot=(r.a+r.o).toFixed(1),tx=X(r.a+r.o)+4,fits=tx+60<W-pr;
      s+='<text x="'+(fits?tx:X(r.a+r.o)-4)+'" y="'+(fits?y+bh/2+4:y-6)+'" font-size="11" text-anchor="'+(fits?'start':'end')+'" font-weight="600">= '+tot+'</text>'});
    const H=top+rows.length*(bh+gap)-gap+26;
    box.innerHTML='<div class="small mute" style="margin:0 0 4px">GPU allocation, as a share of the week before (= 100)</div>'+svgEl(W,H,s,'GPU allocation before and after')+'<div class="lgd"><span><i style="background:var(--c2)"></i>Astra-class models</span><span><i style="background:var(--c1);opacity:.75"></i>other model classes</span></div>';
    $('gpuStats').innerHTML=mode==='imp'?stat('Astra-class share before',a.toFixed(1)+'%','derived from the three figures')+stat('Total after','−'+(100-a*(1-cut)-o*(1+rise)).toFixed(1)+'%','the cut mostly moved compute to other models')+stat('Astra-class after',(a*(1-cut)).toFixed(1)+' of 100','down from '+a.toFixed(1)):
      stat('If 59.2% of all compute had gone','40.8 of 100 left','a reading the figures rule out')+stat('Why it is wrong','others rose 17.2%','the cut applied to Astra-class work only')+stat('What the figures imply','97.7 of 100','switch back to see the split');
  }
  segBind('gpuM',m=>{mode=m;$('gpuM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));draw()});
  let rw=box.clientWidth;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);draw();
})();
