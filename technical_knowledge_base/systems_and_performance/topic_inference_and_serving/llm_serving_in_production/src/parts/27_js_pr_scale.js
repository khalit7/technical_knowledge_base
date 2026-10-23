// ---- Reading tab, section 3 (moved from the Autoscaling lab): controls, the two-run chart animated over the half hour, and the summary table ----
(function(){
  const root=document.getElementById('sc-chart');if(!root)return;
  const D=window.PRD||{};const m1=D.cold_preset||null;
  const COLD=[
    ['m1',m1?m1.s:3,m1?m1.label:'M1 measured (missing data)','meas'],
    ['v30',44.5,'vLLM v0.30 engine init on H200, 8.2 s, plus 72.66 GB read at an assumed 2 GB/s, 36.3 s: 44.5 s','der'],
    ['v29',65.2,'Before v0.30: 28.9 s engine init plus the same 36.3 s: 65.2 s','der'],
    ['sg',35.6,'SGLang v0.5.18 overlapped loading, Qwen3-32B on H100: 35.6 s','vend'],
    ['sg0',84.8,'SGLang default before overlapping, same test: 84.8 s','vend'],
    ['node',300,'A new GPU node first (boot, driver, image pull): 5 minutes, assumed','ann']];
  const MET={util:['GPU utilization (busy share)',0.7,'%'],queue:['Waiting requests per replica',1,''],kv:['KV cache usage',0.8,'%'],ttft:['p90 TTFT over the SLO',1,'x']};
  const BASE={seed:7,T:1800,base:6,spike:3,t_spike:600,dur:600,slots:32,prefill:0.4235,out:300,tpot:0.0468,slo:1.05,init:3,min_r:1,max_r:16,period:15,down_window:300,tol:0.1};
  const cfg={a:{metric:'util',target:0.7,cold:'v30',win:300},b:{metric:'queue',target:1,cold:'v30',win:300}};
  const traffic={base:6,spike:3,dur:600};
  const coldS=k=>COLD.find(c=>c[0]===k)[1];
  function runPanel(id,k){
    const el=document.getElementById(id),c=cfg[k];
    el.innerHTML='<label>Scale on <select data-k="metric">'+Object.keys(MET).map(m=>'<option value="'+m+'"'+(m===c.metric?' selected':'')+'>'+MET[m][0]+'</option>').join('')+'</select></label>'+
      '<label>Target <select data-k="target"></select></label>'+
      '<label>Cold start <select data-k="cold">'+COLD.map(x=>'<option value="'+x[0]+'"'+(x[0]===c.cold?' selected':'')+'>'+RD.esc(x[2])+'</option>').join('')+'</select></label>'+
      '<label>Scale-down window <select data-k="win">'+[30,120,300,600].map(v=>'<option value="'+v+'"'+(v===c.win?' selected':'')+'>'+v+' s</option>').join('')+'</select></label>';
    const tg=el.querySelector('[data-k=target]');
    function fillT(){const m=c.metric;const opts=m==='util'||m==='kv'?[0.5,0.6,0.7,0.8,0.9]:m==='queue'?[0.25,0.5,1,2,4,8]:[0.5,0.75,1,1.5];
      if(!opts.includes(c.target))c.target=MET[m][1];
      tg.innerHTML=opts.map(v=>'<option value="'+v+'"'+(v===c.target?' selected':'')+'>'+(MET[m][2]==='%'?Math.round(v*100)+'%':v+(MET[m][2]==='x'?' (p90 = '+v+' x SLO)':' per replica'))+'</option>').join('')}
    fillT();
    el.addEventListener('change',e=>{const s=e.target;const kk=s.dataset.k;if(!kk)return;
      c[kk]=kk==='metric'||kk==='cold'?s.value:+s.value;if(kk==='metric'){c.target=MET[c.metric][1];fillT()}
      document.querySelectorAll('#sc-pre button').forEach(b=>b.classList.remove('on'));recompute()});
  }
  function trafficPanel(){
    const el=document.getElementById('sc-traffic');
    el.innerHTML='<label>Base traffic <b id="sc-bv"></b><input type="range" id="sc-base" min="2" max="12" step="1" value="'+traffic.base+'"></label>'+
      '<label>Spike <b id="sc-sv"></b><input type="range" id="sc-spike" min="1" max="5" step="0.5" value="'+traffic.spike+'"></label>'+
      '<label>Spike length <b id="sc-dv"></b><input type="range" id="sc-dur" min="60" max="900" step="60" value="'+traffic.dur+'"></label>';
    const lab=()=>{document.getElementById('sc-bv').textContent=traffic.base+' requests/s';document.getElementById('sc-sv').textContent='x'+traffic.spike+' ('+(traffic.base*traffic.spike)+'/s)';document.getElementById('sc-dv').textContent=traffic.dur+' s'};
    lab();
    [['sc-base','base'],['sc-spike','spike'],['sc-dur','dur']].forEach(([id,k])=>document.getElementById(id).addEventListener('input',e=>{traffic[k]=+e.target.value;lab();clearTimeout(tm);tm=setTimeout(recompute,120)}));
  }
  let tm=0,R={};
  function params(k){const c=cfg[k];return Object.assign({},BASE,{base:traffic.base,spike:traffic.spike,dur:traffic.dur,metric:c.metric,target:c.target,cold:coldS(c.cold),down_window:c.win})}
  function recompute(){R.a=PRSIM.run(params('a'));R.b=PRSIM.run(params('b'));table();A.reset(R.a.series.length+1);A.go(R.a.series.length);A.redraw()}
  const capPerRep=BASE.slots/(BASE.prefill+BASE.out*BASE.tpot);
  function draw(i){
    if(!R.a)return;
    const el=document.getElementById('sc-chart'),w=RD.width(el),padL=34,padR=8,h1=150,h2=120,gap=34,H=h1+gap+h2+46;
    const S=R.a.series,n=S.length,T=BASE.T,x=t=>padL+(w-padL-padR)*t/T;
    const ymax=Math.max(17,Math.ceil(traffic.base*traffic.spike/capPerRep)+2),y1=v=>18+h1*(1-v/ymax);
    let s='';
    for(let v=0;v<=ymax;v+=4){s+='<line x1="'+padL+'" x2="'+(w-padR)+'" y1="'+y1(v)+'" y2="'+y1(v)+'" stroke="var(--line)"/>'+RD.t(padL-4,y1(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'})}
    s+=RD.t(padL,11,'Replicas',{fs:10.5,fill:'var(--mute)'});
    // replicas needed for the arrival rate
    let pn='';S.forEach((p,j)=>{pn+=(j?'L':'M')+x(p.t).toFixed(1)+' '+y1(p.rate/capPerRep).toFixed(1)});s+='<path d="'+pn+'" fill="none" stroke="var(--dim)" stroke-width="5" opacity=".8"/>';
    const up=Math.min(i,n);
    [['a','var(--c1)'],['b','var(--c2)']].forEach(([k,col])=>{const ser=R[k].series;let p='',q='';
      for(let j=0;j<up;j++){const P=ser[j],t0=j?ser[j-1].t:0;p+=(j?'L':'M')+x(t0).toFixed(1)+' '+y1(P.ready).toFixed(1)+'L'+x(P.t).toFixed(1)+' '+y1(P.ready).toFixed(1);
        if(P.starting)q+='<rect x="'+x(t0).toFixed(1)+'" y="'+y1(P.ready+P.starting).toFixed(1)+'" width="'+Math.max(.5,x(P.t)-x(t0)).toFixed(1)+'" height="'+(y1(P.ready)-y1(P.ready+P.starting)).toFixed(1)+'" fill="'+col+'" opacity=".22"/>'}
      s+=q+'<path d="'+p+'" fill="none" stroke="'+col+'" stroke-width="2"/>'});
    // TTFT panel, log scale 0.3 s to 100 s
    const o2=18+h1+gap,lo=Math.log10(0.3),hi=Math.log10(100),y2=v=>o2+h2*(1-(Math.log10(Math.max(0.3,Math.min(100,v)))-lo)/(hi-lo));
    [0.3,1,3,10,30,100].forEach(v=>{s+='<line x1="'+padL+'" x2="'+(w-padR)+'" y1="'+y2(v)+'" y2="'+y2(v)+'" stroke="var(--line)"/>'+RD.t(padL-4,y2(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'})});
    s+=RD.t(padL,o2-10,'p90 TTFT per 15 s, seconds (log scale)',{fs:10.5,fill:'var(--mute)'});
    s+='<line x1="'+padL+'" x2="'+(w-padR)+'" y1="'+y2(BASE.slo)+'" y2="'+y2(BASE.slo)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    [['a','var(--c1)'],['b','var(--c2)']].forEach(([k,col])=>{const ser=R[k].series;let p='';for(let j=0;j<up;j++)p+=(j?'L':'M')+x(ser[j].t).toFixed(1)+' '+y2(ser[j].ttft_p90||0.3).toFixed(1);s+='<path d="'+p+'" fill="none" stroke="'+col+'" stroke-width="1.8"/>'});
    // spike band and time axis
    s='<rect x="'+x(BASE.t_spike)+'" y="4" width="'+(x(BASE.t_spike+traffic.dur)-x(BASE.t_spike))+'" height="'+(o2+h2-4)+'" fill="var(--hl)" opacity=".45"/>'+s;
    for(let t=0;t<=T;t+=300)s+=RD.t(x(t),o2+h2+14,(t/60)+' min',{a:t===0?'start':t===T?'end':'middle',fs:10,fill:'var(--mute)'});
    if(up<n){const tc=S[Math.max(0,up-1)].t;s+='<line x1="'+x(tc)+'" x2="'+x(tc)+'" y1="4" y2="'+(o2+h2)+'" stroke="var(--ink)" stroke-dasharray="2 2"/>'}
    el.innerHTML=RD.svg(w,H,s,'Replicas and TTFT over half an hour for two autoscalers');
    const cap=document.getElementById('sc-cap'),j=Math.max(0,up-1),a=R.a.series[j],b=R.b.series[j];
    const ph=a.t<BASE.t_spike?'before the spike':a.t<BASE.t_spike+traffic.dur?'during the spike':'after the spike';
    cap.innerHTML='<div class="t">'+(up===0?'Press play: 30 minutes in 15-second steps':'Minute '+(a.t/60).toFixed(1)+', '+ph+' ('+a.rate.toFixed(1)+' requests/s arrived in the last 15 s)')+'</div>'+
      (up?'<div>A: '+a.ready+' serving'+(a.starting?', '+a.starting+' starting':'')+', '+a.waiting+' waiting, metric '+fmtM('a',a.metric)+', p90 TTFT '+a.ttft_p90.toFixed(2)+' s. B: '+b.ready+' serving'+(b.starting?', '+b.starting+' starting':'')+', '+b.waiting+' waiting, metric '+fmtM('b',b.metric)+', p90 TTFT '+b.ttft_p90.toFixed(2)+' s.</div>':'');
  }
  const fmtM=(k,v)=>{const m=cfg[k].metric;return MET[m][2]==='%'?Math.round(v*100)+'%':v.toFixed(2)};
  function table(){
    const rows=[['TTFT p50',r=>r.ttft_p50.toFixed(2)+' s'],['TTFT p99',r=>r.ttft_p99.toFixed(1)+' s'],['Requests within the 1.05 s TTFT SLO',r=>(r.slo_ok*100).toFixed(1)+'%'],
      ['Replica-hours (GPU-hours) in 30 min',r=>r.replica_hours.toFixed(2)],['Most replicas at once',r=>r.peak]];
    document.getElementById('sc-tab').innerHTML='<tr><th></th><th class="num">A<br><small>'+MET[cfg.a.metric][0]+'</small></th><th class="num">B<br><small>'+MET[cfg.b.metric][0]+'</small></th></tr>'+
      rows.map(([n,f])=>'<tr><td>'+n+'</td><td class="num">'+f(R.a)+'</td><td class="num">'+f(R.b)+'</td></tr>').join('');
  }
  const PRE={'util-queue':{a:{metric:'util',target:0.7,cold:'v30',win:300},b:{metric:'queue',target:1,cold:'v30',win:300}},
    cold:{a:{metric:'queue',target:1,cold:'sg0',win:300},b:{metric:'queue',target:1,cold:'sg',win:300}},
    'kv-ttft':{a:{metric:'kv',target:0.8,cold:'v30',win:300},b:{metric:'ttft',target:1,cold:'v30',win:300}},
    window:{a:{metric:'queue',target:1,cold:'v30',win:300},b:{metric:'queue',target:1,cold:'v30',win:30}}};
  document.getElementById('sc-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    document.querySelectorAll('#sc-pre button').forEach(x=>x.classList.toggle('on',x===b));
    const P=PRE[b.dataset.p];Object.assign(cfg.a,P.a);Object.assign(cfg.b,P.b);runPanel('sc-a','a');runPanel('sc-b','b');recompute()});
  const A=RD.anim({card:'sc-card',ctl:'sc-ctl',n:121,draw,ms:180,label:'Time step'});
  runPanel('sc-a','a');runPanel('sc-b','b');trafficPanel();
  RD.onRender(()=>{if(!R.a)recompute();else A.redraw()});
  RD.onResize(()=>A.redraw());
  window.PR_SC={get R(){return R},recompute};
})();
