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
  function anim(o){ // 2026-11-09: the skill template RD.anim (21_js_rd_common.js): plays once at least half in view, pauses off screen, stops for good on any control or at its last step,
    // never moves by itself under reduced motion; o.auto false makes it a widget that never plays by itself. Redrawn when this tab opens.
    if(!o.fast)o.ms=Math.max(o.ms||0,3800); // time to read each step's caption
    const A=RD.anim(o);onRender(()=>A.redraw());return A}
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
