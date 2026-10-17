// ---- Latent lab (t-latent): shared helpers, step animation, render registry, sprite tiles, inline numbers ----
window.LT=(function(){
  const D=window.LTD;
  if(!D||!D.tiny||!D.sd_vae||!D.sd_scale||!D.perc||!D.scatter){const t=document.getElementById('t-latent');
    if(t){const n=document.createElement('p');n.className='co warn';n.textContent='Latent lab: recorded data missing from this build; rerun the lab scripts and rebuild.';t.prepend(n)}return null}
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-latent');
  const visible=()=>{const t=tab();return !!t&&!t.hidden&&!document.hidden};
  const renders=[];
  function onRender(f){renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-latent']=window.TAB_RENDER['t-latent']||[]).push(()=>{try{f()}catch(e){console.error(e);throw e}})}
  let rz=0,lastW=0;addEventListener('resize',()=>{if(!visible())return;const w=tab().clientWidth;if(w===lastW)return;lastW=w;clearTimeout(rz);rz=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),120)});
  const width=el=>{const w=el&&el.getBoundingClientRect().width;return w&&w>40?Math.floor(w):Math.max(280,Math.min(880,(document.documentElement.clientWidth||900)-40))};
  const f1=x=>(+x).toFixed(1),f2=x=>(+x).toFixed(2),n0=x=>Math.round(x).toLocaleString('en-US');
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function seg(el,f){if(!el)return;el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.v)})}
  // sprites: D.img[name] = {uri, w (tile px), cols, n}; images load once
  const IMG={};
  function sprite(name,cb){const s=D.img[name];if(!s)throw new Error('lt: no sprite '+name);
    if(IMG[name]){if(IMG[name].complete&&IMG[name].naturalWidth)cb(IMG[name],s);else IMG[name].addEventListener('load',()=>cb(IMG[name],s),{once:true});return}
    const im=new Image();IMG[name]=im;im.addEventListener('load',()=>cb(im,s),{once:true});im.src=s.uri}
  // draw tile k of sprite name into a canvas of css size px (pixelated)
  function tile(cv,name,k,px){px=px||cv.width;const dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.round(px*dpr);cv.height=Math.round(px*dpr);cv.style.width=px+'px';cv.style.height=px+'px';
    sprite(name,(im,s)=>{const c=cv.getContext('2d');c.imageSmoothingEnabled=false;const r=Math.floor(k/s.cols),q=k%s.cols;
      c.clearRect(0,0,cv.width,cv.height);c.drawImage(im,q*s.w,r*s.w,s.w,s.w,0,0,cv.width,cv.height)})}
  // a row of tiles: returns HTML of canvases with data attributes; call fillTiles(container) after insert
  function tilesHTML(name,ks,px,caps){return ks.map((k,i)=>'<figure class="lt-fig"><canvas class="lt-px" data-sp="'+name+'" data-k="'+k+'" data-px="'+px+'" width="'+px+'" height="'+px+'" role="img" aria-label="'+esc((caps&&caps[i])||name+' '+k)+'"></canvas>'+(caps&&caps[i]!=null?'<figcaption>'+caps[i]+'</figcaption>':'')+'</figure>').join('')}
  function fillTiles(el){el.querySelectorAll('canvas[data-sp]').forEach(cv=>tile(cv,cv.dataset.sp,+cv.dataset.k,+cv.dataset.px))}
  // step animation: o {card, ctl, n, draw(i), ms, label}; plays once when first on screen in the visible tab (never under reduced motion)
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&visible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&visible()&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  // predict-then-reveal: container .lt-pr with buttons data-ok="1" on the right one, and a hidden .lt-ans
  function predicts(){tab().querySelectorAll('.lt-pr').forEach(pr=>{const ans=pr.querySelector('.lt-ans');
    pr.querySelectorAll('.lt-opts button').forEach(b=>b.addEventListener('click',()=>{pr.querySelectorAll('.lt-opts button').forEach(x=>{x.classList.remove('lt-right','lt-wrong');x.disabled=true});
      b.classList.add(b.dataset.ok?'lt-right':'lt-wrong');const ok=pr.querySelector('.lt-opts button[data-ok]');if(ok)ok.classList.add('lt-right');ans.hidden=false}))})}
  // inline numbers: <span data-lt="path.to.value" data-f="1|2|0|pct|x"></span>
  function get(p){return p.split('.').reduce((o,k)=>o==null?o:o[k],D)}
  function fillNums(){tab().querySelectorAll('[data-lt]').forEach(el=>{const v=get(el.dataset.lt);if(v==null){el.textContent='?';el.style.color='var(--bad)';throw new Error('lt: missing '+el.dataset.lt)}
    const f=el.dataset.f;el.textContent=f==='0'?n0(v):f==='1'?f1(v):f==='2'?f2(v):f==='3'?(+v).toFixed(3):f==='4'?(+v).toFixed(4):f==='pct'?Math.round(v*100)+'%':String(v)})}
  // tile index of image k in the row named key of sprite name (rows recorded by make_data.py)
  const ti=(name,key,k)=>{const s=D.img[name];if(!(key in s.rows))throw new Error('lt: no row '+key+' in '+name);return s.rows[key]*s.cols+k};
  // VQ tokens are stored as base64 bytes, 64 per image
  const toks=(run,k)=>{const b=atob(D.tiny.runs[run].tokens16);return Array.from({length:64},(_,i)=>b.charCodeAt(k*64+i))};
  return {ti,toks,D,RM,esc,$,onRender,width,f1,f2,n0,stat,seg,sprite,tile,tilesHTML,fillTiles,anim,predicts,fillNums,get,visible};
})();
