// Reading section 5, NSA: a static annotated diagram of the three branches (compressed, selected, sliding) and their gates.
// Illustrative sizes (8 blocks; NSA's real l = 32, d = 16, l' = 64, n = 16, w = 512 are stated in the text and on the figure).
(function(){
  const el=document.getElementById('av-nsa');if(!el||!window.RD)return;
  function draw(){
    const W=RD.width(el),nar=W<560,nt=nar?32:64,B=nt/8,sel=[0,3,6,7],w=nar?6:12,score=[.5,.2,.3,.9,.25,.35,.6,.7];
    const x0=nar?2:150,gx=W-(nar?78:170),sw=gx-x0-12,cw=sw/nt,X=t=>x0+t*cw;
    let s='';const rows=[['Cached tokens','every token kept'],['Compressed','1 summary per block'],['Selected','top blocks, whole'],['Sliding window','last w tokens']];
    const Y=nar?[30,82,134,186]:[22,70,118,166],h=16;
    rows.forEach(([a,b],i)=>{s+=nar?RD.t(2,Y[i]-6,a+': '+b,{w:600}):RD.t(2,Y[i]+8,a,{w:600})+RD.t(2,Y[i]+21,b,{fill:'var(--mute)'})});
    // cached tokens with block ticks and the query
    for(let t=0;t<nt;t++)s+='<rect x="'+X(t).toFixed(1)+'" y="'+Y[0]+'" width="'+Math.max(1,cw-1).toFixed(1)+'" height="'+h+'" fill="var(--dim)"/>';
    for(let b=0;b<=8;b++)s+='<line x1="'+X(b*B).toFixed(1)+'" x2="'+X(b*B).toFixed(1)+'" y1="'+(Y[0]-4)+'" y2="'+(Y[0]+h+3)+'" stroke="var(--mute)"/>';
    s+='<rect x="'+(X(nt)+3).toFixed(1)+'" y="'+Y[0]+'" width="'+Math.max(6,cw)+'" height="'+h+'" fill="none" stroke="var(--ink)" stroke-width="1.5"/>'+(nar?'':RD.t(X(nt)+3,Y[0]-5,'query',{fill:'var(--mute)'}));
    if(!nar)s+=RD.t(x0,Y[0]-6,'blocks ('+B+' tokens here)',{fill:'var(--mute)'});
    // compressed: one summary per block, score bars
    for(let b=0;b<8;b++){const x=X(b*B)+1,wd=B*cw-2,sh=Math.round(h*score[b]);
      s+='<rect x="'+x.toFixed(1)+'" y="'+Y[1]+'" width="'+wd.toFixed(1)+'" height="'+h+'" rx="2" fill="var(--soft)" stroke="var(--acc)"/>'+
        '<rect x="'+(x+2).toFixed(1)+'" y="'+(Y[1]+h-sh)+'" width="'+Math.max(2,wd-4).toFixed(1)+'" height="'+sh+'" fill="var(--c3)" opacity=".75"/>'}
    if(!nar)s+=RD.t(x0,Y[1]+h+12,'bar: the query\'s score for each summary, reused to pick blocks',{fill:'var(--mute)'});
    // selected blocks
    for(let t=0;t<nt;t++){const on=sel.includes(Math.floor(t/B));s+=on?'<rect x="'+X(t).toFixed(1)+'" y="'+Y[2]+'" width="'+Math.max(1,cw-1).toFixed(1)+'" height="'+h+'" fill="var(--acc)"/>':''}
    for(let b=0;b<8;b++)if(!sel.includes(b))s+='<rect x="'+(X(b*B)+1).toFixed(1)+'" y="'+(Y[2]+.5)+'" width="'+(B*cw-2).toFixed(1)+'" height="'+(h-1)+'" rx="2" fill="none" stroke="var(--mute)" stroke-dasharray="2 2"/>';
    if(!nar)s+=RD.t(X(0),Y[2]+h+12,'always the first block and the 2 local blocks, plus the top scores',{fill:'var(--mute)'});
    // window
    for(let t=nt-w;t<nt;t++)s+='<rect x="'+X(t).toFixed(1)+'" y="'+Y[3]+'" width="'+Math.max(1,cw-1).toFixed(1)+'" height="'+h+'" fill="var(--acc)"/>';
    s+='<rect x="'+X(0).toFixed(1)+'" y="'+(Y[3]+.5)+'" width="'+(X(nt-w)-X(0)-2).toFixed(1)+'" height="'+(h-1)+'" rx="2" fill="none" stroke="var(--mute)" stroke-dasharray="2 2"/>';
    // gates and sum
    const gw=nar?52:96,gxx=gx+(nar?20:44);
    [['× g cmp',1],['× g slc',2],['× g win',3]].forEach(([lab,i])=>{s+=RD.t(gx+2,Y[i]+12,'→',{fill:'var(--mute)'})+'<rect x="'+gxx+'" y="'+(Y[i]-2)+'" width="'+gw+'" height="'+(h+4)+'" rx="4" class="boxa"/>'+RD.t(gxx+gw/2,Y[i]+12,nar?lab.replace(' cmp','c').replace(' slc','s').replace(' win','w'):'Attn '+lab,{a:'middle'})});
    const sy=Y[3]+h+30;s+='<rect x="'+gxx+'" y="'+(sy-12)+'" width="'+gw+'" height="22" rx="4" class="box"/>'+RD.t(gxx+gw/2,sy+3,'sum = oₜ',{a:'middle',w:600});
    s+='<line x1="'+(gxx+gw/2)+'" x2="'+(gxx+gw/2)+'" y1="'+(Y[3]+h+2)+'" y2="'+(sy-13)+'" stroke="var(--mute)"/>';
    s+=RD.t(x0,sy+3,nar?'g: sigmoid gates from the query':'gates in [0, 1], from an MLP and a sigmoid on the query token',{fill:'var(--mute)'});
    s+=RD.t(x0,sy+20,nar?'NSA: l 32, l′ 64, n 16, w 512':'NSA itself: summaries of 32 tokens (stride 16), 16 blocks of 64, window 512',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,sy+28,s,'Native Sparse Attention: compressed, selected and sliding-window branches combined by gates');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
