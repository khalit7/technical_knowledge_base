// ---- Latent lab: 2-D latent explorers (sections 3 and 4), prior samples, interpolation (section 5) ----
(function(){if(!window.LT)return;
  const L=window.LT,D=L.D,$=L.$;
  const CLS=['T-shirt/top','Trouser','Pullover','Dress','Coat','Sandal','Shirt','Sneaker','Bag','Ankle boot'];
  const COL=['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac'];
  const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const lab=b64(D.scatter.labels);
  const pts={ae2:b64(D.scatter.ae2),vae2:b64(D.scatter.vae2)},vsig=b64(D.scatter.vae2_sigma);
  // legend
  ['lt-ex-leg'].forEach(id=>{const el=$(id);if(el)el.innerHTML=CLS.map((c,i)=>'<span><i style="background:'+COL[i]+'"></i>'+c+'</span>').join('')});
  function explorer(name){
    const g=D.tiny.runs[name].grid,cv=$('lt-ex-'+name),out=$('lt-ex-'+name+'-out'),rd=$('lt-ex-'+name+'-rd');
    const st={x:null,y:null,mode:'pts',sel:-1};
    const toZ=(u,v)=>[g.lo[0]+u*(g.hi[0]-g.lo[0]),g.hi[1]-v*(g.hi[1]-g.lo[1])]; // u,v in [0,1], v down
    const toUV=(z1,z2)=>[(z1-g.lo[0])/(g.hi[0]-g.lo[0]),(g.hi[1]-z2)/(g.hi[1]-g.lo[1])];
    function draw(){
      const W=Math.min(L.width(cv.parentElement),360),dpr=Math.min(2,window.devicePixelRatio||1);
      cv.width=Math.round(W*dpr);cv.height=Math.round(W*dpr);cv.style.width=W+'px';cv.style.height=W+'px';
      const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
      const cs=getComputedStyle(document.body),ink=cs.getPropertyValue('--ink')||'#333',line=cs.getPropertyValue('--line')||'#ddd';
      c.fillStyle=cs.getPropertyValue('--soft')||'#f7f6f3';c.fillRect(0,0,W,W);
      const fin=()=>{
        // N(0, I): circle of radius 2 (95% of the mass inside about 2.45 in 2-D; 2 drawn as a guide)
        const o=toUV(0,0),r1=toUV(2,0);c.strokeStyle=ink;c.globalAlpha=.6;c.setLineDash([4,3]);c.beginPath();c.arc(o[0]*W,o[1]*W,Math.abs(r1[0]-o[0])*W,0,7);c.stroke();c.setLineDash([]);c.globalAlpha=1;
        c.fillStyle=ink;c.font='11px ui-sans-serif,-apple-system,sans-serif';c.fillText('N(0, I): 86% inside',Math.min(W-100,o[0]*W+4),Math.max(12,o[1]*W-Math.abs(r1[0]-o[0])*W-4));
        if(st.x!=null){c.strokeStyle=ink;c.lineWidth=1.5;c.beginPath();c.arc(st.x*W,st.y*W,6,0,7);c.stroke();c.beginPath();c.moveTo(st.x*W-10,st.y*W);c.lineTo(st.x*W+10,st.y*W);c.moveTo(st.x*W,st.y*W-10);c.lineTo(st.x*W,st.y*W+10);c.stroke();c.lineWidth=1}
        if(name==='vae2'&&st.sel>=0){const P=pts.vae2,u=P[2*st.sel]/255,v=P[2*st.sel+1]/255,s1=vsig[2*st.sel]/255*2,s2=vsig[2*st.sel+1]/255*2;
          const sx=s1*2/(g.hi[0]-g.lo[0])*W,sy=s2*2/(g.hi[1]-g.lo[1])*W;c.strokeStyle=COL[lab[st.sel]];c.lineWidth=2;c.beginPath();c.ellipse(u*W,v*W,Math.max(1,sx),Math.max(1,sy),0,0,7);c.stroke();c.lineWidth=1}};
      if(st.mode==='grid'){L.sprite('grid_'+name,(im,s)=>{c.imageSmoothingEnabled=false;c.drawImage(im,0,0,s.cols*s.w,s.cols*s.w,0,0,W,W);fin()});return}
      c.fillStyle=ink;c.globalAlpha=.35;for(let a=0;a<g.n;a++)for(let b=0;b<g.n;b++){c.fillRect(a/(g.n-1)*W-1.5,b/(g.n-1)*W-1.5,3,3)}c.globalAlpha=1;
      const P=pts[name];for(let i=0;i<lab.length;i++){c.fillStyle=COL[lab[i]];c.globalAlpha=.75;c.beginPath();c.arc(P[2*i]/255*W,P[2*i+1]/255*W,2.1,0,7);c.fill()}c.globalAlpha=1;fin();
    }
    function pick(u,v){const n=g.n,q=Math.round(Math.max(0,Math.min(1,u))*(n-1)),r=Math.round(Math.max(0,Math.min(1,v))*(n-1));
      st.x=q/(n-1);st.y=r/(n-1);const z=toZ(st.x,st.y);   // snap to the nearest precomputed decode
      L.tile(out,'grid_'+name,r*n+q,112);
      // nearest test code
      const P=pts[name];let best=-1,bd=1e9;for(let i=0;i<lab.length;i++){const dx=P[2*i]/255-st.x,dy=P[2*i+1]/255-st.y,d=dx*dx+dy*dy;if(d<bd){bd=d;best=i}}
      st.sel=name==='vae2'?best:-1;
      const dist=Math.sqrt(bd)*(g.hi[0]-g.lo[0]);
      rd.innerHTML='Decoded at the nearest grid point (small grey dots), z = ('+z[0].toFixed(2)+', '+z[1].toFixed(2)+'): decode '+(r*n+q+1)+' of '+(n*n)+' ('+n+' &#215; '+n+'). Nearest test image\'s code: a '+CLS[lab[best]]+', '+dist.toFixed(2)+' away'+(name==='vae2'?' (its &#177;2&#963; ellipse drawn)':'')+'.';
      draw()}
    let down=false;
    const ev=e=>{const r=cv.getBoundingClientRect(),p=e.touches?e.touches[0]:e;pick((p.clientX-r.left)/r.width,(p.clientY-r.top)/r.height)};
    cv.addEventListener('pointerdown',e=>{down=true;cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);ev(e)});
    cv.addEventListener('pointermove',e=>{if(down)ev(e)});
    cv.addEventListener('pointerup',()=>{down=false});cv.addEventListener('pointercancel',()=>{down=false});
    cv.addEventListener('keydown',e=>{const k={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!k)return;e.preventDefault();pick((st.x==null?.5:st.x)+k[0]/(g.n-1),(st.y==null?.5:st.y)+k[1]/(g.n-1))});
    L.seg($('lt-ex-'+name+'-mode'),v=>{st.mode=v;draw()});
    const o=toUV(0,0);
    L.onRender(()=>{draw();if(st.x==null)pick(o[0],o[1])});
    return {pick,draw};
  }
  const EX={ae2:explorer('ae2'),vae2:explorer('vae2')};
  document.querySelectorAll('#t-latent [data-lt-pick]').forEach(b=>b.addEventListener('click',()=>{const [n,z1,z2]=b.dataset.ltPick.split(',');const g=D.tiny.runs[n].grid;
    EX[n].pick((+z1-g.lo[0])/(g.hi[0]-g.lo[0]),(g.hi[1]-(+z2))/(g.hi[1]-g.lo[1]))}));

  // prior samples: sprite rows
  function strip(el,sp,key,n,cols){el.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';
    el.innerHTML=Array.from({length:n},(_,k)=>'<canvas data-sp="'+sp+'" data-k="'+L.ti(sp,key,k)+'" data-px="28" width="28" height="28" aria-hidden="true"></canvas>').join('');
    el.querySelectorAll('canvas').forEach(cv=>{L.sprite(sp,(im,s)=>{const k=+cv.dataset.k,r=Math.floor(k/s.cols),q=k%s.cols;cv.width=s.w;cv.height=s.w;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(im,q*s.w,r*s.w,s.w,s.w,0,0,s.w,s.w)})})}
  L.LTstrip=strip;
  const PR=[['ae2_prior','Autoencoder, 2-d: z from N(0, I)','ae2','prior_std_normal'],['ae2_fit','Autoencoder, 2-d: z from a Gaussian fitted to its own codes','ae2','prior_fitted_gaussian'],['vae2_prior','VAE, 2-d: z from N(0, I)','vae2','prior'],
    ['ae16_prior','Autoencoder, 16-d: z from N(0, I)','ae16','prior_std_normal'],['ae16_fit','Autoencoder, 16-d: z from a fitted Gaussian','ae16','prior_fitted_gaussian'],['vae16_b1p0_prior','VAE, 16-d (beta 1): z from N(0, I)','vae16_b1p0','prior']];
  const host=$('lt-prior');
  host.innerHTML=PR.map((p,i)=>'<div class="lt-rlab">'+p[1]+': <b>FD '+L.D.tiny.runs[p[2]][p[3]].fd.toFixed(0)+'</b>, classifier confidence '+Math.round(L.D.tiny.runs[p[2]][p[3]].conf*100)+'%</div><div class="lt-strip" id="lt-prior-'+i+'"></div>').join('');
  PR.forEach((p,i)=>strip($('lt-prior-'+i),'prior',p[0],8,8));
  // FD bars
  function fdBars(){const el=$('lt-fd-bars');const rows=PR.map(p=>[p[1],L.D.tiny.runs[p[2]][p[3]]]);const fl=D.tiny.floor;const mx=Math.max(...rows.map(r=>r[1].fd));
    el.innerHTML='<div class="bars">'+rows.concat([['Real images (1,000 validation): the floor',fl]]).map(r=>'<div class="row'+(r[0].startsWith('Real')?' hl':'')+'"><span class="nm" title="'+r[0]+'">'+r[0].replace(': z from',':').replace(' a Gaussian fitted to its own codes',' fitted Gaussian')+'</span><span class="track"><span class="fill" style="width:'+(Math.max(.5,r[1].fd/mx*100)).toFixed(1)+'%;background:'+(r[0].startsWith('Real')?'var(--good)':r[0].startsWith('VAE')?'var(--c1)':'var(--c2)')+'"></span></span><span class="val">'+r[1].fd.toFixed(0)+'</span></div>').join('')+'</div>'}
  fdBars();

  // interpolation (section 5): rows per pair: pixel, ae16, vae16
  const pairs=D.tiny.pairs;let pi=0,mode=0,an;
  const pc=$('lt-ip-pairs');pc.innerHTML=pairs.map((p,i)=>'<button data-v="'+i+'" class="'+(i?'':'on')+'" aria-pressed="'+(i?'false':'true')+'">'+CLS[p[0]%10]+' &#8594; '+CLS[p[1]>=10?p[1]-10:p[1]]+'</button>').join('');
  L.seg(pc,v=>{pi=+v;an.redraw();strips()});
  L.seg($('lt-ip-mode'),v=>{mode=+v;an.redraw()});
  const MN=['Pixel cross-fade: (1 - t) x_a + t x_b','16-number autoencoder: decode((1 - t) z_a + t z_b)','16-number VAE: decode((1 - t) &#956;_a + t &#956;_b)'];
  function strips(){[0,1,2].forEach(m=>{const el=$('lt-ip-s'+m);el.style.gridTemplateColumns='repeat(9,minmax(0,1fr))';
    el.innerHTML=Array.from({length:9},(_,k)=>'<canvas width="28" height="28" aria-hidden="true"></canvas>').join('');
    el.querySelectorAll('canvas').forEach((cv,k)=>L.sprite('interp',(im,s)=>{const t=(pi*3+m)*9+k,r=Math.floor(t/s.cols),q=t%s.cols;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(im,q*s.w,r*s.w,s.w,s.w,0,0,28,28)}))})}
  strips();
  an=L.anim({card:'lt-ip-card',ctl:'lt-ip-ctl',n:9,ms:700,label:'Interpolation step t',draw(i){
    L.tile($('lt-ip-big'),'interp',(pi*3+mode)*9+i,140);
    $('lt-ip-cap').innerHTML='<b>t = '+(i/8).toFixed(3)+'.</b> '+MN[mode]+'. '+(mode===0?'Two garments overlaid at partial opacity: every in-between image is a ghost, not a garment.':mode===1?'Each in-between image is one garment, but the path can cross regions the decoder never saw.':'Each in-between image is a plausible garment that morphs in shape.')}});
})();
