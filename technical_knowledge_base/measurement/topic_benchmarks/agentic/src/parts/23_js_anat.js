// ---- Reading: one real Terminal-Bench 2.0 task (regex-log), three runs, step by step ----
// Files and commands are verbatim from harbor-framework/terminal-bench-2/regex-log (read 2026-10-04);
// the exploit follows Berkeley RDI's write-up; the third mode is the separate-verifier layout of TB 3.0 and 4.0 task files (illustrative on this task).
(function(){
  const fig=document.getElementById('an1-fig');if(!fig)return;
  const E=RD.esc;
  const REGEX=AG.task.solution;
  // rows: id, label; state per step: [text, cls] with cls in '', 'new', 'bad', 'good', 'dim'
  const ROWS=[['ins','instruction.md'],['rx','/app/regex.txt'],['curl','/usr/bin/curl'],['uvx','~/.local/bin/uvx'],['tests','/tests/test_outputs.py'],['rew','/logs/verifier/reward.txt']];
  const S={
    start:{ins:['given to the agent','new'],rx:['absent','dim'],curl:['not in the image (ubuntu:24.04)','dim'],uvx:['absent','dim'],tests:['not in the container yet','dim'],rew:['absent','dim']}
  };
  function st(base,ch){const o=Object.assign({},base);for(const k in ch)o[k]=ch[k];return o}
  const s0=S.start;
  const honest=[
    {t:'The task starts',p:'A fresh container from the task\'s Dockerfile (ubuntu:24.04, WORKDIR /app). The agent gets instruction.md and a shell; task.toml gives it 900 seconds, 1 CPU and 2 GB.',rows:s0,cmd:'# task.toml\n[agent]\ntimeout_sec = 900.0\n[environment]\ncpus = 1\nmemory_mb = 2048\nallow_internet = true',c:[0,0,'none','900 s']},
    {t:'The agent writes its answer',p:'An honest agent works out the pattern and saves one line to /app/regex.txt. Shown here: the reference solution from solution/solve.sh.',rows:st(s0,{rx:['one regex, 1 line','new']}),cmd:'cat << \'EOF\' > /app/regex.txt\n'+REGEX+'\nEOF',c:[1,0,'none','900 s']},
    {t:'The agent phase ends; the checker arrives',p:'Harbor copies the protected tests/ folder into the same container. Everything the agent left behind is still there.',rows:st(s0,{rx:['one regex, 1 line',''],tests:['uploaded by the harness','new']}),cmd:'# Harbor re-uploads /tests/ before verification',c:[1,0,'none','900 s']},
    {t:'The verifier installs its tools inside the container',p:'tests/test.sh installs curl, then fetches the uv installer with curl and pipes it to sh. 82 of the 89 Terminal-Bench 2.0 tasks do this at verification time.',rows:st(s0,{rx:['one regex, 1 line',''],tests:['uploaded by the harness',''],curl:['installed by test.sh','new'],uvx:['installed from astral.sh','new']}),cmd:'apt-get update\napt-get install -y curl\ncurl -LsSf https://astral.sh/uv/0.9.5/install.sh | sh',c:[1,0,'none','900 s']},
    {t:'pytest runs the real test',p:'25 log lines are joined and the regex is applied with re.findall and re.MULTILINE. The 9 expected dates come back in order, so the one test passes.',rows:st(s0,{rx:['read by the test',''],tests:['1 test: 9 dates expected, 9 found','good'],curl:['installed by test.sh',''],uvx:['runs pytest','']}),cmd:'uvx -p 3.13 -w pytest==8.4.1 -w pytest-json-ctrf==0.3.5 \\\n  pytest --ctrf /logs/verifier/ctrf.json /tests/test_outputs.py -rA\n# test_regex_matches_dates PASSED',c:[1,1,'none','900 s']},
    {t:'Reward 1, earned',p:'test.sh writes 1 to the reward file because pytest exited 0. The score is the share of tasks whose reward file says 1.',rows:st(s0,{rx:['read by the test',''],tests:['passed','good'],curl:['installed by test.sh',''],uvx:['ran pytest',''],rew:['1','good']}),cmd:'if [ $? -eq 0 ]; then\n  echo 1 > /logs/verifier/reward.txt',c:[1,1,'1','900 s']}
  ];
  const exploit=[
    honest[0],
    {t:'The agent plants a wrapper instead of a regex',p:'The exploit writes no solution. The container has internet, so it can install curl and replace /usr/bin/curl with a wrapper script (RDI: "replaces /usr/bin/curl with a wrapper during the agent phase"; how it gets curl onto this particular image is our reading).',rows:st(s0,{rx:['still absent','bad'],curl:['a wrapper planted by the agent','bad']}),cmd:'# agent phase (sketch of RDI\'s step)\nmv /usr/bin/curl /usr/bin/curl.real\ncat > /usr/bin/curl  # wrapper: pass through, then tamper with uvx',c:[0,0,'none','900 s']},
    {t:'The checker arrives; /tests/ is protected',p:'Harbor re-uploads tests/, so the test file itself is clean. But the verifier will run in this same container, with the agent\'s binaries.',rows:st(s0,{rx:['still absent','bad'],curl:['a wrapper planted by the agent','bad'],tests:['uploaded by the harness, untouched','new']}),cmd:'# Harbor re-uploads /tests/ before verification',c:[0,0,'none','900 s']},
    {t:'The verifier calls the agent\'s curl',p:'apt-get finds curl already installed. curl ... | sh now runs the wrapper: it installs the real uv, then replaces uvx with a trojan.',rows:st(s0,{rx:['still absent','bad'],curl:['wrapper runs','bad'],tests:['untouched',''],uvx:['trojanized by the wrapper','bad']}),cmd:'apt-get install -y curl   # already installed\ncurl -LsSf https://astral.sh/uv/0.9.5/install.sh | sh\n# the wrapper installs uv, then rewrites uvx',c:[0,0,'none','900 s']},
    {t:'"pytest" never runs',p:'The trojaned uvx sees a pytest invocation and prints a passing session. The real test, which would fail because /app/regex.txt does not exist, is never executed.',rows:st(s0,{rx:['never read','bad'],curl:['wrapper',''],tests:['never executed','bad'],uvx:['prints fake "passed"','bad']}),cmd:'# the fake session shown in RDI\'s write-up\n=============== test session starts ===============\ncollected 3 items\ntests/test_outputs.py ...                    [100%]\n================ 3 passed in 0.05s ================',c:[0,0,'none','900 s']},
    {t:'Reward 1, for nothing',p:'test.sh trusts the exit code and writes 1. RDI report 89 of 89 tasks, 100%, "without writing a single line of solution code".',rows:st(s0,{rx:['never existed','bad'],curl:['wrapper',''],tests:['never executed','bad'],uvx:['trojan',''],rew:['1','bad']}),cmd:'echo 1 > /logs/verifier/reward.txt',c:[0,0,'1','900 s']}
  ];
  const sep=[
    {t:'The task starts (3.0 and 4.0 layout)',p:'Same task, drawn under the verifier layout of every Terminal-Bench 3.0 and 4.0 task file: the verifier is a separate environment, and 4.0 gives every task a flat 8-hour agent timeout.',rows:s0,cmd:'# task.toml (3.0 and 4.0 tasks)\nartifacts = ["/app/regex.txt"]   # illustrative for this task\n[verifier]\nenvironment_mode = "separate"\n[agent]\ntimeout_sec = 28800.0',c:[0,0,'none','8 h']},
    {t:'The agent plants the same wrapper',p:'Nothing stops the agent from tampering with its own container.',rows:st(s0,{rx:['still absent','bad'],curl:['a wrapper planted by the agent','bad']}),cmd:'mv /usr/bin/curl /usr/bin/curl.real\ncat > /usr/bin/curl  # wrapper',c:[0,0,'none','8 h']},
    {t:'Only the declared artifact leaves',p:'The harness copies the declared artifacts out and starts a fresh verifier from tests/Dockerfile. The agent\'s curl stays behind in a container nobody reads.',rows:st(s0,{rx:['artifact missing','bad'],curl:['left behind in the agent container','dim'],tests:['baked into the verifier image','new']}),cmd:'# verifier image: tests/Dockerfile\n# "Separate-mode verifiers skip the tests/ upload,\n#  so the image must own /tests/* itself."',c:[0,0,'none','8 h']},
    {t:'Nothing is installed at trial time',p:'The verifier runs pytest from its own image; it calls no binary the agent could have touched.',rows:st(s0,{rx:['artifact missing','bad'],curl:['not used','dim'],uvx:['not used','dim'],tests:['in the verifier image','']}),cmd:'# "All tooling ... is pre-baked into the verifier image;\n#  nothing is installed at trial time."\npython3 -m pytest --ctrf /logs/verifier/ctrf.json /tests/test_outputs.py -rA',c:[0,1,'none','8 h']},
    {t:'The real test runs and fails',p:'The first assertion fails: the regex file does not exist.',rows:st(s0,{rx:['does not exist','bad'],curl:['not used','dim'],uvx:['not used','dim'],tests:['FAILED: regex file missing','bad']}),cmd:'AssertionError: Regex file /app/regex.txt does not exist',c:[0,1,'none','8 h']},
    {t:'Reward 0',p:'The exploit buys nothing. What separation does not fix: answers shipped with the task, eval() on agent strings, or a judge that reads the agent\'s text (RDI\'s other root causes, below).',rows:st(s0,{rx:['does not exist','bad'],tests:['failed','bad'],curl:['not used','dim'],uvx:['not used','dim'],rew:['0','good']}),cmd:'echo 0 > /logs/verifier/reward.txt',c:[0,1,'0','8 h']}
  ];
  const MODES=[honest,exploit,sep];let mode=0;
  function draw(i){
    const s=MODES[mode][i];const shared=mode<2;
    const rowsHtml=ROWS.map(([k,l])=>{const v=s.rows[k]||['',''];return '<div class="fr '+v[1]+'"><code>'+E(l)+'</code><span>'+E(v[0])+'</span></div>'}).join('');
    fig.innerHTML='<div class="an1-wrap'+(shared?' shared':'')+'"><div class="an1-lbl">'+(shared?'One container: the agent ran here, the verifier runs here':'Agent container &rarr; only declared artifacts &rarr; separate verifier container')+'</div>'+
      '<div class="an1-files">'+rowsHtml+'</div><pre class="an1-cmd">'+E(s.cmd)+'</pre></div>';
    document.getElementById('an1-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+MODES[mode].length+': '+E(s.t)+'</div><p>'+E(s.p)+'</p>';
    const c=s.c;
    document.getElementById('an1-cnt').innerHTML=RD.stat('Solution lines written',c[0],'')+RD.stat('Real tests executed',c[1],'')+RD.stat('reward.txt',c[2],c[2]==='1'&&mode===1?'unearned':(c[2]==='1'?'earned':''))+RD.stat('Agent time limit',c[3],mode===2?'4.0: flat 8 h':'task.toml');
  }
  const A=RD.anim({card:'an1',ctl:'an1-ctl',n:honest.length,draw,ms:2400,label:'Step of the run'});
  document.querySelectorAll('#an1-mode button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#an1-mode button').forEach(x=>x.classList.toggle('on',x===b));mode=+b.dataset.m;A.reset(MODES[mode].length);A.play()}));
})();
