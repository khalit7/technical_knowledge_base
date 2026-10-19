// ---- Step-by-step animation player (pattern of the DeepSeek MLA explainer) ----
// makeAnim({id, modes:[{m,label,steps:[[title,caption],...],draw(k,e,ph,narrow)->{W,H,s,label},cnt(k,e)->html}], dur})
// Animates only while on screen and in the visible tab; starts paused, step by step, under reduced motion.
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
  const card=$(o.id);if(!card)return;
  const DUR=o.dur||3400,MOVE=.62,id=o.id;
  card.innerHTML='<div class="mlx-top"><div class="seg" id="'+id+'M" role="group" aria-label="'+(o.aria||'Method')+'">'+o.modes.map((m,i)=>'<button data-i="'+i+'" class="'+(i?'':'on')+'" aria-pressed="'+(i?'false':'true')+'">'+m.label+'</button>').join('')+'</div>'+(o.top||'')+'</div>'+
    '<div id="'+id+'Svg" class="mlx-svg"></div>'+
    '<div class="mlx-ctl"><button id="'+id+'Back" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button id="'+id+'Play" class="mlx-play" aria-label="Play">&#9654; Play</button><button id="'+id+'Fwd" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
    '<input type="range" id="'+id+'Scrub" min="0" max="700" value="0" aria-label="Scrub through the steps"><label class="small">Speed <select id="'+id+'Spd"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div>'+
    '<div class="mlx-cap" aria-live="polite"><div class="t" id="'+id+'Step"></div><p id="'+id+'Cap"></p></div><div class="mlx-cnt" id="'+id+'Cnt"></div>'+(o.foot?'<p class="small mute">'+o.foot+'</p>':'');
  const st={mi:0,k:0,t:RMOT?1:0,play:!RMOT,spd:1,vis:false,raf:0,last:0,lk:-1,lm:-1};
  const M=()=>o.modes[st.mi];
  function draw(){
    const m=M(),k=st.k,e=RMOT?1:ease2(cl01(st.t/MOVE)),ph=RMOT?-1:(st.t*2.2)%1,nar=card.clientWidth<560;
    const r=m.draw(k,e,ph,nar);
    $(id+'Svg').innerHTML=svgEl(r.W,r.H,r.s,(r.label||m.label)+', step '+(k+1));
    if(st.lk!==k||st.lm!==st.mi){const S=m.steps[k];$(id+'Step').innerHTML='Step '+(k+1)+' of '+m.steps.length+': '+S[0];$(id+'Cap').innerHTML=S[1];st.lk=k;st.lm=st.mi}
    $(id+'Cnt').innerHTML=m.cnt(k,e);
    const n=m.steps.length,sc=$(id+'Scrub');sc.max=n*100;sc.value=Math.round((k+st.t)*100);
    const pb=$(id+'Play'),end=k===n-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const n=M().steps.length;if(st.t>=1){if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $(id+'Play').addEventListener('click',()=>{if(st.play){pause()}else{const n=M().steps.length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $(id+'Fwd').addEventListener('click',()=>{pause();st.k=Math.min(M().steps.length-1,st.k+1);st.t=1;draw()});
  $(id+'Back').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(id+'Scrub').addEventListener('input',ev=>{pause();const n=M().steps.length,v=+ev.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl01(v/100-st.k);draw()});
  $(id+'Spd').addEventListener('change',ev=>{st.spd=+ev.target.value});
  const seg=$(id+'M');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.mi=+b.dataset.i;st.k=0;st.t=RMOT?1:0;if(!RMOT)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
}
