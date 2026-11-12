// ---- Shared by the 3D scenes of the JAX training stack page (renderer v2, 2026-11-12). Colours match the prose:
// parameters blue (P.c1, the page's highlight colour for state), gradients orange (P.c2), optimiser state green (P.c3), random state purple (P.c4),
// data yellow (P.c5), checkpoint teal (P.c6).
window.TSS=(function(){
  if(!window.S3)return null;const {mix,lerp}=S3;
  // an upright label, drawn only when its anchor is on the canvas (close-up views leave parts of a scene outside)
  function lab(R,p,t,o){const q=R.p(p);if(q[2]<=0||q[0]<4||q[0]>R.W-4||q[1]<4||q[1]>R.H-4)return;R.label(p,t,o)}
  // a straight path, sampled so a flow can run along it
  function path(a,b,n){const o=[];n=n||10;for(let i=0;i<=n;i++){const t=i/n;o.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)])}return o}
  // several straight legs joined into one path
  function legs(pts){let o=[pts[0]];for(let i=1;i<pts.length;i++)o=o.concat(path(pts[i-1],pts[i],8).slice(1));return o}
  // a horizontal glass plate centred at c (its top face at c[1]), w along x and d along z: one array of state
  function plate(R,c,w,d,o){o=o||{};R.glass([c[0]-w/2,c[1],c[2]-d/2],[w,0,0],[0,0,d],{c:o.c||R.P.c1,a:o.a,nu:o.nu||6,nv:o.nv||4,th:o.th==null?.04:o.th,dz:o.dz})}
  // an upright glass plate across the x axis, centred at c (bottom edge at c[1]), d wide along z and h tall: a transformation the data passes through
  function wall(R,c,d,h,o){o=o||{};R.glass([c[0],c[1],c[2]-d/2],[0,0,d],[0,h,0],{c:o.c||R.P.c3,a:o.a,nu:o.nu||5,nv:o.nv||4,th:o.th==null?.04:o.th,dz:o.dz})}
  // a dashed outline of an empty slot at height c[1]
  function slot(R,c,w,d,a){const P=R.P;R.quad([[c[0]-w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]+d/2],[c[0]-w/2,c[1]+.005,c[2]+d/2]],{a:a==null?.8:a,ec:P.mute,dash:[4,3],lw:1})}
  // the wire edges of a box (an object's structure without its arrays: the graphdef)
  function frame(R,c,s,o){o=o||{};const x0=c[0]-s[0]/2,x1=c[0]+s[0]/2,y0=c[1],y1=c[1]+s[1],z0=c[2]-s[2]/2,z1=c[2]+s[2]/2,a=o.a==null?1:o.a,lo={c:o.c||R.P.mute,w:o.w||1.2,a,dash:o.dash};
    [[x0,z0],[x1,z0],[x1,z1],[x0,z1]].forEach(([x,z])=>R.line([[x,y0,z],[x,y1,z]],lo));
    [y0,y1].forEach(y=>R.line([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[x0,y,z0]],lo))}
  const tint=(P,c,t)=>mix(P.paper,c,t);
  // a record's colour from its window index (0 to 7,780), the same hue rule as the 2D batch grid used before
  function rec(P,id,n){const h=id/(n||7781)*300,s=.55,l=P.dark?.42:.5;const f=k=>{const kk=(k+h/30)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(kk-3,9-kk,1))};return [f(0)*255,f(8)*255,f(4)*255]}
  return {lab,path,legs,plate,wall,slot,frame,tint,rec};
})();
