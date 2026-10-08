// ---- Serving simulator (t-sim): the engine model, a line-for-line port of src/sim/sim.py ----
// Checked against the Python reference by src/sim/check/check_core.mjs (identical schedules and metrics);
// the continuous + paged mode was checked step by step against vLLM v0.31.0's own Scheduler (src/sim/check/vllm_harness.py).
(function(G){
  function Rng(seed){this.s=seed>>>0}
  Rng.prototype.next=function(){
    this.s=(this.s+0x6D2B79F5)>>>0;let t=this.s;
    t=Math.imul(t^(t>>>15),t|1)>>>0;
    t=(t^((t+(Math.imul(t^(t>>>7),t|61)>>>0))>>>0))>>>0;
    return ((t^(t>>>14))>>>0)/4294967296};
  Rng.prototype.int=function(lo,hi){return lo+Math.floor(this.next()*(hi-lo+1))};

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

  // roofline step time plus fixed and per-sequence overheads (see sim.py)
  function stepTime(hw,m,items){
    let T=0,att=0,kv=0;
    for(const it of items){const c0=it[0],n=it[1];T+=n;att+=n*c0+n*(n+1)/2;kv+=c0+n}
    const fl=2*(m.Pact-m.Plm)*T+2*m.Plm*items.length+4*m.L*m.nq*m.hd*att,by=m.wbytes+m.kvtok*kv;
    const tc=fl/(hw.peak*hw.ec),tm=by/(hw.bw*hw.em);
    return hw.ovh+hw.ovs*items.length+(tc>tm?tc:tm);
  }

  function BlockPool(n){this.n=n;this.free=[];for(let i=0;i<n;i++)this.free.push(i);
    this.key=new Array(n).fill(null);this.ref=new Array(n).fill(0);this.cache=new Map()}
  BlockPool.prototype.nfree=function(){return this.free.length};
  BlockPool.prototype.take=function(k){const out=this.free.splice(0,k);
    for(const b of out){if(this.key[b]!==null){const l=this.cache.get(this.key[b]);l.splice(l.indexOf(b),1);if(!l.length)this.cache.delete(this.key[b]);this.key[b]=null}this.ref[b]=1}
    return out};
  BlockPool.prototype.touch=function(bl){for(const b of bl){if(this.ref[b]===0)this.free.splice(this.free.indexOf(b),1);this.ref[b]++}};
  BlockPool.prototype.release=function(bl){const first=[],last=[];
    for(let i=bl.length-1;i>=0;i--){const b=bl[i];this.ref[b]--;if(this.ref[b]===0){if(this.key[b]===null)first.push(b);else last.push(b)}}
    this.free=first.concat(this.free,last)};
  function poolLookup(p,key){const l=p.cache.get(key);return l&&l.length?l[0]:-1}
  function poolInsert(p,key,b){if(p.key[b]!==null)return;p.key[b]=key;if(!p.cache.has(key))p.cache.set(key,[]);p.cache.get(key).push(b)}

  function Contig(cap){this.cap=cap;this.holes=[[0,cap]]}
  Contig.prototype.alloc=function(size){for(let i=0;i<this.holes.length;i++){const h=this.holes[i];
      if(h[1]>=size){const st=h[0];h[0]+=size;h[1]-=size;if(h[1]===0)this.holes.splice(i,1);return st}}return -1};
  Contig.prototype.release=function(st,size){this.holes.push([st,size]);this.holes.sort((a,b)=>a[0]-b[0]);
    const out=[];for(const h of this.holes){if(out.length&&out[out.length-1][0]+out[out.length-1][1]===h[0])out[out.length-1][1]+=h[1];else out.push([h[0],h[1]])}
    this.holes=out};
  Contig.prototype.largest=function(){let m=0;for(const h of this.holes)if(h[1]>m)m=h[1];return m};
  Contig.prototype.freesum=function(){let s=0;for(const h of this.holes)s+=h[1];return s};

  function bkey(q,b,bs){return (q.g>=0&&(b+1)*bs<=q.S)?('s'+q.g+':'+b):('c'+q.conv+':'+b)}
  const cdiv=(a,b)=>Math.ceil(a/b);

  function Engine(idx,c,hw,m,log){
    this.i=idx;this.c=c;this.hw=hw;this.m=m;this.t=0;this.waiting=[];this.running=[];this.inbox=[];this.log=log;
    this.paged=c.kv==='paged';this.pool=this.paged?new BlockPool(c.nblocks):null;this.ctg=this.paged?null:new Contig(c.nblocks*c.bs);
    this.batchOn=false;this.dstep=0;this.pmax=0;this.steps=0;this.busy=0;this.npre=0;
  }
  const E=Engine.prototype;
  E.hasWork=function(){return this.running.length>0||this.waiting.length>0};
  E.cacheFull=function(q,upto){const bs=this.c.bs;if(!this.c.pc)return;
    const nfull=Math.floor(Math.min(upto,q.ntok)/bs);
    while(q.ncached<nfull){const b=q.ncached;poolInsert(this.pool,bkey(q,b,bs),q.blocks[b]);q.ncached++}};
  E.allocRun=function(q,n){const bs=this.c.bs;let need=cdiv(q.ncomp+n,bs)-q.blocks.length;if(need<0)need=0;
    if(need>this.pool.nfree())return false;q.blocks=q.blocks.concat(this.pool.take(need));this.cacheFull(q,q.ncomp+n);return true};
  E.lookup=function(q){const bs=this.c.bs,hits=[];if(!this.c.pc)return hits;
    const mx=Math.floor((q.ntok-1)/bs);
    for(let b=0;b<mx;b++){const h=poolLookup(this.pool,bkey(q,b,bs));if(h<0)break;hits.push(h)}
    return hits};
  E.allocWait=function(q,hits,c0,n){const bs=this.c.bs,p=this.pool;let ev=0;
    for(const b of hits)if(p.ref[b]===0)ev++;
    let full=cdiv(q.ntok,bs)-hits.length;if(full<0)full=0;
    if(full+ev>p.nfree())return false;
    if(this.c.admit==='reserve'){let owed=0;
      for(const r of this.running){const k=cdiv(r.P+r.M,bs)-r.blocks.length;if(k>0)owed+=k}
      const k=cdiv(q.P+q.M,bs)-hits.length;if(k+ev+owed>p.nfree())return false}
    let need=cdiv(c0+n,bs)-hits.length;if(need<0)need=0;
    if(need+ev>p.nfree())return false;
    p.touch(hits);q.blocks=hits.slice().concat(p.take(need));q.ncached=hits.length;this.cacheFull(q,c0+n);return true};
  E.freeQ=function(q){if(this.paged){this.pool.release(q.blocks);q.blocks=[];q.ncached=0}
    else if(q.seg>=0){this.ctg.release(q.seg,q.P+q.M);q.seg=-1}};
  E.preempt=function(v){this.npre++;v.npre++;let extra=0;
    if(this.c.preempt==='swap'){v.swp=true;extra=v.ncomp*this.m.kvtok/this.c.swapbw}else v.ncomp=0;
    this.freeQ(v);this.waiting.unshift(v);return extra};
  E.schedCont=function(){const c=this.c;let budget=c.budget,extra=0,i=0;const rows=[],pre=[];
    while(i<this.running.length&&budget>0){const q=this.running[i];let n=q.ntok-q.ncomp;if(n>budget)n=budget;
      if(n===0){i++;continue}
      let ok=!this.paged?true:this.allocRun(q,n);
      while(!ok){const v=this.running.pop();extra+=this.preempt(v);pre.push(v.id);if(v===q)break;ok=this.allocRun(q,n)}
      if(!ok)break;
      rows.push([q,q.ncomp,n]);budget-=n;i++}
    if(!pre.length){
      while(budget>0&&this.waiting.length){
        if(this.running.length>=c.maxseq)break;
        const q=this.waiting[0];let hits,c0;
        if(q.kvin||q.swp){hits=[];c0=q.ncomp}else{hits=this.paged?this.lookup(q):[];c0=hits.length*c.bs}
        let n=q.ntok-c0;
        if(!c.chunk&&n>budget)break;
        if(n>budget)n=budget;
        if(this.paged){if(!this.allocWait(q,hits,c0,n))break}
        else{const st=this.ctg.alloc(q.P+q.M);if(st<0)break;q.seg=st}
        this.waiting.shift();this.running.push(q);
        if(q.swp)extra+=q.ncomp*this.m.kvtok/c.swapbw;
        q.swp=false;q.kvin=false;q.hit+=hits.length*c.bs;q.ncomp=c0;
        rows.push([q,c0,n]);budget-=n}
    }
    return [rows,pre,extra]};
  E.schedStatic=function(){const c=this.c,rows=[];
    if(!this.batchOn){
      while(this.waiting.length&&this.running.length<c.maxseq){const q=this.waiting[0];
        if(this.paged){const need=cdiv(q.P+q.M,c.bs);if(need>this.pool.nfree())break;q.blocks=this.pool.take(need)}
        else{const st=this.ctg.alloc(q.P+q.M);if(st<0)break;q.seg=st}
        this.waiting.shift();this.running.push(q)}
      if(!this.running.length)return rows;
      this.batchOn=true;this.dstep=0;this.pmax=0;for(const q of this.running)if(q.P>this.pmax)this.pmax=q.P;
      for(const q of this.running)rows.push([q,0,this.pmax]);
      return rows}
    const ctx=this.pmax+this.dstep;for(const q of this.running)rows.push([q,ctx,1]);return rows};
  E.step=function(out){const c=this.c,t0=this.t;let rows,pre,extra;
    if(c.mode==='static'){rows=this.schedStatic();pre=[];extra=0}else{const r=this.schedCont();rows=r[0];pre=r[1];extra=r[2]}
    if(!rows.length)return false;
    const dt=stepTime(this.hw,this.m,rows.map(r=>[r[1],r[2]]))+extra,t1=t0+dt;
    const lv=c.lv===undefined?2:c.lv;let rec=null;
    if(this.log){rec={e:this.i,t:t0,dt:dt,pre:pre,np:0,nd:0,ns:rows.length};if(lv>=2)rec.rows=[]}
    const done=[];
    for(const r of rows){const q=r[0],c0=r[1],n=r[2];let kind='d',emit;
      if(c.mode==='static'){q.ncomp=c0+n;if(this.dstep===0){kind='P';emit=true}else{emit=q.nout<q.O;if(!emit)kind='x'}}
      else{q.ncomp=c0+n;emit=q.ncomp===q.ntok;if(n>1||c0<q.P)kind=emit?'P':'p'}
      if(emit){q.nout++;q.ntok++;q.times.push(t1);if(q.first<0)q.first=t1;
        if(q.nout>=q.O||(c.role==='prefill'&&q.nout===1))done.push(q)}
      if(rec){if(kind==='d')rec.nd++;else if(kind!=='x')rec.np+=n;if(lv>=2)rec.rows.push([q.id,c0,n,kind])}
    }
    if(c.mode==='static'){this.dstep++;
      if(this.running.every(q=>q.nout>=q.O)){for(const q of this.running){this.freeQ(q);q.done=t1;out(q,t1)}this.running=[];this.batchOn=false}}
    else for(const q of done){this.running.splice(this.running.indexOf(q),1);this.freeQ(q);if(q.nout>=q.O)q.done=t1;out(q,t1)}
    if(rec){rec.kvu=this.kvUsed();if(lv>=2)rec.kv=this.kvState();this.log.push(rec)}
    this.t=t1;this.steps++;this.busy+=dt;return true};
  E.kvUsed=function(){return this.paged?this.pool.n-this.pool.nfree():this.ctg.cap-this.ctg.freesum()};
  E.kvState=function(){
    if(this.paged){const p=this.pool,own=new Array(p.n).fill(-1),fill=new Array(p.n).fill(0),bs=this.c.bs;
      for(const q of this.running.concat(this.waiting))q.blocks.forEach((b,k)=>{own[b]=q.id;const f=q.ncomp-k*bs;fill[b]=f>bs?bs:(f>0?f:0)});
      const cached=[],shared=[];for(let b=0;b<p.n;b++){cached.push(p.key[b]!==null&&p.ref[b]===0?1:0);shared.push(p.ref[b]>1?1:0)}
      return {own:own,fill:fill,cached:cached,shared:shared}}
    const segs=[];for(const q of this.running)if(q.seg>=0)segs.push([q.seg,q.P+q.M,q.id,q.ntok]);
    segs.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);return {segs:segs}};

  function run(cfg,keepLog){
    let reqs;if(cfg.reqs){reqs=cfg.reqs.map(q=>Object.assign({},q));reqs.sort((a,b)=>a.arr-b.arr||a.id-b.id)}else reqs=makeWorkload(cfg.w);
    for(const q of reqs)Object.assign(q,{ntok:q.P,ncomp:0,nout:0,blocks:[],ncached:0,seg:-1,first:-1,done:-1,times:[],npre:0,hit:0,kvin:false,swp:false});
    const log=keepLog?[]:null,engs=[];let front,back;
    if(cfg.disagg){
      for(let k=0;k<cfg.np;k++){const c=Object.assign({},cfg.c,{role:'prefill'});engs.push(new Engine(engs.length,c,cfg.hw,cfg.m,log))}
      for(let k=0;k<cfg.nd;k++){const c=Object.assign({},cfg.c,{role:'decode',pc:false});engs.push(new Engine(engs.length,c,cfg.hw,cfg.m,log))}
      front=engs.filter(e=>e.c.role==='prefill');back=engs.filter(e=>e.c.role==='decode');
    }else{
      for(let k=0;k<(cfg.reps||1);k++){const c=Object.assign({},cfg.c,{role:'both'});engs.push(new Engine(engs.length,c,cfg.hw,cfg.m,log))}
      front=engs;back=[];
    }
    let seq=0,fr=0,rr=0;const closed=cfg.w.closed||0,api=cfg.api||0,pending=[];
    reqs.forEach((q,j)=>{if(closed&&j>=closed){pending.push(q);return}
      const e=front[fr%front.length];fr++;e.inbox.push([q.arr+api,seq,q]);seq++});
    function out(q,t){
      if(q.done>=0){if(pending.length){const nq=pending.shift();nq.arr=t;const e=front[fr%front.length];fr++;e.inbox.push([t+api,seq,nq]);seq++}return}
      const e=back[rr%back.length];rr++;const xfer=q.ncomp*cfg.m.kvtok/cfg.xbw;q.kvin=true;q.xfer=xfer;e.inbox.push([t+xfer,seq,q]);seq++}
    let guard=0;
    while(true){let best=null,bt=Infinity;
      for(const e of engs){let nt;
        if(e.hasWork())nt=e.t;else if(e.inbox.length){let mn=Infinity;for(const x of e.inbox)if(x[0]<mn)mn=x[0];nt=Math.max(e.t,mn)}else nt=Infinity;
        if(nt<bt){bt=nt;best=e}}
      if(!best)break;
      const e=best;e.t=bt;e.inbox.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
      while(e.inbox.length&&e.inbox[0][0]<=e.t)e.waiting.push(e.inbox.shift()[2]);
      if(!e.step(out)){const q=e.waiting.shift();q.rej=true}
      if(++guard>2000000)throw new Error('no progress');
    }
    return {reqs:reqs,engs:engs,log:log};
  }

  function pct(a,p){if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y),x=(s.length-1)*p/100,lo=Math.floor(x),hi=Math.min(lo+1,s.length-1);return s[lo]+(s[hi]-s[lo])*(x-lo)}
  function metrics(reqs,engs,slo,skip){skip=skip||0;
    const ttft=[],tpot=[],e2e=[],itl=[];let good=0,nout=0,ok=0,t0=Infinity;
    for(const q of reqs)if(q.id>=skip&&q.arr<t0)t0=q.arr;let t1=t0;
    for(const q of reqs){if(q.rej||q.done<0||q.id<skip)continue;ok++;
      const a=q.first-q.arr;ttft.push(a);const tp=q.O>1?(q.times[q.times.length-1]-q.first)/(q.O-1):0;tpot.push(tp);
      e2e.push(q.done-q.arr);for(let k=1;k<q.times.length;k++)itl.push(q.times[k]-q.times[k-1]);
      nout+=q.nout;if(q.done>t1)t1=q.done;if(a<=slo[0]&&tp<=slo[1])good++}
    const span=t1>t0?t1-t0:1e-9;let rej=0,hit=0,ptok=0,npre=0,steps=0;
    for(const q of reqs){if(q.rej)rej++;hit+=q.hit;ptok+=q.P}for(const e of engs){npre+=e.npre;steps+=e.steps}
    const r={n:ok,rej:rej,span:span,tps:nout/span,rps:ok/span,goodput:good/span,good:good,npre:npre,steps:steps,hit:hit,ptok:ptok};
    for(const [nm,a] of [['ttft',ttft],['tpot',tpot],['e2e',e2e],['itl',itl]]){let s=0,mx=0;for(const v of a){s+=v;if(v>mx)mx=v}
      r[nm]=[pct(a,50),pct(a,90),pct(a,99),a.length?s/a.length:0,a.length?mx:0]}
    return r;
  }
  G.ISIM={Rng:Rng,makeWorkload:makeWorkload,stepTime:stepTime,run:run,metrics:metrics,pct:pct};
})(typeof window!=='undefined'?window:globalThis);
