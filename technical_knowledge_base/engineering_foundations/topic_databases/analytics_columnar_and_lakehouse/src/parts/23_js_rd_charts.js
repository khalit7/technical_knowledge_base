// ---- Reading tab charts: encodings, engines, vectorised sum, sort order, small files, warehouse bill, HTTP ranges ----
window.FMT={
  mb:b=>b>=1e9?(b/1e9).toFixed(2)+' GB':b>=1e8?(b/1e6).toFixed(0)+' MB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(1)+' KB':b+' B',
  ms:v=>v>=1000?(v/1000).toFixed(2)+' s':v>=10?v.toFixed(0)+' ms':v.toFixed(1)+' ms',
  usd:v=>v>=100?'$'+Math.round(v).toLocaleString():v>=1?'$'+v.toFixed(2):v>=0.01?'$'+v.toFixed(3):'$'+v.toFixed(5)
};
// horizontal bars, log or linear; rows [{nm, v, txt, col, hl}]
window.BARS=function(el,rows,opt){opt=opt||{};
  const vs=rows.map(r=>r.v).filter(v=>v>0),mx=Math.max(...vs),mn=Math.min(...vs);
  const f=opt.log?(v=>v<=0?0:Math.max(2,100*(Math.log10(v)-Math.log10(mn/3))/(Math.log10(mx)-Math.log10(mn/3)))):(v=>Math.max(1,100*v/mx));
  el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+RD.esc(r.nm)+'">'+r.nm+'</div><div class="track"><div class="fill" style="width:'+f(r.v).toFixed(1)+'%;background:'+(r.col||'var(--acc)')+'"></div></div><div class="val">'+r.txt+'</div></div>').join('');
};
(function(){
  const $=id=>document.getElementById(id);
  // encodings
  const ENC=D.enc,ENCN={PLAIN:'Plain',DICT:'Dictionary','DELTA_BINARY_PACKED':'Delta','BYTE_STREAM_SPLIT':'Byte stream split','DELTA_LENGTH_BYTE_ARRAY':'Delta length','DELTA_BYTE_ARRAY':'Delta strings (prefix)'};
  const CC={none:'var(--dim)',snappy:'var(--c1)',zstd:'var(--c3)'};
  const es={col:'created_at',order:'time'};
  const cols=['id','chat_id','role','model','tokens','content','created_at'];
  $('encCols').innerHTML=cols.map(c=>'<button data-c="'+c+'"'+(c===es.col?' class="on"':'')+'>'+c+'</button>').join('');
  function enc(){
    let r=ENC.find(x=>x.col===es.col&&x.order===es.order);
    const sortable=ENC.some(x=>x.col===es.col&&x.order==='sorted');
    $('encOrder').querySelectorAll('button')[1].disabled=!sortable;
    if(!r){r=ENC.find(x=>x.col===es.col&&x.order==='time')}
    const rows=[];
    Object.keys(r.sizes).forEach(k=>{const [e,c]=k.split('|');const v=r.sizes[k];if(v==null)return;
      rows.push({nm:(ENCN[e]||e)+' + '+c,v:v,txt:FMT.mb(v),col:CC[c]})});
    const best=rows.reduce((a,b)=>b.v<a.v?b:a);best.hl=true;
    BARS($('encBars'),rows,{log:true});
    $('encNote').innerHTML='Column <b>'+es.col+'</b>, '+(r.order==='sorted'?'table sorted by model, role':'stored in time order')+': '+FMT.mb(r.arrow)+' in memory (Arrow), smallest file chunk '+FMT.mb(best.v)+' ('+best.nm+', '+(r.arrow/best.v).toFixed(0)+' times smaller). Bar length is on a log scale. Grey: no codec; blue: Snappy; green: zstd level 3.';
  }
  $('encCols').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('encCols').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));es.col=b.dataset.c;
    if(!ENC.some(x=>x.col===es.col&&x.order==='sorted')){es.order='time';$('encOrder').querySelectorAll('button').forEach((x,i)=>x.classList.toggle('on',i===0))}enc()});
  RD.seg($('encOrder'),v=>{es.order=v;enc()});
  enc();
  // engines
  const E=D.eng,EN={duck:'DuckDB',pg:'PostgreSQL',sq:'SQLite'},EC={duck:'var(--c3)',pg:'var(--c1)',sq:'var(--c2)'};
  let em='def';
  function eng(){
    let h='';
    ['per_model','daily','country_plan','top_users','monthly_chats','sum'].forEach(k=>{const q=E[k];
      const vals={duck:em==='def'?q.duck:q.duck_1,pg:em==='def'?q.pg:q.pg_1,sq:q.sq};
      h+='<div style="margin:10px 0 2px;font-size:13px"><b>'+RD.esc(q.title)+'</b> <span class="mute">('+q.rows+' result rows, '+(q.agree?'identical in all three':'DIFFERENT')+')</span></div><div class="bars" id="engB_'+k+'"></div>';
      setTimeout(()=>BARS($('engB_'+k),['duck','pg','sq'].map(e=>({nm:EN[e],v:vals[e],txt:FMT.ms(vals[e]),col:EC[e]})),{log:true}),0)});
    $('engBars').innerHTML=h;
    const r=['per_model','daily','country_plan','top_users','monthly_chats'].map(k=>(em==='def'?E[k].pg/E[k].duck:E[k].pg_1/E[k].duck_1));
    $('engNote').innerHTML='Bars on a log scale. DuckDB was '+Math.min(...r).toFixed(0)+' to '+Math.max(...r).toFixed(0)+' times faster than PostgreSQL on the five analytic queries '+(em==='def'?'at default parallelism':'with one thread each')+'. SQLite has no parallel execution, so its bars do not change.';
  }
  RD.seg($('engMode'),v=>{em=v;eng()});eng();
  window.CHK=window.CHK||{};CHK.speed=(m=>{const r=['per_model','daily','country_plan','top_users','monthly_chats'].map(k=>m?E[k].pg/E[k].duck:E[k].pg_1/E[k].duck_1);return [Math.round(Math.min(...r)),Math.round(Math.max(...r))]});CHK.sumRatio=Math.round(E.sum.pg_1/D.vec.duck_1);
  // vectorised sum
  const V=D.vec;
  BARS($('vecBars'),[
    {nm:'SQLite (row at a time)',v:E.sum.sq,txt:FMT.ms(E.sum.sq),col:'var(--c2)'},
    {nm:'PostgreSQL, no parallel workers',v:E.sum.pg_1,txt:FMT.ms(E.sum.pg_1),col:'var(--c1)'},
    {nm:'PostgreSQL, 2 workers',v:E.sum.pg,txt:FMT.ms(E.sum.pg),col:'var(--c1)'},
    {nm:'Python loop over a list',v:V.python_loop,txt:FMT.ms(V.python_loop),col:'var(--dim)'},
    {nm:'DuckDB, 1 thread (vectors)',v:V.duck_1,txt:FMT.ms(V.duck_1),col:'var(--c3)',hl:true},
    {nm:'numpy sum (vectorised loop)',v:V.numpy,txt:FMT.ms(V.numpy),col:'var(--c4)'},
    {nm:'DuckDB, 10 threads',v:E.sum.duck,txt:FMT.ms(E.sum.duck),col:'var(--c3)'}],{log:true});
  $('vecNote').textContent='SELECT sum(tokens) FROM messages over 10,000,000 rows, warm, median time. Log scale. The two engines without vectors spend about '+(E.sum.pg_1/V.duck_1).toFixed(0)+' times longer than DuckDB on one thread.';
  // sort order (Parquet section), at 100k rows, snappy
  const QN={all:'Tokens per model',day:'One day',chat:'One chat',model:'One model'},SC={time:'var(--c1)',model:'var(--c2)',chat:'var(--c3)',random:'var(--c4)'};
  function srt(q){
    const rows=['time','model','chat','random'].map(s=>{const f=D.lab.files.find(x=>x.sort===s&&x.rg===100000&&x.comp==='snappy');const v=f.q[q];
      return {nm:'Sorted by '+s,v:v.read_bytes,txt:FMT.mb(v.read_bytes),col:SC[s]}});
    BARS($('sortBars'),rows,{log:true});
    const fs=['time','model','chat','random'].map(s=>D.lab.files.find(x=>x.sort===s&&x.rg===100000&&x.comp==='snappy'));
    $('sortNote').innerHTML='Bytes DuckDB read for "'+QN[q]+'" (log scale), 100 row groups of 100,352 rows, Snappy. Row groups read: '+fs.map(f=>f.sort+' '+f.q[q].rg_kept+'/100').join(', ')+'.';
  }
  RD.seg($('sortQ'),srt);srt('chat');
  // small files
  const S=D.small,ks=Object.keys(S).sort((a,b)=>a-b);
  BARS($('sfBars'),ks.map(k=>({nm:S[k].files.toLocaleString()+' file'+(S[k].files>1?'s':''),v:S[k].ms,txt:FMT.ms(S[k].ms),col:k==='1'?'var(--c3)':'var(--c2)'})),{log:true});
  $('sfNote').innerHTML='Tokens per model over the same 10M rows, median of 5 warm runs (log scale). On disk: '+ks.map(k=>S[k].files.toLocaleString()+' files '+FMT.mb(S[k].bytes)).join('; ')+'. DuckDB split the requested 1,000 and 10,000 files into '+S['1000'].files.toLocaleString()+' and '+S['10000'].files.toLocaleString()+'. Compacting the '+D.compaction.from_files.toLocaleString()+' files back into one took '+D.compaction.seconds+' s.';
  // warehouse bill
  const ROWS=[1e7,1e8,1e9,1e10],REF=[1,24,288,1440,8640];
  // BigQuery logical bytes at 10M rows: model strings (2 + UTF-8 length) and tokens INT64 (8 bytes); see recompute.py
  const cnt={large:2499355,mini:2498787,reasoning:2498218,standard:2503640};
  const B10=Object.keys(cnt).reduce((a,k)=>a+cnt[k]*(2+k.length),0)+1e7*8;
  CHK.bq=B10;
  function wh(){
    const n=ROWS[+$('whRows').value],r=REF[+$('whRef').value];
    $('whRowsV').textContent=n.toLocaleString();$('whRefV').textContent=r.toLocaleString()+(r===288?' (every 5 minutes)':r===8640?' (every 10 s)':r===1440?' (every minute)':'');
    const bytes=Math.max(10e6,B10*n/1e7),bq=bytes/Math.pow(2,40)*6.25;
    const sf=60/3600*1*3,rsq=60/3600*8*0.375;
    const busy=r>=1440;
    $('whOut').innerHTML=RD.stat('BigQuery on demand',FMT.usd(bq)+' a query',FMT.mb(bytes)+' billed; '+FMT.usd(bq*r*30)+' a month (before the free TiB)')+
      RD.stat('Snowflake XS, Enterprise',busy?FMT.usd(24*3)+' a day':FMT.usd(sf)+' a refresh',busy?'never suspends: 24 credit-hours a day at $3; '+FMT.usd(24*3*30)+' a month':'60 s minimum = 1/60 credit at $3; '+FMT.usd(sf*r*30)+' a month')+
      RD.stat('Redshift Serverless, 8 RPU',busy?FMT.usd(24*8*0.375)+' a day':FMT.usd(rsq)+' a refresh',busy?'never idle: 8 RPU x 24 h x $0.375; '+FMT.usd(24*8*0.375*30)+' a month':'60 s x 8 RPU x $0.375 per RPU-hour; '+FMT.usd(rsq*r*30)+' a month');
    $('whNote').innerHTML='BigQuery scales with the bytes the query reads, so it grows with the table; the other two charge for time awake, so they grow with how often the dashboard refreshes, and at one refresh a minute or more the warehouse never suspends. Assumes the query runs in under a minute on the smallest size at every table size, which stops being true somewhere in the billions of rows. Prices: list, US region, 2026-10-04.';
  }
  $('whRows').addEventListener('input',wh);$('whRef').addEventListener('input',wh);wh();
  // HTTP range requests over the 534 MB file
  function http(k){
    const h=D.http[k],el=$('httpSvg'),W=RD.width(el),N=D.http_file,H=56,m=8;
    const X=v=>m+v/N*(W-2*m);let b='<rect x="'+m+'" y="22" width="'+(W-2*m)+'" height="26" fill="var(--soft)" stroke="var(--line)"/>';
    b+=RD.t(m,14,'byte 0',{fs:10,fill:'var(--mute)'})+RD.t(W-m,14,FMT.mb(N)+' (footer)',{a:'end',fs:10,fill:'var(--mute)'});
    h.log.forEach((r,i)=>{if(!r.range)return;const x=X(r.range[0]),w=Math.max(2,X(r.range[1])-x);
      b+='<rect x="'+x.toFixed(1)+'" y="22" width="'+w.toFixed(1)+'" height="26" fill="'+(r.range[1]>=N-1?'var(--c2)':'var(--c3)')+'"><title>GET bytes '+r.range[0].toLocaleString()+' to '+r.range[1].toLocaleString()+'</title></rect>'});
    
    el.innerHTML=RD.svg(W,H,b,'Byte ranges fetched');
    const gets=h.log.filter(r=>r.range);
    $('httpNote').innerHTML='<span class="mute">Orange: the footer request; green: column chunks fetched; grey: never downloaded.</span><br><code>'+RD.esc(h.sql)+'</code><br>'+h.requests+' requests (1 HEAD for the size, '+(h.requests-1)+' GET ranges), '+FMT.mb(h.bytes)+' downloaded of '+FMT.mb(N)+' ('+(100*h.bytes/N).toFixed(2)+'%). First GET: the last '+FMT.mb(gets[0].bytes)+' of the file, holding the footer. '+(k==='one_day'?'Then the created_at and tokens chunks of the one row group whose statistics overlap 1 March.':k==='case6'?'Then the model and tokens chunks of all 82 row groups.':'Then the id chunk of the row group whose id range holds 5,000,000, and the rest of that row group.');
  }
  RD.seg($('httpQ'),http);RD.onRender(()=>http(document.querySelector('#httpQ .on').dataset.m));http('one_day');
  RD.onResize(()=>{http(document.querySelector('#httpQ .on').dataset.m)});
})();
