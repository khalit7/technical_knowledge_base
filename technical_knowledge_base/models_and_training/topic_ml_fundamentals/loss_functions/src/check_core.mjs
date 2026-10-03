// Run the page's loss maths (parts/21_js_core.js) on the page's data and dump every number to check/js_out.json;
// recompute.py recomputes them independently (PyTorch losses and autograd, SciPy linprog) and compares.
import fs from 'fs';import vm from 'vm';
const ctx={};vm.createContext(ctx);
for(const f of ['parts/20_js_data.js','parts/21_js_core.js'])vm.runInContext(fs.readFileSync(f,'utf8').replace(/window\./g,'globalThis.'),ctx);
const {LF,LD}=ctx;const out={fits:{},loc:{},marg:{},fstar:{},gan:{},bf16:{},z:{}};
const sets={anscombe3:LD.anscombe3,anscombe3_clean:{x:LD.anscombe3.x.filter((v,i)=>i!==2),y:LD.anscombe3.y.filter((v,i)=>i!==2)},
  stars:LD.stars,stars_main:{x:LD.stars.x.filter((v,i)=>!LD.stars.giants.includes(i+1)),y:LD.stars.y.filter((v,i)=>!LD.stars.giants.includes(i+1))}};
const P={delta:1,tau:0.9};
for(const [k,d] of Object.entries(sets)){out.fits[k]={};for(const L of ['mse','mae','huber','logcosh','pinball','mape']){
  const p=Object.assign({},P);const f=LF.fit(L,d.x,d.y,p);out.fits[k][L]={a:f.a,b:f.b,obj:LF.objective(L,d.x,d.y,f,p)}}
  for(const dl of [0.25,0.5,2]){const f=LF.fit('huber',d.x,d.y,{delta:dl});out.fits[k]['huber_'+dl]={a:f.a,b:f.b,obj:LF.objective('huber',d.x,d.y,f,{delta:dl})}}
  for(const t of [0.1,0.25,0.5,0.75]){const f=LF.fit('pinball',d.x,d.y,{tau:t});out.fits[k]['pinball_'+t]={a:f.a,b:f.b,obj:LF.objective('pinball',d.x,d.y,f,{tau:t})}}}
for(const L of ['mse','mae','huber','logcosh','pinball','mape'])out.loc[L]=LF.location(L,LD.rivers,{delta:100,tau:0.9});
out.loc.huber_1=LF.location('huber',LD.rivers,{delta:1});
out.loc.mean_loss=['mse','mae','huber','logcosh','pinball','mape'].map(L=>[L,LF.meanLoss(L,LD.rivers,500,{delta:100,tau:0.9})]);
const ms=[-3,-1,-0.25,0,0.5,1,2.5];
for(const L of ['hinge','sqhinge','logistic','exp']){out.marg[L]=ms.map(m=>[LF.MARG[L].phi(m),LF.MARG[L].pull(m)])}
for(const g of [0,1,2,5])out.marg['focal_'+g]=ms.map(m=>[LF.MARG.focal.phi(m,g),LF.MARG.focal.pull(m,g)]);
for(const eta of [0.6,0.75,0.9,0.99]){out.fstar[eta]={};for(const L of ['logistic','exp','hinge','sqhinge'])out.fstar[eta][L]=LF.fstar(L,eta,0);
  for(const g of [1,2,3])out.fstar[eta]['focal_'+g]=LF.fstar('focal',eta,g)}
out.gan=[-6,-4.6,-2,0,2].map(l=>[l,LF.GAN.minimax(l),LF.GAN.ns(l)]);
out.bf16=[0.1,1.00390625,3.14159,24.7,-43.4,100.3,-109.31,1e-3,65504.5].map(v=>[v,LF.bf16(v),LF.bf16gap(v)]);
const v=[2,1,-1,0.5,30];const z=LF.zloss(v,1e-4);out.z={v,logZ:z.logZ,loss:z.loss,grad:z.grad};
fs.mkdirSync('check',{recursive:true});fs.writeFileSync('check/js_out.json',JSON.stringify(out,null,1));
console.log('anscombe3 mse',out.fits.anscombe3.mse,'stars mse',out.fits.stars.mse);console.log('rivers',out.loc);
