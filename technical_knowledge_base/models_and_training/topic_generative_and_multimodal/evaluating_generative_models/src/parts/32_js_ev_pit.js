// ---- Pitfall explorer (Reading section 5; was the Pitfall lab tab until 2026-10-24) ----
(function(){
  const {E,fmt}=EVH;const t=RD.t;const $=id=>document.getElementById(id);const P=E.pit,J=E.jpeg;
  // each case: rows of [label, key in E.pit, colour]; images: [[uri, caption]]
  const C=[
    {id:'rb',name:'Resize one side (bicubic)',rows:[['real vs test (floor)','real','var(--good)'],['real pre-resized to 299, PIL bicubic','real_bic299','var(--bad)']],ims:[[J.up_ext,'what Inception gets from its own resize (TF-1 bilinear, 28 to 299)'],[J.up_bic,'PIL bicubic 28 to 299']],
     text:'Only the generated side is resized to 299 by a different function before the extractor (whose own resize then does nothing). Bicubic overshoots at edges and blurs differently from the bilinear resize the reference gets.'},
    {id:'rn',name:'Resize one side (nearest)',rows:[['real vs test (floor)','real','var(--good)'],['real pre-resized to 299, nearest','real_near299','var(--bad)']],ims:[[J.up_ext,'TF-1 bilinear (the extractor)'],[J.up_near,'nearest neighbour 28 to 299']],
     text:'Blocky upsampling: the network sees hard pixel edges that the reference images never have.'},
    {id:'rr',name:'Resize both sides (bicubic)',rows:[['real vs test (floor)','real','var(--good)'],['bicubic real vs bicubic test','real_bic299_vs_test_bic299','var(--acc)'],['real vs bicubic test','real_vs_test_bic299','var(--bad)']],ims:[],
     text:'The same function on both sides: back near the floor. Mismatch in the other direction (only the reference resized) shifts it again.'},
    {id:'jm',name:'JPEG on model samples',rows:[['DDPM vs test','ddpm','var(--c1)'],['DDPM JPEG 75 vs test','ddpm_jpeg75','var(--bad)'],['DDPM vs JPEG 75 test','ddpm_vs_test_jpeg75','var(--c5)'],['DDPM JPEG 75 vs JPEG 75 test','ddpm_jpeg75_vs_test_jpeg75','var(--acc)'],
       ['flow vs test','flow','var(--c3)'],['flow JPEG 75 vs test','flow_jpeg75','var(--bad)'],['flow vs JPEG 75 test','flow_vs_test_jpeg75','var(--c5)'],['flow JPEG 75 vs JPEG 75 test','flow_jpeg75_vs_test_jpeg75','var(--acc)']],ims:[],
     text:E.txt['txt:jpeg_models_tab']}];
  $('ev-p-case').innerHTML=C.map((c,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+c.name+'</button>').join('');
  let cur=0;
  function draw(){const c=C[cur];$('ev-p-text').innerHTML='<p>'+c.text+'</p>';
    $('ev-p-ims').innerHTML=c.ims.map(m=>'<figure><img src="'+m[0]+'" alt="'+RD.esc(m[1])+'"><figcaption>'+RD.esc(m[1])+'</figcaption></figure>').join('');
    const host=$('ev-p-svg'),W=Math.min(720,RD.width(host)),lw=W<480?Math.round(W*0.5):260,rh=W<480?40:28,H=c.rows.length*rh+8;
    const mx=Math.max(...c.rows.map(r=>P[r[1]].fid))*1.12;let b='';
    c.rows.forEach((r,j)=>{const y=j*rh+4,v=P[r[1]].fid,w=(W-lw-56)*v/mx;
      if(W<480){b+=t(0,y+11,RD.esc(r[0]),{fs:11});b+='<rect x="0" y="'+(y+16)+'" width="'+Math.max(2,(W-56)*v/mx)+'" height="14" rx="3" fill="'+r[2]+'"/>'+t(Math.max(2,(W-56)*v/mx)+5,y+28,fmt(v,2),{fs:11})}
      else{b+=t(0,y+15,RD.esc(r[0]),{fs:11.5});b+='<rect x="'+lw+'" y="'+y+'" width="'+Math.max(2,w)+'" height="18" rx="3" fill="'+r[2]+'"/>'+t(lw+w+6,y+14,fmt(v,2),{fs:11.5})}});
    host.innerHTML=RD.svg(W,H,b,'FID for '+c.name);}
  RD.seg($('ev-p-case'),m=>{cur=+m;draw()});
  function pub(){const host=$('ev-p-pub'),W=Math.min(720,RD.width(host));const L1=[['PIL bilinear',0.64],['TensorFlow bilinear',4.34],['PyTorch bilinear',4.36],['naive nearest',7.43]],
      L2=[['PIL bicubic',2.98],['PIL bilinear',4.03],['TensorFlow bilinear',7.45],['PyTorch bilinear',7.45],['naive nearest',10.67]];
    const two=W>=560,cw=two?(W-20)/2:W,lw=130;let b='',h=0;
    [[L1,'real vs real (right answer 0)'],[L2,'StyleGAN2 vs real']].forEach(([rows,title],i)=>{const x0=two?i*(cw+20):0,y0=two?0:i*(rows.length*24+40);
      b+=t(x0,y0+12,title,{fs:11.5,w:600});rows.forEach((r,j)=>{const y=y0+22+j*24,w=(cw-lw-44)*r[1]/11;b+=t(x0,y+13,r[0],{fs:11});b+='<rect x="'+(x0+lw)+'" y="'+y+'" width="'+w+'" height="16" rx="3" fill="var(--c4)"/>'+t(x0+lw+w+5,y+13,fmt(r[1],2),{fs:11})});
      h=Math.max(h,y0+22+rows.length*24+6)});
    host.innerHTML=RD.svg(W,h,b,'clean-fid Table 1');}
  if(!$('ev-p-case'))return;
  RD.onRender(()=>{draw();pub()});RD.onResize(()=>{draw();pub()});draw();pub();
})();
