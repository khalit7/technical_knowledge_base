// ---- Animation: one real WildBench response through RocketEval and through the CoT judge ----
(function(){
  const S=REL.samples[1],P=S.p3,K=S.ck.length,PROMPT=3402,GEN=232;
  const QT=S.ck.map(c=>Math.max(8,Math.round(c.length/4)));         // about 4 characters per token (estimate, labelled)
  const F5=REL.fig.pos['Qwen2-1.5B'];
  const soft=9*P.reduce((a,b)=>a+b,0)/P.length+1;
  const steps={
    re:[{t:'Once per query: GPT-4o writes the checklist',c:'GPT-4o reads the query (and a reference answer) and writes binary questions; here 7 for a poem request ("Write two new stanzas at the beginning of this poem"). This runs once per query and is reused for every model and every rerun, so its cost is shared by all N runs.'},
        {t:'The prompt is prefilled once and cached',c:'The query and the response, 3,402 tokens on an average WildBench item, are processed once; each question adds a few dozen tokens on top of the cached prefix (the short stubs, to scale).'},
        {t:'Seven independent questions',c:'Each item is its own call that sees the query, the response and one question, never the other answers, so an earlier answer has no path to steer a later one (the position bias of Figure 5). The judge emits one token per item, Yes or No.'},
        {t:'Read P(Yes) / (P(Yes) + P(No))',c:'The probabilities of the two tokens are read instead of the token itself (Eq. 1). A hard reading would turn 0.731 into a full Yes and 0.148 into a full No; the probability keeps how sure the judge was.'},
        {t:'Mean, rescaled to 1 to 10',c:'Score = 9 × mean + 1 = '+fmt(soft,1)+'. GPT-4o graded the same answer '+S.g+'. This 3B judge is harsher than GPT-4o on average (3.8 against 6.7 over 1,000 answers), which does not matter for ranking: every model is graded on the same scale, so only the order counts.'}],
    cot:[{t:'The prompt',c:"The benchmark's own judging prompt: the query and the response, 3,402 tokens on an average WildBench item, plus a 1 to 10 rubric."},
        {t:'Analysis, token by token',c:'The judge writes strengths and weaknesses, about 232 tokens (the mean of GPT-4o\'s released WildBench gradings). Every token conditions on all the earlier ones.'},
        {t:'Earlier judgments steer later ones',c:'Inside the analysis the judge makes a series of small judgments. Figure 5 measured how often the k-th flips when the earlier ones are forced the other way; for Qwen2-1.5B: 7% at the 2nd, 46% at the 4th, 73% at the 7th (the bars).'},
        {t:'One sampled score token',c:"The verdict is one sampled digit. For a small judge it is close to a coin flip on anything not obvious: Qwen2-1.5B's yes/no answers differ across three samples on 56% of checklist items (Figure 4)."},
        {t:'What is kept: one integer',c:"The probabilities behind the digit are thrown away. Small judges grading this way agree with MT-Bench's human votes 30% to 38% of the time (Qwen2-1.5B 30.4%, Gemma-2-2B 37.9%), near the 33.3% of a random pick (Table 2)."}]};
  function wr(x,y,t,mw,o){const n=Math.max(12,Math.floor(mw/((o&&o.fs||11)*0.56)));const L=[];let cur='';t.split(' ').forEach(wd=>{if((cur+' '+wd).trim().length>n){L.push(cur.trim());cur=wd}else cur+=' '+wd});if(cur.trim())L.push(cur.trim());return {s:L.map((l,i)=>tx(x,y+i*14,l,o)).join(''),h:L.length*14}}
  function draw(m,k,e,w){const pl=6,pr=6,W=w-pl-pr;let s='';const sc=(W-130)/(PROMPT+GEN);const op=i=>i===0||k>i?1:k===i?e:0;
    const trunc=(t,n)=>t.length>n?t.slice(0,Math.max(4,n-1))+'…':t;const nch=Math.floor((W-24)/6.3);
    if(m==='re'){
      let y=8;s+=G(op(0),rc(pl,y,Math.min(170,W*.45),24,'var(--closed2)',{s:'var(--closed)'})+tx(pl+8,y+16,'GPT-4o, once per query',{fs:12,w:600}));
      y+=32;S.ck.forEach((c,i)=>{s+=G(1,tx(pl+10,y+12+i*16,(i+1)+'. '+esc(trunc(c,nch-3)),{fs:11,c:'var(--ink)'}))});
      y+=K*16+14;
      const c1=wr(pl,y+32,'one row per item: cached prefix, then the question (to scale), then one answer token',W,{fs:11,c:'var(--mute)'});s+=G(op(1),rc(pl,y,PROMPT*sc,18,'var(--acc2)',{s:'var(--acc)'})+tx(pl+6,y+13,W<520?'query + response, 3,402 tokens, cached':'query + response: 3,402 tokens, prefilled once, cached',{fs:11})+c1.s);
      y+=28+c1.h;const x0=pl+PROMPT*sc;const pw=Math.min(120,W*.25),px=w-pr-pw;
      for(let i=0;i<K;i++){const yy=y+i*20;
        s+=G(op(1),ln2(pl,yy+7,x0,yy+7,'var(--acc)',{da:'2 3',op:.6})+rc(x0,yy+1,Math.max(2,QT[i]*sc),12,'var(--c5)',{r:1})+tx(x0-4,yy+11,'Q'+(i+1),{fs:11,a:'end',c:'var(--mute)'}));
        const ax=x0+Math.max(2,QT[i]*sc)+3;
        s+=G(op(2),rc(ax,yy,22,14,'var(--soft)',{s:'var(--line)'})+tx(ax+11,yy+11,P[i]>0.5?'Yes':'No',{fs:11,a:'middle',c:P[i]>0.5?'var(--good)':'var(--bad)'}));
        const f=k>3?1:k===3?e:0;s+=G(op(3),rc(px,yy+1,pw,12,'var(--soft)',{s:'var(--line)',r:2})+rc(px,yy+1,pw*P[i]*f,12,'var(--c1)',{r:2})+tx(px-4,yy+11,fmt(P[i]*f,2),{fs:11,a:'end'}))}
      y+=K*20+10;
      s+=G(op(4),tx(pl,y+14,'mean '+fmt((soft-1)/9,3)+' → 9 × mean + 1 =',{fs:12})+tx(pl+215,y+14,fmt(soft,1)+' / 10',{fs:14,w:600,c:'var(--c1)'})+tx(pl,y+32,"GPT-4o's grade of the same answer: "+S.g+' / 10',{fs:12,c:'var(--mute)'}));
      return svgW(w,y+42,s,'RocketEval grading, step '+(k+1))}
    // CoT
    let y=8;s+=G(op(0),rc(pl,y,PROMPT*sc,18,'var(--acc2)',{s:'var(--acc)'})+tx(pl+6,y+13,W<520?'prompt: 3,402 tokens':'query + response + rubric: 3,402 tokens',{fs:11}));
    const gx=pl+PROMPT*sc,gw=GEN*sc*(k>1?1:k===1?e:0);s+=G(op(1),rc(gx,y,Math.max(1,gw),18,'var(--c2)',{r:1}));
    const c2=wr(pl,y+34,'orange, right end: the generated analysis, 232 tokens, to scale',W,{fs:11,c:'var(--mute)'});s+=G(op(1),c2.s);
    y+=40+c2.h;const zw=W-20,seg=zw/7;
    const c3=wr(pl,y-4,'zoom on the analysis: seven judgments in a row, each reading all the earlier ones',W,{fs:11,c:'var(--mute)'});s+=G(op(1),c3.s);y+=c3.h-14;
    for(let i=0;i<7;i++){const x=pl+i*seg,show=k>1?1:k===1?cl01(e*7-i):0;
      s+=G(op(1)*show,rc(x+2,y+4,seg-10,22,'var(--soft)',{s:'var(--c2)'})+tx(x+seg/2-3,y+19,'J'+(i+1),{fs:11,a:'middle'}));
      if(i<6)s+=G(op(1)*show,'<path d="M'+(x+seg-8).toFixed(1)+','+(y+15)+' l6,0" stroke="var(--c2)" stroke-width="1.4" marker-end="url(#anxA)"/>');
      const fv=F5[i],bh=60*fv*(k>2?1:k===2?e:0);s+=G(op(2),rc(x+2,y+92-bh,seg-10,bh,'var(--bad)',{r:1,op:.8})+tx(x+seg/2-3,y+104,fmt(fv*100,0)+'%',{fs:11,a:'middle',c:'var(--mute)'}))}
    const c4=wr(pl,y+122,'bars: how often each judgment flips with the earlier ones (Figure 5, Qwen2-1.5B)',W,{fs:11,c:'var(--mute)'});s+=G(op(2),c4.s);
    y+=122+c4.h;const dig=['8','6','7'];
    const c5=wr(pl,y+14,'score token, three samples of a small judge (illustrative digits):',W,{fs:11,c:'var(--mute)'});s+=G(op(3),c5.s);y+=c5.h-14;
    dig.forEach((d,i)=>{s+=G(op(3)*(k>3?1:k===3?cl01(e*3-i):0),rc(pl+i*36,y+22,28,26,'var(--soft)',{s:'var(--c2)'})+tx(pl+i*36+14,y+40,d,{fs:14,a:'middle',w:600}))});
    y+=58;const c6=wr(pl,y+14,'kept: one integer; the probabilities behind it are discarded',W,{fs:12}),c7=wr(pl,y+18+c6.h,'small judges this way: 30% to 38% agreement with humans (random 33.3%)',W,{fs:12,c:'var(--mute)'});s+=G(op(4),c6.s+c7.s);y+=c6.h+c7.h;
    return svgW(w,y+30,'<defs><marker id="anxA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--c2)"/></marker></defs>'+s,'CoT judging, step '+(k+1))}
  function counters(m,k){if(m==='re')return stat('Frontier-model calls','1 per query','shared by every model and rerun')+stat('Judge tokens generated',k>=2?String(K):'0','one per item')+stat('Prompt tokens read',k>=1?'3,402 + '+fmt(QT.reduce((a,b)=>a+b,0))+' (est.)':'0','prefix once, then the questions')+stat('Answers that see other answers','0','no position channel')+stat('Numbers kept',k>=3?K+' probabilities':'none yet','')+stat('Score',k>=4?fmt(soft,1):'-','GPT-4o: '+S.g);
    return stat('Frontier-model calls','1 per response','if GPT-4o is the judge')+stat('Judge tokens generated',k>=1?'about 232':'0','analysis, then the score')+stat('Prompt tokens read','3,402','')+stat('Each judgment reads',k>=2?'all earlier ones':'-','the position channel')+stat('Numbers kept',k>=4?'1 integer':'-','')+stat('Agreement with humans',k>=4?'30% to 38%':'-','small judges, Table 2')}
  makeAnim({id:'anx',modes:steps,mode:'re',draw,counters,dur:3200});
})();
