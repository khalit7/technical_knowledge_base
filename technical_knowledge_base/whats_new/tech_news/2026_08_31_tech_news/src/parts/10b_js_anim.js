// ---- Step animation engine for this issue's 2D animations (the 2026-11-06 motion rules, the behaviour of RD.anim in the skill's 21_js_rd_common.js) ----
// stepAnim({card, pre, modes:{key:{name, steps:[{t, c}]}}, lists:{key:'<ol.sx id>'}, dur, render}) wires the controls with ids
// pre+'M' (mode buttons), 'Play', 'Back', 'Fwd', 'Scrub', 'Spd' and 'Step' (a one-line "mode, step k of n: title").
// Each mode's steps are explained in its ol.sx step list on the left of the split (filled from the steps' t and c when empty):
// the current step is marked, a click on an item plays that step once and stops on it.
// render(st) draws the picture and counters for st.m (mode), st.k (step) and st.t (0..1 through the step's motion). A step lasts dur ms:
// its motion takes the first o.move of it (default .45), the rest holds the finished picture so the step's explanation can be read.
// It plays by itself once at least half of the card is on screen in the open tab, pauses off screen and resumes on return,
// stops for good when the reader takes any control (play, pause, back, forward, the scrubber, a list item) or at its last step,
// and never moves by itself under reduced motion (each step is then shown complete). A mode toggle resets it to step 1 with
// that mode's list and replays (the one exception). The card carries data-playing while it plays and data-frames counts frames.
function stepAnim(o){
  const card=o.card,P=o.pre,M=o.modes,LS=o.lists||{},RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MOVE=o.move||.45;
  const st={m:o.start||Object.keys(M)[0],k:0,t:1,u:1,play:false,once:false,spd:1,vis:false,raf:0,last:0,lk:-1,lm:'',user:false,ended:false,started:false,lis:[]};
  const cl=v=>v<0?0:v>1?1:v;
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  // fill empty lists from the steps
  Object.keys(LS).forEach(m=>{const L=$(LS[m]);if(L&&!L.children.length&&M[m])L.innerHTML=M[m].steps.map(s=>'<li><b>'+s.t+'.</b> '+s.c+'</li>').join('')});
  function bindList(){Object.keys(LS).forEach(m=>{const L=$(LS[m]);if(L)L.hidden=m!==st.m});
    const L=$(LS[st.m]);st.lis=L?[...L.children]:[];
    st.lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');
      const j=()=>{st.user=true;pause();st.k=i;st.t=st.u=RM?1:0;if(!RM){st.once=true;st.play=true;kick()}draw()};
      li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})}
  function draw(){
    const S=M[st.m].steps;o.render(st,M[st.m],S[st.k]);
    if(st.lk!==st.k||st.lm!==st.m){$(P+'Step').textContent=M[st.m].name+', step '+(st.k+1)+' of '+S.length+': '+S[st.k].t;st.lk=st.k;st.lm=st.m}
    st.lis.forEach((li,i)=>{li.classList.toggle('on',i===st.k);li.classList.toggle('done',i<st.k);if(i===st.k)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
    const end=st.k===S.length-1&&st.t>=1;
    const sc=$(P+'Scrub');sc.max=S.length*100;sc.value=Math.round((st.k+st.t)*100);
    const pb=$(P+'Play');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
    if(st.play)card.dataset.playing='1';else card.removeAttribute('data-playing');
  }
  function tick(now){st.raf=0;if(!st.play||!live()){st.last=0;return}const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    const S=M[st.m].steps,d=(S[st.k].dur||o.dur||4400)/st.spd;st.u+=dt/d;st.t=cl(st.u/MOVE);
    if(st.u>=1){if(st.once){st.t=st.u=1;st.play=false;st.once=false}else if(st.k<S.length-1){st.k++;st.t=st.u=0}else{st.t=st.u=1;st.play=false;st.ended=true}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0;st.last=0}}
  const pause=()=>{st.play=false;st.once=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  // autoplay: from step 1 the first time, then from where it stands after a pause off screen
  function auto(){if(RM||st.user||st.ended||st.play||!live())return;if(!st.started){st.k=0;st.t=st.u=0;st.started=true}else if(st.u>=1&&st.k<M[st.m].steps.length-1){st.k++;st.t=st.u=0}st.play=true;kick();draw()}
  $(P+'Play').addEventListener('click',()=>{st.user=true;const S=M[st.m].steps;if(st.play){pause()}else if(RM){st.k=st.k>=S.length-1?0:st.k+1;st.t=st.u=1}else{if(st.k===S.length-1&&st.t>=1){st.k=0;st.t=st.u=0}else if(st.t>=1&&st.k<S.length-1){st.k++;st.t=st.u=0}else st.u=st.t*MOVE;st.play=true;kick()}draw()});
  $(P+'Fwd').addEventListener('click',()=>{st.user=true;pause();const S=M[st.m].steps;if(st.t<1)st.t=1;else if(st.k<S.length-1){st.k++;st.t=1}st.u=1;draw()});
  $(P+'Back').addEventListener('click',()=>{st.user=true;pause();st.k=Math.max(0,st.k-1);st.t=st.u=1;draw()});
  $(P+'Scrub').addEventListener('input',e=>{st.user=true;pause();const v=+e.target.value,S=M[st.m].steps;st.k=Math.min(S.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=S.length*100)st.t=1;st.u=st.t*MOVE;draw()});
  $(P+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$(P+'M');if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    pause();st.m=b.dataset.m;st.k=0;st.t=st.u=1;st.lk=-1;st.user=false;st.ended=false;st.started=false;bindList();draw();auto()}));
  // in view: at least half of the card, or half the window for a card taller than the window
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const x=es[es.length-1];st.vis=x.isIntersecting&&(x.intersectionRatio>=.5||x.intersectionRect.height>=innerHeight*.5);if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&st.vis)auto();kick()});
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  bindList();draw();
  return st;
}
// Escape text for SVG and HTML
const escH=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// Measured width of a plot box (1 SVG unit = 1 px), never below 300
const boxW=(el,fb)=>Math.max(300,Math.round(el.clientWidth||fb||340));
