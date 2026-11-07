// ---- Section 9: the recorded webhook delivery log (both receivers) and the signature results ----
(function(){
  const D=window.SDATA,esc=RD.esc,H=D.hooks;
  const pre=document.getElementById('wh-sig');
  if(pre){const s=H.signatures.standard_webhooks,g=H.signatures.github_vector;
    pre.textContent='GitHub test vector\n  computed  '+g.computed+'\n  published '+g.published+'\n\nStandard Webhooks (standardwebhooks library, made-up secret)\n  signed content     '+s.signed_content+'\n  webhook-signature  '+s.signature_header_example+
      '\n  raw body           -> '+s.raw_body+'\n  re-serialised body -> '+s.reserialised+'\n                        '+s.reserialised_body+'\n  10 minutes old     -> '+s.ten_minutes_old}
  if(!document.getElementById('wh-naive'))return;
  // the full recorded log of both runs, every line shown (Fig. 9 replays them; this is the evidence)
  const L={naive:H.delivery.naive.log,careful:H.delivery.careful.log};
  const cls=r=>r.sender?'snd':r.what==='work done'?'wk':/503|duplicate/.test(r.what)?'bad':'';
  const txt=r=>(r.sender?'sender, '+r.event+': '+r.what.replace(/^attempt (\d+): /,'attempt $1 sent (result: ')+')':r.event+': '+r.what)+(r.status_stored?' (stored status: '+r.status_stored+')':'');
  ['naive','careful'].forEach(m=>{document.getElementById('wh-'+m).innerHTML=L[m].map(r=>'<li class="'+cls(r)+' on"><span class="tt">'+r.t.toFixed(2)+' s</span> '+esc(txt(r))+'</li>').join('')});
})();
