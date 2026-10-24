// ---- Planner engine (window.OCP): run -> fleet -> own. Same formulas as src/scripts/recompute.py; used by Reading section 12 and the Capacity planner tab ----
window.OCP=(function(){
  const PEAK={h100:989.5e12,b200:2250e12};
  const MODELS={l405:['Llama 3.1 405B',405853388800,15.6],l70:['Llama 3.1 70B',70553706496,15.0],l8:['Llama 3.1 8B',8030261248,15.0]};
  const LLAMA_RATE=419/(54*16384)*1000;
  function run(k,n,interval){const flops=6*k.params*k.tokens_t*1e12,ideal=flops/(PEAK[k.gpu]*k.mfu)/3600,lam=k.rate_k/1000/24;
    const mtbf=lam>0?1/(lam*n):Infinity,tau=interval/60,st=k.stall_s/3600,rs=k.restart_min/60;
    let g=1-st/tau-(isFinite(mtbf)?(tau/2+rs)/mtbf:0);g=Math.max(g,0);
    const wall=g>0?ideal/n/g:Infinity,paid=n*wall/(1-k.idle),yd=isFinite(mtbf)?Math.sqrt(2*st*mtbf)*60:Infinity;
    return {flops,ideal_h:ideal,mtbf_h:mtbf,goodput:g,wall_days:wall/24,paid_h:paid,cost:paid*k.price,yd_min:yd}}
  function runYD(k,n){const r0=run(k,n,60);return run(k,n,isFinite(r0.yd_min)?Math.max(1,Math.round(r0.yd_min)):60)}
  function gpusFor(dl,k){for(let n=8;n<=200000;n+=8){if(runYD(k,n).wall_days<=dl)return n}return null}
  function fleet(rg,ph,runs,extra,sched){const d=ph*runs*(1+extra),bh=d/(8760*sched);const n=Math.max(rg,Math.ceil(bh/8)*8);return {demand_h:d,by_hours:bh,gpus:n,binding:rg>=bh?'deadline':'hours'}}
  function own(b){const cap=b.capex_gpu*(1+b.net)/b.life_y,en=b.kw_gpu*b.load*b.pue*8760*b.usd_kwh,op=b.ops*b.capex_gpu,a=cap+en+op;return {capital:cap,energy:en,ops:op,annual:a,per_hour:a/8760}}
  return {PEAK,MODELS,LLAMA_RATE,run,runYD,gpusFor,fleet,own};
})();
