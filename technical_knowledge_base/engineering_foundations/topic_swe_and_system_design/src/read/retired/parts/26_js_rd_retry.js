// ---- Reading, Step 4: retry storm (no backoff against backoff with full jitter) and the double charge (no key against idempotency key) ----
// Storm model is illustrative; src/read/recompute.py a4 runs the same simulation.
window.RDSIM=window.RDSIM||{};
RDSIM.A4={NEW:12,CAP:20,DOWN:[3,5],T:22,MAXTRY:5,WASTE:0.3,FLOOR:0.4};
// exact modulo 2^31 (a plain multiply would lose precision past 2^53); matches recompute.py's lcg
RDSIM.lcg=function(seed){let s=seed;return ()=>{s=(Math.imul(s,1103515245)+12345)&0x7fffffff;return s/2147483648}};
RDSIM.a4=function(jitter){const C=RDSIM.A4,rnd=RDSIM.lcg(42),due={},rows=[];let gave=0,att=0,ok=0;
  for(let t=0;t<C.T;t++){const reqs=new Array(C.NEW).fill(1).concat(due[t]||[]);delete due[t];
    const L=reqs.length;att+=L;let good;
    if(t>=C.DOWN[0]&&t<=C.DOWN[1])good=0;else if(L<=C.CAP)good=L;else good=Math.max(Math.floor(C.CAP*C.FLOOR),C.CAP-Math.ceil(C.WASTE*(L-C.CAP)));
    reqs.sort((a,b)=>b-a);const failed=reqs.slice(good);ok+=good;
    failed.forEach(k=>{if(k>=C.MAXTRY){gave++;return}const d=jitter?1+Math.floor(rnd()*Math.pow(2,k)):1;(due[t+d]=due[t+d]||[]).push(k+1)});
    rows.push({load:L,good,retries:L-C.NEW,cap:(t>=C.DOWN[0]&&t<=C.DOWN[1])?0:C.CAP,att,ok,gave});
  }
  let lastOver=-1;rows.forEach((r,t)=>{if(r.load>C.CAP)lastOver=t});
  return {rows,attempts:att,ok,gave_up:gave,peak:Math.max(...rows.map(r=>r.load)),last_over:lastOver}};
(function(){
  const svg=document.getElementById('rd-rt-svg');if(!svg)return;
  const cap=document.getElementById('rd-rt-cap'),cnt=document.getElementById('rd-rt-cnt'),leg=document.getElementById('rd-rt-leg'),note=document.getElementById('rd-rt-note');
  let scn='storm',mode='before';const S={before:RDSIM.a4(false),after:RDSIM.a4(true)};
  const L=(c,t)=>'<span style="--sw:var('+c+')">'+t+'</span>';
  function drawStorm(i){
    const s=S[mode],C=RDSIM.A4;const W=Math.max(280,Math.min(820,RD.width(svg)));
    const H=190,x0=26,bw=(W-x0-4)/C.T,maxv=64,Y=v=>12+(H-40)*(1-v/maxv);let b='';
    b+='<rect x="'+(x0+C.DOWN[0]*bw)+'" y="6" width="'+(bw*(C.DOWN[1]-C.DOWN[0]+1))+'" height="'+(H-34)+'" fill="var(--bad)" opacity=".12"/>'+RD.t(x0+C.DOWN[0]*bw+2,18,'outage',{fs:10,fill:'var(--bad)'});
    s.rows.forEach((r,t)=>{const on=t<i,x=x0+t*bw+1,w=Math.max(2,bw-2);
      b+='<rect x="'+x+'" y="'+Y(C.NEW)+'" width="'+w+'" height="'+(Y(0)-Y(C.NEW))+'" fill="var(--c1)" opacity="'+(on?1:.12)+'"/>';
      if(r.retries>0)b+='<rect x="'+x+'" y="'+Y(r.load)+'" width="'+w+'" height="'+(Y(C.NEW)-Y(r.load))+'" fill="var(--c4)" opacity="'+(on?1:.12)+'"/>';
      if(on)b+='<line x1="'+x+'" x2="'+(x+w)+'" y1="'+Y(r.good)+'" y2="'+Y(r.good)+'" stroke="var(--good)" stroke-width="2.5"/>';
      if(t%2===0||bw>18)b+=RD.t(x+w/2,H-14,String(t+1),{fs:9.5,a:'middle',fill:t===i-1?'var(--ink)':'var(--mute)'});
    });
    b+='<line x1="'+x0+'" x2="'+W+'" y1="'+Y(C.CAP)+'" y2="'+Y(C.CAP)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.t(0,Y(C.CAP)+4,'20',{fs:10})+RD.t(0,Y(0)+4,'0',{fs:10})+RD.t(0,Y(60)+4,'60',{fs:10});
    b+=RD.t((W+x0)/2,H-2,'second',{fs:10,a:'middle',fill:'var(--mute)'});
    svg.innerHTML=RD.svg(W,H,b,'Requests per second to a dependency: new requests and retries against its capacity, with useful answers marked');
    leg.innerHTML=L('--c1','new requests')+L('--c4','retries')+L('--good','useful answers')+'<span style="--sw:var(--ink)">capacity (20 per second)</span>';
    const r=i>0?s.rows[i-1]:null;
    cnt.innerHTML=RD.stat('Second',i+' of '+C.T,'')+RD.stat('Arriving this second',r?r.load:0,r?r.retries+' of them retries':'')+RD.stat('Useful answers',r?r.good:0,'this second')+RD.stat('Requests abandoned',r?r.gave:0,'after 5 tries');
    let t,p;
    if(i===0){t=mode==='before'?'Retry at once, no backoff, no jitter':'Exponential backoff with full jitter';p='12 new requests a second reach a dependency that handles 20. In seconds 4 to 6 it goes down. Every failed request is retried, up to 5 tries in all. '+(mode==='before'?'Here each failure is retried one second later, all together.':'Here try k waits a random 1 to 2<sup>k</sup> seconds, so the wait grows and the retries spread out.')}
    else{const k=i-1;t='Second '+i+': '+r.load+' arriving, '+r.good+' useful';
      if(k>=C.DOWN[0]&&k<=C.DOWN[1])p='The dependency is down: everything fails and is scheduled for retry.';
      else if(k<C.DOWN[0])p='Normal: 12 a second against a capacity of 20.';
      else if(r.load>C.CAP)p=mode==='before'?'The dependency is back, but new requests plus retries ('+r.load+') exceed its capacity. Overloaded, it wastes effort on requests whose clients already timed out, so only '+r.good+' useful answers come out, and every failure comes back next second.':'Retries spread over several seconds: '+r.retries+' arrive now. None was removed, they were moved in time into the spare capacity (20 minus 12 new a second), so the dependency stays close to its capacity and clears the backlog.';
      else p=mode==='before'?'Below capacity.':'Recovered: only new requests remain.';
      if(i===C.T)p=mode==='before'?'The outage lasted 3 seconds; the overload is still going at second '+C.T+', sustained only by retries ('+s.attempts+' attempts so far for '+(C.T*C.NEW)+' real requests, '+s.gave_up+' abandoned). This is a metastable failure: removing the trigger did not end it.':'Recovered by second '+(s.last_over+2)+'. All '+(C.T*C.NEW)+' requests eventually succeeded with '+s.attempts+' attempts and none abandoned; peak load '+s.peak+' against '+S.before.peak+' without backoff and jitter. Jitter worked here only because the dependency had spare capacity to absorb the moved retries; with none, every retry still lands and the overload stays (measured on Reliability engineering).'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    note.innerHTML='<span class="ill">Illustrative model</span>: when overloaded, each request above capacity costs 0.3 of a request\'s worth of useful work (wasted on callers that have already timed out, the effect Yanacek describes), with a floor of 8 useful answers a second. The numbers are made up; the shape (a short outage turning into a lasting overload without backoff and jitter) is the one Brooker and Bronson et al. describe. Jitter spreads retries, it does not remove them: in an open system with no spare capacity, {{Reliability engineering|n:3ef5c17b0d0d8152b8dececf34196174}} measured backoff with jitter at 25% success, the same as immediate retries, against 72% with a retry budget and 87% with a bounded queue. Checked in <code>src/read/recompute.py</code>.';
  }
  // the double charge, step by step
  const CH=[
    ['The user taps "Buy 1,000 credits for $20"','The app is about to send POST /purchases.','The app first invents a unique idempotency key for this one purchase, say 7f3a, and will send it with every attempt.'],
    ['Request 1 reaches the server','POST /purchases, amount $20.','POST /purchases, amount $20, Idempotency-Key: 7f3a.'],
    ['The server charges the card','$20 charged, 1,000 credits added.','$20 charged, 1,000 credits added, and the result is stored under key 7f3a in the same database transaction.'],
    ['The response is lost','The phone enters a tunnel; after its timeout the app has no answer. Charged or not? It cannot tell.','Same loss, same uncertainty on the phone.'],
    ['The app retries','Request 2: an identical POST /purchases, $20.','Request 2: the same body with the same key 7f3a.'],
    ['The server handles request 2','It looks like a new purchase: the card is charged again.','Key 7f3a is already stored: the server returns the stored result and charges nothing.'],
    ['Outcome','The user paid $40 for one purchase and will call support.','The user paid $20 once and sees one purchase. Retrying was safe.']];
  function drawCharge(i){
    const W=Math.max(280,Math.min(820,RD.width(svg)));const lanes=['Phone app','API server','Payments and database'];
    const lx=[W*0.12,W*0.5,W*0.86],H=40+6*30+10;let b='';
    lanes.forEach((l,k)=>{b+=RD.t(lx[k],14,l,{fs:W<400?10:11,a:'middle',w:600})+'<line x1="'+lx[k]+'" x2="'+lx[k]+'" y1="22" y2="'+(H-4)+'" stroke="var(--line)" stroke-width="2"/>'});
    const after=mode==='after';
    const arrows=[[1,0,1,'POST /purchases'+(after?' key 7f3a':''),'--c1'],[2,1,2,'charge $20','--c2'],[3,1,0,'response lost','--bad',1],[4,0,1,'retry'+(after?' key 7f3a':''),'--c4'],[5,1,2,after?'key found: no charge':'charge $20 again',after?'--good':'--bad']];
    arrows.forEach(a=>{if(a[0]>i)return;const y=40+a[0]*30,x1=lx[a[1]],x2=lx[a[2]],dir=x2>x1?1:-1;
      b+='<line x1="'+x1+'" x2="'+(x2-dir*6)+'" y1="'+y+'" y2="'+y+'" stroke="var('+a[4]+')" stroke-width="2"'+(a[5]?' stroke-dasharray="5 4"':'')+'/>';
      b+='<path d="M'+(x2-dir*8)+','+(y-4)+'L'+x2+','+y+'L'+(x2-dir*8)+','+(y+4)+'z" fill="var('+a[4]+')"/>';
      if(a[5])b+=RD.t((x1+x2)/2,y+4,'✕',{fs:14,a:'middle',fill:'var(--bad)'});
      b+=RD.t((x1+x2)/2,y-5,a[3],{fs:W<400?9.5:10.5,a:'middle'})});
    if(i>=2&&after)b+='<rect x="'+(lx[2]-W*0.12)+'" y="'+(40+2*30+8)+'" width="'+(W*0.24)+'" height="18" rx="4" fill="var(--soft)" stroke="var(--good)"/>'+RD.t(lx[2],40+2*30+21,'7f3a → result',{fs:10,a:'middle'});
    svg.innerHTML=RD.svg(W,H,b,'Sequence of a purchase whose response is lost and is retried, with and without an idempotency key');
    leg.innerHTML=after?L('--good','duplicate recognised by its key'):L('--bad','duplicate charge');
    const charged=(i>=2?20:0)+(!after&&i>=5?20:0);
    cnt.innerHTML=RD.stat('Requests sent',i>=4?2:i>=1?1:0,'')+RD.stat('Card charged','$'+charged,'')+RD.stat('Purchases the user made',1,'');
    cap.innerHTML='<div class="t">'+(i+1)+'. '+CH[i][0]+'</div><p>'+CH[i][after?2:1]+'</p>';
    note.innerHTML='A scenario, not a measurement: the pattern is Stripe\'s (Leach, 2017) and Amazon\'s client request tokens (Featonby).';
  }
  function draw(i){scn==='storm'?drawStorm(i):drawCharge(i)}
  const n=()=>scn==='storm'?RDSIM.A4.T+1:CH.length;
  const an=RD.anim({card:'rd-rt-card',ctl:'rd-rt-ctl',n:n(),ms:900,draw,label:'Step'});
  RD.seg(document.getElementById('rd-rt-scn'),m=>{scn=m;an.reset(n());an.play()});
  RD.seg(document.getElementById('rd-rt-seg'),m=>{mode=m;an.reset(n());an.play()});
  RD.onResize(()=>an.redraw());
})();
