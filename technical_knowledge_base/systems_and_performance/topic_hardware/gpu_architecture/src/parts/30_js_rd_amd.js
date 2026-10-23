// ---- Reading s13: two ways past one reticle, B200 (two big dies) against MI300X (8 XCDs on 4 I/O dies). Static schematic to counts.
(function(){
  const box=document.getElementById('ga-amdSvg');if(!box)return;
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fs:11},o||{}));
  const R=(x,y,w,h,fill,stroke,extra)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="3" fill="'+fill+'" stroke="'+(stroke||'none')+'"'+(extra||'')+'/>';
  function hbm(x,y,w,h){return R(x,y,w,h,'var(--c2)','var(--c2)',' opacity=".5"')+T(x+w/2,y+h/2+4,'HBM',{a:'middle'})}
  function b200(x,y,w,h){
    let g=T(x,y+12,'NVIDIA B200: 2 dies',{w:600});
    const top=y+22,H=h-48,sw=Math.max(26,w*0.11),gap=Math.max(26,w*0.12),dw=(w-2*sw-gap-8)/2;
    for(let s=0;s<2;s++){const sx=s?x+w-sw:x;for(let k=0;k<4;k++)g+=hbm(sx,top+k*H/4+2,sw,H/4-4);}
    const d1=x+sw+4,d2=d1+dw+gap;
    [d1,d2].forEach((dx,i)=>{g+=R(dx,top,dw,H,'var(--c3)','var(--c3)',' opacity=".35"')+T(dx+dw/2,top+H/2-4,'die '+(i+1),{a:'middle',w:600})+T(dx+dw/2,top+H/2+12,'reticle-sized',{a:'middle',fill:'var(--mute)'})});
    g+='<line x1="'+(d1+dw)+'" y1="'+(top+H/2)+'" x2="'+d2+'" y2="'+(top+H/2)+'" stroke="var(--acc)" stroke-width="3"/>';
    g+=T(x+w/2,y+h-8,'NV-HBI 10 TB/s; 148 SMs, 8 HBM3e stacks',{a:'middle',fill:'var(--mute)'});
    return g;
  }
  function mi300(x,y,w,h){
    let g=T(x,y+12,'AMD MI300X: 8 XCDs on 4 I/O dies',{w:600});
    const top=y+22,H=h-48,sw=Math.max(26,w*0.11),iw=(w-2*sw-12)/2,ih=(H-6)/2;
    for(let s=0;s<2;s++){const sx=s?x+w-sw:x;for(let k=0;k<4;k++)g+=hbm(sx,top+k*H/4+2,sw,H/4-4);}
    for(let r=0;r<2;r++)for(let c=0;c<2;c++){const ix=x+sw+4+c*(iw+4),iy=top+r*(ih+6);
      g+=R(ix,iy,iw,ih,'var(--c4)','var(--c4)',' opacity=".25"');
      const xw=(iw-12)/2,xh=ih*0.62;
      for(let k=0;k<2;k++){const xx=ix+4+k*(xw+4);g+=R(xx,iy+4,xw,xh,'var(--c3)','var(--c3)',' opacity=".55"')+T(xx+xw/2,iy+4+xh/2+4,'XCD',{a:'middle',w:600})}
      g+=T(ix+iw/2,iy+ih-6,iw<120?'I/O die':'I/O die + cache',{a:'middle',fill:'var(--mute)'});
    }
    g+=T(x+w/2,y+h-8,'304 CUs (8 x 38); 256 MB Infinity Cache',{a:'middle',fill:'var(--mute)'});
    return g;
  }
  function draw(){
    const W=Math.min(860,RD.width(box)),wide=W>=600;let g='',H;
    if(wide){H=230;const pw=(W-24)/2;g+=b200(0,0,pw,H)+mi300(pw+24,0,pw,H)}
    else{const ph=220;H=2*ph+14;g+=b200(0,0,W,ph)+mi300(0,ph+14,W,ph)}
    box.innerHTML=RD.svg(W,H,g,'B200 as two reticle-sized dies against MI300X as eight compute dies stacked on four I/O dies');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
