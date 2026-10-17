// ---- Reading, sections 8 and 9: resolution images, cost table, measured U-Net time against FLOPs, profile summary; then fill numbers and wire predict cards ----
(function(){
  const U=window.LDU,L=U.L,$=id=>document.getElementById(id);
  // ------------------------------------------------ resolution images
  (function(){
    const R=L.res_imgs||{},sizes=Object.keys(R).map(Number).sort((a,b)=>a-b);if(!sizes.length)return;
    const br={};((L.sd&&L.sd.bigres)||[]).forEach(r=>br[r.px]=r);
    const pick=$('ld-res-pick');pick.innerHTML=sizes.map(s=>'<button data-m="'+s+'"'+(s===512?' class="on"':'')+'>'+s+' &times; '+s+'</button>').join('');
    function show(s){s=+s;$('ld-res-img').innerHTML='<img src="'+R[s]+'" alt="SD 1.5 at '+s+' pixels">';
      const r=br[s];$('ld-res-note').innerHTML='"a photograph of a golden retriever puppy sitting on grass", seed 3, 25 DPM-Solver++ steps, guidance 7.5, SD 1.5 float16'+(r?': '+U.fx(r.sec,1)+' s on the laptop\'s GPU'+(r.vae_tiling?', VAE decoded in tiles':''):'')+'; latent '+(s/8)+' &times; '+(s/8)+'. Shown as a 256-pixel thumbnail whatever the size. At 512 this is the topic\'s test image g04. <span class="meas">measured on Apple M1 Pro (MPS)</span>'}
    RD.seg(pick,show);show(512);
  })();
  // ------------------------------------------------ cost table at 1024
  (function(){
    const P=L.pipe,C=L.pub.cards;
    const rows=[['SD 1.5 (trained at 512)','sd15',P.sd15.num_inference_steps,2],['SDXL','sdxl',P.sdxl.num_inference_steps,2],['DiT-XL/2 (trained at 256)','dit',P.dit.num_inference_steps,2],
      ['PixArt-&Sigma;','pixart',P.pixart.num_inference_steps,2],['Sana 1.6B','sana',P.sana.num_inference_steps,2],['SD3 Medium','sd3m',P.sd3.num_inference_steps,2],['SD3.5 Large','sd35l',P.sd3.num_inference_steps,2],
      ['FLUX.1 [dev] (guidance-distilled)','flux1',P.flux1.num_inference_steps,1],['FLUX.1 [schnell] (card: 1 to 4 steps)','flux1',4,1],['FLUX.2 [klein] 4B (card)','flux2k',C.flux2_klein_4b.steps,1],
      ['Qwen-Image (true CFG 4.0)','qwen',P.qwen.num_inference_steps,2],['Z-Image-Turbo (card: 8 forwards)','zimg',C.zimage_turbo.forwards,1]];
    $('ld-costtab').querySelector('tbody').innerHTML=rows.map(r=>{const g=U.grid(r[1],1024),f=L.flops[r[1]];const N=U.tokens(r[1],1024,1024);
      return '<tr><td>'+r[0]+'</td><td data-h="Tokens">'+U.int(N)+(U.byKey[r[1]].kind==='unet'?' positions':'')+(f.T?' + '+f.T:'')+'</td><td data-h="FLOPs per pass">'+U.FL(g[2])+'</td><td data-h="Steps &times; passes">'+r[2]+' &times; '+r[3]+'</td><td data-h="Per image">'+U.FL(g[2]*r[2]*r[3])+'</td></tr>'}).join('');
    // the steps predict
    const S3=U.grid('sd35l',1024),S77=U.grid('sd35l',1024,77);
    U.setAns('ld-pr-steps','Counted: one SD3.5 Large pass at 1024 is '+U.FL(S3[2])+' with 333 text tokens and '+U.FL(S77[2])+' with 77, so the shorter prompt saves only '+U.pct(1-S77[2]/S3[2],0)+'. Dropping T5 saves its one encoder pass per prompt (memory, not compute). Halving the steps halves the denoiser bill, and so does replacing two guided passes by one (guidance distillation, as in FLUX.1 [dev], or a distilled few-step model). The cost of an image is steps &times; passes &times; FLOPs per pass; attack the factor that is largest.');
  })();
  // ------------------------------------------------ measured U-Net time vs counted FLOPs
  (function(){
    const R=(L.sd&&L.sd.res_sweep)||[];const el=$('ld-m1-svg');if(!R.length){el.innerHTML='';return}
    const pts=R.map(r=>{const g=U.grid('sd15',r.px)||[r.px,77,U.flops('sd15',(r.px/8)**2),0];return {px:r.px,s:r.unet_s,f:g[2],a:g[3]/g[2],tf:g[2]/r.unet_s/1e12,mem:r.driver_mb_after}});
    function draw(){const W=Math.min(860,Math.max(300,el.clientWidth||600)),H=230,l=48,r=48,t=14,b=34;
      const xs=pts.map(p=>p.px),mx=Math.max(...pts.map(p=>p.s))*1.1,mt=Math.max(...pts.map(p=>p.tf))*1.2;
      const X=v=>l+(v-200)/(1080-200)*(W-l-r),Y=v=>t+(1-v/mx)*(H-t-b),Y2=v=>t+(1-v/mt)*(H-t-b);let s='';
      [0,mx/2,mx].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+3,U.fx(v,v<1?2:1)+' s',{a:'end',fs:10,fill:'var(--c1)'})});
      [0,mt/2,mt].forEach(v=>{s+=RD.t(W-r+4,Y2(v)+3,U.fx(v,1),{fs:10,fill:'var(--c2)'})});
      xs.forEach(v=>s+=RD.t(X(v),H-b+14,v,{a:'middle',fs:10,fill:'var(--mute)'}));
      s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+pts.map(p=>X(p.px)+','+Y(p.s)).join(' ')+'"/>'+pts.map(p=>'<circle cx="'+X(p.px)+'" cy="'+Y(p.s)+'" r="3.5" fill="var(--c1)"/>').join('');
      s+='<polyline fill="none" stroke="var(--c2)" stroke-width="1.5" stroke-dasharray="4 3" points="'+pts.map(p=>X(p.px)+','+Y2(p.tf)).join(' ')+'"/>';
      s+=RD.t((l+W-r)/2,H-4,'image side in pixels (one U-Net pass, batch 1)',{a:'middle',fs:10.5,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'SD 1.5 U-Net time per pass against image size')}
    draw();RD.onResize(draw);RD.onRender(draw);
    const a=pts[0],z=pts[pts.length-1],m=pts.find(p=>p.px===512);
    $('ld-m1-note').innerHTML='<span style="color:var(--c1)">&#9679;</span> seconds per pass (median of 3), <span style="color:var(--c2)">- -</span> achieved TFLOP/s (counted FLOPs / time, right axis). '+pts.map(p=>p.px+': '+U.fx(p.s,3)+' s, '+U.FL(p.f)+', '+U.fx(p.tf,2)+' TFLOP/s').join('; ')+'. The pass at '+z.px+' does '+U.fx(z.f/a.f,1)+' times the FLOPs of '+a.px+' and takes '+U.fx(z.s/a.s,1)+' times as long. At 512 the batch-1 pass takes '+U.fx(m.s,3)+' s here (the Diffusion lab measured 0.319 s in its own process). <span class="meas">measured on Apple M1 Pro (MPS), float16, attention slicing</span>';
  })();
  // ------------------------------------------------ profile summary
  (function(){
    const P=L.sd&&L.sd.prof;if(!P)return;const k=P.kind,tot=k.total_s,parts=k.parts_s;
    const sh=n=>U.pct(parts[n]/tot,0);
    $('ld-prof-sum').innerHTML='self-attention takes '+sh('self-attention (attn1)')+' of the hooked pass, ResNet blocks '+sh('ResNet blocks')+', feed-forward '+sh('feed-forward (ff)')+', cross-attention '+sh('cross-attention (attn2)')+' (medians of 5; '+U.fx(tot*1000,0)+' ms with hooks, '+U.fx(L.sd.prof_plain_s*1000,0)+' ms without). <span class="meas">measured on Apple M1 Pro (MPS), float16, attention slicing</span> Self-attention holds '+U.pct(U.byKey.sd15.cats.attn_img/U.byKey.sd15.params,0)+' of the parameters.';
  })();
  // small fills
  (function(){const t=L.te;if(t&&t.cos_last_penult){const v=t.cos_last_penult.slice(1);$('ld-clipskip').textContent=U.fx(Math.min(...v),2)+' to '+U.fx(Math.max(...v),2)}
    const pk=L.sd&&L.sd.peak_mps_mb;$('ld-peak').textContent=pk?U.int(pk)+' MiB (MPS driver)':'not recorded'})();
  U.fill();U.wirePredicts();
})();
