// ---- T5's own preprocessing and bucketing, ported line by line (see src/inputs/t5_code_extracts.py) ----
// The random numbers come from a seeded mulberry32 instead of TensorFlow's stateless RNG: same algorithm, different draws.
const T5={};
// tf.round and Python's round both round half to even; Math.round would not (77 / 2 = 38.5 must give 38)
T5.rnd=x=>{const f=Math.floor(x),d=x-f;if(Math.abs(d-0.5)<1e-9)return f%2===0?f:f+1;return Math.round(x)};
// _random_segmentation: partition num_items into num_segments non-empty segments, all partitions equally likely.
T5.segment=function(numItems,numSegments,rnd){
  // first_in_segment = pad(shuffle(range(num_items - 1) < num_segments - 1), [[1, 0]])
  const a=[];for(let i=0;i<numItems-1;i++)a.push(i<numSegments-1?1:0);
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}
  const first=[0].concat(a);const len=[];let seg=0;
  first.forEach((f,i)=>{seg+=f;len[seg]=(len[seg]||0)+1});return len};
// random_spans_noise_mask(length, noise_density, mean_noise_span_length), random_roll = False
T5.spanMask=function(length,density,meanSpan,rnd){
  if(density===0)return new Array(length).fill(false);
  const orig=length;length=Math.max(length,2);
  let nNoise=T5.rnd(length*density);nNoise=Math.min(Math.max(nNoise,1),length-1);
  let nSpans=T5.rnd(nNoise/meanSpan);nSpans=Math.max(nSpans,1);
  const nNon=length-nNoise;
  const noiseLen=T5.segment(nNoise,nSpans,rnd),nonLen=T5.segment(nNon,nSpans,rnd);
  const m=[];for(let s=0;s<nSpans;s++){for(let i=0;i<nonLen[s];i++)m.push(false);for(let i=0;i<noiseLen[s];i++)m.push(true)}
  return m.slice(0,orig)};
// iid_noise_mask: uniform < noise_density per token
T5.iidMask=(length,density,rnd)=>{const m=[];for(let i=0;i<length;i++)m.push(rnd()<density);return m};
// sentinel names: the paper writes <X>, <Y>, <Z>; the released vocabulary uses its last ids, which Hugging Face names <extra_id_0>, ...
T5.sname=(i,hf)=>hf?'<extra_id_'+i+'>':'<'+('XYZ'[i]||'S'+i)+'>';
// noise_span_to_unique_sentinel: each run of noise tokens becomes one sentinel, numbered in order of appearance.
// Inputs use it on the mask, targets on the inverted mask (nonnoise_span_to_unique_sentinel), so <X> in the input
// lines up with the <X> that opens the dropped text in the target.
T5.sentinelize=function(tok,mask,hf){const out=[];let k=-1;
  tok.forEach((t,i)=>{if(mask[i]){if(i===0||!mask[i-1]){k++;out.push({s:T5.sname(k,hf),sent:1})}}else out.push({t})});return {out,n:k+1}};
T5.spansToSentinel=(tok,mask,hf)=>T5.sentinelize(tok,mask,hf);
T5.targetsFromSpans=(tok,mask,hf)=>T5.sentinelize(tok,mask.map(x=>!x),hf).out;
// The seven objectives of Table 3, on whitespace tokens (the paper's Table 3 example maps every word to one token)
T5.OBJ=[
  {k:'prefix',n:'Prefix language modeling',tbl:'T4',row:'Prefix language modeling'},
  {k:'bert',n:'BERT-style',tbl:'T4',row:'BERT-style (Devlin et al., 2018)'},
  {k:'deshuf',n:'Deshuffling',tbl:'T4',row:'Deshuffling'},
  {k:'mass',n:'MASS-style',tbl:'T5',row:'MASS-style (Song et al., 2019)'},
  {k:'iidrep',n:'I.i.d. noise, replace spans (baseline)',tbl:'T5',row:'Replace corrupted spans'},
  {k:'iiddrop',n:'I.i.d. noise, drop tokens',tbl:'T5',row:'Drop corrupted tokens'},
  {k:'spans',n:'Random spans (final T5)',tbl:'T7',row:'3'}];
T5.apply=function(obj,tok,rate,span,seed,hf){const rnd=mulberry32(seed>>>0);const n=tok.length;
  const T=t=>({t}),M=()=>({s:'<M>',sent:1});
  if(obj==='prefix'){const cut=1+Math.floor(rnd()*Math.max(1,n-1));return {inp:tok.slice(0,cut).map(T),tgt:tok.slice(cut).map(T),mask:tok.map((_,i)=>i>=cut),note:'A random split point; the decoder predicts the rest.'}}
  if(obj==='deshuf'){const p=tok.slice();for(let i=p.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=p[i];p[i]=p[j];p[j]=t}return {inp:p.map(T),tgt:tok.map(T),mask:tok.map(()=>false),note:'The input is shuffled; the target is the original text.',full:1}}
  if(obj==='spans'){const m=T5.spanMask(n,rate,span,rnd);const a=T5.spansToSentinel(tok,m,hf);return {inp:a.out,tgt:T5.targetsFromSpans(tok,m,hf),mask:m,spans:a.n}}
  const m=T5.iidMask(n,rate,rnd);
  if(obj==='bert'){const vocab=tok.filter((_,i)=>!m[i]);return {inp:tok.map((t,i)=>{if(!m[i])return T(t);const r=rnd();return r<.9?M():{t:vocab.length?vocab[Math.floor(rnd()*vocab.length)]:t,rnd:1}}),tgt:tok.map(T),mask:m,full:1,note:'90% of corrupted tokens become <M>, 10% a random token (shown struck through); the target is the whole original text.'}}
  if(obj==='mass')return {inp:tok.map((t,i)=>m[i]?M():T(t)),tgt:tok.map(T),mask:m,full:1};
  if(obj==='iiddrop')return {inp:tok.filter((_,i)=>!m[i]).map(T),tgt:tok.filter((_,i)=>m[i]).map(T),mask:m};
  const a=T5.spansToSentinel(tok,m,hf);return {inp:a.out,tgt:T5.targetsFromSpans(tok,m,hf),mask:m,spans:a.n}};
// Lengths per n original tokens (EOS counted, as random_spans_helper does)
T5.lenSpans=(n,d,s)=>{const nn=T5.rnd(n*d),sp=Math.max(1,T5.rnd(nn/s));return {inp:n-nn+sp+1,tgt:nn+sp+1}};
T5.lenIid=(n,p)=>{const nr=p+(n-1)*p*(1-p),cr=(1-p)+(n-1)*p*(1-p);return {inp:n-n*p+nr+1,tgt:n*p+cr+1,drop:n*p+1,dropInp:n-n*p+1}};
// random_spans_helper(inputs_length, noise_density, mean_noise_span_length, 1, 1)
T5.helper=function(L,d,s){const f=n=>{const nn=T5.rnd(n*d),sp=T5.rnd(nn/s);return [n-nn+sp+1,nn+sp+1]};
  let n=L-1;while(f(n+1)[0]<=L)n++;let [i,t]=f(n);if(d===0.5&&t>i){n--;t--}return {raw:n,inputs:i,targets:t}};
// _relative_position_bucket(relative_position = key - query, bidirectional, 32, 128)
T5.bucket=function(rel,bi,nb,maxd){nb=nb||32;maxd=maxd||128;let ret=0,n=rel;
  if(bi){nb=nb/2|0;ret+=(n>0)*nb;n=Math.abs(n)}else n=-Math.min(n,0);
  const me=nb/2|0;if(n<me)return ret+n;
  return ret+Math.min(nb-1,me+Math.floor(Math.log(n/me)/Math.log(maxd/me)*(nb-me)))};
if(typeof module!=='undefined')module.exports=T5;
