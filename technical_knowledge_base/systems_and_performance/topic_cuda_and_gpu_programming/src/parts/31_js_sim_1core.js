// ---- GPU simulator (t-sim): the simulators themselves, pure functions. ----
// A line-by-line port of src/sim/code/reference.py; src/sim/code/check_js.mjs checks it against out/expected.json.
window.SIMC=(function(){
  // ---------- divergence ----------
  function diverge(mask,pre,la,lb,post){
    let na=0;for(const b of mask)if(b)na++;const nb=32-na;
    const slots=pre+post+(na?la:0)+(nb?lb:0);
    const useful=32*(pre+post)+na*la+nb*lb;
    return {slots,useful,eff:useful/(32*slots)};
  }
  function lcgSigns(n,seed,sort){
    let s=seed>>>0;const out=[];
    for(let i=0;i<n;i++){s=(Math.imul(1664525,s)+1013904223)>>>0;out.push(((s>>>16)&1)?1:-1)}
    if(sort)out.sort((a,b)=>b-a);
    return out;
  }
  function condMask(kind,warp,signs){
    const m=[];
    for(let l=0;l<32;l++){const t=warp*32+l;let c;
      if(kind==='lane_parity')c=t%2===0;
      else if(kind==='warp_parity')c=Math.floor(t/32)%2===0;
      else if(kind==='half')c=l<16;
      else if(kind==='all')c=true;
      else if(kind==='data')c=signs[t]>0;
      else throw new Error(kind);
      m.push(c)}
    return m;
  }
  // ---------- coalescing ----------
  function laneAddresses(pattern,elem,param,base,seed){
    elem=elem||4;param=param==null?1:param;base=base||0;seed=seed==null?7:seed;
    const a=[];
    if(pattern==='contiguous'){for(let l=0;l<32;l++)a.push(base+l*elem)}
    else if(pattern==='offset'){for(let l=0;l<32;l++)a.push(base+(l+param)*elem)}
    else if(pattern==='stride'){for(let l=0;l<32;l++)a.push(base+l*param*elem)}
    else if(pattern==='broadcast'){for(let l=0;l<32;l++)a.push(base)}
    else if(pattern==='random'){const span=32*Math.max(1,param);let s=seed>>>0;
      for(let l=0;l<32;l++){s=(Math.imul(1664525,s)+1013904223)>>>0;a.push(base+(s%span)*elem)}}
    else throw new Error(pattern);
    return a;
  }
  function coalesce(addrs,elem){
    elem=elem||4;const sec=new Set(),lin=new Set(),uniq=new Set(addrs);
    for(const a of addrs){for(const b of [a,a+elem-1]){sec.add(Math.floor(b/32));lin.add(Math.floor(b/128))}}
    return {sectors:sec.size,lines:lin.size,bytes_moved:32*sec.size,useful:32*elem,
      eff:Math.min(1,32*elem/(32*sec.size)),unique_bytes:uniq.size*elem};
  }
  function transposeSectors(tiled){
    let rd=0,wr=0;
    for(let step=0;step<4;step++)for(let r=0;r<8;r++){const row=step*8+r;
      rd+=coalesce(laneAddresses('contiguous',4,1,row*4096*4)).sectors;
      wr+=tiled?coalesce(laneAddresses('contiguous',4,1,row*4096*4)).sectors:coalesce(laneAddresses('stride',4,4096,row*4)).sectors}
    return {read:rd,write:wr};
  }
  // ---------- shared memory banks ----------
  function bankWords(pattern,param){
    const w=[];
    for(let x=0;x<32;x++){
      if(pattern==='row')w.push(x);
      else if(pattern==='col32')w.push(x*32);
      else if(pattern==='col33')w.push(x*33);
      else if(pattern==='swizzle')w.push(x*32+(0^x));
      else if(pattern==='stride')w.push(x*param);
      else if(pattern==='broadcast')w.push(5);
      else if(pattern==='double')w.push(2*x);
      else throw new Error(pattern)}
    return w;
  }
  function banks(words){
    const per={};
    for(const w of words){const b=w%32;(per[b]=per[b]||new Set()).add(w)}
    let degree=0,used=0;for(const k in per){used++;degree=Math.max(degree,per[k].size)}
    return {degree,banks_used:used};
  }
  // ---------- occupancy (port of cuda_occupancy.h, CUDA 13.4.2) ----------
  const KB=1024;
  const ARCH={
    sm_80:{cc:'8.0',maxW:64,maxB:32,smemSM:164*KB,smemBlock:163*KB,bar:2,name:'A100'},
    sm_86:{cc:'8.6',maxW:48,maxB:16,smemSM:100*KB,smemBlock:99*KB,bar:1,name:'RTX 3090, A10, A40'},
    sm_89:{cc:'8.9',maxW:48,maxB:24,smemSM:100*KB,smemBlock:99*KB,bar:1,name:'RTX 4090, L4, L40S'},
    sm_90a:{cc:'9.0',maxW:64,maxB:32,smemSM:228*KB,smemBlock:227*KB,bar:2,name:'H100, H200'},
    sm_100a:{cc:'10.0',maxW:64,maxB:32,smemSM:228*KB,smemBlock:227*KB,bar:2,name:'B200, GB200'},
    sm_120:{cc:'12.0',maxW:48,maxB:24,smemSM:100*KB,smemBlock:99*KB,bar:1,name:'RTX 5090, RTX PRO 6000'}};
  const REGS_SM=65536,REG_GRAN=256,SUBPART=4,SMEM_GRAN=128,RESERVED=1024,BIG=1e9;
  const ru=(x,y)=>Math.ceil(x/y)*y;
  function occupancy(arch,regs,smem,block,barriers){
    if(barriers==null)barriers=1;
    const a=ARCH[arch],wpb=Math.ceil(block/32);
    const limW=Math.floor(a.maxW/wpb);
    const rpw=ru(regs*32,REG_GRAN);
    let limR;
    if(rpw*ru(wpb,SUBPART)>REGS_SM||regs>255)limR=0;
    else if(rpw>0)limR=Math.floor(Math.floor(Math.floor(REGS_SM/SUBPART)/rpw)*SUBPART/wpb);
    else limR=BIG;
    const perCta=ru(smem+RESERVED,SMEM_GRAN);
    let limS=Math.floor(a.smemSM/perCta);
    if(smem>a.smemBlock)limS=0;
    const limB=a.maxB;
    let lim=Math.min(limR,limS,limW,limB);
    if(barriers)lim=Math.min(lim,Math.floor(limB*a.bar/barriers));
    return {blocks:lim,warps:lim*wpb,occ:lim*wpb/a.maxW,lim_reg:limR,lim_smem:limS,lim_warps:limW,lim_blocks:limB};
  }
  // ---------- latency hiding ----------
  function latencySim(warps,compute,lat,ilp,cycles,trace){
    ilp=ilp||1;cycles=cycles||4000;trace=trace||0;
    const body=ilp*(compute+1);
    const readyAt=new Array(warps).fill(0),pc=new Array(warps).fill(0),rows=[];
    for(let w=0;w<warps;w++)rows.push([]);
    let last=0,issued=0;
    for(let t=0;t<cycles;t++){
      let pick=-1;
      if(readyAt[last]<=t&&issued)pick=last;
      else for(let w=0;w<warps;w++)if(readyAt[w]<=t&&(pick<0||readyAt[w]<readyAt[pick]))pick=w;
      if(t<trace)for(let w=0;w<warps;w++)rows[w].push(w===pick?(pc[w]<ilp?'L':'I'):(readyAt[w]<=t?'r':'w'));
      if(pick>=0){issued++;last=pick;pc[pick]++;
        readyAt[pick]=t+1+(pc[pick]===ilp?lat:0);
        if(pc[pick]===body)pc[pick]=0}
    }
    const out={util:issued/cycles,model:Math.min(1,warps*body/(body+lat))};
    if(trace)out.trace=rows.map(r=>r.join(''));
    return out;
  }
  // ---------- tiling ----------
  function tiling(n,bm,bn,elem){
    const flops=2*n*n*n,loads=n*n*n*(1/bn+1/bm);
    return {flops,bytes:loads*elem,ai:flops/(loads*elem)};
  }
  function tileAnim(n,t){n=n||8;t=t||4;const blocks=(n/t)*(n/t),k=n/t;
    return {naive:blocks*k*(t*t)*(2*t),staged:blocks*k*2*t*t,steps:blocks*k}}
  return {diverge,lcgSigns,condMask,laneAddresses,coalesce,transposeSectors,bankWords,banks,ARCH,occupancy,latencySim,tiling,tileAnim};
})();
