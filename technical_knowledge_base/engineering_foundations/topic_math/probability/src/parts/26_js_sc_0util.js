// ---- Shared by the 3D scenes (renderer v2, 2026-11-07): bars on a white plinth, the probability triangle of cat, dog, sat
// with a shaded height field over it, and a height field over a square grid. Every height comes from the page's own numbers
// (the tiny model, the umbrella and toxicity tables, the coin and bigram counts); src/recompute.py writes the same numbers. ----
window.PMS=(function(){
  if(!window.S3)return null;const {mix,sub}=S3;
  const NM=['cat','dog','sat'];
  // word colours, as in the page's 2D figures: cat blue, dog green, sat orange
  const wc=(P,k)=>[P.c1,P.c3,P.c2][k];
  // a row of bars: xs centres, vals, s world units per unit of value, o.y plinth height (0: on the floor), o.z depth,
  // o.cols an array or one colour, o.lab(v,i) the label text (false: none), o.al per-bar alpha
  function bars(R,xs,vals,o){const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const y=o.y||0,z=o.z,s=o.s,bw=o.bw||.62,bd=o.bd||.5;
    if(y>0){const x0=Math.min(...xs)-bw,x1=Math.max(...xs)+bw;R.box([(x0+x1)/2,y-.05,z],[x1-x0,.05,bd+.16],{a,shadow:false});[x0+.08,x1-.08].forEach(x=>R.box([x,0,z],[.04,y-.05,.04],{a:a*.9}))}
    vals.forEach((v,i)=>{const ai=a*(o.al?o.al[i]:1);if(ai<=.01)return;const h=Math.max(.012,Math.abs(v)*s),c=Array.isArray(o.cols)?o.cols[i]:(o.cols||P.c1);
      R.box([xs[i],v>=0?y:y-.05-h,z],[bw,h,bd],{fill:mix(c,P.paper,.18),a:ai,shadow:y===0&&o.shadow!==false});
      if(o.lab!==false){const t=o.lab?o.lab(v,i):v.toFixed(3);if(t)R.label([xs[i],v>=0?y+h:y-.05-h,z],t,{mono:true,fs:12.5,b:1,dy:v>=0?-10:16,c:o.lc||c,a:ai})}})}
  // ---- the probability triangle: a bet q = (cat, dog, sat) sits at the weighted average of the three corners ----
  const C=[[-2.1,1.25],[2.1,1.25],[0,-2.4]];
  const at=(q,h)=>[q[0]*C[0][0]+q[1]*C[1][0]+q[2]*C[2][0],h||0,q[0]*C[0][1]+q[1]*C[1][1]+q[2]*C[2][1]];
  // a height field on a barycentric grid of n subdivisions
  function mesh(f,n){const V={},T=[];for(let i=0;i<=n;i++)for(let j=0;j<=n-i;j++){const q=[i/n,j/n,Math.max(0,1-i/n-j/n)];V[i+','+j]={q,v:f(q)}}
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){T.push([V[i+','+j],V[(i+1)+','+j],V[i+','+(j+1)]]);if(i+j+2<=n)T.push([V[(i+1)+','+j],V[(i+1)+','+(j+1)],V[i+','+(j+1)]])}
    let lo=Infinity,hi=-Infinity;for(const k in V){const v=V[k].v;if(isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v)}}return {T,lo,hi}}
  const LT=(()=>{const v=[-.45,1,.6],m=Math.hypot(...v);return v.map(x=>x/m)})();
  // shade one triangle or quad of a height field: lit by a fixed light, tinted from paper (low) to c (high)
  function face(R,pts,v,lo,hi,c,o){const P=R.P,u=sub(pts[1],pts[0]),w=sub(pts[2],pts[0]);let nr=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];if(nr[1]<0)nr=nr.map(x=>-x);const m=Math.hypot(...nr)||1;
    const lm=Math.max(0,(nr[0]*LT[0]+nr[1]*LT[1]+nr[2]*LT[2])/m),sh=P.dark?.62+.38*lm:.8+.2*lm,tt=Math.max(0,Math.min(1,(v-lo)/((hi-lo)||1)));
    const ec=P.dark?mix(c,[255,255,255],.25):mix(c,[0,0,0],.25),base=mix(c,P.paper,P.dark?.2+.45*(1-tt):.3+.55*(1-tt));
    R.quad(pts,{fill:base.map(x=>x*sh),a:o.a,fa:o.fa==null?.9:o.fa,ec,ea:o.ea==null?.16:o.ea,lw:.5})}
  function surf(R,M,sy,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const c=o.c||P.c1,g=o.grow==null?1:o.grow,lo=o.lo!=null?o.lo:M.lo,hi=o.hi!=null?o.hi:M.hi;
    M.T.forEach(t=>{if(t.some(v=>!isFinite(v.v)))return;face(R,t.map(v=>at(v.q,v.v*sy*g)),(t[0].v+t[1].v+t[2].v)/3,lo,hi,c,{a,fa:o.fa,ea:o.ea})})}
  // the floor triangle and its corner names
  function tri(R,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const cs=[[1,0,0],[0,1,0],[0,0,1]].map(q=>at(q,.005));
    R.quad(cs,{fill:P.dark?mix(P.card,P.ink,.06):mix(P.card,P.ink,.03),a:a*.9,ec:P.mute,ea:.6,lw:1.2,dz:.5});
    NM.forEach((nm,i)=>{if(o.hide&&o.hide.includes(i))return;const q=[0,0,0];q[i]=1;const p=at(q,0),d=[p[0]*.12,0,p[2]*.12];R.label([p[0]+d[0],0,p[2]+d[2]],nm+' certain',{fs:12.5,b:1,c:P.mute,a,dy:i===2?-6:14})})}
  // ---- a height field over a square grid: f(x, y) at world (x, 0, -y) ----
  function grid2(R,f,x0,x1,n,sy,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;const c=o.c||R.P.c1,h=(x1-x0)/n,V=[];
    for(let i=0;i<=n;i++){V.push([]);for(let j=0;j<=n;j++)V[i].push(f(x0+i*h,x0+j*h))}
    const hi=o.hi||Math.max(...V.flat()),P3=(i,j)=>[x0+i*h,V[i][j]*sy,-(x0+j*h)];
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=(V[i][j]+V[i+1][j]+V[i][j+1]+V[i+1][j+1])/4;if(v<hi*.004)continue;
      face(R,[P3(i,j),P3(i+1,j),P3(i+1,j+1),P3(i,j+1)],v,0,hi,c,{a,fa:o.fa==null?.82:o.fa,ea:o.ea==null?.12:o.ea})}}
  return {NM,wc,bars,C,at,mesh,surf,tri,grid2};
})();
