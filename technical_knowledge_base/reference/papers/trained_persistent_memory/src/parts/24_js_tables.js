// ---- The paper's tables, rebuilt: sortable tables from tables.json and recompute.py's output ----
(function(){
const PP=window.PAPER,TB=PP.tables,RC=PP.rc;
// sortable table: cols [{h, k(row)->value, f(row)->html, num}], rows; clicking a heading sorts
function table(host,cols,rows,o){o=o||{};let sk=null,dir=1;
  function draw(){const R=rows.slice();if(sk!=null){const c=cols[sk];R.sort((a,b)=>{const x=c.k(a),y=c.k(b);return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*dir})}
    const best=cols.map(c=>c.best?Math.max(...rows.map(r=>c.k(r))):null);
    let s='<table class="'+(o.cls==null?'t3':o.cls)+'"><thead><tr>'+cols.map((c,i)=>'<th'+(c.num?' class="num"':'')+'><a href="#" data-i="'+i+'" style="text-decoration:none;color:inherit">'+c.h+(sk===i?(dir>0?' ▲':' ▼'):'')+'</a></th>').join('')+'</tr></thead><tbody>';
    R.forEach(r=>{s+='<tr'+(o.rowCls?' class="'+o.rowCls(r)+'"':'')+'>'+cols.map((c,i)=>{const v=c.f?c.f(r):c.k(r);const b=best[i]!=null&&c.k(r)===best[i]&&best[i]>0;
      return '<td'+(c.num?' class="num"':'')+(c.cls?' style="'+c.cls(r)+'"':'')+'>'+(b?'<b>'+v+'</b>':v)+'</td>'}).join('')+'</tr>'});
    host.innerHTML=s+'</tbody></table>';
    host.querySelectorAll('th a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const i=+a.dataset.i;if(sk===i)dir=-dir;else{sk=i;dir=cols[i].num?-1:1}draw()}))}
  draw()}
const f2=v=>v.toFixed(2);
function drawT3(){const sc=$('t3M').querySelector('.on').dataset.m,rows=TB.t3[sc].map((r,i)=>Object.assign({},r,{rc:RC.t3[sc][i]}));
  const cols=[{h:'Method',k:r=>r.m}];
  TB.t3.buckets.forEach((b,j)=>cols.push({h:b+'<br><span class="mute">n = '+TB.t3.n[j]+'</span>',k:r=>r.v[j],f:r=>r.p[j],num:1,best:1}));
  cols.push({h:'Mean<br><span class="mute">printed</span>',k:r=>r.v[5],f:r=>r.p[5],num:1,best:1},
   {h:'Weighted<br><span class="mute">recomputed</span>',k:r=>r.rc.weighted_mean,f:r=>f2(r.rc.weighted_mean),num:1,best:1},
   {h:'± SE<br><span class="mute">upper bound</span>',k:r=>r.rc.se_upper_weighted_mean,f:r=>f2(r.rc.se_upper_weighted_mean),num:1});
  table($('t3T'),cols,rows,{rowCls:r=>/Baseline/.test(r.m)?'basec':''})}
segBind('t3M',drawT3);
function drawT5(){const B=TB.t5.base_f1;
  const neg=v=>v<B?'color:var(--bad);font-weight:600':'';
  table($('t5T'),[{h:'Method',k:r=>r.m},
   {h:'Tax 1x',k:r=>r.v[0],f:r=>r.p[0],num:1},{h:'Benefit 1x',k:r=>r.v[1],f:r=>r.p[1],num:1},
   {h:'F1 zeroed 1x',k:r=>B-r.v[0],f:r=>f2(B-r.v[0]),num:1},{h:'F1 with memory 1x',k:r=>B+r.v[1],f:r=>f2(B+r.v[1]),num:1,cls:r=>neg(B+r.v[1])},
   {h:'Tax 10x',k:r=>r.v[2],f:r=>r.p[2],num:1},{h:'Benefit 10x',k:r=>r.v[3],f:r=>r.p[3],num:1},
   {h:'F1 zeroed 10x',k:r=>B-r.v[2],f:r=>f2(B-r.v[2]),num:1},{h:'F1 with memory 10x',k:r=>B+r.v[3],f:r=>f2(B+r.v[3]),num:1,cls:r=>neg(B+r.v[3])}],TB.t5.rows)}
function drawT4(){table($('t4T'),[{h:'Method',k:r=>r.m},{h:'K<sub>30</sub> (%)',k:r=>r.v[0],f:r=>r.p[0],num:1,best:1},{h:'ΔK (%)',k:r=>r.v[1],f:r=>r.p[1],num:1,best:1},
   {h:'K<sub>1</sub> (derived)',k:r=>+(r.v[0]-r.v[1]).toFixed(2),f:r=>f2(r.v[0]-r.v[1]),num:1}],TB.t4.rows,{rowCls:r=>/Baseline/.test(r.m)?'basec':''})}
function drawT2(){const rows=TB.t2.rows.map((r,i)=>Object.assign({},r,{pc:RC.params['M.'+(i+1)]}));
  table($('t2T'),[{h:'Method',k:r=>r.m},{h:'Injection',k:r=>r.inj},{h:'Write',k:r=>r.write},{h:'Read',k:r=>r.read},
   {h:'Params (Table 2)',k:r=>parseFloat(r.params),f:r=>r.params,num:1},{h:'Recounted',k:r=>r.pc.count,f:r=>fmt(r.pc.count),num:1},{h:'% of backbone',k:r=>r.pc.pct_of_backbone,f:r=>r.pc.pct_of_backbone.toFixed(3),num:1},
   {h:'Write cost',k:r=>r.cost}],rows)}
function drawTQ(){const lc=RC.locomo.last_three_conversations.buckets,N=TB.t3.n.reduce((a,b)=>a+b,0);
  const rows=TB.t3.buckets.map((b,j)=>({b,p:TB.t3.n[j],c:lc[b],sh:TB.t3.n[j]/N}));
  table($('tqT'),[{h:'Lag bucket (turns)',k:r=>r.b},{h:'Paper (n)',k:r=>r.p,num:1},{h:'Counted (conv-48, 49, 50)',k:r=>r.c,num:1},{h:'Difference',k:r=>r.c-r.p,f:r=>(r.c-r.p>0?'+':'')+(r.c-r.p),num:1},{h:'Share of questions',k:r=>r.sh,f:r=>(r.sh*100).toFixed(1)+'%',num:1}],rows)}
function drawCL(){const rows=RC.claims;
  table($('clT'),[{h:'Claim',k:r=>r.claim},{h:'Where',k:r=>r.where},{h:'Holds?',k:r=>r.ok?1:0,f:r=>r.ok?'<span class="ok">yes</span>':'<span class="no">no</span>'},{h:'Evidence',k:r=>r.note,cls:()=>'min-width:14em'}],rows,{cls:'clt'});
  $('clT').insertAdjacentHTML('afterbegin','<p class="small"><b>'+RC.claims_ok+' of '+RC.claims_n+'</b> checked statements hold; '+(RC.claims_n-RC.claims_ok)+' do not.</p>')}
onTab('t-tables',()=>{drawT3();drawT5();drawT4();drawT2();drawTQ();drawCL()});
})();
