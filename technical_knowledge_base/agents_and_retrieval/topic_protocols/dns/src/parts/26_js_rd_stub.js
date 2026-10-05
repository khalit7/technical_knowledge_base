// ---- Shared pod helpers (Reading sections 6 and 7, Pod resolver lab tab) and the Reading tables built from the recordings ----
window.PODX=(function(){
  const P=DNSD.pod;const by={};P.sc.forEach(s=>by[s.label]=s);
  // packets belonging to each getaddrinfo call: those inside [t0, t0 + ms] (times from the pod's own clock)
  function perCall(s){
    return s.calls.map((c,i)=>{const all=s.ev.filter(e=>e.c===i);const ev=all.filter(e=>e.type);
      const q=ev.filter(e=>e.d==='q'),r=ev.filter(e=>e.d==='r');
      return {call:c,ev:ev,all:all,t0:all.length?all[0].t:0,q:q.length,nx:r.filter(e=>e.rcode==='NXDomain').length,sf:r.filter(e=>e.rcode==='ServFail').length,
        names:[...new Set(q.map(e=>e.name))]}});
  }
  const fmt=ms=>ms>=1000?(ms/1000).toFixed(2)+' s':ms.toFixed(1)+' ms';
  return {by,perCall,fmt};
})();
(function(){
  const X=PODX,by=X.by,esc=RD.esc,fmt=X.fmt;const set=(id,h)=>{const e=document.getElementById(id);if(e)e.innerHTML=h};
  const ms=l=>by[l].calls[0].ms;
  set('st-drop',[
    ['glibc_drop_aaaa','glibc, defaults (timeout:5 attempts:2)','The A answer came at once; glibc waited its full 5 s timeout for the AAAA answer, then resent both questions.'],
    ['glibc_drop_aaaa_t1','glibc, <code>options timeout:1 attempts:2</code>','The same loss costs the shorter timeout. A cheap mitigation where loss is real; too short and a slow resolver looks dead.'],
    ['glibc_drop_aaaa_sr','glibc, <code>options single-request-reopen</code>','Still 5 s: this option helps when the loss is caused by the two questions sharing a socket (the conntrack races, section 7), not against any loss.'],
    ['musl_drop_aaaa','musl, defaults','musl resends to all servers every timeout / attempts = 2.5 s, so one loss costs 2.5 s.'],
  ].map(r=>'<tr><td>'+r[1]+'</td><td><b>'+fmt(ms(r[0]))+'</b></td><td>'+r[2]+'</td></tr>').join(''));
  const e1=by.glibc_errors.calls,e2=by.musl_errors.calls;
  set('st-dead',[
    ['First of two servers silent, second fine',fmt(ms('glibc_dead_first')),fmt(ms('musl_dead_first'))],
    ['Only server silent',fmt(ms('glibc_no_server'))+', then failure',fmt(ms('musl_no_server'))+', then failure'],
    ['Resolver answers SERVFAIL (a lame delegation)',fmt(e1[1].ms),fmt(e2[1].ms)],
  ].map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join(''));
  set('st-err',[
    ['NXDOMAIN (<code>nope.llm.test.</code>)',e1[0],e2[0]],['SERVFAIL (<code>x.lame.test.</code>)',e1[1],e2[1]],['No server answers',by.glibc_no_server.calls[0],by.musl_no_server.calls[0]]
  ].map(r=>'<tr><td>'+r[0]+'</td><td><code>'+esc(r[1].error||'')+'</code><br><span class="ts">'+fmt(r[1].ms)+'</span></td><td><code>'+esc(r[2].error||'')+'</code><br><span class="ts">'+fmt(r[2].ms)+'</span></td></tr>').join(''));
  const H=DNSD.pod.http;
  set('st-http','<tr><td>New connection each time (<code>urllib.request.urlopen</code>, like a new client per call)</td><td><b>'+H.keepalive.fresh+'</b></td></tr>'+
    '<tr><td>One <code>http.client.HTTPConnection</code>, but the server closes after each response (the default of Python’s <code>http.server</code>, HTTP/1.0)</td><td><b>'+H.close.pooled+'</b></td></tr>'+
    '<tr><td>One <code>http.client.HTTPConnection</code>, server keeps the connection open (HTTP/1.1 keep-alive)</td><td><b>'+H.keepalive.pooled+'</b></td></tr>');
  // section 7 table
  const rows=[];
  const cfg=[['ndots5','ndots:5 (the default)'],['ndots1','ndots:1'],['ndots5_4dom','ndots:5, 4 search domains']];
  cfg.forEach(([k,lab])=>{const g=X.perCall(by['glibc_'+k]),m=X.perCall(by['musl_'+k]);
    g.forEach((c,i)=>{const mm=m[i];rows.push('<tr><td><code>'+esc(c.call.name)+'</code></td><td>'+lab+'</td><td>'+c.q+' ('+c.nx+')</td><td>'+mm.q+' ('+mm.nx+')</td><td>'+
      (c.call.ok&&mm.call.ok?'<span class="ok">both resolve</span>':(c.call.ok?'<span class="no">fails on musl</span>':(mm.call.ok?'<span class="no">fails on glibc</span>':'NXDOMAIN on both (does not exist)')))+'</td></tr>')})});
  set('k8-tab',rows.join(''));
  const L=DNSD.sec.loop;const lp=document.getElementById('k8-loop');
  if(lp)lp.textContent='# Corefile\n'+L.corefile+'\n$ coredns -conf Corefile      (exit code '+L.exit+')\n'+L.out.filter(l=>/FATAL|CoreDNS-/.test(l)).join('\n');
})();
