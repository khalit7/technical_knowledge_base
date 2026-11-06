// ---- Tool map (t-map): shared helpers, predict-then-reveal, step animation (LABANIM), render registry ----
window.MAP=(function(){
  const D=window.MAPD;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-map');
  const visible=()=>{const t=tab();return t&&!t.hidden&&!document.hidden};
  const renders=[];
  function onRender(f){renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-map']=window.TAB_RENDER['t-map']||[]).push(()=>{try{f()}catch(e){console.error(e);throw e}})}
  let rz=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rz);rz=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),120)});
  const width=el=>Math.max(260,Math.floor((el.getBoundingClientRect().width||el.parentNode.getBoundingClientRect().width||600)));
  const byId={};D.atlas.forEach(a=>byId[a.id]=a);
  const LAYERS=[['fw','Frameworks','split documents, wire the steps, call the store and the model','var(--c4)'],
    ['embed','Embedding models','turn text (or images) into vectors','var(--c1)'],
    ['lexical','Lexical search (BM25)','score documents by the words they share with the query','var(--c5)'],
    ['store','Vector stores and engines','an ANN index plus storage, filters, hybrid search and an API','var(--c3)'],
    ['lib','ANN libraries','the index alone, inside your process','var(--c6)'],
    ['rerank','Rerankers','read query and candidate together and re-score the shortlist','var(--c2)'],
    ['late','Late interaction','one vector per token, matched token by token (ColBERT, ColPali)','var(--c2)'],
    ['graph','GraphRAG','an entity graph or summaries built over the whole corpus','var(--c4)'],
    ['eval','Evaluation and benchmarks','metrics, golden sets, judges, leaderboards','var(--mute)']];
  const LC=[['permissive','permissive'],['copyleft or source-available','copyleft or source-available'],['non-commercial','non-commercial'],['custom','custom licence'],['mixed','mixed'],['proprietary','proprietary service']];
  const DEP=[['self','self-hostable'],['hosted','hosted only'],['library','library'],['weights','open weights']];
  const STATUS=['active','maintenance','superseded','quiet','product only'];
  const layerOf=k=>LAYERS.find(l=>l[0]===k)||[k,k,'','var(--dim)'];
  const st=s=>'<span class="map-st s-'+esc(String(s).split(' ')[0])+'">'+esc(s)+'</span>';
  const nf=n=>Number(n).toLocaleString('en-US');
  const link=(t,u)=>{if(!u)return esc(t);if(u.indexOf('n:')===0)u='https://app.notion.com/p/'+u.slice(2);return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>'};
  const fmtP=n=>n==null?'':n>=1e9?(n/1e9).toFixed(n>=1e10?0:1)+'B':n>=1e6?Math.round(n/1e6)+'M':nf(n);
  function predict(id,right,ans){
    const el=$(id);if(!el)return;const out=el.querySelector('.map-ans');
    el.querySelectorAll('.map-opts button').forEach(b=>b.addEventListener('click',()=>{
      el.querySelectorAll('.map-opts button').forEach(x=>x.classList.remove('map-right','map-wrong'));
      b.classList.add(b.dataset.k===right?'map-right':'map-wrong');
      el.querySelector('.map-opts button[data-k="'+right+'"]').classList.add('map-right');
      out.hidden=false;out.innerHTML=(b.dataset.k===right?'<b>Right.</b> ':'<b>Not quite.</b> ')+(typeof ans==='function'?ans():ans)}));
  }
  // step animation (2026-11-06): the page's lab controller LABANIM (24_js_labanim.js, RD.anim's motion rules) in this tab:
  // o {card, ctl (controls are written into it), n, draw(i), ms, list (the ol.sx step list on the left), label}. It plays by itself once at least
  // half of its card is on screen in the visible tab, pauses off screen, stops for good on any reader control or at its last step, never moves under reduced motion.
  function anim(o){return window.LABANIM('t-map',{card:o.card,ctl:o.ctl,n:o.n,draw:o.draw,ms:o.ms||4200,list:o.list,label:o.label})}
  return {D,RM,esc,$,onRender,width,byId,LAYERS,LC,DEP,STATUS,layerOf,st,nf,link,fmtP,predict,anim,visible};
})();
