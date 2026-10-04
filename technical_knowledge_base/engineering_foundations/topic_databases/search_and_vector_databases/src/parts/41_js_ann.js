// ---- ANN lab tab: recall against latency curves from the measurements (SV.ann), and a memory calculator ----
(function(){
  const A=SV.ann;if(!A||!document.getElementById('annPlot'))return;
  const S=[];// series: {id,name,knob,color,pts:[{k,recall,p50,p95}],bytes,build}
  const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)'];
  Object.values(A.hnsw).forEach((h,i)=>S.push({id:'h'+h.m,name:'HNSW m '+h.m+', ef_construction '+h.ef_construction,knob:'ef_search',color:({8:'var(--c1)',16:'var(--c2)',32:'var(--c3)'})[h.m],
    pts:h.curve.map(c=>({k:c.ef_search,recall:c.recall10,p50_ms:c.p50_ms,p95_ms:c.p95_ms})),bytes:h.bytes,build:h.build_s}));
  Object.values(A.ivf).forEach((v,i)=>S.push({id:'i'+v.lists,name:'IVFFlat, '+v.lists+' lists',knob:'probes',color:i?'var(--c5)':'var(--c4)',
    pts:v.curve.map(c=>({k:c.probes,recall:c.recall10,p50_ms:c.p50_ms,p95_ms:c.p95_ms})),bytes:v.bytes,build:v.build_s}));
  if(A.quant){const hq=A.quant.halfvec;S.push({id:'hv',name:'HNSW on halfvec (m 16)',knob:'ef_search',color:C[5],pts:hq.curve.map(c=>({k:c.ef_search,recall:c.recall10,p50_ms:c.p50_ms,p95_ms:c.p95_ms})),bytes:hq.bytes,build:hq.build_s});
    const b=A.quant.binary;S.push({id:'bq',name:'Binary index (HNSW on bit), with and without re-ranking',knob:'mode',color:C[6],pts:b.curve.map(c=>({k:c.mode,recall:c.recall10,p50_ms:c.p50_ms,p95_ms:c.p95_ms})),bytes:b.bytes,build:b.build_s})}
  const ex=A.exact;
  const sel=document.getElementById('annIdx'),kn=document.getElementById('annKnob');let lat='p50_ms';
  S.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.name;sel.appendChild(o)});
  sel.value=Math.max(0,S.findIndex(s=>s.id==='h16'));
  function setKnob(){const s=S[+sel.value];kn.max=s.pts.length-1;if(+kn.value>s.pts.length-1)kn.value=Math.min(2,s.pts.length-1);document.getElementById('annKnobL').textContent=s.knob}
  sel.addEventListener('change',()=>{const s=S[+sel.value];kn.max=s.pts.length-1;kn.value=s.id==='h16'||s.id==='h8'||s.id==='h32'?2:s.id[0]==='i'?5:0;setKnob();draw()});
  kn.addEventListener('input',draw);RD.seg(document.getElementById('annLat'),m=>{lat=m;draw()});
  const fmt=(x,d)=>x>=100?x.toFixed(0):x>=10?x.toFixed(1):x.toFixed(d==null?2:d);
  function draw(){setKnob();const s=S[+sel.value],p=s.pts[+kn.value];document.getElementById('annKnobV').textContent=p.k;
    document.getElementById('annStats').innerHTML=RD.stat('Recall@10',p.recall.toFixed(3),'share of the true top 10 found')+RD.stat('Latency',fmt(p[lat])+' ms',(lat==='p50_ms'?'median':'95th percentile')+'; exact: '+fmt(ex[lat])+' ms')+
      RD.stat('Speed-up over exact',(ex[lat]/p[lat]).toFixed(0)+'&times;','same queries')+RD.stat('Index size',(s.bytes/1e6).toFixed(0)+' MB',(s.bytes/A.rows).toFixed(0)+' bytes per vector')+RD.stat('Build time',s.build.toFixed(1)+' s','4 processes, in memory');
    const el=document.getElementById('annPlot'),w=Math.max(300,Math.min(880,RD.width(el)-10)),h=Math.round(Math.min(380,Math.max(260,w*.55))),L=46,R=12,T=12,B=40;
    // x: recall from 0.4 to 1 on a scale stretched near 1 (log of 1 - recall), y: latency log scale
    const xr=r=>{const v=Math.log10(Math.max(1e-3,1-r));return L+(w-L-R)*(v-Math.log10(.6))/(Math.log10(1e-3)-Math.log10(.6))};
    const all=S.flatMap(z=>z.pts.map(q=>q[lat])).concat([ex[lat]]),lo=Math.log10(Math.min(...all)*.8),hi=Math.log10(Math.max(...all)*1.25);
    const yr=v=>T+(h-T-B)*(1-(Math.log10(v)-lo)/(hi-lo));let g='';
    [0.4,0.8,0.9,0.95,0.99,0.999].forEach(r=>{const x=xr(r);g+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(h-B)+'" stroke="var(--line)"/>'+RD.t(x,h-B+14,r,{a:'middle',fs:10,fill:'var(--mute)'})});
    for(let e=Math.ceil(lo);e<=hi;e++){[1,2,5].forEach(m=>{const v=m*Math.pow(10,e);if(Math.log10(v)<lo||Math.log10(v)>hi)return;const y=yr(v);g+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,v>=1?v:v.toFixed(1),{a:'end',fs:10,fill:'var(--mute)'})})}
    g+=RD.t(L+(w-L-R)/2,h-6,'recall@10 (scale stretched towards 1)',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(12,T+(h-T-B)/2,'ms',{a:'middle',fs:11,fill:'var(--mute)'});
    S.forEach((z,i)=>{const on=i===+sel.value;let d='';z.pts.forEach((q,j)=>{d+=(j?'L':'M')+xr(q.recall).toFixed(1)+' '+yr(q[lat]).toFixed(1)});
      if(z.id!=='bq')g+='<path d="'+d+'" fill="none" stroke="'+z.color+'" stroke-width="'+(on?2.6:1.3)+'" opacity="'+(on?1:.55)+'"/>';
      z.pts.forEach(q=>{g+='<circle cx="'+xr(q.recall).toFixed(1)+'" cy="'+yr(q[lat]).toFixed(1)+'" r="'+(on?3.4:2.4)+'" fill="'+z.color+'" opacity="'+(on?1:.6)+'"/>'})});
    g+='<rect x="'+(xr(ex.recall)-5)+'" y="'+(yr(ex[lat])-5)+'" width="10" height="10" fill="var(--ink)"/>'+RD.t(xr(ex.recall)-8,yr(ex[lat])+4,'exact',{a:'end',fs:10.5});
    g+='<circle cx="'+xr(p.recall)+'" cy="'+yr(p[lat])+'" r="8" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    el.innerHTML=RD.svg(w,h,g,'Recall against latency for every measured index setting');
    document.getElementById('annLeg').innerHTML=S.map(z=>'<span><i style="background:'+z.color+'"></i>'+z.name+'</span>').join('')+'<span><i style="background:var(--ink);height:8px;width:8px"></i>exact scan</span>';
    document.getElementById('annNote').textContent='Exact recall is about 1 rather than exactly 1 because a few queries have ties at the 10th place. Recall below 0.4 is clipped to the left edge.'}
  window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-ann']=window.TAB_RENDER['t-ann']||[]).push(draw,mem);
  addEventListener('resize',()=>{if(!document.getElementById('t-ann').hidden){draw();}});
  // ---- memory calculator ----
  const h16=A.hnsw['m16_efc64'],link=h16.bytes/A.rows-(4*A.dims+8);
  document.getElementById('memLinkNote').textContent='m 16 used '+(h16.bytes/A.rows).toFixed(0)+' bytes per vector at 384 dimensions, of which 1,544 is the vector, leaving about '+link.toFixed(0)+' bytes of links, tuple headers and page slack; the estimate assumes that part stays the same at other sizes.';
  const N=document.getElementById('memN'),D=document.getElementById('memD'),Ty=document.getElementById('memT');
  const nOf=v=>Math.round(Math.pow(10,5+v*0.1)/1000)*1000;
  const gb=b=>b>=1e12?(b/1e12).toFixed(2)+' TB':b>=1e9?(b/1e9).toFixed(1)+' GB':(b/1e6).toFixed(0)+' MB';
  function mem(){const n=nOf(+N.value),d=+D.value,t=Ty.value;document.getElementById('memNv').textContent=n.toLocaleString('en-US');
    const tab=n*(4*d+8),iv=t==='f32'?4*d+8:t==='f16'?2*d+8:Math.ceil(d/8)+8,idx=n*(iv+link);
    const lim=t==='f32'?2000:t==='f16'?4000:64000;
    document.getElementById('memOut').innerHTML=RD.stat('Table (float32 vectors)',gb(tab),n.toLocaleString('en-US')+' &times; '+(4*d+8)+' bytes')+RD.stat('HNSW index (estimate)',gb(idx),n.toLocaleString('en-US')+' &times; ('+iv+' + '+link.toFixed(0)+') bytes')+RD.stat('Both',gb(tab+idx),'before other columns and indexes')+
      RD.stat('pgvector HNSW limit',d<=lim?'within':'exceeds '+lim,'dimensions for this type');
    document.getElementById('memNote').textContent=(d>lim?'pgvector cannot build an HNSW index on '+d+'-dimension '+(t==='f32'?'vector':'halfvec')+' columns; use halfvec (up to 4,000), binary quantisation, or a shortened (Matryoshka) prefix. ':'')+'For HNSW to be fast the index should fit in memory: compare the index figure with the RAM you can give Postgres (shared_buffers plus the operating system cache).'}
  [N,D,Ty].forEach(e=>e.addEventListener('input',mem));
  draw();mem();
})();
