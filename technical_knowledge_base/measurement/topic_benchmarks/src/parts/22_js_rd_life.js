// ---- Reading: the life of a benchmark, then (MMLU) against now (Terminal-Bench-Science 0.1), animated ----
// Points: best published score at each date. Checked against read/recompute.py by read/check_js.mjs.
window.RD_LIFE=(function(){
  const day=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5;
  const L='target="_blank" rel="noopener noreferrer"';
  const A=(t,u)=>'<a href="'+u+'" '+L+'>'+t+'</a>';
  const SRC={
    mmlu:A('Hendrycks et al. 2020','https://arxiv.org/abs/2009.03300'),
    chin:A('Hoffmann et al. 2022','https://arxiv.org/abs/2203.15556'),
    gpt4:A('GPT-4 technical report','https://arxiv.org/abs/2303.08774'),
    o1:A('OpenAI, 12 Sep 2024','https://openai.com/index/learning-to-reason-with-llms/'),
    redux:A('MMLU-Redux','https://arxiv.org/abs/2406.04127'),
    tbs:A('Terminal-Bench-Science announcement','https://www.terminal-bench-science.ai/announcement'),
    llms:A('Topic: llms, Benchmarks tab','https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286')
  };
  const D={
    then:{name:'MMLU',pts:[['2020-09-07',43.9,'GPT-3 175B'],['2022-03-29',67.5,'Chinchilla'],['2023-03-14',86.4,'GPT-4'],['2024-09-12',92.3,'o1']],
      xmax:1500,unit:'y',chance:25,
      cap:[
        ['1. Born (7 September 2020)','MMLU launches: 15,908 four-option questions over 57 subjects. The largest GPT-3 scores 43.9% few-shot against 25% for guessing ('+SRC.mmlu+'). Plenty of headroom: the benchmark can separate models.'],
        ['2. Discriminates (March 2022)','Chinchilla reaches 67.5%, more than 7 points above Gopher ('+SRC.chin+'). Gaps between models are large compared with the noise, so the number means something.'],
        ['3. Still discriminating (March 2023)','GPT-4 scores 86.4% ('+SRC.gpt4+'), 918 days after launch. MMLU defined model comparisons from 2021 to 2023.'],
        ['4. Saturates, contaminated, replaced (September 2024)','o1 scores 92.3% ('+SRC.o1+'). The shaded band is the roughly 6.5% of questions with an error of some kind ('+SRC.redux+'): the top is now the answer key, not the model. The questions come from the public web, so overlap with training data is widespread. Cards move to MMLU-Pro (June 2024), GPQA and HLE.'],
        ['5. The same arc on one time axis','Both benchmarks drawn against days since launch. MMLU needed 918 days to gain 42.5 points; Terminal-Bench-Science gained 34.6 points in 26 days, the thin line hugging the left edge.']
      ]},
    now:{name:'Terminal-Bench-Science 0.1',pts:[['2026-08-27',30.0,'Claude Opus 5'],['2026-09-01',52.6,'Claude Fable 5.1'],['2026-09-22',64.6,'GPT-6 Astra']],
      xmax:30,unit:'d',
      cap:[
        ['1. Born (27 August 2026)','70 expert-curated research tasks in five science domains, from 376 contributors in 22 countries, built to sit far below saturation. Claude Opus 5 leads at 30.0% ('+SRC.tbs+').'],
        ['2. Five days later (1 September)','Claude Fable 5.1 is released at 52.6% on Anthropic’s own run: 22.6 points of headroom gone in five days. Artificial Analysis measured the same model at 43.3% ('+SRC.llms+'), so who ran it matters too.'],
        ['3. 26 days after launch (22 September)','GPT-6 Astra stands at 64.6% on the comparison table in Anthropic’s Claude Opus 5.5 release, where Opus 5.5 scores 58.7%; Artificial Analysis measured Astra at 63.3% ('+SRC.llms+').'],
        ['4. What comes next','35.4 points of headroom are left and version 0.2 is in development. Nothing is wrong with the benchmark: the rate is the finding. A suite built to last now lasts weeks.'],
        ['5. The same arc on one time axis','Both benchmarks drawn against days since launch. Terminal-Bench-Science gained 34.6 points in 26 days, about 29 times MMLU’s pace to GPT-4.']
      ]}
  };
  function rows(k){const p=D[k].pts,t0=day(p[0][0]);return p.map(([d,s,m])=>{const dd=Math.round(day(d)-t0);return {date:d,days:dd,score:s,model:m,headroom:+(100-s).toFixed(1),gain:+(s-p[0][1]).toFixed(1),per30:dd?+((s-p[0][1])/dd*30).toFixed(2):null}})}
  const R={then:rows('then'),now:rows('now')};
  const pace=+(R.now[2].per30/R.then[2].per30).toFixed(1);
  let mode='then',an=null;
  const box=document.getElementById('rd-life-svg'),cap=document.getElementById('rd-life-cap'),cnt=document.getElementById('rd-life-cnt');
  function draw(i){
    const W=Math.max(260,Math.min(860,RD.width(box))),H=Math.round(Math.max(210,Math.min(300,W*0.48)));
    const ml=36,mr=12,mt=12,mb=30,pw=W-ml-mr,ph=H-mt-mb;
    const both=i===4,xmax=both?1500:D[mode].xmax,unit=both?'y':D[mode].unit;
    const X=d=>ml+pw*d/xmax,Y=s=>mt+ph*(1-s/100);
    let g='';
    [0,25,50,75,100].forEach(v=>{g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(ml-5,Y(v)+4,v+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    const ticks=unit==='y'?[0,365,730,1095,1460]:[0,7,14,21,28];
    ticks.forEach(d=>{g+=RD.t(X(d),H-mb+15,unit==='y'?(d/365)+(d===365?' year':' yr'):d+(d===7?' days':' d'),{a:d===0?'start':'middle',fs:10,fill:'var(--mute)'})});
    g+=RD.t(W-mr,H-3,'time since launch',{a:'end',fs:10,fill:'var(--mute)'});
    if(mode==='then'&&i>=3||both){g+='<rect x="'+ml+'" y="'+Y(100)+'" width="'+pw+'" height="'+(Y(93.5)-Y(100))+'" fill="var(--bad)" opacity=".16"/>'+RD.t(ml+4,Y(93.5)-3,'MMLU errata band',{fs:10,fill:'var(--bad)'})}
    if(mode==='then'&&!both){g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(25)+'" y2="'+Y(25)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+RD.t(W-mr,Y(25)-3,'chance 25%',{a:'end',fs:10,fill:'var(--mute)'})}
    function series(rs,n,col,lab){
      const s=rs.slice(0,n);let out='';
      if(s.length>1)out+='<polyline fill="none" stroke="'+col+'" stroke-width="2.2" points="'+s.map(r=>X(r.days).toFixed(1)+','+Y(r.score).toFixed(1)).join(' ')+'"/>';
      s.forEach((r,j)=>{const x=X(r.days),y=Y(r.score);out+='<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="'+col+'"/>';
        if(lab){const right=x<ml+pw*0.62;const txt=r.model+' '+r.score.toFixed(1)+'%';out+=RD.t(right?x+8:x-8,y+(j===0?-8:4),txt,{a:right?'start':'end',fs:11})}});
      return out}
    if(both){g+=series(R.then,4,'var(--c1)',false)+series(R.now,3,'var(--c2)',false);
      const a=R.then[3],b=R.now[2];
      g+=RD.t(X(a.days)-6,Y(a.score)+16,'MMLU',{a:'end',fs:11,fill:'var(--c1)',w:600});
      g+=RD.t(X(b.days)+10,Y(b.score)+4,'Terminal-Bench-Science 0.1 (26 days)',{fs:11,fill:'var(--c2)',w:600})}
    else{const rs=R[mode];const n=mode==='then'?Math.min(i+1,4):Math.min(i+1,3);g+=series(rs,n,mode==='then'?'var(--c1)':'var(--c2)',true)}
    box.innerHTML=RD.svg(W,H,g,'Frontier score against time since launch');
    const c=D[mode].cap[i];cap.innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
    if(both){cnt.innerHTML=RD.stat('MMLU to GPT-4','+42.5 pts','in 918 days')+RD.stat('TB-Science to day 26','+34.6 pts','in 26 days')+
      RD.stat('Points per 30 days',R.then[2].per30.toFixed(2)+' vs '+R.now[2].per30.toFixed(1),'derived')+RD.stat('Pace','about '+Math.round(pace)+'×','derived: '+R.now[2].per30.toFixed(1)+' / '+R.then[2].per30.toFixed(2));return}
    const rs=R[mode],r=rs[Math.min(i,rs.length-1)];
    cnt.innerHTML=RD.stat('Days since launch',r.days.toLocaleString('en-US'),r.date)+RD.stat('Frontier score',r.score.toFixed(1)+'%',r.model)+
      RD.stat('Headroom left',r.headroom.toFixed(1)+' pts','100 minus score')+RD.stat('Points per 30 days',r.per30==null?'·':r.per30.toFixed(2),'derived, since launch');
  }
  an=RD.anim({card:'rd-life-card',ctl:'rd-life-ctl',n:5,draw,ms:2600,label:'Stage'});
  RD.seg(document.getElementById('rd-life-mode'),m=>{mode=m;an.reset(5);an.play()});
  RD.onResize(()=>an.redraw());
  return {R,pace,setMode:m=>{mode=m;an.reset(5)},draw};
})();
