// ---- Reading, Autoscaling GPUs: the same burst against four policies (before/after animation) ----
(function(){
  const card=document.getElementById('rd-as-card');if(!card)return;
  const S=window.MSD_SCALE,svgEl=document.getElementById('rd-as-svg'),cap=document.getElementById('rd-as-cap'),cnt=document.getElementById('rd-as-cnt');
  const runs={};S.MODES.forEach(m=>runs[m]=S.run(m));
  let mode='cpu';
  const STEP=2;// rows are every 15 s; one animation step = 30 s
  const N=Math.floor((runs.cpu.length-1)/STEP)+1;
  const NAME={cpu:'CPU utilisation, target 60%',rps:'requests per second per replica',queue:'waiting requests and KV cache use',warm:'waiting requests and KV cache use, warm pool'};
  const fmtT=s=>{const m=Math.floor(s/60),x=s%60;return m+':'+(x<10?'0':'')+x};
  const fmtS=v=>v<1?Math.round(v*1000)+' ms':v<100?v.toFixed(1)+' s':v<6000?Math.round(v)+' s':'>100 min';
  function caption(i){const row=runs[mode][i*STEP],t=row.t,P=S.P;
    const ph=t<P.t_up?0:t<P.t_up+P.ramp?1:t<P.t_down?2:t<P.t_down+P.ramp?3:4;
    const base=['Before the burst: 30 requests a second, 400-token replies. Four replicas (one 8-GPU server) run at about two thirds of their token capacity; time to first token is the prefill alone, about 90 ms.',
      'The burst arrives: requests double to 60 a second over three minutes and replies grow to 600 tokens, so the token demand triples (12,000 to 36,000 tokens a second).',
      'The burst holds at 36,000 output tokens a second.',
      'The burst fades over three minutes.',
      'Back to normal traffic. Replicas leave only after the 5-minute scale-down window, so a short dip does not throw capacity away.'][ph];
    let m='';
    if(mode==='cpu')m=ph===0?'The policy watches CPU. A GPU server\'s CPU mostly tokenises text and schedules the GPU, so it sits near 30% however busy the GPU is.':
      ph<=2?'CPU reads '+row.metric.toFixed(0)+'% against a 60% target: the autoscaler sees an idle service and adds nothing. The queue grows without limit and every new user waits longer than the last.':
      'The burst is over but the backlog built during it still has to drain at the same capacity: users keep waiting long after the traffic is back to normal.';
    else if(mode==='rps')m=ph===0?'The policy watches requests per second per replica, with a target sized for 400-token replies (8.3 requests a second per replica).':
      ph<=2?'Requests doubled, so it asks for twice the replicas (8). But each request now costs 1.5 times the tokens: 8 replicas give 35,344 tokens a second against 36,000 demanded. The backlog that built while they started (3 minutes in this model) never drains, and creeps up for the whole burst. Counting requests cannot see request size.':
      'Only when the burst fades does capacity exceed demand and the backlog drain.';
    else m=ph===0?'The policy watches what the GPU is short of: requests waiting in the engine\'s queue (target 4 per replica) and KV cache use (target 75%). Kubernetes takes the larger of the two recommendations.':
      ph===1?(mode==='queue'?'The queue fills within seconds and the autoscaler asks for more replicas at once. But a new GPU replica takes 3 minutes (in this model) to get a machine, pull the image, load 73 GB of weights and warm up, so users wait while it starts.':
        'Same signals, but the new replicas start in 20 seconds: the GPUs are already provisioned, the image is pulled and the weights sit in host memory. The queue never builds.'):
      ph===2?(row.ready<row.total?'Replicas asked for are still starting ('+row.ready+' of '+row.total+' serving); the queue keeps growing until they arrive.':row.wait_req>1?'The new replicas are serving and draining the queue that built up while they started; the autoscaler overshot to '+row.total+' replicas because the queue term asked for more, and will settle lower once it is empty.':'Enough replicas are serving and the queue is empty. KV cache use settles near its 75% target.'):
      'Demand falls; the autoscaler removes replicas after the scale-down window.';
    cap.innerHTML='<div class="t">'+fmtT(t)+' &middot; '+NAME[mode]+'</div><p>'+base+'</p><p>'+m+'</p>'}
  function counters(i){const rows=runs[mode],row=rows[i*STEP];let worst=0;for(let k=0;k<=i*STEP;k++)worst=Math.max(worst,rows[k].ttft);
    const sig=mode==='cpu'?row.metric.toFixed(0)+'% CPU':mode==='rps'?row.metric.toFixed(1)+' req/s per replica':(row.util*100).toFixed(0)+'% KV, '+(row.wait_req/row.ready).toFixed(1)+' waiting/replica';
    cnt.innerHTML=RD.stat('Replicas serving / asked for',row.ready+' / '+row.total,(row.ready*2)+' GPUs serving')+
      RD.stat('Requests waiting',Math.round(row.wait_req).toLocaleString('en-US'),'')+
      RD.stat('Time to first token now',fmtS(row.ttft),'worst so far '+fmtS(worst))+
      RD.stat('Signal the policy reads',sig,'')+
      RD.stat('GPU-hours so far',row.gpu_h.toFixed(1),'$'+(row.gpu_h*S.GPU_PRICE_H).toFixed(0)+' at $3.99/GPU-hour')}
  function draw(i){const rows=runs[mode],upto=i*STEP;
    const W=Math.max(280,Math.min(860,RD.width(svgEl))),fs=W<420?10:11,L=W<420?34:44,R=8,H1=120,H2=110,G=34,top=16;
    const T=rows[rows.length-1].t,x=t=>L+(W-L-R)*t/T;
    const ymax=16*S.REP_TPS;const y1=v=>top+H1-H1*v/ymax;
    const lo=Math.log10(0.05),hi=Math.log10(2000),y2top=top+H1+G;
    const y2=v=>y2top+H2-H2*(Math.log10(Math.max(0.05,Math.min(2000,v)))-lo)/(hi-lo);
    let b='';
    // panel 1 grid
    [0,20000,40000,60000].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y1(v)+'" y2="'+y1(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y1(v)+3.5,v?(v/1000)+'k':'0',{fs:fs-1,a:'end',fill:'var(--mute)'})});
    b+=RD.t(L,top-5,W<520?'Tokens/s: demand (shaded), capacity (line)':'Output tokens per second: demand (shaded) and capacity serving (line)',{fs:fs,fill:'var(--mute)'});
    // demand area, full horizon, faint; drawn part stronger
    let pa='M'+x(0)+','+y1(0);rows.forEach(r=>{pa+='L'+x(r.t)+','+y1(r.a*r.L)});pa+='L'+x(T)+','+y1(0)+'Z';
    b+='<path d="'+pa+'" fill="var(--c2)" opacity=".12"/>';
    let pd='M'+x(0)+','+y1(0);for(let k=0;k<=upto;k++)pd+='L'+x(rows[k].t)+','+y1(rows[k].a*rows[k].L);pd+='L'+x(rows[upto].t)+','+y1(0)+'Z';
    b+='<path d="'+pd+'" fill="var(--c2)" opacity=".35"/>';
    let pc='',pt='';for(let k=0;k<=upto;k++){const r=rows[k];pc+=(k?'L':'M')+x(r.t)+','+y1(r.ready*S.REP_TPS);pt+=(k?'L':'M')+x(r.t)+','+y1(r.total*S.REP_TPS)}
    b+='<path d="'+pt+'" fill="none" stroke="var(--c1)" stroke-width="1.2" stroke-dasharray="4 3"/>';
    b+='<path d="'+pc+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    // panel 2: TTFT, log scale
    b+=RD.t(L,y2top-6,W<520?'Time to first token (log); dashed: 2 s':'Time to first token (log scale); dashed line: a 2 s target',{fs:fs,fill:'var(--mute)'});
    [0.1,1,10,100,1000].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y2(v)+'" y2="'+y2(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y2(v)+3.5,v<1?'0.1s':v+'s',{fs:fs-1,a:'end',fill:'var(--mute)'})});
    b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y2(2)+'" y2="'+y2(2)+'" stroke="var(--bad)" stroke-dasharray="5 4"/>';
    let p2='';for(let k=0;k<=upto;k++){const r=rows[k];p2+=(k?'L':'M')+x(r.t)+','+y2(r.ttft)}
    b+='<path d="'+p2+'" fill="none" stroke="var(--c4)" stroke-width="2"/>';
    if(rows[upto].ttft>2000)b+=RD.t(x(rows[upto].t)-4,y2(2000)+12,'off the chart',{fs:fs-1,a:'end',fill:'var(--bad)'});
    // time axis
    const yb=y2top+H2;[0,600,1200,1800,2400].forEach(t=>{b+=RD.t(x(t),yb+13,(t/60)+' min',{fs:fs-1,a:t===0?'start':t===2400?'end':'middle',fill:'var(--mute)'})});
    b+='<line x1="'+x(rows[upto].t)+'" x2="'+x(rows[upto].t)+'" y1="'+top+'" y2="'+yb+'" stroke="var(--ink)" stroke-width="1" opacity=".5"/>';
    svgEl.innerHTML=RD.svg(W,yb+18,b,'Demand and capacity in tokens per second, and time to first token, over 40 minutes under the selected autoscaling policy');
    caption(i);counters(i)}
  const A=RD.anim({card:'rd-as-card',ctl:'rd-as-ctl',n:N,draw,ms:420,label:'Time step'});
  RD.seg(document.getElementById('rd-as-seg'),m=>{mode=m;A.reset(N);A.play()});
  RD.onResize(()=>A.redraw());
  // summary table under the animation: all four policies
  const tb=document.getElementById('rd-as-sum');
  if(tb){let h='<table><thead><tr><th>Policy</th><th class="num">Worst TTFT</th><th class="num">Min over 2 s</th><th class="num">Max replicas</th><th class="num">GPU-hours</th></tr></thead><tbody>';
    const lab={cpu:'Before: CPU 60%',rps:'Before: requests/s',queue:'After: queue + KV cache',warm:'After + warm pool'};
    S.MODES.forEach(m=>{const s=S.summary(runs[m]);h+='<tr><td>'+lab[m]+'</td><td class="num">'+fmtS(s.worst_ttft)+'</td><td class="num">'+s.minutes_over_slo.toFixed(1)+'</td><td class="num">'+s.max_rep+'</td><td class="num">'+s.gpu_h.toFixed(1)+'</td></tr>'});
    tb.innerHTML=h+'</tbody></table>'}
})();
