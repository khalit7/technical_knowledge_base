// ---- Reading sections 9 and 10: key tags, the real root keys, the rebinding replay (the chain of trust is the stage in 44_js_sc_sec.js) ----
// Key tags are recomputed in the browser from the recorded DNSKEY records (RFC 4034 appendix B).
window.keyTag=function(flags,proto,alg,b64){const k=atob(b64.replace(/\s+/g,''));const d=[flags>>8,flags&255,proto,alg];for(let i=0;i<k.length;i++)d.push(k.charCodeAt(i));
  let ac=0;for(let i=0;i<d.length;i++)ac+=(i&1)?d[i]:d[i]<<8;ac+=(ac>>16)&0xffff;return ac&0xffff};
(function(){
  // the real root keys
  const P=DNSD.pub;const el=document.getElementById('ds-root');
  if(el)el.textContent='# root zone file (InterNIC), recomputed here: key tag and SHA-256 DS digest per key\n'+P.keytags.join('\n')+
    '\n\n# the root key set over DNS over TLS, 5 October 2026\n'+(P.root_dnskey||'').split('\n').filter(l=>/flags:|key id/.test(l)).map(l=>l.trim()).join('\n')+'\n'+(P.root_rrsig||'').trim();
})();
(function(){
  const card=document.getElementById('rb-card');if(!card)return;const R=DNSD.sec.rebind;const esc=RD.esc;
  const LANES=['Fetch tool','Resolver and attacker DNS','Attacker web 10.53.0.66','Metadata stand-in 10.53.0.99'];
  function steps(m){
    const r=R.find(x=>x.mode===m);const lg=r.evil_log.filter(l=>/ A /.test(l));const s=r.out.steps;const S=[];
    const ip=l=>l.split('-> ')[1].split(' ')[0];
    S.push({a:0,b:1,l:'A? rebind.attacker.test',c:'The tool resolves the host to check it (getaddrinfo).'});
    S.push({a:1,b:0,l:ip(lg[0])+', TTL 0',c:'The attacker\'s server answers with its own web server, TTL 0 so no cache keeps it (its log: "'+esc(lg[0])+'").'});
    S.push({a:0,b:0,l:'check: '+s[0].addrs.join(', ')+' allowed',c:'Not internal, so the check passes.'});
    if(m==='naive'){
      S.push({a:0,b:1,l:'A? rebind.attacker.test (again)',c:'urllib opens the URL by name, so the C library resolves it a second time.'});
      S.push({a:1,b:0,l:ip(lg[1])+', TTL 0',c:'This time the attacker answers with the internal address ("'+esc(lg[1])+'"). Nobody checks it.'});
      S.push({a:0,b:3,l:'GET / Host: rebind.attacker.test',c:'The request goes to the metadata stand-in.'});
      S.push({a:3,b:0,l:'credentials leaked',bad:1,c:'Returned to the tool, and through it to the model: <code>'+esc(s[2].body)+'</code>'});
    }else{
      S.push({a:0,b:2,l:'GET / to '+s[0].addrs[0]+', Host: rebind.attacker.test',c:'The tool connects to the exact address it checked and sends the name only in the Host header. No second lookup happens: the attacker\'s log shows '+lg.length+' A query.'});
      S.push({a:2,b:0,l:'"'+s[2].body+'"',c:'The tool gets the attacker\'s harmless page; the internal address was never contacted. Had the first answer been internal, the check would have refused it.'});
    }
    return S;
  }
  let m='naive',S=steps(m);
  function draw(k){
    const w=RD.width(document.getElementById('rb-svg'));const n=S.length,top=28,rh=28,h=top+n*rh+6;const lx=i=>Math.round(w*(0.12+i*0.255));let b='';
    LANES.forEach((L,i)=>{b+='<line x1="'+lx(i)+'" y1="'+(top-6)+'" x2="'+lx(i)+'" y2="'+(h-4)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
      const words=L.split(' ');const half=Math.ceil(words.length/2);
      b+=RD.t(lx(i),10,esc(words.slice(0,half).join(' ')),{a:'middle',fs:w<480?9:10.5,w:600})+RD.t(lx(i),21,esc(words.slice(half).join(' ')),{a:'middle',fs:w<480?9:10.5,w:600})});
    for(let j=0;j<=k&&j<n;j++){const s=S[j],y=top+j*rh+16,cur=j===k;const col=s.bad?'var(--bad)':(cur?'var(--acc)':'var(--mute)');const x1=lx(s.a),x2=lx(s.b);
      if(s.a===s.b){b+='<circle cx="'+x1+'" cy="'+(y-4)+'" r="6" fill="'+(cur?'var(--good)':'var(--mute)')+'"/>'+RD.t(x1+10,y,esc(s.l),{fs:10,fill:cur?'var(--ink)':'var(--mute)'});continue}
      const dir=x2>x1?1:-1;b+='<line x1="'+x1+'" y1="'+y+'" x2="'+(x2-dir*6)+'" y2="'+y+'" stroke="'+col+'" stroke-width="'+(cur?2:1.2)+'"/><path d="M'+x2+' '+y+' l'+(-dir*7)+' -4 v8 z" fill="'+col+'"/>';
      b+=RD.t(Math.max(60,Math.min(w-60,(x1+x2)/2)),y-5,esc(s.l.length>46?s.l.slice(0,44)+'...':s.l),{a:'middle',fs:w<480?8.5:10,fill:s.bad?'var(--bad)':(cur?'var(--ink)':'var(--mute)'),w:cur?600:400})}
    document.getElementById('rb-svg').innerHTML=RD.svg(w,h,b,'Rebinding sequence');
  }
  // each step is explained by the step list on the left (sx-rb-naive, sx-rb-pinned); the c texts above are what those lists say, kept for check_stages.mjs
  const A=RD.anim({card:'rb-card',ctl:'rb-ctl',n:S.length,draw:draw,ms:3800,label:'Rebinding step',list:'sx-rb-naive'});
  RD.seg(document.getElementById('rb-mode'),x=>{m=x;S=steps(m);document.querySelectorAll('ol[id^="sx-rb-"]').forEach(l=>l.hidden=l.id!=='sx-rb-'+m);A.reset(S.length,'sx-rb-'+m)});
  window.DNS_RB_STEPS=m0=>steps(m0).length;
  RD.onResize(()=>A.redraw());
})();
