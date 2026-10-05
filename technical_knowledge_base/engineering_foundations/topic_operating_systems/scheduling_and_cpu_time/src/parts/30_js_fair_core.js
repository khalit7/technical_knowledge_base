// ---- One CPU's fair run queue under Linux 5.10 CFS and Linux 6.12 EEVDF: a line-for-line port of src/simref.py ----
// Used by the Reading animation (section 5) and the Fair-share stepper tab. src/check_sim.mjs runs this file and
// simref.py on the same scenarios and requires identical schedules.
window.FAIR=(function(){
  const WEIGHT={};[88761,71755,56483,46273,36291,29154,23254,18705,14949,11916,9548,7620,6100,4904,3906,3121,2501,1991,1586,1277,
    1024,820,655,526,423,335,272,215,172,137,110,87,70,56,45,36,29,23,18,15].forEach((w,k)=>{WEIGHT[k-20]=w});
  const TICK=1000,EPS=1e-9,r3=x=>Math.round(x*1000)/1000;
  function simulate(policy,tasks,horizon,factor){
    factor=factor||3;
    const lat=6000*factor,gmin=750*factor,wgran=1000*factor,baseSlice=750*factor;
    const T=tasks.map((t,i)=>({i,name:t.name,w:WEIGHT[t.nice||0],hog:t.run==null,run:t.run,sleep:t.sleep,start:t.start||0,
      slice:t.slice?Math.min(100000,Math.max(100,t.slice)):baseSlice,v:0,d:0,vlag:0,mark:null,delayed:false,on:false,left:0,
      sum:0,prev:0,wakeT:null,waits:[],wakeAt:null}));
    const S={t:0,curr:null,minvr:0,next:null,segs:[],snaps:[],switches:0,exec:0,since:0};
    const rq=()=>T.filter(x=>x.on),tree=()=>T.filter(x=>x.on&&x!==S.curr);
    const byV=(a,b)=>a.v-b.v||a.i-b.i,byD=(a,b)=>a.d-b.d||a.i-b.i;
    function avgV(){const q=rq();if(!q.length)return S.minvr;let a=0,w=0;q.forEach(x=>{a+=x.v*x.w;w+=x.w});return a/w}
    function snap(kind,task,note){S.snaps.push({t:r3(S.t),kind,task,note:note||'',curr:S.curr?S.curr.i:-1,V:policy==='eevdf'?r3(avgV()):null,
      minvr:r3(S.minvr),tasks:T.map(x=>({v:r3(x.v),d:r3(x.d),on:x.on,dl:x.delayed,sum:r3(x.sum)}))})}
    function updMin(){const c=S.curr&&S.curr.on?S.curr:null,cand=tree().map(x=>x.v);let v=S.minvr;
      if(c)v=c.v;if(cand.length)v=c?Math.min(v,Math.min(...cand)):Math.min(...cand);S.minvr=Math.max(S.minvr,v)}
    function eligible(e){let s=0;rq().forEach(x=>{s+=(x.v-e.v)*x.w});return s>=-EPS}
    const prot=c=>c.mark!==null&&c.mark===c.d;
    const didShort=c=>!prot(c)&&!eligible(c);
    function doShort(p,c){if(p.slice>=c.slice)return false;if(!eligible(p))return false;if(p.d<c.d)return true;return !eligible(c)}
    function updateCurr(){const c=S.curr;if(!c)return false;const delta=S.t-S.exec;if(delta<=0)return false;
      S.exec=S.t;c.sum+=delta;c.v+=delta*1024/c.w;let res=false;
      if(policy==='eevdf'&&c.v-c.d>=-EPS){c.d=c.v+c.slice*1024/c.w;res=true}
      updMin();
      if(policy==='eevdf'){if(rq().length===1)return false;if(res||didShort(c))return true}
      return false}
    function pickE(){const q=rq();if(q.length===1)return q[0];
      const c=S.curr&&S.curr.on&&eligible(S.curr)?S.curr:null;if(c&&prot(c))return c;
      const el=tree().filter(eligible).sort(byD);let best=el.length?el[0]:null;
      if(!best||(c&&c.d<best.d))best=c;return best}
    function lagOf(e){const lim=Math.max(2*e.slice,TICK)*1024/e.w;return Math.max(-lim,Math.min(lim,avgV()-e.v))}
    function place(e,initial){const V=avgV();let lag=0;const q=rq();
      if(q.length){let load=0;q.forEach(x=>{load+=x.w});lag=e.vlag*(load+e.w)/load}
      e.v=V-lag;let vs=e.slice*1024/e.w;if(initial)vs/=2;e.d=e.v+vs}
    const period=n=>n>8?n*gmin:lat;
    function sliceOf(e){const q=rq();const n=q.length+(e.on?0:1);let load=e.on?0:e.w;q.forEach(x=>{load+=x.w});return period(n)*e.w/load}
    function wpe(c,s){const vd=c.v-s.v;if(vd<=0)return -1;if(vd>wgran*1024/s.w)return 1;return 0}
    function pickC(){const c=S.curr&&S.curr.on?S.curr:null;const tr=tree().sort(byV);let left=tr.length?tr[0]:null;
      if(!left||(c&&c.v<left.v))left=c;let se=left;const nx=S.next;if(nx&&nx.on&&wpe(nx,left)<1)se=nx;S.next=null;return se}
    function schedule(reason){const prev=S.curr;updateCurr();let nxt;
      for(;;){if(!rq().length){S.curr=null;nxt=null;break}
        nxt=policy==='cfs'?pickC():pickE();
        if(policy==='eevdf'&&nxt.delayed){nxt.vlag=lagOf(nxt);if(nxt.vlag>0)nxt.vlag=0;nxt.on=false;nxt.delayed=false;
          if(S.curr===nxt)S.curr=null;snap('delayed-out',nxt.i,'a sleeping task left the run queue once it became eligible');continue}
        break}
      if(nxt!==prev){if(nxt){S.switches+=prev?1:0;nxt.prev=nxt.sum;if(policy==='eevdf')nxt.mark=nxt.d;
          if(nxt.wakeT!==null){nxt.waits.push(S.t-nxt.wakeT);nxt.wakeT=null}}S.curr=nxt}
      else if(nxt&&nxt.wakeT!==null){nxt.waits.push(S.t-nxt.wakeT);nxt.wakeT=null}
      S.exec=S.t;snap('pick',nxt?nxt.i:-1,reason)}
    function wake(e){const res=updateCurr();e.wakeT=S.t;
      if(policy==='cfs'){const vr=S.minvr-lat/2;e.v=Math.max(e.v,vr);e.on=true;const c=S.curr;
        if(!c){schedule('woke on an idle CPU');return}
        if(wpe(c,e)===1){S.next=e;snap('wake',e.i,'preempts: current is ahead by more than the wake-up granularity');schedule('wake-up preemption')}
        else snap('wake',e.i,'waits: not far enough behind the running task')}
      else{if(e.delayed){e.delayed=false;e.vlag=lagOf(e);if(e.vlag>0){e.on=false;e.vlag=0;place(e,false);e.on=true}}
        else{place(e,false);e.on=true}
        const c=S.curr;if(!c){schedule('woke on an idle CPU');return}
        if(doShort(e,c)&&prot(c))c.mark=null;
        if(pickE()===e){snap('wake',e.i,'preempts: it is now the eligible task with the earliest deadline');schedule('wake-up preemption')}
        else if(res){snap('wake',e.i,'the running task had used up its slice: pick again');schedule('slice used up')}
        else snap('wake',e.i,'waits: the running task keeps its slice (RUN_TO_PARITY) or has an earlier deadline')}}
    function sleepCurr(){const c=S.curr;updateCurr();
      if(policy==='eevdf'&&!eligible(c))c.delayed=true;else{if(policy==='eevdf')c.vlag=lagOf(c);c.on=false}
      S.curr=null;updMin();snap('sleep',c.i,c.delayed?'delayed dequeue: stays on the run queue until it is eligible':'');
      schedule('the running task went to sleep')}
    T.forEach(e=>{if(e.hog){if(policy==='eevdf')place(e,true);else e.v=S.minvr;e.on=true}
      else{e.wakeAt=e.start;e.left=e.run;if(policy==='cfs')e.v=-1e12}});
    S.since=0;schedule('start');
    let nextTick=TICK,segStart=0,segTask=S.curr?S.curr.i:-1;
    while(S.t<horizon-EPS){const c=S.curr;
      const cand=[[nextTick,2,-1,'tick',null],[horizon,3,-1,'end',null]];
      if(c&&!c.hog)cand.push([S.since+c.left,0,c.i,'burst',c]);
      T.forEach(e=>{if(!e.hog&&e.wakeAt!==null)cand.push([e.wakeAt,1,e.i,'wake',e])});
      cand.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);const [tt,,,kind,who]=cand[0];
      if(c&&!c.hog)c.left=Math.max(0,c.left-(tt-S.since));
      S.t=tt;S.since=tt;if(kind==='end')break;
      if(kind==='burst'){sleepCurr();who.wakeAt=S.t+who.sleep;who.left=who.run}
      else if(kind==='wake'){who.wakeAt=null;wake(who)}
      else{nextTick+=TICK;if(c){let res=updateCurr();
        if(policy==='cfs'&&rq().length>1){const ideal=sliceOf(c),dex=c.sum-c.prev;
          if(dex>ideal+EPS)res=true;else if(dex>=gmin-EPS){const tr=tree().sort(byV);if(tr.length&&c.v-tr[0].v>ideal+EPS)res=true}}
        if(res){snap('tick',c.i,policy==='cfs'?'slice used up':'slice used up: new deadline');schedule('tick preemption')}}}
      const cur=S.curr?S.curr.i:-1;
      if(cur!==segTask){if(S.t>segStart+EPS)S.segs.push([r3(segStart),r3(S.t),segTask]);segStart=S.t;segTask=cur}}
    if(S.t>segStart+EPS)S.segs.push([r3(segStart),r3(S.t),segTask]);
    const cpu={};S.segs.forEach(([a,b,k])=>{if(k>=0)cpu[T[k].name]=r3((cpu[T[k].name]||0)+b-a)});
    const waits={};T.forEach(x=>{if(!x.hog)waits[x.name]=x.waits.map(r3)});
    return {policy,segs:S.segs,switches:S.switches,snaps:S.snaps,cpu,waits,tasks:T.map(x=>({name:x.name,w:x.w,hog:x.hog,slice:x.slice}))};
  }
  const SCEN={
    loader:{tasks:[{name:'trainer',nice:0},{name:'preproc',nice:0},{name:'loader',nice:0,run:400,sleep:3600,start:1500}],horizon:40000},
    loader_short:{tasks:[{name:'trainer',nice:0},{name:'preproc',nice:0},{name:'loader',nice:0,run:400,sleep:3600,start:1500,slice:100}],horizon:40000},
    nice5:{tasks:[{name:'nice0',nice:0},{name:'nice5',nice:5}],horizon:200000},
    three:{tasks:[{name:'a',nice:0},{name:'b',nice:0},{name:'c',nice:0}],horizon:60000}
  };
  return {simulate,SCEN,WEIGHT};
})();
