// ---- The exact-score toy: a 1-D mixture of three Gaussians whose denoiser is known in closed form ----
// Port of src/runs/gmm_toy.py (checked by src/runs/check_toy.mjs against out/gmm_ref.json to 1e-9).
window.DZT=(function(){
  const W=[0.5,0.3,0.2],MU=[-1.5,0.6,2.0],SD=[0.12,0.3,0.12],T=1000;
  const ab=DZC.sched('linear');
  const trailing=n=>{const o=[];for(let k=0;k<n;k++)o.push(Math.round(T-k*T/n)-1);return o};
  // E[x0 | x_t]; tau > 1 softens the posterior over modes (a model that hedges between modes it cannot tell apart)
  function x0hat(x,a2,tau){
    const a=Math.sqrt(a2);let mx=-Infinity;const lg=[0,0,0],m=[0,0,0];
    for(let k=0;k<3;k++){const v=a2*SD[k]*SD[k]+(1-a2),d=x-a*MU[k];
      lg[k]=(Math.log(W[k])-0.5*Math.log(v)-0.5*d*d/v)/tau;m[k]=MU[k]+a*SD[k]*SD[k]/v*d;if(lg[k]>mx)mx=lg[k]}
    let z=0,s=0;for(let k=0;k<3;k++){const r=Math.exp(lg[k]-mx);z+=r;s+=r*m[k]}return s/z;
  }
  // one sampler run; keep: number of particles whose path is recorded
  function sample(o){
    const n=o.steps,eta=o.eta,tau=o.tau,N=o.N,R=DZC.rng(o.seed||1),ts=trailing(n),keep=o.keep||0;
    const x=new Float64Array(N);for(let i=0;i<N;i++)x[i]=R.g();
    const paths=[];for(let j=0;j<keep;j++)paths.push([x[j]]);
    for(let i=0;i<n;i++){const t=ts[i],a=ab[t],ap=i+1<n?ab[ts[i+1]]:1;
      const sig=i+1<n&&eta>0?eta*Math.sqrt((1-ap)/(1-a)*(1-a/ap)):0,c=Math.sqrt(Math.max(1-ap-sig*sig,0));
      for(let j=0;j<N;j++){const x0=x0hat(x[j],a,tau),e=(x[j]-Math.sqrt(a)*x0)/Math.sqrt(1-a);
        x[j]=Math.sqrt(ap)*x0+c*e+(sig>0?sig*R.g():0)}
      for(let j=0;j<keep;j++)paths[j].push(x[j]);
    }
    return {x,paths,ts};
  }
  const pdf=x=>{let s=0;for(let k=0;k<3;k++)s+=W[k]/(SD[k]*Math.sqrt(2*Math.PI))*Math.exp(-0.5*((x-MU[k])/SD[k])**2);return s};
  // noisy density p_t(x) (the picture behind the paths)
  const pdft=(x,a2)=>{let s=0;const a=Math.sqrt(a2);for(let k=0;k<3;k++){const v=a2*SD[k]*SD[k]+1-a2;s+=W[k]/Math.sqrt(2*Math.PI*v)*Math.exp(-0.5*(x-a*MU[k])**2/v)}return s};
  const LO=-3,HI=3.5,BINS=130;
  function hist(x){const h=new Float64Array(BINS),dx=(HI-LO)/BINS;let n=0;for(const v of x){const b=Math.floor((v-LO)/dx);if(b>=0&&b<BINS)h[b]++;n++}for(let i=0;i<BINS;i++)h[i]/=n*dx;return h}
  function scores(x){
    const h=hist(x),dx=(HI-LO)/BINS;let tv=0;for(let i=0;i<BINS;i++)tv+=Math.abs(h[i]-pdf(LO+(i+0.5)*dx));tv*=0.5*dx;
    let between=0;const w=[0,0,0];for(const v of x){let near=false;for(let k=0;k<3;k++)if(Math.abs(v-MU[k])<3*SD[k]){near=true;w[k]++}if(!near)between++}
    return {tv,between:between/x.length,w:w.map(v=>v/x.length)};
  }
  return {W,MU,SD,ab,trailing,x0hat,sample,pdf,pdft,hist,scores,LO,HI,BINS};
})();

// ---- drawing: paths over the noisy density, plus the final histogram against the truth ----
DZT.draw=function(cv,res,upto,opt){
  opt=opt||{};const dpr=Math.min(2,window.devicePixelRatio||1);
  const Wd=Math.max(280,Math.min(860,RD.width(cv.parentElement))),Hd=Math.round(Math.min(300,Math.max(210,Wd*0.42)));
  cv.style.width=Wd+'px';cv.style.height=Hd+'px';cv.width=Wd*dpr;cv.height=Hd*dpr;
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  const cs=getComputedStyle(document.documentElement),ink=cs.getPropertyValue('--ink').trim()||'#333',mute=cs.getPropertyValue('--mute').trim()||'#888';
  const histW=Math.round(Wd*0.2),pw=Wd-histW-34,ph=Hd-26,L=30,Tp=6;
  const yOf=v=>Tp+ph-(v-DZT.LO)/(DZT.HI-DZT.LO)*ph;
  // background: p_t(x) along the trailing timesteps, columns left (t = 999) to right (t = 0)
  const cols=Math.min(160,pw),rows=Math.min(120,ph),img=c.createImageData(cols,rows);
  const dark=matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
  for(let i=0;i<cols;i++){const t=Math.round(999-i*999/(cols-1)),a2=DZT.ab[Math.max(0,t)];let mx=0;const col=[];
    for(let j=0;j<rows;j++){const x=DZT.HI-(j+0.5)/rows*(DZT.HI-DZT.LO),p=DZT.pdft(x,a2);col.push(p);if(p>mx)mx=p}
    for(let j=0;j<rows;j++){const v=Math.pow(col[j]/mx,0.6),k=4*(j*cols+i);
      if(dark){img.data[k]=25+40*v;img.data[k+1]=25+70*v;img.data[k+2]=25+110*v}else{img.data[k]=255-70*v;img.data[k+1]=255-45*v;img.data[k+2]=255-15*v}img.data[k+3]=255}}
  const off=document.createElement('canvas');off.width=cols;off.height=rows;off.getContext('2d').putImageData(img,0,0);
  c.imageSmoothingEnabled=true;c.drawImage(off,L,Tp,pw,ph);
  // paths
  const n=res.ts.length,xs=k=>L+k/n*pw;
  c.lineWidth=1;c.globalAlpha=0.55;
  res.paths.forEach((p,j)=>{c.strokeStyle=opt.color||'#c2703a';c.beginPath();for(let k=0;k<=Math.min(upto,n);k++){const X=xs(k),Y=yOf(Math.max(DZT.LO,Math.min(DZT.HI,p[k])));k?c.lineTo(X,Y):c.moveTo(X,Y)}c.stroke()});
  c.globalAlpha=1;
  // axes labels
  c.fillStyle=mute;c.font='11px system-ui,sans-serif';c.textAlign='center';
  c.fillText('pure noise (t = 999)',L+60,Hd-6);c.fillText('data (t = 0)',L+pw-34,Hd-6);
  c.textAlign='right';[-2,0,2].forEach(v=>c.fillText(String(v),L-4,yOf(v)+4));
  // histogram panel
  const hx=L+pw+4,hw=histW;let pmax=0;for(let j=0;j<=400;j++)pmax=Math.max(pmax,DZT.pdf(DZT.LO+j/400*(DZT.HI-DZT.LO)));
  let scale=pmax;const h=upto>=n&&res.x?DZT.hist(res.x):null;if(h)for(let i=0;i<DZT.BINS;i++)scale=Math.max(scale,h[i]);
  if(h){c.fillStyle=opt.color||'#c2703a';c.globalAlpha=0.7;
    for(let i=0;i<DZT.BINS;i++){const y0=DZT.LO+i*(DZT.HI-DZT.LO)/DZT.BINS,y1=y0+(DZT.HI-DZT.LO)/DZT.BINS;c.fillRect(hx,yOf(y1),h[i]/scale*hw,Math.max(1,yOf(y0)-yOf(y1)))}
    c.globalAlpha=1}
  c.strokeStyle=ink;c.lineWidth=1.5;c.beginPath();
  for(let j=0;j<=300;j++){const x=DZT.LO+j/300*(DZT.HI-DZT.LO),X=hx+DZT.pdf(x)/scale*hw,Y=yOf(x);j?c.lineTo(X,Y):c.moveTo(X,Y)}c.stroke();
  c.fillStyle=mute;c.textAlign='left';c.fillText('final',hx,Hd-6);
};
