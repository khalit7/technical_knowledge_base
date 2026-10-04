// ---- Tab: run regex-log's real test on the reader's regex; exploit matrix; RDI catalogue ----
window.TK=(function(){
  const T=AG.task;
  const PRESETS={
    naive:'\\d{4}-\\d{2}-\\d{2}',
    ip:'(?=.*\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b).*\\b(\\d{4}-\\d{2}-\\d{2})\\b',
    ref:T.solution,
    none:null
  };
  // Python re.findall(pattern, text, re.MULTILINE) in JS: one group returns the group, none the whole match, several a tuple
  function findall(p,text){
    const js=p.replace(/\(\?P</g,'(?<').replace(/\(\?P=(\w+)\)/g,'\\k<$1>');
    const re=new RegExp(js,'gm');const out=[];let m;let guard=0;
    const ng=(new RegExp(js+'|')).exec('').length-1;
    while((m=re.exec(text))!==null&&guard++<10000){
      out.push(ng===0?m[0]:ng===1?(m[1]===undefined?'':m[1]):m.slice(1).map(x=>x===undefined?'':x));
      if(m[0]==='')re.lastIndex++;
    }
    return out;
  }
  // the test: file exists, compiles, findall over the joined logs equals the expected list
  function run(p){
    if(p===null)return {ok:false,msg:'AssertionError: Regex file /app/regex.txt does not exist',matches:null};
    const pat=p.trim();
    try{new RegExp(pat.replace(/\(\?P</g,'(?<'),'gm')}catch(e){return {ok:false,msg:'AssertionError: Regex in /app/regex.txt is invalid: '+e.message,matches:null}}
    const text=T.logs.map(l=>l[0]).join('\n');
    const got=findall(pat,text);
    const ok=JSON.stringify(got)===JSON.stringify(T.expected);
    return {ok,msg:ok?'1 passed':'AssertionError: Expected '+JSON.stringify(T.expected)+', but got '+JSON.stringify(got),matches:got};
  }
  // per line: what the pattern returns on that line alone (for display; the test itself runs on the joined text)
  function perLine(p){return T.logs.map(l=>{try{return findall(p.trim(),l[0])}catch(e){return null}})}
  return {PRESETS,findall,run,perLine};
})();
(function(){
  const root=document.getElementById('t-task');if(!root)return;
  const E=RD.esc,T=AG.task,ta=document.getElementById('tk-rx');
  document.getElementById('tk-instr').textContent=T.instruction;
  let cur='naive',empty=false;ta.value=TK.PRESETS.naive;
  function show(){
    const p=empty?null:ta.value;const r=TK.run(p);
    document.getElementById('tk-verdict').innerHTML='<div class="co '+(r.ok?'key':'warn')+'"><div class="t">'+(r.ok?'PASSED: reward.txt = 1':'FAILED: reward.txt = 0')+'</div><code style="overflow-wrap:anywhere">'+E(r.msg)+'</code></div>';
    const per=p===null?T.logs.map(()=>null):TK.perLine(p);
    const expLines=[];let ei=0;
    let t='<thead><tr><th>#</th><th>Log line (from the test)</th><th>Should yield</th><th>Your pattern yields</th></tr></thead><tbody>';
    T.logs.forEach((l,i)=>{const y=l[1].trim().startsWith('Y');const want=y?T.expected[ei++]:'';const got=per[i];
      const gotTxt=got===null?'':got.length?got.map(x=>Array.isArray(x)?'('+x.join(', ')+')':x).join(', '):'nothing';
      const good=(y&&got&&got.length===1&&got[0]===want)||(!y&&got&&got.length===0);
      t+='<tr><td class="num">'+(i+1)+'</td><td><code style="overflow-wrap:anywhere">'+E(l[0])+'</code><div class="mute small">'+E(l[1])+'</div></td><td>'+(y?E(want):'nothing')+'</td><td>'+(p===null?'':'<span class="pill '+(good?'ok':'no')+'">'+E(gotTxt)+'</span>')+'</td></tr>'});
    document.getElementById('tk-lines').innerHTML=t+'</tbody>';
    matrix();
  }
  function matrix(){
    const ag=document.getElementById('tk-ag').value,lay=document.getElementById('tk-lay').value;
    const r=TK.run(empty?null:ta.value);let rew,why;
    if(ag==='honest'){rew=r.ok?1:0;why=r.ok?'earned: the real test ran and passed':'the real test ran and failed'}
    else if(lay==='shared'){rew=1;why='unearned: the verifier ran curl from the agent\'s container, the wrapper trojaned uvx, and the fake pytest output passed; your regex was never read'}
    else{rew=0;why='the separate verifier read only the declared artifact (missing) and ran pytest from its own image; the wrapper never ran'}
    document.getElementById('tk-matrix').innerHTML='<div class="out">'+RD.stat('reward.txt',rew,'')+RD.stat('Real test executed',(ag==='exploit'&&lay==='shared')?'no':'yes','')+RD.stat('Why',(rew===1&&ag==='exploit')?'exploit':'test',E(why))+'</div>';
  }
  document.querySelectorAll('#tk-presets button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#tk-presets button').forEach(x=>x.classList.toggle('on',x===b));
    cur=b.dataset.p;empty=cur==='none';ta.value=empty?'':TK.PRESETS[cur];ta.disabled=empty;show()}));
  document.getElementById('tk-run').addEventListener('click',()=>{empty=false;ta.disabled=false;show()});
  ta.addEventListener('input',()=>{empty=false});
  document.getElementById('tk-ag').addEventListener('change',matrix);document.getElementById('tk-lay').addEventListener('change',matrix);
  document.querySelector('#tk-presets button[data-p="naive"]').classList.add('on');
  // RDI catalogue
  const R=[
    ['Terminal-Bench (2.0)','89','100%','Wrapped curl (82 tasks) or pip, python, uvx (7); trojaned uvx prints a passing pytest session','1, 7','Run the checker outside the agent\'s container; install nothing at trial time; read-only binaries','3.0 and 4.0 task files: separate verifier in 74 of 74 and 66 of 66 (counted here)'],
    ['SWE-bench Verified','500','100%','conftest.py hook rewrites every test outcome to passed; for Django, patch unittest\'s run','1, 7','Run tests outside the agent\'s environment; treat its outputs as untrusted','not checked here (see Coding)'],
    ['SWE-bench Pro','731','100%','Overwrites the in-container parser that reads test results','1, 7','Same','not checked here (see Coding)'],
    ['WebArena','812','about 100%','file:// URL reads the task config with the gold answer; DOM and prompt injection; must_include substring check; eval()','2, 3, 4, 5','Keep answers off the agent\'s machine; no eval(); sanitise judge input; exact structured matching','not checked'],
    ['FieldWorkArena','890','100%','Validator only checks the last message is from the assistant; "{}" passes (and parseable JSON passes the 71 JSON tasks)','6','Make the scorer score: test it with null and random agents','not checked'],
    ['CAR-bench','hallucination tasks','100%','Three of four reward components return no penalty for that task type; hidden notes steer the LLM judge','4, 6','No category skips a check; delimit agent text in judge prompts','not checked'],
    ['GAIA','165 validation','about 98%','Public validation answers; normaliser collapses distinct strings; one miss per level dodges the all-1.0 filter; comma bug marks "1500" wrong against "1,500"','2, 5, 6','Keep primary-split answers secret; strict typed matching; adversarial scorer tests','leaderboard still takes uploaded answers (read 4 Oct 2026)'],
    ['OSWorld','369','73%','wget the public gold file into the checked path; set checked state with gsettings; "FAIL" on 29 infeasible tasks; eval() on a VM string runs code on the grader','1, 2, 3','Gold files off the VM; no eval(); checker on a separate host','not checked']
  ];
  const PAT=['','No isolation between agent and evaluator','Answers shipped with the test','eval() on untrusted input','LLM judges without input sanitisation','Weak string matching','Evaluation logic that does not evaluate','Trusting the output of untrusted code'];
  let t='<thead><tr><th>Benchmark</th><th class="num">Tasks</th><th class="num">Score</th><th>Exploit</th><th>RDI pattern</th><th>Defence</th><th>Fixed?</th></tr></thead><tbody>';
  R.forEach(r=>{t+='<tr><td>'+E(r[0])+'</td><td class="num">'+E(r[1])+'</td><td class="num">'+E(r[2])+'</td><td>'+E(r[3])+'</td><td>'+r[4].split(', ').map(n=>'<span title="'+E(PAT[+n])+'">'+n+'. '+E(PAT[+n])+'</span>').join('<br>')+'</td><td>'+E(r[5])+'</td><td>'+E(r[6])+'</td></tr>'});
  document.getElementById('tk-rdi').innerHTML=t+'</tbody>';
  RD.onRender(show,'t-task');
})();
