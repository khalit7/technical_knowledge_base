// ---- Shared by the 3D scenes (renderer v2, 2026-11-06): the probability simplex of three outcomes (cat, dog, sat) as a floor triangle,
// a shaded height field over it (entropy, cross-entropy), and signed bars on a white plinth. Every height is computed from IT (22_js_core.js). ----
window.ITS=(function(){
  if(!window.S3||!window.IT)return null;const {mix,sub,lerp}=S3;
  // the three corners on the floor (x, z): cat front left, dog front right, sat at the back; a bet q = (cat, dog, sat) sits at the weighted average
  const C=[[-2.1,1.25],[2.1,1.25],[0,-2.4]],NM=['cat','dog','sat'];
  const at=(q,h)=>[q[0]*C[0][0]+q[1]*C[1][0]+q[2]*C[2][0],h||0,q[0]*C[0][1]+q[1]*C[1][1]+q[2]*C[2][1]];
  // a height field on a barycentric grid of n subdivisions: vertex (i, j) is the bet (i/n, j/n, 1 - i/n - j/n)
  function mesh(f,n){const V={},T=[];for(let i=0;i<=n;i++)for(let j=0;j<=n-i;j++){const q=[i/n,j/n,Math.max(0,1-i/n-j/n)];V[i+','+j]={q,v:f(q)}}
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){T.push([V[i+','+j],V[(i+1)+','+j],V[i+','+(j+1)]]);if(i+j+2<=n)T.push([V[(i+1)+','+j],V[(i+1)+','+(j+1)],V[i+','+(j+1)]])}
    let lo=Infinity,hi=-Infinity;for(const k in V){const v=V[k].v;if(isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v)}}return {T,lo,hi}}
  const L=(()=>{const v=[-.45,1,.6],m=Math.hypot(...v);return v.map(x=>x/m)})();
  // draw the field: height = value * sy * grow; triangles with a vertex above cap (or infinite) are left out, so a loss that runs to infinity shows as an open edge
  function surf(R,M,sy,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const c=o.c||P.c1,g=o.grow==null?1:o.grow,cap=o.cap==null?Infinity:o.cap,lo=o.lo!=null?o.lo:M.lo,hi=o.hi!=null?o.hi:M.hi;
    const ec=P.dark?mix(c,[255,255,255],.25):mix(c,[0,0,0],.25);
    M.T.forEach(t=>{if(t.some(v=>!isFinite(v.v)||v.v>cap))return;const pts=t.map(v=>at(v.q,v.v*sy*g));
      const u=sub(pts[1],pts[0]),w=sub(pts[2],pts[0]);let nr=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];if(nr[1]<0)nr=nr.map(x=>-x);const m=Math.hypot(...nr)||1;
      const lm=Math.max(0,(nr[0]*L[0]+nr[1]*L[1]+nr[2]*L[2])/m),sh=P.dark?.62+.38*lm:.8+.2*lm,v=(t[0].v+t[1].v+t[2].v)/3,tt=Math.max(0,Math.min(1,(v-lo)/((hi-lo)||1)));
      const base=mix(c,P.paper,P.dark?.2+.45*(1-tt):.3+.55*(1-tt));R.quad(pts,{fill:base.map(x=>x*sh),a,fa:o.fa==null?.9:o.fa,ec,ea:o.ea==null?.16:o.ea,lw:.5})})}
  // the floor triangle and its corner names
  function tri(R,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const cs=[[1,0,0],[0,1,0],[0,0,1]].map(q=>at(q,.005));
    R.quad(cs,{fill:P.dark?mix(P.card,P.ink,.06):mix(P.card,P.ink,.03),a:a*.9,ec:P.mute,ea:.6,lw:1.2,dz:.5});
    NM.forEach((nm,i)=>{if(o.hide&&o.hide.includes(i))return;const q=[0,0,0];q[i]=1;const p=at(q,0),d=[p[0]*.12,0,p[2]*.12];R.label([p[0]+d[0],0,p[2]+d[2]],nm+' certain',{fs:12.5,b:1,c:P.mute,a,dy:i===2?-6:14})})}
  // a path of bets on the field, lifted a little above it
  const lift=(qs,f,sy,dy)=>qs.map(q=>at(q,f(q)*sy+(dy||.03)));
  // a row of signed bars on a white plinth (positive stand on it, negative hang below): xs centres, vals, scale, plinth height y, depth z
  function signed(R,xs,vals,o){const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const y=o.y,z=o.z,s=o.s,bw=o.bw||.62,x0=Math.min(...xs)-bw,x1=Math.max(...xs)+bw;
    R.box([(x0+x1)/2,y-.05,z],[x1-x0,.05,.5],{a,shadow:false});[x0+.08,x1-.08].forEach(x=>R.box([x,0,z],[.04,y-.05,.04],{a:a*.9}));
    vals.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)*s),c=v>=0?(o.cp||P.c2):(o.cn||mix(P.paper,o.cp||P.c2,.4));
      R.box([xs[i],v>=0?y:y-.05-h,z],[bw*.8,h,.32],{fill:c,a,shadow:false});
      if(o.lab!==false)R.label([xs[i],v>=0?y+h:y-.05-h,z],(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(o.nd==null?3:o.nd),{mono:true,fs:12.5,b:1,dy:v>=0?-10:16,c:v>=0?(o.cp||P.c2):P.ink,a})})}
  return {C,NM,at,mesh,surf,tri,lift,signed};
})();
