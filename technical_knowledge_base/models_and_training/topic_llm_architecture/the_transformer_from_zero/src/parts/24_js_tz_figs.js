// Reading tab 2D figures (2026-10-23; since 2026-11-10 the hero, embedding, one head, heads, block and shifted targets are 3D stages, 41_ to 46_js_sc_*.js):
// FFN to scale, KV-cache before/after stepper, one block's matrices to scale.
// Numbers: TZD (recorded runs) and fact placeholders filled at build time by fill.py from page_text.json; nothing is invented.
(function(){
  if(!window.TZD||!window.RD)return;
  const D=window.TZD,$=id=>document.getElementById(id),esc=RD.esc,T=RD.t;
  const num=s=>+String(s).replace(/,/g,'');
  const f0=n=>Math.round(n).toLocaleString('en-US');
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx==null?5:o.rx)+'" fill="'+(o.fill||'none')+'"'+(o.op!=null?' fill-opacity="'+o.op+'"':'')+' stroke="'+(o.stroke||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};

  // ---------------------------------------------------------------- FFN: two matrices or three, to scale
  const FFN={
    gelu:{mats:[['W_up','(1,024, 256)'],['W_down','(256, 1,024)']],r:4,flow:'x (D) to W_up (F = 1,024) to GELU to W_down (D)',p:'2 x 256 x 1,024 = 524,288 = 8 D²',
      cap:'The file’s FFN: two matrices of D x 4D. Every position goes through it on its own, so the hidden activation is (1, 256, 1,024) = (B, T, F).'},
    swi:{mats:[['W_g','(704, 256)'],['W_u','(704, 256)'],['W_d','(256, 704)']],r:2.75,flow:'x to W_g and W_u (F = 704), SiLU(gate) x up, to W_d (D)',p:'3 x 256 x 704 = 540,672 = 8.25 D² (3.1% more)',
      cap:'Config(swiglu=True): three matrices at F = 8/3 D, rounded up to a multiple of 32 (704), so the area stays within 3.1% of the GELU MLP (dashed outline).'},
    llama:{mats:[['gate','(14,336, 4,096)'],['up','(14,336, 4,096)'],['down','(4,096, 14,336)']],r:3.5,flow:'the same SwiGLU, at F = 14,336 = 3.5 D',p:'3 x 4,096 x 14,336 = 176,160,768 = 10.5 D²',
      cap:'Llama 3.1 8B, drawn in units of its own D = 4,096: three matrices of 3.5 D, 10.5 D² in all, wider than the equal-parameter 8/3 rule (config.json).'}};
  let ffnMode='gelu';
  function ffn(){
    const host=$('tz-ffn');if(!host)return;
    const W=Math.min(RD.width(host),700),narrow=W<520,m=FFN[ffnMode];
    const u=Math.min(narrow?26:34,(W-30)/(3*3.5+0.6)),gap=8;let g='',x=4,y=18;
    g+=T(4,12,esc(m.flow),{fs:11,fill:'var(--mute)'});
    // the GELU MLP's total area (8 D squared) as a dashed reference strip
    const refw=8*u+gap;
    m.mats.forEach(([nm,sh],i)=>{const w=m.r*u;g+=rect(x,y+8,w,u,{fill:'var(--c3)',op:.45,stroke:'var(--c3)',rx:2})+T(x+4,y+8+u+14,nm,{fs:11,w:600})+T(x+4,y+8+u+28,sh,{fs:11,fill:'var(--mute)'});x+=w+gap});
    g+=rect(4,y+u+48,refw,6,{fill:'none',stroke:'var(--mute)',dash:'4 3',rx:1})+T(4+refw+6,y+u+55,'8 D²',{fs:11,fill:'var(--mute)'});
    g+=T(4,y+u+76,esc(m.p),{fs:11.5,w:600});
    host.innerHTML=RD.svg(W,y+u+84,g,'Feed-forward weight matrices drawn to scale in units of D');
    $('tz-ffn-cap').textContent=m.cap+' Each bar is one weight matrix, height D and length F, so area is parameters.';
  }

  // ---------------------------------------------------------------- KV cache: recompute against keep (before/after stepper)
  const NMM=num('[[f:matmul_params|i]]'),L=6,DM=256,P0=30,NG=10;
  let kvMode=0,kvA=null;const KVS=[0,1,2,5,10];
  function kvAt(i,mode){ // tokens through the model and FLOPs at step i (0 = prefill)
    const t=P0+i;
    if(i===0)return {through:P0,fl:2*NMM*P0+4*L*DM*P0*(P0+1)/2};
    if(mode===0)return {through:t,fl:2*NMM*t+4*L*DM*t*(t+1)/2};
    return {through:1,fl:2*NMM+4*L*DM*t};
  }
  function kv(i){
    const host=$('tz-kv-svg');if(!host)return;
    const W=Math.min(RD.width(host),700),n=P0+NG,c=Math.max(5,(W-8)/n),t=P0+i;let g='',y=16;
    g+=T(4,y-4,'tokens in the context (30 prompt + 10 generated)',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<n;k++){const x=4+k*c,have=k<t,isNew=i>0&&k===t-1;
      const through=i===0?k<P0:(kvMode===0?k<t:isNew);
      g+=rect(x,y,c-1,14,{fill:have?(through?'var(--c2)':'var(--c1)'):'var(--soft)',op:have?(through?.75:.3):1,stroke:isNew?'var(--ink)':'none',rx:1})}
    y+=34;g+=T(4,y-4,kvMode===1?'KV cache, per layer (K and V for each token, 6 layers)':'no cache: keys and values are recomputed from scratch',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<n;k++){const x=4+k*c,inC=kvMode===1&&k<t;g+=rect(x,y,c-1,14,{fill:inC?'var(--c3)':'var(--soft)',op:inC?.6:1,stroke:'none',rx:1})}
    y+=24;g+=T(4,y+6,'orange: tokens through the model this step; outlined: the new token',{fs:11,fill:'var(--mute)'});
    host.innerHTML=RD.svg(W,y+12,g,'Tokens processed per generation step with and without a KV cache');
    const now=kvAt(i,kvMode);let tot=0,other=0;for(let k=0;k<=i;k++){tot+=kvAt(k,kvMode).fl;other+=kvAt(k,1-kvMode).fl}
    $('tz-kv-cnt').innerHTML=RD.stat('Through the model now',now.through+(now.through===1?' token':' tokens'),i===0?'prefill':'generating token '+(t))+RD.stat('FLOPs this step',(now.fl/1e9).toFixed(2)+' G','derived')+RD.stat('FLOPs so far',(tot/1e9).toFixed(2)+' G',(kvMode?'without a cache: ':'with a cache: ')+(other/1e9).toFixed(2)+' G')+RD.stat('Cache held (bf16)',kvMode?f0(t*2*L*DM*2)+' B':'none',kvMode?'2 x L x D x 2 bytes x '+t+' tokens':'');

  }

  // ---------------------------------------------------------------- one block's matrices to scale (units of D squared)
  const MAT={
    tiny:{att:[['q',1,1],['k',1,1],['v',1,1],['o',1,1]],ffn:[['up',1,4],['down',1,4]],
      cap:'The tiny GPT: W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub>, W<sub>o</sub> are (256, 256), four squares of D<sup>2</sup>; the FFN’s up (1,024, 256) and down (256, 1,024) are four squares each. 4 + 8 = 12 D<sup>2</sup> = 786,432, plus 512 norm gains: [[f:p_block|i]] per block.'},
    llama:{att:[['q',1,1],['k',1,.25],['v',1,.25],['o',1,1]],ffn:[['gate',1,3.5],['up',1,3.5],['down',1,3.5]],
      cap:'Llama 3.1 8B in units of its own D = 4,096: q and o are D x D, but k and v are (1,024, 4,096), a quarter each, because 8 key-value heads serve 32 query heads (GQA); the SwiGLU FFN is three matrices of 3.5 D. 2.5 + 10.5 = 13.0 D<sup>2</sup> = 218,103,808, plus 8,192 norm gains: 218,112,000 (the predict below).'}};
  let matMode='tiny';
  function mat(){
    const host=$('tz-mat');if(!host)return;
    const W=Math.min(RD.width(host),700),u=Math.min(46,(W-34)/10.9),gap=6,m=MAT[matMode];let g='',y=4;
    function row(items,col,title){g+=T(4,y+12,title,{fs:11,fill:'var(--mute)'});y+=18;let x=4;items.forEach(([nm,h,w])=>{const ww=w*u,hh=h*u;g+=rect(x,y,ww,hh,{fill:'var('+col+')',op:.4,stroke:'var('+col+')',rx:2})+T(x+Math.min(ww/2,ww-4),y+hh/2+4,nm,{a:ww<22?'end':'middle',fs:11});x+=ww+gap});y+=u+8}
    row(m.att,'--c1','attention: q, k, v, o');row(m.ffn,'--c3','feed-forward');
    host.innerHTML=RD.svg(W,y,g,'One block’s weight matrices drawn to scale');
    $('tz-mat-cap').innerHTML=m.cap+' One square is D<sup>2</sup> parameters.';
  }

  function all(){ffn();mat();if(kvA)kv(KVS[kvA.i])}
  // five of the eleven generation steps, each explained in the step list of its mode (sx-kv0 without a cache, sx-kv1 with one)
  if($('tz-kv-svg')){kvA=RD.anim({card:'tz-kv',ctl:'tz-kv-ctl',n:KVS.length,draw:i=>kv(KVS[i]),ms:3800,label:'Generation step',list:'sx-kv0'});
    RD.seg($('tz-kv-seg'),m=>{kvMode=+m;['sx-kv0','sx-kv1'].forEach((id,j)=>{$(id).hidden=j!==kvMode});kvA.reset(KVS.length,'sx-kv'+kvMode)})}
  if($('tz-ffn-seg'))RD.seg($('tz-ffn-seg'),m=>{ffnMode=m;ffn()});
  if($('tz-mat-seg'))RD.seg($('tz-mat-seg'),m=>{matMode=m;mat()});
  RD.onRender(all);RD.onResize(all);all();
})();
