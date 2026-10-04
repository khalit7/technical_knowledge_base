// ---- The page's database: SQLite (sql.js, the same engine and data as the root's SQL playground) plus messages.parent_id;
// runnable example boxes (<div class="rq" data-ex="id">) that run live and show the PostgreSQL 16 result recorded offline ----
window.SM=(function(){
  const D=window.SM_DATA,RUN=window.SQRUN,esc=RD.esc;
  const S={SQL:null,base:null,ver:'',fail:'',ready:null,ms:0};
  const listeners=[];
  function start(){
    if(S.ready)return S.ready;
    const t0=performance.now();
    S.ready=new Promise(res=>{
      try{
        if(typeof initSqlJs!=='function'||typeof WebAssembly!=='object')throw new Error(typeof WebAssembly!=='object'?'this browser has no WebAssembly':'engine script missing');
        const bin=atob(window.SQ_WASM_B64);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
        initSqlJs({wasmBinary:u8}).then(SQL=>{
          S.SQL=SQL;const db=new SQL.Database(RUN.build(SQL,D));
          // the page's one addition to the root's data: parent_id (a temporary index makes the UPDATE fast)
          db.exec('CREATE INDEX tmp_parent ON messages (chat_id, id)');D.parent_sql.forEach(s=>db.exec(s));db.exec('DROP INDEX tmp_parent');
          S.ver=db.exec('select sqlite_version()')[0].values[0][0];S.base=db.export();db.close();
          S.ms=Math.round(performance.now()-t0);listeners.forEach(f=>{try{f(true)}catch(e){}});res(true)})
        .catch(e=>{S.fail=(e&&e.message)||String(e);listeners.forEach(f=>{try{f(false)}catch(x){}});res(false)});
      }catch(e){S.fail=(e&&e.message)||String(e);listeners.forEach(f=>{try{f(false)}catch(x){}});res(false)}
    });
    return S.ready;
  }
  const fresh=()=>new S.SQL.Database(S.base);
  function run(sql,cap){const db=fresh();try{return RUN.run(db,sql,cap||60)}finally{db.close()}}
  // ---- comparing two statement results (same rule as src/recompute.py) ----
  const eqv=(p,q)=>(typeof p==='number'&&typeof q==='number')?Math.abs(p-q)<1e-6:String(p)===String(q)||p===q;
  function same(a,b){
    if(!a||!b)return false;
    if(a.error||b.error)return !!(a.error&&b.error);
    if(a.cols||b.cols){if(!a.cols||!b.cols||a.cols.length!==b.cols.length||a.n!==b.n)return false;
      const k=Math.min(a.rows.length,b.rows.length);for(let i=0;i<k;i++){const x=a.rows[i],y=b.rows[i];if(x.length!==y.length)return false;for(let j=0;j<x.length;j++){const p=x[j],q=y[j];if(p===null||q===null){if(p!==q)return false}else if(!eqv(p,q))return false}}return true}
    return true}
  // ---- drawing results ----
  function cell(v){if(v===null||v===undefined)return '<td class="nul">NULL</td>';if(typeof v==='number')return '<td class="n">'+(Number.isInteger(v)?v:+v.toFixed(6))+'</td>';
    if(typeof v==='boolean')return '<td>'+v+'</td>';if(v instanceof Uint8Array)return '<td>(blob)</td>';return '<td>'+esc(v)+'</td>'}
  function one(r,cap,dif){cap=cap||8;
    if(!r.error&&!r.cols){const q=r.sql.replace(/--[^\n]*(\n|$)/g,' ').replace(/\s+/g,' ').trim();
      return '<div class="stl'+(dif?' dif':'')+'"><code>'+esc(q.length>70?q.slice(0,68)+'...':q)+'</code> <span>'+(r.status?esc(r.status):(r.changes!==undefined?r.changes+' row'+(r.changes===1?'':'s')+' changed':'ok'))+'</span></div>'}
    let h='<div class="st'+(r.error?' err':'')+(dif?' dif':'')+'"><div class="s">'+esc(r.sql.replace(/--[^\n]*(\n|$)/g,' ').replace(/\s+/g,' ').trim())+'</div><div class="r">';
    if(r.error)h+='<div class="e">'+esc(r.error)+'</div>';
    else if(r.cols){h+='<div class="tw2"><table class="rt"><tr>'+r.cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>'+r.rows.slice(0,cap).map(row=>'<tr>'+row.map(cell).join('')+'</tr>').join('')+'</table></div>';
      h+='<div class="more">'+(r.n>cap?'first '+cap+' of '+r.n+' rows':r.n+' row'+(r.n===1?'':'s'))+'</div>'}
    else h+='<span class="more">'+(r.status?esc(r.status):(r.changes!==undefined?'ok, '+r.changes+' row'+(r.changes===1?'':'s')+' changed':'ok'))+'</span>';
    return h+'</div></div>'}
  function list(rs,cap,difs){return rs.map((r,i)=>one(r,cap,difs&&difs[i])).join('')}
  // compare the statements that return rows (or fail), in order; k limits how many are compared
  function cmpLists(a,b,k){const ia=[],ib=[];a.forEach((r,i)=>{if(r.cols||r.error)ia.push(i)});b.forEach((r,i)=>{if(r.cols||r.error)ib.push(i)});
    const da=a.map(()=>false),db=b.map(()=>false);let nd=0;const n=Math.min(k||1e9,Math.max(ia.length,ib.length));
    for(let j=0;j<n;j++){const x=a[ia[j]],y=b[ib[j]];if(!same(x,y)){nd++;if(ia[j]!==undefined)da[ia[j]]=true;if(ib[j]!==undefined)db[ib[j]]=true}}
    return {da,db,nd}}
  // ---- runnable boxes ----
  const M=D.exmeta||{};
  const PGL='PostgreSQL '+(M.postgres||'16')+', recorded '+(M.date||'');
  function box(el){
    const id=el.dataset.ex,e=D.ex[id];if(!e){el.textContent='missing example '+id;return}
    const pgOnly=e.only==='pg',cap=+(el.dataset.cap||8);
    el.innerHTML='<div class="rq-h"><b>'+esc(el.dataset.title||'Try it')+'</b><span>'+(pgOnly?'<span class="eng pg">PostgreSQL only: result recorded on a real server</span>':'<span class="eng live">runs live in this page (SQLite)</span> <span class="eng pg">and on PostgreSQL</span>')+'</span></div>'+
      '<textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="SQL for '+esc(id)+'"'+(pgOnly?' readonly':'')+'></textarea>'+
      (pgOnly?'':'<div class="rq-b"><button class="rq-run">&#9654; Run</button><button class="rq-reset">Reset</button><span class="small mute rq-st"></span></div>')+
      '<div class="rq-cmp"></div><div class="rq-o"><div class="rq-l"></div><div class="rq-p"></div></div>';
    const ta=el.querySelector('textarea'),L=el.querySelector('.rq-l'),P=el.querySelector('.rq-p'),C=el.querySelector('.rq-cmp');
    const sql0=pgOnly?(e.pg||e.sql):e.sql;ta.value=sql0;ta.rows=Math.min(18,sql0.split('\n').length+1);
    const pgres=e.pgres||[];
    function drawPg(difs){P.innerHTML='<div class="rq-lab">'+esc(PGL)+(e.pg&&!pgOnly?' (Postgres spelling of the same query below)':'')+'</div>'+
      (e.pg&&!pgOnly?'<details class="mist"><summary class="small">The Postgres version of this SQL</summary><div class="b"><pre class="code">'+esc(e.pg)+'</pre></div></details>':'')+list(pgres,cap,difs)}
    if(pgOnly){L.remove();el.querySelector('.rq-o').style.gridTemplateColumns='1fr';drawPg();C.remove();return}
    let ran=false;
    function go(){
      const edited=ta.value.trim()!==sql0.trim();
      if(!S.SQL){const rec=e.pyres||[];L.innerHTML='<div class="rq-lab">SQLite, recorded (the live engine could not start here'+(S.fail?': '+esc(S.fail):'')+')</div>'+list(rec,cap);drawPg();return}
      const t=performance.now();const r=run(ta.value,60);const ms=performance.now()-t;
      const cm=edited?null:cmpLists(r,pgres,e.cmp);
      L.innerHTML='<div class="rq-lab">SQLite '+esc(S.ver)+', live in this page ('+(ms<1?'under 1':Math.round(ms))+' ms)</div>'+list(r,cap,cm&&cm.da);
      drawPg(cm&&cm.db);
      if(edited)C.innerHTML='<span class="mute">You edited the query; the Postgres result is for the original.</span>';
      else{const nd=cm.nd;C.innerHTML=nd?'<span class="no">The two engines disagree on '+nd+' statement'+(nd>1?'s':'')+' (dashed).</span> '+(el.dataset.why?esc(el.dataset.why):''):'<span class="ok">Both engines return the same result.</span>'}
      ran=true}
    el.querySelector('.rq-run').addEventListener('click',()=>{start().then(go)});
    el.querySelector('.rq-reset').addEventListener('click',()=>{ta.value=sql0;start().then(go)});
    ta.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();start().then(go)}});
    drawPg();
    const kick=()=>{if(!ran)start().then(go)};
    if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)&&el.offsetParent){io.disconnect();kick()}},{rootMargin:'200px'});io.observe(el)}else kick();
  }
  function init(){document.querySelectorAll('.rq[data-ex]').forEach(box)}
  return {start,run,fresh,same,one,list,cell,cmpLists,init,S,onReady:f=>{if(S.SQL)f(true);else if(S.fail)f(false);else listeners.push(f)}};
})();
SM.init();
// start the engine shortly after load, so the first Run is instant
setTimeout(()=>SM.start(),400);
