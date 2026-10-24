// ---- Reading: the hero (one slow request as a histogram count and a trace), averaged percentiles, the OpenTelemetry path ----
// All numbers from window.DEMO (the real run, src/inputs) and DEMO.avgpct (src/avgpct.py). Static figures: nothing moves.
(function(){
  if(!document.getElementById('hd-card'))return;
  const D=window.DEMO,$=id=>document.getElementById(id),T=RD.t;
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const slow=D.traces.find(t=>t.id===D.highlight.slow);

  // hero, metrics: non-cumulative bucket counts of the incident minute, the slow request's bucket ringed
  function heroMet(){
    const el=$('hd-met'),W=RD.width(el),H=112,L=6,R=8,TP=16,B=22;
    const bk=D.buckets_incident.filter(b=>isFinite(b[0])&&b[0]<=1.5);
    const per=bk.map((b,i)=>[i?bk[i-1][0]:0,b[0],b[1]-(i?bk[i-1][1]:0)]);
    const X1=1.5,xs=v=>L+(W-L-R)*v/X1,ym=Math.max(...per.map(p=>p[2])),ys=v=>TP+(H-TP-B)*(1-v/ym);
    let b='';
    per.forEach(p=>{if(p[1]<=0.1)return;const hit=p[0]===1.0;
      b+='<rect x="'+(xs(p[0])+.5).toFixed(1)+'" y="'+ys(p[2]).toFixed(1)+'" width="'+Math.max(1,xs(p[1])-xs(p[0])-1).toFixed(1)+'" height="'+(H-B-ys(p[2])).toFixed(1)+'" fill="'+(hit?'var(--bad)':'var(--c1)')+'" opacity="'+(hit?.85:.5)+'"/>';
      if(p[2]>0.5)b+=T((xs(p[0])+xs(p[1]))/2,ys(p[2])-3,fmt(p[2]),{a:'middle',fs:11});
      if(hit)b+='<circle cx="'+((xs(p[0])+xs(p[1]))/2).toFixed(1)+'" cy="'+(ys(p[2])+12).toFixed(1)+'" r="5" fill="var(--bg)" stroke="var(--ink)" stroke-width="2"/>'});
    [0.25,0.5,1,1.5].forEach(v=>{b+=T(xs(v),H-6,v+(v===1.5?' s':''),{a:v===1.5?'end':'middle',fs:11,fill:'var(--mute)'})});
    b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="var(--line)"/>';
    el.innerHTML=RD.svg(W,H,b,'Latency histogram of the incident minute; the slow request is in the 1 to 1.5 second bucket');
  }
  // hero, traces: the slow trace's main spans, one label line and one bar each
  function heroTr(){
    const el=$('hd-tr'),W=RD.width(el),L=4,R=6,RH=21;
    const pick=[['POST /v1/chat','POST /v1/chat','var(--c1)'],['GET retrieval /search','call retrieval','var(--c1)'],['vector index lookup','vector index lookup (r3-cold, retrieval)','var(--bad)'],['model call (simulated)','model call','var(--c1)']];
    const end=slow.dur,xs=v=>L+(W-L-R)*v/end;let b='',y=2;
    pick.forEach(p=>{const s=slow.sp.find(x=>x[0]===p[0]);if(!s)return;
      b+=T(L,y+11,p[1]+': '+fmt(s[4])+' ms',{fs:11,fill:p[2]==='var(--bad)'?'var(--bad)':'var(--ink)'});
      b+='<rect x="'+xs(s[3]).toFixed(1)+'" y="'+(y+14)+'" width="'+Math.max(1,xs(s[3]+s[4])-xs(s[3])).toFixed(1)+'" height="5" rx="1" fill="'+p[2]+'"/>';y+=RH+4});
    el.innerHTML=RD.svg(W,y+2,b,'The slow request as a trace: most of its time in one retrieval span');
  }
  // averaged percentiles: three replicas' p99s, their mean, and the pooled p99's lower bound
  function avgP(){
    const el=$('ap-chart');if(!el)return;const A=D.avgpct.replicas,W=RD.width(el),L=64,R=12,TP=30,RH=26,H=TP+A.parts.length*RH+26;
    const X1=1600,xs=v=>L+(W-L-R)*v/X1;let b='';
    b+='<rect x="'+xs(A.pooled_lower_bound).toFixed(1)+'" y="'+(TP-6)+'" width="'+(xs(X1)-xs(A.pooled_lower_bound)).toFixed(1)+'" height="'+(A.parts.length*RH+6)+'" fill="var(--good)" opacity=".12"/>';
    A.parts.forEach((p,i)=>{const y=TP+i*RH;b+=T(L-6,y+14,p.label,{a:'end',fs:11});
      b+='<rect x="'+L+'" y="'+(y+3)+'" width="'+Math.max(1,xs(p.p99)-L).toFixed(1)+'" height="14" fill="'+(p.label==='r3-cold'?'var(--bad)':'var(--c1)')+'" opacity=".8"/>';
      const lab='p99 '+fmt(p.p99,1)+' ms',xe=xs(p.p99);b+=T(xe+4>W-90?xe-4:xe+4,y+14,lab,{a:xe+4>W-90?'end':'start',fs:11,fill:xe+4>W-90?'var(--bg)':'var(--ink)'})});
    const xm=xs(A.mean_of_p99);
    b+='<line x1="'+xm+'" x2="'+xm+'" y1="'+(TP-6)+'" y2="'+(TP+A.parts.length*RH)+'" stroke="var(--c5)" stroke-width="2" stroke-dasharray="5 3"/>';
    b+=T(xm,TP-12,'mean of p99s: '+fmt(A.mean_of_p99,1)+' ms',{a:xm>W/2?'end':'middle',fs:11,fill:'var(--c5)',w:600});
    b+=T(W-R,TP+A.parts.length*RH+16,'true p99 of all '+A.n+': &#8805; '+fmt(A.pooled_lower_bound,1)+' ms (shaded)',{a:'end',fs:11,fill:'var(--good)'});
    [0,500,1000,1500].forEach(v=>{b+='<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="'+(TP-2)+'" y2="'+(TP+A.parts.length*RH)+'" stroke="var(--line)"/>'});
    el.innerHTML=RD.svg(W,H,b,'Three replicas p99, their mean, and the pooled p99');
  }
  // OpenTelemetry path, from src/demo/otelcol.yaml: services -> OTLP -> collector (receivers, processors, exporters) -> stores
  function otel(){
    const el=$('ot-chart');if(!el)return;const W=RD.width(el),wide=W>=640;
    const box=(x,y,w,h,title,lines,c)=>{let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+(c||'var(--line)')+'" stroke-width="1.4"/>'+T(x+8,y+16,title,{fs:12,w:700,fill:c||'var(--ink)'});
      lines.forEach((l,i)=>{s+=T(x+8,y+32+i*15,l,{fs:11,fill:'var(--mute)'})});return s};
    const arr=(x1,y1,x2,y2,lab)=>{const a=Math.atan2(y2-y1,x2-x1),h=6;
      return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--ink)" stroke-width="1.3"/><path d="M'+x2+' '+y2+'L'+(x2-h*Math.cos(a-.45))+' '+(y2-h*Math.sin(a-.45))+'L'+(x2-h*Math.cos(a+.45))+' '+(y2-h*Math.sin(a+.45))+'Z" fill="var(--ink)"/>'+(lab?T((x1+x2)/2+(y1===y2?0:6),(y1+y2)/2-(y1===y2?5:0),lab,{a:y1===y2?'middle':'start',fs:11,fill:'var(--mute)'}):'')};
    const sv=['service: chat-api, retrieval','API: start_as_current_span','SDK: sample, batch, export'];
    const proc=['receivers: otlp','processors: memory_limiter,','  tail_sampling (traces), batch','exporters: one per store'];
    const st=[['Tempo','traces'],['Prometheus','metrics (remote write)'],['Loki','logs']];
    let b='',H;
    if(wide){
      const c1=Math.round(W*0.27),c2=Math.round(W*0.33),gap=Math.round((W-c1-c2-Math.round(W*0.22)-4)/2),c3=W-c1-c2-2*gap-4;
      const x2=c1+gap,x3=x2+c2+gap;H=150;
      b+=box(0,30,c1,80,'Each service',sv,'var(--c1)');
      b+=box(x2,22,c2,96,'OpenTelemetry Collector',proc,'var(--c3)');
      st.forEach((s,i)=>{b+=box(x3,6+i*48,c3,40,s[0],[s[1]])});
      b+=arr(c1+2,70,x2-2,70,'OTLP');b+=T((c1+x2)/2,86,':4317 / :4318',{a:'middle',fs:11,fill:'var(--mute)'});
      st.forEach((s,i)=>{b+=arr(x2+c2+2,70,x3-2,26+i*48)});
    }else{
      const w=W-2;let y=0;b+=box(0,y,w,78,'Each service',sv,'var(--c1)');y+=78;
      b+=arr(w/2,y+2,w/2,y+30,'OTLP :4317 gRPC, :4318 HTTP');y+=32;
      b+=box(0,y,w,94,'OpenTelemetry Collector',proc,'var(--c3)');y+=94;
      const bw=(w-12)/3;st.forEach((s,i)=>{b+=arr(w/2,y+2,i*(bw+6)+bw/2,y+28)});y+=30;
      st.forEach((s,i)=>{b+='<rect x="'+(i*(bw+6))+'" y="'+y+'" width="'+bw+'" height="40" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+T(i*(bw+6)+6,y+16,s[0],{fs:12,w:700})+T(i*(bw+6)+6,y+31,s[1].split(' ')[0],{fs:11,fill:'var(--mute)'})});
      H=y+42;
    }
    el.innerHTML=RD.svg(W,H,b,'The OpenTelemetry path: services, collector, stores');
  }
  function all(){heroMet();heroTr();avgP();otel()}
  RD.onRender(all);RD.onResize(all);all();
})();
