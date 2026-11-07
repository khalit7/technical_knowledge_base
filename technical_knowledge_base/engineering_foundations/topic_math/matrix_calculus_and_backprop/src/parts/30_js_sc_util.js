// ---- Shared by the 3D scenes (renderer v2, 2026-11-06): a vector as signed bars on a white plinth, a matrix as a bar field, number formats ----
// Colours used on every scene of this page: forward values green (P.c3), gradients blue (P.acc, the page's highlight colour),
// activations kept for the backward pass orange (P.c2), weight matrices purple glass (P.c4), forward-mode tangents gold (P.c5).
window.MCS=(function(){
  if(!window.S3)return null;const {mix}=S3;
  const f3=v=>{v=Math.abs(v)<5e-13?0:v;return (v<0?'−':'')+Math.abs(v).toFixed(3)};
  const f2=v=>{v=Math.abs(v)<5e-13?0:v;return (v<0?'−':'')+Math.abs(v).toFixed(2)};
  const vec=(a,f)=>'('+a.map(f||f3).join(', ')+')';
  // c: centre of the plinth's top, vals: the entries, m: the value that gets height hmax, col: bar colour, wd: plinth width (entries along x)
  // o.kept tints the plinth orange (an activation the backward pass needs); o.dead: entries drawn as a dashed empty slot (o.dead[i] true)
  function comb(R,c,vals,m,col,a,hmax,wd,o){o=o||{};if(a<=.01)return;const P=R.P,nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.14,.045,.36],{a,shadow:false,fill:o.kept?mix(P.paper,P.c2,.55):P.paper});
    if(c[1]>.12)[-1,1].forEach(sx=>R.box([c[0]+sx*(wd/2),0,c[2]],[.03,c[1]-.05,.03],{a:a*.9}));
    vals.forEach((v,i)=>{const bx=c[0]-wd/2+bw*(i+.5);
      if(v==null){R.box([bx,c[1],c[2]],[bw*.7,.04,.12],{fill:P.paper,a:a*.5,shadow:false,lw:.6,fa:.2});return}
      const hgt=Math.max(.014,Math.abs(v)/m*hmax);
      R.box([bx,v>=0?c[1]:c[1]-.045-hgt,c[2]],[bw*.7,hgt,.12],{fill:col||P.paper,a,shadow:false,lw:.7})})}
  // a matrix as a field of bars on the floor: rows along z (front to back), columns along x; negative entries lighter, every height |v|
  // o.cell spacing, o.hmax, o.m scale, o.col colour, o.t growth 0..1, o.hl [i,j] highlighted
  function field(R,c,M,o){const a=o.a==null?1:o.a;if(a<=.01)return;const P=R.P,nr=M.length,nc=M[0].length,s=o.cell||.34,col=o.col||P.acc,t=o.t==null?1:o.t;
    R.box([c[0],0,c[2]],[nc*s+.16,.03,nr*s+.16],{a:a*.8,fill:P.paper,shadow:false,lw:.6});
    M.forEach((r,i)=>r.forEach((v,j)=>{const x=c[0]+(j-(nc-1)/2)*s,z=c[2]+(i-(nr-1)/2)*s,h=Math.abs(v)/o.m*o.hmax*t;
      if(Math.abs(v)<1e-12){R.box([x,.03,z],[s*.7,.012,s*.7],{fill:P.paper,a:a*.6,shadow:false,lw:.5,fa:.3});return}
      R.box([x,.03,z],[s*.7,Math.max(.014,h),s*.7],{fill:v>=0?col:mix(P.paper,col,.4),a,shadow:false,lw:.7})}))}
  // the world position of a field cell's top, for flows and labels
  const cellTop=(c,M,i,j,o)=>{const s=o.cell||.34,nr=M.length,nc=M[0].length;return [c[0]+(j-(nc-1)/2)*s,.03+Math.abs(M[i][j])/o.m*o.hmax,c[2]+(i-(nr-1)/2)*s]};
  // a straight path sampled for a flow
  const path=(a,b,k)=>{const o=[];k=k||12;for(let i=0;i<=k;i++){const t=i/k;o.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t])}return o};
  return {f3,f2,vec,comb,field,cellTop,path};
})();
