// ---- OS simulators: the algorithms (no drawing). Mirrors src/sim/ref_*.py line for line; src/sim/check_js.mjs
// runs this file in Node on every case of src/sim/ref_out.json and requires identical results. ----
(function(root){
const SC={};
// ---------- seeded generator (ref_common.py) ----------
SC.mulberry32=function(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
SC.randJobs=function(seed,n,maxRun,maxArrive,io){n=n||4;maxRun=maxRun||40;maxArrive=maxArrive==null?20:maxArrive;const r=SC.mulberry32(seed),jobs=[];
  for(let i=0;i<n;i++){const arrive=i===0?0:Math.floor(r()*(maxArrive+1));const run=2+Math.floor(r()*(maxRun-1));const iof=(io&&r()<0.5)?(2+Math.floor(r()*7)):0;jobs.push({id:i,arrive,run,io:iof})}return jobs};
SC.randRefs=function(seed,n,maxpage){const r=SC.mulberry32(seed),o=[];for(let i=0;i<n;i++)o.push(Math.floor(r()*(maxpage+1)));return o};
// ---------- scheduling (ref_sched.py) ----------
SC.NICE_WEIGHT=[88761,71755,56483,46273,36291,29154,23254,18705,14949,11916,9548,7620,6100,4904,3906,3121,2501,1991,1586,1277,
  1024,820,655,526,423,335,272,215,172,137,110,87,70,56,45,36,29,23,18,15];
SC.weight=nice=>SC.NICE_WEIGHT[nice+20];
function period(nr,lat,mg){return nr<=Math.floor(lat/mg)?lat:nr*mg}
SC.period=period;
function argmin(arr,key){let bi=0,bk=null;for(let x=0;x<arr.length;x++){const k=key(x);if(bk===null||k<bk){bk=k;bi=x}}return bi}
function cfsPreempt(S,W,queue,cur,used,lat,mg){if(!queue.length)return false;const nr=queue.length+1;let sumw=W[cur];for(const i of queue)sumw+=W[i];
  const ideal=period(nr,lat,mg)*W[cur]/sumw;if(used>=ideal-1e-9)return true;if(used<mg)return false;
  let left=Infinity;for(const i of queue)left=Math.min(left,S[i].vr);return S[cur].vr-left>ideal}
// o: {q, io_time, latency, min_gran}; returns {timeline, jobs:[{id,turnaround,response,wait}], avg, vr (CFS: per tick vruntimes)}
SC.schedule=function(jobs,policy,o){o=o||{};const q=o.q||4,ioT=o.io_time==null?5:o.io_time,lat=o.latency||48,mg=o.min_gran||6;
  const n=jobs.length,S=jobs.map(j=>({rem:j.run,burst:0,first:-1,end:-1,io_until:-1,vr:0,blocked:0})),W=jobs.map(j=>SC.weight(j.nice||0));
  let queue=[],cur=null,used=0,pending=null,t=0,rqMin=0,done=0;const timeline=[],vrs=[],states=[];
  const limit=jobs.reduce((s,j)=>s+j.run,0)*(1+ioT)+Math.max(...jobs.map(j=>j.arrive))+10;
  while(done<n&&t<limit){
    for(let i=0;i<n;i++)if(jobs[i].arrive===t){
      if(policy==='CFS'){const nr=queue.length+(cur!==null?1:0)+1;let sumw=W[i];for(const k of queue)sumw+=W[k];if(cur!==null)sumw+=W[cur];
        S[i].vr=Math.max(S[i].vr,rqMin+period(nr,lat,mg)*W[i]/sumw*1024/W[i])}
      queue.push(i)}
    for(let i=0;i<n;i++)if(S[i].io_until===t){S[i].io_until=-1;if(policy==='CFS')S[i].vr=Math.max(S[i].vr,rqMin-lat/2);queue.push(i)}
    if(pending!==null){queue.push(pending);pending=null}
    if(policy==='STCF'&&cur!==null&&queue.length){const b=queue[argmin(queue,x=>S[queue[x]].rem*1e6+x)];if(S[b].rem<S[cur].rem){queue.push(cur);cur=null}}
    if(cur===null&&queue.length){let k=0;
      if(policy==='SJF'||policy==='STCF')k=argmin(queue,x=>S[queue[x]].rem*1e6+x);
      else if(policy==='CFS'){let bk=0,bv=Infinity;for(let x=0;x<queue.length;x++)if(S[queue[x]].vr<bv){bv=S[queue[x]].vr;bk=x}k=bk}
      cur=queue.splice(k,1)[0];used=0}
    states.push(jobs.map((j,i)=>i===cur?'R':S[i].end>=0?'D':j.arrive>t?'-':S[i].io_until>t?'B':'W'));
    if(cur===null){timeline.push(-1);for(let i=0;i<n;i++)if(S[i].io_until>t)S[i].blocked++;if(policy==='CFS')vrs.push(S.map(s=>s.vr));t++;continue}
    const s=S[cur];if(s.first<0)s.first=t;timeline.push(cur);s.rem--;s.burst++;used++;s.vr+=1024/W[cur];
    for(let i=0;i<n;i++)if(S[i].io_until>t)S[i].blocked++;
    t++;
    if(policy==='CFS'){let m=s.vr;for(const i of queue)m=Math.min(m,S[i].vr);rqMin=Math.max(rqMin,m);vrs.push(S.map(x=>x.vr))}
    const io=jobs[cur].io||0;
    if(s.rem===0){s.end=t;done++;cur=null}
    else if(io&&s.burst===io){s.burst=0;s.io_until=t+ioT;cur=null}
    else if(policy==='RR'&&used>=q){pending=cur;cur=null}
    else if(policy==='CFS'&&cfsPreempt(S,W,queue,cur,used,lat,mg)){pending=cur;cur=null}
  }
  const r=finish(jobs,S,timeline);r.states=states;if(policy==='CFS')r.vr=vrs;return r};
function finish(jobs,S,timeline){const rows=jobs.map((j,i)=>{const ta=S[i].end-j.arrive;return{id:j.id,turnaround:ta,response:S[i].first-j.arrive,wait:ta-j.run-S[i].blocked}});
  const avg={};['turnaround','response','wait'].forEach(k=>{avg[k]=Math.round(rows.reduce((s,r)=>s+r[k],0)/rows.length*1e4)/1e4});return{timeline,jobs:rows,avg}}
// port of OSTEP mlfq.py; quanta and allot listed high priority first
SC.mlfq=function(jobs,quanta,allot,boost,ioT){const nq=quanta.length,quantum={},allotment={};for(let i=0;i<nq;i++){quantum[nq-1-i]=quanta[i];allotment[nq-1-i]=allot[i]}
  const hi=nq-1,queue={};for(let k=0;k<nq;k++)queue[k]=[];const J=[],ioDone={};
  jobs.forEach(j=>{J.push({cur:hi,ticks:quantum[hi],allot:allotment[hi],start:j.arrive,run:j.run,left:j.run,io:j.io||0,doingIO:true,first:-1,end:-1});(ioDone[j.arrive]=ioDone[j.arrive]||[]).push(J.length-1)});
  let t=0,fin=0;const timeline=[],levels=[],blocked=J.map(()=>0),states=[],lvl=[];
  while(fin<J.length){
    if(boost>0&&t!==0&&t%boost===0){for(let k=0;k<nq-1;k++){for(const j of queue[k])if(!J[j].doingIO)queue[hi].push(j);queue[k]=[]}
      for(const j of J)if(j.left>0){j.cur=hi;j.ticks=quantum[hi];j.allot=allotment[hi]}}
    if(ioDone[t])for(const j of ioDone[t]){J[j].doingIO=false;queue[J[j].cur].push(j)}
    let cq=-1;for(let k=hi;k>=0;k--)if(queue[k].length){cq=k;break}
    const c0=cq===-1?-1:queue[cq][0];states.push(J.map((j,i)=>i===c0?'R':j.end>=0?'D':j.start>t?'-':j.doingIO?'B':'W'));lvl.push(J.map(j=>j.cur));
    if(cq===-1){timeline.push(-1);levels.push(-1);J.forEach((j,i)=>{if(j.doingIO&&j.start<=t&&j.left>0)blocked[i]++});t++;continue}
    const c=queue[cq][0],j=J[c];j.left--;j.ticks--;if(j.first===-1)j.first=t;timeline.push(c);levels.push(cq);
    J.forEach((x,i)=>{if(i!==c&&x.doingIO&&x.start<=t&&x.left>0)blocked[i]++});
    t++;
    if(j.left===0){j.end=t;fin++;queue[cq].shift();continue}
    let issued=false;
    if(j.io>0&&(j.run-j.left)%j.io===0){issued=true;queue[cq].shift();j.doingIO=true;(ioDone[t+ioT]=ioDone[t+ioT]||[]).push(c)}
    if(j.ticks===0){if(!issued)queue[cq].shift();j.allot--;
      if(j.allot===0){if(cq>0){j.cur=cq-1;j.ticks=quantum[cq-1];j.allot=allotment[cq-1];if(!issued)queue[cq-1].push(c)}
        else{j.ticks=quantum[cq];j.allot=allotment[cq];if(!issued)queue[cq].push(c)}}
      else{j.ticks=quantum[cq];if(!issued)queue[cq].push(c)}}
  }
  const r=finish(jobs,J.map((j,i)=>({first:j.first,end:j.end,blocked:blocked[i]})),timeline);r.levels=levels;r.states=states;r.jobLevels=lvl;r.nq=nq;return r};
// ---------- virtual memory (ref_vm.py) ----------
SC.translateLinear=function(va,page,pt){const vpn=Math.floor(va/page),off=va%page;if(vpn>=pt.length||!((pt[vpn]>>>31)&1))return{vpn,off,valid:false};
  const pfn=pt[vpn]&0x7FFFFFFF;return{vpn,off,valid:true,pfn,pa:pfn*page+off}};
SC.walkTwoLevel=function(va,pdbr,mem){const pdi=(va>>10)&31,pti=(va>>5)&31,off=va&31,pde=mem[pdbr][pdi];
  const o={pdi,pti,off,pde,pde_valid:pde>>7,pt_pfn:pde&127};if(!(pde>>7)){o.fault='pde';return o}
  const pte=mem[pde&127][pti];o.pte=pte;o.pte_valid=pte>>7;o.pfn=pte&127;if(!(pte>>7)){o.fault='pte';return o}
  const pa=((pte&127)<<5)|off;o.pa=pa;o.value=mem[pa>>5][pa&31];return o};
SC.arrayTrace=function(rows,cols,order,base,elem){base=base||0;elem=elem||4;const o=[];
  if(order==='row'){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)o.push(base+(r*cols+c)*elem)}
  else{for(let c=0;c<cols;c++)for(let r=0;r<rows;r++)o.push(base+(r*cols+c)*elem)}return o};
SC.tlbTrace=function(addrs,page,entries){const tlb=[],seq=[],states=[];
  for(const a of addrs){const vpn=Math.floor(a/page),k=tlb.indexOf(vpn);
    if(k>=0){tlb.splice(k,1);tlb.push(vpn);seq.push(1)}else{if(tlb.length===entries)tlb.shift();tlb.push(vpn);seq.push(0)}states.push(tlb.slice())}
  const hits=seq.reduce((s,x)=>s+x,0);return{hits,misses:seq.length-hits,seq,states}};
SC.replace=function(refs,frames,policy){let mem=[],use={},hand=0;const seq=[];
  for(let i=0;i<refs.length;i++){const p=refs[i];
    if(mem.indexOf(p)>=0){if(policy==='LRU'){mem.splice(mem.indexOf(p),1);mem.push(p)}use[p]=1;seq.push({hit:true,mem:mem.slice(),evict:null,hand});continue}
    let victim=null;
    if(mem.length===frames){
      if(policy==='FIFO'||policy==='LRU')victim=mem.shift();
      else if(policy==='OPT'){let best=-1,bi=-1;for(let k=0;k<mem.length;k++){let nxt=refs.length;for(let f=i+1;f<refs.length;f++)if(refs[f]===mem[k]){nxt=f;break}if(nxt>=best){best=nxt;bi=k}}victim=mem.splice(bi,1)[0]}
      else if(policy==='CLOCK'){while(use[mem[hand]]){use[mem[hand]]=0;hand=(hand+1)%frames}victim=mem[hand];delete use[victim];mem[hand]=p;use[p]=1;hand=(hand+1)%frames;
        seq.push({hit:false,mem:mem.slice(),evict:victim,hand});continue}}
    if(policy==='CLOCK'){mem.push(p);use[p]=1;hand=mem.length%frames;seq.push({hit:false,mem:mem.slice(),evict:victim,hand});continue}
    mem.push(p);seq.push({hit:false,mem:mem.slice(),evict:victim,hand})}
  const hits=seq.filter(s=>s.hit).length;return{hits,misses:refs.length-hits,seq}};
// ---------- copy-on-write (ref_cow.py) ----------
SC.cowRegions=function(n,kind,page,obj){page=page||4096;obj=obj||32;
  return kind==='list'?{header:1,pointers:Math.ceil(n*8/page),objects:Math.ceil(n*obj/page)}:{header:1,data:Math.ceil(n*8/page)}};
SC.cowCopied=function(n,kind,action,page,obj){const r=SC.cowRegions(n,kind,page,obj);return kind==='list'&&action==='iterate'?r.header+r.objects:r.header};
// ---------- concurrency (ref_conc.py) ----------
SC.PROGS={
 nolock:'.main\n.top\nmov 2000, %ax\nadd $1, %ax\nmov %ax, 2000\nsub  $1, %bx\ntest $0, %bx\njgt .top\nhalt',
 tas:'.var mutex\n.var count\n.main\n.top\n.acquire\nmov  $1, %ax\nxchg %ax, mutex\ntest $0, %ax\njne  .acquire\nmov  count, %ax\nadd  $1, %ax\nmov  %ax, count\nmov  $0, mutex\nsub  $1, %bx\ntest $0, %bx\njgt .top\nhalt',
 atomic:'.var count\n.main\n.top\nfetchadd $1, count\nsub  $1, %bx\ntest $0, %bx\njgt .top\nhalt'};
SC.parseX86=function(src){const prog=[],labels={},varaddr={};let nxt=1000;
  for(let line of src.trim().split('\n')){line=line.split('#')[0].trim();if(!line)continue;
    if(line.startsWith('.var')){varaddr[line.split(/\s+/)[1]]=nxt;nxt+=4;continue}
    if(line.startsWith('.')){labels[line]=prog.length;continue}
    const m=line.match(/^(\S+)\s*(.*)$/);const args=m[2]?m[2].split(',').map(a=>a.trim()):[];prog.push([m[1],args])}
  return{prog,labels,varaddr}};
// sched (page only, not in the Python reference): an explicit list of which thread runs each instruction
SC.runX86=function(src,loops,interval,nthreads,seed,maxSteps,sched){nthreads=nthreads||2;maxSteps=maxSteps||100000;
  const P=SC.parseX86(src),prog=P.prog,labels=P.labels,va=P.varaddr,mem={};
  const addr=a=>(a in va)?va[a]:parseInt(a,10);
  const val=(a,regs)=>a[0]==='$'?parseInt(a.slice(1),10):a[0]==='%'?regs[a.slice(1)]:(mem[addr(a)]||0);
  const T=[];for(let i=0;i<nthreads;i++)T.push({pc:0,regs:{ax:0,bx:loops},gt:false,ne:false,done:false});
  const r=seed!=null?SC.mulberry32(seed):null;const setint=()=>r?Math.floor(r()*interval)+1:interval;
  let cur=0,intr=setint(),steps=0;const trace=[],mems=[];const cAddr=('count' in va)?va.count:2000;
  while(steps<maxSteps){if(sched){if(steps>=sched.length)break;cur=sched[steps];if(T[cur].done)cur=nextThread(T,cur)}
    const th=T[cur],ins=prog[th.pc],op=ins[0],a=ins[1],pc0=th.pc;th.pc++;const regs=th.regs;
    if(op==='mov'){const v=val(a[0],regs);if(a[1][0]==='%')regs[a[1].slice(1)]=v;else mem[addr(a[1])]=v}
    else if(op==='add')regs[a[1].slice(1)]+=val(a[0],regs);
    else if(op==='sub')regs[a[1].slice(1)]-=val(a[0],regs);
    else if(op==='test'){const d=val(a[1],regs),s=val(a[0],regs);th.gt=d>s;th.ne=d!==s}
    else if(op==='jgt'){if(th.gt)th.pc=labels[a[0]]}
    else if(op==='jne'){if(th.ne)th.pc=labels[a[0]]}
    else if(op==='xchg'){const m=addr(a[1]),old=mem[m]||0;mem[m]=regs[a[0].slice(1)];regs[a[0].slice(1)]=old}
    else if(op==='fetchadd'){const m=addr(a[1]);mem[m]=(mem[m]||0)+val(a[0],regs)}
    else if(op==='halt')th.done=true;
    else throw new Error('op '+op);
    steps++;trace.push([cur,pc0]);mems.push({count:mem[cAddr]||0,mutex:('mutex' in va)?(mem[va.mutex]||0):null,ax:regs.ax,bx:regs.bx});
    if(T.every(x=>x.done))break;
    if(sched)continue;
    if(th.done)cur=nextThread(T,cur);
    intr--;if(intr===0){intr=setint();cur=nextThread(T,cur)}}
  return{count:mem[cAddr]||0,expected:loops*nthreads,steps,trace,mems,prog,done:T.map(x=>x.done)}};
function nextThread(T,cur){const n=T.length;const order=[];for(let i=cur+1;i<n;i++)order.push(i);for(let i=0;i<=cur;i++)order.push(i);for(const i of order)if(!T[i].done)return i;return cur}
SC.lockProgs=function(ordered){return[['L:A','L:B','W','U:B','U:A'],ordered?['L:A','L:B','W','U:B','U:A']:['L:B','L:A','W','U:A','U:B']]};
SC.canStep=function(progs,t,pcs,held){if(pcs[t]>=5)return false;const s=progs[t][pcs[t]];return!(s[0]==='L'&&held[s.slice(2)]!=null)};
SC.deadlockCount=function(ordered){const progs=SC.lockProgs(ordered),res={complete:0,deadlock:0};
  (function dfs(pcs,held){if(pcs[0]===5&&pcs[1]===5){res.complete++;return}let moved=false;
    for(const t of[0,1])if(SC.canStep(progs,t,pcs,held)){moved=true;const s=progs[t][pcs[t]],h=Object.assign({},held);
      if(s[0]==='L')h[s.slice(2)]=t;else if(s[0]==='U')h[s.slice(2)]=null;const p=pcs.slice();p[t]++;dfs(p,h)}
    if(!moved)res.deadlock++})([0,0],{});return res};
// ---------- crash consistency (ref_crash.py) ----------
SC.MODES={none:[['I','B','D']],data:[['TxB','jI','jB','jD'],['TxE'],['I','B','D']],data_onebatch:[['TxB','jI','jB','jD','TxE'],['I','B','D']],
  ordered:[['D','TxB','jI','jB'],['TxE'],['I','B']],meta_data_late:[['TxB','jI','jB'],['TxE'],['I','B','D']]};
function combos(arr,k){const o=[];(function rec(st,acc){if(acc.length===k){o.push(acc.slice());return}for(let i=st;i<arr.length;i++){acc.push(arr[i]);rec(i+1,acc);acc.pop()}})(0,[]);return o}
SC.crashStates=function(mode){const g=SC.MODES[mode],o=[];g.forEach((blocks,gi)=>{for(let k=0;k<blocks.length;k++)for(const sub of combos(blocks,k)){if(gi>0&&k===0)continue;o.push([gi,sub])}});o.push([g.length,[]]);return o};
SC.diskAfter=function(mode,g,sub){const done=new Set(sub);SC.MODES[mode].slice(0,g).forEach(gr=>gr.forEach(b=>done.add(b)));
  const disk={I:done.has('I')?'v2':'v1',B:done.has('B')?'v2':'v1',D:done.has('D')?'Db':'garbage'};const jr={};['TxB','jI','jB','jD','TxE'].forEach(k=>jr[k]=done.has(k));return{disk,jr}};
SC.recover=function(mode,disk,jr){const d=Object.assign({},disk);let action='';
  if(mode==='none'){if(d.I==='v2'&&d.B==='v1'){d.B='v2';action='fsck: the inode points at block 5 but the bitmap says free; fsck trusts the inode and marks it used'}
    else if(d.I==='v1'&&d.B==='v2'){d.B='v1';action='fsck: block 5 is marked used but no inode points at it; fsck frees it (no leak)'}
    else action='fsck: inode and bitmap agree; nothing to fix (fsck cannot check what is inside a data block)'}
  else if(jr.TxE){d.I='v2';d.B='v2';const all=[].concat(...SC.MODES[mode]);
    if(all.indexOf('jD')>=0){d.D=jr.jD?'Db':'garbage';action="replay: TxE is on disk, so the transaction is committed; copy I, B and the journal's copy of block 5 into place"}
    else action='replay: TxE is on disk, so the transaction is committed; copy I and B into place (data is not in the journal)'}
  else action='no TxE on disk: the transaction never committed; recovery skips it';
  return{final:d,action}};
SC.classify=d=>(d.I==='v1'&&d.B==='v1')?'old':(d.I==='v2'&&d.B==='v2')?(d.D==='Db'?'new':'garbage'):'inconsistent';
SC.crashTable=function(mode){return SC.crashStates(mode).map(([g,sub])=>{const da=SC.diskAfter(mode,g,sub),rc=SC.recover(mode,da.disk,da.jr);
  return{group:g,persisted:sub,disk:da.disk,before:SC.classify(da.disk),after:SC.classify(rc.final),final:rc.final,action:rc.action}})};
root.SIMCORE=SC;if(typeof module!=='undefined'&&module.exports)module.exports=SC;
})(typeof window!=='undefined'?window:globalThis);
