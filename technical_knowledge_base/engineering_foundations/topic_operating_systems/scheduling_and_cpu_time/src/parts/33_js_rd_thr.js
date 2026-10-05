// ---- Section 9: measured throttling, replayed 100 ms at a time (gaps recorded by each spinning thread) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-thr-card'))return;
  const D=window.SC_DATA.throttle,f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const lab=r=>r.n+(r.n>1?' threads':' thread')+', '+(r.quota/r.period)+' CPU'+(r.period!==100000?', '+r.period/1000+' ms period':'');
  $('sc-thr-run').innerHTML=D.map((r,i)=>'<button data-m="'+i+'"'+(r.n===5&&r.period===100000?' class="on"':'')+'>'+lab(r)+'</button>').join('');
  let cur=D.findIndex(r=>r.n===5&&r.period===100000);if(cur<0)cur=0;
  const WIN=100,NS=10;
  // milliseconds a thread was stopped inside [a,b]
  const stopped=(th,a,b)=>th.gaps.reduce((s,g)=>s+Math.max(0,Math.min(b,g[1])-Math.max(a,g[0])),0);
  function draw(k){const r=D[cur],el=$('sc-thr-svg'),w=RD.width(el),n=r.threads.length,L=64,R=8,T=18,lane=Math.max(10,Math.min(18,90/n)),gap=4;
    const end=(k+1)*WIN,X=t=>L+t/1000*(w-L-R),H=T+n*(lane+gap)+18;let b='';
    for(let t=0;t<=1000;t+=r.period/1000){if(r.period>=100000||t%100===0)b+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+(T-3)+'" y2="'+(T+n*(lane+gap))+'" stroke="var(--line)"/>';
      else b+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+(T-3)+'" y2="'+T+'" stroke="var(--mute)"/>';}
    for(let t=0;t<=1000;t+=250)b+=RD.t(X(t),T-6,t+(t===1000?' ms':''),{a:t===1000?'end':t===0?'start':'middle',fs:10,fill:'var(--mute)'});
    r.threads.forEach((th,j)=>{const y=T+j*(lane+gap);b+=RD.t(L-6,y+lane-3,'thread '+(j+1),{a:'end',fs:10.5});
      b+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(end)-X(0)).toFixed(1)+'" height="'+lane+'" fill="var(--c1)" opacity=".85"/>';
      th.gaps.forEach(g=>{if(g[0]>=end)return;const e=Math.min(end,g[1]);b+='<rect x="'+X(g[0]).toFixed(2)+'" y="'+y+'" width="'+Math.max(.6,X(e)-X(g[0])).toFixed(2)+'" height="'+lane+'" fill="var(--soft)"/>'});
      b+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(1000)-X(0)).toFixed(1)+'" height="'+lane+'" fill="none" stroke="var(--line)"/>'});
    b+='<line x1="'+X(end).toFixed(1)+'" x2="'+X(end).toFixed(1)+'" y1="'+(T-3)+'" y2="'+(T+n*(lane+gap))+'" stroke="var(--ink)" stroke-width="1.5"/>';
    el.innerHTML=RD.svg(w,H,b,'threads running and stopped')+'<div class="tl-leg"><span style="--sw:var(--c1)">running</span><span style="--sw:var(--soft)">stopped (gap over 300 us)</span><span style="--sw:var(--line)">'+(r.period>=100000?'period boundary':'100 ms (short ticks: 10 ms periods)')+'</span></div>';
    const a=k*WIN,used=r.threads.reduce((s,th)=>s+(WIN-stopped(th,a,a+WIN)),0),allow=r.quota/r.period*WIN;
    const mx=Math.max(...r.threads.map(th=>th.gaps.filter(g=>g[0]<end).reduce((m,g)=>Math.max(m,Math.min(end,g[1])-g[0]),0)));
    const sofar=r.threads.reduce((s,th)=>s+(end-stopped(th,0,end)),0);
    $('sc-thr-cap').innerHTML='<div class="t">'+lab(r)+': '+a+' to '+end+' ms</div><p>'+(r.n*r.period/1000>r.quota/1000?
      'The threads ran a combined '+f(used)+' ms in these 100 ms against an allowance of '+f(allow)+' ms; '+r.n+' threads spend '+(r.quota/1000)+' ms of quota in about '+f(r.quota/1000/r.n,1)+' ms of wall time per period, then the whole group is stopped until the timer refills it.':
      'One busy thread cannot use more than the quota: '+f(used)+' ms of '+f(allow)+' ms allowed. Nothing is throttled; the short gaps are the VM\'s own interruptions.')+'</p>';
    $('sc-thr-cnt').innerHTML=RD.stat('CPU used so far',f(sofar)+' ms','all threads')+RD.stat('allowed so far',f(r.quota/r.period*end)+' ms','quota / period × time')+RD.stat('longest stop so far',f(mx,1)+' ms','any thread')}
  const an=RD.anim({card:'sc-thr-card',ctl:'sc-thr-ctl',n:NS,draw,ms:1100,label:'100 ms window'});
  RD.seg($('sc-thr-run'),m=>{cur=+m;an.reset(NS);an.play()});RD.onResize(()=>an.redraw());
  $('sc-thr-sum').innerHTML='<table class="tbl-sm"><thead><tr><th>run (docker flags)</th><th class="num">CPU used, ms</th><th class="num">predicted stop per period, ms</th><th class="num">longest stop per thread, ms</th><th class="num">periods throttled</th><th class="num">throttled_usec / 1000</th></tr></thead><tbody>'+
    D.map(r=>{const pred=r.n*r.period>r.quota?r.period/1000-r.quota/1000/r.n:0;return '<tr><td><code>'+r.flags+'</code>, '+r.n+' thr.</td><td class="num">'+f(r.threads.reduce((s,t)=>s+t.cpu_ms,0))+'</td><td class="num">'+f(pred,1)+'</td><td class="num">'+r.threads.map(t=>f(t.max_gap,1)).join(', ')+'</td><td class="num">'+r.stat.nr_throttled+' of '+r.stat.nr_periods+'</td><td class="num">'+f(r.stat.throttled_usec/1000)+'</td></tr>'}).join('')+
    '</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">src/exp/schedlab.c mode throttle, src/exp/throttle.sh; raw/throttle.txt. Predicted stop = period - quota / threads. cpu.stat counts include the container\'s start-up shell.</caption></table>';
  const g=r=>Math.max(...r.threads.map(t=>t.max_gap));
  const r5=D.find(r=>r.n===5&&r.period===100000),r10=D.find(r=>r.period===10000);
  if(r5)$('sc-thr-5').textContent=f(Math.min(...r5.threads.map(t=>t.max_gap)))+' to '+f(g(r5));
  if(r10)$('sc-thr-10').textContent=f(g(r10),1);
})();
