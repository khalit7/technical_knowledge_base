// ---- NaiveAI before/after: MiMo-V2.5's 48 layers (39 sliding-window, 9 full attention) against Naive-N0.5-Flash's (39 sliding-window, 9 DSA) ----
(function(){
  const box=$('nvLaySvg');if(!box)return;
  // eight six-layer modules: five SWA then one global; layer 1 of module 1 is also global (NaiveAI card). 1-based global positions:
  const G=new Set([1,6,12,18,24,30,36,42,48]);
  function strip(y,W,x0,lab,sub,gcol,glab,narrow){
    const n=48,cw=(W-x0-4)/n,h=narrow?22:26;let s='<text x="0" y="'+(y-6)+'" font-size="12" font-weight="600" fill="var(--ink)">'+lab+'</text><text x="'+(W)+'" y="'+(y-6)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+sub+'</text>';
    for(let i=1;i<=n;i++){const g=G.has(i);s+='<rect x="'+(x0+(i-1)*cw+.5).toFixed(1)+'" y="'+y+'" width="'+Math.max(1,cw-1).toFixed(1)+'" height="'+h+'" rx="1.5" fill="'+(g?gcol:'var(--dim)')+'"><title>layer '+i+': '+(g?glab:'sliding window, 128 tokens')+'</title></rect>'}
    return s;
  }
  function draw(){
    const W=Math.max(300,box.clientWidth||700),narrow=W<560,x0=0;let s='';
    s+=strip(20,W,x0,'MiMo-V2.5 (the base)','39 SWA + 9 full','var(--closed)','full attention: every past token',narrow);
    const y2=narrow?84:92;
    s+=strip(y2,W,x0,'Naive-N0.5-Flash','39 SWA + 9 DSA','var(--acc)','DSA: top 2,048 tokens',narrow);
    const h=narrow?22:26,cw=(W-x0-4)/48;
    // arrows from each replaced layer
    G.forEach(i=>{const x=x0+(i-.5)*cw;s+='<line x1="'+x.toFixed(1)+'" y1="'+(20+h+2)+'" x2="'+x.toFixed(1)+'" y2="'+(y2-16)+'" stroke="var(--mute)" stroke-width="1" stroke-dasharray="2 2"/>'});
    const yl=y2+h+16,items=[['var(--dim)','sliding window, 128 tokens'],['var(--closed)','full attention'],['var(--acc)','DSA, top 2,048 tokens']];
    let lx=0,ly=yl;items.forEach(([c,t])=>{const w=16+t.length*6.2;if(lx+w>W){lx=0;ly+=16}s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="'+c+'"/><text x="'+(lx+14)+'" y="'+ly+'" font-size="11" fill="var(--mute)">'+t+'</text>';lx+=w+10});
    const H=ly+8;
    box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="MiMo-V2.5 layer layout against Naive-N0.5-Flash: the nine full-attention layers become DeepSeek Sparse Attention">'+s+'</svg>';
  }
  let lw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==lw){lw=w;draw()}});onTab('t-read',draw);draw();
})();
