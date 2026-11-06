// ---- Shared pieces of this page's 3D scenes (window.DPS): a value bar on a grid cell and a greedy arrow on its top ----
// Directions follow the engines: 0 up (towards the back row), 1 right, 2 down (towards the viewer), 3 left.
(function(){
  if(!window.S3)return;
  const DIR=[[0,-1],[1,0],[0,1],[-1,0]];
  // a bar standing on a cell; h is its height in world units (a thin tile when h is about 0)
  function bar(R,X,Z,h,o){o=o||{};const sz=o.sz||.86;R.box([X,0,Z],[sz,Math.max(.03,h),sz],{fill:o.fill,a:o.a==null?1:o.a,ec:o.ec,lw:o.lw})}
  // a greedy arrow lying on the top of a bar at height Y, pointing along direction d
  function arrow(R,X,Y,Z,d,o){o=o||{};const D=DIR[d],s0=o.s0==null?.19:o.s0,L=o.len||.21;
    R.line([[X+D[0]*s0,Y+.01,Z+D[1]*s0],[X+D[0]*(s0+L),Y+.01,Z+D[1]*(s0+L)]],{c:o.c,w:o.w||2.2,head:o.head||6,a:o.a==null?1:o.a,top:1})}
  // the colour of a value bar: paper tinted towards c by t in [0,1]
  const tint=(P,c,t)=>S3.mix(P.paper,c,.18+.62*Math.max(0,Math.min(1,t)));
  window.DPS={DIR,bar,arrow,tint};
})();
