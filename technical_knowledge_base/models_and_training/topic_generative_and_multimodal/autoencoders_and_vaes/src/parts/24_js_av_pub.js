// ---- Reading section 8: published tokenizers (each row from the named paper, checked 2026-10-17) and the token calculator ----
(function(){
  // [name, year, quantizer, resolution, grid or tokens, tokens, codes, rFID, rFID note, source url, note]
  const P=[
    ['VQ-VAE','2017','VQ','128','32 &times; 32',1024,512,null,'','https://arxiv.org/abs/1711.00937v2','ImageNet 128; no rFID (predates it)'],
    ['DALL-E dVAE','2021','Gumbel-softmax VQ','256','32 &times; 32',1024,8192,32.01,'measured by the VQGAN authors','https://arxiv.org/abs/2102.12092v2',''],
    ['VQGAN','2020','VQ + LPIPS + GAN','256','16 &times; 16',256,16384,4.98,'','https://arxiv.org/abs/2012.09841v3','also 1,024 codes: 7.94'],
    ['ViT-VQGAN','2021','VQ, 32-d L2-normalised codes','256','32 &times; 32',1024,8192,1.28,'','https://arxiv.org/abs/2110.04627v3','the tokenizer of Parti'],
    ['MaskGIT','2022','VQ','256','16 &times; 16',256,1024,2.28,'as listed by LlamaGen and TiTok','https://arxiv.org/abs/2202.04200v1',''],
    ['MUSE (base)','2023','VQ','256','16 &times; 16',256,8192,null,'','https://arxiv.org/abs/2301.00704v1','super-resolution stage: f = 8, 64 &times; 64 at 512'],
    ['RQ-VAE','2022','residual VQ, depth 4','256','8 &times; 8 &times; 4',256,16384,3.20,'50 epochs; 4.73 at the shorter schedule','https://arxiv.org/abs/2203.01941v2',''],
    ['MAGVIT-v2','2023','LFQ, 18 bits','128','',null,262144,1.15,'ImageNet 128','https://arxiv.org/abs/2310.05737v3','video tokenizer: 5 &times; 16 &times; 16 latent for 17 frames'],
    ['Chameleon','2024','VQ','512','1,024 tokens',1024,8192,null,'','https://arxiv.org/abs/2405.09818v2','text reconstruction named as its weakness'],
    ['LlamaGen','2024','VQ, 8-d L2-normalised codes','256','16 &times; 16',256,16384,2.19,'usage 97%','https://arxiv.org/abs/2406.06525v1','f = 8: 1,024 tokens, rFID 0.59; also Janus\'s generation tokenizer'],
    ['VAR','2024','multi-scale residual VQ','256','10 scales, 1 &times; 1 to 16 &times; 16',680,4096,null,'','https://arxiv.org/abs/2404.02905v2','scales from its code, not its text'],
    ['TiTok-L-32','2024','1-D VQ','256','32 tokens',32,4096,2.21,'','https://arxiv.org/abs/2406.07550v1',''],
    ['Emu3','2024','VQ (SBER-MoVQGAN)','512','64 &times; 64',4096,32768,null,'','https://arxiv.org/abs/2409.18869v1','4 &times; 8 &times; 8 for video'],
    ['Open-MAGVIT2','2024','LFQ, 18 bits','256','16 &times; 16',256,262144,1.17,'usage 100%','https://arxiv.org/abs/2409.04410v3','open reproduction of MAGVIT-v2'],
    ['IBQ','2024','VQ, gradient to every code','256','16 &times; 16',256,262144,1.00,'usage 84%','https://arxiv.org/abs/2412.02692v2',''],
    ['Cosmos DI16x16','2025','FSQ (8,8,8,5,5,5)','256','16 &times; 16',256,64000,2.518,'NVIDIA\'s own protocol','https://arxiv.org/abs/2501.03575v3','DI8x8: 1.265']];
  const el=document.getElementById('av-tok-pub');if(!el)return;
  let h='<thead><tr><th>Tokenizer</th><th>Year</th><th>Quantizer</th><th class="num">Res.</th><th>Grid</th><th class="num">Tokens</th><th class="num">Codes</th><th class="num">Bits per image</th><th class="num">rFID</th><th>Note</th></tr></thead><tbody>';
  P.forEach(r=>{const bits=r[5]?Math.round(r[5]*Math.log2(r[6])):null;
    h+='<tr title="'+r[9]+'"><td><a href="'+r[9]+'" target="_blank" rel="noopener noreferrer">'+r[0]+'</a></td><td>'+r[1]+'</td><td>'+r[2]+'</td><td class="num">'+r[3]+'</td><td>'+r[4]+'</td><td class="num">'+(r[5]?r[5].toLocaleString('en-GB'):'')+'</td><td class="num">'+r[6].toLocaleString('en-GB')+'</td><td class="num">'+(bits?bits.toLocaleString('en-GB'):'')+'</td><td class="num">'+(r[7]==null?'n/a':(String(r[7]).split('.')[1]||'').length<2?r[7].toFixed(2):String(r[7]))+'</td><td class="av-note">'+[r[8],r[10]].filter(Boolean).join('; ')+'</td></tr>'});
  el.innerHTML=h+'</tbody>';el.style.minWidth='980px';
  window.AV_PUB_TOK=P;
  const f=document.getElementById('av-tc-f'),r=document.getElementById('av-tc-r'),k=document.getElementById('av-tc-k'),out=document.getElementById('av-tc-out');
  function calc(){const n=Math.pow(+r.value/ +f.value,2),K=+k.value,bits=n*Math.log2(K);
    out.innerHTML=RD.stat('Tokens per image',n.toLocaleString('en-GB'),'('+(+r.value/ +f.value)+' &times; '+(+r.value/ +f.value)+')')+RD.stat('Bits per image',Math.round(bits).toLocaleString('en-GB'),Math.log2(K).toFixed(1)+' bits per token')+
      RD.stat('Compression',(+r.value*+r.value*24/bits).toFixed(0)+'&times;','against 24-bit RGB pixels')+RD.stat('Attention pairs',(n*n/1048576).toFixed(n*n<1048576?3:1)+'&times;','of 1,024 tokens (Chameleon)')}
  [f,r,k].forEach(x=>x.addEventListener('change',calc));calc();
})();
