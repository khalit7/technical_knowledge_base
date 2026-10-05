// ---- Reading tab, section 5: one 128 x 128 tile, one K slice of 64, on three generations (before/after animation) ----
// Counters come from window.LT.tile (recompute.py: instruction shapes of PTX ISA 9.4).
(function(){
  const T=window.LT.tile,$=id=>document.getElementById(id);
  const fig=$('lt-gen-fig'),cap=$('lt-gen-cap'),cnt=$('lt-gen-cnt');
  // boxes: G global, S shared (stages), R registers, X tensor core, M tensor memory
  // each step: [title, text, arrows ([from,to,label]), active roles, counters patch]
  const SEQ={
    ampere:{roles:['warp 0','warp 1','warp 2','warp 3'],roleNote:'every warp copies, loads fragments and issues MMAs',tmem:false,stages:3,steps:[
      ['The tile','One CTA of 128 threads (4 warps) owns a 128 x 128 FP32 accumulator tile; each warp holds a 64 x 64 quarter of it in registers. K is consumed 64 at a time.',[],[0,1,2,3],{}],
      ['Copy the next slice: cp.async','Every thread issues 16-byte global-to-shared copies for the slice after this one: (128 x 64 + 128 x 64) BF16 = 32 KB = '+T.ampere.copy+' copies, 16 per thread (LDGSTS).',[['G','S','cp.async x '+T.ampere.copy]],[0,1,2,3],{copy:T.ampere.copy}],
      ['Wait, then __syncthreads()','cp.async.wait_group and a block barrier make the current slice visible to all warps.',[],[0,1,2,3],{}],
      ['ldmatrix into fragments','Each warp loads its A and B fragments from shared memory with ldmatrix.x4 (LDSM), already in the lane pattern mma.sync wants: '+T.ampere.ldsm+' per CTA.',[['S','R','ldmatrix x '+T.ampere.ldsm]],[0,1,2,3],{ldsm:T.ampere.ldsm}],
      ['mma.sync, '+T.ampere.mma+' times','m16n8k16 instructions: (128/16) x (128/8) x (64/16) = '+T.ampere.mma+' per CTA, 128 per warp, each reading and writing register fragments.',[['R','X','mma.sync x '+T.ampere.mma],['X','R','accumulate']],[0,1,2,3],{mma:T.ampere.mma,iss:T.ampere.issuers,acc:T.ampere.acc_regs,where:'registers'}],
      ['Next slice','The copies issued in step 2 have been landing meanwhile; with 3 stages, two slices are always in flight. For K = 4,096 this repeats 64 times.',[['G','S','next slices']],[0,1,2,3],{}],
      ['Epilogue','Each thread converts its 128 accumulator registers and stores them (directly, or through shared memory for coalescing).',[['R','G','store']],[0,1,2,3],{}]]},
    hopper:{roles:['producer WG','consumer WG 1','consumer WG 2'],roleNote:'warp-specialised: 1 producer warpgroup, 2 consumer warpgroups (384 threads)',tmem:false,stages:4,steps:[
      ['The tile','Three warpgroups: one producer that only copies, two consumers that each own a 64 x 128 half of the accumulator, 64 registers per thread.',[],[0,1,2],{}],
      ['TMA: one thread, two instructions','A single producer thread issues two cp.async.bulk.tensor loads (A slice, B slice) from tensor maps; the mbarrier of the stage expects 32 KB.',[['G','S','TMA x '+T.hopper.copy]],[0],{copy:T.hopper.copy}],
      ['Consumers wait on "full"','The consumers spin on the stage barrier until the transaction count reaches zero: all bytes have landed, swizzled.',[],[1,2],{}],
      ['wgmma, '+T.hopper.mma+' times, asynchronously','Each consumer warpgroup issues m64n128k16 four times (64/16) with A and B read from shared memory by descriptor: '+T.hopper.mma+' per CTA. The threads do not wait for them.',[['S','X','wgmma x '+T.hopper.mma],['X','R','accumulate']],[1,2],{mma:T.hopper.mma,iss:T.hopper.issuers,acc:T.hopper.acc_regs,where:'registers'}],
      ['Release the stage','wgmma.wait_group, then the consumers arrive on the stage\'s "empty" barrier; the producer, already waiting, refills it.',[['S','G','empty: refill']],[0,1,2],{}],
      ['Four stages in flight','The producer runs up to 4 stages ahead; setmaxnreg gave it 40 registers and the consumers 232.',[['G','S','next slices']],[0,1,2],{}],
      ['Epilogue','Consumers write accumulators to shared memory (stmatrix), then one TMA store sends the tile to global memory.',[['R','S','stmatrix'],['S','G','TMA store']],[1,2],{}]]},
    blackwell:{roles:['TMA warp','MMA warp','epilogue warps'],roleNote:'one warp copies, one thread of one warp issues MMAs, 4 warps run the epilogue',tmem:true,stages:4,steps:[
      ['The tile','The accumulator lives in tensor memory: 128 lanes x '+T.blackwell.tmem_cols+' columns of FP32 = '+T.blackwell.tmem_kb+' KB of the SM\'s 256 KB. No thread holds it in registers.',[],[0,1,2],{}],
      ['TMA, as on Hopper','One thread of the TMA warp issues two tensor loads into a stage and arms its barrier.',[['G','S','TMA x '+T.blackwell.copy]],[0],{copy:T.blackwell.copy}],
      ['One thread issues tcgen05.mma, '+T.blackwell.mma+' times','128 x 128 x 16 per instruction, (64/16) = '+T.blackwell.mma+' per slice, operands read from shared memory by descriptor, results accumulated in TMEM.',[['S','X','tcgen05.mma x '+T.blackwell.mma],['X','M','accumulate']],[1],{mma:T.blackwell.mma,iss:T.blackwell.issuers,acc:0,where:'tensor memory'}],
      ['tcgen05.commit frees the stage','The commit arrives on the stage\'s barrier when those MMAs finish; the TMA warp refills it. No warp ever waited on the math.',[['S','G','empty: refill']],[0,1],{}],
      ['Next slices','64 slices for K = 4,096, four stages deep; still one issuing thread.',[['G','S','next slices']],[0,1],{}],
      ['Epilogue reads TMEM','The 4 epilogue warps copy the accumulator out with tcgen05.ld (LDTM), 32 TMEM lanes per warp.',[['M','R','tcgen05.ld']],[2],{}],
      ['Store, while the next tile starts','Registers to shared memory, then a TMA store; meanwhile the MMA warp can already accumulate the next tile into another 128 TMEM columns.',[['R','S','st.shared'],['S','G','TMA store'],['S','X','next tile']],[1,2],{}]]}
  };
  let gen='ampere';
  function geom(w){const narrow=w<520;const bx={G:[0,0],S:[1,0],X:[2,0],R:[2,1],M:[1,1]};
    const cols=3,cw=w/cols,bw=Math.min(170,cw-18),bh=44,rowH=92;return {narrow,bx,cw,bw,bh,rowH}}
  function draw(i){
    const S=SEQ[gen],st=S.steps[i],w=RD.width(fig),g=geom(w);
    const names={G:'Global memory (HBM)',S:'Shared memory, '+S.stages+' stages',R:'Registers',X:'Tensor core',M:'Tensor memory (TMEM)'};
    const pos=k=>{const [c,r]=g.bx[k];return [c*g.cw+(g.cw-g.bw)/2,10+r*g.rowH]};
    const used=new Set(['G','S','R','X']);if(S.tmem)used.add('M');
    let b='<defs><marker id="lt-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
    const act=new Set();st[2].forEach(a=>{act.add(a[0]);act.add(a[1])});
    used.forEach(k=>{const [x,y]=pos(k);const on=act.has(k);
      b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+g.bw+'" height="'+g.bh+'" rx="6" fill="'+(on?'var(--acc2)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"/>';
      const lab=names[k];const parts=lab.length>18&&g.bw<140?[lab.split(' ').slice(0,2).join(' '),lab.split(' ').slice(2).join(' ')]:[lab];
      parts.forEach((p,j)=>{b+=RD.t(x+g.bw/2,y+(parts.length>1?18+j*13:26),p,{a:'middle',fs:11,w:on?600:400})})});
    const lanes={};
    st[2].forEach((a,j)=>{const [x1,y1]=pos(a[0]),[x2,y2]=pos(a[1]);
      const c1=[x1+g.bw/2,y1+g.bh/2],c2=[x2+g.bw/2,y2+g.bh/2];
      const clip=(p,q)=>{const dx=q[0]-p[0],dy=q[1]-p[1];const tx=dx?(g.bw/2+3)/Math.abs(dx):1e9,ty=dy?(g.bh/2+3)/Math.abs(dy):1e9;const t=Math.min(tx,ty);return [p[0]+dx*t,p[1]+dy*t]};
      const p1=clip(c1,c2),p2=clip(c2,c1);const sameRow=Math.abs(p1[1]-p2[1])<1;const yy=sameRow?(j%2?6:-6):0;
      b+='<line x1="'+p1[0].toFixed(1)+'" y1="'+(p1[1]+yy).toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+(p2[1]+yy).toFixed(1)+'" stroke="var(--acc)" stroke-width="2.2" marker-end="url(#lt-ar)"/>';
      if(sameRow){ // label in the gap under the boxes, one lane per label in that row
        const row=y1,ln=lanes[row]=(lanes[row]||0)+1;const mx=Math.max(40,Math.min(w-40,(p1[0]+p2[0])/2));
        b+=RD.t(mx,row+g.bh+12+(ln-1)*13,a[2],{a:'middle',fs:10.5,fill:'var(--acc)',w:600})}
      else{const xl=p1[0]+6,right=xl+a[2].length*6>w;b+=RD.t(right?p1[0]-6:xl,(p1[1]+p2[1])/2+4,a[2],{a:right?'end':'start',fs:10.5,fill:'var(--acc)',w:600})}});
    // role strip, below the lowest row of boxes in use
    const maxRow=Math.max(...[...used].map(k=>g.bx[k][1]));const y0=10+(maxRow+1)*g.rowH-8;const rw=(w-8)/S.roles.length;
    S.roles.forEach((r,j)=>{const on=st[3].includes(j);b+='<rect x="'+(4+j*rw).toFixed(1)+'" y="'+y0+'" width="'+(rw-6).toFixed(1)+'" height="24" rx="5" fill="'+(on?'var(--open2)':'var(--soft)')+'" stroke="'+(on?'var(--good)':'var(--line)')+'"/>'+RD.t(4+j*rw+(rw-6)/2,y0+16,r,{a:'middle',fs:11,w:on?600:400})});
    fig.innerHTML=RD.svg(w,y0+28,b,'one tile on '+gen)+'<div class="small mute">'+S.roleNote+'</div>';
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+S.steps.length+': '+st[0]+'</div><p>'+st[1]+'</p>';
    // running counters (state after step i)
    const c={copy:0,ldsm:0,mma:0,iss:0,acc:0,where:'not yet'};for(let k=0;k<=i;k++)Object.assign(c,S.steps[k][4]);
    cnt.innerHTML=RD.stat('MMA instructions per K slice',c.mma||'0')+RD.stat('Threads that issue them',c.iss||'0')+RD.stat('Accumulator registers per thread',c.where==='tensor memory'?'0':(c.acc||'0'),c.where==='not yet'?'':'accumulator in '+c.where)+RD.stat('Copy instructions per K slice',c.copy||'0',c.ldsm?'+ '+c.ldsm+' ldmatrix':'');
  }
  const A=RD.anim({card:'lt-gen-card',ctl:'lt-gen-ctl',n:SEQ.ampere.steps.length,draw,ms:2600,label:'Step'});
  RD.seg($('lt-gen-sel'),m=>{gen=m;A.reset(SEQ[m].steps.length);A.play()});
  RD.onResize(()=>A.redraw());
  window.LT_GEN_SEQ=SEQ;
})();
