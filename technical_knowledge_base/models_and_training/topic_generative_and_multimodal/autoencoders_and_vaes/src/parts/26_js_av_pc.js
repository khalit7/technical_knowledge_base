// ---- Reading section 6: posterior collapse (recorded data in AVD.pc, images in AVD.img.pc); moved from the old Posterior collapse tab ----
(function(){
  if(!document.getElementById('avpc-curve'))return;
  const R=AVD.pc.runs,IMG=AVD.img,esc=RD.esc,$=id=>document.getElementById(id);
  const NM={c_b1:'Plain ELBO',c_anneal:'KL annealing',c_freebits:'Free bits (0.5 nats per dim)',c_noz:'No code (z = 0)'};
  const COL={c_b1:'var(--c2)',c_anneal:'var(--c1)',c_freebits:'var(--c3)',c_noz:'var(--mute)'};
  let metric='kl',run='c_b1';
  function curve(){
    const el=$('avpc-curve'),W=RD.width(el),H=220,ml=44,mr=34,mt=8,mb=26;
    const ks=Object.keys(NM).filter(k=>R[k]&&(metric==='rec'||k!=='c_noz'));
    const idx=metric==='kl'?1:2;
    let ymin=Infinity,ymax=-Infinity;ks.forEach(k=>R[k].curve.forEach(p=>{if(p[0]<300&&metric==='rec')return;ymin=Math.min(ymin,p[idx]);ymax=Math.max(ymax,p[idx])}));
    if(metric==='kl')ymin=0;ymax*=1.05;
    const X=s=>ml+s/5000*(W-ml-mr),Y=v=>mt+(1-(v-ymin)/(ymax-ymin))*(H-mt-mb);
    let b='';for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4;b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(v)+4,v.toFixed(v<20?1:0),{a:'end',fs:11})}
    const xt=W<520?[0,2500,5000]:[0,1000,2000,3000,4000,5000];
    xt.forEach((t,i)=>b+=RD.t(X(t),H-10,t.toLocaleString('en-GB'),{a:i===xt.length-1?'end':i===0?'start':'middle',fs:11}));
    ks.forEach(k=>{const pts=R[k].curve.filter(p=>metric==='kl'||p[0]>=300);
      b+='<polyline fill="none" stroke="'+COL[k]+'" stroke-width="2" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(Math.min(ymax,p[idx])).toFixed(1)).join(' ')+'"/>'});
    if(R.c_anneal){const Y2=v=>mt+(1-v)*(H-mt-mb);b+='<polyline fill="none" stroke="var(--c1)" stroke-dasharray="3 3" stroke-width="1.2" points="'+R.c_anneal.curve.map(p=>X(p[0]).toFixed(1)+','+Y2(p[3]).toFixed(1)).join(' ')+'"/>'+RD.t(W-mr+4,Y2(1)+4,'w=1',{fs:11})+RD.t(W-mr+4,Y2(0),'w=0',{fs:11})}
    el.innerHTML=RD.svg(W,H,b,'Training curves');
    $('avpc-leg').innerHTML=ks.map(k=>'<span style="--sw:'+COL[k]+'">'+NM[k]+'</span>').join('')+(metric==='rec'?'<span class="av-note">(first 300 steps cut: the loss starts near 700)</span>':'');
  }
  RD.seg($('avpc-metric'),v=>{metric=v;curve()});
  const im=(s,a)=>'<img class="av-img" src="'+s+'" alt="'+esc(a)+'">';
  function strips(){
    const r=R[run];
    $('avpc-orig').innerHTML=IMG.orig16.slice(0,8).map((s,i)=>im(s,'test image '+(i+1))).join('');
    $('avpc-own').innerHTML=IMG.pc[run+'_own'].map((s,i)=>im(s,'decoded from own code '+(i+1))).join('');
    $('avpc-prior').innerHTML=IMG.pc[run+'_prior'].map((s,i)=>im(s,'decoded from a random code '+(i+1))).join('');
    $('avpc-bern').innerHTML=IMG.pc[run+'_bern'].map((s,i)=>im(s,'sampled from own code '+(i+1))).join('');
    $('avpc-own-lab').textContent=run==='c_noz'?'Decoded with z = 0 (this model has no code)':'Decoded from each image\'s own code (the mean of its posterior)';
    $('avpc-cap').innerHTML='<div class="t">'+esc(NM[run])+': KL '+r.kl_nats.toFixed(2)+' nats, code\'s worth '+r.z_gain_nats.toFixed(1)+' nats</div><p>'+
      (run==='c_noz'?'No code at all: the decoder only continues its own left-and-above context, so the grey-level decodes are the same for every image.':
       r.z_gain_nats<1?'The decodes are the same for every image, whatever its code: the decoder ignores the code.':
       'The decodes now differ from image to image and roughly follow them (light tops, trouser stripes, flat dark footwear). A rough likeness only: '+r.kl_nats.toFixed(1)+' nats is about '+(r.kl_nats/Math.LN2).toFixed(0)+' bits per image.')+'</p>';
  }
  RD.seg($('avpc-run'),v=>{run=v;strips()});strips();
  function dims(){
    const el=$('avpc-dims'),W=RD.width(el),ks=['c_b1','c_anneal','c_freebits'].filter(k=>R[k]);
    const H=34+ks.length*44,ml=W<520?84:110,mr=10;let mx=0;ks.forEach(k=>mx=Math.max(mx,...R[k].kl_per_dim));
    let b='';ks.forEach((k,j)=>{const y=10+j*44,d=R[k].kl_per_dim.slice().sort((a,c)=>c-a),bw=(W-ml-mr)/16;
      b+=RD.t(ml-6,y+22,NM[k].split(' (')[0],{a:'end',fs:11});
      d.forEach((v,i)=>{const h=Math.max(.5,v/mx*36);b+='<rect x="'+(ml+i*bw+1).toFixed(1)+'" y="'+(y+36-h).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+COL[k]+'"><title>'+v.toFixed(3)+' nats</title></rect>'})});
    b+=RD.t(ml,H-4,'16 dimensions, sorted; tallest bar '+mx.toFixed(2)+' nats',{fs:11});
    el.innerHTML=RD.svg(W,H,b,'KL per dimension');
  }
  const det=$('avpc-dims').closest('details');if(det)det.addEventListener('toggle',()=>{if(det.open)dims()});
  function all(){curve();dims()}
  RD.onRender(all);RD.onResize(all);all();
})();
