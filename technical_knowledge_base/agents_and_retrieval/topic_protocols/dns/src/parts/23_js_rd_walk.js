// ---- Reading section 2: one lookup replayed from the authoritative servers' own logs (cold with and without QNAME minimisation, warm) ----
(function(){
  const card=document.getElementById('wk-card');if(!card)return;const W=DNSD.walk;const esc=RD.esc;
  const LANES=['Pod (stub)','Resolver','Root','test.','llm.test.'];const LI={root:2,'test.':3,'llm.test.':4};
  const SNAME={root:'a root server','test.':'the test. server','llm.test.':'the llm.test. server'};
  function steps(m){
    const S=[];
    S.push({a:0,b:1,l:'A? api.llm.test',c:'Your process calls getaddrinfo; the stub sends one recursive question (RD flag set) to the resolver in /etc/resolv.conf.'});
    if(m===2){const r=W.runs[0];
      S.push({a:1,b:1,l:'cache hit',c:'The resolver already holds the answer from the first lookup. It sends nothing upstream: '+r.warm_up+' queries reached any authoritative server.'});
      S.push({a:1,b:0,l:'A 10.53.0.80, TTL '+r.warm_ttl,c:'The answer comes back with the TTL counted down ('+r.warm_ttl+' of 60 seconds left). dig measured '+r.warm_ms+' ms for the whole lookup in the lab.'});
      return S}
    const r=W.runs[m];
    r.up.forEach(u=>{const i=LI[u.server];const q=u.type+'? '+u.name;
      const prime=u.type==='NS'&&u.name==='.';
      S.push({a:1,b:i,l:q,u:u,c:prime?'Priming: the resolver starts with only the root hints, so it first asks a root server for the current list of root servers.':
        'The resolver asks '+SNAME[u.server]+' about <code>'+esc(u.name)+'</code>'+(m===0&&u.name!=='api.llm.test.'?', not the full name: QNAME minimisation sends only the labels this server needs.':(u.server!=='llm.test.'?': the full name, so this server learns exactly what you are looking up.':'.'))});
      const aa=u.flags.indexOf('aa')>=0;
      S.push({a:i,b:1,l:prime?'13 root names (aa)':(aa?'answer (aa)':'referral'),u:u,c:prime?'The root answers with its own server list (authoritative, '+u.size+' bytes).':
        aa?'The zone\'s own server answers with the record: AA (authoritative) flag set, '+u.size+' bytes, '+u.rcode+'.':
        'A referral, '+u.size+' bytes, no AA flag: "I do not hold that; ask '+(u.server==='root'?'ns1.nic.test (10.53.0.11)':'ns1.llm.test (10.53.0.12)')+'", with the address as glue.'});
    });
    S.push({a:1,b:0,l:'A 10.53.0.80, TTL 60',c:'The resolver caches the answer for 60 seconds (and the referrals for their own TTLs) and replies. dig measured '+r.cold_ms+' ms for the whole cold lookup in the lab, '+r.up.length+' upstream queries.'});
    return S;
  }
  let mode=0,S=steps(0);
  function draw(k){
    const w=RD.width(document.getElementById('wk-svg'));const n=S.length;const top=26,rh=26,h=top+n*rh+8;
    const lx=i=>Math.round(w*(0.1+i*0.2));let b='';
    LANES.forEach((L,i)=>{b+='<line x1="'+lx(i)+'" y1="'+(top-6)+'" x2="'+lx(i)+'" y2="'+(h-4)+'" stroke="var(--line)" stroke-dasharray="3 3"/>'+RD.t(lx(i),14,L,{a:'middle',fs:w<480?9.5:11,w:600})});
    for(let j=0;j<=k&&j<n;j++){const s=S[j],y=top+j*rh+14,cur=j===k;const col=cur?'var(--acc)':'var(--mute)';
      const x1=lx(s.a),x2=lx(s.b);
      if(s.a===s.b){b+='<circle cx="'+x1+'" cy="'+(y-4)+'" r="6" fill="'+(cur?'var(--good)':'var(--mute)')+'"/>'+RD.t(x1+10,y,esc(s.l),{fs:10.5,fill:cur?'var(--ink)':'var(--mute)'});continue}
      const dir=x2>x1?1:-1;
      b+='<line x1="'+x1+'" y1="'+y+'" x2="'+(x2-dir*6)+'" y2="'+y+'" stroke="'+col+'" stroke-width="'+(cur?2:1.2)+'"/>'+
        '<path d="M'+x2+' '+y+' l'+(-dir*7)+' -4 v8 z" fill="'+col+'"/>';
      const mid=(x1+x2)/2;const anchor='middle';
      b+=RD.t(Math.max(40,Math.min(w-40,mid)),y-5,esc(s.l),{a:anchor,fs:w<480?9:10.5,fill:cur?'var(--ink)':'var(--mute)',w:cur?600:400});
    }
    document.getElementById('wk-svg').innerHTML=RD.svg(w,h,b,'Sequence of DNS messages');
    const s=S[Math.min(k,n-1)];document.getElementById('wk-cap').innerHTML='<div class="t">Step '+(k+1)+' of '+n+'</div><p>'+s.c+'</p>';
    const sent=S.slice(0,k+1).filter(x=>x.a===1&&x.b>=2).length;
    const rootSaw=S.slice(0,k+1).filter(x=>x.a===1&&x.b===2&&x.u&&x.u.type!=='NS').map(x=>x.u.name);
    document.getElementById('wk-cnt').innerHTML=RD.stat('Messages so far',S.slice(0,k+1).filter(x=>x.a!==x.b).length)+
      RD.stat('Queries sent upstream',sent+' of '+S.filter(x=>x.a===1&&x.b>=2).length)+
      RD.stat('The root learned',rootSaw.length?'<code>'+esc(rootSaw.join(', '))+'</code>':'nothing')+
      RD.stat('Whole lookup (lab, dig)',(mode===2?W.runs[0].warm_ms:W.runs[mode].cold_ms)+' ms');
  }
  const A=RD.anim({card:'wk-card',ctl:'wk-ctl',n:S.length,draw:draw,ms:1500,label:'Lookup step'});
  RD.seg(document.getElementById('wk-mode'),m=>{mode=+m;S=steps(mode);A.reset(S.length);A.play()});
  RD.onResize(()=>A.redraw());
})();
