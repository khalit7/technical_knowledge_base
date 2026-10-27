// ---- The released SchrodingerRepo Level 2 and Level 3 code, ported to JavaScript ----
// CPython's random.Random (MT19937, init_by_array seeding, getrandbits, _randbelow, shuffle, choice, random)
// so that a seed gives exactly the choices the released Python makes. check_page.mjs compares every result
// with schro_ref.py (copies of glasses/mapper.py, extractor.py and intra_file_reorder.py, commit e2eef98).
function PyRandom(seed){
  const mt=new Uint32Array(624);let mti=625;
  const mul=(a,b)=>Math.imul(a,b)>>>0;
  function initGen(s){mt[0]=s>>>0;for(mti=1;mti<624;mti++){const p=mt[mti-1]^(mt[mti-1]>>>30);mt[mti]=(mul(1812433253,p)+mti)>>>0}}
  function initByArray(key){initGen(19650218);let i=1,j=0,k=Math.max(624,key.length);
    for(;k;k--){const p=mt[i-1]^(mt[i-1]>>>30);mt[i]=((mt[i]^mul(p,1664525))+key[j]+j)>>>0;i++;j++;if(i>=624){mt[0]=mt[623];i=1}if(j>=key.length)j=0}
    for(k=623;k;k--){const p=mt[i-1]^(mt[i-1]>>>30);mt[i]=((mt[i]^mul(p,1566083941))-i)>>>0;i++;if(i>=624){mt[0]=mt[623];i=1}}
    mt[0]=0x80000000}
  function u32(){let y;if(mti>=624){let kk=0;for(;kk<624;kk++){y=(mt[kk]&0x80000000)|(mt[(kk+1)%624]&0x7fffffff);mt[kk]=mt[(kk+397)%624]^(y>>>1)^((y&1)?0x9908b0df:0)}mti=0}
    y=mt[mti++];y^=y>>>11;y=(y^((y<<7)&0x9d2c5680))>>>0;y=(y^((y<<15)&0xefc60000))>>>0;y^=y>>>18;return y>>>0}
  // seed: a non-negative integer below 2^53, split into 32-bit words as CPython does
  let n=Math.abs(Math.floor(seed)),key=[];if(n===0)key=[0];while(n>0){key.push(n%4294967296);n=Math.floor(n/4294967296)}initByArray(key);
  const bits=k=>u32()>>>(32-k);
  const below=m=>{const k=32-Math.clz32(m);let r=bits(k);while(r>=m)r=bits(k);return r};
  return {u32,random(){const a=u32()>>>5,b=u32()>>>6;return (a*67108864+b)/9007199254740992},
    shuffle(x){for(let i=x.length-1;i>0;i--){const j=below(i+1);const t=x[i];x[i]=x[j];x[j]=t}return x},
    choice(s){return s[below(s.length)]}}
}
const SR=(function(){
  // extractor.py tokenize_identifier
  function tokenize(id){if(id.startsWith('__')&&id.endsWith('__'))return [id];let name=id;if(name.includes('.'))name=name.slice(0,name.lastIndexOf('.'));
    const out=[];name.split(/[_\-.]+/).forEach(seg=>{const m=seg.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?=[A-Z][a-z]|\b)|[0-9]+/g);if(m)out.push(...m)});return out.filter(t=>t.length>0)}
  // mapper.py create_token_mapping
  function tokenMapping(cands,tokens,seed){const rng=PyRandom(seed),map={},used=new Set();
    [...new Set(tokens.map(t=>t.toLowerCase()))].sort((a,b)=>a<b?-1:a>b?1:0).forEach(t=>{const sh=(cands[t]||[t]).slice();rng.shuffle(sh);let sel=t;
      for(const c of sh){const cl=c.toLowerCase();if(!used.has(cl)&&cl!==t){sel=cl;break}}map[t]=sel;used.add(sel)});return map}
  const isUpper=s=>s===s.toUpperCase()&&s!==s.toLowerCase();
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
  // mapper.py reconstruct_identifier
  function rebuild(orig,map){let suffix='',name=orig;if(orig.includes('.')){const i=orig.lastIndexOf('.');name=orig.slice(0,i);suffix=orig.slice(i)}
    const parts=tokenize(name).map(ot=>{const vt=map[ot.toLowerCase()]||ot.toLowerCase();if(isUpper(ot)&&ot.length>1)return vt.toUpperCase();if(ot[0]!==ot[0].toLowerCase())return cap(vt);return vt.toLowerCase()});
    let r;if(orig.includes('_'))r=parts.join('_');else{r=parts.join('');if(name&&name[0]===name[0].toLowerCase()&&name[0]!==name[0].toUpperCase()&&r)r=r[0].toLowerCase()+r.slice(1)}
    return r+suffix}
  function forwardMap(keys,map){const fm={};keys.forEach(k=>{const v=rebuild(k,map);if(v!==k)fm[k]=v});return fm}
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  // whole-word, exact-case replacement (manager.py _compile_exact_pattern), longest key first; then the repository identity rule
  function apply(text,fm,identity){const ks=Object.keys(fm).sort((a,b)=>b.length-a.length);
    if(ks.length){const re=new RegExp('\\b('+ks.map(esc).join('|')+')\\b','g');text=text.replace(re,m=>fm[m])}
    if(identity)text=text.replace(/(^|[^\w-])django(?![\w-])/gi,(m,p)=>p+REPO.lex.identity.django);return text}
  // intra_file_reorder.py _random_topological_order (retry seeds as integers, as in schro_ref.py)
  function topoOnce(rng,len,deps,dependents){const indeg=deps.map(d=>d.length),avail=[];for(let i=0;i<len;i++)if(!indeg[i])avail.push(i);const order=[];
    while(avail.length){const s=avail.slice().sort((a,b)=>a-b);const c=rng.choice(s);avail.splice(avail.indexOf(c),1);order.push(c);
      [...dependents[c]].sort((a,b)=>a-b).forEach(ch=>{indeg[ch]--;if(!indeg[ch])avail.push(ch)})}return order}
  function topoOrder(spec,seed){const rng=PyRandom(seed),len=spec.length,deps=spec.deps,dependents=Array.from({length:len},()=>new Set());
    deps.forEach((d,i)=>d.forEach(p=>dependents[p].add(i)));const order=topoOnce(rng,len,deps,dependents);if(order.length!==len)return [...Array(len).keys()];
    if(len<=1)return order;const base=[...Array(len).keys()].join(',');
    for(let a=0;a<32;a++){const cr=PyRandom(Math.floor(rng.random()*4294967296)+a);const cand=topoOnce(cr,len,deps,dependents);if(cand.join(',')!==base)return cand}return order}
  return {tokenize,tokenMapping,rebuild,forwardMap,apply,topoOrder}
})();
window.SR=SR;
