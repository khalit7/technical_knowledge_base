// ---- Reading s1: hero figure. One H100 (132 SMs, L2, HBM stacks), one SM zoomed, and the ladder our tile's bytes climb.
// Static annotated diagram (structure), drawn at the measured width; counts from window.GA.chips, latencies from window.GA.luo (H800).
(function(){
  const box=document.getElementById('ga-heroSvg');if(!box)return;
  const G=window.GA,L=G.luo.H800,h=G.chips.find(c=>c.id==='h100');
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fs:11},o||{}));
  const R=(x,y,w,ht,fill,stroke,extra)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,ht).toFixed(1)+'" rx="3" fill="'+fill+'" stroke="'+(stroke||'none')+'"'+(extra||'')+'/>';
  // panel A: the package
  function pkg(x,y,w,ht,hiOut){
    let g=T(x,y+12,'H100 SXM: one die, '+h.sm_on+' SMs',{w:600});
    const top=y+22,H=ht-40,sw=Math.max(16,w*0.1),dx=x+sw+6,dw=w-2*sw-12;
    // HBM stack sites: 3 per side, one off
    for(let s=0;s<2;s++)for(let k=0;k<3;k++){const sx=s?x+w-sw:x,sy=top+k*(H/3)+3,on=!(s===1&&k===2);
      g+=R(sx,sy,sw,H/3-6,on?'var(--c2)':'none',on?'var(--c2)':'var(--mute)',on?' opacity=".5"':' stroke-dasharray="3 2"');
      g+=T(sx+sw/2,sy+(H/3-6)/2+4,on?'HBM':'off',{a:'middle'});}
    g+=R(dx,top,dw,H,'var(--soft)','var(--line)');
    // 132 SMs: 12 columns x 11 rows, L2 band in the middle
    const cols=12,rows=11,l2h=Math.max(16,H*0.11),gw=(dw-8)/cols,gh=(H-8-l2h-4)/rows;let n=0,hi=null;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const yy=top+4+r*gh+(r>=6?l2h+4:0),xx=dx+4+c*gw,isHi=(r===2&&c===8);
      g+=R(xx+0.6,yy+0.6,gw-1.2,gh-1.2,isHi?'var(--acc)':'var(--c3)',null,isHi?'':' opacity=".55"');if(isHi)hi={x:xx,y:yy,w:gw,h:gh};n++;}
    const ly=top+4+6*gh;g+=R(dx+4,ly+2,dw-8,l2h,'var(--c4)',null,' opacity=".35"')+T(dx+dw/2,ly+2+l2h/2+4,'L2 '+h.l2_mb+' MB',{a:'middle',w:600});
    g+=T(x+w/2,y+ht-4,h.gb+' GB '+h.mem+', '+h.tbs+' TB/s',{a:'middle',fill:'var(--mute)'});
    hiOut.r=hi;return g;
  }
  // panel B: one SM
  function sm(x,y,w,ht){
    let g=T(x,y+12,'One SM (of '+h.sm_on+')',{w:600});
    const top=y+22,qh=(ht-22-44)/2-4,qw=(w-6)/2;
    for(let i=0;i<4;i++){const qx=x+(i%2)*(qw+6),qy=top+Math.floor(i/2)*(qh+6);
      g+=R(qx,qy,qw,qh,'var(--soft)','var(--line)');
      const lh=Math.max(13,(qh-8)/4);
      g+=T(qx+5,qy+lh,'scheduler',{fill:'var(--mute)'});
      g+=T(qx+5,qy+2*lh,'64 KB registers');
      g+=T(qx+5,qy+3*lh,'32 FP32 lanes',{fill:'var(--mute)'});
      g+=R(qx+3,qy+3*lh+4,qw-6,Math.max(12,lh-2),'var(--acc2)','var(--acc)')+T(qx+qw/2,qy+3*lh+4+Math.max(12,lh-2)/2+4,'tensor core',{a:'middle',fill:'var(--acc)',w:600});
    }
    const by=top+2*qh+12;
    g+=R(x,by,w*0.76,26,'var(--c1)','var(--c1)',' opacity=".25"')+T(x+6,by+17,'L1 / shared '+h.l1_kb+' KB');
    g+=R(x+w*0.78,by,w*0.22,26,'var(--c5)','var(--c5)',' opacity=".3"')+T(x+w*0.89,by+17,'TMA',{a:'middle'});
    return g;
  }
  // panel C: the ladder
  function ladder(x,y,w,ht){
    let g=T(x,y+12,'Our tile climbs the ladder',{w:600});
    const rows=[['tensor core','2,048 FMAs / clock per SM','',true],['registers','256 KB per SM','operand',false],['shared memory','228 KB per SM',Math.round(L.smem)+' cycles',false],['L2','50 MB per chip',Math.round(L.l2)+' cycles',false],['HBM','80 GB per chip',Math.round(L.glob)+' cycles',false]];
    const top=y+24,rh=(ht-30)/rows.length,ax=x+8;
    rows.forEach((r,i)=>{const yy=top+i*rh;
      g+=R(x+20,yy+2,w-20,rh-6,r[3]?'var(--acc2)':'var(--soft)',r[3]?'var(--acc)':'var(--line)');
      g+=T(x+28,yy+rh/2+(w<300?-1:3),r[0],{w:600,fill:r[3]?'var(--acc)':null});
      if(w<300){g+=T(x+28,yy+rh/2+12,r[1]+(r[2]?', '+r[2]:''),{fill:'var(--mute)'})}
      else{g+=T(x+w-8,yy+rh/2-3,r[1],{a:'end',fill:'var(--mute)'})+(r[2]?T(x+w-8,yy+rh/2+11,r[2],{a:'end',fill:'var(--mute)'}):'')}
    });
    g+='<line x1="'+ax+'" y1="'+(top+rows.length*rh-6)+'" x2="'+ax+'" y2="'+(top+8)+'" stroke="var(--acc)" stroke-width="2.5" marker-end="url(#ga-hArr)"/>';
    return g;
  }
  function draw(){
    const W=Math.min(880,RD.width(box)),wide=W>=640;let g='<defs><marker id="ga-hArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--acc)"/></marker></defs>';
    const hi={};let H;
    if(wide){
      H=300;const aw=W*0.33,bw=W*0.31,cw=W-aw-bw-2*W*0.025,bx=aw+W*0.025,cx=bx+bw+W*0.025;
      g+=pkg(0,0,aw,H,hi)+sm(bx,0,bw,H)+ladder(cx,0,cw,H);
      if(hi.r)g+='<path d="M'+(hi.r.x+hi.r.w)+','+hi.r.y+' L'+bx+',22 M'+(hi.r.x+hi.r.w)+','+(hi.r.y+hi.r.h)+' L'+bx+','+(H-6)+'" stroke="var(--acc)" stroke-dasharray="3 3" fill="none"/>';
    }else{
      const a=210,b=230,c=230;H=a+b+c+16;
      g+=pkg(0,0,W,a,hi)+sm(0,a+8,W,b)+ladder(0,a+b+16,W,c);
    }
    box.innerHTML=RD.svg(W,H,g,'H100 package with 132 SMs, one SM zoomed, and the memory ladder from HBM to the tensor core');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
