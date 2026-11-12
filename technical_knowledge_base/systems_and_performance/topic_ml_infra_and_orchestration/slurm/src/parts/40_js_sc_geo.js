// ---- Shared geometry for the 3D stages (renderer v2): a node of the lab cluster as a server slab with its 4 fake GPUs (cubes, front row)
// and 4 CPUs (flat tiles, back row), as slurm.conf declares them (CPUs=4, Gres=gpu:4). Positions and sizes are illustrative. ----
window.SLG=(function(){
  if(!window.S3)return null;
  const {mix}=S3;
  const NX=[-3.2,0,3.2],NAMES=['c1','c2','c3'],SW=2.7,SH=.26,SD=1.6,GX=.62;
  const gpuAt=(n,g)=>[NX[n]+(g-1.5)*GX,SH,.3],cpuAt=(n,g)=>[NX[n]+(g-1.5)*GX,SH,-.42];
  // o.a alpha; o.gpu / o.cpu: four colours (or null for a free slot); o.ga per-slot alpha multiplier
  function node(R,n,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box([NX[n],0,0],[SW,SH,SD],{fill:mix(P.paper,P.ink,.06),a,lw:.7,dz:200});
    for(let g=0;g<4;g++){const gc=o.gpu&&o.gpu[g],cc=o.cpu&&o.cpu[g];
      R.box(gpuAt(n,g),[.5,.4,.52],{fill:gc||mix(P.paper,P.line,.35),a:a*(gc?1:.75),shadow:false,lw:.6});
      R.box(cpuAt(n,g),[.5,.09,.34],{fill:cc||mix(P.paper,P.line,.5),a:a*(cc?1:.75),shadow:false,lw:.5})}}
  return {NX,NAMES,SW,SH,SD,GX,gpuAt,cpuAt,node};
})();
