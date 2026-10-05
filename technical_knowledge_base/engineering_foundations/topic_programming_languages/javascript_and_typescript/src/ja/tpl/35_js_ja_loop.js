// ---- Part 1, Event-loop stepper: six programs; printed lines must equal the recorded Node output ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc,TAB='t-ja-loop';
  if(!$('ja-lp-card'))return;
  const R=(window.TAB_RENDER=window.TAB_RENDER||{});R[TAB]=R[TAB]||[];
  // Each step lists only what changes: l (lines), s (call stack), n (nextTick queue), m (microtasks), t (timers), c (check: setImmediate),
  // io (pending I/O), o (a line printed now), cap (caption). Everything else carries over from the previous step.
  const P={
  'l1_basic.mjs':[
    {l:[],s:['module'],cap:'Node starts running the module\'s top-level code. That whole run is one piece of synchronous work on the call stack.'},
    {l:[1],s:['module','console.log'],o:'A',cap:'Line 1 prints A at once.'},
    {l:[2],s:['module','setTimeout'],t:['() => log("B") (0 ms)'],cap:'<code>setTimeout</code> registers its callback with the timers queue and returns. A delay of 0 means "as soon as the loop gets to timers", never "now".'},
    {l:[3],s:['module','then'],m:['() => log("C")'],t:['() => log("B") (0 ms)'],cap:'The promise is already resolved, so <code>.then</code> puts its callback straight into the microtask queue.'},
    {l:[4],s:['module','console.log'],o:'D',cap:'Line 4 prints D. Synchronous code always finishes before any queued callback.'},
    {l:[],s:[],cap:'The module is done and the stack is empty. Before the loop may take a macrotask, it drains the microtask queue.'},
    {l:[3],s:['then callback'],m:[],o:'C',cap:'The promise callback prints C.'},
    {l:[2],s:['timer callback'],t:[],o:'B',cap:'Microtasks are empty, so the loop moves to the timers phase: the 0 ms timer is due and prints B.'},
    {l:[],s:[],cap:'Nothing is queued and nothing is pending: the process exits.'}],
  'l2_await.mjs':[
    {l:[1,2,3,4,5],s:['module'],cap:'Lines 1 to 5 only define <code>job</code>; nothing in it runs yet.'},
    {l:[6],s:['module','console.log'],o:'main start',cap:'Prints "main start".'},
    {l:[7],s:['module','setTimeout'],t:['() => log("timer")'],cap:'The timer callback is registered.'},
    {l:[8,2],s:['module','job'],o:'job start',cap:'Calling <code>job()</code> runs its body synchronously, like any function, up to the first <code>await</code>.'},
    {l:[3],s:['module'],m:['job: continue after await'],cap:'<code>await null</code> suspends <code>job</code>: the rest of the function is queued as a microtask (the awaited value is already there), and <code>job()</code> returns a pending promise to line 8.'},
    {l:[9],s:['module','then'],m:['job: continue after await','() => log("then")'],cap:'The <code>.then</code> callback queues behind <code>job</code>\'s continuation: microtasks run in the order they were queued.'},
    {l:[10],s:['module','console.log'],o:'main end',cap:'Prints "main end". The module is finished.'},
    {l:[4],s:['job (resumed)'],m:['() => log("then")'],o:'job resumed',cap:'Draining microtasks: <code>job</code> resumes after its <code>await</code> and prints.'},
    {l:[9],s:['then callback'],m:[],o:'then',cap:'Next microtask: the <code>.then</code> callback.'},
    {l:[7],s:['timer callback'],t:[],o:'timer',cap:'Only now, with microtasks empty, does the timer run.'},
    {l:[],s:[],cap:'Done.'}],
  'l3_chain.mjs':[
    {l:[1,2,3,4],s:['module','setTimeout'],t:['timer 1 callback'],cap:'Timer 1 is registered.'},
    {l:[5],s:['module','setTimeout'],t:['timer 1 callback','timer 2 callback'],cap:'Timer 2 is registered behind it.'},
    {l:[6,7],s:['module','then'],m:['() => log("then 1")'],cap:'"then 1" is queued: its promise is already resolved.'},
    {l:[8],s:['module','then'],cap:'"then 2" is attached to the promise <i>returned by</i> the first <code>.then</code>, which is still pending. It is not queued yet.'},
    {l:[9],s:['module','console.log'],o:'sync',cap:'Prints "sync"; the module is done.'},
    {l:[7],s:['then 1 callback'],m:[],o:'then 1',cap:'Draining microtasks: "then 1" runs, and its promise fulfils...'},
    {l:[8],s:['then 2 callback'],o:'then 2',cap:'...which queues "then 2" at once, and the drain keeps going until the queue is empty, so "then 2" runs before any timer.'},
    {l:[2],s:['timer 1 callback'],t:['timer 2 callback'],o:'timer 1',cap:'Timers phase: timer 1 runs.'},
    {l:[3],s:['timer 1 callback','then'],m:['() => log("micro from timer 1")'],cap:'Timer 1 queues a microtask.'},
    {l:[3],s:['then callback'],m:[],o:'micro from timer 1',cap:'After each macrotask, Node drains microtasks before the next timer, so this beats timer 2, which was due at the same time.'},
    {l:[5],s:['timer 2 callback'],t:[],o:'timer 2',cap:'Then timer 2.'},
    {l:[],s:[],cap:'Done.'}],
  'l4_node.mjs':[
    {l:[2],s:['module','fs.readFile'],io:['read l4_node.mjs'],cap:'<code>readFile</code> hands the read to libuv (a thread pool in C) and returns at once.'},
    {l:[],s:[],cap:'The module is done. Nothing is queued, so the loop waits in its poll phase for I/O to finish.'},
    {l:[2],s:['readFile callback'],io:[],cap:'Poll phase: the read finished, and its callback runs.'},
    {l:[3],s:['readFile callback','setTimeout'],t:['() => log("setTimeout")'],cap:'A timer for the next pass through the timers phase.'},
    {l:[4],s:['readFile callback','setImmediate'],c:['() => log("setImmediate")'],cap:'<code>setImmediate</code> queues for the check phase, which comes right after poll.'},
    {l:[5],s:['readFile callback','then'],m:['() => log("promise")'],cap:'A microtask.'},
    {l:[6],s:['readFile callback','nextTick'],n:['() => log("nextTick")'],cap:'A <code>nextTick</code> callback: Node\'s own queue, not part of the language.'},
    {l:[7],s:['readFile callback','console.log'],o:'I/O callback',cap:'Prints "I/O callback" and the callback returns.'},
    {l:[6],s:['nextTick callback'],n:[],o:'nextTick',cap:'Between callbacks Node drains the nextTick queue first...'},
    {l:[5],s:['then callback'],m:[],o:'promise',cap:'...then the microtask queue.'},
    {l:[4],s:['immediate callback'],c:[],o:'setImmediate',cap:'The loop continues from poll to check: <code>setImmediate</code> runs before the timer, because timers come in the <i>next</i> iteration.'},
    {l:[3],s:['timer callback'],t:[],o:'setTimeout',cap:'Next iteration, timers phase: the 0 ms timer.'},
    {l:[],s:[],cap:'Done.'}],
  'l5_top.cjs':[
    {l:[],s:['module (CommonJS)'],cap:'A CommonJS module is run as a plain synchronous function call.'},
    {l:[1],s:['module (CommonJS)','then'],m:['() => log("promise")'],cap:'A microtask.'},
    {l:[2],s:['module (CommonJS)','nextTick'],n:['() => log("nextTick")'],cap:'A <code>nextTick</code> callback.'},
    {l:[3],s:['module (CommonJS)','console.log'],o:'main module done',cap:'The module finishes.'},
    {l:[2],s:['nextTick callback'],n:[],o:'nextTick',cap:'Node drains the nextTick queue first...'},
    {l:[1],s:['then callback'],m:[],o:'promise',cap:'...then the microtasks.'},
    {l:[],s:[],cap:'Done. Compare with 5b, the same three lines as an ES module.'}],
  'l5_top.mjs':[
    {l:[],s:['microtask: evaluate module'],cap:'An ES module is evaluated by V8 inside a promise job: Node is already draining the microtask queue while your top-level code runs.'},
    {l:[1],s:['microtask: evaluate module','then'],m:['() => log("promise")'],cap:'A microtask, queued behind the one running now.'},
    {l:[2],s:['microtask: evaluate module','nextTick'],n:['() => log("nextTick")'],cap:'A <code>nextTick</code> callback.'},
    {l:[3],s:['microtask: evaluate module','console.log'],o:'main module done',cap:'The module finishes, but the microtask drain it is part of is not over.'},
    {l:[1],s:['then callback'],m:[],o:'promise',cap:'V8 keeps draining microtasks, so the promise callback runs first...'},
    {l:[2],s:['nextTick callback'],n:[],o:'nextTick',cap:'...and Node gets to its nextTick queue only after the microtask queue is empty. The reverse of 5a.'},
    {l:[],s:[],cap:'Done.'}]};
  const QS=[['s','stack','Call stack (top is running)'],['n','tick','process.nextTick queue (Node)'],['m','micro','Microtask queue'],['t','macro','Timers (macrotasks)'],['c','macro','Check phase: setImmediate (Node)'],['io','macro','Pending I/O (libuv)']];
  let mode='l1_basic.mjs',states=[];
  function build(){const st={l:[],s:[],n:[],m:[],t:[],c:[],io:[],out:[]};states=P[mode].map(d=>{
      ['l','s','n','m','t','c','io'].forEach(k=>{if(d[k])st[k]=d[k].slice()});
      const o=d.o!=null?st.out.concat([d.o]):st.out.slice();st.out=o;return Object.assign({},st,{l:d.l||[],o:d.o,cap:d.cap,out:o})})}
  function draw(i){const S=states[i],L=JA.loops[mode],rec=L.out;
    $('ja-lp-file').textContent=mode+(mode.endsWith('.cjs')?' (CommonJS)':' (ES module)');
    $('ja-lp-code').innerHTML=L.code.split('\n').map((ln,k)=>'<span class="ln'+(S.l.indexOf(k+1)>=0?' on':'')+'"><span class="n">'+(k+1)+'</span>'+esc(ln)+'</span>').join('');
    const box=(cls,h,items,isStack)=>'<div class="ja-q '+cls+'"><div class="h">'+h+'</div>'+(items.length?(isStack?items.slice().reverse():items).map(x=>'<span class="it">'+esc(x)+'</span>'+(isStack?'<br>':'')).join(''):'<span class="none">empty</span>')+'</div>';
    $('ja-lp-qs').innerHTML=QS.filter(q=>q[0]==='s'||q[0]==='m'||q[0]==='t'||mode.startsWith('l4')||(mode.startsWith('l5')&&q[0]==='n')).map(q=>box(q[1]==='stack'?'stack':q[1],q[2],S[q[0]],q[0]==='s')).join('');
    $('ja-lp-out').innerHTML='<div class="h">Console output</div>'+(S.out.length?S.out.map(x=>'<span class="it" style="display:block">'+esc(x)+'</span>').join(''):'<span class="none">nothing yet</span>');
    $('ja-lp-cap').innerHTML='<b>Step '+(i+1)+' of '+states.length+'.</b> '+S.cap;
    const fin=states[states.length-1].out,ok=JSON.stringify(fin)===JSON.stringify(rec);
    $('ja-lp-cnt').innerHTML='<span>lines printed: <b>'+S.out.length+' of '+rec.length+'</b></span><span>queued callbacks: <b>'+(S.n.length+S.m.length+S.t.length+S.c.length)+'</b></span>'+(i===states.length-1?'<span>stepped output equals Node\'s recorded output: <b>'+(ok?'yes':'NO')+'</b></span>':'');
  }
  build();
  const an=RD.anim({card:'ja-lp-card',ctl:'ja-lp-ctl',n:states.length,draw,ms:1700,label:'Step'});
  RD.seg($('ja-lp-mode'),m=>{mode=m;build();an.reset(states.length);an.play()});
  R[TAB].push(()=>an.redraw());
  window.JA_LOOP_CHECK=()=>Object.keys(P).map(k=>{const sv=mode;mode=k;build();const o=states[states.length-1].out;mode=sv;build();return [k,JSON.stringify(o)===JSON.stringify(JA.loops[k].out)]});
})();
