// ---- Reading, section 13: SQL injection, live in the page's database (each run on a fresh copy) ----
(function(){
  const inp=document.getElementById('rd-inj-in');if(!inp)return;
  const esc=RD.esc,$=id=>document.getElementById(id);
  const Q1=v=>"SELECT id, email, name FROM users WHERE email = '"+v+"'";
  const Q2="SELECT id, email, name FROM users WHERE email = ?";
  function tbl(cols,rows){if(!rows.length)return '<p class="small mute">0 rows</p>';
    return '<div class="tw2"><table class="rt"><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>'+rows.slice(0,6).map(r=>'<tr>'+r.map(SM.cell).join('')+'</tr>').join('')+'</table></div><p class="small mute">'+rows.length+' row'+(rows.length===1?'':'s')+(rows.length>6?' (first 6 shown)':'')+'</p>'}
  function go(){
    const v=inp.value;$('rd-inj-sql1').textContent=Q1(v)+';';$('rd-inj-sql2').textContent=Q2+';\n-- bound value: '+JSON.stringify(v);
    if(!SM.S.SQL){$('rd-inj-out1').innerHTML=$('rd-inj-out2').innerHTML='<p class="small mute">'+(SM.S.fail?'The in-page engine could not start here ('+esc(SM.S.fail)+').':'Starting the database...')+'</p>';return}
    // 1: pasted into the text, run as a script (as a driver that accepts several statements would)
    let db=SM.fresh();let h='';
    try{const rs=SQRUN.run(db,Q1(v)+';',50);
      rs.forEach(r=>{if(r.error)h+='<div class="st err"><div class="r"><div class="e">'+esc(r.error)+'</div></div></div>';else if(r.cols)h+=tbl(r.cols,r.rows);else h+='<p class="small" style="color:var(--bad)">A second statement ran: '+esc(r.sql.slice(0,60))+' ('+r.changes+' rows changed)</p>'});
      const hacked=db.exec("SELECT COUNT(*) FROM credits WHERE balance = 999999")[0].values[0][0];
      if(hacked)h+='<p class="small" style="color:var(--bad);font-weight:600">'+hacked+' credit balances are now 999,999.</p>';}
    finally{db.close()}
    $('rd-inj-out1').innerHTML=h;
    // 2: a prepared statement with the value bound
    db=SM.fresh();try{const st=db.prepare(Q2);st.bind([v]);const rows=[];while(st.step())rows.push(st.get());const cols=st.getColumnNames();st.free();
      const hacked=db.exec("SELECT COUNT(*) FROM credits WHERE balance = 999999")[0].values[0][0];
      $('rd-inj-out2').innerHTML=tbl(cols,rows)+(hacked?'':'<p class="small" style="color:var(--good)">No other statement can run: the input is only ever compared with emails.</p>')}finally{db.close()}
    const notes={"x' OR '1'='1":'The quote closes the string and OR ’1’=’1’ is true for every row: the concatenated query returns all 50 users. The bound query looks for an email that is literally that text, and finds none.',
      "O'Reilly@example.com":'An honest apostrophe breaks the concatenated query with a syntax error; the bound query simply finds no such user. Parameters fix bugs as well as attacks.'};
    $('rd-inj-note').textContent=notes[v]||(v.indexOf('UNION')>=0?'UNION appends a second query with the same number of columns, so the attacker reads another table (here every balance) through the email lookup.':v.indexOf('UPDATE')>=0?'The semicolon ends the first statement and a second one runs. Many drivers refuse several statements in one call (Python’s sqlite3 does; psycopg 3 does when parameters are used), but the first three attacks need only one statement.':'A normal lookup: both versions return the same row.');
  }
  $('rd-inj-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;inp.value=b.dataset.v;go()});
  inp.addEventListener('input',()=>{clearTimeout(inp._t);inp._t=setTimeout(go,250)});
  SM.onReady(go);go();
})();
