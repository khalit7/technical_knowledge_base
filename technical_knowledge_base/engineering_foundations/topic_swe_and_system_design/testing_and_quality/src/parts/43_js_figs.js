// ---- Reading: static figures (hero, behaviour matrix, doubles, Pact, two engines, LLM seams, ML objects, smoke, flaky causes,
// coverage against mutation score, CI job graph) and the shrink plot under the property animation. Static figures have no
// controls; every number comes from window.TQ (generated from src/inputs/) or is quoted with its source in the caption.
window.TQF=(function(){
  const S=window.TQS,TQ=window.TQ,C=TQ.calc,M=TQ.mut,H=TQ.hyp;
  // coverage and mutation score as the tests are added one at a time (weak suite first); checked by recompute.py
  const order=M.tests.filter(t=>t.suite==='weak').concat(M.tests.filter(t=>t.suite==='strong')).map(t=>t.id);
  const curve=[{n:0,cov:TQ.covered([]).length,kill:0}].concat(order.map((_,i)=>{const s=order.slice(0,i+1);return {n:i+1,cov:TQ.covered(s).length,kill:TQ.killed(s).length}}));
  C.curveCov=curve.map(p=>p.cov).join(',');C.curveKill=curve.map(p=>p.kill).join(',');
  // smallest failing input so far in the recorded property run, ordered as the page's animation orders it (length, size, overlap)
  const key=e=>[e.n,e.s,e.o],less=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]<b[i]}return false};
  const best=[];let bi=-1;H.log.forEach((e,i)=>{if(e.f&&(bi<0||less(key(e),key(H.log[bi]))))bi=i;best.push(bi)});
  let last=['ex',null];
  function pbPlot(mode,i){const el=document.getElementById('pb-plot');if(!el)return;last=[mode,i];const w=S.W(el),log=H.log,n=log.length;
    const L=34,R=8,top=16,ph=96,bw=(w-L-R)/n,maxN=Math.max(...log.map(e=>e.n)),y=v=>top+ph-v/maxN*ph;let b='';
    [0,5,10].forEach(v=>{b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+S.T(L-6,y(v)+4,String(v),{a:'end',fs:11,fill:'var(--mute)'})});
    b+=S.T(L,10,'characters in the generated text',{fs:11,fill:'var(--mute)'});
    log.forEach((e,k)=>{const x=L+k*bw,h=Math.max(2,e.n/maxN*ph);b+='<rect x="'+(x+1)+'" y="'+(top+ph-h)+'" width="'+Math.max(1,bw-2)+'" height="'+h+'" fill="'+(e.f?'var(--bad)':'var(--dim)')+'"'+(mode==='pb'&&k>i?' opacity=".3"':'')+'/>'});
    let pts=[];best.forEach((bk,k)=>{if(bk>=0)pts.push((L+k*bw+bw/2)+','+y(log[bk].n))});
    b+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    const lastB=log[best[n-1]];b+=S.T(w-R,y(lastB.n)-6,'smallest: '+lastB.n+' char, size '+lastB.s,{a:'end',fs:11,fill:'var(--acc)',w:600});
    if(mode==='pb'&&i!=null){const x=L+i*bw+bw/2;b+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(top+ph)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'}
    [1,Math.round(n/2),n].forEach(k=>{b+=S.T(L+(k-1)*bw+bw/2,top+ph+14,String(k),{a:'middle',fs:11,fill:'var(--mute)'})});
    b+=S.T(L+(w-L-R)/2,top+ph+28,'call number',{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=S.svg(w,top+ph+32,b,'Text length of each Hypothesis call, and the smallest failure so far')}
  RD.onRender(()=>pbPlot(last[0],last[1]));RD.onResize(()=>pbPlot(last[0],last[1]));
  return {curve,best,pbPlot};
})();
(function(){
  const S=window.TQS,TQ=window.TQ,C=TQ.calc,G=TQ.integ,F=TQ.flaky;
  // hero: the layers as a pyramid, each with the bug it caught on this page
  S.mount('tq-hero',w=>{
    const rows=[
      {k:'Evals (model quality)',n:'Is the model good? A rate with a threshold, not yes or no: measured on Production eval engineering.',dash:1},
      {k:'End-to-end',n:'A few critical journeys after each deploy (send a message, get a streamed reply). Not built here.'},
      {k:'Integration',n:'Chat search green on SQLite, wrong on PostgreSQL: [2] instead of [1, 2]. '+G.pg_ms+' ms a test, '+C.pgRatio+'x SQLite.',hl:1},
      {k:'Contract and fakes',n:'Out-of-range model output: exactly one repair request, then a clean failure. 3 tests in 0.18 s, no API key.',hl:1},
      {k:'Unit and property',n:'The chunker drops short documents: 3 examples pass, the property fails within '+C.hypMaxTries+' generated inputs and shrinks to one character.',hl:1},
      {k:'Static checks',n:'Type errors, typos, a missing await: the whole repository in seconds.'}];
    const P=Math.min(250,Math.max(110,w*0.34)),nx=P+14,nw=w-nx,fs=11.5,lh=fs*1.32;let y=0,b='';
    const laid=rows.map(r=>{const ls=S.wrap(r.n,nw-4,fs);return {r,ls,h:Math.max(40,18+ls.length*lh+8)}});
    const tot=laid.reduce((a,c)=>a+c.h+4,0),wt=f=>P*(0.16+0.84*f);
    laid.forEach((c,i)=>{const y0=y,y1=y+c.h,f0=y0/tot,f1=y1/tot,a=wt(f0),bb=wt(f1),cx=P/2;
      b+='<path d="M'+(cx-a/2)+' '+y0+'L'+(cx+a/2)+' '+y0+'L'+(cx+bb/2)+' '+y1+'L'+(cx-bb/2)+' '+y1+'Z" fill="'+(c.r.hl?'var(--acc2)':'var(--soft)')+'" stroke="'+(c.r.hl?'var(--acc)':'var(--line)')+'"'+(c.r.dash?' stroke-dasharray="5 4"':'')+'/>';
      b+=S.T(nx,y0+15,c.r.k,{fs:12.5,w:600,fill:c.r.hl?'var(--acc)':'var(--ink)'});
      b+=S.lines(nx,y0+15+lh+2,c.ls,{fs});
      b+='<line x1="'+(cx+(a+bb)/4+4)+'" y1="'+(y0+c.h/2)+'" x2="'+(nx-4)+'" y2="'+(y0+c.h/2)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
      y=y1+4});
    const ny=y+6,ns=S.wrap('Testing the nets: 100% line and branch coverage killed only '+C.mutWeak+' of '+C.mutN+' planted bugs (section 10); a test with unseeded randomness failed '+C.flakyPct+'% of '+C.flakyRuns.toLocaleString('en-GB')+' runs (section 9).',w-20,fs);
    b+=S.box(.5,ny,w-1,ns.length*lh+14,{stroke:'var(--c5)'})+S.lines(10,ny+17,ns,{fs});
    return S.svg(w,ny+ns.length*lh+16,b,'Test layers as a pyramid with the bug each caught on this page')});

  // behaviour against implementation: two tests, two changes
  S.mount('tq-beh',w=>{const hw=Math.min(170,w*0.3),g=6,cw=(w-hw-2*g)/2,fs=11.5,lh=fs*1.32;let b='';
    const cols=['Correct refactor: min() rewritten as an if','Real bug: cap 8 changed to 9'];
    const rows=[['Brittle: spies on min()',[['FAILS','a false alarm: nothing broke','bad'],['PASSES','min() is still called: the bug ships','bad']]],
                ['Robust: checks the delays 0.5, 1, 2, 4, 8, 8',[['passes','same delays, same promise','good'],['FAILS','attempt 6 waits 9 s: bug caught','good']]]];
    const ch=cols.map(c=>S.wrap(c,cw-12,fs)),hh=Math.max(...ch.map(c=>c.length))*lh+12;
    ch.forEach((c,i)=>{b+=S.lines(hw+g+i*(cw+g)+6,14,c,{fs,w:600})});
    let y=hh;rows.forEach(([rl,cells])=>{const rlw=S.wrap(rl,hw-8,fs);const cl=cells.map(c=>S.wrap(c[1],cw-14,fs));
      const rh=Math.max(rlw.length*lh,16+Math.max(...cl.map(x=>x.length))*lh)+16;
      b+=S.lines(0,y+18,rlw,{fs,w:600});
      cells.forEach((c,i)=>{const x=hw+g+i*(cw+g),bad=c[2]==='bad';b+=S.box(x,y,cw,rh-6,{stroke:bad?'var(--bad)':'var(--good)',fill:'var(--soft)'});
        b+=S.T(x+8,y+18,c[0],{fs:12.5,w:600,fill:bad?'var(--bad)':'var(--good)'})+S.lines(x+8,y+18+lh+2,cl[i],{fs})});
      y+=rh});
    return S.svg(w,y,b,'Brittle and robust tests under a refactor and under a real bug')});

  // test doubles: what each proves
  S.mount('tq-dbl',w=>{const head=S.cards(w,[{t:'search_chats(conn, owner, text): our code',l:['the handler under test; the connection is passed in (the seam)']}],{minW:100});
    const it=S.cards(w,[
      {t:'Real PostgreSQL',hl:1,l:['Proves: the results are right on the engine you ship.','Costs: '+G.pg_ms+' ms a test plus '+C.pgWarmMin+' s startup.']},
      {t:'Fake: in-memory store',l:['Proves: results right against your model of the store.','Misses: where the fake and PostgreSQL disagree (LIKE and case). Keep it honest with a contract test.']},
      {t:'Mock of the connection',tone:'bad',l:['assert_called_once_with(sql)','Proves: the handler made the call you expected.','Misses: whether the results are right; passes with the case bug.']}],{minW:170,all:1});
    const gy=head.h+26;let b=head.body;
    const k=Math.floor((w+12)/(170+12));
    if(k>=3){[0,1,2].forEach(i=>{const cw=(w-24)/3,x=i*(cw+12)+cw/2;b+=S.arrow(w/2,head.h+2,x,gy-3)})}else b+=S.arrow(w/2,head.h+2,w/2,gy-3);
    return S.svg(w,gy+it.h,b+'<g transform="translate(0,'+gy+')">'+it.body+'</g>','Real, fake and mock behind the same seam')});

  // Pact: consumer-driven contracts
  S.mount('tq-pact',w=>{const r=S.cards(w,[
      {t:'1. Consumer tests (our chat API)',l:['run against a Pact mock server, recording each request and the response they rely on']},
      {t:'2. The pact file',hl:1,l:['those expectations, written by the consumer\'s tests']},
      {t:'3. Pact Broker or PactFlow',l:['shares pacts between the two teams']},
      {t:'4. Provider CI',l:['replays every request against the real provider; fails if any expectation breaks, before deploy']}],{arrows:1,minW:150});
    return S.svg(w,r.h,r.body,'Consumer-driven contract testing in four steps')});

  // two engines, one query
  S.mount('tq-int',w=>{const rows=[[1,'ada','Trip planning for Lisbon'],[2,'ada','trip budget spreadsheet'],[3,'bob','Trip ideas']];
    const eng=[{n:'SQLite in memory',m:[1,2],res:'returns [1, 2]: pass',ok:1,why:'LIKE ignores ASCII case'},{n:'PostgreSQL '+TQ.env.postgres,m:[2],res:'returns [2]: FAIL',ok:0,why:'LIKE is case-sensitive'}];
    const two=w>=560,g=14,pw=two?(w-g)/2:w,fs=11.5;let b='',y0=0;const rh=22;
    eng.forEach((e,i)=>{const x=two?i*(pw+g):0,y=two?0:i*(rh*3+70);
      b+=S.T(x,y+14,e.n,{fs:12.5,w:600})+S.T(x+pw,y+14,e.why,{a:'end',fs:11,fill:'var(--mute)'});
      b+=S.T(x,y+32,"WHERE owner = 'ada' AND title LIKE '%trip%'",{fs:11,mono:1,fill:'var(--mute)'});
      rows.forEach((r,k)=>{const yy=y+40+k*rh,hit=e.m.indexOf(r[0])>=0,want=r[1]==='ada';
        b+=S.box(x,yy,pw,rh-3,{rx:4,fill:hit?'var(--open2)':'var(--soft)',stroke:want&&!hit?'var(--bad)':hit?'var(--good)':'var(--line)',sw:want&&!hit?2:1});
        b+=S.T(x+6,yy+14,String(r[0]),{fs:11,mono:1})+S.T(x+22,yy+14,r[1],{fs:11,mono:1,fill:'var(--mute)'})+S.T(x+56,yy+14,r[2],{fs:11.5,fill:want&&!hit?'var(--bad)':'var(--ink)',w:want&&!hit?600:400})});
      b+=S.T(x,y+40+3*rh+14,e.res,{fs:12,w:600,fill:e.ok?'var(--good)':'var(--bad)'});y0=Math.max(y0,y+40+3*rh+24)});
    // cost per test, linear
    const by=y0+12,L=two?150:120,bw=w-L-70,mx=G.pg_ms;b+=S.T(0,by,'Cost per test (median of '+G.n+')',{fs:11.5,w:600});
    [['SQLite',G.sqlite_ms],['PostgreSQL',G.pg_ms]].forEach(([n,v],k)=>{const yy=by+10+k*22;b+=S.T(0,yy+13,n,{fs:11.5})+'<rect x="'+L+'" y="'+yy+'" width="'+Math.max(2,v/mx*bw)+'" height="15" rx="3" fill="'+(k?'var(--c1)':'var(--c3)')+'"/>'+S.T(L+Math.max(2,v/mx*bw)+6,yy+12,v+' ms',{fs:11.5})});
    b+=S.T(0,by+70,'plus PostgreSQL startup '+C.pgWarmMin+' to '+C.pgWarmMax+' s once per run',{fs:11,fill:'var(--mute)'});
    return S.svg(w,by+76,b,'The same search on SQLite and PostgreSQL, and the cost per test')});

  // code that calls an LLM: where the checks go
  S.mount('tq-llm',w=>{const r=S.cards(w,[
      {t:'build_messages()',l:['our code: prompt assembly','Test: snapshot of the exact message list']},
      {t:'HTTP client: the seam',hl:1,l:['passed in, never created inside','Test: fake server (MockTransport) or a recorded cassette']},
      {t:'Model provider',dash:1,l:['not our code; varies per call','Check: an eval, a rate with a threshold (another page)']},
      {t:'Ticket.model_validate_json()',l:['our code: parse, validate, one repair','Test: contract test on the schema and the repair count']},
      {t:'Caller and fallback',l:['our code','Test: a clean failure after one repair']}],{arrows:1,minW:150});
    return S.svg(w,r.h,r.body,'An LLM feature with a test on each piece of our code and an eval on the model')});

  // code, data, model
  S.mount('tq-ml3',w=>{const r=S.cards(w,[
      {t:'Code',hl:1,l:['transforms, feature code, training loop, serving','Behaves: deterministically, given fixed seeds','Test: pytest unit and property tests, types; exact or tolerance asserts; every push']},
      {t:'Data',l:['inputs, features, labels','Behaves: changes every day; can be checked against a schema and a distribution','Test: schema checks (pandera, Great Expectations) at pipeline boundaries; drift monitors in production']},
      {t:'Model',dash:1,l:['weights, prompts, the provider behind them','Behaves: statistically; right on most inputs, never all','Check: evals with thresholds and behavioural test sets (Production eval engineering)']}],{minW:200});
    return S.svg(w,r.h,r.body,'Three things to test in an ML system')});

  // smoke test: loss at the start and the end
  S.mount('tq-smoke',w=>{const Sm=TQ.smoke,L=118,R=60,bw=w-L-R,mx=0.75,x=v=>L+v/mx*bw,thr=0.1*Sm.ok[0];let b='';
    const rows=[['correct loop','start',Sm.ok[0],0],['','end',Sm.ok[1],1],['shuffled labels','start',Sm.bug[0],0],['','end',Sm.bug[1],2]];
    rows.forEach((r,k)=>{const y=8+k*24+(k>1?10:0);if(r[0])b+=S.T(0,y+12,r[0],{fs:11.5,w:600});b+=S.T(L-6,y+12,r[1],{a:'end',fs:11,fill:'var(--mute)'});
      b+='<rect x="'+L+'" y="'+y+'" width="'+(x(r[2])-L)+'" height="16" rx="3" fill="'+(r[3]===1?'var(--good)':r[3]===2?'var(--bad)':'var(--dim)')+'"/>'+S.T(x(r[2])+6,y+12,r[2].toFixed(4),{fs:11.5})});
    const yb=8+4*24+14;b+='<line x1="'+x(thr)+'" x2="'+x(thr)+'" y1="2" y2="'+yb+'" stroke="var(--acc)" stroke-dasharray="4 3"/>'+S.T(x(thr)+4,yb+12,'test threshold: 10% of the start = '+thr.toFixed(4),{fs:11,fill:'var(--acc)'});
    return S.svg(w,yb+18,b,'Smoke test losses at the start and end of training')});

  // flaky causes (Luo et al. 2014): counts of 161 classified fixes, percentages as published
  S.mount('tq-fcause',w=>{const D=[['Async wait',74,'45%'],['Concurrency',32,'20%'],['Test order dependency',19,'12%'],['Other categories (derived)',161-74-32-19,'']];
    const L=Math.min(180,w*0.42),R=70,bw=w-L-R;let b='';
    D.forEach((d,k)=>{const y=k*26,len=d[1]/74*bw;b+=S.T(0,y+13,d[0],{fs:11.5,w:k===0?600:400})+'<rect x="'+L+'" y="'+y+'" width="'+len+'" height="17" rx="3" fill="'+(k===0?'var(--acc)':k===3?'var(--dim)':'var(--c1)')+'"'+(k===0?'':' opacity=".55"')+'/>'+S.T(L+len+6,y+13,d[1]+(d[2]?' ('+d[2]+')':''),{fs:11.5})});
    return S.svg(w,4*26,b,'Root causes of 161 flaky-test fixes')});

  // coverage against mutation score as tests are added
  S.mount('tq-cvm',w=>{const cv=window.TQF.curve,M=TQ.mut,ns=M.stmts.length,nm=M.mutants.length,L=40,R=w<520?108:150,top=30,ph=170,n=cv.length-1;
    const x=i=>L+i/n*(w-L-R),y=p=>top+ph-p/100*ph;let b='';
    [0,50,100].forEach(p=>{b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y(p)+'" y2="'+y(p)+'" stroke="var(--line)"/>'+S.T(L-6,y(p)+4,p+'%',{a:'end',fs:11,fill:'var(--mute)'})});
    b+='<rect x="'+x(0)+'" y="'+top+'" width="'+(x(3)-x(0))+'" height="'+ph+'" fill="var(--soft)"/>'+S.T((x(0)+x(3))/2,top-8,'weak suite',{a:'middle',fs:11,fill:'var(--mute)'})+S.T((x(3)+x(n))/2,top-8,w<520?'improved suite':'improved suite, one test at a time',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let i=0;i<=n;i++)b+=S.T(x(i),top+ph+14,String(i),{a:'middle',fs:11,fill:'var(--mute)'});
    const pc=cv.map(p=>[p.n,100*p.cov/ns]),pk=cv.map(p=>[p.n,100*p.kill/nm]);
    const pl=(a,c)=>'<polyline points="'+a.map(q=>x(q[0])+','+y(q[1])).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2.2"/>'+a.map(q=>'<circle cx="'+x(q[0])+'" cy="'+y(q[1])+'" r="3" fill="'+c+'"/>').join('');
    b+=pl(pc,'var(--c3)')+pl(pk,'var(--acc)');
    const lc=cv[n],l3=cv[3];
    b+=S.T(w-R+8,y(100)+4,'line coverage',{fs:11.5,w:600,fill:'var(--c3)'})+S.T(w-R+8,y(100)+18,lc.cov+' of '+ns+(w<520?' lines':' statements'),{fs:11,fill:'var(--c3)'});
    b+=S.T(w-R+8,y(100)+40,'mutation score',{fs:11.5,w:600,fill:'var(--acc)'})+S.T(w-R+8,y(100)+54,lc.kill+' of '+nm+' mutants',{fs:11,fill:'var(--acc)'});
    b+=S.T(x(3)+6,y(100*l3.kill/nm)+16,l3.kill+' of '+nm+' at 100% coverage',{fs:11,fill:'var(--acc)',w:600});
    b+=S.T(L,top+ph+30,'test functions added',{fs:11,fill:'var(--mute)'});
    return S.svg(w,top+ph+34,b,'Coverage and mutation score as tests are added')});

  // CI job graph
  S.mount('tq-ci',w=>{const r=S.cards(w,[
      {t:'Laptop: pre-commit',l:['ruff, optionally the fast tests','before each commit']},
      {t:'static',hl:1,l:['ruff check, ruff format, mypy','seconds; every push']},
      {t:'unit',l:['Python 3.12 and 3.13 matrix; pytest -n auto -p randomly','minutes; every push']},
      {t:'integration',l:['postgres:17 as a service container','minutes; every push and pull request']},
      {t:'Review and merge',l:['a human reads the tests first','merge queue']},
      {t:'Nightly',dash:1,l:['gpu-t4 runner: smoke training, slow tests; evals','hours are fine']}],{arrows:1,minW:150,cols:3});
    return S.svg(w,r.h,r.body,'CI job graph from the cheapest checks to the nightly tier')});

  // predict blocks
  document.querySelectorAll('#t-read .pr').forEach(p=>p.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!p.contains(b))return;
    p.querySelectorAll('.opts button').forEach(x=>x.classList.toggle('right',!!x.dataset.ok));if(!b.dataset.ok)b.classList.add('wrong');p.querySelector('.ans').hidden=false}));
  window.TQF.pbPlot('ex',null);
})();
