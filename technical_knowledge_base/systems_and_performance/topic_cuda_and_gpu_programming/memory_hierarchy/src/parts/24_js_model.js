// ---- Models shared by the Reading tab and the Access lab (window.MHM). Checked against code/reference.py by check/check_js.mjs ----
window.MHM=(function(){
  // Global memory: one warp-wide load. Lane l reads w bytes at byte address off + l*stride (repeated for `instr` instructions,
  // instruction k shifted by k*32*stride). Returns the sectors (32 B) touched, bytes fetched, bytes used.
  function sectors(p){
    const w=p.w,stride=p.stride,off=p.off||0,instr=p.instr||1,lanes=p.lanes||32;
    const acc=[];// every access: {k,l,a}
    for(let k=0;k<instr;k++)for(let l=0;l<lanes;l++)acc.push({k:k,l:l,a:off+(k*lanes+l)*stride});
    const sec=new Set(),used=new Set();
    acc.forEach(x=>{for(let b=x.a;b<x.a+w;b++){used.add(b);sec.add(Math.floor(b/32))}});
    const list=[...sec].sort((a,b)=>a-b);
    // sectors per instruction (each warp instruction is served separately)
    const per=[];for(let k=0;k<instr;k++){const s=new Set();acc.filter(x=>x.k===k).forEach(x=>{for(let b=x.a;b<x.a+w;b++)s.add(Math.floor(b/32))});per.push(s.size)}
    const fetched=per.reduce((a,b)=>a+b,0)*32;
    return {acc:acc,list:list,perInstr:per,nSec:per.reduce((a,b)=>a+b,0),fetched:fetched,used:used.size,eff:used.size/fetched,instr:instr};
  }
  // Shared memory: the words each lane touches. mode 'stride': lane l reads element l*s of w-byte elements;
  // mode 'col': lane l reads column c of a 32-wide float tile stored plain, padded (+1 word per row) or XOR-swizzled.
  function smemWords(p){
    const out=[];
    for(let l=0;l<32;l++){
      if(p.mode==='col'){const c=p.c||0;const wd=p.layout==='pad'?l*33+c:p.layout==='xor'?l*32+((c^l)&31):l*32+c;out.push([wd])}
      else{const nw=p.w/4,start=l*p.s*nw;const ws=[];for(let j=0;j<nw;j++)ws.push(start+j);out.push(ws)}
    }
    return out;
  }
  // passes = the most distinct words any one bank must deliver (each bank: 4 bytes per pass); ideal = bytes requested / 128
  function banks(p){
    const lw=smemWords(p);const per=[];for(let b=0;b<32;b++)per.push(new Set());
    lw.forEach(ws=>ws.forEach(wd=>per[wd%32].add(wd)));
    const counts=per.map(s=>s.size);const passes=Math.max(...counts);
    const bytes=32*(p.mode==='col'?4:p.w);const ideal=Math.max(1,Math.ceil(bytes/128));
    return {laneWords:lw,counts:counts,bankWords:per.map(s=>[...s].sort((a,b)=>a-b)),passes:passes,ideal:ideal,degree:passes/ideal};
  }
  // A tile loop with S shared-memory buffers: copy i may start when copy i-1 has started and tile i-S has been computed
  // (S = 1 is the synchronous loop); tile i is computed when its copy has landed and tile i-1 is done.
  function pipeline(S,L,C,n){
    const issue=[],land=[],cs=[],ce=[];
    for(let i=0;i<n;i++){
      const free=i-S>=0?ce[i-S]:0;issue[i]=Math.max(i?issue[i-1]:0,free);land[i]=issue[i]+L;
      cs[i]=Math.max(land[i],i?ce[i-1]:0);ce[i]=cs[i]+C}
    const total=ce[n-1];return {issue:issue,land:land,cs:cs,ce:ce,total:total,busy:n*C/total};
  }
  return {sectors,smemWords,banks,pipeline};
})();
