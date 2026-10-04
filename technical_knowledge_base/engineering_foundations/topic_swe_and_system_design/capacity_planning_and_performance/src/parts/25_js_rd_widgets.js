// ---- Reading: the interactive widgets and the tables computed from the model (CP) and the data (CPD) ----
(function(){
  const $=id=>document.getElementById(id);const D=window.CPD;
  const pc=(v,d)=>(100*v).toFixed(d===undefined?1:d)+'%';
  const ms=v=>v>=1000?(v/1000).toFixed(v>=10000?1:2)+' s':v>=100?Math.round(v)+' ms':v.toFixed(1)+' ms';
  const num=v=>Math.round(v).toLocaleString('en-US');
  const redraw=[];const reg=f=>{redraw.push(f);RD.onRender(f)};RD.onResize(()=>redraw.forEach(f=>{try{f()}catch(e){}}));

  // ---------- the tail at scale
  (function(){const P=[0.0001,0.001,0.005,0.01,0.02,0.05];
    function go(){const p=P[+$('fo-p').value],n=Math.max(1,Math.round(Math.pow(2000,+$('fo-n').value/1000)));
      $('fo-pv').textContent=(p*100)+'% (1 in '+num(1/p)+')';$('fo-nv').textContent=num(n);
      const r=CP.fanout(p,n);
      $('fo-out').innerHTML=RD.stat('User requests that are slow',pc(r),'at least one of '+num(n)+' calls slow')+RD.stat('Each call fast with probability',(1-p).toFixed(4),'')+RD.stat('All '+num(n)+' fast',pc(1-r),'(1 &minus; p)<sup>n</sup>');
      const pts=[];for(let i=0;i<=120;i++){const x=Math.pow(10,i/120*Math.log10(2000));pts.push([x,100*CP.fanout(p,x)])}
      CH.draw($('fo-chart'),{series:[{pts,color:'var(--c1)'},{pts:[[n,100*r]],color:'var(--bad)',dots:1,r:5}],xmin:1,xmax:2000,logx:1,ymin:0,ymax:100,
        xlab:'calls per user request (log scale)',xfmt:v=>num(v),ylab:'',yfmt:v=>v+'%',label:'Share of user requests that hit a slow call against fan-out'})}
    ['fo-p','fo-n'].forEach(i=>$(i).addEventListener('input',go));reg(go);go()})();

  // ---------- multiplier table
  (function(){const R=[0.5,0.7,0.8,0.9,0.95,0.99];let h='<thead><tr><th>Utilisation &rho;</th>'+R.map(r=>'<th class="num">'+Math.round(r*100)+'%</th>').join('')+'</tr></thead><tbody>';
    [[1,'1 server: mean'],[1,'1 server: p99',1],[8,'8 servers, one queue: mean'],[8,'8 servers, one queue: p99',1]].forEach(([c,lab,q])=>{
      h+='<tr><td>'+lab+'</td>'+R.map(r=>'<td class="num">'+(q?CP.mmcQuantile(.99,r,c,1):CP.mmc(r,c,1).W).toFixed(1)+'S</td>').join('')+'</tr>'});
    $('q-mult').innerHTML=h+'</tbody>'})();

  // ---------- measured hockey stick
  (function(){let mode='p99';const H=D.hockey.filter(h=>h.util<1),O=D.hockey.filter(h=>h.util>=1);
    const Sbar=H.reduce((a,h)=>a+h.mean_service_ms,0)/H.length;
    function go(){const th=[];for(let i=0;i<=96;i++){const u=i/100;const W=Sbar/(1-u);th.push([u*100,mode==='p99'?Math.log(100)*W:mode==='p50'?Math.log(2)*W:W])}
      const pts=H.map(h=>[h.util*100,h[mode]]);
      CH.draw($('mh-chart'),{series:[{pts:th,color:'var(--mute)',dash:'5 4',w:1.6},{pts,color:'var(--c2)',w:2},{pts,color:'var(--c2)',dots:1,r:4,stroke:1}],
        xmin:0,xmax:100,ymin:5,ymax:3000,logy:1,band:[60,80],xlab:'utilisation (measured service time x arrival rate)',ylab:mode+' latency, ms (log scale)',xfmt:v=>v+'%',label:'Measured latency against utilisation'});
      $('mh-leg').innerHTML=CH.leg([['var(--c2)','measured '+mode],['var(--mute)','M/M/1 theory with S = '+Sbar.toFixed(1)+' ms (dashed)']]);
      $('mh-note').textContent='Theory: M/M/1, '+(mode==='mean'?'W = S / (1 - rho)':mode==='p50'?'median = ln 2 x S / (1 - rho)':'p99 = ln 100 x S / (1 - rho)')+'. Grey band: 60 to 80%. Not drawn: the two runs that went over 100% ('+O.map(h=>pc(h.util,0)+': median '+ms(h.p50)).join('; ')+').'}
    RD.seg($('mh-seg'),m=>{mode=m;go()});reg(go);go();
    const g=u=>H.reduce((a,h)=>Math.abs(h.util-u)<Math.abs(a.util-u)?h:a);const lo=g(0.1),mid=g(0.8),hi=g(0.95);
    const th=(h,k)=>{const W=h.mean_service_ms/(1-h.util);return k==='mean'?W:Math.log(100)*W};
    $('mh-text').innerHTML='Read it left to right. At '+pc(lo.util,0)+' busy the median was '+ms(lo.p50)+', barely more than the '+lo.mean_service_ms.toFixed(1)+' ms of work. At '+pc(mid.util,0)+' it was '+ms(mid.p50)+' (p99 '+ms(mid.p99)+'); at '+pc(hi.util,0)+', '+ms(hi.p50)+' (p99 '+ms(hi.p99)+'), for the same work. Up to about 80% the measured means sit within 15% of M/M/1 (at '+pc(mid.util,0)+': '+ms(mid.mean)+' measured, '+ms(th(mid,'mean'))+' predicted). Near 95% the measurement falls below the theory (mean '+ms(hi.mean)+' against '+ms(th(hi,'mean'))+'; p99 '+ms(hi.p99)+' against '+ms(th(hi,'p99'))+') for two honest reasons: the service time is less variable than exponential (every sleep adds about 1 ms of fixed overshoot, which Kingman\'s formula below says lowers waiting), and a 75-second run is short for a queue this busy to reach its long-run average. Past 100% nothing settles: the median grows for as long as the run lasts ('+O.map(h=>ms(h.p50)+' at '+pc(h.util,0)).join(', ')+').'})();

  // ---------- Kingman / M/M/c explorer
  (function(){const C=[1,2,4,8,16,32],CV=[0,0.5,1,1.5,2,3,4];
    function go(){const c=C[+$('hx-c').value],cv=CV[+$('hx-s').value],S=+$('hx-ms').value;
      $('hx-cv-c').textContent=c;$('hx-cv-s').textContent=cv+(cv===1?' (exponential)':cv===0?' (constant)':'');$('hx-cv-ms').textContent=S+' ms';
      const k=(1+cv*cv)/2;const W=r=>CP.mmc(r,c,S).Wq*k+S;
      const pts=[];for(let i=1;i<=98;i++){const r=i/100;pts.push([i,W(r)])}
      const ser=[{pts,color:'var(--c1)',w:2.2}];
      if(c===1){const H=D.hockey.filter(h=>h.util<1);ser.push({pts:H.map(h=>[h.util*100,h.mean*S/h.mean_service_ms]),color:'var(--c2)',dots:1,r:4,stroke:1})}
      const ymax=Math.max(S*30,W(0.95)*1.1);
      CH.draw($('hx-chart'),{series:ser,xmin:0,xmax:100,ymin:S*0.5,ymax:Math.max(ymax,S*4),logy:1,band:[60,80],xlab:'utilisation',ylab:'mean time in system, ms (log)',xfmt:v=>v+'%',label:'Mean time in system against utilisation'});
      $('hx-out').innerHTML=[0.6,0.8,0.9,0.95].map(r=>RD.stat('At '+Math.round(r*100)+'% busy',ms(W(r)),(W(r)/S).toFixed(1)+' &times; the work')).join('')}
    ['hx-c','hx-s','hx-ms'].forEach(i=>$(i).addEventListener('input',go));reg(go);go()})();

  // ---------- supermarket table
  (function(){const L=[0.5,0.7,0.9,0.95,0.99];let h='<thead><tr><th>Load &lambda;</th>'+L.map(l=>'<th class="num">'+Math.round(l*100)+'%</th>').join('')+'</tr></thead><tbody>';
    [[1,'d = 1 (random)'],[2,'d = 2 (two choices)'],[3,'d = 3']].forEach(([d,lab])=>{h+='<tr><td>'+lab+'</td>'+L.map(l=>'<td class="num">'+CP.supermarket(l,d).toFixed(2)+'</td>').join('')+'</tr>'});
    $('sm-table').innerHTML=h+'</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">Mean time in system, in mean service times.</caption>'})();

  // ---------- measured load balancing table
  (function(){const N={random:'Random',rr:'Round robin',p2c:'Two choices',lor:'Least outstanding'};
    const sim=D.simlab;let h='<thead><tr><th>Run</th><th>Policy</th><th class="num">p50</th><th class="num">p99</th><th class="num">p99.9</th><th class="num">p99 in S</th><th class="num">simulated p99 in S</th><th class="num">share sent to server 0</th></tr></thead><tbody>';
    const groups=[['lb75','No slow server, '],['lb96',''],['slow','']];
    const ORD={random:0,rr:1,p2c:2,lor:3};const rowsLB=D.lb.slice().sort((a,b)=>(a.slow_server-b.slow_server)||(a.util-b.util)||(ORD[a.policy]-ORD[b.policy]));
    rowsLB.forEach(x=>{const S=x.typical_service_ms;const key=x.slow_server?null:(x.policy+'_'+(x.util>0.9?'0.96':'0.75'));
      const run=x.slow_server?'75%, server 0 three times slower':pc(x.util,0)+' busy';
      h+='<tr><td>'+run+'</td><td>'+N[x.policy]+'</td><td class="num">'+ms(x.p50)+'</td><td class="num">'+ms(x.p99)+'</td><td class="num">'+ms(x.p999)+'</td><td class="num">'+(x.p99/S).toFixed(1)+'</td><td class="num">'+(key&&sim[key]?sim[key].p99.toFixed(1):(x.slow_server&&sim[x.policy+'_0.75_slow3']?sim[x.policy+'_0.75_slow3'].p99.toFixed(1):''))+'</td><td class="num">'+pc(x.share_slowest,1)+'</td></tr>'});
    $('lbm-table').innerHTML=h+'</tbody>';
    const g=(t,p)=>D.lb.find(x=>x.policy===p&&(t==='slow'?x.slow_server:!x.slow_server&&(t==='hi'?x.util>0.9:x.util<0.9)));
    const hi=k=>g('hi',k),lo=k=>g('lo',k),sl=k=>g('slow',k);
    $('lbm-text').innerHTML='The runs meant to be at 70% and 90% ran at '+pc(lo('random').util,0)+' and '+pc(hi('random').util,0)+', for the same reason as Experiment 1: the real service time was '+lo('random').typical_service_ms.toFixed(1)+' ms, not 20. At '+pc(hi('random').util,0)+' busy the p99 was '+ms(hi('random').p99)+' with random choice, '+ms(hi('rr').p99)+' with round robin, '+ms(hi('p2c').p99)+' with two choices and '+ms(hi('lor').p99)+' with least outstanding: two choices cut the p99 '+(hi('random').p99/hi('p2c').p99).toFixed(1)+'-fold with one extra comparison per request. The page\'s simulation, run independently at the measured utilisations, lands close (the last two columns; in units of the measured service time). With one server three times slower, random and round robin keep sending it 1/8 of the traffic, more than it can serve, so its queue grew for the whole run and the p99 reached '+ms(sl('random').p99)+' and '+ms(sl('rr').p99)+'; two choices and least outstanding noticed its long queue and sent it '+pc(sl('p2c').share_slowest,1)+' and '+pc(sl('lor').share_slowest,1)+', keeping the p99 at '+ms(sl('p2c').p99)+' and '+ms(sl('lor').p99)+'.'})();

  // ---------- hit-rate maths
  (function(){function go(){const l=+$('hr-l').value,h=+$('hr-h').value/1000,c=+$('hr-c').value;
      $('hr-lv').textContent=num(l);$('hr-hv').textContent=pc(h,1);$('hr-cv').textContent=num(c);
      const db=CP.cacheBackend(l,h),lat=CP.cacheLatency(h,0.143,5),u=db/c,cold=l/c;
      $('hr-out').innerHTML=RD.stat('Database reads/s',num(db),'(1 &minus; h) &times; '+num(l))+RD.stat('Database utilisation',u>=1?'<span style="color:var(--bad)">'+pc(u,0)+': overloaded</span>':pc(u,0),'')+
        RD.stat('Mean read latency',lat.toFixed(2)+' ms',h<0.99?'p99 is a miss: '+(0.143+5).toFixed(2)+' ms':'p99 is a hit: 0.14 ms')+RD.stat('If the cache empties',pc(cold,0),'database utilisation, every read a miss')}
    ['hr-l','hr-h','hr-c'].forEach(i=>$(i).addEventListener('input',go));go()})();

  // ---------- pool table
  (function(){const P=D.pool;let h='<thead><tr><th>Connections in the pool</th>'+Object.keys(P).map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
    h+='<tr><td>Utilisation of the pool</td>'+Object.keys(P).map(c=>'<td class="num">'+pc(3.4722/c,0)+'</td>').join('')+'</tr>';
    h+='<tr><td>Queries that wait for a connection</td>'+Object.keys(P).map(c=>'<td class="num">'+pc(P[c],1)+'</td>').join('')+'</tr>';
    $('pool-table').innerHTML=h+'</tbody>'})();

  // ---------- GIL table
  (function(){const G=D.gil;if(!G)return;const a=G.gil,b=G.ft;
    const row=(lab,k1,k2)=>'<tr><td>'+lab+'</td><td class="num">'+a[k1][k2].toFixed(2)+' s</td><td class="num">'+b[k1][k2].toFixed(2)+' s</td></tr>';
    $('gil-table').innerHTML='<thead><tr><th>4 CPU jobs, or 100 I/O waits</th><th class="num">3.14.8 (GIL)</th><th class="num">3.14.8 free-threaded</th></tr></thead><tbody>'+
      row('One CPU job alone','cpu','one_job')+row('4 CPU jobs one after another','cpu','sequential')+row('4 CPU jobs on 4 threads','cpu','threads')+row('4 CPU jobs on 4 processes','cpu','processes')+
      row('100 waits of 0.1 s on 100 threads','io_100_jobs','threads_100')+row('100 waits of 0.1 s with asyncio','io_100_jobs','asyncio_100')+'</tbody>';
    $('gil-text').innerHTML='With the GIL, 4 threads took '+a.cpu.threads.toFixed(2)+' s for work that took '+a.cpu.sequential.toFixed(2)+' s one job at a time: no speed-up at all, because only one thread runs Python at once. Processes took '+a.cpu.processes.toFixed(2)+' s ('+(a.cpu.sequential/a.cpu.processes).toFixed(1)+'&times; faster; the rest is the cost of starting processes). The free-threaded build ran the 4 threads in '+b.cpu.threads.toFixed(2)+' s ('+(b.cpu.sequential/b.cpu.threads).toFixed(1)+'&times;). For waiting, the GIL does not matter: 100 waits of 0.1 s finished in about '+a.io_100_jobs.asyncio_100.toFixed(2)+' s with asyncio and '+a.io_100_jobs.threads_100.toFixed(2)+' s with threads on either build, instead of 10 s one after another. On this machine the free-threaded build was not slower for one job ('+b.cpu.one_job.toFixed(3)+' s against '+a.cpu.one_job.toFixed(3)+' s); one small benchmark, not a general result.'})();

  // ---------- coordinated omission
  (function(){let mode='closed';const C=D.co;if(!C||!C.closed)return;
    function go(){const src=mode==='open'?C.open:C.closed;const k=mode==='closed'?1:2;
      const pts=src.pts.map(p=>[p[0],Math.max(1,p[k])]);
      CH.draw($('co-chart'),{series:[{pts,color:mode==='closed'?'var(--c1)':mode==='corr'?'var(--c4)':'var(--c2)',dots:1,r:2,op:.7}],xmin:0,xmax:60,ymin:1,ymax:3000,logy:1,
        xlab:'second of the run (stalls at 15, 30 and 45 s)',ylab:'latency, ms (log scale)',label:'Latency of each request over the run'});
      $('co-note').textContent=mode==='closed'?'Latency from the moment each request was actually sent: what wrk, Locust or k6 constant-vus report.':mode==='corr'?'The same closed-loop run, latency from when each request should have been sent (wrk2\'s correction).':'Open loop: requests sent on schedule whatever the server does; latency from the scheduled time.'}
    const q=['p50','p90','p99','p999','max'],QL={p50:'p50',p90:'p90',p99:'p99',p999:'p99.9',max:'max'};
    $('co-table').innerHTML='<thead><tr><th>Reading</th>'+q.map(x=>'<th class="num">'+QL[x]+'</th>').join('')+'</tr></thead><tbody>'+
      [['Closed, from send',C.closed.send],['Closed, from schedule',C.closed.sched],['Open loop',C.open.sched]].map(([l,v])=>'<tr><td>'+l+'</td>'+q.map(x=>'<td class="num">'+ms(v[x])+'</td>').join('')+'</tr>').join('')+'</tbody>';
    RD.seg($('co-seg'),m=>{mode=m;go()});reg(go);go();
    $('co-text').innerHTML='Same server, same stalls, same rate. The closed-loop tool reports a p99 of '+ms(C.closed.send.p99)+'; measured open-loop, the p99 is '+ms(C.open.sched.p99)+', '+(C.open.sched.p99/C.closed.send.p99).toFixed(0)+' times worse. During each stall the 3 closed-loop users sent 3 requests and stopped, so only 3 slow requests per stall were recorded; real users would have sent 45. The corrected reading of the same closed run (from the schedule) recovers a p99 of '+ms(C.closed.sched.p99)+', close to the open-loop truth, which is why wrk2 and k6\'s arrival-rate executors exist. Even the p99.9 of the uncorrected run ('+ms(C.closed.send.p999)+') shows the stall happened: if a tool only shows a p99, you will not see it at all.'})();

  // ---------- peak factors
  (function(){const W=D.wiki;const P=[['en.wikipedia','English (worldwide)','var(--c1)'],['de.wikipedia','German (mostly one time zone)','var(--c2)'],['ja.wikipedia','Japanese (one time zone)','var(--c3)']];
    function go(){CH.draw($('pk-chart'),{series:P.map(([k,l,c])=>({pts:W[k].shape.map((v,h)=>[h,v]),color:c})).concat([{pts:[[0,2],[23,2]],color:'var(--ink)',dash:'3 3',w:1}]),
      xmin:0,xmax:23,ymin:0,ymax:2.2,xticks:[0,3,6,9,12,15,18,21],xlab:'hour of the day (UTC)',ylab:'traffic / monthly average',xfmt:v=>v+'h',yfmt:v=>v.toFixed(1),label:'Average day of Wikipedia traffic, three languages'});
      $('pk-leg').innerHTML=CH.leg(P.map(p=>[p[2],p[1]]).concat([['var(--ink)','the root\'s 2x (dashed)']]))}
    reg(go);go();
    $('pk-table').innerHTML='<thead><tr><th>Wikipedia</th><th class="num">Busy hour / day</th><th class="num">Quietest / day</th><th class="num">Worst hour / month</th></tr></thead><tbody>'+
      P.map(([k,l])=>'<tr><td>'+l.split(' ')[0]+'</td><td class="num">'+W[k].daily.toFixed(2)+'</td><td class="num">'+W[k].trough.toFixed(2)+'</td><td class="num">'+W[k].month.toFixed(2)+'</td></tr>').join('')+'</tbody>';
    $('pk-text').innerHTML='A product used in one region has a day: German Wikipedia\'s busy hour is '+W['de.wikipedia'].daily.toFixed(2)+'&times; its daily average and its quietest hour '+W['de.wikipedia'].trough.toFixed(2)+'&times;, because most of its readers sleep at the same time. That is the root\'s 2&times;, so the assumption holds for a single-country product like our chat assistant at launch. English Wikipedia, read around the world, is much flatter ('+W['en.wikipedia'].daily.toFixed(2)+'&times;): time zones fill each other\'s troughs. And the busiest hour of a month is higher than the busiest hour of a typical day (Japanese: '+W['ja.wikipedia'].month.toFixed(2)+'&times; against '+W['ja.wikipedia'].daily.toFixed(2)+'&times;): plan for the bad day, not the median one.'})();

  // ---------- capacity planner
  (function(){const PRE=[['Root default',{a:579,g:0,m:0,p:20,u:60,k:1}],['Grow 10% a month, plan 6 months',{a:579,g:10,m:6,p:20,u:60,k:1}],['No headroom, no spare',{a:579,g:0,m:0,p:20,u:100,k:0}],['Global product (peak 1.2x), N+2',{a:579,g:0,m:0,p:12,u:60,k:2}]];
    $('pl-pre').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+p[0]+'</button>').join('');
    $('pl-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const v=PRE[+b.dataset.i][1];
      $('pl-a').value=v.a;$('pl-g').value=v.g;$('pl-m').value=v.m;$('pl-p').value=v.p;$('pl-u').value=v.u;$('pl-k').value=v.k;go()});
    function go(){const o={avg_now:+$('pl-a').value,growth:+$('pl-g').value/100,months:+$('pl-m').value,peak_factor:+$('pl-p').value/10,per_server:4/0.0052,target_util:+$('pl-u').value/100,spares:+$('pl-k').value,price_h:0.2016};
      if(o.avg_now===579)o.avg_now=1e6*10*5/86400;
      $('pl-av').textContent=num(o.avg_now);$('pl-gv').textContent=Math.round(o.growth*100)+'%';$('pl-mv').textContent=o.months;$('pl-pv').textContent=o.peak_factor.toFixed(1)+'x';$('pl-uv').textContent=Math.round(o.target_util*100)+'%';$('pl-kv').textContent='N+'+o.spares;
      const r=CP.plan(o);
      $('pl-out').innerHTML=RD.stat('Peak to serve',num(r.peak)+' req/s','average '+num(r.avg)+' x '+o.peak_factor.toFixed(1))+RD.stat('Servers',r.need+' + '+o.spares+' = '+r.total,num(r.per)+' req/s each at '+Math.round(o.target_util*100)+'%')+
        RD.stat('Peak utilisation, all up',pc(r.util_peak,0),'')+RD.stat('Peak utilisation, one down',r.total>1?(r.util_peak_one_down>=1?'<span style="color:var(--bad)">'+pc(r.util_peak_one_down,0)+'</span>':pc(r.util_peak_one_down,0)):'no server left','')+RD.stat('Cost','$'+num(r.cost)+' / month',r.total+' x $0.2016 x 730 h')}
    ['pl-a','pl-g','pl-m','pl-p','pl-u','pl-k'].forEach(i=>$(i).addEventListener('input',go));go()})();
})();
