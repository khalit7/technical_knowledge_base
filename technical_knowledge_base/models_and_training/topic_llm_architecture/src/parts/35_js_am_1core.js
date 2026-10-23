// ---- Architecture map (t-map): shared helpers under window.AM ----
// Data: window.AMD (models, from src/map/build_map.py) and window.AMS (shift stepper, from src/map/shifts.py).
// The step controller is a copy of RD.anim registered on this tab: it animates only while its card is on screen
// in the visible tab, never autoplays: it waits until the reader presses play or steps (2026-10-23).
window.AM=(function(){
  if(!window.AMD||!document.getElementById('t-map'))return null;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-map']=window.TAB_RENDER['t-map']||[]).push(f)};
  const visible=()=>{const t=$('t-map');return t&&!t.hidden&&t.offsetParent!==null};
  const onResize=f=>{let t=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(t);t=setTimeout(f,80)})};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const fmtB=b=>{if(b==null)return 'n/a';if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(b<10240?2:1).replace(/\.0+$/,'')+' KiB';
    if(b<1073741824)return (b/1048576).toFixed(b<10485760?2:1).replace(/\.0+$/,'')+' MiB';return (b/1073741824).toFixed(2)+' GiB'};
  const fmtP=p=>{if(p==null)return 'n/a';if(p===0)return '0';if(p<1e3)return String(p);if(p<1e6)return (p/1e3).toFixed(1).replace(/\.0$/,'')+'K';
    if(p<1e9)return (p/1e6).toFixed(p<1e7?2:1).replace(/\.0+$/,'')+'M';return (p/1e9).toFixed(p<1e10?2:1).replace(/\.0+$/,'')+'B'};
  const num=n=>n==null?'':Number(n).toLocaleString('en-US');
  const ATT=[['MHA','--am-mha','Multi-head (one KV head per query head)'],['MQA','--am-mqa','Multi-query (one KV head)'],['GQA','--am-gqa','Grouped-query'],
    ['MLA','--am-mla','Multi-head latent'],['Sparse','--am-sparse','Trained sparse selection'],['Hybrid','--am-hyb','Linear attention or SSM hybrid']];
  const FFN=[['Dense','--am-dense','Dense FFN'],['MoE','--am-moe','Mixture of experts'],['Hybrid dense','--am-hd','Hybrid, dense FFN'],['Hybrid MoE','--am-hm','Hybrid with MoE']];
  const colAtt=k=>'var('+(ATT.find(a=>a[0]===k)||ATT[0])[1]+')';
  const colFfn=k=>'var('+(FFN.find(a=>a[0]===k)||FFN[0])[1]+')';
  const LANES=['OpenAI','Google','Meta','Mistral','DeepSeek','Qwen','Moonshot','Zhipu','MiniMax','Ai2','Hybrids','Others'];
  const LIC={permissive:'Permissive (Apache 2.0, MIT)',custom:'Open weights, custom licence',research:'Research only',closed:'Closed'};
  const MIX={G:['full attention','var(--am-gqa)'],S:['sliding window','var(--am-mqa)'],M:['MLA','var(--am-mla)'],D:['trained sparse','var(--am-sparse)'],
    L:['linear attention or SSM','var(--am-hyb)'],H:['attention and SSM in parallel','var(--am-hd)'],F:['FFN-only block','var(--dim)']};
  const rows=window.AMD;
  const byId={};rows.forEach(r=>byId[r.id]=r);
  const t2x=d=>{const p=d.split('-').map(Number);return p[0]+(p[1]-1)/12+((p[2]||1)-1)/365};
  const link=(t,u)=>{if(!u)return esc(t);if(u.indexOf('n:')===0)u='https://app.notion.com/p/'+u.slice(2);return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>'};
  const ctx=r=>r.cx?esc(r.cx):(r.ctxc?'config: '+num(r.ctxc):'n/a');
  const params=r=>r.act?esc(r.tot)+' total, '+esc(r.act)+' active':esc(r.tot||'n/a');
  // step controller (copy of RD.anim for this tab)
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:o.start||0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const q=s=>$(pid+s);
    function show(){const sc=q('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;q('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';q('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    q('p').addEventListener('click',()=>setPlay(!st.play));
    q('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    q('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    q('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    q('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n,i){setPlay(false);st.n=n;st.i=i==null?0:i;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  function tabLinks(el){el.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();$('tabs').scrollIntoView({block:'start'})}})}
  // detail card for one model (used by the timeline and the table)
  function strip(r){
    let h='<div class="am-strip" aria-label="Layer strip: one cell per layer, coloured by sequence mixer">';
    for(let i=0;i<r.mix.length;i++){const c=r.mix[i],m=MIX[c]||['?','var(--dim)'];
      const f=r.ffn[i]==='e'?', MoE FFN':r.ffn[i]==='d'?', dense FFN':'';const p=r.pos[i];
      const pn={A:'learned position',R:'RoPE',P:'partial RoPE',N:'NoPE','-':''}[p]||'';
      h+='<span title="layer '+(i+1)+': '+m[0]+f+(pn?', '+pn:'')+'" style="background:'+m[1]+(r.ffn[i]==='e'?';box-shadow:inset 0 -4px 0 var(--am-moe)':'')+(p==='N'?';opacity:.55':'')+'"></span>'}
    return h+'</div>'}
  function detail(r){
    const dd=(k,v)=>v==null||v===''?'':'<dt>'+k+'</dt><dd>'+v+'</dd>';
    let ffn=esc(r.ffa||'');
    if(r.E)ffn+=', '+r.E+' experts, top-'+r.k+(r.sh?' plus '+r.sh+' shared':'')+(r.dffe?' (expert width '+num(r.dffe)+')':'');
    else if(r.dff)ffn+=', width '+num(r.dff)+' ('+(r.dff/r.D).toFixed(2)+' x d)';
    const ffnL=r.ffn.indexOf('e')>=0?r.ffn.split('').filter(c=>c==='e').length+' MoE layers, '+r.ffn.split('').filter(c=>c==='d').length+' dense':'';
    let pos=r.pos.indexOf('A')>=0?'Learned absolute':r.pos.indexOf('R')>=0||r.pos.indexOf('P')>=0?(r.pos.indexOf('P')>=0?'Partial or decoupled RoPE':'RoPE')+(r.theta?', base '+esc(r.theta):''):'None (NoPE)';
    const nN=r.pos.split('').filter(c=>c==='N').length;if(nN&&nN<r.pos.replace(/-/g,'').length)pos+='; NoPE in '+nN+' layers';
    if(r.scale)pos+='; scaling '+esc(r.scale);
    const norm=esc({pre:'Pre-norm',post:'Post-norm (on sub-layer outputs)',sandwich:'Pre- and post-norm (sandwich)',parallel:'Pre-norm, parallel attention and FFN'}[r.nk]||r.nk)+' '+esc(r.nt)+(r.qk?', QK-norm':'');
    const kv=r.kv?fmtB(r.kv)+' per token at full cost'+(r.kvw&&r.kvw<r.kv?'; '+fmtB(r.kvw)+' per token on average at 131,072 tokens with windows credited':'')+'; '+fmtB((r.kvw||r.kv)*131072)+' for one 131,072-token sequence':esc(r.kvnote||'n/a');
    let h='<div class="am-det"><h3>'+esc(r.n)+'</h3><div class="small mute">'+esc(r.lab)+', '+esc(r.dt)+' ('+link(r.dts,r.dtu)+')</div>'+
      '<p style="margin:6px 0">'+esc(r.new)+'</p>'+strip(r)+
      '<div class="am-leg">'+Object.keys(MIX).filter(c=>r.mix.indexOf(c)>=0).map(c=>'<span><i class="am-dot" style="border-radius:2px;background:'+MIX[c][1]+'"></i>'+MIX[c][0]+'</span>').join('')+(r.ffn.indexOf('e')>=0?'<span><i class="am-dot" style="border-radius:2px;background:var(--dim);box-shadow:inset 0 -4px 0 var(--am-moe)"></i>MoE FFN</span>':'')+(nN?'<span><i class="am-dot" style="border-radius:2px;background:var(--am-gqa);opacity:.55"></i>NoPE layer</span>':'')+'</div>'+
      '<dl class="kv">'+dd('Attention',esc(r.att)+(r.dc?' (latent '+r.dc+' + RoPE key '+r.dr+')':'')+(r.sparse?'; '+esc(r.sparse):''))+
      dd('KV cache (bf16, derived)',kv)+(r.st?dd('Recurrent state',num(r.st)+' numbers per linear layer (fixed size, '+fmtB(r.st*2)+' in bf16)'):'')+
      dd('Position',pos+(r.posnote?' <span class="am-sub">'+esc(r.posnote)+'</span>':''))+dd('Normalisation',norm+' <span class="am-sub">'+esc(r.ns)+'</span>')+
      dd('Feed-forward',ffn+(ffnL?' <span class="am-sub">'+ffnL+'</span>':''))+
      dd('Shape',r.L+' layers x '+num(r.D)+' width (d / layers = '+r.ar+'), '+r.H+' query heads'+(r.Hkv?', '+r.Hkv+(r.Hkv===1?' KV head':' KV heads'):'')+', head dim '+r.dh+(r.mixnote?'; '+esc(r.mixnote):''))+
      dd('Vocabulary',num(r.V)+(r.tied?', tied input and output embeddings':''))+dd('Context',ctx(r)+(r.cx&&r.ctxc&&r.cfgu&&!r.ctxp?' <span class="am-sub">config max_position_embeddings '+num(r.ctxc)+'</span>':''))+
      dd('Parameters (published)',params(r)+' '+(r.pu?'<span class="am-sub">'+link('source',r.pu)+(r.pnote?': '+esc(r.pnote):'')+'</span>':''))+
      dd('Licence',esc(r.lic)+(LIC[r.lk]&&LIC[r.lk]!==r.lic?' <span class="am-sub">'+esc(LIC[r.lk])+'</span>':''))+
      dd('Sources',[r.cfgu?link('config.json',r.cfgu):'',r.paper?link('paper or card',r.paper):''].filter(Boolean).join(' · '))+'</dl></div>';
    return h}
  return {RM,$,esc,onRender,onResize,visible,width,fmtB,fmtP,num,ATT,FFN,colAtt,colFfn,LANES,LIC,MIX,rows,byId,t2x,link,ctx,params,anim,seg,tabLinks,detail,strip};
})();
