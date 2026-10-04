// ---- Autoscaling model (Reading, "Autoscaling GPUs"): the same burst under four policies. Same formulas as src/models.py scale() ----
window.MSD_SCALE=(function(){
  const GPU_TPS=2209,GPUS=2,REP_TPS=GPU_TPS*GPUS,GPU_PRICE_H=3.99,PREFILL_S=0.09;
  const P={a0:30,a1:60,L0:400,L1:600,t_up:300,ramp:180,t_down:1500,horizon:2400,r0:4,rmax:16,rmin:4,sync:15,down_window:300,tol:0.1,
    cold:180,warm:20,cpu_base:25,cpu_slope:10,cpu_target:60,rps_target:0.75*REP_TPS/400,kv_target:0.75,wait_target:4};
  function traffic(t,p){let f;
    if(t<p.t_up)f=0;else if(t<p.t_up+p.ramp)f=(t-p.t_up)/p.ramp;else if(t<p.t_down)f=1;else if(t<p.t_down+p.ramp)f=1-(t-p.t_down)/p.ramp;else f=0;
    return [p.a0+(p.a1-p.a0)*f,p.L0+(p.L1-p.L0)*f]}
  const r=(x,n)=>{const m=Math.pow(10,n);return Math.round(x*m)/m};
  function run(mode,p){p=p||P;
    let ready=p.r0,pend=[],hist=[],backlog=0,breq=0,gpu_s=0,util=0,metric=0;const out=[];
    const cold=mode==='warm'?p.warm:p.cold;
    const pendSum=()=>pend.reduce((s,q)=>s+q[1],0);
    for(let t=0;t<=p.horizon;t++){
      for(const q of pend)if(q[0]<=t)ready+=q[1];
      pend=pend.filter(q=>q[0]>t);
      const [a,L]=traffic(t,p);
      const cap=ready*REP_TPS,work=a*L+backlog,served=Math.min(work,cap);
      util=served/cap;backlog=work-served;breq=backlog/L;
      const ttft=PREFILL_S+backlog/cap;
      gpu_s+=(ready+pendSum())*GPUS;
      if(t%p.sync===0&&t>0){
        const total=ready+pendSum();let prop;
        if(mode==='cpu'){metric=p.cpu_base+p.cpu_slope*util;const ratio=metric/p.cpu_target;prop=Math.abs(ratio-1)>p.tol?Math.ceil(ready*ratio):total}
        else if(mode==='rps'){metric=a/ready;const ratio=metric/p.rps_target;prop=Math.abs(ratio-1)>p.tol?Math.ceil(ready*ratio):total}
        else{const kr=util/p.kv_target;metric=breq/ready;const wr=metric/p.wait_target;
          const c1=Math.abs(kr-1)>p.tol?Math.ceil(ready*kr):total;
          const c2=(Math.abs(wr-1)>p.tol&&metric>0)?Math.ceil(ready*wr):0;prop=Math.max(c1,c2)}
        prop=Math.max(p.rmin,Math.min(p.rmax,prop));
        prop=Math.min(prop,total+Math.max(total,4));
        hist.push([t,prop]);hist=hist.filter(d=>d[0]>t-p.down_window);
        if(prop>total){pend.push([t+cold,prop-total])}
        else if(prop<total){const target=Math.max(...hist.map(d=>d[1]));
          if(target<total){let drop=total-target;
            while(drop>0&&pend.length){const last=pend[pend.length-1];const k=Math.min(drop,last[1]);last[1]-=k;drop-=k;if(last[1]===0)pend.pop()}
            ready-=drop}}
      }
      if(t%15===0)out.push({t,a:r(a,4),L:r(L,4),ready,total:ready+pendSum(),util:r(util,6),wait_req:r(breq,4),ttft:r(ttft,6),metric:r(metric,6),gpu_h:r(gpu_s/3600,6)});
    }
    return out}
  function summary(rows,slo){slo=slo||2;
    let worst=0,over=0,mx=0;rows.forEach(x=>{worst=Math.max(worst,x.ttft);if(x.ttft>slo)over+=15;mx=Math.max(mx,x.total)});
    const g=rows[rows.length-1].gpu_h;
    return {worst_ttft:r(worst,4),minutes_over_slo:r(over/60,4),gpu_h:g,gpu_cost:r(g*GPU_PRICE_H,4),max_rep:mx}}
  return {P,run,summary,REP_TPS,GPU_PRICE_H,PREFILL_S,MODES:['cpu','rps','queue','warm']};
})();
