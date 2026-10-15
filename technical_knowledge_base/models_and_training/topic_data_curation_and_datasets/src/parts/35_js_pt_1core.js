// ---- Post-training data lab (t-post): shared helpers and the numbers quoted in prose. Data in window.PTD ----
window.PT=(function(){
  const D=window.PTD;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const TAB='t-post';
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f)};
  const visible=()=>{const t=document.getElementById(TAB);return t&&!t.hidden&&t.offsetParent!==null};
  const onResize=f=>{let t=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(t);t=setTimeout(f,80)})};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const cv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const fmt=(x,d)=>(x==null||!isFinite(x))?'n/a':Number(x).toLocaleString('en-GB',{maximumFractionDigits:d==null?0:d,minimumFractionDigits:d==null?0:d});
  const pct=(x,d)=>fmt(100*x,d==null?1:d)+'%';
  const of=(a,b,d)=>fmt(a)+' of '+fmt(b)+' ('+pct(a/b,d)+')';
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;
    el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.m)})}
  // step-animation controller: play, pause, step, scrub, speed; animates only on screen in the visible tab
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){$('s').max=st.n-1;$('s').value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&visible();
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}
      st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1800)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1800)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&visible()){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i},stop(){setPlay(false)}};
  }
  // numbers quoted in the prose, all derived from PTD (checked by src/post/check_pt.mjs)
  const S=D.stats,F=D.filter,C=D.checkers,R=D.rephrase;
  const sftOpt=F.sft.optional,ref=C.ref;
  const nums={
    sft_removed:of(F.sft.removed,F.sft.n),sft_nonen:fmt(sftOpt.non_english.n),sft_refusal:fmt(sftOpt.refusal.n),sft_nonen_aya:fmt(sftOpt.non_english.by_group['tulu_v3.9_aya_100k']||0)+' of the 1,000',
    sft_refusal_safe:fmt(Object.entries(sftOpt.refusal.by_group).filter(([g])=>/wildjailbreak|wildguard/.test(g)).reduce((a,[,v])=>a+v,0)),
    pref_ties:fmt(S.pref.ties),pref_same:fmt(F.pref.by_rule.same_text||0),pref_longer:fmt(S.pref.chosen_longer)+' of 5,000, '+pct(S.pref.chosen_longer/5000),
    rlvr_comma:fmt(F.rlvr.unrewardable_detail.gsm8k||0),
    ref_ln_math:of(ref.MATH.ok.last_number,ref.MATH.n),ref_mv_math:of(ref.MATH.ok.math_verify,ref.MATH.n),
    ref_join:fmt(C.joined.gsm8k)+' of '+fmt(C.rows.gsm8k)+' GSM8K and '+fmt(C.joined.MATH)+' of '+fmt(C.rows.MATH)+' MATH',
    cos_novel:pct(R.cosmo_agg.novel4_median,0),cos_len:fmt(R.cosmo_agg.len_ratio_median,1)+' times',
    cos_pass:fmt(R.cosmo_agg.seed_pass)+' of '+fmt(R.cosmo_agg.n)+' seeds to '+fmt(R.cosmo_agg.out_pass)+' of '+fmt(R.cosmo_agg.n)+' generated documents (score 2.5 or more, i.e. int_score 3 and up)',
    if_near:fmt(S.rlvr.dup_question.ifeval.near_removable)
  };
  function fill(root){(root||document).querySelectorAll('#t-post [data-pt]').forEach(e=>{const k=e.dataset.pt;if(k in nums)e.textContent=nums[k]})}
  fill();
  // predict-then-reveal blocks
  document.querySelectorAll('#t-post [data-ptpr]').forEach(b=>{b.querySelectorAll('.opts button').forEach(x=>x.addEventListener('click',()=>{
    b.querySelectorAll('.opts button').forEach(y=>{y.classList.remove('right','wrong');if(y.dataset.ok)y.classList.add('right')});
    if(!x.dataset.ok)x.classList.add('wrong');b.querySelector('.ans').hidden=false}))});
  // in-tab nav links scroll inside the page
  document.querySelectorAll('#t-post .pt-nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({block:'start'})}));
  // one-screen stat cards
  const one=document.getElementById('pt-one');
  const card=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>';
  one.innerHTML=card('SFT rows Ai2\'s filters remove',fmt(F.sft.removed)+' of 5,000','English-only would remove '+fmt(sftOpt.non_english.n))+
    card('Preference pairs that are ties',pct(S.pref.ties/5000),fmt(S.pref.ties)+' of 5,000, same judge score')+
    card('GSM8K prompts no answer can win',fmt(F.rlvr.unrewardable_detail.gsm8k||0),'label "3,380", checker compares "3380"')+
    card('Correct MATH solutions a checker rejects',fmt(ref.MATH.n-ref.MATH.ok.last_number)+' of '+fmt(ref.MATH.n),'with the last-number rule; math-verify '+fmt(ref.MATH.n-ref.MATH.ok.math_verify)+', Tulu 3\'s MATH checker '+fmt(ref.MATH.n-ref.MATH.ok.tulu_math));
  return {D,RM,esc,onRender,onResize,width,cv,fmt,pct,of,seg,anim,nums,fill,visible};
})();
