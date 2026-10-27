// ---- Hero: the paper's Figure 1 redrawn as two panels (train: pick the pair; test: a classifier written in words); static, schematic ----
(function(){const host=$('heroSvg');if(!host)return;
  const sb=(v,f)=>'<tspan dy="3" font-size="11">'+v+'</tspan><tspan dy="-3">'+(f||'')+'</tspan>';
  const IMC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  function train(x0,y0,pw){// N x N similarity grid, N = 4
    const n=4,c=Math.min(38,(pw-70)/n),gx=x0+44,gy=y0+56;let o='';
    o+=tx(x0,y0+12,'1. Training: pick the pair',{fs:13,w:600});
    o+=tx(gx+n*c/2,y0+34,'text encoder: captions T'+sb('j'),{fs:11,a:'middle',c:'var(--mute)'});
    for(let j=0;j<n;j++)o+=tx(gx+j*c+c/2,gy-6,'T'+sb(j+1),{fs:12,a:'middle'});
    for(let i=0;i<n;i++){o+=rc(x0,gy+i*c+c/2-9,18,18,IMC[i],{r:3,op:.85})+tx(x0+24,gy+i*c+c/2+4,'I'+sb(i+1),{fs:12});
      for(let j=0;j<n;j++){const d=i===j;o+=rc(gx+j*c+1,gy+i*c+1,c-2,c-2,d?'var(--acc)':'var(--soft)',{s:'var(--line)',op:d?.85:1,r:3});
        o+=tx(gx+j*c+c/2,gy+i*c+c/2+4,'I'+sb(i+1,'·T')+sb(j+1),{fs:11,a:'middle',c:d?'var(--bg)':'var(--mute)'})}}
    const yb=gy+n*c+18;
    o+=tx(x0,yb,'image encoder: images I'+sb('i'),{fs:11,c:'var(--mute)'});
    return {o,h:yb-y0+6}}
  function test(x0,y0,pw){const cls=['dog','cat','plane'],L=[.9,.45,.2];let o='';
    o+=tx(x0,y0+12,'2. Test: a classifier written in words',{fs:13,w:600});
    const ty=y0+34,rh=26,lw=Math.min(150,pw*.5);
    cls.forEach((k,i)=>{const y=ty+i*rh;o+=tx(x0,y+14,'"a photo of a '+k+'."',{fs:12,c:i?'var(--ink)':'var(--acc)',w:i?400:600});
      o+=rc(x0+lw,y+3,20,16,'var(--soft)',{s:'var(--line)',r:3})+tx(x0+lw+10,y+15,'T'+sb(i+1),{fs:11,a:'middle'})});
    const iy=ty+3*rh+14;o+=rc(x0,iy,18,18,IMC[0],{r:3,op:.85})+tx(x0+24,iy+13,'new image → I',{fs:12});
    const bx=x0+lw+30,bw=Math.max(40,pw-lw-40);
    cls.forEach((k,i)=>{const y=ty+i*rh;o+=rc(bx,y+5,bw*L[i],12,i?'var(--dim)':'var(--acc)',{r:2,op:i?.7:.9})});
    o+=tx(bx,iy+13,'I·T'+sb('k',': pick the largest'),{fs:11,c:'var(--mute)'});
    return {o,h:iy+26-y0}}
  function draw(W){const wide=W>=600,pw=wide?(W-30)/2:W;let o='',H;
    const a=train(0,0,pw);if(wide){const b=test(pw+30,0,pw);o=a.o+b.o;H=Math.max(a.h,b.h)}else{const b=test(0,a.h+14,pw);o=a.o+b.o;H=a.h+14+b.h}
    host.innerHTML=svgW(W,H+4,o,'Figure 1 of the CLIP paper redrawn: left, a 4 by 4 grid of image-caption similarities with the true pairs on the diagonal; right, class names written as sentences, embedded, and compared with a new image, the largest similarity wins')}
  fit(host,draw)})();
