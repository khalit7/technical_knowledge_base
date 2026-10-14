// ---- Pipeline lab: PII counts and the constructed before/after example; tab init ----
(function(){
  const C=window.DCP,D=C.D;if(!D||!C.$('pip-pii-caught'))return;
  const esc=C.esc,n0=C.n0,P=D.pii,cb=P.counts_before,ex=P.after_extra_detectors;
  function bars(){
    C.bars(C.$('pip-pii-caught'),[{name:'emails replaced',v:cb.emails,color:'var(--good)'},{name:'of which role addresses (info@, sales@...)',v:cb.emails_role_like,color:'var(--c3)'},{name:'public IPs replaced',v:cb.ip_global,color:'var(--good)'},{name:'private IPs left (by design)',v:cb.ip_not_global,color:'var(--mute)'}],Math.max(cb.emails,ex.matches.phone),v=>n0(v));
    C.bars(C.$('pip-pii-left'),[{name:'phone numbers',v:ex.matches.phone,color:'var(--bad)'},{name:'street addresses',v:ex.matches.street_address,color:'var(--bad)'},{name:'social handles (@name)',v:ex.matches.at_handle,color:'var(--bad)'},{name:'"[email protected]" left by Cloudflare',v:ex.matches.cloudflare_email_placeholder,color:'var(--c5)'},{name:'emails written "name [at] site"',v:ex.matches.obfuscated_email,color:'var(--bad)'}],Math.max(cb.emails,ex.matches.phone),v=>n0(v));
  }
  C.onRender(bars);bars();
  C.$('pip-pii-note').textContent='Counts are matches; documents: '+n0(P.docs_edited)+' of '+n0(P.docs)+' edited by the formatter ('+P.docs_with_email+' with an email, '+P.docs_with_global_ip+' with a public IP); after it, '+ex.docs.phone+' documents still contain a phone-number match, '+ex.docs.street_address+' a street address, '+ex.docs.at_handle+' a handle. The extra detectors are simple regexes written for this lab, so their counts include some false positives (a spot check of 15 phone matches found 14 real business numbers and one run of digits); no matched string is stored or shown. "[email protected]" is what Cloudflare\'s email protection leaves in the HTML: the real address is decoded by a script in the browser, so extractors never see it.';
  const STEPS=[['Original','A constructed page with the kinds of personal data a crawl contains.'],
    ['Email regex','Both addresses match and are replaced in turn by the two placeholders. The club\'s info@ address is an organisation, not a person: the regex cannot tell.'],
    ['IP regex','The public address is replaced; the private 192.168 address is left, because only global addresses are treated as personal (pii.py:34-39).'],
    ['What is left','The phone number, the coach\'s name, the street address and the social handle all survive: nothing in the formatter looks for them.']];
  const RAW='Contact the Riverside Rowing Club at info@riverside-rowing.example or call 0161 496 0123.\nOur coach Sam Taylor (sam.taylor@mail.example) lives at 12 Mill Lane and posts as @samrows.\nLogs: requests from 8.8.4.4 and from 192.168.1.20 were blocked.';
  const em=/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,rep=['email@example.com','firstname.lastname@example.org'];
  function render(i){
    let t=esc(RAW),k=0;
    if(i>=1)t=t.replace(em,()=>'<span style="background:var(--open2)">'+rep[(k++)%2]+'</span>');
    if(i>=2)t=t.replace('8.8.4.4','<span style="background:var(--open2)">22.214.171.124</span>').replace('192.168.1.20','<span style="text-decoration:underline">192.168.1.20</span>');
    if(i>=3)['0161 496 0123','Sam Taylor','12 Mill Lane','@samrows'].forEach(s=>{t=t.replace(esc(s),'<span style="background:var(--hl);outline:1px solid var(--bad)">'+esc(s)+'</span>')});
    C.$('pip-pii-view').innerHTML=t.split('\n').map(l=>'<div class="pip-ln">'+l+'</div>').join('');
    C.$('pip-pii-cap').innerHTML='<div class="t">Step '+(i+1)+' of 4: '+esc(STEPS[i][0])+'</div><p style="margin:2px 0">'+esc(STEPS[i][1])+'</p>';
  }
  C.anim({card:'pip-pii-view',ctl:'pip-pii-ctl',n:4,draw:render,ms:2600,label:'PII step'});
})();
// ---- Pipeline lab: predict-then-reveal widgets, links into other tabs, in-tab section links ----
(function(){
  const t=document.getElementById('t-pipe');if(!t||!window.DCP)return;
  t.querySelectorAll('.pip-pr[data-ans]').forEach(el=>window.DCP.predict(el));
  window.DCP.goLinks(t);
  t.querySelectorAll('.pip-nav a').forEach(a=>a.addEventListener('click',e=>{const s=document.getElementById(a.getAttribute('href').slice(1));if(s){e.preventDefault();s.scrollIntoView({block:'start'})}}));
})();
