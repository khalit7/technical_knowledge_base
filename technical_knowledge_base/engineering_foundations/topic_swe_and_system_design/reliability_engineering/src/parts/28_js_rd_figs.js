// ---- Reading: static figures drawn at the measured width (hero, chains, loops, state machine, probes, latency, jitter, goodput, stream) ----
// Static diagrams have no controls. The jitter figure is a before/after toggle on one seeded input; the goodput
// curve runs the shared engine (22_js_engine.js) at each offered load. recompute.py checks the jitter and goodput numbers.
window.RFIG=(function(){
  // jitter: 20 clients fail at t=0 against a dependency that stays down; 4 retries each, base 100 ms, cap 2 s
  function jitter(mode){const lcg=window.RE?window.RE.lcg:null;const r=lcg?lcg(2026):Math.random;const N=20,K=4,B=100,CAP=2000,BIN=25;const times=[];
    for(let c=0;c<N;c++){let t=0;for(let k=0;k<K;k++){const w=Math.min(CAP,B*Math.pow(2,k));t+=mode==='full'?Math.floor(r()*w):w;times.push(t)}}
    const nb=Math.ceil(1600/BIN),h=new Array(nb).fill(0);times.forEach(t=>{h[Math.min(nb-1,Math.floor(t/BIN))]++});
    return {times:times,hist:h,bin:BIN,retries:times.length,peak:Math.max(...h)}}
  // goodput against offered load: the measured setup without a slowdown, no retries, unbounded queue or a queue of 8
  const RATES=[20,40,60,80,100,120,140,160,180,200,240,280,320];
  function goodput(){if(!window.RE)return null;return [0,8].map(q=>RATES.map(rt=>{const r=window.RE.sim(Object.assign({},window.RE.P.m_none,{rate:rt,Ls:28,dmaxQ:q}));
    return {rate:rt,good:Math.round(r.tot.good/(r.c.T/1000)*10)/10,success:Math.round(r.tot.success*1000)/1000}}))}
  return {jitter:jitter,goodput:goodput,RATES:RATES};
})();
(function(){
  const T=RD.t,S=RD.svg;
  const W=el=>Math.max(300,Math.min(860,RD.width(el)));
  const box=(x,y,w,h,hl)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(hl?'var(--acc2)':'var(--soft)')+'" stroke="'+(hl?'var(--acc)':'var(--line)')+'"/>';
  const arrow=(x1,y1,x2,y2,c)=>{c=c||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),L=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.6"/><path d="M'+x2+' '+y2+'L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+'L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+'Z" fill="'+c+'"/>'};
  const lines=(x,y,arr,o)=>arr.map((s,i)=>T(x,y+i*15,s,Object.assign({fs:11},o||{},typeof s==='object'?{}:{}))).join('');
  // node: {t:title, l:[lines], hl, c:colour of lines}
  function chain(id,nodes,label){const el=document.getElementById(id);if(!el)return;
    const draw=()=>{const w=W(el),n=nodes.length,mx=Math.max(...nodes.map(d=>d.l.length));let b='';
      const longest=Math.max(...nodes.map(d=>Math.max(d.t.length*6.6,...d.l.map(s=>s.length*5.5))));
      const g=22,nw=(w-(n-1)*g)/n;
      if(nw>=longest+14){const h=30+15*mx;
        nodes.forEach((d,i)=>{const x=i*(nw+g);b+=box(x+.5,.5,nw-1,h,d.hl)+T(x+8,19,d.t,{fs:12,w:600})+lines(x+8,36,d.l,{fill:d.c||'var(--ink)'});
          if(i<n-1)b+=arrow(x+nw+3,h/2,x+nw+g-3,h/2)});
        el.innerHTML=S(w,h+1,b,label)}
      else{let y=0;nodes.forEach((d,i)=>{const h=30+15*d.l.length;b+=box(.5,y+.5,w-1,h,d.hl)+T(8,y+19,d.t,{fs:12,w:600})+lines(8,y+36,d.l,{fill:d.c||'var(--ink)'});
          y+=h;if(i<n-1){b+=arrow(28,y+2,28,y+20);y+=22}});
        el.innerHTML=S(w,y+1,b,label)}};
    draw();RD.onRender(draw);RD.onResize(draw)}

  chain('rd-hero',[
    {t:'Phone app',l:['the user gives up after ~2 s','SLIs are counted here,','as near the user as we can']},
    {t:'Edge and load balancer',l:['rate limit per client: 429','health checks choose servers','canary: a new build gets 5%'],hl:1},
    {t:'Our chat API',l:['bounded queue: shed early (503)','bulkhead: separate pools','deadline: 10 s per request'],hl:1},
    {t:'Call to the model provider',l:['timeout = the deadline left','retry here only, budgeted','breaker, then fallback model'],hl:1}],
    'Where each defence acts on one chat request: rate limits and health checks at the edge, shedding and bulkheads in the API, timeouts, retries and breakers on the provider call');
  chain('rd-chain',[
    {t:'Load balancer',l:['99.99%']},{t:'Our servers',l:['99.9%']},{t:'Database',l:['99.95%']},{t:'Cache',l:['99.9%']},{t:'Model provider',l:['99.5%']},
    {t:'Chat API',l:['at most 99.24%'],hl:1}],'A chain of five required dependencies multiplies to 99.24%, below the weakest link');
  chain('rd-dl',[
    {t:'Phone app',l:['deadline: now + 10 s']},{t:'Chat API',l:['7 s spent on','history and retrieval'],c:'var(--mute)'},
    {t:'Provider call',l:['timeout = 3 s left,','not a fresh 10 s'],hl:1},{t:'Provider server',l:['sees the deadline;','skips work if expired']}],
    'Deadline propagation: each hop gets only the time that remains');
  chain('rd-amp',[
    {t:'User taps send',l:['1 message']},{t:'Phone app',l:['3 tries','3 requests']},{t:'Our API',l:['3 tries each','9 provider calls']},
    {t:'Provider gateway',l:['3 tries each','27 model calls'],hl:1,c:'var(--bad)'}],'Retries at three layers multiply: one tap becomes up to 27 model calls');
  chain('rd-waves',[
    {t:'One box',l:['one VM or container','bake at least 1 h']},{t:'First region, wave 1',l:['bake at least 12 h']},
    {t:'Larger waves',l:['more regions at once','alarms roll back']},{t:'Everyone',l:['only after every','wave baked clean'],hl:1}],
    'Progressive rollout in waves with bake time, as AWS pipelines do it');

  // metastable loop: 2 x 2 cycle, with the two cuts that ended it in the measured run
  (function(){const el=document.getElementById('rd-loop');if(!el)return;
    const N=[{t:'Calls time out',l:['waits pass the 100 ms','client timeout']},{t:'Each failure retries',l:['up to 2 more attempts','cut: retry budget'],cut:1},
      {t:'Load beats capacity',l:['~300 attempts/s arrive','capacity is 160/s']},{t:'Queue and wait grow',l:['queue without end','cut: bounded queue (8)'],cut:1}];
    const draw=()=>{const w=W(el),g=34,bw=(w-g)/2,bh=62,top=22;let b=T(0,13,'Trigger: a 5 s slowdown',{fs:11,fill:'var(--bad)',w:600});
      const pos=[[0,top],[bw+g,top],[bw+g,top+bh+g],[0,top+bh+g]];
      N.forEach((d,i)=>{const [x,y]=pos[i];b+=box(x+.5,y+.5,bw-1,bh,i===1)+T(x+8,y+19,d.t,{fs:12,w:600})+T(x+8,y+36,d.l[0],{fs:11})+T(x+8,y+51,d.l[1],{fs:11,fill:d.cut?'var(--good)':'var(--ink)',w:d.cut?600:400})});
      b+=arrow(bw+3,top+bh/2,bw+g-3,top+bh/2,'var(--bad)')+arrow(bw+g+bw/2,top+bh+3,bw+g+bw/2,top+bh+g-3,'var(--bad)')+arrow(bw+g-3,top+bh+g+bh/2,bw+3,top+bh+g+bh/2,'var(--bad)')+arrow(bw/2,top+bh+g-3,bw/2,top+bh+3,'var(--bad)');
      el.innerHTML=S(w,top+2*bh+g+2,b,'The retry loop that sustains a metastable failure, and where a retry budget or a bounded queue cuts it')};
    draw();RD.onRender(draw);RD.onResize(draw)})();

  // circuit breaker state machine (resilience4j defaults as the example numbers)
  (function(){const el=document.getElementById('rd-brk');if(!el)return;
    const draw=()=>{const w=W(el),fw=Math.min(w,580),ox=(w-fw)/2,bw=Math.min(160,fw*0.36),bh=50;let b='';
      const C=[ox,24],O=[ox+fw-bw,24],H=[ox+fw/2-bw/2,140];
      b+=box(C[0]+.5,C[1]+.5,bw-1,bh,0)+T(C[0]+10,C[1]+21,'Closed',{fs:12.5,w:600})+T(C[0]+10,C[1]+38,'calls go through',{fs:11});
      b+=box(O[0]+.5,O[1]+.5,bw-1,bh,1)+T(O[0]+10,O[1]+21,'Open',{fs:12.5,w:600})+T(O[0]+10,O[1]+38,'fail fast, fallback',{fs:11});
      b+=box(H[0]+.5,H[1]+.5,bw-1,bh,0)+T(H[0]+10,H[1]+21,'Half-open',{fs:12.5,w:600})+T(H[0]+10,H[1]+38,'a few trial calls',{fs:11});
      b+=arrow(C[0]+bw+4,C[1]+bh/2,O[0]-4,O[1]+bh/2,'var(--bad)')+T(ox+fw/2,C[1]+bh/2-6,'failures \u2265 50%',{fs:11,a:'middle',fill:'var(--bad)'});
      const a1=[O[0]+bw*0.5,O[1]+bh+3],a2=[H[0]+bw-8,H[1]-3];b+=arrow(a1[0],a1[1],a2[0],a2[1]);
      b+=T(Math.min(ox+fw,(a1[0]+a2[0])/2+10),(a1[1]+a2[1])/2+4,'after 60 s',{fs:11});
      const c1=[H[0]+8,H[1]-3],c2=[C[0]+bw*0.5,C[1]+bh+3];b+=arrow(c1[0],c1[1],c2[0],c2[1],'var(--good)');
      b+=T(Math.max(ox,(c1[0]+c2[0])/2-10),(c1[1]+c2[1])/2+4,'10 trials pass',{fs:11,a:'end',fill:'var(--good)'});
      b+=T(ox+fw/2,H[1]+bh+16,'a trial fails: back to Open',{fs:11,a:'middle',fill:'var(--bad)'});
      el.innerHTML=S(w,H[1]+bh+22,b,'Circuit breaker states: closed, open after failures pass the threshold, half-open after the wait, closed again when trials pass, open again when one fails')};
    draw();RD.onRender(draw);RD.onResize(draw)})();

  // probe -> action pairs
  (function(){const el=document.getElementById('rd-probe');if(!el)return;
    const R=[[['Liveness fails','3 checks in a row'],['Container restarted','(so keep it shallow)'],0],[['Readiness fails','e.g. database unreachable'],['Taken out of the load','balancer, not restarted'],0],
      [['Every server fails','at the same moment'],['Fail open: AWS balancers','send to all servers'],1]];
    const draw=()=>{const w=W(el),g=30,bw=(w-g)/2,bh=44;let b='';R.forEach((r,i)=>{const y=i*(bh+10);
      b+=box(.5,y+.5,bw-1,bh,0)+T(8,y+18,r[0][0],{fs:12,w:600})+T(8,y+34,r[0][1],{fs:11,fill:'var(--mute)'});
      b+=arrow(bw+3,y+bh/2,bw+g-3,y+bh/2)+box(bw+g+.5,y+.5,bw-1,bh,r[2])+T(bw+g+8,y+18,r[1][0],{fs:12,w:600})+T(bw+g+8,y+34,r[1][1],{fs:11})});
      el.innerHTML=S(w,R.length*(bh+10)-9,b,'What each health check failure does')};
    draw();RD.onRender(draw);RD.onResize(draw)})();

  // measured latency histogram of the baseline run
  (function(){const el=document.getElementById('rd-lat');if(!el||!window.LAT)return;const L=LAT;
    const draw=()=>{const w=W(el),x0=34,x1=w-8,lo=L.lo,hi=106,X=v=>x0+(x1-x0)*(v-lo)/(hi-lo),mx=Math.max(...L.bins),h=120,top=30,Y=v=>top+h*(1-v/mx);let b='';
      L.bins.forEach((c,i)=>{if(c)b+='<rect x="'+X(lo+i)+'" y="'+Y(c)+'" width="'+Math.max(1,X(lo+i+1)-X(lo+i)-1)+'" height="'+(top+h-Y(c))+'" fill="var(--c1)"/>'});
      b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+(top+h)+'" y2="'+(top+h)+'" stroke="var(--line)"/>'+T(x0-4,top+8,String(mx),{fs:11,a:'end',fill:'var(--mute)'})+T(x0-4,top+h,'0',{fs:11,a:'end',fill:'var(--mute)'});
      [[L.p50,'p50 '+L.p50,'var(--ink)',0],[L.p999,'p99.9 '+L.p999,'var(--c2)',1],[100,'timeout 100','var(--acc)',2]].forEach(m=>{const x=X(m[0]);
        b+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-4)+'" y2="'+(top+h)+'" stroke="'+m[2]+'" stroke-dasharray="4 3" stroke-width="1.5"/>'+T(x+(m[3]===2?-3:3),m[3]===2&&w<520?top+12:top-8,m[1],{fs:11,a:m[3]===2?'end':'start',fill:m[2],w:600})});
      for(let v=20;v<=100;v+=w<480?20:10)b+=T(X(v),top+h+14,String(v),{fs:11,a:'middle',fill:'var(--mute)'});
      b+=T((x0+x1)/2,top+h+29,'latency of one call, ms ('+L.n.toLocaleString('en-GB')+' calls)',{fs:11,a:'middle',fill:'var(--mute)'});
      el.innerHTML=S(w,top+h+34,b,'Histogram of measured call latencies with p50, p99.9 and the chosen 100 ms timeout marked')};
    draw();RD.onRender(draw);RD.onResize(draw)})();

  // jitter before/after on the same 20 clients
  (function(){const el=document.getElementById('rd-jit');if(!el)return;const seg=document.getElementById('rd-jit-seg'),cnt=document.getElementById('rd-jit-cnt');let mode='none';
    const R={none:RFIG.jitter('none'),full:RFIG.jitter('full')};const top=Math.max(R.none.peak,R.full.peak);
    const draw=()=>{const r=R[mode],w=W(el),x0=30,x1=w-6,X=t=>x0+(x1-x0)*t/1600,h=120,tp=8,Y=v=>tp+h*(1-v/top);let b='';
      b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>'+T(x0-4,Y(top)+8,String(top),{fs:11,a:'end',fill:'var(--mute)'})+T(x0-4,Y(0),'0',{fs:11,a:'end',fill:'var(--mute)'});
      r.hist.forEach((c,i)=>{if(c)b+='<rect x="'+X(i*r.bin)+'" y="'+Y(c)+'" width="'+Math.max(1.5,X(r.bin)-X(0)-1)+'" height="'+(Y(0)-Y(c))+'" fill="'+(mode==='none'?'var(--bad)':'var(--good)')+'"/>'});
      for(let t=0;t<=1600;t+=w<480?400:200)b+=T(X(t),Y(0)+14,t+(t===1600?' ms':''),{fs:11,a:t===1600?'end':'middle',fill:'var(--mute)'});
      el.innerHTML=S(w,Y(0)+20,b,'Retries per 25 ms from 20 clients, '+(mode==='none'?'exponential backoff without jitter':'with full jitter'));
      cnt.innerHTML=RD.stat('Retries sent',r.retries,'20 clients × 4')+RD.stat('Most in one 25 ms',r.peak,mode==='none'?'all 20 at once, in waves':'spread out');};
    RD.seg(seg,m=>{mode=m;draw()});draw();RD.onRender(draw);RD.onResize(draw)})();

  // goodput against offered load, live from the engine
  (function(){const el=document.getElementById('rd-gp');if(!el)return;const G=RFIG.goodput();if(!G)return;
    const draw=()=>{const w=W(el),x0=38,x1=w-8,X=v=>x0+(x1-x0)*v/320,h=150,tp=10,mx=160,Y=v=>tp+h*(1-v/mx);let b='';
      [0,40,80,120,160].forEach(v=>{b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(x0-4,Y(v)+4,String(v),{fs:11,a:'end',fill:'var(--mute)'})});
      b+='<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(160)+'" y2="'+Y(160)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>'+T(x0+6,Y(150),'dotted: every request served',{fs:11,fill:'var(--mute)'});
      [[G[1],'var(--good)','bounded queue (8): sheds the excess'],[G[0],'var(--bad)','unbounded queue: collapses']].forEach((s,j)=>{let d='';s[0].forEach((p,i)=>{d+=(i?'L':'M')+X(p.rate).toFixed(1)+' '+Y(p.good).toFixed(1)});
        b+='<path d="'+d+'" fill="none" stroke="'+s[1]+'" stroke-width="2.4"/>';s[0].forEach(p=>b+='<circle cx="'+X(p.rate)+'" cy="'+Y(p.good)+'" r="2.6" fill="'+s[1]+'"/>');
        b+=T(x1,j?Y(12):Y(s[0][s[0].length-1].good)-6,s[2],{fs:11,a:'end',fill:s[1],w:600})});
      for(let v=0;v<=320;v+=w<480?80:40)b+=T(X(v),Y(0)+14,String(v),{fs:11,a:v===320?'end':'middle',fill:'var(--mute)'});
      b+=T((x0+x1)/2,Y(0)+29,'offered load, new requests per second',{fs:11,a:'middle',fill:'var(--mute)'});
      el.innerHTML=S(w,Y(0)+34,b,'Goodput against offered load for an unbounded and a bounded queue')};
    const g=G[0].find(p=>p.rate===200),k=G[1].find(p=>p.rate===200);const o=document.getElementById('rd-gp-n');if(o)o.textContent=g.good+' against '+k.good;
    draw();RD.onRender(draw);RD.onResize(draw)})();

  // one streaming LLM reply under three timeout designs (illustrative times)
  (function(){const el=document.getElementById('rd-stream');if(!el)return;
    const rows=[{n:'Total timeout 10 s',end:48,cut:10,why:'kills a healthy reply at 10 s',bad:1},{n:'First token 5 s + idle 10 s',end:48,cut:null,why:'the long reply completes',bad:0},
      {n:'Same, stream stalls at 20 s',end:20,cut:30,why:'idle timeout frees it at 30 s',bad:0}];
    const draw=()=>{const w=W(el),x0=6,x1=w-6,X=s=>x0+(x1-x0)*s/50,rh=46;let b='';
      rows.forEach((r,i)=>{const y=i*rh+14;b+=T(x0,y,r.n+': '+r.why,{fs:11.5,w:600,fill:r.bad?'var(--bad)':'var(--ink)'});
        const stop=r.cut!==null&&r.cut<r.end?r.cut:r.end;for(let s=1.5;s<=stop;s+=0.5)b+='<rect x="'+X(s)+'" y="'+(y+8)+'" width="1.5" height="12" fill="var(--c1)"/>';
        if(r.cut!==null&&r.cut<r.end)for(let s=r.cut;s<=r.end;s+=0.5)b+='<rect x="'+X(s)+'" y="'+(y+8)+'" width="1.5" height="12" fill="var(--dim)"/>';
        if(r.cut!==null)b+='<line x1="'+X(r.cut)+'" x2="'+X(r.cut)+'" y1="'+(y+4)+'" y2="'+(y+24)+'" stroke="var(--bad)" stroke-width="2.4"/>'});
      const yb=rows.length*rh+8;for(let s=0;s<=50;s+=w<480?10:5)b+=T(X(s),yb,s+(s===50?' s':''),{fs:11,a:s===50?'end':s===0?'start':'middle',fill:'var(--mute)'});
      el.innerHTML=S(w,yb+4,b,'Tokens of one streaming reply over time under a total timeout, a first-token plus idle timeout, and a stalled stream')};
    draw();RD.onRender(draw);RD.onResize(draw)})();

  // predict-then-reveal blocks
  document.querySelectorAll('#t-read .pr').forEach(p=>p.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!p.contains(b))return;
    p.querySelectorAll('.opts button').forEach(x=>x.classList.toggle(x.dataset.ok?'right':'wrong',x===b||!!x.dataset.ok));const a=p.querySelector('.ans');if(a)a.hidden=false}));
})();
