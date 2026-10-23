// ---- Reading section 2: launch order and L2 reuse. 9 x 9 output tiles; the first nine computed in row-major or grouped (3 rows) order,
// and the A row panels and B column panels they need (each panel 9 blocks). Counts as in Triton's matmul tutorial: 90 against 54 ----
(function(){
  const el=document.getElementById('rd-l2svg');if(!el||!window.RD)return;
  let mode='row';const N=9;
  function first9(m){const r=[];if(m==='row'){for(let c=0;c<N;c++)r.push([0,c])}else{for(let c=0;c<3;c++)for(let i=0;i<3;i++)r.push([i,c])}return r}
  function draw(){
    const W=RD.width(el),cell=Math.max(9,Math.min(22,Math.floor((W-130)/(N+1.6)))),pad=cell*0.6;
    const tiles=first9(mode),rows=new Set(tiles.map(t=>t[0])),cols=new Set(tiles.map(t=>t[1]));
    const ax=2,ay=pad+cell+18,bx=ax+cell+pad,by=16,cx=bx,cy=ay;let s='';
    s+=RD.t(bx,11,'B: one column panel per output column',{fs:11,fill:'var(--mute)'});
    // B: a 1-cell-high strip of 9 column panels; A: a 1-cell-wide strip of 9 row panels
    for(let c=0;c<N;c++)s+='<rect x="'+(bx+c*cell)+'" y="'+by+'" width="'+(cell-1)+'" height="'+cell+'" rx="1" style="fill:'+(cols.has(c)?'var(--c1)':'var(--soft)')+';stroke:var(--line)"/>';
    for(let r=0;r<N;r++)s+='<rect x="'+ax+'" y="'+(ay+r*cell)+'" width="'+cell+'" height="'+(cell-1)+'" rx="1" style="fill:'+(rows.has(r)?'var(--c3)':'var(--soft)')+';stroke:var(--line)"/>';
    const on=new Set(tiles.map(t=>t[0]*N+t[1]));
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)s+='<rect x="'+(cx+c*cell)+'" y="'+(cy+r*cell)+'" width="'+(cell-1)+'" height="'+(cell-1)+'" rx="1" style="fill:'+(on.has(r*N+c)?'var(--acc)':'var(--soft)')+'"/>';
    const tx=cx+N*cell+10,tw=W-tx;
    if(tw>110){s+=RD.t(tx,cy+12,'C: 81 output tiles',{fs:11})+RD.t(tx,cy+28,'dark: first 9',{fs:11,fill:'var(--mute)'})+RD.t(tx,cy+44,'A panels: left',{fs:11,fill:'var(--mute)'})}
    const H=cy+N*cell+(tw>110?6:22);
    if(tw<=110)s+=RD.t(cx,H-6,'A row panels left, C tiles right; dark: first 9 computed',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Output tiles computed first and the A and B panels they load, under '+(mode==='row'?'row-major':'grouped')+' order');
    const a=rows.size*N,b=cols.size*N;
    document.getElementById('rd-l2cnt').innerHTML=RD.stat('A blocks loaded',a,rows.size+' row panel'+(rows.size>1?'s':'')+' x 9')+RD.stat('B blocks loaded',b,cols.size+' column panel'+(cols.size>1?'s':'')+' x 9')+RD.stat('Total for 9 output tiles',a+b,mode==='row'?'row-major':'grouped, 3 rows');
  }
  RD.seg(document.getElementById('rd-l2seg'),m=>{mode=m;draw()});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
