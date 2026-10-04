// ---- Reading, How it breaks: one set of "model failures" attributed to model, grader or gold labels ----
// Re-grading six physics benchmarks (arXiv:2609.13009), Appendix C, as tabulated in the paper page's tables.json:
// rejections audited per benchmark, and how many were benchmark errors (Q), grader errors (G), model errors (M).
(function(){
  const sq=document.getElementById('rd-att-sq');if(!sq)return;
  const D={'HLE-Physics':{n:98,q:86,g:4,m:8},'PRISM-Physics':{n:74,q:26,g:48,m:0},'PHYBench':{n:56,q:13,g:40,m:3},'UGPhysics':{n:22,q:18,g:3,m:1}};
  D.all={n:0,q:0,g:0,m:0};['HLE-Physics','PRISM-Physics','PHYBench','UGPhysics'].forEach(k=>['n','q','g','m'].forEach(f=>D.all[f]+=D[k][f]));
  let b='all';
  function order(n,seed){const a=[...Array(n).keys()];let s=seed;for(let i=n-1;i>0;i--){s=(s*1103515245+12345)%2147483648;const j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
  const cap=document.getElementById('rd-att-cap'),cn=document.getElementById('rd-att-cnt'),leg=document.getElementById('rd-att-leg');
  const L=(c,t)=>'<span style="--sw:var('+c+')">'+t+'</span>';
  const pct=(a,n)=>n?(100*a/n).toFixed(1)+'%':'0%';
  function draw(i){
    const d=D[b],o=order(d.n,11),cat=new Array(d.n);
    o.forEach((s,k)=>{cat[s]=k<d.g?'g':k<d.g+d.q?'q':'m'});
    if(sq.children.length!==d.n)sq.innerHTML='<i></i>'.repeat(d.n);
    sq.classList.toggle('sm',d.n>120);
    const cls=c=>i===0?'km':i===1?'k0':i===2?(c==='g'?'kg':'k0'):i===3?(c==='g'?'kg':c==='q'?'kq':'k0'):(c==='g'?'kg':c==='q'?'kq':'km');
    [...sq.children].forEach((e,k)=>e.className=cls(cat[k]));
    const nm=b==='all'?'the four benchmarks':b;
    const T=[
      ['1. As a leaderboard reads it',d.n+' answers by GPT-5.6-Sol on '+nm+' were rejected by the benchmark\'s grader on every attempt. A score counts each one as a model failure.'],
      ['2. Experts review every rejection','Physics PhD students read the problem, the reference answer, the model\'s response and a preliminary AI review, and decide whose fault the rejection is.'+(b==='all'?' 196 cases got two reviewers, who agreed on 140; a third settled the 56 disagreements.':'')],
      ['3. Grader errors leave the model\'s column',d.g+' rejections ('+pct(d.g,d.n)+') were right answers to well-posed problems that the grader marked wrong, mostly by missing an equivalent form or a different convention.'],
      ['4. Benchmark errors leave too',d.q+' rejections ('+pct(d.q,d.n)+') were the benchmark\'s fault: a wrong reference, inconsistent conditions, ambiguity, or a missing assumption the intended answer needs.'],
      ['5. What is left is the model',d.m+' of '+d.n+' ('+pct(d.m,d.n)+') were genuine model errors. Before attribution the model looked '+d.n+' answers wrong; after it, '+d.m+'.']];
    leg.innerHTML=i===0?L('--bad','counted as a model failure'):(i<4?L('--dim','not yet attributed'):'')+(i>=2?L('--c1','grader error'):'')+(i>=3?L('--c5','benchmark (gold) error'):'')+(i>=4?L('--bad','model error'):'');
    cn.innerHTML=RD.stat('Marked wrong',d.n,'rejected on every attempt')+RD.stat('Grader errors',i>=2?d.g:'?',i>=2?pct(d.g,d.n):'')+RD.stat('Benchmark errors',i>=3?d.q:'?',i>=3?pct(d.q,d.n):'')+RD.stat('Model errors',i===0?d.n:i>=4?d.m:'?',i===0?'as read':i>=4?pct(d.m,d.n):'');
    cap.innerHTML='<div class="t">'+T[i][0]+'</div><p>'+T[i][1]+'</p>';
  }
  const A=RD.anim({card:'rd-att-card',ctl:'rd-att-ctl',n:5,ms:2400,label:'Attribution step',draw});
  document.getElementById('rd-att-b').addEventListener('change',e=>{b=e.target.value;sq.innerHTML='';A.redraw()});
  window.RD_CHECK=window.RD_CHECK||{};window.RD_CHECK.attr=JSON.parse(JSON.stringify(D));
})();
