// ---- The paper's test-time memory protocol on the real 140 ALFWorld test goals (no LLM: only the memory traffic) ----
// Same algorithm as src/stream_sim.py (check_sim.py compares them). Bank starts empty; tasks in a seeded random order,
// batches of B that share the bank state; BM25 (k1 1.5, b 0.75, idf ln(1+(N-df+.5)/(df+.5))) over task descriptions
// returns the top K stored trajectories with a positive score; a task is stored after its batch with probability p.
const JS_STREAM=(function(){
  const tok=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
  function run(goals,seed,p,B,K){B=B||10;K=K||3;const k1=1.5,b=0.75,n=goals.length,T=goals.map(tok);
    const rnd=mulberry32(seed),order=[...Array(n).keys()];
    for(let i=n-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=order[i];order[i]=order[j];order[j]=t}
    const ok=order.map(()=>rnd()<p),bank=[],ret=order.map(()=>[]);
    for(let b0=0;b0<n;b0+=B){const N=bank.length,df={};let avg=0;
      if(N){bank.forEach(q=>{new Set(T[order[q]]).forEach(w=>{df[w]=(df[w]||0)+1})});avg=bank.reduce((a,q)=>a+T[order[q]].length,0)/N}
      for(let pos=b0;pos<Math.min(b0+B,n);pos++){if(!N)continue;const qt=T[order[pos]],sc=[];
        bank.forEach((q,bi)=>{const d=T[order[q]],L=d.length;let s=0;
          qt.forEach(w=>{let f=0;for(const x of d)if(x===w)f++;if(!f)return;const idf=Math.log(1+(N-df[w]+.5)/(df[w]+.5));s+=idf*f*(k1+1)/(f+k1*(1-b+b*L/avg))});
          if(s>0)sc.push([-s,bi,q])});
        sc.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);ret[pos]=sc.slice(0,K).map(x=>x[2])}
      for(let pos=b0;pos<Math.min(b0+B,n);pos++)if(ok[pos])bank.push(pos)}
    return {order,ok,ret}}
  function stats(types,R0,B){B=B||10;const {order,ok,ret}=R0,n=order.length,typ=pos=>types[order[pos]];
    const R=[];ret.forEach((r,pos)=>r.forEach(q=>R.push([pos,q])));const uses={};R.forEach(([pos,q])=>{(uses[q]=uses[q]||[]).push(pos)});
    const stored=[];for(let pos=0;pos<n-B;pos++)if(ok[pos])stored.push(pos);
    const used=stored.filter(q=>uses[q]),first=used.map(q=>Math.min(...uses[q])-q),allu=R.map(([p,q])=>p-q);
    const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
    const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
    const hit=ret.filter(r=>r.length).length;
    return {tasks:n,zero_ret:ret.filter(r=>!r.length).length,lt_k:ret.filter(r=>r.length<3).length,retrievals:R.length,
      same_type:R.filter(([p,q])=>typ(p)===typ(q)).length/Math.max(1,R.length),
      top1_same_type:ret.map((r,p)=>r.length&&typ(p)===typ(r[0])?1:0).reduce((a,b)=>a+b,0)/Math.max(1,hit),
      stored:stored.length,never_used:(stored.length-used.length)/Math.max(1,stored.length),first_delay_mean:mean(first),first_delay_median:med(first),
      use_delay_mean:mean(allu),consumers_mean:mean(used.map(q=>uses[q].length)),consumer_types_mean:mean(used.map(q=>new Set(uses[q].map(typ)).size)),
      other_type_share:used.filter(q=>uses[q].some(c=>typ(c)!==typ(q))).length/Math.max(1,used.length),
      max_consumers:Math.max(0,...Object.values(uses).map(v=>v.length)),first,uses}}
  return {run,stats,tok}})();
if(typeof module!=='undefined')module.exports=JS_STREAM;
