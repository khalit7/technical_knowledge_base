// ---- Verifier gallery tab: agreement of three checkers on 160 real answers, and real disagreements ----
(function(){
  const D=window.LLD;
  const all=[];D.groups.forEach(g=>g.r.forEach((v,k)=>all.push({b:v,l:g.last[k],a:g.any[k]})));
  const n=all.length,cnt=f=>all.filter(f).length;
  const V=[['b','Strict (boxed)'],['l','Last number'],['a','Anywhere']];
  let h='<thead><tr><th></th>'+V.map(v=>'<th class="num">'+v[1]+'</th>').join('')+'</tr></thead><tbody>';
  V.forEach(r=>{h+='<tr><td>'+r[1]+'</td>'+V.map(c=>'<td class="num">'+(r[0]===c[0]?cnt(x=>x[r[0]])+' pass':cnt(x=>x[r[0]]===x[c[0]])+' agree')+'</td>').join('')+'</tr>'});
  document.getElementById('ve-agree').innerHTML=h+'</tbody>';
  const fpAny=cnt(x=>x.a&&!x.b),fpLast=cnt(x=>x.l&&!x.b),fnBox=cnt(x=>!x.b&&x.l);
  document.getElementById('ve-agreeT').innerHTML='Of '+n+' answers the strict checker passes '+cnt(x=>x.b)+', the last-number checker '+cnt(x=>x.l)+' and the lenient one '+cnt(x=>x.a)+'. The lenient checker passes '+fpAny+' answers the strict one fails; read below whether those are right answers in the wrong format (strict checker\'s false negatives) or wrong answers that merely mention the number (lenient checker\'s false positives).';
  const s3=document.getElementById('rd-hkAny');if(s3)s3.textContent='passes '+fpAny+' answers the strict checker fails, most of them wrong answers that merely mention the reference number on the way';
  document.getElementById('ve-cases').innerHTML=D.ver.map(c=>'<div class="vc"><h4>GSM8K #'+c.pid+', answer '+(c.i+1)+'</h4><p>Reference '+c.gold+'. Strict '+(c.b?'pass':'fail')+', last number '+(c.l?'pass':'fail')+', anywhere '+(c.a?'pass':'fail')+'.</p><pre>…'+RD.esc(c.tail)+'</pre><p class="small">'+c.note+'</p></div>').join('');
})();
