// ---- Reading: regret against the Lai and Robbins lower bound, Bernoulli arms, computed live in slices when the card comes into view ----
(function(){
  const B=window.BX,$=id=>document.getElementById(id);
  const PRE={close:[0.6,0.5,0.45,0.4,0.3],far:[0.9,0.8,0.6,0.5]};
  const M=[{k:'greedy',lab:'greedy',col:'var(--c2)'},{k:'eps',lab:'ε-greedy, ε = 0.1',col:'var(--c1)'},{k:'ucb1',lab:'UCB1',col:'var(--c3)'},{k:'ts',lab:'Thompson sampling',col:'var(--c4)'}];
  const T=10000,marks=B.logMarks(T,20);
  let pre='close',runs=200,cache={},job=0,started=false;
  function start(){started=true;const key=pre+'|'+runs,my=++job;const st=cache[key]||(cache[key]={acc:M.map(()=>new Float64Array(marks.length)),i:0,done:false});
    const total=M.length*runs;let last=0;
    function slice(){if(my!==job)return;const t0=performance.now();
      while(st.i<total&&performance.now()-t0<28){const j=Math.floor(st.i/runs);B.brRun({kind:M[j].k,eps:0.1},PRE[pre],T,st.i%runs,marks,st.acc[j]);st.i++}
      $('rg-prog').style.width=(100*st.i/total).toFixed(1)+'%';if(st.i>=total)st.done=true;
      if(st.done||performance.now()-last>350){last=performance.now();draw()}
      if(!st.done)setTimeout(slice,0)}
    slice()}
  function draw(){const st=cache[pre+'|'+runs];if(!st)return;const p=PRE[pre],C=B.lrConst(p),done=Math.floor(st.i/runs);
    const ser=M.map((m,j)=>({lab:m.lab,col:m.col,w:2,xs:marks,ys:j<done||st.done?[...st.acc[j]].map(v=>v/runs):[]}));
    const bound={lab:'Lai and Robbins: '+RD.n(C,2)+' × ln T',col:'var(--ink)',dash:'5 4',w:1.4,xs:marks,ys:marks.map(t=>C*Math.log(t))};
    let ymax=0;ser.forEach(s=>s.ys.forEach(v=>{if(v>ymax)ymax=v}));ymax=Math.max(ymax,C*Math.log(T))*1.05;
    const step=ymax>400?200:ymax>200?100:50,yt=[];for(let v=0;v<=ymax;v+=step)yt.push([v,String(v)]);
    RD.chart($('rg-P'),ser.concat([bound]),{x0:1,x1:T,y0:0,y1:ymax,logx:true,xt:[[1,'1'],[10,'10'],[100,'100'],[1000,'1,000'],[10000,'10,000']],yt,xlab:'Pulls T (log scale)',ylab:'expected regret',H:250,label:'Regret against the lower bound'});
    RD.legend($('rg-L'),ser.concat([bound]));
    const i1=marks.indexOf(1000),slope=s=>(s.ys[s.ys.length-1]-s.ys[i1])/Math.log(10);
    $('rg-N').innerHTML=ser.map(s=>s.ys.length?RD.stat(s.lab,RD.n(s.ys[s.ys.length-1],1),'regret at 10,000 · slope '+RD.n(slope(s),1)+' per unit of ln T'):RD.stat(s.lab,'…','computing')).join('')+RD.stat('Lower bound constant',RD.n(C,2),'Σ Δ / KL(p_a, p*) per unit of ln T');
    $('rg-X').innerHTML=st.done?'Arms '+p.join(', ')+' (<i class="nl i">illustrative</i>), '+runs+' runs of 10,000 pulls, seeded. Slopes are measured between 1,000 and 10,000 pulls. Greedy and fixed-ε exploration have linear regret (on this log axis a straight line in T curves upward); greedy loses most, from the runs where it locks onto a worse arm. UCB1 is logarithmic, but its constant (Auer et al.\'s 8/Δ) is large when gaps are small, so on close arms it can trail ε-greedy at 10,000 pulls and wins only over longer horizons. Thompson sampling sits <b>below</b> the bound line, which is not a contradiction: the bound is asymptotic and constrains the slope as T grows without limit; on two arms 0.6 and 0.5 the same engine\'s Thompson slope rises from about 3 to 4.2 per unit of ln T by a million pulls, towards the bound\'s 4.9 (README).':'Computing in your browser…'}
  $('rg-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pre=b.dataset.p;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));start()});
  $('rg-runs').addEventListener('change',e=>{runs=+e.target.value;start()});
  const card=$('rg');if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[es.length-1].isIntersecting&&!started)start()},{threshold:.1}).observe(card);else start();
  RD.onResize(draw);RD.onRender(()=>{if(started)draw()});
})();
