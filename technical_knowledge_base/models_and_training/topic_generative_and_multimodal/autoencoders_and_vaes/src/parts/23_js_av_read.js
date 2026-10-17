// ---- Reading tab: numbers filled from the recorded data (AVD), predict buttons, tables and the loss animation ----
(function(){
  const esc=RD.esc;
  const ROOTS={lt:AVD.lt,elbo:AVD.elbo.runs,pc:AVD.pc.runs,quant:AVD.quant,derived:AVD.derived,tok:AVD.tok.m};
  function get(path){const p=path.split('.');let o=ROOTS[p[0]];for(let i=1;i<p.length&&o!=null;i++)o=o[p[i]];return o}
  window.AVGET=get;
  const fmt=(v,f)=>typeof v!=='number'?String(v):f==='int'?Math.round(v).toLocaleString('en-GB'):f==='pct'?(100*v).toFixed(0)+'%':v>=1000?v.toLocaleString('en-GB'):String(v);
  document.querySelectorAll('[data-av]').forEach(s=>{const v=get(s.dataset.av);s.textContent=v==null?'?':fmt(v,s.dataset.f);if(v==null)s.style.color='var(--bad)'});
  // predict-then-reveal
  document.querySelectorAll('.avp .pr').forEach(pr=>pr.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');if(x===b&&x.dataset.ok!=='1')x.classList.add('wrong')});pr.querySelector('.ans').hidden=false}));
  // section 2: ELBO-units table
  const L=AVD.lt,E=AVD.elbo.runs;
  (function(){
    const rows=[['Latent lab VAE, &beta; = 1 (reference)','Bernoulli, summed over pixels',L.vae16_b1p0.test_kl_nats,L.vae16_b1p0.active_units,L.vae16_b1p0.test_psnr_db,L.vae16_b1p0.prior_fd],
      ['Mean over pixels','Bernoulli, averaged over the 1,024 pixels',E.e_meanred.test_kl_nats,E.e_meanred.active_units,E.e_meanred.test_psnr_db,E.e_meanred.prior_fd],
      ['Squared error, &sigma; = 1','Gaussian, &Sigma;(x &minus; x&#770;)<sup>2</sup> / 2',E.e_mse_s1.test_kl_nats,E.e_mse_s1.active_units,E.e_mse_s1.test_psnr_db,E.e_mse_s1.prior_fd],
      ['Squared error, &sigma; = 0.1','Gaussian, &Sigma;(x &minus; x&#770;)<sup>2</sup> / 0.02',E.e_mse_s0p1.test_kl_nats,E.e_mse_s0p1.active_units,E.e_mse_s0p1.test_psnr_db,E.e_mse_s0p1.prior_fd]];
    let h='<thead><tr><th>Reconstruction term</th><th>Likelihood</th><th class="num">KL nats</th><th class="num">Active of 16</th><th class="num">PSNR dB</th><th class="num">Prior FD</th></tr></thead><tbody>';
    rows.forEach(r=>h+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2].toFixed(2)+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4].toFixed(2)+'</td><td class="num">'+r[5].toFixed(0)+'</td></tr>');
    document.getElementById('av-elbo-tab').innerHTML=h+'</tbody>';
    const im=(s,a)=>'<img class="av-img" src="'+s+'" alt="'+a+'">';
    const I=AVD.img;let st='<div class="av-rowlab">Test images</div><div class="av-strip">'+I.orig16.slice(0,8).map((s,i)=>im(s,'test '+i)).join('')+'</div>';
    [['vae16_b1p0','Reference VAE: reconstructions'],['e_meanred','Mean over pixels: reconstructions'],['e_mse_s1','Squared error, sigma 1: reconstructions'],['e_mse_s0p1','Squared error, sigma 0.1: reconstructions']].forEach(([k,lab])=>{
      st+='<div class="av-rowlab">'+lab+'</div><div class="av-strip">'+I.elbo[k+'_rec16'].slice(0,8).map((s,i)=>im(s,lab+' '+i)).join('')+'</div>'});
    document.getElementById('av-elbo-strips').innerHTML='<div class="rd-card"><h4>The same eight test images through each loss</h4>'+st+'<p class="av-note">Decoded from the posterior mean. <span class="meas">measured</span></p></div>';
  })();
  // section 3: posterior-collapse table
  (function(){
    const P=AVD.pc.runs;const nm={c_b1:'Plain ELBO',c_anneal:'KL annealing (0 to 1 over 2,500 steps)',c_freebits:'Free bits, &lambda; = 0.5 nats per dimension',c_noz:'No code (pure PixelCNN)'};
    let h='<thead><tr><th>Run</th><th class="num">KL</th><th class="num">Active of 16</th><th class="num">Reconstruction (own code)</th><th class="num">Code\'s worth</th><th class="num">Negative ELBO</th></tr></thead><tbody>';
    Object.keys(nm).forEach(k=>{const r=P[k];if(!r)return;h+='<tr><td>'+nm[k]+'</td><td class="num">'+r.kl_nats.toFixed(2)+'</td><td class="num">'+r.active_units+'</td><td class="num">'+r.nll_mu.toFixed(1)+'</td><td class="num">'+r.z_gain_nats.toFixed(1)+'</td><td class="num">'+r.neg_elbo.toFixed(1)+'</td></tr>'});
    h+='<tr><td>Latent lab VAE (ordinary decoder), for scale</td><td class="num">'+L.vae16_b1p0.test_kl_nats.toFixed(2)+'</td><td class="num">'+L.vae16_b1p0.active_units+'</td><td class="num">'+L.vae16_b1p0.test_nll_nats.toFixed(1)+'</td><td class="num">n/a</td><td class="num">'+L.vae16_b1p0.test_neg_elbo_nats_beta1.toFixed(1)+'</td></tr>';
    document.getElementById('av-pc-tab').innerHTML=h+'</tbody>';
  })();
  // section 5: VQ table
  (function(){
    const Q=AVD.quant.runs;const rows=[['vq_plain','VQ, plain (lab)'],['vq_restart','VQ + restarts (lab)'],['q_vq_ema','VQ, EMA codebook'],['q_vq_l2','VQ, L2-normalised codes'],['q_vq1024_plain','VQ, plain, K = 1,024'],['q_vq1024_restart','VQ + restarts, K = 1,024']];
    let h='<thead><tr><th>Variant</th><th class="num">K</th><th class="num">Codes used</th><th class="num">Perplexity</th><th class="num">PSNR dB</th><th class="num">rFD</th></tr></thead><tbody>';
    rows.forEach(([k,n])=>{const r=Q[k];if(!r)return;h+='<tr><td>'+n+'</td><td class="num">'+r.K.toLocaleString('en-GB')+'</td><td class="num">'+r.codes_used_test.toLocaleString('en-GB')+'</td><td class="num">'+r.perplexity+'</td><td class="num">'+r.test_psnr_db.toFixed(2)+'</td><td class="num">'+r.rfd.toFixed(1)+'</td></tr>'});
    document.getElementById('av-vq-tab').innerHTML=h+'</tbody>';
  })();
  // section 4: the same images through pixel loss, + LPIPS, + GAN (a three-step before/after)
  (function(){
    const Q=AVD.quant.runs,I=AVD.img,keys=['vq_restart','g_lpips','g_lpips_gan'],names=['Pixel loss only (the lab\'s vq_restart)','+ LPIPS perceptual loss','+ LPIPS + patch GAN from step 2,500'];
    const g=k=>AVD.quant.runs[k];
    const GSTEP=['The tokenizer as the Latent lab trained it: Bernoulli pixel loss, codebook and commitment losses, dead-code restarts. Edges and prints come out soft.',
      'The same tokenizer with an LPIPS term added (AlexNet features of the two images, weighted per pixel as in the LDM loss). PSNR falls from '+g('vq_restart').test_psnr_db.toFixed(2)+' to '+g('g_lpips').test_psnr_db.toFixed(2)+' dB while the reconstructions look closer to real garments: rFD, measured with a different network (the topic classifier), drops from '+g('vq_restart').rfd.toFixed(1)+' to '+g('g_lpips').rfd.toFixed(1)+'. The perception-distortion trade-off in one step.',
      'Adding the patch GAN from step 2,500 kept LPIPS about the same ('+g('g_lpips_gan').lpips_2000.toFixed(3)+') but did not improve rFD at this scale ('+g('g_lpips_gan').rfd.toFixed(1)+' against '+g('g_lpips').rfd.toFixed(1)+' without it) and cost a little more PSNR. On 28 x 28 grey images with 2,500 adversarial steps the discriminator has little texture to teach; the GAN term earns its place on real photographs, where LPIPS alone still leaves textures smooth.'];
    const strip=document.getElementById('av-gan-strip');
    strip.innerHTML='<div class="av-strip">'+I.orig16.slice(0,8).map((s,i)=>'<img class="av-img" src="'+s+'" alt="test '+i+'">').join('')+'</div><div class="av-strip" id="av-gan-rec"></div>';
    function draw(i){
      const k=keys[i],r=Q[k];
      document.getElementById('av-gan-rec').innerHTML=I.quant[k].slice(0,8).map((s,j)=>'<img class="av-img" src="'+s+'" alt="'+names[i]+' '+j+'">').join('');
      document.querySelectorAll('#av-gan-mode button').forEach((b,j)=>b.classList.toggle('on',j===i));
      document.getElementById('av-gan-cap').innerHTML='<div class="t">'+names[i]+'</div><p>'+GSTEP[i]+'</p>';
      document.getElementById('av-gan-cnt').innerHTML=RD.stat('PSNR',r.test_psnr_db.toFixed(2)+' dB','higher is closer in pixels')+RD.stat('LPIPS',r.lpips_2000.toFixed(3),'lower is closer in features')+RD.stat('rFD',r.rfd.toFixed(1),'lower: reconstructions look like the data');
    }
    const an=RD.anim({card:'av-gan-card',ctl:'av-gan-ctl',n:3,draw,ms:2200,label:'Loss'});
    document.getElementById('av-gan-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(b)an.go(+b.dataset.m)});
  })();
})();
