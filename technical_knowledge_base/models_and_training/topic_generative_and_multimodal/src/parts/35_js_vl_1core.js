// ---- VLM lab (t-vlm): helpers, the step-animation controller, and SmolVLM's token arithmetic ----
// Data: window.VL_DATA (35_js_vl_0data.js, built by src/vlm/make_data.py from src/vlm/out/*.json).
window.VL=(function(){
  const D=window.VL_DATA,$=id=>document.getElementById(id);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-vlm']=window.TAB_RENDER['t-vlm']||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const comma=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const pct=(x,d)=>(x*100).toFixed(d==null?0:d)+'%';
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const css=n=>getComputedStyle(document.body).getPropertyValue(n).trim()||'#888';
  function seg(el,opts,cur,cb){el.innerHTML=opts.map(o=>'<button data-v="'+esc(o[0])+'" class="'+(o[0]===cur?'on':'')+'">'+o[1]+'</button>').join('');
    el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset.v)}))}
  // SmolVLM's image processor, re-implemented from transformers v5.20.1 models/idefics3/image_processing_idefics3.py
  // (_resize_output_size_rescale_to_max_len lines 58-92, the 4096 cap line 39, resize_for_vision_encoder lines 319-348,
  // split_images lines 286-317) and processing_idefics3.py replace_image_token lines 216-243.
  // Checked against every measured count in out/tokens.json by check_vl.mjs.
  function smol(W,H,N,split,tile,seq){
    tile=tile||512;seq=seq||64;
    let w=W,h=H;
    if(split){
      const L=N*tile,ar=w/h;
      if(w>=h){w=L;h=Math.floor(w/ar);if(h%2)h++}else{h=L;w=Math.floor(h*ar);if(w%2)w++}
      h=Math.max(h,1);w=Math.max(w,1);
      if(w>=h&&w>4096){const a=w/h;w=4096;h=Math.floor(w/a)}else if(h>w&&h>4096){const a=w/h;h=4096;w=Math.floor(h*a)}
      // resize_for_vision_encoder: both sides up to multiples of the tile
      const a2=w/h;
      if(w>=h){w=Math.ceil(w/tile)*tile;h=Math.floor(w/a2);h=Math.ceil(h/tile)*tile}else{h=Math.ceil(h/tile)*tile;w=Math.floor(h*a2);w=Math.ceil(w/tile)*tile}
    }
    let rows=0,cols=0,tiles=1;
    if(split&&(w>tile||h>tile)){rows=Math.ceil(h/tile);cols=Math.ceil(w/tile);tiles=rows*cols+1}
    if(!split){w=tile;h=tile}
    const img=tiles*seq;
    // markup: per tile a wrap token and a position token; one closing wrap; one newline token per row
    // (the last row's newline merges with the newline before the global view); tags past row or column 6 are not single tokens
    let markup=rows?2*tiles+1+rows:3,extra=0;
    if(rows>6||cols>6){for(let r=1;r<=rows;r++)for(let c=1;c<=cols;c++)if(r>6||c>6)extra+=8}
    return {w,h,rows,cols,tiles,img,markup:markup+extra,badTags:extra>0,stretch:split?(h/w)/(H/W):1};
  }
  // step animation, copied from the template RD.anim (21_js_rd_common.js, 2026-11-06): plays by itself once at least half in view, pauses off screen,
  // stops for good on any reader control or at its last step, never moves by itself under reduced motion; auto:false makes it a widget
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl),RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
    const st={i:o.start||0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1,user:false,ended:false};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" class="an-play" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    // fwd: the step moved forward by one, so marks drawn with class rd-new ease in (CSS) and the caption fades in
    // the step list on the left: one item per step, the current one marked, a click jumps to it (and stops autoplay)
    function bindList(id){const L=id&&document.getElementById(id);st.lis=L?[...L.children]:[];
      st.lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{st.user=true;setPlay(false);st.i=i;show()};li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})}
    function show(fwd){const sc=$('s');sc.max=st.n-1;sc.value=st.i;(st.lis||[]).forEach((li,i)=>{li.classList.toggle('on',i===st.i);li.classList.toggle('done',i<st.i);if(i===st.i)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});card.classList.toggle('rd-fwd',!!fwd);o.draw(st.i);
      if(fwd&&!RM)card.querySelectorAll('.an-cap').forEach(c=>{c.classList.remove('rd-fade');void c.offsetWidth;c.classList.add('rd-fade')})}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){st.ended=true;setPlay(false);return}st.i++;show(true);if(st.i>=st.n-1){st.ended=true;setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||3600)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||3600)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>{st.user=true;setPlay(!st.play)});
    $('f').addEventListener('click',()=>{st.user=true;setPlay(false);const m=st.i<st.n-1;st.i=Math.min(st.n-1,st.i+1);show(m)});
    $('b').addEventListener('click',()=>{st.user=true;setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{st.user=true;setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    // autoplay on view: once at least half the card is visible, unless the reader has taken a control or it has finished
    // o.auto===false makes it a widget the reader drives (the long-replay rule, case b): it never plays by itself
    function auto(){if(o.auto!==false&&!RM&&!st.user&&!st.ended&&!st.play&&live())setPlay(true)}
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{const e=es[es.length-1];st.vis=e.isIntersecting&&(e.intersectionRatio>=.5||e.intersectionRect.height>=innerHeight*.5);
      if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
    bindList(o.list);
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {
      // restart from step 0 with a new step count (used when a mode toggle changes the sequence)
      // a mode toggle: restart from step 0 with a new step count (and optionally a new step list) and replay, the one exception to "stops for good"
      reset(n,list){setPlay(false);st.n=n;st.i=0;st.ended=false;st.user=false;if(list)bindList(list);show();auto()},
      // jump to a step; pass byCode=true when page code (not the reader) moves it, so autoplay is not switched off
      go(i,byCode){if(!byCode)st.user=true;setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){card.classList.remove('rd-fwd');o.draw(st.i)},
      play(){if(!RM)setPlay(true)},
      get i(){return st.i}, get n(){return st.n}
    };
  }
  return {D,$,RM,esc,onRender,width,comma,pct,stat,css,seg,smol,anim};
})();
