// ---- Shared by the 3D scenes of the PyTorch to JAX page (renderer v2, 2026-11-12). Colours match the prose and the old hero:
// weights blue (P.c1), gradients orange (P.c2), optimiser state green (P.c3), random state purple (P.c4); a passing rung P.good, a failing one P.bad.
window.PJS=(function(){
  if(!window.S3)return null;const {mix,lerp}=S3;
  // an upright label, drawn only when its anchor is on the canvas (close-up views leave parts of a scene outside)
  function lab(R,p,t,o){const q=R.p(p);if(q[2]<=0||q[0]<4||q[0]>R.W-4||q[1]<4||q[1]>R.H-4)return;R.label(p,t,o)}
  // a straight path, sampled so a flow can run along it
  function path(a,b,n){const o=[];n=n||10;for(let i=0;i<=n;i++){const t=i/n;o.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)])}return o}
  // several straight legs joined into one path
  function legs(pts){let o=[pts[0]];for(let i=1;i<pts.length;i++)o=o.concat(path(pts[i-1],pts[i],8).slice(1));return o}
  // a horizontal glass plate centred at c (its top face at c[1]), w along x and d along z: one layer's weights
  function plate(R,c,w,d,o){o=o||{};R.glass([c[0]-w/2,c[1],c[2]-d/2],[w,0,0],[0,0,d],{c:o.c||R.P.c1,a:o.a,nu:o.nu||6,nv:o.nv||4,th:o.th==null?.04:o.th,dz:o.dz})}
  // a dashed outline of an empty slot (on the floor or at height c[1])
  function slot(R,c,w,d,a){const P=R.P;R.quad([[c[0]-w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]+d/2],[c[0]-w/2,c[1]+.005,c[2]+d/2]],{a:a==null?.8:a,ec:P.mute,dash:[4,3],lw:1})}
  const tint=(P,c,t)=>mix(P.paper,c,t);
  // the running example as six layer plates, bottom to top (heights shared by the hero and the ladder)
  const LAYERS=['embeddings','block 0','block 1','block 2','block 3','LayerNorm + head'];
  const ly=i=>.35+i*.36;
  return {lab,path,legs,plate,slot,tint,LAYERS,ly};
})();
