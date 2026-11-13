// ---- Shared step animation controller (play, pause, step, scrub, speed, mode toggle) ----
// o: {card, pre (id prefix), modes: {key: {name, steps: [{t, dur, ...}]}}, start (mode key), dur (ms of each step's tween at 1x),
//     hold (ms each step rests once drawn, default 2400, so its explanation can be read), lists: {mode key: id of its ol.sx step list}, draw(st, mode, step)}
// Motion rules (2026-11-06, as RD.anim in the skill templates): plays by itself once at least half of the card is on screen in the visible tab,
// pauses off screen and resumes on return, stops for good on any reader control (play, pause, step, scrub, a click in the step list) or at its
// last step, and never moves by itself under reduced motion. A mode toggle restarts the new mode from step 1, swaps the step list and replays.
// The step explanations live in the step lists on the left (one item per step, the current one marked, a click jumps to it);
// the card shows only a one-line status. data-playing is set on the card while it plays; data-frames counts tween frames.
function makeAnim(o){
  const card=o.card,P=o.pre,RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const cl=v=>Math.max(0,Math.min(1,v)),HOLD=o.hold||2400;
  const st={m:o.start,k:0,t:1,play:false,spd:1,vis:false,raf:0,last:0,hold:0,user:false,ended:false,started:false,lis:[]};
  const S=()=>o.modes[st.m].steps;
  function bindList(){
    if(!o.lists){st.lis=[];return}
    Object.entries(o.lists).forEach(([m,id])=>{const el=$(id);if(el)el.hidden=m!==st.m});
    const L=$(o.lists[st.m]);st.lis=L?[...L.children]:[];
    st.lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{user();st.k=i;st.t=1;draw()};li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}});
  }
  function draw(){
    const steps=S(),step=steps[st.k];
    o.draw(st,o.modes[st.m],step);
    $(P+'Step').textContent=o.modes[st.m].name+', step '+(st.k+1)+' of '+steps.length+': '+step.t;
    st.lis.forEach((li,i)=>{li.classList.toggle('on',i===st.k);li.classList.toggle('done',i<st.k);if(i===st.k)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
    const sc=$(P+'Scrub');sc.max=steps.length*100;sc.value=Math.round((st.k+st.t)*100);
    const end=st.k===steps.length-1&&st.t>=1;
    const pb=$(P+'Play');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
    if(st.play)card.dataset.playing='1';else delete card.dataset.playing;
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live()){st.last=0;return}const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    const steps=S();
    if(st.t<1){st.t=Math.min(1,st.t+dt*st.spd/((steps[st.k].dur||1)*o.dur));card.dataset.frames=(+card.dataset.frames||0)+1;
      if(st.t>=1&&st.k>=steps.length-1){st.play=false;st.ended=true}draw()}
    else{st.hold+=dt*st.spd;if(st.hold>=HOLD){st.hold=0;if(st.k<steps.length-1){st.k++;st.t=RM?1:0;draw()}else{st.play=false;st.ended=true;draw()}}}
    if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0;st.last=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  const user=()=>{st.user=true;pause()};
  // autoplay on view: from step 1, unless the reader has taken a control, it has finished, or the reader prefers reduced motion
  function auto(){if(RM||st.user||st.ended||st.play||!live())return;if(!st.started){st.started=true;st.k=0;st.t=0;st.hold=0}st.play=true;draw();kick()}
  $(P+'Play').addEventListener('click',()=>{const steps=S();st.user=true;if(st.play){pause()}else{if(st.k===steps.length-1&&st.t>=1){st.k=0;st.t=RM?1:0}else if(st.t>=1&&st.k<steps.length-1){st.k++;st.t=RM?1:0}st.hold=0;st.play=true;kick()}draw()});
  $(P+'Fwd').addEventListener('click',()=>{user();st.k=Math.min(S().length-1,st.k+(st.t>=1?1:0));st.t=1;draw()});
  $(P+'Back').addEventListener('click',()=>{user();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(P+'Scrub').addEventListener('input',e=>{const v=+e.target.value;user();const steps=S();st.k=Math.min(steps.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=steps.length*100)st.t=1;draw()});
  $(P+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$(P+'M');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    pause();st.m=b.dataset.m;st.k=0;st.t=RM?1:0;st.hold=0;st.user=false;st.ended=false;st.started=true;bindList();draw();auto()}));
  // in view: at least half of the card, or half the window's height for a card taller than the window
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const e=es[es.length-1];st.vis=e.isIntersecting&&(e.intersectionRatio>=.5||e.intersectionRect.height>=innerHeight*.5);if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  bindList();
  draw();
  return {st,draw};
}
// controls markup for an animation with id prefix P and modes [[key,label],...]; the step explanations are in the step lists on the left
function animCtl(P,modes){
  return '<div class="an-top"><div class="seg" id="'+P+'M">'+modes.map((m,i)=>'<button data-m="'+m[0]+'"'+(i?'':' class="on"')+' aria-pressed="'+(i?'false':'true')+'">'+m[1]+'</button>').join('')+'</div></div>'+
   '<div class="an-svg" id="'+P+'Svg"></div>'+
   '<div class="an-ctl"><button id="'+P+'Play" class="an-play">▶ Play</button><button id="'+P+'Back" aria-label="Previous step">◀ Step</button><button id="'+P+'Fwd" aria-label="Next step">Step ▶</button><input type="range" id="'+P+'Scrub" min="0" max="700" value="0" aria-label="Scrub"><select id="'+P+'Spd" aria-label="Speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></div>'+
   '<p class="an-st" id="'+P+'Step" aria-live="polite"></p><div class="an-cnt" id="'+P+'Cnt"></div>';
}
