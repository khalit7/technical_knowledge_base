// ---- Reading: the before/after animation. One model's MT-Bench comparisons; naive judge rate against the gold-slice correction ----
(function(){
  const L=window.LJ, $=id=>document.getElementById(id);
  const tSel=$('an-target'),mSel=$('an-m'),dotsEl=$('an-dots'),cnt=$('an-cnt'),cap=$('an-cap'),leg=$('an-leg');
  [2,1,0,3,4,5].forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=L.nm(m);tSel.appendChild(o)});
  let mode='corr',I=null,C=null,dots=[];
  const SEED=1;
  function setup(){
    I=L.items(+tSel.value,'P');C=L.calib(I,+mSel.value,SEED);
    dotsEl.innerHTML=I.map(()=>'<i></i>').join('');dots=[...dotsEl.children];
    C.inSlice=new Set(C.g);
  }
  const P=x=>L.pct(x);
  const STEPS={
    corr:['start','judge','report','slice','label','rates','correct','truth'],
    naive:['start','judge','report','truth']
  };
  function counters(s){
    const k=STEPS[mode].indexOf(s),at=n=>k>=STEPS[mode].indexOf(n)&&STEPS[mode].indexOf(n)>=0;
    const st=RD.stat;let h=st('Comparisons',I.length,'human non-tie votes');
    h+=st('Judge win rate',at('judge')?P(C.p):'?','raw, all items');
    if(mode==='corr'){
      h+=st('Gold labels',at('slice')?C.g.length:'0',at('label')?C.tp+C.fn+' wins, '+(C.fp+C.tn)+' losses':'');
      h+=st('Sensitivity q&#770;<sub>1</sub>',at('rates')&&isFinite(C.q1)?C.q1.toFixed(3):'?','TP/(TP+FN)');
      h+=st('Specificity q&#770;<sub>0</sub>',at('rates')&&isFinite(C.q0)?C.q0.toFixed(3):'?','TN/(TN+FP)');
      h+=st('Corrected',at('correct')?(C.c.ok?P(C.c.est):'not computable'):'?',at('correct')&&C.c.ok?'95% CI '+P(C.c.lo,0)+' to '+P(C.c.hi,0):'');
    }
    h+=st('Human truth',at('truth')?P(C.th):'?','all '+I.length+' votes');
    cnt.innerHTML=h;
  }
  function paint(s){
    const k=STEPS[mode].indexOf(s),after=n=>{const j=STEPS[mode].indexOf(n);return j>=0&&k>=j};
    dotsEl.classList.toggle('fade',mode==='corr'&&(s==='slice'||s==='label'||s==='rates'));
    for(let i=0;i<I.length;i++){const [z,zh]=I[i],d=dots[i];let c='';
      if(s==='truth')c=z?'dw':'dl';
      else if(after('label')&&C.inSlice.has(i))c=z&&zh?'tp':z?'fn':zh?'fp':'tn';
      else if(after('judge'))c=zh?'dw':'dl';
      d.className=c+(mode==='corr'&&after('slice')&&s!=='truth'&&C.inSlice.has(i)?' g':'')}
    let lg='';
    if(s==='truth')lg='<span style="--sw:var(--c1)">humans: '+L.nm(+tSel.value)+' won</span><span style="--sw:var(--dim)">humans: it lost</span>';
    else if(after('label'))lg='<span style="--sw:var(--good)">judge win, human win (TP)</span><span style="--sw:var(--c5)">judge not, human win (FN)</span><span style="--sw:var(--bad)">judge win, human loss (FP)</span><span style="--sw:var(--mute)">both loss (TN)</span><span style="--sw:var(--c1)">outside the slice: judge win</span>';
    else if(after('judge'))lg='<span style="--sw:var(--c1)">judge: '+L.nm(+tSel.value)+' won</span><span style="--sw:var(--dim)">judge: lost or tie</span>';
    leg.innerHTML=lg;
  }
  function caption(s){
    const t=L.nm(+tSel.value),err=x=>((x-C.th)*100>=0?'+':'')+((x-C.th)*100).toFixed(1)+' points';
    const T={
      start:['The comparisons','Each square is one human vote on a comparison between '+t+' and another model, ties left out: '+I.length+' votes. The question is the share '+t+' won. Nobody has looked at the human labels yet.'],
      judge:['The judge labels everything','GPT-4 judges every comparison in both orders; when the two orders disagree the verdict is a tie, counted here as "not a win". Cost: two calls per item, no human time.'],
      report:['The usual report',t+' wins '+P(C.p)+' of comparisons "according to GPT-4". '+(mode==='naive'?'This number goes in the slide.':'Before reporting it, measure the instrument.')],
      slice:['Draw a gold slice','A random '+C.g.length+' of the '+I.length+' items (outlined) go to humans. Random matters: the correction assumes the judge errs on the slice as it does on the rest.'],
      label:['Humans label the slice','Of the '+C.g.length+': '+C.tp+' true positives, '+C.fn+' wins the judge missed, '+C.fp+' losses it called wins, '+C.tn+' true negatives.'],
      rates:['Measure the judge','Sensitivity q&#770;1 = '+C.tp+'/'+(C.tp+C.fn)+' = '+(isFinite(C.q1)?C.q1.toFixed(3):'n/a')+'; specificity q&#770;0 = '+C.tn+'/'+(C.fp+C.tn)+' = '+(isFinite(C.q0)?C.q0.toFixed(3):'n/a')+'. Their sum minus 1 ('+(isFinite(C.q0+C.q1)?(C.q0+C.q1-1).toFixed(3):'n/a')+') is how much signal the judge carries; at 0 it carries none.'],
      correct:['Correct the rate',C.c.ok?'&theta;&#770; = ('+C.p.toFixed(3)+' + '+C.q0.toFixed(3)+' &minus; 1) / ('+C.q0.toFixed(3)+' + '+C.q1.toFixed(3)+' &minus; 1) = '+P(C.c.est)+', 95% interval '+P(C.c.lo)+' to '+P(C.c.hi)+' (Lee et al. eq. 8). The same '+C.g.length+' labels used directly as a sample give '+P(C.human.est)+' ('+P(C.human.lo)+' to '+P(C.human.hi)+').':'The slice gives q&#770;0 + q&#770;1 &le; 1: the judge shows no usable signal on these labels and the correction cannot be computed. Label more, or pick another judge.'],
      truth:['The truth','All '+I.length+' human labels: '+t+' won '+P(C.th)+'. The judge\'s raw rate was off by '+err(C.p)+(mode==='corr'&&C.c.ok?'; the corrected estimate by '+err(C.c.est)+', and its interval '+((C.c.lo<=C.th&&C.th<=C.c.hi)?'contains':'misses')+' the truth.':'. Nothing in the raw number warned of it.')]
    };
    const x=T[s];cap.innerHTML='<div class="t">'+(STEPS[mode].indexOf(s)+1)+'. '+x[0]+'</div><p>'+x[1]+'</p>';
  }
  function draw(i){const s=STEPS[mode][i];paint(s);counters(s);caption(s)}
  setup();
  const A=RD.anim({card:'an-card',ctl:'an-ctl',n:STEPS[mode].length,draw,ms:1700,label:'Animation step'});
  RD.seg($('an-mode'),m=>{mode=m;A.reset(STEPS[mode].length);A.play()});
  tSel.addEventListener('change',()=>{setup();A.reset(STEPS[mode].length)});
  mSel.addEventListener('change',()=>{setup();A.reset(STEPS[mode].length)});
})();
