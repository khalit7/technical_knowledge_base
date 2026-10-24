// ---- Maths for the 2026-10-24 additions (no DOM): the two-layer network of section 5 and the gradient-product toy of section 10.
// Checked against src/two_layer.py (PyTorch autograd for the network) by src/check_new.mjs.
window.MC2=(function(){
  const mv=(A,v)=>A.map(r=>r.reduce((s,a,j)=>s+a*v[j],0));
  const mtv=(A,v)=>A[0].map((_,j)=>A.reduce((s,r,i)=>s+r[j]*v[i],0));
  const outer=(u,v)=>u.map(a=>v.map(b=>a*b));
  // section 5: x -> a = W1 x -> h = ReLU(a) -> z = W2 h -> p = softmax(z) -> L = -ln p[sat]
  // the root page's Gradient lab network (topic_math src/parts/32_js_grad_core.js, M0): logits (2, 1, 0), hidden unit 3 off
  const NET={x:[2,1],W1:[[0.5,0],[0,1],[1,-3]],W2:[[2,0,1],[0,1,0],[-1,1,0]],y:2,lr:0.1};
  function fwd(W1,W2){const a=mv(W1,NET.x),h=a.map(t=>Math.max(0,t)),z=mv(W2,h),m=Math.max(...z),e=z.map(t=>Math.exp(t-m)),s=e.reduce((u,v)=>u+v,0),p=e.map(t=>t/s);
    return {a,h,z,p,loss:-Math.log(p[NET.y])}}
  function two(){const f=fwd(NET.W1,NET.W2),gz=f.p.map((v,k)=>v-(k===NET.y?1:0)),gW2=outer(gz,f.h),gh=mtv(NET.W2,gz),
      ga=gh.map((g,i)=>f.a[i]>0?g:0),gW1=outer(ga,NET.x),gx=mtv(NET.W1,ga);
    const W1n=NET.W1.map((r,i)=>r.map((w,j)=>w-NET.lr*gW1[i][j])),W2n=NET.W2.map((r,i)=>r.map((w,j)=>w-NET.lr*gW2[i][j])),g=fwd(W1n,W2n);
    return Object.assign({},NET,f,{gz,gW2,gh,ga,gW1,gx,p_new:g.p,loss_new:g.loss})}
  // section 10: n layers of width d, weights N(0, g^2/d) from one seeded draw (mulberry32 + Box-Muller, as in two_layer.py)
  const VN=30,VD=64;let Z=null;
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function normals(seed,count){const r=mulberry32(seed),out=[];while(out.length<count){let u1=r(),u2=r();u1=Math.max(u1,1e-12);const rad=Math.sqrt(-2*Math.log(u1));out.push(rad*Math.cos(2*Math.PI*u2),rad*Math.sin(2*Math.PI*u2))}return out.slice(0,count)}
  function chain(g,act){if(!Z)Z=normals(7,VN*VD*VD+2*VD);
    const s=g/Math.sqrt(VD),off=VN*VD*VD,h0=Z.slice(off,off+VD);let u=Z.slice(off+VD,off+2*VD);const nu=Math.hypot(...u);u=u.map(t=>t/nu);
    const W=k=>{const M=[];for(let i=0;i<VD;i++){const r=new Array(VD);for(let j=0;j<VD;j++)r[j]=s*Z[k*VD*VD+i*VD+j];M.push(r)}return M};
    const Ws=[];for(let k=0;k<VN;k++)Ws.push(W(k));
    const hs=[h0];for(let k=0;k<VN;k++){const pre=mv(Ws[k],hs[k]);hs.push(act==='tanh'?pre.map(Math.tanh):pre)}
    let gb=u.slice();const norms=[1];
    for(let k=VN;k>=1;k--){if(act==='tanh')gb=gb.map((v,i)=>v*(1-hs[k][i]*hs[k][i]));gb=mtv(Ws[k-1],gb);norms.push(Math.hypot(...gb))}
    return norms.reverse()}
  const cache={};
  function vanish(g){const k=g.toFixed(2);if(!cache[k])cache[k]={linear:chain(g,'linear'),tanh:chain(g,'tanh')};return cache[k]}
  return {NET,two,vanish,VN,VD};
})();
