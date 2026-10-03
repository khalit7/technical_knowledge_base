// ---- Reading, Axis 1: the same prompt answered by five checkpoints (illustrative outputs) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-ck'))return;
  const E=RD.esc;
  // Illustrative texts, written to show each stage's typical behaviour; not sampled from a model.
  const K=[
    {n:'Base model',sub:'after pretraining',sig:'predict the next token of web text',w:'all, from random',ok:false,
     out:'<span class="cont">'+E('A shop sells 5 rulers for $3. How much do 20 rulers cost?\nA shop sells 4 erasers for $1. How much do 16 erasers cost?\nA shop sells 6 pencils for $2. How much do 30 pencils cost?\n\nAnswers are on page 112.')+'</span>',
     t:'Base model: it continues the text',p:'Pretraining rewarded predicting what comes next on the web, and what follows a word problem on the web is usually another word problem. The model knows the arithmetic; nothing has taught it that a question is a request.'},
    {n:'SFT',sub:'imitated demonstrations',sig:'imitate a written answer',w:'all, near the base',ok:true,
     out:E('12 pens cost $8.'),
     t:'After SFT: it answers, tersely',p:'A few thousand demonstrations teach the format: read the prompt as a request and answer in the assistant\'s voice. The answer is right, but the model imitated the length of its demonstrations, not a way of checking itself.'},
    {n:'Preference-tuned',sub:'DPO or RLHF',sig:'be the answer a judge ranks higher',w:'all, held near SFT by a KL term',ok:true,
     out:E('Great question! Since 3 pens cost $2, 12 pens is 4 groups of 3 pens.\n\n4 × $2 = $8\n\nSo 12 pens cost $8. Let me know if you would like help with anything else!'),
     t:'After preference optimisation: friendlier, longer',p:'Judges prefer answers that show working and sound helpful, so the model learns both. They also tend to prefer longer answers whether or not length helps: the first, mild form of reward hacking (Axis 4).'},
    {n:'RLVR',sub:'RL against a checker',sig:'reach an answer the checker accepts',w:'all, its own samples reinforced',ok:true,
     out:'<span class="th">'+E('<think>\n12 ÷ 3 = 4 groups of pens.\n4 × $2 = $8.\nCheck: $8 ÷ 12 = $0.667 a pen, and $2 ÷ 3 = $0.667 a pen. Same price.\n</think>')+'</span>\n'+E('$8'),
     t:'After RLVR: it thinks, checks, then answers',p:'Only the final answer was rewarded, yet the samples that verified themselves were right more often and were reinforced, so a checking habit grows. The visible answer is the shortest yet; the tokens moved into the reasoning, which is billed as output.'},
    {n:'Distilled student',sub:'1.5B, trained on the RL model\'s traces',sig:'imitate the teacher\'s traces',w:'a new, smaller model',ok:true,
     out:'<span class="th">'+E('<think>\n12 ÷ 3 = 4. 4 × $2 = $8.\n</think>')+'</span>\n'+E('$8'),
     t:'A distilled student: the teacher\'s habit, compressed',p:'A model a fraction of the size, fine-tuned on the RL model\'s traces, inherits the think-then-answer format. It skipped the check: students copy what is frequent in the traces, and a small one may not carry what it cannot model.'}
  ];
  const tok=s=>{const t=s.replace(/<[^>]+>/g,'').replace(/&[a-z]+;/g,'x');return (t.match(/[A-Za-z]+|\d+|[^\sA-Za-z\d]/g)||[]).length};
  $('rd-ckS').innerHTML=K.map((k,i)=>'<button data-i="'+i+'">'+k.n+'</button>').join('');
  let A;
  function draw(i){const k=K[i];
    $('rd-ckS').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===i));
    $('rd-ckO').innerHTML=k.out;
    $('rd-ckT').textContent=(i+1)+' of '+K.length+' · '+k.t;
    $('rd-ckP').textContent=k.p;
    $('rd-ckN').innerHTML=RD.stat('Trained to',k.sig,k.sub)+RD.stat('Weights changed',k.w,'')+
      RD.stat('Answers the question?',k.ok?'Yes, $8':'No','')+RD.stat('Tokens in this output','≈ '+tok(k.out),'<span class="ill">illustrative</span>');
  }
  A=RD.anim({card:'rd-ck',ctl:'rd-ckC',n:K.length,draw,ms:3200,label:'Checkpoint'});
  $('rd-ckS').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)A.go(+b.dataset.i)});
})();
