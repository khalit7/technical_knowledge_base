// ---- Reading section 10: what one text-to-image sample costs, counted (pipeline of section 4; f = 8 autoencoder, DiT patch 2) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-cost-card'))return;
  const L=(window.RDG&&window.RDG.lab)||{};
  if(L.sd_sec_per_pass&&!$('rd-c-sec').value)$('rd-c-sec').value=L.sd_sec_per_pass;
  const f=n=>n.toLocaleString('en-US');
  function upd(){
    const R=+$('rd-c-res').value,C=+$('rd-c-ch').value,S=+$('rd-c-steps').value,G=+$('rd-c-cfg').value;
    const h=R/8,lat=h*h*C,px=R*R*3,tok=(h/2)*(h/2);
    const calls=S*(G?2:1),base=100;
    const sec=parseFloat($('rd-c-sec').value);
    $('rd-c-out').innerHTML=RD.stat('Latent',h+' &times; '+h+' &times; '+C,f(lat)+' numbers, '+(px/lat).toFixed(0)+'&times; fewer than pixels')+
      RD.stat('DiT tokens',f(tok),'patches of 2 &times; 2 latent cells')+
      RD.stat('Denoiser passes',f(calls),S+' steps &times; '+(G?2:1))+
      RD.stat('Against 50 steps with CFG',(calls>=base?(calls===base?'the same':(calls/base).toFixed(1)+'&times; more'):(base/calls).toFixed(base/calls<10?1:0)+'&times; fewer'),calls+' vs 100 passes')+
      RD.stat('Time in the denoiser',isFinite(sec)&&sec>0?(calls*sec).toFixed(2)+' s':'enter a time',G?'passes &times; seconds per pass; a step\'s two passes batched together take less on a GPU with room to spare':'passes &times; seconds per pass');
    $('rd-c-note').innerHTML='<span class="der">derived</span> latent side = image side / 8; DiT tokens = (latent side / 2)<sup>2</sup>, so a 1024 image is 4,096 tokens and attention costs 16 times a 512 image\'s per layer; passes = steps &times; 2 with guidance. Plus once per image: the text encoder (twice with guidance) and the VAE decoder. '+
      (L.sd_sec_per_pass?'Default time: Stable Diffusion v1.5 U-Net, '+L.sd_sec_per_pass+' s per pass, <span class="meas">measured</span> on Apple M1 Pro (MPS, fp16) by the Diffusion lab.':'<span class="rd-todo">TODO (Diffusion lab): default seconds per pass from the measured Stable Diffusion v1.5 run.</span>');
  }
  ['rd-c-res','rd-c-ch','rd-c-steps','rd-c-cfg','rd-c-sec'].forEach(id=>$(id).addEventListener('input',upd));
  upd();
})();
