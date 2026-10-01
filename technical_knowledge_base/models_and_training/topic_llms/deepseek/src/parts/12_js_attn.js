// ---- V4: reproducing the 2% ----
(function(){
  function calc(){
    const ix=+$('v4Ix').value, nC=+$('v4Sp').value, nH=59-nC+2;
    const entry=448*1+64*2, csa=entry/4+128*ix/4, hca=entry/128, tot=nC*csa+nH*hca, base=2*8*128*2*61;
    const ixTxt=ix===0?'no indexer keys stored':'one indexer key of 128 dimensions per 4 tokens, 128 × '+ix+' / 4 = '+fmt(128*ix/4)+' bytes';
    $('v4Steps').innerHTML=[
      'One stored entry: 448 FP8 dimensions at 1 byte plus 64 BF16 RoPE dimensions at 2 bytes = <b>576 bytes</b>.',
      'A CSA layer stores one entry per 4 tokens, 576 / 4 = 144 bytes per token, plus '+ixTxt+': <b>'+fmt(csa)+' bytes per token</b>.',
      'An HCA layer stores 576 / 128 = <b>4.5 bytes per token</b>.',
      'V4-Pro: '+nC+' × '+fmt(csa)+' + '+nH+' × 4.5 = <b>'+fmt(tot,1)+' bytes per token</b>.',
      'Baseline, GQA-8 in BF16 with the same 61 layers: 2 × 8 × 128 × 2 = 4,096 bytes per layer, <b>249,856 bytes per token</b>.'
    ].map(t=>'<li>'+t+'</li>').join('');
    const T=1e6;
    $('v4Out').innerHTML=
      '<div class="stat"><div class="k">V4-Pro against GQA-8</div><div class="v">'+(100*tot/base).toFixed(2)+'%</div><div class="d">reported: about 2%</div></div>'+
      '<div class="stat"><div class="k">One sequence at 1M tokens</div><div class="v">'+(tot*T/GiB).toFixed(1)+' GiB</div><div class="d">GQA-8 '+(base*T/GiB).toFixed(0)+' GiB · V3 MLA '+(70272*T/GiB).toFixed(0)+' GiB</div></div>'+
      '<div class="stat"><div class="k">Sliding windows, fixed</div><div class="v">'+(128*576*61/1e6).toFixed(1)+' MB</div><div class="d">128 × 576 × 61 per sequence, whatever its length</div></div>';
  }
  ['v4Ix','v4Sp'].forEach(id=>$(id).addEventListener('change',calc));calc();
})();

// ---- Stored against read, per layer ----
(function(){
  const Ts=[4096,8192,16384,65536,131072,262144,524288,1000000];
  function draw(){
    const T=Ts[+$('srT').value],k=+$('srK').value;
    $('srTv').textContent=fmt(T)+' tokens';
    const csaS=Math.ceil(T/4),hcaS=Math.ceil(T/128),w=Math.min(T,128);
    const rows=[
      ['Dense (MHA, GQA, MLA)',T,T,'reads every stored entry'],
      ['DSA (V3.2)',T,Math.min(T,2048),'plus the indexer scoring all '+fmt(T)],
      ['CSA (V4)',csaS+w,Math.min(k,csaS)+w,fmt(csaS)+' compressed + '+w+' window; reads top-'+fmt(Math.min(k,csaS))+' + '+w],
      ['HCA (V4)',hcaS+w,hcaS+w,fmt(hcaS)+' compressed + '+w+' window; reads all']
    ];
    const lg=v=>Math.log10(Math.max(1,v))/Math.log10(1.2e6)*100;
    $('srBars').innerHTML='<div class="bars">'+rows.map(r=>'<div class="row" style="grid-template-columns:minmax(0,10.5em) minmax(0,1fr) 6.4em;margin:7px 0"><span class="nm" style="white-space:normal;line-height:1.2">'+r[0]+'<span class="small mute" style="display:block;font-size:11.5px">'+r[3]+'</span></span><span><span class="track" style="display:block;height:9px"><span class="fill" style="width:'+lg(r[1]).toFixed(1)+'%;background:var(--dim)"></span></span><span class="track" style="display:block;height:9px;margin-top:3px"><span class="fill" style="width:'+lg(r[2]).toFixed(1)+'%;background:var(--acc)"></span></span></span><span class="val" style="font-size:12px;line-height:1.35">'+fmt(r[1])+'<br><b>'+fmt(r[2])+'</b></span></div>').join('')+'</div>';
  }
  $('srT').addEventListener('input',draw);$('srK').addEventListener('change',draw);draw();
})();

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
