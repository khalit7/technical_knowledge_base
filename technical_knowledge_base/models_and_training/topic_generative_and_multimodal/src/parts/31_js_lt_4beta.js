// ---- Latent lab: beta slider over the recorded runs (section 6) and VQ-VAE codebook usage and tokens (section 7) ----
(function(){if(!window.LT)return;
  const L=window.LT,D=L.D,$=L.$,R=D.tiny.runs;
  const ORDER=['ae2','vae2','ae16','vae16_b0p1','vae16_b0p3','vae16_b1p0','vae16_b3p0','vae16_b10p0','vq_plain','vq_restart'];
  const BETAS=[['vae16_b0p1',0.1],['vae16_b0p3',0.3],['vae16_b1p0',1],['vae16_b3p0',3],['vae16_b10p0',10]];
  let bi=2;
  const sl=$('lt-beta');
  function svgRD(){
    const el=$('lt-beta-rd'),W=Math.min(L.width(el),520),H=230,pl=48,pr=12,pt=12,pb=36;
    const pts=BETAS.map(([k,b])=>({k,b,x:R[k].test_kl_nats,y:R[k].test_nll_nats}));
    const ae=R.ae16.test_nll_nats;
    const xm=Math.max(...pts.map(p=>p.x))*1.08,ymin=Math.min(ae,...pts.map(p=>p.y))-6,ymax=Math.max(...pts.map(p=>p.y))+6;
    const X=x=>pl+x/xm*(W-pl-pr),Y=y=>pt+(y-ymin)/(ymax-ymin)*(H-pt-pb);
    let o='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(H-pb)+'" y2="'+(H-pb)+'" stroke="var(--line)"/><line x1="'+pl+'" x2="'+pl+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/>';
    for(let t=0;t<=xm;t+=xm>40?10:5)o+='<text x="'+X(t)+'" y="'+(H-pb+13)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+t+'</text>';
    const ys=Math.ceil(ymin/10)*10;for(let t=ys;t<=ymax;t+=10)o+='<text x="'+(pl-4)+'" y="'+(Y(t)+3)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+t+'</text>';
    o+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">KL, nats per image (rate)</text>';
    o+='<text x="10" y="'+((pt+H-pb)/2)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)" transform="rotate(-90 10 '+((pt+H-pb)/2)+')">reconstruction, nats (lower is better)</text>';
    o+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(ae)+'" y2="'+Y(ae)+'" stroke="var(--c2)" stroke-dasharray="4 3"/><text x="'+(pl+4)+'" y="'+(Y(ae)+12)+'" font-size="10" fill="var(--c2)">plain autoencoder, no KL: '+ae.toFixed(1)+'</text>';
    o+='<polyline fill="none" stroke="var(--c1)" stroke-width="1.5" points="'+pts.map(p=>X(p.x).toFixed(1)+','+Y(p.y).toFixed(1)).join(' ')+'"/>';
    pts.forEach((p,i)=>{o+='<circle cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+(i===bi?6:4)+'" fill="'+(i===bi?'var(--c1)':'var(--bg)')+'" stroke="var(--c1)" stroke-width="1.5"/><text x="'+(X(p.x)+(i<2?0:-8)).toFixed(1)+'" y="'+(Y(p.y)+(i===0?-9:i===1?16:-8)).toFixed(1)+'" text-anchor="'+(i<2?'middle':'end')+'" font-size="10.5" font-weight="'+(i===bi?600:400)+'">&#946; '+p.b+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Rate-distortion curve of the beta sweep">'+o+'</svg>'}
  function klDims(){
    const el=$('lt-beta-kl'),W=Math.min(L.width(el),520),H=110,k=BETAS[bi][0],v=R[k].kl_per_dim.slice().sort((a,b)=>b-a);
    const mx=Math.max(...BETAS.map(b=>Math.max(...R[b[0]].kl_per_dim))),bw=(W-30)/16;let o='';
    v.forEach((x,i)=>{const h=Math.max(1,x/mx*(H-30));o+='<rect x="'+(26+i*bw+1).toFixed(1)+'" y="'+(H-18-h).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+(x<0.05?'var(--dim)':'var(--c3)')+'"/>'});
    o+='<line x1="26" x2="'+W+'" y1="'+(H-18)+'" y2="'+(H-18)+'" stroke="var(--line)"/><text x="26" y="'+(H-4)+'" font-size="10" fill="var(--mute)">16 latent dimensions, sorted by KL (grey: under 0.05 nats, unused)</text><text x="22" y="12" text-anchor="end" font-size="10" fill="var(--mute)">'+mx.toFixed(1)+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="KL per latent dimension">'+o+'</svg>'}
  function beta(){
    const [k,b]=BETAS[bi],r=R[k];$('lt-beta-v').textContent=b;
    L.LTstrip($('lt-beta-orig'),'beta','orig',8,8);L.LTstrip($('lt-beta-rec'),'beta',k,8,8);L.LTstrip($('lt-beta-prior'),'beta',k+'_prior',8,8);
    $('lt-beta-st').innerHTML=L.stat('Reconstruction',r.test_nll_nats.toFixed(1)+' nats',r.test_psnr_db.toFixed(1)+' dB PSNR')+L.stat('KL',r.test_kl_nats.toFixed(1)+' nats','per image')+
      L.stat('Active dimensions',r.active_units+' of 16','Var of &#956; &gt; 0.01')+L.stat('Random-code samples','FD '+r.prior.fd.toFixed(0),'confidence '+Math.round(r.prior.conf*100)+'%');
    svgRD();klDims()}
  sl.addEventListener('input',()=>{bi=+sl.value;beta()});
  L.onRender(beta);

  // ---- VQ ----
  let vimg=0,vrun='vq_restart',hl=-1;
  const vc=$('lt-vq-chips');
  vc.innerHTML=Array.from({length:16},(_,k)=>'<button data-k="'+k+'" class="'+(k?'':'on')+'" aria-label="Test image '+(k+1)+'"><canvas data-sp="rec" data-k="'+L.ti('rec','orig',k)+'" data-px="30" width="30" height="30"></canvas></button>').join('');L.fillTiles(vc);
  vc.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;vimg=+b.dataset.k;vc.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));hl=-1;tok()});
  L.seg($('lt-vq-run'),v=>{vrun=v;hl=-1;tok();usage()});
  const tg=$('lt-vq-tok');
  function tok(){const t=L.toks(vrun,vimg);
    tg.innerHTML=t.map((v,i)=>'<span tabindex="0" data-v="'+v+'" class="'+(v===hl?'hl':'')+'">'+v+'</span>').join('');
    L.tile($('lt-vq-o'),'rec',L.ti('rec','orig',vimg),112);L.tile($('lt-vq-r'),'rec',L.ti('rec',vrun,vimg),112);
    const n=new Set(t).size;
    $('lt-vq-tokcap').innerHTML='This image uses '+n+' distinct codes in its 64 positions'+(hl>=0?'; code '+hl+' appears '+t.filter(v=>v===hl).length+' times (highlighted)':'')+'. Reconstruction '+R[vrun].test16_psnr_db[vimg].toFixed(1)+' dB PSNR.'}
  const pickTok=e=>{const s=e.target.closest('span[data-v]');if(!s)return;hl=+s.dataset.v;tok()};
  tg.addEventListener('click',pickTok);tg.addEventListener('mouseover',pickTok);tg.addEventListener('focusin',pickTok);
  function usage(){
    const el=$('lt-vq-use'),W=Math.min(L.width(el),620),H=150;let o='';
    const runs=[['vq_plain','var(--c2)'],['vq_restart','var(--c1)']];
    const tot=R.vq_plain.usage_counts.reduce((a,b)=>a+b,0);
    const sh=runs.map(([k])=>R[k].usage_counts.map(c=>c/tot).sort((a,b)=>b-a));
    const mx=Math.max(...sh.map(s=>s[0])),bw=(W-40)/128;
    runs.forEach(([k,c],j)=>{const s=sh[j];s.forEach((v,i)=>{if(v<=0)return;const h=Math.max(.8,v/mx*(H-34));o+='<rect x="'+(36+i*bw).toFixed(2)+'" y="'+(H-20-h).toFixed(1)+'" width="'+Math.max(.6,bw*(j?0.5:1)).toFixed(2)+'" height="'+h.toFixed(1)+'" fill="'+c+'" opacity="'+(k===vrun?1:.35)+'"/>'})});
    o+='<line x1="36" x2="'+W+'" y1="'+(H-20)+'" y2="'+(H-20)+'" stroke="var(--line)"/><text x="36" y="'+(H-6)+'" font-size="10" fill="var(--mute)">128 codes, sorted by how often they are used on the test set</text><text x="32" y="16" text-anchor="end" font-size="10" fill="var(--mute)">'+Math.round(mx*100)+'%</text><text x="32" y="'+(H-22)+'" text-anchor="end" font-size="10" fill="var(--mute)">0</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Codebook usage, plain against restart">'+o+'</svg>';
    // alive over training
    const al=$('lt-vq-alive'),W2=Math.min(L.width(al),620),H2=150,X=s=>40+s/5000*(W2-52),Y=a=>H2-22-a/128*(H2-36);let p='';
    [0,32,64,96,128].forEach(a=>{p+='<line x1="40" x2="'+(W2-12)+'" y1="'+Y(a)+'" y2="'+Y(a)+'" stroke="var(--line)"/><text x="36" y="'+(Y(a)+3)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+a+'</text>'});
    [0,1000,2000,3000,4000,5000].forEach(s=>{p+='<text x="'+X(s)+'" y="'+(H2-8)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+s+'</text>'});
    runs.forEach(([k,c])=>{const a=R[k].alive_log;p+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(k===vrun?2.2:1.2)+'" points="'+a.map(q=>X(q[0]).toFixed(1)+','+Y(q[1]).toFixed(1)).join(' ')+'"/>'});
    p+='<text x="'+(W2-12)+'" y="'+(Y(R.vq_restart.alive_log.slice(-1)[0][1])-5)+'" text-anchor="end" font-size="10.5" fill="var(--c1)">with dead-code restart</text><text x="'+(W2-12)+'" y="'+(Y(R.vq_plain.alive_log.slice(-1)[0][1])+13)+'" text-anchor="end" font-size="10.5" fill="var(--c2)">plain</text>';
    al.innerHTML='<svg viewBox="0 0 '+W2+' '+H2+'" width="'+W2+'" height="'+H2+'" role="img" aria-label="Codes used per 100 training steps">'+p+'</svg>';
    $('lt-vq-st').innerHTML=['vq_plain','vq_restart'].map(k=>L.stat(k==='vq_plain'?'Plain':'Dead-code restart',R[k].codes_used_test+' of 128 codes used','perplexity '+R[k].perplexity.toFixed(1)+'; '+R[k].test_psnr_db.toFixed(1)+' dB PSNR')).join('')}
  L.onRender(()=>{tok();usage()});
})();
