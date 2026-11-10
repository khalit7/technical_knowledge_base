// ---- Step-by-step animation player (pattern of the DeepSeek MLA explainer) ----
// makeAnim({id, list, modes:[{label,steps:[title,...],draw(k,e,ph,narrow)->{W,H,s,label},cnt(k,e)->html}], dur})
// Under reduced motion it steps without tweening.
const RMOT=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const cl01=v=>v<0?0:v>1?1:v,ease2=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),lerp=(a,b,u)=>a+(b-a)*u;
const sq=(x,y,cols,n,fill,op,P,C)=>{P=P||7;C=C||6;let d='';for(let i=0;i<n;i++)d+='M'+(x+(i%cols)*P)+' '+(y+Math.floor(i/cols)*P)+'h'+C+'v'+C+'h-'+C+'z';return n>0?'<path d="'+d+'" fill="'+fill+'"'+(op!=null?' fill-opacity="'+op+'"':'')+'/>':''};
const tx=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11.5)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>';
const grp=(op,s)=>'<g opacity="'+(+op).toFixed(3)+'">'+s+'</g>';
function pk(pts,u,col){let s='';const seg=[];let tot=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);tot+=l}
  for(let j=0;j<6;j++){const f=cl01(u*1.7-j*.14);if(f<=0||f>=1)continue;let d=f*tot,i=0;while(i<seg.length-1&&d>seg[i]){d-=seg[i];i++}
    const r=seg[i]?d/seg[i]:0,x=lerp(pts[i][0],pts[i+1][0],r),y=lerp(pts[i][1],pts[i+1][1],r);s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3" fill="'+col+'" opacity="'+(1-Math.abs(f-.5)).toFixed(2)+'"/>'}
  return s}
function makeAnim(o){
  // o.list: the id of the ol.sx step list on the left (one item per step, shared by every mode); the step text lives there, not in a caption.
  // Motion rules (2026-11-06, as RD.anim in 21_js_rd_common.js): plays by itself once at least half of the card is on screen in the visible tab,
  // pauses off screen and resumes on return, stops for good on any reader control or at its last step, never moves by itself under reduced motion.
  // A mode switch restarts from step 1 and replays (the one exception to "stops for good"). data-playing is set on the card while it plays.
  const card=$(o.id);if(!card)return;
  const DUR=o.dur||4600,MOVE=.45,id=o.id;
  card.innerHTML=(o.fig?'<div class="fig-t">'+o.fig+'</div>':'')+'<div class="mlx-top"><div class="seg" id="'+id+'M" role="group" aria-label="'+(o.aria||'Method')+'">'+o.modes.map((m,i)=>'<button data-i="'+i+'" class="'+(i?'':'on')+'" aria-pressed="'+(i?'false':'true')+'">'+m.label+'</button>').join('')+'</div><span class="small mute" id="'+id+'Step" aria-live="polite"></span>'+(o.top||'')+'</div>'+
    '<div id="'+id+'Svg" class="mlx-svg"></div>'+
    '<div class="mlx-ctl"><button id="'+id+'Back" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button id="'+id+'Play" class="mlx-play" aria-label="Play">&#9654; Play</button><button id="'+id+'Fwd" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
    '<input type="range" id="'+id+'Scrub" min="0" max="700" value="0" aria-label="Scrub through the steps"><label class="small">Speed <select id="'+id+'Spd"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div>'+
    '<div class="mlx-cnt" id="'+id+'Cnt"></div>'+(o.foot?'<p class="small mute">'+o.foot+'</p>':'');
  const st={mi:0,k:0,t:1,play:false,spd:1,vis:false,raf:0,last:0,user:false,ended:false};
  const M=()=>o.modes[st.mi],lis=o.list&&$(o.list)?[...$(o.list).children]:[];
  function draw(){
    const m=M(),k=st.k,e=RMOT?1:ease2(cl01(st.t/MOVE)),ph=RMOT?-1:(st.t*2.2)%1,nar=card.clientWidth<560;
    const r=m.draw(k,e,ph,nar);
    $(id+'Svg').innerHTML=svgEl(r.W,r.H,r.s,(r.label||m.label)+', step '+(k+1));
    $(id+'Step').textContent='step '+(k+1)+' of '+m.steps.length;
    lis.forEach((li,i)=>{li.classList.toggle('on',i===k);li.classList.toggle('done',i<k);if(i===k)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
    $(id+'Cnt').innerHTML=m.cnt(k,e);
    const n=m.steps.length,sc=$(id+'Scrub');sc.max=n*100;sc.value=Math.round((k+st.t)*100);
    const pb=$(id+'Play');pb.innerHTML=st.play?'❚❚ Pause':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':'Play');
    if(st.play)card.dataset.playing='1';else delete card.dataset.playing;
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live()){st.last=0;return}const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const n=M().steps.length;if(st.t>=1){if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false;st.ended=true}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  // autoplay on view, unless the reader has taken a control or it has finished; never under reduced motion
  function auto(){if(RMOT||st.user||st.ended||st.play||!live())return;st.play=true;if(st.k===0&&st.t>=1)st.t=0;kick();draw()}
  const user=()=>{st.user=true;pause()};
  $(id+'Play').addEventListener('click',()=>{const was=st.play;user();if(!was){const n=M().steps.length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $(id+'Fwd').addEventListener('click',()=>{user();st.k=Math.min(M().steps.length-1,st.k+1);st.t=RMOT?1:0;draw();if(!RMOT){st.fw=1;fwd()}});
  // a forward step plays that step's motion once (not autoplay: it stops at the end of the step)
  function fwd(){const f=now=>{if(st.play||st.t>=1){st.fw=0;return}const dt=st.last2?Math.min(100,now-st.last2):16;st.last2=now;st.t=Math.min(1,st.t+dt/(DUR*MOVE));draw();if(st.t<1&&live())requestAnimationFrame(f);else{st.t=1;st.last2=0;draw()}};st.last2=0;requestAnimationFrame(f)}
  $(id+'Back').addEventListener('click',()=>{user();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(id+'Scrub').addEventListener('input',ev=>{user();const n=M().steps.length,v=+ev.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl01(v/100-st.k);draw()});
  $(id+'Spd').addEventListener('change',ev=>{st.spd=+ev.target.value});
  lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{user();st.k=i;st.t=1;draw()};li.onclick=j;li.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();j()}}});
  const seg=$(id+'M');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    pause();st.mi=+b.dataset.i;st.k=0;st.t=1;st.user=false;st.ended=false;draw();auto()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const x=es[es.length-1];st.vis=x.isIntersecting&&(x.intersectionRatio>=.5||x.intersectionRect.height>=innerHeight*.5);if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
}
