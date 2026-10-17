// ---- Latent lab: one image through each model (section 2), a five-stage step animation ----
(function(){if(!window.LT)return;
  const L=window.LT,D=L.D,$=L.$;
  const ORDER=['ae2','vae2','ae16','vae16_b0p1','vae16_b0p3','vae16_b1p0','vae16_b3p0','vae16_b10p0','vq_plain','vq_restart'];
  const CLS=['T-shirt/top','Trouser','Pullover','Dress','Coat','Sandal','Shirt','Sneaker','Bag','Ankle boot'];
  const lab16=k=>CLS[k<10?k:k-10];
  const NAME={ae2:'autoencoder, 2-number code',ae16:'autoencoder, 16-number code',vae16_b1p0:'VAE, 16-number code (beta 1)',vq_restart:'VQ-VAE, 8 x 8 tokens from 128 codes',sd:'Stable Diffusion 1.5 VAE'};
  let model='ae2',img=0,an;
  const chips=$('lt-wk-chips'),flow=$('lt-wk-flow');
  function chipsDraw(){
    if(model==='sd'){chips.innerHTML='<span class="lt-note">The SD view uses the cat photo (p01_cat, CC0) from the topic\'s colour test images; section 8 runs all 16.</span>';return}
    chips.innerHTML=Array.from({length:16},(_,k)=>'<button data-k="'+k+'" class="'+(k===img?'on':'')+'" aria-label="Test image '+(k+1)+': '+lab16(k)+'" title="'+lab16(k)+'"><canvas data-sp="rec" data-k="'+L.ti('rec','orig',k)+'" data-px="30" width="30" height="30"></canvas></button>').join('');
    L.fillTiles(chips)}
  chips.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;img=+b.dataset.k;chipsDraw();an.redraw()});
  L.seg($('lt-wk-model'),v=>{model=v;chipsDraw();an.go(0)});
  function blocks(shapes,rev){ // little stack of boxes, sizes proportional to sqrt(numbers)
    const W=120,H=96;let x=4,out='';const n=shapes.length,gap=4,bw=(W-8-gap*(n-1))/n;
    const vals=shapes.map(s=>s[0]*s[1]*s[2]),mx=Math.max(...vals);
    shapes.forEach((s,i)=>{const h=Math.max(10,Math.sqrt(vals[i]/mx)*(H-26));const y=(H-18-h)/2;
      out+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" fill="var(--acc2)" stroke="var(--acc)"/>'+
      ((n<=3||i===0||i===n-1)?'<text x="'+(i===0?2:i===n-1?W-2:x+bw/2).toFixed(1)+'" y="'+(H-5-(n>3?0:(i%2)*0))+'" text-anchor="'+(i===0?'start':i===n-1?'end':'middle')+'" font-size="7.5" fill="var(--mute)">'+(n>3||i!==1?s[0]+'&#215;'+s[1]+'&#215;'+s[2]:'')+'</text>':'');x+=bw+gap});
    return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+(rev?'decoder':'encoder')+' feature sizes">'+out+'</svg>'}
  function bars(vals,sig){ // vertical bars around zero; sig: whiskers
    const n=vals.length,W=124,H=96,m=H/2,bw=(W-6)/n;const mx=Math.max(1,...vals.map((v,i)=>Math.abs(v)+(sig?2*sig[i]:0)));let o='<line x1="2" x2="'+(W-2)+'" y1="'+m+'" y2="'+m+'" stroke="var(--line)"/>';
    vals.forEach((v,i)=>{const x=3+i*bw,h=v/mx*(m-6);o+='<rect x="'+(x+bw*.15).toFixed(1)+'" y="'+Math.min(m,m-h).toFixed(1)+'" width="'+(bw*.7).toFixed(1)+'" height="'+Math.abs(h).toFixed(1)+'" fill="var(--c1)"/>';
      if(sig){const s=2*sig[i]/mx*(m-6);o+='<line x1="'+(x+bw/2).toFixed(1)+'" x2="'+(x+bw/2).toFixed(1)+'" y1="'+(m-h-s).toFixed(1)+'" y2="'+(m-h+s).toFixed(1)+'" stroke="var(--c2)" stroke-width="1.5"/>'}});
    return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="code values">'+o+'</svg>'}
  function stage(h,body,s,cls){return '<div class="lt-stage '+cls+'"><div class="h">'+h+'</div>'+body+'<div class="s">'+s+'</div></div>'}
  function draw(i){
    const sd=model==='sd',R=D.tiny.runs[model];
    const cl=j=>j===i?'cur':(j<i?'':'off');
    const px=84;
    const inp=sd?'<img src="'+D.img.sd_p01_cat_full.uri+'" width="84" height="84" alt="cat photo" style="border-radius:3px">':'<canvas data-sp="rec" data-k="'+L.ti('rec','orig',img)+'" data-px="'+px+'"></canvas>';
    const enc=sd?blocks([[512,512,3],[512,512,128],[256,256,128],[128,128,256],[64,64,512]]):blocks([[32,32,1],[16,16,32],[8,8,64]]);
    const dec=sd?blocks([[64,64,512],[128,128,512],[256,256,512],[512,512,256],[512,512,3]],1):blocks([[8,8,64],[16,16,32],[32,32,1]],1);
    let code,codeS,nums;
    if(sd){code='<div style="display:grid;grid-template-columns:repeat(2,40px);gap:3px">'+[0,1,2,3].map(c=>'<img src="'+D.img['sd_cat_z'+c].uri+'" width="40" height="40" alt="latent channel '+c+'" style="image-rendering:pixelated">').join('')+'</div>';codeS='4 channels at 64 &#215; 64';nums=16384}
    else if(model.startsWith('vq')){const t=L.toks(model,img);code='<div class="lt-tok" style="width:120px;font-size:8.5px;line-height:1.5">'+t.map(v=>'<span>'+v+'</span>').join('')+'</div>';codeS='64 integers, each 0 to 127';nums=64}
    else if(model.startsWith('vae')){code=bars(R.mu16[img],R.sigma16[img]);codeS='mean (blue) &#177; 2 &#963; (orange), then z = &#956; + &#963;&#949;';nums=16}
    else {const c=R.code16[img];code=bars(c);codeS=c.length+' numbers: '+c.slice(0,2).map(v=>v.toFixed(2)).join(', ')+(c.length>2?', ...':'');nums=c.length}
    const out=sd?'<img src="'+D.img.sd_p01_cat_recfull.uri+'" width="84" height="84" alt="reconstruction" style="border-radius:3px">':'<canvas data-sp="rec" data-k="'+(sd?0:L.ti('rec',model,img))+'" data-px="'+px+'"></canvas>';
    flow.innerHTML=stage('Input',inp,sd?'786,432 numbers':'1,024 pixels',cl(0))+stage('Encoder',enc,'convolutions shrink the grid',cl(1))+
      stage('Code',code,codeS,cl(2))+stage('Decoder',dec,'transposed convolutions grow it back',cl(3))+stage('Output',out,i>=4?(sd?f(D.sd_vae.images.p01_cat.fp32.psnr):f(R.test16_psnr_db[img]))+' dB PSNR':'reconstruction',cl(4));
    L.fillTiles(flow);
    const caps=[
      'The input: '+(sd?'a 512 &#215; 512 colour photo, 786,432 numbers.':'test image '+(img+1)+' ('+lab16(img)+'), 28 &#215; 28 padded to 32 &#215; 32 = 1,024 grey values in [-1, 1].'),
      sd?'The encoder: ResNet blocks and three stride-2 downsamplings (channels 128, 256, 512, 512) take 512 &#215; 512 to 64 &#215; 64. Note the middle is wider than the input: the encoder first expands, then squeezes.':'The encoder: two stride-2 convolutions, 32 &#215; 32 &#8594; 16 &#215; 16 &#215; 32 &#8594; 8 &#215; 8 &#215; 64 = 4,096 numbers, more than the input. Then one layer maps them to the code.',
      {ae2:'The bottleneck: just 2 numbers. Everything the decoder will know about this garment is these two values.',ae16:'The bottleneck: 16 numbers. Nothing forces them to mean anything in particular; they are wherever training put them.',vae16_b1p0:'The bottleneck: the VAE encoder outputs a mean &#956; and a spread &#963; for each of 16 numbers. Training decodes a random draw z = &#956; + &#963;&#949; (the reparameterisation trick); here the decoder uses &#956;. A dimension with &#956; near 0 and &#963; near 1 would carry nothing; at beta 1 all 16 carry something (section 6 shows them switch off as beta grows).',vq_restart:'The bottleneck: 64 positions, each replaced by the index of its nearest codebook vector (128 entries, 8 numbers each). The image is now 64 integers, image tokens, 448 bits.',sd:'The bottleneck: 4 channels at 64 &#215; 64. The channels look like a blurred, recoloured cat: the latent keeps the spatial layout, which is why a U-Net or DiT can denoise it like an image.'}[model],
      'The decoder: mirror of the encoder, grows the grid back to full size'+(sd?' (512 &#215; 512 &#215; 3).':' (32 &#215; 32), then a sigmoid maps to pixel values.'),
      'Output beside input. '+(sd?'The SD decoder keeps fur and whiskers at '+f(D.sd_vae.images.p01_cat.fp32.psnr)+' dB PSNR.':'This image: '+f(R.test16_psnr_db[img])+' dB PSNR; mean over the 10,000 test images: '+f(R.test_psnr_db)+' dB.')];
    $('lt-wk-cap').innerHTML='<b>Step '+(i+1)+' of 5.</b> '+caps[i];
    const pix=sd?786432:1024;
    $('lt-wk-cnt').innerHTML=L.stat('Model',sd?'SD 1.5 VAE':NAME[model].split(',')[0],sd?'83.7M parameters':L.n0(R.params)+' parameters')+L.stat('Numbers in the code',L.n0(nums),model.startsWith('vq')?'integers (7 bits each)':'floats')+
      L.stat('Fewer than pixels',(pix/nums).toFixed(pix/nums<100?1:0)+'&#215;',L.n0(pix)+' / '+L.n0(nums))+L.stat('Test-set PSNR',sd?f(D.sd_vae.images.p01_cat.fp32.psnr)+' dB':f(R.test_psnr_db)+' dB',sd?'this photo, fp32':'10,000 images');
  }
  const f=x=>(+x).toFixed(1);
  chipsDraw();
  an=L.anim({card:'lt-wk-card',ctl:'lt-wk-ctl',n:5,draw,ms:1800,label:'Step of the walk-through'});
})();
