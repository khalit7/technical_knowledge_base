// ---- Section 10: webhook deliveries replayed (naive against careful receiver), signature results ----
(function(){
  const D=window.SDATA,esc=RD.esc,H=D.hooks;
  const pre=document.getElementById('wh-sig');
  if(pre){const s=H.signatures.standard_webhooks,g=H.signatures.github_vector;
    pre.textContent='GitHub test vector\n  computed  '+g.computed+'\n  published '+g.published+'\n\nStandard Webhooks (standardwebhooks library, made-up secret)\n  signed content     '+s.signed_content+'\n  webhook-signature  '+s.signature_header_example+
      '\n  raw body           -> '+s.raw_body+'\n  re-serialised body -> '+s.reserialised+'\n                        '+s.reserialised_body+'\n  10 minutes old     -> '+s.ten_minutes_old}
  const card=document.getElementById('wh-card');if(!card)return;
  const L={naive:H.delivery.naive.log,careful:H.delivery.careful.log};
  const T=[...new Set(L.naive.concat(L.careful).map(r=>r.t))].sort((a,b)=>a-b);
  const cls=r=>r.sender?'snd':r.what==='work done'?'wk':/503|duplicate/.test(r.what)?'bad':'';
  const txt=r=>(r.sender?'sender, '+r.event+': '+r.what.replace(/^attempt (\d+): /,'attempt $1 sent (result: ')+')':r.event+': '+r.what)+(r.status_stored?' (stored status: '+r.status_stored+')':'');
  function list(id,log,t){document.getElementById(id).innerHTML=log.map(r=>'<li class="'+cls(r)+(r.t<=t?(Math.abs(r.t-t)<1e-9?' cur':' on'):'')+'"><span class="tt">'+r.t.toFixed(2)+' s</span> '+esc(txt(r))+'</li>').join('')}
  function draw(i){const t=T[i];list('wh-naive',L.naive,t);list('wh-careful',L.careful,t);
    const now=L.naive.concat(L.careful).filter(r=>Math.abs(r.t-t)<1e-9);
    document.getElementById('wh-cap').innerHTML='<div class="t">'+t.toFixed(3)+' s</div><p>'+now.map(r=>(L.naive.includes(r)?'Naive: ':'Careful: ')+esc(txt(r))).join('<br>')+'</p>';
    const c=m=>{const done=L[m].filter(r=>r.t<=t&&r.what==='work done');const st=done.length?done[done.length-1].status_stored:'(none)';
      const att=L[m].filter(r=>r.t<=t&&r.sender).length;return [done.length,st,att]};
    const a=c('naive'),b=c('careful');
    document.getElementById('wh-cnt').innerHTML=RD.stat('Naive','work ran '+a[0]+(a[0]===1?' time':' times'),'stored status: '+a[1]+'; '+a[2]+' delivery attempts')+RD.stat('Careful','work ran '+b[0]+(b[0]===1?' time':' times'),'stored status: '+b[1]+'; '+b[2]+' delivery attempts')}
  RD.anim({card:'wh-card',ctl:'wh-ctl',n:T.length,draw,ms:900,label:'Step'});
})();
