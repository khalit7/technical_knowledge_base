// KV-cache calculator engine (window.KC): the same arithmetic as src/kv_calc/make_kv_data.py (seq_bytes), checked by
// src/kv_calc/check_kv.mjs on every preset at 1K, 4K, 32K, 128K and 1M tokens. One sequence:
//   keep x sum over layer groups of n x (e x kvb x min(T, window) + idx x kvb x T)  +  fixed state numbers x sb
// or tokB x T + fixB for a preset whose bytes per token are fixed by a published layout (DeepSeek-V4).
window.KC=(function(){
  if(!window.KCD)return null;
  const span=(T,w)=>w?Math.min(T,w):T;
  function seq(p,T,o){o=o||{};const kvb=o.kvb||2,sb=o.sb||4,keep=o.keep===undefined?1:o.keep;
    if(p.tokB!==undefined)return {kv:p.tokB*T+p.fixB,state:0,total:p.tokB*T+p.fixB,fixedLayout:true};
    let kv=0;p.groups.forEach(g=>{kv+=g.n*(g.e*kvb*span(T,g.win)+g.idx*kvb*T)});kv*=keep;
    const st=p.stateNums*sb;return {kv,state:st,total:kv+st}}
  // bytes one decode step reads from this sequence's cache (DSA reads top-k latents but every indexer key)
  function read(p,T,o){o=o||{};const kvb=o.kvb||2,keep=o.keep===undefined?1:o.keep;if(p.tokB!==undefined)return null;
    let r=0;p.groups.forEach(g=>{const s=span(T,g.win);r+=g.n*(g.e*kvb*(g.topk?Math.min(s,g.topk):s)*keep+g.idx*kvb*T)});return r}
  // per token, one layer of each kind, in numbers (windows not credited)
  const perLayer=p=>p.tokB!==undefined?[]:p.groups.map(g=>({n:g.n,e:g.e,idx:g.idx,win:g.win,topk:g.topk}));
  const DESIGNS=[['cfg','As released'],['mha','MHA: one KV head per query head'],['gqa8','GQA, 8 KV heads'],['mqa','MQA, 1 KV head'],
    ['mla','MLA latent, 512 + 64 per layer'],['swa','Every layer windowed, 4,096 tokens'],['lg51','5 local : 1 global, window 1,024'],
    ['hyb','3 linear : 1 attention (Qwen3-Next-style state)']];
  function redesign(p,d){
    if(d==='cfg'||!p.shape)return p;const s=p.shape,L=s.L,base=2*s.nkv*s.hd,g=(n,e,win)=>({n,e,win:win||0,idx:0,topk:0});
    const q=Object.assign({},p,{stateNums:0});
    if(d==='mha')q.groups=[g(L,2*s.nq*s.hd)];
    else if(d==='gqa8')q.groups=[g(L,2*Math.min(8,s.nq)*s.hd)];
    else if(d==='mqa')q.groups=[g(L,2*s.hd)];
    else if(d==='mla')q.groups=[g(L,576)];
    else if(d==='swa')q.groups=[g(L,base,4096)];
    else if(d==='lg51'){const G=Math.floor(L/6);q.groups=[g(L-G,base,1024),g(G,base)]}
    else if(d==='hyb'){const A=Math.ceil(L/4);q.groups=[g(A,base)];q.stateNums=(L-A)*32*128*128}
    return q}
  // first context (tokens) at which one sequence's cache reaches b bytes; Infinity if never (fixed-size caches)
  function reach(p,b,o){if(seq(p,1<<30,o).total<b)return Infinity;let lo=0,hi=1<<30;while(hi-lo>1){const m=Math.floor((lo+hi)/2);if(seq(p,m,o).total>=b)hi=m;else lo=m}return hi}
  return {seq,read,perLayer,DESIGNS,redesign,reach,P:KCD.presets,byKey:Object.fromEntries(KCD.presets.map(p=>[p.key,p]))};
})();
