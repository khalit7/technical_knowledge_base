// ---- Reading: the real Alembic output, measured ALTER TABLE headline numbers, and numbers quoted in the text ----
(function(){
  const D=window.SM_DATA,esc=RD.esc;
  const al=D.alembic;
  if(document.getElementById('rd-alem-py')){
    const body=al.migration.split('\n');const k=body.findIndex(l=>l.startsWith('# revision identifiers'));
    document.getElementById('rd-alem-py').textContent=(k>0?body.slice(k):body).join('\n').trim();
    document.getElementById('rd-alem-sql').textContent=al.sql.trim();
    document.getElementById('rd-alem-v').textContent='migrations/versions/'+al.file+' (Alembic '+al.alembic+', SQLAlchemy '+al.sqlalchemy+'; header lines omitted)';
  }
  const A=D.alter,op=id=>A.ops.find(o=>o.id===id);
  const st=document.getElementById('rd-alter-stats');
  if(st){const f=s=>s<0.01?(s*1000).toFixed(1)+' ms':s.toFixed(2)+' s';
    st.innerHTML=RD.stat('ADD COLUMN ... DEFAULT 0',f(op('add_const').median_s),'metadata only; ACCESS EXCLUSIVE held for that long')+
      RD.stat('ADD COLUMN ... DEFAULT clock_timestamp()',f(op('add_volatile').median_s),'rewrites all '+A.table.rows.toLocaleString('en-US')+' rows under ACCESS EXCLUSIVE')+
      RD.stat('ALTER COLUMN TYPE bigint',f(op('type_bigint').median_s),'rewrite plus index rebuild')+
      RD.stat('CREATE INDEX',f(op('index').median_s),'blocks writes, not reads')+
      RD.stat('CREATE INDEX CONCURRENTLY',f(op('index_conc').median_s),'blocks neither')}
  document.querySelectorAll('[data-num]').forEach(e=>{const v=D.M[e.dataset.num];e.textContent=v===undefined?'?':v});
})();
