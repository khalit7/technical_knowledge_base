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
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl),pid=o.ctl+'-';
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&#215;</option><option value="1" selected>1&#215;</option><option value="2">2&#215;</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}
      st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||2200)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||2200)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    function maybeStart(){if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()}
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;maybeStart()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();maybeStart()});
    show();
    return {go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  return {D,$,RM,esc,onRender,width,comma,pct,stat,css,seg,smol,anim};
})();
