// ---- Data for the two 3D stages: each model's shape from its published config, and the per-layer and whole-model sums the stages draw.
// The formulas are recompute.py's (gqa_layer, mla_layer, ffn); check_stages.mjs compares the sums with parts_params.json, which recompute.py writes.
window.MI=(function(){
  const gqa=(d,nh,nkv,hd)=>d*nh*hd+2*d*nkv*hd+nh*hd*d;
  const mla=(d,nh,ql,kvl,nope,rope,v)=>d*ql+ql+ql*nh*(nope+rope)+d*(kvl+rope)+kvl+kvl*nh*(nope+v)+nh*v*d;
  const ffn=(d,f)=>3*d*f;
  // configs: Mistral-7B-v0.1 and Mixtral-8x7B-v0.1 config.json; Mistral-Large-3, Mistral-Small-4 and Mistral-Medium-3.5 params.json
  const C={
    m7:{name:'Mistral 7B',d:4096,L:32,nh:32,nkv:8,hd:128,ff:14336,V:32000,E:1,k:1,sh:0,win:4096},
    x7:{name:'Mixtral 8x7B',d:4096,L:32,nh:32,nkv:8,hd:128,ff:14336,V:32000,E:8,k:2,sh:0,win:0},
    l3:{name:'Mistral Large 3',d:7168,L:61,nh:128,mla:[1536,512,128,64,128],ff:4096,dense:3,dff:16384,E:128,k:4,sh:1},
    s4:{name:'Mistral Small 4',d:4096,L:36,nh:32,mla:[1024,256,64,64,128],ff:2048,dense:0,E:128,k:4,sh:1},
    m35:{name:'Mistral Medium 3.5',d:12288,L:88,nh:96,nkv:8,hd:128,ff:28672,E:1,k:1,sh:0}};
  const out={};
  for(const [id,c] of Object.entries(C)){
    const attn=c.mla?mla(c.d,c.nh,...c.mla):gqa(c.d,c.nh,c.nkv,c.hd),ex=ffn(c.d,c.ff),router=c.E>1?c.d*c.E:0,norms=2*c.d;
    const moeT=c.E*ex+c.sh*ex+router,moeA=c.k*ex+c.sh*ex+router,nd=c.dense||0,dff=nd?ffn(c.d,c.dff):0;
    // layers only (no embeddings, final norm or vision encoder): what the towers draw
    const lt=c.L*(attn+norms)+nd*dff+(c.L-nd)*moeT+c.d,la=c.L*(attn+norms)+nd*dff+(c.L-nd)*moeA+c.d;
    // key-value cache per token, 16-bit: GQA stores K and V for every KV head; latent attention stores one latent plus one position key
    const kvTok=c.mla?(c.mla[1]+c.mla[3])*c.L*2:2*c.L*c.nkv*c.hd*2;
    out[id]=Object.assign({},c,{attn,ex,router,moeLayerT:moeT+attn+norms,moeLayerA:moeA+attn+norms,dffn:dff,lt,la,kvTok,kv256:kvTok*262144});
  }
  // whole-model figures with embeddings, as each paper or card states them (B): Mistral 7B and Mixtral from the papers, the rest from the cards and announcements
  out.m7.stated={tot:7.24,act:7.24};out.x7.stated={tot:46.7,act:12.9};out.l3.stated={tot:675,act:41};out.s4.stated={tot:119,act:6};out.m35.stated={tot:128,act:128};
  // Mistral 7B and Mixtral share one vocabulary of 32,000 rows: input and output tables
  out.m7.emb=out.x7.emb=2*32000*4096;
  out.m7.tot=out.m7.lt+out.m7.emb;out.x7.tot=out.x7.lt+out.x7.emb;out.x7.act=out.x7.la+out.x7.emb;
  return out;
})();
