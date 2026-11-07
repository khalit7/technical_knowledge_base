// ---- Toolchain atlas: "first project in 5 commands" replay (terminal on the left, the project folder filling up on the right) ----
(function(){
  const T=window.TA,D=T.D,$=T.$,esc=T.esc,md=T.md;
  const W=D.walks;
  // motion (2026-11-06): plays by itself once at least half the card is in view, pauses off screen and resumes on return, stops for good on any
  // reader control or at the last command, never moves by itself under reduced motion; the step list on the left (ta-wsx) explains each command
  const st={w:0,i:0,play:false,timer:0,typing:0,spd:1,vis:false,started:false,user:false,ended:false};
  // steps of a walkthrough: the five commands, then any fix-up commands
  const steps=w=>w.steps.map((s,k)=>({...s,lab:String(k+1)})).concat((w.fix||[]).map((s,k)=>({...s,lab:'fix '+(k+1),fix:true})));
  $('ta-wsel').innerHTML=W.map((w,k)=>'<button data-m="'+k+'"'+(k?'':' class="on"')+'>'+esc(w.title.replace(/ with .*/,'').replace(/ \(PyO3.*/,' (PyO3)'))+'</button>').join('');
  $('ta-wctl').innerHTML='<button id="ta-wb" aria-label="Previous command">&#9664;&#9664;</button><button id="ta-wp" aria-label="Play">&#9654; Play</button><button id="ta-wf" aria-label="Next command">&#9654;&#9654;</button>'+
    '<input type="range" id="ta-ws" min="0" max="1" value="0" aria-label="Command"><label class="small">Speed <select id="ta-wv"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
  $('ta-wmachine').textContent=D.notes.machine;
  const card=$('ta-wcard');
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function cur(){return steps(W[st.w])}
  function draw(typeLast){
    const w=W[st.w],S=cur(),i=st.i;
    $('ta-wpre').innerHTML='<b>'+esc(w.title)+'.</b> '+md(w.pre);
    const fails=S.filter(s=>s.exit!==0);
    $('ta-wcount').innerHTML='<div class="stat"><div class="k">Commands</div><div class="v">'+w.steps.length+(w.fix?' + '+w.fix.length+' to fix':'')+'</div></div>'+
      '<div class="stat"><div class="k">Non-zero exits</div><div class="v">'+fails.length+'</div><div class="d">'+(fails.length?'step '+fails.map(s=>s.lab).join(', ')+' failed for real':'every command succeeded')+'</div></div>';
    $('ta-wsteps').innerHTML=S.map((s,k)=>'<button data-k="'+k+'" class="'+(k===i?'on':k<i?'done':'')+'" aria-label="Command '+s.lab+'">'+esc(s.lab)+'</button>').join('');
    // terminal: every command so far; the newest may be typed out
    let h='';
    S.slice(0,i).forEach(s=>{h+=T.term(s.cmd,s.out)+'\n\n'});
    const s=S[i];
    $('ta-wterm').innerHTML=h+(typeLast?'<span class="p">$ </span><span id="ta-wtype"></span>':T.term(s.cmd,s.out)+(s.exit?'\n<span class="m">[exit '+s.exit+']</span>':''));
    $('ta-wterm').scrollTop=$('ta-wterm').scrollHeight;
    const L=$('ta-wsx');if(L.dataset.w!==String(st.w)){L.dataset.w=st.w;L.innerHTML=S.map(x=>'<li><b>'+(x.fix?'Fix '+x.lab.slice(4):'Command '+x.lab)+'.</b> <code>'+esc(x.cmd)+'</code> '+md(x.why)+'</li>').join('');
      [...L.children].forEach((li,k)=>{li.tabIndex=0;li.setAttribute('role','button');li.onclick=()=>go(k);li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(k)}}})}
    [...L.children].forEach((li,k)=>{li.classList.toggle('on',k===i);li.classList.toggle('done',k<i);if(k===i)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
    // folder: every file named so far, the newest highlighted
    const seen=[];S.slice(0,i+1).forEach((x,k)=>(x.files||[]).forEach(f=>seen.push({f,now:k===i})));
    $('ta-wfold').innerHTML='<h4>What is in the project folder now</h4>'+(seen.length?seen.map(o=>'<div class="ta-file'+(o.now?' new':'')+'"><code>'+esc(o.f[0])+'</code><span class="ta-fw">'+md(o.f[1])+'</span></div>').join(''):'<p class="mute">Nothing yet.</p>');
    $('ta-wafter').innerHTML=i===S.length-1&&w.after?'<div class="co key"><div class="t">After the last command</div>'+md(w.after)+'</div>':'';
    const sc=$('ta-ws');sc.max=S.length-1;sc.value=i;
    if(typeLast)typeOut(s);
  }
  function typeOut(s){
    clearInterval(st.typing);let n=0;const full=s.cmd;
    st.typing=setInterval(()=>{const el=document.getElementById('ta-wtype');if(!el){clearInterval(st.typing);return}
      n+=Math.max(1,Math.round(2*st.spd));el.textContent=full.slice(0,n);
      if(n>=full.length){clearInterval(st.typing);st.typing=0;const pre=$('ta-wterm');
        const k=pre.innerHTML.lastIndexOf('<span class="p">$ </span>');
        pre.innerHTML=pre.innerHTML.slice(0,k)+T.term(s.cmd,s.out)+(s.exit?'\n<span class="m">[exit '+s.exit+']</span>':'');pre.scrollTop=pre.scrollHeight}},28);
  }
  function stopTimers(){clearTimeout(st.timer);st.timer=0}
  function setPlay(p){st.play=p;card.toggleAttribute('data-playing',p);$('ta-wp').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('ta-wp').setAttribute('aria-label',p?'Pause':'Play');
    if(!p){stopTimers();return}
    if(st.i>=cur().length-1){st.i=0;draw(!T.RM)}
    kick()}
  function tick(){st.timer=0;if(!st.play||!live())return;
    if(st.i>=cur().length-1){st.ended=true;setPlay(false);return}
    st.i++;draw(!T.RM);if(st.i>=cur().length-1){st.ended=true;setPlay(false);return}kick()}
  function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,2600/st.spd);else if(!live())stopTimers()}
  function go(i,byCode){if(!byCode)st.user=true;setPlay(false);clearInterval(st.typing);st.i=Math.max(0,Math.min(cur().length-1,i));draw(false)}
  $('ta-wp').addEventListener('click',()=>{st.user=true;setPlay(!st.play)});
  $('ta-wf').addEventListener('click',()=>go(st.i+1));
  $('ta-wb').addEventListener('click',()=>go(st.i-1));
  $('ta-ws').addEventListener('input',e=>go(+e.target.value));
  $('ta-wv').addEventListener('change',e=>{st.spd=+e.target.value});
  function auto(){if(!T.RM&&!st.user&&!st.ended&&!st.play&&live())setPlay(true)}
  $('ta-wsteps').addEventListener('click',e=>{const b=e.target.closest('button');if(b)go(+b.dataset.k)});
  $('ta-wsel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    $('ta-wsel').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.w=+b.dataset.m;
    // a new walkthrough is the one exception to "stops for good": it starts from its first command and plays again
    go(0,true);st.user=false;st.ended=false;auto()});
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const x=es[es.length-1];st.vis=x.isIntersecting&&(x.intersectionRatio>=.5||x.intersectionRect.height>=innerHeight*.5);
    if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  T.viewHooks.walk=()=>{auto();kick()};
  T.onRender(()=>{auto();kick()});
  draw(false);
})();
