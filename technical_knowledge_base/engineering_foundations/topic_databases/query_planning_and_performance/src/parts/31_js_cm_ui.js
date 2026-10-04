// ---- Cost model tab: UI ----
(function(){
const Q=window.QPD,M=window.QPCM,E=RD.esc,$=id=>document.getElementById(id),F=window.QPF;
const NM={seq:'Seq Scan',index:'Index Scan',bitmap:'Bitmap Heap Scan'},COL={seq:'var(--c2)',index:'var(--c1)',bitmap:'var(--c3)'};
const NMAX={users:90000,messages:9000000},NDEF={users:20000,messages:1000000};
let pre='users';
const P=()=>Q.cm.presets[pre];
const nFrom=v=>{const n=Math.max(1,Math.round(Math.pow(10,v/1000*Math.log10(NMAX[pre]))));const m=P().rows.find(r=>Math.abs(r.n-n)<=0.006*r.n);return m?m.n:n};// snap to a measured size when within 0.6%
const vFrom=n=>Math.round(1000*Math.log10(n)/Math.log10(NMAX[pre]));
function settings(){return {seq_page_cost:+$('cm-sp').value,random_page_cost:+$('cm-rp').value,cpu_tuple_cost:+$('cm-ct').value,cpu_index_tuple_cost:Q.cm.settings.cpu_index_tuple_cost,cpu_operator_cost:+$('cm-co').value,effective_cache_size:+$('cm-ec').value,work_mem:+$('cm-wm').value}}
function reset(){const d=P();$('cm-n').value=vFrom(NDEF[pre]);$('cm-rp').value=4;$('cm-sp').value=1;$('cm-cr').value=d.correlation.toFixed(2);$('cm-ct').value='0.01';$('cm-co').value='0.0025';$('cm-ec').value='524288';$('cm-wm').value='4096';draw()}
const isDef=c=>c.seq_page_cost===1&&c.random_page_cost===4&&c.cpu_tuple_cost===0.01&&c.cpu_operator_cost===0.0025&&c.effective_cache_size===524288&&c.work_mem===4096;
// self-check against EXPLAIN's numbers at default settings
function selfCheck(){let ok=0,n=0;for(const k in Q.cm.presets){const d=Q.cm.presets[k];d.rows.forEach(r=>{const m=M.costs(d,M.selectivity(d,d.a,d.a+r.n-1),Q.cm.settings);
  [[m.rows,r.est],[m.seq.total,r.seq],[m.index.total,r.index],[m.bitmap.total,r.bitmap]].forEach(([g,w])=>{n++;if(Math.abs(g-w)<=0.006+1e-9*w)ok++})})}return [ok,n]}
const chk=selfCheck();
function draw(){const d=P(),c=settings(),n=nFrom(+$('cm-n').value),corr=+$('cm-cr').value,a=d.a,b=a+n-1;
  $('cm-n-v').textContent=F.f(n);$('cm-rp-v').textContent=(+c.random_page_cost).toFixed(1);$('cm-sp-v').textContent=(+c.seq_page_cost).toFixed(1);$('cm-cr-v').textContent=corr.toFixed(2)+(Math.abs(corr-d.correlation)<0.005?' (stored)':'');
  $('cm-sql').textContent='SELECT * FROM '+d.table+' WHERE id BETWEEN '+F.f(a).replace(/,/g,'')+' AND '+F.f(b).replace(/,/g,'')+';';
  const s=M.selectivity(d,a,b),m=M.costs(d,s,c,corr),ks=['seq','index','bitmap'],win=ks.reduce((x,k)=>m[k].total<m[x].total?k:x,'seq');
  const sorted=ks.map(k=>m[k].total).sort((x,y)=>x-y);
  $('cm-sum').innerHTML=RD.stat('Estimated rows',F.f(m.rows),'selectivity '+(100*s).toPrecision(3)+'% of '+F.f(d.reltuples))+RD.stat('Planner would choose',NM[win],(sorted[1]/sorted[0]).toFixed(2)+' times cheaper than the runner-up')+RD.stat('Table, index',F.f(d.relpages)+' / '+F.f(d.idxpages)+' pages',F.f(d.reltuples)+' rows; B-tree '+(d.fastlevel+1)+' levels');
  const r2=x=>F.f(x,2),dl=rows=>'<dl>'+rows.map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')+'</dl>';
  const card=(k,body,fx)=>'<div class="cm-p'+(k===win?' win':'')+'"><h4><span>'+NM[k]+'</span>'+(k===win?'<span class="win-tag">cheapest</span>':'')+'</h4><div class="tot">'+r2(m[k].total)+'</div>'+body+'<div class="fx">'+fx+'</div></div>';
  const S=m.seq,I=m.index,Bm=m.bitmap;
  $('cm-paths').innerHTML=
   card('seq',dl([['pages &times; seq_page_cost',F.f(d.relpages)+' &times; '+c.seq_page_cost+' = '+r2(S.io)],['rows &times; (cpu_tuple + 2 &times; cpu_operator)',F.f(d.reltuples)+' &times; '+(c.cpu_tuple_cost+2*c.cpu_operator_cost).toFixed(4)+' = '+r2(S.cpu)]]),'Reads every page once, checks both comparisons on every row. Does not depend on how many rows match.')+
   card('index',dl([['index pages &times; random_page_cost',F.f(I.idxPages)+' &times; '+c.random_page_cost.toFixed(1)],['index entries, descent','+ '+F.f(I.idxTuples)+' &times; '+(c.cpu_index_tuple_cost+2*c.cpu_operator_cost).toFixed(4)+' + descent = '+r2(I.idxCost)],['heap pages if uncorrelated (Mackert-Lohman)',F.f(I.heapPagesUncorr)+' &times; '+c.random_page_cost.toFixed(1)+' = '+r2(I.maxIO)],['heap pages if perfectly correlated',F.f(I.heapPagesCorr)+' (1 random, rest sequential) = '+r2(I.minIO)],['interpolated by correlation&sup2; = '+(corr*corr).toFixed(3),r2(I.io)],['rows &times; cpu_tuple_cost',r2(I.cpu)]]),'Startup '+r2(I.startup)+' (B-tree descent). Heap I/O = uncorrelated + corr&sup2; &times; (correlated &minus; uncorrelated).')+
   card('bitmap',dl([['bitmap index scan (+0.1 cpu_operator per row)',r2(Bm.startup)],['heap pages &times; cost per page',F.f(Bm.heapPages)+' &times; '+Bm.costPerPage.toFixed(3)+' = '+r2(Bm.io)],['rows rechecked &times; (cpu_tuple + 2 &times; cpu_operator)',F.f(Bm.rechecked)+' &times; '+(c.cpu_tuple_cost+2*c.cpu_operator_cost).toFixed(4)+' = '+r2(Bm.cpu)]]),'Cost per page slides from random_page_cost toward seq_page_cost as the share of the table read grows (by its square root).'+(Bm.lossy>0?' <b>Lossy:</b> the bitmap outgrows work_mem ('+F.f(Math.floor(c.work_mem*1024/64))+' page entries), so about '+F.f(Bm.lossy)+' pages keep no row list and every row on them is rechecked.':''));
  chart(d,c,corr,n,win);
  const near=d.rows.find(r=>r.n===n);
  $('cm-chk').innerHTML='Self-check, run in your browser now: at the default settings these formulas give <b>'+chk[0]+' of '+chk[1]+'</b> of the row estimates and total costs that EXPLAIN printed for the '+(Q.cm.presets.users.rows.length+Q.cm.presets.messages.rows.length)+' measured ranges. '+(near&&isDef(c)&&Math.abs(corr-d.correlation)<0.005?'At exactly this size EXPLAIN printed seq '+r2(near.seq)+', index '+r2(near.index)+', bitmap '+r2(near.bitmap)+' and chose '+near.chosen+'.':(isDef(c)?'':'You have changed a setting, so these are what Postgres would compute with it; the measured times below were taken at the defaults.'));
}
function chart(d,c,corr,n,win){const el=$('cm-chart'),W=RD.width(el),H=240,L=56,R=10,T=12,B=36,nmax=NMAX[pre];
  const pts=[];for(let i=0;i<=80;i++){const nn=Math.max(1,Math.round(Math.pow(10,i/80*Math.log10(nmax))));const m=M.costs(d,M.selectivity(d,d.a,d.a+nn-1),c,corr);pts.push([nn,m])}
  const ys=pts.flatMap(p=>[p[1].seq.total,p[1].index.total,p[1].bitmap.total]);const lo=Math.floor(Math.log10(Math.min(...ys))),hi=Math.ceil(Math.log10(Math.max(...ys)));
  const x=v=>L+(W-L-R)*Math.log10(v)/Math.log10(nmax),y=v=>T+(H-T-B)*(1-(Math.log10(v)-lo)/(hi-lo));let b='';
  for(let e=lo;e<=hi;e++)b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(Math.pow(10,e))+'" y2="'+y(Math.pow(10,e))+'" stroke="var(--line)"/>'+RD.t(L-5,y(Math.pow(10,e))+4,F.f(Math.pow(10,e)),{a:'end',fs:10,fill:'var(--mute)'});
  for(let e=0;e<=Math.floor(Math.log10(nmax));e++)b+=RD.t(x(Math.pow(10,e)),H-B+14,F.f(Math.pow(10,e)),{a:'middle',fs:10,fill:'var(--mute)'});
  b+=RD.t((L+W-R)/2,H-4,'rows wanted (log scale)',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(4,10,'cost',{fs:10.5,fill:'var(--mute)'});
  ['seq','index','bitmap'].forEach(k=>{b+='<polyline points="'+pts.map(p=>x(p[0]).toFixed(1)+','+y(p[1][k].total).toFixed(1)).join(' ')+'" fill="none" stroke="'+COL[k]+'" stroke-width="'+(k===win?2.6:1.6)+'"/>'});
  if(isDef(c)&&Math.abs(corr-d.correlation)<0.005)d.rows.forEach(r=>['seq','index','bitmap'].forEach(k=>{b+='<circle cx="'+x(r.n).toFixed(1)+'" cy="'+y(r[k]).toFixed(1)+'" r="3.2" fill="none" stroke="var(--ink)" stroke-width="1"><title>EXPLAIN: '+NM[k]+' '+r[k]+' at '+r.n+' rows</title></circle>'}));
  b+='<line x1="'+x(n)+'" x2="'+x(n)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
  el.innerHTML='<div class="hmleg">'+['seq','index','bitmap'].map(k=>'<span><i style="display:inline-block;width:14px;height:3px;background:'+COL[k]+';margin-right:4px"></i>'+NM[k]+'</span>').join('')+'<span>&#9675; EXPLAIN’s own figure (default settings)</span></div><div class="rd-svg">'+RD.svg(W,H,b,'cost of three plans by rows wanted')+'</div>';
  $('cm-chart-cap').textContent='The planner picks the lowest line at each size. Circles are the costs PostgreSQL printed at the measured sizes; they sit on the lines.'}
function meas(){const d=P(),rs=d.rows.filter(r=>r.ms);
  $('cm-meas').innerHTML='<thead><tr><th class="num">Rows</th><th>Planner chose</th><th class="num">Seq Scan</th><th class="num">Index Scan</th><th class="num">Bitmap Heap Scan</th></tr></thead><tbody>'+rs.map(r=>{const best=Object.keys(r.ms).reduce((a,k)=>r.ms[k]<r.ms[a]?k:a,'seq');
    return '<tr><td class="num">'+F.f(r.est)+'</td><td>'+r.chosen+'</td>'+['seq','index','bitmap'].map(k=>'<td class="num'+(k===best?' w':'')+'">'+F.ms(r.ms[k])+' ms<br><span class="mute">'+F.f(r.pages[k])+' pages</span></td>').join('')+'</tr>'}).join('')+'</tbody>';
  const s=Q.cm.settings;
  $('cm-inputs').innerHTML=[['Table pages, rows (pg_class)',F.f(d.relpages)+', '+F.f(d.reltuples)],['Index '+d.index+' pages, entries',F.f(d.idxpages)+', '+F.f(d.idxtuples)],['B-tree levels below the root (bt_metap fastlevel)',d.fastlevel],['n_distinct, null_frac',d.n_distinct+', '+d.null_frac],['correlation (pg_stats)',d.correlation.toFixed(4)],['histogram_bounds',d.hist.length+' values, from '+F.f(d.hist[0])+' to '+F.f(d.hist[d.hist.length-1])],['Settings when measured','seq_page_cost '+s.seq_page_cost+', random_page_cost '+s.random_page_cost+', cpu_tuple_cost '+s.cpu_tuple_cost+', cpu_index_tuple_cost '+s.cpu_index_tuple_cost+', cpu_operator_cost '+s.cpu_operator_cost+', effective_cache_size '+F.f(s.effective_cache_size)+' pages (4 GB), work_mem '+F.f(s.work_mem)+' kB']].map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')}
['cm-n','cm-rp','cm-sp','cm-cr'].forEach(id=>$(id).addEventListener('input',draw));['cm-ct','cm-co','cm-ec','cm-wm'].forEach(id=>$(id).addEventListener('change',draw));
$('cm-reset').addEventListener('click',reset);
RD.seg($('cm-preset'),m=>{pre=m;meas();reset()});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-cost']=[draw];
addEventListener('resize',()=>{if(!$('t-cost').hidden)draw()});
meas();reset();
})();
