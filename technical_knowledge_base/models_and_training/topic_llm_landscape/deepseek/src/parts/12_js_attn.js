// ---- V4.1-Flash: which layers a position passes through ----
(function(){
  function draw(m){
    let s='';const x0=70,bw=23,gap=4,yE=34,yD=128,bh=26;
    s+='<text x="6" y="'+(yE+17)+'" font-size="12">Encoder</text><text x="6" y="'+(yD+17)+'" font-size="12">Decoder</text>';
    for(let i=0;i<20;i++){const x=x0+i*(bw+gap);
      s+='<rect x="'+x+'" y="'+yE+'" width="'+bw+'" height="'+bh+'" rx="3" class="boxa"/>';
      s+='<rect x="'+x+'" y="'+yD+'" width="'+bw+'" height="'+bh+'" rx="3" class="'+(m==='dec'?'boxa':'boxo')+'"/>';
      if(i%5===4||i===0){s+='<text x="'+(x+bw/2)+'" y="'+(yE-5)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+(i+1)+'</text><text x="'+(x+bw/2)+'" y="'+(yD+bh+13)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+(i+21)+'</text>'}
    }
    const xe=x0+19*(bw+gap)+bw;
    s+=bx(236,72,280,40,'boxc',['encoder layer 20 hidden state → global K/V','layer-dependent projections, one shared cache'],10.5);
    s+=ar(xe-12,yE+bh,518,92);
    for(let i=0;i<20;i+=4){const x=x0+i*(bw+gap)+bw/2;s+=ar(270+i*10,112,x,yD-2,true)}
    if(m==='dec'){s+=ar(xe+2,yE+bh/2,xe+20,yE+bh/2)+'<path d="M'+(xe+20)+','+(yE+bh/2)+' C'+(xe+40)+','+(yE+bh/2)+' '+(xe+40)+','+(yD+bh/2)+' '+(xe+20)+','+(yD+bh/2)+'" fill="none" stroke="var(--acc)" stroke-width="1.6"/>'}
    s+='<text x="'+(x0)+'" y="'+(yD+bh+30)+'" font-size="12" fill="var(--acc)">'+(m==='pre'?'Prompt position: 20 layers, about 8B active parameters':'Generated token: all 40 layers, about 16B active parameters')+'</text>';
    $('encSvg').innerHTML=svgEl(640,196,s,'V4.1-Flash encoder-decoder layers');
    $('encCap').textContent=m==='pre'?'Prefill: prompt positions are processed by the 20 encoder layers only, and the encoder\'s final hidden state is projected into the global keys and values that every decoder layer reads.':'Decode: each generated token passes through all 40 layers; decoder layers reuse one shared cache instead of each storing its own.';
  }
  segBind('encM',draw);draw('pre');
})();
