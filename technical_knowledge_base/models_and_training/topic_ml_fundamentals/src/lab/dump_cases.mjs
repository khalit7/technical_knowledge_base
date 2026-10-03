// Writes the cases that check_grad.py replays in PyTorch:
//   grad_cases.json: one forward and backward per configuration (every activation x norm x placement x residual x loss, plus dropout cases), all parameters randomised
//   e2e_cases.json:  a short training run per optimiser (batches, dropout masks, learning rates, per-step losses, final weights, final eval losses)
// usage: node dump_cases.mjs
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {LB} from './load_engine.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const pack=net=>net.params.map(p=>({name:p.name,kind:p.kind,shape:p.shape,layer:p.layer,w:Array.from(p.w)}));
const grads=net=>Object.fromEntries(net.params.map(p=>[p.name,Array.from(p.g)]));

// ---- gradient cases ----
const acts=['sigmoid','tanh','relu','gelu','silu','swiglu'],norms=['none','bn','ln','rms'],places=['pre','post'],losses=['mse','ce','ls','focal'];
const cases=[];let seed=100;
function gradCase(cfg){const r=LB.stream(seed++,9),net=new LB.Net(cfg,seed);
  for(const p of net.params){for(let k=0;k<p.w.length;k++)p.w[k]=p.kind==='gain'?1+0.3*r.normal():p.kind==='W'?0.7*r.normal():0.2*r.normal()}
  const B=6,X=new Float64Array(B*2),y=new Int32Array(B);for(let k=0;k<2*B;k++)X[k]=r()*2-1;for(let n=0;n<B;n++)y[n]=r()<0.5?0:1;
  net.blocks.forEach(b=>b.drop.log=[]);
  const params=pack(net);net.zero();const z=net.forward(X,B,true),[L,dz]=LB.lossGrad(cfg.loss,z,y,B,2);net.backward(dz);
  cases.push({cfg,params,X:Array.from(X),y:Array.from(y),loss:L,logits:Array.from(z),grads:grads(net),masks:net.blocks.map(b=>b.drop.log)})}
for(const act of acts)for(const norm of norms)for(const place of (norm==='none'?['pre']:places))for(const resid of [false,true])for(const loss of losses)
  gradCase({act,norm,place,resid,loss,depth:3,width:5,init:'he',drop:0});
for(const act of ['relu','swiglu'])for(const norm of ['none','bn','ln'])gradCase({act,norm,place:'post',resid:true,loss:'ce',depth:3,width:5,init:'he',drop:0.3});
fs.writeFileSync(path.join(here,'grad_cases.json'),JSON.stringify(cases));

// ---- end-to-end training cases ----
const e2e=[];
const base={loss:'ce',act:'gelu',init:'he',norm:'none',place:'pre',resid:true,depth:3,width:8,lr:0.01,sched:'cosine',warm:0.2,bs:16,wdMode:'l2',wd:0.01,drop:0,early:false};
const runs=[
  {opt:'sgd',lr:0.1,wdMode:'l2'},{opt:'sgd',lr:0.1,wdMode:'wd',sched:'step'},
  {opt:'momentum',lr:0.05,wdMode:'l2',norm:'bn',place:'post'},{opt:'momentum',lr:0.05,wdMode:'wd',sched:'wsd',drop:0.2},
  {opt:'adam',wd:0.05,norm:'ln',loss:'focal'},{opt:'adam',wd:0,act:'swiglu',norm:'rms',loss:'ls'},
  {opt:'adamw',wd:0.1,norm:'bn',place:'pre',drop:0.2,loss:'mse'},{opt:'adamw',wd:0.1,act:'tanh',resid:false,sched:'constant',warm:0},
  {opt:'muon',lr:0.02,wd:0.1,norm:'ln',place:'post'},{opt:'muon',lr:0.02,wd:0,act:'relu',resid:false,drop:0.1,depth:4}];
for(const o of runs){const cfg={...base,...o},sh={seed:7,steps:40,trace:true},data=LB.makeData('spiral',48,0.1,7);
  const r=new LB.Run(cfg,data,sh);const init=pack(r.net);
  // replay needs the masks per step: Run logs them on each block's dropout
  while(!r.done)r.step();
  const d=data,[vl]=r.evalSet(d.Xva,d.Yva);
  e2e.push({cfg,steps:40,init,final:pack(r.net),X:Array.from(d.Xtr),y:Array.from(d.Ytr),Xva:Array.from(d.Xva),yva:Array.from(d.Yva),
    idx:r.trace.idx,loss:r.trace.loss,lr:r.trace.lr,masks:r.net.blocks.map(b=>b.drop.log),valNLL:vl,
    bn:r.net.blocks.filter(b=>b.norm&&b.norm.type==='bn').map(b=>({layer:b.layer,rm:Array.from(b.norm.rm),rv:Array.from(b.norm.rv)}))})}
fs.writeFileSync(path.join(here,'e2e_cases.json'),JSON.stringify(e2e));
console.log('grad cases',cases.length,'e2e runs',e2e.length);
