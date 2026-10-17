// ---- Latent lab: the SD 1.5 autoencoder (section 8) and the scaling factor (section 9) ----
(function(){if(!window.LT)return;
  const L=window.LT,D=L.D,$=L.$,V=D.sd_vae,P=D.perc,SC=D.sd_scale;
  const S=0.18215;
  const im=(k,alt,w)=>'<img src="'+D.img[k].uri+'" width="'+(w||D.img[k].w)+'" height="'+(w||D.img[k].w)+'" alt="'+L.esc(alt)+'">';
  // PSNR table, all 16 images
  const KEYS=Object.keys(V.images);
  $('lt-sd-tab').innerHTML='<table class="lt-t"><thead><tr><th>image</th><th class="num">PSNR fp32</th><th class="num">SSIM fp32</th><th class="num">PSNR fp16</th><th class="num">latent std</th><th class="num">posterior &#963;</th></tr></thead><tbody>'+
    KEYS.map(k=>{const r=V.images[k];return '<tr><td>'+k+'</td><td class="num">'+r.fp32.psnr.toFixed(1)+'</td><td class="num">'+r.fp32.ssim.toFixed(3)+'</td><td class="num">'+r.fp16.psnr.toFixed(1)+'</td><td class="num">'+r.latent_std.toFixed(2)+'</td><td class="num">'+r.posterior_std_mean.toFixed(4)+'</td></tr>'}).join('')+'</tbody></table>';
  {const ps=KEYS.map(k=>V.images[k].fp32.psnr),ss=KEYS.map(k=>V.images[k].fp32.ssim),dd=KEYS.map(k=>Math.abs(V.images[k].fp32.psnr-V.images[k].fp16.psnr));
   const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;const lo=KEYS[ps.indexOf(Math.min(...ps))],hi=KEYS[ps.indexOf(Math.max(...ps))];
   $('lt-sd-st').innerHTML=L.stat('Mean PSNR, 16 images',mean(ps).toFixed(1)+' dB','from '+Math.min(...ps).toFixed(1)+' ('+lo+') to '+Math.max(...ps).toFixed(1)+' ('+hi+')')+L.stat('Mean SSIM',mean(ss).toFixed(3),'1 = identical')+
     L.stat('fp16 against fp32','&#916; '+Math.max(...dd).toFixed(2)+' dB at most',KEYS.some(k=>V.images[k].fp16.nan)?'NaNs found':'no NaNs')+L.stat('Round trip, 512 px',V.fp32.sec_per_image_round_trip.toFixed(2)+' s fp32',V.fp16.sec_per_image_round_trip.toFixed(2)+' s fp16; peak '+(V.fp32.peak_mps_mb/1024).toFixed(1)+' GB')}
  // crops: original, reconstruction, PSNR-matched blur
  const CK=['p04_hubble','p01_cat','s03_text'];let ck='p04_hubble';
  const cs=$('lt-sd-crop-pick');cs.innerHTML=CK.map((k,i)=>'<button data-v="'+k+'" class="'+(i?'':'on')+'" aria-pressed="'+(i?'false':'true')+'">'+k+'</button>').join('');
  function crop(){const p=P.images[ck],r=V.images[ck];
    $('lt-sd-crop').innerHTML='<figure>'+im('sd_'+ck+'_orig','original crop',112)+'<figcaption>original (crop)</figcaption></figure><figure>'+im('sd_'+ck+'_rec','SD VAE reconstruction crop',112)+'<figcaption>SD VAE round trip: '+p.psnr_rec.toFixed(1)+' dB, SSIM '+p.ssim_rec.toFixed(3)+', feature distance '+p.feat_cos_dist_rec.toFixed(4)+'</figcaption></figure><figure>'+im('sd_'+ck+'_blur','blurred crop',112)+'<figcaption>Gaussian blur (&#963; '+p.blur_sigma.toFixed(2)+' px) with the same PSNR: '+p.psnr_blur.toFixed(1)+' dB, SSIM '+p.ssim_blur.toFixed(3)+', feature distance '+p.feat_cos_dist_blur.toFixed(4)+'</figcaption></figure>'}
  L.seg(cs,v=>{ck=v;crop()});crop();
  // latent stats
  // SNR curves
  const betas=[],abar=[];{let a=1;const b0=Math.sqrt(0.00085),b1=Math.sqrt(0.012);for(let t=0;t<1000;t++){const b=Math.pow(b0+(b1-b0)*t/999,2);betas.push(b);a*=1-b;abar.push(a)}}
  const r5=V.noising['500'],Ps=r5.snr_scaled*(1-r5.abar)/r5.abar,Pr=r5.snr_raw*(1-r5.abar)/r5.abar;
  L.snr={abar,Ps,Pr};
  function snrChart(){const el=$('lt-snr'),W=Math.min(L.width(el),620),H=220,pl=44,pr=12,pt=10,pb=34;
    const lg=t=>Math.log10(abar[t]/(1-abar[t]));const ys=[-4,-3,-2,-1,0,1,2,3,4,5];const ymin=-4,ymax=5;
    const X=t=>pl+t/999*(W-pl-pr),Y=v=>pt+(ymax-v)/(ymax-ymin)*(H-pt-pb);let o='';
    ys.forEach(v=>{o+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"'+(v===0?' stroke-width="1.6"':'')+'/><text x="'+(pl-4)+'" y="'+(Y(v)+3)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+(v===0?'1':'1e'+v)+'</text>'});
    [0,200,400,600,800,999].forEach(t=>{o+='<text x="'+X(t)+'" y="'+(H-pb+13)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+t+'</text>'});
    o+='<text x="'+((pl+W)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">timestep t (SD 1.5 training schedule)</text>';
    const cross={};
    [['scaled',Ps,'var(--c1)','latent &#215; 0.18215 (correct)'],['raw',Pr,'var(--c2)','raw latent (factor forgotten)']].forEach(([k,p,c,lab],j)=>{let pts='';let cx=null;
      for(let t=0;t<1000;t+=3){const v=Math.max(ymin,Math.min(ymax,lg(t)+Math.log10(p)));pts+=X(t).toFixed(1)+','+Y(v).toFixed(1)+' ';if(cx==null&&lg(t)+Math.log10(p)<0)cx=t}
      cross[k]=cx;o+='<polyline fill="none" stroke="'+c+'" stroke-width="2" points="'+pts+'"/>';
      if(cx!=null)o+='<circle cx="'+X(cx)+'" cy="'+Y(0)+'" r="4" fill="'+c+'"/><text x="'+(X(cx)+(j?-6:6))+'" y="'+(Y(0)+(j?-8:16))+'" text-anchor="'+(j?'end':'start')+'" font-size="10.5" fill="'+c+'">SNR 1 at t = '+cx+'</text>';
      const lt=j?340:600;if(W>=520)o+='<text x="'+X(lt)+'" y="'+(Y(lg(lt)+Math.log10(p))+(j?-9:17))+'" text-anchor="middle" font-size="10.5" fill="'+c+'">'+lab+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Signal-to-noise ratio against timestep, scaled and raw latents">'+o+'</svg>';
    $('lt-snr-cap').innerHTML='<span style="color:var(--c1)">Blue</span>: latent &#215; 0.18215 (correct); <span style="color:var(--c2)">orange</span>: raw latent (factor forgotten). Signal-to-noise ratio of the noised cat latent: SNR(t) = &#257;<sub>t</sub> P / (1 &minus; &#257;<sub>t</sub>), with P the latent\'s mean square ('+Ps.toFixed(3)+' scaled, '+Pr.toFixed(2)+' raw). Same schedule, but the raw latent stays above SNR 1 until t = '+cross.raw+' instead of '+cross.scaled+': the factor forgotten shifts every timestep towards "almost clean". <span class="lt-lbl d">derived from the betas and the measured latent</span>'}
  L.onRender(snrChart);
  // noising before/after animation
  const TS=[0,300,600,999];
  L.anim({card:'lt-nz-card',ctl:'lt-nz-ctl',n:TS.length,ms:1500,label:'Timestep',draw(i){const t=TS[i],r=V.noising[String(t)];
    $('lt-nz').innerHTML='<figure>'+im('sd_noise_scaled_'+t,'noised latent decoded, correct scaling',96)+'<figcaption>scaled (correct): '+r.psnr_scaled.toFixed(1)+' dB</figcaption></figure><figure>'+im('sd_noise_raw_'+t,'noised latent decoded, raw',96)+'<figcaption>raw (factor forgotten): '+r.psnr_raw.toFixed(1)+' dB</figcaption></figure>';
    $('lt-nz-cap').innerHTML='<b>t = '+t+'</b>, &#257;<sub>t</sub> = '+r.abar.toFixed(4)+'. Same latent, same noise &#949;; x<sub>t</sub> = &#8730;&#257;<sub>t</sub> z + &#8730;(1 &minus; &#257;<sub>t</sub>) &#949;, then decoded. SNR '+r.snr_scaled.toPrecision(3)+' (scaled) against '+r.snr_raw.toPrecision(3)+' (raw). PSNR against the original photo.'}});
  // decode mistakes and pipeline runs
  const dm=V.decode_mistakes;
  $('lt-dec').innerHTML=[['right','decode(z): correct',dm.right],['forgot_divide','decode(0.18215 z): forgot to divide',dm.forgot_divide],['divided_raw','decode(z / 0.18215): divided twice',dm.divided_raw]].map(([k,c,r])=>'<figure>'+im('sd_dec_'+k,c,128)+'<figcaption>'+c+'<br>'+r.psnr.toFixed(1)+' dB; pixel std '+(r.std_rgb.reduce((a,b)=>a+b,0)/3).toFixed(0)+'</figcaption></figure>').join('');
  const ru=SC.runs;
  $('lt-i2i').innerHTML='<figure>'+im('sd_p01_cat_full','input photo',144)+'<figcaption>input (strength 0.6)</figcaption></figure>'+[['0.18215','SD 1.5\'s factor 0.18215'],['0.13025','SDXL\'s factor 0.13025'],['1.0','no factor (1.0)']].map(([f,c])=>'<figure>'+im('sd_i2i_'+f.replace('.','p'),c,144)+'<figcaption>'+c+'; pixel std '+(ru['i2i_'+f.replace('.','p')].std_rgb.reduce((a,b)=>a+b,0)/3).toFixed(0)+'</figcaption></figure>').join('');
  $('lt-t2i').innerHTML=[['0.18215','divide by 0.18215 (correct)'],['1.0','forgot to divide'],['0.13025','divide by SDXL\'s 0.13025']].map(([f,c])=>'<figure>'+im('sd_t2i_div_'+f.replace('.','p'),c,144)+'<figcaption>'+c+'; pixel std '+(ru['t2i_div_'+f.replace('.','p')].std_rgb.reduce((a,b)=>a+b,0)/3).toFixed(0)+'</figcaption></figure>').join('');
})();
