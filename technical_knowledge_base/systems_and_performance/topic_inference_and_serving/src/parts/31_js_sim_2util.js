// ---- Serving simulator (t-sim): shared helpers (render hooks, step-animation controller, formatting, small SVG charts) ----
window.SIMU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tab=()=>$('t-sim');
  const shown=()=>{const t=tab();return t&&!t.hidden&&t.offsetParent!==null};
  function onRender(f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-sim']=window.TAB_RENDER['t-sim']||[]).push(f)}
  function onResize(f){let t=0,last=0;addEventListener('resize',()=>{if(!shown())return;const w=document.documentElement.clientWidth;if(w===last)return;last=w;clearTimeout(t);t=setTimeout(f,80)})}
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  // numbers
  const n0=x=>Math.round(x).toLocaleString('en-US');
  const n1=x=>(Math.round(x*10)/10).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  const n2=x=>x.toFixed(2);
  function ms(s){const v=s*1e3;if(v>=10000)return n0(v/1e3)+' s';if(v>=1000)return (v/1e3).toFixed(2)+' s';if(v>=100)return n0(v)+' ms';if(v>=10)return n1(v)+' ms';return v.toFixed(2)+' ms'}
  function sig(x,d){if(!isFinite(x))return '0';if(x===0)return '0';const a=Math.abs(x);d=d||3;if(a>=1000)return n0(x);const p=Math.pow(10,d-1-Math.floor(Math.log10(a)));return String(Math.round(x*p)/p)}
  // a colour per request id (golden-angle hues), readable in both themes
  const dark=!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  const col=(id,soft)=>{const h=Math.round((id*137.508+200)%360);return soft?'hsla('+h+',60%,'+(dark?'55%':'50%')+',0.28)':'hsl('+h+','+(dark?'55%':'58%')+','+(dark?'62%':'46%')+')'};
  // step animation: play, pause, step, scrub, speed; animates only while on screen in the visible tab;
  // starts paused under prefers-reduced-motion. o: {card, ctl, n, draw(i), ms, label}
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option><option value="4">4&times;</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();
      if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||600)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||600)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM)setPlay(true)}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    return {reset(n,keep){const p=st.play;setPlay(false);st.n=n;st.i=keep?Math.min(st.i,n-1):0;show();if(p&&!RM)setPlay(true)},
      go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){if(shown())o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  // segmented control: calls f(value) with the clicked button's data-v
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.v)})}
  // predict-then-reveal: el has buttons with data-a; right = index of the right answer; text(i) returns the reveal
  function predict(el,right,text){const ans=el.querySelector('.sim-ans');
    el.querySelectorAll('.sim-opts button').forEach(b=>b.addEventListener('click',()=>{const a=+b.dataset.a;
      el.querySelectorAll('.sim-opts button').forEach(x=>{x.classList.remove('sim-right','sim-wrong');if(+x.dataset.a===right())x.classList.add('sim-right')});
      if(a!==right())b.classList.add('sim-wrong');ans.hidden=false;ans.innerHTML=(a===right()?'<b>Right.</b> ':'<b>Not quite.</b> ')+text()}))}
  // SVG helpers
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':' class="sim-axt"')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  // anchor for an x-axis tick label so it never runs past either edge of a chart w wide
  const anc=(x,w)=>x>w-28?'end':(x<28?'start':'middle');
  // nice ticks for a linear or log axis
  function ticks(lo,hi,n){const span=hi-lo;if(!(span>0))return [lo];const step0=span/(n||5),mag=Math.pow(10,Math.floor(Math.log10(step0)));
    const st=[1,2,5,10].map(k=>k*mag).find(s=>s>=step0)||10*mag;const out=[];for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9*st;v+=st)out.push(+v.toPrecision(12));return out}
  function logTicks(lo,hi){const out=[];for(let e=Math.floor(Math.log10(lo));e<=Math.ceil(Math.log10(hi));e++)for(const m of [1,2,5]){const v=m*Math.pow(10,e);if(v>=lo*0.999&&v<=hi*1.001)out.push(v)}return out}
  return {anc,RM,$,esc,onRender,onResize,width,stat,n0,n1,n2,ms,sig,col,anim,seg,predict,svg,t,ticks,logTicks,shown,dark};
})();
