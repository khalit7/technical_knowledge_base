// ---- Reading, section 5: an 8-GPU board with a switch against one fully connected without ----
(function(){
  const el=document.getElementById('rd-amd-svg');if(!el)return;
  let mode='ar';
  const cnt=document.createElement('div');cnt.className='an-cnt';el.after(cnt);
  function ring(cx,cy,r){return [...Array(8)].map((_,i)=>{const a=-Math.PI/2+i*Math.PI/4;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]})}
  function gpus(p,hot){return p.map((q,i)=>'<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="13" fill="'+(hot(i)?'var(--acc2)':'var(--soft)')+'" stroke="var(--acc)"/>'+RD.t(q[0],q[1]+4,i,{a:'middle',fs:11,w:600})).join('')}
  function draw(){
    const w=RD.width(el),two=w>=520,pw=two?(w-12)/2:w,R=Math.min(80,pw/2-26),ph=2*R+60;
    const cp=mode==='cp',on=i=>!cp||i===0||i===5;
    let h='';
    // NVSwitch board
    let cx=pw/2,cy=28+R+6,p=ring(cx,cy,R);
    h+=RD.t(cx,14,'NVIDIA HGX: through NVSwitch',{a:'middle',fs:12,w:600});
    p.forEach((q,i)=>{h+='<line x1="'+q[0].toFixed(1)+'" y1="'+q[1].toFixed(1)+'" x2="'+cx+'" y2="'+cy+'" stroke="'+(on(i)?'var(--acc)':'var(--line)')+'" stroke-width="'+(on(i)?3:1.5)+'"/>'});
    h+='<rect x="'+(cx-30)+'" y="'+(cy-13)+'" width="60" height="26" rx="5" fill="var(--bg)" stroke="var(--mute)"/>'+RD.t(cx,cy+4,'switch',{a:'middle',fs:11});
    h+=gpus(p,on);
    // AMD board
    const ox=two?pw+12:0,oy=two?0:ph;cx=ox+pw/2;cy=oy+28+R+6;p=ring(cx,cy,R);
    h+=RD.t(cx,oy+14,'AMD 8-GPU board: 28 direct links',{a:'middle',fs:12,w:600});
    for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const hot=cp?(i===0&&j===5):(i===0);
      h+='<line x1="'+p[i][0].toFixed(1)+'" y1="'+p[i][1].toFixed(1)+'" x2="'+p[j][0].toFixed(1)+'" y2="'+p[j][1].toFixed(1)+'" stroke="'+(hot?'var(--acc)':'var(--line)')+'" stroke-width="'+(hot?3:1.2)+'"/>'}
    h+=gpus(p,i=>cp?(i===0||i===5):true);
    el.innerHTML=RD.svg(w,two?ph:2*ph,h,'Eight GPUs joined through a switch against fully connected');
    cnt.innerHTML=cp?RD.stat('AMD, GPU 0 to GPU 5','1 link','64 GB/s each way on MI300X: a seventh of the GPU\'s 448')+RD.stat('NVIDIA HGX','any pair','through the switch at the GPU\'s full NVLink rate'):
      RD.stat('AMD, links per GPU','7','7 x 64 = 448 GB/s each way, 896 GB/s aggregate (MI300X); highlighted: GPU 0\'s')+RD.stat('MI355X','1,075.2 GB/s','7 x 153.6 GB/s aggregate')+RD.stat('Scale-up domain','8 GPUs','72 only on a Helios rack (MI455X, UALink)');
  }
  RD.seg(document.getElementById('rd-amd-mode'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
// ---- Reading, section 8: Cerebras weight streaming, a static annotated diagram ----
(function(){
  const el=document.getElementById('rd-ws-svg');if(!el)return;
  function box(x,y,w,h,t1,t2,c){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+c+'" stroke-width="1.5"/>'+
    RD.t(x+w/2,y+(t2?h/2-2:h/2+4),t1,{a:'middle',fs:12,w:600})+(t2?RD.t(x+w/2,y+h/2+13,t2,{a:'middle',fs:11,fill:'var(--mute)'}):'')}
  function arrow(x1,y1,x2,y2,c){const a=Math.atan2(y2-y1,x2-x1),s=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="2"/><path d="M'+x2+' '+y2+' L'+(x2-s*Math.cos(a-0.45)).toFixed(1)+' '+(y2-s*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-s*Math.cos(a+0.45)).toFixed(1)+' '+(y2-s*Math.sin(a+0.45)).toFixed(1)+'Z" fill="'+c+'"/>'}
  function draw(){
    const w=RD.width(el),bw=Math.min(300,w-20),bx=(w-bw)/2;
    let h=box(bx,6,bw,44,'(1) MemoryX','all weights and optimizer state','var(--c4)');
    h+=box(bx,104,bw,44,'(2) SwarmX','broadcast down, sum gradients up','var(--c4)');
    const n=3,gap=10,ww=Math.min(150,(w-20-(n-1)*gap)/n),wx0=(w-(n*ww+(n-1)*gap))/2,wy=202;
    for(let i=0;i<n;i++){const x=wx0+i*(ww+gap);h+=box(x,wy,ww,58,'CS-3 wafer '+(i+1),'batch shard '+(i+1),'var(--acc)');
      h+=arrow(x+ww*0.35,150,x+ww*0.35,wy-2,'var(--c1)')+arrow(x+ww*0.65,wy-2,x+ww*0.65,150,'var(--c2)')}
    h+=arrow(bx+bw*0.35,52,bx+bw*0.35,102,'var(--c1)')+arrow(bx+bw*0.65,102,bx+bw*0.65,52,'var(--c2)');
    h+=RD.t(bx+bw*0.35-6,82,"layer's weights",{a:'end',fs:11,fill:'var(--c1)'})+RD.t(bx+bw*0.65+6,82,'summed gradients',{fs:11,fill:'var(--c2)'});
    h+=RD.t(w/2,wy+76,'(3) activations stay on each wafer; (4) gradients go back up',{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,wy+84,h,'Weight streaming: MemoryX, SwarmX and three wafers');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
