// ---- Reading: the two before/after animations (load balancing policies; a cache stampede) ----
(function(){
  const $=id=>document.getElementById(id);

  // ---------- 1. the same traffic through four balancing policies
  (function(){
    const NAMES={random:'Random',rr:'Round robin',p2c:'Power of two choices',lor:'Least outstanding'};
    const n=8,rho=0.9,FR=[];for(let i=0;i<=80;i++)FR.push(i*0.5);
    const runs={};
    function run(pol){if(runs[pol])return runs[pol];
      const r=CP.lbSim({n,rho,policy:pol,N:420,warm:0,seed:11,dist:'exp',frames:FR});
      // arrival and departure times, to count finished requests and their latencies at each frame
      const rnd=CP.mulberry32(11);let t=0;const lam=rho*n,arr=[];for(let j=0;j<420;j++){t+=-(1/lam)*Math.log(1-rnd());CP.service(rnd,'exp',1,2);arr.push(t)}
      const done=arr.map((a,j)=>[a+r.soj[j],r.soj[j]]);
      return runs[pol]={frames:r.frames,done}}
    let pol='random';
    function draw(i){const R=run(pol),q=R.frames[i]||R.frames[R.frames.length-1],tn=FR[i];
      const W=Math.max(290,Math.min(860,RD.width($('la-svg'))));const sq=W<480?9:12,gap=2,colw=(W-20)/n,maxs=Math.floor(200/(sq+gap));
      let b='';const base=220;
      for(let k=0;k<n;k++){const x=10+k*colw+(colw-sq)/2;
        b+='<rect x="'+(10+k*colw+2)+'" y="'+(base+2)+'" width="'+(colw-4)+'" height="16" rx="3" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(10+k*colw+colw/2,base+14,'S'+(k+1),{fs:10,a:'middle',fill:'var(--mute)'});
        const m=Math.min(q[k],maxs);
        for(let s=0;s<m;s++){const y=base-(s+1)*(sq+gap);b+='<rect x="'+x+'" y="'+y+'" width="'+sq+'" height="'+sq+'" rx="2" fill="'+(s===0?'var(--c3)':(q[k]>=6?'var(--bad)':'var(--c2)'))+'"/>'}
        if(q[k]>maxs)b+=RD.t(10+k*colw+colw/2,12,'+'+(q[k]-maxs),{fs:10,a:'middle',fill:'var(--bad)'});
        if(q[k]===0)b+=RD.t(10+k*colw+colw/2,base-6,'idle',{fs:9.5,a:'middle',fill:'var(--mute)'});
      }
      $('la-svg').innerHTML=RD.svg(W,base+22,b,'Requests at each of 8 servers under '+NAMES[pol]);
      $('la-leg').innerHTML=CH.leg([['var(--c3)','being served'],['var(--c2)','waiting'],['var(--bad)','waiting in a queue of 6 or more']]);
      const inSys=q.reduce((a,v)=>a+v,0),idle=q.filter(v=>v===0).length,waiting=q.reduce((a,v)=>a+Math.max(0,v-1),0),longest=Math.max(...q);
      const fin=R.done.filter(d=>d[0]<=tn).map(d=>d[1]).sort((a,b)=>a-b);
      const p99=fin.length?CP.pct(fin,.99):0,mean=fin.length?CP.mean(fin):0;
      // idle-while-waiting moments so far
      let wasted=0;for(let j=0;j<=i&&j<R.frames.length;j++){const f=R.frames[j];if(f.some(v=>v===0)&&f.some(v=>v>1))wasted++}
      $('la-cnt').innerHTML=RD.stat('Time',tn.toFixed(1),'in mean service times')+RD.stat('Waiting now',waiting,'requests queued behind a busy server')+RD.stat('Idle servers now',idle,'')+RD.stat('Longest queue',longest,'')+RD.stat('Finished so far',fin.length,'mean '+mean.toFixed(1)+' S, p99 '+p99.toFixed(1)+' S')+RD.stat('Snapshots with an idle server while others queue',wasted+' of '+(i+1),'');
      let cap;
      if(i===0)cap=['The same traffic, four ways to split it','All 8 servers start empty. Requests will arrive at random, 7.2 per mean service time on average (90% of what 8 servers can do), with the same arrival times and the same amount of work per request under every policy. Pick a policy above, then play.'];
      else if(idle>0&&waiting>0)cap=[NAMES[pol]+': idle servers while others queue','At t = '+tn.toFixed(1)+', '+idle+' server'+(idle>1?'s are':' is')+' idle while '+waiting+' request'+(waiting>1?'s wait':' waits')+' behind busy ones. '+(pol==='random'||pol==='rr'?'The balancer does not look at the queues, so it cannot avoid this.':'It happens less often: the balancer looks before it sends.')];
      else cap=[NAMES[pol],'At t = '+tn.toFixed(1)+': '+inSys+' requests in the servers, '+waiting+' of them waiting. '+(pol==='p2c'?'Each arrival looked at two random servers and joined the shorter queue.':pol==='lor'?'Each arrival joined the shortest queue of all eight.':pol==='rr'?'Each server gets every eighth request, regardless of how long its queue is.':'Each arrival went to a random server, regardless of its queue.')];
      if(i===FR.length-1)cap=['After 40 service times: '+NAMES[pol],'Finished requests: mean '+mean.toFixed(1)+' S, p99 '+p99.toFixed(1)+' S. Switch policy to replay the identical traffic; the lab tab runs 20,000 requests for stable percentiles.'];
      $('la-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
    }
    const A=RD.anim({card:'la-card',ctl:'la-ctl',n:FR.length,draw,ms:420,label:'Animation step'});
    RD.seg($('la-seg'),m=>{pol=m;A.reset(FR.length);A.play()});
    RD.onResize(()=>A.redraw());
  })();

  // ---------- 2. one hot key expiring, three defences
  (function(){
    const NAMES={none:'No protection',coalesce:'Request coalescing',xfetch:'XFetch early refresh'};
    const RATE=200,REC=0.3,HZ=2,FR=[];for(let i=0;i<=40;i++)FR.push(i*0.05);
    const runs={};const run=m=>runs[m]||(runs[m]=CP.stampede(m,RATE,REC,HZ,5));
    let mode='none';
    function draw(i){const R=run(mode),tn=FR[i];
      const W=Math.max(290,Math.min(860,RD.width($('sa-svg'))));const L=34,Rm=8,pw=W-L-Rm;const X=t=>L+pw*t/HZ;
      let b='';const top=14,h1=90,dbTop=top+h1+34,h2=70;
      const Yw=w=>top+h1*(1-w/REC);
      b+=RD.t(L,top-3,'each request: how long it waited (up to 300 ms)',{fs:10,fill:'var(--mute)'});
      b+='<line x1="'+L+'" x2="'+(W-Rm)+'" y1="'+(top+h1)+'" y2="'+(top+h1)+'" stroke="var(--mute)"/>';
      b+='<line x1="'+X(1)+'" x2="'+X(1)+'" y1="'+top+'" y2="'+(dbTop+h2)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(X(1)-4,top+10,'entry expires',{fs:10,a:'end',fill:'var(--bad)'});
      const st=new Set(R.starts.map(s=>s.toFixed(4)));
      R.waits.forEach((w,j)=>{const t=j/RATE;if(t>tn)return;const x=X(t);const isRe=st.has(t.toFixed(4));
        const col=isRe?'var(--bad)':w>0?'var(--c5)':'var(--good)';const y=w>0?Yw(w):top+h1-3;
        b+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(top+h1)+'" y2="'+y.toFixed(1)+'" stroke="'+col+'" stroke-width="1.4"/>'});
      // database queries in flight
      const inflight=t=>R.starts.filter(s=>s<=t&&t<s+REC).length;
      const mx=Math.max(4,...R.starts.map(s=>inflight(s)));const Yd=v=>dbTop+h2*(1-v/mx);
      b+=RD.t(L,dbTop-4,'database queries running at once (max '+mx+')',{fs:10,fill:'var(--mute)'});
      let d='M'+X(0)+' '+Yd(0);for(let k=0;k<=200;k++){const t=k/200*HZ;if(t>tn)break;d+='L'+X(t).toFixed(1)+' '+Yd(inflight(t)).toFixed(1)}
      b+='<path d="'+d+'" fill="none" stroke="var(--c4)" stroke-width="2"/><line x1="'+L+'" x2="'+(W-Rm)+'" y1="'+Yd(0)+'" y2="'+Yd(0)+'" stroke="var(--mute)"/>';
      [0,0.5,1,1.5,2].forEach(t=>{b+=RD.t(X(t),dbTop+h2+14,t+' s',{fs:10,a:'middle',fill:'var(--mute)'})});
      b+='<line x1="'+X(tn)+'" x2="'+X(tn)+'" y1="'+top+'" y2="'+(dbTop+h2)+'" stroke="var(--ink)" opacity=".35"/>';
      $('sa-svg').innerHTML=RD.svg(W,dbTop+h2+20,b,'Cache stampede timeline under '+NAMES[mode]);
      $('sa-leg').innerHTML=CH.leg([['var(--good)','hit, no wait'],['var(--c5)','waited for another request\'s query'],['var(--bad)','ran the query'],['var(--c4)','database queries running']]);
      const seen=R.waits.filter((w,j)=>j/RATE<=tn);const dbq=R.starts.filter(s=>s<=tn).length;const nw=seen.filter(w=>w>0).length;
      $('sa-cnt').innerHTML=RD.stat('Time',tn.toFixed(2)+' s','')+RD.stat('Database queries',dbq,'for one key')+RD.stat('Requests that waited',nw,'of '+seen.length)+RD.stat('Longest wait',Math.round(1000*Math.max(0,...seen))+' ms','');
      let cap;
      if(tn<0.1)cap=['A hot key, read 200 times a second','The entry is cached and every read is a hit. It expires at t = 1 s, and rebuilding it is a 300 ms database query.'];
      else if(mode==='xfetch'&&R.starts[0]<=tn&&tn<1)cap=['XFetch: one reader refreshed early','At t = '+R.starts[0].toFixed(2)+' s one reader drew an early refresh and rebuilt the value while everyone else kept reading the old one. When t = 1 s arrives, the entry is already fresh.'];
      else if(tn<1)cap=['Before expiry','Every read is a hit; nothing touches the database.'];
      else if(tn<1.3)cap=mode==='none'?['The stampede','Every request in the next 300 ms misses and runs the same query itself (marked "ran the query"): one query a request, 200 a second, piling onto the database at once.']:mode==='coalesce'?['Coalescing: one query, the rest wait','The first miss runs the query; every later request in the window waits for that one answer (marked "waited"), so the database sees one query.']:['Nothing happens at expiry','The value was refreshed before it expired, so no reader waits and the database sees no burst.'];
      else cap=[NAMES[mode]+': the result',(mode==='none'?R.db+' database queries for one value; each of those requests waited the full 300 ms.':mode==='coalesce'?'1 database query; '+R.waits.filter(w=>w>0).length+' requests waited up to 300 ms for its answer.':'1 database query, made early by one reader, who waited for it; no one else waited.')+' Facebook\'s measured version of the same fix: 17K queries a second down to 1.3K.'];
      $('sa-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
    }
    const A=RD.anim({card:'sa-card',ctl:'sa-ctl',n:FR.length,draw,ms:380,label:'Animation step'});
    RD.seg($('sa-seg'),m=>{mode=m;A.reset(FR.length);A.play()});
    RD.onResize(()=>A.redraw());
  })();
})();
