// ---- Interleaving lab: an interpreter for the programs in inputs/lab_programs.json (same semantics as recompute.py) ----
(function(){const root=document.getElementById('t-lock');if(!root)return;
  const SPEC=window.CD.lab,CHECK=window.CD.labcheck,esc=RD.esc;
  const ABOUT={
    futex:'Three threads run glibc\'s mutex protocol (section 4). Try to get two of them into the critical section, or to leave one asleep forever: neither is possible. Watch the word go to 2 when someone has to wait, and the unlock make a futex_wake only then.',
    lost:'A lock that checks in user space, then sleeps. Make T2 fail the test-and-set and join the queue, then let T1 unlock and unpark BEFORE T2 parks: the wake-up finds nobody asleep and is lost; T2 then parks forever. Or press "Show a bad schedule".',
    lostfix:'The same lock with the futex rule: futex_wait sleeps only if the flag is still 1, checked in the kernel. Repeat the schedule that broke the previous lock: futex_wait returns at once and T2 retries.',
    cvif:'OSTEP chapter 30: one producer (two items), two consumers, a one-slot buffer, the condition tested with if. Let C1 wait, let P put an item and signal, then let C2 barge in and take it before C1 re-takes the mutex.',
    cvwhile:'The same with while: after every wake-up the consumer tests the condition again, so the barging schedule just sends C1 back to sleep.'};
  const TC=['var(--c1)','var(--c2)','var(--c3)'];
  let sc,names,progs,labels,st,hist,log,timer=0;
  function setup(id){sc=SPEC.scenarios.find(s=>s.id===id);names=sc.threads;
    if(sc.prog){progs=names.map(()=>sc.prog)}else{const P=sc.progs.P==='same as cvif'?SPEC.scenarios.find(s=>s.id==='cvif').progs.P:sc.progs.P;progs=names.map(n=>n==='P'?P:sc.progs.C)}
    labels=progs.map(p=>{const m={};p.forEach((ins,i)=>m[ins.l]=i);return m});
    st=init();hist=[];log=[];stopReplay();render();count();}
  function init(){return {th:names.map(()=>({pc:0,s:'R',then:null,re:null})),mem:Object.assign({},sc.mem),q:{},incs:0,bug:null}}
  const clone=s=>JSON.parse(JSON.stringify(s));
  // one indivisible step of thread t; returns [newState, bug, description]
  function step(s0,t){const s=clone(s0),th=s.th,me=th[t],prog=progs[t],lab=labels[t];let bug=null,msg='';
    const q=n=>(s.q[n]=s.q[n]||[]);
    const wake=(n,k)=>{let out=[];for(let i=0;i<k;i++){if(!q(n).length)break;const u=q(n).shift();
      if(th[u].s==='B'){th[u].s='R';if(th[u].then!==null&&th[u].re===null)th[u].pc=labels[u][th[u].then];out.push(names[u])}else out.push(names[u]+' (not asleep yet: wake-up lost)')}return out};
    if(me.re){const [m,l]=me.re;if(s.mem[m]===0){s.mem[m]=1;me.pc=lab[l];me.s='R';me.re=null;me.then=null;msg='re-takes mutex '+m+' after its wake-up'}else{q(m).push(t);me.s='B';msg='wants mutex '+m+' back, it is taken: sleeps on it'}}
    else{const ins=prog[me.pc],op=ins.op;let nxt=me.pc+1;msg=ins.txt;
      if(op==='cas'){if(s.mem[ins.v]===ins.exp){s.mem[ins.v]=ins.new;nxt=lab[ins.ok];msg+='  -> succeeded'}else msg+='  -> failed ('+ins.v+' = '+s.mem[ins.v]+')'}
      else if(op==='ldbr'){if(s.mem[ins.v]===ins.eq)nxt=lab[ins.to]}
      else if(op==='xchgbr'){const old=s.mem[ins.v];s.mem[ins.v]=ins.val;msg+='  -> old value '+old;if((ins.eq!==undefined&&old===ins.eq)||(ins.le!==undefined&&old<=ins.le))nxt=lab[ins.to]}
      else if(op==='fwait'){if(s.mem[ins.v]!==ins.val){nxt=lab[ins.then];msg+='  -> EAGAIN ('+ins.v+' is '+s.mem[ins.v]+')'}else{q('futex:'+ins.v).push(t);me.s='B';me.then=ins.then;nxt=null;msg+='  -> asleep'}}
      else if(op==='fwake'){const w=wake('futex:'+ins.v,ins.n);msg+=w.length?'  -> woke '+w.join(', '):'  -> nobody asleep'}
      else if(op==='enter'){s.incs++;if(s.incs>1)bug='two threads in the critical section'}
      else if(op==='leave'){s.incs--}
      else if(op==='enq'){q(ins.q).push(t)}
      else if(op==='park'){me.s='B';me.then=ins.then;nxt=null;msg+='  -> asleep'}
      else if(op==='unpark'){const w=wake(ins.q,1);msg+=w.length?'  -> '+w.join(', '):'  -> queue empty'}
      else if(op==='set'){s.mem[ins.v]=ins.val}
      else if(op==='mlock'){if(s.mem[ins.m]===0){s.mem[ins.m]=1}else{q(ins.m).push(t);me.s='B';nxt=null;msg+='  -> taken, sleeps'}}
      else if(op==='munlock'){s.mem[ins.m]=0;const w=wake(ins.m,1);if(w.length)msg+='  -> woke '+w.join(', ')}
      else if(op==='cwait'){s.mem[ins.m]=0;const w=wake(ins.m,1);q(ins.c).push(t);me.s='B';me.then=null;me.re=[ins.m,ins.then];nxt=null;msg+='  -> releases '+ins.m+(w.length?' (woke '+w.join(', ')+')':'')+', asleep on '+ins.c}
      else if(op==='csignal'){if(q(ins.c).length){const u=q(ins.c).shift();th[u].s='R';msg+='  -> '+names[u]+' may run (must re-take the mutex first)'}else msg+='  -> nobody waiting: the signal is lost (harmless if waiters check first)'}
      else if(op==='brv'){if(s.mem[ins.v]===ins.eq)nxt=lab[ins.to]}
      else if(op==='incbr'){s.mem[ins.v]++;if(s.mem[ins.v]<ins.lt)nxt=lab[ins.to]}
      else if(op==='take'){if(s.mem[ins.v]===0)bug='a consumer read an empty slot';s.mem[ins.v]=0}
      else if(op==='done'){me.s='D';nxt=null}
      if(nxt!==null)me.pc=nxt;}
    // canonical form (matches recompute.py): drop empty queues
    Object.keys(s.q).forEach(k=>{if(!s.q[k].length)delete s.q[k]});
    return [s,bug,msg]}
  const runnable=s=>s.th.map((x,i)=>x.s==='R'?i:-1).filter(i=>i>=0);
  function ending(s){if(s.bug)return 'bug';const r=runnable(s);if(r.length)return null;return s.th.every(x=>x.s==='D')?'ok':'stuck'}
  const key=s=>JSON.stringify([s.th.map(x=>[x.pc,x.s,x.then,x.re]),Object.keys(s.mem).sort().map(k=>[k,s.mem[k]]),Object.keys(s.q).sort().map(k=>[k,s.q[k]]),s.incs]);
  // exhaustive count of schedules: [finish, bug, asleep forever]
  function countAll(){const memo=new Map();let states=0;
    function go(s){const k=key(s);if(memo.has(k))return memo.get(k);states++;const r=runnable(s);let res;
      if(!r.length)res=s.th.every(x=>x.s==='D')?[1,0,0]:[0,0,1];
      else{res=[0,0,0];r.forEach(t=>{const [n,bug]=step(s,t);if(bug)res[1]++;else{const x=go(n);res[0]+=x[0];res[1]+=x[1];res[2]+=x[2]}})}
      memo.set(k,res);return res}
    const r=go(init());return {finish:r[0],bug:r[1],stuck:r[2],states}}
  function shortestBad(){const start=init();const seen=new Set([key(start)]);let frontier=[{s:start,path:[]}];
    while(frontier.length){const nf=[];for(const {s,path} of frontier){for(const t of runnable(s)){const [n,bug]=step(s,t);const p=path.concat(t);
      if(bug||ending(n)==='stuck')return p;const k=key(n);if(!seen.has(k)){seen.add(k);nf.push({s:n,path:p})}}}frontier=nf}return null}
  function count(){const el=document.getElementById('il-count');const r=countAll();const c=CHECK[sc.id];
    const f=x=>x.toLocaleString('en-US');const same=c&&c.finish===r.finish&&c.bug===r.bug&&c.asleep_forever===r.stuck;
    el.innerHTML='Over all <b>'+f(r.finish+r.bug+r.stuck)+'</b> possible schedules ('+f(r.states)+' distinct states): <b>'+f(r.finish)+'</b> finish correctly, <b'+(r.bug?' style="color:var(--bad)"':'')+'>'+f(r.bug)+'</b> hit the bug, <b'+(r.stuck?' style="color:var(--bad)"':'')+'>'+f(r.stuck)+'</b> leave a thread asleep forever. '+
      (c?(same?'<span class="pill ok">Python check: identical</span>':'<span class="pill bad">Python check differs: '+f(c.finish)+' / '+f(c.bug)+' / '+f(c.asleep_forever)+'</span>'):'');}
  function doStep(t){const [n,bug,msg]=step(st,t);hist.push({st,log:log.slice()});st=n;st.bug=bug;log.push(names[t]+': '+msg);render()}
  function render(){
    // code with thread markers
    const groups=sc.prog?[{title:'every thread runs',prog:sc.prog,ids:names.map((_,i)=>i)}]:[{title:'producer P',prog:progs[0],ids:[0]},{title:'consumers C1, C2',prog:progs[1],ids:[1,2]}];
    document.getElementById('il-code').innerHTML=groups.map(g=>'<div><h5>'+g.title+'</h5>'+g.prog.map((ins,i)=>{
      const here=g.ids.filter(t=>st.th[t].pc===i&&st.th[t].s!=='D'&&!st.th[t].re);
      return '<div class="il-ln'+(here.length?' on':'')+'"><span class="mk">'+here.map(t=>'<span class="tk" style="background:'+TC[t]+'">'+names[t]+'</span>').join('')+'</span><span class="tx">'+esc(ins.txt)+'</span></div>'}).join('')+'</div>').join('');
    const end=ending(st);
    const desc=t=>{const x=st.th[t];if(x.s==='D')return 'done';if(x.re)return (x.s==='B'?'asleep':'woken')+', must re-take '+x.re[0];if(x.s==='B'){const qn=Object.keys(st.q).find(k=>st.q[k].includes(t));return 'asleep'+(qn?' on '+qn:' (parked, in no queue)')}return 'runnable, next: '+progs[t][x.pc].l};
    document.getElementById('il-state').innerHTML='<div><b>Shared memory</b>'+Object.keys(st.mem).map(k=>k+' = '+st.mem[k]).join(', ')+'; in critical section: '+st.incs+'</div>'+
      '<div><b>Kernel wait queues</b>'+(Object.keys(st.q).length?Object.keys(st.q).map(k=>k+': ['+st.q[k].map(t=>names[t]).join(', ')+']').join('<br>'):'all empty')+'</div>'+
      '<div><b>Threads</b>'+names.map((n,t)=>'<span class="tk" style="background:'+TC[t]+'">'+n+'</span> '+desc(t)).join('<br>')+'</div>';
    const b=document.getElementById('il-btns');
    b.innerHTML=names.map((n,t)=>'<button class="th" data-t="'+t+'" style="border-color:'+TC[t]+'"'+(end||st.th[t].s!=='R'?' disabled':'')+'>Run '+n+'</button>').join('')+
      '<button data-a="rand"'+(end?' disabled':'')+'>Random step</button><button data-a="undo"'+(hist.length?'':' disabled')+'>Undo</button><button data-a="reset">Reset</button><button data-a="bad">Show a bad schedule</button>';
    const v=document.getElementById('il-verdict');
    v.className='il-verdict'+(end==='bug'||end==='stuck'?' bad':end==='ok'?' ok':'');
    v.textContent=end==='bug'?'Bug: '+st.bug+'.':end==='stuck'?'Hang: '+names.filter((_,t)=>st.th[t].s!=='D').join(', ')+' asleep and nobody left to wake them.':end==='ok'?'Every thread finished correctly.':'Choose who runs next.';
    const lg=document.getElementById('il-log');lg.textContent=log.length?log.map((l,i)=>(i+1)+'. '+l).join('\n'):'(no steps yet)';lg.scrollTop=lg.scrollHeight;}
  function stopReplay(){if(timer){clearInterval(timer);timer=0}}
  document.getElementById('il-btns').addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;
    if(x.dataset.t!==undefined){stopReplay();doStep(+x.dataset.t);return}
    const a=x.dataset.a;stopReplay();
    if(a==='rand'){const r=runnable(st);if(r.length)doStep(r[Math.floor(Math.random()*r.length)])}
    else if(a==='undo'){const h=hist.pop();if(h){st=h.st;log=h.log;render()}}
    else if(a==='reset'){st=init();hist=[];log=[];render()}
    else if(a==='bad'){const p=shortestBad();st=init();hist=[];log=[];render();if(!p){document.getElementById('il-verdict').textContent='No schedule of this program reaches a bug or a hang.';return}
      if(RD.RM){p.forEach(t=>doStep(t));return}
      let i=0;timer=setInterval(()=>{if(root.hidden)return;if(i>=p.length){stopReplay();return}doStep(p[i++])},650)}});
  document.getElementById('il-sc').innerHTML=SPEC.scenarios.map((s,i)=>'<button data-m="'+s.id+'"'+(i===0?' class="on"':'')+'>'+esc(s.title)+'</button>').join('');
  RD.seg(document.getElementById('il-sc'),id=>{document.getElementById('il-about').textContent=ABOUT[id];setup(id)});
  document.getElementById('il-about').textContent=ABOUT.futex;
  let started=false;RD.onRender(()=>{if(!started){started=true;setup('futex')}},'t-lock');
})();
