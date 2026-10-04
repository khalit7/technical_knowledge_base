// ---- Cost model: PostgreSQL 16 cost formulas for col BETWEEN a AND b on one table (mirrors src/costfm.py; checked by src/recompute.py) ----
// Sources: src/backend/optimizer/path/costsize.c (cost_seqscan, cost_index, index_pages_fetched, cost_bitmap_heap_scan, compute_bitmap_pages)
// and src/backend/utils/adt/selfuncs.c (ineq_histogram_selectivity, genericcostestimate, btcostestimate), release 16.2.
(function(root){
function histFrac(h,v){let lo=0,hi=h.length;while(lo<hi){const p=(lo+hi)>>1;if(h[p]<v)lo=p+1;else hi=p}
  const i=lo,low=h[i-1],high=h[i];const bf=high<=low?0.5:Math.min(1,Math.max(0,(v-low)/(high-low)));return ((i-1)+bf)/(h.length-1)}
function selectivity(d,a,b){const nd=d.n_distinct<0?-d.n_distinct*d.reltuples:d.n_distinct,eq=1/nd;
  const fa=histFrac(d.hist,a)-eq,lo=1-fa,fb=histFrac(d.hist,b);return Math.max(fb+lo-1,1e-10)*(1-d.null_frac)}
const clampRows=r=>r<=1?1:Math.round(r);
// Python's round() rounds halves to even; Math.round rounds them up. Only matters at exact .5, which the planner's doubles never hit here.
function mlPages(T,N,b){if(T<=b){const p=2*T*N/(2*T+N);return p>=T?T:Math.ceil(p)}
  const lim=2*T*b/(2*T-b);const p=N<=lim?2*T*N/(2*T+N):b+(N-lim)*(T-b)/T;return Math.ceil(p)}
function costs(d,s,c,corr){if(corr==null)corr=d.correlation;
  const T=Math.max(d.relpages,1),tup=d.reltuples,sp=c.seq_page_cost,rp=c.random_page_cost,ct=c.cpu_tuple_cost,cit=c.cpu_index_tuple_cost,co=c.cpu_operator_cost;
  const rows=clampRows(s*tup);
  const seq={startup:0,total:sp*d.relpages+(ct+2*co)*tup,pages:d.relpages,io:sp*d.relpages,cpu:(ct+2*co)*tup};
  const nit=Math.max(1,Math.min(Math.round(s*tup),d.idxtuples)),nip=Math.ceil(nit*d.idxpages/d.idxtuples);
  let idxTotal=nip*rp+nit*(cit+2*co);
  const descent=Math.ceil(Math.log(d.idxtuples)/Math.log(2))*co+(d.fastlevel+1)*50*co;
  const idxStartup=descent;idxTotal+=descent;
  const tf=rows;let b=c.effective_cache_size*T/(T+d.idxpages);b=b<=1?1:Math.ceil(b);
  const pf=mlPages(T,tf,b),maxIO=pf*rp,pmin=Math.ceil(s*T),minIO=pmin>1?rp+(pmin-1)*sp:(pmin>0?rp:0);
  const io=maxIO+corr*corr*(minIO-maxIO);
  const index={startup:idxStartup,total:idxTotal+io+ct*tf,idxPages:nip,idxTuples:nit,idxCost:idxTotal,heapPagesUncorr:pf,heapPagesCorr:pmin,maxIO,minIO,io,cpu:ct*tf};
  const bix=idxTotal+0.1*co*rows;const p0=2*T*tf/(2*T+tf);const p=p0>=T?T:Math.ceil(p0);
  const maxentries=Math.floor(c.work_mem*1024/64);const heapPages=Math.min(p0,d.relpages);let tfb=tf,lossy=0;
  if(maxentries<heapPages){lossy=Math.max(0,heapPages-maxentries/2);const exact=heapPages-lossy;if(lossy>0)tfb=clampRows(s*(exact/heapPages)*tup+(lossy/heapPages)*tup)}
  const cpp=p>=2?rp-(rp-sp)*Math.sqrt(p/T):rp;
  const bitmap={startup:bix,total:bix+p*cpp+(ct+2*co)*tfb,innerTotal:idxTotal,heapPages:p,costPerPage:cpp,lossy,rechecked:tfb,io:p*cpp,cpu:(ct+2*co)*tfb};
  return {rows,seq,index,bitmap}}
root.QPCM={histFrac,selectivity,costs,mlPages};
})(typeof window!=='undefined'?window:globalThis);
