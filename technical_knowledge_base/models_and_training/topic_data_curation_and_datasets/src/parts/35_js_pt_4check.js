// ---- Post-training data lab: answer checkers (section 4) and the contamination checker (section 6) ----
(function(){
  const P=window.PT,D=P.D,C=D.checkers,esc=P.esc,fmt=P.fmt,pct=P.pct;
  const EX=[['last_number','Last number','the last number in the response, string-equal to the label','Tulu 3 for GSM8K'],
    ['tulu_math','Tulu 3 MATH','\\boxed{}, else the Minerva sentence, else the last $...$; equal if sympy finds no difference or the Hendrycks normalisation matches','Tulu 3 for MATH'],
    ['minerva','Minerva only','only "Final Answer: The final answer is X"; without it, the whole response is normalised and compared',''],
    ['boxed_exact','Boxed, exact string','the content of the last \\boxed{} must equal the label character for character',''],
    ['answer_is','"The answer is"','the sentence the GSM8K few-shot examples end with; numbers compared',''],
    ['math_verify','math-verify 0.8.0','Hugging Face\'s parser and symbolic comparison of both sides','']];
  const r=C.ref;
  let h='<table><thead><tr><th>Extractor</th><th>What it does</th><th class="num">GSM8K references accepted</th><th class="num">MATH references accepted</th></tr></thead><tbody>';
  EX.forEach(([k,n,d,t])=>{const g=r.gsm8k.ok[k],m=r.MATH.ok[k];h+='<tr><td><b>'+esc(n)+'</b>'+(t?'<br><span class="small mute">'+t+'</span>':'')+'</td><td class="small">'+esc(d)+'</td><td class="num">'+fmt(g)+' ('+pct(g/r.gsm8k.n,1)+')</td><td class="num">'+fmt(m)+' ('+pct(m/r.MATH.n,1)+')</td></tr>'});
  document.getElementById('pt-cktab').innerHTML=h+'</tbody></table>';
  document.getElementById('pt-cksrc').innerHTML='<span class="meas">measured on Apple M1 Pro (CPU)</span>, 2026-10-15, on '+fmt(r.gsm8k.n)+' GSM8K and '+fmt(r.MATH.n)+' MATH rows. Reading the table: references are written in each dataset\'s own format (GSM8K ends "#### 72", MATH puts the answer in \\boxed{}), so an extractor built for the other format fails on them; that is the point. Tulu 3 pairs each dataset with its own extractor and accepts '+fmt(r.gsm8k.tulu_ok)+' of '+fmt(r.gsm8k.n)+' GSM8K and '+fmt(r.MATH.tulu_ok)+' of '+fmt(r.MATH.n)+' MATH references. The '+fmt(r.gsm8k.n-r.gsm8k.tulu_ok)+' GSM8K misses are all labels with a thousands comma: the checker removes commas from the answer ("3,380" becomes "3380") but compares with the label as written. The boxed-exact count on MATH is 100% by construction (the labels were cut from those boxes); its weakness shows on model answers ("0.5" against "\\frac{1}{2}"). Minerva-only accepts '+fmt(r.MATH.ok.minerva)+' MATH references that never use its sentence, by accident: its fallback keeps the text after the last "=" and strips \\boxed.';
  const sel=document.getElementById('pt-ckex'),ex=C.ref_examples;
  sel.innerHTML=ex.map((e,k)=>{const fails=EX.filter(([x])=>!e.res[x][1]).map(x=>x[1]);return '<option value="'+k+'">'+esc(e.dataset+' row '+e.i+': rejected by '+(fails.join(', ')||'none'))+'</option>'}).join('');
  function showEx(){const e=ex[+sel.value];
    document.getElementById('pt-ckview').innerHTML='<div class="pt-row"><div class="pt-lab">question</div><div class="t">'+esc(e.q)+'</div><div class="pt-lab">end of the reference solution</div><div class="t">'+esc(e.tail)+'</div><div class="pt-lab">label</div><div class="t">'+esc(e.gt||'(empty)')+'</div>'+
      '<div class="pt-tw"><table><thead><tr><th>Extractor</th><th>extracted</th><th>verdict</th></tr></thead><tbody>'+EX.map(([k,n])=>'<tr><td>'+esc(n)+'</td><td><code>'+esc(e.res[k][0])+'</code></td><td>'+(e.res[k][1]?'<span class="pt-flag good">accept</span>':'<span class="pt-flag bad">reject</span>')+'</td></tr>').join('')+'</tbody></table></div></div>'}
  sel.addEventListener('change',showEx);showEx();
  const pend=document.getElementById('pt-ckpend'),M=C.model||{},mk=Object.keys(M);
  if(mk.length){const m=M[mk[0]];let t='<b>On model answers ('+esc(mk[0])+').</b> ';
    ['gsm8k','MATH'].forEach(d=>{if(m[d])t+=d+': '+EX.map(([k,n])=>esc(n)+' '+fmt(m[d].ok[k])).join(', ')+' of '+fmt(m[d].n)+'. '});
    if(m.ifeval)t+='IF: strict '+fmt(m.ifeval.strict)+', loose '+fmt(m.ifeval.loose)+' of '+fmt(m.ifeval.n)+'.';
    pend.style.borderStyle='solid';pend.innerHTML=t}
  else pend.innerHTML='<b>Not run here: the same checkers on model answers.</b> References are the easy case; the case RL training sees is a model\'s own answers, in whatever format it chooses. Running Qwen3-1.7B on 1,500 prompts (about 1 to 1.5 hours of GPU) was dropped as a long run that adds little: the {{Post-training data|n:3f95c17b0d0d81318c3ec7e4564d7b42}} child page, section 6, already runs these extractors on real model answers (DeepSeek-R1 and OLMo 3 traces) and shows where they disagree. The script stays in <code>src/post/run_pending.sh</code> if the run is ever wanted.';
  // ---------------- contamination checker
  const CT=D.contam,ps=CT.pairs.map(p=>Object.assign({},p,{item:p.item.split(' '),doc:p.doc.split(' ')})),BN={mmlu_test:'MMLU',gsm8k_test:'GSM8K',arc_easy_test:'ARC-Easy',arc_challenge_test:'ARC-Challenge',math500_test:'MATH-500',humaneval_test:'HumanEval',hellaswag_validation:'HellaSwag'};
  const CAT={copy:'copy: the test question is in the row',variant:'variant: same problem, other numbers or question',diagram:'shared diagram code, different problem',phrase:'a stock phrase or question stem',passage:'a famous passage the item quotes'};
  const ps_=document.getElementById('pt-cpair');
  ps_.innerHTML=ps.map((p,k)=>'<option value="'+k+'">'+esc(p.row+' vs '+BN[p.bench]+' #'+p.bidx+' ('+p.cat+')')+'</option>').join('');
  const nIn=document.getElementById('pt-cn'),tIn=document.getElementById('pt-ct');
  function grams(t,n){const s=new Map();for(let i=0;i+n<=t.length;i++){const g=t.slice(i,i+n).join(' ');s.set(g,(s.get(g)||0)+1)}return s}
  function cover(a,b,n){const B=grams(b,n),c=new Uint8Array(a.length);let hits=0;for(let i=0;i+n<=a.length;i++){if(B.has(a.slice(i,i+n).join(' '))){hits++;for(let j=i;j<i+n;j++)c[j]=1}}return {c,hits}}
  function check(){const p=ps[+ps_.value],n=+nIn.value,th=+tIn.value/100;
    document.getElementById('pt-cnv').textContent=n;document.getElementById('pt-ctv').textContent=Math.round(th*100)+'%';
    const ic=cover(p.item,p.doc,n),dc=cover(p.doc,p.item,n),cov=ic.c.reduce((a,b)=>a+b,0)/p.item.length;
    const I=grams(p.item,13);let m13=0;for(let i=0;i+13<=p.doc.length;i++){const g=p.doc.slice(i,i+13).join(' ');if(I.has(g))m13+=I.get(g)}
    const tag=(t,c,q)=>t.map((w,k)=>w.charAt(0)==='\u00a7'?'<span class="mute">['+fmt(+w.slice(1))+' tokens]</span>':'<span class="'+(c[k]?'c':'')+(q&&k<q?' q':'')+'">'+esc(w)+'</span>').join(' ');
    document.getElementById('pt-citem').innerHTML=tag(p.item,ic.c,p.nq);
    document.getElementById('pt-cdoc').innerHTML=(p.pre?'<span class="mute">['+fmt(p.pre)+' tokens before] </span>':'')+tag(p.doc,dc.c,0)+(p.post?'<span class="mute"> ['+fmt(p.post)+' tokens after]</span>':'');
    const flag=cov>th,isC=p.cat==='copy';
    document.getElementById('pt-cverd').innerHTML='Coverage of the item by shared '+n+'-grams: <b>'+pct(cov,1)+'</b> ('+(flag?'<span class="pt-flag bad">flagged</span>':'<span class="pt-flag good">not flagged</span>')+' at '+Math.round(th*100)+'%). Shared 13-grams (GPT-3 rule, any match flags): <b>'+fmt(m13)+'</b>. Label by reading: <b>'+esc(CAT[p.cat]||p.cat)+'</b>'+(p.note?' ('+esc(p.note)+')':'')+'. '+
      (flag===isC?'This rule setting gets this pair right.':(flag?'A false alarm: removing this row loses good data.':'A miss: this copy would stay in training.'))+(n===8&&Math.round(th*100)===50?' <span class="small mute">(Tulu 3\'s setting; the child page recorded '+pct(p.cov8,1)+' and '+fmt(p.m13)+' shared 13-grams for this pair.)</span>':'');
  }
  [ps_,nIn,tIn].forEach(e=>e.addEventListener(e.tagName==='SELECT'?'change':'input',check));check();
  let t='<table><thead><tr><th>Sample</th><th class="num">rows</th><th class="num">rows with a shared 13-gram</th><th class="num">items flagged by Tulu 3\'s rule</th><th>flagged pairs, by reading</th></tr></thead><tbody>';
  CT.corpora.forEach(c=>{t+='<tr><td>'+esc(c.label)+'</td><td class="num">'+fmt(c.docs)+'</td><td class="num">'+fmt(c.any13)+'</td><td class="num">'+fmt(c.tulu_items)+'</td><td>'+(Object.entries(c.cats).map(([k,v])=>esc(k)+' '+fmt(v)).join(', ')||'none')+'</td></tr>'});
  document.getElementById('pt-ctab').innerHTML=t+'</tbody></table>';
})();
