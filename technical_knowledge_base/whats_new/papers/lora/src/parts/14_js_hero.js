// ---- Hero: the paper's Figure 1 redrawn with GPT-3's numbers (d = 12,288, r = 4); static, nothing moves ----
(function(){const host=$('heroSvg');if(!host)return;
  function draw(W){const S=Math.max(110,Math.min(170,W*0.36)),gap=Math.max(36,Math.min(90,W-2*S-70)),cx=W/2;
    const yTop=74,yBot=yTop+S,xL=cx-gap/2-S,xR=cx+gap/2,mid=(yTop+yBot)/2,nw=10,ac='var(--acc)';
    let o='';
    // input x and output h
    o+=rc(xL,yBot+30,2*S+gap,9,'var(--mute)',{r:3,op:.55});
    o+=tx(cx,yBot+56,'x: one token, d = 12,288 numbers',{fs:12,a:'middle',c:'var(--mute)'});
    o+=rc(xL,18,2*S+gap,9,'var(--ink)',{r:3,op:.7});
    const sub0='<tspan dy="3" font-size="11">0</tspan><tspan dy="-3">';
    o+=tx(cx,11,'h = W'+sub0+'x + BAx</tspan>',{fs:13,a:'middle',w:600});
    // frozen path
    o+=ln2(xL+S/2,yBot+30,xL+S/2,yBot,'var(--mute)',{sw:1.6});
    o+=rc(xL,yTop,S,S,'var(--soft)',{s:'var(--line)',sw:1.4,r:4});
    o+=tx(xL+S/2,mid-12,'W'+sub0+' (d × d)</tspan>',{fs:13,a:'middle',w:600});
    o+=tx(xL+S/2,mid+6,'frozen',{fs:12,a:'middle',c:'var(--mute)'});
    o+=tx(xL+S/2,mid+22,'151M numbers',{fs:12,a:'middle',c:'var(--mute)'});
    // trainable path: A narrows d to r, B widens r back to d
    const wx=xR+S/2,aTop=mid+4,bBot=mid-4;
    o+=ln2(wx,yBot+30,wx,yBot,ac,{sw:1.6});
    o+='<path d="M'+xR+','+yBot+' L'+(xR+S)+','+yBot+' L'+(wx+nw/2)+','+aTop+' L'+(wx-nw/2)+','+aTop+' Z" fill="'+ac+'" fill-opacity=".18" stroke="'+ac+'" stroke-width="1.4"/>';
    o+='<path d="M'+(wx-nw/2)+','+bBot+' L'+(wx+nw/2)+','+bBot+' L'+(xR+S)+','+yTop+' L'+xR+','+yTop+' Z" fill="'+ac+'" fill-opacity=".18" stroke="'+ac+'" stroke-width="1.4"/>';
    const nar=S<150;o+=tx(wx,yBot-10,nar?'A: Gaussian':'A (r × d): Gaussian',{fs:12,a:'middle',c:ac,w:600});
    o+=tx(wx,yTop+18,nar?'B: zeros':'B (d × r): zeros',{fs:12,a:'middle',c:ac,w:600});
    o+=tx(wx+nw/2+6,mid+4,'r = 4',{fs:12,c:ac,w:600});
    // both paths summed
    const sy=yTop-26;
    o+=ln2(xL+S/2,yTop,xL+S/2,sy,'var(--mute)',{sw:1.6})+ln2(wx,yTop,wx,sy,ac,{sw:1.6});
    o+=ln2(xL+S/2,sy,cx-9,sy,'var(--mute)',{sw:1.6})+ln2(wx,sy,cx+9,sy,ac,{sw:1.6});
    o+='<circle cx="'+cx+'" cy="'+sy+'" r="9" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.4"/>'+tx(cx,sy+5,'+',{fs:15,a:'middle',w:600});
    o+=ln2(cx,sy-9,cx,27,'var(--ink)',{sw:1.6});
    host.innerHTML=svgW(W,yBot+66,o,'LoRA as in the paper\'s Figure 1: the input x goes through the frozen d by d matrix W0 and, in parallel, through A (d to r) and B (r back to d); the two outputs are added to give h')}
  fit(host,draw)})();
