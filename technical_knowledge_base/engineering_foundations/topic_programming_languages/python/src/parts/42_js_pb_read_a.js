// ---- Part 2 Reading (t-pb-read), 1 of 4: transcripts, the uv sync animation, ruff and pytest drills, type checkers ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc;
  PBU.fillTerms(document.getElementById('t-pb-read'));

  // ---------- the three files that must agree (uv sync stepper) ----------
  const U=PB.uv;const find=(p,rc)=>U.find(b=>b.cmd&&b.cmd.startsWith(p)&&(rc==null||b.rc===rc));
  const S=[
    {b:find('uv init tokcount'),st:['ok','ok','ok'],tx:['httpx>=0.28; group dev: pytest; extra fast: orjson','15 packages, matches pyproject','httpx, pytest, orjson installed'],
     c:'<b>uv add</b> did three things per call: wrote the range into <code>pyproject.toml</code>, resolved and wrote <code>uv.lock</code>, and installed into <code>.venv</code>. All three agree.'},
    {b:find("uv run python -c 'import httpx"),st:['ok','ok','ok'],tx:null,
     c:'<b>uv run</b> checks that the lock and the environment are up to date (installing anything missing), then runs the command inside <code>.venv</code>: <code>sys.prefix</code> ends in <code>.venv</code>.'},
    {b:find("python3 -c 'import httpx'"),st:['ok','ok','na'],tx:[null,null,'not used: this is the system python'],
     c:'The system <code>python3</code> does not see the project environment, so the same import fails. Nothing was activated, and nothing needs to be when you use <code>uv run</code>.'},
    {b:find('uv sync --locked && echo in sync'),st:['ok','ok','ok'],tx:[null,null,'orjson removed (extra not requested)'],
     c:'<b>uv sync</b> makes <code>.venv</code> match the lock <i>exactly</i> for what this sync asked for: the optional <code>fast</code> extra was not requested, so <code>orjson</code> was uninstalled. <code>--locked</code> also checked that the lock still matches <code>pyproject.toml</code>.'},
    {b:{cmd:'(edit pyproject.toml by hand: add "rich" to dependencies, no uv command)',out:'',rc:null},st:['ok','bad','ok'],tx:['+ rich (edited by hand)','15 packages, now stale',null],
     c:'Someone edits <code>pyproject.toml</code> directly, as a pull request might. The lock no longer describes it.'},
    {b:find('uv sync --locked',1),st:['ok','bad','ok'],tx:null,
     c:'<b>--locked refuses</b> to install from a stale lock and exits with code 1. In CI this is the point: the build fails instead of silently resolving whatever versions exist today.'},
    {b:find('uv lock && uv sync --locked'),st:['ok','ok','ok'],tx:[null,'18 packages, matches pyproject','+ rich, markdown-it-py, mdurl'],
     c:'<b>uv lock</b> re-resolves (adding rich and its two dependencies), and the locked sync now passes and installs them.'},
    {b:find('uv sync --extra fast'),st:['ok','ok','ok'],tx:[null,null,'+ orjson (extra fast requested)'],
     c:'Ask for the extra and it is installed; the lock already contained it, because a lock covers every extra, group and platform at once.'},
    {b:find('uv sync && uv run'),st:['ok','ok','ok'],tx:[null,null,'orjson removed again'],
     c:'A plain <code>uv sync</code> removes it again. If a package keeps disappearing, it is not requested by the sync you ran.'}
  ];
  let TX=['','',''];
  function drawSync(i){
    const s=S[i];if(s.tx)s.tx.forEach((t,k)=>{if(t!=null)TX[k]=t});
    // recompute text up to step i so scrubbing backwards is right
    TX=['','',''];for(let k=0;k<=i;k++){if(S[k].tx)S[k].tx.forEach((t,j)=>{if(t!=null)TX[j]=t})}
    const name=['pyproject.toml','uv.lock','.venv'],lab={ok:'in agreement',bad:'out of date',na:'not involved'};
    const hl=[i===4,i===4||i===6,[0,3,6,7,8].includes(i)];
    $('pb-sync-box').innerHTML=name.map((n,k)=>'<div class="'+(hl[k]?'hl':'')+'"><div class="h">'+n+'</div><div class="small">'+E(TX[k])+'</div><span class="st '+s.st[k]+'">'+lab[s.st[k]]+'</span></div>').join('');
    $('pb-sync-cap').innerHTML='<b>Step '+(i+1)+' of '+S.length+'.</b> '+s.c;
    $('pb-sync-term').innerHTML=s.b?PBU.block(s.b):'(missing)';
  }
  if(S.every(s=>s.b))RD.anim({card:'pb-sync-card',ctl:'pb-sync-ctl',n:S.length,draw:drawSync,ms:3200,label:'uv session step'});
  else $('pb-sync-cap').textContent='(transcript step missing)';

  // ---------- ruff ----------
  $('pb-ruff-src').textContent=PB.ruff_src;
  const r0=PBU.pick('ruff',['uvx ruff@0.16.10 check --output-format concise chatlog.py'])[0];
  const nFound=r0?+(r0.out.match(/Found (\d+) errors/)||[])[1]:NaN;
  PBU.drill($('pb-drill-ruff'),'Predict: with no configuration file at all, how many problems does <code>ruff check</code> (0.16.10) report in this file?',
    [{t:'2 or 3 (unused imports, the bare except)',right:nFound<=3},{t:'5 to 8',right:nFound>=5&&nFound<=8},{t:'9 or more',right:nFound>=9}],
    'It reported <b>'+nFound+'</b> (the output below). Since 0.16 the default rule set has 413 rules, so import sorting, pyupgrade, bugbear, simplify and bandit findings all appear without configuration.');

  // ---------- pytest ----------
  $('pb-pt-src').textContent='# tests/conftest.py\n'+PB.pytest_src['tests/conftest.py']+'\n\n# tests/test_tokens.py\n'+PB.pytest_src['tests/test_tokens.py'];
  $('pb-pt-cfg').textContent=PB.pytest_cfg;
  const pf=PBU.pick('pytest',['uv run pytest tests/test_fails.py'])[0];
  PBU.drill($('pb-drill-pt'),'<code>assert tokens("max_tokens") == 1</code> fails (the underscore separates tokens, so the answer is 2). What does pytest print?',
    [{t:'AssertionError with no details, like plain python',right:false},{t:'assert 2 == 1, plus where the 2 came from',right:true},{t:'A diff of the two strings',right:false}],
    ()=>'<div class="pb-term">'+(pf?PBU.block(pf):'')+'</div>');

  // ---------- type checkers ----------
  const T=PB.types.cases,CK=['ty','mypy','pyright'];
  const NAMES={t1_optional:'dict.get may return None',t2_typeddict:'TypedDict key typo',t3_missing_await:'Forgot await',t4_unannotated:'Unannotated function',
    t5_unbound:'Possibly unbound name',t6_override:'Override breaks the parent',t7_invariance:'list[int] as list[float]',t8_protocol:'Protocol mismatch'};
  const flag=r=>r&&r.rc!==0;
  function verdict(c){const f=CK.filter(k=>flag(c.runs[k]));return f.length===3?'all':f.length===0?'none':f.length===1?f[0]:'some'}
  let cur=0;
  function showCase(i){
    cur=i;const c=T[i];
    $('pb-tc-chips').querySelectorAll('button').forEach((b,k)=>b.classList.toggle('on',k===i));
    $('pb-tc-src').textContent='# '+c.id+'.py\n'+c.src;
    $('pb-tc-out').innerHTML='';
    const v=verdict(c);
    PBU.drill($('pb-tc-drill'),'Which checkers report an error here, with default settings?',
      [{t:'All three',right:v==='all'},{t:'None of them',right:v==='none'},{t:'Only pyright',right:v==='pyright'},{t:'Only mypy',right:v==='mypy'}],
      ()=>{const ex=Object.keys(c.runs).filter(k=>!CK.includes(k));
        $('pb-tc-out').innerHTML=CK.concat(ex).map(k=>{const r=c.runs[k];const tool=k.split(' ')[0];
          const cmd={ty:'ty check',mypy:'mypy',pyright:'pyright'}[tool]+(k.includes(' ')?' '+k.slice(k.indexOf(' ')+1):'')+' '+c.id+'.py';
          return '<div class="pb-term">'+PBU.block({cmd:cmd,out:r.out||'(no output)',rc:r.rc})+'</div>'}).join('');
        return v==='all'?'All three report it; compare the messages below.':v==='none'?'None of them, by default: the parameter has no annotation, so it is <code>Any</code>. The last box shows <code>mypy --strict</code> asking for annotations.':
          'Only '+v+' reports it by default; the extra boxes show the flag that turns the same check on in the others.'});
  }
  $('pb-tc-chips').innerHTML=T.map((c,i)=>'<button data-i="'+i+'">'+E(NAMES[c.id]||c.id)+'</button>').join('');
  $('pb-tc-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(b)showCase(+b.dataset.i)});
  showCase(0);
  $('pb-tc-grid').innerHTML='<thead><tr><th>Case (default settings)</th>'+CK.map(k=>'<th class="n">'+k+'</th>').join('')+'</tr></thead><tbody>'+
    T.map(c=>'<tr><td>'+E(NAMES[c.id]||c.id)+'</td>'+CK.map(k=>'<td class="n" style="color:'+(flag(c.runs[k])?'var(--good)':'var(--mute)')+'">'+(flag(c.runs[k])?'error':'silent')+'</td>').join('')+'</tr>').join('')+'</tbody>';
  // speed
  const TS=PB.typespeed;
  if(TS){
    $('pb-ts-note').innerHTML='All three checkers on the source of rich 15.0.0 (a well-typed terminal library: '+TS.files+' files, '+TS.lines.toLocaleString('en-US')+' lines), installed with its dependencies in a 3.14 environment; hyperfine, 5 runs after a warm-up, median; load average '+PBU.la(TS.loadavg)+'. They also disagree on what is wrong: '+
      (TS.summary?CK.map(k=>k+' "'+E(TS.summary[k])+'"').join(', '):'')+'.';
    const col={ty:'var(--c3)','mypy (no cache)':'var(--c2)','mypy (warm cache)':'var(--c5)',pyright:'var(--c4)'};
    PBU.bars($('pb-ts-bars'),TS.runs.map(r=>({name:r.name,v:r.median_s,label:PBU.fmt(r.median_s,2)+' s',col:col[r.name]})));
  }
})();
