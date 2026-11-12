// ---- Shared by the 3D scenes of the JAX core page (renderer v2, 2026-11). Colours used on every scene, matched to the prose:
// tracers and abstract values blue (P.acc), recorded jaxpr equations purple glass (P.c4), real values and compiled code green (P.c3),
// tangents and the JVP trace gold (P.c5), the batch axis and BatchTrace teal (P.c6), cotangents and gradients orange (P.c2).
window.JCS=(function(){
  if(!window.S3)return null;const {mix,lerp}=S3;
  // an upright label, drawn only when its anchor is on the canvas (close-up views leave parts of a scene outside)
  function lab(R,p,t,o){const q=R.p(p);if(q[2]<=0||q[0]<4||q[0]>R.W-4||q[1]<4||q[1]>R.H-4)return;R.label(p,t,o)}
  // a grid of small cubes: rows along z, cols along x, centred on c (the bottom of the cubes); a tensor drawn by its shape only
  function cubes(R,c,rows,cols,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const s=o.cell||.17,k=o.size||.13;
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++)R.box([c[0]+(j-(cols-1)/2)*s,c[1],c[2]+(i-(rows-1)/2)*s],[k,o.h||k,k],{fill:o.fill,a,shadow:o.shadow===true,lw:.6})}
  // a straight path, sampled so a flow can run along it
  function path(a,b,n){const o=[];n=n||10;for(let i=0;i<=n;i++){const t=i/n;o.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)])}return o}
  // several straight legs joined into one path
  function legs(pts){let o=[pts[0]];for(let i=1;i<pts.length;i++)o=o.concat(path(pts[i-1],pts[i],8).slice(1));return o}
  // a dashed outline of an empty slot on the floor
  function slot(R,c,w,d,a){const P=R.P;R.quad([[c[0]-w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]+d/2],[c[0]-w/2,c[1]+.005,c[2]+d/2]],{a:a==null?.8:a,ec:P.mute,dash:[4,3],lw:1})}
  const tint=(P,c,t)=>mix(P.paper,c,t);
  return {lab,cubes,path,legs,slot,tint};
})();
