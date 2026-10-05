// ---- Reading sections 9 and 10: DNSSEC chain stepper (valid / expired / rolled), the real root keys, the rebinding replay ----
// Key tags are recomputed in the browser from the recorded DNSKEY records (RFC 4034 appendix B).
window.keyTag=function(flags,proto,alg,b64){const k=atob(b64.replace(/\s+/g,''));const d=[flags>>8,flags&255,proto,alg];for(let i=0;i<k.length;i++)d.push(k.charCodeAt(i));
  let ac=0;for(let i=0;i<d.length;i++)ac+=(i&1)?d[i]:d[i]<<8;ac+=(ac>>16)&0xffff;return ac&0xffff};
(function(){
  const card=document.getElementById('ds-card');if(!card)return;const S=DNSD.sec.dnssec;const esc=RD.esc;
  const recs=s=>(s||'').split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>f.length>4&&f[2]==='IN');
  const keys=s=>recs(s).filter(f=>f[3]==='DNSKEY').map(f=>({flags:+f[4],tag:keyTag(+f[4],+f[5],+f[6],f.slice(7).join(''))}));
  const ds=s=>recs(s).filter(f=>f[3]==='DS').map(f=>+f[4]);
  const ksk=s=>keys(s).filter(k=>k.flags===257).map(k=>k.tag),zsk=s=>keys(s).filter(k=>k.flags===256).map(k=>k.tag);
  const anc=ds(S.anchor_old)[0],ancNew=ds(S.anchor_new)[0];const C=S.chain;
  const rootK=ksk(C['. DNSKEY']),tDS=ds(C['test. DS']),tK=ksk(C['test. DNSKEY']),lDS=ds(C['llm.test. DS']),lK=ksk(C['llm.test. DNSKEY']),lZ=zsk(C['llm.test. DNSKEY']);
  const status=s=>((s||'').match(/status: (\w+)/)||[])[1]||'?';
  function steps(m){
    const st=[
      {t:'Trust anchor (configured)',d:'The resolver trusts one key without proof: the lab root\'s KSK, given as a DS hash with key tag <b>'+anc+'</b>.',o:S.anchor_old},
      {t:'Root DNSKEY set',d:'The root publishes its keys; the KSK with tag <b>'+rootK.join(', ')+'</b> hashes to the anchor, and its RRSIG over the key set verifies. Now the root ZSK is trusted too.',o:C['. DNSKEY']},
      {t:'test. DS, in the root zone',d:'The root vouches for <code>test.</code>: a DS with tag <b>'+tDS.join(', ')+'</b>, signed by the root ZSK.',o:C['test. DS']},
      {t:'test. DNSKEY set',d:'<code>test.</code>\'s KSK (tag <b>'+tK.join(', ')+'</b>) matches that DS, and signs its key set.',o:C['test. DNSKEY']},
      {t:'llm.test. DS, in test.',d:'<code>test.</code> vouches for <code>llm.test.</code>: DS tag <b>'+lDS.join(', ')+'</b>.',o:C['llm.test. DS']},
      {t:'llm.test. DNSKEY set',d:'KSK tag <b>'+lK.join(', ')+'</b> matches; the ZSK (tag <b>'+lZ.join(', ')+'</b>) signs the zone\'s records.',o:C['llm.test. DNSKEY']},
      {t:'api.llm.test A and its RRSIG',d:'The address is signed by the ZSK. The chain is complete: the resolver sets AD (authentic data). Below the answer, <code>delv</code> doing the same walk itself and printing each verified key id.',o:S.valid+'\n\n$ delv +vtrace api.llm.test\n'+(S.delv||'').split('\n').filter(l=>/fetch:|verify rdataset|fully validated/.test(l)).join('\n')}];
    if(m==='nx'){st[6]={t:'nope.llm.test: a signed "no"',d:'The name does not exist, and the resolver can prove it: the zone returns NSEC records, signed, saying "after api.llm.test the next name is ns1.llm.test", so nothing called nope.llm.test can exist (it would sort between them). AD is set on the NXDOMAIN.',o:S.nxdomain_proof}}
    if(m==='expired'){st[6]={t:'api.llm.test A: signature expired',bad:1,d:'Every link up to the zone\'s keys holds, but the RRSIG over the A record expired a day ago. A validating resolver must refuse it: <b>'+status(S.expired)+'</b>. With CD set (checking disabled) the same resolver hands over the address, which proves the fault is DNSSEC. Unbound\'s log names the cause.',o:S.expired+'\n\n$ dig api.llm.test +cd\n'+S.expired_cd+'\n\n# Unbound log\n'+(S.expired_log||[]).join('\n')}}
    if(m==='rolled'){st[1]={t:'Root DNSKEY set: the key changed',bad:1,d:'The lab root has rolled to a new KSK (tag <b>'+ancNew+'</b>) and withdrawn the old one. The resolver\'s anchor (tag '+anc+') matches nothing, so it cannot trust the root, and therefore nothing below it: every lookup returns <b>SERVFAIL</b>, signed or not. Given the new anchor, the same resolver validates again.',
      o:'# old anchor\n'+S.rolled_old_anchor+'\n'+(S.rolled_old_log||[]).join('\n')+'\n\n# new anchor\n'+S.rolled_new_anchor};
      for(let i=2;i<7;i++)st[i].skip=1}
    return st;
  }
  let mode='valid',st=steps(mode);
  function draw(k){
    const lastBad=st.findIndex(s=>s.bad);
    document.getElementById('ds-chain').innerHTML=st.map((s,i)=>'<div class="'+(i===k?'on ':'')+(i<=k?(s.bad?'bad':(s.skip?'':'okc')):'')+'">'+(i+1)+'. '+s.t+(s.skip&&i<=k?' <span class="mute">(never reached)</span>':'')+'</div>').join('');
    const s=st[k];document.getElementById('ds-cap').innerHTML='<div class="t">'+s.t+'</div><p>'+(s.skip?'Not checked: the chain already broke at the root.':s.d)+'</p>';
    const src=s.skip?st.find(x=>x.bad):s;document.getElementById('ds-out').textContent=((src&&src.o)||'').trim();
  }
  const A=RD.anim({card:'ds-card',ctl:'ds-ctl',n:7,draw:draw,ms:1700,label:'Chain step'});
  RD.seg(document.getElementById('ds-mode'),m=>{mode=m;st=steps(m);A.reset(7);A.go(m==='expired'||m==='nx'?6:(m==='rolled'?1:0))});
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
    document.getElementById('rb-cap').innerHTML='<div class="t">Step '+(k+1)+' of '+n+'</div><p>'+S[Math.min(k,n-1)].c+'</p>';
  }
  const A=RD.anim({card:'rb-card',ctl:'rb-ctl',n:S.length,draw:draw,ms:1600,label:'Rebinding step'});
  RD.seg(document.getElementById('rb-mode'),x=>{m=x;S=steps(m);A.reset(S.length);A.play()});
  RD.onResize(()=>A.redraw());
})();
