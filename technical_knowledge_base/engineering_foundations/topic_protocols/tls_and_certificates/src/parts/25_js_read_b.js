// ---- Reading sections 3 to 9: 0-RTT lab, ACME stepper, lifetimes chart, mTLS numbers, rotation, post-quantum ----
(function(){
  const D=window.D,fmt=TLS.fmt,esc=RD.esc;
  // 0-RTT replay results
  (function(){
    const fr={A:'front end A','A-rfc8470':'front end A (Early-Data header)',B:'front end B'};
    document.getElementById('zr-out').innerHTML=D.zr.runs.map(r=>'<h3 style="margin-top:6px">'+esc(r.label==='plain early data'?'Run 1: early data on, nothing else':'Run 2: nginx forwards Early-Data: 1, the backend answers 425 to early requests')+'</h3><div class="tw"><table><thead><tr><th>Step</th><th>Client saw</th><th>Backend</th></tr></thead><tbody>'+
      r.steps.map(s=>'<tr><td>'+esc(s.step)+(s.ff?'<div class="small mute">first flight: '+fmt(s.ff)+' bytes (ClientHello with the ticket, then the encrypted request)</div>':'')+'</td><td class="small">'+(s.cl.length?s.cl.map(l=>esc(l.replace(/---$/,'').replace(/closed$/,''))).join('<br>'):'<span class="mute">attacker: no keys, just resends bytes</span>')+'</td><td>'+
        (s.be.length?s.be.map(b=>(b[2]===200?'<span class="no">generation #'+b[3]+' billed</span>':'<span class="ok">'+b[2]+' Too Early, nothing run</span>')+'<div class="small mute">via '+esc(fr[b[0]]||b[0])+(b[1]?', Early-Data: '+b[1]:'')+'</div>').join(''):'<span class="mute">nothing</span>')+'</td></tr>').join('')+'</tbody></table></div>').join('')+
      '<p class="small mute">Recorded '+D.zr.recorded+', '+esc(D.zr.nginx)+', '+esc(D.zr.openssl)+'. Loopback; front ends A and B are two nginx processes sharing one session ticket key file.</p>';
  })();

  // ACME stepper
  (function(){
    const L=D.acme.log,starts=[];L.forEach((e,i)=>{if(/^new order for/.test(e.step)&&!/retried/.test(e.step)&&!(i>0&&/^new order for/.test(L[i-1].step)))starts.push(i)});
    const segs=[{n:'HTTP-01 issuance (account, order, validation, finalize, ARI)',a:0,b:starts[1]},{n:'DNS-01, wildcard *.llm.test',a:starts[1],b:starts[2]},{n:'6-day "shortlived" profile',a:starts[2],b:starts[3]},{n:'Failed validation',a:starts[3],b:L.length}];
    let seg=0;const pick=document.getElementById('acme-pick'),out=document.getElementById('acme-step');
    pick.innerHTML=segs.map((s,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+esc(s.n)+'</button>').join('');
    const js=o=>esc(typeof o==='string'?o:JSON.stringify(o,null,1));
    function draw(i){
      const s=segs[seg],e=L[s.a+i];if(!e)return;
      let h='<div class="an-cap"><div class="t">'+(i+1)+'/'+(s.b-s.a)+'. '+esc(e.step)+'</div>';
      if(e.m==='local')h+='<p>Done by the client on its own infrastructure (here, through the challenge test server\'s API): no ACME message.</p></div><pre class="blk">'+js(e.body)+'</pre>';
      else{
        h+='<p><code>'+esc(e.m)+' '+esc(e.url||'')+'</code> &rarr; <b>'+e.st+'</b>'+(e.loc?' <span class="mute">Location: '+esc(e.loc)+'</span>':'')+(e.ra?' <span class="mute">Retry-After: '+esc(e.ra)+'</span>':'')+'</p></div>';
        if(e.prot)h+='<div class="grid"><div><div class="small mute">JWS protected header (signed)</div><pre class="blk">'+js(e.prot)+'</pre></div><div><div class="small mute">payload'+(e.m==='POST-as-GET'?' (empty: a signed GET)':'')+'</div><pre class="blk">'+(e.pl==null?'""':js(e.pl))+'</pre></div></div>';
        h+='<div class="small mute">response</div><pre class="blk">'+js(e.body)+'</pre>';
      }
      out.innerHTML=h;
    }
    const a=RD.anim({card:'acme-card',ctl:'acme-ctl',n:segs[0].b-segs[0].a,draw,ms:2600,label:'ACME message'});
    RD.seg(pick,m=>{seg=+m;a.reset(segs[seg].b-segs[seg].a)});
    const ari=L.find(e=>/ARI/.test(e.step));
    const w=ari.body.suggestedWindow,iss=L.find(e=>/download the certificate/.test(e.step));
    document.getElementById('ari-txt').textContent='from '+w.start.slice(0,10)+' to '+w.end.slice(0,10)+' for the 90-day certificate it issued on '+D.acme.recorded+', that is about two thirds of the way through its life';
  })();

  // CAA and CT summaries
  (function(){
    const c=D.ct.caa,doms=Object.keys(c);
    const issuers=d=>[...new Set(c[d].filter(x=>/issue "/.test(x)).map(x=>x.split('"')[1].split(';')[0]))];
    document.getElementById('caa-txt').innerHTML=doms.map(d=>'<code>'+d+'</code> '+(c[d].length?'allows '+issuers(d).join(', '):'<b>publishes none</b> (any CA may issue)')).join('; ')+'.';
    const logs=D.ct.logs;const ops=[...new Set(logs.map(l=>l.operator))];
    const per=D.pub.hosts.map(h=>h.chain[0].scts);
    document.getElementById('ct-txt').textContent=per.filter(n=>n===2).length+' leaves with 2 SCTs (all valid under 180 days) and '+per.filter(n=>n===3).length+' with 3 (the ones over 180 days), from '+logs.length+' different logs run by '+ops.join(', ')+'.';
  })();

  // lifetimes chart
  (function(){
    const el=document.getElementById('life-fig');
    const t=s=>Date.parse(s+'T00:00:00Z'),X0=t('2025-01-01'),X1=t('2030-01-01');
    const steps=[['2025-01-01',398,398],['2026-03-15',200,200],['2027-03-15',100,100],['2029-03-15',47,10]];
    function draw(){
      const W=Math.max(300,Math.min(860,RD.width(el))),H=230,ml=40,mr=22,mt=12,mb=34;
      const x=d=>ml+(W-ml-mr)*(t(d)-X0)/(X1-X0),y=v=>mt+(H-mt-mb)*(1-v/420);
      let s='';
      [0,100,200,300,400].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(ml-4,y(v)+4,v,{a:'end',fill:'var(--mute)'})});
      ['2025','2026','2027','2028','2029','2030'].forEach(yr=>{const xx=x(yr+'-01-01');s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>'+RD.t(xx,H-mb+14,yr,{a:'middle',fill:'var(--mute)'})});
      const path=k=>{let p='';steps.forEach((st,i)=>{const nx=i+1<steps.length?steps[i+1][0]:'2030-01-01';p+=(i?'L':'M')+x(st[0])+' '+y(st[k])+' L'+x(nx)+' '+y(st[k])});return p};
      s+='<path d="'+path(1)+'" fill="none" stroke="var(--c1)" stroke-width="2.5"/><path d="'+path(2)+'" fill="none" stroke="var(--c2)" stroke-width="2" stroke-dasharray="5 3"/>';
      const today=x('2026-10-05');s+='<line x1="'+today+'" x2="'+today+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>'+RD.t(today+3,mt+10,'today',{fill:'var(--ink)',fs:10.5});
      D.pub.hosts.forEach(h=>{const c=h.chain[0];s+='<circle cx="'+x(c.not_before)+'" cy="'+y(c.validity_days)+'" r="4.5" fill="var(--c3)" stroke="var(--bg)"><title>'+h.host+': '+c.validity_days.toFixed(0)+' days, issued '+c.not_before+'</title></circle>'});
      s+=RD.t(ml-30,mt+2,'days',{fill:'var(--mute)',fs:10});
      el.innerHTML=RD.svg(W,H,s,'Maximum certificate validity and domain validation reuse, 2025 to 2030, with surveyed leaves');
    }
    document.getElementById('life-leg').innerHTML='<span><svg width="22" height="8"><line x1="0" x2="22" y1="4" y2="4" stroke="var(--c1)" stroke-width="2.5"/></svg>maximum validity (398, 200, 100, 47 days)</span><span><svg width="22" height="8"><line x1="0" x2="22" y1="4" y2="4" stroke="var(--c2)" stroke-width="2" stroke-dasharray="5 3"/></svg>domain-validation reuse (398, 200, 100, 10)</span><span><svg width="10" height="10"><circle cx="5" cy="5" r="4.5" fill="var(--c3)"/></svg>a surveyed leaf (issue date, lifetime)</span>';
    draw();RD.onResize(draw);RD.onRender(draw);
  })();

  // mTLS recorded sizes
  (function(){
    const M=D.hs.mtls;let cr=0,cc=0;
    M.recs.forEach(r=>(r.m||[]).forEach(m=>{if(m.t==='CertificateRequest')cr=m.n;if(m.t==='Certificate'&&r.d==='c2s')cc=m.n}));
    document.getElementById('mt-cr').textContent=fmt(cr);document.getElementById('mt-cc').textContent=fmt(cc);document.getElementById('mt-c2s').textContent=fmt(M.wire.c2s);
  })();

  // certificate rotation
  (function(){
    const R=D.rot,fp=R.sha256_fingerprints,old=fp['old certificate (leaf)'],nw=fp['new certificate (leaf_b)'];
    const tag=v=>v===old?'<span class="pill mid">old '+v.slice(0,8)+'</span>':'<span class="pill ok">new '+v.slice(0,8)+'</span>';
    const s=R.steps;
    document.getElementById('rot-out').innerHTML='<ol class="tight">'+
      '<li>Connection 1 opens: the client sees '+tag(s[0].conn1_sees)+'</li>'+
      '<li>The server calls <code>load_cert_chain()</code> on the same <code>SSLContext</code> with the new certificate and key ('+s[1].ms+' ms).</li>'+
      '<li>Connection 2 opens: the client sees '+tag(s[2].conn2_sees)+'</li>'+
      '<li>Connection 1 still carries data ("'+esc(s[3].server_received)+'" received) under '+tag(s[3].conn1_still_sees)+'</li></ol>'+
      '<p class="small mute">Fingerprints are the first bytes of each certificate\'s SHA-256. Both certificates name api.llm.test and come from the same intermediate.</p>';
    document.getElementById('rot-ms').textContent=s[1].ms;
  })();

  // post-quantum survey text and speed bars
  (function(){
    const H=D.pub.hosts,pq=H.filter(h=>/MLKEM/.test(h.group||'')),no=H.filter(h=>!/MLKEM/.test(h.group||''));
    document.getElementById('pq-txt').innerHTML=pq.length+' of '+H.length+' hosts negotiated X25519MLKEM768 when offered it on '+D.pub.recorded.slice(0,10)+'; '+no.map(h=>'<code>'+h.host+'</code>').join(' and ')+' answered with plain X25519.';
    const S=D.speed,rows=[['ECDSA P-256 sign',S.ecdsa_sign,1],['ECDSA P-256 verify',S.ecdsa_verify,1],['RSA-2048 sign',S.rsa_sign,2],['RSA-2048 verify',S.rsa_verify,2],['X25519 key agreement',S.x25519,3],['ML-KEM-768 encapsulate',S.mlkem_encaps,4],['ML-KEM-768 decapsulate',S.mlkem_decaps,4],['ML-DSA-44 sign',S.mldsa44_sign,5],['ML-DSA-44 verify',S.mldsa44_verify,5],['ML-DSA-65 sign',S.mldsa65_sign,6],['ML-DSA-65 verify',S.mldsa65_verify,6]];
    const mx=Math.max(...rows.map(r=>r[1]));
    document.getElementById('speed-bars').innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+r[0]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:var(--c'+r[2]+')"></span></span><span class="val">'+fmt(Math.round(r[1]))+'/s</span></div>').join('')+'<p class="small mute">Operations per second on one core of an Apple M1 Pro, '+esc(S.ver.split(' (')[0])+', <code>openssl speed -seconds 2</code> (raw/speed.txt).</p>';
  })();

  // trust-store matrix
  (function(){
    const T=D.tm;
    document.getElementById('tm-certifi').textContent=T.certifi;document.getElementById('tm-node').textContent=T.node;
    document.getElementById('tm-tab').innerHTML='<table class="tm"><thead><tr><th>Client</th>'+T.vars.map(v=>'<th>'+(v==='none'?'no variable':'<code>'+v+'</code>')+'</th>').join('')+'</tr></thead><tbody>'+
      T.rows.map(r=>'<tr><td>'+esc(r.c)+'</td>'+T.vars.map(v=>{const c=r.cells[v];return '<td title="'+esc(c[1])+'">'+(c[0]?'<span class="ok">trusted</span>':'<span class="no">fails</span>')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table><p class="small mute">Hover a cell for the exact output. Each variable pointed at the lab root only.</p>';
    const rp=T.repl.filter(x=>x.var==='SSL_CERT_FILE');
    document.getElementById('tm-repl').innerHTML='with <code>SSL_CERT_FILE</code> pointing at the lab root alone, a call to the public <code>'+esc(T.repl.length?'api.anthropic.com':'')+'</code> '+rp.map(x=>'from '+esc(x.client)+(/^OK/.test(x.out)?' still worked (it ignores the variable)':' failed with <code>'+esc(x.out.replace(/^FAIL \w+ /,'').slice(0,60))+'</code>')).join('; ')+'.';
  })();
})();
