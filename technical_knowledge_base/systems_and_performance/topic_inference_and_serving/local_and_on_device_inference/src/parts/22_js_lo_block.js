// ---- Reading section 3: one real block of 32 weights through five GGUF formats (LO.blk, read from the real files by scripts/blocks.py) ----
(function(){
  const el=document.getElementById('lo-qb-svg');if(!el||!window.LO||!LO.blk)return;
  const B=LO.blk,F=B.f16;let fmt='Q4_0';
  const N=32;
  // levels and reconstruction per format, from the stored fields
  function info(f){
    const r={levels:[],rec:B.types[f].vals.slice(0,N),bpw:B.types[f].bpw,bytes:B.types[f].bytes,note:''};
    if(f==='Q8_0'){const d=B.types.Q8_0.d;for(let q=-128;q<=127;q++)r.levels.push(d*q);r.scale='d = '+fx(d)+' (max |w| / 127)';r.store='2-byte scale + 32 one-byte codes = 34 bytes for 32 weights';r.codes=B.types.Q8_0.codes}
    if(f==='Q4_0'){const d=B.types.Q4_0.d;for(let q=0;q<16;q++)r.levels.push(d*(q-8));r.scale='d = '+fx(d)+' (the weight with the largest magnitude maps to code 0, i.e. -8d)';r.store='2-byte scale + 32 four-bit codes = 18 bytes for 32 weights';r.codes=B.types.Q4_0.codes}
    if(f==='Q4_K'){const s=B.types.Q4_K;const a=s.d*s.sc0,m=s.dmin*s.mn0;for(let q=0;q<16;q++)r.levels.push(a*q-m);r.scale='sub-block scale '+s.sc0+' &times; d '+fx(s.d)+', min '+s.mn0+' &times; dmin '+fx(s.dmin)+' (both 6-bit, stored once per 32 weights)';r.store='per 256 weights: 2 + 2 bytes of super-block scales, 12 bytes of 6-bit sub-block scales and mins, 128 bytes of codes = 144 bytes';r.codes=s.codes}
    if(f==='IQ4_XS'){const s=B.types.IQ4_XS;const dl=s.d*(s.ls0-32);s.table.forEach(t=>r.levels.push(dl*t));r.scale='sub-block scale ('+s.ls0+' &minus; 32) &times; d '+fx(s.d)+'; the 16 levels are a fixed non-uniform table, denser near zero';r.store='per 256 weights: 2-byte scale, 6-bit sub-block scales (5 bytes), 128 bytes of codes = 136 bytes';r.codes=s.codes}
    if(f==='Q2_K'){r.levels=[];r.scale='2-bit codes with a 4-bit scale and min per 16 weights';r.store='per 256 weights: 84 bytes (2.625 bits per weight)';r.codes=null}
    return r;
  }
  const fx=v=>{const a=Math.abs(v);return a===0?'0':a>=0.01?v.toFixed(4):v.toExponential(2)};
  const rms=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/a.length);
  const caps=[
    ['The 32 weights, as trained','The first 32 weights of one row of layer 14\'s query projection in Qwen3-1.7B, read from the F16 GGUF converted here. Each is a 16-bit float: 2 bytes. A 1.7B model stores 2.03 billion of them, so every token generated reads about 4 GB.'],
    ['Pick a scale','Quantization stores one shared number (the scale) for a small group of weights, and a short integer code per weight. The scale is chosen so the codes cover the group\'s range.'],
    ['Snap each weight to the nearest level','Each weight is replaced by the nearest of the levels the codes can express (the horizontal lines). Fewer bits, fewer levels, bigger jumps.'],
    ['Store the codes','What is written to the file. The bytes per weight, including the scales, is the bits-per-weight figure every quant name stands for.'],
    ['Read it back','At run time the kernel multiplies each code back by its scale (dequantizes) as it reads. The gap between the dot and the bar is the error this format introduced on this block.']
  ];
  function draw(i){
    const I=info(fmt),W=Math.max(300,Math.min(860,RD.width(el))),H=W<480?230:260,L=46,R=10,T=14,Bm=26;
    const all=F.slice(0,N).concat(I.rec);const mx=Math.max(...all.map(Math.abs))*1.12;
    const x=k=>L+(W-L-R)*(k+0.5)/N,y=v=>T+(H-T-Bm)*(0.5-v/(2*mx)),bw=Math.max(2,(W-L-R)/N*0.62);
    let b='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="var(--mute)"/>';
    [mx/1.12,-mx/1.12].forEach(v=>{b+=RD.t(L-4,y(v)+4,fx(v),{a:'end',fs:9.5,fill:'var(--mute)'})});
    if(i>=1&&I.levels.length){const lv=I.levels.filter(v=>Math.abs(v)<=mx);const dense=lv.length>40;
      lv.forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'" stroke="var(--c5)" stroke-opacity="'+(dense?0.25:0.7)+'" stroke-dasharray="'+(dense?'':'3 3')+'"/>'})}
    for(let k=0;k<N;k++){const v=F[k];
      b+='<rect x="'+(x(k)-bw/2).toFixed(1)+'" y="'+Math.min(y(v),y(0)).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.abs(y(v)-y(0)).toFixed(1)+'" fill="var(--c1)" opacity="'+(i>=2?0.35:0.85)+'"/>';
      if(i>=2){const q=I.rec[k];b+='<circle cx="'+x(k).toFixed(1)+'" cy="'+y(q).toFixed(1)+'" r="'+(W<480?2.6:3.2)+'" fill="var(--c2)"/>';
        if(i>=4)b+='<line x1="'+x(k).toFixed(1)+'" x2="'+x(k).toFixed(1)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(q).toFixed(1)+'" stroke="var(--bad)" stroke-width="2"/>'}
      if(i===3&&I.codes&&W>=480)b+=RD.t(x(k),H-Bm+14,String(I.codes[k]),{a:'middle',fs:9,fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,H,b,'one block of 32 weights, '+fmt);
    document.getElementById('lo-qb-cap').innerHTML='<div class="t">'+(i+1)+'/5 '+caps[i][0]+' ('+fmt+')</div><p>'+caps[i][1]+'</p><p class="small mute">'+(i===1||i===2?I.scale:i===3?I.store+(I.codes&&W<480?'. Codes: '+I.codes.slice(0,N).join(' '):''):i===4?'RMS error on these 32 weights '+fx(rms(F.slice(0,N),I.rec))+'; on the whole 2,048 &times; 2,048 tensor the error is '+(B.types[fmt].rel*100).toFixed(1)+'% of the weights\' RMS.':'')+'</p>';
    const C=document.getElementById('lo-qb-cnt');
    C.innerHTML=RD.stat('bits per weight',i>=3?I.bpw:'16','F16 = 16')+RD.stat('bytes for these 32',i>=3?I.bytes:'64','F16: 64 bytes')+RD.stat('RMS error, this block',i>=4?fx(rms(F.slice(0,N),I.rec)):'&ndash;','relative to F16')+RD.stat('whole tensor, relative',i>=4?(B.types[fmt].rel*100).toFixed(1)+'%':'&ndash;','error RMS / weight RMS');
  }
  const A=RD.anim({card:'lo-qb',ctl:'lo-qb-ctl',n:5,draw,ms:1800,label:'Quantization step'});
  RD.seg(document.getElementById('lo-qb-seg'),m=>{fmt=m;A.reset(5);A.play()});
  RD.onResize(()=>A.redraw());
})();
