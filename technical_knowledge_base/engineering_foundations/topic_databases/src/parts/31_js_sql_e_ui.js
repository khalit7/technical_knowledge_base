// ---- SQL playground: engine start-up, lessons, result tables ----
window.SQ=(function(){
  const D=window.SQ_DATA,TX=window.SQ_TEXT,RUN=window.SQRUN;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const S={SQL:null,base:null,ver:'',fail:'',li:0,keys:{},freeDb:null,started:false,ready:null};
  const M=D.meta;
  const PGV='PostgreSQL '+M.postgres;
  // ---- engine ----
  function start(){
    if(S.ready)return S.ready;
    const t0=performance.now();
    S.ready=new Promise(res=>{
      try{
        if(typeof initSqlJs!=='function'||typeof WebAssembly!=='object')throw new Error(typeof WebAssembly!=='object'?'this browser has no WebAssembly':'engine script missing');
        const bin=atob(window.SQ_WASM_B64);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
        initSqlJs({wasmBinary:u8}).then(SQL=>{
          S.SQL=SQL;S.base=RUN.build(SQL,D);
          const db=new SQL.Database(S.base);S.ver=db.exec('select sqlite_version()')[0].values[0][0];db.close();
          status('<span class="ok">Live.</span> SQLite '+S.ver+' (sql.js 1.14.2, compiled to WebAssembly and inlined in this page) started in '+Math.round(performance.now()-t0)+' ms with '+(D.users.length+D.chats.length+D.msgs.length+D.credits.length).toLocaleString('en-US')+' rows. Edit any query and press Run; each lesson run starts from a fresh copy of the data.');
          res(true)}).catch(e=>{fallback(e);res(false)});
      }catch(e){fallback(e);res(false)}
    });
    return S.ready;
  }
  function fallback(e){S.fail=(e&&e.message)||String(e);
    status('<span class="no">The in-page engine could not start here</span> ('+esc(S.fail)+'). The lessons still work: pick options from the menus and Run shows the results recorded offline from this same engine (SQLite '+esc(M.sqljs_sqlite||'')+') and from '+PGV+'. Editing and Free play need the live engine.');
    $('sq-ed').readOnly=true;$('sq-fed').readOnly=true;$('sq-fgo').disabled=true;$('sq-freset').disabled=true}
  function status(h){$('sq-status').innerHTML=h}
  // ---- comparing two statement results (same rule as src/sql/recompute.py) ----
  const eqv=(p,q)=>(typeof p==='number'&&typeof q==='number')?Math.abs(p-q)<1e-9:p===q;
  function same(a,b){
    if(a.error||b.error)return !!(a.error&&b.error);
    if(a.cols||b.cols){if(JSON.stringify(a.cols)!==JSON.stringify(b.cols)||a.n!==b.n)return false;
      const k=Math.min(a.rows.length,b.rows.length);for(let i=0;i<k;i++){const x=a.rows[i],y=b.rows[i];if(x.length!==y.length)return false;for(let j=0;j<x.length;j++)if(!eqv(x[j],y[j]))return false}return true}
    return a.changes===b.changes}
  // ---- drawing results ----
  const CAP=8;
  function cell(v){if(v===null||v===undefined)return '<td class="nul">NULL</td>';if(typeof v==='number')return '<td class="n">'+(Number.isInteger(v)?v:+v.toFixed(6))+'</td>';
    if(v instanceof Uint8Array)return '<td>(blob)</td>';return '<td>'+esc(v)+'</td>'}
  function table(r,all){const rows=all?r.rows:r.rows.slice(0,CAP);
    let h='<div class="sq-tw"><table class="sq-t"><thead><tr>'+r.cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+
      rows.map(x=>'<tr>'+x.map(cell).join('')+'</tr>').join('')+'</tbody></table></div>';
    const shown=rows.length;
    if(r.n>shown)h+='<div class="sq-more">'+(r.rows.length>shown?'<button class="sq-all" style="font-size:12px;padding:1px 8px">Show all '+r.n+' rows</button>':'Showing '+shown+' of '+r.n+' rows (the recording keeps the first '+r.rows.length+').')+'</div>';
    else h+='<div class="sq-more">'+r.n+' row'+(r.n===1?'':'s')+'</div>';
    return h}
  function stmt(r,sql,dif,pg){
    let h='<div class="sq-st'+(r.error?' err':'')+(dif?' dif':'')+'">';
    if(sql)h+='<div class="s">'+esc(sql.length>220?sql.slice(0,220)+' ...':sql)+'</div>';
    h+='<div class="r">';
    if(r.error)h+='<div class="e">'+esc(r.error)+'</div>';
    else if(r.cols)h+=table(r,false)+(pg&&r.status?'':'');
    else h+='<span class="mute">'+(pg&&r.status?'<code>'+esc(r.status)+'</code>':(/^\s*(insert|update|delete|replace)/i.test(sql||'')?'OK, '+r.changes+' row'+(r.changes===1?'':'s')+' changed':'OK'))+'</span>';
    if(r.cols&&pg&&r.status)h+='<div class="sq-more"><code>'+esc(r.status)+'</code></div>';
    return h+'</div></div>'}
  // results: list of {sql?, ...}; sqls: statement texts
  function column(title,res,sqls,difs,pg){return '<div><div class="sq-eng">'+title+'</div>'+res.map((r,i)=>stmt(r,sqls[i]||r.sql||'',difs&&difs[i],pg)).join('')+'</div>'}
  function bindAll(el,store){el.querySelectorAll('.sq-all').forEach((b,i)=>b.addEventListener('click',()=>{
    const st=b.closest('.sq-st');const k=+st.dataset.k;const r=store[st.dataset.c][k];st.querySelector('.r').innerHTML=table(r,true)}))}
  function render(el,live,liveLabel,pg,sqls,note){
    let difs=null,agree=null;
    if(pg){difs=[];const n=Math.max(live.length,pg.length);for(let i=0;i<n;i++)difs.push(!(live[i]&&pg[i]&&same(live[i],pg[i])));agree=!difs.some(Boolean)}
    let h='';
    if(pg){
      h+=agree?'<div class="sq-agree">&#10003; '+PGV+' gave the same result for every statement.</div>':'<div class="sq-differ">&#9888; SQLite and '+PGV+' disagree at statement '+difs.map((d,i)=>d?i+1:0).filter(Boolean).join(', ')+' (outlined below).</div>';
      if(agree)h+=column(liveLabel,live,sqls,null,false)+'<details class="mist"><summary>'+PGV+' result (recorded offline)</summary><div class="b" style="padding-left:12px">'+column('',pg,sqls,null,true)+'</div></details>';
      else h+='<div class="sq-cmp">'+column(liveLabel,live,sqls,difs,false)+column(PGV+', recorded offline',pg,sqls,difs,true)+'</div>';
    }else h+=column(liveLabel,live,sqls,null,false)+(note?'<p class="small mute">'+note+'</p>':'');
    el.innerHTML=h;
    // tag each statement box so "show all" can find its full rows
    const cols=el.querySelectorAll('.sq-eng');const store={};
    let ci=0;el.querySelectorAll('.sq-st').forEach(st=>{});
    // map boxes in document order: live boxes first (or both columns), then pg boxes
    const boxes=[...el.querySelectorAll('.sq-st')];const nl=live.length;
    boxes.forEach((b,i)=>{if(i<nl){b.dataset.c='l';b.dataset.k=i}else{b.dataset.c='p';b.dataset.k=i-nl}});
    store.l=live;store.p=pg||[];bindAll(el,store);
  }
  // ---- lessons ----
  const L=D.lessons;
  function vkey(){const l=L[S.li];const k=S.keys[l.id]||l.params.map(()=>0);return l.params.length?k.join('-'):'0'}
  function chips(){$('sq-chips').innerHTML=L.map((l,i)=>{const dif=Object.keys(l.variants).some(k=>M.differ.indexOf(l.id+':'+k)>=0);
    return '<button role="tab" data-i="'+i+'" class="'+(i===S.li?'on':'')+(dif?' dif':'')+'" title="'+(dif?'Some choices differ between SQLite and Postgres':'')+'">'+(i+1)+'. '+esc(l.title)+'</button>'}).join('')}
  function showLesson(i,scroll){
    S.li=i;const l=L[i],t=TX[l.id]||{};chips();
    $('sq-kick').textContent='Lesson '+(i+1)+' of '+L.length;$('sq-lt').textContent=l.title;
    $('sq-intro').innerHTML='<p><b>Goal.</b> '+t.goal+'</p><p><b>Why it matters.</b> '+t.why+'</p>';
    const k=S.keys[l.id]||(S.keys[l.id]=l.params.map(()=>0));
    $('sq-params').innerHTML=l.params.map((p,pi)=>'<label>'+esc(p.label)+' <select data-p="'+pi+'">'+p.options.map((o,oi)=>'<option value="'+oi+'"'+(oi===k[pi]?' selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>').join('')+
      (l.params.length?'<span class="small mute">Each choice was also recorded on Postgres.</span>':'');
    $('sq-hint').innerHTML='<b>Hint.</b> '+t.hint;$('sq-hint').hidden=true;$('sq-hintb').textContent='Show hint';
    $('sq-joincard').hidden=l.id!=='join';
    if(l.id==='join'&&window.SQJ)window.SQJ.redraw();
    loadVariant();
    if(scroll)$('sq-chips').scrollIntoView({block:'nearest'});
  }
  function loadVariant(){const l=L[S.li];const q=l.variants[vkey()].sql;$('sq-ed').value=q;fit($('sq-ed'));edited();run()}
  function fit(t){t.style.height='auto';if(t.scrollHeight)t.style.height=(t.scrollHeight+4)+'px'}
  function edited(){const l=L[S.li];const e=$('sq-ed').value.trim()!==l.variants[vkey()].sql.trim();$('sq-edited').textContent=e?'Edited: Postgres was recorded only for the menu choices, so only SQLite runs this.':'';return e}
  function explain(){const l=L[S.li],t=TX[l.id]||{},k=vkey();
    let h=t.explain||'';const n=t.notes&&t.notes[k];if(n)h='<div class="co'+(M.differ.indexOf(l.id+':'+k)>=0?' warn':' key')+'"><div class="t">This choice</div>'+n+'</div>'+h;
    $('sq-explain').innerHTML='<h3 style="margin:12px 0 2px">What the result means</h3>'+h;}
  function run(){
    const l=L[S.li],v=l.variants[vkey()],out=$('sq-out');const ed=edited();
    S.ready.then(ok=>{
      if(ok){const db=new S.SQL.Database(S.base);let res;try{res=RUN.run(db,$('sq-ed').value,500)}finally{db.close()}
        const sqls=res.map(r=>r.sql);
        render(out,res,'SQLite '+S.ver+', live in this page',ed?null:v.pg,sqls,ed?'Your edit ran on SQLite only. Choose a menu option or press Reset query to compare with Postgres again.':'');
      }else{const sqls=splitSql(v.sql);render(out,v.sqlite,'SQLite '+(M.sqljs_sqlite||'')+', recorded offline',v.pg,sqls,'')}
      explain();
    });
  }
  // statement texts for the recorded runs (lesson SQL has no ; inside quotes)
  function splitSql(s){return s.split(/;\s*(?:\n|$)/).map(x=>x.trim()).filter(Boolean)}
  function init(){
    $('sq-ddl').textContent=D.schema;
    schema();
    $('sq-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(b)showLesson(+b.dataset.i,false)});
    $('sq-params').addEventListener('change',e=>{const s=e.target.closest('select');if(!s)return;const l=L[S.li];S.keys[l.id][+s.dataset.p]=+s.value;loadVariant()});
    $('sq-go').addEventListener('click',run);
    $('sq-reset').addEventListener('click',loadVariant);
    $('sq-ed').addEventListener('input',()=>{edited();fit($('sq-ed'))});
    $('sq-ed').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();run()}});
    $('sq-hintb').addEventListener('click',()=>{const h=$('sq-hint');h.hidden=!h.hidden;$('sq-hintb').textContent=h.hidden?'Show hint':'Hide hint'});
    $('sq-prev').addEventListener('click',()=>showLesson((S.li+L.length-1)%L.length,true));
    $('sq-next').addEventListener('click',()=>showLesson((S.li+1)%L.length,true));
    if(window.RD&&RD.tabLinks){RD.tabLinks($('sq-explain'));RD.tabLinks($('sq-intro'));RD.tabLinks($('sq-hint'))}
    $('sq-how').innerHTML='Engine: <a href="https://github.com/sql-js/sql.js" target="_blank" rel="noopener noreferrer">sql.js</a> 1.14.2 (MIT licence; SQLite itself is <a href="https://sqlite.org/copyright.html" target="_blank" rel="noopener noreferrer">public domain</a>), whose 658 KB WebAssembly file is inlined as text and started from memory, since this page has no network. Data: 50 users, 200 chats, 2,000 messages and 50 credit balances from a seeded generator (<code>src/sql/gen_data.py</code>). Recording: all 45 menu choices were run on '+PGV+' (the pgserver build) and on SQLite '+esc(M.python_sqlite)+' (Python) and '+esc(M.sqljs_sqlite)+' (this page\'s engine, run in node) on '+esc(M.date)+', each from a fresh copy of the data (<code>src/sql/recompute.py</code>). The two SQLite builds agree on every statement; SQLite and Postgres differ on '+M.differ.length+' choices, marked with a dashed outline on the lesson buttons: '+M.differ.map(dname).join('; ')+'. Error messages differ in wording between the engines; a statement counts as agreeing when both refuse it.';
    showLesson(0,false);
  }
  function dname(k){const [id,v]=k.split(':');const i=L.findIndex(l=>l.id===id);const l=L[i];const idx=v.split('-').map(Number);
    return 'lesson '+(i+1)+(l.params.length?' ('+l.params.map((p,j)=>esc(p.options[idx[j]])).join(', ')+')':'')}
  function schema(){
    const notes={'users.id':'PK','chats.id':'PK','messages.id':'PK','credits.user_id':'PK, FK to users','chats.user_id':'FK to users','messages.chat_id':'FK to chats'};
    const rows={users:D.users.length,chats:D.chats.length,messages:D.msgs.length,credits:D.credits.length};
    const extra={'users.email':'unique','users.plan':'free, pro, team','users.country':'may be NULL','chats.title':'may be NULL','messages.role':'user, assistant','credits.balance':'never below 0'};
    $('sq-schema').innerHTML=Object.keys(D.cols).map(t=>'<div class="sq-tb"><div class="h">'+t+'<span>'+rows[t].toLocaleString('en-US')+' rows</span></div>'+
      D.cols[t].map(c=>{const n=notes[t+'.'+c]||'';return '<div class="c'+(n.indexOf('PK')===0?' pk':n?' fk':'')+'"><b>'+c+'</b><i>'+(n||extra[t+'.'+c]||'')+'</i></div>'}).join('')+'</div>').join('');
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-sql']=window.TAB_RENDER['t-sql']||[]).push(()=>{if(!S.started){S.started=true;start();init()}if(window.SQJ)window.SQJ.redraw()});
  return {S,start,run:(db,sql)=>RUN.run(db,sql,500),render,esc};
})();
