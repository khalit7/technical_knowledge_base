// ---- Reading: logs, metrics, percentiles, PromQL, cardinality (all numbers from window.DEMO, the real run) ----
(function(){
  const D=window.DEMO,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  // ---------- logs ----------
  const errLines=D.xlogs[D.highlight.error];
  const first=errLines.find(l=>l.indexOf('"level":"ERROR"')>=0);
  const pretty=l=>JSON.stringify(JSON.parse(l),null,1).replace(/\n\s*/g,' ');
  $('lg-one').innerHTML='<div class="e">'+esc(first)+'</div>';
  $('lg-in').textContent='log.error("request failed: retrieval timed out",\n  extra={"fields": {\n    "request_id": "13fcf2b4093b4b45",\n    "status": 503,\n    "user": "user17@example.com",\n    "auth": "Bearer sk-demo-04127753"}})\n\n(values of this shape; the originals were never\nwritten anywhere, which is the point)';
  const o=JSON.parse(first);
  $('lg-out').textContent=JSON.stringify({request_id:o.request_id,status:o.status,user:o.user,auth:o.auth},null,1);
  $('lg-stream').innerHTML=D.stream.map(l=>'<div class="'+(l.indexOf('"level":"ERROR"')>=0?'e':'')+'" title="'+esc(l)+'">'+esc(LOGC(l))+'</div>').join('');
  // log cost
  const la=D.log_bytes.chat_api_avg_line,lr=D.log_bytes.retrieval_avg_line,N=10e6;
  const gbd=N*(la+lr)/1e9,gbm=gbd*30,lines=2*N*30;
  window.OBS_COST={gbd,gbm,lines,ing:gbm*0.10,idx:lines/1e6*1.70};
  $('lc-a').textContent=fmt(la);$('lc-r').textContent=fmt(lr);$('lc-gb').textContent=fmt(gbd,1);$('lc-gbm').textContent=fmt(gbm);
  $('lc-ing').textContent='$'+fmt(gbm*0.10);$('lc-idx').textContent=fmt(lines/1e6)+' million';$('lc-idxc').textContent='$'+fmt(lines/1e6*1.70);

  // ---------- exposition text ----------
  $('mx-text').textContent=D.metrics_text.join('\n');

  // ---------- percentiles: the real distribution per phase ----------
  const win={normal:[28,88],incident:[118,178]};
  function phaseReqs(ph){const a=win[ph][0],b=win[ph][1],out=[];
    for(let i=0;i<D.reqs.length;i+=3){const t=D.reqs[i],ms=D.reqs[i+1],s=D.reqs[i+2];const e=t+ms/1000;if(e>=a&&e<b)out.push({ms,s})}return out}
  // nearest-rank percentile, the same rule as src/demo/analyze.py
  const pct=(xs,p)=>{const s=xs.slice().sort((a,b)=>a-b);const i=Math.max(0,Math.min(s.length-1,Math.round(p*s.length+0.5)-1));return s[i]};
  window.OBS_PCT={phaseReqs,pct};
  let ph='normal';
  function drawPc(){
    const rs=phaseReqs(ph),ms=rs.map(r=>r.ms),n=ms.length;
    const avg=ms.reduce((a,b)=>a+b,0)/n,p50=pct(ms,.5),p99=pct(ms,.99),slow=ms.filter(v=>v>800).length,err=rs.filter(r=>r.s>=500).length;
    const el=$('pc-dist'),W=RD.width(el),H=190,L=34,R=10,T=26,B=26,X1=1600,bw=25;
    const bins=new Array(X1/bw).fill(0);ms.forEach(v=>{bins[Math.min(bins.length-1,Math.floor(v/bw))]++});
    const ymax=Math.max(...bins),xs=v=>L+(W-L-R)*v/X1,ys=v=>T+(H-T-B)*(1-v/ymax);
    let b='';bins.forEach((c,i)=>{if(c)b+='<rect x="'+xs(i*bw).toFixed(1)+'" y="'+ys(c).toFixed(1)+'" width="'+Math.max(1,xs(bw)-xs(0)-1).toFixed(1)+'" height="'+(H-B-ys(c)).toFixed(1)+'" fill="var(--c1)" opacity=".75"/>'});
    for(let v=0;v<=X1;v+=400)b+=RD.t(xs(v),H-8,v+' ms',{a:v===X1?'end':'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t(L-4,T+4,ymax,{a:'end',fs:10,fill:'var(--mute)'})+RD.t(L-4,H-B,'0',{a:'end',fs:10,fill:'var(--mute)'});
    const mk=(v,c,lab,row)=>'<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="'+(T-4)+'" y2="'+(H-B)+'" stroke="'+c+'" stroke-width="2"/>'+RD.t(Math.min(W-R-2,xs(v)+3),T-8+row*11,lab,{fs:10.5,fill:c,a:xs(v)>W-90?'end':'start'});
    b+=mk(p50,'var(--good)','p50',0)+mk(avg,'var(--c5)','avg',1)+mk(p99,'var(--bad)','p99',0);
    el.innerHTML=RD.svg(W,H,b,'Latency distribution, '+ph+' phase');
    $('pc-stats').innerHTML=RD.stat('Average',fmt(avg)+' ms','sum / count')+RD.stat('p50 (median)',fmt(p50)+' ms','half are faster')+
      RD.stat('p99',fmt(p99)+' ms','99% are faster')+RD.stat('Over 800 ms',fmt(slow)+' of '+fmt(n),fmt(100*slow/n,1)+'%')+RD.stat('Errors (503)',fmt(err),'timed out at 1 s');
    const nm=D.exact.normal,ic=D.exact.incident;
    $('pc-note').textContent='Each bar counts requests in a 25 ms band; '+fmt(n)+' requests finished in the last 60 s of the '+ph+' phase. From normal to incident: average '+fmt(nm.avg*1000)+' to '+fmt(ic.avg*1000)+' ms (+'+fmt(100*(ic.avg/nm.avg-1))+'%), p50 '+fmt(nm.p50*1000)+' to '+fmt(ic.p50*1000)+' ms (+'+fmt(100*(ic.p50/nm.p50-1))+'%), p99 '+fmt(nm.p99*1000)+' to '+fmt(ic.p99*1000)+' ms ('+fmt(ic.p99/nm.p99,1)+'x).';
  }
  RD.seg($('pc-seg'),m=>{ph=m;drawPc()});

  // ---------- histogram_quantile, step by step ----------
  const bk=D.buckets_incident.filter(b=>isFinite(b[0])),inf=D.buckets_incident.find(b=>!isFinite(b[0]));
  const total=inf[1];
  function hq(phi){ // Prometheus' classic histogram_quantile on cumulative buckets
    const rank=phi*total;let b=bk.findIndex(x=>x[1]>=rank);
    if(b<0)return {est:bk[bk.length-1][0],b:bk.length,rank,lo:bk[bk.length-1][0],hi:Infinity,cp:bk[bk.length-1][1],cb:total};
    const lo=b===0?0:bk[b-1][0],cp=b===0?0:bk[b-1][1],hi=bk[b][0],cb=bk[b][1];
    return {est:lo+(hi-lo)*(rank-cp)/(cb-cp),b,rank,lo,hi,cp,cb};
  }
  window.OBS_HQ=hq;
  function drawHq(){
    const phi=+$('hq-p').value/1000;$('hq-pv').textContent=phi.toFixed(3);
    const r=hq(phi),el=$('hq-chart'),W=RD.width(el),H=180,L=40,R=12,T=14,B=28,X1=2.5;
    const xs=v=>L+(W-L-R)*v/X1;const per=bk.map((x,i)=>x[1]-(i?bk[i-1][1]:0));const ym=Math.max(...per),ys=v=>T+(H-T-B)*(1-v/ym);
    let b='';bk.forEach((x,i)=>{const lo=i?bk[i-1][0]:0;b+='<rect x="'+xs(lo).toFixed(1)+'" y="'+ys(per[i]).toFixed(1)+'" width="'+Math.max(1,xs(x[0])-xs(lo)-1).toFixed(1)+'" height="'+(H-B-ys(per[i])).toFixed(1)+'" fill="'+(i===r.b?'var(--c5)':'var(--c1)')+'" opacity="'+(i===r.b?.9:.45)+'"/>'+
      (per[i]>0?RD.t((xs(lo)+xs(x[0]))/2,ys(per[i])-3,fmt(per[i],1),{a:'middle',fs:10}):'')});
    bk.forEach(x=>{if(x[0]<=X1&&(x[0]>=0.25))b+=RD.t(xs(x[0]),H-14,x[0]+'',{a:'middle',fs:9.5,fill:'var(--mute)'})});
    b+=RD.t(W-R,H-2,'le (seconds)',{a:'end',fs:10,fill:'var(--mute)'});
    if(isFinite(r.est))b+='<line x1="'+xs(r.est)+'" x2="'+xs(r.est)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--bad)" stroke-width="2"/>'+RD.t(xs(r.est)+(xs(r.est)>W-120?-4:4),T+10,'estimate '+r.est.toFixed(3)+' s',{fs:10.5,fill:'var(--bad)',a:xs(r.est)>W-120?'end':'start'});
    el.innerHTML=RD.svg(W,H,b,'Bucket counts in the incident minute');
    $('hq-eq').innerHTML=r.b>=bk.length?'rank '+r.rank.toFixed(1)+' is in the +Inf bucket: Prometheus returns '+r.est+' s':
      r.lo+' + ('+r.hi+' &minus; '+r.lo+') &times; ('+r.rank.toFixed(1)+' &minus; '+fmt(r.cp,1)+') / ('+fmt(r.cb,1)+' &minus; '+fmt(r.cp,1)+') = <b>'+r.est.toFixed(3)+' s</b>';
    const ms=phaseReqs('incident').map(x=>x.ms),ex=pct(ms,phi)/1000;
    $('hq-cmp').innerHTML='rank = &phi; &times; total = '+phi.toFixed(3)+' &times; '+fmt(total,1)+' = '+r.rank.toFixed(1)+' (counts are fractional because <code>increase()</code> extrapolates to the window edges). The highlighted bucket holds that rank. Exact value from the load generator\'s record of the same minute: <b>'+ex.toFixed(3)+' s</b>; estimate minus exact = '+(r.est-ex>=0?'+':'')+(r.est-ex).toFixed(3)+' s.';
  }
  $('hq-p').addEventListener('input',drawHq);

  // ---------- PromQL table ----------
  const QS=[['Requests per second','rps',v=>fmt(v,1)+'/s'],['Average latency','avg',v=>fmt(v*1000)+' ms'],['Median latency (p50)','p50',v=>fmt(v*1000)+' ms'],
    ['p99 latency','p99',v=>fmt(v*1000)+' ms'],['Share of requests failing','err',v=>fmt(100*v,1)+'%'],['p99 of calls to retrieval','dep_p99',v=>fmt(v*1000)+' ms']];
  $('pq-table').querySelector('tbody').innerHTML=QS.map(q=>{const a=D.inst.normal[q[1]],b=D.inst.incident[q[1]];
    return '<tr><td>'+q[0]+'</td><td><code style="font-size:11.5px;overflow-wrap:anywhere">'+esc(D.queries[q[1]].replace(/\[30s\]/g,'[1m]'))+'</code></td><td class="num">'+(a==null?'no series yet':q[2](a))+'</td><td class="num">'+(b==null?'none':q[2](b))+'</td></tr>'}).join('');

  // ---------- cardinality ----------
  let extra=1;
  function drawCd(){
    const r=+$('cd-r').value,s=+$('cd-s').value,i=+$('cd-i').value,b=+$('cd-b').value;
    $('cd-rv').textContent=r;$('cd-sv').textContent=s;$('cd-iv').textContent=i;$('cd-bv').textContent=b;
    const series=(b+2)*r*s*i*extra,sps=series/15,gb=sps*86400*1.5/1e9;
    $('cd-out').innerHTML=RD.stat('Time series',fmt(series),'for one histogram')+RD.stat('Samples per second',fmt(sps),'at a 15 s scrape')+RD.stat('Disk per day',gb<1?fmt(gb*1000,1)+' MB':fmt(gb,1)+' GB','at 1.5 bytes per sample')+
      RD.stat('Our demo exposed',fmt(D.series_exposed_total),'series in total, runtime metrics included');
  }
  ['cd-r','cd-s','cd-i','cd-b'].forEach(id=>$(id).addEventListener('input',drawCd));
  RD.seg($('cd-seg'),m=>{extra=+m;drawCd()});
  window.OBS_CARD=(b,r,s,i,x)=>(b+2)*r*s*i*x;

  RD.onRender(()=>{drawPc();drawHq();drawCd()});
  RD.onResize(()=>{drawPc();drawHq()});
  drawPc();drawHq();drawCd();
})();
