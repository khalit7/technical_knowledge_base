// ---- Reading tab: recorded numbers into the prose (prefill.py writes the same values statically), the bits-per-position heat maps, the equal-compute chart ----
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
  // (section 2's token viewer became Fig. 2, 28_js_sc2tok.js)
  // per-position bits: without context (unigram entropy at that position) and with the AR model (its NLL there)
  function heat(el,vals,max,title){const w=Math.min(240,RD.width(el.parentNode)),c=w/8;let s='';
    vals.forEach((v,j)=>{const x=(j%8)*c,y=Math.floor(j/8)*c,a=Math.min(1,v/max);
      s+='<rect x="'+x+'" y="'+y+'" width="'+(c-1)+'" height="'+(c-1)+'" fill="var(--c2)" fill-opacity="'+(0.08+0.92*a).toFixed(3)+'"><title>'+title+' '+v.toFixed(2)+' bits</title></rect>'+
      (c>26?RD.t(x+c/2,y+c/2+4,v.toFixed(1),{a:'middle',fs:11}):'')});
    el.innerHTML=RD.svg(w,w,s,title)}
  function heats(){if(!$('nm-heat-a'))return;heat($('nm-heat-a'),N.tok.fsq1000.pos_entropy_bits,8,'no context');heat($('nm-heat-b'),N.d.bpp,8,'AR model')}
  RD.onRender(heats);RD.onResize(heats);heats();
  // (section 4's three-way stepper became Fig. 4, 28_js_sc4par.js)
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
