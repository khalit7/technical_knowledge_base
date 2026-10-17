// ---- Reading, sections 0 to 3: one-screen table, pixels vs latent, the U-Net vs DiT animation, where parameters/FLOPs/time go, tokens, cross-attention mini viewer ----
(function(){
  const U=window.LDU,L=U.L,$=id=>document.getElementById(id);
  const A=U.byKey;
  const at1024=k=>{const g=U.grid(k,1024);return g?g[2]:NaN};
  // ------------------------------------------------ section 0: one screen
  (function(){
    const rows=[
      ['U-Net','SD 1.5; SDXL','A latent grid shrunk and regrown level by level; convolutions everywhere, attention at some levels','Cross-attention to the text sequence',['sd15','sdxl']],
      ['DiT','DiT-XL/2 (class labels, ImageNet)','2 &times; 2 patches of the latent as tokens; one block repeated','None: the class enters through adaLN-Zero',['dit']],
      ['DiT + cross-attention','PixArt-&Sigma;; Sana','Patch tokens (Sana: 1 &times; 1 on a 32 &times; latent)','Cross-attention to T5 or Gemma states; time through one shared modulation',['pixart','sana']],
      ['MMDiT','SD3.5 Large; Qwen-Image','Patch tokens','Joint attention over image + text tokens, separate weights per modality',['sd35l','qwen']],
      ['Double + single stream','FLUX.1 [dev]; FLUX.2 [klein] 4B','Patch tokens (2 &times; 2 packed)','Joint attention with separate weights, then shared weights',['flux1','flux2k']],
      ['Single stream','Z-Image','Patch tokens','Joint attention, shared weights from the start (after short refiners)',['zimg']]];
    $('ld-onescreen').querySelector('tbody').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td data-h="Example">'+r[1]+'</td><td data-h="Image">'+r[2]+'</td><td data-h="Text">'+r[3]+
      '</td><td data-h="Parameters">'+r[4].map(k=>U.P(A[k].params)).join('; ')+'</td><td data-h="FLOPs at 1024">'+r[4].map(k=>U.FL(at1024(k))).join('; ')+'</td></tr>').join('');
  })();
  // ------------------------------------------------ section 1: latent vs pixels
  (function(){
    const k='sd15',f=L.flops[k].fit,T=L.flops[k].T;
    const lat=U.flops(k,4096,T),pix=U.flops(k,512*512,T);
    const quad=N=>f[3]*N*N,lin=N=>U.flops(k,N,T)-quad(N);
    const lg=v=>Math.log10(v/1e9);const max=lg(pix);
    $('ld-pixbars').innerHTML=[
      ['On the latent: 64 &times; 64 positions',lat,'var(--c1)'],['&nbsp;&nbsp;of which attention N<sup>2</sup> terms',quad(4096),'var(--c4)'],
      ['On pixels: 512 &times; 512 positions',pix,'var(--c2)'],['&nbsp;&nbsp;of which attention N<sup>2</sup> terms',quad(262144),'var(--c4)']]
      .map(r=>'<div><span class="nm">'+r[0]+'</span><span class="tr"><span style="width:'+(100*lg(r[1])/max).toFixed(1)+'%;background:'+r[2]+'"></span></span><span class="v">'+U.FL(r[1])+'</span></div>').join('');
    $('ld-pixnote').innerHTML='One SD 1.5 U-Net pass, batch 1, 77 text tokens; bar length on a log scale (from 1 GFLOP). The latent pass is counted on meta tensors; the pixel pass is the same network with 512 &times; 512 positions at its top level (the input convolution would take 3 channels instead of 4, a negligible change), from the counted formula, which is exact for this network (worst residual '+U.fx(L.flops[k].worst*1e12,1)+' &times; 10<sup>&minus;12</sup> over the counted grid): '+U.fx(pix/lat,0)+' times the latent pass, '+U.pct(quad(262144)/pix,0)+' of it attention scores. <span class="der">derived</span>';
    const g5=U.grid(k,512),g10=U.grid(k,1024);
    U.setAns('ld-pr-double','Counted: '+U.FL(g5[2])+' at 512 and '+U.FL(g10[2])+' at 1024, <b>'+U.fx(g10[2]/g5[2],1)+' times</b>. The convolutions grow 4 times with the positions, but attention scores grow 16 times, and their share rises from '+U.pct(g5[3]/g5[2])+' to '+U.pct(g10[3]/g10[2])+' of the pass.');
  })();
  // ------------------------------------------------ section 2: the animation
  (function(){
    const S=L.stages.sd15,Dt=L.stages.dit;
    const unet=[
      {n:'Input latent',side:64,ch:4,d:0,key:null,cap:'The noisy latent of a 512 &times; 512 image: 64 &times; 64 positions, 4 channels. With guidance, two copies (prompt and empty prompt) go through as a batch.'},
      {n:'conv_in',side:64,ch:320,d:0,key:'conv_in',cap:'A 3 &times; 3 convolution widens every position to 320 channels. The timestep is embedded once (a 320-wide sinusoid through an MLP to 1,280) and handed to every ResNet block.'},
      {n:'down_blocks.0',side:64,ch:320,d:0,key:'down_blocks.0',cap:'Level 1 at 64 &times; 64: two ResNet blocks, each followed by a transformer block (self-attention over 4,096 positions, cross-attention to the 77 text vectors). A stride-2 convolution halves the grid. Few parameters, many FLOPs: every operation runs at 4,096 positions.'},
      {n:'down_blocks.1',side:32,ch:640,d:1,key:'down_blocks.1',cap:'Level 2 at 32 &times; 32, 640 channels: the same pattern on a quarter of the positions.'},
      {n:'down_blocks.2',side:16,ch:1280,d:2,key:'down_blocks.2',cap:'Level 3 at 16 &times; 16, 1,280 channels: the weights grow with channels squared, the positions shrink, so parameters pile up here.'},
      {n:'down_blocks.3',side:8,ch:1280,d:3,key:'down_blocks.3',cap:'Level 4 at 8 &times; 8: two ResNet blocks, no attention, no downsampling.'},
      {n:'mid_block',side:8,ch:1280,d:3,key:'mid_block',cap:'The middle: ResNet, a transformer block (self- and cross-attention over 64 positions), ResNet. Each 3 &times; 3 convolution now sees most of the image.'},
      {n:'up_blocks.0',side:8,ch:1280,d:3,key:'up_blocks.0',cap:'The way up starts: three ResNet blocks, each taking the matching skip from the way down concatenated as extra channels, then a 2 &times; upsample.'},
      {n:'up_blocks.1',side:16,ch:1280,d:2,key:'up_blocks.1',cap:'16 &times; 16 with three transformer blocks: the single largest stage by parameters (input channels doubled by the skips).'},
      {n:'up_blocks.2',side:32,ch:640,d:1,key:'up_blocks.2',cap:'32 &times; 32, three ResNet and three transformer blocks.'},
      {n:'up_blocks.3',side:64,ch:320,d:0,key:'up_blocks.3',cap:'Back at 64 &times; 64: the largest stage by FLOPs. Self-attention here compares 4,096 positions with 4,096, three times.'},
      {n:'conv_out',side:64,ch:4,d:0,key:'conv_out',cap:'GroupNorm, SiLU and a 3 &times; 3 convolution back to 4 channels: the predicted noise for every latent number.'}];
    const blk=i=>'blocks.'+i;
    const dsum=(a,b,o)=>{let s=0;for(let i=a;i<=b;i++)s+=o[blk(i)];return s};
    const dit=[
      {n:'Input latent',side:64,ch:4,d:0,key:null,cap:'The same 64 &times; 64 &times; 4 latent.'},
      {n:'Patchify',side:32,ch:1152,d:1,key:['x_embedder','pos_embed'],cap:'Cut into 2 &times; 2 patches: 1,024 tokens, each embedded to 1,152 channels by one strided convolution; add the fixed 2-D sine-cosine positions. The timestep and class are embedded into one vector c. (The authors\' code keeps the fixed position table as a frozen parameter, 1.18M numbers, so it is counted here.)'},
      {n:'Blocks 1 to 7',side:32,ch:1152,d:1,f:[0,6],cap:'Seven identical DiT blocks: adaLN-Zero modulation from c, self-attention over all 1,024 tokens, MLP. Every block has the same shape, parameters and FLOPs.'},
      {n:'Blocks 8 to 14',side:32,ch:1152,d:1,f:[7,13],cap:'No levels, no skips: the token count and width never change. Scaling the model means more blocks, wider blocks or smaller patches.'},
      {n:'Blocks 15 to 21',side:32,ch:1152,d:1,f:[14,20],cap:'A third of each block\'s parameters are its modulation layer (c to 6 &times; 1,152 numbers), which costs almost nothing per token.'},
      {n:'Blocks 22 to 28',side:32,ch:1152,d:1,f:[21,27],cap:'28 blocks in all. Attention over 1,024 tokens costs 4 &times; 1,024<sup>2</sup> &times; 1,152 FLOPs per block, about an eighth of the block.'},
      {n:'Final layer, unpatchify',side:64,ch:8,d:0,key:'final_layer',cap:'adaLN and a linear layer give each token 2 &times; 2 &times; 8 numbers, reshaped to a 64 &times; 64 &times; 8 grid: the noise (4 channels) and DiT\'s learned variance (4).'}];
    const pf=(st,src)=>{if(st.f)return [dsum(st.f[0],st.f[1],src.flops),dsum(st.f[0],st.f[1],src.params)];if(!st.key)return [0,0];const ks=[].concat(st.key);return [ks.reduce((a,k)=>a+(src.flops[k]||0),0),ks.reduce((a,k)=>a+(src.params[k]||0),0)]};
    const card=$('ld-c-anim'),svgEl=$('ld-an-svg');let mode='unet';
    // the time / label embedders carry parameters but almost no FLOPs: count them in the first step
    const extra={unet:S.params['time_embedding'],dit:Dt.params['t_embedder']+Dt.params['y_embedder']};
    function seq(){return mode==='unet'?unet:dit}
    function draw(i){
      const st=seq(),src=mode==='unet'?S:Dt,W=U.fx?Math.min(860,Math.max(300,(svgEl.clientWidth||600))):600;
      const n=st.length,gap=4,slotW=(W-20)/n,H=200,top=18,maxSide=64,hmax=110,lvl=22;
      let out='';
      // skip connections (U-Net)
      if(mode==='unet'){const pairs=[[2,10],[3,9],[4,8],[5,7]];pairs.forEach(([a,b],j)=>{if(i>=b){const xa=10+slotW*(a+0.5),xb=10+slotW*(b+0.5),y=top-6+j*2;
        out+='<path d="M'+xa+' '+(top+st[a].d*lvl)+' C '+xa+' '+(y-4)+', '+xb+' '+(y-4)+', '+xb+' '+(top+st[b].d*lvl)+'" fill="none" stroke="var(--c6)" stroke-width="1.5" stroke-dasharray="3 2"/>'}})}
      st.forEach((s,k)=>{const h=Math.max(4,hmax*s.side/maxSide),w=Math.max(3,Math.min(slotW-gap,(slotW-gap)*Math.sqrt(s.ch/1280))),x=10+slotW*k+(slotW-w)/2,y=top+s.d*lvl;
        const on=k<=i,cur=k===i;
        out+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" fill="'+(cur?'var(--c2)':on?'var(--c1)':'var(--dim)')+'" opacity="'+(on?0.9:0.5)+'"/>';
        if(slotW>40||cur)out+=RD.t(x+w/2,y+h+12,s.side+'&#178;',{a:'middle',fs:10,fill:'var(--mute)'})});
      out+=RD.t(10,H-6,mode==='unet'?'height: grid side; width: &#8730;channels; dashed: skip connections':'height: &#8730;(tokens or positions); width: &#8730;channels',{fs:10,fill:'var(--mute)'});
      svgEl.innerHTML=RD.svg(W,H,out,'Stages of the denoiser drawn to scale');
      // counters
      let cf=0,cp=i>=1?extra[mode]:0;for(let k=0;k<=i;k++){const [a,b]=pf(st[k],src);cf+=a;cp+=b}
      const s=st[i];
      $('ld-an-cap').innerHTML='<div class="t">'+(i+1)+'. '+s.n+'</div><p>'+s.cap+'</p>';
      const shape=mode==='dit'&&i>0&&i<n-1?'1,024 tokens &times; 1,152':s.side+' &times; '+s.side+' &times; '+s.ch;
      $('ld-an-cnt').innerHTML=RD.stat('Shape here',shape,mode==='unet'?'grid &times; channels':'')+RD.stat('Parameters so far',U.P(cp),'of '+U.P(mode==='unet'?A.sd15.params:L.dit_count.find(r=>r.model==='DiT-XL/2'&&r.res===512).params))+
        RD.stat('FLOPs so far',U.FL(cf),U.pct(cf/src.total,0)+' of the pass')+RD.stat('This stage',U.FL(pf(s,src)[0]),U.P(pf(s,src)[1])+' parameters');
    }
    const an=RD.anim({card:'ld-c-anim',ctl:'ld-an-ctl',n:unet.length,draw,ms:1700,label:'Stage'});
    RD.seg($('ld-an-mode'),m=>{mode=m;an.reset(seq().length);an.play()});
    RD.onResize(()=>an.redraw());
  })();
  // ------------------------------------------------ section 2: where parameters, FLOPs and time go
  (function(){
    const m=A.sd15,S=L.stages.sd15;const el=$('ld-where-bars'),note=$('ld-where-note');
    U.setAns('ld-pr-where','Convolutions: '+U.M(m.cats.conv)+' of '+U.M(m.params)+' ('+U.pct(m.cats.conv/m.params)+'), counted on the meta device. Attention (self '+U.M(m.cats.attn_img)+', cross '+U.M(m.cats.cross)+') and the feed-forward layers ('+U.M(m.cats.mlp_img)+') are the rest with the time-injection layers. SD 1.5 is a convolutional network with attention added, not a transformer with convolutions.');
    const lab={conv:'Convolutions (ResNet blocks, samplers)',attn_img:'Self-attention (+ proj_in/out, norms)',cross:'Cross-attention',mlp_img:'Feed-forward (GEGLU)',mod:'Time injection (time_emb_proj)',embed:'Time embedding MLP, in/out'};
    function show(k){
      if(k==='par'){U.bars(el,['conv','attn_img','cross','mlp_img','mod','embed'].map(c=>({name:lab[c],v:m.cats[c],label:U.pct(m.cats[c]/m.params,1),color:U.CAT[c][1]})),m.params);
        note.innerHTML='Parameters of the SD 1.5 U-Net by kind of layer ('+U.int(m.params)+' in all), counted from the config on the meta device. <span class="der">derived</span>'}
      else if(k==='lev'){const st=['down_blocks.0','down_blocks.1','down_blocks.2','down_blocks.3','mid_block','up_blocks.0','up_blocks.1','up_blocks.2','up_blocks.3'];
        const side={'down_blocks.0':64,'down_blocks.1':32,'down_blocks.2':16,'down_blocks.3':8,'mid_block':8,'up_blocks.0':8,'up_blocks.1':16,'up_blocks.2':32,'up_blocks.3':64};
        const mp=Math.max(...st.map(s=>S.params[s]/m.params)),mf=Math.max(...st.map(s=>S.flops[s]/S.total)),mx=Math.max(mp,mf);
        el.innerHTML=st.map(s=>{const p=S.params[s]/m.params,f=S.flops[s]/S.total;return '<div><span class="nm">'+s+' ('+side[s]+'&#178;)</span><span class="tr" style="height:16px"><span style="height:7px;width:'+(100*p/mx).toFixed(1)+'%;background:var(--c2)"></span><span style="top:8px;height:7px;width:'+(100*f/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="v">'+U.pct(p)+' / '+U.pct(f)+'</span></div>'}).join('');
        note.innerHTML='<span style="color:var(--c2)">&#9632;</span> share of parameters, <span style="color:var(--c1)">&#9632;</span> share of FLOPs in one pass at 512 &times; 512 ('+U.FL(S.total)+'), by top-level stage (grid side in brackets). <span class="der">derived</span>'}
      else{const P=L.sd&&L.sd.prof&&L.sd.prof.kind;if(!P){el.innerHTML='<div class="small mute">not recorded</div>';return}
        const rows=Object.entries(P.parts_s).map(([k,v])=>({name:k+' ('+P.count[k]+')',v,label:U.fx(v*1000,0)+' ms'}));const other=P.total_s-rows.reduce((a,r)=>a+r.v,0);
        rows.push({name:'everything else (embedding, norms, glue)',v:Math.max(0,other),label:U.fx(Math.max(0,other)*1000,0)+' ms'});
        U.bars(el,rows,Math.max(...rows.map(r=>r.v)));
        note.innerHTML='Time per kind of layer in one guided pass (batch 2, 512 &times; 512, float16, attention slicing), hooked with an MPS sync on each side of every module: '+U.fx(P.total_s*1000,0)+' ms in all with the hooks, '+U.fx(L.sd.prof_plain_s*1000,0)+' ms without (medians of 5). Count of modules in brackets. <span class="meas">measured on Apple M1 Pro (MPS)</span>'}
    }
    RD.seg($('ld-where-mode'),show);show('par');
  })();
  // ------------------------------------------------ code blocks
  $('ld-code-meta').textContent=L.code.meta;$('ld-code-meta-out').textContent=L.code.meta_out;$('ld-code-grab').textContent=L.code.grab;
  // ------------------------------------------------ section 3: tokens, encoder checks
  (function(){
    const t=L.te;if(!t)return;
    $('ld-toks').innerHTML=t.tokens.map((s,i)=>'<span class="ld-tok'+(i===0?' s':i>=t.eos?' e':'')+'"><b>'+RD.esc(s.replace('</w>',''))+'</b><i>'+t.ids[i]+'</i></span>').join('')+'<span class="ld-tok e"><b>&hellip;</b><i>&times; '+(77-t.tokens.length)+' more</i></span>';
    $('ld-trunc').textContent=t.warning;
    const ok=v=>v?'<span class="ok">yes</span>':'<span class="no">no</span>';
    $('ld-te-checks').innerHTML='<div>Start-token output equal across prompts: '+ok(t.sot_max_abs_diff===0)+' (cosine '+U.fx(t.sot_cos_g01_g06,6)+', '+U.fx(t.sot_cos_g01_x08,6)+')</div><div>Pooled vector = end-token output: '+ok(t.pooled_eq)+'</div><div>Padding close to the end token: cosine '+t.cos_pad.map(v=>U.fx(v,2)).join(', ')+' (every 8th position)</div><div>Prompt of '+t.long_tokens+' tokens: cut at 77</div>';
  })();
  // ------------------------------------------------ section 3: mini cross-attention viewer
  (function(){
    const X=L.xa||{};const keys=Object.keys(X);if(!keys.length)return;
    const names={g01:'red bicycle',g01_blue:'blue bicycle',g06:'astronaut, horse',x08:'two cats, three dogs'};
    const seg=$('ld-xm-prompt');seg.innerHTML=keys.map((k,i)=>'<button data-m="'+k+'"'+(i===0?' class="on"':'')+'>'+(names[k]||k)+'</button>').join('');
    const imgs={};
    function draw(k){const v=X[k];const box=$('ld-xm');const n=v.tokens.length;const eos=n-2;
      const m=U.b64u8(v.m32);const words=[];for(let i=1;i<eos;i++)words.push(i);
      box.innerHTML='<figure><img src="'+v.img+'" alt="SD 1.5 output"><figcaption>output, seed '+v.seed+'</figcaption></figure>'+words.map(i=>'<figure><canvas width="128" height="128" data-i="'+i+'"></canvas><figcaption>'+RD.esc(v.tokens[i].replace('</w>',''))+'</figcaption></figure>').join('');
      const im=new Image();im.onload=()=>{box.querySelectorAll('canvas').forEach(c=>{const i=+c.dataset.i;U.overlay(c,im,m.subarray(i*1024,(i+1)*1024),32,0.72)})};im.src=v.img;
      $('ld-xm-note').innerHTML='"'+RD.esc(v.prompt)+'": each word\'s cross-attention map, averaged over all 25 steps and the five 32 &times; 32 layers, heads and the conditional half, each scaled to its own maximum and laid over the output. <span class="meas">measured on Apple M1 Pro (MPS), float16</span>'}
    RD.seg(seg,draw);draw(keys[0]);
    const v=X.g06;if(v){const ti=v.tokens.findIndex(s=>s.startsWith('horse'));const mm=v.mass['16'];
      U.setAns('ld-pr-horse','Measured on the topic\'s g06 recording (open "astronaut, horse" above, or the Cross-attention viewer): the "horse" token receives '+U.pct(mm.per_token[ti],2)+' of the 16 &times; 16 layers\' cross-attention, against '+U.pct(mm.per_token[v.tokens.findIndex(s=>s.startsWith('astronaut'))],2)+' for "astronaut" and '+U.pct(mm.per_token[v.tokens.findIndex(s=>s.startsWith('moon'))],2)+' for "moon", and its map sits on the astronaut\'s legs and body, where a horse would be under a rider. The word was read; no region of the image was given to it. The same happens in the "two cats, three dogs" recording: the image has four cats and no dog, and the "dogs" map lands on the cats. Missing objects and attributes bound to the wrong subject are the failures Attend-and-Excite (Chefer et al. 2023) attacks by boosting a neglected token\'s attention during sampling.')}
  })();
})();
