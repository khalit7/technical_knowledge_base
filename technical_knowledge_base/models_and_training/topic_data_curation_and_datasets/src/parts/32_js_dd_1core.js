// ---- Dedup lab (t-dedup): shared helpers. Charts size from the measured width and redraw when the tab is shown or resized.
// Animations run only while their card is on screen in the visible tab, start once on first view, never autoplay under reduced motion.
window.DDX=(function(){
  const TAB='t-dedup';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=(x,d)=>(d==null?Math.round(x):x).toLocaleString('en-GB',d==null?{}:{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(x,d)=>(100*x).toFixed(d==null?1:d)+'%';
  const rend=[];
  const onRender=f=>{rend.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f)};
  let rt=0;addEventListener('resize',()=>{const t=$(TAB);if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>rend.forEach(f=>{try{f()}catch(e){window.__jsErr&&__jsErr('dd resize: '+e.message)}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  // horizontal bars: rows [label, value, color, valueText]
  function bars(el,rows,max){el.innerHTML=rows.map(r=>'<div class="row"><div class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</div><div class="track"><div class="fill" style="width:'+(100*Math.min(1,r[1]/max)).toFixed(2)+'%;background:'+(r[2]||'var(--acc)')+'"></div></div><div class="val">'+(r[3]!=null?r[3]:fmt(r[1]))+'</div></div>').join('')}
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // step animation controller: o {card, ctl, n, draw(i), ms, label}
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false};
    const p=o.ctl+'-';
    ctl.innerHTML='<button id="'+p+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+p+'p" aria-label="Play">&#9654; Play</button><button id="'+p+'f" aria-label="Next step">&#9654;&#9654;</button><input type="range" id="'+p+'s" min="0" max="'+(st.n-1)+'" value="0" aria-label="'+esc(o.label||'Step')+'">';
    const g=s=>$(p+s);
    const show=()=>{g('s').max=st.n-1;g('s').value=st.i;o.draw(st.i)};
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,o.ms||1800)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,o.ms||1800);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(v){st.play=v;g('p').innerHTML=v?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',v?'Pause':'Play');if(!v&&st.timer){clearTimeout(st.timer);st.timer=0}if(v&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});show();
    return {go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},reset(n){setPlay(false);st.n=n;st.i=0;show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  // predict-then-reveal blocks
  function predict(id){const el=$(id);if(!el)return;el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    el.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.r==='1');x.classList.toggle('wrong',x===b&&x.dataset.r!=='1')});el.querySelector('.ans').hidden=false})}
  // linear scale helper
  const lin=(d0,d1,r0,r1)=>v=>r0+(v-d0)/(d1-d0)*(r1-r0);
  return {TAB,RM,$,esc,fmt,pct,onRender,width,svg,t,stat,bars,seg,anim,predict,lin};
})();
