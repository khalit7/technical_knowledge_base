// ---- Reading s6 (Fig. 6): four 4 KiB reads through one virtqueue, one at a time against posted together ----
// Each step's explanation is the ol.sx list on the left (sx-vq-one, sx-vq-batch); the card draws the three parts of the queue and the counters.
// Queue depth 1 is grouped (the long-replay rule): request 1 in four beats, then requests 2 to 4 as one step.
(function(){
  const rings=document.getElementById('vq-rings');if(!rings)return;
  let mode='one',steps=[];
  function build(){steps=[];const s={desc:Array(12).fill(0),avail:0,used:0,kicks:0,irqs:0,done:0};
    const push=()=>steps.push(Object.assign({},s,{desc:s.desc.slice()}));
    const fill=r=>{for(let j=0;j<3;j++)s.desc[r*3+j]=1;s.avail++};
    const serve=r=>{for(let j=0;j<3;j++)s.desc[r*3+j]=2;s.used++};
    const free=r=>{for(let j=0;j<3;j++)s.desc[r*3+j]=0};
    const complete=r=>{s.irqs++;s.done++;free(r);s.avail--;s.used--};
    push();
    if(mode==='one'){fill(0);push();s.kicks++;push();serve(0);push();complete(0);push();
      for(let r=1;r<4;r++){fill(r);s.kicks++;serve(r);complete(r)}push()}
    else{for(let r=0;r<4;r++)fill(r);push();s.kicks++;push();for(let r=0;r<4;r++)serve(r);push();
      s.irqs++;s.done=4;for(let r=0;r<4;r++)free(r);s.avail=0;s.used=0;push()}
  }
  function draw(i){const s=steps[i];const cell=arr=>'<div class="slots">'+arr.map(v=>'<i class="'+(v===1?'f':v===2?'d':'')+'"></i>').join('')+'</div>';
    rings.innerHTML='<div'+(s.desc.some(v=>v)?' class="on"':'')+'><b>Descriptor table</b>'+cell(s.desc)+'</div>'+
      '<div'+(s.avail?' class="on"':'')+'><b>Available ring</b>'+cell([0,1,2,3].map(k=>k<s.avail?1:0))+'</div>'+
      '<div'+(s.used?' class="on"':'')+'><b>Used ring</b>'+cell([0,1,2,3].map(k=>k<s.used?2:0))+'</div>';
    document.getElementById('vq-cnt').innerHTML=RD.stat('Requests completed',s.done+' / 4','')+RD.stat('Kicks (VM exits)',s.kicks,'')+RD.stat('Interrupts',s.irqs,'')}
  build();
  const a=RD.anim({card:'vq-card',ctl:'vq-ctl',n:steps.length,draw,ms:3400,label:'Virtqueue step',list:'sx-vq-one'});
  RD.seg(document.getElementById('vq-mode'),m=>{mode=m;build();['one','batch'].forEach(x=>{document.getElementById('sx-vq-'+x).hidden=x!==m});a.reset(steps.length,'sx-vq-'+m)});
})();
