// ---- Reading: one SWE-bench task, django__django-11099: its id, metadata, patches, issue, test lists and the leak list (the harness itself is Fig. 3, 33_js_sc_swe.js) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-swe'))return;
  const T=CD.dj,R=CD.djr,esc=RD.esc;
  $('tk-id').textContent=T.instance_id;
  $('tk-meta').innerHTML='Repository '+T.repo+', Django version '+T.version+', base commit <code>'+T.base_commit.slice(0,10)+'</code>, pull request created '+T.created_at.slice(0,10)+', annotated difficulty "'+esc(T.difficulty)+'".';
  $('tk-issue').innerHTML=esc(T.problem_statement).replace("r'\\A[\\w.@+-]+\\Z'","<mark>r'\\A[\\w.@+-]+\\Z'</mark>");
  const diff=s=>esc(s).split('\n').map(l=>l.startsWith('+')&&!l.startsWith('+++')?'<span class="d-add">'+l+'</span>':l.startsWith('-')&&!l.startsWith('---')?'<span class="d-del">'+l+'</span>':l.startsWith('diff')||l.startsWith('@@')||l.startsWith('---')||l.startsWith('+++')?'<span class="d-hd">'+l+'</span>':l).join('\n');
  $('tk-patch').innerHTML=diff(T.patch.trim());$('tk-test').innerHTML=diff(T.test_patch.trim());
  $('tk-p2p').innerHTML=T.PASS_TO_PASS.map(t=>'<li>'+esc(t)+'</li>').join('');
  // every username check of the two re-run tests for a candidate (closed block beside Fig. 3; the scene calls TKD on a mode switch)
  const showU=u=>esc(JSON.stringify(u)),CN={gold:'the gold patch',issue:"the issue's suggestion",half:'half the fix',none:'no change'};
  function testList(name,mode){const L=R.lists[name],res=R.res[mode][name];
    return '<ul class="tl">'+L[0].map((u,j)=>'<li><span class="r '+(res.valid[j]?'ok">ok':'no">FAIL')+'</span> valid '+showU(u)+(res.valid[j]?' accepted':' rejected')+'</li>').join('')+L[1].map((u,j)=>'<li><span class="r '+(res.invalid[j]?'ok">ok':'no">FAIL')+'</span> invalid '+showU(u)+(res.invalid[j]?' rejected':' accepted')+'</li>').join('')+'</ul>'}
  window.TKD=function(mode){$('tk-detail').innerHTML='<p class="small">Candidate: '+CN[mode]+' (ASCII <code>'+esc(R.cand[mode][0])+'</code>, Unicode <code>'+esc(R.cand[mode][1])+'</code>).</p><div class="grid2"><div><div class="small"><b>test_ascii_validator</b></div>'+testList('test_ascii_validator',mode)+'</div><div><div class="small"><b>test_unicode_validator</b></div>'+testList('test_unicode_validator',mode)+'</div></div>'};
  TKD('gold');
  // the leak list (closed block in the flaws section)
  const V=CD.ver;
  $('tk-leak').innerHTML='<table><thead><tr><th>Task</th><th class="num">lines of the fix in the issue</th></tr></thead><tbody>'+V.leak.map(x=>'<tr><td>'+esc(x[0])+'</td><td class="num">'+x[1]+' of '+x[2]+'</td></tr>').join('')+'</tbody></table>';
})();
