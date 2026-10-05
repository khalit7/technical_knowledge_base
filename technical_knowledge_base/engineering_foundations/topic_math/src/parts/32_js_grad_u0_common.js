// ---- Gradient lab (t-grad): shared UI helpers ----
window.GLU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-grad']=window.TAB_RENDER['t-grad']||[]).push(f)};
  const visible=()=>{const t=$('t-grad');return t&&!t.hidden&&t.offsetParent!==null};
  const onResize=f=>{let t=0,last=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(t);t=setTimeout(()=>{const w=document.documentElement.clientWidth;if(w!==last){last=w;f()}},80)})};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // number formatting: f(v,d) fixed with a real minus sign; e(v) scientific for small diffs
  const minus=s=>s.replace(/^-/,'−').replace(/e-/,'e−');
  const f=(v,d)=>{if(v===undefined||v===null)return '?';if(Number.isNaN(v))return 'NaN';if(v===Infinity)return '∞';if(v===-Infinity)return '−∞';
    d=d===undefined?3:d;let s=v.toFixed(d);if(/^-0\.?0*$/.test(s))s=s.slice(1);return minus(s)};
  const e=(v,d)=>{if(Number.isNaN(v))return 'NaN';if(!isFinite(v))return '∞';if(v===0)return '0';return minus(v.toExponential(d===undefined?1:d)).replace('e+','e')};
  const g=(v,d)=>{if(!isFinite(v))return f(v);const a=Math.abs(v);return a!==0&&(a<1e-3||a>=1e5)?e(v,d===undefined?2:d):f(v,d)};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.c?' style="fill:'+o.c+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const ln=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" style="stroke:'+c+';stroke-width:'+(o.w||1)+(o.dash?';stroke-dasharray:'+o.dash:'')+'"/>'};
  const pl=(pts,c,o)=>{o=o||{};return '<polyline fill="none" points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" style="stroke:'+c+';stroke-width:'+(o.w||1.6)+(o.dash?';stroke-dasharray:'+o.dash:'')+'"/>'};
  const dot=(x,y,r,c)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" style="fill:'+c+'"/>';
  const seg=(el,fn)=>el.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));fn(b.dataset.m)});
  // matrix or vector as a small grid; v: number[] (column) or number[][]; opts.on: set of "i,j" to highlight; opts.blank
  function mat(v,o){o=o||{};const M=Array.isArray(v[0])?v:v.map(x=>[x]);const c=M[0].length;
    let h='<span class="gl-mat'+(o.blank?' blank':'')+'" style="grid-template-columns:repeat('+c+',auto)">';
    M.forEach((r,i)=>r.forEach((x,j)=>{const cls=[];if(o.on&&o.on.has(i+','+j))cls.push('on');if(o.sign&&!o.blank){if(x<-1e-12)cls.push('neg');else if(x>1e-12)cls.push('pos')}
      h+='<span'+(cls.length?' class="'+cls.join(' ')+'"':'')+'>'+(o.blank?'·':f(x,o.d===undefined?3:o.d))+'</span>'}));
    return h+'</span>'}
  // step controller (play, pause, step, scrub, speed); animates only while on screen in the visible tab; starts paused under reduced motion
  function anim(o){const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>';
    const q=s=>$(pid+s);
    function show(){const sc=q('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&visible();
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;q('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';q('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    q('p').addEventListener('click',()=>setPlay(!st.play));
    q('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    q('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    q('s').addEventListener('input',ev=>{setPlay(false);st.i=+ev.target.value;show()});
    q('v').addEventListener('change',ev=>{st.spd=+ev.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&visible()){st.started=true;if(!RM&&o.autoplay!==false){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);onRender(()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=Math.min(st.i,n-1);show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},play(){if(!RM)setPlay(true)},redraw(){show()},get i(){return st.i},get n(){return st.n}}}
  return {RM,$,onRender,onResize,width,f,e,g,stat,svg,t,ln,pl,dot,seg,mat,anim,visible};
})();
