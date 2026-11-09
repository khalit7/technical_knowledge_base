// ---- Reading sections 2 to 5 (the attention stepper became the 3D stage Fig. 2, 28_js_sc2att.js): model table, cost table, implied throughput, noise schedules for long video ----
(function(){
  const U=window.VAU,V=U.V,$=id=>document.getElementById(id),esc=RD.esc;
  // ---------- the model table ----------
  $('va-models-table').innerHTML='<thead><tr><th>Model</th><th>Denoiser</th><th>VAE, patch</th><th>Attention and text</th><th>Positions</th><th>Objective</th><th>Default clip</th><th>Tokens</th></tr></thead><tbody>'+
    V.models.map(m=>{const c=U.calc(m);return '<tr><td>'+esc(m.n)+'</td><td>'+U.B(m.params)+' ('+(m.cfg?'counted':'stated')+'), '+m.L+' blocks x '+m.D+'</td><td>'+m.ct+'x'+m.cs+'x'+m.cs+', '+m.ch+' ch; '+m.pt+'x'+m.ph+'x'+m.ph+'</td><td>'+esc(m.attn)+'</td><td>'+esc(m.rope)+'</td><td>'+esc(m.obj)+'</td><td>'+m.W+' x '+m.H+', '+m.F+' frames at '+m.fps+' fps ('+U.fx(c.sec,1)+' s)<div class="va-small">'+esc(m.def_src)+'</div></td><td>'+U.int(c.N)+'</td></tr>'}).join('')+'</tbody>';

  // ---------- the cost table ----------
  $('va-cost-table').innerHTML='<thead><tr><th>Model</th><th>Tokens</th><th>Tokens per second of video</th><th>TFLOP per pass</th><th>Attention share</th><th>Steps x passes</th><th>PFLOP per clip</th></tr></thead><tbody>'+
    V.models.map(m=>{const c=U.calc(m);return '<tr><td>'+esc(m.n)+'</td><td>'+U.int(c.N)+'</td><td>'+U.int(c.tps)+'</td><td>'+U.TF(c.per)+'</td><td>'+U.pct(c.share)+'</td><td>'+m.steps+' x '+m.passes+'</td><td>'+U.fx(c.clip/1e15,c.clip<1e16?1:0)+'</td></tr>'}).join('')+'</tbody>';
  // implied sustained throughput from published speeds (derived, labelled)
  const ltx=U.mById.ltx,l1=U.calc(ltx,{H:512,W:768,F:121,steps:20,passes:1}),l2=U.calc(ltx,{H:512,W:768,F:121,steps:20,passes:2});
  const wn=U.calc(U.mById.wan13);
  $('va-implied').innerHTML='LTX-Video says "2 seconds to generate 121 frames at 768x512 pixels and 20 diffusion steps on an Nvidia H100" (vendor). The formula gives '+U.int(l1.N)+' tokens and '+U.fx(l1.per/1e12,1)+' TFLOP per pass, so '+U.int(l1.clip/1e12)+' TFLOP without guidance or '+U.int(l2.clip/1e12)+' with it: '+U.int(l1.clip/2e12)+' to '+U.int(l2.clip/2e12)+' TFLOP per second sustained by the denoiser alone, before the VAE and text encoder; compare that with what your GPU actually sustains in bf16 (peak against achieved is on <a href="https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e" target="_blank" rel="noopener noreferrer">Topic: hardware</a>). The Self Forcing authors\' own table lists LTX-Video at 13.5 s latency (their settings, not stated in the table) <span class="indep">independent</span>. For Wan 2.1 1.3B at its defaults (50 steps, guidance) the formula gives '+U.int(wn.clip/1e12)+' TFLOP per clip; Self Forcing\'s Table 1 measures 103 s on an H100 (implying '+U.int(wn.clip/103e12)+' TFLOP/s if run at those defaults), and the Wan card says "about 4 minutes" on an RTX 4090 (implying '+U.int(wn.clip/240e12)+' TFLOP/s). Derived numbers: they check that a claim is possible, not what the run used.';
  const p720=U.calc(U.mById.wan13,{H:720,W:1280}),p10=U.calc(U.mById.wan13,{F:161});
  U.setAns('va-pr-res','720p for 5 s: '+U.int(p720.N)+' tokens, '+U.TF(p720.per)+' TFLOP per pass. 480p for 10 s: '+U.int(p10.N)+' tokens, '+U.TF(p10.per)+' TFLOP. Resolution 1.5 times per side is 2.25 times the area; duration twice is 1.95 times the latent frames. Both enter the token count the same way, and the square makes the bigger count win by more: '+U.fx(p720.per/p10.per,2)+' times.');

  // ---------- noise schedules over a long video ----------
  let af='full';
  const SCH={full:{K:4,off:0,rows:4,cap:'The whole clip is denoised together: every chunk at the same noise level at every step. Consistent, but the clip must fit the context and the training length.'},
    ar:{K:4,off:4,rows:24,cap:'Chunk after chunk: each chunk is denoised to clean, then the next is generated conditioned on it. Any length, but the model now conditions on its own outputs, so errors accumulate (exposure bias, "drifting").'},
    df:{K:4,off:2,rows:14,cap:'Rising noise: several chunks are in flight at once, later ones noisier (Diffusion Forcing trains every frame at its own noise level; MAGI-1 denoises up to 4 chunks of 24 frames at a time). The next chunk starts before the last is finished, which streams and lets later chunks correct course.'}};
  function afDraw(){const s=SCH[af],el=$('va-af-svg'),w=Math.min(RD.width(el),520),C=6,L=58,T=18,cw=(w-L-6)/C,rh=Math.max(7,Math.min(14,190/s.rows)),h=T+s.rows*rh+20;let o='';
    for(let c=0;c<C;c++)o+=RD.t(L+(c+0.5)*cw,12,'chunk '+(c+1),{a:'middle',fill:'var(--mute)',fs:10});
    for(let r=0;r<s.rows;r++){for(let c=0;c<C;c++){const st=c*s.off;let n=af==='full'?1-(r+1)/s.K:(r<st?1:Math.max(0,1-(r-st+1)/s.K));
        o+='<rect x="'+(L+c*cw+1)+'" y="'+(T+r*rh)+'" width="'+(cw-2)+'" height="'+(rh-1)+'" fill="var(--acc)" opacity="'+(0.08+0.85*n).toFixed(2)+'"/>'}
      if(r%2===0||s.rows<6)o+=RD.t(L-4,T+r*rh+rh-2,'step '+(r+1),{a:'end',fill:'var(--mute)',fs:9.5})}
    o+=RD.t(L,h-4,'dark = noisy, pale = clean',{fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(w,h,o,'Noise level per chunk and step');$('va-af-cap').textContent=s.cap}
  RD.seg($('va-af-mode'),v=>{af=v;afDraw()});RD.onRender(afDraw);RD.onResize(afDraw);
})();
