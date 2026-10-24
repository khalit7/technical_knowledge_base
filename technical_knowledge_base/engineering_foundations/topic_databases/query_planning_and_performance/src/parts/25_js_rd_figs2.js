// ---- Reading tab: hero, join algorithms, bottom-up plan walk (stepper), pagination, connections. All values from QPD (measured); nothing moves until the reader acts. ----
(function(){
const Q=window.QPD,G=window.QPG,E=RD.esc,$=id=>document.getElementById(id),F=window.QPF,f=F.f;
// hero: where the prediction is made and where EXPLAIN ANALYZE shows it broke
function hero(){const el=$('rd-hero');if(!el)return;const W=RD.width(el),wide=W>=700;let b='';
  const bx=[['SQL',["LIKE 'Chat 123456%'",'ORDER BY id LIMIT 10'],''],['Statistics',['sample of 30,000 rows:','MCVs, histogram'],''],['Row estimate',['100 titles match'],'h'],['Cost model',['walk the primary key,','stop after 10: 3,780'],''],['Executor',['reads all 1,000,000','chats to find 1'],'']];
  const res=['EXPLAIN ANALYZE','estimated rows=100, actual rows=1','Rows Removed by Filter: 999,999; 91.6 ms'];
  const st=k=>k==='h'?{fill:'var(--acc2)',stroke:'var(--acc)',sw:2}:{fill:'var(--soft)',stroke:'var(--line)'};
  if(wide){const gap=16,bw=(W-gap*4)/5,bh=64,y0=4;
    bx.forEach(([t,ls,k],i)=>{const x=i*(bw+gap);b+=G.R(x,y0,bw,bh,st(k))+G.T(x+8,y0+17,t,{w:600,fs:12.5,fill:k==='h'?'var(--acc)':undefined});ls.forEach((l,j)=>b+=G.T(x+8,y0+35+j*15,l,{fs:11.5}));
      if(i<4)b+=G.A(x+bw+1,y0+bh/2,x+bw+gap-2,y0+bh/2)});
    const ry=y0+bh+44,rx=bw+gap,rw=W-rx,rh=58;b+=G.R(rx,ry,rw,rh,{fill:'var(--bg)',stroke:'var(--bad)',sw:2});
    b+=G.T(rx+10,ry+18,res[0],{w:600,fs:12.5,fill:'var(--bad)'})+G.T(rx+10,ry+35,res[1],{fs:11.5,mono:1})+G.T(rx+10,ry+50,res[2],{fs:11.5,mono:1});
    const ex=4*(bw+gap)+bw/2;b+=G.A(ex,y0+bh+1,ex,ry-2);
    const ex2=2*(bw+gap)+bw/2;b+=G.A(ex2,ry-2,ex2,y0+bh+3,{col:'var(--bad)',sw:2,dash:1})+G.T(ex2+8,y0+bh+26,'compare: 100 against 1',{fs:11.5,fill:'var(--bad)',w:600});
    el.innerHTML=G.svg(W,ry+rh+4,b,'flow from SQL through statistics, row estimate, cost model and executor to EXPLAIN ANALYZE, with the comparison of estimated and actual rows')}
  else{const bw=W-46,bh=52,gap=18;let y=2,ey=0;
    bx.forEach(([t,ls,k],i)=>{b+=G.R(0,y,bw,bh,st(k))+G.T(8,y+17,t,{w:600,fs:12.5,fill:k==='h'?'var(--acc)':undefined})+G.T(8,y+36,ls.join(' '),{fs:11.5});
      b+=G.A(bw/2,y+bh+1,bw/2,y+bh+gap-2);if(i===2)ey=y+bh/2;y+=bh+gap});
    const rh=66;b+=G.R(0,y,bw,rh,{fill:'var(--bg)',stroke:'var(--bad)',sw:2})+G.T(8,y+17,res[0],{w:600,fs:12.5,fill:'var(--bad)'})+G.T(8,y+35,res[1],{fs:11,mono:1})+G.T(8,y+52,res[2].replace('; ',', '),{fs:11,mono:1});
    const yb=y+rh/2;b+='<path d="M'+(bw+2)+' '+yb+' H'+(W-10)+' V'+ey+'" fill="none" stroke="var(--bad)" stroke-width="2" stroke-dasharray="5 4"/>'+G.A(W-10,ey,bw+3,ey,{col:'var(--bad)',sw:2})+'<text transform="rotate(-90 '+(W-16)+' '+((yb+ey)/2).toFixed(1)+')" x="'+(W-16)+'" y="'+((yb+ey)/2).toFixed(1)+'" text-anchor="middle" font-size="11" font-weight="600" fill="var(--bad)">compare 100 with 1</text>';
    el.innerHTML=G.svg(W,y+rh+4,b,'flow from SQL to EXPLAIN ANALYZE, with the comparison of estimated and actual rows')}}
RD.onRender(hero);RD.onResize(hero);hero();
// join algorithms: planner's choice against the forced alternative, per shape
function joins(){const c=Q.joins.cases,nm={'Nested Loop':'Nested loop','Hash Join':'Hash join','Merge Join':'Merge join'};
  [['rd-join-nl','small','small_forced'],['rd-join-hj','large','large_forced'],['rd-join-mj','sorted','sorted_forced']].forEach(([id,a,z])=>{const el=$(id);if(!el)return;
    G.hbars(el,[{rows:[{label:nm[c[a].join]+', chosen: '+f(c[a].pages)+' pages',v:c[a].median_ms,txt:F.ms(c[a].median_ms)+' ms',col:'var(--good)',hl:1},{label:nm[c[z].join]+', forced: '+f(c[z].pages)+' pages',v:c[z].median_ms,txt:F.ms(c[z].median_ms)+' ms',col:'var(--bad)'}]}],{vw:62,label:'measured time, chosen against forced'})})}
RD.onRender(joins);RD.onResize(joins);joins();
// bottom-up walk through a real plan (stepper)
(function(){const L=Q.lab,before=L.corr_before.text.split('\n'),after=L.corr_after.text.split('\n');
  const num=(l,re)=>{const m=l.match(re);return m?+m[1]:NaN};
  const idx=(ls,re)=>ls.findIndex(l=>re.test(l));
  const iSeq=idx(before,/Seq Scan on lab_users/),iIos=idx(before,/Index Only Scan/),iNl=idx(before,/Nested Loop/),iAgg=idx(before,/HashAggregate/),iSort=idx(before,/-> +Sort/),iLim=0,iEx=idx(before,/Execution Time/);
  const est=l=>num(l,/rows=(\d+) width/),act=l=>num(l,/actual time=[^ ]+ rows=(\d+)/),loops=l=>num(l,/loops=(\d+)\)/);
  const s=before[iSeq],io=before[iIos],nl=before[iNl],ag=before[iAgg];
  const aSeq=after[idx(after,/Parallel Seq Scan on lab_users/)],aEx=after[idx(after,/Execution Time/)];
  const S=[
   {p:before,on:[],t:'A real plan, as EXPLAIN prints it',c:'The most indented lines run first and pass rows up. Read it from the bottom.'},
   {p:before,on:[iSeq,iSeq+1,iSeq+2],t:'1. The bottom: Seq Scan on lab_users',c:'Estimated rows='+est(s)+', actual rows='+f(act(s))+': '+(act(s)/est(s)).toFixed(1)+' times under. The planner multiplied the share of GB users by the share of London users as if the two were independent (section 4). This is the lowest big mismatch, so it is the cause.'},
   {p:before,on:[iIos],t:'2. The inner side: Index Only Scan on chats',c:'Estimated '+est(io)+' rows per loop, actual '+act(io)+' per loop: fine for each lookup. But loops='+f(loops(io))+' where the plan expected '+est(s)+': a nested loop was chosen for a small outer side that was not small.'},
   {p:before,on:[iNl],t:'3. Nested Loop: inherited, not new',c:'rows='+f(est(nl))+' estimated, '+f(act(nl))+' actual. About '+est(s)+' &times; 10 against '+f(act(s))+' &times; 10: the error came up from step 1.'},
   {p:before,on:[iAgg,iAgg+2],t:'4. HashAggregate: inherited again',c:f(est(ag))+' groups expected, '+f(act(ag))+' found (one per London user). It still fitted in memory: Batches 1.'},
   {p:before,on:[iLim,iSort,iEx],t:'5. Sort and Limit: the answer, and the bill',c:'5 rows, as asked, in '+before[iEx].replace('Execution Time: ','')+'. Fast here, because 2,294 lookups are cheap; the same underestimate on a bigger table sends a nested loop into millions of lookups.'},
   {p:after,on:[idx(after,/Parallel Seq Scan on lab_users/),idx(after,/Workers Launched/),idx(after,/Execution Time/)],t:'6. The fix, and the plan it produces',c:'<code>CREATE STATISTICS ... (dependencies, mcv) ON country, city FROM lab_users; ANALYZE lab_users;</code> Now the scan estimates '+f(est(aSeq))+' rows per process against '+f(act(aSeq))+' actual (two processes), the planner adds a parallel worker, and the query takes '+aEx.replace('Execution Time: ','')+'.'}];
  const compact=l=>{const m=l.match(/^( *)(.*?) +\(cost=[0-9.]+\.\.[0-9.]+ rows=(\d+) width=\d+\) \(actual time=[0-9.]+\.\.[0-9.]+ rows=(\d+) loops=(\d+)\)/);const sp=(l.match(/^ */)||[''])[0],ind=sp.slice(0,Math.ceil(sp.length/3));
    if(!m)return ind+l.trim();const i2=m[1].slice(0,Math.ceil(m[1].length/3));return i2+m[2].trim()+'\n'+i2+'   est '+m[3]+', actual '+m[4]+' x '+m[5]+' loops'};
  const draw=i=>{const st=S[i],on=new Set(st.on),nar=RD.width($('rd-walk'))<600;$('rd-walk').innerHTML=(nar?'<p class="small mute">Cost and time columns hidden, row counts on their own line and indentation cut to fit a narrow screen; widen the window for the full output.</p>':'')+'<pre class="pl">'+st.p.map((l,k)=>'<span class="'+(on.has(k)?'on':st.on.length?'dim':'')+'">'+E(nar?compact(l):l)+'</span>').join('\n')+'</pre>';
    $('rd-walk-cap').innerHTML='<div class="t">'+st.t+' <span class="mute small">(step '+(i+1)+' of '+S.length+')</span></div><p>'+st.c+'</p>'};
  if($('rd-walk')){const an=RD.anim({card:'rd-walk-card',ctl:'rd-walk-ctl',n:S.length,draw,ms:3600,label:'Plan walk step'});RD.onResize(()=>an.redraw())}
})();
// pagination: offset against keyset by depth
function page(){const el=$('rd-page');if(!el)return;const r=Q.pagination.rows_by_depth,W=RD.width(el),H=230,L=50,R=narrowR(W),T0=14,B=34;
  function narrowR(w){return w<520?64:118}
  const xs=i=>L+(W-L-R)*i/(r.length-1),lo=-2,hi=3,y=v=>T0+(H-T0-B)*(1-(Math.log10(v)-lo)/(hi-lo));let b='';
  [0.01,0.1,1,10,100,1000].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+G.T(L-5,y(v)+4,v>=1?f(v):String(v),{a:'end',fs:10.5,fill:'var(--mute)'})});
  const lab=d=>d===0?'first':d>=999000?'1M':d>=1e6?f(d/1e6)+'M':d>=1000?f(d/1000)+'k':f(d);
  r.forEach((p,i)=>b+=G.T(xs(i),H-B+15,lab(p.depth),{a:'middle',fs:10.5,fill:'var(--mute)'}));
  b+=G.T((L+W-R)/2,H-4,'rows skipped before the page (depth)',{a:'middle',fs:11,fill:'var(--mute)'})+G.T(4,10,'ms per page (log scale)',{fs:10.5,fill:'var(--mute)'});
  const line=(k,col)=>'<polyline points="'+r.map((p,i)=>xs(i).toFixed(1)+','+y(p[k]).toFixed(1)).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2.4"/>'+r.map((p,i)=>'<circle cx="'+xs(i).toFixed(1)+'" cy="'+y(p[k]).toFixed(1)+'" r="3.2" fill="'+col+'"><title>depth '+f(p.depth)+': '+p[k]+' ms</title></circle>').join('');
  b+=line('offset_ms','var(--bad)')+line('keyset_ms','var(--good)');
  const last=r[r.length-1];b+=G.T(xs(r.length-1)+6,y(last.offset_ms)+4,'OFFSET '+F.ms(last.offset_ms)+' ms',{fs:11,fill:'var(--bad)',w:600})+G.T(xs(r.length-1)+6,y(last.keyset_ms)+4,'keyset '+F.ms(last.keyset_ms),{fs:11,fill:'var(--good)',w:600});
  if(W<520){b=b.replace('OFFSET '+F.ms(last.offset_ms)+' ms','OFFSET').replace('keyset '+F.ms(last.keyset_ms),'keyset')}
  el.innerHTML=G.svg(W,H,b,'time per page by depth, offset against keyset')}
RD.onRender(page);RD.onResize(page);page();
// connections: pgbench with persistent connections and a new connection per transaction
function pool(){const el=$('rd-pool');if(!el)return;const p=Q.pooling.pgbench,g=(path,re)=>p.find(r=>r.path===path&&r.reconnect===re).tps;
  G.hbars(el,[{rows:[{label:'Direct, persistent connections',v:g('direct',false),txt:f(g('direct',false)),col:'var(--good)'},{label:'Direct, new connection each time',v:g('direct',true),txt:f(g('direct',true)),col:'var(--bad)',hl:1},
   {label:'PgBouncer, persistent connections',v:g('PgBouncer',false),txt:f(g('PgBouncer',false)),col:'var(--c1)'},{label:'PgBouncer, new connection each time',v:g('PgBouncer',true),txt:f(g('PgBouncer',true)),col:'var(--c4)'}]}],{vw:56,label:'transactions per second'})}
RD.onRender(pool);RD.onResize(pool);pool();
})();
