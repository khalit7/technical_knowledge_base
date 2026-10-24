// ---- Tab "Commerce lab": UCP capability intersection against a real profile, and the checkout escalation decision ----
window.UCPN=(function(){
  // The spec's three steps. biz, plat: {name: [{version, extends?}]}. Returns per-name outcome and the active set.
  function negotiate(biz,plat){
    const out={},act={};
    Object.keys(biz).concat(Object.keys(plat).filter(k=>!biz[k])).forEach(k=>{
      if(!biz[k]||!plat[k]){out[k]={r:'name',why:!biz[k]?'only the platform declares it':'only the business declares it'};return}
      const bv=biz[k].map(e=>e.version),pv=plat[k].map(e=>e.version),common=bv.filter(v=>pv.indexOf(v)>=0).sort();
      if(!common.length){out[k]={r:'version',why:'no common version (business '+bv.join(', ')+'; platform '+pv.join(', ')+')'};return}
      const v=common[common.length-1],e=biz[k].find(x=>x.version===v);act[k]={version:v};if(e.extends)act[k].extends=e.extends;out[k]={r:'kept',why:'version '+v}});
    let changed=true,rounds=0;
    while(changed){changed=false;rounds++;Object.keys(act).forEach(k=>{const ex=act[k].extends;if(!ex)return;const ps=[].concat(ex);
      if(!ps.some(p=>act[p])){delete act[k];out[k]={r:'pruned',why:'none of its parents ('+ps.join(', ')+') survived'};changed=true}})}
    return {out,act,rounds};
  }
  return {negotiate};
})();
(function(){
  const D=window.A2AD,esc=RD.esc,$=id=>document.getElementById(id);
  const BIZ=D.ucp.capabilities,names=Object.keys(BIZ),V=[D.ucp.version].concat(Object.keys(D.ucp.supported_versions||{}));
  const LOY='com.example.loyalty';
  let plat={};
  function preset(m){plat={};
    const add=(k,v)=>{plat[k]=[{version:v||D.ucp.version}]};
    if(m==='full')names.forEach(k=>add(k));
    if(m==='co'){['dev.ucp.shopping.checkout','dev.ucp.shopping.fulfillment','dev.ucp.shopping.discount','dev.ucp.shopping.order'].forEach(k=>add(k))}
    if(m==='old')names.forEach(k=>add(k,'2026-04-08'));
    if(m==='cat'){['dev.ucp.shopping.catalog.search','dev.ucp.shopping.catalog.lookup','dev.shopify.catalog'].forEach(k=>add(k))}
    if(m==='loy'){names.forEach(k=>add(k));plat[LOY]=[{version:'2026-09-01',extends:'dev.ucp.shopping.checkout'}]}
    draw()}
  function draw(){const r=UCPN.negotiate(BIZ,plat);
    const rows=names.concat(plat[LOY]?[LOY]:[]);
    $('uc-t').innerHTML='<thead><tr><th>Capability or extension (business offers)</th><th>Platform declares</th><th>Result</th></tr></thead><tbody>'+rows.map(k=>{
      const b=BIZ[k],o=r.out[k]||{r:'name',why:''},ext=b&&b[0].extends?' <span class="mute small">extends '+esc([].concat(b[0].extends).join(', '))+'</span>':'';
      const sel=k===LOY?'<code>2026-09-01</code>':'<select data-k="'+esc(k)+'" aria-label="Platform version for '+esc(k)+'"><option value="">not declared</option>'+V.map(v=>'<option'+(plat[k]&&plat[k][0].version===v?' selected':'')+'>'+v+'</option>').join('')+'</select>';
      return '<tr><td><code>'+esc(k)+'</code>'+ext+'<div class="small mute">business: '+(b?b.map(e=>e.version).join(', '):'not offered')+'</div></td><td>'+sel+'</td><td><span class="'+(o.r==='kept'?'k':'x')+'">'+
        {kept:'active',name:'dropped (name)',version:'dropped (version)',pruned:'pruned'}[o.r]+'</span><div class="small mute">'+esc(o.why)+'</div></td></tr>'}).join('')+'</tbody>';
    const n=Object.keys(r.act).length;
    $('uc-stats').innerHTML=RD.stat('Active',n+' of '+names.length,'business entries in use')+RD.stat('Pruning passes',r.rounds,'until nothing changed')+
      RD.stat('Checkout possible',r.act['dev.ucp.shopping.checkout']?'yes':'no','dev.ucp.shopping.checkout active');
    $('uc-out').textContent='// what the business would confirm in its responses (capabilities part only)\n'+JSON.stringify({ucp:{version:D.ucp.version,capabilities:r.act}},null,1)}
  $('uc-t').addEventListener('change',e=>{const s=e.target.closest('select[data-k]');if(!s)return;const k=s.dataset.k;
    if(s.value)plat[k]=[{version:s.value}];else delete plat[k];document.querySelectorAll('#uc-pre button').forEach(b=>b.classList.remove('on'));draw()});
  RD.seg($('uc-pre'),preset);preset('full');
  // ---------- escalation decision ----------
  const MSG=[{code:'invalid_phone',severity:'recoverable',path:'$.buyer.phone_number',content:'Phone number format is invalid'},
    {code:'schedule_delivery',severity:'requires_buyer_input',content:'Select delivery window for your purchase'},
    {code:'high_value_order',severity:'requires_buyer_review',content:'Orders over $500 require additional verification'},
    {code:'out_of_stock',severity:'unrecoverable',content:'All requested items are currently out of stock'}];
  const on={invalid_phone:true,schedule_delivery:false,high_value_order:false,out_of_stock:false};
  function decide(){const m=MSG.filter(x=>on[x.code]),has=s=>m.some(x=>x.severity===s);
    let status,action,url=false;
    if(has('unrecoverable')){status='no checkout (ucp.status "error")';action='Retry with a new resource or inputs, or hand off via continue_url.';url=true}
    else if(has('requires_buyer_input')||has('requires_buyer_review')){status='requires_escalation';url=true;
      action=(has('recoverable')?'First fix the recoverable error(s) and call Update Checkout; then ':'')+'hand the buyer the continue_url: '+(has('requires_buyer_input')?'"incomplete, additional input from buyer is required".':'"ready for final review by the buyer".')}
    else if(has('recoverable')){status='incomplete';action='Fix the field at each error\'s path (for example reformat $.buyer.phone_number), call Update Checkout, and re-read the response.'}
    else {status='ready_for_complete';action='Nothing outstanding: the platform may call Complete Checkout (with the buyer\'s approval on a trusted surface unless AP2 mandates are used).'}
    return {status,action,url}}
  function drawH(){$('uh-msgs').innerHTML=MSG.map(x=>'<label class="chk" style="display:block;white-space:normal;margin:4px 0"><input type="checkbox" data-c="'+x.code+'"'+(on[x.code]?' checked':'')+'> <code>'+x.code+'</code> <span class="mute">('+x.severity+')</span> '+esc(x.content)+'</label>').join('');
    const d=decide();
    $('uh-out').innerHTML='<dl class="kv"><dt>Checkout status</dt><dd><b><code>'+esc(d.status)+'</code></b></dd><dt>Platform does</dt><dd>'+esc(d.action)+'</dd><dt>continue_url</dt><dd>'+(d.url?'required (the buyer finishes on the merchant\'s page)':'not needed')+'</dd></dl>'}
  $('uh-msgs').addEventListener('change',e=>{const c=e.target.dataset.c;if(!c)return;on[c]=e.target.checked;drawH()});drawH();
})();
