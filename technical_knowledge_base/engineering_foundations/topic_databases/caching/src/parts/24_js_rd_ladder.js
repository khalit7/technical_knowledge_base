// ---- Section 2: the cache layers on one log-scale ladder, with what a hit avoids ----
(function(){
  const box=document.getElementById('rd-lad-svg'),tbl=document.getElementById('rd-lad-tbl');if(!box)return;
  const L=CA.layers,P=CA.pg;
  const SWE='https://app.notion.com/p/3c65c17b0d0d81048ae0dd14ac399b4d';
  const a=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  // [layer, seconds, kind (hit | miss), holds, who invalidates, source html]
  const R=[
    ['CPU L1 cache',0.98e-9,'hit','64-byte lines, tens of KB per core','hardware',a('measured, M1 Pro (Numbers to know)',SWE)],
    ['CPU L2 cache',5.63e-9,'hit','MBs per core cluster','hardware',a('measured, M1 Pro (Numbers to know)',SWE)],
    ['In-process cache: Python dict hit',L.dict_ns*1e-9,'hit','objects in one process','you, once per process','measured here (<code>m_layers.py</code>)'],
    ['RAM read that misses the CPU caches',126e-9,'miss','everything in memory','',a('measured, M1 Pro, 512 MiB working set',SWE)],
    ['OS page cache: 8 KiB file read',L.pagecache_us*1e-6,'hit','file blocks in free RAM','the kernel','measured here'],
    ['SSD random read (NVMe)',102e-6,'miss','','',a('Callaghan, 2025 (Numbers to know)',SWE)],
    ['Redis GET (shared cache), local',P.costs.redis_get.median_ms*1e-3,'hit','values for every app server','you','measured here, loopback; add a network round trip in production'],
    ['Postgres primary-key query, pages in shared_buffers',P.warm.second_pass.ms_per_lookup*1e-3,'hit','8 KB pages of tables and indexes','Postgres','measured here, loopback client round trip'],
    ['Round trip inside a cloud region (reverse proxy, Redis over the network)',0.5e-3,'miss','','',a('Dean 2009; Azure targets under 2 ms between zones',SWE)],
    ['Postgres aggregate: one user\'s usage',P.costs.usage_aggregate.median_ms*1e-3,'miss','','','measured here, median over random users'],
    ['CDN edge near the user',20e-3,'hit','public responses, static files','you, by purge or expiry',a('Cloudflare: "most are within 20ms"','https://www.cloudflare.com/network/')],
    ['Round trip across the Atlantic (a CDN miss to the origin)',78e-3,'miss','','',a('Azure P50, East US to UK South',SWE)],
    ['Browser cache',null,'hit','one user\'s responses','nobody: only expiry and new URLs','no network at all'],
  ];
  const fmt=s=>s==null?'0 network':s<1e-6?(s*1e9).toFixed(s<1e-8?1:0)+' ns':s<1e-3?(s*1e6).toFixed(s<1e-5?2:0)+' µs':s<1?(s*1e3).toFixed(s<1e-2?2:1)+' ms':s.toFixed(2)+' s';
  tbl.innerHTML='<tr><th>Layer or step</th><th class="num">Time</th><th>Holds</th><th>Who invalidates</th><th>Source</th></tr>'+
    R.map(r=>'<tr'+(r[2]==='miss'?' style="color:var(--mute)"':'')+'><td>'+(r[2]==='miss'?'<i>'+r[0]+'</i> (what a hit avoids)':'<b>'+r[0]+'</b>')+'</td><td class="num">'+fmt(r[1])+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td><td class="small">'+r[5]+'</td></tr>').join('');
  function draw(){
    const W=Math.min(RD.width(box),860),narrow=W<560,lab=narrow?0:250,rowH=narrow?34:22,T=8,B=26,H=T+B+R.length*rowH,X0=lab+8,w=W-X0-60;
    const lo=-9,hi=0,xs=s=>X0+(Math.log10(s)-lo)/(hi-lo)*w;let g='';
    for(let e=lo;e<=hi;e++){const x=xs(Math.pow(10,e));g+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/>'+RD.t(x,H-B+14,['1 ns','10 ns','100 ns','1 µs','10 µs','100 µs','1 ms','10 ms','100 ms','1 s'][e-lo],{a:'middle',fs:10,fill:'var(--mute)'})}
    R.forEach((r,i)=>{const y=T+i*rowH,bh=narrow?10:13,by=y+(narrow?17:4);
      const mc=Math.floor((W-X0)/6.3);if(narrow)g+=RD.t(X0,y+12,r[0].length>mc?r[0].slice(0,mc-1)+'\u2026':r[0],{fs:11,fill:r[2]==='miss'?'var(--mute)':'var(--ink)'});else g+=RD.t(lab,y+15,r[0].length>40?r[0].slice(0,38)+'…':r[0],{a:'end',fs:11,fill:r[2]==='miss'?'var(--mute)':'var(--ink)'});
      if(r[1]==null){g+=RD.t(X0,by+bh-2,'no network, no server',{fs:10,fill:'var(--good)'});return}
      const x=xs(r[1]);g+='<rect x="'+X0+'" y="'+by+'" width="'+Math.max(2,x-X0).toFixed(1)+'" height="'+bh+'" rx="2" fill="'+(r[2]==='miss'?'var(--dim)':'var(--c1)')+'"><title>'+r[0]+': '+fmt(r[1])+'</title></rect>'+RD.t(x+4,by+bh-2,fmt(r[1]),{fs:10,fill:'var(--mute)'});
    });
    box.innerHTML=RD.svg(W,H,g,'Latency of each cache layer on a log scale');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
