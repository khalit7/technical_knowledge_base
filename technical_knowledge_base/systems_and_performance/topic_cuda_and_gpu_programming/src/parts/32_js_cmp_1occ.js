// ---- Compiler explorer: occupancy, ported from NVIDIA's cuda_occupancy.h (CUDA 13.4.2), default device state.
// Validated: src/compile/occ/occ.py (same logic) agrees with the header on every case in occ/cases.txt;
// src/compile/check_embed.py runs this function against occ.py.
window.CMPX.occ=function(arch,regs,smem,block,dsmem,bars){
  const A=window.CMP.archinfo[arch],BIG=1e9,wc=Math.ceil(block/32);
  const limW=Math.floor(A.maxW/wc);
  const rpw=Math.ceil(regs*32/256)*256;
  let limR;
  if(rpw*Math.ceil(wc/4)*4>65536||rpw*wc>65536||regs>256)limR=0;
  else if(rpw>0)limR=Math.floor(Math.floor(Math.floor(65536/4)/rpw)*4/wc);
  else limR=BIG;
  const per=Math.ceil((smem+1024+(dsmem||0))/128)*128;
  let limS=per>0?Math.floor(A.smemSM/per):BIG;if(smem+(dsmem||0)>A.smemBlock)limS=0;
  const limB=A.maxB;
  let n=Math.min(limR,limS,limW,limB);
  if(bars){const perB=(A.cc==='8.0'||A.cc==='9.0'||A.cc==='10.0')?2:1;n=Math.min(n,Math.floor(limB*perB/bars))}
  const names=[];if(n===limR)names.push('registers');if(n===limS)names.push('shared memory');if(n===limW)names.push('warp slots');if(n===limB)names.push('block slots');
  const detail='Registers: '+regs+' per thread x 32 = '+regs*32+', rounded up to '+rpw+' per warp; each quarter of the SM has 16,384, so '+(rpw?Math.floor(16384/rpw):'any')+' warps per quarter, '+(rpw?Math.floor(16384/rpw)*4:'any')+' per SM, '+(limR>=BIG?'no limit':limR+' blocks of '+wc+' warps')+'. '+
    'Shared memory: '+smem+' B + 1,024 B reserved'+((dsmem||0)?' + '+dsmem+' B dynamic':'')+' = '+per+' B per block (rounded to 128 B); '+(A.smemSM/1024)+' KB per SM gives '+limS+' blocks. '+
    'Warp slots: '+A.maxW+' / '+wc+' = '+limW+'. Block slots: '+limB+'.';
  return {blocks:n,warps:n*wc,maxW:A.maxW,occ:n*wc/A.maxW,lim:names.join(' and ')||'none',limits:{reg:limR,smem:limS,warps:limW,blocks:limB},detail};
};
