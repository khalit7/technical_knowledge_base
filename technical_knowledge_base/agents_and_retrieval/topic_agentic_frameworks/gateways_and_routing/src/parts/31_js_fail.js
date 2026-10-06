// ---- Failure lab (t-fail): replay of every recorded attempt ----
(function(){
  const F=window.FGW,E=RD.esc;
  const LAB2={c429:'C 429, defaults',c503:'C 503, defaults',c503af3:'C 503, allowed_fails 3',c503af1:'C 503, allowed_fails 1',single:'only C, fallback to A',ctx_nofb:'context error, fallbacks',ctx_fb:'context error, context_window_fallbacks',ctx_none:'context error, no fallbacks'};
  const LAB3={sdk_default_t10:'SDK 10 s, 2 retries',sdk_noretry_t10:'SDK 10 s, 0 retries',sdk_default_t60:'SDK 60 s, 2 retries'};
  let cur={kind:2,key:'c429'};
  function events(){const ev=[];
    if(cur.kind===2){const c=F.e2.find(x=>x.key===cur.key);
      c.reqs.forEach(r=>{ev.push({t:r.t0,k:'send',r,txt:'Request '+r.i+' sent to group "chat".'});
        r.att.forEach((a,j)=>ev.push({t:a[2],k:'att',r,a,txt:'Request '+r.i+', attempt '+(j+1)+': provider '+a[0]+' '+(a[1]===200?'answers 200 after '+(a[3]-a[2]).toFixed(2)+' s.':'answers '+a[1]+'.')+(a[0]==='C'&&j===0&&r.att.length===1&&a[1]!==200?' No retry for this status.':'')}));
        ev.push({t:r.t1,k:'end',r,txt:'Request '+r.i+(r.ok?' done: answered by '+r.dep+' after '+(r.t1-r.t0).toFixed(2)+' s.':' FAILED: the caller gets '+r.err+' after '+(r.t1-r.t0).toFixed(2)+' s.')})});
      return {c,ev:ev.sort((a,b)=>a.t-b.t||(a.k==='end')-(b.k==='end'))}}
    const c=F.e3.cases.find(x=>x.key===cur.key);
    c.ev.forEach(e=>ev.push({t:e[1],k:'cl',txt:e[0]==='client sends'?'The SDK sends the request (timeout '+c.tmo+' s).':'The SDK receives '+e[0].replace('client gets ','')+' from the gateway (its own retry chain gave up) and, being retryable, will retry.'}));
    c.att.forEach((a,i)=>ev.push({t:a[0],k:'pa',i,txt:'The provider receives call '+(i+1)+' and hangs for 30 s (the gateway gives each attempt 5 s, then retries).'}));
    ev.push({t:c.done,k:'user',txt:'The user gets '+c.err+' after '+c.done.toFixed(1)+' s. Calls already sent keep the provider busy; the gateway keeps retrying chains whose client has gone.'});
    return {c,ev:ev.sort((a,b)=>a.t-b.t)}}
  let EV=events();
  const svg=document.getElementById('fl-svg'),cap=document.getElementById('fl-cap'),cnt=document.getElementById('fl-cnt');
  function draw(i){const {c,ev}=EV;if(!ev.length)return;const now=ev[Math.min(i,ev.length-1)].t;const W=RD.width(svg);let s='';
    const L=Math.min(78,W*0.18),R=W-18;
    if(cur.kind===2){const tmax=Math.max(...c.reqs.map(r=>r.t1))*1.02,X=t=>L+(R-L)*t/tmax;const lanes=[['caller',14],['A',58],['C',92]],H=118;
      for(let t=0;t<=tmax;t+=Math.max(1,Math.round(tmax/8)))s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="8" y2="'+(H-14)+'" stroke="var(--line)"/>'+RD.t(X(t),H-2,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
      lanes.forEach(([n,y])=>{s+=RD.t(4,y+12,n==='caller'?'requests':'provider '+n,{fs:11})});
      c.reqs.forEach(r=>{if(r.t0>now)return;const e=Math.min(now,r.t1),y=r.i%2?22:14;
        s+='<rect x="'+X(r.t0)+'" y="'+y+'" width="'+Math.max(1,X(e)-X(r.t0))+'" height="7" fill="var(--c1)" opacity=".75"/>';
        if(r.t1<=now)s+='<rect x="'+(X(r.t1)-1)+'" y="'+(y-2)+'" width="3" height="11" fill="'+(r.ok?'var(--good)':'var(--bad)')+'"/>';
        r.att.forEach(a=>{if(a[2]>now)return;const y2=a[0]==='A'?58:92;const e2=Math.min(now,a[3]);s+='<rect x="'+X(a[2])+'" y="'+y2+'" width="'+Math.max(2,X(e2)-X(a[2]))+'" height="16" fill="'+(a[1]===200?'var(--good)':'var(--bad)')+'"><title>request '+r.i+': '+a[0]+' '+a[1]+'</title></rect>'})});
      s+='<line x1="'+X(now)+'" x2="'+X(now)+'" y1="6" y2="'+(H-14)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
      svg.innerHTML=RD.svg(W,H,s,'Replay of '+E(LAB2[cur.key]));
      const done=c.reqs.filter(r=>r.t1<=now),att=c.reqs.flatMap(r=>r.att.filter(a=>a[2]<=now));
      cnt.innerHTML=RD.stat('Time',now.toFixed(1)+' s','')+RD.stat('Requests done',done.length+' of '+c.reqs.length,'')+RD.stat('Calls to C',att.filter(a=>a[0]==='C').length,'')+RD.stat('Calls to A',att.filter(a=>a[0]==='A').length,'')+RD.stat('User errors',done.filter(r=>!r.ok).length,'')}
    else{const tmax=90,X=t=>L+(R-L)*t/tmax,rows=c.att.length,H=46+rows*12;
      for(let t=0;t<=tmax;t+=15)s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="8" y2="'+(H-14)+'" stroke="var(--line)"/>'+RD.t(X(t),H-2,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
      s+=RD.t(4,22,'client',{fs:11})+RD.t(4,46,'provider',{fs:11});
      c.ev.forEach(e=>{if(e[1]>now)return;s+='<rect x="'+(X(e[1])-1)+'" y="12" width="2.5" height="14" fill="'+(e[0]==='client sends'?'var(--c1)':'var(--c5)')+'"><title>'+E(e[0])+' at '+e[1]+' s</title></rect>'});
      if(c.done<=now)s+='<rect x="'+(X(c.done)-1.5)+'" y="8" width="3" height="'+(H-22)+'" fill="var(--bad)"/>';
      c.att.forEach((a,k)=>{if(a[0]>now)return;const e=Math.min(now,a[1]);s+='<rect x="'+X(a[0])+'" y="'+(36+k*12)+'" width="'+Math.max(2,X(e)-X(a[0]))+'" height="9" rx="1" fill="'+(a[0]>c.done?'var(--dim)':'var(--c5)')+'"/>'});
      s+='<line x1="'+X(now)+'" x2="'+X(now)+'" y1="6" y2="'+(H-14)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
      svg.innerHTML=RD.svg(W,H,s,'Replay of '+E(LAB3[cur.key]));
      const pa=c.att.filter(a=>a[0]<=now);const work=pa.reduce((x,a)=>x+Math.min(now,a[1])-a[0],0);
      cnt.innerHTML=RD.stat('Time',now.toFixed(1)+' s','')+RD.stat('SDK sends',c.ev.filter(e=>e[0]==='client sends'&&e[1]<=now).length,'')+RD.stat('Provider calls',pa.length,'formula: 3 x 3 = 9 with 2 + 2 retries')+RD.stat('Provider seconds busy',work.toFixed(0),'')+RD.stat('User',c.done<=now?'error at '+c.done.toFixed(1)+' s':'waiting','')}
    const e=ev[Math.min(i,ev.length-1)];cap.innerHTML='<div class="t">Event '+(i+1)+' of '+ev.length+' at '+e.t.toFixed(2)+' s</div><p>'+E(e.txt)+'</p>'}
  const an=RD.anim({card:'fl-card',ctl:'fl-ctl',n:EV.ev.length,draw,ms:550,label:'Event',tab:'t-fail'});
  function table(){const t=document.getElementById('fl-tab');
    if(cur.kind===2){const c=EV.c;t.innerHTML='<thead><tr><th>#</th><th class="num">sent</th><th class="num">done</th><th>attempts (provider, status, start s)</th><th>result</th></tr></thead><tbody>'+c.reqs.map(r=>'<tr><td>'+r.i+'</td><td class="num">'+r.t0.toFixed(2)+'</td><td class="num">'+r.t1.toFixed(2)+'</td><td class="mono small">'+r.att.map(a=>a[0]+' '+a[1]+' @'+a[2].toFixed(1)).join(', ')+'</td><td>'+(r.ok?'answered by '+r.dep:'<b style="color:var(--bad)">'+E(r.err)+'</b>')+'</td></tr>').join('')+'</tbody>'}
    else{const c=EV.c;t.innerHTML='<thead><tr><th>#</th><th class="num">provider call start</th><th class="num">end</th><th>after the user\'s error?</th></tr></thead><tbody>'+c.att.map((a,k)=>'<tr><td>'+(k+1)+'</td><td class="num">'+a[0].toFixed(1)+'</td><td class="num">'+a[1].toFixed(1)+'</td><td>'+(a[0]>c.done?'yes':'')+'</td></tr>').join('')+'</tbody>'}}
  function chips(el,labs,kind){el.innerHTML=Object.keys(labs).map(k=>'<button data-k="'+k+'" data-kind="'+kind+'">'+E(labs[k])+'</button>').join('')}
  const p2=document.getElementById('fl-pick2'),p3=document.getElementById('fl-pick3');chips(p2,LAB2,2);chips(p3,LAB3,3);
  function mark(){[p2,p3].forEach(p=>p.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===cur.key)))}
  [p2,p3].forEach(p=>p.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur={kind:+b.dataset.kind,key:b.dataset.k};EV=events();mark();table();an.reset(EV.ev.length);an.play()}));
  mark();table();
  RD.onRender(()=>{an.redraw()},'t-fail');
  addEventListener('resize',()=>{const t=document.getElementById('t-fail');if(t&&!t.hidden)an.redraw()});
})();
