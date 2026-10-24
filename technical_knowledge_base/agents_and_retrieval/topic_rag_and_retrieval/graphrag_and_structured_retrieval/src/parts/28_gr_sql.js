// ---- Reading section 10: one question under four prompts (moved from the old Text-to-SQL lab); section 11: concert_singer in Kuzu ----
(function(){
  const D=window.GR,S=D.sql,E=GRL.esc,$=id=>document.getElementById(id);
  if(!$('sq-card'))return;
  const rows=S.rows,dbs=[...new Set(rows.map(r=>r.db))].sort();
  const RUN=D.sql_runs&&(D.sql_runs['1.7b']||D.sql_runs['4b']),RUNM=D.sql_runs?(D.sql_runs['1.7b']?'1.7b':'4b'):null;
  $('sq-db').innerHTML=dbs.map(d=>'<option>'+E(d)+'</option>').join('');
  let ri=0;
  function qs(){const d=$('sq-db').value;const L=rows.map((r,i)=>[r,i]).filter(x=>x[0].db===d);
    $('sq-q').innerHTML=L.map(([r,i])=>'<option value="'+i+'">'+E(r.question.length>60?r.question.slice(0,58)+'...':r.question)+'</option>').join('');ri=L[0][1];draw2()}
  const COND=[['none','No schema: the question only'],['all20','All 20 databases dumped'],['retrieved','5 tables retrieved by bge-small'],['oracle','The question\'s own database']];
  const tokTop=r=>{const t=D.schema_ret.top5[String(r.i)]||[];return t};
  function draw(i){const r=rows[ri];
    $('sq-qt').textContent=r.question;
    const top=tokTop(r),gold=new Set(r.tables.map(t=>r.db+'.'+t));
    const toks={none:0,all20:S.meta.schema_tokens_all20,retrieved:null,oracle:r.schema_tokens_own};
    const max=S.meta.schema_tokens_all20;
    $('sq-bars').innerHTML=COND.map(([c,n],j)=>{const v=c==='retrieved'?(D.schema_ret.systems['bge-small'].tokens_at['5']):toks[c];const lab=c==='retrieved'?'about '+GRL.fmt(v)+' (mean)':GRL.fmt(v);
      return '<div class="sq-row'+(j===Math.min(i,3)?' on':'')+'"><span class="nm">'+n.split(':')[0]+'</span><div class="sq-bar" style="width:'+(100*Math.max(v,1)/max).toFixed(1)+'%;opacity:'+(j<=i?1:.15)+'"></div><span class="v">'+lab+' tok</span></div>'}).join('');
    const c=COND[Math.min(i,3)][0];
    $('sq-cap').textContent=COND[Math.min(i,3)][1]+'. '+({none:'The model must guess every table and column name.',all20:'Everything is there, including '+GRL.fmt(S.meta.tables)+' tables the question does not need; the model must also pick the database.',retrieved:'Only the top 5 tables of the pooled 81; green ones are read by the gold SQL. The model must still pick the database.',oracle:'The standard Spider setting: the right database, all of its tables.'})[c];
    let body='';
    if(c==='retrieved')body+='<div class="sq-tabs">'+top.map(([db,t])=>'<span class="sq-tb'+(gold.has(db+'.'+t)?' g':'')+'">'+E(db)+'.'+E(t)+'</span>').join('')+'</div><div class="small mute">'+r.tables.filter(t=>top.some(([d,x])=>d===r.db&&x===t)).length+' of '+r.tables.length+' gold tables retrieved</div>';
    if(c==='oracle'||c==='retrieved'){const s=D.schema[r.db];body+='<div class="gr-src sq-schema">'+Object.values(s).filter(x=>c==='oracle'||top.some(([d,t])=>d===r.db&&x.toLowerCase().includes('"'+t+'"'))).map(E).join('\n')+'</div>'}
    const res=RUN&&RUN[c]?RUN[c].rows.find(x=>x.i===r.i):null;
    body+=res?'<div class="small">Qwen3-'+RUNM+' wrote:</div><div class="gr-src">'+E(res.sql)+'</div><div class="small">'+(res.err?'<span style="color:var(--bad)">error: '+E(res.err)+'</span>':(res.strict?'<span style="color:var(--good)">result matches the gold result</span>':res.lenient?'<span style="color:var(--c5)">same rows, columns in another order</span>':'<span style="color:var(--bad)">ran, wrong result</span>'))+'</div>':'<div class="gr-pbox"><b>Pending run.</b> The model\'s SQL for this prompt and its execution result (s_sql_run.py run 1.7b, about 15 min).</div>';
    $('sq-body').innerHTML=body;
    $('sq-ctr').innerHTML='<span>schema tokens <b>'+(c==='retrieved'?'see bar':GRL.fmt(toks[c]))+'</b></span><span>gold tables in prompt <b>'+(c==='none'?0:c==='retrieved'?r.tables.filter(t=>top.some(([d,x])=>d===r.db&&x===t)).length:r.tables.length)+'</b> of '+r.tables.length+'</span><span>rows the gold query aggregates over <b>'+(r.support_rows==null?'not an aggregate':GRL.fmt(r.support_rows))+'</b></span>'}
  function draw2(){A.reset(4);const r=rows[ri];
    $('sq-gold').innerHTML='<div class="gr-src">'+E(r.gold)+'</div><div class="small">'+GRL.fmt(r.gold_rows)+' row(s); first: '+(r.gold_preview.length?r.gold_preview.map(x=>E(x.join(', '))).join(' | '):'(empty)')+'</div>';
    const K=D.kuzu;const C=D.cypher_runs&&(D.cypher_runs['1.7b']||D.cypher_runs['4b']);
    $('sq-cy').innerHTML='<div class="gr-src">'+E(K.schema)+'</div>'+K.examples.map(e=>'<p class="small"><b>'+E(e.q)+'</b></p><div class="gr-src">'+E(e.sql)+'\n'+E(e.cypher)+'</div><div class="small">'+(e.equal?'same rows from SQLite and Kùzu':'different rows')+': '+E(e.cypher_rows.slice(0,3).map(x=>x.join(', ')).join(' | '))+'</div>').join('')+
      (C?'<p class="small">Generated, 45 questions: SQL '+C.sql.ex+' of 45 match, Cypher '+C.cypher.ex+' of 45 <span class="meas">measured</span>.</p>':'<div class="gr-pbox"><b>Pending run.</b> The same 45 questions written as SQL and as Cypher by the local model (s_cypher_run.py run 1.7b, about 3 min).</div>')}
  const A=RD.anim({card:'sq-card',ctl:'sq-ctl',n:4,draw,ms:2000,label:'Prompt condition'});
  $('sq-db').addEventListener('change',qs);$('sq-q').addEventListener('change',e=>{ri=+e.target.value;draw2()});
  qs();
  RD.onRender(()=>A.redraw());
})();
