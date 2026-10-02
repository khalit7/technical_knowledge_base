// ---- Then and now: the RoPE spectrum, step by step ----
(function(){
  if(!$('thn'))return;
  const AX=PAPER.meta.ax;
  // each step: head dim d, rotating pairs, base, context L, frequency rewrite; every number from the cited paper or config
  const yarn=(th,d,L,s,al,be)=>{const lam=2*Math.PI/th,r=L/lam,g=r<al?0:r>be?1:(r-al)/(be-al);return {th:(1-g)*th/s+g*th,k:g===1?'keep':g===0?'int':'ramp'}};
  const S=[
    {t:'2017: sinusoids, added once',lbl:'256 frequencies over d_model 512',d:512,rot:256,base:1e4,L:512,cap:'Vaswani et al. add sin and cos of position at these 256 frequencies to the input, once, across d<sub>model</sub> = 512 ('+A('https://arxiv.org/abs/1706.03762','Attention Is All You Need')+'). RoFormer keeps the spectrum and changes how it is applied.'},
    {t:'2021: RoFormer, rotated into q and k',d:64,rot:32,base:1e4,L:512,cap:'Same geometric frequencies, now rotations of each 64-dimension head\'s query and key, in every layer (RoFormer Chinese base: 768 wide, 12 heads, pretrained up to 1,536 tokens; shown at stage 1\'s 512). 16 of its 32 pairs never complete a turn in 512 tokens.'},
    {t:'2021: GPT-J, partial rotary',d:256,rot:32,base:1e4,L:2048,cap:'GPT-J rotates only the first 64 of each 256-dimension head (rotary_dim 64, '+A('https://huggingface.co/EleutherAI/gpt-j-6b/blob/main/config.json','config.json')+'); GPT-NeoX-20B followed with 25% ('+A('https://arxiv.org/abs/2204.06745','2022')+'). The grey dimensions match on content alone.'},
    {t:'2023: LLaMA, every dimension, base 10,000',d:128,rot:64,base:1e4,L:2048,cap:'LLaMA removes absolute embeddings and adds RoPE at each layer ('+A('https://arxiv.org/abs/2302.13971','Touvron et al.')+'): 128-dimension heads, base 10,000, context 2,048. This is the starting point the extension methods below rewrite.'},
    {t:'2023: Position Interpolation, 2,048 to 32,768',d:128,rot:64,base:1e4,L:32768,f:th=>({th:th/16,k:'int'}),cap:'Run at 32,768 tokens but divide every position by s = 16, so each pair turns exactly as often as it did in 2,048 trained tokens: no angle is new. The cost: neighbouring tokens are now 1/16 of a step apart, so a short fine-tune (within 1,000 steps) is needed ('+A('https://arxiv.org/abs/2306.15595','Chen et al.')+').'},
    {t:'2023: NTK-aware, change the base instead',d:128,rot:64,base:1e4*Math.pow(16,128/126),L:32768,cap:'Raise the base to b · s<sup>d/(d−2)</sup> = '+fmt(Math.round(1e4*Math.pow(16,128/126)))+': the fastest pair keeps its speed (local order stays sharp), the slowest is slowed by the full 16 ('+A('https://arxiv.org/abs/2309.00071','YaRN, Appendix A.2')+').'},
    {t:'2023: YaRN, by wavelength, plus a temperature',d:128,rot:64,base:1e4,L:32768,f:(th)=>yarn(th,128,2048,16,1,32),cap:'Pairs that turn more than β = 32 times in the original 2,048 tokens are kept, pairs under α = 1 turn are interpolated by 16, those between are ramped; logits are scaled by 1/t with √(1/t) = 0.1 ln 16 + 1 = 1.277 ('+A('https://arxiv.org/abs/2309.00071','Peng et al.')+'). DeepSeek-V3 and gpt-oss ship this.'},
    {t:'2024: Llama 3, base 500,000 from the start',d:128,rot:64,base:5e5,L:8192,cap:'Train with a base 50 times larger, "effective for context lengths up to 32,768", pretraining on 8,192-token sequences ('+A('https://arxiv.org/abs/2407.21783','Llama 3')+'). More pairs sit below one turn, so their angles change slowly enough to stay informative far out.'},
    {t:'2024: DeepSeek-V3, a decoupled RoPE key',d:192,rot:32,rotFirst:false,base:1e4,L:4096*40,f:th=>yarn(th,64,4096,40,1,32),dRot:64,cap:'MLA compresses keys into a latent that cannot carry a position-dependent rotation, so each head gets 128 position-free dimensions plus a 64-dimension RoPE part (qk_nope_head_dim 128, qk_rope_head_dim 64, YaRN factor 40 from 4,096; '+A('https://huggingface.co/deepseek-ai/DeepSeek-V3/blob/main/config.json','config.json')+', '+A('https://arxiv.org/abs/2405.04434','DeepSeek-V2 §2.1.3')+').'},
    {t:'2024: Qwen2-VL, three position indices',d:128,rot:64,base:1e6,L:32768,mrope:[16,24,24],cap:'M-RoPE splits the 64 pairs into 16 for time, 24 for height and 24 for width (mrope_section, '+A('https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct/blob/main/config.json','config.json')+'); for text all three indices are equal and it is plain RoPE ('+A('https://arxiv.org/abs/2409.12191','Qwen2-VL')+').'},
    {t:'2025: Llama 4, interleaved layers without positions',d:128,rot:64,base:5e5,L:8192,nope:true,cap:'iRoPE: most layers use RoPE over local chunks; interleaved global layers have no positional embedding at all, plus inference-time temperature scaling, for length generalisation ('+A('https://ai.meta.com/blog/llama-4-multimodal-intelligence/','Meta')+'). Maverick: 36 RoPE and 12 NoPE layers (from the '+'<a href="https://app.notion.com/p/3c65c17b0d0d81be8a07f2562fa2030a" target="_blank" rel="noopener noreferrer">Architecture Gallery</a>). The bars show a RoPE layer; the strip shows the layer pattern.'}];
  function bars(st){const out=[],np=st.d/2,dr=st.dRot||st.rot*2;
    for(let i=0;i<np;i++){
      if(st.dRot){ // DeepSeek: first 64 position-free pairs, then 32 rotating pairs of the 64-dim key
        if(i<64){out.push({v:null,k:'none'});continue}const j=i-64,th=Math.pow(st.base,-2*j/dr),y=st.f(th);out.push({v:st.L*y.th/(2*Math.PI),k:y.k});continue}
      if(i>=st.rot){out.push({v:null,k:'none'});continue}
      const th=Math.pow(st.base,-2*i/(st.rot*2===st.d?st.d:st.rot*2)),y=st.f?st.f(th):{th,k:'keep'};
      out.push({v:st.L*y.th/(2*Math.PI),k:y.k,m:st.mrope?(i<st.mrope[0]?'t':i<st.mrope[0]+st.mrope[1]?'h':'w'):null})}
    return out}
  const B=S.map(bars);
  const col={keep:'var(--c1)',int:'var(--c2)',ramp:'var(--c5)',none:'var(--dim)'},mc={t:'var(--c1)',h:'var(--c3)',w:'var(--c4)'};
  makeAnim({id:'thn',modes:{all:S.map(s=>({t:s.t,c:s.cap}))},mode:'all',dur:3200,
    draw:(m,k,e,w)=>{const st=S[k],b=B[k],H=230,pl=44,pr=10,pt=14,pb=40,n=b.length,bw=(w-pl-pr)/n,lo=-4,hi=4;
      const Y=v=>pt+(H-pt-pb)*(1-(Math.log10(Math.max(1e-4,Math.min(1e4,v)))-lo)/(hi-lo));
      let s='';[[1e-4,'0.0001'],[1e-2,'0.01'],[1,'1 turn'],[1e2,'100'],[1e4,'10,000']].forEach(([v,l])=>{s+=ln2(pl,Y(v),w-pr,Y(v),v===1?'var(--mute)':'var(--line)',v===1?{da:'5 4'}:{})+tx(pl-5,Y(v)+4,l,{fs:11,a:'end',c:'var(--mute)'})});
      b.forEach((x,i)=>{const X=pl+i*bw;if(x.v==null){s+=rc(X+bw*.1,H-pb-6,Math.max(.6,bw*.8),6,col.none,{r:0});return}
        const y=Y(x.v),c=x.m?mc[x.m]:col[x.k];s+=rc(X+bw*.1,y,Math.max(.6,bw*.8),H-pb-y,c,{r:0,op:.25+.75*e})});
      s+=tx(pl,H-pb+14,'pair 0 (fastest)',{fs:11,c:'var(--mute)'})+tx(w-pr,H-pb+14,st.lbl||((st.d/2)+' pairs, head of '+st.d),{fs:11,a:'end',c:'var(--mute)'});
      s+=tx((pl+w-pr)/2,H-6,'turns in '+fmt(st.L)+' tokens (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
      let extra='',eh=0;
      if(st.nope){const cw=Math.min(14,(w-pl-pr)/48);eh=30;for(let l=0;l<48;l++){const np=l%4===3;extra+=rc(pl+l*cw,H+8,cw-1.5,14,np?'var(--dim)':'var(--c1)',{r:1})}extra+=tx(pl,H+36,'48 layers: blue RoPE (chunked), grey no position',{fs:11,c:'var(--mute)'});eh=40}
      if(st.mrope){eh=22;extra+=tx(pl,H+16,'pairs: ',{fs:11,c:'var(--mute)'});[['time','t'],['height','h'],['width','w']].forEach(([n_,c],j)=>{extra+=rc(pl+44+j*76,H+6,12,12,mc[c],{r:2})+tx(pl+60+j*76,H+16,n_,{fs:11})})}
      return svgW(w,H+eh,s+extra,'Turns per RoPE pair at '+st.t)},
    counters:(m,k)=>{const st=S[k],b=B[k],rot=b.filter(x=>x.v!=null),u=rot.filter(x=>x.v<1).length;
      return '<div class="cnts">'+stat('rotating dimensions',(st.dRot||st.rot*2)+' of '+st.d,'per head')+stat('base',fmt(Math.round(st.base)),st.f?'frequencies rewritten':'as trained')+stat('context shown',fmt(st.L),'tokens')+stat('pairs under one turn',u+' of '+rot.length,'angles a long context can make new')+'</div>'}});
})();
