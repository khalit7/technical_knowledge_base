// ---- Reading: GSM-Symbolic, one question perturbed step by step (before/after), with one model's Table 1 accuracies ----
(function(){
  const card=document.getElementById('gs-card');if(!card)return;
  // arXiv 2410.05229v2, Appendix A.2, Table 1: [GSM8K full, GSM8K (100), M1, sd, Symbolic, sd, P1, sd, P2, sd, NoOp, sd]
  const T1={'GPT-4o':[95.2,95.0,94.4,1.62,94.9,1.87,93.9,2.59,88.0,3.43,63.1,4.53],
    'o1-preview':[94.9,96.0,93.6,1.68,92.7,1.82,95.4,1.72,94.0,2.38,77.4,3.84],
    'o1-mini':[95.1,93.0,94.9,1.49,94.5,1.58,94.3,2.57,89.1,3.56,66.0,4.60],
    'GPT-4o-mini':[94.2,95.0,92.5,1.63,91.7,2.02,81.1,3.05,72.4,4.57,54.1,3.85],
    'Gemma2-27b-it':[89.7,92.0,90.2,1.86,88.3,2.56,80.7,4.07,63.4,4.14,30.0,3.39],
    'Gemma2-9b-it':[85.3,87.0,84.4,2.36,79.1,2.99,68.1,4.77,41.8,6.00,22.3,5.11],
    'Phi-3.5-mini-instruct':[84.9,88.0,87.6,1.98,82.1,3.38,64.8,5.43,44.8,6.32,22.4,4.03],
    'Phi-3-mini-128k-instruct':[83.7,85.0,85.9,2.44,80.7,2.94,63.4,5.63,37.5,5.76,18.0,3.83],
    'Mathstral-7b-v0.1':[80.1,80.0,82.9,2.87,74.0,3.49,57.4,5.20,35.5,5.07,20.4,3.58],
    'Llama3-8b-instruct':[76.0,74.0,79.5,3.62,74.6,2.94,53.8,4.54,28.3,4.37,18.6,3.86],
    'Mistral-7b-instruct-v0.3':[56.2,56.0,62.3,2.68,50.0,3.49,24.5,4.34,10.8,3.60,15.9,4.44]};
  const esc=RD.esc;
  const V=s=>'<span class="v">'+s+'</span>';
  const ORIG='When '+V('Sophie')+' watches her '+V('nephew')+', she gets out a variety of toys for him. The bag of building blocks has '+V('31')+' blocks in it. The bin of stuffed animals has '+V('8')+' stuffed animals inside. The tower of stacking rings has '+V('9')+' multicolored rings on it. '+V('Sophie')+' recently bought a tube of bouncy balls, bringing her total number of toys for her '+V('nephew')+' up to '+V('62')+'. How many bouncy balls came in the tube?';
  const inst=(n,f,x,y,z,t,a)=>'When '+V(n)+' watches her '+V(f)+', she gets out a variety of toys for him. The bag of building blocks has '+V(x)+' blocks in it. The bin of stuffed animals has '+V(y)+' stuffed animals inside. The tower of stacking rings has '+V(z)+' multicolored rings on it. '+V(n)+' recently bought a tube of bouncy balls, bringing her total number of toys for her '+V(f)+' up to '+V(t)+'. How many bouncy balls came in the tube? <span class="gold">'+a+'</span>';
  const TPL='When '+V('{name}')+' watches her '+V('{family}')+', she gets out a variety of toys for him. The bag of building blocks has '+V('{x}')+' blocks in it. The bin of stuffed animals has '+V('{y}')+' stuffed animals inside. The tower of stacking rings has '+V('{z}')+' multicolored rings on it. '+V('{name}')+' recently bought a tube of bouncy balls, bringing her total number of toys she bought for her '+V('{family}')+' up to '+V('{total}')+'. How many bouncy balls came in the tube?'+
    '<br><code class="small">name = sample(names); family = sample(["nephew", "cousin", "brother"]); x, y, z = range(5, 100); total = range(100, 500); ans = range(85, 200); condition: x + y + z + ans == total</code>';
  const PH='To make a call from a phone booth, you must pay $0.6 for each minute of your call. ';
  const STEPS=[
    {lab:'GSM8K test question (original)',q:ORIG+' <span class="gold">14</span>',bars:['g'],
     cap:'The original GSM8K test item: 31 + 8 + 9 = 48 toys, 62 − 48 = 14 balls. A model\'s GSM8K score is its accuracy on 1,319 items like this one, each asked once, in one fixed wording.'},
    {lab:'GSM-Symbolic template',q:TPL,bars:['g'],
     cap:'The authors turn the item into a template: names, relatives and numbers become variables, with ranges and a condition that keeps the answer a whole number. 100 test items are templated this way.'},
    {lab:'Instance 0 of template 9 (released data)',q:inst('Mei','brother','71','45','29','204','59'),bars:['g'],
     cap:'One real draw from the released data. Same reasoning, new name and numbers: 71 + 45 + 29 = 145, 204 − 145 = 59. A student who can do the first can do this.'},
    {lab:'Instances 1 and 2',q:inst('Ava','cousin','74','42','32','189','41')+'<br><br>'+inst('Emma','cousin','74','37','30','215','74'),bars:['g','s'],
     cap:'50 draws per template make 50 test sets of 100 questions. The second bar is the mean over the 50 sets, with their spread (solid whisker) and the spread chance alone would give at 100 items (dashed).'},
    {lab:'GSM-M1: one clause removed (Figure 5)',q:PH+'<span class="del">After 10 minutes, that price drops to $0.5 per minute.</span> How much would a 60-minute call cost? <span class="gold">$36</span>',bars:['g','s','m1'],
     cap:'Difficulty is changed by the number of clauses. With the price drop removed, the call costs 60 × 0.6 = $36 (answers on these four phone-call steps are worked out here, not printed in the figure).'},
    {lab:'GSM-P1: one clause added',q:'To make a call from a hotel room phone, you must pay $0.6 for each minute of your call. After 10 minutes, that price drops to $0.5 per minute. <span class="add">After 25 minutes from the start of the call, the price drops even more to $0.3 per minute.</span> How much would a 60-minute call cost? <span class="gold">$24</span>',bars:['g','s','m1','p1'],
     cap:'One more pricing clause: 10 × 0.6 + 15 × 0.5 + 35 × 0.3 = 6 + 7.5 + 10.5 = $24. One extra step, and weaker models start to fall.'},
    {lab:'GSM-P2: two clauses added',q:'To make a call from a hotel room phone, you must pay $0.6 for each minute of your call. After 10 minutes, the price drops to $0.5 per minute. <span class="add">After 25 minutes from the start of the call, the price drops even more to $0.3 per minute. If your total bill is more than $10, you get a 25% discount.</span> How much would a 60-minute call cost? <span class="gold">$18</span>',bars:['g','s','m1','p1','p2'],
     cap:'Two extra clauses: $24 is more than $10, so 25% off gives $18. The mean falls and the spread grows; the paper\'s P2 sets come from 50 of the templates.'},
    {lab:'GSM-NoOp: a clause that changes nothing (Figure 7)',q:'Oliver picks 44 kiwis on Friday. Then he picks 58 kiwis on Saturday. On Sunday, he picks double the number of kiwis he did on Friday, <span class="noop">but five of them were a bit smaller than average</span>. How many kiwis does Oliver have? <span class="gold">190</span><br><span class="small mute">o1-mini (Figure 7): "88 (Sunday\'s kiwis) - 5 (smaller kiwis) = 83 kiwis ... Oliver has a total of 185 kiwis."</span>',bars:['g','s','m1','p1','p2','no'],
     cap:'The irrelevant clause is the real test: 44 + 58 + 88 = 190, but models subtract the five small kiwis. Every model drops (Phi-3-mini by 65.7 points from its full GSM8K score); this drop is significant for all 25 models even under the critics\' stricter tests.'}];
  const sel=document.getElementById('gs-model');
  Object.keys(T1).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;sel.appendChild(o)});
  sel.value='Gemma2-9b-it';
  const ROWS={g:['GSM8K (100)',1,null],s:['GSM-Symbolic',4,5],m1:['M1',2,3],p1:['P1',6,7],p2:['P2',8,9],no:['NoOp',10,11]};
  const ORDER=['g','m1','s','p1','p2','no'];
  const bsd=p=>100*Math.sqrt(p/100*(1-p/100)/100);
  let cur=0;
  function draw(i){cur=i;const st=STEPS[i],v=T1[sel.value];
    document.getElementById('gs-q').innerHTML='<div class="prob"><span class="plab">'+st.lab+'</span>'+st.q+'</div>';
    document.getElementById('gs-cap').textContent='Step '+(i+1)+' of '+STEPS.length+': '+st.cap;
    let h='';
    ORDER.forEach(k=>{if(st.bars.indexOf(k)<0)return;const [lab,ai,si]=ROWS[k],a=v[ai],sd=si==null?null:v[si],b=bsd(a);
      const col=k==='g'?'var(--c1)':k==='no'?'var(--closed)':'var(--c3)';
      let w='<span class="fill" style="width:'+a+'%;background:'+col+';opacity:.75"></span>';
      if(sd!=null){w+='<span style="position:absolute;top:2px;height:3px;left:'+Math.max(0,a-sd)+'%;width:'+(2*sd)+'%;background:var(--ink)"></span>';
        w+='<span style="position:absolute;bottom:2px;height:0;border-top:2px dashed var(--mute);left:'+Math.max(0,a-b)+'%;width:'+(2*b)+'%"></span>'}
      h+='<div class="row'+(st.bars[st.bars.length-1]===k?' hl':'')+'"><span class="nm">'+lab+'</span><span class="track">'+w+'</span><span class="val">'+a.toFixed(1)+(sd!=null?' ±'+sd.toFixed(1):'')+'</span></div>'});
    document.getElementById('gs-bars').innerHTML=h;
    const last=st.bars[st.bars.length-1],a=v[ROWS[last][1]],sd=ROWS[last][2]==null?null:v[ROWS[last][2]];
    document.getElementById('gs-cnt').innerHTML=RD.stat('Accuracy on this variant',a.toFixed(1)+'%',ROWS[last][0])+
      RD.stat('Change from GSM8K (100)',(last==='g'?'0.0':(a-v[1]>0?'+':'')+(a-v[1]).toFixed(1))+' pts','the 100 templated originals: '+v[1].toFixed(1)+'%')+
      RD.stat('Spread over 50 sets',sd==null?'one set':'±'+sd.toFixed(2),'standard deviation, Table 1')+
      RD.stat('Chance alone at 100 items','±'+bsd(a).toFixed(2),'√(p(1−p)/100), derived');
  }
  const an=RD.anim({card:'gs-card',ctl:'gs-ctl',n:STEPS.length,draw,ms:3200,label:'GSM-Symbolic step'});
  sel.addEventListener('change',()=>draw(cur));
})();
