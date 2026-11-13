// ---- Paper-page helpers (reusable): width-measured drawing, the step animation controller, predict-then-reveal ----
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
// fit(el, draw): call draw(width) now if visible and again whenever the element's width changes.
// Charts are laid out in CSS pixels at the measured width, so an 11 px font is 11 px on screen.
function fit(el,draw){if(!el)return;el.__draw=draw;el.__lw=-1;
  const go=()=>{const w=Math.floor(el.clientWidth);if(w>0&&w!==el.__lw){el.__lw=w;el.__draw(w)}};
  if(!el.__obs){el.__obs=1;let q=0;const later=()=>{if(!q){q=1;requestAnimationFrame(()=>{q=0;go()})}};if('ResizeObserver' in window)new ResizeObserver(later).observe(el);else addEventListener('resize',later)}go()}
const refit=el=>{if(el&&el.__draw){el.__lw=-1;const w=Math.floor(el.clientWidth);if(w>0){el.__lw=w;el.__draw(w)}}};
const svgW=(w,h,inner,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+(label||'')+'" style="max-width:100%;height:auto">'+inner+'</svg>';
const tx=(x,y,t,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.c?' fill="'+o.c+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+t+'</text>'};
const rc=(x,y,w,h,f,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.r==null?4:o.r)+'" fill="'+f+'"'+(o.s?' stroke="'+o.s+'" stroke-width="'+(o.sw||1)+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+'/>'};
const ln2=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" stroke="'+c+'" stroke-width="'+(o.sw||1.2)+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+'/>'};
const G=(op,s)=>op<=0?'':op>=1?s:'<g opacity="'+op.toFixed(3)+'">'+s+'</g>';
const cl01=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v);

// makeAnim (2026-11-06 motion rules, the behaviour of RD.anim in the skill's 21_js_rd_common.js; copied from the RRSI page on 2026-11-13): one input animated
// step by step, with modes sharing one scale. It plays by itself once at least half in view, pauses off screen, stops for good on any reader control or at
// the last step, never moves by itself under reduced motion, and marks the step list (o.lists: mode -> ol.sx id; o.before(mode) runs before a reset, so a
// generated list can be rewritten). o = {id, modes:{m:[...steps]}, mode, lists, draw(mode,k,e,width), counters(mode,k,e) -> html, dur, move}
// Expects #<id>Svg, #<id>Play, #<id>Back, #<id>Fwd, #<id>Scrub, #<id>Spd, #<id>Cnt and optionally a .seg #<id>M.
function makeAnim(o){const id=o.id,card=$(id);if(!card)return null;const DUR=o.dur||4200,MOVE=o.move||.55;
  const st={m:o.mode,k:0,t:1,play:false,once:false,spd:1,vis:false,raf:0,last:0,w:0,user:false,ended:false,lis:[]};
  const steps=()=>o.modes[st.m];
  function bindList(){const ls=o.lists||{};Object.keys(ls).forEach(m=>{const L=$(ls[m]);if(L)L.hidden=ls[m]!==ls[st.m]});
    const L=$(ls[st.m]);st.lis=L?[...L.children]:[];
    st.lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');
      const j=()=>{st.user=true;pause();st.k=i;st.t=RM?1:0;if(!RM){st.once=true;st.play=true;kick()}draw()};
      li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})}
  function draw(){const host=$(id+'Svg'),w=host.clientWidth;if(!w)return;st.w=w;const e=RM?1:ease(cl01(st.t/MOVE));
    host.innerHTML=o.draw(st.m,st.k,e,w);
    $(id+'Cnt').innerHTML=o.counters(st.m,st.k,e);
    st.lis.forEach((li,i)=>{li.classList.toggle('on',i===st.k);li.classList.toggle('done',i<st.k);if(i===st.k)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
    const n=steps().length,sc=$(id+'Scrub');sc.max=n*100;sc.value=Math.round((st.k+Math.min(1,st.t))*100);
    const pb=$(id+'Play'),end=st.k===n-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
    if(st.play)card.dataset.playing='1';else card.removeAttribute('data-playing')}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live()){st.last=0;return}const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const n=steps().length;
    if(st.t>=1){if(st.once){st.t=1;st.play=false;st.once=false}else if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false;st.ended=true}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0;st.last=0}}
  const pause=()=>{st.play=false;st.once=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $(id+'Play').addEventListener('click',()=>{st.user=true;if(st.play)pause();else if(RM){const n=steps().length;st.k=st.k>=n-1?0:st.k+1;st.t=1}else{const n=steps().length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $(id+'Fwd').addEventListener('click',()=>{st.user=true;pause();st.k=Math.min(steps().length-1,st.k+1);st.t=1;draw()});
  $(id+'Back').addEventListener('click',()=>{st.user=true;pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(id+'Scrub').addEventListener('input',e=>{st.user=true;pause();const n=steps().length,v=+e.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl01(v/100-st.k);if(st.k===n-1&&v>=n*100)st.t=1;draw()});
  $(id+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
  function auto(){if(RM||st.user||st.ended||st.play||!live())return;if(st.t>=1){if(st.k===0)st.t=0;else if(st.k<steps().length-1){st.k++;st.t=0}}st.play=true;kick()}
  function reset(){pause();st.k=0;st.t=1;st.user=false;st.ended=false;if(o.before)o.before(st.m);bindList();draw();auto()}
  const seg=$(id+'M');if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;reset()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const x=es[es.length-1];st.vis=x.isIntersecting&&(x.intersectionRatio>=.5||x.intersectionRect.height>=innerHeight*.5);if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  bindList();
  fit($(id+'Svg'),()=>draw());
  return {draw,st,kick,bindList,reset}}

// Predict, then reveal: <div class="pred" data-ans="i"> with .opts buttons, .fb and a hidden .reveal.
// The reveal (the details and the live demo) opens after any answer; window.PRED_REVEAL[id] runs then.
window.PRED_REVEAL=window.PRED_REVEAL||{};
document.querySelectorAll('.pred').forEach(p=>{const bs=[...p.querySelectorAll('.opts button')],ans=+p.dataset.ans;
  const sk=document.createElement('button');sk.className='skip small';sk.textContent='Skip: just show me';p.querySelector('.opts').after(sk);
  sk.addEventListener('click',()=>{const r=p.querySelector('.reveal');const was=r.hidden;r.hidden=false;sk.remove();if(was&&PRED_REVEAL[p.id])try{PRED_REVEAL[p.id]()}catch(e){__jsErr(e.message)}});
  bs.forEach((b,i)=>b.addEventListener('click',()=>{bs.forEach((x,j)=>{x.classList.toggle('right',j===ans);x.classList.toggle('wrong',j===i&&i!==ans)});
    p.querySelector('.fb').innerHTML=i===ans?'<span class="ok">Right.</span> Here is why, live:':'<span class="no">Not quite:</span> the answer is <b>'+bs[ans].textContent+'</b>. See it live:';
    sk.remove();const r=p.querySelector('.reveal');const was=r.hidden;r.hidden=false;if(was&&PRED_REVEAL[p.id])try{PRED_REVEAL[p.id]()}catch(e){__jsErr(e.message)}}))});
// placeLabels: put each point's label beside it without overlapping other labels or points.
// pts: [{x,y,t,fs}] -> each gets lx, ly, la (text-anchor). Width is estimated at 0.58 em per character.
function placeLabels(pts,W,H){const boxes=[],dots=pts.map(p=>({x:p.x-6,y:p.y-6,w:12,h:12}));
  const hit=(b)=>b.x<0||b.x+b.w>W||b.y<0||b.y+b.h>H||boxes.concat(dots).some(o=>b.x<o.x+o.w&&o.x<b.x+b.w&&b.y<o.y+o.h&&o.y<b.y+b.h);
  pts.forEach(p=>{const fs=p.fs||11,w=p.t.replace(/<[^>]+>/g,'').length*fs*.58,h=fs+2;
    const C=[[p.x+8,p.y-h/2,'start'],[p.x-8-w,p.y-h/2,'end'],[p.x-w/2,p.y-8-h,'middle'],[p.x-w/2,p.y+8,'middle'],[p.x+8,p.y-h-4,'start'],[p.x+8,p.y+4,'start'],[p.x-8-w,p.y-h-4,'end'],[p.x-8-w,p.y+4,'end']];
    let c=C.find(([x,y])=>!hit({x,y,w,h}))||C[0];boxes.push({x:c[0],y:c[1],w,h});
    p.la=c[2];p.lx=c[2]==='start'?c[0]:c[2]==='end'?c[0]+w:c[0]+w/2;p.ly=c[1]+h-3});return pts}
const exp10=e=>'10<tspan dy="-5" font-size="11">'+e+'</tspan>';
const legend=(items,x,y,w)=>{let s='',cx=x,cy=y;items.forEach(([n,c,da])=>{const lw=n.length*6.4+30;if(cx+lw>x+w&&cx>x){cx=x;cy+=16}s+=ln2(cx,cy-4,cx+16,cy-4,c,{sw:2.2,da})+tx(cx+20,cy,n,{fs:11});cx+=lw});return {s,h:cy-y+16}};
