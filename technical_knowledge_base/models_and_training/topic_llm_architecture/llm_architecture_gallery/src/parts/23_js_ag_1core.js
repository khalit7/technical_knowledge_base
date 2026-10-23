// ---- LLM Architecture Gallery: shared helpers (window.AG) used by every tab ----
// The cache arithmetic here is the per-layer form of src/gen_data.py; src/checks/check_data.py runs it in node on every
// row and requires the same numbers as the Python (and as the root Config calculator, src/checks/cc_agree.mjs).
window.AG=(function(){
  const D=window.AGD;if(!D)return null;
  const $=id=>document.getElementById(id);
  const KiB=1024,MiB=2**20,GiB=2**30;
  const fmt=(v,d)=>Number(v).toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  function fmtB(b){if(b==null)return '';if(b>=GiB)return (b/GiB).toFixed(b/GiB>=100?0:(b/GiB>=10?1:2))+' GiB';if(b>=MiB)return (b/MiB).toFixed(b/MiB>=100?0:1)+' MiB';if(b>=KiB){const k=b/KiB;return (Math.abs(k-Math.round(k))<0.005?fmt(Math.round(k)):k>=10?k.toFixed(1):k.toFixed(2).replace(/0$/,''))+' KiB'}return fmt(b,b%1?1:0)+' B'}
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MIXN={G:'full attention',S:'sliding window or chunked',M:'MLA (latent cache)',D:'trained sparse (indexer)',L:'linear or recurrent',H:'attention and SSM heads in one layer',F:'no mixer (FFN-only block)'};
  const FFNN={e:'mixture of experts',d:'dense FFN','.':'none'};
  const POSN={R:'RoPE',P:'partial RoPE or MLA decoupled key',N:'no position (NoPE)',A:'learned absolute',B:'learned relative bias','-':'no attention'};
  const FAM={mha:['MHA','var(--c2)'],gqa:['GQA','var(--c1)'],mqa:['MQA','var(--ink)'],win:['GQA with windows','var(--c6)'],mla:['MLA','var(--c3)'],sparse:['Trained sparse','var(--c4)'],hyb:['Linear or SSM hybrid','var(--c5)']};
  function fam(r){const m=r.mix||'';if(/[LH]/.test(m))return 'hyb';if(/D/.test(m))return 'sparse';if(r.dc&&r.mt!=='Motif'||/M/.test(m))return 'mla';if(/S/.test(m))return 'win';if(r.Hkv===r.H)return 'mha';if(r.Hkv===1)return 'mqa';return 'gqa'}
  const rows=D.rows;rows.forEach(r=>{r.fam=r.mix?fam(r):null;r.y=+r.dt.slice(0,4)+(+r.dt.slice(5,7)-1)/12+(+r.dt.slice(8,10)-1)/365});
  const by={};rows.forEach(r=>by[r.n]=r);
  const own=r=>r.shared?r.L-r.shared:r.L;
  // KV bytes held for one sequence of T tokens (bf16); credit: windowed layers keep min(T, W)
  function cache(r,T,credit){if(!r.mix||!r.per||!r.kv)return null;let s=0;const n=own(r);
    for(let i=0;i<n;i++){const c=r.mix[i],p=r.per[c]||0;s+=p*(credit&&c==='S'&&r.W?Math.min(T,r.W):T)}
    return s*(r.passes||1)}
  const idxAt=(r,T)=>(r.idx||0)*T;
  // fixed recurrent state for one sequence, FP32 (as the Config calculator), matrix state only
  const stateB=r=>r.st?r.st*((r.mix.match(/[LH]/g)||[]).length)*4:0;
  // the per-token arithmetic, grouped by layer kind
  function explain(r){const n=own(r),cnt={};for(let i=0;i<n;i++){const c=r.mix[i];if(r.per[c])cnt[c]=(cnt[c]||0)+1}
    const lines=Object.keys(cnt).map(c=>({c,n:cnt[c],per:r.per[c],ph:(r.ph&&r.ph[c])||'',sub:cnt[c]*r.per[c]}));
    return {lines,total:lines.reduce((a,l)=>a+l.sub,0)*(r.passes||1)}}
  function strip(s,kind,label){const P={m:MIXN,f:FFNN,p:POSN}[kind];
    return '<div class="ag-strip'+(s.length>70?' thin':'')+'" role="img" aria-label="'+label+'">'+[...s].map((c,i)=>'<i class="'+kind+'-'+(c==='.'||c==='-'?'x':c)+'" title="layer '+i+': '+P[c]+'"></i>').join('')+'</div>'}
  const strips=r=>r.mix?'<div class="ag-strips">'+strip(r.mix,'m','mixer per layer')+strip(r.ffn,'f','FFN per layer')+strip(r.pos,'p','position per layer')+'</div>':'<span class="mute small">'+esc(r.mixg||'no config')+'</span>';
  const legend=()=>'<span><b>Mixer</b></span>'+Object.keys(MIXN).map(c=>'<span><i class="ag-sw m-'+c+'"></i>'+MIXN[c]+'</span>').join('')+
    '<span><b>FFN</b></span><span><i class="ag-sw f-e"></i>experts</span><span><i class="ag-sw f-d"></i>dense</span>'+
    '<span><b>Position</b></span>'+['R','P','N','A','B'].map(c=>'<span><i class="ag-sw p-'+c+'"></i>'+POSN[c]+'</span>').join('');
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.m)})}
  // step animation controller for any tab (the Reading tab's RD.anim, with the tab named)
  function anim(o){const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" class="ag-play" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'"><label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const q=s=>$(pid+s);
    function show(){const sc=q('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||900)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||900)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;q('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';q('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    q('p').addEventListener('click',()=>setPlay(!st.play));
    q('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    q('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    q('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    q('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onTab(o.tab,()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}}}
  function tabLinks(el){el.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a)return;e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();$('tabs').scrollIntoView({block:'start'})}})}
  const statusTxt=r=>r.status==='match'?'<span class="ag-ok">matches</span>'+(r.galidx?' (with indexer keys)':''):r.status==='differs'?'<span class="ag-dfr">'+(r.kind==='conv'?'differs: convention':'differs')+'</span>':r.status==='galkv'?'<span class="mute">gallery figure only</span>':r.status==='nocfg'?'<span class="mute">no config</span>':r.status==='tiny'?'<span class="mute">running example</span>':'<span class="mute">not in the gallery</span>';
  // predict-then-reveal drills: <div class="ag-pr" data-ok="b"> with .opts buttons data-k and a hidden .ans
  function drills(root){(root||document).querySelectorAll('.ag-pr').forEach(p=>{if(p.dataset.wired)return;p.dataset.wired=1;const ok=p.dataset.ok,ans=p.querySelector('.ans');
    p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{p.querySelectorAll('.opts button').forEach(x=>x.classList.toggle('right',x.dataset.k===ok));if(b.dataset.k!==ok)b.classList.add('wrong');if(ans)ans.hidden=false}));
    const sk=p.querySelector('.skip');if(sk)sk.addEventListener('click',e=>{e.preventDefault();if(ans)ans.hidden=false})})}
  return {D,rows,by,$,KiB,MiB,GiB,fmt,fmtB,esc,stat,A,RM,MIXN,FFNN,POSN,FAM,fam,cache,idxAt,stateB,explain,strip,strips,legend,onTab,width,seg,anim,tabLinks,statusTxt,own,drills};
})();
