// ---- Reading section 2: warm-up curves, hot/cold cache, spread of 300 timings (all measured, from PCD.timing) ----
(function(){
  const T=PCD.timing,f=MC.fmtN,med=a=>{const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  const OPS=[['matmul_2048','matmul 2048','var(--c1)'],['softmax_4096x1024','softmax 4096x1024','var(--c2)'],['layernorm_4096x1024','layer_norm 4096x1024','var(--c3)']];
  function warm(){
    const el=document.getElementById('rd-warm');
    const series=OPS.map(([k,n,c])=>({name:n,color:c,pts:Array.from({length:15},(_,i)=>{const v=T.warmup.map(p=>p[k][i]);return {x:i+1,y:med(v),lo:Math.min(...v),hi:Math.max(...v)}})}));
    MC.line(el,series,{logy:true,xl:'call number in a fresh process',yl:'ms (log)',xfmt:v=>String(v),label:'warm-up curves'});
  }
  function cache(){
    const el=document.getElementById('rd-cache');
    const s=(k,n,c)=>({name:n,color:c,pts:T.cache.map(r=>({x:r.mb,y:r.bytes/r[k].median/1e6,lo:Math.min(...r[k].runs.map(v=>r.bytes/v/1e6)),hi:Math.max(...r[k].runs.map(v=>r.bytes/v/1e6))}))});
    MC.line(el,[s('hot_ms','hot: same tensor every call','var(--c2)'),s('cold_ms','cold: rotate through 512 MB','var(--c1)')],
      {logx:true,xl:'tensor size (MB)',yl:'effective GB/s',xfmt:v=>String(v),marks:[{x:24,label:'24 MB cache'}],y0:0,label:'hot and cold cache bandwidth'});
  }
  function dist(){
    const el=document.getElementById('rd-dist'),W=RD.width(el),L=W<500?40:52,R=10,rowH=66,H=3*rowH+34;
    const all=[].concat(...T.dist.map(d=>d.raw.filter(v=>v!=null)));
    const lo=Math.log10(0.5),hi=Math.log10(Math.max(...all)*1.1),X=v=>L+(Math.log10(v)-lo)/(hi-lo)*(W-L-R),nb=48,bw=(hi-lo)/nb;
    let s='';const cols=['var(--c1)','var(--c2)','var(--c3)'];
    T.dist.forEach((d,r)=>{const xs=d.raw.filter(v=>v!=null),c=new Array(nb).fill(0);xs.forEach(v=>{const b=Math.min(nb-1,Math.max(0,Math.floor((Math.log10(v)-lo)/bw)));c[b]++});
      const mx=Math.max(...c),y0=10+r*rowH,base=y0+rowH-16;
      c.forEach((n,b)=>{if(!n)return;const x=X(Math.pow(10,lo+b*bw)),x2=X(Math.pow(10,lo+(b+1)*bw)),h=n/mx*(rowH-32);s+='<rect x="'+x.toFixed(1)+'" y="'+(base-h).toFixed(1)+'" width="'+Math.max(1,x2-x-1).toFixed(1)+'" height="'+h.toFixed(1)+'" style="fill:'+cols[r]+';opacity:.75"/>'});
      const sm=d.summary;[['median',sm.median,'var(--ink)'],['mean',sm.mean,'var(--bad)']].forEach(([n,v,col],j)=>{const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(y0+2)+'" y2="'+base+'" style="stroke:'+col+'" stroke-width="1.5"'+(j?' stroke-dasharray="3 2"':'')+'/>'});
      s+=RD.t(L+2,y0+8,'run '+(r+1)+': median '+f(sm.median,3)+' ms, mean '+f(sm.mean,3)+', max '+f(sm.max,2),{fs:10.5});
      s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+base+'" y2="'+base+'" style="stroke:var(--line)"/>'});
    [0.5,1,2,5,10].forEach(v=>{if(Math.log10(v)>hi)return;const x=X(v);s+=RD.t(x,H-10,f(v,v<1?1:0)+' ms',{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t(W-R,H-22,'solid: median, dashed: mean',{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'histograms of 300 timings in three runs');
  }
  const all=()=>{warm();cache();dist()};
  RD.onRender(all);RD.onResize(all);all();
  const w=k=>T.warmup.map(p=>p[k]),c16=T.cache.find(r=>r.mb===16),c128=T.cache.find(r=>r.mb===128);
  const loads=[].concat(...T.loads.map(x=>[x[0][0],x[1][0]]));
  const P=PCD.profiler.mps.wall,a45=PCD.ncu.reports.map(r=>{const v=+r.raw['gpc__cycles_elapsed.avg.per_second'][0],u=r.raw['gpc__cycles_elapsed.avg.per_second'][1];return u==='Mhz'?v/1000:v});
  const db=T.dobench;
  Object.assign(window.RDV=window.RDV||{},{
    w_sm1:f(med(w('softmax_4096x1024').map(a=>a[0])),2),w_sm1max:f(Math.max(...w('softmax_4096x1024').map(a=>a[0])),1),w_smlast:f(med(w('softmax_4096x1024').map(a=>a[14])),2),
    w_mm1:f(med(w('matmul_2048').map(a=>a[0])),1),w_mmlast:f(med(w('matmul_2048').map(a=>a[14])),2),
    p_first:f(P[0],0),p_later:f(med(P.slice(1)),0),
    c16_hot:f(c16.bytes/c16.hot_ms.median/1e6,0),c16_cold:f(c16.bytes/c16.cold_ms.median/1e6,0),c128:f(c128.bytes/c128.hot_ms.median/1e6,0),
    load_lo:f(Math.min(...loads),1),load_hi:f(Math.max(...loads),1),
    d_meds:T.dist.map(d=>f(d.summary.median,3)).join(', '),d_mean2:f(T.dist[1].summary.mean,3),d_max2:f(T.dist[1].summary.max,2),
    a45_max:f(+PCD.ncu.reports[0].raw['device__attribute_max_gpu_frequency_khz'][0]/1000,0),a45_lo:f(Math.min(...a45),2),a45_hi:f(Math.max(...a45),2),
    db_fl:f(med(db.sum16MB_flush.median),2),db_nf:f(med(db.sum16MB_noflush.median),2),db_mm:f(med(db.mm2048_flush.median),2)
  });
})();
