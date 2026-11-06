// ---- Shared by Fig. 1 and Fig. 3: a recorded run drawn as two session timelines with the rows they touch between them (renderer v2) ----
// Time runs left to right; tab A's lane is in front, tab B's behind, the rows lie between them as strips whose height is the committed value.
// Everything is parsed from the recorded trace (TXD.engines runs or TXD.mvcc runs): which statement each session issued at each step,
// when it finished (a blocked statement finishes at a later step), what it returned, and the value each COMMIT made current.
window.TXTL=(function(){
  if(!window.S3||!window.TXD)return null;const {mix,cl}=S3;
  // one result of a step, in either recording format
  const txt=z=>z.t!==undefined?z.t:z.err?z.err:z.bal!==undefined?'returns '+z.bal:(z.st||'');
  const isErr=z=>!!z.err;
  // parse a trace into events; rows: {id: initial value}; write(q, cur) -> [{row, val}] or null; reads(q, result) -> [row ids]; locks(q, result) -> [row ids]
  function parse(tr,o){
    const ev=tr.map((s,k)=>{const q=s.q||'',kind=/^SELECT '/.test(q)?'marker':/^BEGIN/.test(q)?'begin':/^SELECT/.test(q)?'read':/^(UPDATE|SET)/.test(q)?'write':/^COMMIT/.test(q)?'commit':/^ROLLBACK/.test(q)?'rollback':'other';
      return {k,s:s.s,q,kind,fin:null,res:'',err:false,tf:false,ms:0,rows:[],lock:[]}});
    const cur=Object.assign({},o.rows),pend={A:[],B:[],C:[]},held={A:[],B:[],C:[]},changes=[],locks=[],seenRB={};
    tr.forEach((s,j)=>(s.f||[]).forEach(z=>{const e=ev[z.i];if(!e)return;e.fin=j;e.res=txt(z);e.err=isErr(z);e.tf=!!z.tf;e.ms=z.ms||0;
      if(e.err){pend[e.s]=[];return}
      if(e.kind==='read'){e.rows=o.reads(e.q,e.res);const lk=o.locks?o.locks(e.q,e.res):[];lk.forEach(r=>{held[e.s].push({row:r,from:j})});e.lock=lk}
      if(e.kind==='write'){const w=o.write(e.q,cur)||[];e.rows=w.map(x=>x.row);e.val=w.length?w[0].val:null;pend[e.s]=pend[e.s].concat(w);
        w.forEach(x=>{if(!held[e.s].some(h=>h.row===x.row))held[e.s].push({row:x.row,from:j})})}
      if(e.kind==='commit'||e.kind==='rollback'){const ok=e.kind==='commit'&&!e.tf&&/COMMIT/.test(e.res);
        if(ok)pend[e.s].forEach(x=>{cur[x.row]=x.val;changes.push({row:x.row,at:j,val:x.val})});
        if(!ok)seenRB[e.s]=true;pend[e.s]=[];held[e.s].forEach(h=>locks.push({s:e.s,row:h.row,from:h.from,to:j}));held[e.s]=[]}}));
    // a BEGIN is drawn only when it starts a retry (after that session's rollback); a marker statement (SELECT 'text', the script's note) never
    let n=0;const dx=[];let rb={};
    ev.forEach((e,k)=>{if(e.kind==='marker'||e.kind==='begin'&&!rb[e.s]){dx[k]=null;return}
      if(e.kind==='begin')e.retry=true;if(e.kind==='rollback'||(e.kind==='commit'&&e.tf))rb[e.s]=true;dx[k]=n++});
    // a step with no drawn event (a first BEGIN) takes the slot of the next drawn one, so times stay in order
    const slot=k=>{for(let i=k;i<ev.length;i++)if(dx[i]!=null)return dx[i];return n-1};
    return {ev,n,slot,changes,locks,init:o.rows,fin:cur}
  }
  // draw run r up to time `now` (a slot, fractional while the step plays); o: {x0,x1, lanes:{A:z,B:z}, rows:[{id,z,h(v),lab(v),c(v)}], a, label(e)}
  function draw(R,r,now,o){const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const NN=Math.max(r.n,o.nMin||0),W=(o.x1-o.x0)/Math.max(1,NN),X=i=>o.x0+(i+.5)*W,xt=t=>o.x0+cl(t,0,NN)*W;
    const tEnd=xt(now+.5);
    // the lanes
    Object.entries(o.lanes).forEach(([s,z])=>{R.box([(o.x0+o.x1)/2,0,z],[o.x1-o.x0+.4,.04,.62],{fill:mix(P.paper,P.ink,.05),a:a*.9,shadow:false});
      R.label([o.x0-.2,.02,z],o.laneLab?o.laneLab[s]:'tab '+s,{al:'right',dx:-6,fs:12.5,b:1,a})});
    // the rows: committed value over time, up to now
    o.rows.forEach(row=>{let v=r.init[row.id],x=o.x0-.2;const segs=[];
      r.changes.filter(c=>c.row===row.id).forEach(c=>{const xc=X(r.slot(c.at))+W*.45;segs.push([x,xc,v]);x=xc;v=c.val});segs.push([x,o.x1+.2,v]);
      segs.forEach(([s0,s1,val],i)=>{const e1=Math.min(s1,tEnd);if(e1<=s0+.01)return;const h=row.h(val);
        R.box([(s0+e1)/2,0,row.z],[e1-s0-.03,h,row.d||.5],{fill:row.c(val),a,shadow:false});
        if(e1-s0>.45)R.label([(s0+e1)/2,h,row.z],row.lab(val),{fs:12.5,b:1,dy:-10,mono:true,a,c:i===segs.length-1&&o.endC&&now>=r.n-1?o.endC:P.ink})});
      R.label([o.x0-.2,.1,row.z],row.name,{al:'right',dx:-6,fs:12,a,c:P.mute})});
    // row locks held: a gold slab over the row from the grant to the commit or rollback
    r.locks.forEach(l=>{const row=o.rows.find(w=>w.id===l.row);if(!row)return;const s0=X(r.slot(l.from))-W*.3,s1=Math.min(X(r.slot(l.to))+W*.3,tEnd);if(s1<=s0)return;
      const zz=row.z+(l.s==='A'?1:-1)*((row.d||.5)/2-.06);R.box([(s0+s1)/2,row.h(r.init[row.id])+.04,zz],[s1-s0,.05,.1],{fill:P.c5,a:a*.9,shadow:false})});
    // the statements
    r.ev.forEach(e=>{const i=r.slot(e.k);if(e.kind==='marker'||e.kind==='begin'&&!e.retry)return;if(i>now+.02)return;const z=o.lanes[e.s];if(z==null)return;
      const fi=e.fin==null?null:r.slot(e.fin),waiting=fi!=null?fi>i:true,done=e.fin!=null&&fi<=now+.02,x=X(i);
      if(waiting){const x1=done?X(fi):Math.max(x,tEnd-W*.5);R.box([(x+x1)/2,0,z],[Math.max(.1,x1-x+W*.7),.2,.4],{fill:mix(P.paper,P.bad,.12),ec:P.bad,fa:.55,a,shadow:false});
        if(x1-x>W*.8)R.label([(x+x1)/2,.2,z],'waits',{fs:12,dy:-9,c:P.bad,b:1,a,wide:1})}
      const fill=e.err?mix(P.paper,P.bad,.5):e.kind==='read'?mix(P.paper,P.c1,.4):e.kind==='write'?mix(P.paper,P.c2,.5):e.kind==='commit'?mix(P.paper,P.good,.5):e.kind==='rollback'||e.tf?mix(P.paper,P.bad,.35):mix(P.paper,P.ink,.08);
      const xb=done&&waiting?X(fi):x;R.box([xb,0,z],[W*.72,.26,.42],{fill,a});
      if(done||!waiting){const t=o.label(e);if(t)R.label([xb,.26,z],t,{fs:12,dy:-10,mono:true,b:e.err||e.kind==='write',c:e.err?P.bad:P.ink,a,wide:e.err?0:1})}
      // (statement labels hide on a phone, where the step list names them; error codes stay)
      // data moving: reads stream from the row to the session, writes from the session into the row (only while that statement is the newest)
      if(done&&now-fi<1.6&&o.flows!==false){const fa=a*cl(1.6-(now-fi),0,1);
        e.rows.forEach(id=>{const row=o.rows.find(w=>w.id===id);if(!row)return;const top=[xb,row.h(r.init[row.id])*.6,row.z],me=[xb,.26,z];
          if(e.kind==='read')R.flowArc(top,me,.35,{c:P.c1,a:fa,r:.06,speed:1.2,n:5});else if(e.kind==='write'&&!e.err)R.flowArc(me,top,.35,{c:P.c2,a:fa,r:.06,speed:1.2,n:5})})}
      if(done&&e.err)R.glow([xb,.2,z],.6,{c:P.bad,a:a*.5})});
    // the time cursor
    if(now<r.n-.6)R.line([[tEnd,0,o.zMin],[tEnd,0,o.zMax]],{c:P.acc,w:1.5,a:a*.6,dash:[4,4]});
  }
  // where a run's strip ends (for an outcome label beside it)
  const xEnd=(r,o)=>o.x0+r.n*(o.x1-o.x0)/Math.max(1,Math.max(r.n,o.nMin||0));
  return {parse,draw,xEnd}
})();
