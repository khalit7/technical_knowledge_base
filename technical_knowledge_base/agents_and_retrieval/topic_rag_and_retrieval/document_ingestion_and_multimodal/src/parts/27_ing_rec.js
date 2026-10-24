// ---- Reading s8: one real chunk record beside its page, the bounding box drawn where the record says (data: ING.rec, ING.recImg; record by src/scripts/make_record.py from Docling's output) ----
(function(){const R=window.ING&&ING.rec,el=document.getElementById('ing-rec'),pg=document.getElementById('ing-rec-page');if(!R||!el)return;
  const show=Object.assign({},R);show.text=R.text.slice(0,140)+'...';
  const KEYS=new Set(['page','bbox','heading_path','element_type','doc_version','chunk_sha256','acl','parser']);
  const txt=JSON.stringify(show,null,1).replace(/\n\s+(?=[\d\-\]])/g,' ');
  el.innerHTML=RD.esc(txt).replace(/&quot;(\w+)&quot;:/g,(m,k)=>KEYS.has(k)?'<span class="k">&quot;'+k+'&quot;</span>:':m);
  // page 3 of arXiv 1909.00175 v1 is A4: 595.3 by 841.9 points; bbox is [x0, top, x1, bottom] with the origin at the bottom left
  function draw(){if(!pg||!ING.recImg)return;const W=Math.min(RD.width(pg),300),pw=595.3,ph=841.9,s=W/pw,H=ph*s,b=R.bbox;
    const x=b[0]*s,y=(ph-b[1])*s,w=(b[2]-b[0])*s,h=(b[1]-b[3])*s;
    pg.innerHTML=RD.svg(W,Math.ceil(H)+16,'<image href="'+ING.recImg+'" x="0" y="0" width="'+W+'" height="'+H.toFixed(1)+'"/>'+
      '<rect x="0" y="0" width="'+W+'" height="'+H.toFixed(1)+'" fill="none" stroke="var(--line)"/>'+
      '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="var(--c2)" fill-opacity="0.18" stroke="var(--c2)" stroke-width="2"/>'+
      RD.t(0,H+13,'page '+R.page+', bbox '+b.join(', '),{fs:11,fill:'var(--mute)'}),'Page 3 of the paper with the chunk\'s bounding box highlighted')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
