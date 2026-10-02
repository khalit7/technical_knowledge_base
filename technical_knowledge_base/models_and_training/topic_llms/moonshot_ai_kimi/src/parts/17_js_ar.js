// ---- Attention Residuals across K3's depth ----
(function(){
  const card=$('arx');if(!card)return;
  const L=93,BS=12,D=7168;let mode='block';
  function sources(l){ // for the attention sublayer of decoder layer l (1-based); each decoder layer has 2 sublayers
    if(mode==='std'||mode==='full'){const n=1+2*(l-1);const names=['embedding'];for(let i=1;i<l;i++){names.push('L'+i+' attn','L'+i+' MLP')}return names.map((nm,i)=>({nm,w:mode==='std'?1:1/n}))}
    const nb=Math.ceil(l/BS),i=l-BS*(nb-1);const src=['embedding'];for(let j=1;j<nb;j++)src.push('block '+j);if(i>=2)src.push('block '+nb+' so far');
    if(mode==='block')return src.map(nm=>({nm,w:1/src.length}));
    const r=mulberry32(1000+l);const lg=src.map((nm,j)=>(j===0?1.2:0)+(j===src.length-1?1.6:0)+(r()*2-1)*0.9);const mx=Math.max(...lg),ex=lg.map(x=>Math.exp(x-mx)),Z=ex.reduce((p,c)=>p+c,0);return src.map((nm,j)=>({nm,w:ex[j]/Z}))}
  function draw(){
    const l=+$('arLay').value;$('arL').textContent=l+' of 93 (block '+Math.ceil(l/BS)+')';
    const src=sources(l),W=Math.max(300,Math.min(760,card.clientWidth-28)),H=156,pl=36,pr=10,pt=6,pb=34;
    const n=src.length,bw=(W-pl-pr)/n,ymax=mode==='std'?1.2:Math.max(...src.map(s=>s.w))*1.25;
    const Y=v=>pt+(H-pt-pb)*(1-v/ymax);
    let s='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>';
    s+='<text x="'+(pl-4)+'" y="'+(Y(ymax/1.25)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(mode==='std'?'1':(ymax/1.25).toFixed(3))+'</text>';
    src.forEach((x,i)=>{const X=pl+i*bw;s+='<rect x="'+(X+(bw>4?1:0)).toFixed(1)+'" y="'+Y(x.w).toFixed(1)+'" width="'+Math.max(0.8,bw-(bw>4?2:0)).toFixed(1)+'" height="'+(Y(0)-Y(x.w)).toFixed(1)+'" fill="'+(i===0?'var(--c5)':'var(--acc)')+'"><title>'+x.nm+': '+x.w.toFixed(3)+'</title></rect>';
      if(n<=12)s+='<text x="'+(X+bw/2)+'" y="'+(H-pb+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+x.nm.replace(' so far','*')+'</text>'});
    // captions in HTML, so they wrap at phone width instead of running past the chart
    $('arSvg').innerHTML='<p class="q" style="margin:4px 0 0">Weight on each source feeding layer '+l+'\'s attention sublayer'+(mode==='trained'?' (illustrative)':'')+(mode==='block'||mode==='trained'?'; * = partial sum of the current block':'')+'</p>'+svgEl(W,H,s,'Attention Residuals source weights')+(n>12?'<p class="q" style="margin:0">Embedding (gold), then '+(n-1)+' sublayer outputs in order.</p>':'');
    const kept=mode==='std'?1:mode==='full'?n:n,bytes=kept*D*2;
    $('arOut').innerHTML=stat('Sources',fmt(n),mode==='std'?'each with weight 1: the sum grows with depth':'weights sum to 1')+stat('Vectors kept per token',fmt(kept),mode==='std'?'one running sum':mode==='full'?'every earlier sublayer output':'block summaries (at most 8 + embedding) and the partial sum')+stat('Memory per token, BF16',fmtBytes(bytes),fmt(kept)+' × 7,168 × 2 bytes')+stat('Parameters it adds',mode==='std'?'none':'2 × 7,168 per sublayer',mode==='std'?'the plain sum has no parameters':'a pseudo-query vector and its RMSNorm gain (K3 checkpoint)');
  }
  $('arLay').addEventListener('input',draw);segBind('arM',m=>{mode=m;draw()});
  addEventListener('resize',draw);onTab('t-read',draw);draw();
})();
