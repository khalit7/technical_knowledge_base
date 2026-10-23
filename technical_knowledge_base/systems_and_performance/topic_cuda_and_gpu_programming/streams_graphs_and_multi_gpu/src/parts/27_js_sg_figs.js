// ---- Static figures added 2026-10-23: hero (three waits), event ordering, peer access, a hang, async TP. All illustrative durations. ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc;
  // Hero: one step in series (three numbered waits) against the same work overlapped
  function hero(){const el=$('sg-hero');if(!el)return;
    const W=RD.width(el),lw=Math.min(76,W*0.2),rh=22,gap=34,top=18,lanes=['CPU','copy','compute','NCCL'];
    const ph=lanes.length*rh,H=top+2*ph+gap+30,tmax=96,x=t=>lw+(W-lw-8)*t/tmax;let s='';
    const rect=(y0,lane,a,b,fill,op,lab)=>{const y=y0+lane*rh,x0=x(a),w=Math.max(1,x(b)-x0);
      let r='<rect x="'+x0.toFixed(1)+'" y="'+(y+3)+'" width="'+w.toFixed(1)+'" height="'+(rh-6)+'" rx="2" fill="'+fill+'" opacity="'+(op||0.9)+'"/>';
      if(lab&&w>lab.length*5.8+6)r+=RD.t(x0+4,y+rh/2+4,E(lab),{fs:10.5,fill:'var(--bg)'});return r};
    const wait=(y0,a,b,n,c)=>{const y=y0+2*rh,xm=c===undefined?(x(a)+x(b))/2:x(c);
      return '<rect x="'+x(a).toFixed(1)+'" y="'+(y+3)+'" width="'+(x(b)-x(a)).toFixed(1)+'" height="'+(rh-6)+'" fill="var(--bad)" opacity="0.18"/>'+
        '<circle cx="'+xm.toFixed(1)+'" cy="'+(y+rh/2)+'" r="8" fill="var(--bad)"/>'+RD.t(xm,y+rh/2+4,n,{fs:11,a:'middle',fill:'var(--bg)',w:700})};
    const frame=(y0,title,end)=>{let r=RD.t(4,y0-5,E(title),{fs:11.5,w:700});
      lanes.forEach((l,i)=>{r+='<rect x="'+lw+'" y="'+(y0+i*rh+3)+'" width="'+(W-lw-8)+'" height="'+(rh-6)+'" fill="var(--soft)" rx="3"/>'+RD.t(4,y0+i*rh+rh/2+4,l,{fs:11})});
      r+='<line x1="'+x(end)+'" x2="'+x(end)+'" y1="'+y0+'" y2="'+(y0+ph)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';return r};
    // serial
    let y0=top;s+=frame(y0,'In series: 93 units',93);
    s+=wait(y0,0,10,'1')+wait(y0,10,40,'2',21.25)+wait(y0,70,88,'3');
    s+=rect(y0,1,0,10,'var(--c6)',0.9,'batch in');
    for(let k=0;k<6;k++){const a=10+5*k;s+=rect(y0,0,a,a+2.5,'var(--c4)');s+=rect(y0,2,a+2.5,a+5,'var(--c1)')}
    s+=rect(y0,2,40,70,'var(--c1)',0.9,'backward');s+=rect(y0,3,70,88,'var(--c2)',0.9,'all-reduce');s+=rect(y0,2,88,93,'var(--c3)');
    // overlapped
    y0=top+ph+gap;s+=frame(y0,'Overlapped: 58 units',58);
    s+=rect(y0,1,0,10,'var(--c6)',0.35,'next batch');s+=rect(y0,0,0,2,'var(--c4)');
    for(let k=0;k<6;k++)s+=rect(y0,2,2+2.5*k,4.5+2.5*k,'var(--c1)');
    s+=rect(y0,2,17,47,'var(--c1)',0.9,'backward');
    [[25,31],[33,39],[41,47]].forEach(b=>{s+=rect(y0,3,b[0],b[1],'var(--c2)')});s+=rect(y0,3,47,53,'var(--c2)',0.9,'last');
    s+=rect(y0,2,53,58,'var(--c3)');
    el.innerHTML=RD.svg(W,H,s,'one training step in series and overlapped');
  }
  // An event orders two streams
  function ev(){const el=$('sg-ev-fig');if(!el)return;
    SGT.lanes({el,lanes:[['cpu','CPU'],['s1','stream s1'],['s2','stream s2']],tmax:5.4,unit:'units',lw:84,
      ev:[['cpu',0,0.12,'','var(--c4)'],['cpu',0.2,0.32,'','var(--c4)'],['cpu',0.4,0.52,'','var(--c4)'],['cpu',0.6,0.72,'','var(--c4)'],
        ['s1',0,3,'produce x','var(--c1)'],['s2',0,1.8,'other work','var(--c1)'],['s2',1.8,3,'waits on e','var(--dim)'],['s2',3,5,'consume x','var(--c3)']],
      marks:[[3,'event e completes']],label:'event ordering two streams'})}
  // Peer access
  function peer(){const el=$('sg-peer-fig');if(!el)return;
    const W=RD.width(el),H=204,bw=Math.max(110,(W-60)/2.4),g0=6,g1=W-bw-6;let s='';
    const box=(x0,title)=>'<rect x="'+x0+'" y="8" width="'+bw+'" height="132" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x0+8,26,title,{fs:12,w:700});
    s+=box(g0,'GPU 0')+box(g1,'GPU 1');
    s+='<rect x="'+(g0+8)+'" y="38" width="'+(bw-16)+'" height="26" rx="4" fill="var(--c1)" opacity="0.85"/>'+RD.t(g0+14,55,'add_remote',{fs:11,fill:'var(--bg)'});
    s+='<rect x="'+(g0+8)+'" y="74" width="'+(bw-16)+'" height="22" rx="4" fill="var(--c3)" opacity="0.8"/>'+RD.t(g0+14,89,'a',{fs:11,fill:'var(--bg)'});
    s+='<rect x="'+(g1+8)+'" y="74" width="'+(bw-16)+'" height="22" rx="4" fill="var(--c2)" opacity="0.85"/>'+RD.t(g1+14,89,'b',{fs:11,fill:'var(--bg)'});
    const lx0=g0+bw,lx1=g1;
    s+='<line x1="'+lx0+'" x2="'+lx1+'" y1="64" y2="64" stroke="var(--mute)" stroke-width="5" opacity="0.5"/>'+RD.t((lx0+lx1)/2,58,'link',{fs:11,a:'middle',fill:'var(--mute)'});
    s+='<defs><marker id="sg-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--acc)"/></marker></defs>';
    s+='<path d="M'+(g1+10)+',80 C'+(lx1-10)+',80 '+(lx0+10)+',50 '+(g0+bw-10)+',50" fill="none" stroke="var(--acc)" stroke-width="2" marker-end="url(#sg-arr)"/>';
    s+='<rect x="'+(g0+8)+'" y="104" width="'+(bw-16)+'" height="22" rx="4" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.t(g0+14,119,'tmp (copy of b)',{fs:11,fill:'var(--mute)'});
    s+='<path d="M'+(g1+10)+',90 C'+(lx1-10)+',115 '+(lx0+10)+',115 '+(g0+bw-10)+',115" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#sg-arr)"/>';
    s+=RD.t(g0+4,166,'blue: peer access, loads of b[i] cross the link',{fs:11,fill:'var(--acc)'});
    s+=RD.t(g0+4,188,'dashed: no peer path, copy b over first',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'peer access between two GPUs')}
  // A hang
  function hang(){const el=$('sg-hang-fig');if(!el)return;const ev=[];
    for(let r=0;r<4;r++)ev.push(['r'+r,0,4,'step','var(--c1)']);
    for(let r=0;r<3;r++)ev.push(['r'+r,4,20,'all-reduce #41: waiting','var(--bad)']);
    ev.push(['r3',4,5,'','var(--c5)']);ev.push(['r3',5,20,'all-reduce #42: waiting','var(--bad)']);
    SGT.lanes({el,lanes:[['r0','rank 0'],['r1','rank 1'],['r2','rank 2'],['r3','rank 3']],ev,tmax:21,unit:'units',lw:64,marks:[[20,'watchdog timeout']],label:'a hang'})}
  // Async TP before/after
  let atp='coll';
  function atpDraw(){const el=$('sg-atp-fig');if(!el)return;let ev,cap;
    if(atp==='coll'){ev=[['comm',0,8,'all-gather','var(--c2)'],['comp',8,16,'matmul','var(--c1)']];
      cap='The matmul needs the whole gathered input, so it waits for the all-gather: 8 + 8 = 16 units, the communication fully exposed.'}
    else{ev=[];for(let k=0;k<4;k++){ev.push(['comm',2*k,2*k+2,'g'+(k+1),'var(--c2)']);ev.push(['comp',2*k+2,2*k+4,'mm'+(k+1),'var(--c1)'])}
      cap='Each slice of the gather feeds a slice of the matmul as it lands (with symmetric memory the kernel reads the peers\' slices directly): only the first slice is exposed, 10 units instead of 16.'}
    SGT.lanes({el,lanes:[['comm','communication'],['comp','compute']],ev,tmax:17,unit:'units',lw:104,marks:[[atp==='coll'?16:10,'']],label:'async tensor parallelism'});
    $('sg-atp-cap').textContent=cap+' Illustrative durations, equal compute and communication.'}
  if($('sg-atp-seg'))RD.seg($('sg-atp-seg'),m=>{atp=m;atpDraw()});
  function all(){hero();ev();peer();hang();atpDraw()}
  RD.onRender(all);RD.onResize(all);all();
})();
