// ---- Shared pieces for this page's 3D scenes (renderer v2, 33_js_s3.js): a machine as a block on the floor with its name above it,
// a log as a stack of thin slabs on top of it (solid once committed or replayed, see-through while not), a version or token as a small tagged
// block, a timer as a glass column that drains, a red cross for a crash or a rejected write, and path helpers for messages. ----
window.DSK=(function(){
  if(!window.S3)return null;
  const {mix,lerp3,cl}=S3;
  const up=(p,y)=>[p[0],y,p[2]];
  // a machine: p the centre of its bottom face, s its size, c its colour; o.a fades it, o.lab/o.sub the name and a second line
  function node(R,p,s,c,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(p,s,{fill:mix(P.paper,c,o.t==null?.34:o.t),a,fa:o.fa});
    const y=s[1]+(o.ly||0);
    if(o.lab)R.label(up(p,y),o.lab,{b:1,fs:o.fs||13,dy:o.dy==null?-12:o.dy,c:o.lc||P.ink,a:Math.max(.4,a),grp:o.grp,wide:o.wide});
    if(o.sub)R.label(up(p,y),o.sub,{fs:12,mono:o.mono,dy:(o.dy==null?-12:o.dy)-16,c:o.sc||P.mute,a:Math.max(.4,a),grp:o.grp,wide:o.subWide==null?o.wide:o.subWide});}
  // a log on top of a machine: entries bottom up, each a slab coloured by cols[i]; done[i] false draws it see-through (not yet committed or replayed)
  function stack(R,p,w,d,y0,cols,done,a,o){o=o||{};const h=o.h||.11,g=o.g||.025;if(a<=.01)return y0;let y=y0;
    cols.forEach((c,i)=>{const ok=done==null||done[i];R.box([p[0],y,p[2]],[w,h,d],{fill:mix(R.P.paper,c,ok?.72:.35),fa:ok?1:.28,ea:ok?undefined:.55,a:a*(o.al?o.al[i]:1),shadow:false,lw:.7});y+=h+g});return y}
  // an empty slot still to come: a dashed outline at height y
  function slot(R,p,w,d,y,a){const P=R.P;R.line([[p[0]-w/2,y,p[2]-d/2],[p[0]+w/2,y,p[2]-d/2],[p[0]+w/2,y,p[2]+d/2],[p[0]-w/2,y,p[2]+d/2],[p[0]-w/2,y,p[2]-d/2]],{c:P.mute,w:1,dash:[3,3],a:(a==null?1:a)*.8})}
  // a tag (a version, a token): a small block with its text above
  function tag(R,p,c,text,a,o){o=o||{};if(a<=.01)return;const P=R.P,s=o.s||[.42,.2,.3];R.box(p,s,{fill:mix(P.paper,c,.7),a,shadow:false,lw:.8});
    if(text)R.label(up(p,p[1]+s[1]),text,{fs:o.fs||12,b:1,mono:o.mono==null?1:o.mono,c:o.lc||c,dy:o.dy==null?-10:o.dy,a,grp:o.grp,wide:o.wide,al:o.al,dx:o.dx})}
  // a timer: a glass column of height H whose fill drains with frac (1 full, 0 run out)
  function timer(R,p,frac,H,c,a){if(a<=.01)return;const P=R.P,f=cl(frac,0,1);R.box(p,[.18,H,.18],{fill:P.paper,fa:.16,a:a*.9,shadow:false,lw:.6});
    if(f>.004)R.box(p,[.12,Math.max(.01,H*f),.12],{fill:mix(P.paper,c,.62),a,shadow:false,lw:.5})}
  // a red cross at p, d its half size
  function cut(R,p,a,d){const P=R.P;d=d||.2;if(a<=.01)return;
    R.line([[p[0]-d,p[1]-d,p[2]],[p[0]+d,p[1]+d,p[2]]],{c:P.bad,w:3,a,top:1});R.line([[p[0]-d,p[1]+d,p[2]],[p[0]+d,p[1]-d,p[2]]],{c:P.bad,w:3,a,top:1})}
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const arcPts=(R,a,b,h,n)=>{const o=[];n=n||20;for(let i=0;i<=n;i++)o.push(R.arcPt(a,b,h,i/n));return o};
  // a path through several points, each leg an arc of height h
  const legs=(R,ps,h,n)=>{let o=[ps[0]];for(let i=1;i<ps.length;i++)o=o.concat(arcPts(R,ps[i-1],ps[i],h,n||14).slice(1));return o};
  const along=(pts,t)=>{const n=pts.length-1,s=cl(t,0,1)*n,i=Math.min(n-1,Math.floor(s));return lerp3(pts[i],pts[i+1],s-i)};
  return {node,stack,slot,tag,timer,cut,win,arcPts,legs,along,up};
})();
