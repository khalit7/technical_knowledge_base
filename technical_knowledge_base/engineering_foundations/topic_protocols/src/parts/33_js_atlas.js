// ---- Protocol atlas (t-atlas): shared helpers, view switch, detail card, corrections ----
window.AT=(function(){
  const D=window.AT_DATA;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // inline markdown used in the data: **bold**, `code` and [text](url)
  const md=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const link=(t,u)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
  const E={};D.entries.forEach(e=>E[e.id]=e);
  const G={};D.groups.forEach(g=>G[g.id]=g);
  // what runs on e (reverse edges)
  const UP={};D.entries.forEach(e=>(e.runs_on||[]).forEach(t=>{(UP[t]=UP[t]||[]).push(e.id)}));
  const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-atlas']=window.TAB_RENDER['t-atlas']||[]).push(f)};
  const visible=()=>{const t=$('t-atlas');return !!(t&&!t.hidden)};
  // typical path: follow the first 'runs on' down to the wire
  function path(id){const out=[];let cur=id,guard=0;while(cur&&guard++<12){out.push(cur);const r=(E[cur].runs_on||[]);cur=r[0]}return out}
  // terminal text: escape and colour the prompt, errors and successes
  function term(txt){
    let h='';
    (txt||'').split('\n').forEach(l=>{const e=esc(l);
      if(/^\$ /.test(l))h+='<span class="p">'+e+'</span>\n';
      else if(/^\[exit [1-9]/.test(l)||/curl: \(\d+\)|error|failed|False$/.test(l))h+='<span class="e">'+e+'</span>\n';
      else if(/^\[exit 0\]/.test(l))h+='<span class="m">'+e+'</span>\n';
      else if(/101 Switching|Verification: OK|succeeded|True$|grpc-status: 0|X25519MLKEM768/.test(l))h+='<span class="ok">'+e+'</span>\n';
      else h+=e+'\n';});
    return h.replace(/\n$/,'');
  }
  const chipBtn=id=>'<button type="button" data-at-open="'+id+'">'+esc(E[id]?E[id].name:id)+'</button>';
  function detailHTML(id){
    const e=E[id];if(!e)return '';
    let h='<h3>'+esc(e.name)+'</h3><p class="full">'+esc(e.full)+'</p>';
    h+='<div>'+'<span class="tag">'+esc(G[e.group].label)+'</span>'+(e.year?'<span class="tag">since '+e.year+'</span>':'')+'<span class="tag">'+esc(e.body)+'</span></div>';
    h+='<p class="plain">'+md(e.plain)+'</p>';
    const runs=(e.runs_on||[]),ups=(UP[id]||[]),uses=(e.uses||[]);
    let rel='';
    if(runs.length)rel+='<dt>Runs on</dt><dd><span class="at-mini">'+runs.map(chipBtn).join('')+'</span></dd>';
    if(uses.length)rel+='<dt>Also uses</dt><dd><span class="at-mini">'+uses.map(chipBtn).join('')+'</span></dd>';
    if(ups.length)rel+='<dt>Carries</dt><dd><span class="at-mini">'+ups.map(chipBtn).join('')+'</span></dd>';
    const p=path(id);
    if(p.length>1)rel+='<dt>Typical path</dt><dd><span class="at-path">'+p.map(x=>esc(E[x].name)).join('<span class="a"> on </span>')+'</span></dd>';
    if(e.brief){
      h+='<dl class="at-kv">'+rel+'</dl>';
      h+='<p class="small">Details: '+D.fabric_links.map(l=>link(l.t,l.u)).join(', ')+'.</p>';
    }else{
      h+='<dl class="at-kv">'+
        '<dt>Current version</dt><dd>'+md(e.cur)+' <span class="mute">('+esc(e.status)+')</span></dd>'+
        '<dt>Problem it solves</dt><dd>'+md(e.problem)+'</dd>'+
        '<dt>How it works</dt><dd>'+md(e.how)+'</dd>'+rel+
        '<dt>Adds to each message</dt><dd>'+md(e.adds)+'</dd>'+
        '<dt>What it costs</dt><dd>'+md(e.costs)+'</dd>'+
        '<dt>When not to use it</dt><dd>'+md(e.not_when)+'</dd>'+
        '<dt>Replaced</dt><dd>'+md(e.replaces)+'</dd>'+
        '<dt>Competes with</dt><dd>'+md(e.competes)+'</dd>'+
        '<dt>Where you meet it</dt><dd><ul>'+e.meet.map(m=>'<li>'+md(m)+'</li>').join('')+'</ul></dd></dl>';
      h+='<div class="at-fail"><b>How it fails</b>'+md(e.fail.symptom)+' <span class="mute">Cause:</span> '+md(e.fail.cause)+' <span class="mute">See it:</span> '+md(e.fail.see)+'</div>';
      h+='<div class="small"><b>Seen on the wire.</b> '+md(e.wire_note||'')+'</div>';
      (e.wire||[]).forEach(w=>{h+='<pre class="at-term" data-at-wire="'+esc(w)+'">'+term(D.wires[w])+'</pre>'});
    }
    D.corrections.filter(c=>c.id===id).forEach(c=>{
      h+='<div class="at-fix"><b class="h">Old notes</b><span class="at-v '+esc(c.verdict)+'">'+esc(c.verdict)+'</span> <i>'+esc(c.page)+'</i> said '+md(c.old)+'. '+md(c.now)+' ('+md(c.src)+')</div>';
    });
    h+='<div class="small" style="margin-top:6px"><b>Sources</b>, checked '+esc(D.checked)+':</div><ul class="at-srcs">'+e.srcs.map(s=>'<li>'+link(s.t,s.u)+'</li>').join('')+'</ul>';
    return h;
  }
  // views
  const views=['stack','choose','time','cmp','corr'];const vrender={};
  function showView(v){
    if(views.indexOf(v)<0)v='stack';cur=v;
    document.querySelectorAll('#at-views button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
    views.forEach(x=>{$('at-v-'+x).hidden=x!==v});
    store.set('at-view',v);
    if(vrender[v])try{vrender[v]()}catch(err){throw err}
  }
  let cur=store.get('at-view','stack');
  document.querySelectorAll('#at-views button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.v)));
  // opening an entry from anywhere: go to the stack view and select it
  let openHook=null;
  function open(id){if(!E[id])return;showView('stack');if(openHook)openHook(id);const d=$('at-det');if(d&&d.scrollIntoView)d.scrollIntoView({block:'nearest'})}
  $('t-atlas').addEventListener('click',ev=>{const b=ev.target.closest('[data-at-open]');if(b){ev.preventDefault();open(b.getAttribute('data-at-open'))}});
  // corrections table
  vrender.corr=function(){
    let h='<table class="at-corr"><thead><tr><th>#</th><th>Old page and claim</th><th>Verdict</th><th>Now</th></tr></thead><tbody>';
    D.corrections.forEach(c=>{h+='<tr><td>'+c.n+'</td><td><i>'+esc(c.page)+'</i>: '+md(c.old)+'</td><td><span class="at-v '+esc(c.verdict)+'">'+esc(c.verdict)+'</span><br>'+chipBtn(c.id).replace('<button','<button class="at-chip"')+'</td><td>'+md(c.now)+' '+md(c.src)+'</td></tr>'});
    $('at-corr').innerHTML=h+'</tbody></table>';
  };
  $('at-recmeta').textContent='Recordings: '+D.rec_meta;
  onRender(()=>showView(cur));
  return {D,E,G,UP,RM,$,esc,md,link,term,path,detailHTML,store,onRender,visible,vrender,showView,open,chipBtn,setOpenHook:f=>{openHook=f}};
})();
