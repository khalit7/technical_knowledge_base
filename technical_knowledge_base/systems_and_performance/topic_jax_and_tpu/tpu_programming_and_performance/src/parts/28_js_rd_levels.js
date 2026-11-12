// ---- Reading section 7: the level diagram (chip, host, slice, multislice on v5p). Static, drawn at the measured width from window.TQ (gens.json).
// (Until 2026-11-12 this file also drew the 2D hero; the hero is now the 3D stage in 40_js_sc_chip.js.)
(function(){
  const U=window.TQU,G=U.G,$=id=>document.getElementById(id),gl=U.label;
  if(!$('tq-lvl'))return;
  const ACC='var(--acc)';
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx||6)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.st||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const T=(x,y,s,o)=>U.tx(x,y,s,Object.assign({fill:'var(--ink)'},o||{}));
  const arrow=(x1,y1,x2,y2,c,w,both)=>{const id='tqh-ar'+(c===ACC?'a':'m');return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'" stroke-width="'+(w||1.6)+'" marker-end="url(#'+id+')"'+(both?' marker-start="url(#'+id+'s)"':'')+'/>'};
  const DEFS='<defs>'+[['a',ACC],['m','var(--mute)']].map(([k,c])=>'<marker id="tqh-ar'+k+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="'+c+'"/></marker><marker id="tqh-ar'+k+'s" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M10,0L0,5L10,10z" fill="'+c+'"/></marker>').join('')+'</defs>';
  const gbs=b=>U.sig(b/1e9,3)+' GB/s';
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
