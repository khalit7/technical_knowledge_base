// ---- Section 5, resizing: the three resized images and the clean-fid Table 1 chart (the cases themselves are the stage, 28_js_sc3pit.js) ----
(function(){
  const {E,fmt}=EVH;const t=RD.t;const $=id=>document.getElementById(id);const J=E.jpeg;if(!$('ev-p-ims'))return;
  // what each resize hands the network: the extractor's own (TensorFlow-1 bilinear), PIL bicubic and nearest neighbour, 28 to 299 px
  $('ev-p-ims').innerHTML=[[J.up_ext,'the extractor\'s own resize (TensorFlow-1 bilinear): what the reference gets'],[J.up_bic,'PIL bicubic, applied to one set only'],[J.up_near,'nearest neighbour, applied to one set only']]
    .map(m=>'<figure><img src="'+m[0]+'" alt="One Fashion-MNIST image upsampled from 28 to 299 px: '+RD.esc(m[1])+'"><figcaption>'+RD.esc(m[1])+'</figcaption></figure>').join('');
  function pub(){const host=$('ev-p-pub'),W=Math.min(720,RD.width(host));const L1=[['PIL bilinear',0.64],['TensorFlow bilinear',4.34],['PyTorch bilinear',4.36],['naive nearest',7.43]],
      L2=[['PIL bicubic',2.98],['PIL bilinear',4.03],['TensorFlow bilinear',7.45],['PyTorch bilinear',7.45],['naive nearest',10.67]];
    const two=W>=560,cw=two?(W-20)/2:W,lw=130;let b='',h=0;
    [[L1,'real vs real (right answer 0)'],[L2,'StyleGAN2 vs real']].forEach(([rows,title],i)=>{const x0=two?i*(cw+20):0,y0=two?0:i*(rows.length*24+40);
      b+=t(x0,y0+12,title,{fs:11.5,w:600});rows.forEach((r,j)=>{const y=y0+22+j*24,w=(cw-lw-44)*r[1]/11;b+=t(x0,y+13,r[0],{fs:11});b+='<rect x="'+(x0+lw)+'" y="'+y+'" width="'+w+'" height="16" rx="3" fill="var(--c4)"/>'+t(x0+lw+w+5,y+13,fmt(r[1],2),{fs:11})});
      h=Math.max(h,y0+22+rows.length*24+6)});
    host.innerHTML=RD.svg(W,h,b,'clean-fid Table 1');}
  RD.onRender(pub);RD.onResize(pub);pub();
})();
