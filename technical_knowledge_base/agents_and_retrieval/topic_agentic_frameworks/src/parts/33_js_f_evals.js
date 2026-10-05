// ---- Production stack (t-ops): regression suite over recorded runs ----
(function(){
  const D=window.OPS,U=window.OPU,esc=U.esc;if(!D||!U||!D.evals||!document.getElementById('ops-evf'))return;
  const V=window.OPS_V=window.OPS_V||{};
  const RUNS=D.evals.runs;V['ev.n']=String(RUNS.length);
  const GL={std_haiku:'Baseline: Haiku, six tools',ops_cc:'Baseline with OpenTelemetry on',std_sonnet:'Model swap: Sonnet 5.5',md_haiku:'Add a CLAUDE.md naming the test command',
    log_haiku:'A 491 KB CI log in the repo (Haiku)',log_sonnet:'A 491 KB CI log in the repo (Sonnet)',nocache_haiku:'DISABLE_PROMPT_CACHING=1',ttl5m_haiku:'Prompt cache TTL 5 minutes',
    sub_haiku:'Asked to delegate to a subagent',plan_haiku:'Plan mode',orch_agent:'Same task, Orchestration lab driver',orch_agent_denied:'Allow-list: python3 only'};
  const grp=r=>r.run==='ops_cc_otel'?'ops_cc':r.run.startsWith('orch_')?r.run:r.run.replace(/_\d+$/,'');
  const hid=r=>(r.hidden||[]).filter(x=>x[1]).length;
  const P={hid:5,cost:0.06,turns:15,perm:1};
  const CH=[['tests','Visible tests pass',r=>!!r.tests_pass],['notests','Tests not edited',r=>!(r.touched||[]).some(f=>/^tests\//.test(f))],
    ['hidden','Hidden checks',r=>hid(r)>=P.hid],['verify','Ran tests after last edit',r=>!!r.tested_after_edit],['perm','No permission denials',r=>!P.perm||!r.denials],
    ['cost','Cost',r=>r.cost!=null&&r.cost<=P.cost],['turns','Turns',r=>r.turns!=null&&r.turns<=P.turns]];
  const box=document.getElementById('ops-evctl');
  box.innerHTML='<label>Hidden checks needed: <b id="ops-ev-hv"></b> of 6<input type="range" id="ops-ev-h" min="3" max="6" step="1" value="'+P.hid+'"></label>'+
    '<label>Cost limit per run: <b id="ops-ev-cv"></b><input type="range" id="ops-ev-c" min="0.03" max="0.1" step="0.005" value="'+P.cost+'"></label>'+
    '<label>Turn limit: <b id="ops-ev-tv"></b><input type="range" id="ops-ev-t" min="5" max="20" step="1" value="'+P.turns+'"></label>'+
    '<label><input type="checkbox" id="ops-ev-p" checked> Block on any permission denial</label>';
  document.getElementById('ops-ev-p').addEventListener('change',e=>{P.perm=e.target.checked?1:0;run()});
  [['h','hid'],['c','cost'],['t','turns']].forEach(([k,p])=>document.getElementById('ops-ev-'+k).addEventListener('input',e=>{P[p]=+e.target.value;run()}));
  function run(){
    document.getElementById('ops-ev-hv').textContent=P.hid;document.getElementById('ops-ev-cv').textContent='$'+P.cost.toFixed(3);document.getElementById('ops-ev-tv').textContent=P.turns;
    const G={};RUNS.forEach(r=>{(G[grp(r)]=G[grp(r)]||[]).push(r)});
    const base=G.std_haiku,passAll=r=>CH.every(c=>c[2](r)),rate=a=>a.filter(passAll).length/a.length,mean=(a,f)=>a.reduce((s,r)=>s+f(r),0)/a.length;
    const bR=rate(base),bC=mean(base,r=>r.cost);
    let h='<tr><th>Configuration</th><th class="num">Runs</th><th class="num">Pass every check</th><th class="num">Hidden checks (mean)</th><th class="num">Mean cost</th><th class="num">Mean turns</th><th>Gate against the baseline</th></tr>';
    Object.keys(GL).filter(k=>G[k]).forEach(k=>{const a=G[k],rr=rate(a),fails=CH.filter(c=>a.some(r=>!c[2](r))).map(c=>c[1]);
      const reg=k!=='std_haiku'&&(rr<bR||fails.length&&rr<1);
      h+='<tr'+(k==='std_haiku'?' class="sel"':'')+'><td>'+GL[k]+'</td><td class="num">'+a.length+'</td><td class="num">'+(rr*100).toFixed(0)+'%</td><td class="num">'+mean(a,hid).toFixed(1)+'</td><td class="num">'+U.usd(mean(a,r=>r.cost))+'</td><td class="num">'+mean(a,r=>r.turns).toFixed(1)+'</td><td>'+
        (k==='std_haiku'?'baseline':(reg?'<span class="ops-gate n">block</span> '+esc(fails.join(', ')):'<span class="ops-gate y">pass</span>'+(mean(a,r=>r.cost)>bC*1.25?' <span class="small mute">(cost up '+((mean(a,r=>r.cost)/bC-1)*100).toFixed(0)+'%)</span>':'')))+'</td></tr>'});
    document.getElementById('ops-evgrp').innerHTML=h;
    let t='<tr><th>Run</th>'+CH.map(c=>'<th class="c">'+c[1]+'</th>').join('')+'<th class="num">Cost</th><th class="num">Turns</th><th class="num">Hidden</th></tr>';
    RUNS.forEach(r=>{t+='<tr><td>'+esc(r.title)+'<br><span class="small mute">'+esc(r.source)+'</span></td>'+CH.map(c=>'<td class="c '+(c[2](r)?'ops-ok':'ops-no')+'">'+(c[2](r)?'&#10003;':'&#10007;')+'</td>').join('')+
      '<td class="num">'+U.usd(r.cost)+'</td><td class="num">'+r.turns+'</td><td class="num">'+hid(r)+'/6</td></tr>'});
    document.getElementById('ops-evrun').innerHTML=t;
  }
  run();
  const den=RUNS.find(r=>r.run==='orch_agent_denied'),pl=RUNS.find(r=>r.run==='plan_haiku_1');
  const son=RUNS.filter(r=>/sonnet/.test(r.run)),hai=RUNS.filter(r=>/haiku/.test(r.run)&&r.tests_pass);
  const sh=RUNS.filter(r=>grp(r)==='std_haiku'),costs=sh.map(r=>r.cost),turns=sh.map(r=>r.turns);
  U.pred('ops-pr2',1,()=>'The run with the allow-list <code>Bash(python3:*)</code> typed <code>python</code> three times, was denied each time ('+den.denials+' permission denials) and finished without ever running the tests. Its code happens to pass, but the agent claimed success without evidence; the next task it will not be lucky. Only a check on the <i>trajectory</i> (did it verify after its last edit?) sees that; checks on the final state cannot.');
  document.getElementById('ops-evfind').innerHTML='<h3>What the suite says</h3><ul>'+
    '<li><b>Visible tests are a low bar.</b> Every run that edited code passed all three visible tests. The six hidden checks separate the models: Sonnet runs scored '+son.map(hid).join(', ')+' of 6, Haiku runs '+[...new Set(hai.map(hid))].join(' or ')+' (the miss is quotes around a word: <code>\'quoted\'</code> keeps its apostrophes under the Haiku fixes). Set the hidden-check slider to 6 and every Haiku configuration is blocked.</li>'+
    '<li><b>A strict policy check blocks the best model.</b> Every Sonnet run had a Bash command denied by the allow-list: three tried to fix the code with <code>sed -i</code> and then used the Edit tool; one combined <code>cat</code> and <code>find</code> in a single command. Whether an attempted action outside policy should block a release is a decision, not a fact: untick the denial check and Sonnet passes everything, including all six hidden checks.</li>'+
    '<li><b>Plan mode is blocked</b> because it changed no code ('+(pl.tests_pass?'':'visible tests still fail, ')+hid(pl)+' of 6 hidden checks, as the unfixed code): correct behaviour for plan mode, wrong for this task. A gate needs a task set that matches what the change is for.</li>'+
    '<li><b>Three runs is a small sample.</b> The three baseline runs cost '+costs.map(c=>U.usd(c)).join(', ')+' and took '+turns.join(', ')+' turns. A cost gate set near the baseline mean blocks the baseline itself some of the time; gate on a distribution (several runs, a margin), not on one number.</li>'+
    '<li><b>Telemetry did not change behaviour:</b> the run with OpenTelemetry on passed the same checks at '+U.usd(RUNS.find(r=>r.run==='ops_cc_otel').cost)+'.</li></ul>';
})();
