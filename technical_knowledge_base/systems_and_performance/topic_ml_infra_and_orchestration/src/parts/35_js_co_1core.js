// ---- Cost lab: shared helpers (SVG, step-animation controller, render registration, numbers in prose) ----
window.CO=(function(){
  const D=window.CO_DATA;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tabVisible=()=>{const t=$('t-cost');return !!t&&!t.hidden&&t.offsetParent!==null};
  const renders=[];
  const onRender=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cost']=window.TAB_RENDER['t-cost']||[]).push(f)};
  let rt=0;addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const rect=(x,y,w,h,fill,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx==null?2:o.rx)+'" fill="'+fill+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+(o.stroke?' stroke="'+o.stroke+'" stroke-width="'+(o.sw||1)+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.data?' '+o.data:'')+'/>'};
  const line=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" stroke="'+c+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  const pct=(x,d)=>(x*100).toFixed(d==null?0:d)+'%';
  const fs=x=>x>=100?Math.round(x).toLocaleString('en-US')+' s':x>=10?x.toFixed(1)+' s':x>=1?x.toFixed(2)+' s':Math.round(x*1000)+' ms';
  const num=(x,d)=>Number(x).toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  const usd=x=>x>=1e9?'$'+(x/1e9).toFixed(2)+'B':x>=1e6?'$'+(x/1e6).toFixed(1)+'M':x>=1e3?'$'+num(x/1e3,1)+'K':'$'+x.toFixed(2);
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':'')+'</div>';
  // the CSS colours resolved at draw time (light/dark)
  const col=n=>getComputedStyle(document.documentElement).getPropertyValue('--'+n).trim()||'#888';
  // o: {card, ctl, n, draw(i), ms, label}
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const pid=o.ctl+'-';
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false};
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" class="co-play" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&tabVisible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1400)/(+g('v').value||1))}
    function setPlay(p){st.play=p;const b=g('p');b.innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';b.setAttribute('aria-label',p?'Pause':'Play');
      clearTimeout(st.timer);st.timer=0;if(p){if(st.i>=st.n-1){st.i=0;show()}st.timer=setTimeout(tick,(o.ms||1400)/(+g('v').value||1))}}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('s').addEventListener('input',()=>{setPlay(false);st.i=+g('s').value;show()});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{es.forEach(e=>{st.vis=e.isIntersecting;
      if(st.vis&&!st.started&&!RM&&tabVisible()){st.started=true;setPlay(true)}else if(st.vis&&st.play&&!st.timer)st.timer=setTimeout(tick,400)})},{threshold:0.3}).observe(card)}
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&st.play&&!st.timer)st.timer=setTimeout(tick,400)});
    show();
    return {reset(n){setPlay(false);st.n=n||st.n;st.i=0;show()},redraw:show,get i(){return st.i}};
  }
  // predict-then-reveal boxes
  function pr(id){const box=$(id);if(!box)return;box.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    box.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');x.classList.toggle('wrong',x===b&&x.dataset.ok!=='1')});
    box.querySelector('.ans').hidden=false})}
  const runs=Object.fromEntries(D.alloc.map(a=>[a.run+'|'+a.system,a]));
  const run=n=>D.alloc.find(a=>a.run===n);
  return {D,RM,$,esc,tabVisible,onRender,width,svg,t,rect,line,seg,pct,fs,num,usd,stat,col,anim,pr,run,runs};
})();
