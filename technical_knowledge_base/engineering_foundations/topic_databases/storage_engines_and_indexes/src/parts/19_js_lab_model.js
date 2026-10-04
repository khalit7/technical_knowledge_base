// ---- B-tree and LSM lab: the two engine models (pure logic, no drawing). Also used by the Reading animation's counters. ----
// Units are key slots, not bytes: a B-tree page holds `cap` keys; an LSM run of n keys costs n slots to write.
window.LAB=(function(){
  // B+tree with Postgres-like splits: a split of the rightmost leaf when the new key is the largest keeps the left page
  // `ff` full (fillfactor, 90% by default in Postgres); any other split divides the keys equally.
  function BTree(cap,ff){
    this.cap=cap;this.ff=ff||0.9;this.nid=0;this.root=this.node(true);this.height=1;
    this.dirty=new Set();this.pageWrites=0;this.walRecords=0;this.fpi=0;this.imaged=new Set();this.splits=0;this.live=0;this.inserts=0;
  }
  BTree.prototype.node=function(leaf){return {id:++this.nid,leaf:leaf,keys:[],kids:[],next:null}};
  BTree.prototype.touch=function(n){this.dirty.add(n.id);if(!this.imaged.has(n.id)){this.imaged.add(n.id);this.fpi++}};
  BTree.prototype.path=function(k){const p=[];let n=this.root;while(true){p.push(n);if(n.leaf)return p;let i=0;while(i<n.keys.length&&k>=n.keys[i])i++;n=n.kids[i]}};
  BTree.prototype.insert=function(k){
    this.inserts++;this.walRecords++;
    const p=this.path(k),leaf=p[p.length-1];
    let i=0;while(i<leaf.keys.length&&leaf.keys[i]<k)i++;
    const ev={split:false,levels:0,leaf:leaf.id,path:p.map(n=>n.id),update:false};
    if(leaf.keys[i]===k){this.touch(leaf);ev.update=true;return ev}
    leaf.keys.splice(i,0,k);this.live++;this.touch(leaf);
    let n=leaf,d=p.length-1;
    while(n.keys.length>(n.leaf?this.cap:this.cap)){
      ev.split=true;ev.levels++;this.splits++;
      const right=this.node(n.leaf);
      const rightmost=n.next===null&&(n.leaf?k>=n.keys[n.keys.length-1]:true)&&this.isRightmost(n);
      let cut=rightmost?Math.max(1,Math.min(n.keys.length-1,Math.round(this.cap*this.ff))):Math.ceil(n.keys.length/2);
      let sep;
      if(n.leaf){right.keys=n.keys.splice(cut);sep=right.keys[0];right.next=n.next;n.next=right}
      else{sep=n.keys[cut];right.keys=n.keys.splice(cut+1);n.keys.splice(cut);right.kids=n.kids.splice(cut+1)}
      this.touch(right);this.touch(n);this.walRecords++;
      if(d===0){const r=this.node(false);r.keys=[sep];r.kids=[n,right];this.root=r;this.height++;this.touch(r);break}
      const par=p[d-1];let j=0;while(j<par.keys.length&&sep>=par.keys[j])j++;
      par.keys.splice(j,0,sep);par.kids.splice(j+1,0,right);this.touch(par);n=par;d--;
    }
    return ev;
  };
  BTree.prototype.isRightmost=function(n){let r=this.root;while(true){if(r===n)return true;if(r.leaf)return false;r=r.kids[r.kids.length-1]}};
  // a checkpoint writes every dirty page once and resets the "already imaged" set (the next change to each page logs a full image)
  BTree.prototype.checkpoint=function(){const w=this.dirty.size;this.pageWrites+=w;this.dirty.clear();this.imaged.clear();return w};
  BTree.prototype.levels=function(){const L=[];let row=[this.root];while(row.length){L.push(row);if(row[0].leaf)break;row=[].concat(...row.map(n=>n.kids))}return L};
  BTree.prototype.pages=function(){return this.levels().reduce((a,r)=>a+r.length,0)};
  BTree.prototype.lookup=function(k){return this.path(k).length};

  // LSM-tree: memtable of `mem` keys; flush writes a sorted run to level 0.
  // leveled: level i (i >= 1) is one run of at most mem*T^i keys; L0 is merged into L1 when it has 2 runs; an overfull level is merged whole into the next.
  // tiered: each level collects up to T runs; when it has T, they are merged into one run on the next level.
  function LSM(mem,T,style){
    this.mem=mem;this.T=T;this.style=style;this.memtable=new Map();this.levels=[[]];this.written=0;this.walWritten=0;this.userWrites=0;
    this.flushes=0;this.compactions=0;this.seq=0;this.log=[];
  }
  LSM.prototype.put=function(k){this.userWrites++;this.walWritten++;this.memtable.set(k,++this.seq);const ev={flush:false,compactions:[]};
    if(this.memtable.size>=this.mem){ev.flush=true;this.flush(ev)}return ev};
  LSM.prototype.flush=function(ev){
    const run=[...this.memtable.entries()].sort((a,b)=>a[0]-b[0]);this.memtable=new Map();
    this.levels[0].unshift(run);this.written+=run.length;this.flushes++;this.compact(ev);
  };
  LSM.prototype.merge=function(runs){ // newest first; keep the newest version of each key
    const m=new Map();for(const r of runs)for(const [k,s] of r){if(!m.has(k)||m.get(k)<s)m.set(k,s)}
    return [...m.entries()].sort((a,b)=>a[0]-b[0]);
  };
  LSM.prototype.cap=function(i){return this.mem*Math.pow(this.T,i)};
  LSM.prototype.compact=function(ev){
    const L=this.levels;
    for(let i=0;i<L.length;i++){
      if(this.style==='tiered'){
        if(L[i].length>=this.T){const run=this.merge(L[i]);L[i]=[];if(!L[i+1])L[i+1]=[];L[i+1].unshift(run);this.written+=run.length;this.compactions++;ev&&ev.compactions.push({from:i,to:i+1,n:run.length})}
      }else{
        const over=i===0?L[0].length>=2:L[i].length&&L[i][0].length>this.cap(i);
        if(over){if(!L[i+1])L[i+1]=[];const run=this.merge(L[i].concat(L[i+1]));L[i]=[];L[i+1]=[run];this.written+=run.length;this.compactions++;ev&&ev.compactions.push({from:i,to:i+1,n:run.length})}
      }
    }
    while(L.length>1&&!L[L.length-1].length)L.pop();
  };
  LSM.prototype.runs=function(){return this.levels.reduce((a,l)=>a+l.length,0)};
  LSM.prototype.stored=function(){return this.levels.reduce((a,l)=>a+l.reduce((b,r)=>b+r.length,0),0)};
  LSM.prototype.liveKeys=function(){const s=new Set(this.memtable.keys());for(const l of this.levels)for(const r of l)for(const [k] of r)s.add(k);return s.size};
  // runs probed to find key k: memtable first, then newest to oldest; a bloom filter skips runs that do not hold k, except false positives (rate fp)
  LSM.prototype.lookup=function(k,bloom,fp){
    if(this.memtable.has(k))return {probed:0,found:true,expectedFalse:0};
    let probed=0,ef=0;
    for(const l of this.levels)for(const r of l){
      const has=bs(r,k);
      if(bloom){if(has){probed++;return {probed,found:true,expectedFalse:ef}}ef+=fp}else{probed++;if(has)return {probed,found:true,expectedFalse:0}}
    }
    return {probed,found:false,expectedFalse:ef};
  };
  function bs(r,k){let lo=0,hi=r.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(r[m][0]===k)return true;if(r[m][0]<k)lo=m+1;else hi=m-1}return false}
  // Bloom filter false-positive rate with b bits per key and the optimal number of hash functions k = b ln 2 (rounded):
  function bloomFP(b){const k=Math.max(1,Math.round(b*Math.LN2));return Math.pow(1-Math.exp(-k/b),k)}
  // B-tree levels for n keys with fan-out f per internal page and l keys per leaf page: 1 + ceil(log_f(ceil(n / l)))
  function levelsFor(n,f,l){const leaves=Math.ceil(n/l);return leaves<=1?1:1+Math.ceil(Math.log(leaves)/Math.log(f)-1e-9)}
  return {BTree,LSM,bloomFP,levelsFor};
})();
