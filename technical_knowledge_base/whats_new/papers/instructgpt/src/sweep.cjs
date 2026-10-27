// The offline sweep the page's toy reproduces exactly: the pipeline once, then PPO for a grid of KL coefficients
// (no pretraining mix) and of pretraining-mix coefficients (at the default KL), 3 seeds each, 500 iterations.
//   node sweep.cjs      (about 2 minutes; writes model/sweep.json)
require('./parts/20_js_toy_core.js');
const X=globalThis.TOY,fs=require('fs');const t0=Date.now();
const S=X.pipeline({});
const base={ce:X.meanCE(S.base,S.ptxTest),u:X.evaluate(S.base,S,96,1999).u,win:X.winRate(S.base,S.sft,600,3,S.o.tau)};
const sft={ce:X.meanCE(S.sft,S.ptxTest),u:X.evaluate(S.sft,S,96,1999).u};
const out={pipeline:{base,sft,rmAcc:S.rmAcc,sftEpochs:S.sftEpochs,preLog:S.preLog,rmLog:S.rm.log.filter((_,i)=>i%2===0)},runs:[]};
const R4=v=>Math.round(v*1e4)/1e4;
const run=(c,seed,curve)=>{const R=X.ppo(S,Object.assign({seed},c));const h=R.hist[R.hist.length-1];
  const o={beta:c.beta,gamma:c.gamma||0,seed,u:R4(h.u),rm:R4(h.rm),kl:R4(h.kl),ce:R4(h.ce),sure:R4(h.sure),win:R4(X.winRate(R.pol,S.sft,600,3,S.o.tau))};
  if(curve)o.hist=R.hist.map(h=>({it:h.it,u:R4(h.u),rm:R4(h.rm),kl:R4(h.kl),ce:R4(h.ce),sure:R4(h.sure)}));
  out.runs.push(o);console.log(JSON.stringify(Object.assign({},o,{hist:undefined})),((Date.now()-t0)/1000).toFixed(0)+'s')};
for(const beta of [0,0.01,0.03,0.1,0.3,1,3])for(const seed of [21,22,23])run({beta},seed,seed===21);
for(const gamma of [0.01,0.03,0.1,0.3,1])for(const seed of [21,22,23])run({beta:0.3,gamma},seed,seed===21);
fs.writeFileSync(__dirname+'/model/sweep.json',JSON.stringify(out));console.log('wrote model/sweep.json',((Date.now()-t0)/1000).toFixed(0)+'s');
