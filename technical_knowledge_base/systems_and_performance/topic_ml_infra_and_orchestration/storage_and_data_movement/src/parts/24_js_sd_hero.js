// ---- Reading tab: the hero (the storage ladder) and section 3's two families; static diagrams drawn at the measured width ----
(function(){
  const H=SD_H,$=H.$;if(!$('sd-hero-svg'))return;
  const R=H.mk('t-read');
  // closed <details> blocks have no width while closed: redraw everything on the tab when one opens
  document.addEventListener('toggle',e=>{if(e.target&&e.target.tagName==='DETAILS'&&e.target.open)dispatchEvent(new Event('resize'))},true);
  const box=(x,y,w,h,o)=>H.rect(x,y,w,h,o&&o.fill||'var(--bg)',{stroke:o&&o.stroke||'var(--line)',sw:o&&o.sw||1,rx:7});
  const arrow=(x1,y1,x2,y2,c,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),L=7;
    return H.line(x1,y1,x2,y2,c,{sw:o.sw||1.6,dash:o.dash})+'<path d="M'+x2.toFixed(1)+','+y2.toFixed(1)+' L'+(x2-L*Math.cos(a-0.45)).toFixed(1)+','+(y2-L*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-L*Math.cos(a+0.45)).toFixed(1)+','+(y2-L*Math.sin(a+0.45)).toFixed(1)+' Z" fill="'+c+'"/>'};

  function hero(){
    const el=$('sd-hero-svg'),W=Math.min(780,H.width(el)),nr=W<560;
    const lane=nr?70:180,bw=W-lane-6,x0=0;let b='',y=2;
    const T=(x,yy,s,o)=>H.t(x,yy,s,o);
    const rows=[
      {t:'GPU and host memory',s:'each node',l:[nr?'HBM to host RAM: a PCIe copy':'HBM to pinned host RAM: a PCIe copy per rank',nr?'async saves stall only for this':'asynchronous saves stop training only for this copy'],h:56},
      {t:'Local NVMe',s:'each node',l:[nr?'8 x 3.84 TB on a DGX H100':'8 x 3.84 TB in RAID 0 on a DGX H100',nr?'fast; dies with the node':'fast and parallel; dies with the node'],h:56},
      {band:true,h:30},
      {t:'Parallel file system',s:'shared',pfs:true,l:[nr?'Polaris Lustre: 650 GB/s':'Argonne Polaris, Lustre: 100 PB at 650 GB/s',nr?'FSx: $0.145 per GB-month':'FSx for Lustre: $0.145 per GB-month'],h:nr?140:128},
      {t:'Object store',s:'shared, regional',l:[nr?'flat keys; 100-200 ms first byte':'flat keys by prefix; 100-200 ms to the first byte',nr?'3,500 writes/s per prefix':'3,500 writes/s per prefix; $0.023 per GB-month'].concat(nr?['$0.023 per GB-month']:[]),h:nr?70:56}];
    const ys=[];
    rows.forEach(r=>{ys.push(y);
      if(r.band){b+=H.rect(x0,y+3,bw,r.h-6,'var(--soft)',{rx:5,stroke:'var(--acc)',sw:1.2});
        b+=T(x0+8,y+r.h/2+4,(nr?'③ the burst: all ranks at once':'③ the burst: every rank\'s shard arrives in the same second'),{fs:11.5,w:600,fill:'var(--acc)'});y+=r.h;return}
      b+=box(x0,y,bw,r.h);
      b+=T(x0+9,y+17,r.t,{fs:12.5,w:600})+T(x0+9+r.t.length*6.7+6,y+17,'('+r.s+')',{fs:11,fill:'var(--mute)'});
      if(r.pfs){
        const iy=y+26,mw=nr?Math.min(118,bw*0.42):150;
        b+=H.rect(x0+9,iy,mw,24,'var(--soft)',{stroke:'var(--acc)',sw:1.5,rx:4})+T(x0+15,iy+16,'metadata servers',{fs:11});
        b+=T(x0+mw+16,iy+16,nr?'② names: few':'② names: a few servers for every open',{fs:11,w:600,fill:'var(--acc)'});
        const oy=iy+32,n=nr?5:8,ow=Math.min(44,((nr?bw-18:bw*0.6)-(n-1)*4)/n);
        for(let k=0;k<n;k++){const ox=x0+9+k*(ow+4);b+=H.rect(ox,oy,ow,20,'var(--soft)',{stroke:'var(--line)',rx:3})+(ow>=30?T(ox+ow/2,oy+14,'OST',{a:'middle',fs:10,fill:'var(--mute)'}):'')}
        const ex=x0+9+n*(ow+4);
        if(nr)b+=T(x0+9,oy+34,'① bytes: striped over many',{fs:11,w:600,fill:'var(--acc)'});
        else b+=T(ex+4,oy+14,'① bytes: one file striped over many',{fs:11,w:600,fill:'var(--acc)'});
        const ly=nr?oy+50:oy+38;
        r.l.forEach((s,i)=>b+=T(x0+9,ly+i*14,s,{fs:11,fill:'var(--mute)'}));
      }else r.l.forEach((s,i)=>b+=T(x0+9,y+33+i*14,s,{fs:11,fill:'var(--mute)'}));
      y+=r.h+8});
    const Hh=y;
    // lane: checkpoint down, data and restarts up
    const lx=bw+6,dx=lx+lane*(nr?0.3:0.27),ux=lx+lane*(nr?0.72:0.74),top=ys[0]+24,bot=ys[4]+28;
    b+=T(dx,ys[0]+12,nr?'save':'checkpoint',{a:'middle',fs:11,w:600,fill:'var(--c2)'});
    b+=T(ux,ys[0]+12,nr?'load':'data, restart',{a:'middle',fs:11,w:600,fill:'var(--c1)'});
    b+=arrow(dx,top,dx,bot,'var(--c2)',{sw:2});
    b+=arrow(ux,bot,ux,top,'var(--c1)',{sw:2});
    [0,1,3,4].forEach((k,i)=>{const yy=ys[k]+(k===3?40:30);b+=H.rect(dx-8,yy-9,16,16,'var(--bg)',{stroke:'var(--c2)',rx:8})+T(dx,yy+3,String(i+1),{a:'middle',fs:10.5,w:600,fill:'var(--c2)'})});
    el.innerHTML=H.svg(W,Hh,b,'The storage ladder: GPU and host memory, local NVMe, the parallel file system and the object store, with the checkpoint path down and the data path up');
  }
  R.onRender(hero);hero();

  function fam(){
    const el=$('sd-fam-svg');if(!el)return;const W=Math.min(780,H.width(el)),nr=W<560;
    const pw=nr?W:(W-14)/2,ph=176;let b='';
    const panel=(px,py,kind)=>{let s='';
      s+=H.t(px,py+13,kind?'Metadata on every server':'A separate metadata tier',{fs:12.5,w:600});
      s+=H.t(px,py+28,kind?'GPFS, WEKA, VAST':'Lustre, 3FS',{fs:11,fill:'var(--mute)'});
      const cy=py+40,cw=Math.min(96,pw*0.3);
      s+=box(px,cy,cw,26)+H.t(px+cw/2,cy+17,'client',{a:'middle',fs:11});
      const n=4,sy=py+124,sw=(pw-3*6)/n;
      if(!kind){
        const mx=px+pw-Math.min(130,pw*0.42),mw=px+pw-mx;
        s+=H.rect(mx,cy,mw,26,'var(--soft)',{stroke:'var(--acc)',sw:1.5,rx:5})+H.t(mx+mw/2,cy+17,'metadata',{a:'middle',fs:11});
        s+=arrow(px+cw,cy+10,mx-2,cy+10,'var(--acc)',{dash:'4 3'});
        s+=H.t((px+cw+mx)/2,cy+4,'1 layout',{a:'middle',fs:10.5,fill:'var(--acc)'});
        for(let k=0;k<n;k++){const x=px+k*(sw+6);s+=box(x,sy,sw,30)+H.t(x+sw/2,sy+19,'data',{a:'middle',fs:11});
          s+=arrow(px+cw/2,cy+26,x+sw/2,sy-2,'var(--c3)',{sw:1.3})}
        s+=H.t(px+pw/2,sy+48,'2 bytes go straight to the data servers',{a:'middle',fs:10.5,fill:'var(--c3)'});
      }else{
        for(let k=0;k<n;k++){const x=px+k*(sw+6);s+=box(x,sy,sw,30);
          s+=H.rect(x+3,sy+3,sw-6,10,'var(--soft)',{stroke:'var(--acc)',sw:1,rx:2})+H.t(x+sw/2,sy+11.5,'meta',{a:'middle',fs:9.5,fill:'var(--acc)'});
          s+=H.t(x+sw/2,sy+25,'data',{a:'middle',fs:10.5});
          s+=arrow(px+cw/2,cy+26,x+sw/2,sy-2,'var(--c3)',{sw:1.3})}
        s+=H.line(px+sw/2,sy+40,px+3*(sw+6)+sw/2,sy+40,'var(--acc)',{dash:'3 3'});
        s+=H.t(px+pw/2,sy+52,'locks and tokens between servers',{a:'middle',fs:10.5,fill:'var(--acc)'});
        s+=H.t(px+cw+8,cy+17,nr?'any server':'any server, names and bytes',{fs:10.5,fill:'var(--c3)'});
      }
      return s};
    b+=panel(0,0,0);
    if(nr)b+=panel(0,ph+8,1);else b+=panel(pw+14,0,1);
    el.innerHTML=H.svg(W,nr?2*ph+8:ph,b,'Two families of parallel file systems: a separate metadata tier, or metadata spread over every server');
  }
  R.onRender(fam);fam();
})();
