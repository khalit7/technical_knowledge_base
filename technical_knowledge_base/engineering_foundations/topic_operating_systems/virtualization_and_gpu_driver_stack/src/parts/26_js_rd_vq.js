// ---- Reading s6: four 4 KiB reads through one virtqueue, one at a time against posted together ----
(function(){
  const rings=document.getElementById('vq-rings');if(!rings)return;
  let mode='one',steps=[];
  // a step: {desc:[12 states], avail:n, used:n, kicks, irqs, done, t, p}
  function build(){steps=[];const s={desc:Array(12).fill(0),avail:0,used:0,kicks:0,irqs:0,done:0};
    const push=(t,p)=>steps.push(Object.assign({},s,{desc:s.desc.slice(),t,p}));
    push('Empty queue','The guest has four 4 KiB reads to do. Each request needs three descriptors: a header (read sector N), the data buffer, a status byte.');
    const fill=r=>{for(let j=0;j<3;j++)s.desc[r*3+j]=1;s.avail++};
    const serve=r=>{for(let j=0;j<3;j++)s.desc[r*3+j]=2;s.used++};
    const free=r=>{for(let j=0;j<3;j++)s.desc[r*3+j]=0};
    if(mode==='one'){for(let r=0;r<4;r++){
      fill(r);push('Request '+(r+1)+': descriptors filled, head put in the available ring','Plain memory writes by the guest driver; no exit yet.');
      s.kicks++;push('Kick: one register write, one VM exit','The device has no idea the ring moved until the guest notifies it. With nothing else outstanding, the guest must.');
      serve(r);push('The device does the read and fills the used ring','QEMU reads the request out of guest memory, reads the disk image, writes the data straight into the guest buffer, adds a used entry.');
      s.irqs++;s.done++;free(r);s.avail--;s.used--;push('Interrupt: the guest completes request '+(r+1),'One injected interrupt (with its own exits, section 5) per request. The guest frees the descriptors and only then issues the next read.');}}
    else{for(let r=0;r<4;r++)fill(r);push('All four requests posted','Twelve descriptors filled and four heads in the available ring: plain memory writes.');
      s.kicks++;push('One kick for all four','virtqueue_kick_prepare decides one notification covers them; the device was told where to look once.');
      for(let r=0;r<4;r++)serve(r);push('The device serves all four','It walks the available ring, does four reads, writes four used entries.');
      s.irqs++;s.done=4;for(let r=0;r<4;r++)free(r);s.avail=0;s.used=0;push('One interrupt completes all four','With the event index the device interrupts once; the guest\'s handler finds four used entries. Measured on this VM\'s disk at queue depth 32: 0.112 interrupts per request.')}
  }
  function draw(i){const s=steps[i];const cell=(n,arr)=>'<div class="slots">'+arr.map(v=>'<i class="'+(v===1?'f':v===2?'d':'')+'"></i>').join('')+'</div>';
    rings.innerHTML='<div'+(s.desc.some(v=>v)?' class="on"':'')+'><b>Descriptor table</b>'+cell(12,s.desc)+'</div>'+
      '<div'+(s.avail?' class="on"':'')+'><b>Available ring</b>'+cell(4,[0,1,2,3].map(k=>k<s.avail?1:0))+'</div>'+
      '<div'+(s.used?' class="on"':'')+'><b>Used ring</b>'+cell(4,[0,1,2,3].map(k=>k<s.used?2:0))+'</div>';
    document.getElementById('vq-cnt').innerHTML=RD.stat('Requests completed',s.done+' / 4','')+RD.stat('Kicks (VM exits)',s.kicks,'')+RD.stat('Interrupts',s.irqs,'');
    document.getElementById('vq-cap').innerHTML='<div class="t">'+s.t+'</div><p>'+s.p+'</p>'}
  build();
  const a=RD.anim({card:'vq-card',ctl:'vq-ctl',n:steps.length,draw,ms:1300,label:'Virtqueue step'});
  RD.seg(document.getElementById('vq-mode'),m=>{mode=m;build();a.reset(steps.length);a.play()});
})();
