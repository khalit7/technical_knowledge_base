// ---- Same agent, six ways: helpers, predict questions, side-by-side code ----
window.SAMEUI=(function(){
  const D=window.SAME;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=n=>n==null?'n/a':Number(n).toLocaleString('en-US');
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-same']=window.TAB_RENDER['t-same']||[]).push(f)};
  // Step animation: play, pause, step, scrub, speed. Animates only while on screen in the visible tab;
  // under prefers-reduced-motion it never autoplays.
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl),p=o.ctl+'-';
    const st={i:0,n:o.n,play:false,timer:0,vis:false,spd:1,auto:false};
    ctl.innerHTML='<button id="'+p+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+p+'p" aria-label="Play">&#9654; Play</button><button id="'+p+'f" aria-label="Next step">&#9654;&#9654;</button><input type="range" id="'+p+'s" min="0" max="'+(st.n-1)+'" value="0" aria-label="Step"><label>speed <select id="'+p+'v" aria-label="Speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option><option value="4">4x</option></select></label><span class="small mute" id="'+p+'c"></span>';
    const q=s=>document.getElementById(p+s);
    function go(i){st.i=Math.max(0,Math.min(st.n-1,i));q('s').value=st.i;q('c').textContent='step '+(st.i+1)+' of '+st.n;o.draw(st.i)}
    function shown(){return st.vis&&card.offsetParent!==null&&!document.hidden}
    function tick(){clearTimeout(st.timer);if(!st.play)return;if(!shown()){st.timer=setTimeout(tick,400);return}
      if(st.i>=st.n-1){setPlay(false);return}go(st.i+1);st.timer=setTimeout(tick,(o.ms||900)/st.spd)}
    function setPlay(v){st.play=v;q('p').innerHTML=v?'&#10074;&#10074; Pause':'&#9654; Play';q('p').setAttribute('aria-label',v?'Pause':'Play');if(v){if(st.i>=st.n-1)go(0);st.timer=setTimeout(tick,(o.ms||900)/st.spd)}else clearTimeout(st.timer)}
    q('p').onclick=()=>setPlay(!st.play);q('b').onclick=()=>{setPlay(false);go(st.i-1)};q('f').onclick=()=>{setPlay(false);go(st.i+1)};
    q('s').oninput=e=>{setPlay(false);go(+e.target.value)};q('v').onchange=e=>{st.spd=+e.target.value};
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{es.forEach(e=>{st.vis=e.isIntersecting;
      if(st.vis&&!st.auto&&!RM&&o.autoplay!==false&&card.offsetParent!==null){st.auto=true;setPlay(true)}})}).observe(card)}else st.vis=true;
    go(o.start||0);
    return {go,reset(n){setPlay(false);st.n=n;q('s').max=n-1;st.auto=RM;go(0)},get i(){return st.i},play:setPlay};
  }
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
