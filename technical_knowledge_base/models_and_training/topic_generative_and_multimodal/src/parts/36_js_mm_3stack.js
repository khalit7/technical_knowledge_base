// ---- Model map: one prompt through six text-to-image pipelines (and five VLMs), slot by slot, with what each slot replaced ----
(function(){
  const M=window.MM,D=M.D,$=M.$,esc=M.esc;
  const B=x=>(x/1e9).toFixed(x<1e9?3:2)+'B';
  const CAP={
    sd15:'2022. A convolutional U-Net denoises a 4-channel latent, 8 times smaller than the image on each side. The prompt is read by CLIP\'s 123M text encoder. Small enough for a laptop in bfloat16.',
    sdxl:'2023. Same recipe, scaled: the U-Net triples and a second, larger CLIP text encoder joins. The VAE keeps 4 channels but gets a new scaling factor (0.13025 instead of 0.18215): using the wrong one is a classic bug.',
    pixs:'2024. The U-Net becomes a transformer over 2x2 latent patches: a 1024 px image is 4,096 tokens. The text encoder is now T5-XXL, about eight times larger than the denoiser.',
    sana:'2024. Efficiency route: a 32x autoencoder with 32 channels makes the same image only 1,024 tokens, and the objective switches to flow matching. A small decoder-only LLM (Gemma 2) reads the prompt.',
    qimg:'2025. Scale route: a 20B MMDiT trained with flow matching, conditioned on a whole VLM (Qwen2.5-VL) instead of CLIP or T5. Latents have 16 channels. Nearly 29B parameters in all: 58 GB of weights in bfloat16.',
    zimg:'2025. Back down to 6B: a single-stream transformer (text and image tokens in one stream from the first block), a Qwen3 text encoder, a 16-channel VAE, distilled for few steps (Turbo). Same objective as Qwen-Image.'};
  const VCAP={
    llava:'2023. The LLaVA recipe: a frozen CLIP ViT-L/14 at 336 px gives 576 patch features; a 2-layer MLP maps each to one LLM token. Fixed resolution, fixed token count.',
    qwen2vl:'2024. Native resolution: the image keeps its size, 14 px patches are merged 2x2, so every 28x28 pixel area is one token. A 448 px square is 256 tokens; a large document page is thousands.',
    smolvlm:'2025. Small-model route: SigLIP features are pixel-shuffled (3x3 neighbours stacked into channels), so a 384 px tile costs 81 tokens instead of 729. Built for laptops.',
    gemma4:'2026. Same encoder-plus-projector shape, with pooling and a default budget of 280 soft tokens per image.',
    gemma4u:'2026. Encoder-free: no separate vision encoder at all; pooled 48 px patches are projected straight into the 12B decoder. Native multimodality without a ViT.'};
  let mode='t2i',A=null;
  function slots(list,prev){
    return list.map(s=>{const ch=prev&&prev[s[0]]!==undefined&&prev[s[0]]!==s[1];
      return '<div class="mm-slot'+(ch?' chg':'')+'"><span class="k">'+esc(s[0])+'</span><span class="v">'+s[1]+'</span><span class="was">'+(ch?prev[s[0]]:'')+'</span></div>'}).join('');
  }
  function t2iSlots(s){
    return [['Pipeline',esc(s.name)+' <span class="sub2">'+esc(s.date)+'</span>'],
      ['Text encoder',esc(s.te)],['Text encoder parameters',B(s.teP)],
      ['VAE latent',s.ch+' channels, '+s.down+'x smaller per side'],['VAE scaling factor',s.sf==null?'per-channel mean and std':String(s.sf)+(s.sh!=null?', shift '+s.sh:'')],
      ['Denoiser',esc(s.den)],['Denoiser parameters',B(s.denP)],['Objective',esc(s.obj)],['Scheduler',esc(s.sched)],
      ['Denoiser input at 1024 px',s.tok1024?s.tok1024.toLocaleString('en-US')+' tokens':'a 128x128 latent (convolution, no tokens)'],
      ['All weights, bfloat16',(2*s.tot/1e9).toFixed(1)+' GB <span class="sub2">'+B(s.tot)+' x 2 bytes</span>'],
      ['Licence',M.accTag(s.acc)+'<span class="sub2">'+esc(s.lic)+'</span>']];
  }
  function vSlots(v){
    return [['Model',esc(v.name)+' <span class="sub2">'+esc(v.date)+'</span>'],['Vision encoder',esc(v.enc)],['Connector',esc(v.conn)],
      ['Image tokens',v.tok.toLocaleString('en-US')+' <span class="sub2">'+esc(v.tokNote)+'</span>'],['Language model',esc(v.llm)],
      ['Family',M.dot(v.fam)+esc(D.fam[v.fam][0])],['Licence',esc(v.lic)]];
  }
  function toMap(list){const m={};list.forEach(s=>m[s[0]]=s[1]);return m}
  function barsT2I(i){
    const st=D.stack,mx=Math.max.apply(null,st.map(s=>s.tot));
    return '<div class="small" style="margin-top:4px"><b>Parameters by component</b> (text encoder <span class="mm-dot" style="background:var(--c4)"></span>, denoiser <span class="mm-dot" style="background:var(--c3)"></span>, VAE <span class="mm-dot" style="background:var(--c2)"></span>), same scale for all six</div>'+
      '<div class="split">'+st.map((s,k)=>'<span class="small" style="opacity:'+(k<=i?1:.35)+(k===i?';font-weight:600':'')+'">'+esc(s.name.replace(' / Z-Image-Turbo','-Turbo'))+'</span><div><div class="sb" style="opacity:'+(k<=i?1:.35)+';width:'+Math.max(2,100*s.tot/mx).toFixed(1)+'%">'+
        '<span style="width:'+(100*s.teP/s.tot)+'%;background:var(--c4)" title="text encoder '+B(s.teP)+'"></span><span style="width:'+(100*s.denP/s.tot)+'%;background:var(--c3)" title="denoiser '+B(s.denP)+'"></span><span style="width:'+(100*s.vaeP/s.tot)+'%;background:var(--c2)" title="VAE '+B(s.vaeP)+'"></span></div></div>').join('')+'</div>'+
      '<div class="small mute">'+esc(st[i].name)+': text encoder '+B(st[i].teP)+', denoiser '+B(st[i].denP)+', VAE '+B(st[i].vaeP)+', total '+B(st[i].tot)+'.</div>';
  }
  function draw(i){
    if(mode==='t2i'){const s=D.stack[i],prev=i>0?toMap(t2iSlots(D.stack[i-1])):null;
      $('mm-st-cap').innerHTML='<b>'+(i+1)+' of '+D.stack.length+': '+esc(s.name)+'.</b> '+esc(CAP[s.id]);
      $('mm-st-slots').innerHTML=slots(t2iSlots(s),prev);$('mm-st-bars').innerHTML=barsT2I(i);
      $('mm-st-note').innerHTML='Read from each repository\'s model_index.json, scheduler, VAE and denoiser configs and safetensors headers ('+esc(D.checked)+'). SD 1.5\'s VAE config sets no scaling factor, so diffusers\' default 0.18215 applies (AutoencoderKL, diffusers v0.41.0). Sana\'s 32x is from its DC-AE name (f32c32); the others from the number of VAE downsampling stages. Tokens at 1024 px = (1024 / downsampling / patch size)<sup>2</sup>. Parameters exclude the safety checker and tokenizers.';
    }else{const v=D.vstack[i],prev=i>0?toMap(vSlots(D.vstack[i-1])):null;
      $('mm-st-cap').innerHTML='<b>'+(i+1)+' of '+D.vstack.length+': '+esc(v.name)+'.</b> '+esc(VCAP[v.id]);
      $('mm-st-slots').innerHTML=slots(vSlots(v),prev);
      const mx=Math.max.apply(null,D.vstack.map(x=>x.tok));
      $('mm-st-bars').innerHTML='<div class="small" style="margin-top:4px"><b>Tokens one image costs in the LLM context</b> (default or quoted resolution)</div><div class="bars">'+
        D.vstack.map((x,k)=>'<div class="row'+(k===i?' hl':'')+'" style="opacity:'+(k<=i?1:.3)+'"><span class="nm">'+esc(x.name)+'</span><span class="track"><span class="fill" style="width:'+(100*x.tok/mx).toFixed(1)+'%;background:'+M.famCol(x.fam)+'"></span></span><span class="val">'+x.tok+'</span></div>').join('')+'</div>';
      $('mm-st-note').innerHTML='Read from each model\'s config.json ('+esc(D.checked)+'): LLaVA vision image_size and patch_size, Qwen2-VL spatial_merge_size, SmolVLM image_seq_len, Gemma 4 vision_soft_tokens_per_image and num_soft_tokens. Token counts and the processors that produce them are measured in the {{VLM lab|#t-vlm}}.';
    }
  }
  A=M.anim({card:'mm-stack-card',ctl:'mm-st-ctl',n:D.stack.length,ms:3200,label:'Pipeline',draw});
  document.getElementById('mm-stack-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    document.querySelectorAll('#mm-stack-mode button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;A.reset(mode==='t2i'?D.stack.length:D.vstack.length)});
})();
