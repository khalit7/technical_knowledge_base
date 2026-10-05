// ---- Reading s7: one 128x128x64 tile through mma.sync (Ampere), wgmma (Hopper) and tcgen05 (Blackwell) ----
// Counts come from window.GA.tile (src/recompute.py, PTX ISA shapes); the layout is a schematic.
(function(){
  const G=window.GA,T=G.tile,$=id=>document.getElementById(id),f=n=>Number(n).toLocaleString('en-US');
  const kst=T.K/16; // k-steps of 16
  // each step: {a: active arrows, ld: inputs in smem, rg: operands in registers, tc: tensor cores busy, acc: 'reg'|'tmem'|'', out: stored, cap, mma, cp, clk}
  const M={
    amp:{who:'4 warps (128 threads), each issuing its own mma.sync',accIn:'registers',steps:[
      {a:[],cap:'The tile\'s inputs start in HBM (or L2): a 128 x 64 slice of A and a 64 x 128 slice of B, '+f(T.ab_bytes)+' bytes in BF16.',mma:0,cp:0},
      {a:['hs'],ld:1,cap:'Asynchronous copy: the 128 threads issue '+f(T.cpasync_16B)+' copies of 16 bytes each ('+T.cpasync_16B/128+' per thread), global to shared memory, skipping the registers. Every one costs an issue slot and address arithmetic.',mma:0,cp:T.cpasync_16B},
      {a:['sr'],ld:1,rg:1,cap:'Each warp copies its fragments of A and B from shared memory into registers (ldmatrix): each of the 4 warps needs a 64-row strip of A and a 64-column strip of B, '+f(4*(64*64+64*64)*2)+' bytes of shared-memory reads, twice the tile.',mma:0,cp:T.cpasync_16B},
      {a:['rt','tr'],ld:1,rg:1,tc:1,acc:'reg',cap:'mma.sync m16n8k16: one instruction per warp multiplies a 16 x 16 piece of A by a 16 x 8 piece of B (2,048 FMAs). The first 16-wide k-step takes '+(T.ampere_instr/kst)+' of them. The 128 x 128 FP32 accumulators, '+T.acc_bytes/1024+' KB, sit in registers: '+T.acc_regs_per_thread_128+' per thread.',mma:T.ampere_instr/kst,cp:T.cpasync_16B},
      {a:['rt','tr'],ld:1,rg:1,tc:1,acc:'reg',cap:'The other 3 k-steps: '+f(T.ampere_instr)+' mma.sync in total, each issued by a warp scheduler. At the A100\'s 1,024 FMAs per SM per clock the math takes '+f(T.a100_clk)+' clocks.',mma:T.ampere_instr,cp:T.cpasync_16B,clk:T.a100_clk},
      {a:['rh'],ld:1,acc:'reg',out:1,cap:'Epilogue: the results are already in registers; convert to BF16 and store. Operands and results both passed through the register file.',mma:T.ampere_instr,cp:T.cpasync_16B,clk:T.a100_clk}]},
    hop:{who:'1 warpgroup (4 warps, 128 threads) issuing wgmma together',accIn:'registers',steps:[
      {a:[],cap:'The same tile, on Hopper.',mma:0,cp:0},
      {a:['hs'],ld:1,tma:1,cap:'TMA: one thread issues '+T.tma_instr+' copy instructions, one per input, each with a tensor descriptor. The copy engine moves all '+f(T.ab_bytes)+' bytes and an asynchronous transaction barrier counts them in.',mma:0,cp:T.tma_instr},
      {a:['st','tr'],ld:1,tc:1,acc:'reg',cap:'wgmma m64n128k16: the warpgroup issues one instruction per 64 rows, reading A and B straight from shared memory. No ldmatrix, no operand registers. The first k-step takes '+(T.hopper_instr/kst)+'.',mma:T.hopper_instr/kst,cp:T.tma_instr},
      {a:['st','tr'],ld:1,tc:1,acc:'reg',cap:'wgmma is asynchronous: the warps can issue other work while the tensor cores run, and wait on a fence later. But the accumulators are still in registers: '+T.acc_bytes/1024+' KB, '+T.acc_regs_per_thread_128+' per thread.',mma:T.hopper_instr/kst,cp:T.tma_instr},
      {a:['st','tr'],ld:1,tc:1,acc:'reg',cap:'4 k-steps: '+T.hopper_instr+' wgmma in total, '+(T.ampere_instr/T.hopper_instr)+' times fewer instructions than Ampere. At the H100\'s 2,048 FMAs per SM per clock: '+f(T.h100_clk)+' clocks.',mma:T.hopper_instr,cp:T.tma_instr,clk:T.h100_clk},
      {a:['rh'],ld:1,acc:'reg',out:1,cap:'Epilogue from registers, as on Ampere.',mma:T.hopper_instr,cp:T.tma_instr,clk:T.h100_clk}]},
    bw:{who:'1 thread issues tcgen05.mma for the whole block',accIn:'tensor memory',steps:[
      {a:[],cap:'The same tile, on a Blackwell datacenter GPU (sm_100).',mma:0,cp:0},
      {a:['hs'],ld:1,tma:1,cap:'TMA, as on Hopper: '+T.tma_instr+' instructions from one thread.',mma:0,cp:T.tma_instr},
      {a:['st','tm'],ld:1,tc:1,acc:'tmem',cap:'tcgen05.mma 128 x 128 x 16: a single thread issues it. Operands come from shared memory; the accumulator is allocated in tensor memory, '+T.tmem_cols+' of its 512 columns.',mma:T.blackwell_instr/kst,cp:T.tma_instr},
      {a:['st','tm'],ld:1,tc:1,acc:'tmem',cap:'4 k-steps: '+T.blackwell_instr+' instructions in total. The register file holds no accumulators, so the warps are free for other work, such as writing out the previous tile.',mma:T.blackwell_instr,cp:T.tma_instr},
      {a:['mr','rh'],ld:1,acc:'tmem',out:1,cap:'Epilogue: tcgen05.ld copies the results from tensor memory into registers, a slice at a time, then convert and store.',mma:T.blackwell_instr,cp:T.tma_instr},
      {a:[],ld:1,acc:'tmem',out:1,pair:1,cap:'One more option: with cta_group::2 a pair of SMs cooperates on one instruction covering a 256-row tile ("paired SMs cooperate on a single MMA operation", Inside Blackwell Ultra). NVIDIA publishes no per-SM clock rate for Blackwell, so no clock count is shown.',mma:T.blackwell_instr,cp:T.tma_instr}]}
  };
  ['amp','hop'].forEach(k=>{while(M[k].steps.length<M.bw.steps.length)M[k].steps.push(Object.assign({},M[k].steps[M[k].steps.length-1],{cap:M[k].steps[M[k].steps.length-1].cap}))});
  let mode='amp';
  function box(x,y,w,h,lab,fill,on){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+fill+'" opacity="'+(on?.55:.18)+'" stroke="var(--line)"/>'+RD.t(x+6,y+14,lab,{fs:11,w:600})}
  function arrow(x1,y1,x2,y2,on,lab){const c=on?'var(--acc)':'var(--line)',sw=on?2.6:1.2,ang=Math.atan2(y2-y1,x2-x1),hx=x2-8*Math.cos(ang-0.45),hy=y2-8*Math.sin(ang-0.45),kx=x2-8*Math.cos(ang+0.45),ky=y2-8*Math.sin(ang+0.45);
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+sw+'"/><path d="M'+x2+' '+y2+'L'+hx+' '+hy+'L'+kx+' '+ky+'Z" fill="'+c+'"/>'+(on&&lab?(Math.abs(x2-x1)<30?RD.t(Math.max(x1,x2)+5,(y1+y2)/2+4,lab,{fs:10,fill:'var(--acc)',w:600}):RD.t((x1+x2)/2,(y1+y2)/2-5,lab,{a:'middle',fs:10,fill:'var(--acc)',w:600})):'')}
  function draw(i){
    const m=M[mode],s=m.steps[i],el=$('ga-tcSvg'),W=Math.max(330,Math.min(800,RD.width(el))),act=k=>s.a.indexOf(k)>=0;
    const bw=W*0.24,gap=(W-3*bw)/2,xH=2,xS=xH+bw+gap,xT=xS+bw+gap,y1=8,h1=92;
    let g='';
    g+=box(xH,y1,bw,h1,'HBM / L2','var(--c4)',!s.ld||act('hs'));
    g+=box(xS,y1,bw,h1,'Shared mem','var(--c4)',s.ld);
    if(s.ld){const ah=h1-30,aw=ah/2;g+='<rect x="'+(xS+8)+'" y="'+(y1+22)+'" width="'+aw+'" height="'+ah+'" fill="var(--c1)" opacity=".7"/>'+RD.t(xS+8+aw/2,y1+22+ah/2+4,'A',{a:'middle',fs:11,fill:'var(--bg)',w:600});
      const bwid=Math.min(bw-aw-24,ah*2),bh=bwid/2;g+='<rect x="'+(xS+16+aw)+'" y="'+(y1+22)+'" width="'+bwid+'" height="'+bh+'" fill="var(--c2)" opacity=".7"/>'+RD.t(xS+16+aw+bwid/2,y1+22+bh/2+4,'B',{a:'middle',fs:11,fill:'var(--bg)',w:600})}
    g+=box(xT,y1,bw,h1,'Tensor cores','var(--c3)',s.tc);
    const tq=(bw-30)/2;for(let q=0;q<4;q++)g+='<rect x="'+(xT+10+(q%2)*(tq+10))+'" y="'+(y1+22+Math.floor(q/2)*Math.min(32,(h1-30)/2))+'" width="'+tq+'" height="'+(Math.min(32,(h1-30)/2)-4)+'" rx="3" fill="var(--c3)" opacity="'+(s.tc?.95:.3)+'"/>';
    if(s.tma)g+=RD.t(xS+bw/2,y1+h1+13,'TMA engine',{a:'middle',fs:10,fill:'var(--c6)',w:600});
    // register file bar
    const yR=y1+h1+40,full=W-4,scale=full/256;
    g+='<rect x="2" y="'+yR+'" width="'+full+'" height="24" rx="4" fill="var(--c5)" opacity=".2" stroke="var(--line)"/>'+RD.t(W-6,yR+16,W<480?'Registers 256 KB':'Register file, 256 KB per SM',{a:'end',fs:10.5,w:600});
    if(s.acc==='reg')g+='<rect x="2" y="'+yR+'" width="'+(T.acc_bytes/1024*scale)+'" height="24" rx="4" fill="var(--c5)" opacity=".85"/>'+RD.t(8,yR+16,(W<480?'acc. ':'accumulators ')+T.acc_bytes/1024+' KB',{fs:10.5});
    if(s.rg)g+='<rect x="'+(2+(s.acc==='reg'?T.acc_bytes/1024*scale+4:0))+'" y="'+(yR+3)+'" width="'+(16*scale)+'" height="18" rx="3" fill="var(--c1)" opacity=".6"/>'+RD.t(6+(s.acc==='reg'?T.acc_bytes/1024*scale+4:0)+16*scale,yR+16,W<480?'operands':'operand fragments',{fs:10});
    // TMEM bar
    const yM=yR+50;
    if(mode==='bw'){g+='<rect x="2" y="'+yM+'" width="'+full+'" height="24" rx="4" fill="var(--c2)" opacity=".15" stroke="var(--line)"/>'+RD.t(W-6,yM+16,W<480?'TMEM 256 KB':'Tensor memory, 256 KB per SM (512 columns)',{a:'end',fs:10.5,w:600});
      if(s.acc==='tmem')g+='<rect x="2" y="'+yM+'" width="'+(full*T.tmem_frac)+'" height="24" rx="4" fill="var(--c2)" opacity=".75"/>'+RD.t(8,yM+16,T.tmem_cols+' columns',{fs:10.5});}
    else g+=RD.t(6,yM+12,'No tensor memory on this generation',{fs:10.5,fill:'var(--mute)'});
    // arrows
    const cy=y1+h1/2;
    g+=arrow(xH+bw,cy,xS-2,cy,act('hs'),s.tma?'TMA':'copy');
    g+=arrow(xS+bw,cy-14,xT-2,cy-14,act('st'),'operands');
    g+=arrow(xS+bw/2,y1+h1,xS+bw/2-20,yR-14,act('sr'),'ldmatrix');
    g+=arrow(xT+bw*0.3,yR-14,xT+bw*0.3,y1+h1+2,act('rt'),'operands');
    g+=arrow(xT+bw*0.7,y1+h1+2,xT+bw*0.7,yR-14,act('tr'),'C += AB');
    g+=arrow(xT+bw-6,y1+h1+2,xT+bw-6,yM-2,act('tm'),act('tm')?'C += AB':'');
    g+=arrow(W*0.42,yM-2,W*0.42,yR+26,act('mr'),'tcgen05.ld');
    g+=arrow(xH+bw*0.5,yR-2,xH+bw*0.5,y1+h1+2,act('rh'),'store');
    if(s.pair)g+=RD.t(W/2,yM+44,'cta_group::2: two SMs, one 256-row instruction',{a:'middle',fs:11,fill:'var(--c2)',w:600});
    el.innerHTML=RD.svg(W,yM+(s.pair?52:34),g,'Tile through the tensor cores');
    $('ga-tcCap').textContent=s.cap;
    $('ga-tcOut').innerHTML=RD.stat('Matrix instructions issued',f(s.mma),m.who)+RD.stat('Copy instructions for the inputs',f(s.cp),s.tma||mode!=='amp'?'TMA, from one thread':'16 bytes each, from every thread')+
      RD.stat('Accumulators live in',s.acc==='tmem'?'tensor memory':s.acc==='reg'?'registers':'not yet allocated',s.acc==='reg'?T.acc_regs_per_thread_128+' registers per thread':s.acc==='tmem'?T.tmem_cols+' of 512 columns':'')+
      RD.stat('Tensor math, SM clocks',s.clk?f(s.clk):(mode==='bw'&&i>=3?'not published':'...'),mode==='amp'?'1,024 FMAs per clock':mode==='hop'?'2,048 FMAs per clock':'');
  }
  const an=RD.anim({card:'ga-tcCard',ctl:'ga-tcCtl',n:M.bw.steps.length,draw,ms:2600,label:'Step'});
  RD.seg($('ga-tcSeg'),m=>{mode=m;an.reset(M[mode].steps.length);an.play()});
  RD.onResize(()=>an.redraw());
})();
