// ---- Dispatch replay (same algorithm as src/sim_dispatch.py): the paper's routing profiles (Appendix B.2),
// LLEP's released assignment plan (compute_llep_lpt_plan, capacity factor 1.0), and the per-chunk send matrices
// of contiguous and strided chunk membership (§3.1). Shape of Table 5: 8 ranks x 65,536 tokens, 128 experts, top-8, K = 10.
const RT={N:65536,E:128,k:8,ep:8,K:10,H:7168,b:2,factor:1.0,minGemm:1024,
  profiles:[['Balanced','balanced'],['95% / 16',[.95,16]],['80% / 16',[.80,16]],['50% / 4',[.50,4]],['30% / 16',[.30,16]]],cache:{}};
RT.c=Math.ceil(RT.N/RT.K);RT.bound=RT.ep*RT.k*RT.c;
function rtRoutes(p){const {N,E,k}=RT,R=new Int32Array(N*k);
  if(p==='balanced'){for(let i=0;i<N;i++)for(let j=0;j<k;j++)R[i*k+j]=(i+j)%E;return R}
  const [r,h]=p,hot=Math.floor(r*N);
  for(let i=0;i<N;i++)for(let j=0;j<k;j++)R[i*k+j]=i<hot?(j%h):h+((i+j)%(E-h));return R}
function rtPlan(counts){const {ep,E}=RT,nloc=E/ep,total=counts.reduce((a,b)=>a+b,0);
  const maxt=Math.max(Math.floor(RT.factor*Math.floor(total/ep)),1),pend=new Array(ep).fill(0),asg=new Array(ep).fill(0),plan={};
  for(let e=0;e<E;e++)pend[Math.floor(e/nloc)]+=counts[e];
  const ord=[...Array(E).keys()].sort((a,b)=>counts[b]-counts[a]||a-b);
  const eff=g=>asg[g]+pend[g];
  const others=g0=>[...Array(ep).keys()].filter(g=>g!==g0).map(g=>[g,eff(g),maxt-eff(g)]).sort((a,b)=>a[1]-b[1]);
  for(const e of ord){const n=counts[e];if(!n)continue;const g0=Math.floor(e/nloc);pend[g0]-=n;const av=maxt-eff(g0),a=[];
    if(av>=n){a.push([g0,0,n]);asg[g0]+=n}
    else if(av>0){a.push([g0,0,av]);asg[g0]+=av;let rem=n-av,off=av;
      while(rem>0){const oth=others(g0);let done=false;
        for(const [g,,ag] of oth){if(ag<=0)continue;const ch=Math.min(rem,ag);if(ch<RT.minGemm&&rem>ch)continue;a.push([g,off,off+ch]);asg[g]+=ch;off+=ch;rem-=ch;done=true;break}
        if(!done){const g=oth[0][0];a.push([g,off,off+rem]);asg[g]+=rem;rem=0}}}
    else{const oth=others(g0);let rem=n,off=0;
      for(const [g,,ag] of oth){if(rem<=0)break;if(ag<=0)continue;const ch=Math.min(rem,ag);if(ch<RT.minGemm&&rem>ch)continue;a.push([g,off,off+ch]);asg[g]+=ch;off+=ch;rem-=ch}
      if(rem>0){const g=oth[0][0];a.push([g,off,off+rem]);asg[g]+=rem}}
    plan[e]=a}
  return plan}
// send matrices: S.str[i][src][dst], S.cont[i][src][dst], S.whole[src][dst]
function rtData(pi){if(RT.cache[pi])return RT.cache[pi];
  const {N,E,k,ep,K,c}=RT,nloc=E/ep,R=rtRoutes(RT.profiles[pi][1]),cnt=new Array(E).fill(0);
  for(let f=0;f<R.length;f++)cnt[R[f]]++;
  const plan=rtPlan(cnt.map(x=>x*ep));
  const st=[0];for(let e=0;e<E;e++)st.push(st[e]+cnt[e]);
  const order=new Int32Array(R.length),fill=st.slice(0,E);for(let f=0;f<R.length;f++)order[fill[R[f]]++]=f; // stable: ascending flat index within an expert
  const z=()=>Array.from({length:ep},()=>new Array(ep).fill(0));
  const S={str:Array.from({length:K},z),cont:Array.from({length:K},z),whole:z()};
  const dest=new Int32Array(R.length);
  for(let r=0;r<ep;r++){
    for(let f=0;f<R.length;f++)dest[f]=Math.floor(R[f]/nloc);
    for(const e in plan){const a=plan[e];if(a.length===1){for(let q=st[e];q<st[+e+1];q++)dest[order[q]]=a[0][0];continue}
      const g0=cnt[e]*r;for(let q=st[e];q<st[+e+1];q++){const pos=g0+q-st[e];for(const [g,s,t] of a)if(pos>=s&&pos<t){dest[order[q]]=g;break}}}
    for(let f=0;f<R.length;f++){const t=(f/k)|0,d=dest[f];S.str[t%K][r][d]++;S.cont[(t/c)|0][r][d]++;S.whole[r][d]++}}
  const ratio=M=>Math.max(...M.map(row=>{const s=row.reduce((a,b)=>a+b,0);return s?Math.max(...row)/(s/ep):0}));
  const recv=M=>M[0].map((_,d)=>M.reduce((a,row)=>a+row[d],0));
  S.ratio={str:Math.max(...S.str.map(ratio)),cont:Math.max(...S.cont.map(ratio)),llep:ratio(S.whole)};
  S.maxRecv={str:Math.max(...S.str.map(M=>Math.max(...recv(M)))),cont:Math.max(...S.cont.map(M=>Math.max(...recv(M)))),llep:Math.max(...recv(S.whole))};
  S.recv=recv;return RT.cache[pi]=S}
