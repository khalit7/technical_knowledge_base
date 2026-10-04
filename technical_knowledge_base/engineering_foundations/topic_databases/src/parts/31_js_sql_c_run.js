// ---- SQL playground: load the chat data into the in-page SQLite and run a script statement by statement ----
// Shared by the page and by src/sql/run_sqljs.mjs (which runs every lesson in node with this same code).
(function(G){
  const R={};
  const p2=n=>(n<10?'0':'')+n;
  // message timestamps are stored as seconds after 2026-01-01 00:00:00
  R.ts=s=>{const d=new Date(Date.UTC(2026,0,1)+s*1000);
    return d.getUTCFullYear()+'-'+p2(d.getUTCMonth()+1)+'-'+p2(d.getUTCDate())+' '+p2(d.getUTCHours())+':'+p2(d.getUTCMinutes())+':'+p2(d.getUTCSeconds())};
  R.tables=D=>({users:D.users,chats:D.chats,
    messages:D.msgs.map(m=>[m[0],m[1],m[2]?'assistant':'user',D.pool[m[2]][m[3]],m[4],R.ts(m[5])]),credits:D.credits});
  // build a fresh database from the schema and the generated rows; returns its bytes so every run can start from a clean copy
  R.build=(SQL,D)=>{const db=new SQL.Database();db.exec(D.schema);const T=R.tables(D);db.exec('BEGIN');
    Object.keys(D.cols).forEach(t=>{const c=D.cols[t];const st=db.prepare('INSERT INTO '+t+' ('+c.join(',')+') VALUES ('+c.map(()=>'?').join(',')+')');
      T[t].forEach(r=>st.run(r));st.free()});
    db.exec('COMMIT');const bytes=db.export();db.close();return bytes};
  // Run a script like a terminal client: one statement at a time, keep going after an error.
  // Each result: {sql, cols, rows, n} for statements that return rows, {sql, changes} otherwise, {sql, error} on failure.
  R.run=(db,sql,cap)=>{cap=cap||200;const out=[];let rest=sql;let guard=0;
    while(rest&&rest.trim()&&guard++<200){
      let it;try{it=db.iterateStatements(rest)}catch(e){out.push({sql:rest.trim(),error:e.message});break}
      let failed=false;
      while(true){let st;
        try{const n=it.next();if(n.done)break;st=n.value}
        catch(e){ // could not even prepare this statement (syntax error, unknown table): report it and skip to the next ;
          const rem=it.getRemainingSQL?it.getRemainingSQL():rest;const k=rem.indexOf(';');
          out.push({sql:(k<0?rem:rem.slice(0,k+1)).trim().replace(/;$/,''),error:e.message});
          rest=k<0?'':rem.slice(k+1);failed=true;break}
        const r={sql:st.getSQL().trim().replace(/;$/,'')};
        try{const cols=st.getColumnNames();
          if(cols.length){const rows=[];let n=0;while(st.step()){if(n<cap)rows.push(st.get());n++}r.cols=cols;r.rows=rows;r.n=n}
          else{st.step();r.changes=/^\s*(insert|update|delete|replace)/i.test(r.sql)?db.getRowsModified():0}}
        catch(e){r.error=e.message}
        try{st.free()}catch(e){}
        out.push(r)}
      if(!failed)rest=''}
    return out};
  G.SQRUN=R;
})(typeof window!=='undefined'?window:globalThis);
