// ---- Shared step animation controller (play, pause, step, scrub, speed, mode toggle) ----
// o: {card, pre (id prefix), modes: {key: {name, steps: [{t, c, ...}]}}, start (mode key), dur (ms per step at 1x), draw(st, mode, step)}
// Animates only while on screen, in the visible tab and with the document visible; starts paused (one step shown whole) under reduced motion.
function makeAnim(o){
  const card=o.card,P=o.pre,RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const cl=v=>Math.max(0,Math.min(1,v));
  const st={m:o.start,k:0,t:1,play:false,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const S=()=>o.modes[st.m].steps;
  function draw(){
    const steps=S(),step=steps[st.k];
    o.draw(st,o.modes[st.m],step);
    if(st.lk!==st.k||st.lm!==st.m){$(P+'Step').textContent=o.modes[st.m].name+', step '+(st.k+1)+' of '+steps.length+': '+step.t;$(P+'Cap').innerHTML=step.c;st.lk=st.k;st.lm=st.m}
    const sc=$(P+'Scrub');sc.max=steps.length*100;sc.value=Math.round((st.k+st.t)*100);
    const end=st.k===steps.length-1&&st.t>=1;
    const pb=$(P+'Play');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    const steps=S();st.t+=dt*st.spd/((steps[st.k].dur||1)*o.dur);if(st.t>=1){if(st.k<steps.length-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $(P+'Play').addEventListener('click',()=>{const steps=S();if(st.play){pause()}else{if(st.k===steps.length-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<steps.length-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $(P+'Fwd').addEventListener('click',()=>{pause();st.k=Math.min(S().length-1,st.k+(st.t>=1?1:0));st.t=1;draw()});
  $(P+'Back').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(P+'Scrub').addEventListener('input',e=>{pause();const v=+e.target.value,steps=S();st.k=Math.min(steps.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=steps.length*100)st.t=1;draw()});
  $(P+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$(P+'M');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;pause();if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  draw();
  return {st,draw};
}
// controls markup for an animation with id prefix P and modes [[key,label],...]
function animCtl(P,modes){
  return '<div class="an-top"><div class="seg" id="'+P+'M">'+modes.map((m,i)=>'<button data-m="'+m[0]+'"'+(i?'':' class="on"')+' aria-pressed="'+(i?'false':'true')+'">'+m[1]+'</button>').join('')+'</div></div>'+
   '<div class="an-svg" id="'+P+'Svg"></div>'+
   '<div class="an-ctl"><button id="'+P+'Play" class="an-play">▶ Play</button><button id="'+P+'Back" aria-label="Previous step">◀ Step</button><button id="'+P+'Fwd" aria-label="Next step">Step ▶</button><input type="range" id="'+P+'Scrub" min="0" max="700" value="0" aria-label="Scrub"><select id="'+P+'Spd" aria-label="Speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></div>'+
   '<div class="an-cap"><div class="t" id="'+P+'Step"></div><p id="'+P+'Cap"></p></div><div class="an-cnt" id="'+P+'Cnt"></div>';
}
