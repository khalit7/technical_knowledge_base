// Dump test cases for check_grad.py: weights, a batch, jitter and the JS loss and gradients.
// usage: node dump_case.cjs   (writes model/grad_cases.json)
const SW=require('./parts/20_js_switch_core.js');const fs=require('fs');
const cases=[];
const cfgs=[{k:1,cf:1.0,alpha:0.01,jitter:0},{k:1,cf:1.25,alpha:0.1,jitter:0.01},{k:2,cf:1.0,alpha:0.01,jitter:0},{k:1,cf:0.5,alpha:0,jitter:0},{k:2,cf:2,alpha:1,jitter:0.01}];
cfgs.forEach((o,i)=>{const cfg=Object.assign({d:8,h:16,K:32,N:16,initScale:0.1,lr:0.003,T:512,seed:3+i,skew:true,logEvery:1e9},o);
  const st=SW.run(cfg);SW.trainSteps(st,200+100*i); // train a little so routing is not trivial
  const B=SW.sample(st.task,SW.rng(1234+i),cfg.T);let jit=null;if(cfg.jitter){const r=SW.rng(55+i);jit=new Float64Array(cfg.T*cfg.d);for(let j=0;j<jit.length;j++)jit[j]=1-cfg.jitter+2*cfg.jitter*r()}
  const G=SW.zerosLike(st.P);const res=SW.pass(st.P,B,cfg,G,jit);
  const A=a=>Array.from(a);
  cases.push({cfg,P:{Wr:A(st.P.Wr),W1:st.P.W1.map(A),W2:st.P.W2.map(A)},X:A(B.X),Y:A(B.Y),jit:jit?A(jit):null,
    js:{loss:res.loss,mse:res.mse,aux:res.aux,dropped:res.dropped,dropped2:res.dropped2,C:res.C,G:{Wr:A(G.Wr),W1:G.W1.map(A),W2:G.W2.map(A)}}})});
fs.writeFileSync('model/grad_cases.json',JSON.stringify(cases));console.log('cases',cases.length,'bytes',fs.statSync('model/grad_cases.json').size);
