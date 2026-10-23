// ---- Reading: the hero (one chip as the program meets it, per generation) and section 7's level diagram (chip, host, slice, multislice) ----
// Static annotated diagrams drawn at the measured width; every number comes from window.TQ (gens.json), nothing is typed here except SMEM 1 MiB (tpu_info.py).
(function(){
  const U=window.TQU,G=U.G,$=id=>document.getElementById(id),gl=U.label;
  if(!$('tq-hero'))return;
  const ACC='var(--acc)';
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx||6)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.st||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const T=(x,y,s,o)=>U.tx(x,y,s,Object.assign({fill:'var(--ink)'},o||{}));
  const arrow=(x1,y1,x2,y2,c,w,both)=>{const id='tqh-ar'+(c===ACC?'a':'m');return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'" stroke-width="'+(w||1.6)+'" marker-end="url(#'+id+')"'+(both?' marker-start="url(#'+id+'s)"':'')+'/>'};
  const DEFS='<defs>'+[['a',ACC],['m','var(--mute)']].map(([k,c])=>'<marker id="tqh-ar'+k+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="'+c+'"/></marker><marker id="tqh-ar'+k+'s" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M10,0L0,5L10,10z" fill="'+c+'"/></marker>').join('')+'</defs>';
  const gbs=b=>U.sig(b/1e9,3)+' GB/s';
  let gen='v5e';
  function hero(){
    const g=G[gen],host=$('tq-hero'),W=Math.min(760,U.width(host)),nar=W<560,P=8;
    const devs=nar?(g.gen==='7x'?'2 cores = 2 devices':g.tc===2?'2 cores = 1 device (megacore)':'1 core = 1 device'):(g.gen==='7x'?'2 TensorCores = 2 JAX devices':g.tc===2?'2 TensorCores fused = 1 JAX device (megacore)':'1 TensorCore = 1 JAX device');
    let s=DEFS,y=4;
    // host
    const hh=nar?40:34;s+=box(P,y,W-2*P,hh,{fill:'var(--bg)'});
    s+=T(P+10,y+15,'Host CPU: one JAX process for '+g.host_chips+' chips',{fs:11.5,w:600});
    s+=T(P+10,y+29,nar?'your Python, input pipeline, host memory':'your Python, the input pipeline, host memory for offload',{fs:10.5,fill:'var(--mute)'});
    y+=hh;const pcY=y;y+=30;
    s+=arrow(W/2,pcY+2,W/2,y-2,'var(--mute)',1.4,true)+T(W/2+8,pcY+19,'PCIe '+gbs(g.pcie)+(nar?'':' per chip'),{fs:10.5,fill:'var(--mute)'});
    // chip
    const chipX=P,chipW=W-2*P,chipY=y;
    const tcX=chipX+12+(g.tc===2?6:0),tcW=chipW-24-(g.tc===2?6:0);
    const rowH=nar?236:118,tcH=22+rowH+46,hbmH=40,iciH=nar?40:30;
    const chipH=24+tcH+16+hbmH+12+iciH+10;
    s+=box(chipX,chipY,chipW,chipH,{fill:'var(--bg)',st:'var(--ink)',sw:1.2,rx:10});
    s+=T(chipX+10,chipY+16,'One '+gl(g.gen)+' chip: '+devs,{fs:11.5,w:600});
    const tcY=chipY+24;
    if(g.tc===2)s+=box(tcX-6,tcY-5,tcW,tcH,{fill:'var(--soft)',dash:'4 3'});
    s+=box(tcX,tcY,tcW,tcH,{fill:'var(--soft)'});
    s+=T(tcX+8,tcY+15,'TensorCore'+(g.tc===2?' (x2)':''),{fs:11,w:600});
    // units: scalar, VPU, MXUs (one row when wide; scalar and VPU above the MXUs when narrow)
    const uy=tcY+22,ux=tcX+8,uw=tcW-16,gap=6;let SC,VP,MX;
    if(!nar){const f=[0.25,0.29,0.46],h=rowH-8;SC={x:ux,y:uy,w:uw*f[0]-gap,h};VP={x:ux+uw*f[0],y:uy,w:uw*f[1]-gap,h};MX={x:ux+uw*(f[0]+f[1]),y:uy,w:uw*f[2],h}}
    else{const h1=112,hw=(uw-gap)/2;SC={x:ux,y:uy,w:hw,h:h1};VP={x:ux+hw+gap,y:uy,w:hw,h:h1};MX={x:ux,y:uy+h1+gap,w:uw,h:rowH-8-h1-gap}}
    s+=box(SC.x,SC.y,SC.w,SC.h,{fill:'var(--bg)'});
    s+=T(SC.x+6,SC.y+15,'Scalar unit',{fs:11,w:600})+T(SC.x+6,SC.y+30,'control flow,',{fs:10.5,fill:'var(--mute)'})+T(SC.x+6,SC.y+43,'addresses, DMA',{fs:10.5,fill:'var(--mute)'});
    s+=box(SC.x+5,SC.y+SC.h-28,SC.w-10,22,{fill:'var(--soft)',rx:4})+T(SC.x+10,SC.y+SC.h-13,'SMEM 1 MiB',{fs:10.5});
    s+=box(VP.x,VP.y,VP.w,VP.h,{fill:'var(--bg)'});
    s+=T(VP.x+6,VP.y+15,'VPU',{fs:11,w:600})+T(VP.x+6,VP.y+30,'non-matmul work,',{fs:10.5,fill:'var(--mute)'})+T(VP.x+6,VP.y+43,'in float32',{fs:10.5,fill:'var(--mute)'});
    // a vector register: 8 x 16 cells standing for 8 x 128
    const rw=Math.min(VP.w-14,100),rcw=rw/16,rch=Math.min(5,(VP.h-70)/8);
    for(let r=0;r<8;r++)for(let c=0;c<16;c++)s+='<rect x="'+(VP.x+7+c*rcw).toFixed(1)+'" y="'+(VP.y+52+r*rch).toFixed(1)+'" width="'+(rcw-0.6).toFixed(1)+'" height="'+(rch-0.6).toFixed(1)+'" fill="var(--c2)" opacity=".55"/>';
    s+=T(VP.x+6,VP.y+52+8*rch+13,'register 8 x 128',{fs:10.5});
    s+=box(MX.x,MX.y,MX.w,MX.h,{fill:'var(--acc2)',st:ACC,sw:1.4});
    s+=T(MX.x+6,MX.y+15,g.mxus+' MXUs, '+g.mxu+' x '+g.mxu,{fs:11,w:600});
    s+=T(MX.x+6,MX.y+29,'all matmuls: bf16 in, f32 sum',{fs:10.5,fill:'var(--mute)'});
    const n=g.mxus,cols=nar?n:(n===4?(MX.w<150?2:4):2),rows=Math.ceil(n/cols),avH=MX.h-40,avW=MX.w-12,side=Math.min((avW-(cols-1)*5)/cols,(avH-(rows-1)*5)/rows,g.mxu===256?60:44);
    for(let i=0;i<n;i++){const cx=MX.x+6+(i%cols)*(side+5),cy=MX.y+36+Math.floor(i/cols)*(side+5);
      s+='<rect x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" width="'+side.toFixed(1)+'" height="'+side.toFixed(1)+'" fill="var(--bg)" stroke="'+ACC+'"/>';
      const k=g.mxu===256?6:4;for(let a=1;a<k;a++){const o=side*a/k;s+='<line x1="'+(cx+o).toFixed(1)+'" x2="'+(cx+o).toFixed(1)+'" y1="'+cy.toFixed(1)+'" y2="'+(cy+side).toFixed(1)+'" stroke="'+ACC+'" stroke-width=".4"/><line y1="'+(cy+o).toFixed(1)+'" y2="'+(cy+o).toFixed(1)+'" x1="'+cx.toFixed(1)+'" x2="'+(cx+side).toFixed(1)+'" stroke="'+ACC+'" stroke-width=".4"/>'}}
    // VMEM bar
    const uh=rowH-8,vy=uy+uh+18;s+=box(ux,vy,uw,24,{fill:'var(--bg)',st:ACC,sw:1.4});
    s+=T(ux+8,vy+16,'VMEM '+U.fmt(g.vmem)+' MiB'+(nar?': filled by DMA':': scratch the compiler fills by DMA; no cache'),{fs:11,w:600});
    const mxA=nar?MX.x+MX.w*0.75:MX.x+MX.w/2;s+=arrow(mxA,vy-1,mxA,MX.y+MX.h+2,ACC,2);if(!nar)s+=arrow(VP.x+VP.w/2,vy-1,VP.x+VP.w/2,VP.y+VP.h+2,'var(--mute)',1.3);
    // HBM
    const hy=tcY+tcH+16;s+=box(tcX,hy,tcW,hbmH,{fill:'var(--acc2)',st:ACC,sw:1.4});
    s+=T(tcX+8,hy+16,'HBM '+g.hbm_txt+' per chip',{fs:11.5,w:600})+T(tcX+8,hy+31,nar?'weights, state, activations':'weights, optimizer state, activations, KV cache',{fs:10.5,fill:'var(--mute)'});
    const ax=tcX+tcW-(nar?70:110);s+=arrow(ax,hy-1,ax,vy+25,ACC,2.4)+T(ax+6,hy-5,gbs(g.bw),{fs:10.5,w:600,fill:ACC});
    // ICI
    const iy=hy+hbmH+12;s+=box(tcX,iy,tcW,iciH,{fill:'var(--soft)',dash:'3 3'});
    const iciTxt='ICI: '+g.links+' links, '+gbs(g.link1)+' each way, to neighbour chips';
    if(nar){s+=T(tcX+8,iy+16,'ICI: '+g.links+' links x '+gbs(g.link1)+' each way',{fs:11,w:600})+T(tcX+8,iy+31,'to neighbours ('+g.topo.split(' (')[0]+')',{fs:10.5,fill:'var(--mute)'})}
    else s+=T(tcX+8,iy+19,iciTxt+' ('+g.topo.split(' (')[0]+')',{fs:11,w:600});
    y=chipY+chipH;
    const dY=y;y+=26;s+=arrow(W/2,dY+2,W/2,y-2,'var(--mute)',1.4,true)+T(W/2+8,dY+17,'DCN '+gbs(g.dcn)+' per chip'+(nar?'':', to other slices'),{fs:10.5,fill:'var(--mute)'});
    s+=box(P,y,W-2*P,26,{fill:'var(--bg)',dash:'3 3'})+T(P+10,y+17,'Other slices (multislice): data-centre network',{fs:11});
    y+=30;
    host.innerHTML=U.S(W,y,s,'Schematic of one '+gl(g.gen)+' chip: host, TensorCore with scalar unit, VPU, MXUs and VMEM, HBM, ICI and DCN');
    $('tq-hero-cnt').innerHTML=RD.stat('bf16 peak',U.fmt(g.bf16/1e12)+' TFLOP/s','all MXUs, per chip')+RD.stat('HBM bandwidth',gbs(g.bw),'per chip')+
      RD.stat('Ridge point',U.fmt(g.bf16/g.bw,1)+' FLOP/byte','peak &divide; bandwidth')+RD.stat('VMEM',U.fmt(g.vmem)+' MiB','per TensorCore');
  }
  U.seg($('tq-hero-gen'),U.GEN_ORDER.map(k=>[k,gl(k)]),gen,v=>{gen=v;hero()});
  hero();RD.onRender(hero);RD.onResize(hero);

  // ---- section 7: chip, host, slice, multislice on v5p ----
  function levels(){
    const g=G.v5p,host=$('tq-lvl');if(!host)return;const W=Math.min(760,U.width(host)),nar=W<560;
    const items=[
      ['One chip','HBM '+gbs(g.bw),'2 TensorCores, 1 device'],
      ['Host: '+g.host_chips+' chips','PCIe '+gbs(g.pcie)+' each','one JAX process'],
      ['Slice: e.g. 4x4x4 cube','ICI '+g.links+' x '+gbs(g.link1),'per chip, each way'],
      ['Multislice','DCN '+gbs(g.dcn),'per chip, between slices']];
    let s=DEFS,H;
    if(!nar){const bw=(W-16-3*26)/4,bh=110;
      items.forEach((it,i)=>{const x=8+i*(bw+26),y=6;s+=box(x,y,bw,bh,{fill:i===2?'var(--acc2)':'var(--soft)',st:i===2?ACC:'var(--line)'});
        s+=T(x+8,y+17,it[0],{fs:11,w:600});
        // tiny picture
        const cx=x+8,cy=y+28;
        if(i===0)s+=box(cx,cy,26,26,{fill:'var(--bg)',st:'var(--ink)',rx:3});
        if(i===1)for(let k=0;k<4;k++)s+=box(cx+k*16,cy,13,13,{fill:'var(--bg)',st:'var(--ink)',rx:2});
        if(i===2){for(let a=0;a<4;a++)for(let b=0;b<4;b++)s+='<circle cx="'+(cx+5+a*12)+'" cy="'+(cy+5+b*7)+'" r="2.4" fill="'+ACC+'"/>';s+=T(cx+56,cy+14,'x4 deep',{fs:10.5,fill:'var(--mute)'})}
        if(i===3){for(let k=0;k<2;k++)s+=box(cx+k*36,cy,28,22,{fill:'var(--bg)',dash:'3 2',rx:3});}
        s+=T(x+8,y+78,it[1],{fs:10.5,w:600,fill:i===3?'var(--bad)':'var(--ink)'})+T(x+8,y+94,it[2],{fs:10.5,fill:'var(--mute)'});
        if(i<3)s+=arrow(x+bw+3,y+bh/2,x+bw+23,y+bh/2,'var(--mute)',1.3)});
      H=6+bh+6}
    else{const bh=56;let y=4;
      items.forEach((it,i)=>{s+=box(8,y,W-16,bh,{fill:i===2?'var(--acc2)':'var(--soft)',st:i===2?ACC:'var(--line)'});
        s+=T(16,y+17,it[0],{fs:11,w:600})+T(16,y+33,it[1],{fs:10.5,w:600,fill:i===3?'var(--bad)':'var(--ink)'})+T(16,y+48,it[2],{fs:10.5,fill:'var(--mute)'});
        y+=bh;if(i<3){s+=arrow(W/2,y+2,W/2,y+16,'var(--mute)',1.3);y+=18}});H=y+4}
    host.innerHTML=U.S(W,H,s,'Chip, host, slice and multislice on TPU v5p with the bandwidth at each level');
  }
  levels();RD.onRender(levels);RD.onResize(levels);
})();
