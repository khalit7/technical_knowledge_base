// ---- Reading section 9: four threads add 1 to a shared counter a million times. Interleaving illustrative; every final number measured (read/code/concurrency/out) ----
(function(){
  const C=window.RDD&&window.RDD.conc;if(!C||!document.getElementById('rd-conc-card'))return;
  const esc=RD.esc,pre=RDH.pre,hl=RDH.hl,out=RDH.outHtml;
  const viz=document.getElementById('rd-conc-viz'),cap=document.getElementById('rd-conc-cap'),panes=document.getElementById('rd-conc-panes');
  const nums=(t,re)=>[...t.matchAll(re)].map(m=>+m[1]);
  const fmt=n=>n.toLocaleString('en-US');
  const pyG=nums(C.py,/GIL enabled: True\s+expected \d+\s+got (\d+)/g),pyT=nums(C.py,/GIL enabled: False\s+expected \d+\s+got (\d+)/g);
  const jsP=nums(C.js_workers,/plain\s*: expected \d+\s+got (\d+)/g),jsA=nums(C.js_workers,/atomics: expected \d+\s+got (\d+)/g);
  const jsE=nums(C.js_async,/got (\d+)/g),c0=nums(C.cpp_O0,/got (\d+)/g),c2=nums(C.cpp_O2,/got (\d+)/g),cA=nums(C.cpp_atomic,/got (\d+)/g);
  const rOK=nums(C.rs_ok,/got (\d+)/g),pyL=nums(C.py_lock,/got (\d+)/g);
  const lost=a=>a.length?Math.round(100*(1-Math.max(...a)/4e6))+' to '+Math.round(100*(1-Math.min(...a)/4e6))+'%':'?';
  // lanes: each entry [thread, text, kind] where kind: r (read), w (write), x (lost), b (blocked), ok
  const RACE=[[1,'read 41','r'],[2,'read 41','r'],[1,'write 42','w'],[2,'write 42','x']];
  const SER=[[1,'read 41','r'],[1,'write 42','w'],[2,'read 42','r'],[2,'write 43','w']];
  function lanes(seq,counter,note){
    let h='<div class="tw"><table class="four" style="min-width:0"><thead><tr><th>step</th><th>thread 1</th><th>thread 2</th><th>counter</th></tr></thead><tbody>';
    let v=41;seq.forEach(([t,txt,k],i)=>{if(k==='w'||k==='x')v=+txt.split(' ')[1];
      const cell='<span class="pill '+(k==='x'?'bad':k==='w'?'ok':k==='b'?'mid':'')+'">'+esc(txt)+'</span>'+(k==='x'?' overwrote the other thread\'s 42':'');
      h+='<tr><td>'+(i+1)+'</td><td>'+(t===1?cell:'')+'</td><td>'+(t===2?cell:'')+'</td><td>'+v+'</td></tr>'});
    return h+'</tbody></table></div><p class="small mute">'+note+'</p>'}
  const res=(label,arr,good)=>'<div class="stat"><div class="k">'+label+'</div><div class="v" style="color:var('+(good?'--good':'--bad')+')">'+arr.map(fmt).join(', ')+'</div><div class="d">expected 4,000,000; <span class="meas">measured</span></div></div>';
  const S={
    py:[{t:'Four threads, one global counter',p:'Each thread runs counter += 1 a million times. In the default build the GIL lets only one thread execute Python bytecode at a time.',pane:['counter.py',pre(hl(C.py_src,'py',[9]))]},
      {t:'One increment is several bytecodes',p:'counter += 1 is a load, an add and a store. The GIL makes each bytecode atomic, not the statement; CPython switches threads only at certain instructions, so in practice the three run together, but the FAQ lists i = i + 1 among the operations that are not atomic.',viz:lanes(SER,0,'Illustrative: with the GIL the threads take turns, so each read sees the previous write.')},
      {t:'Result with the GIL: correct, three times out of three',p:'All four million updates arrived in every run. Correct here is a property of this interpreter build, not a promise.',viz:'<div class="an-cnt">'+res('Python 3.14.8, GIL on',pyG,true)+'</div>'},
      {t:'The fix that is always right: a lock',p:'with lock: makes read, add, write one indivisible step on any build. Measured with and without the GIL:',viz:'<div class="an-cnt">'+res('with threading.Lock',pyL,true)+'</div>',pane:['counter_lock.py',pre(hl(C.py_lock_src,'py',[10,11]))]}],
    pyt:[{t:'The same file on the free-threaded build',p:'python3.14t has no GIL: the four threads run Python bytecode on four cores at the same time.',pane:['counter.py',pre(hl(C.py_src,'py',[9]))]},
      {t:'Two threads read the same value',p:'Thread 1 and thread 2 both read 41, both compute 42, both write 42: two increments, one result.',viz:lanes(RACE,0,'Illustrative interleaving.')},
      {t:'Result without the GIL: '+lost(pyT)+' of updates lost',p:'Three runs, three different wrong answers. The free-threaded build keeps Python objects themselves safe (no crash, no corrupted list), but it does not make your read-modify-write atomic.',viz:'<div class="an-cnt">'+res('Python 3.14.8t, GIL off',pyT,false)+'</div>'},
      {t:'Same fix: a lock',p:'With threading.Lock the free-threaded build is exact too.',viz:'<div class="an-cnt">'+res('3.14 and 3.14t with a lock',pyL,true)+'</div>'}],
    js:[{t:'Four async tasks on one thread',p:'JavaScript runs your code on one thread. "Concurrent" tasks are async functions that the event loop resumes one at a time; a task can only be interrupted at an await.',pane:['counter_async.mjs',pre(hl(C.js_async_src,'ts',[6,7]))]},
      {t:'counter++ is never interrupted',p:'Between two awaits a task runs alone, so read, add and write always happen together.',viz:lanes(SER,0,'Illustrative: tasks take turns at await points.')},
      {t:'Result: exact',p:'No data race is possible with ordinary JavaScript values. The price is that one CPU-heavy task blocks every other task.',viz:'<div class="an-cnt">'+res('Node 22, one thread',jsE,true)+'</div>'}],
    jsw:[{t:'Real threads: worker_threads and shared memory',p:'Workers are separate threads with separate heaps; they can share memory only through a SharedArrayBuffer, viewed here as an Int32Array.',pane:['counter_workers.mjs',pre(hl(C.js_workers_src,'ts',[13,14]))]},
      {t:'shared[0]++ races like C++',p:'Plain reads and writes of shared memory interleave between workers.',viz:lanes(RACE,0,'Illustrative interleaving.')},
      {t:'Result: lost updates, until Atomics',p:'Atomics.add makes each increment one indivisible operation.',viz:'<div class="an-cnt">'+res('4 workers, shared[0]++',jsP,false)+res('4 workers, Atomics.add',jsA,true)+'</div>'}],
    cpp:[{t:'Four std::threads, one global long',p:'Nothing protects counter. In C++ this compiles without a warning.',pane:['counter.cpp',pre(hl(C.cpp_src,'cpp',[5,10]))]},
      {t:'Two threads read the same value',p:'The same interleaving as in free-threaded Python, but in C++ the standard calls it undefined behaviour: the program has no meaning, not just a wrong total.',viz:lanes(RACE,0,'Illustrative interleaving.')},
      {t:'Unoptimised build (-O0): '+lost(c0)+' of updates lost',p:'Each increment really loads and stores memory, and the threads collide constantly.',viz:'<div class="an-cnt">'+res('clang++ -O0',c0,false)+'</div>'},
      {t:'Optimised build (-O2): "correct"',p:'Allowed to assume there is no data race, the optimiser turned the loop into one addition of 1,000,000, so the threads rarely overlap. The bug is still there; it just stopped showing. This is why a race found in testing can vanish in a release build, and the reverse.',viz:'<div class="an-cnt">'+res('clang++ -O2',c2,true)+'</div>'},
      {t:'ThreadSanitizer finds it anyway',p:'Built with -fsanitize=thread (LLVM clang 23), the program reports the race: two writes to the global counter from two threads, at line 10.',pane:['clang++ -fsanitize=thread counter.cpp && ./a.out (library frames collapsed)',pre(out(C.cpp_tsan),'out')]},
      {t:'The fix: std::atomic',p:'counter.fetch_add(1) is one indivisible hardware instruction.',viz:'<div class="an-cnt">'+res('std::atomic<long>',cA,true)+'</div>',pane:['counter_atomic.cpp',pre(hl(C.cpp_atomic_src,'cpp',[6,11]))]}],
    rs:[{t:'The same program, written the C++ way',p:'Four scoped threads each borrow counter mutably.',pane:['counter_bad.rs',pre(hl(C.rs_bad_src,'rs',[8]))]},
      {t:'Refused at compile time',p:'Error E0499: counter cannot be borrowed mutably more than once at a time. The rule from section 4 (one writer or many readers) is exactly the rule that forbids data races, so the racy program never exists.',pane:['rustc counter_bad.rs',pre(out(C.rs_bad),'out')]},
      {t:'The two programs Rust accepts',p:'Share ownership with Arc (an atomically reference-counted pointer) and protect the value with a Mutex, which can only be reached by locking it; or use an atomic integer. The compiler checks that whatever crosses threads is Send and whatever is shared is Sync.',viz:'<div class="an-cnt">'+res('Arc<Mutex<u64>> and AtomicU64',rOK,true)+'</div>',pane:['counter_ok.rs',pre(hl(C.rs_ok_src,'rs',[7,10,15,18]))]}]
  };
  let mode='py';
  function draw(i){const s=S[mode][i];
    cap.innerHTML='<div class="t">'+(i+1)+'/'+S[mode].length+'. '+esc(s.t)+'</div><p>'+esc(s.p)+'</p>';
    viz.innerHTML=s.viz||'';panes.innerHTML=s.pane?'<div><h5>'+esc(s.pane[0])+'</h5>'+s.pane[1]+'</div>':''}
  const A=RD.anim({card:'rd-conc-card',ctl:'rd-conc-ctl',n:S.py.length,draw,ms:4600,label:'Step of the shared-counter experiment'});
  RD.seg(document.getElementById('rd-conc-seg'),m=>{mode=m;A.reset(S[m].length)});
})();
