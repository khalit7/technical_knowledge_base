// ---- One SWE-bench task: django__django-11099 ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-task'))return;
  const T=CD.dj,R=CD.djr,esc=RD.esc;
  $('tk-id').textContent=T.instance_id;
  $('tk-meta').innerHTML='Repository '+T.repo+', Django version '+T.version+', base commit <code>'+T.base_commit.slice(0,10)+'</code>, pull request created '+T.created_at.slice(0,10)+', annotated difficulty "'+esc(T.difficulty)+'".';
  $('tk-issue').innerHTML=esc(T.problem_statement).replace("r'\\A[\\w.@+-]+\\Z'","<mark>r'\\A[\\w.@+-]+\\Z'</mark>");
  const diff=s=>esc(s).split('\n').map(l=>l.startsWith('+')&&!l.startsWith('+++')?'<span class="d-add">'+l+'</span>':l.startsWith('-')&&!l.startsWith('---')?'<span class="d-del">'+l+'</span>':l.startsWith('diff')||l.startsWith('@@')||l.startsWith('---')||l.startsWith('+++')?'<span class="d-hd">'+l+'</span>':l).join('\n');
  $('tk-patch').innerHTML=diff(T.patch.trim());$('tk-test').innerHTML=diff(T.test_patch.trim());
  $('tk-p2p').innerHTML=T.PASS_TO_PASS.map(t=>'<li>'+esc(t)+'</li>').join('');
  const CAND={gold:['^[\\w.@+-]+\\Z','^[\\w.@+-]+\\Z','the merged fix: both validators end with \\Z'],issue:['\\A[\\w.@+-]+\\Z','\\A[\\w.@+-]+\\Z','the regex the issue proposes, in both validators'],half:['^[\\w.@+-]+\\Z','^[\\w.@+-]+$','the fix applied to the ASCII validator only'],none:['^[\\w.@+-]+$','^[\\w.@+-]+$','an empty patch: the code at the base commit']};
  const ST=['Start a container at the base commit','Apply the candidate patch','Apply the test patch','Run the 3 fail-to-pass tests','Run the 19 pass-to-pass tests','Verdict'];
  let mode='gold';
  const showU=u=>esc(JSON.stringify(u));
  function testList(name){const L=R.lists[name],res=R.res[mode][name];
    return '<ul class="tl">'+L[0].map((u,j)=>'<li><span class="r '+(res.valid[j]?'ok">ok':'no">FAIL')+'</span> valid '+showU(u)+(res.valid[j]?' accepted':' rejected')+'</li>').join('')+L[1].map((u,j)=>'<li><span class="r '+(res.invalid[j]?'ok">ok':'no">FAIL')+'</span> invalid '+showU(u)+(res.invalid[j]?' rejected':' accepted')+'</li>').join('')+'</ul>'}
  function draw(i){
    const c=CAND[mode],r=R.res[mode],a=r.test_ascii_validator.pass,u=r.test_unicode_validator.pass,f2p=a&&u;
    $('tk-pipe').innerHTML=ST.map((s,j)=>'<div class="'+(j===i?'on':j<i?(j===3?(f2p?'ok':'no'):j===5?'':'ok'):'')+(j===5&&i>=5?(f2p?' ok':' no'):'')+'"><b>'+(j+1)+'</b>'+s+'</div>').join('');
    let t,p,det='';
    if(i===0){t='Docker image with Django at '+T.base_commit.slice(0,10);p='The harness builds the environment for version '+T.version+' and checks out the commit just before the fix. The model saw only the issue and this repository.'}
    else if(i===1){t='Candidate: '+c[2];p='ASCIIUsernameValidator regex <code>'+esc(c[0])+'</code>; UnicodeUsernameValidator regex <code>'+esc(c[1])+'</code>.'}
    else if(i===2){t='The test patch adds \'trailingnewline\\n\' to both invalid lists';p='Applied after the model\'s patch, so the model cannot edit the tests that judge it.'}
    else if(i===3){t='Fail-to-pass: '+(f2p?'all pass':'failing');p='test_ascii_validator '+(a?'passes':'FAILS')+'; test_unicode_validator '+(u?'passes':'FAILS')+'; test_help_text (UserAttributeSimilarityValidatorTest) as recorded in the dataset.'+(mode==='none'?' In Python, $ also matches just before a trailing newline, so \'trailingnewline\\n\' is accepted.':'');
      det='<div class="grid"><div><div class="small"><b>test_ascii_validator</b></div>'+testList('test_ascii_validator')+'</div><div><div class="small"><b>test_unicode_validator</b></div>'+testList('test_unicode_validator')+'</div></div>'}
    else if(i===4){t='Pass-to-pass: 19 tests';p='Password-validator tests that passed before and must still pass. The candidates change only the two username regexes, which these tests do not use; the dataset records them passing with the gold patch. Not re-run here.'}
    else{t=f2p?'RESOLVED':'NOT RESOLVED';p=f2p?(mode==='issue'?'A different patch from the gold one, accepted: the tests check behaviour, not the diff. The model only had to follow the issue\'s suggestion.':'Every fail-to-pass test now passes and nothing else broke.'):(mode==='half'?'Half a fix scores the same as no fix: one failing test is enough.':'Without a change the new tests fail, which is exactly what makes them fail-to-pass tests.')}
    $('tk-cap').innerHTML='<div class="t">Step '+(i+1)+': '+t+'</div><p>'+p+'</p>';$('tk-detail').innerHTML=det;
    const nOk=['test_ascii_validator','test_unicode_validator'].reduce((s,k)=>s+R.lists[k][0].length+R.lists[k][1].length,0),nPass=['test_ascii_validator','test_unicode_validator'].reduce((s,k)=>s+r[k].valid.filter(x=>x).length+r[k].invalid.filter(x=>x).length,0);
    $('tk-cnt').innerHTML=RD.stat('Username checks correct',i>=3?nPass+' / '+nOk:'not run','in the two re-run tests')+RD.stat('Re-run fail-to-pass tests passing',i>=3?(+a+ +u)+' / 2':'not run','the third is not re-run')+RD.stat('Verdict',i>=5?(f2p?'resolved':'not resolved'):'pending','');
  }
  const A=RD.anim({card:'tk-card',ctl:'tk-ctl',n:ST.length,draw,ms:1500,label:'Harness step'});
  RD.seg($('tk-mode'),m=>{mode=m;A.go(0);A.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-task']=[()=>A.redraw()];
  // dataset statistics
  const V=CD.ver;
  $('tk-vout').innerHTML=RD.stat('Tasks','500',V.repos.length+' repositories')+RD.stat('Django share',CM.pct(V.repos[0][1]/500),V.repos[0][1]+' tasks')+RD.stat('Gold patch edits one file',CM.pct(V.files['1']/500),V.files['1']+' tasks')+RD.stat('Median changed lines',String(V.lines_median),'gold patch')+RD.stat('Fix line found in the issue',V.leak.length+' tasks',V.leak.filter(x=>x[1]===x[2]).length+' with every such line');
  $('tk-leak').innerHTML='<table><thead><tr><th>Task</th><th class="num">lines of the fix in the issue</th></tr></thead><tbody>'+V.leak.map(x=>'<tr><td>'+esc(x[0])+'</td><td class="num">'+x[1]+' of '+x[2]+'</td></tr>').join('')+'</tbody></table>';
})();
