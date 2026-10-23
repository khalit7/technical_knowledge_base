// ---- Reading top: the hero figure (static annotated diagram): what you write, what the compiler decides, what each GPU runs ----
// Instruction shapes come from window.TGD.exp.mma_per_kstep (compiled here); nothing on the figure moves.
(function(){
  const D=window.TGD,box=document.getElementById('rd-hero');if(!box||!D)return;
  const M=D.exp.mma_per_kstep,sh=k=>M[k].instr_shape;
  const T=[['sm_80','A100','mma.sync m'+sh('sm_80')[0]+'n'+sh('sm_80')[1]+'k'+sh('sm_80')[2]],
    ['sm_90a','H100','wgmma m'+sh('sm_90a')[0]+'n'+sh('sm_90a')[1]+'k'+sh('sm_90a')[2]],
    ['sm_100a','B200','tcgen05.mma '+sh('sm_100a').join('x')],
    ['sm_120','RTX 5090','mma.sync m'+sh('sm_120')[0]+'n'+sh('sm_120')[1]+'k'+sh('sm_120')[2]],
    ['gfx942','MI300X','v_mfma '+sh('gfx942').join('x')],
    ['gfx950','MI355X','v_mfma '+sh('gfx950').join('x')]];
  const CODE=['pid = tl.program_id(0)','offs = pid*B + tl.arange(0, B)','a = tl.load(a_ptr + offs, mask=m)','acc += tl.dot(a, b)','tl.store(c_ptr + offs, acc)'];
  const ST=[['TTIR','whole-block ops, no threads'],['TTGIR','',1],['LLVM IR','per-thread code'],['PTX / AMDGCN','assembly'],['SASS / hsaco','machine code']];
  const DEC=['layout: which thread holds what','load width, from 16-byte hints','shared buffers: num_stages','tensor-core instruction'];
  const t=RD.t,mono='font-family="ui-monospace,Menlo,Consolas,monospace"';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  const arrowR=(x1,y,x2)=>'<line x1="'+x1+'" y1="'+y+'" x2="'+(x2-6)+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(x2-7)+' '+(y-4)+' L'+x2+' '+y+' L'+(x2-7)+' '+(y+4)+'Z" fill="var(--mute)"/>';
  const arrowD=(x,y1,y2)=>'<line x1="'+x+'" y1="'+y1+'" x2="'+x+'" y2="'+(y2-6)+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(x-4)+' '+(y2-7)+' L'+x+' '+y2+' L'+(x+4)+' '+(y2-7)+'Z" fill="var(--mute)"/>';
  // each column drawn at (x, y) with width w; returns [svg, height]
  function colCode(x,y,w){let g=t(x,y+12,'You write (Triton)',{w:600,fs:12.5});
    const h=CODE.length*16+14;g+=rect(x,y+20,w,h);
    CODE.forEach((l,i)=>{g+='<text x="'+(x+8)+'" y="'+(y+38+i*16)+'" font-size="11" '+mono+' fill="var(--ink)">'+RD.esc(l)+'</text>'});
    g+=t(x,y+20+h+15,'one program, whole blocks;',{fs:11,fill:'var(--mute)'})+t(x,y+20+h+29,'no threads, no shared memory',{fs:11,fill:'var(--mute)'});
    return [g,20+h+34]}
  function colComp(x,y,w){let g=t(x,y+12,'The compiler decides',{w:600,fs:12.5,fill:'var(--acc)'});let yy=y+20;
    ST.forEach((s,i)=>{if(s[2]){const h=18+DEC.length*15+6;g+=rect(x,yy,w,h,{fill:'var(--bg)',stroke:'var(--acc)',sw:2});
        g+=t(x+8,yy+14,s[0]+': + decisions',{w:600,fs:11.5});
        DEC.forEach((d,j)=>{g+=t(x+12,yy+30+j*15,'• '+d,{fs:11,fill:'var(--acc)'})});
        yy+=h}
      else{g+=rect(x,yy,w,22);g+=t(x+8,yy+15,s[0],{w:600,fs:11.5})+t(x+w-6,yy+15,s[1],{a:'end',fs:11,fill:'var(--mute)'});yy+=22}
      if(i<ST.length-1){g+=arrowD(x+w/2,yy,yy+10);yy+=10}});
    return [g,yy-y]}
  function colGpu(x,y,w){let g=t(x,y+12,'Each GPU runs (one tl.dot)',{w:600,fs:12.5});let yy=y+20;
    T.forEach(r=>{g+=rect(x,yy,w,26,{fill:'var(--bg)'});g+=t(x+8,yy+17,r[0],{w:600,fs:11.5})+t(x+64,yy+17,r[1],{fs:11,fill:'var(--mute)'});
      g+='<text x="'+(x+w-6)+'" y="'+(yy+17)+'" font-size="11" text-anchor="end" '+mono+' fill="var(--ink)">'+RD.esc(r[2])+'</text>';yy+=30});
    return [g,yy-y]}
  function draw(){
    const W=Math.min(900,RD.width(box));let g='',H;
    if(W>=820){const gap=30,c1=Math.round(W*0.33),c3=Math.round(W*0.35),c2=W-c1-c3-2*gap-2;
      const a=colCode(1,0,c1),b=colComp(c1+gap+1,0,c2),c=colGpu(c1+c2+2*gap+1,0,c3);
      g=a[0]+b[0]+c[0];H=Math.max(a[1],b[1],c[1])+20;
      g+=arrowR(c1+4,64,c1+gap-2)+arrowR(c1+c2+gap+4,64,c1+c2+2*gap-2);
      g+=t(c1+gap+1+c2/2,H-4,'Gluon starts at TTGIR: you write the decisions',{a:'middle',fs:11,fill:'var(--c4)'});H+=4}
    else{const w=W-2;const a=colCode(1,0,w);g+=a[0];let y=a[1]+2;g+=arrowD(W/2,y,y+14);y+=16;
      const b=colComp(1,y,w);g+=b[0];y+=b[1]+4;g+=t(1,y+12,'Gluon starts at TTGIR: you write the decisions',{fs:11,fill:'var(--c4)'});y+=18;
      g+=arrowD(W/2,y,y+14);y+=16;const c=colGpu(1,y,w);g+=c[0];H=y+c[1]+4}
    box.innerHTML=RD.svg(W,H,g,'Triton source, the compiler stages with its four decisions at TTGIR, and the tensor-core instruction each of six GPUs runs');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
