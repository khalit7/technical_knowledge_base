// ---- Reading section 7: two clients through FCFS, VTC and priority (data: BKD.sch.fair, from src/sched/gen_sched.py) ----
(function(){
  const el=document.getElementById('bk-fa-svg');if(!el)return;
  const F=BKD.sch.fair;let sc=0,pol='fcfs';
  const NM={fcfs:'FCFS',vtc:'VTC',priority:'Priority (B first)'},CL=['var(--c2)','var(--c1)'];
  const T=()=>Math.max(...['fcfs','vtc','priority'].map(p=>F[sc].pol[p].series[0].length));
  function draw(i){
    const P=F[sc].pol[pol],nT=T(),t1=Math.min(nT,(i+1)*2);
    const W=Math.max(300,Math.min(860,RD.width(el))),L=44,R=8,h1=150,h2=110,g=26,H=h1+g+h2+24;
    const x=t=>L+(W-L-R)*t/nT;
    const ylo=Math.log10(0.01),yhi=Math.log10(60),y1=v=>20+(h1-20)*(1-(Math.log10(Math.max(0.01,v))-ylo)/(yhi-ylo));
    let b='';
    [0.01,0.1,1,10].forEach(v=>{const y=y1(v);b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+4,v>=1?v+' s':(v*1000)+' ms',{a:'end',fs:10,fill:'var(--mute)'})});
    b+=RD.t(L,11,'TTFT of each request, by arrival time',{fs:10.5,fill:'var(--mute)'});
    P.per.forEach((c,k)=>c.pts.forEach(p=>{if(p[0]<=t1)b+='<circle cx="'+x(p[0]).toFixed(1)+'" cy="'+y1(p[1]).toFixed(1)+'" r="2.3" fill="'+CL[k]+'" opacity="0.75"/>'}));
    // service per second, stacked
    const top=h1+g,s=P.series,mx=Math.max(...['fcfs','vtc','priority'].map(p=>Math.max(...F[sc].pol[p].series[0].map((v,j)=>v+(F[sc].pol[p].series[1][j]||0)))));
    b+=RD.t(L,top-4,'service per second (weighted tokens)',{fs:10.5,fill:'var(--mute)'});
    const bw=(W-L-R)/nT;
    for(let j=0;j<Math.min(t1,s[0].length);j++){let y=top+h2;[0,1].forEach(k=>{const v=s[k][j]||0,hh=h2*v/mx;y-=hh;b+='<rect x="'+(L+j*bw).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0.5,bw-0.6).toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="'+CL[k]+'" opacity="0.8"/>'})}
    b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(top+h2)+'" y2="'+(top+h2)+'" stroke="var(--line)"/>';
    for(let t=0;t<=nT;t+=10)b+=RD.t(x(t),top+h2+14,t+' s',{a:x(t)>W-R-14?'end':'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t(L-4,top+10,Math.round(mx/1000)+'k',{a:'end',fs:10,fill:'var(--mute)'});
    b+='<line x1="'+x(t1)+'" x2="'+x(t1)+'" y1="18" y2="'+(top+h2)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    el.innerHTML=RD.svg(W,H,b,'two clients, queue policy');
    // counters for requests that arrived by t1
    const st=P.per.map(c=>{const a=c.pts.filter(p=>p[0]<=t1).map(p=>p[1]).sort((u,v)=>u-v);return a.length?a[Math.floor(a.length/2)]:0});
    const sv=[0,1].map(k=>s[k].slice(0,t1).reduce((u,v)=>u+v,0));
    const fmt=v=>v>=1?v.toFixed(1)+' s':(v*1000).toFixed(0)+' ms';
    document.getElementById('bk-fa-cnt').innerHTML=RD.stat('Median TTFT so far, A',fmt(st[0]))+RD.stat('Median TTFT so far, B',fmt(st[1]))+RD.stat('B\'s share of service so far',(100*sv[1]/Math.max(1,sv[0]+sv[1])).toFixed(0)+'%')+RD.stat('Whole run, median TTFT A / B',fmt(P.per[0].ttft_p50)+' / '+fmt(P.per[1].ttft_p50));
    const msg={fcfs:'First come, first served: B\'s requests queue behind A\'s backlog, so B waits as long as A does, and its share of service is its share of arrivals.',
      vtc:'VTC admits the earliest request of whichever client has received the least weighted service. '+(sc===0?'B is far below its fair half, so its requests go first and wait almost nothing; A gets everything B does not use.':'Both clients want more than half; their counters chase each other and service is split evenly while both have work waiting.'),
      priority:'B\'s requests carry the better priority, so they always go first. '+(sc===0?'With B light, this looks like VTC.':'With B heavy, A gets only what B leaves: strict priority starves the lower class.')};
    document.getElementById('bk-fa-cap').innerHTML='<div class="t">'+NM[pol]+', first '+t1+' s</div><p>'+msg[pol]+'</p>';
  }
  const nSteps=()=>Math.ceil(T()/2);
  const an=RD.anim({card:'bk-fa-card',ctl:'bk-fa-ctl',n:nSteps(),draw:draw,ms:700,label:'Time'});
  RD.seg(document.getElementById('bk-fa-sc'),m=>{sc=+m;an.reset(nSteps())});
  RD.seg(document.getElementById('bk-fa-pol'),m=>{pol=m;an.redraw()});
  RD.onResize(()=>an.redraw());
})();
