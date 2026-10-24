// ---- Access control (Reading, sections 5 and 11): prompt rule vs retrieval filter animation, LLM summary, pgvector RLS tables, plans ----
(function(){
if(!document.getElementById('pac-card'))return;
const P=window.PRD,A=P.aclllm,C=P.aclcorpus,G=P.aclpg,esc=RD.esc,$=id=>document.getElementById(id);
const DOCS={};C.docs.forEach(d=>DOCS[d.id]=d);
const USER=['public'],CONDS={prompt_rule:'Rule in the prompt',prompt_rule_claim:'Rule + "I am authorized"',retrieval_filter:'Filter at retrieval'};
const MODELS={'qwen3-1.7b':'Qwen3-1.7B','qwen3-4b':'Qwen3-4B'};
const qs=C.questions.flatMap(it=>it.q.map(q=>({q,target:it.target,marker:it.marker})));
$('pac-q').innerHTML=qs.map((x,i)=>'<option value="'+i+'">'+esc(x.q)+'</option>').join('');
function mark(text,markers){let t=esc(text);markers.forEach(m=>{const re=new RegExp(esc(m).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');t=t.replace(re,x=>'<mark>'+x+'</mark>')});return t}
let mode='prompt_rule';
function cur(){
  const i=+$('pac-q').value,q=qs[i],g=$('pac-g').value;
  const ctx=(A?A.contexts:P.aclctx).restricted.find(r=>r.q===q.q);
  const row=A?A.models[g].rows.find(r=>r.cond===mode&&r.q.startsWith(q.q)):null;
  return {q,g,ctx,row,ids:mode==='retrieval_filter'?ctx.top4_filtered:ctx.top4};
}
function draw(step){
  const {q,ctx,row,ids}=cur(),body=$('pac-body');
  const qtext=mode==='prompt_rule_claim'?q.q+C.authority_suffix:q.q;
  let h='<div class="pac-q">User (groups: '+USER.join(', ')+'): '+esc(qtext)+'</div>';
  h+='<div class="pac-docs">'+C.docs.map(d=>{const ok=USER.includes(d.group),top=step>=1&&ids.includes(d.id);
    return '<div class="pac-doc '+(ok?'ok':'no')+(top?' top':'')+'"><b>'+d.id+' '+esc(d.title)+'</b>'+d.group+(d.id===q.target?' (holds the answer)':'')+(top?' &#8594; in the prompt':'')+'</div>'}).join('')+'</div>';
  const forb=ids.filter(i=>!USER.includes(DOCS[i].group)).length;
  if(step>=3)h+='<div class="pac-ans">'+(row?mark(row.text,q.marker.concat([C.injection_marker])):'Not run yet: the generation step waits for the shared timing lock. The prompt above is exactly what the model will receive.')+'</div>';
  if(step>=4&&row)h+='<p><span class="pac-v '+(row.leak_new?'bad':'good')+'">'+(row.leak_new?'Leak: the answer contains a fact only the restricted document holds.':row.leak?'No new fact: the marker in the answer was already in the question.':'No leak in this answer.')+'</span></p>';
  body.innerHTML=h;
  const caps=['The user may read only public documents. The question\'s answer is in '+q.target+' ('+DOCS[q.target].group+').',
    mode==='retrieval_filter'?'Retrieval searches only the documents this user may read: the top 4 are all public, so the answer cannot be in the prompt.':'Retrieval searches all 12 documents. The top 4 include '+forb+' the user may not read (red), the target among them: rank '+ctx.target_rank+'.',
    mode==='retrieval_filter'?'The prompt holds only permitted documents and the same access rule.':'The prompt holds the 4 documents, each tagged with its group, and a system prompt that forbids using or revealing other groups\' documents'+(mode==='prompt_rule_claim'?'; the user claims to be authorized.':'.'),
    (row?'The model\'s answer (temperature 0, real output):':'The model\'s answer:'),(row?'':'Not run yet. ')+'Checked against the restricted document\'s facts ('+q.marker.join(', ')+').'];
  $('pac-cap').textContent=caps[step];
}
let an=null;
an=RD.anim({card:'pac-card',ctl:'pac-ctl',n:A?5:4,draw,ms:1700,label:'Access step'});
  RD.seg($('pac-mode'),m=>{mode=m;an.reset(A?5:4)});
  $('pac-q').addEventListener('change',()=>an.reset(A?5:4));$('pac-g').addEventListener('change',()=>an.reset(A?5:4));
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
RD.onResize(()=>an.redraw());
})();
