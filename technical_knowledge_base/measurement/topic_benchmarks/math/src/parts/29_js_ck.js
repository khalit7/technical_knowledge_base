// ---- Reading: one real HMMT February 2026 answer through three checkers (stepper on window.CKD, written by src/mk_check_example.py) ----
(function(){
  const card=document.getElementById('ck-card');if(!card||!window.CKD||!window.RD||!window.MA)return;
  const D=CKD,esc=RD.esc;
  const hm=MA.comps.find(c=>c.k==='hmmt_feb_2026'),prob=hm&&hm.probs.find(p=>p.i===7);
  const E0=D.endings[0],E2=D.endings[2];
  const cnt=(a,ok)=>D.p7_by_parse.filter(x=>x.parsed===a&&(ok==null||x.correct===ok)).reduce((s,x)=>s+x.n,0);
  const n13=cnt('1/3'),n13r=cnt('1/3',true),n3=cnt('3'),n3r=cnt('3',true),nform=cnt('(1 - sqrt(6)/3)**(1/3)',true);
  const box=s=>s.replace(/^\\boxed\{/,'').replace(/\}\.?$/,'');
  const KEY='(3+\\sqrt{6})^{-1/3}',ANS=box(E0.boxed);
  const light=s=>s.replace(/\s+/g,'').replace(/\\left|\\right/g,'').replace(/\\dfrac/g,'\\frac').replace(/\\sqrt(\d)/g,'\\sqrt{$1}');
  const row=(c,w,v,cls)=>'<div class="ck-row"><span>'+c+'</span><span class="ck-w">'+w+'</span><span class="vd '+cls+'">'+v+'</span></div>';
  const STEPS=[
    {t:'The problem and its key',c:'HMMT February 2026, problem 7. The key is (3 + √6)<sup>−1/3</sup> ≈ 0.5683, and the problem asks for "an exact expression": many correct forms exist. '+D.p7_answers+' answers were sampled from MathArena\'s models.'},
    {t:'Extract the final answer',c:'The grader keeps only the content of the last \\boxed{} in the output (highlighted); everything before it, the whole derivation, is ignored. This is Kimi K3 (Think), run 1.'},
    {t:'Checker 1: exact string match',c:'Compare the extracted string with the key\'s string. They differ, so exact match calls it wrong. Of the '+D.p7_right+' answers MathArena grades right, '+D.p7_right_boxed_identical_to_key+' write the key\'s string.'},
    {t:'Checker 2: normalised string (MATH style)',c:'Remove spaces, \\left and \\right, turn \\dfrac into \\frac and \\sqrt6 into \\sqrt{6}. Formatting is fixed, algebra is not: still different, still wrong; '+D.p7_right_boxed_equal_after_light_normalisation+' of the '+D.p7_right+' right answers match after it.'},
    {t:'Checker 3: parse and compare symbolically',c:'Parse both into expressions and simplify the difference: (1 − √6/3)<sup>1/3</sup> − (3 + √6)<sup>−1/3</sup> = 0, because 1/(3 + √6) = (3 − √6)/3. Right. '+nform+' answers use exactly this form.'},
    {t:'Where the parser breaks',c:'GPT-5.2 (high), run 3, answers in Cardano\'s form with complex cube roots. The parser keeps only the leading 1/3, which is not the key (0.333), yet the released grade is "right". Of '+n13+' answers parsed to 1/3, '+n13r+' are graded right and '+(n13-n13r)+' wrong; of '+n3+' parsed to 3, '+n3r+' right. Their grades did not come from the parsed value; MathArena reviews flagged parses by hand, and the data does not say who decided each.'}];
  function draw(i){
    document.getElementById('ck-prob').innerHTML='<span class="plab">HMMT February 2026, problem 7</span>'+(prob?prob.q:'')+(i>=0?' <span class="gold">key: (3+√6)<sup>−1/3</sup></span>':'');
    let h='';
    if(i>=1&&i<5)h+='<div class="ck-raw">'+esc(E0.model)+', run 1, end of output: …<span class="k">'+esc(E0.boxed)+'</span></div>';
    if(i>=2&&i<5){h+=row('<b>Checker</b>','<b>compares</b>','<b>verdict</b>','na');
      h+=row('Exact string',esc(ANS)+'<br>vs '+esc(KEY),'wrong','no');
      if(i>=3)h+=row('Normalised string',esc(light(ANS))+'<br>vs '+esc(light(KEY)),'wrong','no');
      if(i>=4)h+=row('Symbolic',esc(E0.parsed)+'<br>vs (3 + sqrt(6))**(-1/3)','equal: right','ok');}
    if(i>=5){h+='<div class="ck-raw">'+esc(E2.model)+', run 3, end of output: …<span class="k">'+esc(E2.boxed)+'</span></div>';
      h+=row('<b>Step</b>','<b>result</b>','<b>verdict</b>','na');
      h+=row('Parser',esc(E2.parsed)+' (0.333; the key is 0.568)','would be wrong','no');
      h+=row('Released grade','as released by MathArena','right','ok');}
    document.getElementById('ck-body').innerHTML=h;
    document.getElementById('ck-cap').innerHTML='<b>Step '+(i+1)+' of '+STEPS.length+': '+STEPS[i].t+'.</b> '+STEPS[i].c;
    document.getElementById('ck-cnt').innerHTML=RD.stat('Answers to problem 7',D.p7_answers,'MathArena models, all runs')+
      RD.stat('Graded right',D.p7_right,'MathArena\'s released grade')+
      RD.stat('Right and string-equal to the key',i>=2?D.p7_right_boxed_identical_to_key:'?','exact match would pass these')+
      RD.stat('Parsed to 1/3 or 3',i>=5?(n13+n3):'?','truncated Cardano forms');
  }
  RD.anim({card:'ck-card',ctl:'ck-ctl',n:STEPS.length,draw,ms:3600,label:'Checker step'});
})();
