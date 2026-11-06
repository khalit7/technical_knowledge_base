// ---- Reading tab: join algorithms, the plan text beside Fig. 3, pagination, connections. All values from QPD (measured). ----
(function(){
const Q=window.QPD,G=window.QPG,E=RD.esc,$=id=>document.getElementById(id),F=window.QPF,f=F.f;
// join algorithms: planner's choice against the forced alternative, per shape
function joins(){const c=Q.joins.cases,nm={'Nested Loop':'Nested loop','Hash Join':'Hash join','Merge Join':'Merge join'};
  [['rd-join-nl','small','small_forced'],['rd-join-hj','large','large_forced'],['rd-join-mj','sorted','sorted_forced']].forEach(([id,a,z])=>{const el=$(id);if(!el)return;
    G.hbars(el,[{rows:[{label:nm[c[a].join]+', chosen: '+f(c[a].pages)+' pages',v:c[a].median_ms,txt:F.ms(c[a].median_ms)+' ms',col:'var(--good)',hl:1},{label:nm[c[z].join]+', forced: '+f(c[z].pages)+' pages',v:c[z].median_ms,txt:F.ms(c[z].median_ms)+' ms',col:'var(--bad)'}]}],{vw:62,label:'measured time, chosen against forced'})})}
RD.onRender(joins);RD.onResize(joins);joins();
// the plan text beside Fig. 3 (the plan tree stage): the lines of the current step marked; compact on narrow columns. Driven by the stage's onStep (37_js_sc_plan.js).
(function(){const L=Q.lab,before=L.corr_before.text.split('\n'),after=L.corr_after.text.split('\n');
  const idx=(ls,re)=>ls.findIndex(l=>re.test(l));
  const iSeq=idx(before,/Seq Scan on lab_users/),iIos=idx(before,/Index Only Scan/),iNl=idx(before,/Nested Loop/),iAgg=idx(before,/HashAggregate/),iSort=idx(before,/-> +Sort/),iEx=idx(before,/Execution Time/);
  const S=[{p:before,on:[]},{p:before,on:[iSeq,iSeq+1,iSeq+2]},{p:before,on:[iIos]},{p:before,on:[iNl]},{p:before,on:[iAgg,iAgg+2]},{p:before,on:[0,iSort,iEx]},
   {p:after,on:[idx(after,/Parallel Seq Scan on lab_users/),idx(after,/-> +Gather/),idx(after,/Workers Launched/),idx(after,/Execution Time/)]}];
  const compact=l=>{const m=l.match(/^( *)(.*?) +\(cost=[0-9.]+\.\.[0-9.]+ rows=(\d+) width=\d+\) \(actual time=[0-9.]+\.\.[0-9.]+ rows=(\d+) loops=(\d+)\)/);const sp=(l.match(/^ */)||[''])[0],ind=sp.slice(0,Math.ceil(sp.length/3));
    if(!m)return ind+l.trim();const i2=m[1].slice(0,Math.ceil(m[1].length/3));return i2+m[2].trim()+'\n'+i2+'   est '+m[3]+', actual '+m[4]+' x '+m[5]+' loops'};
  let cur=0;
  const draw=i=>{const el=$('rd-walk');if(!el)return;cur=i;const st=S[Math.max(0,Math.min(S.length-1,i))],on=new Set(st.on),nar=RD.width(el)<720;
    el.innerHTML=(nar?'<p class="small mute">'+(i===6?'After the fix. ':'Before the fix. ')+'Cost and time columns hidden and row counts on their own line to fit the column; the full output is in exercise 3 of the Plan reading lab.</p>':'<p class="small mute">'+(i===6?'After the fix.':'Before the fix.')+'</p>')+'<pre class="pl">'+st.p.map((l,k)=>'<span class="'+(on.has(k)?'on':st.on.length?'dim':'')+'">'+E(nar?compact(l):l)+'</span>').join('\n')+'</pre>'};
  window.QPWALK=draw;draw(0);RD.onRender(()=>draw(cur));RD.onResize(()=>draw(cur));
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
