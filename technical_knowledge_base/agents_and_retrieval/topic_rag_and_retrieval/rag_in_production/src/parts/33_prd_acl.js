// ---- Access control (Reading, sections 5 and 11): LLM summary, planted-instruction tables, pgvector RLS tables, plans (the stepper is now Fig. 3, 27c_sc_acl.js) ----
(function(){
if(!document.getElementById('pac-sum'))return;
const P=window.PRD,A=P.aclllm,C=P.aclcorpus,G=P.aclpg,esc=RD.esc,$=id=>document.getElementById(id);
const CONDS={prompt_rule:'Rule in the prompt',prompt_rule_claim:'Rule + "I am authorized"',retrieval_filter:'Filter at retrieval'};
const MODELS={'qwen3-1.7b':'Qwen3-1.7B','qwen3-4b':'Qwen3-4B'};
function mark(text,markers){let t=esc(text);markers.forEach(m=>{const re=new RegExp(esc(m).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');t=t.replace(re,x=>'<mark>'+x+'</mark>')});return t}
if(A){
  // summary
  let h='<table><thead><tr><th>Condition</th>'+Object.values(MODELS).map(m=>'<th class="num">'+m+' leaks</th>').join('')+'<th class="num">restricted doc in prompt</th></tr></thead><tbody>';
  Object.entries(CONDS).forEach(([c,lab])=>{const s0=A.models['qwen3-1.7b'].summary[c];
    h+='<tr><td>'+lab+'</td>'+Object.keys(MODELS).map(m=>{const s=A.models[m].summary[c];return '<td class="num">'+s.leaks_new+' of '+s.n+' ('+s.leaks+')</td>'}).join('')+'<td class="num">'+s0.target_in_ctx+' of '+s0.n+'</td></tr>'});
  $('pac-sum').innerHTML=h+'</tbody></table><p class="small mute">Load average '+A.loadavg_start.join('/')+' at the start, '+A.loadavg_end.join('/')+' at the end (timing is not reported: the counts are deterministic at temperature 0).</p>';
  let ih='<table><thead><tr><th>Prompt</th>'+Object.values(MODELS).map(m=>'<th class="num">'+m+': followed</th>').join('')+'<th class="num">planted page in the top 4</th></tr></thead><tbody>';
  ['plain','spotlight'].forEach(c=>{ih+='<tr><td>'+c+'</td>'+Object.keys(MODELS).map(m=>{const s=A.models[m].injection_summary[c];return '<td class="num">'+s.followed+' of '+s.n+'</td>'}).join('')+'<td class="num">'+A.models['qwen3-1.7b'].injection_summary[c].planted_in_ctx+' of '+A.models['qwen3-1.7b'].injection_summary[c].n+'</td></tr>'});
  $('pac-inj').innerHTML=ih+'</tbody></table>';
  $('pac-inj-all').innerHTML=Object.keys(MODELS).map(m=>A.models[m].injection.map(r=>'<p><b>'+MODELS[m]+', '+r.cond+':</b> '+esc(r.q)+'<br><span class="mute">'+mark(r.text,[C.injection_marker])+'</span></p>').join('')).join('');
}else{const nr='<p class="small mute">Not run yet: the generation step (acl_llm.py generate, both models) waits for the shared timing lock. Retrieval is measured: the restricted document reached the top 4 for '+P.f.ctx_in4+' of '+P.f.ctx_n+' questions, the planted page for '+P.f.inj_in4+' of '+P.f.inj_n+' expense questions.</p>';$('pac-sum').innerHTML=nr;$('pac-inj').innerHTML=nr;$('pac-inj-all').innerHTML=nr}
// pgvector table
const MODES=[['unfiltered','unfiltered'],['rls_planner','RLS, fresh plan'],['rls_prepared','RLS, reused plan'],['rls_hnsw','RLS, HNSW forced'],['rls_hnsw_relaxed','+ relaxed'],['rls_hnsw_strict','+ strict'],['rls_exact','RLS, exact'],['owner','owner']];
let pm='rows_mean';
function pg(){
  const U=G.users;let h='<table><thead><tr><th>User (may read)</th>'+MODES.map(m=>'<th class="num">'+m[1]+'</th>').join('')+'</tr></thead><tbody>';
  Object.entries(U).forEach(([u,v])=>{h+='<tr><td>'+u+' ('+(100*v.share).toFixed(1)+'%)</td>'+MODES.map(([m])=>{const x=v.modes[m][pm];
    const bad=(pm==='leaked_rows'&&x>0)||(pm==='rows_mean'&&x<9.95)||(pm==='queries_empty'&&x>0)||(pm==='recall10'&&x<0.9);
    return '<td class="num"'+(bad?' style="color:var(--bad);font-weight:600"':'')+'>'+(pm==='recall10'?x.toFixed(3):pm==='rows_mean'?x.toFixed(2):x)+'</td>'}).join('')+'</tr>'});
  $('pac-pg').innerHTML=h+'</tbody></table><p class="small mute">PostgreSQL '+esc(G.info.pg.replace('PostgreSQL ',''))+', pgvector '+esc(G.info.pgvector)+'; HNSW at defaults (m 16, ef_construction 64, ef_search 40). With FORCE ROW LEVEL SECURITY the owner got 0 forbidden rows for every user.</p>';
}
RD.seg($('pac-pgm'),m=>{pm=m;pg()});pg();
RD.seg($('pac-plan'),m=>{$('pac-plan-t').textContent=G.plans[m].join('\n')});$('pac-plan-t').textContent=G.plans.contractor.join('\n');
})();
