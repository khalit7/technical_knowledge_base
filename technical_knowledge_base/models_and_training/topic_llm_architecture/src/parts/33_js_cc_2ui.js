// Config calculator: shared state, helpers, the step-animation controller for this tab, the model picker, stats,
// the drawn-to-scale parameter bar and the formula cards.
(function(){
  if(!window.CC||!window.CCD||!document.getElementById('cc-model'))return;
  const $=id=>document.getElementById(id);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const grp=n=>Math.round(n).toLocaleString('en-US');
  function cnt(n){const a=Math.abs(n);if(a>=1e12)return (n/1e12).toFixed(a>=1e13?1:2)+'T';if(a>=1e9)return (n/1e9).toFixed(a>=1e11?1:2)+'B';
    if(a>=1e6)return (n/1e6).toFixed(a>=1e8?0:1)+'M';if(a>=1e3)return (n/1e3).toFixed(1)+'K';return String(Math.round(n))}
  function bytes(b){const a=Math.abs(b);if(a>=2**40)return (b/2**40).toFixed(2)+' TiB';if(a>=2**30)return (b/2**30).toFixed(a>=100*2**30?0:a>=10*2**30?1:2)+' GiB';
    if(a>=2**20)return (b/2**20).toFixed(1)+' MiB';if(a>=1024)return (b/1024).toFixed(1)+' KiB';return Math.round(b)+' B'}
  function fl(f){const a=Math.abs(f);if(a>=1e15)return (f/1e15).toFixed(2)+' PFLOP';if(a>=1e12)return (f/1e12).toFixed(2)+' TFLOP';if(a>=1e9)return (f/1e9).toFixed(a>=1e11?0:1)+' GFLOP';
    if(a>=1e6)return (f/1e6).toFixed(1)+' MFLOP';return Math.round(f)+' FLOP'}
  const ctxs=n=>n>=1048576?(n%1048576?(n/1048576).toFixed(1):n/1048576)+'M':n>=10240?Math.round(n/1024)+'k':n>=1024?(n%1024?(n/1024).toFixed(1):n/1024)+'k':String(n);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-calc']=window.TAB_RENDER['t-calc']||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const visible=()=>{const t=$('t-calc');return t&&!t.hidden&&t.offsetParent!==null};
  // step controller (a copy of RD.anim registered on this tab): plays only on screen in the visible tab, never autoplays under reduced motion
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v" aria-label="Speed"><option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option></select></label>';
    const q=s=>$(pid+s);
    function show(){q('s').max=st.n-1;q('s').value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
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
    document.addEventListener('visibilitychange',kick);onRender(()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n},get playing(){return st.play}};
  }
  // ---- state ----
  const S={m:null,cfg:null,spec:null,p:null,subs:[]};
  const byKey={};CCD.models.forEach(m=>byKey[m.key]=m);
  const ctxN=()=>Math.round(2**(+$('cc-ctx').value));
  const batch=()=>2**(+$('cc-b').value);
  const wb=()=>+$('cc-wdt').value, kb=()=>+$('cc-kdt').value;
  function maxCtx(cfg){const c=cfg.text_config||cfg;return c.max_position_embeddings||c.n_positions||0}
  function setModel(key,cfg){
    S.m=key?byKey[key]:null;S.cfg=cfg||(S.m&&S.m.cfg);
    S.spec=CC.normalise(S.cfg);S.p=CC.params(S.spec);update();
  }
  function update(){$('cc-ctxv').textContent=ctxs(ctxN());$('cc-bv').textContent=batch();renderStats();renderBar();renderFm();S.subs.forEach(f=>{try{f()}catch(e){if(window.__jsErr)window.__jsErr(e)}})}
  window.CCS={S,$,esc,grp,cnt,bytes,fl,ctxs,onRender,width,visible,anim,RM,ctxN,batch,wb,kb,maxCtx,byKey,setModel,update};

  // ---- picker ----
  const sel=$('cc-model');let html='',g='';
  CCD.models.forEach(m=>{if(m.group!==g){if(g)html+='</optgroup>';g=m.group;html+='<optgroup label="'+esc(g)+'">'}html+='<option value="'+m.key+'">'+esc(m.label)+'</option>'});
  sel.innerHTML=html+'</optgroup>';sel.value='llama-3.1-8b';
  sel.addEventListener('change',()=>{setModel(sel.value);$('cc-pmsg').textContent=''});
  ['cc-ctx','cc-b','cc-wdt','cc-kdt'].forEach(id=>$(id).addEventListener('input',update));
  $('cc-load').addEventListener('click',()=>{$('cc-paste').value=JSON.stringify(S.m?S.m.cfg:S.cfg,null,1)});
  $('cc-run').addEventListener('click',()=>{const t=$('cc-paste').value,msg=$('cc-pmsg');
    try{const cfg=JSON.parse(t.replace(/\bInfinity\b/g,'1e999'));const sp=CC.normalise(cfg);const p=CC.params(sp);
      if(!(p.total>0)||!isFinite(p.total))throw new Error('no parameters found: is hidden_size (or d_model / n_embd) set?');
      S.m=null;S.cfg=cfg;S.spec=sp;S.p=p;update();msg.className='cc-msg';msg.textContent='Computed from the pasted config ('+(sp.model_type||'unknown model_type')+'): '+cnt(p.total)+' parameters.';}
    catch(e){msg.className='cc-msg bad';msg.textContent='Could not compute: '+e.message+'. Supported model_type values are listed above; a missing field usually means another family.'}});

  // ---- stats ----
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function renderStats(){
    const sp=S.spec,p=S.p,L=ctxN(),B=batch();const f=CC.flops(sp,L,p);const c1=CC.cache(sp,1,kb()),cL=CC.cache(sp,L,kb());
    const moe=p.breakdown.moe_routed>0;let h='';
    h+=stat('Total parameters',cnt(p.total),grp(p.total)+(p.mtp?' (+ '+cnt(p.mtp)+' MTP)':''));
    h+=stat('Active per token',cnt(p.active),moe?'without the input embedding: '+cnt(p.active_no_emb)+'; without embedding and head: '+cnt(p.active_no_emb_head):'dense: every parameter is used');
    h+=stat('Weights in memory',bytes(p.total*wb()),'at '+$('cc-wdt').selectedOptions[0].text.split(' (')[0]);
    h+=stat('Decode FLOPs per token at '+ctxs(L),fl(f.decode),'weights '+fl(f.weights)+', attention and state '+fl(f.decode_attn+f.state));
    h+=stat('Prefill FLOPs per token, '+ctxs(L)+' prompt',fl(f.prefill),'average over the prompt (causal)');
    const wr=(p.total-p.breakdown.moe_routed+(moe?p.breakdown.moe_routed*expFrac(sp,B):0))*wb();
    const ai=B*f.decode/(wr+B*cL.kv);
    h+=stat('Decode arithmetic intensity',ai.toFixed(ai<10?1:0)+' FLOP/byte','batch '+B+'; an H100 SXM needs about 295 to be compute-bound (989.5 TFLOP/s BF16 / 3.35 TB/s, NVIDIA)');
    $('cc-stats').innerHTML=h;
    const m=S.m;let n='';
    if(m){n+='Config: <code>'+esc(m.cfg_from||m.repo)+'</code> at '+esc((m.rev||'').slice(0,10))+(m.cfg_from&&m.cfg_from!==m.repo?' (a mirror of <code>'+esc(m.repo)+'</code>)':'')+'; licence '+esc(m.license||'not stated')+'. ';
      if(m.pub)n+='Published: <b>'+esc(m.pub.label)+'</b> (<a href="'+esc(m.pub.src)+'" target="_blank" rel="noopener noreferrer">vendor</a>, read 2026-10-18). ';}
    if(sp.notes.length)n+='Notes: '+sp.notes.map(esc).join('; ')+'. ';
    if(sp.vision)n+='This checkpoint also has a vision tower, not counted in the totals above (see the check table). ';
    $('cc-notes').innerHTML=n;
  }
  // expected fraction of a layer's routed experts touched by B tokens choosing k of E each, uniform routing (illustrative)
  function expFrac(sp,B){const l=sp.layers.find(x=>x.ffn&&x.ffn.t==='moe');if(!l)return 1;const E=l.ffn.E,k=l.ffn.k;return 1-Math.pow(1-k/E,B)}
  window.CCS.expFrac=expFrac;

  // ---- drawn-to-scale bar ----
  const PARTS=[['embedding','Input embedding','--c5'],['unembedding','Output head (untied)','--c6'],['attention','Attention','--c1'],['ssm','State-space / linear-attention mixers','--c4'],
    ['ffn_dense','Dense feed-forward','--c3'],['moe_shared','Shared experts','--good'],['moe_routed','Routed experts','--c2'],['router','Routers','--closed'],['norms','Norm gains and biases','--mute']];
  function renderBar(){
    const el=$('cc-bar');const W=width(el);const p=S.p,b=p.breakdown;const moe=b.moe_routed>0;
    const act={...b};if(moe)act.moe_routed=b.moe_routed*(p.active-(p.total-b.moe_routed))/b.moe_routed;
    const lw=W<520?58:76,bw=W-lw-4,sc=bw/p.total,h=26;let svg='';
    [['Total',b,0],['Active',act,1]].forEach(([nm,o,r])=>{let x=lw;const y=8+r*(h+18);
      svg+='<text x="0" y="'+(y+h/2+4)+'" font-size="12">'+nm+'</text>';
      PARTS.forEach(([k,,c])=>{const w=o[k]*sc;if(w<=0)return;svg+='<rect x="'+x.toFixed(2)+'" y="'+y+'" width="'+Math.max(w,0.6).toFixed(2)+'" height="'+h+'" fill="var('+c+')"><title>'+k+'</title></rect>';x+=w});
      const tot=PARTS.reduce((a,[k])=>a+o[k],0);
      svg+='<text x="'+Math.min(W-2,lw+tot*sc+4)+'" y="'+(y+h+12)+'" font-size="11" text-anchor="'+(tot*sc>bw-70?'end':'start')+'" fill="var(--mute)">'+cnt(tot)+'</text>';});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+(2*(h+18)+10)+'" width="'+W+'" height="'+(2*(h+18)+10)+'" role="img" aria-label="Parameters by component, total and active, to scale">'+svg+'</svg>';
    $('cc-leg').innerHTML=PARTS.filter(([k])=>b[k]>0).map(([k,nm,c])=>'<div><i style="background:var('+c+')"></i><span class="n">'+nm+'</span><span class="v">'+cnt(b[k])+' &middot; '+(100*b[k]/p.total).toFixed(b[k]/p.total<0.01?2:1)+'%</span></div>').join('');
    let ex='';const m=S.m;
    if(p.mtp)ex+='Outside the bars: a multi-token-prediction (MTP) module of '+cnt(p.mtp)+', shipped in the checkpoint and used for training and speculative decoding, not for ordinary next-token generation. ';
    if(m&&m.val.vision)ex+='Outside the bars: the vision tower and projector, '+cnt(m.val.vision)+' (computed from <code>vision_config</code> in <code>validate.py</code>). ';
    $('cc-extra').innerHTML=ex;
  }

  // ---- formula cards ----
  const pad=(s,n)=>{s=String(s);return s+' '.repeat(Math.max(1,n-s.length))};
  function line(name,form,nums,val){return pad(name,8)+pad(form,30)+pad(nums?'= '+nums:'',34)+'= '+grp(val)}
  function mixerCard(m,d,n){
    const [w,o]=CC.mixerParams(m,d);let t='',L=[];
    if(m.t==='attn'){
      const kind=m.nkv===m.nh?'MHA':m.nkv===1?'MQA':'GQA, '+(m.nh/m.nkv)+' query heads per KV head';
      t='Attention ('+kind+(m.win?', window '+m.win:'')+(m.gate?', output gate':'')+'): n_h='+m.nh+', n_kv='+m.nkv+', d_h='+m.hd;
      L.push(line('q',m.gate?'d x 2 n_h d_h (query + gate)':'d x n_h x d_h',d+' x '+(m.gate?'2 x ':'')+m.nh+' x '+m.hd,d*m.nh*m.hd*(m.gate?2:1)));
      L.push(line('k, v','2 x d x n_kv x d_h','2 x '+d+' x '+m.nkv+' x '+m.hd,2*d*m.nkv*m.hd));
      L.push(line('o','n_h x d_h x d',m.nh+' x '+m.hd+' x '+d,m.nh*m.hd*d));
    }else if(m.t==='mla'){
      t='Multi-head latent attention (MLA): n_h='+m.nh+', q rank '+m.ql+', KV rank '+m.kvl+', nope '+m.nope+' + rope '+m.rope+', v '+m.v+(m.inh?', DSA indexer':'');
      if(m.ql){L.push(line('q_a','d x r_q',d+' x '+m.ql,d*m.ql));L.push(line('q_b','r_q x n_h (nope+rope)',m.ql+' x '+m.nh+' x '+(m.nope+m.rope),m.ql*m.nh*(m.nope+m.rope)))}
      else L.push(line('q','d x n_h (nope+rope)',d+' x '+m.nh+' x '+(m.nope+m.rope),d*m.nh*(m.nope+m.rope)));
      L.push(line('kv_a','d x (r_kv + rope)',d+' x '+(m.kvl+m.rope),d*(m.kvl+m.rope)));
      L.push(line('kv_b','r_kv x n_h (nope+v)',m.kvl+' x '+m.nh+' x '+(m.nope+m.v),m.kvl*m.nh*(m.nope+m.v)));
      L.push(line('o','n_h x v x d',m.nh+' x '+m.v+' x '+d,m.nh*m.v*d));
      if(m.inh)L.push(line('indexer','r_q i_h i_d + d i_d + d i_h',m.ql+'x'+m.inh+'x'+m.ihd+' + '+d+'x'+m.ihd+' + '+d+'x'+m.inh,m.ql*m.inh*m.ihd+d*m.ihd+d*m.inh));
    }else if(m.t==='mamba2'){
      const di=m.nh*m.hd,gs=2*m.ng*m.ds;
      t='Mamba-2 mixer: '+m.nh+' heads x '+m.hd+' = d_in '+di+', state N='+m.ds+', groups g='+m.ng+', conv '+m.k;
      L.push(line('in_proj','d x (2 d_in + 2gN + heads)',d+' x '+(2*di+gs+m.nh),d*(2*di+gs+m.nh)));
      L.push(line('out','d_in x d',di+' x '+d,di*d));
    }else if(m.t==='mamba1'){
      t='Mamba (selective SSM): d_in '+m.di+', state N='+m.ds+', dt rank '+m.dtr+', conv '+m.k;
      L.push(line('in_proj','d x 2 d_in',d+' x '+2*m.di,2*d*m.di));
      L.push(line('x_proj','d_in x (r + 2N)',m.di+' x '+(m.dtr+2*m.ds),m.di*(m.dtr+2*m.ds)));
      L.push(line('dt_proj','r x d_in',m.dtr+' x '+m.di,m.dtr*m.di));
      L.push(line('out','d_in x d',m.di+' x '+d,m.di*d));
    }else if(m.t==='gdn'){
      t='Gated DeltaNet (linear attention): '+m.nk+' key heads x '+m.dk+', '+m.nv+' value heads x '+m.dv+', conv '+m.k;
      L.push(line('qkvz','d x (2 n_k d_k + 2 n_v d_v)',d+' x '+(2*m.nk*m.dk+2*m.nv*m.dv),d*(2*m.nk*m.dk+2*m.nv*m.dv)));
      L.push(line('ba','d x 2 n_v',d+' x '+2*m.nv,2*d*m.nv));
      L.push(line('out','n_v d_v x d',m.nv*m.dv+' x '+d,m.nv*m.dv*d));
    }
    if(o)L.push(line('small','biases, norms, small vectors','',o));
    L.push('per layer '+grp(w+o)+'   x '+n+' layers = '+grp((w+o)*n));
    return '<div class="cc-fmt">'+esc(t)+'</div><div class="cc-fm">'+esc(L.join('\n'))+'</div>';
  }
  function ffnCard(f,d,n){
    let t,L=[];const r=CC.ffnParams(f,d);
    if(f.t==='glu'){t='Feed-forward, gated (SwiGLU or GeGLU): f='+f.ff;L.push(line('up,gate','2 x d x f','2 x '+d+' x '+f.ff,2*d*f.ff));L.push(line('down','f x d',f.ff+' x '+d,f.ff*d))}
    else if(f.t==='mlp'){t='Feed-forward, plain two-matrix MLP: f='+f.ff;L.push(line('up','d x f',d+' x '+f.ff,d*f.ff));L.push(line('down','f x d',f.ff+' x '+d,f.ff*d))}
    else{t='Mixture of experts: E='+f.E+' routed experts of width '+f.ff+', top-k='+f.k+(f.sff?', shared width '+f.sff:'');
      const nm=f.g===false?2:3,ei=f.lat||d,ed=f.lat?'l':'d';if(f.g===false)t+=', two-matrix (squared ReLU) experts';if(f.lat)t+=', latent l='+f.lat;
      if(f.lat)L.push(line('latent','2 x d x l (in and out)','2 x '+d+' x '+f.lat,2*d*f.lat));
      L.push(line('experts','E x '+nm+' x '+ed+' x f_e',f.E+' x '+nm+' x '+ei+' x '+f.ff,f.E*nm*ei*f.ff));
      if(f.sff)L.push(line('shared',nm+' x d x f_s',' '+nm+' x '+d+' x '+f.sff,nm*d*f.sff));
      L.push(line('router','d x E',d+' x '+f.E,d*f.E));
      L.push(line('active','k/E of the experts',f.k+'/'+f.E+' x '+grp(f.E*nm*ei*f.ff),f.k*nm*ei*f.ff));}
    const o=r.dense_o+r.routed_o+r.moe_o+(f.sgate?d:0);if(o)L.push(line('small','biases, gates','',o));
    const tot=Object.values(r).reduce((a,b)=>a+b,0);
    L.push('per layer '+grp(tot)+'   x '+n+' layers = '+grp(tot*n));
    return '<div class="cc-fmt">'+esc(t)+'</div><div class="cc-fm">'+esc(L.join('\n'))+'</div>';
  }
  function renderFm(){
    const sp=S.spec,d=sp.d,p=S.p;const mix=new Map(),ffn=new Map();
    sp.layers.forEach(l=>{['mix','mix2'].forEach(k=>{const m=l[k];if(!m)return;const j=JSON.stringify(m);mix.set(j,(mix.get(j)||0)+1)});
      if(l.ffn){const j=JSON.stringify(l.ffn);ffn.set(j,(ffn.get(j)||0)+1)}});
    let h='<div class="cc-fmt">Embedding and output head: V='+sp.V+', d='+d+(sp.tied?', tied':'')+'</div><div class="cc-fm">'+esc([
      line('embed','V x d',sp.V+' x '+d,sp.V*d)+(sp.pos_embed?'\n'+line('pos','positions x d','',sp.pos_embed):''),
      sp.tied?'head    tied: reuses the embedding (0 extra parameters, still 2Vd FLOPs per token)':line('head','V x d (untied)',sp.V+' x '+d,sp.V*d)].join('\n'))+'</div>';
    mix.forEach((n,j)=>h+=mixerCard(JSON.parse(j),d,n));
    ffn.forEach((n,j)=>h+=ffnCard(JSON.parse(j),d,n));
    h+='<div class="cc-fmt">Norm gains (and biases where the model has them)</div><div class="cc-fm">'+esc('all layers and the final norm = '+grp(p.breakdown.norms))+'</div>';
    // KV and FLOPs coefficients
    const kvl=[],fll=[];let fullA=0,winA=0;
    mix.forEach((n,j)=>{const m=JSON.parse(j);
      if(m.t==='attn'){kvl.push(pad(n+' layers',11)+'2 x n_kv x d_h x bytes = 2 x '+m.nkv+' x '+m.hd+' x '+kb()+' = '+grp(2*m.nkv*m.hd*kb())+' B per token per layer'+(m.win?' (capped at '+m.win+' tokens)':''));
        fll.push(pad(n+' layers',11)+'2 x n_h x (d_h + d_h) = 2 x '+m.nh+' x '+(2*m.hd)+' = '+grp(2*m.nh*2*m.hd)+' FLOPs per cached position per layer')}
      else if(m.t==='mla'){kvl.push(pad(n+' layers',11)+'(r_kv + rope'+(m.ihd?' + indexer key':'')+') x bytes = ('+m.kvl+' + '+m.rope+(m.ihd?' + '+m.ihd:'')+') x '+kb()+' = '+grp((m.kvl+m.rope+m.ihd)*kb())+' B per token per layer');
        fll.push(pad(n+' layers',11)+'decode, absorbed: 2 x n_h x (2 r_kv + rope) = 2 x '+m.nh+' x '+(2*m.kvl+m.rope)+' = '+grp(2*m.nh*(2*m.kvl+m.rope))+' per position'+(m.itop?' (top '+m.itop+' positions)':''));
        fll.push(pad('',11)+'prefill: 2 x n_h x (nope + rope + v) = 2 x '+m.nh+' x '+(m.nope+m.rope+m.v)+' = '+grp(2*m.nh*(m.nope+m.rope+m.v))+' per position')}
      else kvl.push(pad(n+' layers',11)+m.t+': no per-token cache; a fixed state per sequence (counted in FP32)')});
    h+='<div class="cc-fmt">KV cache per token</div><p class="cc-hint">Sized on Long context (its KV-cache calculator runs these formulas); the bytes the decode step reads are counted in the arithmetic intensity above.</p>';
    h+='<div class="cc-fmt">FLOPs per token</div><div class="cc-fm">'+esc(['weights: 2 x '+grp(p.matmul_active)+' matmul weights touched (LM head in, embedding lookup out) = '+grp(2*p.matmul_active)].concat(fll).join('\n'))+'</div>';
    $('cc-fm').innerHTML=h;
  }
  addEventListener('resize',()=>{if(visible()&&S.spec)renderBar()});
  onRender(()=>{if(S.spec)renderBar()});
  setModel('llama-3.1-8b');
})();
