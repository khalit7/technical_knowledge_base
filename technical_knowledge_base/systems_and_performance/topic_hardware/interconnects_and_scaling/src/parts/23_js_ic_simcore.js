// ---- Collective simulator core: a line-by-line port of src/collsim.py (checked against it by check/check_page.mjs) ----
window.ICSIM=(function(){
  const log2i=n=>{let k=0;while((1<<k)<n)k++;return k};
  const range=n=>Array.from({length:n},(_,i)=>i);
  const mod=(a,n)=>((a%n)+n)%n;
  function stepsFor(coll,alg,n){
    const st=[];
    if(coll==='ar'&&alg==='ring'){
      for(let i=0;i<n-1;i++)st.push(range(n).map(g=>[g,(g+1)%n,[mod(g-i,n)],'add']));
      for(let i=0;i<n-1;i++)st.push(range(n).map(g=>[g,(g+1)%n,[mod(g+1-i,n)],'copy']));
    }else if(coll==='ar'&&alg==='rd'){
      for(let k=1;k<n;k<<=1)st.push(range(n).map(g=>[g,g^k,range(n),'add']));
    }else if(coll==='ar'&&alg==='rab'){
      const L=log2i(n);let own={};range(n).forEach(g=>own[g]=range(n));const hist=[];
      for(let k=0;k<L;k++){const d=n>>(k+1),step=[],nw={};
        range(n).forEach(g=>{const p=g^d;const lo=own[g].filter(c=>(c&d)===(g&d)),give=own[g].filter(c=>(c&d)!==(g&d));step.push([g,p,give,'add']);nw[g]=lo});
        own=nw;hist.push(d);st.push(step)}
      hist.slice().reverse().forEach(d=>{const step=[],nw={};
        range(n).forEach(g=>{const p=g^d;step.push([g,p,own[g].slice(),'copy']);nw[g]=own[g].concat(own[p]).sort((a,b)=>a-b)});
        own=nw;st.push(step)});
    }else if(coll==='ar'&&alg==='switch'){
      st.push(range(n).map(g=>[g,-1,range(n),'add']));
      st.push(range(n).map(g=>[-1,g,range(n),'copy']));
    }else if(coll==='ag'&&alg==='ring'){
      for(let i=0;i<n-1;i++)st.push(range(n).map(g=>[g,(g+1)%n,[mod(g-i,n)],'copy']));
    }else if(coll==='ag'&&alg==='rd'){
      for(let k=1;k<n;k<<=1)st.push(range(n).map(g=>[g,g^k,range(n).filter(c=>Math.floor(c/k)===Math.floor(g/k)),'copy']));
    }else if(coll==='a2a'&&alg==='pair'){
      for(let k=1;k<n;k++)st.push(range(n).map(g=>[g,(g+k)%n,[['a2a',g,(g+k)%n]],'copy']));
    }else throw new Error('unknown '+coll+' '+alg);
    return st;
  }
  function initial(coll,n){
    if(coll==='ag')return range(n).map(g=>range(n).map(c=>c===g?(1<<g):0));
    return range(n).map(g=>range(n).map(()=>1<<g));
  }
  // Runs the whole collective; returns per-step snapshots for the animation as well as the totals.
  function run(coll,alg,n,S,alpha,beta,alphaSw){
    const have=initial(coll,n),rx=range(n).map(g=>range(n).map(s=>s===g?1:0));
    const chunk=S/n;let T=0;const sent=range(n).map(()=>0),times=[],snaps=[{have:have.map(r=>r.slice()),rx:rx.map(r=>r.slice()),sw:null,tr:[],t:0,sent:0}];
    let sw=null;
    stepsFor(coll,alg,n).forEach(step=>{
      const out={},inn={},snap=have.map(r=>r.slice());
      step.forEach(([s,d,cs,op])=>{
        const b=chunk*cs.length;out[s]=(out[s]||0)+b;inn[d]=(inn[d]||0)+b;if(s>=0)sent[s]+=b;
        if(coll==='a2a'){const src=cs[0][1],dst=cs[0][2];rx[dst][src]=1;return}
        if(d===-1){sw=sw?sw.map((a,c)=>a|snap[s][c]):range(n).map(c=>snap[s][c]);return}
        const src=s===-1?sw:snap[s];
        cs.forEach(c=>{have[d][c]=op==='add'?(have[d][c]|src[c]):src[c]});
      });
      const a=(alg!=='switch'||alphaSw==null)?alpha:alphaSw;
      const ports=range(n).map(g=>Math.max(out[g]||0,inn[g]||0));
      const t=a+Math.max.apply(null,ports)/beta;times.push(t);T+=t;
      snaps.push({have:have.map(r=>r.slice()),rx:rx.map(r=>r.slice()),sw:sw?sw.slice():null,tr:step,t:T,sent:Math.max.apply(null,sent)});
    });
    const full=(1<<n)-1;let ok;
    if(coll==='a2a')ok=rx.every(r=>r.every(x=>x===1));
    else if(coll==='ag')ok=have.every(r=>r.every((x,c)=>x===(1<<c)));
    else ok=have.every(r=>r.every(x=>x===full));
    if(alg==='switch')T=2*(alphaSw!=null?alphaSw:alpha)+S/beta;
    return {time:T,steps:times.length,sent:Math.max.apply(null,sent),ok,snaps};
  }
  function closed(coll,alg,n,S,alpha,beta,alphaSw){
    const L=log2i(n);
    if(coll==='ar')return {ring:2*(n-1)*alpha+2*(n-1)/n*S/beta,rd:L*alpha+L*S/beta,rab:2*L*alpha+2*(n-1)/n*S/beta,switch:2*(alphaSw!=null?alphaSw:alpha)+S/beta}[alg];
    if(coll==='ag')return {ring:(n-1)*alpha+(n-1)/n*S/beta,rd:L*alpha+(n-1)/n*S/beta}[alg];
    if(coll==='a2a')return (n-1)*alpha+(n-1)/n*S/beta;
    throw new Error(coll);
  }
  const BUSF={ar:n=>2*(n-1)/n,ag:n=>(n-1)/n,a2a:n=>(n-1)/n};
  const pop=x=>{let c=0;while(x){c+=x&1;x>>>=1}return c};
  return {stepsFor,run,closed,BUSF,pop,log2i};
})();
