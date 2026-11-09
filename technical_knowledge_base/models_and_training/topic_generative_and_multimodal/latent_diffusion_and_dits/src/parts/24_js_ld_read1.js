// ---- Reading, sections 0 to 3: one-screen table, the doubling predict card, where parameters/FLOPs/time go, tokens, the horse predict card (the stages are 28_js_sc*.js) ----
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
    const k='sd15';
    const g5=U.grid(k,512),g10=U.grid(k,1024);
    U.setAns('ld-pr-double','Counted: '+U.FL(g5[2])+' at 512 and '+U.FL(g10[2])+' at 1024, <b>'+U.fx(g10[2]/g5[2],1)+' times</b>. The convolutions grow 4 times with the positions, but attention scores grow 16 times, and their share rises from '+U.pct(g5[3]/g5[2])+' to '+U.pct(g10[3]/g10[2])+' of the pass.');
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
  // ------------------------------------------------ section 3: the horse predict card (the viewer itself is 24_js_ld_xa.js)
  (function(){
    const X=L.xa||{};
    const v=X.g06;if(v){const ti=v.tokens.findIndex(s=>s.startsWith('horse'));const mm=v.mass['16'];
      U.setAns('ld-pr-horse','Measured on the topic\'s g06 recording (pick "astronaut, horse" in the viewer above): the "horse" token receives '+U.pct(mm.per_token[ti],2)+' of the 16 &times; 16 layers\' cross-attention, against '+U.pct(mm.per_token[v.tokens.findIndex(s=>s.startsWith('astronaut'))],2)+' for "astronaut" and '+U.pct(mm.per_token[v.tokens.findIndex(s=>s.startsWith('moon'))],2)+' for "moon", and its map sits on the astronaut\'s legs and body, where a horse would be under a rider. The word was read; no region of the image was given to it. The same happens in the "two cats, three dogs" recording: the image has four cats and no dog, and the "dogs" map lands on the cats. Missing objects and attributes bound to the wrong subject are the failures Attend-and-Excite (Chefer et al. 2023) attacks by boosting a neglected token\'s attention during sampling.')}
  })();
})();
