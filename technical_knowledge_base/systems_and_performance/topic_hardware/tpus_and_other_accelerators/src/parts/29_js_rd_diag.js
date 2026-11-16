// ---- Reading, section 5: an 8-GPU board with a switch against one fully connected without ----
(function(){
  const el=document.getElementById('rd-amd-svg');if(!el)return;
  let mode='ar';
  const cnt=document.createElement('div');cnt.className='an-cnt';el.after(cnt);
  function ring(cx,cy,r){return [...Array(8)].map((_,i)=>{const a=-Math.PI/2+i*Math.PI/4;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]})}
  function gpus(p,hot){return p.map((q,i)=>'<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="13" fill="'+(hot(i)?'var(--acc2)':'var(--soft)')+'" stroke="var(--acc)"/>'+RD.t(q[0],q[1]+4,i,{a:'middle',fs:11,w:600})).join('')}
  function draw(){
    const w=RD.width(el),two=w>=520,pw=two?(w-12)/2:w,R=Math.min(80,pw/2-26),ph=2*R+60;
    const cp=mode==='cp',on=i=>!cp||i===0||i===5;
    let h='';
    // NVSwitch board
    let cx=pw/2,cy=28+R+6,p=ring(cx,cy,R);
    h+=RD.t(cx,14,'NVIDIA HGX: through NVSwitch',{a:'middle',fs:12,w:600});
    p.forEach((q,i)=>{h+='<line x1="'+q[0].toFixed(1)+'" y1="'+q[1].toFixed(1)+'" x2="'+cx+'" y2="'+cy+'" stroke="'+(on(i)?'var(--acc)':'var(--line)')+'" stroke-width="'+(on(i)?3:1.5)+'"/>'});
    h+='<rect x="'+(cx-30)+'" y="'+(cy-13)+'" width="60" height="26" rx="5" fill="var(--bg)" stroke="var(--mute)"/>'+RD.t(cx,cy+4,'switch',{a:'middle',fs:11});
    h+=gpus(p,on);
    // AMD board
    const ox=two?pw+12:0,oy=two?0:ph;cx=ox+pw/2;cy=oy+28+R+6;p=ring(cx,cy,R);
    h+=RD.t(cx,oy+14,'AMD 8-GPU board: 28 direct links',{a:'middle',fs:12,w:600});
    for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const hot=cp?(i===0&&j===5):(i===0);
      h+='<line x1="'+p[i][0].toFixed(1)+'" y1="'+p[i][1].toFixed(1)+'" x2="'+p[j][0].toFixed(1)+'" y2="'+p[j][1].toFixed(1)+'" stroke="'+(hot?'var(--acc)':'var(--line)')+'" stroke-width="'+(hot?3:1.2)+'"/>'}
    h+=gpus(p,i=>cp?(i===0||i===5):true);
    el.innerHTML=RD.svg(w,two?ph:2*ph,h,'Eight GPUs joined through a switch against fully connected');
    cnt.innerHTML=cp?RD.stat('AMD, GPU 0 to GPU 5','1 link','64 GB/s each way on MI300X: a seventh of the GPU\'s 448')+RD.stat('NVIDIA HGX','any pair','through the switch at the GPU\'s full NVLink rate'):
      RD.stat('AMD, links per GPU','7','7 x 64 = 448 GB/s each way, 896 GB/s aggregate (MI300X); highlighted: GPU 0\'s')+RD.stat('MI355X','1,075.2 GB/s','7 x 153.6 GB/s aggregate')+RD.stat('Scale-up domain','8 GPUs','72 only on a Helios rack (MI455X, UALink)');
  }
  RD.seg(document.getElementById('rd-amd-mode'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
// ---- Reading, section 6: one Trainium2 NeuronCore, its three memory tiers and the only paths between them (static; numbers = the list on the left) ----
(function(){
  const el=document.getElementById('rd-nc-svg');if(!el)return;
  const f1=v=>v.toFixed(1);
  const box=(x,y,w,h,fill)=>'<rect x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(w)+'" height="'+f1(h)+'" rx="6" fill="'+fill+'" stroke="var(--mute)"/>';
  const arrow=(x1,y1,x2,y2,c)=>{const a=Math.atan2(y2-y1,x2-x1),s=7,b1=a+2.6,b2=a-2.6;
    return '<line x1="'+f1(x1)+'" y1="'+f1(y1)+'" x2="'+f1(x2-Math.cos(a)*3)+'" y2="'+f1(y2-Math.sin(a)*3)+'" stroke="'+c+'" stroke-width="2.2"/>'+
      '<path d="M'+f1(x2)+' '+f1(y2)+'L'+f1(x2+s*Math.cos(b1))+' '+f1(y2+s*Math.sin(b1))+'L'+f1(x2+s*Math.cos(b2))+' '+f1(y2+s*Math.sin(b2))+'Z" fill="'+c+'"/>'};
  const num=(x,y,n)=>'<circle cx="'+f1(x)+'" cy="'+f1(y)+'" r="9" fill="var(--acc)"/>'+RD.t(f1(x),f1(y+4),n,{a:'middle',fs:11,w:600,fill:'var(--bg)'});
  const stripes=(x,y,w,h,n)=>{let s='';for(let i=1;i<n;i++){const yy=y+h*i/n;s+='<line x1="'+f1(x+4)+'" x2="'+f1(x+w-4)+'" y1="'+f1(yy)+'" y2="'+f1(yy)+'" stroke="var(--line)"/>'}return s};
  function draw(){
    const w=RD.width(el),narrow=w<440,pad=2,g=narrow?30:40,cw=(w-2*pad-2*g)/3,fs=11;
    const hb=Math.max(150,Math.min(200,cw*1.05)),hy=6,hh=40,y0=hy+hh+44,sy=y0+hb+44,sh=narrow?48:42;
    const xs=pad,xt=pad+cw+g,xp=pad+2*(cw+g);
    let h='';
    // HBM, shared by the chip's 8 cores
    h+=box(pad,hy,w-2*pad,hh,'var(--soft)')+RD.t(w/2,hy+17,'HBM, off the core',{a:'middle',fs:12,w:600})+RD.t(w/2,hy+32,'96 GiB per Trainium2, shared by its 8 NeuronCores',{a:'middle',fs:fs,fill:'var(--mute)'});
    // SBUF, the tensor engine, PSUM: same height, 128 partitions = 128 rows of the array
    h+=box(xs,y0,cw,hb,'var(--acc2)')+stripes(xs,y0+34,cw,hb-70,16);
    h+=RD.t(xs+cw/2,y0+16,'SBUF',{a:'middle',fs:12,w:600})+RD.t(xs+cw/2,y0+30,'scratchpad',{a:'middle',fs:fs,fill:'var(--mute)'});
    h+=RD.t(xs+cw/2,y0+hb-22,narrow?'128 × 224 KiB':'128 partitions × 224 KiB',{a:'middle',fs:fs})+RD.t(xs+cw/2,y0+hb-8,'= 28 MiB',{a:'middle',fs:fs});
    h+=box(xt,y0,cw,hb,'var(--bg)');
    const gx=xt+8,gy=y0+34,gw=cw-16,gh=hb-70;let gr='';
    for(let i=0;i<=8;i++){gr+='<line x1="'+f1(gx+gw*i/8)+'" x2="'+f1(gx+gw*i/8)+'" y1="'+f1(gy)+'" y2="'+f1(gy+gh)+'" stroke="var(--c1)" stroke-opacity=".45"/>'+
      '<line x1="'+f1(gx)+'" x2="'+f1(gx+gw)+'" y1="'+f1(gy+gh*i/8)+'" y2="'+f1(gy+gh*i/8)+'" stroke="var(--c1)" stroke-opacity=".45"/>'}
    h+=gr+RD.t(xt+cw/2,y0+16,'Tensor engine',{a:'middle',fs:12,w:600})+RD.t(xt+cw/2,y0+30,'systolic array',{a:'middle',fs:fs,fill:'var(--mute)'});
    h+=RD.t(xt+cw/2,y0+hb-22,'128 × 128 PEs',{a:'middle',fs:fs})+RD.t(xt+cw/2,y0+hb-8,'2.4 GHz',{a:'middle',fs:fs});
    h+=box(xp,y0,cw,hb,'var(--soft)')+stripes(xp,y0+34,cw,hb-70,16);
    h+=RD.t(xp+cw/2,y0+16,'PSUM',{a:'middle',fs:12,w:600})+RD.t(xp+cw/2,y0+30,'fp32 sums',{a:'middle',fs:fs,fill:'var(--mute)'});
    h+=RD.t(xp+cw/2,y0+hb-22,narrow?'128 × 16 KiB':'128 partitions × 16 KiB',{a:'middle',fs:fs})+RD.t(xp+cw/2,y0+hb-8,'= 2 MiB, 8 banks',{a:'middle',fs:fs});
    // scalar and vector engines under everything: they read PSUM and write SBUF
    h+=box(xt,sy,xp+cw-xt,sh,'var(--soft)')+RD.t((xt+xp+cw)/2,sy+17,'Scalar + vector engines',{a:'middle',fs:12,w:600})+
      RD.t((xt+xp+cw)/2,sy+32,narrow?'activations, reductions':'activations, scaling, reductions',{a:'middle',fs:fs,fill:'var(--mute)'});
    const A='var(--acc)',C='var(--c2)';
    // 1 and 5: DMA between HBM and SBUF
    const d1=xs+cw*0.32,d5=xs+cw*0.68;
    h+=arrow(d1,hy+hh+2,d1,y0-2,A)+num(d1-14,(hy+hh+y0)/2,'1')+arrow(d5,y0-2,d5,hy+hh+2,C)+num(d5+14,(hy+hh+y0)/2,'5');
    h+=RD.t(xs+cw+8,(hy+hh+y0)/2+4,'DMA',{fs:fs,fill:'var(--mute)'});
    // 2: two operands from SBUF into the array (stationary, then moving)
    const ya=y0+hb*0.38,yb=y0+hb*0.62;
    h+=arrow(xs+cw+2,ya,xt-2,ya,A)+arrow(xs+cw+2,yb,xt-2,yb,A)+num(xs+cw+g/2,(ya+yb)/2,'2');
    // 3: the array writes PSUM only
    const ym=y0+hb/2;
    h+=arrow(xt+cw+2,ym,xp-2,ym,A)+num(xt+cw+g/2,ym-18,'3');
    // 4: PSUM down to the scalar and vector engines, then back up into SBUF
    const e1=xp+cw/2,e2=xs+cw/2;
    h+=arrow(e1,y0+hb+2,e1,sy-2,A)+num(e1+14,(y0+hb+sy)/2,'4');
    h+='<path d="M'+f1(xt-2)+' '+f1(sy+sh/2)+'H'+f1(e2)+'V'+f1(y0+hb+9)+'" fill="none" stroke="'+A+'" stroke-width="2.2"/>'+arrow(e2,y0+hb+12,e2,y0+hb+2,A);
    el.innerHTML=RD.svg(w,sy+sh+4,h,'One Trainium2 NeuronCore: HBM, SBUF, the tensor engine, PSUM and the scalar and vector engines, with the five steps of a matmul');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
