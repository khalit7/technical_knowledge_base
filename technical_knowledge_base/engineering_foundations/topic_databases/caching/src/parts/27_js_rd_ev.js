// ---- Sections 5 and 6: Redis eviction measured, exact simulations, cost-weighted hit ratio ----
// Shared helpers (window.CAEV) are also used by the Cache lab tab.
window.CAEV=(function(){
  const C=CA.ev.cols,ix=k=>C.indexOf(k);
  const runs=CA.ev.runs.map(r=>{const o={};C.forEach((k,i)=>o[k]=r[i]);return o});
  const sims=(CA.sim?CA.sim.runs:[]).map(r=>({work:r[0],policy:r[1],cap:r[2],hit:r[3],hit_cheap:r[4],hit_exp:r[5],exp_share:r[6]}));
  const WORK=[['wiki','Wikipedia, 1 hour'],['wiki6h','Wikipedia, 6 hours (drift)'],['zipf0.7','Zipf α 0.7'],['zipf0.9','Zipf α 0.9'],['zipf1.1','Zipf α 1.1']];
  const POL=[['allkeys-lfu','allkeys-lfu','var(--c3)'],['allkeys-lru','allkeys-lru','var(--c1)'],['allkeys-random','allkeys-random','var(--c5)'],['allkeys-lrm','allkeys-lrm (8.6)','var(--c4)'],['noeviction','noeviction','var(--c2)']];
  const SIMP=[['opt','OPT (Belady): the ceiling','var(--ink)'],['lru','exact LRU','var(--c1)'],['greedydual','GreedyDual (cost-aware)','var(--c6)'],['lfu','perfect LFU','var(--c3)'],['fifo','FIFO','var(--c4)']];
  const SIZES=[20000,50000,100000,200000];
  const get=(w,p,c,s,t)=>runs.find(r=>r.work===w&&r.policy===p&&r.cap===c&&r.samples===(s||5)&&r.ttl===(t||0));
  const sim=(w,p,c)=>sims.find(r=>r.work===w&&r.policy===p&&r.cap===c);
  const cw=(r,c1,c2)=>{if(!r)return null;const e=r.exp_share;return (r.hit_cheap*(1-e)*c1+r.hit_exp*e*c2)/((1-e)*c1+e*c2)};
  // a line chart of hit ratio against cache size: series [{name,color,dash,pts:[[cap,v]]}]
  function chart(box,series,opt){
    opt=opt||{};const W=Math.min(RD.width(box),820),H=Math.round(Math.min(320,Math.max(230,W*0.45))),L=46,R=12,T=12,B=38,w=W-L-R,h=H-T-B;
    const lo=Math.log10(15000),hi=Math.log10(260000),xs=c=>L+(Math.log10(c)-lo)/(hi-lo)*w;
    const vals=series.flatMap(s=>s.pts.map(p=>p[1])).filter(v=>v!=null);const ymax=Math.min(1,Math.ceil((Math.max(...vals)+0.02)*10)/10),ymin=Math.max(0,Math.floor((Math.min(...vals)-0.02)*10)/10);
    const ys=v=>T+h-(v-ymin)/(ymax-ymin)*h;let g='';
    for(let v=ymin;v<=ymax+1e-9;v+=0.1){const y=ys(v);g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-6,y+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
    SIZES.forEach(c=>{const x=xs(c);g+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(T+h)+'" stroke="var(--line)"/>'+RD.t(x,T+h+14,(c/1000)+'k keys',{a:'middle',fs:10,fill:'var(--mute)'})});
    g+=RD.t(L+w/2,H-4,opt.xlabel||'cache size (keys the memory limit holds; log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    series.forEach(s=>{const p=s.pts.filter(q=>q[1]!=null);if(!p.length)return;let d='';p.forEach(q=>{d+=(d?' L':'M')+xs(q[0]).toFixed(1)+','+ys(q[1]).toFixed(1)});
      g+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="'+(s.dash?1.6:2.4)+'"'+(s.dash?' stroke-dasharray="5 4"':'')+'/>';
      if(!s.dash)p.forEach(q=>{g+='<circle cx="'+xs(q[0]).toFixed(1)+'" cy="'+ys(q[1]).toFixed(1)+'" r="3.2" fill="'+s.color+'"><title>'+s.name+', '+q[0].toLocaleString('en-US')+' keys: '+(q[1]*100).toFixed(1)+'%</title></circle>'});});
    box.innerHTML=RD.svg(W,H,g,opt.label||'Hit ratio against cache size');
  }
  return {runs,sims,WORK,POL,SIMP,SIZES,get,sim,cw,chart};
})();
(function(){
  const X=CAEV,box=document.getElementById('rd-ev-svg');if(!box)return;
  let work='wiki';
  const seg=document.getElementById('rd-ev-work');
  seg.innerHTML=X.WORK.map((w,i)=>'<button data-m="'+w[0]+'"'+(i?'':' class="on"')+'>'+w[1]+'</button>').join('');
  function series(){
    const s=X.POL.filter(p=>X.get(work,p[0],X.SIZES[0])).map(p=>({name:'Redis '+p[1],color:p[2],pts:X.SIZES.map(c=>{const r=X.get(work,p[0],c);return [c,r?r.hit:null]})}));
    ['opt','lru'].forEach(k=>{const p=X.SIMP.find(q=>q[0]===k);if(X.sim(work,k,X.SIZES[0]))s.push({name:p[1],color:p[2],dash:1,pts:X.SIZES.map(c=>[c,X.sim(work,k,c).hit])})});
    return s;
  }
  function draw(){const s=series();X.chart(box,s,{label:'Measured Redis hit ratio by policy and size'});
    document.getElementById('rd-ev-leg').innerHTML=s.map(q=>'<span style="--sw:'+q.color+'">'+q.name+(q.dash?' (simulated)':'')+'</span>').join('');}
  RD.seg(seg,m=>{work=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
  // findings, computed from the runs
  const pp=v=>(v*100).toFixed(1);
  const f=[];
  const lr=c=>X.get('wiki','allkeys-lru',c),lf=c=>X.get('wiki','allkeys-lfu',c);
  const pairs=X.WORK.flatMap(w=>X.SIZES.map(c=>[X.get(w[0],'allkeys-lfu',c),X.get(w[0],'allkeys-lru',c)])).filter(q=>q[0]&&q[1]);
  const wins=pairs.filter(q=>q[0].hit>q[1].hit).length;
  f.push('<b>LFU beat LRU in '+wins+' of '+pairs.length+' workload and size pairs</b> measured here; on the real hour by '+X.SIZES.map(c=>pp(lf(c).hit-lr(c).hit)).join(', ')+' points at 20k, 50k, 100k and 200k keys. These traces have steady popularity and no bursts inside an hour, which is where frequency wins.');
  const d6=X.SIZES.map(c=>{const a=X.get('wiki6h','allkeys-lfu',c),b=X.get('wiki6h','allkeys-lru',c);return a&&b?a.hit-b.hit:null}).filter(v=>v!=null);
  if(d6.length)f.push('<b>Hour-to-hour drift barely changed that:</b> over six real hours LFU led LRU by '+d6.map(pp).join(', ')+' points. The drift here is mild ('+Math.round(CA.skew6.overlap_mean*100)+'% of each hour\'s top 10,000 pages were in the next hour\'s); a trending-news spike would favour LRU more.');
  const lrm=X.SIZES.map(c=>Math.abs(X.get('wiki','allkeys-lrm',c).hit-X.get('wiki','allkeys-random',c).hit));
  f.push('<b>allkeys-lrm behaved like random eviction</b> (within '+pp(Math.max(...lrm))+' points at every size), as it must for cache-aside: a key is written once, at fill time, so "least recently modified" means "filled longest ago", and reads never protect it.');
  if(X.sims.length){const dl=X.SIZES.map(c=>Math.abs(lr(c).hit-X.sim('wiki','lru',c).hit));
    f.push('<b>Redis\'s sampled LRU was within '+pp(Math.max(...dl))+' points of exact LRU</b> on the real hour (and Redis held about 2% fewer keys than the simulation, its memory limit including per-key overhead), as the docs promise for power-law traffic. Raising <code>maxmemory-samples</code> to 10 moved its hit ratio by at most '+pp(Math.max(...X.SIZES.map(c=>{const a=X.get('wiki','allkeys-lru',c,10);return a?Math.abs(a.hit-lr(c).hit):0})))+' points.');
    const o=X.sim('wiki','opt',50000);f.push('<b>Room left:</b> at 50k keys the offline optimum (OPT) hits '+pp(o.hit)+'%, against '+pp(lf(50000).hit)+'% for the best Redis policy. And '+pp(CA.skew.trace.compulsory_miss_share)+'% of all 2,000,000 requests were the first ever for their key: misses no policy and no memory size can remove.');}
  const ne=X.get('wiki','noeviction',200000);
  if(ne)f.push('<b>noeviction kept the keys that arrived first</b>, which under shuffled traffic are mostly popular ones, so its hit ratio looks fine ('+pp(ne.hit)+'% at 200k keys) while '+ne.set_errors.toLocaleString('en-US')+' SETs failed with an out-of-memory error. In an application that does not catch that error, every one is a failed request.');
  const v0=X.runs.find(r=>r.policy==='volatile-lru'&&r.ttl===0),v1=X.runs.find(r=>r.policy==='volatile-lru'&&r.ttl===3600);
  if(v0&&v1)f.push('<b>volatile-lru with no TTLs is noeviction:</b> '+v0.set_errors.toLocaleString('en-US')+' failed SETs and '+v0.evicted+' evictions at 50k keys; the same run with a TTL on every key evicted '+v1.evicted.toLocaleString('en-US')+' keys and failed '+v1.set_errors+' SETs, but held only '+v1.keys_held.toLocaleString('en-US')+' keys in the same memory: a TTL costs memory per key (Redis docs).');
  document.getElementById('rd-ev-find').innerHTML=f.map(x=>'<li>'+x+'</li>').join('');
  // section 6: cost-weighted table on the real hour
  const tb=document.getElementById('rd-cw-tbl');
  if(tb&&X.sims.length){const c1=CA.sim.costs_ms.cheap,c2=CA.sim.costs_ms.expensive;
    const rows=[['Redis allkeys-lru',c=>X.get('wiki','allkeys-lru',c),'measured'],['Redis allkeys-lfu',c=>X.get('wiki','allkeys-lfu',c),'measured'],['Exact LRU',c=>X.sim('wiki','lru',c),'simulated'],['GreedyDual (knows each miss\'s cost)',c=>X.sim('wiki','greedydual',c),'simulated'],['OPT (ignores cost)',c=>X.sim('wiki','opt',c),'simulated']];
    tb.innerHTML='<tr><th>Policy</th><th></th>'+[50000,200000].map(c=>'<th class="num">Hit ratio, '+c/1000+'k keys</th><th class="num">Work saved (CWHR)</th>').join('')+'</tr>'+
      rows.map(r=>'<tr><td>'+r[0]+'</td><td class="small mute">'+r[2]+'</td>'+[50000,200000].map(c=>{const x=r[1](c);return '<td class="num">'+pp(x.hit)+'%</td><td class="num"><b>'+pp(X.cw(x,c1,c2))+'%</b></td>'}).join('')+'</tr>').join('')+
      '<tr><td colspan="6" class="small mute">Miss costs: '+c1.toFixed(3)+' ms (primary-key lookup) for nine keys in ten, '+c2.toFixed(1)+' ms (usage aggregate) for one in ten, chosen at random. CWHR = (hits on cheap keys &times; '+c1.toFixed(3)+' + hits on expensive keys &times; '+c2.toFixed(1)+') / (all requests, same weights).</td></tr>';}
})();
