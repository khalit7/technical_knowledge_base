// ---- Reading section 13: predict, then reveal. Every answer quotes this page's recordings. ----
(function(){
  const el=document.getElementById('rd-drills');if(!el)return;const X=PODX,by=X.by,fmt=X.fmt;
  const g5=X.perCall(by.glibc_ndots5)[0],g1=X.perCall(by.glibc_ndots1)[0],H=DNSD.pod.http;
  const D=[
    {q:'A glibc pod with the default Kubernetes resolv.conf (three search domains, ndots:5) looks up <code>api.llm.test</code> once. How many DNS queries does it send?',
     o:['2','4','8','10'],a:2,e:'Two dots is fewer than five, so the three search suffixes are tried first, each for A and AAAA, then the name as written: 4 names &times; 2 types. Recorded: '+g5.q+' queries, '+g5.nx+' of them NXDOMAIN; with ndots:1, '+g1.q+'.',s:'rd-k8s'},
    {q:'One of the A/AAAA pair is lost on the way to the resolver. How long does glibc\'s getaddrinfo take with default settings?',
     o:['About the round trip, a few ms','About 1 s','About 2.5 s','About 5 s'],a:3,e:'glibc waits its whole timeout (5 s) before resending. Recorded: '+fmt(by.glibc_drop_aaaa.calls[0].ms)+'; musl, which resends every timeout / attempts, took '+fmt(by.musl_drop_aaaa.calls[0].ms)+'.',s:'rd-stub'},
    {q:'You set ndots:1 on an Alpine (musl) pod to cut the query count. What happens to <code>kubernetes.default</code>?',
     o:['It resolves, with fewer queries','It resolves, slower','It fails: musl never falls back to the search list for a name with at least ndots dots','Nothing changes'],a:2,
     e:'glibc tries the name as written, gets NXDOMAIN and then tries the search list; musl stops at the first NXDOMAIN. Recorded: glibc '+(X.perCall(by.glibc_ndots1)[2].call.ok?'resolved it':'failed')+', musl returned "'+(by.musl_ndots1.calls[2].error||'')+'".',s:'rd-k8s'},
    {q:'A resolver fetched a record with TTL 30. Five seconds later you change the address at the authoritative server. When does the resolver start giving the new address?',
     o:['Immediately','About 5 s later','About 25 s later, when its copy expires','After the SOA refresh interval'],a:2,e:'Caches are never told; they expire. The recorded run served the old address with the TTL counting down to 1, then fetched the new one about 30 s after the first fetch.',s:'rd-ttl'},
    {q:'A deploy script looked up <code>gone.llm.test</code> just before creating it. The zone\'s SOA has TTL 300 and MINIMUM 30. How long can the resolver keep saying it does not exist?',
     o:['0 s','30 s','300 s','Until the serial changes'],a:1,e:'Negative TTL = min(SOA TTL, MINIMUM) = min(300, 30) = 30 s (RFC 2308). Recorded: NXDOMAIN until about 30 s after the first lookup, although the record existed after a few seconds.',s:'rd-ttl'},
    {q:'<code>dig name</code> returns SERVFAIL; <code>dig name +cd</code> returns an address. Where is the problem?',
     o:['The network','The authoritative server is down','DNSSEC validation','The client\'s search list'],a:2,e:'CD (checking disabled) skips validation; if that makes the answer appear, signatures or keys are broken. The lab\'s expired-signature run and the public dnssec-failed.org both show it.',s:'rd-sec'},
    {q:'resolv.conf lists two nameservers and the first one has died silently. What does every lookup cost?',
     o:['Nothing on glibc or musl','About 5 s on glibc, almost nothing on musl','About 5 s on both','It fails on both'],a:1,e:'glibc asks in order and moves on after its timeout; musl asks all at once. Recorded: glibc '+fmt(by.glibc_dead_first.calls[0].ms)+', musl '+fmt(by.musl_dead_first.calls[0].ms)+'.',s:'rd-stub'},
    {q:'From a pod with ndots:5, Python makes 10 requests to <code>api.llm.test</code>, opening a new connection each time. How many DNS packets does the pod send?',
     o:['1','2','About 20','About 80'],a:3,e:'No cache anywhere in the process: 10 lookups &times; 8 queries. Recorded: '+H.keepalive.fresh+' with new connections, '+H.keepalive.pooled+' over one kept-alive connection.',s:'rd-stub'},
    {q:'An agent\'s fetch tool resolves the URL\'s host, refuses internal addresses, then calls <code>urlopen(url)</code>. Is it safe against DNS rebinding?',
     o:['Yes, it checked','Only if the TTL is long','No: urlopen resolves again and may get a different answer','Only over HTTPS'],a:2,e:'The recorded run fetched the metadata stand-in\'s fake credential this way. Resolve once, check the address, connect to that address.',s:'rd-att'}];
  el.innerHTML=D.map((d,i)=>'<div class="drill" data-i="'+i+'"><div class="dq">'+(i+1)+'. '+d.q+'</div><div class="dopts">'+d.o.map((o,j)=>'<button data-j="'+j+'">'+o+'</button>').join('')+'</div><div class="dans" hidden></div></div>').join('');
  el.addEventListener('click',ev=>{const b=ev.target.closest('button[data-j]');if(!b)return;const box=b.closest('.drill');const d=D[+box.dataset.i];const j=+b.dataset.j;
    box.querySelectorAll('button[data-j]').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.j===d.a)x.classList.add('right')});if(j!==d.a)b.classList.add('wrong');
    const a=box.querySelector('.dans');a.hidden=false;a.innerHTML=(j===d.a?'<span class="ok">Right.</span> ':'<span class="no">Not quite.</span> ')+d.e+' <a href="#'+d.s+'">Section</a>';});
})();
