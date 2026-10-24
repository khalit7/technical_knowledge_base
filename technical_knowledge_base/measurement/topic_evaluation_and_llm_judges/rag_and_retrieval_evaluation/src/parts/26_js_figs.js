// ---- Reading: static figures drawn at the measured width (hero, triage, citations, agreement with people) ----
(function(){
  const esc=RD.esc;
  const pill=(x,y,w,h,txt,stroke,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(fill||'var(--soft)')+'" stroke="'+(stroke||'var(--line)')+'" stroke-width="1.5"/>'+
    '<text x="'+(x+w/2)+'" y="'+(y+h/2+4)+'" text-anchor="middle" font-weight="600">'+txt+'</text>';

  // 1. Hero: the five objects and the metric that compares each pair
  const N=['Question','Labels (qrels)','Passages (top k)','Answer','Reference'];
  const ARC=[ // a, b, side (-1 above: grades the passages; +1 below: grades the answer), metric, needs (wide), needs (narrow)
    [1,2,-1,'recall@k, nDCG@10, MRR','passage labels','needs passage labels'],
    [0,2,-1,'context relevance','judge, no labels','a judge, no labels'],
    [2,4,-1,'context precision, context recall','judge plus reference','a judge plus a reference answer'],
    [2,3,1,'faithfulness, citations','judge or NLI','a judge or NLI; never sees the truth'],
    [0,3,1,'answer relevance','judge','a judge; says nothing about truth'],
    [3,4,1,'correctness, nugget recall','reference','end to end; never sees the passages']];
  RD.fig('rd-hero-svg',(el,W)=>{
    const C=s=>s<0?'var(--c1)':'var(--c4)';
    if(W>=720){
      const mx=64,step=(W-2*mx)/4,y0=178,bw=Math.min(118,step-16),bh=34,H=384;let b='',lab='';
      b+=RD.lines(8,16,['Retrieval half: grades the passages'],{fill:'var(--c1)',w:600});
      b+=RD.lines(8,H-6,['Generation half: grades the answer'],{fill:'var(--c4)',w:600});
      ARC.forEach(a=>{const xa=mx+a[0]*step,xb=mx+a[1]*step,sd=a[2],sp=a[1]-a[0],h=30+45*sp,y1=y0+sd*bh/2,yc=y1+sd*h;
        const hot=a[0]===2&&a[1]===3;
        b+='<path d="M'+xa+','+y1+' C'+xa+','+yc+' '+xb+','+yc+' '+xb+','+y1+'" fill="none" stroke="'+C(sd)+'" stroke-width="'+(hot?3:1.8)+'"/>';
        const ya=y1+sd*0.75*h,xm=(xa+xb)/2;
        lab+='<rect x="'+(xm-84)+'" y="'+(sd<0?ya-36:ya+3)+'" width="168" height="33" rx="4" fill="var(--bg)"/>';
        lab+=RD.lines(xm,sd<0?ya-22:ya+16,[esc(a[3])],{a:'middle',fill:C(sd),w:600})+RD.lines(xm,sd<0?ya-8:ya+31,[esc(a[4])],{a:'middle',cls:'m'})});
      b+=lab;
      N.forEach((n,i)=>{b+=pill(mx+i*step-bw/2,y0-bh/2,bw,bh,esc(n),i===2||i===3?'var(--ink)':'var(--line)')});
      el.innerHTML=RD.svg(W,H,b,'Five objects (question, passage labels, retrieved passages, answer, reference answer) and the RAG metric that compares each pair');
    }else{
      const rh=72,H=24+ARC.length*rh+20,pw=Math.min(132,(W-40)/2);let b='',y=16;
      ARC.forEach((a,i)=>{if(i===0)b+=RD.lines(0,y,['Retrieval half: grades the passages'],{fill:'var(--c1)',w:600});
        if(i===3){y+=14;b+=RD.lines(0,y,['Generation half: grades the answer'],{fill:'var(--c4)',w:600})}
        const yy=y+8,hot=a[0]===2&&a[1]===3;
        b+=pill(0,yy,pw,26,esc(N[a[0]]),'var(--line)')+pill(W-pw,yy,pw,26,esc(N[a[1]]),'var(--line)');
        b+='<line x1="'+pw+'" y1="'+(yy+13)+'" x2="'+(W-pw)+'" y2="'+(yy+13)+'" stroke="'+C(a[2])+'" stroke-width="'+(hot?3:1.8)+'"/>';
        b+=RD.lines(0,yy+42,[esc(a[3])],{fill:C(a[2]),w:600})+RD.lines(0,yy+57,[esc(a[5])],{cls:'m'});
        y+=rh});
      el.innerHTML=RD.svg(W,y+10,b,'Each RAG metric as a comparison between two objects');
    }
  });

  // 2. Triage of a wrong answer
  const TRI=[[['Is the answer anywhere','in the corpus?'],['corpus gap:','not a retriever bug']],
    [['Is the passage in the','first stage\'s top K','(the reranker\'s depth)?'],['retrieval miss:','chunking, hybrid,','query rewriting']],
    [['Is it in the top k','that reaches the prompt?'],['ranking miss:','reranker or k']],
    [['Is the answer correct,','faithful and complete,','or a due refusal?'],['generation miss','(or abstention):','prompt, model']],
    [['Is the source itself','current and true?'],['corpus miss:','stale or wrong','source']]];
  RD.fig('rd-tri-svg',(el,W)=>{
    const lw=Math.min(300,Math.round(W*0.54)),gap=Math.max(34,Math.min(70,W-lw-150)),rw=W-lw-gap,rh=50,st=78;let b='',y=4;
    b+=pill(0,y,lw,26,'A wrong answer','var(--bad)');y+=26;
    TRI.forEach((t,i)=>{b+='<line x1="'+(lw/2)+'" y1="'+y+'" x2="'+(lw/2)+'" y2="'+(y+st-rh)+'" stroke="var(--mute)"/>';
      if(i)b+=RD.lines(lw/2+6,y+18,['yes'],{cls:'m'});y+=st-rh;
      b+='<rect x="0" y="'+y+'" width="'+lw+'" height="'+rh+'" rx="7" fill="var(--soft)" stroke="var(--line)"/>'+RD.lines(10,y+(t[0].length===3?15:20),t[0].map(esc),{lh:15});
      b+='<line x1="'+lw+'" y1="'+(y+rh/2)+'" x2="'+(lw+gap-4)+'" y2="'+(y+rh/2)+'" stroke="var(--bad)" stroke-width="1.5"/>'+RD.lines(lw+gap/2,y+rh/2-5,['no'],{a:'middle',fill:'var(--bad)',w:600});
      b+=RD.lines(lw+gap,y+(t[1].length===3?14:20),t[1].map(esc),{lh:15,fill:'var(--bad)'});
      y+=rh});
    b+='<line x1="'+(lw/2)+'" y1="'+y+'" x2="'+(lw/2)+'" y2="'+(y+22)+'" stroke="var(--mute)"/>'+RD.lines(lw/2+6,y+16,['yes'],{cls:'m'});y+=22;
    b+=pill(0,y,lw,26,'All yes: the answer passes','var(--good)');
    el.innerHTML=RD.svg(W,y+30,b,'Triage of a wrong RAG answer in five yes or no questions');
  });

  // 3. Citation accuracy (ALCE rules), illustrative
  RD.fig('ci-svg',(el,W)=>{
    const sw=Math.min(210,Math.round(W*0.42)),pw=Math.min(120,Math.round(W*0.26)),xp=W-pw,H=200;let b='';
    const S=[['S1 cites [1]',35],['S2 cites [1], [3]',100],['S3 cites nothing',165]],P=[['[1]',35],['[2]',100],['[3]',165]];
    S.forEach(s=>{b+='<rect x="0" y="'+(s[1]-17)+'" width="'+sw+'" height="34" rx="7" fill="var(--soft)" stroke="var(--line)"/>'+RD.lines(10,s[1]+4,[s[0]],{w:600})});
    P.forEach(p=>{b+='<rect x="'+xp+'" y="'+(p[1]-17)+'" width="'+pw+'" height="34" rx="7" fill="var(--bg)" stroke="var(--line)"/>'+RD.lines(xp+pw/2,p[1]+4,['passage '+p[0]],{a:'middle'})});
    const L=(y1,y2,ok,lab)=>'<path d="M'+sw+','+y1+' C'+(sw+40)+','+y1+' '+(xp-40)+','+y2+' '+xp+','+y2+'" fill="none" stroke="'+(ok?'var(--good)':'var(--bad)')+'" stroke-width="2"'+(ok?'':' stroke-dasharray="5 4"')+'/>';
    b+=L(35,35,1)+L(100,35,1)+L(100,165,0);
    const mx=(sw+xp)/2;
    b+=RD.lines(mx,28,['entails: precise'],{a:'middle',fill:'var(--good)'})+RD.lines(mx,124,['irrelevant: imprecise'],{a:'middle',fill:'var(--bad)'})+RD.lines(sw+8,188,['uncited: recall 0'],{cls:'m'});
    el.innerHTML=RD.svg(W,H,b,'Three statements and their citations: two entailed, one irrelevant citation, one uncited statement');
  });

  // 4. Agreement with people: RAGChecker correlations and TREC nugget tau (published)
  const RC=[['RAGChecker, overall',61.93],['RAGAS answer similarity',48.31],['TruLens answer relevance',35.15],['ARES answer relevance',17.81]];
  const TAU=[['Ranking runs, post-edited nuggets',0.887,''],['Ranking runs, manual nuggets',0.727,''],['Single topics (about)',0.5,'about']];
  RD.fig('ag-svg',(el,W)=>{
    const two=W>=700,pw=two?Math.round(W*0.55):W,qw=two?W-pw-30:W,row=40;let b='';
    const panel=(x0,y0,w,rows,max,ceil,ttl,fmt)=>{let s=RD.lines(x0,y0,[ttl],{w:600});const bw=w-60;
      rows.forEach((r,i)=>{const y=y0+18+i*row;s+=RD.lines(x0,y+10,[esc(r[0])],{cls:'m'});
        s+='<rect x="'+x0+'" y="'+(y+15)+'" width="'+(bw*r[1]/max).toFixed(1)+'" height="14" rx="2" fill="var(--acc)"'+(r[2]?' opacity=".45"':'')+'/>'+RD.lines(x0+bw*r[1]/max+6,y+27,[fmt(r[1])],{w:600})});
      const yb=y0+18+rows.length*row;
      if(ceil){const xc=x0+bw*ceil/max;s+='<line x1="'+xc+'" y1="'+(y0+20)+'" x2="'+xc+'" y2="'+yb+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.lines(Math.min(xc,x0+bw-4),yb+14,['humans with each other: 70.09'],{a:'end',cls:'m'})}
      return s;};
    b+=panel(0,14,pw,RC,100,70.09,'Pearson r with 280 human judgments (x100)',v=>v.toFixed(2));
    const yq=two?14:14+18+RC.length*row+40;
    b+=panel(two?pw+30:0,yq,qw,TAU,1,0,'Kendall’s τ, automatic against human nuggets',v=>v.toFixed(3).replace(/0+$/,'').replace(/\.$/,''));
    const H=two?14+18+RC.length*row+24:yq+18+TAU.length*row+10;
    el.innerHTML=RD.svg(W,H,b,'Correlation of RAG metrics with human judgments, and nugget-evaluation agreement for systems and single topics');
  });
})();
