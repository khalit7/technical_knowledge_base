// ---- Reading, quantisation names: GGUF block layouts to scale, and bits per weight against perplexity ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-nm'))return;
  // fields from ggml/src/ggml-common.h (bytes per block); k: q = quant bits, s = scales/mins/metadata
  const T=[
    {n:'Q4_0',w:32,f:[['d (fp16 scale)',2,'s'],['qs: 32 × 4-bit',16,'q']],file:null,note:'Legacy: one fp16 scale per 32, symmetric.'},
    {n:'Q8_0',w:32,f:[['d (fp16 scale)',2,'s'],['qs: 32 × 8-bit',32,'q']],file:8.5008,note:'Legacy, kept because it decodes trivially.'},
    {n:'Q2_K',w:256,f:[['scales + mins, 4-bit, 16 blocks of 16',16,'s'],['qs: 256 × 2-bit',64,'q'],['d, dmin (fp16)',4,'s']],file:3.1593,note:'K-quant: 16 blocks of 16, 4-bit sub-scales and sub-mins.'},
    {n:'Q3_K',w:256,f:[['hmask: high bit',32,'q'],['qs: low 2 bits',64,'q'],['scales, 6-bit',12,'s'],['d (fp16)',2,'s']],file:3.9960,fileName:'Q3_K_M',note:'K-quant, symmetric: 16 blocks of 16 with 6-bit sub-scales.'},
    {n:'Q4_K',w:256,f:[['d, dmin (fp16)',4,'s'],['scales + mins, 6-bit, 8 blocks of 32',12,'s'],['qs: 256 × 4-bit',128,'q']],file:4.8944,fileName:'Q4_K_M',note:'K-quant: 8 blocks of 32, each with a 6-bit scale and min against two fp16 super-values.'},
    {n:'Q5_K',w:256,f:[['d, dmin (fp16)',4,'s'],['scales + mins, 6-bit',12,'s'],['qh: 5th bit',32,'q'],['qs: low 4 bits',128,'q']],file:5.7036,fileName:'Q5_K_M',note:'As Q4_K plus a fifth bit per weight.'},
    {n:'Q6_K',w:256,f:[['ql: low 4 bits',128,'q'],['qh: high 2 bits',64,'q'],['scales, 8-bit, 16 blocks',16,'s'],['d (fp16)',2,'s']],file:6.5633,note:'K-quant: 16 blocks of 16, 8-bit sub-scales.'},
    {n:'IQ2_XXS',w:256,f:[['d (fp16)',2,'s'],['qs: lattice indices, signs and scales packed',64,'q']],file:2.3824,note:'Codebook (lattice) quantiser; scales live inside the packed words. Needs an imatrix.'},
    {n:'IQ3_XXS',w:256,f:[['d (fp16)',2,'s'],['qs: lattice indices, signs, scales',96,'q']],file:3.2548,note:'Codebook quantiser around 3 bits.'},
    {n:'IQ4_NL',w:32,f:[['d (fp16)',2,'s'],['qs: 32 × 4-bit indices into a 16-value non-linear codebook',16,'q']],file:4.6818,note:'Non-linear: the 16 values are {-127, -104, -83, -65, -49, -35, -22, -10, 1, 13, 25, 38, 53, 69, 89, 113} times d.'},
    {n:'IQ4_XS',w:256,f:[['d (fp16)',2,'s'],['scales_h',2,'s'],['scales_l',4,'s'],['qs: 256 × 4-bit',128,'q']],file:4.4597,note:'IQ4_NL\'s codebook with K-quant style 6-bit sub-scales per 32.'},
    {n:'MXFP4',w:32,f:[['e (E8M0 scale)',1,'s'],['qs: 32 × E2M1',16,'q']],file:null,note:'The OCP format in ggml\'s container (gpt-oss ships in it).'},
    {n:'TQ2_0',w:256,f:[['qs: 2 bits per trit',64,'q'],['d (fp16)',2,'s']],file:null,note:'Ternary, 2 bits per weight plus a scale.'},
    {n:'TQ1_0',w:256,f:[['qs: 5 trits per byte (240 weights)',48,'q'],['qh: 4 per byte (16 weights)',4,'q'],['d (fp16)',2,'s']],file:null,note:'Ternary, five trits in a byte because 3^5 = 243 fits in 256.'}];
  let sel=4;
  $('rd-nmS').innerHTML=T.map((t,i)=>'<option value="'+i+'">'+t.n+'</option>').join('');$('rd-nmS').value=sel;
  function draw(){
    const t=T[sel],bytes=t.f.reduce((a,f)=>a+f[1],0),bpw=bytes*8/t.w;
    const W=RD.width($('rd-nmL')),max=8.6,sc=(W-4)/max; // width per bit per weight
    let x=0,s='';const cols={q:'var(--c3)',s:'var(--c2)'};
    t.f.forEach(f=>{const w=f[1]*8/t.w*sc;s+='<rect x="'+x.toFixed(1)+'" y="4" width="'+Math.max(0.8,w-0.6).toFixed(1)+'" height="22" fill="'+cols[f[2]]+'"/>';x+=w});
    for(let b=0;b<=8;b++){const xx=b*sc;s+='<line x1="'+xx+'" x2="'+xx+'" y1="28" y2="32" stroke="var(--mute)"/><text x="'+Math.min(W-6,xx+(b===0?3:0))+'" y="43" font-size="10" text-anchor="middle" fill="var(--mute)">'+b+'</text>'}
    if(t.file){const xx=t.file*sc;s+='<line x1="'+xx+'" x2="'+xx+'" y1="0" y2="30" stroke="var(--ink)" stroke-dasharray="3 2"/>'}
    $('rd-nmL').innerHTML='<svg viewBox="0 0 '+W+' 46" width="'+W+'" height="46" role="img" aria-label="Block layout to scale">'+s+'</svg>';
    $('rd-nmF').innerHTML=t.f.map(f=>'<li><span style="color:'+cols[f[2]]+'">■</span> '+f[0]+': '+f[1]+' bytes</li>').join('');
    const scaleBits=t.f.filter(f=>f[2]==='s').reduce((a,f)=>a+f[1],0)*8/t.w;
    $('rd-nmN').innerHTML=RD.stat('Block','<span class="mono">'+t.n+'</span>',bytes+' bytes per '+t.w+' weights')+
      RD.stat('Bits per weight, block format',bpw.toFixed(4),bytes+' × 8 / '+t.w)+
      RD.stat('of which scales and minima',scaleBits.toFixed(4),'bits per weight')+
      RD.stat('Whole file, Llama-3.1-8B',t.file?t.file.toFixed(2):'not in the table',t.file?(t.fileName||t.n)+', dashed line; includes the mix':'');
    $('rd-nmX').textContent=t.note;
  }
  $('rd-nmS').addEventListener('change',e=>{sel=+e.target.value;draw()});
  RD.onRender(draw);draw();addEventListener('resize',draw);

  // ---- bits per weight against perplexity increase, two models ----
  const P=[ // name, whole-file bpw (README, Llama-3.1-8B), ppl delta LLaMA-1-7B (llama.cpp July 2023), ppl delta Llama-3-8B (current quantize.cpp)
    ['Q2_K',3.1593,0.8698,3.5199],['Q3_K_M',3.9960,0.2437,0.6569],['Q4_K_S',4.6672,0.1149,0.2689],['Q4_K_M',4.8944,0.0535,0.1754],
    ['Q5_K_M',5.7036,0.0142,0.0569],['Q6_K',6.5633,0.0044,0.0217],['Q8_0',8.5008,0.0004,0.0026]];
  let LOG=false;
  function knee(){
    const el=$('rd-kn');if(!el)return;const W=RD.width(el),H=Math.round(Math.min(280,Math.max(210,W*0.42)));
    const pl=46,pr=12,pt=10,pb=30,iw=W-pl-pr,ih=H-pt-pb;
    const x=v=>pl+(v-3)/(8.8-3)*iw,ly=v=>Math.log10(v),y=LOG?(v=>pt+(ly(8)-ly(v))/(ly(8)-ly(0.0002))*ih):(v=>pt+(4-v)/4*ih);
    let s='';
    (LOG?[0.001,0.01,0.1,1]:[0,1,2,3,4]).forEach(t=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(y(t)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(t?'+'+t:'0')+'</text>'});
    [3,4,5,6,7,8].forEach(t=>{s+='<text x="'+x(t)+'" y="'+(H-14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    s+='<text x="'+(pl+iw/2)+'" y="'+(H-2)+'" font-size="10" text-anchor="middle" fill="var(--mute)">whole-file bits per weight</text>';
    [[2,'var(--c1)'],[3,'var(--c2)']].forEach(([k,c])=>{s+='<polyline fill="none" stroke="'+c+'" stroke-width="1.6" points="'+P.map(p=>x(p[1])+','+y(p[k])).join(' ')+'"/>';
      P.forEach(p=>{s+='<circle cx="'+x(p[1])+'" cy="'+y(p[k])+'" r="3.2" fill="'+c+'"/>'})});
    P.forEach((p,i)=>{if(i===2||(W<520&&i===4))return;s+='<text x="'+x(p[1])+'" y="'+(y(p[3])-7)+'" font-size="10" text-anchor="'+(i===P.length-1?'end':'middle')+'">'+p[0]+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Perplexity increase against bits per weight for two models">'+s+'</svg>';
  }
  const kt=$('rd-knT');if(kt)kt.addEventListener('click',e=>{const b=e.target.closest('button[data-l]');if(!b)return;LOG=b.dataset.l==='1';kt.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));knee()});
  RD.onRender(knee);knee();addEventListener('resize',knee);
})();
