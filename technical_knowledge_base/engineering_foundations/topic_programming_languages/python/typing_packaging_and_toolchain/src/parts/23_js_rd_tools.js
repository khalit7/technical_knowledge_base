// ---- Reading: transcripts, ruff and pytest drills, type checkers; copied from the Python essentials page's 42_js_pb_read_a.js ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc;
  PBU.fillTerms(document.getElementById('t-read'));

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
    const col={ty:'var(--c3)','mypy (no cache)':'var(--c2)','mypy (warm cache)':'var(--c5)',pyright:'var(--c4)'};
    PBU.bars($('pb-ts-bars'),TS.runs.map(r=>({name:r.name,v:r.median_s,label:PBU.fmt(r.median_s,2)+' s',col:col[r.name]})));
  }
})();
