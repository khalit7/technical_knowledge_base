// ---- Ecosystem map (t-map): shared helpers, predict-then-reveal widgets, render registry ----
window.MAP=(function(){
  const D=window.MAPD;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-map');
  const visible=()=>{const t=tab();return t&&!t.hidden&&!document.hidden};
  const renders=[];
  function onRender(f){renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-map']=window.TAB_RENDER['t-map']||[]).push(f)}
  let rz=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rz);rz=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),120)});
  const width=el=>Math.max(260,Math.floor((el.getBoundingClientRect().width||el.parentNode.getBoundingClientRect().width||600)));
  const byId={};D.atlas.forEach(a=>byId[a.id]=a);
  const STATUS=['active','maintenance','paused','deprecated','archived','merged','quiet'];
  const LAYERS=[['core','core'],['satellite','satellite'],['kernels','kernels'],['hf','HF stack'],['trainer','trainers'],['scale','scale'],['rl','RL'],['deploy','deploy'],['data','data']];
  const TASKS=[['','any task'],['pretrain','pretraining'],['finetune','full fine-tuning'],['lora','LoRA / QLoRA'],['rl','RL post-training'],['quantize','quantization'],['kernels','kernels'],['deploy-edge','on-device'],['serve','serving'],['deploy','export and formats'],['data','data loading'],['research','research and internals'],['vision','vision'],['audio','audio'],['recsys','recommendation']];
  const st=s=>'<span class="map-st s-'+esc(s)+'">'+esc(s)+'</span>';
  const fmtB=b=>b>=1e6?(b/1e6).toFixed(2)+' MB':b>=1e3?(b/1e3).toFixed(1)+' KB':b+' B';
  const nf=n=>Number(n).toLocaleString('en-US');
  const link=(t,u)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
  // predict-then-reveal: el has buttons with data-k; right = key; ans = html
  function predict(id,right,ans){
    const el=$(id);if(!el)return;const out=el.querySelector('.map-ans');
    el.querySelectorAll('.map-opts button').forEach(b=>b.addEventListener('click',()=>{
      el.querySelectorAll('.map-opts button').forEach(x=>x.classList.remove('map-right','map-wrong'));
      b.classList.add(b.dataset.k===right?'map-right':'map-wrong');
      el.querySelector('.map-opts button[data-k="'+right+'"]').classList.add('map-right');
      out.hidden=false;out.innerHTML=(b.dataset.k===right?'<b>Right.</b> ':'<b>Not quite.</b> ')+ans}));
  }
  // step animation controller: {n, draw(i), ms, play, back, fwd, scrub, speed, card}
  function anim(o){
    const s={i:o.start||0,n:o.n,play:false,timer:0,vis:false,spd:1,seen:false};
    const P=$(o.play),B=$(o.back),F=$(o.fwd),S=$(o.scrub),V=o.speed?$(o.speed):null,card=$(o.card);
    const live=()=>s.vis&&visible();
    function show(){S.max=Math.max(0,s.n-1);S.value=s.i;o.draw(s.i)}
    function tick(){s.timer=0;if(!s.play||!live())return;if(s.i>=s.n-1){setPlay(false);return}s.i++;show();if(s.i>=s.n-1){setPlay(false);return}s.timer=setTimeout(tick,(o.ms||900)/s.spd)}
    function kick(){if(s.play&&live()&&!s.timer)s.timer=setTimeout(tick,(o.ms||900)/s.spd);else if(!live()&&s.timer){clearTimeout(s.timer);s.timer=0}}
    function setPlay(p){s.play=p;P.textContent=p?'Pause':(o.playLabel||'Play');P.setAttribute('aria-pressed',p?'true':'false');if(!p&&s.timer){clearTimeout(s.timer);s.timer=0}if(p){if(s.i>=s.n-1){s.i=0;show()}kick()}}
    P.addEventListener('click',()=>setPlay(!s.play));
    B.addEventListener('click',()=>{setPlay(false);s.i=Math.max(0,s.i-1);show()});
    F.addEventListener('click',()=>{setPlay(false);s.i=Math.min(s.n-1,s.i+1);show()});
    S.addEventListener('input',()=>{setPlay(false);s.i=+S.value;show()});
    if(V)V.addEventListener('change',()=>{s.spd=+V.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{es.forEach(e=>{s.vis=e.isIntersecting;
      kick()})},{threshold:0.15}).observe(card)}else s.vis=true;
    document.addEventListener('visibilitychange',kick);
    return {reset(n,i){s.n=n;s.i=(i==null?0:i);show()},show,setPlay,get i(){return s.i},set i(v){s.i=v},get n(){return s.n},kick};
  }
  return {D,RM,esc,$,onRender,width,byId,STATUS,LAYERS,TASKS,st,fmtB,nf,link,predict,anim,visible};
})();
