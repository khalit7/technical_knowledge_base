// ---- Reading tab widgets (prefix gr) ----
(function(){
  const D=window.GR,E=GRL.esc,$=id=>document.getElementById(id);
  // predict, then reveal
  document.querySelectorAll('#t-read .gr-prd').forEach(b=>{
    b.querySelectorAll('.opts button').forEach(o=>o.addEventListener('click',()=>{
      b.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',!!x.dataset.right);x.classList.toggle('wrong',x===o&&!x.dataset.right)});
      const a=b.querySelector('.ans');a.hidden=false;
      if(!a.querySelector('.verdict'))a.insertAdjacentHTML('afterbegin','<span class="verdict">'+(o.dataset.right?'Right.':'Not quite.')+'</span>');
    }));
  });
  // the NLP extractor on one real paragraph
  (function(){const el=$('gr-nlp-ex'),x=D.nlp.example;if(!el)return;
    el.innerHTML='<div class="small mute">graphrag 3.3.0 RegexENNounPhraseExtractor on the corpus paragraph "'+E(x.title)+'" (first 600 characters shown)</div><p class="small">'+E(x.text)+'&hellip;</p><div>'+x.phrases.map(p=>'<span class="gr-chip">'+E(p)+'</span>').join('')+'</div><p class="small mute">'+x.phrases.length+' phrases: names (ALEXANDER KERENSKY, BOLSHEVIKS) and generic noun groups (KEY PLAYER, GENERAL IDEOLOGY) alike, all upper-cased; months come out as their own nodes.</p>'})();
  // hand-labelled merges
  (function(){const seg=$('gr-lab-seg'),el=$('gr-lab-list');if(!seg)return;
    function draw(m){const L=D.labels[m];const ok=L.filter(x=>x[2]).length;
      el.innerHTML='<p class="mute">'+ok+' of '+L.length+' right. Mention found in the paragraph &rarr; title it was merged into.</p><div class="tw"><table class="gr-t"><tbody>'+
        L.map(x=>'<tr><td>'+E(x[0])+'</td><td>&rarr; '+E(x[1])+'</td><td style="color:'+(x[2]?'var(--good)':'var(--bad)')+';white-space:nowrap">'+(x[2]?'right':'wrong')+(x[3]?' (borderline)':'')+'</td></tr>').join('')+'</tbody></table></div>'}
    RD.seg(seg,draw);draw('norm')})();
  // both gold in top k, per system
  const SYS=[['bm25','BM25'],['dense','dense (bge-small)'],['hybrid','hybrid RRF'],['ppr_phrase','PPR, phrase graph'],['ppr_bipartite_pruned','PPR, passages + phrases, pruned'],['ppr_title_dense','PPR, title links'],['expand_title','expand along title links']];
  let hopMode='all';
  function hop(){const el=$('gr-hop-chart');if(!el)return;const ks=['1','2','3','5','10','20'];
    const series=SYS.map(([k,n],i)=>({name:n,color:k==='expand_title'?'var(--ink)':GRL.COL[i],bold:k==='expand_title'||k==='dense',dash:k.startsWith('ppr'),
      ys:ks.map(x=>hopMode==='all'?D.ppr.systems[k].both[x]:D.ppr.systems[k].by_type[hopMode][x])}));
    GRL.line(el,{xs:ks.map(k=>'k '+k),series,ymax:hopMode==='all'?200:hopMode==='bridge'?160:40,label:'questions with both gold paragraphs in the top k'});
    GRL.legend($('gr-hop-leg'),series)}
  if($('gr-hop-seg'))RD.seg($('gr-hop-seg'),m=>{hopMode=m;hop()});
  // schema retrieval
  function sr(){const el=$('gr-sr-chart');if(!el)return;const ks=['1','2','3','5','10'];const S=D.schema_ret.systems;
    const series=[{name:'BM25',color:GRL.COL[0],ys:ks.map(k=>S['bm25'].all_gold_at[k])},{name:'bge-small',color:GRL.COL[2],ys:ks.map(k=>S['bge-small'].all_gold_at[k])}];
    GRL.line(el,{xs:ks.map(k=>'k '+k),series,ymax:100,label:'questions with every gold table in the top k',h:210});
    GRL.legend($('gr-sr-leg'),series);
    $('gr-sr-leg').insertAdjacentHTML('beforeend','<span>schema tokens at k (bge-small): '+ks.map(k=>k+': '+GRL.fmt(S['bge-small'].tokens_at[k])).join(', ')+'</span>')}
  RD.onRender(()=>{hop();sr()});RD.onResize(()=>{hop();sr()});hop();sr();

  // ---- results of the generator runs, or a pending box ----
  const tbl=(head,rows)=>'<div class="tw"><table class="gr-t"><thead><tr>'+head.map((h,i)=>'<th'+(i?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const done=(id,html)=>{const el=$(id);if(el){el.style.borderStyle='solid';el.style.borderColor='var(--line)';el.innerHTML=html}};
  // extraction
  (function(){const rows=[];[['extract_1_7b','Qwen3-1.7B'],['extract_4b','Qwen3-4B']].forEach(([k,n])=>{const m=D[k]&&D[k].meta;if(!m)return;
      rows.push([n+', graphrag prompt + gleaning',GRL.fmt(m.paragraphs),GRL.fmt(m.tok_in/m.paragraphs),GRL.fmt(m.tok_out/m.paragraphs),GRL.fmt1(m.gen_seconds/m.paragraphs),GRL.fmt(m.entities),GRL.fmt(m.relations),Math.round(100*(m.entities-m.entities_first_call)/Math.max(1,m.entities))+'%'])});
    const ag=D.agt_graph&&D.agt_graph.index;if(ag)rows.push(['Qwen3-1.7B, Agentic lab one-call prompt',GRL.fmt(ag.paragraphs),GRL.fmt(ag.tok_in/ag.paragraphs),GRL.fmt(ag.tok_out/ag.paragraphs),GRL.fmt1(ag.gen_seconds/ag.paragraphs),'','','']);
    if(rows.length)done('gr-ex-pend','<b>Measured</b> <span class="meas">measured</span>: LLM extraction of the subset paragraphs.'+tbl(['extraction','paragraphs','prompt tok / para','output tok / para','s / para','entities','relations','entities added by gleaning'],rows));
    if(!D.extract_1_7b)GRL.pend(rows.length?'gr-ex-pend2':'gr-ex-pend','graphrag\'s extraction prompt and parser with Qwen3-1.7B on the 394 subset paragraphs (first 150 paragraphs; Qwen3-4B on the first 40): tokens, seconds, entities and relations per paragraph, and what gleaning adds.','s_extract.py run 1.7b 150; s_extract.py run 4b 40','60 min');})();
  // entity resolution on LLM extractions, each compared on the same paragraphs
  (function(){const fmtR=e=>[e.exact.title_recall+' / '+e.norm.title_recall+' / '+e.embed.title_recall+' of '+e.exact.paragraphs,e.exact.bridge_link+' / '+e.norm.bridge_link+' / '+e.embed.bridge_link+' of '+e.exact.bridge_q];
    const blocks=[];
    const ag=D.entities_agt&&D.entities_agt.subset;
    if(ag)blocks.push('<p class="small"><b>All 394 subset paragraphs</b></p>'+tbl(['extraction','title recall','bridge pairs joined'],[['noun phrases (no LLM)'].concat(fmtR(D.ent.subset)),['Qwen3-1.7B, Agentic lab one-call prompt'].concat(fmtR(ag))]));
    [['entities_1_7b_150','Qwen3-1.7B, graphrag prompt + gleaning'],['entities_4b_40','Qwen3-4B, graphrag prompt + gleaning']].forEach(([k,lab])=>{const e=D[k];if(!e)return;
      const rows=[['noun phrases (no LLM)'].concat(fmtR(e.nlp_same))];if(e.agt_same)rows.push(['Qwen3-1.7B, Agentic lab one-call prompt'].concat(fmtR(e.agt_same)));rows.push([lab].concat(fmtR(e.subset)));
      blocks.push('<p class="small"><b>The first '+e.subset.exact.paragraphs+' subset paragraphs</b></p>'+tbl(['extraction','title recall','bridge pairs joined'],rows))});
    if(blocks.length)done('gr-ent-pend','<b>Same gold, LLM extractions</b> <span class="meas">measured</span> (exact / normalised / embedding resolution):'+blocks.join(''));
    if(!D.entities_1_7b_150)GRL.pend(blocks.length?'gr-ent-pend2':'gr-ent-pend','The same table for this page\'s graphrag-prompt extractions (Qwen3-1.7B on the first 150 subset paragraphs, Qwen3-4B on the first 40).','s_entities.py 1.7b_150 | 4b_40','1 min, no generator, after the extraction runs');})();
  // global search
  (function(){const runs=[['global_1_7b','Qwen3-1.7B'],['global_4b','Qwen3-4B']].filter(([k])=>D[k]);
    if(!runs.length){GRL.pend('gr-glob-pend','GraphRAG-style global search on the subset with graphrag\'s own fast-mode report prompt and map and reduce prompts: one report per level-0 Leiden community ('+D.comm.subset.leiden_l0+'), five corpus-wide questions answered by map-reduce and by a dense top 10, with calls, tokens and seconds for each.','s_global.py run 1.7b; s_global.py run 4b','35 min');return}
    const rows=runs.map(([k,n])=>{const g=D[k],a=g.answers,av=(f,x)=>a.reduce((s,y)=>s+y[f][x],0)/a.length;
      return [n,g.reports.length+' ('+g.reports.filter(r=>r.parsed).length+' valid JSON)',GRL.fmt(g.report_cost.report_in)+' / '+GRL.fmt(g.report_cost.report_out),GRL.fmt(av('cost_global','calls'))+' / 1',GRL.fmt(av('cost_global','in'))+' / '+GRL.fmt(av('cost_naive','in')),GRL.fmt1(av('cost_global','s'))+' / '+GRL.fmt1(av('cost_naive','s')),GRL.fmt(a.reduce((s,x)=>s+x.paragraphs_behind_points,0)/a.length)+' / 10']});
    done('gr-glob-pend','<b>Measured</b> <span class="meas">measured</span> on the 394-paragraph subset, five global questions; per question, map-reduce / dense top 10:'+tbl(['model','community reports','report tokens in / out','calls','prompt tokens','seconds','paragraphs behind the answer'],rows)+'<p class="small">The answers, side by side, are in the global search stepper above.</p>');})();
  // LightRAG run
  (function(){const r=D.lightrag_4b;if(!r){GRL.pend('gr-lr-pend','LightRAG 1.5.7 with Qwen3-4B behind llama-server and bge-small embeddings: index 60 subset paragraphs, then ask the questions whose gold paragraphs are among them in the naive, local, global, hybrid and mix modes, recording calls and tokens.','s_lightrag.py run 4b 60','25 min');return}
    const modes=['naive','local','global','hybrid','mix'];done('gr-lr-pend','<b>Measured</b> <span class="meas">measured</span>, LightRAG 1.5.7 with Qwen3-4B: indexing '+r.insert.paragraphs+' paragraphs took '+r.insert.calls+' calls, '+GRL.fmt(r.insert.tok_in)+' prompt and '+GRL.fmt(r.insert.tok_out)+' output tokens, '+GRL.fmt(r.insert.wall_s)+' s.'+
      tbl(['mode','answers containing the gold answer','calls / question','prompt tokens / question'],modes.map(m=>[m,r.answers.filter(x=>x[m].contains_gold).length+' of '+r.answers.length,GRL.fmt1(r.answers.reduce((s,x)=>s+x[m].calls,0)/Math.max(1,r.answers.length)),GRL.fmt(r.answers.reduce((s,x)=>s+x[m].tok_in,0)/Math.max(1,r.answers.length))])));})();
  // multi-hop answers
  (function(){const q=D.qa&&D.qa['1.7b'];if(!q){GRL.pend('gr-qa-pend','Answers from each retriever\'s top 5 with the root Agentic lab\'s single-shot prompt and Qwen3-1.7B (EM and F1 on the 200 questions), next to the lab\'s recorded dense single-shot (F1 '+GRL.fmt3(D.agent_root['1.7b']&&D.agent_root['1.7b'].single_k5?D.agent_root['1.7b'].single_k5.f1:NaN)+') and ReAct agent (F1 '+GRL.fmt3(D.agent_root['1.7b']&&D.agent_root['1.7b'].react?D.agent_root['1.7b'].react.f1:NaN)+') runs.','s_qa.py run 1.7b','11 min');return}
    const names={dense:'dense top 5 (Agentic lab)',hybrid:'hybrid top 5',expand_title:'expand along title links, top 5',ppr_title_dense:'PPR title links, top 5',ppr_bipartite_pruned:'PPR passages + phrases, top 5',agent:'ReAct agent (Agentic lab)'};
    done('gr-qa-pend','<b>Measured</b> <span class="meas">measured</span>, Qwen3-1.7B, 200 questions, HotpotQA official EM and F1:'+tbl(['retrieval','EM','F1','both gold in prompt','prompt tokens'],Object.keys(names).filter(k=>q.agg[k]).map(k=>[names[k],GRL.fmt3(q.agg[k].em),GRL.fmt3(q.agg[k].f1),q.agg[k].both_gold,GRL.fmt(q.agg[k].tok_in)])));})();
  // text-to-SQL
  (function(){const s=D.sql_runs;if(!s){GRL.pend('gr-sql-pend','Execution accuracy of Qwen3-1.7B (and 4B) on the 100 questions under four prompts: no schema, all 20 databases dumped, the 5 retrieved tables, and the question\'s own database; with prompt tokens and the share of queries that run at all.','s_sql_run.py run 1.7b','15 min');return}
    const C={none:'no schema',all20:'all 20 databases',retrieved:'5 retrieved tables',oracle:'own database'};const rows=[];
    Object.keys(s).forEach(m=>Object.keys(C).forEach(c=>{const r=s[m][c];if(r)rows.push(['Qwen3-'+m.toUpperCase().replace('B','B'),C[c],r.ex+' / '+r.ex_lenient,r.runs,c==='all20'||c==='retrieved'?r.db_ok:'',GRL.fmt(r.tok_in)])}));
    done('gr-sql-pend','<b>Measured</b> <span class="meas">measured</span>, 100 Spider dev questions:'+tbl(['model','schema in prompt','execution match (strict / columns any order)','queries that ran','right database named','prompt tokens'],rows));})();
  (function(){const c=D.cypher_runs;if(!c){GRL.pend('gr-cy-pend','The 45 concert_singer dev questions answered by the local model as SQL and as Cypher over the same rows in Kùzu: execution accuracy of each.','s_cypher_run.py run 1.7b','3 min');return}
    done('gr-cy-pend','<b>Measured</b> <span class="meas">measured</span>, 45 concert_singer questions:'+tbl(['model','SQL execution match','Cypher execution match','Cypher queries that ran'],Object.keys(c).map(m=>['Qwen3-'+m,c[m].sql.ex+' of 45',c[m].cypher.ex+' of 45',c[m].cypher.runs+' of 45'])));})();
  document.querySelectorAll('#t-read .gr-pbox').forEach(b=>{if(!b.innerHTML.trim())b.hidden=true});
  RD.tabLinks($('t-read'));
})();
