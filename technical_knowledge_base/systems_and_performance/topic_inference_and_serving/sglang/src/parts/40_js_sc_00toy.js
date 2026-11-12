// ---- Scene data shared by the hero (Fig. 1) and the radix-tree stage (Fig. 2): the toy bank assistant of section 2 run through
// the page's checked radix cache (SG.Radix in 22_js_sg_core.js, identical request by request to SGLang v0.5.21's RadixCache, src/iso/check_real.py),
// with a 40-slot KV pool. The tree only counts slots; which slot numbers a node holds is assigned here, lowest free slot first, from the
// cache's own log of splits, inserts and evictions, so the picture of the pool is illustrative while every count is the cache's. ----
window.SGTOY=(function(){
  if(!window.SG)return null;
  const S='You are a bank assistant . Be brief .'.split(' '),T='You are a travel agent . Be brief .'.split(' '),sp=s=>s.split(' ');
  const REQ=[[S.concat(sp('What is my balance ?')),sp('It is $40 .'),'A'],
    [S.concat(sp('Can I open an account ?')),sp('Yes , online .'),'B'],
    [S.concat(sp('What is my balance ?'),sp('It is $40 .'),sp('And savings ?')),sp('$9 .'),'A, turn 2'],
    [T.concat(sp('Book a flight .')),sp('Where to ?'),'travel'],
    [S.concat(sp('What are your hours ?')),sp('Nine to five .'),'C'],
    [S.concat(sp('What is my balance ?')),sp('It is $40 .'),'D'],
    [T.concat(sp('Book a flight .'),sp('Where to ?'),sp('Paris .')),sp('Done .'),'travel, turn 2'],
    [S.concat(sp('What is my loan ?')),sp('None .'),'E']];
  const CAP=40,vocab=new Map(),words=[];
  const id=w=>{if(!vocab.has(w)){vocab.set(w,vocab.size+1);words[vocab.size]=w}return vocab.get(w)};
  const reqs=REQ.map(r=>({p:r[0].map(id),o:r[1].map(id),who:r[2]}));
  const t=new SG.Radix(CAP),slots=new Map(),owner=new Array(CAP).fill(-1);
  const alloc=(nid,n)=>{const out=[];for(let s=0;s<CAP&&out.length<n;s++)if(owner[s]<0){owner[s]=nid;out.push(s)}slots.set(nid,out)};
  const apply=log=>log.forEach(e=>{
    if(e[0]==='split'){const c=slots.get(e[2])||[];slots.set(e[1],c.slice(0,e[3]));slots.set(e[2],c.slice(e[3]));slots.get(e[1]).forEach(s=>owner[s]=e[1])}
    else if(e[0]==='new')alloc(e[1],e[3]);
    else if(e[0]==='evict'){(slots.get(e[1])||[]).forEach(s=>owner[s]=-1);slots.delete(e[1])}});
  function snap(){const nodes=[];(function walk(n,start,par){for(const c of n.children.values()){nodes.push({id:c.id,par,start,len:c.key.length,text:c.key.map(i=>words[i]).join(' '),slots:(slots.get(c.id)||[]).slice()});walk(c,start+c.key.length,c.id)}})(t.root,0,-1);
    return {nodes,owner:owner.slice()}}
  const out=[];
  reqs.forEach((q,i)=>{const ids=q.p.concat(q.o),P=q.p.length,O=q.o.length;
    t.log=[];const m=t.match(ids.slice(0,P-1)),hit=m[0];apply(t.log);
    const path=[];for(let n=m[1];n&&n!==t.root;n=n.parent)path.push(n.id);
    const mid=snap();
    t.lockPath(m[1],1);const need=(P-hit)+(O-1);t.log=[];let ev=0;if(t.free<need)ev=t.evict(need-t.free);
    const evicted=t.log.filter(x=>x[0]==='evict').map(x=>({id:x[1],len:x[2],slots:(slots.get(x[1])||[]).slice()}));apply(t.log);
    t.free-=need;t.log=[];const pre=t.insert(ids.slice(0,P+O-1));if(P<P+O-1)t.insert(ids.slice(0,P));t.free+=pre-hit;t.lockPath(m[1],-1);
    const created=t.log.filter(x=>x[0]==='new').map(x=>x[1]);apply(t.log);
    out.push({i,who:q.who,P,O,hit,path,mid,evicted,ev,created,after:snap(),nodes:t.nodes-1,held:CAP-t.free,prompt:q.p.map(x=>words[x]).join(' ')})});
  return {CAP,reqs:out};
})();
