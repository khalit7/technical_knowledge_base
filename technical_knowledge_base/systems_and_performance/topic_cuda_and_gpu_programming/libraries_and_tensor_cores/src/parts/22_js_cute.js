// ---- CuTe layout algebra in JavaScript (pure functions, no DOM) ----
// A layout is {s, d}: a shape and a stride, each an integer or a nested array of the same structure.
// Index -> coordinate is colexicographic (the leftmost mode varies fastest), as in CuTe.
// Algorithms follow CUTLASS 4.8.0 include/cute/layout.hpp (composition, complement, logical_divide,
// zipped_divide, logical_product, blocked_product, raked_product, coalesce) and swizzle.hpp.
// check/check_layouts.mjs compares every function here against CuTe's own printed output (cute/out/layouts.txt).
window.CUTE=(function(){
  const isT=x=>Array.isArray(x);
  const flat=x=>isT(x)?x.flatMap(flat):[x];
  const size=s=>flat(s).reduce((a,b)=>a*b,1);
  function str(x){return isT(x)?'('+x.map(str).join(',')+')':String(x)}
  const lstr=L=>str(L.s)+':'+str(L.d);
  // parse "(4,8):(1,4)" or "((2,2),3):((24,2),8)"; underscores (CuTe's static marks) are ignored
  function parseT(t){t=t.replace(/[_\s]/g,'');let i=0;
    function v(){if(t[i]==='('){i++;const a=[];for(;;){a.push(v());if(t[i]===','){i++;continue}if(t[i]===')'){i++;break}throw new Error('bad tuple')}return a}
      const m=/^-?\d+/.exec(t.slice(i));if(!m)throw new Error('bad number at '+i);i+=m[0].length;return +m[0]}
    const r=v();if(i!==t.length)throw new Error('trailing text');return r}
  function parse(txt){const p=txt.split(':');if(p.length!==2)throw new Error('write shape:stride');
    const L={s:parseT(p[0]),d:parseT(p[1])};check(L);return L}
  function check(L){const a=shapeOf(L.s),b=shapeOf(L.d);if(a!==b)throw new Error('shape and stride differ in structure');
    if(flat(L.s).some(x=>x<1))throw new Error('shapes must be positive')}
  const shapeOf=x=>isT(x)?'('+x.map(shapeOf).join(',')+')':'*';
  // evaluate at a linear index
  function at(L,i){const s=flat(L.s),d=flat(L.d);let o=0;for(let k=0;k<s.length;k++){o+=(i%s[k])*d[k];i=Math.floor(i/s[k])}return o}
  function map(L){const n=size(L.s),r=new Array(n);for(let i=0;i<n;i++)r[i]=at(L,i);return r}
  const cosize=L=>Math.max(...map(L))+1;
  // drop size-1 modes and merge contiguous ones (s0:d0, s1:d1 with d1 = s0*d0)
  function coalesce(L){const s=flat(L.s),d=flat(L.d);const rs=[],rd=[];
    for(let k=0;k<s.length;k++){if(s[k]===1)continue;const n=rs.length;
      if(n&&rd[n-1]*rs[n-1]===d[k]){rs[n-1]*=s[k]}else{rs.push(s[k]);rd.push(d[k])}}
    if(!rs.length)return {s:1,d:0};return rs.length===1?{s:rs[0],d:rd[0]}:{s:rs,d:rd}}
  const mk=(rs,rd)=>!rs.length?{s:1,d:0}:rs.length===1?{s:rs[0],d:rd[0]}:{s:rs,d:rd};
  // A o (s:d) for one integral mode of B (CuTe composition_impl): divide d out of A, then keep s elements
  function compose1(A,s,d){const as=flat(A.s),ad=flat(A.d);
    if(s===1)return {s:1,d:0};
    const es=[],ed=[];let rest=d;
    for(let k=0;k<as.length;k++){const last=k===as.length-1;
      if(last){es.push(Infinity);ed.push(ad[k]*rest);rest=1;break}
      if(rest>=as[k]){if(rest%as[k])throw new Error('stride divisibility violated');rest/=as[k];continue}
      if(as[k]%rest)throw new Error('shape divisibility violated');es.push(as[k]/rest);ed.push(ad[k]*rest);rest=1}
    const rs=[],rd=[];let need=s;
    for(let k=0;k<es.length&&need>1;k++){const take=k===es.length-1?need:Math.min(es[k],need);
      if(take===1)continue;
      if(k<es.length-1&&need%take)throw new Error('shape divisibility violated');
      rs.push(take);rd.push(ed[k]);need/=take}
    return coalesce(mk(rs,rd))}
  // composition distributes over the modes of B, keeping B's structure
  function compose(A,B){if(!isT(B.s))return compose1(A,B.s,B.d);
    const parts=B.s.map((s,k)=>compose(A,{s,d:B.d[k]}));return {s:parts.map(p=>p.s),d:parts.map(p=>p.d)}}
  // complement(B, M): the layout that fills the holes of B up to M
  function complement(B,M){const s=flat(B.s),d=flat(B.d);const m=s.map((x,k)=>[x,d[k]]).filter(p=>p[0]>1&&p[1]>0).sort((a,b)=>a[1]-b[1]);
    const rs=[],rd=[];let cur=1;
    for(const [x,y] of m){if(y%cur)throw new Error('complement: stride not divisible');const g=y/cur;if(g>1){rs.push(g);rd.push(cur)}cur=x*y}
    const tail=Math.ceil(M/cur);if(tail>1){rs.push(tail);rd.push(cur)}
    return coalesce(mk(rs,rd))}
  const pair=(a,b)=>({s:[a.s,b.s],d:[a.d,b.d]});
  // logical_divide(A, B) for a layout tiler; logical_divide(A, [B0,B1,...]) divides mode by mode
  function divide1(A,B){return compose(A,pair(B,complement(B,size(A.s))))}
  function divide(A,T){if(Array.isArray(T)){const parts=T.map((t,k)=>divide1(modeOf(A,k),t));return {s:parts.map(p=>p.s),d:parts.map(p=>p.d)}}return divide1(A,T)}
  const modeOf=(A,k)=>isT(A.s)?{s:A.s[k],d:A.d[k]}:k===0?A:{s:1,d:0};
  // zipped_divide: ((tile modes), (rest modes))
  function zipped(A,T){const r=divide(A,T);if(!Array.isArray(T))return r;
    return {s:[r.s.map(x=>x[0]),r.s.map(x=>x[1])],d:[r.d.map(x=>x[0]),r.d.map(x=>x[1])]}}
  function lproduct(A,B){return pair(A,compose(complement(A,size(A.s)*cosize(B)),B))}
  function zip2(P){return {s:[[P.s[0][0],P.s[1][0]],[P.s[0][1],P.s[1][1]]],d:[[P.d[0][0],P.d[1][0]],[P.d[0][1],P.d[1][1]]]}}
  const blocked=(A,B)=>zip2(lproduct(A,B));
  function raked(A,B){const P=lproduct(A,B);return {s:[[P.s[1][0],P.s[0][0]],[P.s[1][1],P.s[0][1]]],d:[[P.d[1][0],P.d[0][0]],[P.d[1][1],P.d[0][1]]]}}
  // Swizzle<B,M,S>: XOR the B bits starting at M+S into the B bits starting at M
  function swz(b,m,s){const y=((1<<b)-1)<<(m+Math.max(0,s)),z=((1<<b)-1)<<(m+Math.max(0,-s));
    return x=>s>=0?x^((x&y)>>s):x^((x&z)<<-s)}
  // a rank-2 view: rows = size of mode 0, cols = size of mode 1 (or 1); value at (r,c)
  function grid(L){const s0=isT(L.s)?size(L.s[0]):size(L.s),s1=isT(L.s)?size(L.s.slice(1)):1;
    const g=[];for(let r=0;r<s0;r++){const row=[];for(let c=0;c<s1;c++)row.push(at(L,r+c*s0));g.push(row)}return g}
  return {parse,parseT,str,lstr,size,flat,at,map,cosize,coalesce,compose,complement,divide,zipped,lproduct,blocked,raked,swz,grid,pair};
})();
