// ---- Families and objectives: page helpers (FO). RD.anim generalised to any tab; data placeholders; predict cards ----
window.FO=(function(){
  const RM=RD.RM,esc=RD.esc;
  const reg=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  // o: {card, ctl, n, draw(i), ms, label, tab}
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.className='fo-ctl';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" class="an-play" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){const sc=$('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}
      st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1200)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1200)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    reg(o.tab||'t-read',()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  // value at a dotted path of window.FOD
  function get(p){return p.split('.').reduce((o,k)=>o==null?o:o[k],window.FOD)}
  function fmt(v,f){if(typeof v!=='number')return v;if(f==='pct')return (100*v).toFixed(1)+'%';if(f==='pct0')return Math.round(100*v)+'%';
    if(f&&/^\d$/.test(f))return v.toFixed(+f);if(f==='int')return Math.round(v).toLocaleString('en-US');return String(v)}
  function fill(root){(root||document).querySelectorAll('[data-f]').forEach(el=>{const v=get(el.dataset.f);el.textContent=v==null?'(pending)':fmt(v,el.dataset.fmt)})}
  // predict-then-reveal: .pr cards with data-right="index"; buttons inside .opts; .ans hidden until a choice
  function predict(root){(root||document).querySelectorAll('.pr').forEach(pr=>{const opts=[...pr.querySelectorAll('.opts button')],ans=pr.querySelector('.ans'),r=+pr.dataset.right;
    opts.forEach((b,i)=>b.addEventListener('click',()=>{opts.forEach((x,j)=>x.classList.toggle('right',j===r));if(i!==r)b.classList.add('wrong');ans.hidden=false}));
    const sk=pr.querySelector('.skip');if(sk)sk.addEventListener('click',e=>{e.preventDefault();opts[r].classList.add('right');ans.hidden=false})})}
  const W=el=>RD.width(el);
  return {RM,esc,anim,reg,get,fmt,fill,predict,W};
})();
FO.fill();FO.predict();
