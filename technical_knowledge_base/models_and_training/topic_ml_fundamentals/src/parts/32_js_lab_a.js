// ---- Training lab, part a: the engine. A small MLP with forward and backward written by hand, trained on a 2-D toy task.
// Pure functions and classes only, no DOM: the same file runs in Node for the checks in src/lab/ (gradients and training steps against PyTorch).
(function(root){
'use strict';
// ---------- seeded randomness (mulberry32), one stream per purpose so two runs with the same seed see the same data, init and batches ----------
function rng(seed){let a=seed>>>0;const f=function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
  let sp=null;f.normal=function(){if(sp!==null){const v=sp;sp=null;return v}let u=0;while(u<1e-300)u=f();const v=f(),r=Math.sqrt(-2*Math.log(u));sp=r*Math.sin(2*Math.PI*v);return r*Math.cos(2*Math.PI*v)};return f}
const stream=(seed,k)=>rng((seed*7919+k*104729+13)>>>0);

// ---------- data: 2-D points, two classes, inputs roughly in [-1, 1] ----------
const TASKS={
  spiral:{name:'Two spirals',gen(r,n){const X=[],Y=[];for(let i=0;i<n;i++){const c=i%2,u=r(),t=Math.sqrt(u)*2.6*Math.PI+0.35,rad=t/(2.6*Math.PI+0.35),th=t+c*Math.PI;
    X.push(rad*Math.cos(th)+0.035*r.normal(),rad*Math.sin(th)+0.035*r.normal());Y.push(c)}return{X,Y}}},
  circles:{name:'Ring around a disc',gen(r,n){const X=[],Y=[];for(let i=0;i<n;i++){const c=i%2,th=r()*2*Math.PI,rad=c?0.62+0.33*r():0.48*Math.sqrt(r());
    X.push(rad*Math.cos(th)+0.05*r.normal(),rad*Math.sin(th)+0.05*r.normal());Y.push(c)}return{X,Y}}},
  xor:{name:'Checkerboard (XOR)',gen(r,n){const X=[],Y=[];for(let i=0;i<n;i++){const x=2*r()-1,y=2*r()-1;X.push(x,y);Y.push(x*y>0?1:0)}return{X,Y}}},
  moons:{name:'Two moons',gen(r,n){const X=[],Y=[];for(let i=0;i<n;i++){const c=i%2,th=r()*Math.PI;let x,y;if(c===0){x=Math.cos(th);y=Math.sin(th)}else{x=1-Math.cos(th);y=0.5-Math.sin(th)}
    X.push((x-0.5)*0.75+0.06*r.normal(),(y-0.25)*0.75+0.06*r.normal());Y.push(c)}return{X,Y}}}
};
// train set: nTrain points with a share `noise` of labels flipped; validation: 400 clean points from the same task
function makeData(task,nTrain,noise,seed){const T=TASKS[task]||TASKS.spiral;
  const tr=T.gen(stream(seed,1),nTrain),va=T.gen(stream(seed,2),400),rf=stream(seed,3);
  const yClean=tr.Y.slice(),flip=[];for(let i=0;i<nTrain;i++){if(rf()<noise){tr.Y[i]=1-tr.Y[i];flip.push(i)}}
  return{Xtr:Float64Array.from(tr.X),Ytr:Int32Array.from(tr.Y),Xva:Float64Array.from(va.X),Yva:Int32Array.from(va.Y),flip,yClean,K:2}}

// ---------- activations: [f(x), f'(x)] ----------
const SQ2PI=Math.sqrt(2/Math.PI);
// actv(type, X, Y, D): Y = f(X), D = f'(X), elementwise, no allocation per element
function actv(type,X,Y,D){const n=X.length;
  if(type==='relu'){for(let k=0;k<n;k++){const x=X[k];if(x>0){Y[k]=x;D[k]=1}else{Y[k]=0;D[k]=0}}}
  else if(type==='sigmoid'){for(let k=0;k<n;k++){const s=1/(1+Math.exp(-X[k]));Y[k]=s;D[k]=s*(1-s)}}
  else if(type==='tanh'){for(let k=0;k<n;k++){const t=Math.tanh(X[k]);Y[k]=t;D[k]=1-t*t}}
  // GELU with the tanh approximation (PyTorch approximate='tanh')
  else if(type==='gelu'){for(let k=0;k<n;k++){const x=X[k],t=Math.tanh(SQ2PI*(x+0.044715*x*x*x));Y[k]=0.5*x*(1+t);D[k]=0.5*(1+t)+0.5*x*(1-t*t)*SQ2PI*(1+3*0.044715*x*x)}}
  else{for(let k=0;k<n;k++){const x=X[k],s=1/(1+Math.exp(-x));Y[k]=x*s;D[k]=s*(1+x*(1-s))}}}
const ACT={sigmoid:1,tanh:1,relu:1,gelu:1,silu:1};

// ---------- modules: forward(X,B,train) returns Y; backward(dY) returns dX and accumulates parameter gradients ----------
function P(name,n,kind,shape,layer){return{name,w:new Float64Array(n),g:new Float64Array(n),kind,shape,layer}}
class Linear{constructor(i,o,layer,nm){this.i=i;this.o=o;this.W=P(nm+'.W',i*o,'W',[o,i],layer);this.b=P(nm+'.b',o,'b',[o],layer);this.params=[this.W,this.b]}
  forward(X,B){this.X=X;this.B=B;const{i,o}=this,W=this.W.w,b=this.b.w,Y=new Float64Array(B*o);
    for(let n=0;n<B;n++){const xo=n*i,yo=n*o;for(let k=0;k<o;k++){let s=b[k];const wo=k*i;for(let j=0;j<i;j++)s+=X[xo+j]*W[wo+j];Y[yo+k]=s}}return Y}
  backward(dY){const{i,o,B,X}=this,W=this.W.w,gW=this.W.g,gb=this.b.g,dX=new Float64Array(B*i);
    for(let n=0;n<B;n++){const xo=n*i,yo=n*o;for(let k=0;k<o;k++){const d=dY[yo+k];if(d===0)continue;gb[k]+=d;const wo=k*i;for(let j=0;j<i;j++){gW[wo+j]+=d*X[xo+j];dX[xo+j]+=d*W[wo+j]}}}return dX}}
class Act{constructor(type){this.type=type;this.params=[]}
  forward(X){const Y=new Float64Array(X.length),D=new Float64Array(X.length);actv(this.type,X,Y,D);this.D=D;return Y}
  backward(dY){const dX=new Float64Array(dY.length),D=this.D;for(let k=0;k<dY.length;k++)dX[k]=dY[k]*D[k];return dX}}
// a layer's core: Linear then activation, or SwiGLU = SiLU(x Wg) times (x Wu), two projections of the same width
class Core{constructor(i,o,act,layer){this.swiglu=act==='swiglu';this.lin=new Linear(i,o,layer,'L'+layer+(this.swiglu?'.gate':''));
    if(this.swiglu){this.up=new Linear(i,o,layer,'L'+layer+'.up');this.params=[...this.lin.params,...this.up.params]}else{this.act=new Act(act);this.params=this.lin.params}}
  forward(X,B){const a=this.lin.forward(X,B);if(!this.swiglu)return this.act.forward(a);
    const u=this.up.forward(X,B),Y=new Float64Array(a.length),S=new Float64Array(a.length),Ds=new Float64Array(a.length);
    actv('silu',a,S,Ds);for(let k=0;k<a.length;k++)Y[k]=S[k]*u[k];this.S=S;this.Ds=Ds;this.u=u;return Y}
  backward(dY){if(!this.swiglu)return this.lin.backward(this.act.backward(dY));
    const da=new Float64Array(dY.length),du=new Float64Array(dY.length);for(let k=0;k<dY.length;k++){da[k]=dY[k]*this.u[k]*this.Ds[k];du[k]=dY[k]*this.S[k]}
    const d1=this.lin.backward(da),d2=this.up.backward(du);for(let k=0;k<d1.length;k++)d1[k]+=d2[k];return d1}}
// inverted dropout; masks can be recorded (for the PyTorch check) or replayed
class Dropout{constructor(p,r){this.p=p;this.r=r;this.params=[];this.log=null;this.replay=null}
  forward(X,B,train){if(!train||this.p<=0){this.M=null;return X}const Y=new Float64Array(X.length),M=new Float64Array(X.length),s=1/(1-this.p);
    const rep=this.replay&&this.replay.shift();for(let k=0;k<X.length;k++){const keep=rep?rep[k]:(this.r()>=this.p?1:0);M[k]=keep*s;Y[k]=X[k]*M[k]}
    if(this.log)this.log.push(Array.from(M,v=>v>0?1:0));this.M=M;return Y}
  backward(dY){if(!this.M)return dY;const dX=new Float64Array(dY.length);for(let k=0;k<dY.length;k++)dX[k]=dY[k]*this.M[k];return dX}}
// BatchNorm (statistics over the batch), LayerNorm and RMSNorm (over the features of one example); eps as PyTorch's defaults (RMSNorm eps set to 1e-6)
class Norm{constructor(type,d,layer,nm){this.type=type;this.d=d;this.g=P(nm+'.gain',d,'gain',[d],layer);this.g.w.fill(1);this.params=[this.g];
    if(type!=='rms'){this.b=P(nm+'.bias',d,'nb',[d],layer);this.params.push(this.b)}
    this.eps=type==='rms'?1e-6:1e-5;if(type==='bn'){this.rm=new Float64Array(d);this.rv=new Float64Array(d).fill(1)}}
  forward(X,B,train){const d=this.d,g=this.g.w,Y=new Float64Array(X.length),H=new Float64Array(X.length);this.B=B;this.X=X;
    if(this.type==='bn'){const inv=new Float64Array(d),bb=this.b.w;
      for(let j=0;j<d;j++){let mu,va;if(train){let s=0;for(let n=0;n<B;n++)s+=X[n*d+j];mu=s/B;let v=0;for(let n=0;n<B;n++){const e=X[n*d+j]-mu;v+=e*e}va=v/B;
          this.rm[j]=0.9*this.rm[j]+0.1*mu;this.rv[j]=0.9*this.rv[j]+0.1*(B>1?v/(B-1):va)}else{mu=this.rm[j];va=this.rv[j]}
        inv[j]=1/Math.sqrt(va+this.eps);for(let n=0;n<B;n++){const h=(X[n*d+j]-mu)*inv[j];H[n*d+j]=h;Y[n*d+j]=g[j]*h+bb[j]}}this.inv=inv}
    else{const inv=new Float64Array(B);for(let n=0;n<B;n++){const o=n*d;let mu=0;if(this.type==='ln'){for(let j=0;j<d;j++)mu+=X[o+j];mu/=d}
        let v=0;for(let j=0;j<d;j++){const e=X[o+j]-mu;v+=e*e}v/=d;inv[n]=1/Math.sqrt(v+this.eps);
        for(let j=0;j<d;j++){const h=(X[o+j]-mu)*inv[n];H[o+j]=h;Y[o+j]=g[j]*h+(this.b?this.b.w[j]:0)}}this.inv=inv}
    this.H=H;this.train=train;return Y}
  backward(dY){const d=this.d,B=this.B,g=this.g.w,H=this.H,dX=new Float64Array(dY.length),gg=this.g.g,gb=this.b?this.b.g:null;
    for(let n=0;n<B;n++)for(let j=0;j<d;j++){const k=n*d+j;gg[j]+=dY[k]*H[k];if(gb)gb[j]+=dY[k]}
    if(this.type==='bn'){for(let j=0;j<d;j++){let s1=0,s2=0;for(let n=0;n<B;n++){const dh=dY[n*d+j]*g[j];s1+=dh;s2+=dh*H[n*d+j]}
        for(let n=0;n<B;n++){const k=n*d+j,dh=dY[k]*g[j];dX[k]=this.inv[j]*(dh-s1/B-H[k]*s2/B)}}}
    else{const ln=this.type==='ln';for(let n=0;n<B;n++){const o=n*d;let s1=0,s2=0;for(let j=0;j<d;j++){const dh=dY[o+j]*g[j];s1+=dh;s2+=dh*H[o+j]}
        for(let j=0;j<d;j++){const dh=dY[o+j]*g[j];dX[o+j]=this.inv[n]*(dh-(ln?s1/d:0)-H[o+j]*s2/d)}}}
    return dX}}
// one hidden layer: core and dropout, with optional normalisation (pre: on the layer's input; post: on its output) and optional residual
class Block{constructor(i,o,cfg,layer,rD){this.layer=layer;this.first=layer===1;this.core=new Core(i,o,cfg.act,layer);this.drop=new Dropout(cfg.drop,rD);
    this.resid=!this.first&&cfg.resid&&i===o;this.place=cfg.place;this.norm=(!this.first&&cfg.norm!=='none')?new Norm(cfg.norm,cfg.place==='pre'?i:o,layer,'L'+layer+'.norm'):null;
    this.params=[...this.core.params,...(this.norm?this.norm.params:[])]}
  F(X,B,train){return this.drop.forward(this.core.forward(X,B,train),B,train)}
  Fb(d){return this.core.backward(this.drop.backward(d))}
  forward(X,B,train){let out;if(this.norm&&this.place==='pre'){const f=this.F(this.norm.forward(X,B,train),B,train);out=this.resid?add(X,f):f}
    else if(this.norm){const f=this.F(X,B,train);out=this.norm.forward(this.resid?add(X,f):f,B,train)}
    else{const f=this.F(X,B,train);out=this.resid?add(X,f):f}this.out=out;return out}
  backward(dO){if(this.norm&&this.place==='pre'){const dX=this.norm.backward(this.Fb(dO));if(this.resid)for(let k=0;k<dX.length;k++)dX[k]+=dO[k];return dX}
    if(this.norm){const ds=this.norm.backward(dO),dX=this.Fb(ds);if(this.resid)for(let k=0;k<dX.length;k++)dX[k]+=ds[k];return dX}
    const dX=this.Fb(dO);if(this.resid)for(let k=0;k<dX.length;k++)dX[k]+=dO[k];return dX}}
function add(a,b){const c=new Float64Array(a.length);for(let k=0;k<a.length;k++)c[k]=a[k]+b[k];return c}

// ---------- losses on the logits; return [mean loss, dLoss/dlogits] ----------
function softmax2(z,B,K){const p=new Float64Array(B*K);for(let n=0;n<B;n++){let m=-Infinity;for(let k=0;k<K;k++)m=Math.max(m,z[n*K+k]);let s=0;for(let k=0;k<K;k++){const e=Math.exp(z[n*K+k]-m);p[n*K+k]=e;s+=e}for(let k=0;k<K;k++)p[n*K+k]/=s}return p}
function logsm(z,n,K,k){let m=-Infinity;for(let j=0;j<K;j++)m=Math.max(m,z[n*K+j]);let s=0;for(let j=0;j<K;j++)s+=Math.exp(z[n*K+j]-m);return z[n*K+k]-m-Math.log(s)}
const LS_EPS=0.1,FOCAL_G=2;
function lossGrad(type,z,y,B,K){const p=softmax2(z,B,K),d=new Float64Array(B*K);let L=0;
  for(let n=0;n<B;n++){const o=n*K,t=y[n];
    if(type==='ce'||type==='ls'){const e=type==='ls'?LS_EPS:0;for(let k=0;k<K;k++){const q=(k===t?1-e:0)+e/K;L-=q*logsm(z,n,K,k);d[o+k]=(p[o+k]-q)/B}}
    else if(type==='focal'){const pt=p[o+t],lp=logsm(z,n,K,t),om=1-pt;L-=Math.pow(om,FOCAL_G)*lp;
      const dpt=FOCAL_G*Math.pow(om,FOCAL_G-1)*lp-Math.pow(om,FOCAL_G)/pt;for(let k=0;k<K;k++)d[o+k]=dpt*pt*((k===t?1:0)-p[o+k])/B}
    else{let gs=0;const g=new Float64Array(K);for(let k=0;k<K;k++){const e=p[o+k]-(k===t?1:0);L+=e*e;g[k]=2*e/(B*K);gs+=g[k]*p[o+k]}for(let k=0;k<K;k++)d[o+k]=p[o+k]*(g[k]-gs)}}
  return[type==='mse'?L/(B*K):L/B,d]}

// ---------- the network ----------
const INITS={zeros:()=>0,small:()=>0.01,xavier:(i,o)=>Math.sqrt(2/(i+o)),he:i=>Math.sqrt(2/i)};
class Net{constructor(cfg,seed){this.cfg=cfg;const rI=stream(seed,4),rD=stream(seed,6),w=cfg.width;this.blocks=[];
    for(let l=1;l<=cfg.depth;l++)this.blocks.push(new Block(l===1?2:w,w,cfg,l,rD));
    this.fnorm=(cfg.norm!=='none'&&cfg.place==='pre'&&cfg.depth>1)?new Norm(cfg.norm,w,cfg.depth+1,'final.norm'):null;
    this.head=new Linear(w,2,cfg.depth+1,'head');
    this.params=[...this.blocks.flatMap(b=>b.params),...(this.fnorm?this.fnorm.params:[]),...this.head.params];
    for(const p of this.params)if(p.kind==='W'){const[o,i]=p.shape,sd=INITS[cfg.init](i,o);for(let k=0;k<p.w.length;k++)p.w[k]=sd*rI.normal()}}
  forward(X,B,train){let h=X;for(const b of this.blocks)h=b.forward(h,B,train);this.hL=h;if(this.fnorm)h=this.fnorm.forward(h,B,train);return this.head.forward(h,B)}
  backward(dz){let d=this.head.backward(dz);if(this.fnorm)d=this.fnorm.backward(d);for(let l=this.blocks.length-1;l>=0;l--)d=this.blocks[l].backward(d)}
  zero(){for(const p of this.params)p.g.fill(0)}}

// ---------- optimisers (PyTorch's update rules) and weight decay; decay applies to weight matrices only ----------
// SGD; SGD + momentum 0.9 (PyTorch form: buf = 0.9 buf + g); Adam and AdamW (0.9, 0.999, eps 1e-8);
// Muon on the hidden square matrices (torch.optim.Muon: momentum 0.95, Nesterov, 5 Newton-Schulz steps, lr adjusted by match_rms_adamw), AdamW on the rest.
const NS=[3.4445,-4.775,2.0315];
function newtonSchulz(G,r,c){let tr=r>c,R=tr?c:r,C=tr?r:c;let X=new Float64Array(R*C);
  for(let i=0;i<r;i++)for(let j=0;j<c;j++){if(tr)X[j*C+i]=G[i*c+j];else X[i*C+j]=G[i*c+j]}
  let nrm=0;for(let k=0;k<X.length;k++)nrm+=X[k]*X[k];nrm=Math.max(Math.sqrt(nrm),1e-7);for(let k=0;k<X.length;k++)X[k]/=nrm;
  const[a,b,cc]=NS;for(let it=0;it<5;it++){const A=new Float64Array(R*R);for(let i=0;i<R;i++)for(let j=0;j<R;j++){let s=0;for(let k=0;k<C;k++)s+=X[i*C+k]*X[j*C+k];A[i*R+j]=s}
    const Bm=new Float64Array(R*R);for(let i=0;i<R;i++)for(let j=0;j<R;j++){let s=0;for(let k=0;k<R;k++)s+=A[i*R+k]*A[k*R+j];Bm[i*R+j]=b*A[i*R+j]+cc*s}
    const Y=new Float64Array(R*C);for(let i=0;i<R;i++)for(let j=0;j<C;j++){let s=0;for(let k=0;k<R;k++)s+=Bm[i*R+k]*X[k*C+j];Y[i*C+j]=a*X[i*C+j]+s}X=Y}
  const O=new Float64Array(r*c);for(let i=0;i<r;i++)for(let j=0;j<c;j++)O[i*c+j]=tr?X[j*C+i]:X[i*C+j];return O}
const decoupledOf=o=>o==='adamw'||o==='muon';
class Opt{constructor(params,cfg){this.ps=params;this.cfg=cfg;this.t=0;this.st=params.map(p=>({m:new Float64Array(p.w.length),v:new Float64Array(p.w.length),has:false}));
    // decay mode: Adam is L2 (PyTorch Adam weight_decay), AdamW and Muon are decoupled; SGD and momentum take the reader's choice
    this.mode=cfg.opt==='adam'?'l2':decoupledOf(cfg.opt)?'wd':cfg.wdMode;
    this.muon=params.map(p=>cfg.opt==='muon'&&p.kind==='W'&&p.shape[0]===p.shape[1]&&p.layer>1&&p.layer<=cfg.depth)}
  step(lr){this.t++;const{cfg}=this,lam=cfg.wd,t=this.t;
    this.ps.forEach((p,i)=>{const s=this.st[i],w=p.w,n=w.length,dec=p.kind==='W'&&lam>0,g=new Float64Array(p.g);
      if(dec&&this.mode==='l2')for(let k=0;k<n;k++)g[k]+=lam*w[k];
      if(dec&&this.mode==='wd')for(let k=0;k<n;k++)w[k]*=1-lr*lam;
      const o=cfg.opt;
      if(o==='sgd'){for(let k=0;k<n;k++)w[k]-=lr*g[k]}
      else if(o==='momentum'){const m=s.m;for(let k=0;k<n;k++){m[k]=s.has?0.9*m[k]+g[k]:g[k];w[k]-=lr*m[k]}s.has=true}
      else if(this.muon[i]){const m=s.m,u=new Float64Array(n);for(let k=0;k<n;k++){m[k]+=(g[k]-m[k])*0.05;u[k]=g[k]+(m[k]-g[k])*0.95}
        const O=newtonSchulz(u,p.shape[0],p.shape[1]),al=lr*0.2*Math.sqrt(Math.max(p.shape[0],p.shape[1]));for(let k=0;k<n;k++)w[k]-=al*O[k]}
      else{const m=s.m,v=s.v,b1=0.9,b2=0.999,bc1=1-Math.pow(b1,t),bc2=1-Math.pow(b2,t),ss=lr/bc1,sb=Math.sqrt(bc2);
        for(let k=0;k<n;k++){m[k]+=(g[k]-m[k])*(1-b1);v[k]=b2*v[k]+(1-b2)*g[k]*g[k];w[k]-=ss*m[k]/(Math.sqrt(v[k])/sb+1e-8)}}})}}

// ---------- learning-rate schedule: multiplier at step t (0-based) of T, warmup fraction wf ----------
function lrMult(sched,t,T,wf){const W=Math.round(wf*T);if(t<W)return(t+1)/W;
  if(sched==='step')return t>=0.75*T?0.01:t>=0.5*T?0.1:1;
  if(sched==='cosine')return 0.5*(1+Math.cos(Math.PI*(t-W)/Math.max(1,T-W)));
  if(sched==='wsd'){const D=Math.round(0.2*T);return t<T-D?1:Math.max(0,(T-t)/D)}
  return 1}

// ---------- one run: a network, its optimiser, the data, a history ----------
const GRID=40;
class Run{constructor(cfg,data,sh){this.cfg=cfg;this.data=data;this.sh=sh;this.T=sh.steps;this.net=new Net(cfg,sh.seed);this.opt=new Opt(this.net.params,cfg);
    this.rB=stream(sh.seed,5);this.perm=[];this.t=0;this.done=false;this.div=0;this.stopped=0;this.best={v:Infinity,t:0};this.bad=0;
    this.every=Math.max(1,Math.round(this.T/100));this.gEvery=Math.max(1,Math.round(this.T/50));
    this.H={t:[],trL:[],vaL:[],trA:[],vaA:[],act:[],grad:[],wn:[],lr:[]};this.G={t:[],img:[]};this.lastGrad=null;this.lastAct=null;
    this.nL=cfg.depth+1;if(sh.trace){this.trace={idx:[],loss:[],lr:[]};this.net.blocks.forEach(b=>b.drop.log=[])}this.record();if(!sh.light)this.snap()}
  batch(){const n=this.data.Ytr.length,bs=Math.min(this.cfg.bs||n,n),idx=[];
    for(let k=0;k<bs;k++){if(!this.perm.length){const p=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(this.rB()*(i+1));[p[i],p[j]]=[p[j],p[i]]}this.perm=p}idx.push(this.perm.pop())}return idx}
  step(){if(this.done)return;const{cfg,data,net}=this,idx=this.batch(),B=idx.length,X=new Float64Array(B*2),y=new Int32Array(B);
    idx.forEach((k,n)=>{X[2*n]=data.Xtr[2*k];X[2*n+1]=data.Xtr[2*k+1];y[n]=data.Ytr[k]});
    net.zero();const z=net.forward(X,B,true),[L,dz]=lossGrad(cfg.loss,z,y,B,2);
    if(!isFinite(L)||L>1e6){this.diverge();return}
    if(this.trace){this.trace.idx.push(idx);this.trace.loss.push(L)}
    net.backward(dz);this.lastGrad=this.layerNorms('g');this.lastAct=net.blocks.map(b=>rms(b.out));
    const lr=cfg.lr*lrMult(cfg.sched,this.t,this.T,cfg.warm);this.lr=lr;if(this.trace)this.trace.lr.push(lr);this.opt.step(lr);this.t++;
    if(this.t%this.every===0||this.t===this.T)this.record();if(this.done)return;
    if(!this.sh.light&&(this.t%this.gEvery===0||this.t===this.T))this.snap();
    if(this.t>=this.T)this.done=true}
  diverge(){this.div=this.t||1;this.done=true;this.H.t.push(this.t);['trL','vaL'].forEach(k=>this.H[k].push(NaN));['trA','vaA'].forEach(k=>this.H[k].push(0.5));
    this.H.act.push(this.H.act[this.H.act.length-1]||[]);this.H.grad.push(this.H.grad[this.H.grad.length-1]||[]);this.H.wn.push(this.H.wn[this.H.wn.length-1]||[]);this.H.lr.push(this.lr||0)}
  layerNorms(f){const s=new Float64Array(this.nL);for(const p of this.net.params){if(p.kind!=='W')continue;let a=0;for(const v of p[f])a+=v*v;s[p.layer-1]+=a}return Array.from(s,Math.sqrt)}
  evalSet(X,Y){const n=Y.length,z=this.net.forward(X,n,false);let L=0,c=0;for(let i=0;i<n;i++){L-=logsm(z,i,2,Y[i]);if((z[2*i+1]>z[2*i]?1:0)===Y[i])c++}return[L/n,c/n]}
  record(){const d=this.data,[a,b]=this.evalSet(d.Xtr,d.Ytr),[c,e]=this.evalSet(d.Xva,d.Yva);
    if(!isFinite(a)||!isFinite(c)||!this.net.params.every(p=>isFinite(p.w[0]))){this.diverge();return}
    const H=this.H;H.t.push(this.t);H.trL.push(a);H.trA.push(b);H.vaL.push(c);H.vaA.push(e);H.lr.push(this.lr||0);
    if(!this.lastAct){const n=d.Ytr.length;this.net.forward(d.Xtr,n,false);this.lastAct=this.net.blocks.map(b=>rms(b.out));this.lastGrad=new Array(this.nL).fill(0)}
    H.act.push(this.lastAct);H.grad.push(this.lastGrad);H.wn.push(this.layerNorms('w'));
    // early stopping: patience of 15% of the run, measured on validation loss
    if(c<this.best.v-1e-4){this.best={v:c,t:this.t};this.bad=0}else if(this.cfg.early&&this.t-this.best.t>=Math.round(0.15*this.T)){this.stopped=this.t;this.done=true}}
  snap(){const n=GRID*GRID,X=new Float64Array(2*n);for(let i=0;i<GRID;i++)for(let j=0;j<GRID;j++){const k=i*GRID+j;X[2*k]=-1.2+2.4*(j+0.5)/GRID;X[2*k+1]=1.2-2.4*(i+0.5)/GRID}
    const z=this.net.forward(X,n,false),img=new Float32Array(n);for(let k=0;k<n;k++){const d=z[2*k+1]-z[2*k];img[k]=isFinite(d)?1/(1+Math.exp(-d)):0.5}this.G.t.push(this.t);this.G.img.push(img)}}
// end-of-run figures used by the presets' claims (last finite record)
function summ(r){const H=r.H;let k=H.t.length-1;while(k>0&&!isFinite(H.vaL[k]))k--;const g=H.grad[k]||[],L=g.length;
  return{t:r.t,div:r.div,stopped:r.stopped,trL:H.trL[k],vaL:H.vaL[k],trA:H.trA[k],vaA:H.vaA[k],best:r.best.v,bestT:r.best.t,
    wn:Math.sqrt((H.wn[k]||[]).reduce((s,v)=>s+v*v,0)),gratio:L>1&&g[L-2]>0?g[0]/g[L-2]:NaN,gap:H.vaL[k]-H.trL[k],act0:H.act[0]}}
function rms(a){let s=0;for(const v of a)s+=v*v;return Math.sqrt(s/a.length)}

root.LB={summ,rng,stream,TASKS,makeData,ACT,actv,Linear,Act,Core,Dropout,Norm,Block,Net,Opt,lossGrad,softmax2,newtonSchulz,lrMult,Run,GRID,decoupledOf,LS_EPS,FOCAL_G};
})(typeof window!=='undefined'?window:globalThis);
