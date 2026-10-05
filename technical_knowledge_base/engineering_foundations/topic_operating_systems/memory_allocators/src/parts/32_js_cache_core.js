// ---- Caching allocator model (PyTorch CUDACachingAllocator.cpp at v2.14.1), pure logic, no DOM.
// Port of src/sim/cache_ref.py; checked step by step against it by src/sim/check_js.mjs.
(function(root){
  const MiB=1048576,K_MIN_BLOCK=512,K_SMALL_SIZE=MiB,K_SMALL_BUFFER=2*MiB,K_MIN_LARGE=10*MiB,K_ROUND_LARGE=2*MiB,LARGE_SEG=20*MiB;
  function bitlen(x){let n=0;while(x>0){x=Math.floor(x/2);n++}return n}
  function pow2floor(x){return Math.pow(2,bitlen(x)-1)}
  function isPow2(x){return x>0&&pow2floor(x)===x}
  function roundupDiv(size,div){
    if(isPow2(size))return size;
    const p2f=pow2floor(size),d=Math.floor(p2f/Math.pow(2,bitlen(div)-1));
    if(d===0)return p2f*2;
    const floor=size-(size%d);
    return floor===size?size:floor+d;
  }
  function roundSize(size,div){
    if(size<K_MIN_BLOCK)return K_MIN_BLOCK;
    if(div>1&&size>K_MIN_BLOCK*div)return roundupDiv(size,div);
    return K_MIN_BLOCK*Math.ceil(size/K_MIN_BLOCK);
  }
  function allocationSize(size){
    if(size<=K_SMALL_SIZE)return K_SMALL_BUFFER;
    if(size<K_MIN_LARGE)return LARGE_SEG;
    return K_ROUND_LARGE*Math.ceil(size/K_ROUND_LARGE);
  }
  function cmp(a,b){return a.size-b.size||a.seg.id-b.seg.id||a.ptr-b.ptr}
  function Alloc(cfg){
    this.cap=cfg.capacity;this.maxSplit=cfg.max_split==null||cfg.max_split==='inf'?Infinity:cfg.max_split;
    this.exp=!!cfg.expandable;this.div=cfg.divisions||0;this.nsr=cfg.max_nonsplit_rounding||LARGE_SEG;
    this.blocks=[];this.segs=[];this.nextBase=0;this.reserved=0;this.live={};
    this.nMalloc=0;this.nFree=0;this.nRetry=0;this.nOom=0;this.nMap=0;this.nUnmap=0;this.log=[];
  }
  const P=Alloc.prototype;
  P.mk=function(ptr,size,small,seg,mapped){const b={ptr:ptr,size:size,small:small,seg:seg,allocated:false,mapped:mapped!==false,prev:null,next:null,tag:null};this.blocks.push(b);return b};
  P.rm=function(b){const i=this.blocks.indexOf(b);if(i>=0)this.blocks.splice(i,1)};
  P.freeBlocks=function(small){return this.blocks.filter(b=>b.small===small&&b.mapped&&!b.allocated).sort(cmp)};
  P.unmappedBlocks=function(small){return this.blocks.filter(b=>b.small===small&&!b.mapped).sort(cmp)};
  P.newSeg=function(size,small,expandable,page){const s={id:this.segs.length,base:this.nextBase,size:size,small:small,expandable:expandable,page:page};this.nextBase+=size+64*MiB;this.segs.push(s);return s};
  P.merge=function(dst,src){
    if(!src||src.allocated||dst.mapped!==src.mapped)return 0;
    if(dst.prev===src){dst.ptr=src.ptr;dst.prev=src.prev;if(dst.prev)dst.prev.next=dst}
    else{dst.next=src.next;if(dst.next)dst.next.prev=dst}
    dst.size+=src.size;this.rm(src);return src.size;
  };
  P.getFreeBlock=function(small,size){
    const c=this.freeBlocks(small).filter(b=>b.size>=size);if(!c.length)return null;
    let i=0;
    if(c[0].seg.expandable){
      if(this.exp){const es=x=>x.size+(x.next&&!x.next.mapped?x.next.size:0);
        while(c[i].seg.expandable&&i+1<c.length&&es(c[i+1])<es(c[i]))i++;}
      else{while(i<c.length&&c[i].seg.expandable)i++;if(i===c.length)return null}
    }
    const b=c[i];
    if(size<this.maxSplit&&b.size>=this.maxSplit)return null;
    if(size>=this.maxSplit&&b.size>=size+this.nsr)return null;
    return b;
  };
  P.allocBlock=function(small,size,asz){
    if(this.exp)return this.tryExp(small,size);
    if(this.reserved+asz>this.cap)return null;
    const s=this.newSeg(asz,small,false,asz),b=this.mk(s.base,asz,small,s);
    this.reserved+=asz;this.nMalloc++;this.log.push(['cudaMalloc',asz]);return b;
  };
  P.findExp=function(small,size){
    const ok=x=>x&&!x.allocated;
    for(let c of this.unmappedBlocks(small)){
      if(ok(c.prev))c=c.prev;
      let got=0,x=c;while(got<size&&ok(x)){got+=x.size;x=x.next}
      if(got>=size)return c;
    }
    const page=small?K_SMALL_BUFFER:LARGE_SEG,span=Math.ceil(this.cap/page)*page,s=this.newSeg(span,small,true,page);
    return this.mk(s.base,span,small,s,false);
  };
  P.mapBlock=function(b,size){
    const page=b.seg.page;let want=Math.min(Math.ceil(size/page)*page,b.size);
    if(this.reserved+want>this.cap)return false;
    if(want<b.size){const r=this.mk(b.ptr+want,b.size-want,b.small,b.seg,false);r.prev=b;r.next=b.next;if(b.next)b.next.prev=r;b.next=r;b.size=want}
    b.mapped=true;this.reserved+=want;this.nMap++;this.log.push(['map',want]);
    this.merge(b,b.prev);this.merge(b,b.next);return true;
  };
  P.tryExp=function(small,size){
    let c=this.findExp(small,size);
    if(!c.mapped&&!this.mapBlock(c,Math.min(c.size,size)))return null;
    while(c.size<size){const nb=c.next;if(!this.mapBlock(nb,Math.min(size-c.size,nb.size)))return null;c=nb}
    return c;
  };
  P.releaseBlock=function(b){this.rm(b);this.reserved-=b.size;this.nFree++;this.log.push(['cudaFree',b.size])};
  P.unmapFree=function(b){
    const base=b.seg.base,page=b.seg.page,lo=base+Math.ceil((b.ptr-base)/page)*page,hi=base+Math.floor((b.ptr+b.size-base)/page)*page;
    if(hi<=lo)return 0;
    const pieces=[];if(lo>b.ptr)pieces.push([b.ptr,lo-b.ptr,true]);pieces.push([lo,hi-lo,false]);if(b.ptr+b.size>hi)pieces.push([hi,b.ptr+b.size-hi,true]);
    const prev=b.prev,nxt=b.next;this.rm(b);
    const made=pieces.map(p=>this.mk(p[0],p[1],b.small,b.seg,p[2]));
    made.forEach((nb,i)=>{nb.prev=i>0?made[i-1]:prev;nb.next=i+1<made.length?made[i+1]:nxt});
    if(prev)prev.next=made[0];if(nxt)nxt.prev=made[made.length-1];
    this.reserved-=hi-lo;this.nUnmap++;this.log.push(['unmap',hi-lo]);
    const um=made.find(x=>!x.mapped);this.merge(um,um.prev);this.merge(um,um.next);return hi-lo;
  };
  P.releaseAvailable=function(small,size){
    if(this.maxSplit===Infinity)return false;
    const key=Math.max(size,this.maxSplit),fb=this.freeBlocks(small).filter(b=>!b.seg.expandable),big=fb.filter(b=>b.size>=key);
    if(big.length){this.releaseBlock(big[0]);return true}
    let total=0;
    for(let i=fb.length-1;i>=0;i--){const b=fb[i];if(total>=key||b.size<this.maxSplit)break;if(!(b.prev||b.next)){total+=b.size;this.releaseBlock(b)}}
    return total>=key;
  };
  P.releaseCached=function(){
    for(const small of [false,true]){for(const b of this.freeBlocks(small)){if(this.blocks.indexOf(b)<0)continue;
      if(b.seg.expandable)this.unmapFree(b);else if(!(b.prev||b.next))this.releaseBlock(b)}}
    return true;
  };
  P.malloc=function(tag,orig){
    const size=roundSize(orig,this.div),small=size<=K_SMALL_SIZE,asz=allocationSize(size);
    let b=this.getFreeBlock(small,size);
    if(!b){b=this.allocBlock(small,size,asz);
      if(!b){b=(this.releaseAvailable(small,size)&&this.allocBlock(small,size,asz))||null;
        if(!b){this.nRetry++;this.releaseCached();b=this.allocBlock(small,size,asz)}}}
    if(!b){this.nOom++;this.log.push(['OOM',size]);this.lastOom={size:size,orig:orig};return false}
    const exp=b.seg.expandable,rem=b.size-size;
    const split=(small||exp)?rem>=K_MIN_BLOCK:(size<this.maxSplit&&rem>K_SMALL_SIZE);
    if(split){const nb=this.mk(b.ptr,size,small,b.seg);nb.prev=b.prev;nb.next=b;if(b.prev)b.prev.next=nb;b.prev=nb;b.ptr+=size;b.size-=size;b=nb}
    b.allocated=true;b.tag=tag;this.live[tag]=b;return true;
  };
  P.free=function(tag){const b=this.live[tag];delete this.live[tag];b.allocated=false;b.tag=null;this.merge(b,b.prev);this.merge(b,b.next)};
  P.stats=function(){
    let alloc=0,lf=0;const segs={};
    this.blocks.forEach(b=>{if(b.allocated)alloc+=b.size;if(b.mapped&&!b.allocated&&b.size>lf)lf=b.size;if(b.mapped)segs[b.seg.id]=1});
    return {allocated:alloc,reserved:this.reserved,largest_free:lf,cached:this.reserved-alloc,segments:Object.keys(segs).length,
      cudaMalloc:this.nMalloc,cudaFree:this.nFree,maps:this.nMap,unmaps:this.nUnmap,retries:this.nRetry,ooms:this.nOom};
  };
  P.layout=function(){return this.blocks.slice().sort((a,b)=>a.seg.id-b.seg.id||a.ptr-b.ptr).map(b=>[b.seg.id,b.ptr-b.seg.base,b.size,b.allocated?'A':(b.mapped?'F':'U'),b.tag])};
  function run(ops,cfg){
    const a=new Alloc(cfg),steps=[];
    for(const op of ops){let ok=true,logN=a.log.length;
      if(op[0]==='+')ok=a.malloc(op[1],op[2]);else if(a.live[op[1]])a.free(op[1]);
      steps.push({ok:ok,stats:a.stats(),layout:a.layout(),events:a.log.slice(logN),segs:a.segs.map(s=>({id:s.id,size:s.size,small:s.small,exp:s.expandable,page:s.page}))});
      if(!ok)break;}
    return steps;
  }
  root.CACHESIM={run:run,roundSize:roundSize,allocationSize:allocationSize,MiB:MiB};
})(typeof window!=='undefined'?window:globalThis);
