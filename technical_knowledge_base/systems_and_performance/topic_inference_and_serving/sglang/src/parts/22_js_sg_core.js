// ---- SG core: traces, the radix cache and the hash-block cache, the scheduling-round model ----
// A line-for-line port of src/iso/traces.py, ref.py and sched.py. src/iso/check_js.mjs runs this file under Node
// and requires identical results to the Python reference, which src/iso/check_real.py and sched.py --check
// hold identical to SGLang v0.5.21's own RadixCache and SchedulePolicy and vLLM v0.31.0's own KVCacheManager.
window.SG=(function(){
  function Rng(seed){this.s=seed>>>0}
  Rng.prototype.next=function(){
    this.s=(this.s+0x6D2B79F5)>>>0;let t=this.s;
    t=Math.imul(t^(t>>>15),t|1)>>>0;
    t=(t^((t+(Math.imul(t^(t>>>7),t|61)>>>0))>>>0))>>>0;
    return ((t^(t>>>14))>>>0)/4294967296};
  Rng.prototype.int=function(lo,hi){return lo+Math.floor(this.next()*(hi-lo+1))};
  // the root page's Serving simulator workload generator (src/sim/sim.py make_workload)
  function makeWorkload(w){
    const r=new Rng(w.seed),reqs=[];let t=0,rid=0;
    const nconv=Math.max(1,Math.ceil(w.n/w.turns));
    for(let c=0;c<nconv;c++){
      if(w.rate>0){const u=r.next();t+=Math.floor(-Math.log(1-u)/w.rate*1e6+0.5)/1e6}
      const has=r.next()<w.share&&w.sys>0;
      const g=has?r.int(0,w.groups-1):-1,S=has?w.sys:0;let hist=S;
      for(let k=0;k<w.turns;k++){
        if(rid>=w.n)break;
        const U=r.int(w.plo,w.phi);let O=r.int(w.olo,w.ohi);O=Math.min(O,w.maxtok);
        const P=hist+U,arr=Math.floor((t+k*w.gap)*1e6+0.5)/1e6;
        reqs.push({id:rid,arr:arr,P:P,O:O,M:w.maxtok,g:g,S:S,conv:c,turn:k});
        hist=P+O;rid++;
      }
    }
    reqs.sort((a,b)=>a.arr-b.arr||a.id-b.id);
    return reqs;
  }
  const TRACES={
    chat:{n:240,rate:2.0,plo:30,phi:200,olo:30,ohi:200,maxtok:200,sys:600,share:0.9,groups:3,turns:4,gap:20.0,seed:7},
    agent:{n:200,rate:0.4,plo:20,phi:150,olo:50,ohi:300,maxtok:300,sys:2000,share:1.0,groups:1,turns:10,gap:15.0,seed:11},
    unique:{n:200,rate:2.0,plo:100,phi:800,olo:30,ohi:200,maxtok:200,sys:0,share:0.0,groups:1,turns:1,gap:0.0,seed:3}};
  function tok(q,pos){const sid=(q.g>=0&&pos<q.S)?1+q.g:1000+q.conv;
    return 100+(sid*2654435761+pos*40503+(sid*pos)%9973)%150000}
  function ragTrace(ndoc,dlen,nq,seed){ndoc=ndoc||8;dlen=dlen||800;nq=nq||160;seed=seed===undefined?5:seed;
    const r=new Rng(seed),reqs=[];
    for(let i=0;i<nq;i++){const d=r.int(0,ndoc-1),U=r.int(20,80),O=r.int(20,80);
      reqs.push({id:i,arr:i*0.1,P:dlen+U,O:O,M:80,g:d,S:dlen,conv:i,turn:0})}
    return reqs}
  function getTrace(name,o){return name==='rag'?ragTrace(o&&o.ndoc,o&&o.dlen,o&&o.nq,o&&o.seed):makeWorkload(TRACES[name])}
  function tokens(q,n){if(n===undefined)n=q.P;const a=new Array(n);for(let i=0;i<n;i++)a[i]=tok(q,i);return a}

  // ---- binary heap ordered by (last, id), as Python's heapq on (last, id, node) ----
  function Heap(){this.a=[]}
  const lt=(x,y)=>x.last<y.last||(x.last===y.last&&x.id<y.id);
  Heap.prototype.push=function(n){const a=this.a;a.push(n);let i=a.length-1;
    while(i>0){const p=(i-1)>>1;if(lt(a[i],a[p])){const t=a[i];a[i]=a[p];a[p]=t;i=p}else break}};
  Heap.prototype.pop=function(){const a=this.a,top=a[0],l=a.pop();if(a.length){a[0]=l;let i=0;
    for(;;){const L=2*i+1,R=L+1;let m=i;if(L<a.length&&lt(a[L],a[m]))m=L;if(R<a.length&&lt(a[R],a[m]))m=R;if(m===i)break;const t=a[i];a[i]=a[m];a[m]=t;i=m}}
    return top};

  // ---- radix cache (SGLang RadixCache semantics, see ref.py) ----
  function Radix(cap){this.t=0;this.nid=0;this.root=this._node();this.root.lock=1;this.cap=cap;this.free=cap;this.size=0;this.leaves=new Set();this.nodes=1;this.log=null}
  Radix.prototype.clock=function(){return ++this.t};
  Radix.prototype._node=function(){return {children:new Map(),parent:null,key:[],lock:0,last:this.clock(),created:this.clock(),evicted:false,id:this.nid++}};
  Radix.prototype._upd=function(n){if(n.evicted||n.lock>0){this.leaves.delete(n);return}
    for(const c of n.children.values()){if(!c.evicted){this.leaves.delete(n);return}}this.leaves.add(n)};
  Radix.prototype._split=function(child,k){const nn=this._node();this.nodes++;
    nn.children=new Map([[child.key[k],child]]);nn.parent=child.parent;nn.lock=child.lock;nn.key=child.key.slice(0,k);
    child.parent=nn;child.key=child.key.slice(k);nn.parent.children.set(nn.key[0],nn);if(this.log)this.log.push(['split',nn.id,child.id,k]);return nn};
  Radix.prototype.match=function(ids){const t=this.clock();let node=this.root;node.last=t;let n=0,key=ids,off=0;
    while(off<key.length&&node.children.has(key[off])){const c=node.children.get(key[off]);c.last=t;let k=0;const m=Math.min(c.key.length,key.length-off);
      while(k<m&&c.key[k]===key[off+k])k++;
      if(k<c.key.length){node=this._split(c,k);n+=k;break}
      n+=k;node=c;off+=k}
    return [n,node]};
  Radix.prototype.insert=function(ids){const t=this.clock();let node=this.root;node.last=t;let off=0,pre=0;
    while(off<ids.length&&node.children.has(ids[off])){node=node.children.get(ids[off]);node.last=t;let k=0;const m=Math.min(node.key.length,ids.length-off);
      while(k<m&&node.key[k]===ids[off+k])k++;
      pre+=k;off+=k;if(k<node.key.length)node=this._split(node,k)}
    if(off<ids.length){const nn=this._node();this.nodes++;nn.parent=node;nn.key=ids.slice(off);node.children.set(ids[off],nn);
      this.size+=ids.length-off;this._upd(node);this._upd(nn);if(this.log)this.log.push(['new',nn.id,node.id,ids.length-off])}
    return pre};
  // cached length of ids without touching timestamps or splitting (for drawing only)
  Radix.prototype.peek=function(ids){let node=this.root,off=0;
    while(off<ids.length&&node.children.has(ids[off])){const c=node.children.get(ids[off]);let k=0;const m=Math.min(c.key.length,ids.length-off);
      while(k<m&&c.key[k]===ids[off+k])k++;off+=k;if(k<c.key.length)break;node=c}
    return off};
  Radix.prototype.lockPath=function(node,d){while(node!==this.root){node.lock+=d;this._upd(node);node=node.parent}};
  Radix.prototype.evict=function(num){const h=new Heap();for(const n of this.leaves)h.push(n);let done=0;
    while(done<num&&h.a.length){const x=h.pop();done+=x.key.length;this.free+=x.key.length;this.size-=x.key.length;
      x.parent.children.delete(x.key[0]);x.evicted=true;this.leaves.delete(x);this.nodes--;this._upd(x.parent);if(this.log)this.log.push(['evict',x.id,x.key.length]);
      const p=x.parent;if(!p.children.size&&p.lock===0)h.push(p)}
    return done};
  Radix.prototype.serve=function(ids,P,O){const mm=this.match(ids.slice(0,P-1)),hit=mm[0],node=mm[1];this.lockPath(node,1);
    const need=(P-hit)+(O-1);let ev=0;if(this.free<need)ev=this.evict(need-this.free);
    if(this.free<need)throw new Error('pool too small');this.free-=need;
    const pre=this.insert(ids.slice(0,P+O-1));if(P>0&&P<P+O-1)this.insert(ids.slice(0,P));
    this.free+=pre-hit;this.lockPath(node,-1);return [hit,ev]};

  // ---- hash-block cache (vLLM KVCacheManager semantics, see ref.py) ----
  // a block's identity is a hash chained over the blocks before it, as vLLM's hash_block_tokens(parent, tokens)
  function chain(parent,ids,s,e){let h1=parent[0]^0x9e3779b9,h2=parent[1]^0x85ebca6b;
    for(let i=s;i<e;i++){h1=Math.imul(h1^ids[i],0x01000193)>>>0;h2=Math.imul(h2+ids[i]|0,0x5bd1e995)>>>0;h2^=h2>>>13}
    return [h1>>>0,h2>>>0]}
  // The free queue is kept as two parts, which is exactly vLLM's order: blocks with no cached content always sit in front
  // (they are prepended, and the queue starts with all blocks uncached), cached blocks behind them in least recently
  // freed order (appended). A stack for the first part and an insertion-ordered Map for the second keep every step O(1).
  function Blocks(cap,bs){this.bs=bs||16;this.n=Math.floor(cap/this.bs);this.hash=new Array(this.n).fill(null);this.ref=new Array(this.n).fill(0);
    this.cached=new Map();this.unc=[];for(let i=this.n-1;i>=0;i--)this.unc.push(i);this.lru=new Map();this.evicted=0}
  Blocks.prototype.nfree=function(){return this.unc.length+this.lru.size};
  Blocks.prototype.pop=function(){if(this.unc.length)return this.unc.pop();const b=this.lru.keys().next().value;this.lru.delete(b);return b};
  Blocks.prototype.serve=function(ids,P,O){const bs=this.bs,keys=[];let h=[0,0];
    const nfull=Math.floor((P+O-1)/bs);
    for(let k=0;k<nfull;k++){h=chain(h,ids,k*bs,(k+1)*bs);keys.push(h[0]+':'+h[1])}
    const hitb=[];for(let k=0;k<Math.floor((P-1)/bs);k++){const l=this.cached.get(keys[k]);if(!l||!l.length)break;hitb.push(l[0])}
    const hit=hitb.length*bs;
    for(const b of hitb){if(this.ref[b]===0)this.lru.delete(b);this.ref[b]++}
    const total=Math.ceil((P+O-1)/bs),mine=hitb.slice();let ev=0;
    if(total-hitb.length>this.nfree())throw new Error('pool too small');
    for(let i=0;i<total-hitb.length;i++){const b=this.pop();
      if(this.hash[b]!==null){const l=this.cached.get(this.hash[b]);l.splice(l.indexOf(b),1);if(!l.length)this.cached.delete(this.hash[b]);this.hash[b]=null;ev+=bs}
      this.ref[b]=1;mine.push(b)}
    for(let k=hitb.length;k<nfull;k++){const b=mine[k];this.hash[b]=keys[k];if(!this.cached.has(keys[k]))this.cached.set(keys[k],[]);this.cached.get(keys[k]).push(b)}
    const first=[];for(let i=mine.length-1;i>=0;i--){const b=mine[i];this.ref[b]--;if(this.ref[b]===0){if(this.hash[b]===null)first.push(b);else this.lru.set(b,1)}}
    for(let i=first.length-1;i>=0;i--)this.unc.push(first[i]);
    this.evicted+=ev;return [hit,ev]};

  function runCache(kind,reqs,cap){const c=kind==='radix'?new Radix(cap):new Blocks(cap),out=[];
    for(const q of reqs){const ids=tokens(q,q.P+q.O-1);const r=c.serve(ids,q.P,q.O);out.push([q.id,r[0],r[1]])}
    return {reqs:out,cache:c}}

  // ---- scheduling rounds (sched.py) ----
  const TH=32,MAX_PREFILL=16384;
  function dfsOrder(root,nodes){const at=new Map();nodes.forEach((n,i)=>{if(!at.has(n))at.set(n,[]);at.get(n).push(i)});
    const w=new Map();for(const [n,v] of at)w.set(n,v.length);
    let st=[[root,false]];while(st.length){const [n,vis]=st.pop();
      if(vis){let s=w.get(n)||0;for(const c of n.children.values())s+=w.get(c)||0;w.set(n,s);continue}
      st.push([n,true]);const ch=[...n.children.values()];for(let i=ch.length-1;i>=0;i--)st.push([ch[i],false])}
    const order=[];st=[[root,false]];while(st.length){const [n,vis]=st.pop();
      if(vis){const a=at.get(n);if(a)order.push(...a);continue}
      const ch=[...n.children.values()].map((c,i)=>[c,i]).sort((x,y)=>(-(w.get(x[0])||0))-(-(w.get(y[0])||0))||x[1]-y[1]).map(x=>x[0]);
      st.push([n,true]);for(let i=ch.length-1;i>=0;i--)st.push([ch[i],false])}
    return order}
  function orderQueue(policy,tree,W,idsOf,rng){const m=new Map(),nodes=[];
    for(const q of W){const r=tree.match(idsOf(q).slice(0,q.P-1));m.set(q.id,r[0]);nodes.push(r[1])}
    if(policy==='fcfs'||(policy==='lpm'&&W.length>128))return [W.slice(),m];
    if(policy==='random'){const W2=W.slice();pyShuffle(W2,rng);return [W2,m]}
    if(policy==='dfs-weight')return [dfsOrder(tree.root,nodes).map(i=>W[i]),m];
    const wq=new Radix(1e15),dep=new Set();
    for(const q of W){if(m.get(q.id)<=TH){const p=idsOf(q).slice(0,q.P);const h=wq.match(p)[0];if(h>=TH)dep.add(q.id);else wq.insert(p)}}
    const key=q=>dep.has(q.id)?Infinity:-m.get(q.id);
    return [W.map((q,i)=>[q,i]).sort((a,b)=>(key(a[0])-key(b[0]))||a[1]-b[1]).map(x=>x[0]),m]}
  // Python's random.shuffle needs Python's Mersenne Twister; the page's random policy uses its own seeded shuffle and says so
  function pyShuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng.next()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}}
  function schedRun(reqs,cap,policy,seed,arrivalSeed,onRound){seed=seed||1;const tree=new Radix(cap),idsOf=q=>tokens(q,q.P+q.O-1);
    const order0=reqs.slice();pyShuffle(order0,new Rng(arrivalSeed===undefined?seed:arrivalSeed));
    const rng=new Rng(seed+100);let W=order0;const rounds=[],hits=new Map();
    while(W.length){const om=orderQueue(policy,tree,W,idsOf,rng),Wo=om[0],m=om[1];
      let budget=tree.free+tree.size,used=0;const adm=[];
      for(const q of Wo){const nw=q.P-m.get(q.id),tot=nw+q.O;if(tot>budget||used+nw>MAX_PREFILL)break;adm.push(q);budget-=tot;used+=nw}
      if(!adm.length)throw new Error('nothing fits');
      const locked=[];for(const q of adm){const r=tree.match(idsOf(q).slice(0,q.P-1));tree.lockPath(r[1],1);locked.push([q,r[0],r[1]])}
      let need=0;for(const [q,h] of locked)need+=(q.P-h)+(q.O-1);
      if(tree.free<need)tree.evict(need-tree.free);tree.free-=need;
      for(const [q,h] of locked){const ids=idsOf(q);const pre=tree.insert(ids.slice(0,q.P+q.O-1));tree.insert(ids.slice(0,q.P));tree.free+=pre-h;hits.set(q.id,h)}
      for(const [q,h,n] of locked)tree.lockPath(n,-1);
      let hs=0,pf=0;for(const [q,h] of locked){hs+=h;pf+=q.P-h}
      rounds.push({admitted:adm.map(q=>q.id),hit:hs,prefill:pf,wait:Wo.map(q=>q.id),snap:onRound?onRound(tree):null});
      const done=new Set(adm.map(q=>q.id));W=W.filter(q=>!done.has(q.id))}
    let prompt=0,hit=0;for(const q of reqs)prompt+=q.P;for(const v of hits.values())hit+=v;
    return {rounds:rounds,hit_tokens:hit,prompt_tokens:prompt,prefill_tokens:prompt-hit}}

  return {Rng,makeWorkload,TRACES,tok,ragTrace,getTrace,tokens,Radix,Blocks,runCache,schedRun,dfsOrder};
})();
