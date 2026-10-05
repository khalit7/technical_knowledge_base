// ---- Reading tab: tables and charts drawn from window.SC_DATA (measured) and from the page's formulas ----
(function(){
  const D=window.SC_DATA,$=id=>document.getElementById(id),esc=RD.esc;
  const f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const W={};[88761,71755,56483,46273,36291,29154,23254,18705,14949,11916,9548,7620,6100,4904,3906,3121,2501,1991,1586,1277,
    1024,820,655,526,423,335,272,215,172,137,110,87,70,56,45,36,29,23,18,15].forEach((w,k)=>{W[k-20]=w});
  window.SC_W=W;
  // horizontal bars on a log or linear scale, each with an optional min-max range; rows: {name, v, lo, hi, txt, c}
  function bars(el,rows,o){o=o||{};const log=!!o.log;const all=rows.flatMap(r=>[r.v,r.hi==null?r.v:r.hi]);
    const mx=Math.max(...all)*1.05,mn=log?Math.min(...rows.map(r=>r.lo==null?r.v:r.lo))/2:0;
    const pos=v=>log?(Math.log10(v)-Math.log10(mn))/(Math.log10(mx)-Math.log10(mn))*100:v/mx*100;
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span><span class="track">'+
      (r.lo!=null?'<span class="fill" style="left:'+pos(r.lo).toFixed(2)+'%;width:'+Math.max(.6,pos(r.hi)-pos(r.lo)).toFixed(2)+'%;background:var(--dim)"></span>':'')+
      '<span class="fill" style="width:'+Math.max(.6,pos(r.v)).toFixed(2)+'%;background:'+(r.c||'var(--c1)')+';opacity:.85;height:6px;top:4px"></span></span><span class="val">'+r.txt+'</span></div>').join('')+'</div>'+
      (o.note?'<p class="small mute" style="margin:2px 0 0">'+o.note+'</p>':'')}
  // simple line chart: series [{name,c,pts:[[x,y]],dash}]
  function lines(el,series,o){const w=RD.width(el),h=o.h||220,L=46,R=10,T=10,B=34;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
    const x0=o.x0!=null?o.x0:Math.min(...xs),x1=o.x1!=null?o.x1:Math.max(...xs),y0=o.y0!=null?o.y0:Math.min(...ys),y1=o.y1!=null?o.y1:Math.max(...ys)*1.05;
    const X=x=>L+(x-x0)/(x1-x0)*(w-L-R),Y=y=>T+(1-(y-y0)/(y1-y0))*(h-T-B);
    let b='';const nt=5;for(let i=0;i<=nt;i++){const yv=y0+(y1-y0)*i/nt;b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(yv).toFixed(1)+'" y2="'+Y(yv).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(yv)+4,f(yv,o.yd||0),{a:'end',fs:10,fill:'var(--mute)'})}
    for(let i=0;i<=4;i++){const xv=x0+(x1-x0)*i/4;b+=RD.t(X(xv),h-B+14,f(xv,o.xd||0),{a:'middle',fs:10,fill:'var(--mute)'})}
    b+=RD.t((L+w-R)/2,h-4,o.xl||'',{a:'middle',fs:10.5,fill:'var(--mute)'});
    (o.bands||[]).forEach(bd=>{b+='<rect x="'+X(bd[0]).toFixed(1)+'" y="'+T+'" width="'+(X(bd[1])-X(bd[0])).toFixed(1)+'" height="'+(h-T-B)+'" fill="var(--hl)" opacity=".55"/>'});
    series.forEach(s=>{b+='<polyline fill="none" stroke="'+s.c+'" stroke-width="2"'+(s.dash?' stroke-dasharray="5 4"':'')+' points="'+s.pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'});
    el.innerHTML=RD.svg(w,h,b,o.label||'chart')+'<div class="tl-leg">'+series.map(s=>'<span style="--sw:'+s.c+'">'+esc(s.name)+'</span>').join('')+(o.bandName?'<span style="--sw:var(--hl)">'+esc(o.bandName)+'</span>':'')+'</div>'}
  window.SC_CH={bars,lines,med,f};

  // ---------- section 1: the job's threads ----------
  (function(){const J=D.job;if(!J.length)return;
    const main=J[0].pid,role=x=>x.pid===main?(x.tid===main?'main thread (training loop)':'main process, helper thread'):(x.tid===x.pid?'worker, main thread':'worker, helper thread');
    set('sc-job','<table class="tbl-sm"><thead><tr><th>pid</th><th>tid</th><th>what</th><th>state</th><th class="num">CPU</th><th class="num">voluntary</th><th class="num">involuntary</th><th class="num">on CPU, ms</th><th class="num">waiting, ms</th></tr></thead><tbody>'+
      J.map(x=>'<tr><td>'+x.pid+'</td><td>'+x.tid+'</td><td>'+role(x)+'</td><td>'+x.state+'</td><td class="num">'+x.cpu+'</td><td class="num">'+f(x.vol)+'</td><td class="num">'+f(x.invol)+'</td><td class="num">'+f(x.on_ms)+'</td><td class="num">'+f(x.wait_ms)+'</td></tr>').join('')+'</tbody></table>');
    $('sc-job-ps').textContent=D.RAW.job_ps;
    const m=J.find(x=>x.tid===main),n=J.length,np=new Set(J.map(x=>x.pid)).size;
    set('sc-job-note','<b>'+n+' threads in '+np+' processes.</b> The main thread ran '+f(m.on_ms)+' ms and waited '+f(m.wait_ms)+' ms for a CPU ('+f(m.wait_ms/(m.on_ms+m.wait_ms)*100)+'% of the time it wanted to run) with '+f(m.invol)+' involuntary switches: this container is limited to 2 CPUs and the job wants more. The second busy thread of the main process is PyTorch\'s other intra-op thread (<code>--threads 2</code>); each worker runs one main thread plus helper threads.');
    set('sc-job-wait',f(m.wait_ms)+' ms');
    const pids=[...D.RAW.job_churn.matchAll(/workers: ([\d,]+)/g)].map(x=>x[1]);
    set('sc-churn','pids '+[...new Set(pids)].join(' then '));})();

  // ---------- section 2: context switch costs ----------
  (function(){const C=D.ctx,mm=a=>[Math.min(...a),Math.max(...a)];
    const rows=[{name:'process switch, one CPU',v:med(C.pipe),lo:mm(C.pipe)[0],hi:mm(C.pipe)[1],txt:f(med(C.pipe),2)+' us',c:'var(--c1)'},
      {name:'thread switch, one CPU',v:med(C.futex),lo:mm(C.futex)[0],hi:mm(C.futex)[1],txt:f(med(C.futex),2)+' us',c:'var(--c3)'},
      {name:'cache line between CPUs',v:med(C.spin_ns)/1000,lo:mm(C.spin_ns)[0]/1000,hi:mm(C.spin_ns)[1]/1000,txt:f(med(C.spin_ns))+' ns',c:'var(--c4)'},
      {name:'wake on busy CPU',v:med(C.xbusy),lo:mm(C.xbusy)[0],hi:mm(C.xbusy)[1],txt:f(med(C.xbusy),1)+' us',c:'var(--c5)'},
      {name:'wake on idle CPU',v:med(C.xidle),lo:mm(C.xidle)[0],hi:mm(C.xidle)[1],txt:f(med(C.xidle),1)+' us',c:'var(--c2)'}];
    const draw=()=>bars($('sc-ctx'),rows,{log:true,note:'Log scale. Bar: median; grey band: min to max over the runs (5 for one CPU, 3 across CPUs).'});
    draw();RD.onRender(draw);
    set('sc-ctx-note','src/exp/schedlab.c (modes ctx_pipe, ctx_futex, xcpu_spin, xcpu_pipe), container --cpus 2 --cpuset-cpus 1,2; raw/ctx.txt.');
    set('sc-ctx-pipe',f(mm(C.pipe)[0],2)+' to '+f(mm(C.pipe)[1],2));set('sc-ctx-futex',f(mm(C.futex)[0],2)+' to '+f(mm(C.futex)[1],2));
    set('sc-ctx-spin',f(mm(C.spin_ns)[0])+' to '+f(mm(C.spin_ns)[1]));set('sc-ctx-xidle',f(mm(C.xidle)[0],1)+' to '+f(mm(C.xidle)[1],1));
    set('sc-ctx-xidle2',f(mm(C.xidle)[0],1)+' to '+f(mm(C.xidle)[1],1));set('sc-ctx-xbusy',f(mm(C.xbusy)[0],1)+' to '+f(mm(C.xbusy)[1],1));
    set('sc-yield',C.yield_switched.map(x=>f(x/2000)+'%').join(', '));
    const R=D.cache;set('sc-cache','<table class="tbl-sm"><thead><tr><th>Round</th><th class="num">VM load</th><th class="num">alone</th><th class="num">with an ALU loop</th><th class="num">with a streaming loop</th></tr></thead><tbody>'+
      R.map((r,i)=>'<tr><td>'+(i+1)+'</td><td class="num">'+f(r.load,2)+'</td><td class="num">'+f(r.k4096[0],2)+' ns</td><td class="num">'+f(r.k4096[1],2)+' ns</td><td class="num">'+f(r.k4096[2],2)+' ns</td></tr>').join('')+
      '</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">Nanoseconds per dependent load over a 4 MiB working set, per CPU-second received (lower is better). A 1 MiB working set, recorded in the same runs (raw/cache.txt), showed the same pattern, smaller.</caption></table>');
    const al=R.map(r=>r.k4096[0]);set('sc-cache-alone',f(Math.min(...al),1)+' to '+f(Math.max(...al),1));})();

  // ---------- section 3: stride ----------
  (function(){const tk={A:100,B:50,C:250},st={},ps={A:0,B:0,C:0},o=[];Object.keys(tk).forEach(k=>st[k]=10000/tk[k]);
    for(let i=0;i<8;i++){const k=Object.keys(ps).sort((a,b)=>ps[a]-ps[b]||(a<b?-1:1))[0];o.push(k);ps[k]+=st[k]}
    set('sc-stride-v','A '+st.A+', B '+st.B+', C '+st.C);set('sc-stride-o',o.join(' '));})();

  // ---------- section 4: CFS ----------
  (function(){set('sc-share05',f(W[0]/(W[0]+W[5])*100,2)+'%');set('sc-setsid',f(D.setsid_share*100,2)+'%');
    $('sc-setsid-raw').textContent=D.RAW.setsid;
    const fac=3,lat=6*fac,g=0.75*fac,wg=1*fac;
    set('sc-tun','latency '+lat+' ms, min_granularity '+g+' ms, wake-up granularity '+wg+' ms, exactly the values in <code>/proc/sys/kernel/sched_latency_ns</code>, <code>sched_min_granularity_ns</code> and <code>sched_wakeup_granularity_ns</code> on this VM');
    const rows=[1,2,3,8,9,16].map(n=>{const p=n>8?n*g:lat;return '<tr><td class="num">'+n+'</td><td class="num">'+f(p,2)+' ms</td><td class="num">'+f(p/n,2)+' ms</td></tr>'});
    set('sc-slices','<table class="tbl-sm" style="max-width:420px"><thead><tr><th class="num">runnable nice-0 threads</th><th class="num">period</th><th class="num">slice each</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>');
    const V=D.vrun,t0=V[0].t,base=Math.min(V[0].nice0[0],V[0].nice5[0],V[0].sleeper[0]),eb={n0:V[0].nice0[1],n5:V[0].nice5[1],s:V[0].sleeper[1]};
    let mode='vr';const C=['var(--c1)','var(--c2)','var(--c3)'];
    function draw(){const k=mode==='vr'?0:1;const sub=k?[eb.n0,eb.n5,eb.s]:[base,base,base];
      lines($('sc-vr'),[['busy loop, nice 0','nice0'],['busy loop, nice 5','nice5'],['sleeper, nice 0','sleeper']].map((x,i)=>({name:x[0],c:C[i],pts:V.map(r=>[(r.t-t0)/1000,r[x[1]][k]-sub[i]])})),
        {xl:'seconds since the first sample',xd:1,yd:0,y0:k?0:undefined,label:mode==='vr'?'virtual runtime':'CPU time received'})}
    draw();RD.onRender(draw);RD.onResize(draw);RD.seg($('sc-vr-mode'),m=>{mode=m;draw()});
    const L=V[V.length-1],F=V[0];const d0=L.nice0[1]-F.nice0[1],d5=L.nice5[1]-F.nice5[1];
    set('sc-vr-ratio',f(d0/d5,2));
    set('sc-vr-gap',f(Math.max(...V.map(r=>Math.abs(r.nice0[0]-r.nice5[0]))),2));
    set('sc-vr-lag',f(med(V.map(r=>Math.min(r.nice0[0],r.nice5[0])-r.sleeper[0])),1));
    set('sc-vr-note','Milliseconds, relative to the first sample; "virtual runtime" is se.vruntime, "CPU time" is se.sum_exec_runtime. /proc shows weights scaled by 1024 ('+D.vrun_weights.nice0+' for nice 0, '+D.vrun_weights.nice5+' for nice 5). src/exp/vrun.py; raw/vrun.txt.');})();

  // ---------- section 6: wake-up latency, RT ----------
  (function(){const K=D.wake;const nm={'alone':'alone','1 busy loop (nice 0)':'1 busy loop','4 busy loops (nice 0)':'4 busy loops',
      '4 busy loops (nice 0), the sleeper at nice -10':'4 loops, sleeper nice -10','4 busy loops (nice 0), the sleeper as SCHED_BATCH':'4 loops, sleeper SCHED_BATCH',
      '4 busy loops as SCHED_IDLE, the sleeper normal':'4 SCHED_IDLE loops','4 busy loops at nice 19, the sleeper normal':'4 nice-19 loops'};
    const draw=()=>bars($('sc-wake'),K.map(k=>({name:nm[k.case]||k.case,v:k.p50,lo:k.p50,hi:k.p99,txt:f(k.p50)+' us',c:/BATCH/.test(k.case)?'var(--c2)':'var(--c1)'})),
      {log:true,note:'Log scale. Bar: median delay; grey band: median to 99th percentile. 3,000 wake-ups each.'});
    draw();RD.onRender(draw);
    set('sc-wake-note','src/exp/schedlab.c mode wakelat, src/exp/wake.sh; container --cpus 1 --cpuset-cpus 3 --cap-add SYS_NICE; raw/wake.txt. Maxima: '+K.map(k=>f(k.max/1000,1)).join(', ')+' ms.');
    const g=s=>K.find(k=>k.case===s);set('sc-wk-alone',f(g('alone').p50));set('sc-wk-4',f(g('4 busy loops (nice 0)').p50));
    set('sc-wk-batch',f(g('4 busy loops (nice 0), the sleeper as SCHED_BATCH').p50));set('sc-wk-idle',f(g('4 busy loops as SCHED_IDLE, the sleeper normal').p50));
    set('sc-wk-n19',f(g('4 busy loops at nice 19, the sleeper normal').p50));
    $('sc-rt-raw').textContent=D.RAW.rt_limits;$('sc-dl-raw').textContent=D.RAW.rt_dl;$('sc-dl20-raw').textContent=D.RAW.rt_dl20;})();

  // ---------- section 7: what programs see ----------
  (function(){set('sc-cpus','<table class="tbl-sm"><thead><tr><th>docker run flags</th><th class="num">quota</th><th>cpuset</th><th class="num">os.cpu_count()</th><th class="num">affinity</th><th class="num">nproc</th><th class="num">torch threads</th></tr></thead><tbody>'+
    D.cpus.map(c=>'<tr><td><code>'+esc(c.flags)+'</code></td><td class="num">'+c.quota+'</td><td>'+c.cpuset+'</td><td class="num">'+c.cpu_count+'</td><td class="num">'+c.affinity+'</td><td class="num">'+c.nproc+'</td><td class="num">'+c.torch+'</td></tr>').join('')+
    '</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">src/exp/cpus.sh; raw/cpus.txt. "affinity" is len(os.sched_getaffinity(0)); torch threads is torch.get_num_threads() (the inter-op pool reported the same).</caption></table>')})();

  // ---------- section 9: weights ----------
  (function(){const old=s=>1+Math.floor((s-2)*9999/262142),neu=s=>s<=2?1:s>=262144?10000:Math.ceil(Math.pow(10,(Math.log2(s)**2+125*Math.log2(s))/612-7/34));
    set('sc-conv','<table class="tbl-sm"><thead><tr><th class="num">shares (Docker --cpu-shares, or Kubernetes milli-CPU × 1.024)</th><th class="num">cpu.weight, runc 1.1 (linear)</th><th class="num">cpu.weight, cgroups v0.0.3+ (quadratic)</th></tr></thead><tbody>'+
      [2,128,256,512,1024,2048,4096].map(s=>'<tr><td class="num">'+s+(s===1024?' (default; a 1-CPU request)':s===256?' (a 250m request)':'')+'</td><td class="num">'+old(s)+'</td><td class="num">'+neu(s)+'</td></tr>').join('')+'</tbody></table>');
    const w=D.weight;set('sc-w-ab',w.wA+' and '+w.wB);set('sc-w-split',f(w.msA)+' ms against '+f(w.msB)+' ms in 6 s, '+f(w.msA/(w.msA+w.msB)*100,1)+'%');
    const draw=()=>bars($('sc-nb'),[{name:'alone',v:w.alone,txt:f(w.alone,1)+' ms',c:'var(--c3)'},{name:'neighbour, shares 1024 (weight 39)',v:w.n39,txt:f(w.n39,1)+' ms',c:'var(--c2)'},{name:'neighbour, shares 128 (weight 5)',v:w.n5,txt:f(w.n5,1)+' ms',c:'var(--c5)'}],{note:'Median step time over 5 s, both containers pinned to CPU 4 (src/exp/weight.sh, step.py; raw/weight.txt).'});
    draw();RD.onRender(draw);
    set('sc-nb-alone',f(w.alone,1));set('sc-nb-39',f(w.n39,1));set('sc-nb-5',f(w.n5,1));set('sc-nb-p39',f(w.alone*139/100,1));set('sc-nb-p5',f(w.alone*105/100,1));
    set('sc-nb-pct',f((1-w.alone/w.n39)*100)+'%');set('sc-nb-note','Predictions assume the step\'s container (weight 100) gets 100 / (100 + neighbour weight) of the CPU.');})();

  // ---------- section 10: accounting and load ----------
  (function(){$('sc-acct-time').textContent=D.RAW.acct_time;$('sc-acct-stat').textContent=D.RAW.acct_stat;$('sc-acct-ss').textContent=D.RAW.acct_schedstat;
    $('sc-dstate').textContent=D.RAW.dstate;
    const P=D.load,on=P.filter(p=>p.d>0),t1=on.length?on[0].t:15,t2=on.length?on[on.length-1].t+5:75;
    // the formula from the value when the D-state tasks began, with nothing else running (kernel fixed point, one update per 5 s)
    const start=P.filter(p=>p.t<=t1-5).pop()||P[0];let L=Math.round(start.l1*2048);const pred=[[start.t,start.l1]];
    for(let t=start.t+5;t<=P[P.length-1].t;t+=5){const n=(t>t1-5&&t<=t2?3:0)*2048;let nl=L*1884+n*(2048-1884);if(n>=L)nl+=2047;L=Math.floor(nl/2048);pred.push([t,L/2048])}
    const draw=()=>lines($('sc-load'),[{name:'measured 1-minute load (whole VM)',c:'var(--c1)',pts:P.map(p=>[p.t,p.l1])},{name:'formula: 3 D-state tasks alone',c:'var(--c2)',dash:1,pts:pred}],
      {xl:'seconds',yd:1,y0:0,bands:[[t1-5,t2]],bandName:'3 tasks in D state',label:'load average'});
    draw();RD.onRender(draw);RD.onResize(draw);
    const cpu=D.load_cpu_us;set('sc-load-note','src/exp/loadavg.sh; raw/loadavg.txt. The container used '+f((cpu[cpu.length-1]-cpu[0])/1000)+' ms of CPU over the whole '+P[P.length-1].t+' s (shell and sampling). The kernel updates the average every 5 s on its own clock, so the formula line may be up to one step out of phase.');})();

  // ---------- section 11: grid summary ----------
  (function(){const G=D.grid;if(!G.length)return;const qs=[...new Set(G.map(c=>c.q))].sort((a,b)=>a-b);
    const cell=(q,T,Wk)=>{const v=G.filter(c=>c.q===q&&c.T===T&&c.W===Wk).map(c=>c.med);return v.length?{m:med(v),lo:Math.min(...v),hi:Math.max(...v)}:null};
    const rows=qs.map(q=>{let best=null;[1,2,4,5].forEach(T=>[0,1,2,4].forEach(Wk=>{const c=cell(q,T,Wk);if(c&&(!best||c.m<best.c.m))best={T,W:Wk,c}}));
      const d=cell(q,5,2);return '<tr><td class="num">'+q+'</td><td>'+best.T+' threads, '+best.W+' workers</td><td class="num">'+f(best.c.m,1)+' ms</td><td class="num">'+f(d.m,1)+' ms ['+f(d.lo)+' to '+f(d.hi)+']</td><td class="num">'+f(d.m/best.c.m,1)+'×</td></tr>'});
    set('sc-grid-sum','<table class="tbl-sm"><thead><tr><th class="num">quota (CPUs)</th><th>best</th><th class="num">step, best</th><th class="num">step, default (5 threads, 2 workers)</th><th class="num">default / best</th></tr></thead><tbody>'+rows.join('')+'</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">Median over 3 repeats of each run\'s median step; [range]. src/exp/grid.py; raw/grid.txt.</caption></table>')})();
})();
