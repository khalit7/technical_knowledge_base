// ---- Families and objectives: page helpers (FO): the step controller (RD.anim from the template), data placeholders, predict cards ----
window.FO=(function(){
  const RM=RD.RM,esc=RD.esc;
  const reg=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  // o: {card, ctl, n, draw(i), ms, label, list, auto, start}: the template's RD.anim (2026-11-09: plays once at least half in view, pauses off screen,
  // stops for good on a reader control or the last step, never moves under reduced motion; auto:false makes a widget the reader drives)
  function anim(o){const ctl=document.getElementById(o.ctl);ctl.className='fo-ctl an-ctl';return RD.anim(o)}
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
// a chart inside a closed <details> has no width until it opens: redraw the Reading tab's visuals when one opens
document.addEventListener('toggle',e=>{const d=e.target;if(!d.open||!d.closest||!d.closest('#t-read'))return;
  ((window.TAB_RENDER||{})['t-read']||[]).forEach(f=>{try{f()}catch(err){}})},true);
