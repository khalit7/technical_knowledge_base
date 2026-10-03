// Dump a fixed case of every gradient the toy computes (language model, reward model Eq. 1, PPO-ptx minibatch)
// so check_grad.py can recompute them with PyTorch autograd.   node dump_case.cjs   (writes model/case.json)
require('./parts/20_js_toy_core.js');
const X=globalThis.TOY,fs=require('fs');
const S=X.stage2(X.stage1(X.stage0({tau:0.3,preSteps:400,nDemo:200,sftEpochs:3,nRM:120})));
const A=a=>Array.from(a);
const out={V:X.V,H:X.H,CTX:X.CTX,NF:X.NF,NT:X.NT};
// 1. language model: d/dtheta of the mean log-likelihood of 20 pretraining windows
const W=S.ptxW.slice(0,20),g1=X.zerosLike(S.sft);const ll=X.lmGradBatch(S.sft,g1,W,1);
out.params={E:A(S.sft.E),b1:A(S.sft.b1),U:A(S.sft.U),b2:A(S.sft.b2)};
out.lm={W:W.map(w=>({c:w.c,y:w.y})),ll,g:{E:A(g1.E),b1:A(g1.b1),U:A(g1.U),b2:A(g1.b2)}};
// 2. reward model: loss and gradient of Eq. 1 on 4 prompts (one batch element each), at the trained weights
const els=S.rmD.slice(0,4),gw=new Float64Array(X.NF);let L=0;els.forEach(e=>L+=X.rmLossGrad(S.rm,e,gw));
out.rm={w:A(S.rm.w),b:S.rm.b,els:els.map(e=>({t:e.t,ys:e.ys,pairs:e.pairs,f:e.ys.map(y=>A(X.feats(e.t,y)))})),loss:L,g:A(gw)};
// 3. PPO-ptx minibatch: episodes sampled from the SFT policy, gradient taken at a perturbed policy so ratios move off 1
const r=X.rng(5),eps=[];for(let b=0;b<12;b++){const t=r.int(X.NT),s=X.sample(S.sft,t,r);const A_=new Float64Array(s.y.length);for(let i=0;i<A_.length;i++)A_[i]=r.gauss();eps.push({t,s,A:A_})}
const pol=X.cloneP(S.sft);for(const k of ['E','U']){for(let i=0;i<pol[k].length;i++)pol[k][i]+=0.15*r.gauss()}
const P=S.ptxW.slice(100,140),gam=0.1,R=X.ppoGrad(pol,eps,P,gam);
out.ppo={params:{E:A(pol.E),b1:A(pol.b1),U:A(pol.U),b2:A(pol.b2)},eps:eps.map(e=>({seq:e.s.seq,n0:e.s.n0,y:e.s.y,lps:e.s.lps,A:A(e.A)})),P:P.map(w=>({c:w.c,y:w.y})),gam,obj:R.obj,g:{E:A(R.g.E),b1:A(R.g.b1),U:A(R.g.U),b2:A(R.g.b2)}};
let nclip=0;eps.forEach(e=>{e.s.y.forEach((y,i)=>{const c=e.s.seq.slice(e.s.n0+i-3,e.s.n0+i),lp=X.fwd(pol,c).lp[y],ra=Math.exp(lp-e.s.lps[i]);if((e.A[i]>=0&&ra>1.2)||(e.A[i]<0&&ra<.8))nclip++})});
out.ppo.nclip=nclip;
fs.mkdirSync(__dirname+'/model',{recursive:true});fs.writeFileSync(__dirname+'/model/case.json',JSON.stringify(out));
console.log('wrote model/case.json; PPO tokens clipped:',nclip);
