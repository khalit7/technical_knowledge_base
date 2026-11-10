// ---- window.DS: the numbers the three stages draw, each computed from the configs and reports the page cites (2026-11-10).
// Fig. 2 (stg-cut): what one decoded token reads and what the cache stores, whole model, at a 131,072-token context, in numbers (not bytes:
// the precision differs by release and part, BF16 for MLA, FP8 or FP4 for the indexers). Fig. 3 (stg-v41): V4.1-Flash's layer modes from its
// config.json as read by zartbot. Fig. 4 (stg-srv): V3/R1's published deployment. check_stages.mjs checks the step lists against these. ----
window.DS=(function(){
  const L=131072;
  // MHA at V3's dimensions: keys and values for 128 heads of 128 numbers; MLA: a 512-number latent plus a 64-number RoPE key (V2, V3);
  // DSA (V3.2-Exp): MLA's entry plus a 128-number indexer key per token (index_head_dim), attention reads the top 2,048 (index_topk);
  // V4-Pro: 512-number entries (keys and values shared), CSA one entry per 4 tokens with a top-1,024 selection, HCA one per 128 read whole,
  // both plus a 128-token window; the CSA indexer key is taken as 128 numbers, as DSA's (an assumption, said on the page).
  const MHA=2*128*128,MLA=512+64,IDX=128,TOPK=2048,V4E=512,WIN=128,CK=1024;
  const lay=(n,read,stored,idx)=>({n,read,stored,idx:idx||0});
  const cols=[
    {id:'mha',name:'MHA at V3’s dimensions',rel:'baseline',layers:[lay(61,L*MHA,L*MHA)]},
    {id:'mla',name:'V3: MLA',rel:'V2, May 2024',layers:[lay(61,L*MLA,L*MLA)]},
    {id:'dsa',name:'V3.2-Exp: DSA',rel:'Sep 2025',layers:[lay(61,TOPK*MLA+L*IDX,L*(MLA+IDX),L*IDX)]},
    {id:'v4',name:'V4-Pro: CSA + HCA',rel:'Apr 2026',layers:[lay(30,(CK+WIN)*V4E+(L/4)*IDX,(L/4+WIN)*V4E+(L/4)*IDX,(L/4)*IDX),lay(31,(L/128+WIN)*V4E,(L/128+WIN)*V4E)]}];
  cols.forEach(c=>{c.read=c.layers.reduce((s,l)=>s+l.n*l.read,0);c.stored=c.layers.reduce((s,l)=>s+l.n*l.stored,0);c.idx=c.layers.reduce((s,l)=>s+l.n*l.idx,0);c.nl=c.layers.reduce((s,l)=>s+l.n,0)});
  const C={};cols.forEach(c=>C[c.id]=c);
  // V4.1-Flash: 40 layers, 0 to 19 the encoder, 20 to 39 the decoder; modes from compress_ratios and the index fields
  const full=[2,8,14,20],rein=[24,28,32,36],eng=[1,14];
  const mode=i=>i<2?'swa':full.includes(i)?'full':rein.includes(i)?'rein':'reuse';
  // each cache copy and the last layer that reads it (encoder copies serve their block of six; the decoder copy serves layers 20 to 39)
  const copies=full.map(f=>({at:f,to:f<20?f+5:39}));
  const v41={layers:40,enc:20,full,rein,eng,mode,copies,pre:'8B',dec:'16B',bytes:890};
  // V3/R1 serving (day 6 of the open-source week): prefill units of 4 nodes, decode units of 18, 8 GPUs a node, 256 routed experts plus 32 redundant copies
  const srv={pre:{nodes:4,gpus:32},dec:{nodes:18,gpus:144},routed:256,red:32};srv.copies=srv.routed+srv.red;srv.pre.per=srv.copies/srv.pre.gpus;srv.dec.per=srv.copies/srv.dec.gpus;
  // number formats the step lists use
  const big=v=>v>=1e9?(v/1e9).toPrecision(3)+' billion':(v/1e6).toPrecision(3)+' million';
  return {L,MHA,MLA,IDX,TOPK,V4E,WIN,CK,cols,C,v41,srv,big};
})();
