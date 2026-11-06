// ---- Same agent, six ways: helpers, predict questions, side-by-side code ----
window.SAMEUI=(function(){
  const D=window.SAME;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=n=>n==null?'n/a':Number(n).toLocaleString('en-US');
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-same']=window.TAB_RENDER['t-same']||[]).push(f)};
  // Step animation: the labs' shared controller (24_js_labanim.js): autoplay on view with a step list, or a widget with auto:false
  const anim=o=>LABANIM('t-same',o);
  // Predict-then-reveal questions
  document.querySelectorAll('#t-same .same-q').forEach(box=>{
    box.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      box.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('ok','no');if(x.dataset.a==='1')x.classList.add('ok')});
      if(b.dataset.a!=='1')b.classList.add('no');box.classList.add('done')}))});
  return {D,RM,esc,fmt,stat,reg,anim};
})();

(function(){
  const {D,esc,fmt,stat}=SAMEUI;
  const ROLES=[['model','Model and agent setup'],['tools','Tool definitions'],['state','State'],['loop','The loop'],['stop','Stopping'],['extra','Only in this one']];
  const byId={};D.agents.forEach(a=>byId[a.id]=a);
  // q1 answer, from the recordings
  const FT=D.first_tokens;
  const q1=document.getElementById('same-q1a');
  q1.innerHTML='smolagents, by a wide margin. First request, prompt tokens counted by the server: '+
    D.agents.slice(0,5).map(a=>esc(a.name)+' <b>'+fmt(FT[a.id+'_1'].full)+'</b>').join(', ')+
    '. Section 3 shows where each token came from.';
  function roleOf(a,ln){let r=null;ROLES.forEach(([k])=>{(a.roles[k]||[]).forEach(([s,e])=>{if(ln>=s&&ln<=e&&!r)r=k})});
    // stop wins over loop where both are marked
    (a.roles.stop||[]).forEach(([s,e])=>{if(ln>=s&&ln<=e)r='stop'});return r}
  let on=null;
  function render(side){
    const sel=document.getElementById('same-sel'+side),a=byId[sel.value];
    const lines=a.src.replace(/\n$/,'').split('\n');
    document.getElementById('same-code'+side).innerHTML=lines.map((l,i)=>{const r=roleOf(a,i+1);
      const cls=(r?'r-'+r:'')+(on?(r===on?' on':' dim'):'');return '<div class="'+cls+'"><span class="ln">'+(i+1)+'</span>'+esc(l||' ')+'</div>'}).join('');
    document.getElementById('same-loc'+side).textContent=a.loc+' lines of code';
    document.getElementById('same-lib'+side).textContent='Pinned: '+a.lib+'. Model: '+(a.id==='a6'?'Claude (Haiku 4.5 or Sonnet)':'local model on Apple M1 Pro');
  }
  ['L','R'].forEach((s,k)=>{const sel=document.getElementById('same-sel'+s);
    sel.innerHTML=D.agents.map(a=>'<option value="'+a.id+'">'+(a.id.slice(1))+'. '+esc(a.name)+'</option>').join('');
    sel.value=k?'a2':'a1';sel.onchange=()=>render(s)});
  const rb=document.getElementById('same-roles');
  rb.innerHTML=ROLES.map(([k,t])=>'<button data-r="'+k+'" aria-pressed="false">'+t+'</button>').join('');
  rb.querySelectorAll('button').forEach(b=>b.onclick=()=>{on=on===b.dataset.r?null:b.dataset.r;
    rb.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x.dataset.r===on);x.setAttribute('aria-pressed',x.dataset.r===on)});render('L');render('R')});
  render('L');render('R');
  const max=Math.max(...D.agents.map(a=>a.loc));
  document.getElementById('same-locbars').innerHTML=D.agents.map(a=>stat(esc(a.name),a.loc+' lines','<span style="display:block;height:6px;border-radius:3px;background:var(--acc);width:'+Math.round(100*a.loc/max)+'%"></span>')).join('');
  document.getElementById('same-impl').textContent=D.tools_impl;
  document.getElementById('same-var6b').textContent=D.variant_a6b;
  document.getElementById('same-var6c').textContent=D.variant_a6c;
  const em=document.getElementById('same-emnote');
  em.textContent=D.emdash_replaced?('model output contained '+D.emdash_replaced+' em-dash characters, each replaced by ", " in the stored copies.'):'';
})();
