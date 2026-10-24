// ---- Reading: predict buttons, sprite tiles (AVL, the Latent lab data this page reuses), hero, latent spaces,
// random-code samples, interpolation, the beta slider, the loss-units strips and the three-loss toggle ----
// Every number in the prose is written into the HTML at build time (src/fill_static.py); scripts only draw.
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc,L=window.AVL,D=window.AVD;
  // predict-then-reveal
  document.querySelectorAll('.avp .pr').forEach(pr=>pr.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');if(x===b&&x.dataset.ok!=='1')x.classList.add('wrong')});pr.querySelector('.ans').hidden=false}));
  // sprites: L.img[name] = {uri, w (tile px), cols, rows?}; each image loads once
  const IMG={};
  function sprite(name,cb){const s=L.img[name];if(!s)throw new Error('av: no sprite '+name);
    let im=IMG[name];if(!im){im=new Image();IMG[name]=im;im.src=s.uri}
    if(im.complete&&im.naturalWidth)cb(im,s);else im.addEventListener('load',()=>cb(im,s),{once:true})}
  function tile(cv,name,k){sprite(name,(im,s)=>{cv.width=s.w;cv.height=s.w;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
    const r=Math.floor(k/s.cols),q=k%s.cols;c.clearRect(0,0,s.w,s.w);c.drawImage(im,q*s.w,r*s.w,s.w,s.w,0,0,s.w,s.w)})}
  const cvs=(n,alt)=>Array.from({length:n},(_,i)=>'<canvas class="av-t" role="img" aria-label="'+esc(alt+' '+(i+1))+'"></canvas>').join('');
  function row(el,name,rowKey,n,alt,first){const s=L.img[name],r=s.rows[rowKey];el.innerHTML=cvs(n,alt);
    el.querySelectorAll('canvas').forEach((cv,i)=>tile(cv,name,r*s.cols+(first||0)+i))}
  window.AVS={sprite,tile,row,cvs};
  if(!L)return;
  // hero: four test images in, three models out
  document.querySelectorAll('[data-hq]').forEach(el=>{const k=el.dataset.hq;el.innerHTML=cvs(4,k==='orig'?'test image':k+' reconstruction');
    el.querySelectorAll('canvas').forEach((cv,i)=>tile(cv,'rec',L.img.rec.rows[k]*16+[0,1,7,9][i]))});
  // static rows of tiles: data-row="sprite:row"
  document.querySelectorAll('[data-row]').forEach(el=>{const [n,r]=el.dataset.row.split(':');row(el,n,r,8,r)});
  // section 2: the two 2-D latent spaces
  const CLS=['T-shirt/top','Trouser','Pullover','Dress','Coat','Sandal','Shirt','Sneaker','Bag','Ankle boot'];
  const COL=['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac'];
  const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const lab=b64(L.scatter.labels),pts={ae2:b64(L.scatter.ae2),vae2:b64(L.scatter.vae2)};
  $('av-scat-leg').innerHTML=CLS.map((c,i)=>'<span><i style="background:'+COL[i]+'"></i>'+c+'</span>').join('');
  let smode='pts';
  function scat(name){
    const g=L.runs[name].grid,cv=$('av-scat-'+name),W=Math.min(RD.width(cv.parentElement),340),dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.round(W*dpr);cv.height=Math.round(W*dpr);cv.style.width=W+'px';cv.style.height=W+'px';
    const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);const cs=getComputedStyle(document.body);
    const ink=cs.getPropertyValue('--ink').trim()||'#333';c.fillStyle=cs.getPropertyValue('--soft').trim()||'#f7f6f3';c.fillRect(0,0,W,W);
    const toUV=(z1,z2)=>[(z1-g.lo[0])/(g.hi[0]-g.lo[0]),(g.hi[1]-z2)/(g.hi[1]-g.lo[1])];
    const circle=()=>{const o=toUV(0,0),r=Math.abs(toUV(2,0)[0]-o[0])*W;c.strokeStyle=ink;c.lineWidth=1.5;c.setLineDash([4,3]);c.beginPath();c.arc(o[0]*W,o[1]*W,Math.max(r,2),0,7);c.stroke();c.setLineDash([]);
      c.fillStyle=ink;c.font='11px ui-sans-serif,-apple-system,sans-serif';c.fillText('N(0, I)',Math.min(W-44,o[0]*W+Math.max(r,3)+3),Math.max(12,o[1]*W-Math.max(r,3)))};
    if(smode==='grid'){sprite('grid_'+name,(im,s)=>{c.imageSmoothingEnabled=false;c.drawImage(im,0,0,s.cols*s.w,s.cols*s.w,0,0,W,W);circle()});return}
    const P=pts[name];for(let i=0;i<lab.length;i++){c.fillStyle=COL[lab[i]];c.globalAlpha=.8;c.beginPath();c.arc(P[2*i]/255*W,P[2*i+1]/255*W,2.2,0,7);c.fill()}c.globalAlpha=1;circle();
  }
  const drawScat=()=>{scat('ae2');scat('vae2')};
  RD.seg($('av-scat-mode'),v=>{smode=v;drawScat()});
  // interpolation: sprite 'interp', rows per pair: pixel, ae16, vae16 (9 frames each)
  let pair=0;
  function interp(){document.querySelectorAll('[data-ip]').forEach(el=>{const m=+el.dataset.ip;el.innerHTML=cvs(9,['pixels','autoencoder','VAE'][m]+' t');
    el.querySelectorAll('canvas').forEach((cv,k)=>tile(cv,'interp',(pair*3+m)*9+k))})}
  RD.seg($('av-ip-pair'),v=>{pair=+v;interp()});interp();
  // section 5: the beta slider over five recorded runs
  const BK=['vae16_b0p1','vae16_b0p3','vae16_b1p0','vae16_b3p0','vae16_b10p0'],BV=['0.1','0.3','1','3','10'];
  function beta(){const i=+$('av-beta').value,k=BK[i],r=L.runs[k];$('av-beta-v').textContent=BV[i];
    row($('av-beta-rec'),'beta',k,8,'reconstruction at beta '+BV[i]);row($('av-beta-pri'),'beta',k+'_prior',8,'random code at beta '+BV[i]);
    $('av-beta-cnt').innerHTML=RD.stat('KL',r.test_kl_nats.toFixed(2)+' nats','what the code carries')+RD.stat('Reconstruction',r.test_nll_nats.toFixed(1)+' nats',r.test_psnr_db.toFixed(2)+' dB PSNR')+
      RD.stat('Active units',r.active_units+' of 16')+RD.stat('Prior FD',Math.round(r.prior.fd).toLocaleString('en-GB'),'random-code samples; floor '+L.floor.fd)}
  $('av-beta').addEventListener('input',beta);beta();
  // section 4: reconstructions under each loss's units
  (function(){const I=D.img,im=(s,a)=>'<img class="av-img" src="'+s+'" alt="'+esc(a)+'">';
    let st='<div class="av-rowlab">Test images</div><div class="av-strip">'+I.orig16.slice(0,8).map((s,i)=>im(s,'test '+(i+1))).join('')+'</div>';
    [['vae16_b1p0','Reference VAE'],['e_meanred','Mean over pixels'],['e_mse_s1','Squared error, sigma 1'],['e_mse_s0p1','Squared error, sigma 0.1']].forEach(([k,lb])=>{
      st+='<div class="av-rowlab">'+esc(lb)+'</div><div class="av-strip">'+I.elbo[k+'_rec16'].slice(0,8).map((s,i)=>im(s,lb+' '+(i+1))).join('')+'</div>'});
    $('av-elbo-strips').innerHTML=st})();
  // section 7: pixel loss, + LPIPS, + GAN on the same images (a toggle of three end states)
  (function(){const Q=D.quant.runs,I=D.img,keys=['vq_restart','g_lpips','g_lpips_gan'],names=['Pixel loss only','+ LPIPS perceptual loss','+ LPIPS + patch GAN from step 2,500'];
    const g=k=>Q[k];
    const CAP=['Pixel loss, codebook and commitment losses, dead-code restarts. Edges and prints come out soft.',
      'LPIPS added: PSNR falls from '+g('vq_restart').test_psnr_db.toFixed(2)+' to '+g('g_lpips').test_psnr_db.toFixed(2)+' dB while the reconstructions look closer to real garments; rFD, in a different network, drops from '+g('vq_restart').rfd.toFixed(1)+' to '+g('g_lpips').rfd.toFixed(1)+'. The perception-distortion trade-off in one step.',
      'The patch GAN kept LPIPS about the same ('+g('g_lpips_gan').lpips_2000.toFixed(3)+') but did not improve rFD at this scale ('+g('g_lpips_gan').rfd.toFixed(1)+' against '+g('g_lpips').rfd.toFixed(1)+') and cost a little more PSNR: on 28 x 28 grey images there is little texture for a discriminator to teach.'];
    $('av-gan-strip').innerHTML='<div class="av-strip">'+I.orig16.slice(0,8).map((s,i)=>'<img class="av-img" src="'+s+'" alt="test '+(i+1)+'">').join('')+'</div><div class="av-strip" id="av-gan-rec"></div>';
    function draw(i){const r=Q[keys[i]];
      $('av-gan-rec').innerHTML=I.quant[keys[i]].slice(0,8).map((s,j)=>'<img class="av-img" src="'+s+'" alt="'+esc(names[i])+' '+(j+1)+'">').join('');
      $('av-gan-cap').innerHTML='<div class="t">'+esc(names[i])+'</div><p>'+CAP[i]+'</p>';
      $('av-gan-cnt').innerHTML=RD.stat('PSNR',r.test_psnr_db.toFixed(2)+' dB','higher: closer in pixels')+RD.stat('LPIPS',r.lpips_2000.toFixed(3),'lower: closer in features')+RD.stat('rFD',r.rfd.toFixed(1),'lower: reconstructions look like the data')}
    RD.seg($('av-gan-mode'),v=>draw(+v));draw(0)})();
  // section 11: noising scaled against raw, and the three wrong-factor sets
  (function(){const TS=[0,300,600,999];let m='scaled';
    function nz(){const el=$('av-nz-figs');el.innerHTML=TS.map(t=>'<figure><canvas class="av-t" role="img" aria-label="'+m+' latent at t = '+t+'"></canvas><figcaption>t = '+t+': '+L.sd.noising[String(t)]['psnr_'+m].toFixed(1)+' dB</figcaption></figure>').join('');
      el.querySelectorAll('canvas').forEach((cv,i)=>tile(cv,'sd_noise_'+m+'_'+TS[i],0))}
    RD.seg($('av-nz-mode'),v=>{m=v;nz()});nz();
    const S=[['sd_dec_right','Decoded correctly'],['sd_dec_forgot_divide','Forgot to divide'],['sd_dec_divided_raw','Divided twice'],
      ['sd_i2i_0p18215','img2img, factor 0.18215'],['sd_i2i_0p13025','img2img, factor 0.13025'],['sd_i2i_1p0','img2img, factor 1'],
      ['sd_t2i_div_0p18215','text-to-image, divided by 0.18215'],['sd_t2i_div_1p0','text-to-image, not divided'],['sd_t2i_div_0p13025','text-to-image, divided by 0.13025']];
    const el=$('av-sd-wrong');el.innerHTML=S.map(([k,c])=>'<figure><canvas class="av-t" role="img" aria-label="'+esc(c)+'"></canvas><figcaption>'+esc(c)+'</figcaption></figure>').join('');
    el.querySelectorAll('canvas').forEach((cv,i)=>tile(cv,S[i][0],0))})();
  // section 11: channels crops (SD 1.5 against FLUX.2) from the comparator's recordings
  (function(){const T=D.tok;if(!T||!T.crops)return;let img=T.crop_images.includes('s03_text')?'s03_text':T.crop_images[0];
    $('av-ch-img').innerHTML=T.crop_images.map(c=>'<button data-m="'+c+'"'+(c===img?' class="on"':'')+'>'+esc(T.crop_names[c])+'</button>').join('');
    function draw(){const cr=T.crops[img],pi=T.images.indexOf(img),M=T.m;
      $('av-ch-crops').innerHTML='<figure><img src="'+cr.orig+'" alt="original crop"><figcaption>Original</figcaption></figure>'+
        ['sd15_fp32','flux2_fp32'].map(k=>'<figure><img src="'+cr[k]+'" alt="'+esc(M[k].label)+' crop"><figcaption>'+esc(M[k].short)+' ('+M[k].latent_shape.join(' x ')+'): '+M[k].per[pi].psnr.toFixed(1)+' dB on this image</figcaption></figure>').join('')}
    RD.seg($('av-ch-img'),v=>{img=v;draw()});draw()})();
  // section 12: same PSNR, different picture
  (function(){let k='p01_cat';
    function draw(){const P=L.perc.images[k];const el=$('av-perc-figs');
      el.innerHTML=[['orig','Original'],['rec','SD 1.5 reconstruction: '+P.psnr_rec.toFixed(2)+' dB, SSIM '+P.ssim_rec.toFixed(3)+', feature distance '+P.feat_cos_dist_rec.toFixed(4)],['blur','Blur, sigma '+P.blur_sigma.toFixed(2)+' px: '+P.psnr_blur.toFixed(2)+' dB, SSIM '+P.ssim_blur.toFixed(3)+', feature distance '+P.feat_cos_dist_blur.toFixed(4)]]
        .map(([s,c])=>'<figure><canvas class="av-t" style="width:100%;height:auto" role="img" aria-label="'+esc(c)+'"></canvas><figcaption>'+esc(c)+'</figcaption></figure>').join('');
      el.querySelectorAll('canvas').forEach((cv,i)=>sprite('sd_'+k+'_'+['orig','rec','blur'][i],(im,s)=>{cv.width=s.w;cv.height=s.w;const c=cv.getContext('2d');c.imageSmoothingEnabled=true;c.drawImage(im,0,0)}));
      $('av-perc-note').textContent=P.feat_cos_dist_rec<P.feat_cos_dist_blur?'Equal PSNR, but the reconstruction is closer in deep features: the decoder redraws detail the blur erases.':'Here the blur wins on every measure: the decoder\'s errors on flat graphics are small artefacts along edges.'}
    RD.seg($('av-perc-img'),v=>{k=v;draw()});draw()})();
  RD.onRender(drawScat);RD.onResize(drawScat);drawScat();
})();
