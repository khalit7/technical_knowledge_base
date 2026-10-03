// ---- Reading, thread 4: weight decay through Adam (L2 in the loss) against AdamW (decoupled), same noise ----
// Simulation in RDE.wdSim, checked against torch.optim.Adam and AdamW in src/read/recompute.py.
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-wd'))return;
  const F=RD.f;let mode='l2',an;
  function draw(i){const W0=RDE.wdSim(),fr=W0.frames[mode][i],ot=W0.frames[mode==='l2'?'adamw':'l2'][i],t=i*100,pure=Math.pow(1-W0.lr*W0.lam,t);
    $('rd-wdM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
    const box=$('rd-wdSvg'),W=RD.width(box),H=Math.round(Math.min(230,Math.max(180,W*.34))),ml=34,mr=8,mt=12,mb=42,n=W0.sig.length;
    const cw=(W-ml-mr)/n,x=k=>ml+cw*(k+0.5),bw=Math.min(46,cw*0.42),y=v=>mt+(H-mt-mb)*(1-Math.max(0,Math.min(v,1.1))/1.1);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Weight values under two optimisers">';
    for(let v=0;v<=1.001;v+=0.25)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+F(v,2)+'</text>';
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(pure)+'" y2="'+y(pure)+'" stroke="var(--c3)" stroke-width="1.5" stroke-dasharray="5 4"/>';
    for(let k=0;k<n;k++){s+='<rect x="'+(x(k)-bw-1)+'" y="'+y(ot[k])+'" width="'+bw+'" height="'+(y(0)-y(ot[k]))+'" fill="var(--dim)"/>';
      s+='<rect x="'+(x(k)+1)+'" y="'+y(fr[k])+'" width="'+bw+'" height="'+(y(0)-y(fr[k]))+'" fill="'+(mode==='l2'?'var(--c2)':'var(--c1)')+'"/>';
      const e=Math.round(Math.log10(W0.sig[k]));s+='<text x="'+x(k)+'" y="'+(H-26)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(e===0?'1':e===1?'10':'1e'+e)+'</text>'}
    s+='<text x="'+((W+ml)/2)+'" y="'+(H-8)+'" font-size="10" text-anchor="middle" fill="var(--mute)">gradient noise σ of each weight</text>';
    box.innerHTML=s+'</svg>';
    const mx=Math.max(...fr),mn=Math.min(...fr);let tt,p;
    if(i===0){tt='Six weights at 1, step 0';p='Each gets a gradient of pure noise, from σ = 10<sup>&minus;4</sup> to 10. With no signal anywhere, the only systematic force is the decay, which should shrink all six alike.'}
    else if(mode==='l2'){tt='Adam with L2 in the loss, step '+t;p='The decay term &lambda;w enters the gradient and is divided by √v̂ with everything else. Where the noise is tiny, &lambda;w dominates the gradient, Adam normalises it to a full-size step, and the weight is driven down far faster than the decay intends (0.02 by step 2,000, where decay alone leaves 0.82); where the noise is large, &lambda;w is drowned and the weight is barely decayed ('+F(fr[n-1],2)+' for σ = 10).'}
    else{tt='AdamW, step '+t;p='The decay is applied to the weight directly, outside Adam\'s rescaling, so all six shrink together along the green line, '+F(pure,3)+' by now; the noise only jiggles them around it. Same decay for every weight, which is what L2 regularisation meant in the first place.'}
    $('rd-wdT').textContent=tt;$('rd-wdP').innerHTML=p;
    $('rd-wdN').innerHTML=RD.stat('Step',t.toLocaleString('en-GB'),'of '+W0.N.toLocaleString('en-GB'))+RD.stat('Smallest weight',F(mn,3),'')+RD.stat('Largest weight',F(mx,3),'')+RD.stat('Decay alone would give',F(pure,3),'(1 &minus; 10<sup>&minus;4</sup>)<sup>'+t+'</sup>');
  }
  an=RD.anim({card:'rd-wd',ctl:'rd-wdC',n:31,start:30,draw,ms:260,label:'Step, in hundreds'});
  $('rd-wdM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;an.reset(31);an.play()});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>an.redraw(),120)});
})();
