// ---- VLM lab: the prompt (section 4), question set, hallucination probe, descriptions, timing ----
(function(){
  const V=window.VL;if(!V||!V.D)return;const D=V.D,$=V.$,esc=V.esc;
  // section 4: template, expanded prompt, token kinds
  $('vl-tmpl').textContent=D.prompt.template;$('vl-exp').textContent=D.prompt.expanded;
  const K=D.prompt.kinds,tot=Object.values(K).reduce((a,b)=>a+b,0),kc={image:'--c1',pos:'--c4',wrap:'--c5',text:'--c3',special:'--mute'},kn={image:'image',pos:'tile tags',wrap:'wrappers',text:'text',special:'special'};
  $('vl-kinds').innerHTML='<span class="small">'+V.comma(tot)+' tokens</span><div class="sb">'+['image','pos','wrap','text','special'].map(k=>'<span style="width:'+(100*K[k]/tot)+'%;background:var('+kc[k]+')" title="'+kn[k]+' '+K[k]+'">'+(K[k]/tot>.25?kn[k]+' '+V.comma(K[k]):'')+'</span>').join('')+'</div>'+
    '<span></span><span class="small mute">'+['pos','wrap','text','special'].map(k=>kn[k]+' '+K[k]).join(', ')+' <span class="vl-tag vl-meas">measured</span></span>';
  const imgName=k=>D.names[k]||k;
  const th=k=>'<img src="'+D.thumbs[k]+'" alt="'+esc(imgName(k))+'" width="56" height="56">';
  // question set
  const B=D.qa.budgets;D.qa.tok={};B.forEach(b=>{D.qa.tok[b]=+(b.match(/\((\d+)/)||[0,0])[1]});let qb=B[B.length-1],qf='all';
  function qaDraw(){
    const A=D.qa.ans[qb],kinds=D.qa.kinds;
    $('vl-qa-bars').innerHTML=kinds.map(k=>{const its=D.qa.items.filter(i=>i.kind===k),ok=its.filter(i=>A[i.id][1]).length;
      return '<div class="row"><span class="nm">'+k+'<span class="vl-sub">'+its.length+' question'+(its.length>1?'s':'')+'</span></span><span class="track"><span class="fill" style="width:'+(100*ok/its.length)+'%;background:var(--c1)"></span></span><span class="val">'+ok+' / '+its.length+'</span></div>'}).join('')+
      '<div class="row hl"><span class="nm">all</span><span class="track"><span class="fill" style="width:'+(100*D.qa.summary[qb].right/D.qa.items.length)+'%;background:var(--c3)"></span></span><span class="val">'+D.qa.summary[qb].right+' / '+D.qa.items.length+'</span></div>';
    $('vl-qa-list').innerHTML=D.qa.items.filter(i=>qf==='all'||(qf==='wrong'?!A[i.id][1]:qf==='changed'?B.some(b=>D.qa.ans[b][i.id][1]!==A[i.id][1]):true)).map(i=>
      '<div class="vl-q">'+th(i.image)+'<div><b>'+esc(i.q)+'</b> <span class="mute small">('+i.kind+'; truth: '+esc(i.truth)+')</span><div class="vl-a">'+
      B.map(b=>{const a=D.qa.ans[b][i.id];return '<span class="'+(b===qb?'':'mute')+'">'+V.comma(D.qa.tok[b])+' tok</span><span'+(b===qb?'':' class="mute"')+'><span class="'+(a[1]?'vl-ok':'vl-no')+'">'+(a[1]?'&#10003;':'&#10007;')+'</span> '+esc(a[0])+'</span>'}).join('')+'</div></div></div>').join('')||'<p class="mute small">No questions in this view.</p>';
  }
  V.seg($('vl-qa-b'),B.map(b=>[b,esc(D.qa.short[b])]),qb,v=>{qb=v;qaDraw()});
  V.seg($('vl-qa-f'),[['all','all 30'],['wrong','wrong at this budget'],['changed','changes with budget']],'all',v=>{qf=v;qaDraw()});
  qaDraw();
  // POPE
  const PB=D.pope.budgets;let pb=PB[PB.length-1];
  function popeDraw(){
    const s=D.pope.summary;
    $('vl-pope-stats').innerHTML=PB.map(b=>V.stat(esc(D.qa.short[b]),V.pct(s[b].acc,1)+' right','yes on absent: '+s[b].yes_absent+' / '+s[b].n_absent+'; yes on present: '+s[b].yes_present+' / '+s[b].n_present)).join('');
    const rows=[['present','present (should be yes)'],['absent_random','absent, random'],['absent_adversarial','absent, adversarial']];
    $('vl-pope-bars').innerHTML='<p class="small mute" style="margin:4px 0">Share answered &#8220;yes&#8221;, default budget dark, one view light</p>'+rows.map(r=>PB.slice().reverse().map((b,j)=>{const v=s[b].yes_rate[r[0]];
      return '<div class="row'+(j?'':' hl')+'"><span class="nm">'+(j?'':r[1])+'<span class="vl-sub">'+esc(D.qa.short[b])+'</span></span><span class="track"><span class="fill" style="width:'+(100*v)+'%;background:var(--'+(r[0]==='present'?'c3':'c2')+');opacity:'+(j?.5:1)+'"></span></span><span class="val">'+V.pct(v,0)+'</span></div>'}).join('')).join('');
    const A=D.pope.ans[pb];
    $('vl-pope-tab').innerHTML='<table><thead><tr><th>Image</th><th>Object</th><th>Kind</th><th>Answer</th></tr></thead><tbody>'+D.pope.items.map((it,i)=>{const a=A[i],right=(it.kind==='present')===a[1];
      return '<tr><td>'+esc(imgName(it.image))+'</td><td>'+esc(it.obj)+'</td><td>'+it.kind.replace('absent_','absent, ')+'</td><td><span class="'+(right?'vl-ok':'vl-no')+'">'+(right?'&#10003;':'&#10007;')+'</span> '+esc(a[0])+'</td></tr>'}).join('')+'</tbody></table>';
  }
  V.seg($('vl-pope-b'),PB.map(b=>[b,esc(D.qa.short[b])]),pb,v=>{pb=v;popeDraw()});popeDraw();
  // descriptions
  let ck=D.captions[0].image;
  function capDraw(){const c=D.captions.find(x=>x.image===ck);let h='',p=0;
    c.marks.forEach(m=>{h+=esc(c.text.slice(p,m[0]))+'<mark class="vl-h" title="'+esc(m[2])+'">'+esc(c.text.slice(m[0],m[1]))+'</mark>';p=m[1]});h+=esc(c.text.slice(p));
    $('vl-cap').innerHTML='<div class="vl-cl"><img src="'+D.thumbs[ck]+'" alt="'+esc(imgName(ck))+'" width="72" height="72"><div><b>'+esc(imgName(ck))+'</b> <span class="mute small">('+c.new_tokens+' tokens, '+c.seconds.toFixed(1)+' s)</span><br>'+h+
      (c.marks.length?'<ul class="vl-notes">'+c.marks.map(m=>'<li><b>'+esc(c.text.slice(m[0],m[1]))+'</b>: '+esc(m[2])+'</li>').join('')+'</ul>':'<p class="small mute">No wrong claims marked.</p>')+'</div></div>';
    $('vl-cap-th').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===ck))}
  $('vl-cap-th').innerHTML=D.captions.map(c=>'<button data-k="'+c.image+'" aria-label="'+esc(imgName(c.image))+'" title="'+esc(imgName(c.image))+(c.marks.length?' ('+c.marks.length+' marked)':'')+'"><img src="'+D.thumbs[c.image]+'" alt=""></button>').join('');
  $('vl-cap-th').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ck=b.dataset.k;capDraw()}));capDraw();
  // timing
  const R=D.timing.runs,mx=Math.max(...R.map(r=>r.prefill_seconds+20*r.decode_seconds_per_token));
  $('vl-time-bars').innerHTML='<p class="small mute" style="margin:4px 0">Seconds for one image and a 20-token answer: encoder (blue), prefill (orange), decode (green) <span class="vl-tag vl-meas">measured</span></p>'+R.map(r=>{const a=r.vision_seconds,b=r.lm_prefill_seconds,c=20*r.decode_seconds_per_token;
    return '<div class="row"><span class="nm">'+esc(D.qa.short[r.budget])+'<span class="vl-sub">'+V.comma(r.prompt_tokens)+' prompt tokens</span></span><span class="track">'+
      '<span class="fill" style="left:0;width:'+(100*a/mx)+'%;background:var(--c1);border-radius:3px 0 0 3px"></span><span class="fill" style="left:'+(100*a/mx)+'%;width:'+(100*b/mx)+'%;background:var(--c2);border-radius:0"></span><span class="fill" style="left:'+(100*(a+b)/mx)+'%;width:'+(100*c/mx)+'%;background:var(--c3);border-radius:0 3px 3px 0"></span></span><span class="val">'+(a+b+c).toFixed(2)+' s</span></div>'}).join('');
  $('vl-time-tab').innerHTML='<table><thead><tr><th>Budget</th><th class="num">Views</th><th class="num">Prompt tokens</th><th class="num">Encoder + projector</th><th class="num">Language-model prefill</th><th class="num">Decode per token</th><th class="num">Peak GPU memory</th></tr></thead><tbody>'+
    R.map(r=>'<tr><td>'+esc(D.qa.short[r.budget])+'</td><td class="num">'+r.tiles+'</td><td class="num">'+V.comma(r.prompt_tokens)+'</td><td class="num">'+(1000*r.vision_seconds).toFixed(0)+' ms</td><td class="num">'+(1000*r.lm_prefill_seconds).toFixed(0)+' ms</td><td class="num">'+(1000*r.decode_seconds_per_token).toFixed(1)+' ms</td><td class="num">'+V.comma(r.peak_mps_mb)+' MiB</td></tr>').join('')+'</tbody></table>';
  // parameters (section 5)
  const PR=D.trace.params,pm=Math.max(...Object.values(PR));
  $('vl-params').innerHTML=Object.keys(PR).map(k=>'<div class="row'+(k.indexOf('connector')===0?' hl':'')+'"><span class="nm">'+esc(k)+'</span><span class="track"><span class="fill" style="width:'+(100*PR[k]/pm)+'%;background:var(--'+(k.indexOf('connector')===0?'c2':'c1')+')"></span></span><span class="val">'+(PR[k]/1e6).toFixed(1)+'M</span></div>').join('');
  document.getElementById('vl-pr1-b').addEventListener('click',()=>{$('vl-pr1').hidden=false});
})();
