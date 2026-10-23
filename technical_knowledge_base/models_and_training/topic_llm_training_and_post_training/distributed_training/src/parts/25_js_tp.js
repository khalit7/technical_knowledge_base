// ---- Reading: one feed-forward block under tensor parallelism on two GPUs, before and after sequence parallelism (Megatron-LM; Korthikanti et al. 2022) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('tpSvg'))return;
  const LC=['var(--c1)','var(--c2)'];
  // row kinds: full (every GPU holds all tokens), half (each GPU its half of the tokens), own (each GPU its own slice), coll (a collective across GPUs)
  const R={
    tp:[['full','X: all tokens'],['own','GeLU(X·A0)','GeLU(X·A1)'],['own','Z0·B0: partial Y','Z1·B1: partial Y'],['coll','all-reduce'],['full','Y: all tokens'],['full','LayerNorm, dropout']],
    sp:[['half','X: own tokens'],['half','LayerNorm, dropout'],['coll','all-gather'],['full','X: all tokens'],['own','GeLU(X·A0)','GeLU(X·A1)'],['own','Z0·B0: partial Y','Z1·B1: partial Y'],['coll','reduce-scatter'],['half','Y: own tokens, summed']]};
  const CAP={
    tp:'<b>TP.</b> GPU 0 holds the first half of A\'s columns and of B\'s rows, GPU 1 the second. X·A0 and X·A1 are independent, so GeLU runs locally with no communication; Z0·B0 + Z1·B1 = Y needs a sum, one all-reduce of the block\'s output (<i>b</i> × <i>s</i> × <i>h</i> values). Then LayerNorm and dropout run on all tokens on both GPUs: duplicated work and duplicated activation memory.',
    sp:'<b>TP + sequence parallel.</b> Outside the matmuls each GPU keeps only its own half of the tokens, so LayerNorm and dropout are no longer duplicated. An all-gather rebuilds the full X before the column-parallel matmul, and a reduce-scatter replaces the all-reduce, leaving each GPU the summed output for its own tokens. Same bytes, because an all-reduce is a reduce-scatter plus an all-gather.'};
  let mode='tp';
  function draw(){const el=$('tpSvg'),w=Math.max(260,RD.width(el)),t=RD.t,gap=14,lw=(w-gap)/2,rh=22,rs=8;
    let s='';s+=t(lw/2,11,'GPU 0',{a:'middle',w:600})+t(lw+gap+lw/2,11,'GPU 1',{a:'middle',w:600});
    let y=18;
    R[mode].forEach(r=>{const k=r[0];
      if(k==='coll'){const yy=y+rh/2;
        s+='<path d="M8,'+yy+' L'+(w-8)+','+yy+'" stroke="var(--c6)" stroke-width="2" fill="none"/><path d="M8,'+(yy-5)+' L0,'+yy+' L8,'+(yy+5)+'z M'+(w-8)+','+(yy-5)+' L'+w+','+yy+' L'+(w-8)+','+(yy+5)+'z" fill="var(--c6)"/>';
        s+='<rect x="'+(w/2-58)+'" y="'+(yy-9)+'" width="116" height="18" rx="9" fill="var(--bg)" stroke="var(--c6)"/>'+t(w/2,yy+4,r[1],{a:'middle',fill:'var(--c6)',w:600});
      } else for(let g=0;g<2;g++){const x=g*(lw+gap);
        if(k==='full')s+='<rect x="'+x+'" y="'+y+'" width="'+lw+'" height="'+rh+'" rx="3" fill="var(--soft)" stroke="var(--mute)"/>'+t(x+lw/2,y+15,r[1],{a:'middle'});
        else if(k==='half'){s+='<rect x="'+x+'" y="'+y+'" width="'+lw+'" height="'+rh+'" rx="3" fill="none" stroke="var(--line)" stroke-dasharray="3 2"/>';
          s+='<rect x="'+(x+(g?lw/2:0))+'" y="'+y+'" width="'+(lw/2)+'" height="'+rh+'" rx="3" fill="'+LC[g]+'" fill-opacity="0.3" stroke="'+LC[g]+'"/>'+t(x+lw/2,y+15,r[1],{a:'middle'})}
        else s+='<rect x="'+x+'" y="'+y+'" width="'+lw+'" height="'+rh+'" rx="3" fill="'+LC[g]+'" fill-opacity="0.3" stroke="'+LC[g]+'"/>'+t(x+lw/2,y+15,r[1+g],{a:'middle'});
      }
      y+=rh+rs});
    el.innerHTML=RD.svg(w,y,s,mode==='tp'?'Tensor parallel feed-forward block on two GPUs':'Tensor and sequence parallel feed-forward block on two GPUs');
    $('tpCap').innerHTML=CAP[mode]}
  RD.seg($('tpSeg'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
