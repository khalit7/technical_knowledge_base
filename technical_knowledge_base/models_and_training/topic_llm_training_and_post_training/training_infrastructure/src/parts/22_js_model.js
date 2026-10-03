// ---- Shared model: Llama 3 Table 5, the seeded failure day, the recovery simulation, the ETTR formula ----
// Mirrors recompute.py exactly (check_page.mjs compares the two).
window.IM=(function(){
  const T5=[["Faulty GPU","GPU",148],["GPU HBM3 Memory","GPU",72],["Software Bug","Dependency",54],["Network Switch/Cable","Network",35],
    ["Host Maintenance","Unplanned Maintenance",32],["GPU SRAM Memory","GPU",19],["GPU System Processor","GPU",17],["NIC","Host",7],
    ["NCCL Watchdog Timeouts","Unknown",7],["Silent Data Corruption","GPU",6],["GPU Thermal Interface + Sensor","GPU",6],["SSD","Host",3],
    ["Power Supply","Host",3],["Server Chassis","Host",2],["IO Expansion Board","Host",2],["Dependency","Dependency",2],["CPU","Host",2],["System Memory","Host",2]];
  const UNEXP=419,DAYS=54,GPUS=16384;
  const MTBF=DAYS*1440/UNEXP; // minutes between unexpected interruptions, Llama 3
  // mulberry32, identical to recompute.py's Rng
  function rng(seed){let s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return((t^(t>>>14))>>>0)/4294967296}}
  function failures(seed){const r=rng(seed),rate=UNEXP/DAYS/1440;let t=0;const fs=[];
    for(;;){t+=-Math.log(1-r())/rate;if(t>=1440)break;const x=r()*UNEXP;let acc=0,nm='';
      for(const [n,,c] of T5){acc+=c;nm=n;if(x<acc)break}fs.push([Math.round(t*10)/10,nm])}return fs}
  const SEED=119,FAILS=failures(SEED);
  const D={
    sync:{key:'sync',name:'Synchronous to storage',w:5,P:0,u:20},
    async:{key:'async',name:'Asynchronous (DCP async)',w:10/60,P:5,u:20},
    mem:{key:'mem',name:'In memory + hot spare',w:10/60,P:0,u:5},
    ft:{key:'ft',name:'Replica groups (torchft)',w:0,P:0,u:5,group:16}};
  Object.values(D).forEach(d=>{d.I=d.w>0?Math.sqrt(2*d.w*MTBF):null});
  // Event simulation in wall-clock minutes; records segments for drawing.
  function simulate(d,fails,T){T=T||1440;const segs=[],per=[];
    const add=(k,a,b,x)=>{if(b>a+1e-9)segs.push({k,a,b,x})};
    if(d.group){let useful=T,down=0;segs.push({k:'train',a:0,b:T});
      fails.forEach(([tf,c])=>{const dt=Math.min(d.u,T-tf);useful-=dt/d.group;down+=dt/d.group;segs.push({k:'grp',a:tf,b:tf+dt});per.push({t:tf,c,lost:0,down:dt/d.group,from:tf})});
      return {useful,lost:0,stall:0,down,segs,per}}
    const I=d.I,w=d.w,P=d.P,u=d.u;let t=0,p=0,c=0,cT=0,pending=null,fi=0,lost=0,stall=0,down=0,nextCk=I;
    const ckTimes=[];
    while(t<T-1e-9){const tf=fi<fails.length?fails[fi][0]:T+1;const tCk=t+(nextCk-p);const tEnd=Math.min(tf,tCk,T);
      if(pending&&pending.at<=tEnd&&pending.at<=tf){c=pending.p;cT=pending.wall;pending=null;
        segs.forEach(s=>{if(s.k==='train'&&s.b<=cT+1e-9)s.safe=1})}
      const seg={k:'train',a:t,b:tEnd};segs.push(seg);p+=tEnd-t;t=tEnd;
      if(t>=T-1e-9)break;
      if(Math.abs(t-tf)<1e-9||tf<=t){
        if(pending&&pending.at>tf)pending=null;
        const l=p-c;lost+=l;
        // recolour training since the last durable checkpoint as lost
        segs.forEach(s=>{if(s.k==='train'&&!s.safe&&s.a>=cT-1e-9&&s.b<=t+1e-9){s.k='lost';s.f=tf}});
        per.push({t:tf,c:fails[fi][1],lost:l,down:Math.min(u,T-t),from:cT});
        p=c;const dd=Math.min(u,T-t);add('down',t,t+dd);down+=dd;t+=dd;cT=t;fi++;nextCk=p+I;
        segs.forEach(s=>{if(s.k==='train'&&s.b<=t+1e-9)s.safe=1});
        while(fi<fails.length&&fails[fi][0]<t)fi++;continue}
      let dd=Math.min(w,T-t);
      if(fi<fails.length&&fails[fi][0]<t+dd){dd=fails[fi][0]-t;add('stall',t,t+dd);stall+=dd;t+=dd;continue}
      add('stall',t,t+dd);stall+=dd;t+=dd;ckTimes.push(t);
      if(P>0)pending={p,at:t+P,wall:t};else{c=p;cT=t;segs.forEach(s=>{if(s.k==='train'&&s.b<=t+1e-9)s.safe=1})}
      nextCk=p+I}
    return {useful:p,lost,stall,down,segs,per,ckTimes}}
  // Meta's long-job ETTR formula and the Young/Daly interval (minutes)
  const ettr=(mtbf,w,u0,dt)=>(1-(u0+dt/2)/mtbf)/(1+w/dt);
  const dtOpt=(mtbf,w)=>Math.sqrt(2*w*mtbf);
  const fmtMin=m=>{if(m<1)return Math.round(m*60)+' s';if(m<90)return (m<10?m.toFixed(1):Math.round(m))+' min';return (m/60).toFixed(m<600?1:0)+' h'};
  const clock=m=>{const h=Math.floor(m/60),mi=Math.floor(m%60);return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')};
  return {T5,UNEXP,DAYS,GPUS,MTBF,rng,failures,SEED,FAILS,D,simulate,ettr,dtOpt,fmtMin,clock};
})();
