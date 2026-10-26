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
    RD.seg($('la-seg'),m=>{pol=m;A.reset(FR.length)});
    RD.onResize(()=>A.redraw());
  })();

  // (the stampede animation moved to Caching, section 7, on 2026-10-26)

})();
