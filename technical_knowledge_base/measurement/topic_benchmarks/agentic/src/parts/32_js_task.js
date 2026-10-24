// ---- Reading section 1 (closed block): run regex-log's real test on the reader's regex ----
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
  if(!document.getElementById('tk-card'))return;
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
  }
  document.querySelectorAll('#tk-presets button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#tk-presets button').forEach(x=>x.classList.toggle('on',x===b));
    cur=b.dataset.p;empty=cur==='none';ta.value=empty?'':TK.PRESETS[cur];ta.disabled=empty;show()}));
  document.getElementById('tk-run').addEventListener('click',()=>{empty=false;ta.disabled=false;show()});
  ta.addEventListener('input',()=>{empty=false});
  document.querySelector('#tk-presets button[data-p="naive"]').classList.add('on');
  show();
})();
