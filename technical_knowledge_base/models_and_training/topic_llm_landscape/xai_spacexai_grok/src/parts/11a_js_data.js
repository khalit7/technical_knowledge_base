// ---- The page's data, shared by the Reading tab's widgets and the three 3D stages (2026-11-10) ----
// XCX: the Colossus builds as the S-1 states them (GPUs, megawatts, days to bring online) and its greenfield yardstick.
// XG1: Grok-1 (released run.py and model.py) and Grok 2 (config.json), and the parameter count the calculator and Fig. 4 share.
// XHV: Heavy's agent counts (xAI's multi-agent docs) and the illustrative token budget the Fig. 5 stage draws.
window.XCX=(function(){
  const B=[{id:'bench',n:'Industry benchmark',s:'100 MW greenfield site, ~2 years',chip:'greenfield yardstick',mw:100,d:730,g:null},
    {id:'c1',n:'Colossus, first cluster',s:'~100,000 H100, ~130 MW, repurposed factory',chip:'H100',mw:130,d:122,g:100000},
    {id:'c2a',n:'Colossus II, first cluster',s:'~110,000 GB200, ~210 MW',chip:'GB200',mw:210,d:91,g:110000},
    {id:'c2b',n:'Colossus II, second cluster',s:'110,000 GB300, 220 MW, existing site',chip:'GB300',mw:220,d:64,g:110000}];
  B.forEach(b=>{b.rate=b.mw/b.d;b.gpd=b.g?b.g/b.d:null});
  return {B,times:b=>b.rate/B[0].rate};
})();
window.XG1=(function(){
  const M={g1:{n:'Grok-1',d:6144,L:64,nq:48,nkv:8,hd:128,E:8,k:2,f:32768,V:131072,dense:0,ctx:8192,pub:'xAI: 314B, 25% active'},
           g2:{n:'Grok 2',d:8192,L:64,nq:64,nkv:8,hd:128,E:8,k:2,f:16384,V:131072,dense:32768,ctx:131072,pub:'xAI publishes no count'}};
  // the sum of the formula on the page: attention (q, o, k, v), E gated experts of 3 matrices each, an optional dense gated block, the router, input embedding and output head
  function count(c){const attn=2*c.d*c.nq*c.hd+2*c.d*c.nkv*c.hd,exp=3*c.d*c.f,dense=c.dense?3*c.d*c.dense:0,router=c.d*c.E,emb=2*c.V*c.d;
    return {tot:c.L*(attn+c.E*exp+dense+router)+emb,act:c.L*(attn+c.k*exp+dense+router)+emb,exp:c.L*c.E*exp,expAct:c.L*c.k*exp,one:exp,attn:c.L*attn,dense:c.L*dense,emb,router:c.L*router}}
  return {M,count,g1:count(M.g1),g2:count(M.g2)};
})();
window.XHV={A:8,S:2,N:[4,16]};
