// ---- This page's three static figures, drawn at the card's measured width and redrawn on resize. ----
// Data: window.ARTICLE.recompute (src/recompute.py, written to inputs/recompute.json). Every number drawn is also in the
// figure's caption. No animation: each figure is a comparison read at once.
(function(){
  if(!window.RD||!window.ARTICLE||!ARTICLE.recompute)return;
  const t=RD.t, R=ARTICLE.recompute;
  const COL={A:'var(--c1)',B:'var(--c3)',C:'var(--c4)','?':'var(--mute)'};
  const SHORT=['BoW + logistic reg.','LSTM, from scratch','ULMFiT','Text CNN','GPT-2 124M','ModernBERT large','Jev, Choice','Jev, Noul','Laya','Contrastive LM'];

  // 1. The hero: the IMDb ladder, one row per model in the article's order, x from 80% to 100%.
  const hero=document.getElementById('tc-hero-svg');
  function drawHero(){
    if(!hero)return;
    const W=RD.width(hero), nar=W<520, lw=nar?Math.min(128,W*0.38):Math.min(220,W*0.4);
    const x0=lw+8, x1=W-(nar?38:46), rh=nar?25:27, top=8, n=R.ladder.length, gap=18, yb=top+n*rh+gap;
    const X=a=>x0+(a-80)/20*(x1-x0);
    let s='';
    for(let v=80;v<=100;v+=5){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+yb+'" stroke="var(--line)"/>'+t(x,yb+16,v+'%',{fs:11,a:'middle',fill:'var(--mute)'})}
    // the step pretraining bought, as a band behind the rows
    R.ladder.forEach((r,i)=>{
      const y=top+i*rh+rh/2+(i>=6?gap:0), c=COL[r.s];
      if(i===6)s+='<line x1="0" x2="'+W+'" y1="'+(top+6*rh+gap*0.35)+'" y2="'+(top+6*rh+gap*0.35)+'" stroke="var(--ink)" stroke-opacity=".25" stroke-dasharray="3 3"/>';
      s+=t(lw,y+4,nar?SHORT[i]:r.m,{fs:12,a:'end',fill:'var(--ink)'});
      s+='<line x1="'+x0+'" x2="'+X(r.a)+'" y1="'+y+'" y2="'+y+'" stroke="'+c+'" stroke-opacity=".35" stroke-width="2"/>';
      s+='<circle cx="'+X(r.a)+'" cy="'+y+'" r="6" fill="'+(r.trained?c:'var(--card)')+'" stroke="'+c+'" stroke-width="2.2"/>';
      s+=t(X(r.a)+10,y+4,(r.approx?'~':'')+(r.approx||r.a),{fs:12,fill:'var(--ink)',w:r.trained?400:700});
    });
    s+=t(x0,top+6*rh+gap*0.35+13,'below: no training on IMDb',{fs:11,fill:'var(--mute)'});
    hero.innerHTML=RD.svg(W,yb+22,s,'IMDb accuracy by model: bag-of-words logistic regression 89.9, LSTM from scratch 85.66, ULMFiT 95.4, text CNN 90.07, GPT-2 about 92, ModernBERT about 95, all trained on IMDb; Jev Choice 96.47 and Noul 96.20, Laya 92.33 and Contrastive Language Models 82.90 with no IMDb training; three different test sets');
  }

  // 2. Independence of irrelevant alternatives: per-option scoring (illustrative) against Jev (measured).
  const iia=document.getElementById('tc-iia-svg');
  function drawIIA(){
    if(!iia)return;
    const I=R.iia, W=RD.width(iia), nar=W<460;
    const names=['bank','provider','customer','unknown','weather'], lab={bank:'bank',provider:'provider',customer:'customer',unknown:'unknown',weather:'weather'};
    const gw=(W-16)/2, bh=nar?92:110, top=26, base=top+bh;
    let s='';
    [[I.p4,'4 options'],[I.p5,'+ "bad weather"']].forEach((P,g)=>{
      const gx=8+g*gw, n=names.length, bw=Math.min(34,(gw-16)/n-6);
      s+=t(gx+gw/2,14,P[1],{fs:12,a:'middle',fill:'var(--mute)'});
      names.forEach((k,j)=>{
        const x=gx+8+j*((gw-16)/n)+((gw-16)/n-bw)/2, p=P[0][k];
        const hi=(k==='customer'||k==='unknown');
        if(p===undefined){s+='<rect x="'+x+'" y="'+(base-bh*0.5)+'" width="'+bw+'" height="'+(bh*0.5)+'" fill="none" stroke="var(--line)" stroke-dasharray="3 3" rx="3"/>';}
        else{const h=p/0.45*bh;s+='<rect x="'+x+'" y="'+(base-h)+'" width="'+bw+'" height="'+h+'" rx="3" fill="'+(hi?'var(--c2)':'var(--c1)')+'" fill-opacity="'+(hi?.9:.45)+'"/>'+t(x+bw/2,base-h-4,p.toFixed(2).replace(/^0/,''),{fs:11,a:'middle',fill:'var(--ink)'});}
        const slot=(gw-16)/n;if(slot>=40||hi)s+=t(x+bw/2,base+14,slot>=54?lab[k]:lab[k].slice(0,4),{fs:11,a:'middle',fill:hi?'var(--ink)':'var(--mute)'});
      });
    });
    s+=t(W/2,base+32,'log(p customer / p unknown) = +'+I.logodds_toy.toFixed(2)+' in both',{fs:12,a:'middle',fill:'var(--c2)',w:700});
    // the measured panel: a log-odds axis from -0.1 to +0.6
    const ay=base+86, ax0=nar?16:40, ax1=W-(nar?16:40), XL=v=>ax0+(v+0.1)/0.7*(ax1-ax0), M=I.jev_measured;
    s+=t(W/2,ay-30,'Jev 1.13.0, measured (10 blocks)',{fs:12,a:'middle',fill:'var(--mute)'});
    s+='<line x1="'+ax0+'" x2="'+ax1+'" y1="'+ay+'" y2="'+ay+'" stroke="var(--line)"/>';
    [0,0.2,0.4,0.6].forEach(v=>{s+='<line x1="'+XL(v)+'" x2="'+XL(v)+'" y1="'+(ay-4)+'" y2="'+(ay+4)+'" stroke="var(--mute)"/>'+t(XL(v),ay+18,(v>0?'+':'')+v.toFixed(1),{fs:11,a:'middle',fill:'var(--mute)'})});
    s+='<path d="M'+(XL(M.before)-8)+' '+(ay-12)+' L'+(XL(M.after)+10)+' '+(ay-12)+'" stroke="var(--c2)" stroke-width="1.6" marker-end="url(#tc-ar)"/>';
    s+='<circle cx="'+XL(M.before)+'" cy="'+ay+'" r="6" fill="var(--mute)"/><circle cx="'+XL(M.after)+'" cy="'+ay+'" r="6" fill="var(--c2)"/>';
    s+=t(XL(M.before),ay+34,'4 options +'+M.before,{fs:11,a:'middle',fill:'var(--ink)'});
    s+=t(XL(M.after),ay+34,'5 options +'+M.after,{fs:11,a:'middle',fill:'var(--c2)',w:700});
    const defs='<defs><marker id="tc-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--c2)"/></marker></defs>';
    iia.innerHTML=RD.svg(W,ay+44,defs+s,'Illustrative per-option scoring: probabilities shrink when a fifth option is added but the log-odds of customer against unknown stays +0.30. Measured on Jev: the same log-odds fell from +0.38 to +0.11');
  }

  // 3. The RLCR reward against stated confidence, with the expected reward at p = 0.7.
  const rl=document.getElementById('tc-rlcr-svg');
  function drawRL(){
    if(!rl)return;
    const W=RD.width(rl), nar=W<460, H=nar?230:260, l=nar?34:42, r=W-14, top=12, b=H-34;
    const X=q=>l+q*(r-l), Y=v=>top+(1-v)/2*(b-top);  // reward from -1 to 1
    let s='';
    [-1,-0.5,0,0.5,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+r+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"'+(v===0?' stroke-width="1.6"':'')+'/>'+t(l-5,Y(v)+4,(v>0?'+':'')+v,{fs:11,a:'end',fill:'var(--mute)'})});
    [0,0.2,0.4,0.6,0.8,1].forEach(q=>{s+=t(X(q),b+16,q.toFixed(1),{fs:11,a:'middle',fill:'var(--mute)'})});
    s+=t((l+r)/2,b+30,'stated confidence q',{fs:11,a:'middle',fill:'var(--mute)'});
    const path=f=>{let d='';for(let i=0;i<=100;i++){const q=i/100;d+=(i?'L':'M')+X(q).toFixed(1)+' '+Y(f(q)).toFixed(1)}return d};
    s+='<path d="'+path(q=>1-(1-q)*(1-q))+'" fill="none" stroke="var(--c3)" stroke-width="2.4"/>';
    s+='<path d="'+path(q=>-q*q)+'" fill="none" stroke="var(--c2)" stroke-width="2.4"/>';
    s+='<path d="'+path(q=>0.7*(1-(1-q)*(1-q))-0.3*q*q)+'" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="5 4"/>';
    s+=t(X(0.03),Y(0.62),'right (c = 1)',{fs:12,fill:'var(--c3)',w:600});
    s+=t(X(0.1),Y(-0.5),'wrong (c = 0)',{fs:12,fill:'var(--c2)',w:600});
    const pk=R.rlcr_expected.q07;
    s+='<circle cx="'+X(0.7)+'" cy="'+Y(pk)+'" r="4.5" fill="var(--ink)"/>'+t(X(0.7),Y(pk)+(nar?22:20),'right 70%: peak '+pk+' at q = 0.7',{fs:11,a:'middle',fill:'var(--ink)'});
    [[0.9,R.rlcr.right_09,'var(--c3)',20],[0.9,R.rlcr.wrong_09,'var(--c2)',16],[0.2,R.rlcr.wrong_02,'var(--c2)',18]].forEach(p=>{
      s+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="5" fill="'+p[2]+'" stroke="var(--card)" stroke-width="1.5"/>'+t(X(p[0]),Y(p[1])+p[3],(p[1]>0?'+':'')+p[1],{fs:12,a:'middle',fill:'var(--ink)',w:700});
    });
    rl.innerHTML=RD.svg(W,H,s,'RLCR reward against stated confidence: right answers earn 1 minus (1 minus q) squared, wrong answers minus q squared; right at 0.9 earns 0.99, wrong at 0.9 minus 0.81, wrong at 0.2 minus 0.04; a model right 70% of the time earns most, 0.49, by stating 0.7');
  }

  function all(){drawHero();drawIIA();drawRL()}
  RD.onRender(all);RD.onResize(all);all();
})();
