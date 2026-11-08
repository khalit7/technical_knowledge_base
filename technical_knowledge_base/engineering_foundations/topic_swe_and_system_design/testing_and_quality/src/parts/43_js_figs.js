// ---- Reading: static figures (behaviour matrix, Pact, two engines, LLM seams, ML objects, smoke, flaky causes,
// coverage against mutation score). The hero, the doubles, the property run and the CI job graph are 3D stages (45_ to 48_js_sc_*.js). Static figures have no
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
  return {curve,best};
})();
(function(){
  const S=window.TQS,TQ=window.TQ,C=TQ.calc,G=TQ.integ,F=TQ.flaky;
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
  // predict blocks
  document.querySelectorAll('#t-read .pr').forEach(p=>p.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!p.contains(b))return;
    p.querySelectorAll('.opts button').forEach(x=>x.classList.toggle('right',!!x.dataset.ok));if(!b.dataset.ok)b.classList.add('wrong');p.querySelector('.ans').hidden=false}));
})();
