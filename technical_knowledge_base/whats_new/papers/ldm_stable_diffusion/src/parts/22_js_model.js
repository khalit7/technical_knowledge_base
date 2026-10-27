// ---- The toy latent diffusion model in plain JS: autoencoder (Sec. 3.1), UNet with cross-attention (Sec. 3.3), DDIM with guidance ----
// Op for op the same as src/toy.py; checked against PyTorch by check_forward.py / check_forward.mjs. Tensors are Float32Array in C x H x W order.
const LDM=(function(){
  const WD=window.LDM_W;
  const b64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
  const A64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function tensor(e,bits){const q=2**(bits-1)-1,sc=new Float32Array(b64(e.s).buffer),n=e.shape.reduce((a,b)=>a*b,1),rows=sc.length,per=n/rows,o=new Float32Array(n);
    if(bits===6){const s=e.q;for(let i=0;i<n;i++)o[i]=(A64.indexOf(s[i])-q)*sc[(i/per)|0]}
    else{const raw=b64(e.q);for(let i=0;i<n;i++)o[i]=(raw[i]-q)*sc[(i/per)|0]}
    return o}
  const cache={};
  function weights(name){if(cache[name])return cache[name];const M=WD.models[name],W={};for(const k in M.t)W[k]=tensor(M.t[k],WD.bits);W.cfg=M.cfg;W.shape=M.t;return cache[name]=W}
  let MACS=0;
  // conv 3x3, padding 1, stride s: x (ci, H, W) -> (co, H/s, W/s)
  function conv3(x,ci,H,Wd,w,b,co,s){const Ho=H/s|0,Wo=Wd/s|0,o=new Float32Array(co*Ho*Wo);MACS+=co*Ho*Wo*ci*9;
    for(let oc=0;oc<co;oc++){const ob=oc*Ho*Wo,bb=b?b[oc]:0;for(let i=0;i<Ho*Wo;i++)o[ob+i]=bb;
      for(let ic=0;ic<ci;ic++){const xb=ic*H*Wd,wb=(oc*ci+ic)*9;
        for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++){const wv=w[wb+ky*3+kx];if(wv===0)continue;
          for(let y=0;y<Ho;y++){const iy=y*s+ky-1;if(iy<0||iy>=H)continue;const rb=xb+iy*Wd,orow=ob+y*Wo;
            for(let xx=0;xx<Wo;xx++){const ix=xx*s+kx-1;if(ix<0||ix>=Wd)continue;o[orow+xx]+=wv*x[rb+ix]}}}}}
    return o}
  const silu=x=>{const o=new Float32Array(x.length);for(let i=0;i<x.length;i++){const v=x[i];o[i]=v/(1+Math.exp(-v))}return o};
  function gnorm(x,C,HW,g,b){const G=4,cg=C/G,o=new Float32Array(x.length);
    for(let gi=0;gi<G;gi++){let m=0,v=0;const a=gi*cg*HW,e=a+cg*HW;for(let i=a;i<e;i++)m+=x[i];m/=cg*HW;for(let i=a;i<e;i++){const d=x[i]-m;v+=d*d}v/=cg*HW;const r=1/Math.sqrt(v+1e-5);
      for(let c=gi*cg;c<(gi+1)*cg;c++)for(let i=0;i<HW;i++)o[c*HW+i]=(x[c*HW+i]-m)*r*g[c]+b[c]}return o}
  function up2(x,C,H,Wd){const o=new Float32Array(C*H*Wd*4),W2=Wd*2;for(let c=0;c<C;c++)for(let y=0;y<H*2;y++)for(let xx=0;xx<W2;xx++)o[c*H*2*W2+y*W2+xx]=x[c*H*Wd+(y>>1)*Wd+(xx>>1)];return o}
  // linear on a row vector (in) -> out; weight (out, in) as PyTorch
  function lin(v,w,b,ni,no){const o=new Float32Array(no);MACS+=ni*no;for(let j=0;j<no;j++){let s=b?b[j]:0;const r=j*ni;for(let i=0;i<ni;i++)s+=w[r+i]*v[i];o[j]=s}return o}
  function lnorm(v,g,b){const n=v.length;let m=0,s=0;for(let i=0;i<n;i++)m+=v[i];m/=n;for(let i=0;i<n;i++){const d=v[i]-m;s+=d*d}s/=n;const r=1/Math.sqrt(s+1e-5),o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=(v[i]-m)*r*g[i]+b[i];return o}
  const gelu=v=>v.map(x=>0.5*x*(1+Math.tanh(0.7978845608028654*(x+0.044715*x*x*x))));
  // ---- autoencoder ----
  function aeEncode(name,img){const W=weights(name),[f,c,C]=W.cfg,m=Math.round(Math.log2(f));let H=32,h=silu(conv3(img,3,H,H,W['ein.weight'],W['ein.bias'],C,1));
    for(let i=0;i<m;i++){h=silu(conv3(h,C,H,H,W['edown.'+i+'.0.weight'],W['edown.'+i+'.0.bias'],C,2));H/=2;h=silu(conv3(h,C,H,H,W['edown.'+i+'.1.weight'],W['edown.'+i+'.1.bias'],C,1))}
    const mo=conv3(h,C,H,H,W['eout.weight'],W['eout.bias'],2*c,1),n=c*H*H;return {mu:mo.slice(0,n),lv:mo.slice(n).map(v=>Math.min(20,Math.max(-30,v))),c,h:H}}
  function aeDecode(name,z){const W=weights(name),[f,c,C]=W.cfg,m=Math.round(Math.log2(f));let H=32/f,h=silu(conv3(z,c,H,H,W['din.weight'],W['din.bias'],C,1));
    for(let i=0;i<m;i++){h=up2(h,C,H,H);H*=2;h=silu(conv3(h,C,H,H,W['dup.'+i+'.0.weight'],W['dup.'+i+'.0.bias'],C,1));h=silu(conv3(h,C,H,H,W['dup.'+i+'.1.weight'],W['dup.'+i+'.1.bias'],C,1))}
    return conv3(h,C,H,H,W['dout.weight'],W['dout.bias'],3,1)}
  // ---- tau_theta: one pre-LN transformer block over the 3 prompt tokens (Eq. 18 to 23) ----
  function tau(W,ids){const D=W.cfg.D,P='tau.';let z=ids.map((id,i)=>{const o=new Float32Array(D);for(let d=0;d<D;d++)o[d]=W[P+'tok.weight'][id*D+d]+W[P+'pos'][i*D+d];return o});
    const h=z.map(v=>lnorm(v,W[P+'ln1.weight'],W[P+'ln1.bias'])),qkv=h.map(v=>lin(v,W[P+'qkv.weight'],W[P+'qkv.bias'],D,3*D));
    const z2=z.map((zi,i)=>{const s=qkv.map(r=>{let d=0;for(let k=0;k<D;k++)d+=qkv[i][k]*r[D+k];return d/Math.sqrt(D)}),mx=Math.max(...s),e=s.map(v=>Math.exp(v-mx)),se=e.reduce((a,b)=>a+b,0);
      const av=new Float32Array(D);qkv.forEach((r,j)=>{for(let k=0;k<D;k++)av[k]+=e[j]/se*r[2*D+k]});const o=lin(av,W[P+'o.weight'],W[P+'o.bias'],D,D);return o.map((v,k)=>v+zi[k])});
    z=z2.map(v=>{const a=gelu(lin(lnorm(v,W[P+'ln2.weight'],W[P+'ln2.bias']),W[P+'m1.weight'],W[P+'m1.bias'],D,2*D)),b=lin(a,W[P+'m2.weight'],W[P+'m2.bias'],2*D,D);return b.map((x,k)=>x+v[k])});
    return z.map(v=>lnorm(v,W[P+'lnf.weight'],W[P+'lnf.bias']))}
  function tembSin(t,T){const half=T/2,o=new Float32Array(T);for(let i=0;i<half;i++){const a=t*Math.exp(-Math.log(10000)*i/half);o[i]=Math.cos(a);o[half+i]=Math.sin(a)}return o}
  function resblock(W,P,x,C,HW,te,T){const H=Math.sqrt(HW);let h=conv3(silu(gnorm(x,C,HW,W[P+'n1.weight'],W[P+'n1.bias'])),C,H,H,W[P+'c1.weight'],W[P+'c1.bias'],C,1);
    const tp=lin(te,W[P+'t.weight'],W[P+'t.bias'],T,C);for(let c=0;c<C;c++)for(let i=0;i<HW;i++)h[c*HW+i]+=tp[c];
    h=conv3(silu(gnorm(h,C,HW,W[P+'n2.weight'],W[P+'n2.bias'])),C,H,H,W[P+'c2.weight'],W[P+'c2.bias'],C,1);for(let i=0;i<h.length;i++)h[i]+=x[i];return h}
  // cross-attention: Q from the flattened feature map, K and V from tau(y); returns the new map and the N x 3 attention weights
  function xattn(W,P,x,C,HW,ctx,D){const K=ctx.map(v=>lin(v,W[P+'k.weight'],null,D,C)),V=ctx.map(v=>lin(v,W[P+'v.weight'],null,D,C)),o=new Float32Array(x.length),att=new Float32Array(HW*3);
    for(let n=0;n<HW;n++){const hv=new Float32Array(C);for(let c=0;c<C;c++)hv[c]=x[c*HW+n];const q=lin(lnorm(hv,W[P+'ln.weight'],W[P+'ln.bias']),W[P+'q.weight'],null,C,C);
      const s=K.map(k=>{let d=0;for(let c=0;c<C;c++)d+=q[c]*k[c];return d/Math.sqrt(C)}),mx=Math.max(...s),e=s.map(v=>Math.exp(v-mx)),se=e[0]+e[1]+e[2];
      const av=new Float32Array(C);for(let j=0;j<3;j++){att[n*3+j]=e[j]/se;for(let c=0;c<C;c++)av[c]+=att[n*3+j]*V[j][c]}MACS+=3*C*2;
      const ov=lin(av,W[P+'o.weight'],W[P+'o.bias'],C,C);for(let c=0;c<C;c++)o[c*HW+n]=hv[c]+ov[c]}
    return {h:o,att}}
  // epsilon_theta(z_t, t, tau(y)); keep (optional array) receives every cross-attention map {res, att}
  function unet(name,x,t,ids,keep){const W=weights(name),cf=W.cfg,chs=cf.chs,T=cf.T,D=cf.D;let R=cf.res;
    const te=lin(silu(lin(tembSin(t,T),W['te1.weight'],W['te1.bias'],T,T)),W['te2.weight'],W['te2.bias'],T,T);const ctx=tau(W,ids);
    let h=conv3(x,cf.cin,R,R,W['inc.weight'],W['inc.bias'],chs[0],1);const skips=[];
    for(let i=0;i<chs.length;i++){const r=cf.res>>i;h=resblock(W,'down.'+i+'.',h,chs[i],r*r,te,T);
      if(r<=cf.attn_max){const a=xattn(W,'att_d.'+i+'.',h,chs[i],r*r,ctx,D);h=a.h;if(keep)keep.push({res:r,att:a.att,where:'down'})}
      if(i<chs.length-1){skips.push(h);h=conv3(h,chs[i],r,r,W['ds.'+i+'.weight'],W['ds.'+i+'.bias'],chs[i+1],2)}}
    for(let i=chs.length-2;i>=0;i--){const r=cf.res>>i;h=conv3(up2(h,chs[i+1],r/2,r/2),chs[i+1],r,r,W['us.'+i+'.weight'],W['us.'+i+'.bias'],chs[i],1);const sk=skips[i];for(let k=0;k<h.length;k++)h[k]+=sk[k];
      h=resblock(W,'up.'+i+'.',h,chs[i],r*r,te,T);if(r<=cf.attn_max){const a=xattn(W,'att_u.'+i+'.',h,chs[i],r*r,ctx,D);h=a.h;if(keep)keep.push({res:r,att:a.att,where:'up'})}}
    return conv3(silu(gnorm(h,chs[0],cf.res*cf.res,W['on.weight'],W['on.bias'])),chs[0],cf.res,cf.res,W['oc.weight'],W['oc.bias'],cf.cin,1)}
  // schedule: the LDM code's "linear" = linspace(sqrt(start), sqrt(end), T)^2
  const T=WD.T,ab=new Float64Array(T);{let p=1;for(let i=0;i<T;i++){const s=Math.sqrt(WD.lin[0])+(Math.sqrt(WD.lin[1])-Math.sqrt(WD.lin[0]))*i/(T-1),b=s*s;p*=1-b;ab[i]=p}}
  const ddimSteps=S=>{const c=Math.floor(T/S),o=[];for(let t=0;t<T;t+=c)o.push(t+1);return o.reverse()};
  // Box-Muller normals from a seeded generator (the same noise for every space at a given seed is not possible: the shapes differ)
  function randn(n,seed){const r=mulberry32(seed),o=new Float32Array(n);for(let i=0;i<n;i+=2){const u=Math.max(1e-12,r()),v=r(),m=Math.sqrt(-2*Math.log(u));o[i]=m*Math.cos(2*Math.PI*v);if(i+1<n)o[i+1]=m*Math.sin(2*Math.PI*v)}return o}
  // a DDIM chain as a stepper: next() does one step; returns null when done. opts {S, scale, seed, keepAtt}
  function chain(name,ids,o){const W=weights(name),cf=W.cfg,n=cf.cin*cf.res*cf.res,ts=ddimSteps(o.S||50),sc=o.scale==null?3:o.scale,NUL=[WD.NULL,WD.NULL,WD.NULL];
    let x=o.x0?Float32Array.from(o.x0):randn(n,o.seed||1),j=0;const st={x,j:0,n:ts.length,ts,macs:0,att:null,x0:null};
    st.next=()=>{if(j>=ts.length)return null;const t=ts[j],a=ab[t],ap=j+1<ts.length?ab[ts[j+1]]:ab[0],m0=MACS,keep=o.keepAtt?[]:null;let e;
      const ec=unet(name,x,t,ids,keep);if(sc===1)e=ec;else{const eu=unet(name,x,t,NUL);e=new Float32Array(n);for(let i=0;i<n;i++)e[i]=eu[i]+sc*(ec[i]-eu[i])}
      const x0=new Float32Array(n),xn=new Float32Array(n);for(let i=0;i<n;i++){x0[i]=(x[i]-Math.sqrt(1-a)*e[i])/Math.sqrt(a);xn[i]=Math.sqrt(ap)*x0[i]+Math.sqrt(1-ap)*e[i]}
      x=xn;j++;st.x=x;st.j=j;st.t=t;st.x0=x0;st.att=keep;st.macs+=MACS-m0;return st};
    return st}
  // to image: pixel model output, or the decoder applied to z / scale
  function toImage(name,z){const W=weights(name);if(W.cfg.f===1)return z;const s=W.cfg.scale,zz=new Float32Array(z.length);for(let i=0;i<z.length;i++)zz[i]=z[i]/s;return aeDecode(W.cfg.ae,zz)}
  return {weights,aeEncode,aeDecode,unet,chain,toImage,ab,ddimSteps,randn,tau,get macs(){return MACS},resetMacs(){MACS=0},WD}})();
// ---- Toy data and the deterministic checker (toy.render / toy.check) ----
const TOY=(function(){const RGB=[[0.85,0.20,0.20],[0.20,0.62,0.30],[0.22,0.36,0.85],[0.95,0.78,0.15]],COL=['red','green','blue','yellow'],SH=['circle','square','triangle'],
  POS=['top left','top','top right','left','centre','right','bottom left','bottom','bottom right'],CEN=[8,16,24];
  // render one image (3 x 32 x 32, values in [-1, 1]) with 4 x 4 supersampling and seeded grain
  function render(p){const ss=4,o=new Float32Array(3*1024),g=mulberry32(p.seed||7);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){let cov=0;for(let sy=0;sy<ss;sy++)for(let sx=0;sx<ss;sx++){const X=x+(sx+.5)/ss-p.cx,Y=y+(sy+.5)/ss-p.cy,s=p.size;let m;
        if(p.shape===0)m=X*X+Y*Y<=s*s;else if(p.shape===1)m=Math.abs(X)<=s*.9&&Math.abs(Y)<=s*.9;else m=Y<=s&&Y>=-s&&Math.abs(X)<=(Y+s)/2;cov+=m?1:0}
      cov/=ss*ss;const u=Math.max(1e-12,g()),v=g(),gr=0.02*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
      for(let c=0;c<3;c++){const val=Math.min(1,Math.max(0,p.bg[c]*(1-cov)+p.col[c]*cov+gr));o[c*1024+y*32+x]=val*2-1}}
    return o}
  // check one image (3 x 32 x 32 in [-1, 1]): one clean blob of plausible size, then fill ratio (shape), mean colour, box centre
  function check(img){const px=i=>[(img[i]+1)/2,(img[1024+i]+1)/2,(img[2048+i]+1)/2],B=[];for(let i=0;i<32;i++){B.push(px(i),px(31*32+i),px(i*32),px(i*32+31))}
    const bg=[0,1,2].map(c=>{const v=B.map(b=>b[c]).sort((a,b)=>a-b);return (v[63]+v[64])/2});const m=new Uint8Array(1024);let A=0;
    for(let i=0;i<1024;i++){const p=px(i),d=Math.hypot(p[0]-bg[0],p[1]-bg[1],p[2]-bg[2]);if(d>0.3){m[i]=1;A++}}
    const r={valid:false,colour:-1,shape:-1,pos:-1,A,mask:m};if(A<25||A>320)return r;
    const seen=new Uint8Array(1024);let best=[];for(let i=0;i<1024;i++)if(m[i]&&!seen[i]){const st=[i],comp=[];seen[i]=1;while(st.length){const k=st.pop();comp.push(k);const y=k>>5,x=k&31;
      for(const [u,v] of [[y+1,x],[y-1,x],[y,x+1],[y,x-1]])if(u>=0&&u<32&&v>=0&&v<32){const q=u*32+v;if(m[q]&&!seen[q]){seen[q]=1;st.push(q)}}}if(comp.length>best.length)best=comp}
    if(best.length<0.9*A)return r;let x0=99,x1=-1,y0=99,y1=-1;const mean=[0,0,0];best.forEach(k=>{const y=k>>5,x=k&31;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);const p=px(k);for(let c=0;c<3;c++)mean[c]+=p[c]/best.length});
    const fill=A/((x1-x0+1)*(y1-y0+1));r.fill=fill;r.shape=fill>0.88?1:fill>0.665?0:fill>0.38?2:-1;
    let bc=0,bd=1e9;RGB.forEach((c,i)=>{const d=(c[0]-mean[0])**2+(c[1]-mean[1])**2+(c[2]-mean[2])**2;if(d<bd){bd=d;bc=i}});r.colour=bc;
    const cx=(x0+x1+1)/2,cy=(y0+y1+1)/2;r.pos=(cy<12?0:cy<20?1:2)*3+(cx<12?0:cx<20?1:2);r.valid=r.shape>=0;r.box=[x0,y0,x1,y1];return r}
  const tokens=(c,s,p)=>[c,4+s,7+p];
  return {RGB,COL,SH,POS,CEN,render,check,tokens}})();
