// ---- Diffusion lab: guidance (section 6) and Stable Diffusion steps and time (section 7) ----
(function(){
  const {D,F,$}=DF;if(!$('df-cfg'))return;
  const G=D.cfg,sl=$('df-cfg-s');sl.max=G.length-1;
  DF.clsRow($('df-cfg-cls'));
  const mseg=$('df-cfg-m');
  const YL={acc:'class accuracy %',div:'diversity',fd:'FD',white:'pixels at full white %'};
  const val=(r,m)=>m==='acc'?r.acc*100:m==='white'?r.white*100:r[m];
  function plot(){const i=+sl.value,m=DF.segVal(mseg);
    const hl=m==='acc'?{y:+F.real_acc*100,label:'real images'}:m==='div'?{y:+F.real_div,label:'real images'}:m==='fd'?{y:+F.floor_fd,label:'real images'}:null;
    DF.chart($('df-cfgp'),[{color:'var(--c1)',pts:G.map(r=>[r.s,val(r,m)])}],
      {xticks:G.map(r=>r.s).filter(s=>s!==7.5&&s!==2),xlab:'guidance scale s',ylab:YL[m],h:200,ymin:m==='fd'?undefined:0,hline:hl,label:YL[m]+' against guidance scale',
       extra:(X,Y)=>'<line x1="'+X(G[i].s)+'" x2="'+X(G[i].s)+'" y1="10" y2="166" stroke="var(--ink)" stroke-dasharray="2 2"/>'})}
  DF.seg(mseg,plot);
  function upd(){const i=+sl.value,r=G[i];$('df-cfg-sv').textContent=r.s+(r.s===0?' (unconditional)':r.s===1?' (no guidance)':'');
    DF.tiles($('df-cfg'),D.st['cfg_'+r.s],0,10,10,DF.CLS);plot();
    $('df-cfg-cap').innerHTML='s = '+r.s+': class accuracy <b>'+(r.acc*100).toFixed(1)+'%</b>, diversity <b>'+r.div+'</b>, FD <b>'+r.fd+'</b>, pixels pushed to full white '+(r.white*100).toFixed(1)+'% <span class="meas">measured</span> on 1,000 samples. '+F.cfg_story}
  sl.addEventListener('input',upd);DF.onRender(plot);upd();
  let tm=0;$('df-cfg-play').addEventListener('click',()=>{if(tm){clearInterval(tm);tm=0;return}let i=0;sl.value=0;upd();
    tm=setInterval(()=>{if(!DF.visible()){clearInterval(tm);tm=0;return}i++;if(i>=G.length){clearInterval(tm);tm=0;return}sl.value=i;upd()},DF.RM?1500:900)});
  // SD galleries
  const SD=D.sd;
  function gallery(el,cap,items,label,info){el.innerHTML=items.map((r,i)=>'<figure data-i="'+i+'"><img alt="'+DF.esc(label(r))+'" src="'+SD.img[r.key]+'" width="192" height="192"><figcaption>'+label(r)+'</figcaption></figure>').join('');
    const sel=i=>{el.querySelectorAll('figure').forEach((f,j)=>f.classList.toggle('on',j===i));cap.innerHTML=info(items[i])};
    el.addEventListener('click',e=>{const f=e.target.closest('figure');if(f)sel(+f.dataset.i)});sel(items.findIndex(r=>r.dflt)>=0?items.findIndex(r=>r.dflt):0)}
  const cf=SD.cfg.filter(r=>r.prompt==='g03'),x7=SD.cfg.filter(r=>r.prompt==='x07');
  const lab=r=>r.key==='cfg_uncond'?'empty prompt':'s = '+r.scale;
  const inf=r=>lab(r)+': '+r.sec+' s for 25 steps ('+(r.scale>1?'two U-Net passes per step':'one pass per step')+'), mean colour saturation '+r.mean_saturation+', pixels at pure black or white '+(r.clipped_frac*100).toFixed(1)+'% <span class="meas">measured</span>. '+(F.sd_cfg_note||'');
  cf.forEach(r=>r.dflt=r.scale===7.5&&r.key!=='cfg_uncond');
  gallery($('df-sdcfg'),$('df-sdcfg-cap'),cf,lab,inf);
  gallery($('df-sdx07'),$('df-sdx07-cap'),x7,lab,r=>lab(r)+': '+r.sec+' s. '+(F.sd_x07_note||''));
  const sseg=$('df-sdst-m');
  const SN={dpm:'DPM-Solver++ 2M',ddim_leading:'DDIM, leading spacing',ddim_trailing:'DDIM, trailing spacing'};
  function stDraw(){const m=DF.segVal(sseg);const items=SD.steps.filter(r=>r.sampler===m);
    gallery($('df-sdst'),$('df-sdst-cap'),items,r=>r.steps+' step'+(r.steps>1?'s':''),r=>SN[m]+', '+r.steps+' step'+(r.steps>1?'s':'')+': timesteps '+(r.timesteps.length>12?r.timesteps.slice(0,6).join(', ')+', &hellip;, '+r.timesteps[r.timesteps.length-1]:r.timesteps.join(', '))+'; '+r.sec+' s for the image <span class="meas">measured</span>.')}
  DF.seg(sseg,stDraw);stDraw();
  // time split
  const tmg=SD.timing;
  function tDraw(){const n=+$('df-time-n').value,g=$('df-time-g').checked;
    const parts=[['text encoder',tmg.text_encoder_s*(g?1:0.5),'var(--c4)','prompt (and empty prompt) encoded once'],['U-Net',n*(g?tmg.unet_pass_batch2_s:tmg.unet_pass_batch1_s),'var(--c1)',n+' steps &times; '+(g?tmg.unet_pass_batch2_s+' s (batch of 2)':tmg.unet_pass_batch1_s+' s')],['VAE decode',tmg.vae_decode_s,'var(--c3)','once']];
    const tot=parts.reduce((a,p)=>a+p[1],0);
    $('df-time').innerHTML=parts.map(p=>'<div class="row"><span class="nm">'+p[0]+'</span><span class="track"><span class="fill" style="width:'+(100*p[1]/tot).toFixed(1)+'%;background:'+p[2]+'"></span></span><span class="val">'+p[1].toFixed(2)+' s</span></div>').join('');
    const meas=SD.steps.find(r=>r.sampler==='dpm'&&r.steps===n);
    $('df-time-out').innerHTML=DF.stat('Sum of the pieces',tot.toFixed(1)+' s','<span class="der">derived</span> from the piece timings')+DF.stat('U-Net share',(100*parts[1][1]/tot).toFixed(0)+'%','of the image\'s time')+
      DF.stat('Whole pipeline, measured',meas&&g?meas.sec+' s':'not run','DPM-Solver++, guidance 7.5'+(meas&&g?', same settings':''));
    $('df-time-cap').innerHTML='Piece timings are medians of repeated runs after a warm-up (text encoder 5, U-Net 10, decode 5), fp16, attention slicing on <span class="meas">measured</span>. Text encoder without guidance counted as half (one prompt instead of two, an approximation). The whole-pipeline figure also includes the scheduler, Python overhead and converting the decoded tensor to an image.'}
  $('df-time-n').addEventListener('change',tDraw);$('df-time-g').addEventListener('change',tDraw);tDraw();
})();
