// ---- Reduce and scan, animated (t-tree): the model. Pure functions, mirrored by src/tree_model.py ----
// A toy machine: 16 values, warps of 4 lanes, shared memory with 4 banks (a real GPU: warps of 32, 32 banks).
// Each method is a list of steps; a step is a list of operations {t: thread, d: destination, s: source, add, swap}.
window.WKT=(function(){
  const N=16,WS=4,NB=4;
  const INPUT=[3,1,7,0,4,1,6,3,2,5,1,4,0,6,2,3];
  function steps(m){
    const S=[];
    if(m==='r1'){for(let s=1;s<N;s*=2){const ops=[];for(let t=0;t<N;t++)if(t%(2*s)===0)ops.push({t,d:t,s:t+s,add:1});
      S.push({kind:'smem',ops,cap:'Stride '+s+': threads whose index is a multiple of '+(2*s)+' add the value '+s+' to their right.'})}}
    if(m==='r2'){for(let s=1;s<N;s*=2){const ops=[];for(let t=0;2*s*t<N;t++)ops.push({t,d:2*s*t,s:2*s*t+s,add:1});
      S.push({kind:'smem',ops,cap:'Stride '+s+': thread t adds into element '+(2*s)+'t. The working threads are contiguous; their addresses are '+(2*s)+' apart.'})}}
    if(m==='r3'){for(let s=N/2;s>0;s>>=1){const ops=[];for(let t=0;t<s;t++)ops.push({t,d:t,s:t+s,add:1});
      S.push({kind:'smem',ops,cap:'Half-width '+s+': thread t adds element t + '+s+'. Contiguous threads, contiguous addresses.'})}}
    if(m==='r5'){
      for(const o of [2,1]){const ops=[];for(let t=0;t<N;t++)if(t%WS+o<WS)ops.push({t,d:t,s:t+o,add:1});
        S.push({kind:'shfl',ops,lanes:N,cap:'Shuffle down by '+o+' inside each warp: a lane adds the register of the lane '+o+' above it. No shared memory, no barrier.'})}
      const ops=[];for(let w=0;w<N/WS;w++)ops.push({t:w*WS,d:w,s:w*WS,copy:1});
      S.push({kind:'smem',ops,wonly:1,cap:'Lane 0 of each warp writes its warp\'s sum to shared memory slot w; one barrier.'});
      for(const o of [2,1]){const ops=[];for(let t=0;t<WS;t++)if(t+o<WS)ops.push({t,d:t,s:t+o,add:1});
        S.push({kind:'shfl',ops,lanes:WS,cap:'Warp 0 reads the '+(N/WS)+' warp sums and shuffles down by '+o+'.'})}
    }
    if(m==='hs'){for(let k=1;k<N;k*=2){const ops=[];for(let t=0;t<N;t++)ops.push(t>=k?{t,d:t,s:t-k,add:1}:{t,d:t,s:-1,keep:1});
      S.push({kind:'smem',ops,dbl:1,cap:'Offset '+k+': every element adds the one '+k+' to its left (read from the previous copy, so no element reads a value already updated).'})}}
    if(m==='bl'){
      for(let d=1;d<N;d*=2){const ops=[];for(let t=0;2*d*(t+1)-1<N;t++){const i=2*d*(t+1)-1;ops.push({t,d:i,s:i-d,add:1})}
        S.push({kind:'smem',ops,cap:'Up-sweep, distance '+d+': element '+(2*d)+'(t+1) &minus; 1 adds the one '+d+' to its left. A reduction tree.'})}
      S.push({kind:'smem',ops:[{t:0,d:N-1,s:-1,zero:1}],cap:'Set the last element (the total) to 0: the down-sweep will produce an exclusive scan.'});
      for(let d=N/2;d>=1;d>>=1){const ops=[];for(let t=0;2*d*(t+1)-1<N;t++){const i=2*d*(t+1)-1;ops.push({t,d:i,s:i-d,swap:1,add:1})}
        S.push({kind:'smem',ops,cap:'Down-sweep, distance '+d+': each pair swaps, and the right element adds the left one\'s old value.'})}
    }
    return S;
  }
  // apply a step to a copy of the array
  // every operation of a step reads the values from before the step (shuffles and double buffers do; for the
  // shared-memory trees no destination is also a source within a step, so it makes no difference there)
  function apply(a,st){const b=a.slice();
    st.ops.forEach(o=>{if(o.zero)b[o.d]=0;else if(o.swap){const l=a[o.s],r=a[o.d];b[o.s]=r;b[o.d]=r+l}else if(o.copy)b[o.d]=a[o.s];else if(o.add)b[o.d]=a[o.d]+a[o.s]});
    return b}
  // shared-memory transactions of one access group: per warp, the largest number of distinct addresses in one bank
  function trans(ops,f){const by={};ops.forEach(o=>{const a=f(o);if(a<0)return;const w=Math.floor(o.t/WS);(by[w]=by[w]||{});const bk=a%NB;(by[w][bk]=by[w][bk]||new Set()).add(a)});
    let n=0,worst=1;Object.values(by).forEach(b=>{const deg=Math.max(...Object.values(b).map(s=>s.size));n+=deg;worst=Math.max(worst,deg)});return {n,worst}}
  function counters(st){
    const warps=new Set(st.ops.map(o=>Math.floor(o.t/WS)));
    const lanes=st.kind==='shfl'?st.lanes:st.ops.length;
    const issued=st.kind==='shfl'?st.lanes/WS:warps.size;
    const c={adds:st.ops.filter(o=>o.add).length,active:lanes,issued,idle:issued*WS-lanes,barrier:st.kind==='smem'?1:0,shfl:st.kind==='shfl'?issued:0,tx:0,worst:1};
    if(st.kind==='smem'){const g=[];if(!st.wonly)g.push(trans(st.ops,o=>o.s),trans(st.ops,o=>o.d));g.push(trans(st.ops,o=>o.d));
      c.tx=g.reduce((x,y)=>x+y.n,0);c.worst=Math.max(...g.map(y=>y.worst))}
    return c}
  function run(m){const S=steps(m);let a=INPUT.slice();const states=[a],cs=[];S.forEach(st=>{a=apply(a,st);states.push(a);cs.push(counters(st))});
    const tot={steps:S.length,adds:0,active:0,idle:0,barrier:0,shfl:0,tx:0,worst:1};
    cs.forEach(c=>{['adds','active','idle','barrier','shfl','tx'].forEach(k=>tot[k]+=c[k]);tot.worst=Math.max(tot.worst,c.worst)});
    return {S,states,cs,tot}}
  return {N,WS,NB,INPUT,steps,run};
})();
