// ---- ViT scenes (renderer v2): the shipped toy ViT's real numbers on the page's demo image, and drawing helpers shared by the two stages ----
// VS.data(): the demo image (the first page seed the 64,000-image model gets right with p > 0.9, as the old hero used), its 49 patches,
// the patch embedding of the most inked patch, the class token, the position table, z0, the class token's attention at each layer
// (heads averaged), its final state y = LN(z_L^0), the head and the probabilities. Everything is computed once by VIT (22_js_vit.js).
(function(){
  if(!window.S3||!window.VIT||!document.querySelector('#stg-hero,#stg-vx'))return;
  const VS={};let D=null;
  VS.data=function(){if(D)return D;
    const m=VIT.load('vit'),Dm=demoSample(),img=Dm.s.img,r=Dm.r,C=VIT.cfg,d=C.D,N=C.N,PP=C.P*C.P;
    const X=VIT.patches(img),pv=i=>Array.from(X.subarray(i*PP,(i+1)*PP));
    const W=m.P['patch.weight'],b=m.P['patch.bias'];
    const emb=i=>{const x=pv(i),o=[];for(let k=0;k<d;k++){let s=b[k];for(let j=0;j<PP;j++)s+=W[k*PP+j]*x[j];o.push(s)}return o};
    const row=(a,t)=>Array.from(a.subarray(t*d,(t+1)*d));
    // the patch with the most ink, so its 16 pixel values are worth looking at
    let f=0,best=-1;for(let i=0;i<N;i++){const s=pv(i).reduce((a,v)=>a+v,0);if(s>best){best=s;f=i}}
    const att=r.atts.map(al=>{const v=new Array(N).fill(0);let self=0;al.forEach(a=>{self+=a[0]/al.length;for(let j=0;j<N;j++)v[j]+=a[1+j]/al.length});return {v,self}});
    const mA=Math.max(...att.flatMap(a=>a.v));
    const E=emb(f),cls=Array.from(m.P.cls),pos=row(m.P.pos,f+1),z0f=row(r.tokens,f+1),z0c=row(r.tokens,0);
    const mx=a=>Math.max(...a.map(Math.abs));
    return D={m,img,label:Dm.s.label,L:Dm.s.L,r,f,pix:pv(f),E,cls,pos,z0f,z0c,att,mA,y:r.y,probs:r.probs,
      mE:Math.max(mx(E),mx(cls),mx(z0f),mx(z0c)),mY:mx(r.y),pred:r.probs.indexOf(Math.max(...r.probs)),cfg:C}};
  // a vector as signed bars on a white plinth (positive up, negative hanging below), laid along x
  VS.comb=function(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const P=R.P,nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.12,.045,.3],{a,shadow:false});
    if(c[1]>.12)[-1,1].forEach(s=>R.box([c[0]+s*wd/2,0,c[2]],[.03,c[1]-.05,.03],{a:a*.9,shadow:false}));
    vals.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)/m*hmax),o=-wd/2+bw*(i+.5),y=v>=0?c[1]:c[1]-.045-h;
      R.box([c[0]+o,y,c[2]],[bw*.7,h,.1],{fill:col||P.paper,a,shadow:false,lw:.6})})};
  // the 28 x 28 grey image (white strokes on black, as the model sees it) drawn into the scene on the plane from corner p0 along u (columns) and v (rows);
  // src = [sx,sy,sw,sh] in pixels draws only that part (one patch)
  const icv=new WeakMap();
  function cvOf(img){let c=icv.get(img);if(c)return c;const S=28;c=document.createElement('canvas');c.width=S;c.height=S;const x=c.getContext('2d'),dd=x.createImageData(S,S);
    for(let i=0;i<S*S;i++){const v=Math.round(255*Math.max(0,Math.min(1,img[i])));dd.data[4*i]=v;dd.data[4*i+1]=v;dd.data[4*i+2]=v;dd.data[4*i+3]=255}x.putImageData(dd,0,0);icv.set(img,c);return c}
  VS.pic=function(R,img,p0,u,v,a,src,dz){if(a<=.01)return;const {add}=S3,s=src||[0,0,28,28],q0=R.p(p0),q1=R.p(add(p0,u)),q3=R.p(add(p0,v)),z=R.p(add(p0,S3.mul(add(u,v),.5)))[2]+(dz||0),cv=cvOf(img);
    R.q.push({z,f:cx=>{cx.save();cx.globalAlpha=a;cx.imageSmoothingEnabled=false;cx.transform((q1[0]-q0[0])/s[2],(q1[1]-q0[1])/s[2],(q3[0]-q0[0])/s[3],(q3[1]-q0[1])/s[3],q0[0],q0[1]);
      cx.drawImage(cv,s[0],s[1],s[2],s[3],0,0,s[2],s[3]);cx.restore()}})};
  // the same, cut into its 7 x 7 patches, each placed by its own three corners, so a large image in perspective keeps its corners on the grid
  VS.picGrid=function(R,img,p0,u,v,a,dz){const {add,mul}=S3;for(let r=0;r<7;r++)for(let c=0;c<7;c++)VS.pic(R,img,add(p0,add(mul(u,c/7),mul(v,r/7))),mul(u,1.03/7),mul(v,1.03/7),a,[c*4,r*4,4,4],dz)};
  VS.KIND=['ring','square','triangle','plus','x'];
  VS.pct=v=>(v*100).toFixed(v>.995||v<.005?1:0)+'%';
  window.VS=VS;
})();
