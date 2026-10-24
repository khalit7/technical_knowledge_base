// ---- Reading tab, part 1: drills, the Agent Card, signing, message anatomy, the bindings table ----
(function(){
  const D=window.A2AD,esc=RD.esc,$=id=>document.getElementById(id);
  const steps=k=>D.scen[k].steps;
  // predict-then-reveal drills
  document.querySelectorAll('#t-read .pr').forEach(p=>{const right=p.dataset.right;
    p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      p.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));
      b.classList.add(b.dataset.k===right?'right':'wrong');
      p.querySelector('[data-k="'+right+'"]').classList.add('right');p.querySelector('.ans').hidden=false}))});
  // the Agent Card
  const FIELDS=[['name, description, version','Who this is. version changes when the card changes (useful for cache keys and change alerts).'],
    ['supportedInterfaces','Each entry: url, protocolBinding (JSONRPC, GRPC, HTTP+JSON), protocolVersion, optional tenant. Preference order: the first one you support wins.'],
    ['provider','The organisation behind the agent (informational: not proof).'],
    ['capabilities','streaming, pushNotifications, extendedAgentCard, extensions. Absent means unsupported.'],
    ['securitySchemes / securityRequirements','How to authenticate: named schemes (here one bearer scheme) and which ones a request must satisfy.'],
    ['defaultInputModes / defaultOutputModes','Media types the agent accepts and returns unless a skill says otherwise.'],
    ['skills','What a calling model reads to choose the agent: id, name, description, tags, examples. Claims, not proof.'],
    ['signatures (absent here)','Optional JWS signatures over the canonical card (section 2, below).']];
  function card(m){const el=$('rd-card-body');
    if(m==='json')el.innerHTML='<pre class="raw">'+esc(D.card)+'</pre>';
    else if(m==='wire')el.innerHTML=D.card_wire.map((w,i)=>'<div class="small mute">'+['request 1','response 1 ('+D.card_status[0]+')','request 2, conditional','response 2 ('+D.card_status[1]+')'][i]+'</div><pre class="raw">'+esc(w)+'</pre>').join('');
    else el.innerHTML='<dl class="kv">'+FIELDS.map(f=>'<dt><code>'+esc(f[0])+'</code></dt><dd>'+esc(f[1])+'</dd>').join('')+'</dl>'}
  RD.seg($('rd-card-seg'),card);card('json');
  // signing
  const S=D.signing;let hdr='';try{hdr=atob(S.signature.protected.replace(/-/g,'+').replace(/_/g,'/'))}catch(e){hdr=S.signature.protected}
  $('rd-sign').innerHTML='<div class="out">'+RD.stat('Protected header (decoded)','<span style="font-size:12.5px;font-weight:400">'+esc(hdr)+'</span>','base64url in the card')+
    RD.stat('Verify the card as signed','<span style="color:var(--good)">'+esc(S.verify_original)+'</span>','ES256 over the RFC 8785 form')+
    RD.stat('After adding " Also deletes checkpoints."','<span style="color:var(--bad);font-size:14px">'+esc(S.verify_tampered)+'</span>','the canonical bytes changed')+'</div>';
  // message anatomy
  const main=steps('main');
  const firstReq=main.find(s=>s.dir==='up'&&s.title.indexOf('SendStreamingMessage')===0);
  const art=main.find(s=>s.title.indexOf('scores.json')>=0);
  const fin=main[main.length-1];
  const AN={req:firstReq.raw,art:art.raw,task:fin.raw};
  RD.seg($('rd-anat-seg'),m=>{$('rd-anat').textContent=AN[m]});$('rd-anat').textContent=AN.req;
  // bindings
  function bind(b){const x=D.bindings[b];
    $('rd-bind-stats').innerHTML=RD.stat('Bytes up',x.up.toLocaleString('en-US'),'client to agent')+RD.stat('Bytes down',x.down.toLocaleString('en-US'),'agent to client')+RD.stat('Time for the call',x.ms+' ms','loopback, scripted agent');
    $('rd-bind-req').textContent=x.req}
  RD.seg($('rd-bind-seg'),bind);bind('JSONRPC');
})();
