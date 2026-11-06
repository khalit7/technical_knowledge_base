// ---- Reading tab: the DiskANN node-layout diagram (section 7), drawn to scale. A static drawing: nothing moves.
// (The hero moved to the 3D stage 28a_sc_hero.js on 2026-11-06.) ----
(function(){
  const V=window.VIX;if(!V)return;const R=V.r,$=id=>document.getElementById(id);
  const fmtI=x=>Math.round(x).toLocaleString('en-US');
  // ---------- DiskANN node layout on SSD, drawn to scale (one 4,096-byte sector = a fixed width)
  let dk='128';
  function disk(){const el=$('vix-dk');if(!el)return;const W=Math.max(280,Math.min(RD.width(el),760));const small=W<480;
    const d=+dk,Rn=d===128?64:32,vec=d*4,ids=Rn*4,node=vec+ids,SEC=4096,nsec=4;
    const L=8,top=8,secW=(W-2*L)/nsec,bx=b=>L+b/SEC*secW;let s='';
    // RAM row
    s+='<rect x="'+L+'" y="'+top+'" width="'+(W-2*L)+'" height="34" rx="6" fill="var(--soft)" stroke="var(--line)"/>';
    s+=RD.t(L+8,top+14,'RAM',{fs:11,w:600,fill:'var(--ink)'})+RD.t(L+8,top+28,small?'PQ codes of every node: steer the walk':'PQ codes of every node (a few dozen bytes each): score neighbours, steer the walk',{fs:11,fill:'var(--mute)'});
    // SSD row
    const y0=top+62,hh=58;s+=RD.t(L,y0-6,'SSD: four 4,096-byte sectors',{fs:11,w:600,fill:'var(--ink)'});
    for(let k=0;k<nsec;k++)s+='<rect x="'+(L+k*secW).toFixed(1)+'" y="'+y0+'" width="'+secW.toFixed(1)+'" height="'+hh+'" fill="var(--bg)" stroke="var(--mute)" stroke-width="1"/>';
    // nodes: pack whole nodes per sector; a node larger than a sector takes ceil(node/SEC) sectors
    let off=0,n=0;const per=Math.floor(SEC/node);
    while(off<nsec*SEC-1){let start=off;if(per===0){const span=Math.ceil(node/SEC)*SEC;if(start+span>nsec*SEC)break;
        s+='<rect x="'+bx(start).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(start+vec)-bx(start)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c1)" opacity="0.85"/><rect x="'+bx(start+vec).toFixed(1)+'" y="'+(y0+6)+'" width="'+Math.max(1.5,bx(start+node)-bx(start+vec)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c3)"/>';
        s+='<rect x="'+bx(start+node).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(start+span)-bx(start+node)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--soft)"/>';
        s+=RD.t(bx(start)+4,y0+hh/2+4,'node '+(n+1),{fs:11,fill:'var(--bg)',w:600});off+=span;n++;continue}
      for(let j=0;j<per;j++){const a=start+j*node;s+='<rect x="'+(bx(a)+0.5).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(a+vec)-bx(a)-0.5).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c1)" opacity="0.85"/><rect x="'+bx(a+vec).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(a+node)-bx(a+vec)-0.5).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c3)"/>';n++}
      s+='<rect x="'+bx(start+per*node).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(start+SEC)-bx(start+per*node)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--soft)"/>';off+=SEC}
    // the hop: one read
    const hy=y0+hh+20;const span=per?SEC:Math.ceil(node/SEC)*SEC;
    s+='<path d="M'+bx(0).toFixed(1)+' '+(y0+hh+4)+'v6h'+(bx(span)-bx(0)).toFixed(1)+'v-6" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s+=RD.t(bx(0),hy+6,'one hop reads '+(span/SEC)+' sector'+(span>SEC?'s':'')+(per?' ('+per+' nodes inside)':''),{fs:11,fill:'var(--acc)',w:600});
    // legend
    const ly=hy+24;s+='<rect x="'+L+'" y="'+(ly-9)+'" width="10" height="10" fill="var(--c1)"/>'+RD.t(L+14,ly,'full vector '+vec.toLocaleString('en-US')+' B',{fs:11,fill:'var(--ink)'});
    const lx=L+(small?120:150);s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" fill="var(--c3)"/>'+RD.t(lx+14,ly,Rn+' neighbour ids '+ids+' B',{fs:11,fill:'var(--ink)'});
    const lx2=lx+(small?126:150);if(!small)s+='<rect x="'+lx2+'" y="'+(ly-9)+'" width="10" height="10" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(lx2+14,ly,'padding',{fs:11,fill:'var(--ink)'});
    el.innerHTML=RD.svg(W,ly+8,s,'DiskANN node layout on SSD');
    $('vix-dk-cap').innerHTML=d===128?'A node is d &times; 4 + R &times; 4 = 128 &times; 4 + 64 &times; 4 = <b>768 bytes</b>: '+per+' whole nodes fit in one 4,096-byte sector, so one hop is one random read, and the full vector that arrives re-scores the candidate while its neighbour ids feed the next step (their PQ codes, in RAM, rank them). <span class="mute">drawn to scale; whole nodes per sector, padded so a node&rsquo;s position is computed (Section 3.2)</span>':'A node is 1,024 &times; 4 + 32 &times; 4 = <b>4,224 bytes</b>, just over one sector: two reads per hop. Stored in float16 it is 2,048 + 128 = 2,176 bytes and fits one sector again; lowering R saves only 4 bytes per edge. <span class="mute">drawn to scale, assuming each node starts on a sector boundary</span>'}
  RD.seg($('vix-dk-d'),v=>{dk=v;disk()});RD.onRender(disk);RD.onResize(disk);disk();
})();
