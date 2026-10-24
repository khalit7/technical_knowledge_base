// ---- Section 6: the guidance cards (moved from the Guidance explorer tab on 2026-10-24), and the SD image cards of sections 2 and 7 ----
(function(){
  const D=window.DZ;if(!D)return;
  const $=id=>document.getElementById(id);
  const SD=D.sd,byKey={};SD.runs.forEach(r=>byKey[r.key]=r);
  const fig=(r,cap)=>'<figure><img alt="'+RD.esc(cap)+'" src="'+D.img[r.key]+'"><figcaption>'+cap+'</figcaption></figure>';
  const stats=r=>'saturation '+DZC.f(r.mean_saturation,2)+', clipped '+DZC.pct(r.clipped_frac,1)+', mean '+DZC.f(r.mean,2)+(r.sec!=null?', '+DZC.f(r.sec,1)+' s':'');
  // ---------- Guidance explorer: SD sets ----------
  const SETS=D.sdsets.slice(0,4);   // guidance sets; zero terminal SNR and few steps have their own cards (sections 2 and 7)
  if($('dz-gx-set')){
    $('dz-gx-set').innerHTML=SETS.map((s,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+RD.esc(s.label)+'</button>').join('');
    const show=i=>{const s=SETS[i];$('dz-gx-ims').innerHTML=s.keys.map(k=>fig(byKey[k],RD.esc(byKey[k].cap)+'<br>'+stats(byKey[k]))).join('');$('dz-gx-note').textContent=s.note};
    RD.seg($('dz-gx-set'),m=>show(+m));show(0);
  }
  // ---------- Guidance explorer: tiny-model curves ----------
  const G=D.guide;
  const KINDS=[{k:'cfg',label:'Plain CFG (lab)',color:'#2f6fb5'},{k:'rescale',label:'CFG rescale 0.7',color:'#c2703a'},{k:'interval',label:'Guidance interval',color:'#3f7f56'},
    {k:'ddpm_cfg',label:'CFG with DDPM sampler',color:'#8a5cb8',dash:'4 3'},{k:'auto',label:'Autoguidance',color:'#b8983a'}];
  function gchart(){const el=$('dz-gx-chart');if(!el)return;
    const ser=KINDS.filter(k=>G[k.k]&&G[k.k].length).map(k=>({name:k.label,color:k.color,dash:k.dash,pts:G[k.k].map(r=>[r.fd,100*r.acc])}));
    DZC.chart({el,series:ser,xlog:true,xlab:'FD (log scale; lower is better)',ylab:'class accuracy, %',label:'Accuracy against FD',hlines:[{y:100*D.num.real_acc,label:'real images'}],vlines:[{x:D.num.floor,label:'real'}]});
    DZC.legend($('dz-gx-leg'),ser)}
  let gk='cfg',gi=0;const img=new Image();
  function gstrip(){const list=G[gk];if(gi>=list.length)gi=0;const r=list[gi];
    $('dz-gx-scale').innerHTML=list.map((x,i)=>'<button data-m="'+i+'"'+(i===gi?' class="on"':'')+'>'+(gk==='auto'?'w = ':'s = ')+x.scale+'</button>').join('');
    img.onload=()=>{const cv=$('dz-gx-cv');cv.width=img.width;cv.height=img.height;cv.getContext('2d').drawImage(img,0,0)};img.src=D.strips[r.strip];
    $('dz-gx-cnt').innerHTML=RD.stat('FD',DZC.f(r.fd,1),'real '+D.f.floor)+RD.stat('Class accuracy',DZC.pct(r.acc,1),'real '+D.f.real_acc)+RD.stat('Diversity',DZC.f(r.div,2),'real '+D.f.real_div)+
      RD.stat('Saturated pixels',DZC.pct(r.white,1),'share above 0.98')}
  if($('dz-gx-kind')){
    $('dz-gx-kind').innerHTML=KINDS.filter(k=>G[k.k]&&G[k.k].length).map((k,i)=>'<button data-m="'+k.k+'"'+(i?'':' class="on"')+'>'+RD.esc(k.label)+'</button>').join('');
    RD.seg($('dz-gx-kind'),m=>{gk=m;gi=0;gstrip()});
    $('dz-gx-scale').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;gi=+b.dataset.m;gstrip()});
    RD.onRender(()=>{gchart();gstrip()});RD.onResize(gchart);
  }
  // ---------- Reading: CFG rescale before/after ----------
  if($('dz-resc-s')){
    const sc=D.rescale_scales;let cur=sc.indexOf(12)>=0?12:sc[0];
    $('dz-resc-s').innerHTML=sc.map(s=>'<button data-m="'+s+'"'+(s===cur?' class="on"':'')+'>scale '+s+'</button>').join('');
    const show=s=>{const a=byKey['cfg'+s+'_r0.0'],b=byKey['cfg'+s+'_r0.7'];
      $('dz-resc-ims').innerHTML=fig(a,'CFG '+s+', no rescale')+fig(b,'CFG '+s+', rescale &phi; = 0.7');
      $('dz-resc-cnt').innerHTML=RD.stat('Saturation',DZC.f(a.mean_saturation,2)+' &rarr; '+DZC.f(b.mean_saturation,2),'mean HSV saturation')+
        RD.stat('Clipped pixels',DZC.pct(a.clipped_frac,1)+' &rarr; '+DZC.pct(b.clipped_frac,1),'a channel at 0 or 255')+RD.stat('Contrast',DZC.f(a.std,3)+' &rarr; '+DZC.f(b.std,3),'pixel standard deviation')};
    RD.seg($('dz-resc-s'),m=>show(+m));show(cur);
  }
  // ---------- Reading: zero terminal SNR ----------
  if($('dz-zt-ims')){const a=byKey.ddim_trailing_ref,b=byKey.ztsnr_eps;
    $('dz-zt-ims').innerHTML=fig(a,'DDIM, trailing, SD 1.5\'s own schedule<br>'+stats(a))+fig(b,'The same with rescale_betas_zero_snr=True<br>'+stats(b));}
  // ---------- Reading: LCM-LoRA against DPM-Solver++ ----------
  if($('dz-lcm-n')){const ns=D.lcm_steps;let cur=4;
    $('dz-lcm-n').innerHTML=ns.map(n=>'<button data-m="'+n+'"'+(n===cur?' class="on"':'')+'>'+n+' step'+(n>1?'s':'')+'</button>').join('');
    const show=n=>{const a=byKey['dpm_'+n],b=byKey['lcm_'+n];
      $('dz-lcm-ims').innerHTML=(a?fig(a,'DPM-Solver++ '+n+' steps, guidance 7.5 ('+(2*n)+' U-Net passes)<br>'+stats(a)):'<figure><figcaption>DPM-Solver++ at 1 step: in the lab (a blur)</figcaption></figure>')+fig(b,'LCM-LoRA '+n+' step'+(n>1?'s':'')+', guidance off ('+n+' U-Net pass'+(n>1?'es':'')+')<br>'+stats(b));
      $('dz-lcm-cnt').innerHTML=RD.stat('U-Net passes',(a?2*n:'n/a')+' vs '+n,'guided DPM vs LCM')+RD.stat('Seconds',(a?DZC.f(a.sec,1):'n/a')+' vs '+DZC.f(b.sec,1),'whole pipeline, M1 Pro')};
    RD.seg($('dz-lcm-n'),m=>show(+m));show(cur);
  }
})();
