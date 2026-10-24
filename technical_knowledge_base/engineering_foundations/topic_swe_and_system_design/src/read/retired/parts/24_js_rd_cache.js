// ---- Reading, Step 2: every read to the database against cache-aside (illustrative traffic; src/read/recompute.py a2) ----
window.RDSIM=window.RDSIM||{};
RDSIM.A2_READS=20;RDSIM.A2_DBCAP=12;RDSIM.A2_HITS=[0,10,16,18,18,17,18,18,16,18];
RDSIM.a2=function(cache){let backlog=0;const rows=[];
  for(let t=0;t<10;t++){const hits=cache?RDSIM.A2_HITS[t]:0,miss=RDSIM.A2_READS-hits,load=miss+backlog,served=Math.min(load,RDSIM.A2_DBCAP);backlog=load-served;rows.push({hits,db:miss,backlog})}
  return rows};
(function(){
  const svg=document.getElementById('rd-ca-svg');if(!svg)return;
  const cap=document.getElementById('rd-ca-cap'),cnt=document.getElementById('rd-ca-cnt'),leg=document.getElementById('rd-ca-leg');
  let mode='db';const R={db:RDSIM.a2(false),cache:RDSIM.a2(true)};
  const L=(c,t)=>'<span style="--sw:var('+c+')">'+t+'</span>';
  // fixed scatter of which reads are hits (arrangement illustrative)
  const ord=(function(){const a=[...Array(20).keys()];let s=11;for(let i=19;i>0;i--){s=(s*1103515245+12345)%2147483648;const j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a})();
  function draw(i){
    const rows=R[mode],r=i>0?rows[i-1]:null;
    leg.innerHTML=(mode==='cache'?L('--good','answered by the cache'):'')+L('--c2','sent to the database')+L('--c4','database backlog')+'<span style="--sw:var(--ink)">database capacity (600 reads/s)</span>';
    const W=Math.max(280,Math.min(820,RD.width(svg)));
    const per=W<420?10:20,sq=Math.min(22,Math.floor((W-20)/per)-4),g=4;
    let b=RD.t(0,12,'This second: 1,000 reads (one square = 50)',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<20;k++){const hit=r&&ord.indexOf(k)<r.hits;const x=(k%per)*(sq+g),y=20+Math.floor(k/per)*(sq+g);
      b+='<rect x="'+x+'" y="'+y+'" width="'+sq+'" height="'+sq+'" rx="3" fill="'+(!r?'var(--dim)':hit?'var(--good)':'var(--c2)')+'"/>'}
    const y0=20+Math.ceil(20/per)*(sq+g)+22,ch=120,maxv=30,bw=(W-40)/10;
    b+=RD.t(0,y0-6,'Database load each second (squares)',{fs:11,fill:'var(--mute)'});
    const Y=v=>y0+ch-v/maxv*ch;
    for(let t=0;t<10;t++){const x=34+t*bw;const rr=rows[t];const on=t<i;
      const h1=rr.db/maxv*ch,h2=Math.min(maxv-rr.db,rr.backlog)/maxv*ch;
      b+='<rect x="'+(x+3)+'" y="'+Y(rr.db)+'" width="'+(bw-6)+'" height="'+h1+'" fill="var(--c2)" opacity="'+(on?1:.15)+'"/>';
      if(rr.backlog>0)b+='<rect x="'+(x+3)+'" y="'+(Y(rr.db)-h2)+'" width="'+(bw-6)+'" height="'+h2+'" fill="var(--c4)" opacity="'+(on?.8:.08)+'"/>'+(rr.db+rr.backlog>maxv&&on?RD.t(x+bw/2,y0+8,'+'+rr.backlog,{fs:9.5,a:'middle',fill:'var(--c4)'}):'');
      b+=RD.t(x+bw/2,y0+ch+13,String(t+1),{fs:10,a:'middle',fill:t===i-1?'var(--ink)':'var(--mute)',w:t===i-1?600:400});
    }
    b+='<line x1="30" x2="'+W+'" y1="'+Y(12)+'" y2="'+Y(12)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.t(0,Y(12)+4,'12',{fs:10})+RD.t(0,Y(0)+4,'0',{fs:10})+RD.t(0,Y(30)+8,'30',{fs:10});
    b+=RD.t(W/2,y0+ch+26,'second',{fs:10,a:'middle',fill:'var(--mute)'});
    svg.innerHTML=RD.svg(W,y0+ch+30,b,'Reads per second split into cache hits and database reads, with database load per second against its capacity');
    const hr=r?Math.round(100*r.hits/20):0;
    cnt.innerHTML=RD.stat('Second',i+' of 10','')+RD.stat('Hit rate',r?hr+'%':'n/a',mode==='db'?'no cache':'share answered by the cache')+RD.stat('Database reads',r?(r.db*50).toLocaleString('en-US')+'/s':'n/a','capacity 600/s')+RD.stat('Database backlog',r?(r.backlog*50).toLocaleString('en-US'):'0','reads waiting');
    let t,p;
    if(i===0){t='1,000 reads a second, a database that answers 600';p=mode==='db'?'Every read goes straight to the database. Press play.':'The same reads, but the server asks the cache first (cache-aside). The cache starts empty.'}
    else if(mode==='db'){t='Second '+i+': 1,000 reads sent, 600 answered';p='400 more reads join the database backlog every second; after '+i+' s it holds '+(r.backlog*50).toLocaleString('en-US')+'. Every server is now waiting on the database.'}
    else{const k=i-1;t='Second '+i+': hit rate '+hr+'%';
      p=k===0?'Cold cache: every read misses, goes to the database, and the answer is stored in the cache. The database falls behind for a moment.':
        k===1?'Popular chats are now cached: half the reads are hits. The database clears its backlog.':
        k===2?'Most repeated reads now hit. The database sees '+(r.db*50)+' reads a second, well under its capacity.':
        k===5?'A user renamed a chat: the server wrote the database and deleted that chat\'s cache entry (invalidation), so its next reads miss once and refetch the new name.':
        k===8?'A batch of entries reached their TTL together and expired; their next reads refetch them. Staleness is bounded, at the price of these misses.':
        k===9?'At a 90% hit rate the database sees 100 reads a second instead of 1,000. The cache, not the database, is now carrying the read load; if it ever empties, all 1,000 land on the database again.':
        'Steady state: about 90% hits, the database sees '+(r.db*50)+' reads a second.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const an=RD.anim({card:'rd-ca-card',ctl:'rd-ca-ctl',n:11,ms:1300,draw,label:'Second'});
  RD.seg(document.getElementById('rd-ca-seg'),m=>{mode=m;an.reset(11);an.play()});
  RD.onResize(()=>an.redraw());
})();
