// ---- Posterior collapse tab (recorded data in AVD.pc, images in AVD.img.pc) ----
(function(){
  const R=AVD.pc.runs,IMG=AVD.img,esc=RD.esc;
  const NM={c_b1:'Plain ELBO',c_anneal:'KL annealing',c_freebits:'Free bits (0.5 nats per dim)',c_noz:'No code (z = 0)'};
  const COL={c_b1:'var(--c2)',c_anneal:'var(--c1)',c_freebits:'var(--c3)',c_noz:'var(--mute)'};
  let metric='kl',run='c_b1';
  function curve(){
    const el=document.getElementById('avpc-curve'),W=RD.width(el),H=220,ml=44,mr=34,mt=8,mb=26;
    const ks=Object.keys(NM).filter(k=>R[k]&&(metric==='rec'||k!=='c_noz'));
    const idx=metric==='kl'?1:2;
    let ymin=Infinity,ymax=-Infinity;ks.forEach(k=>R[k].curve.forEach(p=>{if(p[0]<300&&metric==='rec')return;ymin=Math.min(ymin,p[idx]);ymax=Math.max(ymax,p[idx])}));
    if(metric==='kl')ymin=0;ymax*=1.05;
    const X=s=>ml+s/5000*(W-ml-mr),Y=v=>mt+(1-(v-ymin)/(ymax-ymin))*(H-mt-mb);
    let b='';const nt=4;for(let i=0;i<=nt;i++){const v=ymin+(ymax-ymin)*i/nt;b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(v)+4,v.toFixed(v<20?1:0),{a:'end',fs:10})}
    [0,1000,2000,3000,4000,5000].forEach((t,i)=>b+=RD.t(X(t),H-10,t.toLocaleString('en-GB'),{a:i===5?'end':i===0?'start':'middle',fs:10}));
    ks.forEach(k=>{const pts=R[k].curve.filter(p=>metric==='kl'||p[0]>=300);
      b+='<polyline fill="none" stroke="'+COL[k]+'" stroke-width="2" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(Math.min(ymax,p[idx])).toFixed(1)).join(' ')+'"/>'});
    if(R.c_anneal){const Y2=v=>mt+(1-v)*(H-mt-mb);b+='<polyline fill="none" stroke="var(--c1)" stroke-dasharray="3 3" stroke-width="1.2" points="'+R.c_anneal.curve.map(p=>X(p[0]).toFixed(1)+','+Y2(p[3]).toFixed(1)).join(' ')+'"/>'+RD.t(W-mr+4,Y2(1)+4,'w=1',{fs:10})+RD.t(W-mr+4,Y2(0),'w=0',{fs:10})}
    el.innerHTML=RD.svg(W,H,b,'Training curves');
    document.getElementById('avpc-leg').innerHTML=ks.map(k=>'<span style="--sw:'+COL[k]+'">'+NM[k]+'</span>').join('')+(metric==='rec'?'<span class="av-note">(first 300 steps cut: the loss starts near 700)</span>':'');
  }
  RD.seg(document.getElementById('avpc-metric'),v=>{metric=v;curve()});
  // decoding animation: reveal rows of the recorded 32x32 outputs
  const cv={};
  function canvasStrip(id,uris){
    const el=document.getElementById(id);el.innerHTML='';cv[id]=[];
    uris.forEach((u,i)=>{const c=document.createElement('canvas');c.width=28;c.height=28;c.className='av-img';c.setAttribute('aria-label','decoded image '+(i+1));el.appendChild(c);
      const im=new Image();im.onload=()=>{c._im=im;paint(c,c._rows==null?28:c._rows)};im.src=u;cv[id].push(c)});
  }
  function paint(c,rows){c._rows=rows;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,28,28);if(c._im&&rows>0)g.drawImage(c._im,0,0,28,rows,0,0,28,rows);
    if(rows<28&&rows>=0){g.fillStyle='#e8915c';g.fillRect(0,rows,28,1)}}
  const STEPS=29;
  function draw(i){
    const rows=Math.min(28,i);['avpc-own','avpc-prior','avpc-bern'].forEach(id=>(cv[id]||[]).forEach(c=>paint(c,rows)));
    const r=R[run];
    const cap=document.getElementById('avpc-cap');
    cap.innerHTML='<div class="t">'+NM[run]+(i<28?': decoding row '+(rows+1)+' of 28':': done')+'</div><p>'+(i<28?'Each row is predicted from the rows above it and from the code; the orange line is the row being written.':
      (run==='c_noz'?'No code at all: the decoder only continues its own left-and-above context, so the grey-level decodes are identical for every image, and the sampled ones are unrelated to the images above them.':
       r.z_gain_nats<1?'The decodes are the same for every image, whatever its code: the decoder ignores the code (shuffling codes between images costs '+r.z_gain_nats.toFixed(1)+' nats).':
       'The decodes now differ from image to image and roughly follow them (light tops, trouser stripes, flat dark footwear): the code carries '+r.kl_nats.toFixed(1)+' nats, and decoding from another image\'s code costs '+r.z_gain_nats.toFixed(1)+' nats of reconstruction. A rough likeness only: '+r.kl_nats.toFixed(1)+' nats is about '+(r.kl_nats/Math.LN2).toFixed(0)+' bits per image.'))+'</p>';
    document.getElementById('avpc-cnt').innerHTML=RD.stat('KL per image',r.kl_nats.toFixed(2)+' nats')+RD.stat('Active units',r.active_units+' of 16')+RD.stat('Code\'s worth',r.z_gain_nats.toFixed(1)+' nats','reconstruction with a shuffled code minus with its own')+RD.stat('Negative ELBO',r.neg_elbo.toFixed(1)+' nats');
  }
  function setRun(v){run=v;
    document.getElementById('avpc-orig').innerHTML=IMG.orig16.slice(0,8).map((s,i)=>'<img class="av-img" src="'+s+'" alt="test image '+(i+1)+'">').join('');
    canvasStrip('avpc-own',IMG.pc[v+'_own']);canvasStrip('avpc-prior',IMG.pc[v+'_prior']);canvasStrip('avpc-bern',IMG.pc[v+'_bern']);
    document.getElementById('avpc-own-lab').textContent=v==='c_noz'?'Decoded with z = 0 (this model has no code)':'Decoded from each image\'s own code (the mean of its posterior)';
  }
  setRun(run);
  const an=RD.anim({card:'avpc-dec-card',ctl:'avpc-ctl',n:STEPS,draw,ms:110,label:'Row being decoded',tab:'t-avpc',start:STEPS-1});
  RD.seg(document.getElementById('avpc-run'),v=>{setRun(v);an.reset(STEPS);an.play()});
  function dims(){
    const el=document.getElementById('avpc-dims'),W=RD.width(el),ks=['c_b1','c_anneal','c_freebits'].filter(k=>R[k]);
    const H=34+ks.length*44,ml=110,mr=10;let mx=0;ks.forEach(k=>mx=Math.max(mx,...R[k].kl_per_dim));
    let b='';ks.forEach((k,j)=>{const y=10+j*44,d=R[k].kl_per_dim.slice().sort((a,c)=>c-a),bw=(W-ml-mr)/16;
      b+=RD.t(ml-6,y+22,NM[k].split(' (')[0],{a:'end',fs:11});
      d.forEach((v,i)=>{const h=Math.max(.5,v/mx*36);b+='<rect x="'+(ml+i*bw+1).toFixed(1)+'" y="'+(y+36-h).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+COL[k]+'"><title>'+v.toFixed(3)+' nats</title></rect>'})});
    b+=RD.t(ml,H-4,'16 dimensions, sorted; tallest bar '+mx.toFixed(2)+' nats',{fs:10});
    el.innerHTML=RD.svg(W,H,b,'KL per dimension');
  }
  function all(){curve();dims();an.redraw()}
  RD.onRender(all,'t-avpc');RD.onResize(()=>{curve();dims()},'t-avpc');
  all();
})();
