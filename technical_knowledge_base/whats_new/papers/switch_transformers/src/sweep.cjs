// The toy's experiments, measured: every preset of the Train tab and the paper's sweeps at toy scale,
// 3 seeds each. usage: node sweep.cjs   (writes model/sweep.json; about 4 minutes on one core)
const SW=require('./parts/20_js_switch_core.js');const fs=require('fs');
const BASE={d:8,h:16,K:32,N:16,k:1,cf:1.25,evalCf:2,alpha:0.01,initScale:0.1,lr:0.003,T:512,skew:true,jitter:0,logEvery:100};
const STEPS=1500,SEEDS=[1,2,3];
const groups={experts:[1,2,4,8,16,32].map(N=>({N})),alpha:[0,1e-5,1e-4,1e-3,1e-2,1e-1,1].map(alpha=>({alpha})),
  cf:[].concat(...[1,2].map(k=>[0.5,1,1.25,2].map(cf=>({k,cf})))),init:[{initScale:1},{initScale:0.1}],router:[{jitter:0},{jitter:0.01}]};
const out={base:BASE,steps:STEPS,seeds:SEEDS,groups:{}};const t0=Date.now();
for(const g in groups){out.groups[g]=[];for(const o of groups[g]){const runs=[];
  for(const seed of SEEDS){const st=SW.run(Object.assign({},BASE,o,{seed}));SW.trainSteps(st,STEPS);const ev=SW.evaluate(st);
    runs.push({seed,te:ev.mse,drop:ev.drop,maxf:Math.max(...ev.f)*st.cfg.N,trDrop:st.log[st.log.length-1].drop,id:SW.identityMSE(st),curve:st.log.map(l=>[l.s,+l.te.toFixed(5),+l.drop.toFixed(4)])})}
  const m=a=>a.reduce((x,y)=>x+y,0)/a.length,sd=a=>Math.sqrt(a.reduce((x,y)=>x+(y-m(a))**2,0)/(a.length-1));
  const te=runs.map(r=>r.te);out.groups[g].push({o,mean:m(te),sd:sd(te),drop:m(runs.map(r=>r.trDrop)),maxf:m(runs.map(r=>r.maxf)),runs});
  console.log(g,JSON.stringify(o),'test',m(te).toFixed(4),'+-',sd(te).toFixed(4),'train drop',(m(runs.map(r=>r.trDrop))*100).toFixed(1)+'%','maxload',m(runs.map(r=>r.maxf)).toFixed(2),((Date.now()-t0)/1000).toFixed(0)+'s')}}
fs.writeFileSync('model/sweep.json',JSON.stringify(out));console.log('done',((Date.now()-t0)/1000).toFixed(0)+'s');
