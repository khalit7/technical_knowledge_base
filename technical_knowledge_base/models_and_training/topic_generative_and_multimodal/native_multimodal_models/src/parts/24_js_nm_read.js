// ---- Reading tab: recorded numbers into the prose (prefill.py writes the same values statically), token viewer, three-way decoding stepper, equal-compute chart ----
(function(){
  const N=window.NM;if(!N)return;
  const $=id=>document.getElementById(id),E=RD.esc;
  const get=p=>{let v=N.d;for(const k of p.split('.')){if(v==null)break;v=v[k]}if(v!==undefined&&v!==null)return v;v=N;for(const k of p.split('.')){if(v==null)return undefined;v=v[k]}return v};
  const fmt=(v,f)=>{if(v==null)return 'n/a';if(typeof v==='string')return v;
    if(f==='int')return Math.round(v).toLocaleString('en-US');if(f==='pct')return (100*v).toFixed(1)+'%';if(f==='g')return (v/1e9).toFixed(2);if(f==='t')return (v/1e12).toFixed(0);if(f==='m')return (v/1e6).toFixed(1);
    if(f==='1')return (+v).toFixed(1);if(f==='2')return (+v).toFixed(2);return Number.isInteger(v)?v.toLocaleString('en-US'):(+v).toFixed(2)};
  document.querySelectorAll('[data-nm]').forEach(el=>{el.textContent=fmt(get(el.dataset.nm),el.dataset.f)});
  const misImg=$('nm-mis-img');if(misImg)misImg.src=N.img.mis_garbage;
  const sprite=(key,i,cv)=>{const im=new Image();im.onload=()=>{const c=cv.getContext('2d');c.clearRect(0,0,28,28);c.drawImage(im,i*28,0,28,28,0,0,28,28)};im.src=N.img[key]};
  // ---- section 2: one image as 64 codes
  const CL=['T-shirt','trouser','pullover','dress','coat','sandal','shirt','sneaker','bag','ankle boot'];
  function tv(c){
    if(!$('nm-tv-pick'))return;
    sprite('test_orig',c,$('nm-tv-orig'));sprite('test_rec_fsq1000',c,$('nm-tv-fsq'));sprite('test_rec_vq128',c,$('nm-tv-vq'));
    const t=N.tok.fsq1000.test16_tokens[c];
    $('nm-tv-grid').innerHTML=t.map(v=>'<span class="'+(v===472?'':'f')+'">'+v+'</span>').join('');
    $('nm-tv-pick').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.m===c));
  }
  if($('nm-tv-pick')){$('nm-tv-pick').innerHTML=CL.map((n,i)=>'<button data-m="'+i+'"'+(i===2?' class="on"':'')+'>'+n+'</button>').join('');
    RD.seg($('nm-tv-pick'),m=>tv(+m));tv(2)}
  // per-position bits: without context (unigram entropy at that position) and with the AR model (its NLL there)
  function heat(el,vals,max,title){const w=Math.min(240,RD.width(el.parentNode)),c=w/8;let s='';
    vals.forEach((v,j)=>{const x=(j%8)*c,y=Math.floor(j/8)*c,a=Math.min(1,v/max);
      s+='<rect x="'+x+'" y="'+y+'" width="'+(c-1)+'" height="'+(c-1)+'" fill="var(--c2)" fill-opacity="'+(0.08+0.92*a).toFixed(3)+'"><title>'+title+' '+v.toFixed(2)+' bits</title></rect>'+
      (c>26?RD.t(x+c/2,y+c/2+4,v.toFixed(1),{a:'middle',fs:11}):'')});
    el.innerHTML=RD.svg(w,w,s,title)}
  function heats(){if(!$('nm-heat-a'))return;heat($('nm-heat-a'),N.tok.fsq1000.pos_entropy_bits,8,'no context');heat($('nm-heat-b'),N.d.bpp,8,'AR model')}
  RD.onRender(heats);RD.onResize(heats);heats();
  // ---- section 4: one image three ways (before/after on the same class)
  const card=$('nm-3w-card');
  if(card){
    const lin=N.tok.flops_ar1000_fwd_1/64,L=6,D=192;
    const M={
      ar:{n:65,key:c=>'ar_frames__1.0_c'+c,calls:i=>i,fl:i=>{let f=0;for(let j=0;j<i;j++)f+=lin+4*L*D*(j+1);return f},
        cap:i=>i===0?'Nothing written yet: the decoder shows the background code everywhere.':i<64?'Call '+i+' of 64 writes the code at row '+(Math.floor((i-1)/8)+1)+', column '+((i-1)%8+1)+'. Each call processes one new token and reads the cached keys and values of all earlier ones.':'All 64 codes written: 64 sequential calls, each small.'},
      mask:{n:9,key:c=>'mask_frames__8_c'+c,calls:i=>i,fl:i=>i*N.d.mask_pass_flops,off:1,
        cap:i=>i===0?'All 64 positions start masked.':i<8?'Round '+i+' of 8: the model predicts every masked position at once, keeps the most confident, re-masks the rest (cosine schedule). One full pass over all 65 positions per round.':'Round 8 fills the last positions: 8 sequential calls, each a full pass.'},
      ddim:{n:21,key:c=>'ddim20_c'+c,calls:i=>i,fl:i=>i*N.tok.flops_unet_fwd_1,
        cap:i=>i===0?'Pure Gaussian noise at 32 x 32 pixels (the topic\'s recorded DDIM run, 20 steps).':i<20?'Step '+i+' of 20: the U-Net predicts the noise over every pixel and the sampler removes a slice of it.':'Step 20: the image. 20 sequential calls, each over the whole image.'}};
    let mode='ar',cls=3,img=new Image();
    const can=$('nm-3w-can'),cx=can.getContext('2d');
    let bgi=new Image();
    function load(){img=new Image();img.onload=()=>draw(A.i);img.src=N.img[M[mode].key(cls)];bgi=new Image();bgi.onload=()=>draw(A.i);bgi.src=N.img[M.ar.key(cls)]}
    function draw(i){const m=M[mode];i=Math.min(i,m.n-1);
      cx.fillStyle='#000';cx.fillRect(0,0,28,28);
      const fi=m.off?i-1:i;
      if(img.complete&&img.naturalWidth&&fi>=0)cx.drawImage(img,fi*28,0,28,28,0,0,28,28);
      else if(fi<0&&bgi.complete&&bgi.naturalWidth)cx.drawImage(bgi,0,0,28,28,0,0,28,28);   // all masked: decoded background
      $('nm-3w-cnt').innerHTML=RD.stat('Sequential calls',String(m.calls(i)),'')+RD.stat('Compute so far',(m.fl(i)/1e9).toFixed(3)+' GFLOP','per image, 2 FLOPs per multiply-add')+RD.stat('Per call',mode==='ar'?'1 new token':mode==='mask'?'all 65 positions':'all 1,024 pixels','');
      $('nm-3w-cap').innerHTML='<div class="t">'+(mode==='ar'?'Autoregressive, raster order':mode==='mask'?'Masked, 8 parallel rounds':'Diffusion (DDIM), 20 steps')+'</div><p>'+E(m.cap(i))+'</p>'}
    var A=RD.anim({card:'nm-3w-card',ctl:'nm-3w-ctl',n:M.ar.n,draw,ms:260,label:'Step'});
    RD.seg($('nm-3w-mode'),m=>{mode=m;A.reset(M[m].n);load()});
    RD.seg($('nm-3w-cls'),c=>{cls=+c;load();A.go(0)});
    load();
  }
  // ---- section 5: equal compute
  if($('nm-cmp')){
    const R=N.d.rows,sci=v=>v==null?'n/a':v>=1e12?(v/1e12).toFixed(2)+' T':v>=1e9?(v/1e9).toFixed(2)+' G':(v/1e6).toFixed(0)+' M';
    $('nm-cmp').innerHTML='<tr><th>Model and sampler</th><th class="num">Parameters</th><th class="num">Training FLOPs</th><th class="num">Training time</th><th class="num">Calls per image</th><th class="num">Sampling FLOPs per image</th><th class="num">FD</th><th class="num">Right class</th></tr>'+
      R.map(r=>'<tr><td>'+E(r.name)+'</td><td class="num">'+(r.params/1e6).toFixed(2)+'M</td><td class="num">'+sci(r.train_flops)+'</td><td class="num">'+Math.round(r.train_s)+' s</td><td class="num">'+r.calls.toLocaleString('en-US')+'</td><td class="num">'+sci(r.flops)+'</td><td class="num">'+r.fd.toFixed(1)+'</td><td class="num">'+(100*r.acc).toFixed(1)+'%</td></tr>').join('');
    function bars(){const el=$('nm-cmp-bars');const w=RD.width(el),lw=Math.min(130,w*0.36),h=R.length*24+40,mx=Math.max(...R.map(r=>r.fd),N.tok.fsq1000.recon_val1000_fd)*1.1;
      const X=v=>lw+(w-lw-40)*v/mx;let s='';const SH=['AR, s = 1','AR, s = '+N.d.best_cfg.s,'Masked, 8 rounds','DDPM, 1,000 steps','DDIM 50, s = 2','Flow, 50 steps','Flow 50, s = 1.5'];
      R.forEach((r,i)=>{const y=8+i*24;s+=RD.t(lw-6,y+12,E(SH[i]),{a:'end',fs:10})+
        '<rect x="'+lw+'" y="'+y+'" width="'+(X(r.fd)-lw)+'" height="16" rx="2" fill="'+(i<3?'var(--c1)':'var(--c6)')+'"></rect>'+RD.t(X(r.fd)+4,y+12,r.fd.toFixed(1),{fs:10})});
      const yb=8+R.length*24;
      [[N.tok.fsq1000.recon_val1000_fd,'tokenizer ceiling','var(--bad)'],[N.tok.floor_fd_val1000,'real images','var(--good)']].forEach(([v,l,c],j)=>{
        s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="4" y2="'+yb+'" stroke="'+c+'" stroke-dasharray="4 3"/>'+RD.t(X(v),yb+12+j*12,l+' '+v.toFixed(1),{a:'middle',fs:10,fill:c})});
      el.innerHTML=RD.svg(w,h,s,'FD of each model, lower is better')}
    RD.onRender(bars);RD.onResize(bars);bars();
  }
})();
