// ---- Section 9: the measured throttling runs as a table, and the stop lengths quoted in the prose (the replay is the 3D stage, 36e_js_sc_thr.js) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-thr-sum'))return;
  const D=window.SC_DATA.throttle,f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const lab=r=>r.n+(r.n>1?' threads':' thread')+', '+(r.quota/r.period)+' CPU'+(r.period!==100000?', '+r.period/1000+' ms period':'');
  $('sc-thr-sum').innerHTML='<table class="tbl-sm"><thead><tr><th>run (docker flags)</th><th class="num">CPU used, ms</th><th class="num">predicted stop per period, ms</th><th class="num">longest stop per thread, ms</th><th class="num">periods throttled</th><th class="num">throttled_usec / 1000</th></tr></thead><tbody>'+
    D.map(r=>{const pred=r.n*r.period>r.quota?r.period/1000-r.quota/1000/r.n:0;return '<tr><td><code>'+r.flags+'</code>, '+r.n+' thr.</td><td class="num">'+f(r.threads.reduce((s,t)=>s+t.cpu_ms,0))+'</td><td class="num">'+f(pred,1)+'</td><td class="num">'+r.threads.map(t=>f(t.max_gap,1)).join(', ')+'</td><td class="num">'+r.stat.nr_throttled+' of '+r.stat.nr_periods+'</td><td class="num">'+f(r.stat.throttled_usec/1000)+'</td></tr>'}).join('')+
    '</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">src/exp/schedlab.c mode throttle, src/exp/throttle.sh; raw/throttle.txt. Predicted stop = period - quota / threads. cpu.stat counts include the container\'s start-up shell.</caption></table>';
  const g=r=>Math.max(...r.threads.map(t=>t.max_gap));
  const r5=D.find(r=>r.n===5&&r.period===100000),r10=D.find(r=>r.period===10000);
  if(r5)$('sc-thr-5').textContent=f(Math.min(...r5.threads.map(t=>t.max_gap)))+' to '+f(g(r5));
  if(r10)$('sc-thr-10').textContent=f(g(r10),1);
})();
