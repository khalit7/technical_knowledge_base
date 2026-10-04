// ---- Reading tab (Testing and quality): derived numbers, code views, measured blocks ----
(function(){
  const TQ=window.TQ, esc=RD.esc;
  const H=TQ.hyp, M=TQ.mut, F=TQ.flaky, G=TQ.integ;
  // which mutants does a set of test-function ids kill (used here and by the Mutation lab)
  TQ.killed=ids=>M.mutants.filter(m=>m.by.some(b=>ids.indexOf(b)>=0));
  TQ.covered=ids=>{const s=new Set(M.import_lines);M.tests.forEach(t=>{if(ids.indexOf(t.id)>=0)t.lines.forEach(l=>s.add(l))});return M.stmts.filter(l=>s.has(l))};
  const weak=M.tests.filter(t=>t.suite==='weak').map(t=>t.id), strong=M.tests.filter(t=>t.suite==='strong').map(t=>t.id);
  const sum=a=>a.reduce((x,y)=>x+y,0);
  const fin=H.seeds.map(s=>s.final.join('|'));
  // derived numbers (checked by src/recompute.py)
  TQ.calc={
    hypSeedsFound:H.seeds.length, hypMaxTries:Math.max(...H.seeds.map(s=>s.tries)), hypCalls:H.log.length,
    hypMinimal:fin.filter(f=>f==='0|2|0').length,
    mutN:M.mutants.length, mutWeak:TQ.killed(weak).length, mutStrong:TQ.killed(strong).length,
    mutWeakPct:(100*TQ.killed(weak).length/M.mutants.length).toFixed(1),
    covWeak:(100*TQ.covered(weak).length/M.stmts.length).toFixed(0),
    mutWeakCrash:TQ.killed(weak).filter(m=>m.kind==='crash').length,
    mutSurvValue:M.mutants.filter(m=>!m.by.some(b=>weak.indexOf(b)>=0)).filter(m=>m.kind!=='crash').length,
    flakyRuns:F.batches.length*2000, flakyFails:sum(F.batches), flakyPct:(100*sum(F.batches)/(F.batches.length*2000)).toFixed(1),
    flakyMin:Math.min(...F.batches), flakyMax:Math.max(...F.batches),
    pgRatio:(G.pg_ms/G.sqlite_ms).toFixed(0), pgWarmMin:Math.min(...G.pg_start_warm_s).toFixed(2), pgWarmMax:Math.max(...G.pg_start_warm_s).toFixed(2),
    pg500:(500*G.pg_ms/1000).toFixed(1)
  };
  const get=p=>p.split('.').reduce((o,k)=>o==null?o:o[k],TQ);
  document.querySelectorAll('[data-v]').forEach(el=>{const v=get(el.dataset.v);el.textContent=v==null?'?':String(v)});

  // a small Python highlighter: comments, strings, keywords (enough for reading, not a parser)
  const KW=/\b(def|async|await|class|return|raise|if|elif|else|for|in|try|except|finally|with|as|not|and|or|is|None|True|False|import|from|yield|lambda|while|pass|assert)\b/g;
  function findComment(l){let q=null;for(let i=0;i<l.length;i++){const c=l[i];if(q){if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c==='#')return i}return -1}
  function hl(line,py){
    let code=line,cm='';const i=findComment(line);if(i>=0){code=line.slice(0,i);cm=line.slice(i)}
    let h=esc(code);
    if(py){h=h.replace(/(&quot;[^&]*?&quot;|'[^']*?')/g,'\u0001$1\u0002');
      h=h.split(/(\u0001[^\u0002]*\u0002)/).map(p=>p[0]==='\u0001'?'<span class="s">'+p.slice(1,-1)+'</span>':p.replace(KW,'<span class="kw">$1</span>')).join('')}
    return h+(cm?'<span class="cm">'+esc(cm)+'</span>':'');
  }
  RD.hl=hl;
  RD.codeLines=(text,py)=>text.replace(/\n$/,'').split('\n').map((l,i)=>'<span class="l"><span class="g">'+(i+1)+'</span>'+hl(l,py)+'</span>').join('');
  document.querySelectorAll('pre.cv').forEach(el=>{el.innerHTML=RD.codeLines(el.textContent,el.classList.contains('py'))});

  // integration cost block
  const ic=document.getElementById('int-cost');
  if(ic)ic.innerHTML='Measured, '+TQ.env.date+', median of '+G.n+' runs each (experiments/integ/test_timing.py):\n'+
    '  SQLite in memory      <b>'+G.sqlite_ms+' ms</b> per test (create table, 3 inserts, 1 search)\n'+
    '  PostgreSQL '+TQ.env.postgres+'       <b>'+G.pg_ms+' ms</b> per test, about '+TQ.calc.pgRatio+'x slower\n'+
    '  PostgreSQL startup    <b>'+TQ.calc.pgWarmMin+' to '+TQ.calc.pgWarmMax+' s</b> once per test run ('+G.pg_start_warm_s.length+' runs; '+G.pg_start_cold_s+' s the very first time)\n'+
    '  500 such tests        about <b>'+TQ.calc.pg500+' s</b> of PostgreSQL time plus one startup';
})();
(function(){
  const F=TQ.float,S=TQ.smoke;
  const fo=document.getElementById('float-out');
  if(fo)fo.innerHTML='Measured ('+TQ.env.date+', experiments/mlt/float_demo.py): one million float32 normal samples, seed 0\n'+
    '  np.sum(x)              <b>'+F.numpy_float32_pairwise+'</b>\n'+
    '  np.sum(x[::-1])        <b>'+F.numpy_float32_reversed+'</b>   same numbers, reverse order\n'+
    '  float64 reference      <b>'+F.numpy_float64+'</b>\n'+
    '  forward == reversed?   <span class="r">'+(F.pairwise_vs_reversed_equal?'True':'False')+'</span> (they differ by '+F.abs_diff_pairwise_reversed+')\n'+
    '  assert_allclose(float32 sum, float64 sum, rtol=1e-5)   <span class="g">pass</span>';
  const so=document.getElementById('smoke-out');
  if(so)so.innerHTML='Loss over 500 steps on 10 examples (experiments/mlt/smoke_out.json)\n'+
    '  correct loop        '+S.ok[0]+' to <b>'+S.ok[1]+'</b>   below 10% of the start: <span class="g">pass</span>\n'+
    '  shuffled labels     '+S.bug[0]+' to <b>'+S.bug[1]+'</b>   no learning: the smoke test catches it';
})();
(function(){
  const F=TQ.flaky,C=TQ.calc;
  const st=document.getElementById('fl-strip');
  if(st)st.innerHTML=F.seq.split('').map(c=>'<span'+(c==='F'?' class="f"':'')+'></span>').join('');
  const o=document.getElementById('fl-out');
  if(o)o.innerHTML='This run: <b>'+F.fails+' of '+F.runs+'</b> failed ('+(100*F.fails/F.runs).toFixed(1)+'%), and the outcome flipped between consecutive runs '+F.flips+' times.\n'+
    'Six batches of 2,000: '+F.batches.join(', ')+' failures; '+C.flakyFails+' of '+C.flakyRuns+' runs, <b>'+C.flakyPct+'%</b> (theory: 0.1 / 2.0 = 5%).\n'+
    'Fixed test, 2,000 runs: <span class="g">2000 passed</span>.';
  const r=document.getElementById('fl-ord');
  if(r)r.innerHTML='In file order (default first): <span class="g">2 passed</span>, so it looks fine in CI.\n'+
    'Shuffled with pytest-randomly, seeds 1 to '+F.order_runs+': <span class="r">'+F.order_flaky+' of '+F.order_runs+' orders failed</span> (expected about half: two tests, two orders).\n'+
    'With monkeypatch: <span class="g">'+F.order_fixed+' of '+F.order_runs+' failed</span>.';
})();
(function(){
  const M=TQ.mut,C=TQ.calc;
  const co=document.getElementById('cov-out');
  if(co)co.innerHTML='$ coverage run --branch -m pytest tests/test_weak.py &amp;&amp; coverage report -m\n'+RD.esc(M.cov_weak).replace('100%','<b>100%</b>');
  const weak=M.tests.filter(t=>t.suite==='weak').map(t=>t.id);
  const surv=M.mutants.filter(m=>!m.by.some(b=>weak.indexOf(b)>=0));
  const mo=document.getElementById('mut-out');
  if(mo)mo.innerHTML='mutmut '+TQ.env.mutmut+': <b>'+C.mutN+' mutants</b>; weak suite (100% line and branch coverage) killed <b>'+C.mutWeak+'</b> ('+C.mutWeakPct+'%), improved suite killed <b>'+C.mutStrong+'</b>.\nSurvivors of the weak suite:\n'+
    surv.map(m=>'  <span class="r">'+RD.esc(m.id.padEnd(20))+'</span> '+RD.esc(m.orig)+'\n'+' '.repeat(23)+'<b>'+RD.esc(m.mut)+'</b>').join('\n');
})();
(function(){
  const G=[['g-test','Test','a small program that runs your code on a chosen input and checks the result'],['g-runner','Test runner','finds tests, runs them in isolation and reports results (pytest)'],
  ['g-nodeid','Node id','the address of one test: file::name[params]'],['g-fixture','Fixture','a function that builds something a test needs and cleans it up'],['g-scope','Fixture scope','how often a fixture is rebuilt: function, module or session'],
  ['g-marker','Marker','a label on a test (slow, gpu) used to select or skip it'],['g-regression','Regression test','a test written for a bug, so it never comes back'],['g-pure','Pure function','output depends only on the inputs, no side effects'],
  ['g-static','Static checks','type checkers and linters that read code without running it'],['g-unit','Unit test','one function or class, in one process, no I/O'],['g-int2','Integration test','your code with a real dependency'],['g-e2e','End-to-end test','the deployed system driven like a user'],
  ['g-pyramid','Test pyramid','many unit tests, fewer integration, very few end-to-end'],['g-trophy','Testing trophy','static base, integration as the widest layer'],
  ['g-double','Test double','anything standing in for a real dependency in a test'],['g-dummy','Dummy','fills a parameter, never used'],['g-stub','Stub','returns canned answers'],['g-spy','Spy','a stub that records its calls'],['g-mock','Mock','checks that expected calls happened'],['g-fake','Fake','a small working implementation'],
  ['g-contract','Contract test','checks the agreement between two services directly (Pact)'],['g-property','Property','a statement true for every valid input'],['g-pbt','Property-based test','generates inputs to try to break a property'],
  ['g-strategy','Strategy','a recipe for generating one kind of value in Hypothesis'],['g-shrink','Shrinking','simplifying a failing input while it still fails'],['g-hdb','Example database','where Hypothesis saves failing inputs to replay them'],
  ['g-stateful','Stateful test','random sequences of operations checked against a model'],['g-oracle','Test oracle','a trusted way to compute the right answer'],['g-snapshot','Snapshot test','compares output to a recorded, reviewed copy'],
  ['g-async','Async code','code that pauses at await while waiting for I/O'],['g-schema','Data schema','what valid data looks like, checked on every batch'],['g-smoke','Smoke test','a tiny end-to-end run that catches wiring bugs'],
  ['g-vcr','Recorded response','a real HTTP exchange saved to a cassette and replayed'],['g-flaky','Flaky test','passes and fails on the same code'],['g-coverage','Coverage','which lines and branches ran during the tests'],
  ['g-mutation','Mutation testing','planting small bugs to see whether the tests notice'],['g-mutant','Mutant','one planted change; killed if a test fails'],['g-mscore','Mutation score','share of mutants killed'],['g-ci','Continuous integration','checks run automatically on every change']];
  const el=document.getElementById('gloss');
  if(el)el.innerHTML=G.filter(g=>document.getElementById(g[0])).map(g=>'<div><b><a href="#'+g[0]+'">'+g[1]+'</a></b>: '+g[2]+'</div>').join('');
  if(el&&G.some(g=>!document.getElementById(g[0])))window.__jsErr&&window.__jsErr('glossary id missing: '+G.filter(g=>!document.getElementById(g[0])).map(g=>g[0]).join(','));
})();
