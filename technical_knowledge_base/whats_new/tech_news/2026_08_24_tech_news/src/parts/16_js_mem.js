// ---- Memory prices: the article's two tables as dumbbells on a log scale ----
(function(){
  const box=$('mmSvg');if(!box)return;
  const YOY=[['DDR5-4800 2x16GB',90,425],['DDR5-5200 2x16GB',100,480],['DDR5-5600 2x16GB',116,528],['DDR5-6000 2x16GB',108,572],['DDR5-5600 2x32GB',191,1118],['DDR5-6000 2x32GB',222,1272],
    ['DDR4-3200 2x8GB',63,163],['DDR4-3600 2x8GB',75,165],['DDR4-3200 2x16GB',105,281],['DDR4-3600 2x16GB',120,307],['DDR4-3200 2x32GB',222,614],['DDR4-3600 2x32GB',300,789]];
  const LOW=[['DDR5-5200 16GB',52,239],['DDR5-5600 16GB',199,214],['DDR5-5600 32GB',72,394],['DDR5-6000 16GB',197,239],['DDR5-6000 32GB',72,392],['DDR5-6000 48GB',144,689],['DDR5-6000 64GB',159,849],['DDR5-6000 96GB',189,1799],['DDR5-6400 128GB',329,3399],['DDR5-6600 32GB',158,637]];
  let mode='yoy';
  function draw(){
    const rows=mode==='yoy'?YOY:LOW,narrow=box.clientWidth<560;
    const W=narrow?Math.max(300,Math.round(box.clientWidth||340)):760,lw=narrow?120:140,rw=narrow?38:96,rh=22,top=8,H=top+rows.length*rh+24;
    const lo=40,hi=4000,X=v=>lw+(W-lw-rw)*(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo));
    let s='';const ttl='<div class="small mute" style="margin:2px 0 4px">'+(mode==='yoy'?'August 2025 average (hollow) to August 2026 average (filled), US$, log scale':'Lowest price ever tracked (hollow) to best US price in August 2026 (filled), US$, log scale')+'</div>';
    [50,100,200,500,1000,2000].forEach(t=>{const tl=narrow&&t>=1000?'$'+(t/1000)+'k':'$'+fmt(t);s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(top-4)+'" y2="'+(top+rows.length*rh)+'" stroke="var(--line)"/><text x="'+X(t)+'" y="'+(top+rows.length*rh+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+tl+'</text>'});
    rows.forEach((r,i)=>{const y=top+i*rh+rh/2,[n,a,b]=r,isB=n==='DDR5-6400 128GB',d4=n.startsWith('DDR4');const c=d4?'var(--c6)':'var(--c5)';
      if(mode==='yoy'&&i===6)s+='<line x1="8" x2="'+(W-8)+'" y1="'+(y-rh/2)+'" y2="'+(y-rh/2)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
      s+='<text x="'+(lw-8)+'" y="'+(y+4)+'" font-size="'+(narrow?11:12)+'" text-anchor="end"'+(isB?' font-weight="700"':'')+'>'+n+'</text>';
      s+='<line x1="'+X(a)+'" x2="'+X(b)+'" y1="'+y+'" y2="'+y+'" stroke="'+c+'" stroke-width="3"/><circle cx="'+X(a)+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="'+c+'" stroke-width="2"><title>$'+fmt(a)+'</title></circle><circle cx="'+X(b)+'" cy="'+y+'" r="5" fill="'+c+'"><title>$'+fmt(b)+'</title></circle>';
      const p=Math.round(100*(b-a)/a),m=b/a;
      s+='<text x="'+(W-4)+'" y="'+(y+4)+'" font-size="'+(narrow?11:12)+'" text-anchor="end"'+(isB?' font-weight="700"':'')+'>'+(narrow?m.toFixed(1)+'x':'+'+fmt(p)+'% (x'+m.toFixed(1)+')')+'</text>'});
    box.innerHTML=ttl+svgEl(W,H,s,'Memory kit prices');
    $('mmNote').innerHTML=mode==='yoy'?'<div class="t">The "500%" is this table</div>Year-over-year increases run from +120% (DDR4) to +485% (a 64GB DDR5-5600 kit, $191 to $1,118); "nearly 500%" is the top of the DDR5 rows. There is no 128GB kit in this table, so the article gives no year-ago price for the $3,399 kit. If one applied +500% to it anyway, the year-ago price would be $3,399 / (1 + 5) = $566: a number the source never states, shown here only as that hypothetical.'
      :'<div class="t">The "$3,399" is this table</div>Best price now against the lowest price ever tracked, which is not a year ago. The 128GB DDR5-6400 kit: $3,399 against $329, x10.3 (+933%), the headline\'s "up to 10x". A 16GB DDR5-5600 kit barely moved ($199 to $214), so "10x" is the extreme row, not the typical one. The two headline numbers come from two different comparisons.';
  }
  const seg=$('mmV');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});mode=b.dataset.m;draw()}));
  let rw=box.clientWidth;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);draw();
})();

// ---- Image tokens per request (DeepSeek vision limits, August against October) ----
(function(){
  const el=$('itOut');if(!el)return;
  const DOC={aug:{cap:384,px:'about 800 x 800 pixels',max:600,m:'deepseek-v4-flash-vision-exp'},oct:{cap:1024,px:'about 1300 x 1300 pixels',max:600,m:'deepseek-flash (the exp name is retired and served by it)'}};
  let d='aug';
  function draw(){const n=+$('itN').value,D=DOC[d],t=n*D.cap;$('itNv').textContent=fmt(n);
    el.innerHTML=stat('Image tokens, at most',fmt(t),fmt(n)+' x '+fmt(D.cap))+stat('Cap per image',fmt(D.cap)+' tokens','large images resized to '+D.px)+stat('Model',D.m,'max '+D.max+' images per request')+
      stat('Same request under the other docs',fmt(n*DOC[d==='aug'?'oct':'aug'].cap),d==='aug'?'2.7x more image tokens per image now':'2.7x fewer in August')}
  $('itN').addEventListener('input',draw);
  const seg=$('itDoc');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));d=b.dataset.m;draw()}));
  draw();
})();
