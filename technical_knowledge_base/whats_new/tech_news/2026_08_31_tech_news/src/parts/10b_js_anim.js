// ---- Step animation engine shared by this issue's before/after animations ----
// stepAnim({card, pre, modes:{key:{name, steps:[{t, c}]}}, dur, render}) wires the controls with ids
// pre+'M' (mode buttons), 'Svg', 'Play', 'Back', 'Fwd', 'Scrub', 'Spd', 'Step', 'Cap'. render(st) draws the
// picture and counters for st.m (mode), st.k (step) and st.t (0..1 through the step). It animates only while
// the card is on screen, in the visible tab and the page is visible; under reduced motion it starts paused
// with each step shown complete.
function stepAnim(o){
  const card=o.card,P=o.pre,M=o.modes,RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const st={m:o.start||Object.keys(M)[0],k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v;
  const live=()=>st.vis&&!document.hidden&&!card.closest('.tab').hidden;
  function draw(){
    const S=M[st.m].steps;o.render(st,M[st.m],S[st.k]);
    if(st.lk!==st.k||st.lm!==st.m){$(P+'Step').textContent=M[st.m].name+', step '+(st.k+1)+' of '+S.length+': '+S[st.k].t;$(P+'Cap').innerHTML=S[st.k].c;st.lk=st.k;st.lm=st.m}
    const end=st.k===S.length-1&&st.t>=1;
    const sc=$(P+'Scrub');sc.max=S.length*100;sc.value=Math.round((st.k+st.t)*100);
    const pb=$(P+'Play');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    const S=M[st.m].steps,d=(S[st.k].dur||o.dur||1700)/st.spd;st.t+=dt/d;
    if(st.t>=1){if(st.k<S.length-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $(P+'Play').addEventListener('click',()=>{const S=M[st.m].steps;if(st.play){pause()}else{if(st.k===S.length-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<S.length-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $(P+'Fwd').addEventListener('click',()=>{pause();const S=M[st.m].steps;if(st.t<1)st.t=1;else if(st.k<S.length-1){st.k++;st.t=1}draw()});
  $(P+'Back').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(P+'Scrub').addEventListener('input',e=>{pause();const v=+e.target.value,S=M[st.m].steps;st.k=Math.min(S.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=S.length*100)st.t=1;draw()});
  $(P+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$(P+'M');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;st.play=!RM;st.lk=-1;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  draw();
  return st;
}
// Escape text for SVG and HTML
const escH=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// Measured width of a plot box (1 SVG unit = 1 px), never below 300
const boxW=(el,fb)=>Math.max(300,Math.round(el.clientWidth||fb||340));
