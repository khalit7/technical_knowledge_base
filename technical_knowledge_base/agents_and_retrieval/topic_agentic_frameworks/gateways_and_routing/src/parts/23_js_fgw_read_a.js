// ---- Reading tab, part 1: the request pipeline animation, routing bars (E1), failure strips (E2), retry layers (E3) ----
(function(){
  const F=window.FGW,E=RD.esc;
  // values written into prose spans
  const vals={or_models:F.or_count.models,or_authors:F.or_count.authors,or_free:F.or_count.free};
  document.querySelectorAll('.fgw-v').forEach(s=>{if(s.dataset.v in vals)s.textContent=vals[s.dataset.v]});

  // 1. one request through the gateway, three scenarios
  const ST=[['Auth','virtual key looked up'],['Budget','worst-case cost reserved'],['Rate limit','window counter checked'],['Route','deployment picked'],['Cache','exact key looked up'],['Call','sent with a timeout'],['Retry or cool down','on a failed call'],['Fallback','another group'],['Settle and log','real cost replaces the reservation']];
  const SC={
    miss:[[0,'on','Auth','The proxy hashes the caller\'s key and finds its row (cached in memory after the first lookup): models allowed, budget, limits.'],
      [1,'on','Budget','It estimates the most this call could cost (input tokens plus max_tokens, or 16,384 output tokens if none) and reserves that against every budget the key sits under (section 6).'],
      [2,'on','Rate limit','It adds 1 to the key\'s request counter for the current 60-second window and refuses with 429 if that passes rpm_limit (section 5).'],
      [3,'on','Route','The router picks one deployment of the group with the routing strategy, skipping any that are cooling down (section 2).'],
      [4,'on','Cache','Inside the call to that deployment, LiteLLM hashes the request (model group, messages, temperature ...) and looks it up: no stored answer.'],
      [5,'on','Call','It translates the request into the deployment\'s format (section 8) and sends it with that deployment\'s timeout. Recorded: the local model answered in 1.1 to 3.6 s.'],
      [8,'on','Settle and log','The real cost replaces the reservation, the answer is stored in the cache, and a spend log row is written (in batches).']],
    hit:[[0,'on','Auth','Same key, same lookup.'],[1,'on','Budget','A reservation is still made: the gateway does not know yet that the answer is cached.'],[2,'on','Rate limit','The request still counts against the key\'s limit.'],
      [3,'on','Route','A deployment is picked as usual.'],[4,'on','Cache','The hash (keyed on the model group, so any deployment would match) finds a stored answer. Recorded: 0.083 s instead of seconds, no provider call, no tokens.'],[5,'skip','Call','Skipped.'],[8,'on','Settle and log','Logged as a cache hit with cost 0; the stored answer is returned word for word, even one sampled at temperature 0.9 (section 7).']],
    fail:[[0,'on','Auth','Key found.'],[1,'on','Budget','Reserved.'],[2,'on','Rate limit','Counted.'],[3,'on','Route','The group has one deployment, C.'],[4,'on','Cache','Miss.'],[5,'bad','Call','C answers 503.'],
      [6,'bad','Retry or cool down','503 is retryable: wait about 1 s (0.5 s times 2 to the power of the retry number, plus up to 0.75 s of jitter) and try C again; it fails twice more. A single-deployment group is never cooled down.'],
      [7,'on','Fallback','After the retries, one more backoff, then the fallback group answers. Recorded: about 5.5 s per request, on every request (section 3).'],
      [8,'on','Settle and log','Cost of the call that answered; the trace shows the fallback only if you log which deployment answered.']]
  };
  let mode='miss';
  const pipe=document.getElementById('fgw-pipe'),cap=document.getElementById('fgw-pipecap'),cnt=document.getElementById('fgw-pipecnt');
  function draw(i){const seq=SC[mode],cur=seq[i],seen={};seq.slice(0,i+1).forEach(s=>seen[s[0]]=s[1]);
    pipe.innerHTML=ST.map((s,k)=>{let c='fgw-st';if(k===cur[0])c+=cur[1]==='bad'?' on bad':cur[1]==='skip'?' skip':' on';else if(seen[k]==='skip')c+=' skip';else if(seen[k]==='bad')c+=' bad';
      return '<div class="'+c+'"><b>'+(k+1)+'. '+s[0]+'</b><span class="x">'+s[1]+'</span></div>'}).join('');
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+seq.length+': '+E(cur[2])+'</div><p>'+E(cur[3])+'</p>';
    const calls={miss:[0,0,0,0,0,1,1],hit:[0,0,0,0,0,0,0],fail:[0,0,0,0,0,1,3,4,4]}[mode][i];
    cnt.innerHTML=RD.stat('Stages run',seq.slice(0,i+1).filter(s=>s[1]!=='skip').length+' of '+ST.length,'')+RD.stat('Provider calls',calls,mode==='hit'?'cache hit: none':'')}
  const an=RD.anim({card:'fgw-pipecard',ctl:'fgw-pipectl',n:SC.miss.length,draw,ms:2200,label:'Pipeline step'});
  RD.seg(document.getElementById('fgw-pipemode'),m=>{mode=m;an.reset(SC[m].length);an.play()});

  // 2. routing strategies (E1)
  function e1(){const el=document.getElementById('fgw-e1');if(!el)return;
    el.innerHTML='<div class="fgw-row small mute"><span class="nm">strategy</span><span>share of 40: <b style="color:var(--c1)">A</b> fast / <b style="color:var(--c2)">B</b> slow</span><span class="v">all 40</span></div>'+
      F.e1.cases.map(c=>{const a=c.count.A,b=c.count.B;return '<div class="fgw-row"><span class="nm" title="'+E(c.s)+'">'+E(c.s.replace(' (B cheaper)','').replace('cost-based-routing, prices in ','cost-based, prices in '))+'</span><span class="fgw-bar" role="img" aria-label="'+a+' to A, '+b+' to B"><span style="width:'+(a/40*100)+'%;background:var(--c1)"></span><span style="width:'+(b/40*100)+'%;background:var(--c2)"></span></span><span class="v">'+a+' / '+b+'<br><span class="mute">'+c.wall.toFixed(1)+' s</span></span></div>'}).join('')}
  e1();

  // 3. failure strips (E2): every call that reached C
  function e2(){const el=document.getElementById('fgw-e2');if(!el)return;const W=RD.width(el),keys=['c429','c503','c503af3','c503af1'];
    const L=Math.min(150,W*0.34),R=W-18,T=22;const rows=keys.map(k=>F.e2.find(c=>c.key===k));
    const tmax=Math.max(...rows.map(c=>c.reqs[c.reqs.length-1].t1));const X=t=>L+(R-L)*t/tmax;const H=T+rows.length*34+8;
    let s='';for(let t=0;t<=tmax;t+=5){s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(T-6)+'" y2="'+(H-6)+'" stroke="var(--line)"/>'+RD.t(X(t),T-9,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
    rows.forEach((c,j)=>{const y=T+j*34+6;const cs=[];c.reqs.forEach(r=>r.att.forEach(a=>{if(a[0]==='C')cs.push({t:a[2],err:!r.ok})}));
      const pts=[0,...cs.map(x=>x.t),tmax];for(let i=2;i<pts.length-1;i++){if(pts[i]-pts[i-1]>4)s+='<rect x="'+X(pts[i-1])+'" y="'+(y-2)+'" width="'+(X(pts[i])-X(pts[i-1]))+'" height="22" fill="var(--dim)" opacity=".55"/>'}
      s+='<line x1="'+L+'" x2="'+R+'" y1="'+(y+9)+'" y2="'+(y+9)+'" stroke="var(--line)"/>';
      cs.forEach(x=>{s+='<rect x="'+(X(x.t)-1.5)+'" y="'+y+'" width="3" height="18" fill="'+(x.err?'var(--bad)':'var(--c2)')+'"><title>call to C at '+x.t.toFixed(1)+' s</title></rect>'});
      const lab={c429:'429, defaults',c503:'503, defaults',c503af3:'503, allowed_fails 3',c503af1:'503, allowed_fails 1'}[c.key];
      const ue=c.reqs.filter(r=>!r.ok).length;
      s+=RD.t(4,y+8,lab,{fs:11.5})+RD.t(4,y+21,cs.length+' calls to C'+(ue?', '+ue+' user error':''),{fs:10,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'Calls that reached the failing deployment C in four configurations')}
  e2();

  // 4. retries across layers (E3)
  function e3(){const el=document.getElementById('fgw-e3');if(!el)return;const W=RD.width(el),C=F.e3.cases;
    const L=Math.min(140,W*0.3),R=W-18,T=22,tmax=90,X=t=>L+(R-L)*t/tmax;let y=T,s='';
    for(let t=0;t<=tmax;t+=15)s+=RD.t(X(t),T-9,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    const blocks=C.map(c=>{const h=c.att.length*7+30;const b={c,y,h};y+=h;return b});const H=y+6;
    for(let t=0;t<=tmax;t+=15)s='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(T-6)+'" y2="'+(H-4)+'" stroke="var(--line)"/>'+s;
    blocks.forEach(({c,y,h})=>{const lab={sdk_default_t10:'SDK 10 s, 2 retries',sdk_noretry_t10:'SDK 10 s, 0 retries',sdk_default_t60:'SDK 60 s, 2 retries'}[c.key];
      s+=RD.t(4,y+12,lab,{fs:11.5})+RD.t(4,y+25,c.att.length+' provider calls',{fs:10,fill:'var(--mute)'});
      c.att.forEach((a,i)=>{s+='<rect x="'+X(a[0])+'" y="'+(y+4+i*7)+'" width="'+Math.max(1,X(a[1])-X(a[0]))+'" height="5" rx="1" fill="var(--dim)"><title>provider call '+(i+1)+': '+a[0].toFixed(1)+' to '+a[1].toFixed(1)+' s</title></rect>'});
      c.ev.filter(e=>e[0]==='client sends').forEach(e=>{s+='<rect x="'+(X(e[1])-1)+'" y="'+(y+2)+'" width="2" height="'+(h-10)+'" fill="var(--c1)"/>'});
      s+='<rect x="'+(X(c.done)-1)+'" y="'+y+'" width="2.5" height="'+(h-6)+'" fill="var(--bad)"><title>user gets '+E(c.err)+' at '+c.done.toFixed(1)+' s</title></rect>';
      s+='<line x1="0" x2="'+W+'" y1="'+(y+h-2)+'" y2="'+(y+h-2)+'" stroke="var(--line)"/>'});
    el.innerHTML=RD.svg(W,H,s,'Provider calls caused by one user request under three client settings')}
  e3();
  RD.onRender(()=>{e1();e2();e3()});RD.onResize(()=>{e2();e3()});
})();
