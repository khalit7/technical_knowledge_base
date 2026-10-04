// ---- Scale simulator: the model (generated from src/sim/model_tmpl.js and defaults.json by src/sim/gen_js.py; checked against src/sim/model.py)
(function(){
const D=/*DEFAULTS*/;
const v=x=>(x&&typeof x==='object'&&'v' in x)?x.v:x;
function erlangC(A,c){
  if(c<=0)return 1;if(A<=0)return 0;if(A>=c)return 1;
  let B=1;for(let k=1;k<=c;k++)B=A*B/(k+A*B);
  const rho=A/c;return B/(1-rho*(1-B));
}
function tailSojourn(t,C,th,nu){
  const a=Math.exp(-nu*t);let h;
  if(Math.abs(th-nu)<1e-12*Math.max(th,nu))h=Math.exp(-nu*t)*(1+nu*t);
  else h=(nu*Math.exp(-th*t)-th*Math.exp(-nu*t))/(nu-th);
  return (1-C)*a+C*h;
}
function quantileSojourn(q,C,th,nu){
  let lo=0,hi=1/nu+(th>0?1/th:0);
  while(tailSojourn(hi,C,th,nu)>1-q)hi*=2;
  for(let i=0;i<100;i++){const m=(lo+hi)/2;if(tailSojourn(m,C,th,nu)>1-q)lo=m;else hi=m}
  return (lo+hi)/2;
}
let FAST=false;
function station(lam,c,S){
  const A=lam*S;const rho=c>0?A/c:Infinity;
  if(lam<=0)return{lam:0,c,S,rho:0,C:0,theta:c/S,Wq:0,W:S,L:0,Lq:0};
  if(rho>=1)return{lam,c,S,rho,C:1,theta:0,Wq:Infinity,W:Infinity,L:Infinity,Lq:Infinity};
  if(FAST)return{lam,c,S,rho,C:0,theta:c/S-lam,Wq:0,W:S,L:lam*S,Lq:0};
  const C=erlangC(A,c);const theta=c/S-lam;const Wq=C/theta;const W=Wq+S;
  return{lam,c,S,rho,C,theta,Wq,W,L:lam*W,Lq:lam*Wq};
}
function mulberry32(a){return function(){a=(a+0x6D2B79F5)|0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function gpuConsts(st){
  const g=D.gpu,isl=st.isl,osl=st.osl,B=st.batch,n=g.gpus_per_replica;
  const a=(g.weight_bytes/n)/g.hbm_bw;
  const kvTok=2*g.layers*g.kv_heads*g.head_dim*g.kv_bytes;
  const kvAvail=v(g.kv_mem_fraction)*(n*g.hbm_bytes-g.weight_bytes);
  const bmax=Math.floor(kvAvail/(kvTok*(isl+osl)));
  const flops=n*g.fp8_dense_flops*v(g.prefill_mfu);
  const pf=2*g.params*isl/flops;
  const pf0=2*g.params*1000/flops;
  const bmax0=Math.floor(kvAvail/(kvTok*2000));
  const tps0=n*v(g.published_tps_per_gpu);
  const b=1/tps0-pf0/1000-a/bmax0;
  const Bc=Math.max(1,Math.min(B,bmax));
  return{a,b,pf,bmax,kv_tok:kvTok,kv_avail:kvAvail,B:Bc,pf0,bmax0,tps0};
}
function rates(st){
  const w=D.workload,U=st.users;
  const msg_avg=U*v(w.msgs_per_user_day)/86400;const msg=msg_avg*(st.peak!==undefined?st.peak:v(w.peak_factor));
  const req=msg*(1+v(w.api_per_msg));
  return{msg_avg,msg,req,reads:req*v(w.reads_per_req),writes:msg*v(w.writes_per_msg),jobs:msg*v(w.jobs_per_msg),jobs_avg:msg_avg*v(w.jobs_per_msg)};
}
function evaluate(st,mc,N,seed){
  if(mc===undefined)mc=true;FAST=!mc;
  try{return evaluate_(st,mc,N,seed)}finally{FAST=false}
}
function evaluate_(st,mc,N,seed){
N=N||20000;seed=seed||12345;
  const w=D.workload,ap=D.app,db=D.db,ca=D.cache,g=D.gpu;
  const r=rates(st),U=st.users;const out={rates:r};
  const jobCpu=v(w.job_cpu_s);
  const extraMsg=v(w.jobs_per_msg)*(st.async?v(ap.enqueue_cpu_s):jobCpu);
  const sApp=v(ap.cpu_per_req_s);
  const S_app=r.req>0?sApp+r.msg*extraMsg/r.req:sApp;
  const app=station(r.req/st.app_n,ap.vcpu,S_app);app.s_msg=sApp+extraMsg;
  const K=st.cache_n;const h=K>0?st.hit:0;const miss=r.reads*(1-h);
  let cache=null;if(K>0){const ops=r.reads+miss+r.writes;cache=station(ops/K,1,1/v(ca.ops_per_s))}
  const S=st.shards,R=st.replicas;const vc=db.sizes[st.db_size][1];
  const sRead=st.idx?v(db.read_cpu_s):v(db.rows_per_user)*U/S/v(db.scan_rows_per_s);
  const sWrite=v(db.write_cpu_s),sApply=v(db.replica_apply_cpu_s);
  const rd=miss/S,wr=r.writes/S;
  const mix=(lr,lw,sw)=>{const lam=lr+lw;return station(lam,vc,lam>0?(lr*sRead+lw*sw)/lam:sRead)};
  let prim,rep,readNode;
  if(R===0){prim=mix(rd,wr,sWrite);rep=null;readNode=prim}
  else{prim=mix(0,wr,sWrite);rep=mix(rd/R,wr,sApply);readNode=rep}
  let work=null;
  if(st.async){const cw=st.workers_n*D.workers.vcpu;work=station(r.jobs,cw,jobCpu);work.rho_avg=r.jobs_avg*jobCpu/cw}
  const gc=gpuConsts(st);const Bc=gc.B,a=gc.a,b=gc.b,pf=gc.pf,osl=st.osl;
  const Sslot=Bc*pf+osl*(a+b*Bc);const muRep=Bc/Sslot;
  const gpu=station(r.msg,st.gpu_r*Bc,Sslot);
  const lamRep=r.msg/st.gpu_r;const den=1-lamRep*(pf+osl*b);
  const nEff=den<=0?Bc:Math.min(Bc,Math.max(1,lamRep*osl*a/den));
  const dEff=(nEff-1)*pf+osl*(a+b*nEff);
  Object.assign(gpu,{mu_rep:muRep,tps_rep:muRep*osl,n_eff:nEff,d_eff:dEff,pf,speed:osl/dEff,bmax:gc.bmax,B:Bc,kv_used:nEff*gc.kv_tok*(st.isl+osl)});
  Object.assign(out,{app,cache,prim,rep,work,gpu,gc,s_read:sRead});
  const H=D.hours_per_month;
  const cost={
    app:st.app_n*ap.price_h*H,
    lb:st.app_n>1?(D.lb.price_h+r.msg_avg*(1+v(w.api_per_msg))/D.lb.new_conn_per_lcu*D.lb.lcu_h)*H:0,
    db:S*(1+R)*vc*db.price_per_vcpu_h*H,
    cache:K*ca.price_h*H,
    workers:st.async?st.workers_n*D.workers.price_h*H:0,
    queue:st.async?Math.max(0,r.jobs_avg*D.queue.calls_per_job*H*3600/1e6-D.queue.free_million)*D.queue.price_per_million:0,
    gpu:st.gpu_r*g.gpus_per_replica*v(g.price_gpu_h)*H};
  cost.total=cost.app+cost.lb+cost.db+cost.cache+cost.workers+cost.queue+cost.gpu;
  out.cost=cost;
  out.rho={app:app.rho,cache:cache?cache.rho:null,prim:prim.rho,rep:rep?rep.rho:null,work:work?work.rho:null,gpu:gpu.rho};
  if(!mc)return out;
  const path=[app,prim,gpu].concat(cache?[cache]:[]).concat([readNode]);
  if(path.some(x=>x.rho>=1)){out.lat={ttft50:Infinity,ttft99:Infinity,rep50:Infinity,rep99:Infinity};return out}
  const rnd=mulberry32(seed);const nr=v(w.reads_per_req);
  const tt=new Float64Array(N),rp=new Float64Array(N);
  for(let i=0;i<N;i++){
    let t=0,u1,u2,u3,u4,u5,u6,u7;
    u1=rnd();u2=rnd();u3=rnd();
    t+=(u1<app.C?-Math.log(1-u2)/app.theta:0)-Math.log(1-u3)*app.s_msg;
    for(let k=0;k<nr;k++){
      u1=rnd();u2=rnd();u3=rnd();u4=rnd();u5=rnd();u6=rnd();u7=rnd();
      if(cache)t+=(u1<cache.C?-Math.log(1-u2)/cache.theta:0)-Math.log(1-u3)*cache.S;
      if(u4>=h)t+=(u5<readNode.C?-Math.log(1-u6)/readNode.theta:0)-Math.log(1-u7)*sRead;
    }
    u1=rnd();u2=rnd();u3=rnd();
    t+=(u1<prim.C?-Math.log(1-u2)/prim.theta:0)-Math.log(1-u3)*sWrite;
    u1=rnd();u2=rnd();u3=rnd();
    t+=(u1<gpu.C?-Math.log(1-u2)/gpu.theta:0)+pf;
    tt[i]=t;rp[i]=t+dEff;
  }
  tt.sort();rp.sort();
  const i50=Math.floor(0.5*N),i99=Math.floor(0.99*N);
  out.lat={ttft50:tt[i50],ttft99:tt[i99],rep50:rp[i50],rep99:rp[i99]};
  return out;
}
// ---- the suggested fix: same rules as model.py
const HOT=0.7,TARGET=0.6;
const KEYS=['app','cache','prim','rep','work','gpu'];
function hotValue(o,k){const x=o[k];if(!x)return -1;return k==='work'?x.rho_avg:x.rho}
function smallest(st,key,vals,comp){
  for(const x of vals){const s2=Object.assign({},st,{[key]:x});if(hotValue(evaluate(s2,false),comp)<=TARGET)return x}
  return vals[vals.length-1];
}
function range(a,b){const r=[];for(let i=a;i<b;i++)r.push(i);return r}
// a lazy range so the search over thousands of servers does not build a big array
function* seq(a,b){for(let i=a;i<b;i++)yield i}
// gallop then bisect (same as smallest_gallop in model.py): fast for thousands of replicas
function smallestSeq(st,key,a,b,comp){
  const ok=x=>hotValue(evaluate(Object.assign({},st,{[key]:x}),false),comp)<=TARGET;
  if(ok(a))return a;
  let lo=a,step=1,hi;
  for(;;){hi=lo+step;if(hi>=b-1){hi=b-1;if(!ok(hi))return b-1;break}if(ok(hi))break;lo=hi;step*=2}
  while(hi-lo>1){const m=Math.floor((lo+hi)/2);if(ok(m))hi=m;else lo=m}
  return hi;
}
function suggestFix(st){
  const o=evaluate(st,false);
  let k=KEYS[0];for(const q of KEYS)if(hotValue(o,q)>hotValue(o,k))k=q;
  const r=hotValue(o,k);
  if(r<HOT){if(st.app_n===1)return{st:Object.assign({},st,{app_n:2}),what:'avail',comp:null};return{st:null,what:'none',comp:null}}
  const W=D.workload;
  if(k==='app'){
    const a=o.rates;const jobShare=a.msg*W.jobs_per_msg.v*W.job_cpu_s.v/(a.req*o.app.S);
    if(!st.async&&jobShare>0.3){const s2=Object.assign({},st,{async:true});return{st:Object.assign({},s2,{workers_n:smallestSeq(s2,'workers_n',1,5001,'work')}),what:'async',comp:k}}
    return{st:Object.assign({},st,{app_n:smallestSeq(st,'app_n',st.app_n+1,20001,'app')}),what:'app_n',comp:k};
  }
  if(k==='cache')return{st:Object.assign({},st,{cache_n:smallestSeq(st,'cache_n',st.cache_n+1,1025,'cache')}),what:'cache_n',comp:k};
  if(k==='work')return{st:Object.assign({},st,{workers_n:smallestSeq(st,'workers_n',st.workers_n+1,20001,'work')}),what:'workers_n',comp:k};
  if(k==='gpu')return{st:Object.assign({},st,{gpu_r:smallestSeq(st,'gpu_r',st.gpu_r+1,100001,'gpu')}),what:'gpu_r',comp:k};
  if(!st.idx)return{st:Object.assign({},st,{idx:true}),what:'idx',comp:k};
  const x=o[k];
  const readCpu=x.lam*x.S-(o.rates.writes/st.shards)*(k==='prim'?D.db.write_cpu_s.v:D.db.replica_apply_cpu_s.v);
  const readShare=readCpu/(x.lam*x.S);
  if(readShare>0.5){
    if(st.cache_n===0){const s2=Object.assign({},st,{cache_n:1});return{st:Object.assign({},s2,{cache_n:smallestSeq(s2,'cache_n',1,1025,'cache')}),what:'cache',comp:k}}
    if(st.replicas<5)return{st:Object.assign({},st,{replicas:smallest(st,'replicas',range(Math.max(1,st.replicas+1),6),'rep')}),what:'replicas',comp:k};
  }
  if(st.db_size<4){
    const s2=Object.assign({},st,{db_size:smallest(st,'db_size',range(st.db_size+1,5),k)});
    if(hotValue(evaluate(s2,false),k)<=TARGET)return{st:s2,what:'db_size',comp:k};
  }
  const sh=[];for(let i=1;i<11;i++)if(2**i>st.shards)sh.push(2**i);
  return{st:Object.assign({},st,{shards:smallest(st,'shards',sh,k)}),what:'shards',comp:k};
}
const BASE={users:1,peak:v(D.workload.peak_factor),app_n:1,idx:true,db_size:0,replicas:0,shards:1,cache_n:0,hit:0.9,async:false,workers_n:1,gpu_r:1,batch:64,isl:1000,osl:400};
window.SM={D,v,erlangC,tailSojourn,quantileSojourn,station,mulberry32,gpuConsts,rates,evaluate,suggestFix,hotValue,BASE,HOT,TARGET,KEYS};
})();
