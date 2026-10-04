// ---- Reading, Who grades: one judge through grading protocols (MT-Bench, Zheng et al. 2023, Tables 2, 4 and 5) ----
(function(){
  const sq=document.getElementById('rd-mode-sq');if(!sq)return;
  // Table 2, default prompt: percentages of 80 cases (consistent, biased toward first, biased toward second, error)
  const T2={g4:{n:'GPT-4',p:[65.0,30.0,5.0,0.0]},g35:{n:'GPT-3.5',p:[46.2,50.0,1.2,2.5]},c1:{n:'Claude-v1',p:[23.8,75.0,0.0,1.2]}};
  const N=80;
  const cnt=j=>T2[j].p.map(x=>Math.round(x*N/100));// 52,24,4,0 / 37,40,1,2 / 19,60,0,1
  // Table 4: GPT-4 failures out of 20 (10 math questions, both orders)
  const T4=[['Default prompt',14],['Chain-of-thought prompt',6],['Reference-guided prompt',3]];
  // deterministic scatter of categories over squares (arrangement illustrative)
  function order(n,seed){const a=[...Array(n).keys()];let s=seed;for(let i=n-1;i>0;i--){s=(s*1103515245+12345)%2147483648;const j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
  const ordP=order(N,7),ordM=order(20,3);
  let mode='pos',judge='g4';
  const cap=document.getElementById('rd-mode-cap'),cn=document.getElementById('rd-mode-cnt'),leg=document.getElementById('rd-mode-leg');
  const jl=document.getElementById('rd-mode-jl');
  function squares(n,cls){if(sq.children.length!==n){sq.innerHTML='<i></i>'.repeat(n)}[...sq.children].forEach((e,i)=>e.className=cls[i])}
  const L=(c,t)=>'<span style="--sw:var('+c+')">'+t+'</span>';
  const pct=(a,b)=>(100*a/b).toFixed(1)+'%';
  function drawPos(i){
    const [c,f,s,e]=cnt(judge),nm=T2[judge].n;
    const cat=new Array(N);ordP.forEach((sqi,k)=>{cat[sqi]=k<c?'kc':k<c+f?'kf':k<c+f+s?'ks':'ke'});
    let cls,t,p;
    if(i===0){cls=cat.map(()=>'kg');t='1. One order: every pair gets a clean verdict';
      p=nm+' reads answer A first and B second and names a winner for each of the 80 pairs. Nothing in the output looks wrong.';
      leg.innerHTML=L('--c1','verdict given');}
    else if(i===1){cls=cat;t='2. Swap the order and judge again';
      p=c+' of 80 verdicts survive the swap ('+pct(c,N)+'). '+f+' follow whichever answer was shown first, '+s+' whichever was shown second'+(e?', and '+e+' come back in the wrong format':'')+'.';
      leg.innerHTML=L('--good','same verdict both orders')+L('--bad','follows first position')+L('--c4','follows second position')+(e?L('--mute','format error'):'');}
    else if(i===2){cls=cat.map(x=>x==='kc'?'kc':x==='ke'?'ke':'kt');t='3. Count a flip as a tie (MT-Bench\'s rule)';
      p='Both orders, inconsistent pairs scored as ties: '+(f+s)+' of the single-order verdicts ('+pct(f+s,N)+') were the position talking. The fix doubles the judge calls; it does not remove the bias, it stops it from counting.';
      leg.innerHTML=L('--good','verdict kept')+L('--c5','scored as a tie')+(e?L('--mute','format error'):'');}
    else {cls=cat.map(()=>'ka');t='4. Or grade each answer alone (pointwise)';
      p='With no second answer in view there is no position to favour. The price is a drifting scale and less information per call: on MT-Bench first turns, GPT-4 grading single answers agreed with experts 60% of the time against 66% for GPT-4 pairwise (ties counted; 85% for both on non-tie votes; Table 5).';
      leg.innerHTML=L('--c4','scored alone, no order');}
    squares(N,cls);
    cn.innerHTML=RD.stat('Pairs',N,'two near-identical answers')+RD.stat('Same verdict both orders',i>=1&&i<3?c+' ('+pct(c,N)+')':'n/a',nm+', default prompt')+RD.stat('Followed position',i>=1&&i<3?(f+s)+' ('+pct(f+s,N)+')':'n/a','first '+f+', second '+s)+RD.stat('Judge calls',i===0?N:i<3?2*N:2*N,i<3?'per comparison: '+(i===0?1:2):'one per answer');
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  function drawMath(i){
    const k=i===0?0:T4[i-1][1];
    const cls=new Array(20);ordM.forEach((sqi,r)=>{cls[sqi]=i===0?'k0':r<k?'kf':'kc'});
    squares(20,cls);
    leg.innerHTML=i===0?L('--dim','one judgment: wrong answer against right one'):L('--bad','judge called the wrong answer correct')+L('--good','judge caught it');
    const t=i===0?'1. 20 judgments where one answer is wrong':(i+1)+'. '+T4[i-1][0];
    const p=i===0?'GPT-4 compares LLaMA-13B and Vicuna-13B on 10 MT-Bench math questions, each pair in both orders.':
      i===1?'Asked which answer is better, GPT-4 calls an incorrect answer correct 14 times out of 20, including on problems it solves correctly when asked separately: the answers it reads mislead it.':
      i===2?'Asked to solve the question itself before grading, failures fall to 6; in many of the rest it makes exactly the mistake of the answers in front of it.':
      'Given a reference answer (GPT-4\'s own solution, produced independently first), failures fall to 3 of 20. A rubric or reference turns "which is better" into "does this match", which is why reference-guided grading is the most reliable mode where references exist.';
    cn.innerHTML=RD.stat('Judgments',20,'10 questions, both orders')+RD.stat('Failures',i===0?'n/a':k+' of 20',i===0?'':pct(k,20))+RD.stat('Prompt',i===0?'n/a':['default','chain of thought','reference-guided'][i-1],'GPT-4 judge');
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const A=RD.anim({card:'rd-mode-card',ctl:'rd-mode-ctl',n:4,ms:2600,label:'Grading step',draw:i=>mode==='pos'?drawPos(i):drawMath(i)});
  RD.seg(document.getElementById('rd-mode-seg'),m=>{mode=m;jl.style.visibility=m==='pos'?'visible':'hidden';sq.innerHTML='';sq.classList.toggle('sm',false);A.reset(4)});
  document.getElementById('rd-mode-judge').addEventListener('change',e=>{judge=e.target.value;A.redraw()});
  window.RD_CHECK=window.RD_CHECK||{};window.RD_CHECK.modes={g4:cnt('g4'),g35:cnt('g35'),c1:cnt('c1'),math:T4.map(x=>x[1])};
})();
