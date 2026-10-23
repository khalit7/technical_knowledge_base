// ---- Reading, training in low precision: one linear layer's three matmuls per step, the format of each input under five recipes (toggle-compare, static) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-tr'))return;
  // fmt: [text, family] family 32 | 16 | 8 | 4 sets the colour
  const RC={
    fp16:{rows:[['X','fp16',16],['W','fp16 copy',16],['dY','fp16, loss × S',16],['W','fp16 copy',16],['dY','fp16, loss × S',16],['X','fp16',16]],acc:'fp32',state:'master W, Adam m, v: fp32'},
    bf16:{rows:[['X','bf16',16],['W','bf16 copy',16],['dY','bf16',16],['W','bf16 copy',16],['dY','bf16',16],['X','bf16',16]],acc:'fp32',state:'master W, Adam m, v: fp32'},
    te:{rows:[['X','E4M3, per tensor',8],['W','E4M3, per tensor',8],['dY','E5M2, per tensor',8],['W','E4M3, per tensor',8],['dY','E5M2, per tensor',8],['X','E4M3, per tensor',8]],acc:'higher precision',state:'master W: higher precision'},
    ds:{rows:[['X','E4M3, 1×128 tiles',8],['W','E4M3, 128×128',8],['dY','E4M3, fine-grained',8],['W','E4M3, 128×128',8],['dY','E4M3, fine-grained',8],['X','E4M3, fine-grained',8]],acc:'fp32 every 128',state:'master W: higher precision'},
    nv:{rows:[['X','NVFP4, per 16',4],['W','NVFP4, 16×16',4],['dY','NVFP4, stoch. round',4],['W','NVFP4, 16×16',4],['dY','NVFP4 + Hadamard',4],['X','NVFP4 + Hadamard',4]],acc:'higher precision',state:''}};
  const G=[['Forward','Y = X · Wᵀ','Y'],['Data gradient','dX = dY · W','dX'],['Weight gradient','dW = dYᵀ · X','dW']];
  const COL={32:'var(--mute)',16:'var(--c1)',8:'var(--c2)',4:'var(--c3)'};
  let k='bf16';
  function chip(x,y,w,h,name,txt,fam){
    return '<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="6" fill="'+COL[fam]+'" fill-opacity=".16" stroke="'+COL[fam]+'"/>'+
      RD.t(x+6,y+14,'<tspan font-weight="600">'+name+'</tspan>',{fs:11.5})+RD.t(x+6,y+29,txt,{fs:11})}
  function draw(){
    const r=RC[k],W=RD.width($('rd-trP')),nar=W<560,gap=6;
    let s='',y=2;
    G.forEach((g,i)=>{
      s+=RD.t(0,y+12,'<tspan font-weight="600">'+g[0]+'</tspan>  '+g[1],{fs:11.5,fill:'var(--ink)'});y+=18;
      const a=r.rows[2*i],b=r.rows[2*i+1];
      if(nar){const cw=(W-2*gap)/3;
        s+=chip(0,y,cw,36,a[0],a[1],a[2])+chip(cw+gap,y,cw,36,b[0],b[1],b[2])+chip(2*(cw+gap),y,cw,36,'sum in',r.acc,32);y+=44}
      else{const cw=(W-3*gap-18)/4;
        s+=chip(0,y,cw,36,a[0],a[1],a[2])+chip(cw+gap,y,cw,36,b[0],b[1],b[2]);
        s+='<path d="M'+(2*cw+2*gap)+','+(y+18)+' l12,0 m-5,-4 l5,4 l-5,4" fill="none" stroke="var(--mute)"/>';
        s+=chip(2*cw+2*gap+18,y,cw,36,'sum in',r.acc,32)+chip(3*cw+3*gap+18,y,cw,36,g[2],g[2]==='dW'?'to the optimiser':'to the next layer',16);y+=44}});
    $('rd-trP').innerHTML=RD.svg(W,y,s,'Formats of the inputs to the three matmuls of one linear layer');
    $('rd-trM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===k));
    document.querySelectorAll('#rd-tr .rd-trx').forEach(d=>{d.hidden=d.dataset.k!==k});
  }
  RD.seg($('rd-trM'),m=>{k=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
